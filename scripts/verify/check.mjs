#!/usr/bin/env node
/**
 * Checks one lab, or a whole level, against your own clone, and prints the
 * receipt line to keep for your badge claim.
 *
 *   node scripts/verify/check.mjs --level 1 --lab 3
 *   node scripts/verify/check.mjs --level 1
 *
 * Usually you click Welcome page > Training > Check my work instead.
 */
import { pathToFileURL } from "url";
import { ROOT, c, title, info, ok, fail, warn, parseArgs, githubHandle, gitOut, recordReceipt } from "../lib/util.mjs";
import { makeContext, rulesForLevel, findRule } from "./rules.mjs";

export function receiptLine(rule, handle, commit) {
  const stamp = new Date().toISOString().slice(0, 16) + "Z";
  return `LAB ${rule.id} OK  handle=${handle || "unknown"}  commit=${commit}  ${stamp}`;
}

export function runRules(ctx, rules) {
  return rules.map((rule) => {
    let result;
    try {
      result = rule.check(ctx);
    } catch (error) {
      result = { ok: false, detail: `the check itself failed: ${error.message}`, where: "scripts/verify/rules.mjs" };
    }
    return { rule, ...result };
  });
}

export function printResults(results, handle, commit, { record = false } = {}) {
  let passed = 0;
  for (const r of results) {
    const label = `Lab ${r.rule.id}  ${r.rule.title}`;
    if (r.ok) {
      passed++;
      ok(label);
      if (r.detail) {
        info(c.dim(`      ${r.detail}`));
      }
      if (record) {
        const line = receiptLine(r.rule, handle, commit);
        console.log(c.green(`      ${line}`));
        recordReceipt({ id: r.rule.id, line, at: new Date().toISOString() });
      }
    } else {
      fail(label);
      info(c.yellow(`      What is missing: ${r.detail}`));
      if (r.where) {
        info(c.dim(`      Where it was looked for: ${r.where}`));
      }
    }
  }
  return passed;
}

export default async function main(args) {
  const level = Number.parseInt(args.level, 10);
  if (!Number.isInteger(level) || level < 1 || level > 3) {
    fail("Pass a level: --level 1, --level 2 or --level 3");
    process.exit(1);
  }
  const lab = args.lab === undefined ? null : Number.parseInt(args.lab, 10);

  const ctx = makeContext(args.dir || ROOT);
  const handle = githubHandle();
  const commit = gitOut(["rev-parse", "--short", "HEAD"]) || "unknown";

  let rules;
  if (lab === null) {
    rules = rulesForLevel(level);
    title(`Checking the whole of level ${level}`);
  } else {
    const rule = findRule(level, lab);
    if (!rule) {
      fail(`Level ${level} has no lab ${lab}.`);
      process.exit(1);
    }
    rules = [rule];
    title(`Checking level ${level}, lab ${lab}`);
  }

  const results = runRules(ctx, rules);
  const passed = printResults(results, handle, commit, { record: true });

  console.log("");
  if (passed === results.length) {
    ok(`${passed} of ${results.length} checks passed.`);
    if (lab === null) {
      info("");
      info(`  You can claim your level ${level} badge now. Open an issue on`);
      info(`  ${c.cyan("https://github.com/hardisgroupcom/sfdx-hardis-training/issues/new/choose")}`);
      info("  and paste the receipt lines above.");
    }
  } else {
    warn(`${passed} of ${results.length} checks passed. Read what is missing above, fix it, and run this again.`);
    process.exitCode = 1;
  }
}

// Allow both "node scripts/verify/check.mjs --level 1" and an import from training.mjs.
// A Windows file URL carries three slashes and a drive letter, so comparing the strings
// by hand never matches and the script silently does nothing at all.
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(parseArgs(process.argv.slice(2)));
}
