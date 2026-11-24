/**
 * node --test scripts/verify/evidence.test.mjs
 *
 * The repositories below are made up, in the shape readEvidence() returns. What
 * they hold is what real forks showed: a fork with every lab merged and checked,
 * a fork assembled by hand with no Pull Request at all, a deployment workflow
 * rewritten on the fork, and the US-020 Pull Request Lab 3.4 leaves open.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { DEPLOYMENT_WORKFLOWS, evidenceChecks, isEvidenceExempt, levelHasPullRequests } from "./evidence.mjs";

const [CHECK, PROCESS] = DEPLOYMENT_WORKFLOWS;
const SHIPPED_BLOB = "30b6abd5";
const shipped = new Map([[CHECK, new Set([SHIPPED_BLOB])], [PROCESS, new Set(["35459404"])]]);

const commit = (conclusion, { blob = SHIPPED_BLOB, path = CHECK } = {}) => ({
  oid: "abc",
  workflows: { [CHECK]: blob, [PROCESS]: "35459404" },
  runs: conclusion ? [{ path, conclusion }] : []
});
const pr = (number, head, base, { merged = true, commits = [commit("SUCCESS")], opened = "09:00", at = "10:00" } = {}) => ({
  number, head, base, createdAt: `2026-11-01T${opened}:00Z`, mergedAt: merged ? `2026-11-01T${at}:00Z` : null, commits
});

/** One merged and checked Pull Request per lab of Level 1. */
const level1 = [pr(1, "features/US-014-panels-required", "integration"), pr(2, "features/US-016-crew-notes", "integration")];

test("a fork whose labs all ended with a checked Pull Request passes", () => {
  const results = evidenceChecks({ pullRequests: level1 }, [1], shipped);
  assert.deepEqual(results.map((r) => [r.rule.id, r.ok]), [["1.3-1.6", true], ["1.7", true], ["1.time", true]]);
});

test("a fork with no Pull Request fails every lab, and names the branch looked for", () => {
  const results = evidenceChecks({ pullRequests: [] }, [1], shipped);
  assert.equal(results.every((r) => !r.ok), true);
  assert.match(results[0].detail, /a branch named after `US-014`/);
  assert.match(results[0].where, /Pull Requests of your fork/);
});

test("a story branch counts whatever its prefix, or without one", () => {
  const prs = [pr(1, "US-014-panels-required", "integration"), pr(2, "feature/US-016-crew-notes", "integration")];
  assert.equal(evidenceChecks({ pullRequests: prs }, [1], shipped).every((r) => r.ok), true);
});

test("a level with no Pull Request at all is one the learner joined above, by a reset", () => {
  assert.equal(levelHasPullRequests({ pullRequests: level1 }, 1), true);
  assert.equal(levelHasPullRequests({ pullRequests: level1 }, 2), false);
  const open = [pr(9, "features/US-021-x", "integration", { merged: false })];
  assert.equal(levelHasPullRequests({ pullRequests: open }, 2), true);
});

test("a Pull Request merged without a successful deployment check does not count", () => {
  const prs = [pr(1, "features/US-014-x", "integration", { commits: [commit(null), commit("FAILURE")] }), level1[1]];
  const [first] = evidenceChecks({ pullRequests: prs }, [1], shipped);
  assert.equal(first.ok, false);
  assert.match(first.detail, /#1 .* was merged, but no deployment workflow/);
});

test("a deployment workflow rewritten on the fork does not count", () => {
  const prs = [pr(1, "features/US-014-x", "integration", { commits: [commit("SUCCESS", { blob: "f00dbabe" })] }), level1[1]];
  assert.equal(evidenceChecks({ pullRequests: prs }, [1], shipped)[0].ok, false);
});

test("a workflow of another file that calls itself a deployment does not count", () => {
  const prs = [pr(1, "features/US-014-x", "integration", { commits: [commit("SUCCESS", { path: ".github/workflows/fake.yml" })] }), level1[1]];
  assert.equal(evidenceChecks({ pullRequests: prs }, [1], shipped)[0].ok, false);
});

test("an open Pull Request does not end a lab that merges", () => {
  const prs = [pr(1, "features/US-014-x", "integration", { merged: false }), pr(2, "features/US-016-x", "integration", { merged: false })];
  const results = evidenceChecks({ pullRequests: prs }, [1], shipped);
  assert.equal(results.every((r) => !r.ok), true);
  assert.match(results[0].detail, /no merged Pull Request/);
});

/** One merged and checked Pull Request per lab of Level 2, an hour apart. */
const level2 = ["021", "024", "026", "027", "033", "034", "038", "041"]
  .map((story, index) => pr(10 + index, `features/US-${story}-x`, "integration", { opened: `1${index}:00`, at: `1${index}:50` }));

test("one lab of a level without its own Pull Request is forgiven when every other lab has one", () => {
  const prs = level2.filter((one) => !one.head.includes("US-034"));
  const results = evidenceChecks({ pullRequests: prs }, [2], shipped);
  assert.equal(results.every((r) => r.ok), true);
  assert.match(results.find((r) => r.rule.id === "2.7").detail, /accepted, because every other lab of Level 2/);
});

test("two labs without a Pull Request are not forgiven", () => {
  const prs = level2.filter((one) => !one.head.includes("US-034") && !one.head.includes("US-038"));
  const results = evidenceChecks({ pullRequests: prs }, [2], shipped);
  assert.deepEqual(results.filter((r) => !r.ok).map((r) => r.rule.id), ["2.7", "2.8"]);
});

test("a Pull Request merged without its deployment check is never forgiven", () => {
  const prs = level2.map((one) => (one.head.includes("US-034") ? { ...one, commits: [commit(null)] } : one));
  assert.equal(evidenceChecks({ pullRequests: prs }, [2], shipped).find((r) => r.rule.id === "2.7").ok, false);
});

test("a level faster than its deployment checks fails, and one at the pace of real work passes", () => {
  const rushed = level2.map((one, index) => ({ ...one, createdAt: "2026-11-01T10:00:00Z", mergedAt: `2026-11-01T10:${String(10 + index).padStart(2, "0")}:00Z` }));
  const time = (prs) => evidenceChecks({ pullRequests: prs }, [2], shipped).find((r) => r.rule.id === "2.time");
  assert.equal(time(rushed).ok, false);
  assert.match(time(rushed).detail, /17 minutes/);
  assert.equal(time(level2).ok, true);
});

test("a level with a single lab merged has no time check", () => {
  assert.equal(evidenceChecks({ pullRequests: [level1[0]] }, [1], shipped).some((r) => r.rule.id === "1.time"), false);
});

test("Lab 3.4 passes on the US-020 Pull Request left open with its check failing", () => {
  const prs = [pr(28, "training/mate-us-020-apex-refactor", "integration", { merged: false, commits: [commit("FAILURE")] })];
  const lab = evidenceChecks({ pullRequests: prs }, [3], shipped).find((r) => r.rule.id === "3.4");
  assert.equal(lab.ok, true);
});

test("Lab 3.4 fails when the deployment check never ran on US-020", () => {
  const prs = [pr(28, "training/mate-us-020-apex-refactor", "integration", { merged: false, commits: [commit(null)] })];
  const lab = evidenceChecks({ pullRequests: prs }, [3], shipped).find((r) => r.rule.id === "3.4");
  assert.equal(lab.ok, false);
  assert.match(lab.detail, /#28 never ran Simulate Deployment/);
});

test("only the levels asked are checked", () => {
  assert.equal(evidenceChecks({ pullRequests: [] }, [], shipped).length, 0);
  assert.equal(evidenceChecks({ pullRequests: [] }, [2], shipped).every((r) => r.level === 2), true);
});

test("only the end to end test account is exempt, whatever its case", () => {
  assert.equal(isEvidenceExempt("nvuillam"), true);
  assert.equal(isEvidenceExempt("NVuillam"), true);
  assert.equal(isEvidenceExempt("nvuillamy"), false);
  assert.equal(isEvidenceExempt(""), false);
});
