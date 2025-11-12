# LLM Tagger Enhanced

An enhanced fork of [LLM Tagger](https://github.com/djayatillake/obsidian-llm-tagger) for Obsidian, adding multi-language support, custom instructions, and proper frontmatter integration.

## ✨ New Features (v2.0.0)

### 🌍 Multi-Language Support
Choose from 19 languages for your LLM-generated summaries:
- English, Spanish, French, German, Italian, Portuguese, Dutch
- Russian, Chinese, Japanese, Korean, Arabic, Hindi
- Turkish, Polish, Swedish, Norwegian, Danish, Finnish

### 📝 Custom Instructions
Add your own instructions to guide the LLM's behavior:
- Define specific tagging rules
- Enforce tag format requirements
- Control summary style and length
- Maintain consistency across your vault

### 🏷️ Proper Frontmatter Integration
Tags are now properly integrated into Obsidian's YAML frontmatter:
```yaml
---
tags: [tag1, tag2, tag3]
LLM-tagged: 2025-11-11T12:15:13.657Z
LLM-summary: "Your summary in the selected language"
---
```

**Benefits:**
- ✅ Tags properly indexed by Obsidian
- ✅ Appears in tag pane
- ✅ Clean, consistent structure
- ✅ No scattered tags in document body
- ✅ Preserves existing frontmatter fields

## 🚀 Installation

### Prerequisites
- [Ollama](https://ollama.ai/) installed and running
- At least one LLM model pulled (e.g., `ollama pull llama2`)

### Install the Plugin

1. Clone or download this repository
2. Run the installation script:
   ```bash
   ./install-plugin.sh
   ```
3. When prompted, enter the full path to your Obsidian vault
4. Open Obsidian
5. Go to **Settings → Community plugins**
6. Enable **LLM Tagger Enhanced**

## ⚙️ Configuration

Navigate to **Settings → LLM Tagger Enhanced**:

### 1. Ollama URL
Set your Ollama server URL (default: `http://localhost:11434`)

### 2. Default Model
Select which Ollama model to use for tagging

### 3. Summary Language
Choose the language for LLM-generated summaries and tags

### 4. Custom Instructions (Optional)
Add custom instructions for the LLM. Example:
```
Only use tags from the provided list.
Do not invent new tags or variations.
Select up to 5 tags that best represent the content.
Combine topics, tone, and themes when relevant.
If no tags apply, leave the field empty.
```

### 5. Default Tags
Comma-separated list of tags for the LLM to choose from

### 6. Auto-add Tags
Toggle automatic tagging when files are created or modified

### 7. Exclude Patterns
Files/folders to exclude from auto-tagging (one per line, supports wildcards)

## 📖 Usage

### Tag Individual Documents
- **Command Palette**: `Tag current document`
- **Sidebar**: Click the robot icon, then "Tag current document"

### Tag All Documents
- **Command Palette**: `Add tags to documents`
- **Sidebar**: Click the robot icon, then "Tag all documents"

### Remove Tags
- **Current document**: `Untag current document`
- **All documents**: `Untag all documents`

## 🔧 How It Works

1. **Deterministic Tagging**: Scans content for exact word matches with your tag list
2. **Semantic Analysis**: LLM analyzes content and suggests additional relevant tags
3. **Tag Combination**: Merges both sets of tags, removes duplicates
4. **Frontmatter Integration**: Inserts tags and summary into YAML frontmatter

### Example Output

**Before:**
```markdown
# My Note

This is a note about artificial intelligence and machine learning.
```

**After (with tags: AI, machine-learning, technology, research):**
```yaml
---
tags: [AI, machine-learning, technology]
LLM-tagged: 2025-11-11T12:15:13.657Z
LLM-summary: "This note explores artificial intelligence and machine learning concepts and their applications in modern technology."
---

# My Note

This is a note about artificial intelligence and machine learning.
```

## 🆚 Differences from Original

| Feature | Original | Enhanced |
|---------|----------|----------|
| Language support | English only | 19 languages |
| Custom instructions | ❌ | ✅ |
| Tag placement | Scattered in body | YAML frontmatter |
| Summary storage | In body | YAML frontmatter |
| Obsidian tag indexing | Partial | Full |
| Frontmatter preservation | Limited | Complete |
| Plugin ID | `llm-tagger` | `llm-tagger-enhanced` |

## 🔄 Migrating from Original Plugin

The enhanced version uses a different plugin ID (`llm-tagger-enhanced`), so:
- ✅ Can be installed alongside the original
- ✅ Won't be overwritten by community plugin updates
- ✅ Settings are separate and independent

To migrate:
1. Install this enhanced version
2. Copy your settings from the original plugin
3. Disable the original plugin (optional)
4. Re-tag documents if you want the new frontmatter format

## 🐛 Troubleshooting

### Ollama Connection Issues
- Ensure Ollama is running: `ollama serve`
- Check your Ollama URL in settings
- Verify models are installed: `ollama list`

### Tags Not Appearing
- Check that tags are in Obsidian's tag pane
- Verify YAML frontmatter syntax is valid
- Ensure file isn't in excluded patterns

### LLM Not Following Instructions
- Be specific in custom instructions
- Try different models (some follow instructions better)
- Verify language is set correctly

## 📝 License

MIT License (same as original)

## 🙏 Credits

This is a fork of [LLM Tagger](https://github.com/djayatillake/obsidian-llm-tagger) by David Jayatillake.

Enhanced by freequest with:
- Multi-language support
- Custom instructions
- Proper frontmatter integration
- Improved tag consistency

## 🤝 Contributing

Issues and pull requests welcome! This is a personal fork, but improvements are always appreciated.

## 📋 Changelog

### v2.0.0 (2025-11-12)
- ✨ Added multi-language support (19 languages)
- ✨ Added custom instructions feature
- ♻️ Refactored tag insertion to use YAML frontmatter
- 🐛 Fixed inconsistent tag placement
- 📝 Added summary storage in frontmatter
- 🎨 Improved tag deduplication
- 🚀 Enhanced installation script
- 📦 Renamed plugin to prevent auto-updates

### v1.1.2 (Original - April 2, 2025)
- Added custom Ollama server URL configuration
- Support for connecting to remote Ollama instances

### v1.1.1 (Original - April 1, 2025)
- Added "Untag all documents" and single-file operations
- Improved UI organization

### v1.1 (Original - March 21, 2025)
- Added exclusion patterns
- Auto-tag on file close
- Persistent tag storage

### v1.0 (Original - Initial Release)
- Basic tagging functionality with Ollama integration
