## Context
The spectr-action currently validates Spectr specs and creates GitHub annotations for issues. Users want to track change proposals as GitHub Issues for better visibility and collaboration. This requires integrating with the GitHub Issues API, managing issue lifecycle, and maintaining a mapping between local change directories and remote issues.

**Stakeholders**: Repository maintainers, contributors tracking proposals, CI/CD workflows

**Constraints**:
- Must work within GitHub Actions runtime
- Must handle rate limits gracefully
- Must not break existing validation-only workflows
- Must be opt-in (disabled by default)

## Goals / Non-Goals

**Goals**:
- Automatically create GitHub Issues for active change proposals
- Keep issue content in sync with `proposal.md` and `tasks.md`
- Close issues when changes are archived
- Provide configurable labels and title prefixes
- Support idempotent operations (safe to run multiple times)

**Non-Goals**:
- Two-way sync (editing issues does not update files)
- Managing issue comments or reactions
- PR creation or linking automation
- Support for non-GitHub platforms

## Decisions

### Decision: Use HTML comments for issue-to-change mapping
Issues will contain a hidden HTML marker at the top of the body:
```html
<!-- spectr-change-id:change-name -->
```

**Rationale**: This approach is:
- Invisible to users viewing the issue
- Survives issue body edits (users can add content below)
- Easy to search via GitHub API
- Used by other tools (e.g., release-drafter)

**Alternatives considered**:
- Issue labels with change ID: Labels are visible and can be accidentally removed
- Separate state file: Adds complexity, requires file commits
- Issue title parsing: Fragile, titles can be edited

### Decision: Module structure under `src/issues/`
New code will be organized as:
```
src/issues/
  index.ts        # Main sync orchestration
  discover.ts     # Find active changes in spectr/changes/
  format.ts       # Generate issue body from proposal content
  sync.ts         # Create/update/close issues via GitHub API
  types.ts        # TypeScript types for issue sync
```

**Rationale**: Follows existing pattern of modular organization (`src/download/`, `src/utils/`). Keeps issue sync logic isolated from core validation.

### Decision: Read tasks.md as optional
Issues will include tasks if `tasks.md` exists, but will not fail if it doesn't.

**Rationale**: The Spectr format requires `proposal.md` but `tasks.md` is optional. Matching this behavior avoids false negatives.

### Decision: Archive detection by directory presence
A change is considered archived when its directory exists under `spectr/changes/archive/`.

**Rationale**: This matches how `spectr archive` works. No need to track state separately.

## Risks / Trade-offs

| Risk | Impact | Mitigation |
|------|--------|------------|
| API rate limits | Sync fails for repos with many changes | Use authenticated requests (github-token), batch operations |
| Orphaned issues | Issues exist without matching change | Document manual cleanup process |
| Permission errors | Workflow lacks `issues: write` | Clear error messages, documentation |
| Marker tampering | Users remove hidden marker | Document that marker is required, create new issue if missing |

## Migration Plan

1. **No migration needed** - This is a new opt-in feature
2. Users enable by adding `sync-issues: 'true'` to workflow
3. First run creates issues for all existing active changes
4. Subsequent runs update/close as needed

**Rollback**: Remove `sync-issues: 'true'` from workflow. Existing issues remain but stop syncing.

## Open Questions

1. **Should we support custom issue templates?** - Deferred to future enhancement
2. **Should we add issue assignee support?** - Deferred to future enhancement
3. **How to handle very large proposal.md files?** - GitHub issues have a 65536 character limit; truncate with notice if exceeded
