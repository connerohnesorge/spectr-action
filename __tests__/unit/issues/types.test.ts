import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CHANGE_ID_MARKER_PATTERN,
  extractChangeIdFromBody,
  generateChangeIdMarker,
  MAX_ISSUE_BODY_LENGTH,
} from "../../../src/issues/types";

describe("types.ts", () => {
  describe("generateChangeIdMarker", () => {
    it("should generate a valid marker for a change ID", () => {
      const marker = generateChangeIdMarker("add-feature");
      assert.equal(marker, "<!-- spectr-change-id:add-feature -->");
    });

    it("should handle IDs with hyphens", () => {
      const marker = generateChangeIdMarker("add-new-feature-v2");
      assert.equal(marker, "<!-- spectr-change-id:add-new-feature-v2 -->");
    });

    it("should handle IDs with underscores", () => {
      const marker = generateChangeIdMarker("add_feature");
      assert.equal(marker, "<!-- spectr-change-id:add_feature -->");
    });
  });

  describe("extractChangeIdFromBody", () => {
    it("should extract change ID from body with marker", () => {
      const body =
        "<!-- spectr-change-id:add-feature -->\n\n## Proposal\nSome content";
      const changeId = extractChangeIdFromBody(body);
      assert.equal(changeId, "add-feature");
    });

    it("should return null if no marker present", () => {
      const body = "## Proposal\nSome content without marker";
      const changeId = extractChangeIdFromBody(body);
      assert.equal(changeId, null);
    });

    it("should handle marker with extra whitespace", () => {
      const body = "<!--  spectr-change-id:add-feature  -->\n\nContent";
      const changeId = extractChangeIdFromBody(body);
      assert.equal(changeId, "add-feature");
    });

    it("should extract ID with underscores", () => {
      const body = "<!-- spectr-change-id:add_new_feature -->";
      const changeId = extractChangeIdFromBody(body);
      assert.equal(changeId, "add_new_feature");
    });

    it("should extract ID with numbers", () => {
      const body = "<!-- spectr-change-id:feature123 -->";
      const changeId = extractChangeIdFromBody(body);
      assert.equal(changeId, "feature123");
    });
  });

  describe("CHANGE_ID_MARKER_PATTERN", () => {
    it("should match valid markers", () => {
      const validMarkers = [
        "<!-- spectr-change-id:test -->",
        "<!-- spectr-change-id:test-123 -->",
        "<!-- spectr-change-id:test_abc -->",
        "<!--spectr-change-id:test-->",
        "<!--  spectr-change-id:test  -->",
      ];

      for (const marker of validMarkers) {
        assert.ok(
          CHANGE_ID_MARKER_PATTERN.test(marker),
          `Should match: ${marker}`,
        );
      }
    });

    it("should not match invalid markers", () => {
      const invalidMarkers = [
        "<!-- spectr-id:test -->",
        "<!-- change-id:test -->",
        "spectr-change-id:test",
        "<!-- spectr-change-id: -->",
      ];

      for (const marker of invalidMarkers) {
        assert.ok(
          !CHANGE_ID_MARKER_PATTERN.test(marker),
          `Should not match: ${marker}`,
        );
      }
    });
  });

  describe("MAX_ISSUE_BODY_LENGTH", () => {
    it("should be set to GitHub's limit", () => {
      assert.equal(MAX_ISSUE_BODY_LENGTH, 65536);
    });
  });
});
