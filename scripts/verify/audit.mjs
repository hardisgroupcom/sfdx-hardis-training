#!/usr/bin/env node
/**
 * Re-verifies a learner's public repository, from this repository's own rules.
 *
 *   node scripts/verify/audit.mjs --level 2 --dir /tmp/clone --handle jdupont
 *
 * Run by .github/workflows/claim.yml. Five rules govern it, and they are
 * repeated at the top of that workflow because they are what keeps it safe:
 *
 *  1. Never execute anything from the clone. No install, no build, no script of
 *     theirs. This only reads files and git history, with code from here.
 *  2. Never expose a Salesforce secret to it. It has no business touching an org.
 *  3. Treat every input as hostile: validate, never interpolate into a shell.
 *  4. Bound the clone: depth, blob filter, size, timeout.
 *  5. A level claim re-runs the audits of the levels it requires.
 *
 * Output: a markdown report on stdout, and a JSON summary when --json is passed.
 * Exit code 0 when the claim passes, 1 when it does not.
 */
import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";
import { makeContext, rulesForLevel } from "./rules.mjs";
import { parseArgs } from "../lib/util.mjs";

const LEVEL_NAMES = {
  1: "sfdx-hardis Contributor Basics",
  2: "sfdx-hardis Contributor",
  3: "sfdx-hardis Release Manager"
};

/** A level claim also proves the levels it requires. */
export function levelsToAudit(level) {
  return Array.from({ length: level }, (_, i) => i + 1);
}

export function auditRepository(dir, level) {
  const ctx = makeContext(dir);
  const results = [];
  for (const each of levelsToAudit(level)) {
    for (const rule of rulesForLevel(each)) {
      if (rule.auditable === false) {
        continue;
      }
      let outcome;
      try {
        outcome = rule.check(ctx);
      } catch (error) {
        outcome = {
          ok: false,
          detail: `the check could not run: ${error.message}`,
          where: "scripts/verify/rules.mjs in the training repository"
        };
      }
      results.push({ level: each, rule, ...outcome });
    }
  }
  const passed = results.filter((r) => r.ok).length;
  return { results, passed, total: results.length, ok: passed === results.length };
}

export function renderReport(audit, { level, handle, repoUrl }) {
  const lines = [];
  if (audit.ok) {
    lines.push(`## Level ${level} verified`);
    lines.push("");
    lines.push(`All ${audit.total} checks passed against [${repoUrl}](${repoUrl}).`);
    lines.push("");
    lines.push(`**${LEVEL_NAMES[level]}** is awarded to \`${handle}\`.`);
    lines.push("");
    if (level > 1) {
      lines.push(
        `This claim also re-ran the level ${levelsToAudit(level - 1).join(" and ")} audits, which is how the prerequisite is enforced.`
      );
      lines.push("");
    }
  } else {
    const failed = audit.results.filter((r) => !r.ok);
    lines.push(`## Level ${level} did not verify yet`);
    lines.push("");
    lines.push(`${audit.passed} of ${audit.total} checks passed against [${repoUrl}](${repoUrl}).`);
    lines.push("");
    lines.push(`### What is missing (${failed.length})`);
    lines.push("");
    for (const item of failed) {
      lines.push(`**Lab ${item.rule.id}** - ${item.rule.title}`);
      lines.push("");
      lines.push(`- What was looked for: ${item.detail}`);
      if (item.where) {
        lines.push(`- Where: ${item.where}`);
      }
      lines.push("");
    }
    lines.push("Fix what is listed above, push it to your fork, then **edit this issue** (any change");
    lines.push("to the body re-runs the audit). You do not need to open a new one.");
    lines.push("");
  }

  lines.push("<details><summary>Every check, in order</summary>");
  lines.push("");
  lines.push("| Level | Lab | Check | Result |");
  lines.push("|---|---|---|---|");
  for (const item of audit.results) {
    lines.push(`| ${item.level} | ${item.rule.id} | ${item.rule.title} | ${item.ok ? "pass" : "**fail**"} |`);
  }
  lines.push("");
  lines.push("</details>");
  lines.push("");
  lines.push("_This audit ran automatically. Nobody reviews claims by hand: if you think a check is");
  lines.push("wrong, open an issue saying which one and why, and it will be fixed for everybody._");
  return lines.join("\n");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const level = Number.parseInt(args.level, 10);
  const dir = args.dir;
  if (!Number.isInteger(level) || level < 1 || level > 3 || !dir) {
    console.error("Usage: node scripts/verify/audit.mjs --level <1|2|3> --dir <clone> [--handle h] [--json out.json]");
    process.exit(2);
  }
  if (!fs.existsSync(path.join(dir, ".git"))) {
    console.error(`${dir} is not a git clone.`);
    process.exit(2);
  }

  const audit = auditRepository(dir, level);
  const report = renderReport(audit, {
    level,
    handle: args.handle || "unknown",
    repoUrl: args.repo || ""
  });
  console.log(report);

  if (args.json) {
    fs.writeFileSync(
      args.json,
      JSON.stringify(
        {
          level,
          handle: args.handle || null,
          repo: args.repo || null,
          ok: audit.ok,
          passed: audit.passed,
          total: audit.total,
          badge: audit.ok ? LEVEL_NAMES[level] : null,
          checks: audit.results.map((r) => ({
            level: r.level,
            id: r.rule.id,
            title: r.rule.title,
            ok: r.ok,
            detail: r.detail || null,
            where: r.where || null
          }))
        },
        null,
        2
      ) + "\n",
      "utf8"
    );
  }

  process.exit(audit.ok ? 0 : 1);
}

// A Windows file URL carries three slashes and a drive letter, so comparing the
// strings by hand never matches and the script silently does nothing at all.
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
