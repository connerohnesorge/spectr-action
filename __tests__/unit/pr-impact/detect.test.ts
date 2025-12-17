import assert from "node:assert";
import { describe, it } from "node:test";
import { parseSpectrBranch } from "../../../src/pr-impact/detect";

describe("parseSpectrBranch", () => {
  it("parses proposal branch correctly", () => {
    const result = parseSpectrBranch("spectr/proposal/add-feature");

    assert.strictEqual(result.isSpectrBranch, true);
    assert.strictEqual(result.mode, "proposal");
    assert.strictEqual(result.changeId, "add-feature");
  });

  it("parses archive branch correctly", () => {
    const result = parseSpectrBranch("spectr/archive/update-auth");

    assert.strictEqual(result.isSpectrBranch, true);
    assert.strictEqual(result.mode, "archive");
    assert.strictEqual(result.changeId, "update-auth");
  });

  it("parses remove branch correctly", () => {
    const result = parseSpectrBranch("spectr/remove/old-feature");

    assert.strictEqual(result.isSpectrBranch, true);
    assert.strictEqual(result.mode, "remove");
    assert.strictEqual(result.changeId, "old-feature");
  });

  it("handles change IDs with hyphens", () => {
    const result = parseSpectrBranch("spectr/proposal/add-user-auth-v2");

    assert.strictEqual(result.isSpectrBranch, true);
    assert.strictEqual(result.changeId, "add-user-auth-v2");
  });

  it("returns false for non-spectr branches", () => {
    const result = parseSpectrBranch("feature/add-something");

    assert.strictEqual(result.isSpectrBranch, false);
    assert.strictEqual(result.mode, null);
    assert.strictEqual(result.changeId, null);
  });

  it("returns false for main branch", () => {
    const result = parseSpectrBranch("main");

    assert.strictEqual(result.isSpectrBranch, false);
    assert.strictEqual(result.mode, null);
    assert.strictEqual(result.changeId, null);
  });

  it("returns false for spectr branch without mode", () => {
    const result = parseSpectrBranch("spectr/something-else");

    assert.strictEqual(result.isSpectrBranch, false);
    assert.strictEqual(result.mode, null);
    assert.strictEqual(result.changeId, null);
  });

  it("returns false for spectr branch without change ID", () => {
    const result = parseSpectrBranch("spectr/proposal/");

    // The regex will capture empty string for changeId
    // Depending on behavior, this should be treated as invalid
    assert.strictEqual(result.isSpectrBranch, false);
  });
});
