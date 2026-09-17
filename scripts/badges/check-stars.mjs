#!/usr/bin/env node
/**
 * Checks that a claimant stars the project each claimed level is built on.
 *
 * One repository per level, declared in training-universe.json (levels[].star).
 * A level 2 claim also needs the level 1 star, and a level 3 claim all three,
 * the same way the audit re-runs the levels below.
 *
 * Reads: LEVEL, HANDLE, GH_TOKEN
 * Writes on stdout, for $GITHUB_OUTPUT: starred
 * Writes the comment body to STARS_FILE (default /tmp/stars.md) when a star is missing.
 *
 * Rule 3 of the workflow: the handle is untrusted input. It is validated here
 * and handed to gh as an argument, never through a shell.
 */
import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const universe = JSON.parse(fs.readFileSync(path.join(ROOT, "training-universe.json"), "utf8"));

const commentFile = process.env.STARS_FILE || "/tmp/stars.md";
const level = Number.parseInt(process.env.LEVEL || "", 10);
const handle = (process.env.HANDLE || "").trim();

function output(values) {
  for (const [key, value] of Object.entries(values)) {
    console.log(`${key}=${value}`);
  }
}

if (!Number.isInteger(level) || !/^[A-Za-z0-9][A-Za-z0-9-]{0,38}$/.test(handle)) {
  output({ starred: "false" });
  fs.writeFileSync(commentFile, "## This claim could not be read\n\nThe level or the handle is not usable.\n");
  process.exit(0);
}

const wanted = universe.levels
  .filter((l) => l.level <= level && l.star)
  .map((l) => ({ level: l.level, repo: l.star }));

if (wanted.length === 0) {
  output({ starred: "true" });
  process.exit(0);
}

const res = spawnSync(
  "gh",
  ["api", "--paginate", `users/${handle}/starred`, "--jq", ".[].full_name"],
  { encoding: "utf8" }
);

if (res.status !== 0) {
  const stderr = res.stderr || "gh api failed";
  console.error(stderr);
  if (/HTTP 404|Not Found/i.test(stderr)) {
    // There is no such account, so there is no star list to read. The claim
    // names a handle the audit cannot check, which is not something to pass.
    fs.writeFileSync(
      commentFile,
      `## The account could not be read

GitHub knows no account **@${handle}**, so its stars cannot be checked.
`
    );
    output({ starred: "false" });
    process.exit(0);
  }
  // Anything else is GitHub being unavailable. Never fail a claim on our side.
  output({ starred: "true" });
  process.exit(0);
}

const starred = new Set(
  res.stdout
    .split(/\r?\n/)
    .map((line) => line.trim().toLowerCase())
    .filter(Boolean)
);

const missing = wanted.filter((w) => !starred.has(w.repo.toLowerCase()));

if (missing.length === 0) {
  output({ starred: "true" });
  process.exit(0);
}

const lines = [
  "## One star is missing",
  "",
  "Each level of this course asks you to star the open source project it teaches. It is free, it",
  "is how these projects stay visible, and it is the only thing a claim asks of you beyond the work:",
  ""
];
for (const item of missing) {
  lines.push(`- Level ${item.level}: [${item.repo}](https://github.com/${item.repo})`);
}
lines.push(
  "",
  `Star what is listed above with the account **@${handle}**, then edit this issue and the audit runs again on its own.`,
  "",
  "_Training > Claim my badge does this for you, and checks it before it opens the form._"
);

fs.writeFileSync(commentFile, lines.join("\n") + "\n");
output({ starred: "false" });
