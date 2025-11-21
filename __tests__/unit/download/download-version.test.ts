import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveVersion } from "../../../src/download/download-version";

describe("resolveVersion", () => {
  it("prefixes explicit versions without leading v", async () => {
    const version = await resolveVersion("0.1.0", "");
    assert.equal(version, "v0.1.0");
  });

  it("returns explicit versions with leading v unchanged", async () => {
    const version = await resolveVersion("v0.1.0", "");
    assert.equal(version, "v0.1.0");
  });
});
