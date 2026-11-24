/**
 * What GitHub, rather than the files, says about a learner's repository: the
 * Pull Request each lab ends with, and the deployment that ran on it.
 *
 * The rules of rules.mjs read the files a level leaves behind, and every one of
 * those files is in this repository: the start states and the simulated
 * teammates carry them. A repository assembled from them, with no org behind it
 * and no Pull Request in it, passed every rule. What cannot be copied is the
 * trace the work leaves on GitHub: each lab ends with a Pull Request merged into
 * a branch of the pipeline, and each Pull Request runs the deployment simulation
 * against the learner's own org.
 *
 * So for each lab the course statistics already time (scripts/stats/markers.mjs),
 * the audit looks for:
 *   - a merged Pull Request between the branches the lab names
 *   - on one of its commits, a successful run of a deployment workflow the course
 *     ships (check-deploy.yml or process-deploy.yml), run from that file, with
 *     the content the course gave it
 *
 * A squash, a rebase or a merge commit all count: the merged Pull Request is the
 * outcome the lab asks for. A learner who merged on their machine and pushed did
 * not do what the lab says, and the failure names the lab and the branch.
 *
 * Read only and public, with the token of the workflow. No org, no secret.
 */
import { graphql } from "../stats/collect.mjs";
import { MEASURED } from "../stats/markers.mjs";

/** The workflows that deploy to the learner's org, as the course ships them. */
export const DEPLOYMENT_WORKFLOWS = [".github/workflows/check-deploy.yml", ".github/workflows/process-deploy.yml"];

/**
 * The accounts allowed to pass a level without this evidence: the account the end
 * to end tests of the course run under. Nobody else.
 */
export const EVIDENCE_EXEMPT_HANDLES = ["nvuillam"];

/**
 * The labs that end with a Pull Request left open on purpose. Lab 3.4 sends
 * US-020 back to its author with its checks failing: the evidence is that the
 * deployment check ran on it against the learner's org, whatever it concluded.
 */
const LEFT_OPEN = new Set(["3.4"]);

/**
 * The fewest wall-clock minutes a level can take, from the first Pull Request of
 * its labs to the last merge of one. Set on 2026-11-24 at about half the fastest
 * learner whose work was real: 8, 83 and 165 minutes. The end to end tests of the
 * course, with real orgs and real checks, took 19, 201 and 206. A level faster than
 * this did not wait for its own deployment checks: it was scripted.
 */
export const MIN_LEVEL_MINUTES = { 1: 5, 2: 40, 3: 80 };

/** The most Pull Requests read for one repository. */
const MAX_PULL_REQUESTS = 500;

/**
 * Whether a handle is exempt from the evidence of GitHub. Case-insensitive, like
 * GitHub handles.
 */
export function isEvidenceExempt(handle) {
  return EVIDENCE_EXEMPT_HANDLES.some((one) => one.toLowerCase() === String(handle || "").toLowerCase());
}

/**
 * The checks of the evidence, one per measured segment of the levels given.
 * Pure: everything it reads was fetched by readEvidence() and shippedWorkflows().
 * Results have the shape auditRepository() gives its own: { level, rule: { id, title }, ok, detail, where }.
 */
export function evidenceChecks(evidence, levels, shipped) {
  const results = [];
  for (const level of levels) {
    const labs = MEASURED
      .filter((segment) => segment.level === level && segment.end.kind === "pullRequest")
      .map((segment) => labCheck(segment, evidence, shipped));
    results.push(...forgiveOneMissingLab(labs));
    results.push(levelTimeCheck(evidence, level));
  }
  return results.filter(Boolean).map(({ missing, ...result }) => result);
}

/**
 * Whether any lab of a level left a Pull Request in the repository, merged or
 * not. None at all is what a learner who joined at a later level leaves: Reset
 * this level moves integration to the start state and keeps no branch that says
 * so, and the audit accepts the files of a reset.
 */
export function levelHasPullRequests(evidence, level) {
  return MEASURED.some((segment) =>
    segment.level === level &&
    segment.end.kind === "pullRequest" &&
    evidence.pullRequests.some((pr) => matches(segment.end, pr)));
}

/**
 * The Pull Requests of a learner repository, with the deployment runs and the
 * content of the deployment workflows on each of their commits. Null when the
 * repository is gone or private.
 */
export async function readEvidence(token, { owner, name }) {
  const pullRequests = [];
  let after = null;
  for (;;) {
    const { repository } = await graphql(token, PULL_REQUESTS_QUERY, { owner, name, after });
    if (!repository) {
      return null;
    }
    const page = repository.pullRequests;
    pullRequests.push(...page.nodes.map(toPullRequest));
    if (!page.pageInfo.hasNextPage || pullRequests.length >= MAX_PULL_REQUESTS) {
      break;
    }
    after = page.pageInfo.endCursor;
  }
  return { owner, name, pullRequests };
}

/**
 * Every content the course ever shipped for each deployment workflow, as blob ids
 * by path: a learner who took their fork before a change of the workflow ran the
 * version of that time, and it counts.
 */
export async function shippedWorkflows(token, upstream) {
  const [owner, name] = upstream.split("/");
  const shipped = new Map();
  for (const file of DEPLOYMENT_WORKFLOWS) {
    const { repository } = await graphql(token, SHIPPED_QUERY, { owner, name, path: file });
    const history = repository && repository.defaultBranchRef && repository.defaultBranchRef.target.history;
    shipped.set(file, new Set((history ? history.nodes : []).map((node) => node.file && node.file.oid).filter(Boolean)));
  }
  return shipped;
}

// ------------------------------------------------------------------ private

const PULL_REQUESTS_QUERY = `
query ($owner: String!, $name: String!, $after: String) {
  repository(owner: $owner, name: $name) {
    pullRequests(first: 50, after: $after, orderBy: { field: CREATED_AT, direction: ASC }) {
      pageInfo { hasNextPage endCursor }
      nodes {
        number
        headRefName
        baseRefName
        createdAt
        mergedAt
        commits(last: 20) {
          nodes {
            commit {
              oid
              checkDeploy: file(path: "${DEPLOYMENT_WORKFLOWS[0]}") { oid }
              processDeploy: file(path: "${DEPLOYMENT_WORKFLOWS[1]}") { oid }
              checkSuites(first: 20) { nodes { conclusion workflowRun { file { path } } } }
            }
          }
        }
      }
    }
  }
}`;

const SHIPPED_QUERY = `
query ($owner: String!, $name: String!, $path: String!) {
  repository(owner: $owner, name: $name) {
    defaultBranchRef {
      target {
        ... on Commit {
          history(first: 100, path: $path) { nodes { file(path: $path) { oid } } }
        }
      }
    }
  }
}`;

function toPullRequest(node) {
  return {
    number: node.number,
    head: node.headRefName,
    base: node.baseRefName,
    createdAt: node.createdAt,
    mergedAt: node.mergedAt,
    commits: node.commits.nodes.map(({ commit }) => ({
      oid: commit.oid,
      workflows: {
        [DEPLOYMENT_WORKFLOWS[0]]: commit.checkDeploy ? commit.checkDeploy.oid : null,
        [DEPLOYMENT_WORKFLOWS[1]]: commit.processDeploy ? commit.processDeploy.oid : null
      },
      runs: commit.checkSuites.nodes
        .filter((suite) => suite.workflowRun && suite.workflowRun.file)
        .map((suite) => ({ path: suite.workflowRun.file.path, conclusion: suite.conclusion }))
    }))
  };
}

/**
 * One lab: a merged Pull Request between its branches, checked against the org.
 * `missing` marks a lab with no Pull Request of its own, which the level may
 * forgive once.
 */
function labCheck(segment, evidence, shipped) {
  const marker = segment.end;
  const rule = { id: segmentId(segment), title: `${labsText(segment)} ended with a merged Pull Request, checked against your org` };
  if (LEFT_OPEN.has(rule.id)) {
    return leftOpenCheck(segment, rule, evidence, shipped);
  }
  const merged = evidence.pullRequests.filter((pr) => pr.mergedAt && matches(marker, pr));
  if (merged.length === 0) {
    return {
      level: segment.level,
      rule,
      ok: false,
      missing: true,
      detail: `no merged Pull Request from ${branchText(marker.head)}${marker.base ? ` into ${marker.base}` : ""}`,
      where: "the Pull Requests of your fork. Each lab ends with one: create it from VS Code, and merge it on GitHub once its checks pass"
    };
  }
  const deployed = merged.find((pr) => deployedOn(pr, shipped, ["SUCCESS"]));
  if (deployed) {
    return { level: segment.level, rule, ok: true, detail: `Pull Request #${deployed.number} was merged after a successful deployment check` };
  }
  const last = merged[merged.length - 1];
  return {
    level: segment.level,
    rule,
    ok: false,
    detail: `Pull Request #${last.number} (${last.head} into ${last.base}) was merged, but no deployment workflow of the course ran successfully on it. Simulate Deployment (sfdx-hardis) checks every Pull Request against your org`,
    where: `the Checks tab of Pull Request #${last.number} in your fork. GitHub Actions has to be enabled on your fork, with the org secrets the labs set`
  };
}

/**
 * One lab of a level may have no Pull Request of its own, when every other lab of
 * the level has a checked one. Real learners deliver two stories in one Pull
 * Request (the capstone of Level 1 inside a second US-014), or carry the
 * conflict of Lab 2.7 in the next story: the files rules still check the outcome.
 * A Pull Request merged without its deployment check is never forgiven.
 */
function forgiveOneMissingLab(labs) {
  const failed = labs.filter((lab) => !lab.ok);
  if (failed.length !== 1 || !failed[0].missing || labs.length < 2) {
    return labs;
  }
  return labs.map((lab) => (lab === failed[0]
    ? { ...lab, ok: true, detail: `${lab.detail}: accepted, because every other lab of Level ${lab.level} has its own checked Pull Request` }
    : lab));
}

/**
 * The level was not faster than MIN_LEVEL_MINUTES, from the first Pull Request of
 * its labs to the last merge. Null, so no check, when fewer than two of its labs
 * were merged here: one lab has no span.
 */
function levelTimeCheck(evidence, level) {
  const ofLevel = MEASURED.filter((segment) => segment.level === level && segment.end.kind === "pullRequest");
  const prs = evidence.pullRequests.filter((pr) => ofLevel.some((segment) => matches(segment.end, pr)));
  const merged = prs.filter((pr) => pr.mergedAt);
  const labsMerged = ofLevel.filter((segment) => merged.some((pr) => matches(segment.end, pr))).length;
  if (labsMerged < 2) {
    return null;
  }
  const minutes = Math.round((Math.max(...merged.map((pr) => Date.parse(pr.mergedAt))) - Math.min(...prs.map((pr) => Date.parse(pr.createdAt)))) / 60000);
  const floor = MIN_LEVEL_MINUTES[level];
  const rule = { id: `${level}.time`, title: `Level ${level} took the time its deployment checks take` };
  return minutes >= floor
    ? { level, rule, ok: true, detail: `${minutes} minutes from the first Pull Request of the level to its last merge` }
    : {
      level,
      rule,
      ok: false,
      detail: `${minutes} minutes from the first Pull Request of Level ${level} to its last merge, where the deployment checks of its labs alone take at least ${floor}`,
      where: "the Pull Requests of your fork. If you really went this fast, open an issue saying so and it will be looked at"
    };
}

/** Lab 3.4: the Pull Request is there, and the deployment check ran on it. */
function leftOpenCheck(segment, rule, evidence, shipped) {
  const opened = evidence.pullRequests.filter((pr) => matches(segment.end, pr));
  const checked = opened.find((pr) => deployedOn(pr, shipped, ["SUCCESS", "FAILURE"]));
  if (checked) {
    return { level: segment.level, rule: { ...rule, title: `${labsText(segment)}: the Pull Request was received and checked against your org` }, ok: true, detail: `Pull Request #${checked.number} ran its deployment check` };
  }
  return {
    level: segment.level,
    rule: { ...rule, title: `${labsText(segment)}: the Pull Request was received and checked against your org` },
    ok: false,
    missing: opened.length === 0,
    detail: opened.length === 0
      ? `no Pull Request from ${branchText(segment.end.head)}`
      : `Pull Request #${opened[0].number} never ran Simulate Deployment (sfdx-hardis) against your org`,
    where: opened.length === 0
      ? "the Pull Requests of your fork. Simulate my teammates opens it for you"
      : `the Checks tab of Pull Request #${opened[0].number} in your fork. GitHub Actions has to be enabled on your fork, with the org secrets the labs set`
  };
}

function matches(marker, pr) {
  return marker.head.test(pr.head) && (!marker.base || pr.base === marker.base);
}

/**
 * A finished run of a deployment workflow on one of the commits, with one of
 * the conclusions given, from the file
 * the course shipped. A workflow renamed, emptied or rewritten on the fork has
 * another blob id, and does not count.
 */
function deployedOn(pr, shipped, conclusions) {
  return pr.commits.some((commit) =>
    commit.runs.some((run) =>
      conclusions.includes(run.conclusion) &&
      DEPLOYMENT_WORKFLOWS.includes(run.path) &&
      shipped.has(run.path) &&
      shipped.get(run.path).has(commit.workflows[run.path])));
}

/** "1.3-1.6" for a segment of several labs, "2.3" for one. */
function segmentId(segment) {
  return segment.labs.length > 1 ? `${segment.labs[0]}-${segment.labs[segment.labs.length - 1]}` : segment.labs[0];
}

function labsText(segment) {
  return segment.labs.length > 1 ? `Labs ${segment.labs[0]} to ${segment.labs[segment.labs.length - 1]}` : `Lab ${segment.labs[0]}`;
}

/** A marker pattern as a learner reads a branch name: /^features\/US-024/i is "a branch starting with features/US-024". */
function branchText(pattern) {
  const source = pattern.source.replace(/\\\//g, "/");
  if (source === "." || source === "") {
    return "any branch";
  }
  const exact = source.match(/^\^([^$]*)\$$/);
  if (exact) {
    return `\`${exact[1]}\``;
  }
  const named = source.match(/^\(\^\|\/\)(.*)$/);
  if (named) {
    return `a branch named after \`${named[1]}\``;
  }
  return `a branch starting with \`${source.replace(/^\^/, "")}\``;
}
