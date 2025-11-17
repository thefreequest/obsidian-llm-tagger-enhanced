import { 
    App, 
    Plugin, 
    Modal, 
    Notice, 
    TFile, 
    PluginSettingTab, 
    Setting,
    WorkspaceLeaf,
    ItemView,
    addIcon,
    debounce,
    MarkdownView
} from 'obsidian';

const ICON_NAME = 'llm-tagger-robot';
const VIEW_TYPE = 'llm-tagger-view';

// Literary genre tags for auto-detection
const LITERARY_GENRES = [
    'poesia', 'prosa_poetica', 'diario', 'ensayo', 'relato', 'cuento',
    'microcuento', 'novela_corta', 'cronica', 'carta', 'epistolario',
    'aforismo', 'nota', 'fragmento', 'memorias', 'autobiografia',
    'biografia', 'testimonio', 'dialogo', 'monologo', 'teatro_breve',
    'escena', 'guion', 'haiku', 'tanka', 'soneto', 'oda', 'elegia',
    'satira', 'epigrama', 'romance'
];

interface LLMTaggerSettings {
    selectedModel: string | null;
    defaultTags: string[];
    autoAddTags: boolean;
    taggedFiles: { [path: string]: number }; // Map of file paths to timestamp of last tagging
    excludePatterns: string[]; // Patterns for files/folders to exclude from tagging
    ollamaUrl: string; // URL for the Ollama API server
    language: string; // Language for LLM summaries and tags
    customInstructions: string; // Custom instructions for the LLM
    minTags: number; // Minimum number of tags to generate
    maxTags: number; // Maximum number of tags to generate
    detectLiteraryGenre: boolean; // Auto-detect literary genre
}

const DEFAULT_SETTINGS: LLMTaggerSettings = {
    selectedModel: null,
    defaultTags: [],
    autoAddTags: false,
    taggedFiles: {},
    excludePatterns: [],
    ollamaUrl: 'http://localhost:11434',
    language: 'English',
    customInstructions: '',
    minTags: 3,
    maxTags: 5,
    detectLiteraryGenre: false
}

export default class LLMTaggerPlugin extends Plugin {
    settings: LLMTaggerSettings;
    view: LLMTaggerView;
    private autoTaggingEnabled = false;
    private lastOpenFile: TFile | null = null;
    private cancelBulkOperation = false; // Flag to cancel bulk operations

    async onload() {
        console.log('Loading LLM Tagger plugin');
        await this.loadSettings();

        // Add robot icon
        addIcon(ICON_NAME, `<svg width="100" height="100" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C11.1 2 10.5 2.6 10.5 3.5V4H9C7.9 4 7 4.9 7 6V7H6.5C5.7 7 5 7.7 5 8.5V11.5C5 12.3 5.7 13 6.5 13H7V14C7 15.1 7.9 16 9 16H10V16.5C10 17.3 10.7 18 11.5 18H12.5C13.3 18 14 17.3 14 16.5V16H15C16.1 16 17 15.1 17 14V13H17.5C18.3 13 19 12.3 19 11.5V8.5C19 7.7 18.3 7 17.5 7H17V6C17 4.9 16.1 4 15 4H13.5V3.5C13.5 2.6 12.9 2 12 2Z" fill="currentColor"/>
            <circle cx="9.5" cy="9.5" r="1.5" fill="currentColor"/>
            <circle cx="14.5" cy="9.5" r="1.5" fill="currentColor"/>
            <path d="M12 12C10.6 12 9.5 13.1 9.5 14.5H14.5C14.5 13.1 13.4 12 12 12Z" fill="currentColor"/>
            <path d="M6 19H18V21H6V19Z" fill="currentColor"/>
        </svg>`);

        // Register view
        this.registerView(
            VIEW_TYPE,
            (leaf) => (this.view = new LLMTaggerView(leaf, this))
        );

        // Add ribbon icon
        this.addRibbonIcon(ICON_NAME, 'LLM Tagger', () => {
            this.activateView();
        });

        // Add command to tag documents
        this.addCommand({
            id: 'add-tags-to-documents',
            name: 'Add tags to documents',
            callback: () => {
                this.addTagsToDocuments(this.view);
            },
        });

        // Add command to untag all documents
        this.addCommand({
            id: 'untag-all-documents',
            name: 'Untag all documents',
            callback: () => {
                this.untagAllDocuments(this.view);
            },
        });

        // Add command to tag current document
        this.addCommand({
            id: 'tag-current-document',
            name: 'Tag current document',
            checkCallback: (checking) => {
                const activeFile = this.app.workspace.getActiveFile();
                if (activeFile && activeFile.extension === 'md') {
                    if (!checking) {
                        this.tagCurrentDocument();
                    }
                    return true;
                }
                return false;
            }
        });

        // Add command to untag current document
        this.addCommand({
            id: 'untag-current-document',
            name: 'Untag current document',
            checkCallback: (checking) => {
                const activeFile = this.app.workspace.getActiveFile();
                if (activeFile && activeFile.extension === 'md') {
                    if (!checking) {
                        this.untagCurrentDocument();
                    }
                    return true;
                }
                return false;
            }
        });

        // Enable auto-tagging if it's enabled in settings
        if (this.settings.autoAddTags) {
            this.enableAutoTagging();
        }
        
        // Register event for file opening and closing to handle auto-tagging
        this.registerEvent(
            this.app.workspace.on('file-open', (file) => {
                // If a file was previously open and it's different from the current file,
                // consider the previous file as "closed" and auto-tag it
                if (this.lastOpenFile && (!file || this.lastOpenFile.path !== file.path)) {
                    const previousFile = this.lastOpenFile;
                    
                    // Check if the file is a markdown file before attempting to tag it
                    if (previousFile instanceof TFile && previousFile.extension === 'md') {
                        // Use a small delay to ensure the file is fully saved
                        setTimeout(() => {
                            this.autoTagFileOnClose(previousFile);
                        }, 500);
                    }
                }
                
                // Update the lastOpenFile reference
                this.lastOpenFile = file instanceof TFile ? file : null;
            })
        );

        this.addSettingTab(new LLMTaggerSettingTab(this.app, this));
        console.log('LLM Tagger plugin loaded');
    }

    private enableAutoTagging() {
        if (this.autoTaggingEnabled) return;
        this.autoTaggingEnabled = true;

        // Debounced auto-tag function to prevent multiple rapid calls
        const debouncedAutoTag = debounce(async (file: TFile) => {
            await this.autoTagFile(file);
        }, 2000, true);

        // Handle new files
        this.registerEvent(
            this.app.vault.on('create', async (file) => {
                if (this.autoTaggingEnabled && file instanceof TFile && file.extension === 'md') {
                    await debouncedAutoTag(file);
                }
            })
        );

        // Handle modified files
        this.registerEvent(
            this.app.vault.on('modify', async (file) => {
                if (this.autoTaggingEnabled && file instanceof TFile && file.extension === 'md') {
                    await debouncedAutoTag(file);
                }
            })
        );
    }

    private disableAutoTagging() {
        this.autoTaggingEnabled = false;
    }

    private async autoTagFile(file: TFile) {
        // Don't process if auto-tagging is disabled or no model is selected
        if (!this.settings.autoAddTags || !this.settings.selectedModel || !this.settings.defaultTags.length) {
            return;
        }

        // Skip if file matches exclusion patterns or hasn't been modified since last tagging
        if (!this.shouldProcessFile(file)) {
            console.log(`Auto-tagging: Skipping ${file.basename} - excluded by pattern or not modified`);
            return;
        }

        // Skip if file is currently being edited
        if (this.isFileCurrentlyOpen(file)) {
            console.log(`Auto-tagging: Skipping ${file.basename} - file is currently open for editing`);
            return;
        }

        try {
            const initialContent = await this.app.vault.read(file);
            
            // Skip if content is empty
            if (!initialContent.trim()) {
                return;
            }

            const taggedContent = await this.processContentWithOllama(
                initialContent, 
                this.settings.defaultTags
            );

            // Verify file hasn't been modified while waiting for Ollama
            const currentContent = await this.app.vault.read(file);
            if (currentContent !== initialContent) {
                console.log(`Skipping ${file.basename} - content changed while processing`);
                return;
            }

            // Only update if tags were actually added
            if (taggedContent !== initialContent) {
                await this.app.vault.modify(file, taggedContent);
                this.settings.taggedFiles[file.path] = Date.now();
                await this.saveSettings();
            }
        } catch (error) {
            console.error('Error auto-tagging file:', error);
            new Notice(`Failed to auto-tag ${file.basename}: ${error.message}`);
        }
    }

    private async autoTagFileOnClose(file: TFile) {
        // Don't process if auto-tagging is disabled or no model is selected
        if (!this.settings.autoAddTags || !this.settings.selectedModel || !this.settings.defaultTags.length) {
            return;
        }

        // Skip if file matches exclusion patterns or hasn't been modified since last tagging
        if (!this.shouldProcessFile(file)) {
            console.log(`Auto-tagging on close: Skipping ${file.basename} - excluded by pattern or not modified`);
            return;
        }

        try {
            const initialContent = await this.app.vault.read(file);
            
            // Skip if content is empty
            if (!initialContent.trim()) {
                return;
            }

            const taggedContent = await this.processContentWithOllama(
                initialContent, 
                this.settings.defaultTags
            );

            // Verify file hasn't been modified while waiting for Ollama
            const currentContent = await this.app.vault.read(file);
            if (currentContent !== initialContent) {
                console.log(`Skipping ${file.basename} - content changed while processing`);
                return;
            }

            // Only update if tags were actually added
            if (taggedContent !== initialContent) {
                await this.app.vault.modify(file, taggedContent);
                this.settings.taggedFiles[file.path] = Date.now();
                await this.saveSettings();
            }
        } catch (error) {
            console.error('Error auto-tagging file on close:', error);
            new Notice(`Failed to auto-tag ${file.basename} on close: ${error.message}`);
        }
    }

    private isFileCurrentlyOpen(file: TFile): boolean {
        // Check all leaves in the workspace to see if the file is open
        const { workspace } = this.app;
        
        // Check if the file is open in any leaf
        let fileIsOpen = false;
        
        workspace.iterateAllLeaves(leaf => {
            const view = leaf.view;
            if (view instanceof MarkdownView && view.file && view.file.path === file.path) {
                fileIsOpen = true;
                return true; // Stop iteration
            }
        });
        
        return fileIsOpen;
    }

    async activateView() {
        const { workspace } = this.app;
        
        let leaf = workspace.getLeavesOfType(VIEW_TYPE)[0];
        
        if (!leaf) {
            const rightLeaf = workspace.getRightLeaf(false);
            if (rightLeaf) {
                await rightLeaf.setViewState({ type: VIEW_TYPE });
                leaf = rightLeaf;
            }
        }
        
        if (leaf) {
            workspace.revealLeaf(leaf);
        }
    }

    async onunload() {
        console.log('Unloading LLM Tagger plugin');
        this.disableAutoTagging();
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
        
        // Update auto-tagging based on settings
        if (this.settings.autoAddTags) {
            this.enableAutoTagging();
        } else {
            this.disableAutoTagging();
        }
    }

    // Helper method to ensure URL has proper protocol
    private normalizeOllamaUrl(url: string): string {
        url = url.trim();
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            return `http://${url}`;
        }
        return url;
    }

    async getOllamaModels(): Promise<string[]> {
        try {
            // Normalize URL (adds http:// if missing)
            const url = this.normalizeOllamaUrl(this.settings.ollamaUrl);

            // Warn user if protocol was missing
            if (url !== this.settings.ollamaUrl) {
                console.warn(`Ollama URL missing protocol, auto-corrected: ${this.settings.ollamaUrl} -> ${url}`);
                new Notice(`⚠️ Ollama URL should include http:// or https://\nAuto-corrected to: ${url}`, 8000);
            }

            const response = await fetch(`${url}/api/tags`);

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`Ollama API error (${response.status}):`, errorText);
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (!data.models || !Array.isArray(data.models)) {
                console.error('Unexpected Ollama API response:', data);
                throw new Error('Invalid response format from Ollama');
            }

            return data.models.map((model: any) => model.name);
        } catch (error) {
            console.error('Failed to fetch Ollama models:', error);
            // Show user-friendly error notice
            if (error instanceof TypeError && error.message.includes('fetch')) {
                new Notice(`Cannot connect to Ollama at ${this.settings.ollamaUrl}.\n\nCheck:\n1. URL includes http:// or https://\n2. Ollama is running\n3. URL is correct\n4. OLLAMA_ORIGINS is configured`, 10000);
            } else {
                new Notice(`Failed to load models: ${error.message}`, 8000);
            }
            return [];
        }
    }

    async getUserDefinedTags(): Promise<string[] | null> {
        return new Promise(async (resolve) => {
            const modal = new Modal(this.app);
            modal.titleEl.setText("Configure tags");
            
            // Create model selection dropdown
            const modelContainer = modal.contentEl.createDiv();
            modelContainer.addClass('model-container');
            const modelLabel = modelContainer.createEl('label');
            modelLabel.setText('Select Ollama model:');
            const modelSelect = modelContainer.createEl('select');
            modelSelect.addClass('model-select');

            // Add a placeholder option
            const placeholderOption = modelSelect.createEl('option');
            placeholderOption.value = '';
            placeholderOption.text = 'Select a model...';
            placeholderOption.disabled = true;
            placeholderOption.selected = !this.settings.selectedModel;

            try {
                const models = await this.getOllamaModels();
                models.forEach(model => {
                    const option = modelSelect.createEl('option');
                    option.value = model;
                    option.text = model;
                    if (model === this.settings.selectedModel) {
                        option.selected = true;
                    }
                });
            } catch (error) {
                console.error('Failed to load models:', error);
                const option = modelSelect.createEl('option');
                option.text = 'Failed to load models';
                option.disabled = true;
            }

            // Tags input
            const tagsContainer = modal.contentEl.createDiv();
            tagsContainer.addClass('tags-container');
            const tagsLabel = tagsContainer.createEl('label');
            tagsLabel.setText('Enter tags (comma-separated):');
            const input = tagsContainer.createEl('textarea');
            
            // Pre-populate the tags input with saved tags from settings
            if (this.settings.defaultTags.length > 0) {
                input.value = this.settings.defaultTags.join(', ');
            }

            const buttonContainer = modal.contentEl.createDiv();
            buttonContainer.addClass('button-container');

            const cancelButton = buttonContainer.createEl('button', { text: 'Cancel' });
            const okButton = buttonContainer.createEl('button', { text: 'OK', cls: 'mod-cta' });

            cancelButton.addEventListener('click', () => {
                resolve(null);
                modal.close();
            });

            okButton.addEventListener('click', () => {
                if (!modelSelect.value) {
                    new Notice('Please select a model first');
                    return;
                }
                const tagInput = input.value.trim();
                if (!tagInput) {
                    new Notice('Please enter at least one tag');
                    return;
                }
                this.settings.selectedModel = modelSelect.value;

                // Parse and save the tags to settings
                const tags = tagInput.split(',').map(tag => tag.trim()).filter(tag => tag);
                this.settings.defaultTags = tags;

                this.saveSettings();
                resolve(tags);
                modal.close();
            });

            modal.open();
        });
    }

    // Simplified method that uses settings directly
    async getTagsFromSettings(): Promise<string[] | null> {
        // Use tags from settings directly - no modal needed
        // All configuration is done in the settings page

        if (!this.settings.selectedModel) {
            new Notice('Please select an Ollama model in settings first');
            return null;
        }

        if (!this.settings.defaultTags || this.settings.defaultTags.length === 0) {
            new Notice('Please configure default tags in settings first');
            return null;
        }

        return this.settings.defaultTags;
    }


    async processContentWithOllama(content: string, availableTags: string[]): Promise<string> {
        if (!this.settings.selectedModel) {
            throw new Error('No Ollama model selected');
        }

        // Skip if already tagged
        if (this.isAlreadyTagged(content)) {
            return content;
        }

        // Deterministic tagging is disabled, LLM handles all selection
        const deterministicTags: string[] = [];

        // Build the prompt with configurable tag count
        let prompt = `You are an expert at analyzing and tagging markdown documents.

CRITICAL RULES:
- You MUST select between ${this.settings.minTags} and ${this.settings.maxTags} THEMATIC tags
- Select ONLY the MOST IMPORTANT themes
- Do NOT list every tag that could apply
- Do NOT add explanations or justifications after tags
- Do NOT use parentheses or brackets with tags
- Think: "What are the ${this.settings.minTags}-${this.settings.maxTags} CORE topics of this text?"`;

        // Add literary genre detection instructions if enabled
        if (this.settings.detectLiteraryGenre) {
            prompt += `

LITERARY GENRE DETECTION (REQUIRED):
First, determine the literary genre of this text from these options:
${LITERARY_GENRES.join(', ')}

The genre tag is SEPARATE from the ${this.settings.minTags}-${this.settings.maxTags} thematic tags.
You should return: 1 genre tag + ${this.settings.minTags}-${this.settings.maxTags} thematic tags.`;
        }

        prompt += `

Available thematic tags: ${availableTags.join(', ')}

Your task:`;

        if (this.settings.detectLiteraryGenre) {
            prompt += `
1. First, identify the literary genre (REQUIRED - pick the closest match)
2. Then, select ${this.settings.minTags}-${this.settings.maxTags} THEMATIC tags (not counting the genre)
3. Write a brief 1-2 sentence summary in ${this.settings.language}
4. Return the genre tag FIRST, then the thematic tags`;
        } else {
            prompt += `
1. Read the content carefully
2. Identify the ${this.settings.minTags}-${this.settings.maxTags} MOST IMPORTANT themes
3. Write a brief 1-2 sentence summary in ${this.settings.language}
4. Return ONLY the tag names without any explanations`;
        }

        prompt += `

IMPORTANT: Return tags EXACTLY as they appear in the available tags list.
Do NOT add explanations like "tag (because reason)" or "tag [justification]".

Format your response EXACTLY like this:
Summary: [your summary here]
Suggested tags: ${this.settings.detectLiteraryGenre ? 'genre_tag, ' : ''}tag1, tag2, tag3`;

        // Add custom instructions if provided
        if (this.settings.customInstructions) {
            prompt += `

Additional Custom Instructions:
${this.settings.customInstructions}`;
        }

        prompt += `

Content to analyze:
${content}

Provide your response in this format:
Summary: [your summary here]
Suggested tags: [tag1, tag2, tag3]`;

        // Get tag suggestions and summary from Ollama
        const url = this.normalizeOllamaUrl(this.settings.ollamaUrl);
        const response = await fetch(`${url}/api/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: this.settings.selectedModel,
                prompt: prompt,
                stream: false
            }),
        });
        const data = await response.json();

        // Parse the LLM response
        const llmResponse = data.response.trim();
        let summary = '';
        let llmTags: string[] = [];

        // Try to extract summary and tags from the response
        const summaryMatch = llmResponse.match(/Summary:\s*(.+?)(?:\n|$)/i);
        const tagsMatch = llmResponse.match(/Suggested tags:\s*(.+?)(?:\n|$)/i);

        if (summaryMatch) {
            summary = summaryMatch[1].trim();
        } else {
            // If format not followed, use first sentence as summary
            summary = llmResponse.split('\n')[0].trim();
        }

        if (tagsMatch) {
            // Validate tags against available tags + literary genres (if enabled)
            const validTags = this.settings.detectLiteraryGenre
                ? [...availableTags, ...LITERARY_GENRES]
                : availableTags;

            const cleanedTags = tagsMatch[1]
                .split(',')
                .map((tag: string) => {
                    // Remove # symbols
                    tag = tag.trim().replace(/^#/, '');
                    // Remove anything in parentheses (explanations)
                    tag = tag.replace(/\s*\([^)]*\)/g, '').trim();
                    // Remove anything in brackets (explanations)
                    tag = tag.replace(/\s*\[[^\]]*\]/g, '').trim();
                    return tag;
                })
                .filter((tag: string) => tag && validTags.includes(tag)); // Only keep valid tags

            // When genre detection is enabled, allow maxTags + 1 to accommodate genre tag
            const effectiveMax = this.settings.detectLiteraryGenre
                ? this.settings.maxTags + 1
                : this.settings.maxTags;

            llmTags = cleanedTags.slice(0, effectiveMax); // HARD LIMIT: Use configured max (+1 for genre if enabled)
        }

        // Combine deterministic and LLM tags, remove duplicates
        let allTags = [...new Set([...deterministicTags, ...llmTags])];

        // ENFORCE maximum tags as configured (allow +1 for genre if enabled)
        const effectiveMax = this.settings.detectLiteraryGenre
            ? this.settings.maxTags + 1
            : this.settings.maxTags;

        if (allTags.length > effectiveMax) {
            allTags = allTags.slice(0, effectiveMax);
        }

        // Build the final content with proper frontmatter
        return this.insertTagsIntoFrontmatter(content, allTags, summary);
    }

    private insertTagsIntoFrontmatter(content: string, tags: string[], summary: string): string {
        const timestamp = new Date().toISOString();

        // Check if content already has frontmatter
        const frontMatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

        if (frontMatterMatch) {
            // Content has existing frontmatter
            const existingFrontmatter = frontMatterMatch[1];
            const bodyContent = frontMatterMatch[2];

            // Parse existing frontmatter to preserve other fields
            const lines = existingFrontmatter.split('\n');
            const newLines: string[] = [];

            for (const line of lines) {
                if (line.trim().startsWith('tags:')) {
                    // Skip existing tags line, we'll add our own
                    continue;
                } else if (line.trim().startsWith('LLM-tagged:')) {
                    // Skip existing LLM-tagged line
                    continue;
                } else if (line.trim().startsWith('LLM-summary:')) {
                    // Skip existing LLM-summary line
                    continue;
                } else {
                    newLines.push(line);
                }
            }

            // Add our fields at the beginning
            const frontmatterFields = [
                `tags: [${tags.join(', ')}]`,
                `LLM-tagged: ${timestamp}`,
                `LLM-summary: "${summary.replace(/"/g, '\\"')}"`
            ];

            const finalFrontmatter = [...frontmatterFields, ...newLines].join('\n');

            return `---\n${finalFrontmatter}\n---\n${bodyContent}`;
        } else {
            // No existing frontmatter, create new one
            const frontmatter = [
                '---',
                `tags: [${tags.join(', ')}]`,
                `LLM-tagged: ${timestamp}`,
                `LLM-summary: "${summary.replace(/"/g, '\\"')}"`,
                '---',
                '',
                content
            ].join('\n');

            return frontmatter;
        }
    }

    private shouldProcessFile(file: TFile): boolean {
        // Check if file matches any exclusion pattern
        if (this.settings.excludePatterns.length > 0) {
            const filePath = file.path.toLowerCase();
            
            for (const pattern of this.settings.excludePatterns) {
                // Handle patterns with or without wildcards
                if (pattern.includes('*')) {
                    // Convert glob pattern to regex
                    const regexPattern = pattern
                        .toLowerCase()
                        .replace(/\./g, '\\.')
                        .replace(/\*/g, '.*');
                    
                    const regex = new RegExp(`^${regexPattern}$|/${regexPattern}$|/${regexPattern}/`);
                    if (regex.test(filePath)) {
                        return false;
                    }
                } else {
                    // Simple string match for exact file or folder names
                    const normalizedPattern = pattern.toLowerCase();
                    
                    // Check if it's an exact file match
                    if (file.basename.toLowerCase() === normalizedPattern) {
                        return false;
                    }
                    
                    // Check if file is in a folder with this name
                    if (filePath.includes(`/${normalizedPattern}/`)) {
                        return false;
                    }
                }
            }
        }

        // If not excluded, check if it needs processing based on modification time
        const lastTagged = this.settings.taggedFiles[file.path];
        if (!lastTagged) return true;

        // Check if file has been modified since last tagging
        return file.stat.mtime > lastTagged;
    }

    private isAlreadyTagged(content: string): boolean {
        // Check if content has frontmatter with LLM-tagged field
        const frontMatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
        if (!frontMatterMatch) {
            return false;
        }

        const frontmatter = frontMatterMatch[1];
        return frontmatter.includes('LLM-tagged:');
    }

    private removeLLMTagsFromContent(content: string): string {
        // Check if content has frontmatter
        const frontMatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

        if (!frontMatterMatch) {
            return content; // No frontmatter, nothing to clean
        }

        const existingFrontmatter = frontMatterMatch[1];
        const bodyContent = frontMatterMatch[2];

        // Parse existing frontmatter and remove LLM-added fields
        const lines = existingFrontmatter.split('\n');
        const cleanedLines: string[] = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trim();

            // Skip LLM-related fields
            if (trimmed.startsWith('LLM-tagged:')) {
                continue;
            } else if (trimmed.startsWith('LLM-summary:')) {
                // LLM-summary might be multiline with quotes
                // Skip until we find the closing quote
                if (trimmed.match(/LLM-summary:\s*".*"$/)) {
                    // Single line summary
                    continue;
                } else {
                    // Multiline summary - skip until closing quote
                    while (i < lines.length && !lines[i].includes('"')) {
                        i++;
                    }
                    continue;
                }
            } else if (trimmed.startsWith('tags:')) {
                // Check if the line has the pattern we created: tags: [...]
                // If it matches our format and has LLM-tagged nearby, skip it
                // Otherwise keep it (might be user-added tags)

                // For now, if there's an LLM-tagged field in the frontmatter,
                // assume the tags: field is ours and remove it
                if (existingFrontmatter.includes('LLM-tagged:')) {
                    // Check if tags is a single line or multiline array
                    if (trimmed.includes('[') && !trimmed.includes(']')) {
                        // Multiline array, skip until closing bracket
                        while (i < lines.length && !lines[i].includes(']')) {
                            i++;
                        }
                    }
                    continue;
                } else {
                    // No LLM-tagged field, keep the tags
                    cleanedLines.push(line);
                }
            } else {
                // Keep all other frontmatter fields
                cleanedLines.push(line);
            }
        }

        // If there are remaining frontmatter fields, keep the frontmatter block
        if (cleanedLines.length > 0 && cleanedLines.some(line => line.trim() !== '')) {
            return `---\n${cleanedLines.join('\n')}\n---\n${bodyContent}`;
        } else {
            // No frontmatter left, return just the body
            return bodyContent;
        }
    }

    async addTagsToDocuments(view?: LLMTaggerView) {
        if (!this.settings.selectedModel) {
            new Notice('Please select an Ollama model in settings first');
            return;
        }

        const tags = await this.getTagsFromSettings();
        if (!tags) return; // Missing configuration

        const allFiles = this.app.vault.getMarkdownFiles();
        const activeFile = this.app.workspace.getActiveFile();
        const currentFolder = activeFile?.parent;

        // Show confirmation modal with scope selection
        const result = await new Promise<{ confirmed: boolean, scope: 'all' | 'folder' | null }>((resolve) => {
            const modal = new Modal(this.app);
            modal.titleEl.setText("Bulk Tagging - Select Scope");

            const content = modal.contentEl.createDiv();
            content.createEl('h4', { text: 'Choose which files to process:' });
            content.style.marginTop = '10px';

            // Option 1: All files
            const option1 = content.createDiv();
            option1.style.marginBottom = '15px';
            option1.style.padding = '10px';
            option1.style.border = '1px solid var(--background-modifier-border)';
            option1.style.borderRadius = '5px';
            option1.style.cursor = 'pointer';

            const radio1 = option1.createEl('input', { type: 'radio' });
            radio1.name = 'scope';
            radio1.value = 'all';
            radio1.checked = true;
            radio1.style.marginRight = '10px';

            const label1 = option1.createEl('label');
            label1.style.cursor = 'pointer';
            label1.innerHTML = `<strong>All files in vault</strong><br><small>${allFiles.length} markdown files</small>`;

            option1.addEventListener('click', () => { radio1.checked = true; });

            // Option 2: Current folder (if available)
            if (currentFolder) {
                const folderFiles = allFiles.filter(f => f.parent?.path === currentFolder.path);

                const option2 = content.createDiv();
                option2.style.marginBottom = '15px';
                option2.style.padding = '10px';
                option2.style.border = '1px solid var(--background-modifier-border)';
                option2.style.borderRadius = '5px';
                option2.style.cursor = 'pointer';

                const radio2 = option2.createEl('input', { type: 'radio' });
                radio2.name = 'scope';
                radio2.value = 'folder';
                radio2.style.marginRight = '10px';

                const label2 = option2.createEl('label');
                label2.style.cursor = 'pointer';
                label2.innerHTML = `<strong>Current folder only</strong><br><small>"${currentFolder.path}" - ${folderFiles.length} files</small>`;

                option2.addEventListener('click', () => { radio2.checked = true; });
            }

            content.createEl('p', {
                text: 'Files already tagged will be skipped.',
                cls: 'setting-item-description'
            });

            content.createEl('p', {
                text: 'Note: This operation may take a while depending on the number of files and your LLM model speed.',
                cls: 'mod-warning'
            });

            const buttonContainer = modal.contentEl.createDiv();
            buttonContainer.addClass('button-container');
            buttonContainer.style.marginTop = '20px';
            buttonContainer.style.display = 'flex';
            buttonContainer.style.gap = '10px';
            buttonContainer.style.justifyContent = 'flex-end';

            const cancelButton = buttonContainer.createEl('button', { text: 'Cancel' });
            const confirmButton = buttonContainer.createEl('button', { text: 'Start Tagging', cls: 'mod-cta' });

            cancelButton.addEventListener('click', () => {
                resolve({ confirmed: false, scope: null });
                modal.close();
            });

            confirmButton.addEventListener('click', () => {
                const selectedScope = modal.contentEl.querySelector('input[name="scope"]:checked') as HTMLInputElement;
                resolve({ confirmed: true, scope: (selectedScope?.value as 'all' | 'folder') || 'all' });
                modal.close();
            });

            modal.open();
        });

        if (!result.confirmed) return;

        // Filter files based on scope
        let files = allFiles;
        if (result.scope === 'folder' && currentFolder) {
            files = allFiles.filter(f => f.parent?.path === currentFolder.path);
        }

        let processed = 0;
        let modified = 0;
        let skipped = 0;
        this.cancelBulkOperation = false;

        // Show start notice and enable cancel button
        new Notice(`Starting bulk tagging of ${files.length} files...`, 4000);
        if (view) {
            view.showCancelButton();
        }

        try {
            for (const file of files) {
                // Check for cancellation
                if (this.cancelBulkOperation) {
                    new Notice(`⚠️ Bulk tagging cancelled. Tagged ${modified} of ${processed} processed files.`, 5000);
                    break;
                }

                processed++;
                if (view) {
                    view.updateProgress(processed, files.length, file.basename, modified, skipped);
                }

                // Skip if file hasn't been modified since last tagging
                if (!this.shouldProcessFile(file)) {
                    console.log(`Skipping ${file.basename} - already tagged and not modified`);
                    skipped++;
                    continue;
                }

                try {
                    const initialContent = await this.app.vault.read(file);

                    // Skip if already tagged
                    if (this.isAlreadyTagged(initialContent)) {
                        console.log(`Skipping ${file.basename} - already has tag metadata`);
                        skipped++;
                        continue;
                    }

                    const taggedContent = await this.processContentWithOllama(initialContent, tags);

                    // Check for cancellation again after LLM processing
                    if (this.cancelBulkOperation) {
                        new Notice(`⚠️ Bulk tagging cancelled. Tagged ${modified} of ${processed} processed files.`, 5000);
                        break;
                    }

                    // Verify file hasn't been modified while waiting for Ollama
                    const currentContent = await this.app.vault.read(file);
                    if (currentContent !== initialContent) {
                        console.log(`Skipping ${file.basename} - content changed while processing`);
                        skipped++;
                        continue;
                    }

                    // Only update if tags were actually added
                    if (taggedContent !== initialContent) {
                        await this.app.vault.modify(file, taggedContent);
                        this.settings.taggedFiles[file.path] = Date.now();
                        await this.saveSettings();
                        modified++;
                    }
                } catch (error) {
                    console.error(`Error processing ${file.basename}:`, error);
                    new Notice(`Failed to process ${file.basename}: ${error.message}`);
                }
            }

            if (!this.cancelBulkOperation) {
                new Notice(`✓ Bulk tagging completed! Successfully tagged ${modified} files (${skipped} skipped, ${files.length} total)`, 5000);
            }
        } finally {
            this.cancelBulkOperation = false;
            if (view) {
                view.resetProgress();
                view.hideCancelButton();
            }
        }
    }

    cancelBulkOperations() {
        this.cancelBulkOperation = true;
    }
    
    async untagAllDocuments(view?: LLMTaggerView) {
        const allFiles = this.app.vault.getMarkdownFiles();
        const activeFile = this.app.workspace.getActiveFile();
        const currentFolder = activeFile?.parent;

        // Confirm before proceeding with scope selection
        const result = await new Promise<{ confirmed: boolean, scope: 'all' | 'folder' | null }>((resolve) => {
            const modal = new Modal(this.app);
            modal.titleEl.setText("Bulk Untagging - Select Scope");

            const content = modal.contentEl.createDiv();
            content.createEl('h4', { text: 'Choose which files to process:' });
            content.style.marginTop = '10px';

            // Option 1: All files
            const option1 = content.createDiv();
            option1.style.marginBottom = '15px';
            option1.style.padding = '10px';
            option1.style.border = '1px solid var(--background-modifier-border)';
            option1.style.borderRadius = '5px';
            option1.style.cursor = 'pointer';

            const radio1 = option1.createEl('input', { type: 'radio' });
            radio1.name = 'scope';
            radio1.value = 'all';
            radio1.checked = true;
            radio1.style.marginRight = '10px';

            const label1 = option1.createEl('label');
            label1.style.cursor = 'pointer';
            label1.innerHTML = `<strong>All files in vault</strong><br><small>${allFiles.length} markdown files</small>`;

            option1.addEventListener('click', () => { radio1.checked = true; });

            // Option 2: Current folder (if available)
            if (currentFolder) {
                const folderFiles = allFiles.filter(f => f.parent?.path === currentFolder.path);

                const option2 = content.createDiv();
                option2.style.marginBottom = '15px';
                option2.style.padding = '10px';
                option2.style.border = '1px solid var(--background-modifier-border)';
                option2.style.borderRadius = '5px';
                option2.style.cursor = 'pointer';

                const radio2 = option2.createEl('input', { type: 'radio' });
                radio2.name = 'scope';
                radio2.value = 'folder';
                radio2.style.marginRight = '10px';

                const label2 = option2.createEl('label');
                label2.style.cursor = 'pointer';
                label2.innerHTML = `<strong>Current folder only</strong><br><small>"${currentFolder.path}" - ${folderFiles.length} files</small>`;

                option2.addEventListener('click', () => { radio2.checked = true; });
            }

            content.createEl('p', {
                text: 'Only files with LLM Tagger tags will be modified.',
                cls: 'setting-item-description'
            });

            content.createEl('p', {
                text: 'This will remove all tags and summaries added by LLM Tagger. This action cannot be undone.',
                cls: 'mod-warning'
            });

            const buttonContainer = modal.contentEl.createDiv();
            buttonContainer.addClass('button-container');
            buttonContainer.style.marginTop = '20px';
            buttonContainer.style.display = 'flex';
            buttonContainer.style.gap = '10px';
            buttonContainer.style.justifyContent = 'flex-end';

            const cancelButton = buttonContainer.createEl('button', { text: 'Cancel' });
            const confirmButton = buttonContainer.createEl('button', { text: 'Start Untagging', cls: 'mod-warning' });

            cancelButton.addEventListener('click', () => {
                resolve({ confirmed: false, scope: null });
                modal.close();
            });

            confirmButton.addEventListener('click', () => {
                const selectedScope = modal.contentEl.querySelector('input[name="scope"]:checked') as HTMLInputElement;
                resolve({ confirmed: true, scope: (selectedScope?.value as 'all' | 'folder') || 'all' });
                modal.close();
            });

            modal.open();
        });

        if (!result.confirmed) return;

        // Filter files based on scope
        let files = allFiles;
        if (result.scope === 'folder' && currentFolder) {
            files = allFiles.filter(f => f.parent?.path === currentFolder.path);
        }

        let processed = 0;
        let modified = 0;
        let skipped = 0;
        this.cancelBulkOperation = false;

        // Show start notice and enable cancel button
        new Notice(`Starting bulk untagging of ${files.length} files...`, 4000);
        if (view) {
            view.showCancelButton();
        }

        try {
            for (const file of files) {
                // Check for cancellation
                if (this.cancelBulkOperation) {
                    new Notice(`⚠️ Bulk untagging cancelled. Untagged ${modified} of ${processed} processed files.`, 5000);
                    break;
                }

                processed++;
                if (view) {
                    view.updateProgress(processed, files.length, file.basename, modified, skipped);
                }

                try {
                    const content = await this.app.vault.read(file);

                    // Check if the file has LLM Tagger tags
                    if (!this.isAlreadyTagged(content)) {
                        skipped++;
                        continue; // Skip files without LLM tags
                    }

                    const cleanedContent = this.removeLLMTagsFromContent(content);

                    // Check for cancellation after processing
                    if (this.cancelBulkOperation) {
                        new Notice(`⚠️ Bulk untagging cancelled. Untagged ${modified} of ${processed} processed files.`, 5000);
                        break;
                    }

                    // Update the file if content changed
                    if (cleanedContent !== content) {
                        await this.app.vault.modify(file, cleanedContent);
                        modified++;

                        // Remove from tagged files record
                        delete this.settings.taggedFiles[file.path];
                    } else {
                        skipped++;
                    }
                } catch (error) {
                    console.error(`Error untagging ${file.basename}:`, error);
                    new Notice(`Failed to untag ${file.basename}: ${error.message}`);
                }
            }

            // Save the updated tagged files record
            await this.saveSettings();

            if (!this.cancelBulkOperation) {
                new Notice(`✓ Bulk untagging completed! Successfully untagged ${modified} files (${skipped} skipped, ${files.length} total)`, 5000);
            }
        } finally {
            this.cancelBulkOperation = false;
            if (view) {
                view.resetProgress();
                view.hideCancelButton();
            }
        }
    }

    async tagCurrentDocument() {
        const activeFile = this.app.workspace.getActiveFile();
        if (!activeFile || activeFile.extension !== 'md') {
            new Notice('Please open a markdown file first');
            return;
        }

        const tags = await this.getTagsFromSettings();
        if (!tags) return; // Missing configuration

        // Show progress notice
        const progressNotice = new Notice(`Tagging "${activeFile.basename}"...`, 0); // 0 = don't auto-dismiss

        try {
            const initialContent = await this.app.vault.read(activeFile);

            // Skip if already tagged
            if (this.isAlreadyTagged(initialContent)) {
                progressNotice.hide();
                new Notice(`"${activeFile.basename}" is already tagged`);
                return;
            }

            const taggedContent = await this.processContentWithOllama(initialContent, tags);

            // Verify file hasn't been modified while waiting for Ollama
            const currentContent = await this.app.vault.read(activeFile);
            if (currentContent !== initialContent) {
                progressNotice.hide();
                new Notice(`Skipped "${activeFile.basename}" - content changed during tagging`);
                return;
            }

            // Only update if tags were actually added
            if (taggedContent !== initialContent) {
                await this.app.vault.modify(activeFile, taggedContent);
                this.settings.taggedFiles[activeFile.path] = Date.now();
                await this.saveSettings();
                progressNotice.hide();
                new Notice(`✓ Successfully tagged "${activeFile.basename}"`, 3000);
            } else {
                progressNotice.hide();
                new Notice(`No tags added to "${activeFile.basename}"`);
            }
        } catch (error) {
            progressNotice.hide();
            console.error(`Error tagging ${activeFile.basename}:`, error);
            new Notice(`✗ Failed to tag "${activeFile.basename}": ${error.message}`, 5000);
        }
    }

    async untagCurrentDocument() {
        const activeFile = this.app.workspace.getActiveFile();
        if (!activeFile || activeFile.extension !== 'md') {
            new Notice('Please open a markdown file first');
            return;
        }

        // Show progress notice
        const progressNotice = new Notice(`Removing tags from "${activeFile.basename}"...`, 0);

        try {
            const content = await this.app.vault.read(activeFile);

            // Check if the file has LLM Tagger tags
            if (!this.isAlreadyTagged(content)) {
                progressNotice.hide();
                new Notice(`"${activeFile.basename}" has no LLM tags to remove`);
                return;
            }

            const cleanedContent = this.removeLLMTagsFromContent(content);

            // Update the file if content changed
            if (cleanedContent !== content) {
                await this.app.vault.modify(activeFile, cleanedContent);

                // Remove from tagged files record
                delete this.settings.taggedFiles[activeFile.path];
                await this.saveSettings();
                progressNotice.hide();
                new Notice(`✓ Successfully removed tags from "${activeFile.basename}"`, 3000);
            } else {
                progressNotice.hide();
                new Notice(`No changes made to "${activeFile.basename}"`);
            }
        } catch (error) {
            progressNotice.hide();
            console.error(`Error untagging ${activeFile.basename}:`, error);
            new Notice(`✗ Failed to untag "${activeFile.basename}": ${error.message}`, 5000);
        }
    }

}

class LLMTaggerView extends ItemView {
    plugin: LLMTaggerPlugin;
    progressBar: HTMLProgressElement;
    progressText: HTMLDivElement;
    cancelButton: HTMLButtonElement;

    constructor(leaf: WorkspaceLeaf, plugin: LLMTaggerPlugin) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType() {
        return VIEW_TYPE;
    }

    getDisplayText() {
        return 'LLM Tagger';
    }

    getIcon(): string {
        return ICON_NAME;
    }

    async onOpen() {
        const container = this.containerEl.children[1];
        container.empty();
        container.createEl('h2', { text: 'LLM Tagger' });

        // Model selection
        const modelContainer = container.createDiv();
        modelContainer.addClass('model-container');
        modelContainer.createEl('h3', { text: 'Select model' });
        const modelSelect = modelContainer.createEl('select');
        modelSelect.addClass('model-select');

        // Add placeholder option
        const placeholderOption = modelSelect.createEl('option');
        placeholderOption.value = '';
        placeholderOption.text = 'Select a model...';
        placeholderOption.disabled = true;
        placeholderOption.selected = !this.plugin.settings.selectedModel;

        try {
            const models = await this.plugin.getOllamaModels();
            models.forEach(model => {
                const option = modelSelect.createEl('option');
                option.value = model;
                option.text = model;
                if (model === this.plugin.settings.selectedModel) {
                    option.selected = true;
                }
            });
        } catch (error) {
            console.error('Failed to load models:', error);
            const option = modelSelect.createEl('option');
            option.text = 'Failed to load models';
            option.disabled = true;
        }

        modelSelect.addEventListener('change', async () => {
            this.plugin.settings.selectedModel = modelSelect.value || null;
            await this.plugin.saveSettings();
        });

        // Tags input
        const tagsContainer = container.createDiv();
        tagsContainer.addClass('tags-container');
        tagsContainer.createEl('h3', { text: 'Enter tags' });
        const tagsInput = tagsContainer.createEl('textarea');
        
        // Pre-populate the tags input with saved tags from settings
        if (this.plugin.settings.defaultTags.length > 0) {
            tagsInput.value = this.plugin.settings.defaultTags.join(', ');
        }
        
        // Save tags when the textarea loses focus
        tagsInput.addEventListener('blur', async () => {
            const tagInput = tagsInput.value.trim();
            if (tagInput) {
                const tags = tagInput.split(',').map(tag => tag.trim()).filter(tag => tag);
                this.plugin.settings.defaultTags = tags;
                await this.plugin.saveSettings();
            }
        });

        // Progress section
        const progressContainer = container.createDiv();
        progressContainer.createEl('h3', { text: 'Progress' });

        // Create progress bar
        this.progressBar = progressContainer.createEl('progress');
        this.progressBar.addClass('progress-bar');
        this.progressBar.setAttribute('value', '0');
        this.progressBar.setAttribute('max', '100');

        // Progress text and cancel button container
        const progressControlsDiv = progressContainer.createDiv();
        progressControlsDiv.style.display = 'flex';
        progressControlsDiv.style.justifyContent = 'space-between';
        progressControlsDiv.style.alignItems = 'center';
        progressControlsDiv.style.marginTop = '8px';

        // Progress text
        this.progressText = progressControlsDiv.createDiv();
        this.progressText.addClass('progress-text');
        this.progressText.textContent = 'Ready to tag documents';

        // Cancel button (hidden by default)
        this.cancelButton = progressControlsDiv.createEl('button', {
            text: 'Cancel',
            cls: 'mod-warning'
        });
        this.cancelButton.style.display = 'none';
        this.cancelButton.addEventListener('click', () => {
            this.plugin.cancelBulkOperations();
            this.cancelButton.disabled = true;
            this.cancelButton.textContent = 'Cancelling...';
        });

        // Buttons container for bulk operations
        const bulkButtonsContainer = container.createDiv();
        bulkButtonsContainer.addClass('buttons-container');
        bulkButtonsContainer.style.display = 'flex';
        bulkButtonsContainer.style.justifyContent = 'space-between';
        bulkButtonsContainer.style.marginTop = '20px';
        bulkButtonsContainer.createEl('h3', { text: 'Bulk Operations' });
        
        // Create a div for the bulk buttons
        const bulkButtonsDiv = bulkButtonsContainer.createDiv();
        bulkButtonsDiv.style.display = 'flex';
        bulkButtonsDiv.style.gap = '10px';
        
        // Start button
        const startButton = bulkButtonsDiv.createEl('button', { 
            text: 'Tag all documents',
            cls: 'mod-cta'
        });

        startButton.addEventListener('click', async () => {
            if (!modelSelect.value) {
                new Notice('Please select a model first');
                return;
            }

            const tagInput = tagsInput.value.trim();
            if (!tagInput) {
                new Notice('Please enter at least one tag');
                return;
            }

            const tags = tagInput.split(',').map(tag => tag.trim()).filter(tag => tag);
            
            // Save tags as default if they changed
            if (tagInput !== this.plugin.settings.defaultTags.join(', ')) {
                this.plugin.settings.defaultTags = tags;
                await this.plugin.saveSettings();
            }

            startButton.disabled = true;
            try {
                await this.plugin.addTagsToDocuments(this);
            } finally {
                startButton.disabled = false;
            }
        });
        
        // Untag all button
        const untagButton = bulkButtonsDiv.createEl('button', { 
            text: 'Untag all documents',
            cls: 'mod-warning'
        });

        untagButton.addEventListener('click', async () => {
            untagButton.disabled = true;
            try {
                await this.plugin.untagAllDocuments(this);
            } finally {
                untagButton.disabled = false;
            }
        });
        
        // Current document operations
        const currentDocContainer = container.createDiv();
        currentDocContainer.addClass('current-doc-container');
        currentDocContainer.style.marginTop = '20px';
        currentDocContainer.createEl('h3', { text: 'Current Document' });
        
        // Create a div for the current document buttons
        const currentDocButtonsDiv = currentDocContainer.createDiv();
        currentDocButtonsDiv.style.display = 'flex';
        currentDocButtonsDiv.style.gap = '10px';
        
        // Tag current document button
        const tagCurrentButton = currentDocButtonsDiv.createEl('button', { 
            text: 'Tag current document',
            cls: 'mod-cta'
        });
        
        tagCurrentButton.addEventListener('click', async () => {
            if (!modelSelect.value) {
                new Notice('Please select a model first');
                return;
            }

            const tagInput = tagsInput.value.trim();
            if (!tagInput) {
                new Notice('Please enter at least one tag');
                return;
            }

            const tags = tagInput.split(',').map(tag => tag.trim()).filter(tag => tag);
            
            // Save tags as default if they changed
            if (tagInput !== this.plugin.settings.defaultTags.join(', ')) {
                this.plugin.settings.defaultTags = tags;
                await this.plugin.saveSettings();
            }
            
            tagCurrentButton.disabled = true;
            try {
                await this.plugin.tagCurrentDocument();
            } finally {
                tagCurrentButton.disabled = false;
            }
        });
        
        // Untag current document button
        const untagCurrentButton = currentDocButtonsDiv.createEl('button', { 
            text: 'Untag current document',
            cls: 'mod-warning'
        });
        
        untagCurrentButton.addEventListener('click', async () => {
            untagCurrentButton.disabled = true;
            try {
                await this.plugin.untagCurrentDocument();
            } finally {
                untagCurrentButton.disabled = false;
            }
        });
    }

    updateProgress(current: number, total: number, filename: string, modified: number = 0, skipped: number = 0) {
        const percentage = Math.round((current / total) * 100);
        this.progressBar.setAttribute('value', percentage.toString());

        // Show detailed progress with counts
        this.progressText.textContent = `Processing: ${filename}\n${current}/${total} files | Tagged: ${modified} | Skipped: ${skipped}`;
        this.progressText.style.whiteSpace = 'pre-line'; // Allow line breaks
    }

    resetProgress() {
        this.progressBar.setAttribute('value', '0');
        this.progressText.textContent = 'Ready to tag documents';
        this.progressText.style.whiteSpace = 'normal';
    }

    showCancelButton() {
        this.cancelButton.style.display = 'block';
        this.cancelButton.disabled = false;
        this.cancelButton.textContent = 'Cancel';
    }

    hideCancelButton() {
        this.cancelButton.style.display = 'none';
        this.cancelButton.disabled = false;
        this.cancelButton.textContent = 'Cancel';
    }
}

class LLMTaggerSettingTab extends PluginSettingTab {
    plugin: LLMTaggerPlugin;

    constructor(app: App, plugin: LLMTaggerPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    async display(): Promise<void> {
        const {containerEl} = this;
        containerEl.empty();

        new Setting(containerEl)
            .setName('Ollama URL')
            .setDesc('URL of your Ollama API server')
            .addText((text) => {
                text.setPlaceholder('http://localhost:11434')
                .setValue(this.plugin.settings.ollamaUrl)
                .onChange(async (value) => {
                    this.plugin.settings.ollamaUrl = value.trim() === '' ? 'http://localhost:11434' : value.trim();
                    await this.plugin.saveSettings();
                });

                // when user leaves input, try to reload Ollama models
                text.inputEl.addEventListener("blur", async () => {
                    const modelSelect = this.containerEl.querySelector('.model-select') as HTMLSelectElement;
                    try {
                        const models = await this.plugin.getOllamaModels();
                        if (models.length == 0) { throw new Error("Failed to reload Ollama models"); }
                        if (modelSelect) {
                            // Clear existing options except placeholder
                            while (modelSelect.options.length > 1) {
                                modelSelect.remove(1);
                            }
                            
                            // Add new options
                            models.forEach(model => {
                                const option = modelSelect.createEl('option');
                                option.value = model;
                                option.text = model;
                                if (model === this.plugin.settings.selectedModel) {
                                    option.selected = true;
                                }
                            });
                            modelSelect.options[modelSelect.selectedIndex].text = 'Select a model...';
                            modelSelect.disabled = false;
                        } else {
                            // throw error if the select element doesn't exist
                            throw new Error("Error loading page");
                        }
                    } catch (error) {
                        new Notice(error);                        
                        modelSelect.options[modelSelect.selectedIndex].text = 'Failed to load models';
                        modelSelect.disabled = true;
                    }
                });
            });

        new Setting(containerEl)
            .setName('Default model')
            .setDesc('Select the default Ollama model to use')
            .addDropdown(async (dropdown) => {
                dropdown.selectEl.addClass('model-select');
                dropdown.addOption('', 'Select a model...');
                try {
                    const models = await this.plugin.getOllamaModels();
                    models.forEach(model => {
                        dropdown.addOption(model, model);
                    });
                    if (this.plugin.settings.selectedModel) {
                        dropdown.setValue(this.plugin.settings.selectedModel);
                    }
                } catch (error) {
                    console.error('Failed to load models:', error);
                    dropdown.addOption('error', 'Failed to load models');
                    dropdown.setDisabled(true);
                }
                dropdown.onChange(async (value) => {
                    this.plugin.settings.selectedModel = value || null;
                    await this.plugin.saveSettings();
                });
            });

        new Setting(containerEl)
            .setName('Summary language')
            .setDesc('Select the language for LLM-generated summaries and tags')
            .addDropdown(dropdown => {
                dropdown.addOption('English', 'English');
                dropdown.addOption('Spanish', 'Spanish');
                dropdown.addOption('French', 'French');
                dropdown.addOption('German', 'German');
                dropdown.addOption('Italian', 'Italian');
                dropdown.addOption('Portuguese', 'Portuguese');
                dropdown.addOption('Dutch', 'Dutch');
                dropdown.addOption('Russian', 'Russian');
                dropdown.addOption('Chinese', 'Chinese');
                dropdown.addOption('Japanese', 'Japanese');
                dropdown.addOption('Korean', 'Korean');
                dropdown.addOption('Arabic', 'Arabic');
                dropdown.addOption('Hindi', 'Hindi');
                dropdown.addOption('Turkish', 'Turkish');
                dropdown.addOption('Polish', 'Polish');
                dropdown.addOption('Swedish', 'Swedish');
                dropdown.addOption('Norwegian', 'Norwegian');
                dropdown.addOption('Danish', 'Danish');
                dropdown.addOption('Finnish', 'Finnish');
                dropdown.setValue(this.plugin.settings.language);
                dropdown.onChange(async (value) => {
                    this.plugin.settings.language = value;
                    await this.plugin.saveSettings();
                });
            });

        new Setting(containerEl)
            .setName('Custom instructions')
            .setDesc('Additional instructions for the LLM (optional). These will be added to the prompt if provided.')
            .addTextArea(text => {
                text.setPlaceholder('e.g., Only use tags from the closed list. Do not invent new tags...')
                    .setValue(this.plugin.settings.customInstructions)
                    .onChange(async (value) => {
                        this.plugin.settings.customInstructions = value.trim();
                        await this.plugin.saveSettings();
                    });

                // Make the textarea taller for longer instructions
                text.inputEl.rows = 8;
                text.inputEl.cols = 50;
            });

        new Setting(containerEl)
            .setName('Minimum tags')
            .setDesc('Minimum number of tags to generate per document')
            .addSlider(slider => slider
                .setLimits(1, 10, 1)
                .setValue(this.plugin.settings.minTags)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.plugin.settings.minTags = value;
                    // Ensure min doesn't exceed max
                    if (this.plugin.settings.minTags > this.plugin.settings.maxTags) {
                        this.plugin.settings.maxTags = this.plugin.settings.minTags;
                    }
                    await this.plugin.saveSettings();
                    this.display(); // Refresh display to update max slider if needed
                }));

        new Setting(containerEl)
            .setName('Maximum tags')
            .setDesc('Maximum number of tags to generate per document')
            .addSlider(slider => slider
                .setLimits(1, 10, 1)
                .setValue(this.plugin.settings.maxTags)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.plugin.settings.maxTags = value;
                    // Ensure max doesn't go below min
                    if (this.plugin.settings.maxTags < this.plugin.settings.minTags) {
                        this.plugin.settings.minTags = this.plugin.settings.maxTags;
                    }
                    await this.plugin.saveSettings();
                    this.display(); // Refresh display to update min slider if needed
                }));

        new Setting(containerEl)
            .setName('Detect literary genre')
            .setDesc('Automatically detect and tag literary genres (poetry, diary, essay, short story, etc.)')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.detectLiteraryGenre)
                .onChange(async (value) => {
                    this.plugin.settings.detectLiteraryGenre = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Default tags')
            .setDesc('Enter default tags (comma-separated) that will be pre-filled when adding tags')
            .addTextArea(text => text
                .setPlaceholder('tag1, tag2, tag3')
                .setValue(this.plugin.settings.defaultTags.join(', '))
                .onChange(async (value) => {
                    this.plugin.settings.defaultTags = value.split(',')
                        .map(tag => tag.trim())
                        .filter(tag => tag);
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Auto-add tags')
            .setDesc('Automatically add tags to new documents')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.autoAddTags)
                .onChange(async (value) => {
                    this.plugin.settings.autoAddTags = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Exclude patterns')
            .setDesc('Enter file/folder names or patterns to exclude from tagging (one per line). Supports * wildcard.')
            .addTextArea(text => {
                text.setPlaceholder('daily\nmeeting notes\ntemplates/*\n.excalidraw')
                    .setValue(this.plugin.settings.excludePatterns.join('\n'))
                    .onChange(async (value) => {
                        // Split by newlines and filter out empty lines
                        this.plugin.settings.excludePatterns = value
                            .split('\n')
                            .map(pattern => pattern.trim())
                            .filter(pattern => pattern);
                        await this.plugin.saveSettings();
                    });
                
                // Make the textarea taller
                text.inputEl.rows = 6;
                text.inputEl.cols = 40;
            });
    }
}
