import assert from "node:assert";
import { describe, it } from "node:test";
import {
  extractChangeIdFromComment,
  generatePRImpactMarker,
  PR_IMPACT_MARKER_PATTERN,
} from "../../../src/pr-impact/types";

describe("generatePRImpactMarker", () => {
  it("generates correct marker format", () => {
    const marker = generatePRImpactMarker("add-feature");

    assert.strictEqual(marker, "<!-- spectr-pr-impact:add-feature -->");
  });

  it("handles change IDs with hyphens", () => {
    const marker = generatePRImpactMarker("add-user-auth-v2");

    assert.strictEqual(marker, "<!-- spectr-pr-impact:add-user-auth-v2 -->");
  });
});

describe("extractChangeIdFromComment", () => {
  it("extracts change ID from comment with marker", () => {
    const body = `<!-- spectr-pr-impact:add-feature -->

## Spectr Impact

Some content here`;

    const changeId = extractChangeIdFromComment(body);

    assert.strictEqual(changeId, "add-feature");
  });

  it("extracts change ID with flexible whitespace", () => {
    const body = "<!--  spectr-pr-impact:my-change  -->\nContent";

    const changeId = extractChangeIdFromComment(body);

    assert.strictEqual(changeId, "my-change");
  });

  it("returns null when no marker found", () => {
    const body = "Regular PR comment without marker";

    const changeId = extractChangeIdFromComment(body);

    assert.strictEqual(changeId, null);
  });

  it("returns null for empty body", () => {
    const changeId = extractChangeIdFromComment("");

    assert.strictEqual(changeId, null);
  });
});

describe("PR_IMPACT_MARKER_PATTERN", () => {
  it("matches standard marker format", () => {
    const marker = "<!-- spectr-pr-impact:test-change -->";

    assert.ok(PR_IMPACT_MARKER_PATTERN.test(marker));
  });

  it("captures change ID correctly", () => {
    const marker = "<!-- spectr-pr-impact:my-awesome-change -->";
    const match = marker.match(PR_IMPACT_MARKER_PATTERN);

    assert.ok(match);
    assert.strictEqual(match[1], "my-awesome-change");
  });

  it("handles underscores in change ID", () => {
    const marker = "<!-- spectr-pr-impact:add_feature_v2 -->";
    const match = marker.match(PR_IMPACT_MARKER_PATTERN);

    assert.ok(match);
    assert.strictEqual(match[1], "add_feature_v2");
  });

  it("does not match invalid markers", () => {
    const invalidMarker = "<!-- spectr-change-id:test -->";

    assert.ok(!PR_IMPACT_MARKER_PATTERN.test(invalidMarker));
  });
});
