import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
  discoverActiveChanges,
  discoverArchivedChanges,
  findAffectedSpecs,
  readProposalContent,
  readTasksContent,
} from "../../../src/issues/discover";

describe("discover.ts", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "spectr-test-"));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { force: true, recursive: true });
  });

  function createChange(
    name: string,
    options: {
      archived?: boolean;
      hasProposal?: boolean;
      proposalContent?: string;
      tasksContent?: string;
      tasksJson?: object;
      specs?: string[];
    } = {},
  ) {
    const {
      archived = false,
      hasProposal = true,
      proposalContent = "# Test Proposal\n\nThis is a test.",
      tasksContent,
      tasksJson,
      specs = [],
    } = options;

    const basePath = archived
      ? path.join(tempDir, "spectr", "changes", "archive", name)
      : path.join(tempDir, "spectr", "changes", name);

    fs.mkdirSync(basePath, { recursive: true });

    if (hasProposal) {
      fs.writeFileSync(path.join(basePath, "proposal.md"), proposalContent);
    }

    if (tasksContent) {
      fs.writeFileSync(path.join(basePath, "tasks.md"), tasksContent);
    }

    if (tasksJson) {
      fs.writeFileSync(
        path.join(basePath, "tasks.json"),
        JSON.stringify(tasksJson),
      );
    }

    for (const spec of specs) {
      const specPath = path.join(basePath, "specs", spec);
      fs.mkdirSync(specPath, { recursive: true });
      fs.writeFileSync(path.join(specPath, "spec.md"), `# ${spec} spec`);
    }

    return basePath;
  }

  describe("discoverActiveChanges", () => {
    it("should return empty array when no changes directory exists", async () => {
      const changes = await discoverActiveChanges(tempDir);
      assert.deepEqual(changes, []);
    });

    it("should discover active changes with proposal.md", async () => {
      createChange("feature-1");
      createChange("feature-2");

      const changes = await discoverActiveChanges(tempDir);
      assert.equal(changes.length, 2);

      const ids = changes.map((c) => c.id).sort();
      assert.deepEqual(ids, ["feature-1", "feature-2"]);
    });

    it("should ignore directories without proposal.md", async () => {
      createChange("valid-change");
      createChange("invalid-change", { hasProposal: false });

      const changes = await discoverActiveChanges(tempDir);
      assert.equal(changes.length, 1);
      assert.equal(changes[0].id, "valid-change");
    });

    it("should exclude archived changes", async () => {
      createChange("active-change");
      createChange("archived-change", { archived: true });

      const changes = await discoverActiveChanges(tempDir);
      assert.equal(changes.length, 1);
      assert.equal(changes[0].id, "active-change");
      assert.equal(changes[0].isArchived, false);
    });

    it("should include proposal content", async () => {
      createChange("my-change", {
        proposalContent: "# My Proposal\n\nCustom content here.",
      });

      const changes = await discoverActiveChanges(tempDir);
      assert.equal(changes.length, 1);
      assert.ok(changes[0].proposalContent.includes("Custom content here"));
    });

    it("should include tasks content when present", async () => {
      createChange("with-tasks", {
        tasksContent: "- [ ] Task 1\n- [x] Task 2",
      });

      const changes = await discoverActiveChanges(tempDir);
      assert.equal(changes.length, 1);
      assert.ok(changes[0].tasksContent?.includes("Task 1"));
    });

    it("should include affected specs", async () => {
      createChange("with-specs", {
        specs: ["auth", "api"],
      });

      const changes = await discoverActiveChanges(tempDir);
      assert.equal(changes.length, 1);
      assert.deepEqual(changes[0].affectedSpecs.sort(), ["api", "auth"]);
    });
  });

  describe("discoverArchivedChanges", () => {
    it("should return empty array when no archive directory exists", async () => {
      const changes = await discoverArchivedChanges(tempDir);
      assert.deepEqual(changes, []);
    });

    it("should discover archived changes", async () => {
      createChange("archived-1", { archived: true });
      createChange("archived-2", { archived: true });

      const changes = await discoverArchivedChanges(tempDir);
      assert.equal(changes.length, 2);

      const ids = changes.map((c) => c.id).sort();
      assert.deepEqual(ids, ["archived-1", "archived-2"]);
    });

    it("should mark changes as archived", async () => {
      createChange("archived-change", { archived: true });

      const changes = await discoverArchivedChanges(tempDir);
      assert.equal(changes.length, 1);
      assert.equal(changes[0].isArchived, true);
    });
  });

  describe("readProposalContent", () => {
    it("should read proposal.md content", () => {
      const changePath = createChange("test-change", {
        proposalContent: "Expected content",
      });

      const content = readProposalContent(changePath);
      assert.equal(content, "Expected content");
    });

    it("should return null if proposal.md does not exist", () => {
      const changePath = createChange("no-proposal", { hasProposal: false });

      const content = readProposalContent(changePath);
      assert.equal(content, null);
    });
  });

  describe("readTasksContent", () => {
    it("should read tasks.md content", () => {
      const changePath = createChange("with-tasks", {
        tasksContent: "- [ ] Task item",
      });

      const content = readTasksContent(changePath);
      assert.equal(content, "- [ ] Task item");
    });

    it("should read and format tasks.json content", () => {
      const changePath = createChange("with-json-tasks", {
        tasksJson: {
          tasks: [
            {
              description: "First task",
              id: "1.1",
              section: "Setup",
              status: "completed",
            },
            {
              description: "Second task",
              id: "1.2",
              section: "Setup",
              status: "pending",
            },
          ],
          version: 1,
        },
      });

      const content = readTasksContent(changePath);
      assert.ok(content?.includes("First task"));
      assert.ok(content?.includes("Second task"));
      assert.ok(content?.includes("[x]")); // completed
      assert.ok(content?.includes("[ ]")); // pending
    });

    it("should return undefined if no tasks file exists", () => {
      const changePath = createChange("no-tasks");

      const content = readTasksContent(changePath);
      assert.equal(content, undefined);
    });
  });

  describe("findAffectedSpecs", () => {
    it("should find spec directories", () => {
      const changePath = createChange("with-specs", {
        specs: ["auth", "api", "database"],
      });

      const specs = findAffectedSpecs(changePath);
      assert.deepEqual(specs.sort(), ["api", "auth", "database"]);
    });

    it("should return empty array if no specs directory", () => {
      const changePath = createChange("no-specs");

      const specs = findAffectedSpecs(changePath);
      assert.deepEqual(specs, []);
    });

    it("should only include directories, not files", () => {
      const changePath = createChange("mixed-specs", {
        specs: ["valid-spec"],
      });

      // Add a file in specs directory
      const specsPath = path.join(changePath, "specs");
      fs.writeFileSync(path.join(specsPath, "readme.md"), "Some file");

      const specs = findAffectedSpecs(changePath);
      assert.deepEqual(specs, ["valid-spec"]);
    });
  });
});
