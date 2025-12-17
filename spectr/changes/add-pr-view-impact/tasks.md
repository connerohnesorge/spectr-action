## 1. Core Implementation

- [x] 1.1 Create type definitions (`src/pr-impact/types.ts`)
- [x] 1.2 Implement PR detection logic (`src/pr-impact/detect.ts`)
- [x] 1.3 Implement delta spec parsing (`src/pr-impact/calculate.ts`)
- [x] 1.4 Implement PR comment formatting (`src/pr-impact/format.ts`)
- [x] 1.5 Implement GitHub API integration (`src/pr-impact/comment.ts`)
- [x] 1.6 Create orchestration module (`src/pr-impact/index.ts`)

## 2. Integration

- [x] 2.1 Add input configuration function (`src/utils/inputs.ts`)
- [x] 2.2 Update action.yml with new inputs and outputs
- [x] 2.3 Integrate PR impact into main action flow (`src/spectr-action.ts`)

## 3. Testing

- [x] 3.1 Add unit tests for detect module
- [x] 3.2 Add unit tests for types module
- [x] 3.3 Add unit tests for format module
- [x] 3.4 Verify all tests pass
- [x] 3.5 Build and package action
