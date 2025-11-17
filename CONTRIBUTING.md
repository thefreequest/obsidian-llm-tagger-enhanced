# Contributing to LLM Tagger Enhanced

Thank you for your interest in contributing! This document explains how to track and contribute to future work.

## 📋 Tracking Future Work

We use multiple files to track different types of work:

### [TODO.md](TODO.md) - Feature Roadmap
- **Purpose**: Track planned features, improvements, and known issues
- **Organization**: Prioritized by High/Medium/Low priority
- **Format**: Markdown checkboxes `- [ ]`
- **When to use**: Planning new features, tracking bugs, brainstorming ideas

### [CHANGELOG.md](CHANGELOG.md) - Release History
- **Purpose**: Document all changes in each release
- **Organization**: By version number (newest first)
- **Format**: Keep a Changelog format
- **Special section**: `[Unreleased]` for work in progress
- **When to use**: When completing features from TODO.md, move them here

### GitHub Issues (Recommended for collaboration)
- **Purpose**: Community discussion, bug reports, feature requests
- **When to use**:
  - Reporting bugs
  - Requesting features
  - Discussing implementation approaches
  - Tracking work collaboratively

## 🔄 Workflow

### Adding a New Idea/Feature

1. **Add to TODO.md** under the appropriate priority section
   ```markdown
   - [ ] Your feature description here
   ```

2. **Create a GitHub Issue** (optional but recommended for discussion)
   - Reference the TODO item
   - Add relevant labels (enhancement, bug, documentation, etc.)
   - Link back to TODO.md

3. **Start Development**
   - Update CHANGELOG.md `[Unreleased]` section
   - Move item from TODO.md to CHANGELOG [Unreleased]
   - Create a feature branch

### Completing Work

1. **Update CHANGELOG.md**
   - Move from `[Unreleased]` to new version section
   - Add implementation details
   - Include any breaking changes

2. **Update TODO.md**
   - Mark as complete: `- [x]`
   - Or remove completely (prefer moving to CHANGELOG)

3. **Commit and PR**
   - Reference the issue number in commit message
   - Update version numbers (manifest.json, package.json)
   - Request review

## 📝 Best Practices

### Writing TODO Items

**Good:**
```markdown
- [ ] Add batch size configuration for bulk operations to avoid memory issues with large vaults
```

**Not ideal:**
```markdown
- [ ] Make it faster
```

**With priority indicator:**
```markdown
- [ ] 🔴 Fix crash when processing files >10MB
```

### Writing CHANGELOG Entries

Follow this format:
```markdown
## [Version] - YYYY-MM-DD

### ✨ Added
- New feature description with user benefit

### 🔧 Changed
- What changed and why

### 🐛 Fixed
- Bug description and impact

### ⚠️ Breaking Changes
- What breaks and migration path
```

### Priority Guidelines

- **🔴 High Priority**: Critical bugs, security issues, major UX problems
- **🟡 Medium Priority**: Feature enhancements, performance improvements
- **🟢 Low Priority**: Nice-to-have features, polish, non-critical issues

## 🚀 Release Process

1. **Prepare release**
   - Review `[Unreleased]` section in CHANGELOG
   - Assign version number following [Semantic Versioning](https://semver.org/):
     - `MAJOR.MINOR.PATCH`
     - Increment MAJOR for breaking changes
     - Increment MINOR for new features
     - Increment PATCH for bug fixes

2. **Update version files**
   ```bash
   # Update these three files with same version:
   - manifest.json
   - package.json
   - CHANGELOG.md (move [Unreleased] → [X.Y.Z])
   ```

3. **Build and test**
   ```bash
   npm run build
   # Test thoroughly
   ```

4. **Commit and tag**
   ```bash
   git add .
   git commit -m "chore: Release vX.Y.Z"
   git tag vX.Y.Z
   git push origin main --tags
   ```

5. **GitHub Release**
   - Create release from tag
   - Copy CHANGELOG entry as release notes
   - Attach build artifacts (main.js, manifest.json, styles.css)

## 💡 Tips

### For Maintainers

- Review TODO.md monthly to reprioritize
- Keep [Unreleased] section updated during development
- Use GitHub milestones to group related issues
- Close completed items from TODO.md regularly

### For Contributors

- Check TODO.md before starting new work to avoid duplicates
- Comment on related GitHub issues before significant work
- Keep changes focused and atomic
- Update documentation with your changes
- Add tests if applicable

## 📞 Communication

- **Questions**: Open a GitHub Discussion
- **Bugs**: Create a GitHub Issue with reproduction steps
- **Features**: Check TODO.md first, then create an issue for discussion
- **Urgent**: Tag maintainers in issue comments

## 🎯 Current Focus

Check the **High Priority** section in [TODO.md](TODO.md) to see what we're currently focusing on.

---

Thank you for contributing to LLM Tagger Enhanced! 🎉
