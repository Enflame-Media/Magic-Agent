# Changelog

All notable changes to Happy CLI will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.12.0] - 2025-12-16

### Breaking Changes

**Claude Code is now a required external dependency.** Happy CLI no longer bundles `@anthropic-ai/claude-code`. Users must install Claude Code globally before using Happy CLI.

#### Migration from v0.11.x

1. Install Claude Code globally:
   ```bash
   npm install -g @anthropic-ai/claude-code
   ```

2. Verify installation:
   ```bash
   claude --version
   ```

3. Update Happy CLI:
   ```bash
   npm update -g happy-coder
   ```

#### Why This Change?

- **Always up-to-date**: Users get the latest Claude Code features and fixes automatically
- **Smaller package**: Reduced package size by removing bundled dependency
- **No conflicts**: Avoids version conflicts with other tools using Claude Code
- **Flexible installation**: Supports npm, Homebrew, and native installer

#### Supported Installation Methods

Happy CLI detects Claude Code in this order:

1. **npm global**: `npm install -g @anthropic-ai/claude-code` (recommended)
2. **Homebrew**: `brew install claude-code` (macOS/Linux)
3. **Native installer**: https://claude.ai/install

### Changed

- Updated detection logic to find globally-installed Claude Code
- Improved error messages when Claude Code is not found
- Updated documentation with prerequisite requirements

### Security

- Applied security improvements during integration (PR #1)
