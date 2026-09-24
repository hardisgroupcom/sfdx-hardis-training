/**
 * Whether the learner's fork is behind the course.
 *
 * A fork is a copy taken on the day the learner forked. The lab pages are read
 * on the published site and are always current, but the scripts behind the
 * Training menu, the teammate stories, the Check my work rules and the project
 * configuration live in the fork, and they age. A lab published after the fork
 * was taken can need a teammate story or a check rule the fork does not have.
 *
 * This compares the fork's integration branch with the main branch of the
 * training repository, the upstream remote that Set up my training environment
 * declares. Commits that only record a badge are left out: every learner who
 * claims one adds such a commit, and none of them changes anything a lab runs.
 */
import { c, info, warn, run, gitOut, universe } from "./util.mjs";

// What a badge claim writes, and nothing else
const BADGE_ONLY = /^badges\//;

/** The branch the update is compared with and merged into. */
export const UPDATE_BASE = "integration";

/** The prefix of the branches Update my course creates. */
export const UPDATE_BRANCH_PREFIX = "course/update-";

function remoteUrl(name) {
  return gitOut(["remote", "get-url", name]);
}

function slugOf(url) {
  const match = (url || "").match(/github\.com[/:]([^/]+)\/([^/.]+)/i);
  return match ? `${match[1]}/${match[2]}`.toLowerCase() : null;
}

/**
 * True when there is a training repository to compare with: an upstream remote
 * that is not the fork itself. Before Set up my training environment ran, the
 * clone's origin is the training repository and there is nothing to compare.
 */
export function hasCourseUpstream() {
  const upstream = slugOf(remoteUrl("upstream"));
  const origin = slugOf(remoteUrl("origin"));
  return Boolean(upstream && origin && upstream !== origin);
}

/** Adds the upstream remote when a clone lost it. Returns false when it cannot. */
export function ensureCourseUpstream() {
  if (hasCourseUpstream()) {
    return true;
  }
  const origin = slugOf(remoteUrl("origin"));
  const upstreamRepo = universe().course.upstreamRepo;
  if (!origin || origin === upstreamRepo.toLowerCase()) {
    return false;
  }
  if (remoteUrl("upstream")) {
    return false;
  }
  info(c.dim("    Adding the training repository as the upstream remote."));
  run("git", ["remote", "add", "upstream", `https://github.com/${upstreamRepo}.git`], { quiet: true });
  return hasCourseUpstream();
}

/**
 * Fetches what the comparison needs. Quiet and forgiving: offline, the check
 * simply has nothing new to say, and the command the learner clicked carries on.
 */
export function fetchCourse() {
  const env = { GIT_TERMINAL_PROMPT: "0" };
  const upstream = run("git", ["fetch", "--quiet", "upstream", "main"], { quiet: true, capture: true, env });
  run("git", ["fetch", "--quiet", "origin", "--prune"], { quiet: true, capture: true, env });
  return upstream.code === 0;
}

function refExists(ref) {
  return run("git", ["rev-parse", "--verify", "--quiet", ref], { quiet: true, capture: true }).code === 0;
}

/**
 * The commits of the training repository the given branch does not have, badge
 * claims left out, newest first: [{ sha, subject }].
 */
export function missingCourseCommits(ref = `origin/${UPDATE_BASE}`) {
  if (!refExists("upstream/main") || !refExists(ref)) {
    return [];
  }
  const raw = run(
    "git",
    ["log", "--no-merges", "--format=%x00%h%x09%s", "--name-only", "upstream/main", `^${ref}`],
    { quiet: true, capture: true }
  ).stdout;
  return raw
    .split("\0")
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const [header, ...files] = block.split("\n").map((line) => line.trim()).filter(Boolean);
      const [sha, ...subject] = header.split("\t");
      return { sha, subject: subject.join("\t"), files };
    })
    .filter((commit) => commit.files.length > 0 && !commit.files.every((file) => BADGE_ONLY.test(file)))
    .map(({ sha, subject }) => ({ sha, subject }));
}

/**
 * An Update my course branch already pushed, whose Pull Request is waiting:
 * it holds every course change, but integration does not have them yet.
 */
export function pendingUpdateBranch() {
  const branches = gitOut(["branch", "-r", "--list", `origin/${UPDATE_BRANCH_PREFIX}*`])
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  return branches.find((branch) => missingCourseCommits(branch).length === 0) || null;
}

/**
 * The check every training command runs first. Says nothing when the fork is
 * current, when there is no training repository to compare with, or offline.
 * Returns the number of course changes the fork is missing.
 */
export function adviseCourseUpdate({ fetch = true, quietWhenCurrent = true } = {}) {
  if (!hasCourseUpstream()) {
    return 0;
  }
  if (fetch && !fetchCourse()) {
    return 0;
  }
  const missing = missingCourseCommits();
  if (missing.length === 0) {
    if (!quietWhenCurrent) {
      info(`  Course     : ${c.green("up to date")}`);
    }
    return 0;
  }
  const waiting = pendingUpdateBranch();
  console.log("");
  if (waiting) {
    warn(`Your fork is missing ${missing.length} change(s) of the course, and their Pull Request is waiting.`);
    info(`    Merge the Pull Request of ${c.bold(waiting.replace(/^origin\//, ""))} into ${UPDATE_BASE} with ${c.bold("Merge pull request")}, then Pull.`);
  } else {
    warn(`Your fork is missing ${missing.length} change(s) of the course since you forked it.`);
    missing.slice(0, 3).forEach((commit) => info(c.dim(`    ${commit.subject}`)));
    if (missing.length > 3) {
      info(c.dim(`    ... and ${missing.length - 3} more`));
    }
    info(`    Run ${c.bold("Update my course")} from the Training menu of your level: it opens a Pull Request into ${UPDATE_BASE} that brings them in.`);
  }
  console.log("");
  return missing.length;
}
