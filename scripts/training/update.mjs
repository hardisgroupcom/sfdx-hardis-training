/**
 * Training > Update my course.
 *
 * Brings the changes the course received since the learner forked it into the
 * fork: the scripts behind the Training menu, the teammate stories, the Check my
 * work rules, the project configuration. The lab pages need none of this, they
 * are read on the published site.
 *
 * It merges the main branch of the training repository into a branch of its
 * own, cut from the fork's integration, pushes it and opens a Pull Request into
 * integration: the one way anything reaches a major branch in this course. The
 * learner merges it with Merge pull request, never a squash, so that git
 * remembers what was brought in and the next update only brings what is new.
 *
 * Nothing the learner built is thrown away, unlike Reset this level. A file
 * that both the learner and the course changed stops the merge: the command
 * undoes it and says which files, rather than leaving a half merge behind.
 */
import fs from "fs";
import path from "path";
import { ROOT, c, title, info, ok, warn, fail, abort, run, gitOut, confirm, repoSlug, hasGh } from "../lib/util.mjs";
import {
  UPDATE_BASE,
  UPDATE_BRANCH_PREFIX,
  ensureCourseUpstream,
  fetchCourse,
  missingCourseCommits,
  pendingUpdateBranch
} from "../lib/course-updates.mjs";

function stamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}

export default async function update(args) {
  title("Update my course");

  if (!ensureCourseUpstream()) {
    abort(
      "This folder is not your fork of the course, so there is nothing to update it from.",
      "Run Set up my training environment first: it creates your fork and points this folder at it."
    );
  }

  title("1 of 4  What changed in the course");
  if (!fetchCourse()) {
    abort("The training repository could not be reached.", "Check your network connection and run Update my course again.");
  }
  const missing = missingCourseCommits();
  if (missing.length === 0) {
    ok(`Your fork already has every change of the course. Nothing to do.`);
    return;
  }
  const waiting = pendingUpdateBranch();
  if (waiting) {
    ok(`An update is already waiting in its Pull Request, from ${waiting.replace(/^origin\//, "")}.`);
    info(`  Merge it into ${UPDATE_BASE} with ${c.bold("Merge pull request")}, then Pull in the Source Control panel.`);
    return;
  }
  info(`  ${missing.length} change(s) of the course your fork does not have yet:`);
  missing.slice(0, 15).forEach((commit) => info(c.dim(`    ${commit.subject}`)));
  if (missing.length > 15) {
    info(c.dim(`    ... and ${missing.length - 15} more`));
  }
  info(c.dim("  Badge claims of other learners are left out: they change nothing a lab runs."));

  const branch = args.branch || `${UPDATE_BRANCH_PREFIX}${stamp()}`;
  info("");
  const sure = args.yes === true || (await confirm(`Bring them in on a new branch, ${branch}, and open a Pull Request into ${UPDATE_BASE}?`, true));
  if (!sure) {
    info("Nothing was changed.");
    return;
  }

  // Whatever the learner is in the middle of stays where it is: put aside now,
  // given back at the end, on the branch they were on
  const previous = gitOut(["rev-parse", "--abbrev-ref", "HEAD"]);
  const dirty = gitOut(["status", "--porcelain"]) !== "";
  if (dirty) {
    warn("You have uncommitted changes. They are put aside during the update and given back afterwards.");
    if (run("git", ["stash", "push", "-u", "-m", "before Update my course"], { quiet: true, capture: true }).code !== 0) {
      abort(
        "Your uncommitted changes could not be put aside, so nothing was updated.",
        "Git refuses during an unfinished merge. Finish or abandon it in the Source Control panel, then run Update my course again."
      );
    }
  }
  const giveBack = () => {
    run("git", ["switch", previous], { quiet: true, capture: true });
    if (dirty) {
      if (run("git", ["stash", "pop"], { quiet: true, capture: true }).code === 0) {
        ok("Your uncommitted changes are back");
      } else {
        warn("Your uncommitted changes are kept in the git stash: Source Control panel, Stashes, Apply Stash.");
      }
    }
  };

  title("2 of 4  A branch for the update");
  if (run("git", ["switch", "-c", branch, `origin/${UPDATE_BASE}`]).code !== 0) {
    giveBack();
    abort(`The branch ${branch} could not be created from ${UPDATE_BASE}.`, "Run Update my course again: the branch name carries the minute.");
  }
  ok(`On ${branch}, made from the ${UPDATE_BASE} of your fork`);

  title("3 of 4  Merging the course into it");
  const merged = run("git", ["merge", "--no-edit", "-m", "Update the course from the training repository", "upstream/main"], {
    capture: true,
    quiet: true
  });
  if (merged.code !== 0) {
    const conflicts = gitOut(["diff", "--name-only", "--diff-filter=U"]).split("\n").filter(Boolean);
    run("git", ["merge", "--abort"], { quiet: true, capture: true });
    giveBack();
    run("git", ["branch", "-D", branch], { quiet: true, capture: true });
    fail(`The course and your fork both changed ${conflicts.length || "some"} file(s), so the update was undone:`);
    conflicts.forEach((file) => info(c.dim(`    ${file}`)));
    info("");
    info("  Two ways out:");
    info(`  - ${c.bold("Reset this level")} starts the level again from its current state, course changes included,`);
    info("    and throws away your work on integration in this level.");
    info("  - Or merge by hand and keep both, the way Lab 2.7 solves a conflict, then publish the branch:");
    info(c.dim(`      git switch -c ${branch} origin/${UPDATE_BASE}`));
    info(c.dim("      git merge upstream/main"));
    abort("Update my course stopped on a conflict.", "Nothing was pushed and your branches are as they were.");
  }
  ok("Merged");

  title("4 of 4  Pushing it and opening the Pull Request");
  if (run("git", ["push", "-u", "origin", branch], { quiet: true, capture: true }).code !== 0) {
    giveBack();
    warn(`The push was refused. The update is on your local branch ${branch}: push it with Sync Changes when you are online.`);
    return;
  }
  ok("Pushed");
  const slug = repoSlug();
  const body = [
    "Changes of the course since this fork was taken, merged from the main branch of the training repository.",
    "",
    ...missing.slice(0, 50).map((commit) => `- ${commit.subject}`),
    ...(missing.length > 50 ? [`- ... and ${missing.length - 50} more`] : []),
    "",
    "Merge it with **Merge pull request**, not with a squash: git then remembers what was brought in, and the next update only brings what is new."
  ].join("\n");
  const bodyFile = path.join(ROOT, ".training-pr-body.md");
  fs.writeFileSync(bodyFile, body, "utf8");
  let prUrl = null;
  if (hasGh() && slug) {
    const pr = run(
      "gh",
      ["pr", "create", "--repo", slug, "--base", UPDATE_BASE, "--head", branch, "--title", "Update the course from the training repository", "--body-file", bodyFile],
      { capture: true, quiet: true }
    );
    prUrl = pr.code === 0 ? (pr.stdout || "").match(/https:\/\/\S+\/pull\/\d+/)?.[0] || `https://github.com/${slug}/pulls` : null;
  }
  fs.rmSync(bodyFile, { force: true });
  if (prUrl) {
    ok(`Pull Request opened into ${UPDATE_BASE}`);
    info(`  ${c.cyan(prUrl)}`);
  } else {
    warn("The Pull Request could not be opened automatically.");
    info(`  Open it yourself: ${c.cyan(`https://github.com/${slug}/compare/${UPDATE_BASE}...${branch}?expand=1`)}`);
  }

  giveBack();

  title("Done");
  info(`  Wait for the checks of the Pull Request, then merge it with ${c.bold("Merge pull request")}, never a squash.`);
  info(`  Then Pull in the Source Control panel, on ${UPDATE_BASE}: the training commands use the new scripts from there.`);
  info(c.dim("  From Level 3 on, the update reaches uat, preprod and main with your next promotions, like any change."));
}
