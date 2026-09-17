/**
 * Training > Reset this level.
 *
 * Puts your fork back to the state a level starts from. Without this, one
 * botched lab ends the course, which is the most common way a free course
 * loses a learner halfway through.
 */
import {
  c, title, info, ok, warn, abort, run, git, gitOut,
  select, confirm, universe
} from "../lib/util.mjs";

export default async function reset(args) {
  const u = universe();
  title("Reset this level");

  const level = Number(
    await select(
      "Which level do you want to restart?",
      u.levels.map((l) => ({
        value: String(l.level),
        label: `Level ${l.level} - ${l.name}`,
        hint: `back to ${startBranch(l.level)}`
      })),
      args.level
    )
  );

  const start = startBranch(level);

  info("");
  warn(`This throws away the work on your ${c.bold("integration")} branch and replaces it with ${c.bold(start)}.`);
  info(c.dim("    Your feature branches are left alone, and nothing is deleted in your orgs."));
  const sure = args.yes === true || (await confirm(`Reset integration to ${start}?`, false));
  if (!sure) {
    info("Nothing was changed.");
    return;
  }

  ensureUpstream(u);

  title("1 of 3  Fetching the reference branches");
  if (run("git", ["fetch", "upstream", "--prune"]).code !== 0) {
    abort("Could not reach the training repository.", "Check your network connection and try again.");
  }
  const exists = gitOut(["rev-parse", "--verify", `upstream/${start}`]);
  if (!exists) {
    abort(
      `The branch ${start} does not exist upstream.`,
      "That level may not have shipped yet. Check the course site for the current levels."
    );
  }
  ok(`upstream/${start} found`);

  title("2 of 3  Moving your integration branch");
  const dirty = gitOut(["status", "--porcelain"]);
  if (dirty) {
    warn("You have uncommitted changes. They are being stashed, not deleted.");
    run("git", ["stash", "push", "-u", "-m", `before training reset to ${start}`]);
  }
  run("git", ["checkout", "-B", "integration", `upstream/${start}`]);
  ok(`integration now matches ${start}`);

  title("3 of 3  Publishing it to your fork");
  const push = run("git", ["push", "origin", "integration", "--force-with-lease"]);
  if (push.code !== 0) {
    warn("The push was refused. Your local branch is reset; push it yourself when you are ready.");
  } else {
    ok("Your fork is level with the reset point");
  }

  title("Done");
  const levelDef = u.levels.find((l) => l.level === level);
  info(`  Level ${level} - ${levelDef.name} starts again at:`);
  info(`  ${c.cyan(`${u.course.site}/en/${levelDef.slug}/`)}`);
  info("");
  info(c.dim("  Your training orgs still hold whatever you built. If a lab needs a clean org,"));
  info(c.dim("  run Clean up a training org, then Set up one of my training orgs, from the Training menu."));
}

function startBranch(level) {
  return `training/start-level-${level}`;
}

function ensureUpstream(u) {
  const remotes = gitOut(["remote"]).split("\n").map((r) => r.trim());
  if (remotes.includes("upstream")) {
    return;
  }
  info(c.dim("    Adding the training repository as the upstream remote."));
  git(["remote", "add", "upstream", `https://github.com/${u.course.upstreamRepo}.git`]);
}
