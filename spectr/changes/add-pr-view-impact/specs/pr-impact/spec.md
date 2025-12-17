## ADDED Requirements

### Requirement: PR Impact Detection

The action SHALL detect spectr PRs by matching the head branch against patterns:
- `spectr/proposal/<change-id>`
- `spectr/archive/<change-id>`
- `spectr/remove/<change-id>`

The action SHALL extract the change ID and mode from matched branches.

#### Scenario: Proposal PR detected
- WHEN running on a PR with branch `spectr/proposal/add-feature`
- THEN the action identifies it as a spectr PR with mode "proposal" and changeId "add-feature"

#### Scenario: Non-spectr PR skipped
- WHEN running on a PR with branch `feature/add-something`
- THEN the action skips PR impact processing

### Requirement: Delta Spec Parsing

The action SHALL parse delta spec files from `spectr/changes/<changeId>/specs/` to extract:
- ADDED requirements with full content
- MODIFIED requirements with full content
- REMOVED requirement names
- RENAMED requirement pairs (from/to)

#### Scenario: Parse added requirements
- WHEN a delta spec contains `## ADDED Requirements` section
- THEN the action extracts requirement names and content from that section

#### Scenario: Parse renamed requirements
- WHEN a delta spec contains `## RENAMED Requirements` with FROM/TO pairs
- THEN the action extracts the rename mapping

### Requirement: PR Comment Generation

The action SHALL generate a markdown comment containing:
- Hidden marker for identification (`<!-- spectr-pr-impact:<changeId> -->`)
- Summary table with operation counts (added, modified, removed, renamed)
- List of affected capabilities
- Full diff preview with requirement content per capability
- Archive status indicator
- Link to proposal file

#### Scenario: Comment includes marker
- WHEN generating a PR comment
- THEN the comment starts with a hidden marker containing the change ID

#### Scenario: Comment shows diff preview
- WHEN generating a PR comment with spec changes
- THEN the comment includes collapsible sections per capability showing requirement details

### Requirement: Comment Management

The action SHALL find existing PR impact comments by marker pattern and update them instead of creating duplicates (when `pr-impact-update-comment` is true).

#### Scenario: Update existing comment
- WHEN `pr-impact-update-comment` is true and an existing comment with matching marker exists
- THEN the action updates the existing comment

#### Scenario: Create new comment
- WHEN no existing comment with matching marker exists
- THEN the action creates a new PR comment

### Requirement: Configuration Inputs

The action SHALL accept configuration inputs:
- `pr-impact` (default: "false") - Enable/disable the feature
- `pr-impact-update-comment` (default: "true") - Update existing comments vs create new

#### Scenario: Feature disabled by default
- WHEN `pr-impact` input is not set
- THEN the PR impact feature does not run

#### Scenario: Feature enabled
- WHEN `pr-impact` input is "true"
- THEN the PR impact feature runs on spectr PRs
