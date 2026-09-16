/**
 * Shared helpers for every training script.
 *
 * Zero dependencies on purpose: a learner clones this repository and runs the
 * Training menu straight away, with no npm install and no node_modules.
 */
import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import readline from "readline";
import { fileURLToPath } from "url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

// ------------------------------------------------------------------ colors
const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const wrap = (code) => (s) => (useColor ? `[${code}m${s}[0m` : s);
export const c = {
  bold: wrap("1"),
  dim: wrap("2"),
  red: wrap("31"),
  green: wrap("32"),
  yellow: wrap("33"),
  blue: wrap("34"),
  magenta: wrap("35"),
  cyan: wrap("36")
};

export function title(text) {
  console.log("");
  console.log(c.cyan(c.bold(text)));
  console.log(c.cyan("-".repeat(text.length)));
}

export function info(text) {
  console.log(text);
}
export function ok(text) {
  console.log(`${c.green("OK")}  ${text}`);
}
export function warn(text) {
  console.log(`${c.yellow("!")}   ${text}`);
}
export function fail(text) {
  console.log(`${c.red("X")}   ${text}`);
}

/** Stops with a readable message rather than a stack trace. */
export function abort(message, hint) {
  console.log("");
  fail(message);
  if (hint) {
    console.log(`    ${c.dim(hint)}`);
  }
  process.exit(1);
}

// ------------------------------------------------------------------ universe
let universeCache = null;
export function universe() {
  if (!universeCache) {
    universeCache = JSON.parse(fs.readFileSync(path.join(ROOT, "training-universe.json"), "utf8"));
  }
  return universeCache;
}

// ------------------------------------------------------------------ commands
/**
 * Runs a command and streams its output, the way a learner expects to see it.
 * Returns the exit code instead of throwing, so callers decide what a failure means.
 */
const WINDOWS = process.platform === "win32";

/** Quotes one argument for the platform shell, so a path with a space survives. */
function quoteArg(arg) {
  const value = String(arg);
  if (value.length > 0 && !/[\s"'&|<>^()%!]/.test(value)) {
    return value;
  }
  return WINDOWS ? `"${value.replace(/"/g, '""')}"` : `'${value.replace(/'/g, "'\\''")}'`;
}

export function run(command, args, options = {}) {
  const pretty = `${command} ${args.join(" ")}`;
  if (!options.quiet) {
    console.log(c.dim(`    $ ${pretty}`));
  }
  // On Windows the Salesforce CLI and the GitHub CLI are .cmd shims, which only
  // run through a shell. Node deprecates passing an argument array together with
  // shell:true, so the line is quoted here and handed over as a single string.
  const spawnCommand = WINDOWS ? [command, ...args.map(quoteArg)].join(" ") : command;
  const spawnArgs = WINDOWS ? [] : args;
  const res = spawnSync(spawnCommand, spawnArgs, {
    cwd: options.cwd || ROOT,
    stdio: options.capture ? "pipe" : "inherit",
    shell: WINDOWS,
    encoding: "utf8",
    env: { ...process.env, ...(options.env || {}) }
  });
  return {
    code: res.status === null ? 1 : res.status,
    stdout: res.stdout || "",
    stderr: res.stderr || ""
  };
}

/** Runs a command, captures stdout, and parses it as JSON. Returns null on any problem. */
export function runJson(command, args, options = {}) {
  const res = run(command, args, { ...options, capture: true, quiet: true });
  const text = res.stdout.trim();
  if (!text) {
    return null;
  }
  const start = text.indexOf("{");
  if (start < 0) {
    return null;
  }
  try {
    return JSON.parse(text.slice(start));
  } catch {
    return null;
  }
}

export function git(args, options = {}) {
  return run("git", args, { ...options });
}

export function gitOut(args) {
  return run("git", args, { capture: true, quiet: true }).stdout.trim();
}

// ------------------------------------------------------------------ prompts
function isInteractive() {
  return process.stdin.isTTY && !process.env.CI && process.env.TRAINING_NO_PROMPT !== "true";
}

async function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise((resolve) => rl.question(question, resolve));
  rl.close();
  return answer.trim();
}

/**
 * Numbered list selection. Plain readline, so it works in the VS Code terminal,
 * in Git Bash, in PowerShell and over SSH without a prompt library.
 */
export async function select(message, choices, preselected) {
  if (preselected) {
    // An org answers to several names: its aliases and its username. Match any of
    // them, or a value passed on the command line is refused for no good reason.
    const found =
      choices.find((ch) => ch.value === preselected) ||
      choices.find((ch) => (ch.aliases || []).includes(preselected));
    if (found) {
      info(`${message} ${c.green(found.label)}`);
      return found.value;
    }
    const known = choices.flatMap((ch) => [ch.value, ...(ch.aliases || [])]);
    abort(`"${preselected}" is not one of: ${[...new Set(known)].join(", ")}`);
  }
  if (choices.length === 1) {
    info(`${message} ${c.green(choices[0].label)} ${c.dim("(the only one available)")}`);
    return choices[0].value;
  }
  if (!isInteractive()) {
    abort(
      `${message} needs an answer, and this terminal cannot ask for one.`,
      "Pass the value on the command line instead, for example: node scripts/training.mjs seed --org helios-dev"
    );
  }
  console.log("");
  console.log(c.bold(message));
  choices.forEach((ch, i) => {
    console.log(`  ${c.cyan(String(i + 1))}. ${ch.label}${ch.hint ? c.dim(`  ${ch.hint}`) : ""}`);
  });
  for (;;) {
    const answer = await ask(c.bold("\n  Your choice (number): "));
    const index = Number.parseInt(answer, 10);
    if (Number.isInteger(index) && index >= 1 && index <= choices.length) {
      return choices[index - 1].value;
    }
    warn(`Type a number between 1 and ${choices.length}.`);
  }
}

export async function confirm(message, defaultYes = false) {
  if (!isInteractive()) {
    return defaultYes;
  }
  const suffix = defaultYes ? " [Y/n] " : " [y/N] ";
  const answer = (await ask(c.bold(message + suffix))).toLowerCase();
  if (!answer) {
    return defaultYes;
  }
  return answer === "y" || answer === "yes";
}

// ------------------------------------------------------------------ orgs
/**
 * Every alias the Salesforce CLI knows, grouped by username.
 *
 * One org can carry several aliases, and `sf org list` only ever reports one of
 * them. That bites as soon as anything aliases an org a second time: the CI
 * authentication of Level 1 aliases your integration org as "integration", and
 * from then on "helios-integration" is invisible to `sf org list`.
 */
function aliasesByUsername() {
  const data = runJson("sf", ["alias", "list", "--json"]);
  const map = new Map();
  for (const entry of (data && data.result) || []) {
    const username = entry.value;
    const alias = entry.alias;
    if (!username || !alias) {
      continue;
    }
    if (!map.has(username)) {
      map.set(username, []);
    }
    map.get(username).push(alias);
  }
  return map;
}

/** Every org the Salesforce CLI knows about, with every alias each one carries. */
export function connectedOrgs() {
  const data = runJson("sf", ["org", "list", "--json"]);
  if (!data || !data.result) {
    return [];
  }
  const aliasMap = aliasesByUsername();
  const buckets = ["nonScratchOrgs", "devHubs", "sandboxes", "scratchOrgs", "other"];
  const seen = new Set();
  const orgs = [];
  for (const bucket of buckets) {
    for (const org of data.result[bucket] || []) {
      if (!org.username || seen.has(org.username)) {
        continue;
      }
      seen.add(org.username);
      const known = aliasMap.get(org.username) || [];
      const reported = [org.alias, ...(Array.isArray(org.aliases) ? org.aliases : [])].filter(Boolean);
      const aliases = [...new Set([...known, ...reported])];
      orgs.push({
        alias: aliases[0] || "",
        aliases,
        username: org.username,
        instanceUrl: org.instanceUrl,
        connected: org.connectedStatus === "Connected"
      });
    }
  }
  return orgs;
}

export function orgChoices(orgs) {
  return orgs.map((org) => ({
    value: org.alias || org.username,
    // Every name this org answers to, so picking it by any of them works
    aliases: [...(org.aliases || []), org.username].filter(Boolean),
    label: org.alias ? `${org.alias}  ${c.dim(org.username)}` : org.username,
    hint: org.connected ? "" : "(not connected)"
  }));
}

// ------------------------------------------------------------------ progress
const PROGRESS_FILE = ".training-progress.json";

export function readProgress() {
  const p = path.join(ROOT, PROGRESS_FILE);
  if (!fs.existsSync(p)) {
    return { receipts: [], orgs: {} };
  }
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return { receipts: [], orgs: {} };
  }
}

export function writeProgress(progress) {
  fs.writeFileSync(path.join(ROOT, PROGRESS_FILE), JSON.stringify(progress, null, 2) + "\n", "utf8");
}

export function recordReceipt(receipt) {
  const progress = readProgress();
  progress.receipts = (progress.receipts || []).filter((r) => r.id !== receipt.id);
  progress.receipts.push(receipt);
  progress.receipts.sort((a, b) => a.id.localeCompare(b.id));
  writeProgress(progress);
}

// ------------------------------------------------------------------ args
export function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token.startsWith("--")) {
      const key = token.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        out[key] = next;
        i++;
      } else {
        out[key] = true;
      }
    } else {
      out._.push(token);
    }
  }
  return out;
}

/** The learner GitHub handle, read from the origin remote of their fork. */
export function githubHandle() {
  const url = gitOut(["remote", "get-url", "origin"]);
  const match = url.match(/github\.com[/:]([^/]+)\/([^/.]+)/i);
  return match ? match[1] : null;
}

export function repoSlug() {
  const url = gitOut(["remote", "get-url", "origin"]);
  const match = url.match(/github\.com[/:]([^/]+)\/([^/.]+)/i);
  return match ? `${match[1]}/${match[2]}` : null;
}

export function hasGh() {
  return run("gh", ["--version"], { capture: true, quiet: true }).code === 0;
}
