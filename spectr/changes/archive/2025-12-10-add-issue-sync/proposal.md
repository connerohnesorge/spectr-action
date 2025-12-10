# Change: Add GitHub Issues sync for change proposals

## Why
Change proposals in `spectr/changes/` are currently only visible to developers who browse the repository's file tree. Syncing proposals to GitHub Issues provides better visibility, enables discussion via issue comments, integrates with GitHub's existing PR linking (`Fixes #N`), and automates lifecycle management when changes are archived.

## What Changes
- Add new action inputs to control issue sync behavior (`sync-issues`, `issue-labels`, `issue-title-prefix`, `close-on-archive`, `update-existing`, `spectr-label`)
- Add new action outputs for sync results (`issues-created`, `issues-updated`, `issues-closed`, `total-changes`)
- Implement issue discovery: scan `spectr/changes/` for active proposals with `proposal.md`
- Implement issue creation: generate issue body from `proposal.md`, affected specs, and `tasks.md`
- Implement issue tracking: use hidden HTML marker `<!-- spectr-change-id:ID -->` to link issues to changes
- Implement issue updates: sync content changes when `proposal.md` or `tasks.md` is modified
- Implement issue closure: close issues when changes are archived to `spectr/changes/archive/`
- Requires `issues: write` permission in workflows using this feature

## Impact
- Affected specs: `issue-sync` (new capability)
- Affected code:
  - `action.yml` - new inputs and outputs
  - `src/spectr-action.ts` - orchestrate issue sync
  - `src/issues/` - new module for issue sync logic
  - `src/types/` - types for issue sync
- Dependencies: Octokit (already a dependency)
