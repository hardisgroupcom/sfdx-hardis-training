/**
 * Training > Set up my pipeline.
 *
 * Everything a learner had to do by hand in Level 1 before their first Pull
 * Request could reach an org: fork the repository, point the clone at the fork,
 * turn Actions on, tell the integration branch which org it deploys to, and put
 * the CI credential in the fork's secrets.
 *
 * It exists because that list is training scaffolding, not the job. On a real
 * project the repository is already there, Actions are already on and the
 * secrets were set once by whoever built the pipeline. A beginner who spends
 * their first hour on it learns the wrong lesson about what this work is like.
 *
 * Design rules, the same ones seed.mjs follows:
 *   - Idempotent. Every step checks before it acts, so running it twice is
 *     harmless and running it after a half-finished manual attempt fixes it.
 *   - It never authenticates to Salesforce. Orgs Manager owns that.
 *   - It stops at the first failure and says which button to click instead. The
 *     course never asks anybody to type a command, so a failure has to end in
 *     something clickable.
 */
import fs from "fs";
import path from "path";
import {
  ROOT, c, title, info, ok, warn, abort, run, runJson, git, gitOut,
  select, confirm, connectedOrgs, orgChoices, universe, hasGh, repoSlug
} from "../lib/util.mjs";

const UPSTREAM = "hardisgroupcom/sfdx-hardis-training";
const SECRET = "SFDX_AUTH_URL_INTEGRATION";
const BRANCH = "integration";

/** gh, installed and signed in. Both are worth telling apart: the fixes differ. */
function checkGh() {
  if (!hasGh()) {
    abort(
      "The GitHub CLI (gh) is not installed.",
      [
        "Install it from https://cli.github.com/, then click this command again.",
        "Level 1 lab 0 step 1 shows which download to take."
      ].join("\n  ")
    );
  }
  const status = run("gh", ["auth", "status"], { capture: true, quiet: true });
  if (status.code === 0) {
    return;
  }

  // Nobody is signed in. Sign them in here rather than telling them to type a
  // command: this course never sends anybody to a terminal.
  info("");
  info("You are not signed in to GitHub yet, so let us do that first.");
  info(c.dim("    A browser window opens. Answer GitHub.com, HTTPS, and sign in there."));
  info("");
  const login = run("gh", ["auth", "login", "--hostname", "github.com", "--git-protocol", "https", "--web"]);
  if (login.code !== 0 || run("gh", ["auth", "status"], { capture: true, quiet: true }).code !== 0) {
    abort(
      "The GitHub sign-in did not finish.",
      "Click Set up my pipeline again and complete the sign-in in the browser it opens."
    );
  }
  ok("Signed in to GitHub.");
}

function ghJson(args) {
  const res = run("gh", args, { capture: true, quiet: true });
  if (res.code !== 0) {
    return null;
  }
  try {
    return JSON.parse(res.stdout);
  } catch {
    return null;
  }
}

/** The handle gh is signed in as, which is who the fork will belong to. */
function currentHandle() {
  const user = ghJson(["api", "user"]);
  return user?.login || null;
}

// --------------------------------------------------------------- 1. the fork
async function ensureFork(handle) {
  title("1 of 4  Your own copy of the repository");

  const slug = repoSlug();
  if (slug && slug.toLowerCase() !== UPSTREAM.toLowerCase()) {
    ok(`origin already points at ${c.bold(slug)}.`);
    return slug;
  }

  const fork = `${handle}/sfdx-hardis-training`;
  const existing = ghJson(["repo", "view", fork, "--json", "name"]);
  if (existing) {
    info(`You already have a fork at ${c.bold(fork)}.`);
  } else {
    info(`Forking ${c.bold(UPSTREAM)} into your account.`);
    // No --default-branch-only: this course needs every branch, and that option
    // is the single most common way a learner ends up with a fork that cannot
    // work. The web form calls it "Copy the main branch only".
    const res = run("gh", ["repo", "fork", UPSTREAM, "--clone=false", "--remote=false"]);
    if (res.code !== 0) {
      abort("The fork could not be created.", "Fork it by hand on GitHub, then run this again.");
    }
  }

  // The clone was made from the shared repository, so origin still points there
  // and no push would ever be allowed. The fork becomes origin and the shared
  // repository stays reachable as upstream.
  if (gitOut(["remote"]).split("\n").includes("upstream")) {
    git(["remote", "remove", "upstream"], { quiet: true });
  }
  git(["remote", "rename", "origin", "upstream"]);
  git(["remote", "add", "origin", `https://github.com/${fork}.git`]);
  const fetched = git(["fetch", "origin"]);
  if (fetched.code !== 0) {
    abort(
      "Your fork exists but git could not read it.",
      "Sign in to GitHub in VS Code (Accounts, bottom left) and run this again."
    );
  }
  ok(`origin is now ${c.bold(fork)}, and the shared repository is upstream.`);
  return fork;
}

// ------------------------------------------------------------- 2. actions on
function ensureActions(slug) {
  title("2 of 4  Actions turned on");

  const permissions = ghJson(["api", `repos/${slug}/actions/permissions`]);
  if (permissions?.enabled === true) {
    ok("Actions are on.");
    return true;
  }

  const res = run("gh", [
    "api", "-X", "PUT", `repos/${slug}/actions/permissions`,
    "-F", "enabled=true", "-f", "allowed_actions=all"
  ], { capture: true, quiet: true });

  const after = ghJson(["api", `repos/${slug}/actions/permissions`]);
  if (res.code === 0 && after?.enabled === true) {
    ok("Actions are on.");
    return true;
  }

  // GitHub disables workflows on a new fork behind a banner that has no API.
  // Saying so is better than reporting a success nobody can verify.
  warn("Actions could not be turned on from here.");
  info(`    Open https://github.com/${slug}/actions and click`);
  info(`    ${c.bold("I understand my workflows, go ahead and enable them")}.`);
  info("    It is one click, and then this command has nothing left to do.");
  return false;
}

// ------------------------------------------------------- 3. the branch config
function writeBranchConfig(org) {
  title("3 of 4  Which org the integration branch deploys to");

  const file = path.join(ROOT, "config", "branches", `.sfdx-hardis.${BRANCH}.yml`);
  const details = runJson("sf", ["org", "display", "--target-org", org, "--json"]);
  const username = details?.result?.username;
  const instanceUrl = details?.result?.instanceUrl;
  if (!username) {
    abort(
      `Could not read the username of ${org}.`,
      "Open Orgs Manager in VS Code and check the org is still connected."
    );
  }

  // A Developer Edition org logs in through login.salesforce.com whatever its My
  // Domain is, and that is what the CI job needs.
  const loginUrl = (instanceUrl || "").includes(".sandbox.")
    ? "https://test.salesforce.com"
    : "https://login.salesforce.com";

  fs.mkdirSync(path.dirname(file), { recursive: true });
  const previous = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  const lines = [
    "# Which org the integration branch deploys to.",
    "# Written by Training > Set up my pipeline, and editable in the",
    "# DevOps Pipeline panel: gear menu > Pipeline Settings, scope Branch: integration.",
    `targetUsername: ${username}`,
    `instanceUrl: ${loginUrl}`,
    "mergeTargets: []",
    ""
  ].join("\n");
  fs.writeFileSync(file, lines, "utf8");

  if (previous === lines) {
    ok(`${path.relative(ROOT, file)} was already right.`);
  } else {
    ok(`${path.relative(ROOT, file)} now names ${c.bold(username)}.`);
  }
  publishBranchConfig(file);
  return username;
}

/* Commits the branch configuration on the major branch and pushes it.

   The badge job clones the fork and re-runs the checks against what is actually
   in it, so a setting that never left the machine counts as not done. Doing it
   here also spares the learner the one commit straight to a major branch that
   the rest of the course tells them never to make.
*/
function publishBranchConfig(file) {
  const relative = path.relative(ROOT, file).split(path.sep).join("/");
  const changed = gitOut(["status", "--porcelain", "--", relative]) !== "";
  // A previous run may have committed it and failed to push, so "nothing to
  // commit" is not the same question as "nothing to publish"
  const unpushed = gitOut(["log", "--oneline", `origin/${BRANCH}..${BRANCH}`, "--", relative]) !== "";
  if (!changed && !unpushed) {
    ok("Already published: nothing changed since last time.");
    return;
  }

  const current = gitOut(["rev-parse", "--abbrev-ref", "HEAD"]);
  if (current !== BRANCH && git(["checkout", BRANCH], { quiet: true }).code !== 0) {
    warn(`Could not switch to ${BRANCH} to publish the configuration.`);
    info(`    Commit ${relative} yourself from the Source Control panel, on ${BRANCH}.`);
    return;
  }

  if (changed) {
    git(["add", "--", relative], { quiet: true });
    const committed = run(
      "git",
      ["commit", "-m", `Point ${BRANCH} at my org`, "--", relative],
      { capture: true, quiet: true }
    );
    if (committed.code !== 0) {
      warn("Could not commit the branch configuration.");
      info("    Commit it from the Source Control panel: git needs a name and an email first.");
      info("    File > Preferences > Settings, or your teammate's usual way of setting them.");
      return;
    }
  }

  if (git(["push", "origin", BRANCH]).code !== 0) {
    // Someone merged something since the clone, which is normal on a shared
    // branch. Replay the one commit on top of theirs and try once more.
    info(c.dim(`    ${BRANCH} moved on the server, replaying on top of it`));
    if (git(["pull", "--rebase", "--autostash", "origin", BRANCH]).code !== 0 ||
        git(["push", "origin", BRANCH]).code !== 0) {
      warn(`Committed, but could not push to ${BRANCH}.`);
      info("    Push it from the Source Control panel when you can.");
      return;
    }
  }
  ok(`Published on ${c.bold(BRANCH)}, so the badge job can see it too.`);
}

// ------------------------------------------------------------ 4. the secret
function setSecret(slug, org) {
  title("4 of 4  The credential the CI job uses");

  const auth = runJson("sf", [
    "org", "auth", "show-sfdx-auth-url", "--target-org", org, "--no-prompt", "--json"
  ]);
  const url = auth?.result?.sfdxAuthUrl;
  if (!url || !url.startsWith("force://")) {
    abort(
      `Could not read an auth URL for ${org}.`,
      "Reconnect the org in Orgs Manager, then run this again."
    );
  }

  const res = run("gh", ["secret", "set", SECRET, "--repo", slug, "--body", url], { quiet: true });
  if (res.code !== 0) {
    // The value is printed so the secrets form can be filled without a terminal.
    // It is a refresh token for a throwaway training org, in the learner's own
    // repository, and Level 3 replaces it with a certificate.
    warn(`Could not write the ${SECRET} secret from here.`);
    info(`    Open https://github.com/${slug}/settings/secrets/actions`);
    info(`    New repository secret, named ${c.bold(SECRET)}, with this value:`);
    info("");
    info(`    ${url}`);
    info("");
    return;
  }
  ok(`${SECRET} is set on ${c.bold(slug)}.`);
  info(c.dim("    It holds a long-lived refresh token for a throwaway training org."));
  info(c.dim("    Level 3 lab 1 replaces it with a JWT certificate and deletes it."));
}

// --------------------------------------------------------------------- main
export default async function init(args) {
  title("Set up my pipeline");
  info("Four things stand between a fresh clone and a Pull Request that deploys:");
  info("  your own copy of the repository, Actions turned on, the org the");
  info("  integration branch deploys to, and the credential the job logs in with.");
  info("");
  info(c.dim("This exists for the course only. On a real project the pipeline is already"));
  info(c.dim("there, and nobody asks a new contributor to build one on their first day."));
  info("");

  checkGh();
  const handle = currentHandle();
  if (!handle) {
    abort("Could not read your GitHub account.", "Run: gh auth login");
  }
  info(`Signed in to GitHub as ${c.bold(handle)}.`);

  const orgs = connectedOrgs().filter((o) => o.connected);
  if (orgs.length === 0) {
    abort(
      "No connected org was found.",
      "Connect your two training orgs in the Orgs Manager panel first. Level 1 lab 0 shows how."
    );
  }
  const known = universe().orgs.map((o) => o.alias);
  const suggested = orgs.filter((o) => known.includes(o.alias));
  const org = await select(
    "Which of your orgs is the shared integration org?",
    orgChoices(suggested.length > 0 ? suggested : orgs),
    args.org
  );

  if (!args.yes && !(await confirm(`Set up the pipeline against ${org}?`, true))) {
    info("Nothing was changed.");
    return;
  }

  const slug = await ensureFork(handle);
  const actionsOn = ensureActions(slug);
  writeBranchConfig(org);
  setSecret(slug, org);

  title("Done");
  info(`Your fork:        https://github.com/${slug}`);
  info(`Integration org:  ${org}`);
  info("");
  if (!actionsOn) {
    warn("One thing is left for you: turn Actions on, as printed above.");
    info("");
  }
  info(`Next: ${c.bold("Training > Set up one of my training orgs")}, once per org.`);
}
