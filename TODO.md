# TODO - LLM Tagger Enhanced

This file tracks planned features, improvements, and known issues for future releases.

## High Priority

### Features
- [ ] Add batch size configuration for bulk operations (process N files at a time to avoid memory issues)
- [ ] Add resume capability for cancelled bulk operations
- [ ] Add dry-run mode to preview what would be tagged without making changes

### UX Improvements
- [ ] Add keyboard shortcuts for tag/untag operations
- [ ] Show estimated time remaining during bulk operations
- [ ] Add undo/redo support for tagging operations

### Performance
- [ ] Implement caching for LLM responses to avoid re-processing unchanged content
- [ ] Add queue system for bulk operations to prevent concurrent LLM calls
- [ ] Optimize file reading for large vaults

## Medium Priority

### Features
- [ ] Support for multiple LLM providers (OpenAI, Anthropic, local models via LM Studio)
- [ ] Custom tag templates (e.g., different tag sets for different folder structures)
- [ ] Tag suggestions based on existing vault tags
- [ ] Export/import tag configurations
- [ ] Scheduled/automatic re-tagging of modified files

### UX Improvements
- [ ] Visual indicator showing which files are tagged vs untagged in file explorer
- [ ] Filter options in bulk operations modal (by date modified, file size, etc.)
- [ ] Progress persistence across Obsidian restarts
- [ ] Statistics dashboard showing tagging coverage

### Settings
- [ ] Per-folder configuration overrides (different models/tags for different folders)
- [ ] Blacklist/whitelist for file patterns to exclude/include
- [ ] Custom LLM system prompt templates

## Low Priority / Nice to Have

### Features
- [ ] Integration with Obsidian's native tag pane
- [ ] Bulk tag editing (rename, merge tags across multiple files)
- [ ] Tag analytics (most used tags, tag co-occurrence)
- [ ] Multi-language LLM support with language auto-detection
- [ ] Voice notes transcription and tagging

### Developer Experience
- [ ] Plugin API for other plugins to trigger tagging
- [ ] Webhook support for external triggers
- [ ] CLI interface for batch processing outside Obsidian

## Known Issues

- [ ] Progress bar may freeze if Ollama service becomes unresponsive (need timeout handling)
- [ ] Very large files (>10MB) may cause memory issues during tagging
- [ ] Cancel button sometimes requires double-click on slower systems

## Future Breaking Changes

These would require a major version bump:

- [ ] Migrate from frontmatter format to a different metadata storage system
- [ ] Change tag delimiter format (breaking existing tagged files)
- [ ] Restructure settings schema (would require migration script)

## Ideas / Research Needed

- [ ] Investigate using embeddings for semantic similarity in tag suggestions
- [ ] Explore integration with Obsidian's Canvas for visual tag relationships
- [ ] Research feasibility of real-time tagging as user types
- [ ] Consider using streaming LLM responses for faster perceived performance

---

## How to Use This File

- Add new items with `- [ ]` checkbox syntax
- Use `- [x]` when completed (then move to CHANGELOG.md)
- Keep items specific and actionable
- Link to GitHub issues when available: `(#123)`
- Add priority labels: `🔴 Critical`, `🟡 Important`, `🟢 Nice to have`

## Contributing

If you want to work on any of these items:
1. Comment on the related GitHub issue or create one
2. Fork the repository
3. Create a feature branch
4. Submit a PR referencing this TODO item
