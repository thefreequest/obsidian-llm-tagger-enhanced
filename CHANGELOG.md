# Changelog

All notable changes to the LLM Tagger Enhanced plugin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### 🚧 In Progress
- Nothing currently in development

### 📋 Planned
- See [TODO.md](TODO.md) for planned features and improvements

## [2.1.4] - 2025-11-17

### ✨ Added

#### Mobile Support (iOS/iPadOS/Android)
- **Feature**: Plugin now works on Obsidian Mobile
- **Implementation**:
  - Changed `isDesktopOnly: false` in manifest.json
  - Plugin already has configurable Ollama URL setting
  - Users can connect to remote Ollama instances
- **Use Cases**:
  - Access Ollama running on home/office computer via Tailscale
  - Connect to Ollama server on local network
  - Use any remote Ollama endpoint
- **Setup**:
  1. Install plugin on mobile device
  2. Go to plugin settings
  3. Change Ollama URL from `http://localhost:11434` to your remote URL
  4. Example: `http://100.x.x.x:11434` (Tailscale) or `http://192.168.1.100:11434` (local network)
- **Requirements**:
  - Ollama must be running on accessible server
  - Network connectivity to Ollama server
  - Ollama server must allow connections from your device's IP
- **Benefit**: Tag and organize notes on the go using your iPad/iPhone/Android device
- **Note**: Mobile interface fully functional - all features work including bulk operations with cancel support

## [2.1.3] - 2025-11-13

### ✨ Added

#### Visual Feedback for All Tagging Operations
- **Feature**: Added comprehensive progress indicators for all tagging/untagging operations
- **Implementation**:
  - Single document tagging: Shows persistent "Tagging..." notice during operation
  - Single document untagging: Shows persistent "Removing tags from..." notice during operation
  - Bulk tagging: Shows start notice "Starting bulk tagging of N documents..."
  - Bulk untagging: Shows start notice "Starting bulk untagging of N documents..."
  - All operations show completion notices with checkmarks (✓) and file counts
  - Error notices with X symbol (✗) for failures
  - Progress notices are non-dismissible until operation completes
- **Benefit**: Users now have immediate feedback and know operations are in progress
- **UX Impact**: Eliminates confusion during long-running LLM operations

#### Enhanced Bulk Operations UX
- **Feature**: Complete overhaul of bulk tagging/untagging user experience
- **Implementation**:
  - **Scope Selection**: Before starting, users choose what to process
    - Option 1: "All files in vault" - Shows total count (e.g., "125 markdown files")
    - Option 2: "Current folder only" - Shows folder path and file count (e.g., "Notes/Work - 23 files")
    - Radio button selection with clear file counts
    - Automatically detects current folder from active file
    - Falls back to vault-wide if no folder context
  - **Confirmation Modals**: Shows clear scope information
    - Displays total number of files that will be processed
    - Explains which files will be skipped (already tagged files)
    - Warning about operation duration
    - Professional modal design with proper button layout
  - **Real-time Progress Updates**: Progress bar now updates in real-time
    - Shows current file being processed
    - Displays counts: processed/total files
    - Shows tagged count and skipped count separately
    - Example: "Processing: document.md\n15/100 files | Tagged: 8 | Skipped: 7"
  - **Cancel Button**: Added cancellable bulk operations
    - Cancel button appears next to progress bar during operations
    - Click to cancel - stops after current file completes
    - Shows "Cancelling..." feedback
    - Reports partial results: "Tagged X of Y processed files"
  - **Detailed Completion Messages**:
    - Success: "✓ Bulk tagging completed! Successfully tagged X files (Y skipped, Z total)"
    - Cancelled: "⚠️ Bulk tagging cancelled. Tagged X of Y processed files"
- **Benefit**: Users now have complete visibility and control over bulk operations
- **UX Impact**:
  - Clear expectations before starting operations
  - Ability to scope operations to specific folders
  - Ability to cancel long-running operations
  - Real-time feedback during processing
  - Detailed statistics on completion

## [2.1.2] - 2025-11-12

### 🔧 Changed

#### Removed Redundant Configuration Modal
- **Change**: Removed modal dialog that asked for tags/model when tagging
- **Reason**: Modal was redundant - all settings already configured in settings page
- **Before**: Tag document → Modal appears asking for model + tags
- **After**: Tag document → Uses model + tags from settings directly
- **Benefit**:
  - Faster tagging workflow (one less click)
  - Settings are centralized in one place
  - No confusion about which configuration is being used
- **Note**: If model or tags not configured, shows helpful notice directing user to settings

## [2.1.1] - 2025-11-12

### 🐛 Fixed

#### Literary Genre Detection Not Working
- **Fixed**: Genre tags were not being detected/included in results
- **Problem**:
  - Prompt was too subtle about genre detection
  - Genre tag counted against thematic tag limit
  - LLM treated genre as optional
- **Solution**:
  - Made genre detection REQUIRED in prompt when enabled
  - Genre tag now separate from thematic tag count
  - Explicit instruction: "1 genre tag + N thematic tags"
  - Genre tag must be returned FIRST
  - Increased effective max by +1 when genre detection enabled
- **Impact**:
  - With min=5, max=10, genre enabled: returns 1 genre + 5-10 thematic tags (6-11 total)
  - Genre always included when feature enabled
  - Better classification for creative writing

## [2.1.0] - 2025-11-12

### ✨ Added

#### Configurable Tag Count
- **Feature**: Adjustable minimum and maximum tag counts
- **Implementation**:
  - Added `minTags` and `maxTags` settings (default: 3-5)
  - Slider controls in settings UI (range: 1-10)
  - Automatic validation: min can't exceed max, max can't go below min
  - Dynamic prompt updates based on configured range
- **Benefit**: Users can customize tag density per their workflow

#### Literary Genre Auto-Detection
- **Feature**: Automatically detect and tag literary genres
- **Implementation**:
  - Added 29 literary genre tags: poesia, prosa_poetica, diario, ensayo, relato, cuento, microcuento, novela_corta, cronica, carta, epistolario, aforismo, nota, fragmento, memorias, autobiografia, biografia, testimonio, dialogo, monologo, teatro_breve, escena, guion, haiku, tanka, soneto, oda, elegia, satira, epigrama, romance
  - Toggle setting to enable/disable genre detection
  - When enabled, genre tags are added to available tags for LLM
  - Separate validation for genre tags
- **Benefit**: Easy classification and collection of creative writing by genre
- **Use Case**: Perfect for writers organizing poems, essays, short stories, etc.

### 🔧 Changed

- Prompt now uses configurable tag count instead of hardcoded "3-5"
- Tag validation now includes literary genres when detection is enabled
- Hard limits (`.slice()`) now use `settings.maxTags` instead of hardcoded 5

## [2.0.3] - 2025-11-12

### 🐛 Fixed

#### LLM Adding Explanations to Tags
- **Fixed**: LLM was adding explanations in parentheses after each tag
- **Problem**: Tags returned as "tag (explanation)" instead of clean "tag"
  - Example: `amor (por la busca del placer)` instead of just `amor`
  - Tags didn't match available tags list exactly
  - Resulted in invalid/malformed tags
- **Solution**:
  - Added regex to strip parentheses and brackets from tags
  - Added validation: only keep tags that match available tags list exactly
  - Updated prompt with explicit instructions: "Do NOT add explanations or justifications"
  - Added example of what NOT to do in prompt
- **Impact**:
  - Tags now clean and match available tags exactly
  - Invalid tags automatically filtered out
  - Proper tag indexing in Obsidian

## [2.0.2] - 2025-11-12

### 🐛 Fixed

#### Critical: LLM Ignoring Tag Limits
- **Fixed**: LLM was still returning 80+ tags despite prompt instructions
- **Problem**: Initial v2.0.1 fix was insufficient
  - LLM ignored "3-5 tags" instruction in prompt
  - No hard enforcement of tag count limits
  - Deterministic tagging method still called (performance impact)
- **Solution**:
  - Completely rewrote prompt with "CRITICAL RULES" section
  - Added hard limit: `.slice(0, 5)` to enforce maximum 5 tags
  - Removed unused `addDeterministicTags()` method entirely
  - Simplified tag processing pipeline
- **Impact**:
  - Tags now strictly limited to 3-5 most relevant themes
  - Improved performance (removed unnecessary method calls)
  - Clean codebase (removed dead code)

## [2.0.1] - 2025-11-12

### 🐛 Fixed

#### Critical: Over-tagging Issue (Initial Attempt)
- **Fixed**: Plugin was selecting 80+ tags instead of 3-5 relevant tags
- **Problem**: Deterministic word-matching was too aggressive
  - Matched every word in content against tag list
  - Example: "arte", "cultura", "deseo" all matched as words
  - Defeated purpose of selective tagging
- **Solution**:
  - Disabled deterministic tagging by returning empty array
  - Updated prompt to emphasize "3-5 MAIN themes" only
- **Note**: This fix was incomplete - see v2.0.2 for full resolution

#### Install Script Path Validation
- **Fixed**: Better validation when user provides `.obsidian` path
- Auto-detect and suggest correct vault root path
- Clearer error messages with examples
- Support for iCloud vault paths

## [2.0.0] - 2025-11-12

### 🎉 Major Release - Enhanced Fork

This release marks the transformation of the original LLM Tagger plugin into an enhanced, production-ready fork with significant new features and bug fixes.

### ✨ Added

#### Multi-Language Support
- **19 language options** for LLM-generated summaries and tags
- Languages: English, Spanish, French, German, Italian, Portuguese, Dutch, Russian, Chinese, Japanese, Korean, Arabic, Hindi, Turkish, Polish, Swedish, Norwegian, Danish, Finnish
- Language selection dropdown in settings UI
- LLM prompt includes language specification
- Language preference persisted in settings

#### Custom Instructions
- New **Custom Instructions** textarea in settings
- Allows users to define specific rules for LLM behavior
- Instructions are conditionally included in the LLM prompt
- Useful for:
  - Enforcing closed tag lists
  - Specifying tag format requirements
  - Controlling summary style and length
  - Maintaining consistency across vault

#### Proper Frontmatter Integration
- Tags now stored in **YAML frontmatter** following Obsidian conventions
- Format: `tags: [tag1, tag2, tag3]`
- Summary stored as: `LLM-summary: "Brief summary text"`
- Timestamp stored as: `LLM-tagged: 2025-11-11T12:15:13.657Z`
- Benefits:
  - ✅ Tags properly indexed by Obsidian
  - ✅ Appears in Obsidian tag pane
  - ✅ Clean, consistent document structure
  - ✅ No scattered tags in document body
  - ✅ Preserves existing frontmatter fields

#### Installation & Documentation
- New **install-plugin.sh** automated installation script
- Comprehensive **README.md** with:
  - Installation guide
  - Configuration instructions
  - Usage examples
  - Migration guide
  - Troubleshooting section
  - Feature comparison with original plugin

### 🐛 Fixed

#### Unreliable Untag Functionality
- **Fixed**: "Untag All Documents" now works consistently
- Improved `isAlreadyTagged()` method to properly detect LLM tags in any frontmatter structure
- Created new `removeLLMTagsFromContent()` helper method for clean removal
- Handles multiline YAML values (quotes, arrays) correctly
- Preserves user-added frontmatter fields
- Removes entire frontmatter block if only LLM fields remain
- Both `untagAllDocuments()` and `untagCurrentDocument()` now use consistent logic

#### Tag Detection
- More robust frontmatter parsing
- Handles complex YAML structures
- Correctly identifies tagged files regardless of field order
- No longer fails on documents with existing frontmatter

### 🔄 Changed

#### Plugin Identity (Breaking Change)
- **Plugin ID**: `llm-tagger` → `llm-tagger-enhanced`
- **Plugin Name**: `LLM Tagger` → `LLM Tagger Enhanced`
- **Version**: `1.1.2` → `2.0.0`
- **Benefit**: Won't be overwritten by community plugin auto-updates
- **Note**: Can be installed alongside the original plugin

#### Tag Storage Format (Breaking Change)
- **Old format**: Tags scattered in document body with separators
  ```markdown
  ---
  LLM-tagged: 2025-11-11T12:15:13.657Z
  ---

  #tag1 #tag2 #tag3

  Summary text here...

  ---

  Original content...
  ```

- **New format**: Tags in YAML frontmatter
  ```yaml
  ---
  tags: [tag1, tag2, tag3]
  LLM-tagged: 2025-11-11T12:15:13.657Z
  LLM-summary: "Summary text here in selected language"
  ---

  Original content...
  ```

- **Migration**: Documents tagged with old version need re-tagging for new format

### 🏗️ Technical Improvements

#### Code Quality
- Better separation of concerns with helper methods
- Consistent error handling across all operations
- Improved type safety in tag parsing
- More descriptive variable names
- Comprehensive code comments

#### New Methods
- `insertTagsIntoFrontmatter()`: Handles frontmatter creation/update
- `removeLLMTagsFromContent()`: Clean removal of LLM-added fields
- Refactored `addDeterministicTags()`: Now returns structured data
- Enhanced `processContentWithOllama()`: Better prompt construction

#### Settings Interface
- Added `language: string` for summary language selection
- Added `customInstructions: string` for LLM guidance

#### LLM Prompt
- Structured format request for consistent parsing
- Language specification in multiple places
- Conditional custom instructions inclusion
- Clearer instructions for tag format

### 📊 Statistics
- **6 files changed**
- **573 additions**
- **213 deletions**
- **Net change**: +360 lines

### 🧪 Testing Recommendations
1. Test multi-language summaries with different languages
2. Test custom instructions with various rule sets
3. Test untagging on documents with mixed frontmatter
4. Test tagging documents that already have user frontmatter
5. Test bulk operations on large vaults
6. Verify tags appear in Obsidian tag pane

### 📝 Migration Guide

For users of the original plugin:

1. **Backup your vault** before migrating
2. This enhanced version uses a different plugin ID (`llm-tagger-enhanced`)
3. Can be installed alongside the original plugin
4. Settings are independent and won't conflict
5. Previously tagged documents will need re-tagging for new format
6. **Recommended migration path**:
   - Install the enhanced version
   - Configure settings (language, custom instructions, tags)
   - Optionally: Untag all documents with old version
   - Tag documents with new version
   - Once satisfied, disable the original plugin

---

## [1.1.2] - 2025-04-02 (Original Plugin)

### Added
- Custom Ollama server URL configuration
- Support for connecting to remote Ollama instances
- Dynamic model loading when changing the server URL

### Fixed
- Improved error handling for server connections

## [1.1.1] - 2025-04-01 (Original Plugin)

### Added
- "Untag all documents" button to remove tags from all files
- "Tag current document" and "Untag current document" buttons for single file operations
- Commands to tag and untag the current document

### Changed
- Reorganized UI with separate sections for bulk operations and current document operations

## [1.1.0] - 2025-03-21 (Original Plugin)

### Added
- Exclusion patterns to skip specific files/folders from tagging
- Skip auto-tagging for files that are currently being edited
- Auto-tag files when they are closed (after editing)
- Persist tags between Obsidian sessions

### Improved
- User experience with automatic tag saving

## [1.0.0] - Initial Release (Original Plugin)

### Added
- Basic tagging functionality with Ollama integration
- Auto-tagging for new and modified files
- Tag customization and model selection
- Local LLM processing for privacy
- Brief summaries with tags
- Smart processing to avoid re-tagging unchanged files

---

[2.0.0]: https://github.com/freequest/obsidian-llm-tagger-enhanced/compare/v1.1.2...v2.0.0
