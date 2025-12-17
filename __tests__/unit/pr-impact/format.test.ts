import assert from "node:assert";
import { describe, it } from "node:test";
import {
  commentsMatch,
  formatDiffPreview,
  formatPRComment,
  formatSummaryTable,
} from "../../../src/pr-impact/format";
import type { SpecChange, SpecImpact } from "../../../src/pr-impact/types";

describe("formatSummaryTable", () => {
  it("formats counts as markdown table", () => {
    const counts = {
      added: 3,
      modified: 1,
      removed: 2,
      renamed: 0,
      total: 6,
    };

    const table = formatSummaryTable(counts);

    assert.ok(table.includes("| Operation | Count |"));
    assert.ok(table.includes("| Added | 3 |"));
    assert.ok(table.includes("| Modified | 1 |"));
    assert.ok(table.includes("| Removed | 2 |"));
    assert.ok(table.includes("| Renamed | 0 |"));
  });

  it("handles zero counts", () => {
    const counts = {
      added: 0,
      modified: 0,
      removed: 0,
      renamed: 0,
      total: 0,
    };

    const table = formatSummaryTable(counts);

    assert.ok(table.includes("| Added | 0 |"));
    assert.ok(table.includes("| Modified | 0 |"));
  });
});

describe("formatDiffPreview", () => {
  it("returns message when no changes", () => {
    const changes: SpecChange[] = [];

    const preview = formatDiffPreview(changes);

    assert.strictEqual(preview, "_No spec changes detected_");
  });

  it("formats added changes", () => {
    const changes: SpecChange[] = [
      {
        capabilityName: "auth",
        content: "Users MUST authenticate before accessing.",
        operation: "add",
        requirementName: "User Authentication",
      },
    ];

    const preview = formatDiffPreview(changes);

    assert.ok(preview.includes("<details>"));
    assert.ok(preview.includes("auth"));
    assert.ok(preview.includes("#### Added"));
    assert.ok(preview.includes("User Authentication"));
    assert.ok(preview.includes("Users MUST authenticate"));
  });

  it("formats modified changes", () => {
    const changes: SpecChange[] = [
      {
        capabilityName: "api",
        content: "Rate limit MUST be 100 requests per minute.",
        operation: "modify",
        requirementName: "Rate Limiting",
      },
    ];

    const preview = formatDiffPreview(changes);

    assert.ok(preview.includes("#### Modified"));
    assert.ok(preview.includes("Rate Limiting"));
  });

  it("formats renamed changes", () => {
    const changes: SpecChange[] = [
      {
        capabilityName: "auth",
        oldName: "Login",
        operation: "rename",
        requirementName: "User Authentication",
      },
    ];

    const preview = formatDiffPreview(changes);

    assert.ok(preview.includes("#### Renamed"));
    assert.ok(preview.includes("Login"));
    assert.ok(preview.includes("User Authentication"));
    assert.ok(preview.includes("→"));
  });

  it("formats removed changes", () => {
    const changes: SpecChange[] = [
      {
        capabilityName: "legacy",
        operation: "remove",
        requirementName: "Old Feature",
      },
    ];

    const preview = formatDiffPreview(changes);

    assert.ok(preview.includes("#### Removed"));
    assert.ok(preview.includes("Old Feature"));
  });

  it("groups changes by capability", () => {
    const changes: SpecChange[] = [
      {
        capabilityName: "auth",
        content: "Content 1",
        operation: "add",
        requirementName: "Req 1",
      },
      {
        capabilityName: "api",
        content: "Content 2",
        operation: "add",
        requirementName: "Req 2",
      },
      {
        capabilityName: "auth",
        content: "Content 3",
        operation: "modify",
        requirementName: "Req 3",
      },
    ];

    const preview = formatDiffPreview(changes);

    // Should have two collapsible sections
    assert.ok(preview.includes("<summary><strong>auth</strong>"));
    assert.ok(preview.includes("<summary><strong>api</strong>"));
  });
});

describe("formatPRComment", () => {
  it("includes marker", () => {
    const impact: SpecImpact = {
      capabilities: ["auth"],
      changeId: "add-feature",
      changes: [],
      counts: { added: 0, modified: 0, removed: 0, renamed: 0, total: 0 },
      isArchived: false,
      mode: "proposal",
    };

    const comment = formatPRComment(impact);

    assert.ok(comment.includes("<!-- spectr-pr-impact:add-feature -->"));
  });

  it("includes change ID in title", () => {
    const impact: SpecImpact = {
      capabilities: [],
      changeId: "my-change",
      changes: [],
      counts: { added: 0, modified: 0, removed: 0, renamed: 0, total: 0 },
      isArchived: false,
      mode: "proposal",
    };

    const comment = formatPRComment(impact);

    assert.ok(comment.includes("## Spectr Impact: `my-change`"));
  });

  it("shows archive status", () => {
    const impact: SpecImpact = {
      capabilities: [],
      changeId: "test",
      changes: [],
      counts: { added: 0, modified: 0, removed: 0, renamed: 0, total: 0 },
      isArchived: true,
      mode: "archive",
    };

    const comment = formatPRComment(impact);

    assert.ok(comment.includes("| Archived | Yes |"));
  });

  it("shows mode capitalized", () => {
    const impact: SpecImpact = {
      capabilities: [],
      changeId: "test",
      changes: [],
      counts: { added: 0, modified: 0, removed: 0, renamed: 0, total: 0 },
      isArchived: false,
      mode: "proposal",
    };

    const comment = formatPRComment(impact);

    assert.ok(comment.includes("| Mode | Proposal |"));
  });

  it("includes footer with link to proposal", () => {
    const impact: SpecImpact = {
      capabilities: [],
      changeId: "my-change",
      changes: [],
      counts: { added: 0, modified: 0, removed: 0, renamed: 0, total: 0 },
      isArchived: false,
      mode: "proposal",
    };

    const comment = formatPRComment(impact);

    assert.ok(comment.includes("spectr/changes/my-change/proposal.md"));
    assert.ok(comment.includes("spectr-action"));
  });
});

describe("commentsMatch", () => {
  it("returns true for identical comments", () => {
    const comment = "This is a comment";

    assert.ok(commentsMatch(comment, comment));
  });

  it("ignores whitespace differences", () => {
    const comment1 = "This is  a   comment";
    const comment2 = "This is a comment";

    assert.ok(commentsMatch(comment1, comment2));
  });

  it("ignores newline differences", () => {
    const comment1 = "Line 1\n\n\nLine 2";
    const comment2 = "Line 1\nLine 2";

    assert.ok(commentsMatch(comment1, comment2));
  });

  it("returns false for different content", () => {
    const comment1 = "This is comment one";
    const comment2 = "This is comment two";

    assert.ok(!commentsMatch(comment1, comment2));
  });
});
