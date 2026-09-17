/**
 * Training > Set up one of my training orgs.
 *
 * Deploys the Helios Energy app into an org you already connected in Orgs Manager,
 * grants yourself the manager permission set, then loads the sample data.
 *
 * Design rules, from the spec:
 *   - Idempotent. Running it twice on the same org changes nothing.
 *   - Ordered for a cold org. Everything deploys in one pass.
 *   - Loud about failures. It stops at the first one and says what to do.
 *   - It never authenticates. Orgs Manager owns that.
 */
import fs from "fs";
import path from "path";
import {
  ROOT, c, title, info, ok, warn, abort, run, runJson,
  select, connectedOrgs, orgChoices, universe, readProgress, writeProgress
} from "../lib/util.mjs";

const MANAGER_PERMSET = "Helios_Delivery_Manager";

export default async function seed(args) {
  title("Set up one of my training orgs");

  const orgs = connectedOrgs().filter((o) => o.connected);
  if (orgs.length === 0) {
    abort(
      "No connected org was found.",
      "Open the Orgs Manager panel in VS Code and connect your training org first. See Level 1 lab 0."
    );
  }

  const known = universe().orgs.map((o) => o.alias);
  const suggested = orgs.filter((o) => known.includes(o.alias));
  const list = suggested.length > 0 ? suggested : orgs;

  const target = await select("Which org do you want to set up?", orgChoices(list), args.org);

  info("");
  info(`This will put the ${c.bold("Helios Delivery")} app and its sample data into ${c.bold(target)}.`);
  info(c.dim("Nothing is deleted. Running this twice is harmless."));

  // ------------------------------------------------------- 1. metadata
  title("1 of 4  Deploying the Helios Delivery app");
  info(c.dim("    On a brand new Developer Edition org this takes a few minutes."));
  const deploy = run("sf", [
    "project", "deploy", "start",
    "--source-dir", "force-app",
    "--target-org", target,
    "--test-level", "NoTestRun",
    "--wait", "60"
  ]);
  if (deploy.code !== 0) {
    abort(
      `The deployment to ${target} failed.`,
      "Read the errors above. The most common cause is an org that is not a Developer Edition, or a connection that expired: reconnect it in Orgs Manager and run this again."
    );
  }
  ok("The app is deployed");

  // ---------------------------------------- 2. permission set, before the data
  // This has to happen before the data load. A metadata deployment grants no
  // field level security to anybody, so without it even a System Administrator
  // cannot write Installation__c.External_Id__c and the data load fails with a
  // message that has nothing to do with the real cause.
  title("2 of 4  Granting yourself the Helios Delivery Manager permission set");
  const assign = run("sf", ["org", "assign", "permset", "--name", MANAGER_PERMSET, "--target-org", target]);
  if (assign.code !== 0) {
    warn("The permission set was already assigned, or could not be assigned. Continuing.");
  } else {
    ok(`${MANAGER_PERMSET} is assigned to you`);
  }

  // ------------------------------------------------------------ 3. data
  title("3 of 4  Loading the Helios sample data");
  const dataPath = path.join("scripts", "data", "HeliosBaseline");
  const dataImport = run("sf", [
    "hardis:org:data:import",
    "--agent",
    "--path", dataPath,
    "--target-org", target
  ]);
  if (dataImport.code !== 0) {
    abort(
      `The data load into ${target} failed.`,
      "The deployment worked, so the app is there and only the records are missing. Run Set up one of my training orgs again: the load is an upsert and repeats safely."
    );
  }
  ok("Accounts, contacts, opportunities, installations and panel batches are loaded");

  // ----------------------------------------------------------- 4. drift
  title("4 of 4  Applying what makes this org different from the others");
  const applied = applyDrift(target);
  if (applied.length === 0) {
    info(c.dim("    Nothing to apply for this org."));
  } else {
    applied.forEach((line) => ok(line));
  }

  // ----------------------------------------------------------- receipt
  const progress = readProgress();
  progress.orgs = progress.orgs || {};
  progress.orgs[target] = { seededAt: new Date().toISOString() };
  writeProgress(progress);

  title("Your org is ready");
  const counts = countRecords(target);
  if (counts) {
    info(`  ${counts.installations} installations, ${counts.batches} panel batches, ${counts.accounts} accounts.`);
  }
  info("");
  info(`  Open it from the ${c.bold("Orgs Manager")} panel, then pick the ${c.bold("Helios Delivery")} app`);
  info("  in the App Launcher and look at the Installations tab.");
  info("");
  info(`  Next: ${c.cyan(universe().course.site + "/en/level-1/lab-01-fork-and-connect/")}`);
}

/**
 * Per-org differences the labs rely on, from scripts/drift/<alias>.json.
 * This is how helios-prod ends up one step behind the repository, which is what
 * Level 3 lab 7 needs in order to have something to retrofit.
 */
function applyDrift(alias) {
  const file = path.join(ROOT, "scripts", "drift", `${alias}.json`);
  if (!fs.existsSync(file)) {
    return [];
  }
  const drift = JSON.parse(fs.readFileSync(file, "utf8"));
  const done = [];
  for (const step of drift.steps || []) {
    if (step.type === "apex") {
      const tmp = path.join(ROOT, ".training-drift.apex");
      fs.writeFileSync(tmp, step.code, "utf8");
      const res = run("sf", ["apex", "run", "--file", tmp, "--target-org", alias], { quiet: true, capture: true });
      fs.rmSync(tmp, { force: true });
      if (res.code === 0) {
        done.push(step.label);
      } else {
        warn(`${step.label} could not be applied. The lab that needs it will say so.`);
      }
    } else if (step.type === "data") {
      const res = run("sf", [
        "hardis:org:data:import", "--agent",
        "--path", path.join("scripts", "data", step.workspace),
        "--target-org", alias
      ], { quiet: true, capture: true });
      if (res.code === 0) {
        done.push(step.label);
      } else {
        warn(`${step.label} could not be applied.`);
      }
    }
  }
  return done;
}

function countRecords(alias) {
  const q = (soql) => {
    const res = runJson("sf", ["data", "query", "--query", soql, "--target-org", alias, "--json"]);
    return res && res.result ? res.result.totalSize : null;
  };
  const installations = q("SELECT Id FROM Installation__c");
  if (installations === null) {
    return null;
  }
  return {
    installations,
    batches: q("SELECT Id FROM Panel_Batch__c"),
    accounts: q("SELECT Id FROM Account")
  };
}
