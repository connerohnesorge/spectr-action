#!/usr/bin/env node
import { spawn } from "node:child_process";
import { glob } from "glob";

async function runTests() {
  // Get test pattern from command line args (default to all tests)
  const pattern = process.argv[2] || "__tests__/**/*.test.ts";

  // Find all test files
  const testFiles = await glob(pattern, { posix: true });

  if (testFiles.length === 0) {
    console.error(`No test files found matching pattern: ${pattern}`);
    process.exit(1);
  }

  console.log(`Found ${testFiles.length} test files matching ${pattern}`);

  // Run tsx with the found test files
  const tsx = spawn("tsx", ["--test", ...testFiles], {
    shell: false,
    stdio: "inherit",
  });

  tsx.on("close", (code) => {
    process.exit(code || 0);
  });
}

runTests().catch((err) => {
  console.error("Error running tests:", err);
  process.exit(1);
});
