import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

test("internal advertising records and backups stay out of the public repository", () => {
  const root = fileURLToPath(new URL("../", import.meta.url));
  const tracked = execFileSync("git", ["ls-files", "-z"], { cwd: root, encoding: "utf8" }).split("\0");
  const privateFiles = tracked.filter((file) =>
    file.startsWith(".private/") ||
    /^artifacts\/meta-ads-[^/]+\//.test(file) ||
    /^tools\/build-meta-[^/]+\.mjs$/.test(file)
  );
  assert.deepEqual(privateFiles, [], "Internal advertising files must remain local and untracked.");
});
