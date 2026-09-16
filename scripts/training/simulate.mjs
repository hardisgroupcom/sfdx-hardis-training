/**
 * Training > Simulate my teammates.
 *
 * A learner cannot review a Pull Request that lives in somebody else's
 * repository, and Level 3 rebuilds part of the branch topology, so a
 * pre-existing branch would not even share a sensible ancestor.
 *
 * This recreates the teammate branch from the patch set in scripts/simulate/,
 * and opens the Pull Request inside the learner's own fork, from their current
 * integration, at the moment the lab needs it. The patch sets are the same
 * files that produced the teammate Pull Requests on the public training repo,
 * so what a learner reviews is byte for byte what the screenshots show.
 */
import fs from "fs";
import path from "path";
import {
  ROOT, c, title, info, ok, warn, abort, run, git, gitOut,
  select, confirm, universe, hasGh, repoSlug
} from "../lib/util.mjs";

const SIMULATE_DIR = path.join(ROOT, "scripts", "simulate");

export default async function simulate(args) {
  title("Simulate my teammates");

  const scenarios = loadScenarios();
  if (scenarios.length === 0) {
    abort("No teammate scenario was found.", `Expected folders with a scenario.json inside ${path.relative(ROOT, SIMULATE_DIR)}`);
  }

  const id = await select(
    "Which teammate work do you need?",
    scenarios.map((s) => ({ value: s.id, label: `${s.title}`, hint: s.usedBy })),
    args.scenario
  );
  const scenario = scenarios.find((s) => s.id === id);

  const slug = repoSlug();
  if (slug && slug.toLowerCase() === universe().course.upstreamRepo.toLowerCase()) {
    abort(
      "This would open a Pull Request on the shared training repository.",
      "Work in your own fork. See Level 1 lab 1."
    );
  }

  info("");
  info(`  ${scenario.description}`);
  info("");
  info(`  It creates the branch ${c.bold(scenario.branch)} from your current ${c.bold("integration")},`);
  info(`  and opens a Pull Request into ${c.bold("integration")} in ${c.bold(slug || "your fork")}.`);

  const sure = args.yes === true || (await confirm("Create it?", true));
  if (!sure) {
    info("Nothing was created.");
    return;
  }

  const startingBranch = gitOut(["rev-parse", "--abbrev-ref", "HEAD"]);
  const dirty = gitOut(["status", "--porcelain"]);
  if (dirty) {
    abort(
      "You have uncommitted changes.",
      "Commit or stash them first: this command switches branches and does not want to take your work with it."
    );
  }

  title("1 of 4  Creating the teammate branch");
  run("git", ["fetch", "origin", "--prune"]);
  if (run("git", ["checkout", "integration"]).code !== 0) {
    abort("There is no integration branch to branch from.", "Run Training > Reset this level first.");
  }
  run("git", ["pull", "--ff-only", "origin", "integration"], { quiet: true });
  const existing = gitOut(["rev-parse", "--verify", scenario.branch]);
  if (existing) {
    warn(`${scenario.branch} already exists. It is being recreated from the current integration.`);
    run("git", ["branch", "-D", scenario.branch]);
  }
  run("git", ["checkout", "-b", scenario.branch]);
  ok(`On ${scenario.branch}`);

  title("2 of 4  Applying the teammate changes");
  const applied = applyFiles(scenario);
  applied.forEach((f) => info(c.dim(`    ${f}`)));
  ok(`${applied.length} file(s) written`);

  title("3 of 4  Committing as your teammate");
  run("git", ["add", "-A"]);
  const commit = run("git", [
    "-c", `user.name=${scenario.author.name}`,
    "-c", `user.email=${scenario.author.email}`,
    "commit", "-m", scenario.commitMessage
  ]);
  if (commit.code !== 0) {
    warn("Nothing to commit: the teammate changes are already in your integration branch.");
    run("git", ["checkout", startingBranch || "integration"]);
    return;
  }
  ok("Committed");

  title("4 of 4  Opening the Pull Request in your fork");
  const push = run("git", ["push", "-u", "origin", scenario.branch, "--force-with-lease"]);
  if (push.code !== 0) {
    abort("The branch could not be pushed to your fork.", "Check that origin points at your own fork and that you can push to it.");
  }

  if (!hasGh()) {
    warn("The GitHub CLI is not installed, so the Pull Request was not opened automatically.");
    info(`  Open it yourself: ${c.cyan(`https://github.com/${slug}/compare/integration...${scenario.branch}?expand=1`)}`);
  } else {
    const bodyFile = path.join(ROOT, ".training-pr-body.md");
    fs.writeFileSync(bodyFile, scenario.prBody, "utf8");
    // GitHub needs a moment after a push before its API can see the new branch.
    // Asked too soon it answers "No commits between <base> and <head>", which
    // reads like the push failed when it did not. Three tries, two seconds apart,
    // has been enough every time. The command writes straight to the terminal,
    // so its message cannot be inspected here: any failure is retried, and the
    // fallback below still covers a Pull Request that genuinely already exists.
    let pr = { code: 1, stderr: "" };
    for (let attempt = 1; attempt <= 3; attempt++) {
      pr = run("gh", [
        "pr", "create",
        "--base", "integration",
        "--head", scenario.branch,
        "--title", scenario.prTitle,
        "--body-file", bodyFile
      ]);
      if (pr.code === 0) {
        break;
      }
      if (attempt < 3) {
        info(`  The branch is not visible to the GitHub API yet, retrying (${attempt} of 3)`);
        run(process.execPath, ["-e", "const t = Date.now(); while (Date.now() - t < 2000) {}"], { quiet: true });
      }
    }
    fs.rmSync(bodyFile, { force: true });
    if (pr.code !== 0) {
      warn("The Pull Request could not be opened automatically. It may already exist.");
      info(`  Check: ${c.cyan(`https://github.com/${slug}/pulls`)}`);
    } else {
      ok("Pull Request opened");
    }
  }

  run("git", ["checkout", startingBranch && startingBranch !== scenario.branch ? startingBranch : "integration"]);

  title("Done");
  info(`  ${scenario.nextStep}`);
}

function loadScenarios() {
  if (!fs.existsSync(SIMULATE_DIR)) {
    return [];
  }
  return fs.readdirSync(SIMULATE_DIR)
    .map((name) => path.join(SIMULATE_DIR, name, "scenario.json"))
    .filter((p) => fs.existsSync(p))
    .map((p) => ({ ...JSON.parse(fs.readFileSync(p, "utf8")), dir: path.dirname(p) }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

function applyFiles(scenario) {
  const filesDir = path.join(scenario.dir, "files");
  if (!fs.existsSync(filesDir)) {
    return [];
  }
  const written = [];
  const walk = (dir, rel) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const from = path.join(dir, entry.name);
      const relPath = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        walk(from, relPath);
      } else {
        const to = path.join(ROOT, relPath);
        fs.mkdirSync(path.dirname(to), { recursive: true });
        fs.copyFileSync(from, to);
        written.push(relPath);
      }
    }
  };
  walk(filesDir, "");
  for (const gone of scenario.deletes || []) {
    const target = path.join(ROOT, gone);
    if (fs.existsSync(target)) {
      fs.rmSync(target, { force: true });
      written.push(`${gone} (deleted)`);
    }
  }
  return written;
}
