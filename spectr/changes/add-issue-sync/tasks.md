## 1. Action Configuration
- [ ] 1.1 Add `sync-issues` input to `action.yml` (default: `'false'`)
- [ ] 1.2 Add `issue-labels` input to `action.yml` (default: `'spectr,change-proposal'`)
- [ ] 1.3 Add `issue-title-prefix` input to `action.yml` (default: `'[Spectr Change]'`)
- [ ] 1.4 Add `close-on-archive` input to `action.yml` (default: `'true'`)
- [ ] 1.5 Add `update-existing` input to `action.yml` (default: `'true'`)
- [ ] 1.6 Add `spectr-label` input to `action.yml` (default: `'spectr-managed'`)
- [ ] 1.7 Add output definitions: `issues-created`, `issues-updated`, `issues-closed`, `total-changes`

## 2. Type Definitions
- [ ] 2.1 Create `src/issues/types.ts` with interfaces for `IssueSyncConfig`, `ChangeProposal`, `SyncResult`
- [ ] 2.2 Add input helper functions in `src/utils/inputs.ts` for new inputs

## 3. Change Discovery
- [ ] 3.1 Create `src/issues/discover.ts` module
- [ ] 3.2 Implement `discoverActiveChanges()` - scan `spectr/changes/` excluding `archive/`
- [ ] 3.3 Implement `discoverArchivedChanges()` - scan `spectr/changes/archive/`
- [ ] 3.4 Implement `readProposalContent()` - read `proposal.md` content
- [ ] 3.5 Implement `readTasksContent()` - read `tasks.md` content (optional)
- [ ] 3.6 Implement `findAffectedSpecs()` - list spec directories in change's `specs/` folder

## 4. Issue Formatting
- [ ] 4.1 Create `src/issues/format.ts` module
- [ ] 4.2 Implement `formatIssueTitle()` - generate title from change ID and prefix
- [ ] 4.3 Implement `formatIssueBody()` - generate body with marker, proposal, specs, tasks
- [ ] 4.4 Implement `extractChangeId()` - parse change ID from issue body marker
- [ ] 4.5 Handle body truncation for large proposals (>65536 chars)

## 5. GitHub API Integration
- [ ] 5.1 Create `src/issues/sync.ts` module
- [ ] 5.2 Implement `findManagedIssues()` - search issues by spectr-label
- [ ] 5.3 Implement `createIssue()` - create new issue with labels
- [ ] 5.4 Implement `updateIssue()` - update issue body and labels
- [ ] 5.5 Implement `closeIssue()` - close issue for archived changes
- [ ] 5.6 Implement `ensureLabelsExist()` - create labels if they don't exist

## 6. Orchestration
- [ ] 6.1 Create `src/issues/index.ts` module
- [ ] 6.2 Implement `syncIssues()` main entry point
- [ ] 6.3 Integrate issue sync into `src/spectr-action.ts` (conditional on `sync-issues` input)
- [ ] 6.4 Set action outputs for sync results

## 7. Testing
- [ ] 7.1 Add unit tests for `discover.ts` functions
- [ ] 7.2 Add unit tests for `format.ts` functions
- [ ] 7.3 Add unit tests for `sync.ts` functions (mock Octokit)
- [ ] 7.4 Add integration test with fixture containing `spectr/changes/`
- [ ] 7.5 Add test for archive detection and issue closure

## 8. Documentation
- [ ] 8.1 Update README.md with issue sync feature documentation
- [ ] 8.2 Add example workflow showing issue sync configuration
- [ ] 8.3 Document required permissions (`issues: write`)
