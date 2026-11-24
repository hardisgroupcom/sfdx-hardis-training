#!/usr/bin/env node
/**
 * Audits every badge already awarded again, with today's rules and the GitHub
 * evidence of evidence.mjs, and says which ones the work does not back.
 *
 *   node scripts/badges/reaudit.mjs                    every badge of badges/
 *   node scripts/badges/reaudit.mjs --only someone     one recipient (GitHub handle)
 *   node scripts/badges/reaudit.mjs --jobs 2           clones at a time (default 3)
 *
 * It clones each evidence repository into the temporary folder of the machine,
 * reads it the way the claim workflow does, and never executes anything from it.
 *
 * The report names people: hardis-report/badge-reaudit/report.json, which git
 * ignores. It is for whoever maintains the course, and nothing publishes it.
 * Revoking a badge stays a decision and a commit: this script changes nothing.
 */
import fs from "fs";
import os from "os";
import path from "path";
import { spawn } from "child_process";
import { ROOT, parseArgs, universe } from "../lib/util.mjs";
import { githubToken, parseRepositoryUrl, readRepository } from "../stats/collect.mjs";
import { learnerStats } from "../stats/compute.mjs";
import { MEASURED } from "../stats/markers.mjs";
import { auditRepository } from "../verify/audit.mjs";
import { DEPLOYMENT_WORKFLOWS, isEvidenceExempt, readEvidence, shippedWorkflows } from "../verify/evidence.mjs";

const BADGES = path.join(ROOT, "badges");
const REPORT_DIR = path.join(ROOT, "hardis-report", "badge-reaudit");
const CLONES = path.join(os.tmpdir(), "sfdx-hardis-badge-reaudit");
const CLONE_TIMEOUT_MS = 10 * 60 * 1000;

const args = parseArgs(process.argv.slice(2));
await main();

async function main() {
  const token = githubToken();
  const shipped = await shippedWorkflows(token, universe().course.upstreamRepo);
  const records = readRecords().filter((one) => !args.only || one.recipient.toLowerCase() === String(args.only).toLowerCase());
  const jobs = Number.parseInt(args.jobs, 10) || 3;
  console.log(`${records.length} badge record(s) to audit again, ${jobs} at a time`);

  // Written after every badge, so a run stopped half way keeps what it read
  const rows = [];
  const out = path.join(REPORT_DIR, "report.json");
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  const save = () => {
    rows.sort((a, b) => a.recipient.localeCompare(b.recipient));
    fs.writeFileSync(out, JSON.stringify({ generatedAt: new Date().toISOString(), deploymentWorkflows: DEPLOYMENT_WORKFLOWS, rows }, null, 2) + "\n", "utf8");
  };
  let next = 0;
  await Promise.all(Array.from({ length: jobs }, async () => {
    while (next < records.length) {
      const record = records[next++];
      const row = await reaudit(token, shipped, record);
      rows.push(row);
      save();
      console.log(`  ${row.recipient.padEnd(24)} level ${row.levelHeld}  ${row.verdict}${row.failedEvidence.length ? `  (${row.failedEvidence.length} lab(s) without evidence)` : ""}`);
    }
  }));

  const count = (verdict) => rows.filter((row) => row.verdict === verdict).length;
  console.log(`\n${count("backed")} backed, ${count("not backed")} not backed, ${count("partly backed")} partly backed, ${count("exempt")} exempt, ${count("unreadable")} unreadable`);
  console.log(`Written, for your eyes only: ${path.relative(ROOT, out)}`);
}

/** One row per badge record: the levels it holds, the repository it names. */
function readRecords() {
  return fs.readdirSync(BADGES)
    .filter((file) => file.endsWith(".json"))
    .map((file) => {
      const record = JSON.parse(fs.readFileSync(path.join(BADGES, file), "utf8"));
      const badges = record.badges || [];
      const evidence = badges.flatMap((badge) => badge.evidence || []);
      const repoUrl = (evidence.find((one) => one.type === "Repository") || {}).url
        || `https://github.com/${record.recipient}/sfdx-hardis-training.git`;
      return {
        file,
        recipient: record.recipient,
        trailblazer: record.trailblazer || file.replace(/\.json$/, ""),
        name: record.name || null,
        levels: badges.map((badge) => badge.level).sort(),
        issuedOn: badges.map((badge) => `${badge.level}:${badge.issuedOn}`),
        claims: evidence.filter((one) => one.type === "ClaimIssue").map((one) => one.url),
        repoUrl
      };
    });
}

async function reaudit(token, shipped, record) {
  const levelHeld = Math.max(...record.levels);
  const repo = parseRepositoryUrl(record.repoUrl);
  const row = {
    ...record,
    levelHeld,
    repository: repo ? `${repo.owner}/${repo.name}` : record.repoUrl,
    exempt: isEvidenceExempt(record.recipient),
    verdict: "unreadable",
    files: null,
    evidence: null,
    failedEvidence: [],
    failedFiles: [],
    signals: {}
  };
  try {
    const evidence = repo ? await readEvidence(token, repo) : null;
    if (!evidence) {
      row.reason = "the repository is gone, private, or not on GitHub";
      return row;
    }
    const dir = await cloneOf(repo, record.repoUrl);
    const audit = auditRepository(dir, levelHeld, { evidence, shipped, objections: false });
    const isEvidence = (result) => / ended with a merged Pull Request| was received and checked| took the time its deployment checks take/.test(result.rule.title);
    const fileChecks = audit.results.filter((result) => !isEvidence(result));
    const evidenceChecks = audit.results.filter(isEvidence);
    row.files = { passed: fileChecks.filter((r) => r.ok).length, total: fileChecks.length };
    row.evidence = { passed: evidenceChecks.filter((r) => r.ok).length, total: evidenceChecks.length };
    row.failedFiles = fileChecks.filter((r) => !r.ok).map((r) => ({ id: r.rule.id, title: r.rule.title, detail: r.detail }));
    row.failedEvidence = evidenceChecks.filter((r) => !r.ok).map((r) => ({ id: r.rule.id, title: r.rule.title, detail: r.detail }));
    row.signals = await signals(token, repo, evidence, shipped, record.levels);
    if (row.exempt) {
      row.verdict = "exempt";
    } else if (row.evidence.total === 0 || row.evidence.passed === row.evidence.total) {
      row.verdict = "backed";
    } else if (row.evidence.passed === 0) {
      row.verdict = "not backed";
    } else {
      row.verdict = "partly backed";
    }
  } catch (error) {
    row.reason = error.message;
  }
  return row;
}

/** What else says how the work was done: Pull Requests, deployments, time. */
async function signals(token, repo, evidence, shipped, levels) {
  const prs = evidence.pullRequests;
  const deployments = prs.flatMap((pr) => pr.commits.flatMap((commit) => commit.runs.filter((run) =>
    run.conclusion === "SUCCESS" && DEPLOYMENT_WORKFLOWS.includes(run.path) && shipped.get(run.path).has(commit.workflows[run.path]))));
  const read = await readRepository(token, repo);
  const stats = read ? learnerStats(read, { badgeLevels: levels }) : null;
  return {
    createdAt: read ? read.createdAt : null,
    pullRequests: prs.length,
    merged: prs.filter((pr) => pr.mergedAt).length,
    successfulDeployments: deployments.length,
    minutesByLevel: stats ? Object.fromEntries(Object.entries(stats.levels).map(([level, one]) => [level, one.minutes ?? null])) : null,
    segmentMinutes: stats ? Object.fromEntries(Object.entries(stats.segments).map(([key, one]) => [key, one.minutes])) : null,
    spanByLevel: read ? spanByLevel(read) : null
  };
}

/**
 * Per level, the wall-clock minutes from the first Pull Request of its labs to
 * the last merge of one, with the number of labs it saw. Unlike active minutes,
 * no gap is left out, so it is an upper bound of the time a level took.
 */
function spanByLevel(read) {
  const out = {};
  for (const level of [1, 2, 3]) {
    const ofLevel = MEASURED.filter((segment) => segment.level === level && segment.end.kind === "pullRequest");
    const prs = read.pullRequests.filter((pr) => ofLevel.some((segment) =>
      segment.end.head.test(pr.head || "") && (!segment.end.base || pr.base === segment.end.base)));
    const merged = prs.filter((pr) => pr.mergedAt);
    if (merged.length === 0) {
      continue;
    }
    const start = Math.min(...prs.map((pr) => Date.parse(pr.createdAt)));
    const end = Math.max(...merged.map((pr) => Date.parse(pr.mergedAt)));
    const labsSeen = ofLevel.filter((segment) => merged.some((pr) =>
      segment.end.head.test(pr.head || "") && (!segment.end.base || pr.base === segment.end.base))).length;
    out[level] = { minutes: Math.round((end - start) / 60000), labsSeen, labsTotal: ofLevel.length };
  }
  return out;
}

/** A blob-filtered clone of every branch, made once and fetched again on the next run. */
async function cloneOf(repo, url) {
  const dir = path.join(CLONES, `${repo.owner}__${repo.name}`);
  if (fs.existsSync(path.join(dir, ".git"))) {
    await git(["-C", dir, "fetch", "--quiet", "--prune", "--filter=blob:none", "--no-tags", "origin", "+refs/heads/*:refs/remotes/origin/*"]);
    return dir;
  }
  fs.mkdirSync(CLONES, { recursive: true });
  await git(["clone", "--quiet", "--filter=blob:none", "--no-tags", url, dir]);
  await git(["-C", dir, "fetch", "--quiet", "--filter=blob:none", "--no-tags", "origin", "+refs/heads/*:refs/remotes/origin/*"]);
  return dir;
}

function git(argv) {
  return new Promise((resolve, reject) => {
    const child = spawn("git", argv, { stdio: ["ignore", "ignore", "pipe"], env: { ...process.env, GIT_TERMINAL_PROMPT: "0" } });
    let stderr = "";
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    const timer = setTimeout(() => child.kill(), CLONE_TIMEOUT_MS);
    child.on("close", (code) => {
      clearTimeout(timer);
      return code === 0 ? resolve() : reject(new Error(`git ${argv[0] === "-C" ? argv[2] : argv[0]} failed: ${stderr.trim().slice(0, 200)}`));
    });
  });
}
