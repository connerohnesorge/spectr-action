# Change: Add PR Spec Impact Viewing

## Why

When viewing PRs created with `spectr pr p` (proposal/archive/remove), users need visibility into what spec changes the PR introduces. Currently there's no automated way to see the impact of delta specs on the overall specification.

## What Changes

- Add PR impact comment feature to show spec changes on PRs
- Detect spectr PRs via branch name pattern (`spectr/proposal/*`, `spectr/archive/*`, `spectr/remove/*`)
- Parse delta spec files to extract ADDED/MODIFIED/REMOVED/RENAMED requirements
- Display full diff preview with requirement content in PR comment
- Show archive status for changes
- Create/update comments automatically on spectr PRs

## Impact

- Affected specs: `pr-impact` (new capability)
- Affected code: `src/pr-impact/`, `src/spectr-action.ts`, `src/utils/inputs.ts`, `action.yml`
- Dependencies: @octokit/core, @actions/core
