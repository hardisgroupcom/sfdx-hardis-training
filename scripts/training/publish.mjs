/**
 * Training > Level 3 > Publish my pipeline configuration.
 *
 * The release manager owns the pipeline configuration and never opens a feature
 * Pull Request: contributors do. What the release manager changes in the DevOps
 * Pipeline settings, the certificates of Add/Configure Org, the .forceignore and
 * the package-no-overwrite list lands straight on integration, the development
 * branch, and reaches the other major branches with the next promotions.
 *
 * integration refuses a direct push, the release manager's included, so this
 * lifts the protection for this one push and puts it back, like Set up my
 * training environment does in Level 1. On a real project the release manager
 * holds the right to push to the development branch, or has an administrator
 * push the configuration.
 */
import fs from "fs";
import path from "path";
import { ROOT, c, title, info, ok, warn, abort, run, gitOut, confirm, repoSlug } from "../lib/util.mjs";
import { withProtectionLifted } from "../lib/protection.mjs";

// What a release manager configures, and nothing else: a feature never goes this way
const CONFIGURATION = [
  "config/.sfdx-hardis.yml",
  "config/branches",
  ".forceignore",
  "manifest/package-no-overwrite.xml"
];
const BRANCH = "integration";

export default async function publish(args) {
  title("Publish my pipeline configuration");

  const current = gitOut(["rev-parse", "--abbrev-ref", "HEAD"]);
  if (current !== BRANCH) {
    abort(
      `You are on ${current}, and the pipeline configuration is published from ${BRANCH}.`,
      `Switch to ${BRANCH} in the Source Control panel, the branch name at the bottom left of VS Code, then run this again.`
    );
  }

  // git refuses a path that is neither on disk nor tracked: the no-overwrite list only
  // exists from Lab 3.6 on
  const paths = CONFIGURATION.filter((p) => fs.existsSync(path.join(ROOT, p)) || gitOut(["ls-files", "--", p]) !== "");
  const changed = gitOut(["status", "--porcelain", "--", ...paths])
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (changed.length === 0) {
    ok("Nothing to publish: the pipeline configuration on your disk is the one on integration.");
    return;
  }
  info("  The configuration you changed:");
  changed.forEach((line) => info(c.dim(`    ${line}`)));
  const others = gitOut(["status", "--porcelain"])
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !changed.includes(line));
  if (others.length > 0) {
    info("");
    info(c.dim("  Left out, because they are not configuration: a contributor brings them through a Pull Request."));
    others.forEach((line) => info(c.dim(`    ${line}`)));
  }
  info("");
  const sure = args.yes === true || (await confirm(`Commit it on ${BRANCH} and push it?`, true));
  if (!sure) {
    info("Nothing was published.");
    return;
  }

  title("1 of 2  Committing the configuration");
  run("git", ["pull", "--ff-only", "origin", BRANCH], { quiet: true });
  run("git", ["add", "--all", "--", ...paths]);
  const message = args.message || "Pipeline configuration, from the release manager";
  if (run("git", ["commit", "-m", message, "--", ...paths]).code !== 0) {
    abort("The configuration could not be committed.", "Git needs a name and an email first: Source Control panel, then commit once by hand.");
  }
  ok("Committed on integration");

  title("2 of 2  Pushing it to your fork");
  const slug = repoSlug();
  const push = withProtectionLifted(slug, [BRANCH], () => run("git", ["push", "origin", BRANCH], { quiet: true, capture: true }));
  if (push.code !== 0) {
    warn("The push was refused. The commit is on your local integration: run this again when you are online.");
    return;
  }
  ok(`Pushed. ${BRANCH} is protected again.`);

  title("Done");
  info(`  The push starts a deployment of ${BRANCH}, like any merge: the Actions tab of your fork shows it.`);
  info("  The configuration reaches uat, preprod and main with the next promotions.");
}
