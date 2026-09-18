/**
 * Every rule that decides whether a lab was really done.
 *
 * The same rules run twice:
 *   - scripts/verify/check.mjs, locally, so a learner sees the result immediately
 *   - scripts/verify/audit.mjs, in the claim workflow, against a clone of their
 *     public repository
 *
 * Each rule has one or two checks:
 *   - check(ctx): what the level leaves behind in the fork, once every lab of it
 *     is done. The badge audit runs only this one, against a clone, and so does
 *     "Everything in level N".
 *   - now(ctx), when the lab needs it: what is true right after the lab, done
 *     well. "Check my work" on one lab runs it, on the learner's machine, where it
 *     may read the working copy and the orgs (ctx.local). A lab done right never
 *     fails it, whether it is run the minute the lab ends or three labs later, so
 *     every now() also passes once check() does.
 *
 * Two hard rules for anything written here, from section 15.4 of the spec:
 *
 *  1. Assert outcomes, never procedures. A learner who rebased, squashed or
 *     resolved a conflict through the GitHub web UI did the work and must pass.
 *     Never assert "a merge commit with two parents exists".
 *  2. A failure message names the lab, what was looked for, and where.
 *     It is the only support channel a learner has.
 */
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

// --------------------------------------------------------------- context
export function makeContext(dir, { local = false, sfQuery = null } = {}) {
  const git = (args) => {
    const res = spawnSync("git", args, { cwd: dir, encoding: "utf8", shell: false });
    return (res.stdout || "").trim();
  };
  // On the learner's machine the local branches are whatever they were at the last pull: a Pull
  // Request merged on GitHub is not in the local integration yet. What counts is the fork, so fetch
  // it first, and read the published branch before the local one.
  if (local) {
    spawnSync("git", ["fetch", "origin", "--prune", "--quiet"], { cwd: dir, encoding: "utf8", shell: false });
  }
  const refsOf = (branch) => (branch.startsWith("origin/") ? [branch] : [`origin/${branch}`, branch]);
  const branches = git(["branch", "-a", "--format=%(refname:short)"])
    .split("\n")
    .map((b) => b.replace(/^origin\//, "").trim())
    .filter(Boolean);

  const cache = new Map();
  /** File content on a branch, or null. Falls back to the working tree. */
  const readOn = (branch, file) => {
    const key = `${branch}::${file}`;
    if (cache.has(key)) {
      return cache.get(key);
    }
    let content = null;
    for (const ref of refsOf(branch)) {
      const res = spawnSync("git", ["show", `${ref}:${file}`], { cwd: dir, encoding: "utf8", shell: false });
      if (res.status === 0) {
        content = res.stdout;
        break;
      }
    }
    if (content === null && branch === currentBranch()) {
      const p = path.join(dir, file);
      if (fs.existsSync(p)) {
        content = fs.readFileSync(p, "utf8");
      }
    }
    cache.set(key, content);
    return content;
  };
  const listOn = (branch, prefix) => {
    for (const ref of refsOf(branch)) {
      const res = spawnSync("git", ["ls-tree", "-r", "--name-only", ref], { cwd: dir, encoding: "utf8", shell: false });
      if (res.status === 0) {
        return res.stdout.split("\n").map((s) => s.trim()).filter((s) => s && s.startsWith(prefix));
      }
    }
    return [];
  };
  function currentBranch() {
    return git(["rev-parse", "--abbrev-ref", "HEAD"]);
  }
  const log = (branch) => {
    for (const ref of refsOf(branch)) {
      const res = spawnSync("git", ["log", "--format=%s%n%b", ref], { cwd: dir, encoding: "utf8", shell: false });
      if (res.status === 0) {
        return res.stdout;
      }
    }
    return "";
  };

  /** A file of the working copy, uncommitted changes included. Local checks only. */
  const readWorking = (file) => {
    const p = path.join(dir, file);
    return local && fs.existsSync(p) ? fs.readFileSync(p, "utf8") : null;
  };

  return {
    dir, git, branches, readOn, listOn, log, currentBranch, readWorking, local, sfQuery,
    hasBranch: (b) => branches.includes(b)
  };
}

// --------------------------------------------------------------- helpers
const DEV = "integration";

// A learner clicks Check my work when a lab is finished, which for Labs 1.3,
// 1.4 and 1.5 is before the Pull Request of Lab 1.6 puts anything into
// integration. Their work is real, it just lives on their story branch, so
// these rules look there too. Three red ticks in a row would teach them to
// stop clicking the button.
const readAnywhere = (ctx, file) => ctx.readOn(DEV, file) || ctx.readOn(ctx.currentBranch(), file);
const logAnywhere = (ctx) => `${ctx.log(DEV)}\n${ctx.log(ctx.currentBranch())}`;
const FIELD = (obj, field) => `force-app/main/default/objects/${obj}/fields/${field}.field-meta.xml`;
const PERMSET = (name) => `force-app/main/default/permissionsets/${name}.permissionset-meta.xml`;

const pass = (detail) => ({ ok: true, detail });
const miss = (detail, where) => ({ ok: false, detail, where });

function fieldGrantedIn(content, field) {
  if (!content) {
    return false;
  }
  const block = new RegExp(
    `<fieldPermissions>\\s*(?:<editable>[^<]*</editable>\\s*)?<field>${field.replace(/[.$]/g, "\\$&")}</field>\\s*<readable>true</readable>`,
    "m"
  );
  return block.test(content.replace(/\r/g, ""));
}

function mentions(text, needle) {
  return typeof text === "string" && text.toLowerCase().includes(needle.toLowerCase());
}

// The badge reads the notebook where the level leaves it, on integration or main.
// Right after a lab, the line is often only in the working copy, or on the story
// branch that will carry it, and that is the lab done right.
function pipelineNotes(ctx) {
  const committed = [ctx.readOn(DEV, "MY-PIPELINE.md"), ctx.readOn("main", "MY-PIPELINE.md")];
  const local = ctx.local ? [ctx.readWorking("MY-PIPELINE.md"), ctx.readOn(ctx.currentBranch(), "MY-PIPELINE.md")] : [];
  return committed.concat(local).filter(Boolean).join("\n");
}

/** The story branch a lab created, local or published, or null. */
function storyBranch(ctx, story) {
  const prefix = `features/${story}`;
  return ctx.branches.find((b) => b.startsWith(prefix)) || null;
}

/** True when the published copy of a branch exists: what Save / Publish pushed. */
function published(ctx, branch) {
  return ctx.git(["rev-parse", "--verify", "--quiet", `origin/${branch}`]) !== "";
}

/** The first rule result that passed, or the last one, whose message says what is missing. */
function firstPassing(...attempts) {
  let last = null;
  for (const attempt of attempts) {
    last = attempt();
    if (last.ok) {
      return last;
    }
  }
  return last;
}

const ruleCheck = (id) => (ctx) => RULES.find((r) => r.id === id).check(ctx);

/**
 * A hotfix in a history: the word itself, or a merge of a fix/ branch, which is how Lab 3.8 names
 * it (branchPrefixChoices) and how the DORA report of Lab 3.7 recognises one.
 */
const isHotfix = (history) => mentions(history, "hotfix") || /(^|[\s/:])(hot|bug)?fix\//im.test(history || "");

/** The dev org alias, as the universe names it. */
const DEV_ORG = "helios-dev";

// --------------------------------------------------------------- the rules
export const RULES = [
  // ------------------------------------------------------------- level 1
  {
    id: "1.2", level: 1, lab: 2,
    title: "Your fork has integration and uat branches, and each knows which org it deploys to",
    check: (ctx) => {
      if (!ctx.hasBranch(DEV)) {
        return miss(`no branch named "${DEV}"`, "your fork. Lab 1.2 creates it, or Reset this level restores it");
      }
      const rerun = "Run Set up my training environment again: it writes the file and pushes it";
      for (const branch of ["integration", "uat"]) {
        const file = `config/branches/.sfdx-hardis.${branch}.yml`;
        const config = ctx.readOn(DEV, file);
        if (!config) {
          return miss(`${file} is missing`, `branch ${DEV}. ${rerun}`);
        }
        const hasOrg = /targetUsername:\s*["']?[^"'\s][^\n]*/.test(config) &&
          !/targetUsername:\s*["']{2}\s*$/m.test(config);
        if (!hasOrg) {
          return miss(`targetUsername is still empty in ${file}`, `branch ${DEV}. ${rerun}`);
        }
      }
      return pass("integration and uat both name their org");
    }
  },
  {
    id: "1.3", level: 1, lab: 3,
    title: "US-014 was taken from the backlog on its own branch",
    // Right after the lab there is a branch and nothing in it yet: that is the lab
    // done. Once the story is merged, the branch may be gone and the history says it.
    now: (ctx) => {
      const branch = storyBranch(ctx, "US-014");
      if (branch) {
        return pass(`Your story branch ${branch} exists`);
      }
      return mentions(ctx.log(DEV), "US-014")
        ? pass("US-014 is already merged into integration")
        : miss(
          "no branch starting with features/US-014",
          "your local branches and your fork. New User Story creates it: pick US-014 and answer the questions as step 3 shows"
        );
    },
    check: (ctx) => {
      const history = logAnywhere(ctx);
      return mentions(history, "US-014")
        ? pass("US-014 appears in the history")
        : miss("no commit mentioning US-014", `the history of ${DEV} and of your current branch`);
    }
  },
  {
    id: "1.4", level: 1, lab: 4,
    title: "Panels Required exists on Installation and the crew can read it",
    // Lab 1.4 ends with the field in the org and nowhere else: the repository only
    // learns about it in Lab 1.5. So right after the lab, the org is what to read.
    now: (ctx) => firstPassing(
      () => ruleCheck("1.4")(ctx),
      () => {
        if (!ctx.sfQuery) {
          return miss("your dev org could not be read from here", `${DEV_ORG}. Check it is connected in Orgs Manager`);
        }
        // The Tooling API, because FieldDefinition hides a field from a user who
        // cannot see it, and not seeing it is one of the mistakes this checks for
        const objects = ctx.sfQuery(DEV_ORG, "SELECT Id FROM CustomObject WHERE DeveloperName = 'Installation'", { tooling: true });
        if (objects === null || objects.length === 0) {
          return miss("your dev org could not be queried", `${DEV_ORG}. Reconnect it in Orgs Manager, then run this again`);
        }
        const fields = ctx.sfQuery(
          DEV_ORG,
          `SELECT Id FROM CustomField WHERE DeveloperName = 'Panels_Required' AND TableEnumOrId = '${objects[0].Id}'`,
          { tooling: true }
        );
        if (!fields || fields.length === 0) {
          return miss("there is no Panels_Required__c field on Installation", `the org ${DEV_ORG}. Step 2 creates it`);
        }
        const granted = (permset, access) => (ctx.sfQuery(
          DEV_ORG,
          `SELECT Id FROM FieldPermissions WHERE Parent.Name = '${permset}' AND Field = 'Installation__c.Panels_Required__c' AND ${access} = true`
        ) || []).length > 0;
        if (!granted("Helios_Delivery_Crew", "PermissionsRead")) {
          return miss(
            "the field exists, but the Helios_Delivery_Crew permission set does not grant read access to it",
            `the org ${DEV_ORG}, Setup > Permission Sets > Helios Delivery Crew > Object Settings > Installations`
          );
        }
        return granted("Helios_Delivery_Manager", "PermissionsEdit")
          ? pass(`Panels Required exists in ${DEV_ORG}, the crew can read it and the planners can fill it in`)
          : miss(
            "the crew can read the field, but Helios_Delivery_Manager does not grant edit access to it, so no planner can fill it in",
            `the org ${DEV_ORG}, Setup > Permission Sets > Helios Delivery Manager > Object Settings > Installations`
          );
      }
    ),
    check: (ctx) => {
      const field = readAnywhere(ctx, FIELD("Installation__c", "Panels_Required__c"));
      if (!field) {
        return miss(
          "Installation__c.Panels_Required__c was not found",
          `${FIELD("Installation__c", "Panels_Required__c")} on ${DEV} or on your current branch`
        );
      }
      const crew = readAnywhere(ctx, PERMSET("Helios_Delivery_Crew"));
      return fieldGrantedIn(crew, "Installation__c.Panels_Required__c")
        ? pass("The field exists and the crew permission set grants it")
        : miss(
          "the field exists, but Helios_Delivery_Crew does not grant read access to it",
          `${PERMSET("Helios_Delivery_Crew")} on ${DEV} or on your current branch`
        );
    }
  },
  {
    id: "1.5", level: 1, lab: 5,
    title: "Panels Required is on the Installation layout",
    // Lab 1.5 ends with the story published on its own branch, before any Pull
    // Request: the published branch is what has to carry the three components.
    now: (ctx) => firstPassing(
      () => ruleCheck("1.6")(ctx),
      () => {
        const branch = storyBranch(ctx, "US-014");
        if (!branch) {
          return miss("no branch starting with features/US-014", "your local branches and your fork. Lab 1.3 creates it");
        }
        const where = `branch ${branch} in your fork`;
        if (!published(ctx, branch)) {
          return miss(
            `${branch} exists on your machine but was never published`,
            "your fork. Save / Publish pushes it: answer Yes when it asks"
          );
        }
        const ref = `origin/${branch}`;
        if (!ctx.readOn(ref, FIELD("Installation__c", "Panels_Required__c"))) {
          return miss("the Panels_Required__c field is not in the published branch", `${where}. Retrieve it (step 1), commit it and publish again`);
        }
        if (!fieldGrantedIn(ctx.readOn(ref, PERMSET("Helios_Delivery_Crew")), "Installation__c.Panels_Required__c")) {
          return miss("Helios_Delivery_Crew in the published branch does not grant the field", `${PERMSET("Helios_Delivery_Crew")} on ${where}`);
        }
        if (!fieldGrantedIn(ctx.readOn(ref, PERMSET("Helios_Delivery_Manager")), "Installation__c.Panels_Required__c")) {
          return miss("Helios_Delivery_Manager in the published branch does not grant the field", `${PERMSET("Helios_Delivery_Manager")} on ${where}`);
        }
        const layout = ctx.readOn(ref, "force-app/main/default/layouts/Installation__c-Installation Layout.layout-meta.xml");
        return mentions(layout, "Panels_Required__c")
          ? pass(`The field, both permission sets and the layout are published on ${branch}`)
          : miss("the Installation layout in the published branch does not carry the field", `the Installation layout on ${where}`);
      }
    ),
    check: (ctx) => {
      const layout = readAnywhere(ctx, "force-app/main/default/layouts/Installation__c-Installation Layout.layout-meta.xml");
      return mentions(layout, "Panels_Required__c")
        ? pass("The layout carries the new field")
        : miss(
          "Panels_Required__c is not on the Installation layout",
          "force-app/main/default/layouts/Installation__c-Installation Layout.layout-meta.xml on integration or on your current branch"
        );
    }
  },
  {
    id: "1.6", level: 1, lab: 6,
    title: "US-014 reached integration through a Pull Request",
    check: (ctx) => {
      const field = ctx.readOn(DEV, FIELD("Installation__c", "Panels_Required__c"));
      return field
        ? pass("The field reached integration through a Pull Request")
        : miss("Panels_Required__c is not on integration yet", `branch ${DEV}`);
    }
  },
  {
    id: "1.7", level: 1, lab: 7,
    title: "Capstone: US-016 delivered on your own",
    check: (ctx) => {
      const field = ctx.readOn(DEV, FIELD("Installation__c", "Crew_Notes__c"));
      if (!field) {
        return miss(
          "Installation__c.Crew_Notes__c was not found",
          `${FIELD("Installation__c", "Crew_Notes__c")} on branch ${DEV}`
        );
      }
      const crew = ctx.readOn(DEV, PERMSET("Helios_Delivery_Crew"));
      if (!fieldGrantedIn(crew, "Installation__c.Crew_Notes__c")) {
        return miss(
          "Crew_Notes__c is not granted on Helios_Delivery_Crew",
          `${PERMSET("Helios_Delivery_Crew")} on branch ${DEV}`
        );
      }
      // US-016 asks for the list view as well
      const listView = ctx.readOn(DEV, "force-app/main/default/objects/Installation__c/listViews/Open_Installations.listView-meta.xml");
      return listView
        ? pass("Crew Notes, its permission and the Open Installations list view are on integration")
        : miss(
          "the Open Installations list view was not found",
          `force-app/main/default/objects/Installation__c/listViews/Open_Installations.listView-meta.xml on branch ${DEV}`
        );
    }
  },

  // ------------------------------------------------------------- level 2
  {
    id: "2.1", level: 2, lab: 1, auditable: false,
    title: "Your dev org is level with integration",
    // Right after the lab the proof is in the org: Amina's field reached helios-dev.
    // The notebook line is written with the next story, which is how it reaches
    // integration, where check() reads it at the end of the level.
    now: (ctx) => firstPassing(
      () => ruleCheck("2.1")(ctx),
      () => {
        if (!ctx.sfQuery) {
          return miss("your dev org could not be read from here", `${DEV_ORG}. Check it is connected in Orgs Manager`);
        }
        const objects = ctx.sfQuery(DEV_ORG, "SELECT Id FROM CustomObject WHERE DeveloperName = 'Installation'", { tooling: true });
        if (!objects || objects.length === 0) {
          return miss("your dev org could not be queried", `${DEV_ORG}. Reconnect it in Orgs Manager, then run this again`);
        }
        const fields = ctx.sfQuery(
          DEV_ORG,
          `SELECT Id FROM CustomField WHERE DeveloperName = 'Signed_Off_By' AND TableEnumOrId = '${objects[0].Id}'`,
          { tooling: true }
        );
        return fields && fields.length > 0
          ? pass(`Amina's Signed Off By field reached ${DEV_ORG}: your org is level with integration`)
          : miss(
            "Amina's Signed_Off_By__c field is not in your dev org, so the backpromote did not bring it",
            `the org ${DEV_ORG}. Merge her US-017 Pull Request first (step 1), then run the backpromote again`
          );
      }
    ),
    check: (ctx) => {
      const notes = pipelineNotes(ctx);
      return mentions(notes, "backpromote")
        ? pass("The backpromote is recorded in MY-PIPELINE.md")
        : miss(
          "no line about the backpromote in MY-PIPELINE.md",
          "MY-PIPELINE.md. Lab 2.1 asks you to note which items you kept and which you dropped"
        );
    }
  },
  {
    id: "2.2", level: 2, lab: 2,
    title: "US-021: the excluded field was un-excluded and the flow deploys",
    check: (ctx) => {
      const forceignore = ctx.readOn(DEV, ".forceignore") || "";
      if (/Crew_W\*/.test(forceignore)) {
        return miss(
          "the Crew_W* pattern is still in .forceignore, so any field whose name starts with Crew_W stays invisible",
          `.forceignore on branch ${DEV}`
        );
      }
      const field = ctx.readOn(DEV, FIELD("Installation__c", "Crew_Warning_Sent__c"));
      if (!field) {
        return miss(
          "Installation__c.Crew_Warning_Sent__c never reached the sources",
          `${FIELD("Installation__c", "Crew_Warning_Sent__c")} on branch ${DEV}`
        );
      }
      const flows = ctx.listOn(DEV, "force-app/main/default/flows/");
      return flows.some((f) => /Crew_Warning/i.test(f))
        ? pass("The field is versioned and the warning flow is there")
        : miss(
          "no crew warning flow was found",
          `force-app/main/default/flows/ on branch ${DEV}, expected something like Installation_Crew_Warning.flow-meta.xml`
        );
    }
  },
  {
    id: "2.3", level: 2, lab: 3,
    title: "US-024: Crew Size is required, and an Apex action backfills the old records",
    check: (ctx) => {
      const field = ctx.readOn(DEV, FIELD("Installation__c", "Crew_Size__c")) || "";
      if (!/<required>true<\/required>/.test(field)) {
        return miss(
          "Crew_Size__c is still optional",
          `${FIELD("Installation__c", "Crew_Size__c")} on branch ${DEV}`
        );
      }
      const actions = ctx.listOn(DEV, "config/branches/").concat(ctx.listOn(DEV, "scripts/actions/"));
      const withApex = actions.some((f) => {
        const content = ctx.readOn(DEV, f) || "";
        return /apexScript|commandsPreDeploy|commandsPostDeploy/.test(content) && /Crew_Size|backfill/i.test(content);
      });
      return withApex
        ? pass("The field is required and the backfill action is declared")
        : miss(
          "no post-deploy Apex action that backfills Crew Size was found",
          `config/branches/ and scripts/actions/ on branch ${DEV}`
        );
    }
  },
  {
    id: "2.4", level: 2, lab: 4,
    title: "US-026: the reference data and the batch follow the deployment",
    check: (ctx) => {
      const workspaces = ctx.listOn(DEV, "scripts/data/");
      if (!workspaces.some((f) => /CrewRefData|CrewCapacity/i.test(f))) {
        return miss(
          "no crew capacity data workspace was found",
          `scripts/data/ on branch ${DEV}, expected a folder such as HeliosCrewRefData with an export.json`
        );
      }
      const actionFiles = ctx.listOn(DEV, "config/branches/").concat(ctx.listOn(DEV, "scripts/actions/"));
      const text = actionFiles.map((f) => ctx.readOn(DEV, f) || "").join("\n");
      const hasData = /dataImport|data:import|HeliosCrewRefData|CrewCapacity/i.test(text);
      const hasSchedule = /schedule|CrewCapacityBatch/i.test(text);
      const hasManual = /manual/i.test(text);
      const missing = [
        !hasData ? "the data import action" : null,
        !hasSchedule ? "the batch schedule action" : null,
        !hasManual ? "the manual step" : null
      ].filter(Boolean);
      return missing.length === 0
        ? pass("Data import, batch schedule and manual step are all declared")
        : miss(
          `these deployment actions are missing: ${missing.join(", ")}`,
          `config/branches/ and scripts/actions/ on branch ${DEV}`
        );
    }
  },
  {
    id: "2.5", level: 2, lab: 5,
    title: "US-027: the query is out of the loop and the scheduler is covered",
    check: (ctx) => {
      const cls = ctx.readOn(DEV, "force-app/main/default/classes/InstallationScheduler.cls") || "";
      if (!/schedulableOn/.test(cls)) {
        return miss(
          "schedulableOn was not found in InstallationScheduler",
          `force-app/main/default/classes/InstallationScheduler.cls on branch ${DEV}`
        );
      }
      // The outcome, not the procedure: the query has to be out of the loop. Any
      // shape that queries once for the whole list passes, which is what an IN bind
      // on the collection looks like however it is written.
      if (!/WHERE\s+Installation__c\s+IN\s*:/i.test(cls)) {
        return miss(
          "schedulableOn still queries inside its loop: one SOQL per installation hits the governor limit",
          `force-app/main/default/classes/InstallationScheduler.cls on branch ${DEV}, expected a single query binding the whole list`
        );
      }
      const test = ctx.readOn(DEV, "force-app/main/default/classes/InstallationSchedulerTest.cls") || "";
      return /schedulableOn/.test(test) && /@isTest/.test(test)
        ? pass("The query is out of the loop, and the new behaviour has a test")
        : miss(
          "InstallationSchedulerTest does not cover schedulableOn",
          `force-app/main/default/classes/InstallationSchedulerTest.cls on branch ${DEV}`
        );
    }
  },
  {
    id: "2.6", level: 2, lab: 6,
    title: "US-033: the batch cost permission moved to the permission set",
    check: (ctx) => {
      const crew = ctx.readOn(DEV, PERMSET("Helios_Delivery_Crew"));
      if (!crew) {
        return miss("Helios_Delivery_Crew is missing", `${PERMSET("Helios_Delivery_Crew")} on branch ${DEV}`);
      }
      if (!fieldGrantedIn(crew, "Panel_Batch__c.Cost__c")) {
        return miss(
          "Panel_Batch__c.Cost__c is not granted on Helios_Delivery_Crew",
          `${PERMSET("Helios_Delivery_Crew")} on branch ${DEV}`
        );
      }
      const profiles = ctx.listOn(DEV, "force-app/main/default/profiles/");
      return profiles.length === 0
        ? pass("The permission lives on the permission set, and no Profile was committed")
        : miss(
          "a Profile is committed in the sources, which is what made the permission disappear in the first place",
          `force-app/main/default/profiles/ on branch ${DEV}`
        );
    }
  },
  {
    id: "2.7", level: 2, lab: 7,
    title: "The conflict with Marco is resolved, and both sides survived",
    check: (ctx) => {
      const flows = ctx.listOn(DEV, "force-app/main/default/flows/");
      const assign = flows.find((f) => /Assign_Crew/i.test(f));
      if (!assign) {
        return miss("Installation_Assign_Crew is missing from the sources", `force-app/main/default/flows/ on branch ${DEV}`);
      }
      const flow = ctx.readOn(DEV, assign) || "";
      if (/<{7}|>{7}|={7}/.test(flow)) {
        return miss(
          "the flow still contains git conflict markers",
          `${assign} on branch ${DEV}`
        );
      }
      const hasCap = /cap|maximum|Crew_Capacity|too large/i.test(flow);
      const manager = ctx.readOn(DEV, PERMSET("Helios_Delivery_Manager")) || "";
      const hasBoth = hasCap && !/<{7}|>{7}/.test(manager);
      return hasBoth
        ? pass("Marco's cap and your change are both in integration, with no conflict markers left")
        : miss(
          "the crew capacity cap from US-018 is not in the flow, so one side of the conflict was lost",
          `${assign} on branch ${DEV}`
        );
    }
  },
  {
    id: "2.8", level: 2, lab: 8, auditable: true,
    title: "The repository carries only what belongs to it",
    check: (ctx) => {
      const notes = pipelineNotes(ctx);
      if (!mentions(notes, "resetselection") && !mentions(notes, "reset selection")) {
        return miss(
          "MY-PIPELINE.md does not record what you had over-selected and how you recovered",
          "MY-PIPELINE.md. Lab 2.8 asks for one line naming what you dropped"
        );
      }
      // Deployment.settings is the one setting this project ships on purpose: it
      // is what lets a deployment run while the Lab 2.4 batch is scheduled.
      const stray = ctx.listOn(DEV, "force-app/main/default/").filter((f) =>
        /\/(profiles|settings|standardValueSets|objectTranslations|networks)\//.test(f) &&
        !f.endsWith("/settings/Deployment.settings-meta.xml")
      );
      return stray.length === 0
        ? pass("The recovery is recorded, and no over-committed metadata is left on integration")
        : miss(
          `${stray.length} file(s) that should never have been committed are on integration: ${stray.slice(0, 3).join(", ")}`,
          `branch ${DEV}. Lab 2.8 is about resetting a selection that went too wide`
        );
    }
  },
  {
    id: "2.9", level: 2, lab: 9,
    title: "Capstone: US-041, the handover checklist",
    check: (ctx) => {
      const objects = ctx.listOn(DEV, "force-app/main/default/objects/");
      if (!objects.some((f) => /Handover_Item__c/.test(f))) {
        return miss(
          "the Handover_Item__c object was not found",
          `force-app/main/default/objects/ on branch ${DEV}`
        );
      }
      const workspaces = ctx.listOn(DEV, "scripts/data/");
      if (!workspaces.some((f) => /Handover/i.test(f))) {
        return miss(
          "no data workspace loads the checklist reference items",
          `scripts/data/ on branch ${DEV}`
        );
      }
      const flows = ctx.listOn(DEV, "force-app/main/default/flows/");
      return flows.some((f) => /Close/i.test(f))
        ? pass("Object, reference data and the close check are all in integration")
        : miss("no flow blocks the close on an incomplete checklist", `force-app/main/default/flows/ on branch ${DEV}`);
    }
  },

  // ------------------------------------------------------------- level 3
  {
    id: "3.1", level: 3, lab: 1,
    title: "The pipeline reaches production",
    check: (ctx) => {
      const missingBranches = ["uat", "preprod", "main"].filter((b) => !ctx.hasBranch(b));
      if (missingBranches.length > 0) {
        return miss(`these branches do not exist: ${missingBranches.join(", ")}`, "your fork");
      }
      // Lab 3.1 writes this on the branch the release manager is standing on, and
      // it only reaches main with the first promotion, several labs later. Either
      // branch carrying it means the pipeline was configured.
      const project = [ctx.readOn("main", "config/.sfdx-hardis.yml"), ctx.readOn(DEV, "config/.sfdx-hardis.yml")]
        .filter(Boolean)
        .join("\n");
      if (!/availableTargetBranches:[\s\S]{0,200}preprod/.test(project)) {
        return miss(
          "preprod is not listed under availableTargetBranches, so nobody can start a hotfix",
          "config/.sfdx-hardis.yml"
        );
      }
      const configs = ctx.listOn("main", "config/branches/").concat(ctx.listOn(DEV, "config/branches/"));
      const missing = ["preprod", "main"].filter((b) => !configs.some((f) => f.endsWith(`.sfdx-hardis.${b}.yml`)));
      return missing.length === 0
        ? pass("preprod and main are major branches with their own configuration")
        : miss(`missing branch configuration: ${missing.join(", ")}`, "config/branches/");
    }
  },
  {
    id: "3.2", level: 3, lab: 2,
    title: "CI authentication is wired for the four orgs, and the Level 1 shortcut is gone",
    check: (ctx) => {
      const branches = ["integration", "uat", "preprod", "main"];
      const notConfigured = [];
      for (const b of branches) {
        // Whichever branch carries the configured file counts: the release
        // manager writes it where they stand, and it reaches main with the
        // first promotion, several labs later.
        const cfg = [ctx.readOn(DEV, `config/branches/.sfdx-hardis.${b}.yml`), ctx.readOn("main", `config/branches/.sfdx-hardis.${b}.yml`)]
          .filter(Boolean)
          .find((text) => /targetUsername:\s*["']?[^"'\s]/.test(text) && /instanceUrl:\s*["']?https/.test(text)) || "";
        const hasUser = /targetUsername:\s*["']?[^"'\s]/.test(cfg);
        const hasUrl = /instanceUrl:\s*["']?https/.test(cfg);
        if (!hasUser || !hasUrl) {
          notConfigured.push(b);
        }
      }
      if (notConfigured.length > 0) {
        return miss(
          `targetUsername or instanceUrl is missing for: ${notConfigured.join(", ")}`,
          "config/branches/. sf hardis:project:configure:auth writes both"
        );
      }
      const notes = pipelineNotes(ctx);
      return mentions(notes, "SFDX_AUTH_URL_INTEGRATION")
        ? pass("The four orgs are configured, and the Level 1 shortcut is accounted for")
        : miss(
          "MY-PIPELINE.md does not record that the SFDX_AUTH_URL_INTEGRATION secret was deleted",
          "MY-PIPELINE.md. Lab 3.2 ends by deleting it and writing down why"
        );
    }
  },
  {
    id: "3.3", level: 3, lab: 3,
    title: "Marco's US-018 was reviewed and merged into integration",
    check: (ctx) => {
      const history = ctx.log(DEV);
      if (!mentions(history, "US-018")) {
        return miss("no trace of US-018 in the integration history", `branch ${DEV}`);
      }
      const flows = ctx.listOn(DEV, "force-app/main/default/flows/");
      const assign = flows.find((f) => /Assign_Crew/i.test(f));
      const flow = assign ? ctx.readOn(DEV, assign) || "" : "";
      return /cap|maximum|too large/i.test(flow)
        ? pass("US-018 is merged and its cap is in the flow")
        : miss("the US-018 crew cap is not in Installation_Assign_Crew", `${assign || "the flow folder"} on branch ${DEV}`);
    }
  },
  {
    id: "3.4", level: 3, lab: 4, auditable: false,
    title: "The integration deployment was read, not just watched",
    check: (ctx) => {
      const notes = pipelineNotes(ctx);
      return mentions(notes, "smart deploy") || mentions(notes, "delta")
        ? pass("The deployment reading is recorded in MY-PIPELINE.md")
        : miss("no note about what Smart Deploy sent and skipped", "MY-PIPELINE.md");
    }
  },
  {
    id: "3.5", level: 3, lab: 5,
    title: "The colliding Pull Requests were ordered, and both grants survived",
    check: (ctx) => {
      // US-020 is deliberately NOT checked here: Lab 3.5 sends it back to its author
      // and no lab ever merges it. Requiring it would make this check unpassable.
      const history = ctx.log(DEV);
      const missing = ["US-018", "US-019"].filter((id) => !mentions(history, id));
      if (missing.length > 0) {
        return miss(`these stories never reached integration: ${missing.join(", ")}`, `the history of ${DEV}`);
      }
      const manager = ctx.readOn(DEV, PERMSET("Helios_Delivery_Manager")) || "";
      if (/<{7}|>{7}|={7}/.test(manager)) {
        return miss("Helios_Delivery_Manager still contains conflict markers", `${PERMSET("Helios_Delivery_Manager")} on branch ${DEV}`);
      }
      const lostGrants = ["Crew_Capacity_Cap__c", "Quote_Pdf_Url__c"].filter((f) => !manager.includes(f));
      return lostGrants.length === 0
        ? pass("Both stories are merged and Helios_Delivery_Manager carries both grants")
        : miss(
          `Helios_Delivery_Manager lost these grants: ${lostGrants.join(", ")}`,
          `${PERMSET("Helios_Delivery_Manager")} on branch ${DEV}`
        );
    }
  },
  {
    id: "3.6", level: 3, lab: 6,
    title: "Integration was promoted to UAT",
    check: (ctx) => {
      if (!ctx.hasBranch("uat")) {
        return miss("there is no uat branch", "your fork");
      }
      const field = ctx.readOn("uat", FIELD("Installation__c", "Panels_Required__c"));
      return field
        ? pass("The work reached uat")
        : miss(
          "uat does not carry the Level 1 and Level 2 work, so integration was never promoted into it",
          `${FIELD("Installation__c", "Panels_Required__c")} on branch uat`
        );
    }
  },
  {
    id: "3.7", level: 3, lab: 7,
    title: "UAT was released to production, and the DORA report was read",
    check: (ctx) => {
      if (!ctx.hasBranch("main")) {
        return miss("there is no main branch", "your fork");
      }
      const field = ctx.readOn("main", FIELD("Installation__c", "Panels_Required__c"));
      if (!field) {
        return miss(
          "main does not carry the work, so uat was never released into it",
          `${FIELD("Installation__c", "Panels_Required__c")} on branch main`
        );
      }
      const notes = pipelineNotes(ctx);
      return mentions(notes, "dora") || mentions(notes, "lead time") || mentions(notes, "deployment frequency")
        ? pass("Production has the work, and the DORA reading is recorded")
        : miss("MY-PIPELINE.md records no DORA numbers", "MY-PIPELINE.md");
    }
  },
  {
    id: "3.8", level: 3, lab: 8,
    title: "The hotfix shipped and the admin change was retrofitted",
    // Right after the lab the retrofit is on integration, and reaches main with the
    // next release, in the capstone. That is the lab done right, so it passes now.
    now: (ctx) => firstPassing(
      () => ruleCheck("3.8")(ctx),
      () => {
        const status = ctx.readOn(DEV, FIELD("Installation__c", "Status__c")) || "";
        if (!/Needs_Reinspection|Needs Reinspection/i.test(status)) {
          return miss(
            "the picklist value an admin added by hand in production is not in the sources",
            `${FIELD("Installation__c", "Status__c")} on branch ${DEV}, expected a "Needs Reinspection" value`
          );
        }
        const hotfix = ["main", "preprod"].some((b) => isHotfix(ctx.log(b)));
        return hotfix
          ? pass("The hotfix reached production, and the retrofit is on integration, waiting for the next release")
          : miss("no hotfix in the history of preprod or main", "the history of branches preprod and main");
      }
    ),
    check: (ctx) => {
      const status = ctx.readOn("main", FIELD("Installation__c", "Status__c")) || "";
      const hasRetrofit = /Needs_Reinspection|Needs Reinspection/i.test(status);
      if (!hasRetrofit) {
        return miss(
          "the picklist value an admin added by hand in production is not in the sources, so the retrofit never happened",
          `${FIELD("Installation__c", "Status__c")} on branch main, expected a "Needs Reinspection" value`
        );
      }
      const history = ctx.log("main");
      return isHotfix(history)
        ? pass("The hotfix and the retrofit are both on main")
        : miss("no hotfix in the history of main", "the history of branch main");
    }
  },
  {
    id: "3.9", level: 3, lab: 9,
    title: "Production is under monitoring",
    check: (ctx) => {
      const notes = pipelineNotes(ctx);
      const url = notes.match(/https:\/\/github\.com\/[^\s)]+monitoring[^\s)]*/i);
      return url
        ? pass(`Monitoring repository recorded: ${url[0]}`)
        : miss(
          "MY-PIPELINE.md does not record the URL of the monitoring repository",
          "MY-PIPELINE.md. sf hardis:org:configure:monitoring creates a second repository, and Lab 3.9 asks you to write its URL down"
        );
    }
  },
  {
    id: "3.10", level: 3, lab: 10,
    title: "The project documentation is generated and committed",
    check: (ctx) => {
      const docs = ctx.listOn(DEV, "docs/").concat(ctx.listOn("main", "docs/"));
      const objectPages = docs.filter((f) => /Installation__c|Panel_Batch__c/i.test(f));
      return objectPages.length > 0
        ? pass(`${objectPages.length} generated documentation page(s) found`)
        : miss(
          "no generated object documentation was found",
          "docs/ on integration or main. sf hardis:doc:project2markdown writes it there"
        );
    }
  },
  {
    id: "3.11", level: 3, lab: 11,
    title: "Capstone: a full release cycle",
    check: (ctx) => {
      const notes = pipelineNotes(ctx);
      const hasRelease = /release notes/i.test(notes);
      const mainHasWork = Boolean(ctx.readOn("main", FIELD("Installation__c", "Crew_Notes__c")));
      if (!mainHasWork) {
        return miss(
          "the capstone release never reached main",
          `${FIELD("Installation__c", "Crew_Notes__c")} on branch main`
        );
      }
      return hasRelease
        ? pass("The cycle ran end to end and the release notes are recorded")
        : miss("MY-PIPELINE.md does not link the release notes you published", "MY-PIPELINE.md");
    }
  }
];

export function rulesForLevel(level) {
  return RULES.filter((r) => r.level === level);
}

export function findRule(level, lab) {
  return RULES.find((r) => r.level === level && r.lab === lab);
}
