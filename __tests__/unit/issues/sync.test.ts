import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import { createOctokitClient, getRepoContext } from "../../../src/issues/sync";

describe("sync.ts", () => {
  describe("createOctokitClient", () => {
    it("should create an Octokit client with auth token", () => {
      const client = createOctokitClient("test-token");
      assert.ok(client);
      assert.ok(client.rest);
      assert.ok(client.rest.issues);
    });
  });

  describe("getRepoContext", () => {
    const originalEnv = process.env.GITHUB_REPOSITORY;

    afterEach(() => {
      if (originalEnv !== undefined) {
        process.env.GITHUB_REPOSITORY = originalEnv;
      } else {
        delete process.env.GITHUB_REPOSITORY;
      }
    });

    it("should parse owner and repo from GITHUB_REPOSITORY", () => {
      process.env.GITHUB_REPOSITORY = "owner/repo-name";
      const context = getRepoContext();
      assert.equal(context.owner, "owner");
      assert.equal(context.repo, "repo-name");
    });

    it("should handle repos with hyphens and underscores", () => {
      process.env.GITHUB_REPOSITORY = "my-org/my_repo-name";
      const context = getRepoContext();
      assert.equal(context.owner, "my-org");
      assert.equal(context.repo, "my_repo-name");
    });

    it("should throw if GITHUB_REPOSITORY is not set", () => {
      delete process.env.GITHUB_REPOSITORY;
      assert.throws(() => getRepoContext(), {
        message: "GITHUB_REPOSITORY environment variable is not set",
      });
    });

    it("should throw for invalid format", () => {
      process.env.GITHUB_REPOSITORY = "invalid-format";
      assert.throws(() => getRepoContext(), {
        message: /Invalid GITHUB_REPOSITORY format/,
      });
    });
  });

  describe("findManagedIssues", () => {
    it("should filter out pull requests from results", async () => {
      // Create a mock Octokit that returns a mix of issues and PRs
      const mockIssues = [
        {
          body: "<!-- spectr-change-id:change-1 -->\nContent",
          number: 1,
          pull_request: undefined,
          state: "open",
          title: "Issue 1",
        },
        {
          body: "<!-- spectr-change-id:change-2 -->\nContent",
          number: 2,
          pull_request: { url: "https://github.com/..." },
          state: "open",
          title: "PR 1",
        },
        {
          body: "<!-- spectr-change-id:change-3 -->\nContent",
          number: 3,
          pull_request: undefined,
          state: "closed",
          title: "Issue 2",
        },
      ];

      // Import dynamically to allow mocking
      const { findManagedIssues } = await import("../../../src/issues/sync");

      const mockOctokit = {
        paginate: async () => mockIssues,
        rest: {
          issues: {
            listForRepo: {},
          },
        },
      } as any;

      const repo = { owner: "test", repo: "repo" };
      const result = await findManagedIssues(
        mockOctokit,
        repo,
        "spectr-managed",
      );

      // Should exclude the PR (number 2)
      assert.equal(result.length, 2);
      assert.equal(result[0].number, 1);
      assert.equal(result[0].changeId, "change-1");
      assert.equal(result[1].number, 3);
      assert.equal(result[1].changeId, "change-3");
    });

    it("should extract change IDs from issue bodies", async () => {
      const mockIssues = [
        {
          body: "<!-- spectr-change-id:add-feature -->\n\n## Proposal\nContent here",
          number: 10,
          state: "open",
          title: "[Spectr Change] add-feature",
        },
      ];

      const { findManagedIssues } = await import("../../../src/issues/sync");

      const mockOctokit = {
        paginate: async () => mockIssues,
        rest: {
          issues: {
            listForRepo: {},
          },
        },
      } as any;

      const repo = { owner: "test", repo: "repo" };
      const result = await findManagedIssues(
        mockOctokit,
        repo,
        "spectr-managed",
      );

      assert.equal(result.length, 1);
      assert.equal(result[0].changeId, "add-feature");
      assert.equal(result[0].state, "open");
    });

    it("should skip issues without change ID marker", async () => {
      const mockIssues = [
        {
          body: "No marker here",
          number: 1,
          state: "open",
          title: "Regular issue",
        },
        {
          body: "<!-- spectr-change-id:with-marker -->\nContent",
          number: 2,
          state: "open",
          title: "[Spectr Change] with-marker",
        },
      ];

      const { findManagedIssues } = await import("../../../src/issues/sync");

      const mockOctokit = {
        paginate: async () => mockIssues,
        rest: {
          issues: {
            listForRepo: {},
          },
        },
      } as any;

      const repo = { owner: "test", repo: "repo" };
      const result = await findManagedIssues(
        mockOctokit,
        repo,
        "spectr-managed",
      );

      assert.equal(result.length, 1);
      assert.equal(result[0].number, 2);
    });
  });

  describe("createIssue", () => {
    it("should call octokit.rest.issues.create with correct params", async () => {
      const { createIssue } = await import("../../../src/issues/sync");

      let capturedParams: any = null;
      const mockOctokit = {
        rest: {
          issues: {
            create: async (params: any) => {
              capturedParams = params;
              return { data: { number: 42 } };
            },
          },
        },
      } as any;

      const repo = { owner: "test-owner", repo: "test-repo" };
      const result = await createIssue(
        mockOctokit,
        repo,
        "Test Title",
        "Test Body",
        ["label1", "label2"],
      );

      assert.equal(result, 42);
      assert.equal(capturedParams.owner, "test-owner");
      assert.equal(capturedParams.repo, "test-repo");
      assert.equal(capturedParams.title, "Test Title");
      assert.equal(capturedParams.body, "Test Body");
      assert.deepEqual(capturedParams.labels, ["label1", "label2"]);
    });
  });

  describe("updateIssue", () => {
    it("should call octokit.rest.issues.update with correct params", async () => {
      const { updateIssue } = await import("../../../src/issues/sync");

      let capturedParams: any = null;
      const mockOctokit = {
        rest: {
          issues: {
            update: async (params: any) => {
              capturedParams = params;
              return { data: {} };
            },
          },
        },
      } as any;

      const repo = { owner: "test-owner", repo: "test-repo" };
      await updateIssue(
        mockOctokit,
        repo,
        123,
        "Updated Title",
        "Updated Body",
        ["new-label"],
      );

      assert.equal(capturedParams.owner, "test-owner");
      assert.equal(capturedParams.repo, "test-repo");
      assert.equal(capturedParams.issue_number, 123);
      assert.equal(capturedParams.title, "Updated Title");
      assert.equal(capturedParams.body, "Updated Body");
      assert.deepEqual(capturedParams.labels, ["new-label"]);
    });
  });

  describe("closeIssue", () => {
    it("should close issue without comment when not provided", async () => {
      const { closeIssue } = await import("../../../src/issues/sync");

      let updateCalled = false;
      let commentCalled = false;

      const mockOctokit = {
        rest: {
          issues: {
            createComment: async () => {
              commentCalled = true;
              return { data: {} };
            },
            update: async (params: any) => {
              updateCalled = true;
              assert.equal(params.state, "closed");
              assert.equal(params.state_reason, "completed");
              return { data: {} };
            },
          },
        },
      } as any;

      const repo = { owner: "test", repo: "repo" };
      await closeIssue(mockOctokit, repo, 123);

      assert.ok(updateCalled);
      assert.ok(!commentCalled);
    });

    it("should add comment before closing when provided", async () => {
      const { closeIssue } = await import("../../../src/issues/sync");

      const callOrder: string[] = [];

      const mockOctokit = {
        rest: {
          issues: {
            createComment: async (params: any) => {
              callOrder.push("comment");
              assert.equal(params.body, "Closing comment");
              return { data: {} };
            },
            update: async (params: any) => {
              callOrder.push("update");
              return { data: {} };
            },
          },
        },
      } as any;

      const repo = { owner: "test", repo: "repo" };
      await closeIssue(mockOctokit, repo, 123, "Closing comment");

      assert.deepEqual(callOrder, ["comment", "update"]);
    });
  });

  describe("reopenIssue", () => {
    it("should reopen a closed issue", async () => {
      const { reopenIssue } = await import("../../../src/issues/sync");

      let capturedParams: any = null;
      const mockOctokit = {
        rest: {
          issues: {
            update: async (params: any) => {
              capturedParams = params;
              return { data: {} };
            },
          },
        },
      } as any;

      const repo = { owner: "test", repo: "repo" };
      await reopenIssue(mockOctokit, repo, 456);

      assert.equal(capturedParams.issue_number, 456);
      assert.equal(capturedParams.state, "open");
    });
  });

  describe("ensureLabelsExist", () => {
    it("should create missing labels", async () => {
      const { ensureLabelsExist } = await import("../../../src/issues/sync");

      const createdLabels: string[] = [];
      const mockOctokit = {
        paginate: async () => [{ name: "existing-label" }],
        rest: {
          issues: {
            createLabel: async (params: any) => {
              createdLabels.push(params.name);
              return { data: {} };
            },
            listLabelsForRepo: {},
          },
        },
      } as any;

      const repo = { owner: "test", repo: "repo" };
      const config = {
        labels: ["spectr", "change-proposal"],
        spectrLabel: "spectr-managed",
      } as any;

      await ensureLabelsExist(mockOctokit, repo, config);

      assert.ok(createdLabels.includes("spectr"));
      assert.ok(createdLabels.includes("change-proposal"));
      assert.ok(createdLabels.includes("spectr-managed"));
    });

    it("should not create labels that already exist", async () => {
      const { ensureLabelsExist } = await import("../../../src/issues/sync");

      const createdLabels: string[] = [];
      const mockOctokit = {
        paginate: async () => [{ name: "spectr" }, { name: "spectr-managed" }],
        rest: {
          issues: {
            createLabel: async (params: any) => {
              createdLabels.push(params.name);
              return { data: {} };
            },
            listLabelsForRepo: {},
          },
        },
      } as any;

      const repo = { owner: "test", repo: "repo" };
      const config = {
        labels: ["spectr", "change-proposal"],
        spectrLabel: "spectr-managed",
      } as any;

      await ensureLabelsExist(mockOctokit, repo, config);

      // Only change-proposal should be created
      assert.deepEqual(createdLabels, ["change-proposal"]);
    });

    it("should handle 422 errors gracefully (label race condition)", async () => {
      const { ensureLabelsExist } = await import("../../../src/issues/sync");

      const mockOctokit = {
        paginate: async () => [],
        rest: {
          issues: {
            createLabel: async () => {
              const error = new Error("Validation Failed") as any;
              error.status = 422;
              throw error;
            },
            listLabelsForRepo: {},
          },
        },
      } as any;

      const repo = { owner: "test", repo: "repo" };
      const config = {
        labels: ["spectr"],
        spectrLabel: "spectr-managed",
      } as any;

      // Should not throw
      await ensureLabelsExist(mockOctokit, repo, config);
    });

    it("should rethrow non-422 errors", async () => {
      const { ensureLabelsExist } = await import("../../../src/issues/sync");

      const mockOctokit = {
        paginate: async () => [],
        rest: {
          issues: {
            createLabel: async () => {
              const error = new Error("Server Error") as any;
              error.status = 500;
              throw error;
            },
            listLabelsForRepo: {},
          },
        },
      } as any;

      const repo = { owner: "test", repo: "repo" };
      const config = {
        labels: ["spectr"],
        spectrLabel: "spectr-managed",
      } as any;

      await assert.rejects(() => ensureLabelsExist(mockOctokit, repo, config), {
        message: "Server Error",
      });
    });
  });
});
