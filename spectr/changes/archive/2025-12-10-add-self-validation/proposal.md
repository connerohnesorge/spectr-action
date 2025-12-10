# Change: Add self-validation with spectr-action

## Why
The spectr-action repository has its own `spectr/` directory for spec-driven development but doesn't validate it in CI. Running spectr-action on itself ("dogfooding") ensures the repo's specs stay valid and demonstrates the action's real-world usage.

Additionally, now that a real `spectr/` directory exists at the root, the existing fixture-based tests will break. When `cp -r source dest` runs and `dest` already exists, it copies INTO the directory (creating `spectr/spectr/`) rather than replacing it.

## What Changes
- Add a new CI job `validate-spectr` that runs spectr-action on the repo's own `spectr/` directory
- Job runs after `lint-and-build` to use the freshly built action
- Uses `strict: true` to catch warnings as errors
- No fixture copying required - validates the real project structure
- **Fix existing tests**: Update all fixture copy steps to remove `./spectr` before copying (`rm -rf ./spectr && cp -r ...`)

## Affected Tests (need fixture copy fix)
- `test-valid-project`
- `test-valid-with-changes`
- `test-multi-capability`
- `test-invalid-project`
- `test-invalid-malformed`
- `test-strict-mode`
- `test-empty-project`
- `test-version-resolution`

## Impact
- Affected specs: `ci-workflow` (new capability)
- Affected code: `.github/workflows/test.yml`
- Dependencies: Requires `lint-and-build` job to complete first
