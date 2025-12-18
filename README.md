# spectr-action

A GitHub Action to run Spectr

[![CI](https://github.com/connerohnesorge/spectr/actions/workflows/test.yml/badge.svg)](https://github.com/connerohnesorge/spectr/actions/workflows/test.yml)

> GitHub Action for validating spec-driven development projects using Spectr

This action automatically validates your specification-driven codebase by running `spectr validate --all --json` and reporting issues as GitHub annotations.

## Purpose

### What is Spectr?

[Spectr](https://github.com/connerohnesorge/spectr) is a spec-driven development tool that helps teams maintain consistency between specifications and implementations. It enforces that all changes are properly documented through proposals, specifications, and structured deltas.

### What does this action do?

This action:

- Installs the specified version of Spectr (or latest)
- Runs comprehensive validation on your `spectr/` directory
- Creates GitHub annotations for any errors, warnings, or info messages
- Fails the workflow if validation errors or warnings are found
- Provides detailed file locations and line numbers for issues

### When to use this action

Use this action as part of your CI/CD pipeline for projects that follow spec-driven development:

- On every pull request to validate proposed changes
- On push to main/master to ensure spec integrity
- As a required status check before merging
- In combination with other validation steps

## Quick Start

Add this to your workflow file (e.g., `.github/workflows/spectr.yml`):

```yaml
name: Spectr Validation
on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: connerohnesorge/spectr-action@v1
```

That's it! The action will use the latest version of Spectr.

## Inputs

### `version`

**Description:** The version of Spectr to use (e.g., `0.1.0`).
**Required:** No
**Default:** `latest`

### `github-token`

**Description:** GitHub token used to increase rate limits when retrieving versions and downloading Spectr. Uses the default GitHub Actions token automatically.
**Required:** No
**Default:** `${{ github.token }}`

### `sync-issues`

**Description:** Enable GitHub Issues sync for change proposals. When enabled, creates GitHub Issues for each active change proposal and keeps them synchronized.
**Required:** No
**Default:** `false`

### `issue-labels`

**Description:** Comma-separated labels to apply to synced issues.
**Required:** No
**Default:** `spectr,change-proposal`

### `issue-title-prefix`

**Description:** Prefix for issue titles.
**Required:** No
**Default:** `[Spectr Change]`

### `close-on-archive`

**Description:** Close issues when changes are archived. Set to `false` to keep issues open when the associated change is archived.
**Required:** No
**Default:** `true`

### `update-existing`

**Description:** Update existing issues when proposal content changes. Set to `false` to skip updates.
**Required:** No
**Default:** `true`

### `spectr-label`

**Description:** Label used to identify Spectr-managed issues.
**Required:** No
**Default:** `spectr-managed`

## Outputs

### `spectr-version`

**Description:** The version of Spectr that was installed and used for validation.

### `issues-created`

**Description:** Number of GitHub Issues created during sync (only when `sync-issues` is enabled).

### `issues-updated`

**Description:** Number of GitHub Issues updated during sync (only when `sync-issues` is enabled).

### `issues-closed`

**Description:** Number of GitHub Issues closed during sync (archived changes, only when `sync-issues` is enabled).

### `total-changes`

**Description:** Total number of active change proposals discovered (only when `sync-issues` is enabled).

**Example usage:**

```yaml
- uses: connerohnesorge/spectr-action@v1
  id: spectr
- name: Print version
  run: echo "Used Spectr version ${{ steps.spectr.outputs.spectr-version }}"
```

## GitHub Annotations

The action automatically creates GitHub annotations for all validation issues:

- **Errors** (red): Critical problems that must be fixed
- **Warnings** (yellow): Issues that should be addressed
- **Info** (blue): Informational messages

Each annotation includes:

- File path relative to repository root
- Line number where the issue occurs
- Clear description of the problem
- Suggested fixes (when applicable)

Annotations appear:

- In the workflow run logs
- On the "Files changed" tab in pull requests
- In the GitHub UI wherever the file is displayed

## Workflow Examples

### Example 1: Basic Usage

The simplest way to get started - validates on every push and pull request:

```yaml
name: Spectr Validation
on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: connerohnesorge/spectr-action@v1
```

### Example 2: Specific Version

Pin to a specific Spectr version for consistency:

```yaml
name: Spectr Validation
on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: connerohnesorge/spectr-action@v1
        with:
          version: "0.1.0"
```

### Example 4: Complete CI Workflow

Full production-ready workflow with proper triggers and permissions:

```yaml
name: Validate Spectr

on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read
  checks: write

jobs:
  validate:
    name: Validate Specifications
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Validate specs with Spectr
        uses: connerohnesorge/spectr-action@v1
        id: spectr
        with:
          version: latest

      - name: Print validation summary
        if: always()
        run: |
          echo "Spectr version used: ${{ steps.spectr.outputs.spectr-version }}"
          echo "Validation complete"
```

### Example 5: Pull Request Validation Only

Run validation only on pull requests to specific branches:

```yaml
name: PR Validation
on:
  pull_request:
    branches: [main, develop]

jobs:
  validate-specs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: connerohnesorge/spectr-action@v1
        with:
          version: "0.1.0"
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

### Example 6: Using Outputs

Capture and use the Spectr version output:

```yaml
name: Validation with Outputs
on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run Spectr validation
        uses: connerohnesorge/spectr-action@v1
        id: spectr
        with:
          version: latest

      - name: Display version info
        run: echo "Used Spectr version ${{ steps.spectr.outputs.spectr-version }}"

      - name: Conditional step based on validation
        if: success()
        run: echo "Validation passed, ready to merge!"
```

### Example 7: Issue Sync

Enable automatic GitHub Issues sync for change proposals:

```yaml
name: Spectr Validation with Issue Sync
on:
  push:
    branches: [main]
  pull_request:

permissions:
  contents: read
  checks: write
  issues: write  # Required for issue sync

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: connerohnesorge/spectr-action@v1
        id: spectr
        with:
          sync-issues: "true"
          issue-labels: "spectr,change-proposal,tracking"
          issue-title-prefix: "[Change Proposal]"

      - name: Report sync results
        if: always()
        run: |
          echo "Issues created: ${{ steps.spectr.outputs.issues-created }}"
          echo "Issues updated: ${{ steps.spectr.outputs.issues-updated }}"
          echo "Issues closed: ${{ steps.spectr.outputs.issues-closed }}"
          echo "Total changes: ${{ steps.spectr.outputs.total-changes }}"
```

### Real-World Example

A complete production workflow showing best practices:

```yaml
name: Validate Spectr

on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read
  checks: write
  pull-requests: read

jobs:
  validate:
    name: Validate Specifications
    runs-on: ubuntu-latest
    timeout-minutes: 10

    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0 # Full history for better analysis

      - name: Run Spectr validation
        uses: connerohnesorge/spectr-action@v1
        id: spectr-validate
        with:
          version: latest
          github-token: ${{ github.token }}

      - name: Report validation results
        if: always()
        run: |
          echo "Validation completed"
          echo "Spectr version: ${{ steps.spectr-validate.outputs.spectr-version }}"
          if [ "${{ job.status }}" == "success" ]; then
            echo "All specs are valid!"
          else
            echo "Validation failed - check annotations for details"
            exit 1
          fi
```

## Issue Sync Feature

The issue sync feature automatically creates and maintains GitHub Issues for your change proposals. This provides better visibility, enables discussion via issue comments, and integrates with GitHub's existing PR linking (`Fixes #N`).

### How It Works

1. **Discovery**: Scans `spectr/changes/` for active proposals with `proposal.md`
2. **Creation**: Creates a GitHub Issue for each new change proposal
3. **Tracking**: Uses a hidden HTML marker (`<!-- spectr-change-id:ID -->`) to link issues to changes
4. **Updates**: Syncs content changes when `proposal.md` or `tasks.md` is modified
5. **Closure**: Closes issues when changes are archived to `spectr/changes/archive/`

### Required Permissions

When using issue sync, your workflow needs the `issues: write` permission:

```yaml
permissions:
  contents: read
  issues: write
```

### Issue Content

Each synced issue includes:
- The full content of `proposal.md`
- List of affected specs (from the `specs/` subdirectory)
- Tasks from `tasks.md` or `tasks.json` (if present)
- A footer indicating the issue is managed by Spectr

### Labels

By default, issues are created with these labels:
- `spectr` - Indicates Spectr-related content
- `change-proposal` - Marks it as a change proposal
- `spectr-managed` - Used internally to identify managed issues

You can customize labels using the `issue-labels` and `spectr-label` inputs.

### Linking PRs to Issues

Once issues are created, you can link PRs to them using GitHub's standard syntax:

```
Fixes #123
Closes #123
Resolves #123
```

This will automatically close the issue when the PR is merged.

## Understanding Output

### In Workflow Logs

The action outputs validation results in the workflow logs:

```
✓ Spec validation passed
  - 12 specs validated
  - 3 active changes validated
  - 0 errors, 0 warnings
```

Or when issues are found:

```
✗ Spec validation failed
  - 12 specs validated
  - 3 active changes validated
  - 2 errors, 1 warning

Errors:
  spectr/changes/add-new-feature/specs/auth/spec.md:15
    Missing required scenario for requirement

Warnings:
  spectr/specs/api/spec.md:42
    Scenario formatting recommendation
```

### In GitHub UI

1. **Workflow Run**: Click on the failed job to see annotated files
2. **Files Changed** (in PRs): Annotations appear inline next to the code
3. **Commit Status**: The action sets commit status with validation results

### Annotation Types

- **Error**: Validation rule violation that must be fixed
  - Missing required sections
  - Invalid spec format
  - Broken references

- **Warning**: Best practice violations that should be addressed
  - Formatting recommendations
  - Potential improvements
  - Style inconsistencies

- **Info**: Helpful information
  - Successful validations
  - Suggestions for improvement

## Troubleshooting

### "Spectr not found" or Version Issues

**Problem:** The action can't find or download Spectr.

**Solutions:**

1. Check if the specified version exists
2. Verify network connectivity to GitHub releases
3. Try specifying `version: "latest"`
4. Check if the `github-token` has sufficient permissions

```yaml
- uses: connerohnesorge/spectr-action@v1
  with:
    version: "latest"
    github-token: ${{ secrets.GITHUB_TOKEN }}
```

### "Cannot find GITHUB_WORKSPACE"

**Problem:** Environment variables not set correctly.

**Solutions:**

1. Ensure you're using `actions/checkout@v4` before this action
2. Verify you're running on a supported runner (ubuntu-latest, macos-latest, windows-latest)
3. Check that the workflow has proper permissions

```yaml
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4 # Required!
      - uses: connerohnesorge/spectr-action@v1
```

### "JSON parse error"

**Problem:** Spectr output format changed or is invalid.

**Solutions:**

1. Update to the latest action version
2. Check the spectr version compatibility
3. Run `spectr validate --all --json` locally to debug

```yaml
- uses: connerohnesorge/spectr-action@v1 # Uses latest action
  with:
    version: "0.1.0" # Use known good spectr version
```

### "No specs found" or Directory Structure Issues

**Problem:** The action can't find your `spectr/` directory.

**Solutions:**

1. Verify `spectr/` directory exists in repository root
2. Ensure you've checked out the repository with `actions/checkout@v4`
3. Check that `spectr/` contains proper structure:
   - `spectr/specs/` for current specifications
   - `spectr/changes/` for active change proposals
   - `spectr/project.md` for project configuration

Expected structure:

```
repository-root/
├── .github/
│   └── workflows/
│       └── spectr.yml
├── spectr/
│   ├── project.md
│   ├── specs/
│   │   └── [capability]/
│   │       └── spec.md
│   └── changes/
│       └── [change-name]/
│           ├── proposal.md
│           └── specs/
└── ...
```

### Validation Fails on Valid Specs

**Problem:** The action reports errors on specs that appear correct.

**Solutions:**

1. Run `spectr validate --all` locally to see detailed output
2. Check for invisible characters or formatting issues
3. Verify spec format follows Spectr conventions (see Spectr documentation)
4. Ensure all requirements have at least one scenario with `#### Scenario:` format

### Action Runs Too Slowly

**Problem:** The action takes a long time to complete.

**Solutions:**

1. Pin to a specific Spectr version instead of using `latest` (caches better)
2. Reduce the number of specs/changes being validated
3. Split validation across multiple jobs if you have many specs

```yaml
- uses: connerohnesorge/spectr-action@v1
  with:
    version: "0.1.0" # Cached after first download
```

## Project Requirements

For this action to work properly, your project must:

1. **Have a `spectr/` directory** in the repository root
2. **Contain valid spec structure**:
   - `spectr/project.md` - Project conventions
   - `spectr/specs/` - Current specifications
   - `spectr/changes/` - Active change proposals (optional)
3. **Be a git repository** (required by GitHub Actions)
4. **Use the `actions/checkout` action** before spectr-action

Minimal valid structure:

```
repository-root/
├── spectr/
│   ├── project.md
│   └── specs/
│       └── example-capability/
│           └── spec.md
└── .github/
    └── workflows/
        └── spectr.yml
```

## Contributing

Issues and pull requests are welcome at the [spectr-action repository](https://github.com/connerohnesorge/spectr-action).

For issues with the Spectr tool itself, see the [main Spectr repository](https://github.com/connerohnesorge/spectr).

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## Related Projects

- [Spectr](https://github.com/connerohnesorge/spectr) - The spec-driven development CLI tool
- [Spectr Documentation](https://github.com/connerohnesorge/spectr#readme) - Full documentation and guides
