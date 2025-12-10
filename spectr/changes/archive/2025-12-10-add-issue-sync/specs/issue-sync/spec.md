## ADDED Requirements

### Requirement: Issue Sync Configuration
The action SHALL accept configuration inputs to control issue synchronization behavior.

#### Scenario: Issue sync disabled by default
- WHEN the action runs without `sync-issues` input
- THEN issue synchronization SHALL NOT be performed
- AND validation SHALL proceed normally

#### Scenario: Issue sync enabled
- WHEN the action runs with `sync-issues: 'true'`
- THEN the action SHALL scan for change proposals and synchronize issues

#### Scenario: Custom labels configuration
- WHEN the action runs with `issue-labels: 'rfc,needs-review'`
- THEN created issues SHALL have labels `rfc`, `needs-review`, and the spectr-label
- AND the default labels SHALL NOT be applied

#### Scenario: Custom title prefix configuration
- WHEN the action runs with `issue-title-prefix: '[RFC]'`
- THEN created issue titles SHALL use the prefix `[RFC]` instead of `[Spectr Change]`

---

### Requirement: Change Proposal Discovery
The action SHALL discover active change proposals by scanning the `spectr/changes/` directory.

#### Scenario: Active change with proposal.md
- WHEN a directory exists at `spectr/changes/<id>/proposal.md`
- AND the directory is NOT under `spectr/changes/archive/`
- THEN the change SHALL be considered active
- AND the change SHALL be included in issue synchronization

#### Scenario: Directory without proposal.md
- WHEN a directory exists at `spectr/changes/<id>/`
- AND no `proposal.md` file exists in that directory
- THEN the directory SHALL be skipped
- AND no issue SHALL be created for that directory

#### Scenario: Archived change excluded
- WHEN a change directory exists at `spectr/changes/archive/<id>/`
- THEN the change SHALL NOT be considered active
- AND the corresponding issue SHALL be closed if it exists

---

### Requirement: Issue Creation
The action SHALL create GitHub Issues for active change proposals that do not have corresponding issues.

#### Scenario: New issue created for active change
- WHEN an active change has no corresponding GitHub Issue
- THEN a new issue SHALL be created
- AND the issue title SHALL follow the format `<prefix> <Human Readable Name>`
- AND the issue body SHALL contain a hidden marker `<!-- spectr-change-id:<id> -->`
- AND the issue body SHALL include the contents of `proposal.md`
- AND the issue SHALL be labeled with configured labels plus the spectr-label

#### Scenario: Issue body includes affected specs
- WHEN a change has spec deltas in `spectr/changes/<id>/specs/`
- THEN the issue body SHALL list the affected specification names

#### Scenario: Issue body includes tasks when present
- WHEN a change has a `tasks.md` file
- THEN the issue body SHALL include the tasks content
- WHEN a change does NOT have a `tasks.md` file
- THEN the issue SHALL be created without a tasks section

---

### Requirement: Issue Updates
The action SHALL update existing GitHub Issues when change proposal content is modified.

#### Scenario: Issue body updated on proposal change
- WHEN `update-existing` is `'true'` (default)
- AND an active change has a corresponding GitHub Issue
- AND the `proposal.md` content has changed since the last sync
- THEN the issue body SHALL be updated with the new content
- AND the hidden marker SHALL be preserved

#### Scenario: Issue updates disabled
- WHEN `update-existing` is `'false'`
- THEN existing issues SHALL NOT be modified
- AND new issues SHALL still be created for changes without issues

---

### Requirement: Issue Closure
The action SHALL close GitHub Issues when their corresponding change proposals are archived.

#### Scenario: Issue closed when change archived
- WHEN `close-on-archive` is `'true'` (default)
- AND a change is moved to `spectr/changes/archive/`
- AND a corresponding GitHub Issue exists
- THEN the issue SHALL be closed

#### Scenario: Issue closure disabled
- WHEN `close-on-archive` is `'false'`
- THEN issues for archived changes SHALL remain open

---

### Requirement: Issue-Change Mapping
The action SHALL use a hidden HTML marker to map GitHub Issues to change proposals.

#### Scenario: Marker identifies change
- WHEN an issue body contains `<!-- spectr-change-id:add-feature -->`
- THEN the issue SHALL be mapped to the change at `spectr/changes/add-feature/`

#### Scenario: Missing marker treated as orphan
- WHEN an issue has the spectr-label but no valid marker
- THEN the issue SHALL NOT be updated or closed by the action
- AND a warning SHALL be logged

---

### Requirement: Sync Result Outputs
The action SHALL output metrics about the synchronization operation.

#### Scenario: Output counts set after sync
- WHEN issue synchronization completes
- THEN `issues-created` output SHALL contain the count of newly created issues
- AND `issues-updated` output SHALL contain the count of updated issues
- AND `issues-closed` output SHALL contain the count of closed issues
- AND `total-changes` output SHALL contain the count of active change proposals found

---

### Requirement: Label Management
The action SHALL ensure required labels exist before creating issues.

#### Scenario: Label created if missing
- WHEN an issue is being created
- AND a configured label does not exist in the repository
- THEN the label SHALL be created with a default color

#### Scenario: Existing labels preserved
- WHEN an issue is being updated
- AND the issue has additional labels not managed by the action
- THEN those labels SHALL be preserved
