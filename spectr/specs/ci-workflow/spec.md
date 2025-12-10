# Ci Workflow Specification

## Purpose

TODO: Add purpose description

## Requirements

### Requirement: Self-Validation in CI
The CI workflow SHALL run spectr-action on the repository's own `spectr/` directory to validate specs.

#### Scenario: Successful validation on valid specs
- GIVEN the repository has a valid `spectr/` directory
- WHEN the `validate-spectr` CI job runs
- THEN spectr-action executes with `strict: true`
- AND the job passes if all specs are valid

#### Scenario: Failed validation surfaces errors
- GIVEN the repository has invalid specs in `spectr/`
- WHEN the `validate-spectr` CI job runs
- THEN spectr-action reports validation errors as GitHub annotations
- AND the job fails to prevent merging invalid specs

### Requirement: Fixture Tests Handle Existing Spectr Directory
Fixture-based tests SHALL remove the existing `spectr/` directory before copying test fixtures to avoid `cp -r` directory nesting issues.

#### Scenario: Fixture copy replaces existing directory
- GIVEN the repository has a `spectr/` directory at the root
- WHEN a fixture-based test job runs
- THEN the existing `spectr/` directory is removed before copying the fixture
- AND the fixture is copied correctly to `./spectr`

