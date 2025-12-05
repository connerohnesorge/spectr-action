# spectr-action Context

## Purpose
A GitHub Action that integrates the Spectr CLI into CI/CD workflows for spec-driven development validation. This action automatically downloads the Spectr binary, runs validation against your project's specs, and creates GitHub annotations for any issues found.

## Tech Stack
- **Runtime**: Node.js 20
- **Language**: TypeScript (ES2022 target, CommonJS output)
- **Bundler**: @vercel/ncc (single-file output for GitHub Actions)
- **Linting/Formatting**: Biome
- **Testing**: Node.js built-in test runner (node:test) with tsx
- **GitHub Actions SDK**: @actions/core, @actions/exec, @actions/tool-cache
- **GitHub API**: @octokit/core with pagination and REST plugins

## Project Conventions

### Code Style
- Biome for linting and formatting (recommended rules enabled)
- Double quotes for strings
- Trailing commas everywhere
- Space indentation (2 spaces)
- Imports auto-organized and sorted
- Object keys sorted alphabetically

### Architecture Patterns
- Single entry point (`src/spectr-action.ts`) that orchestrates the workflow
- Utility modules in `src/utils/` for platform detection, constants, inputs
- Download logic isolated in `src/download/` for version resolution and caching
- Type definitions in `src/types/` for Spectr validation output
- Uses GitHub Actions tool cache for efficient binary reuse across runs

### Testing Strategy
- **High coverage**: Test all code paths including success and error scenarios
- **Unit tests**: Located in `__tests__/unit/` - test individual functions with mocked dependencies
- **Integration tests**: Located in `__tests__/integration/` - test against real Spectr CLI
- **Fixture-based**: Test fixtures in `__tests__/fixtures/` for various project states (valid, invalid, empty, malformed)
- **CI matrix testing**: Tests run on ubuntu-latest, macos-latest, and windows-latest
- Run `npm test` for unit tests, `npm run test:all` for full suite

### Git Workflow
- **Branching**: Feature branches merged to main via pull requests
- **Commits**: Conventional Commits format (feat:, fix:, chore:, docs:, etc.)
- **CI required**: All tests and lint must pass before merge
- **Build artifacts**: Run `npm run all` and commit dist/ changes before PR

## Domain Context
- **Spectr** is a spec-driven development CLI tool (hosted at connerohnesorge/spectr) that validates project specs
- This action wraps the Spectr CLI for use in GitHub Actions workflows
- Spectr outputs JSON validation results which this action transforms into GitHub annotations
- The action supports strict mode (warnings as errors) and version pinning

## Important Constraints
- **Cross-platform**: Must work on Linux, macOS, and Windows runners
- **Semantic Versioning**: Follow semver for releases; major version tags (v1, v2) for action users
- **CI must pass**: All lint, build, and tests must pass before merging
- **Backwards compatibility**: Don't break existing action users' workflows
- **Single-file bundle**: Output must be a single bundled file in dist/ for GitHub Actions

## External Dependencies
- **Spectr CLI**: Downloaded from GitHub releases at connerohnesorge/spectr
- **GitHub API**: Used for version resolution (fetching available releases)
- **GitHub Actions runtime**: Relies on GITHUB_WORKSPACE and other Actions environment variables
