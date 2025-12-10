## 1. Fix Existing Fixture Tests
- [x] 1.1 Update `test-valid-project` to remove spectr dir before copying fixture
- [x] 1.2 Update `test-valid-with-changes` to remove spectr dir before copying fixture
- [x] 1.3 Update `test-multi-capability` to remove spectr dir before copying fixture
- [x] 1.4 Update `test-invalid-project` to remove spectr dir before copying fixture
- [x] 1.5 Update `test-invalid-malformed` to remove spectr dir before copying fixture
- [x] 1.6 Update `test-strict-mode` to remove spectr dir before copying fixture
- [x] 1.7 Update `test-empty-project` to remove spectr dir before copying fixture
- [x] 1.8 Update `test-version-resolution` to remove spectr dir before copying fixture

## 2. Add Self-Validation Job
- [x] 2.1 Add `validate-spectr` job to `.github/workflows/test.yml`
- [x] 2.2 Configure job to depend on `lint-and-build`
- [x] 2.3 Add job to `all-tests-passed` dependency list

## 3. Validation
- [x] 3.1 Verify workflow syntax is valid
- [x] 3.2 Ensure spectr directory exists and is valid for CI run
