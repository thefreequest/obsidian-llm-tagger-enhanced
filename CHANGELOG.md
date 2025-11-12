# Changelog

All notable changes to the LLM Tagger Enhanced plugin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.1] - 2025-11-12

### 🐛 Fixed

#### Critical: Over-tagging Issue
- **Fixed**: Plugin was selecting 80+ tags instead of 3-5 relevant tags
- **Problem**: Deterministic word-matching was too aggressive
  - Matched every word in content against tag list
  - Example: "arte", "cultura", "deseo" all matched as words
  - Defeated purpose of selective tagging
- **Solution**:
  - Disabled deterministic tagging completely
  - Let LLM handle all tag selection for context-aware decisions
  - Updated prompt to emphasize "3-5 MAIN themes" only
  - Added explicit instruction: "Do NOT include every tag that appears as a word"
- **Impact**: Tags now highly selective and relevant to main themes

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
