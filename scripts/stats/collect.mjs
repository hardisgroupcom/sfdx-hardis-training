/**
 * What the course statistics read from GitHub: the forks of the course, the
 * badge claims, and the history of each learner repository.
 *
 * Everything read here is public. One GraphQL query per repository brings its
 * branches, its Pull Requests with their commits and comments, and the history
 * of integration, so a run costs about one call per learner and stays far
 * under what the token of a workflow is allowed.
 */
import { spawnSync } from "child_process";

const API = "https://api.github.com";

/** The token of the workflow, or the one the GitHub CLI holds on a workstation. */
export function githubToken() {
  const fromEnv = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  if (fromEnv) {
    return fromEnv;
  }
  const cli = spawnSync("gh", ["auth", "token"], { encoding: "utf8" });
  const token = cli.status === 0 ? cli.stdout.trim() : "";
  if (!token) {
    throw new Error("No GitHub token. Set GH_TOKEN, or sign in with: gh auth login");
  }
  return token;
}

async function request(token, url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${token}`,
      "user-agent": "sfdx-hardis-training-course-stats",
      "x-github-api-version": "2022-11-28",
      ...(options.headers || {})
    }
  });
  if (!response.ok) {
    throw new Error(`${options.method || "GET"} ${url} answered ${response.status}: ${(await response.text()).slice(0, 300)}`);
  }
  return response.json();
}

/** Every page of a REST list. */
async function paginate(token, path) {
  const out = [];
  for (let page = 1; ; page++) {
    const rows = await request(token, `${API}${path}${path.includes("?") ? "&" : "?"}per_page=100&page=${page}`);
    out.push(...rows);
    if (rows.length < 100) {
      return out;
    }
  }
}

/** The forks of the course, as { owner, name }. */
export async function listForks(token, upstream) {
  const forks = await paginate(token, `/repos/${upstream}/forks`);
  return forks.map((fork) => ({ owner: fork.owner.login, name: fork.name }));
}

/** "https://github.com/someone/their-repo.git" as { owner, name }, or null. */
export function parseRepositoryUrl(url) {
  const match = String(url || "").match(/github\.com[/:]([A-Za-z0-9-]+)\/([A-Za-z0-9._-]+?)(?:\.git)?(?:[/\s?#]|$)/i);
  return match ? { owner: match[1], name: match[2] } : null;
}

/**
 * The badge claims: who opened each one, the repository it names, its receipt
 * lines, and whether the audit sent it back.
 */
export async function listClaims(token, upstream) {
  const issues = await paginate(token, `/repos/${upstream}/issues?state=all&labels=badge-claim`);
  return issues
    .filter((issue) => !issue.pull_request)
    .map((issue) => {
      const body = issue.body || "";
      const section = (heading) => {
        const match = body.match(new RegExp(`###\\s+${heading}\\s*\\n([\\s\\S]*?)(?=\\n###\\s|$)`, "i"));
        return match ? match[1].trim() : "";
      };
      return {
        number: issue.number,
        author: issue.user ? issue.user.login : null,
        level: Number((section("Level").match(/\d/) || [])[0]) || null,
        repository: parseRepositoryUrl(section("Public repository URL")),
        receipts: section("Receipts"),
        needsWork: (issue.labels || []).some((label) => label.name === "needs-work")
      };
    });
}

const REPOSITORY_QUERY = `
query ($owner: String!, $name: String!) {
  repository(owner: $owner, name: $name) {
    createdAt
    pushedAt
    isFork
    refs(refPrefix: "refs/heads/", first: 100) { nodes { name } }
    pullRequests(first: 100, orderBy: { field: CREATED_AT, direction: ASC }) {
      nodes {
        number
        headRefName
        baseRefName
        createdAt
        mergedAt
        commits(first: 100) { nodes { commit { committedDate } } }
        comments(first: 50) { nodes { createdAt } }
      }
    }
    integration: ref(qualifiedName: "refs/heads/integration") {
      target {
        ... on Commit {
          history(first: 100) {
            nodes { committedDate messageHeadline author { user { login } } }
          }
        }
      }
    }
  }
}`;

/**
 * One learner repository, in the shape compute.mjs reads. Null when it is
 * gone or went private: the learner keeps their badge, and leaves the figures.
 */
export async function readRepository(token, { owner, name }) {
  const answer = await request(token, `${API}/graphql`, {
    method: "POST",
    body: JSON.stringify({ query: REPOSITORY_QUERY, variables: { owner, name } })
  });
  const repository = answer.data && answer.data.repository;
  if (!repository) {
    return null;
  }
  const history = repository.integration && repository.integration.target && repository.integration.target.history;
  return {
    owner,
    name,
    createdAt: repository.createdAt,
    pushedAt: repository.pushedAt,
    isFork: repository.isFork,
    branches: repository.refs.nodes.map((ref) => ref.name),
    pullRequests: repository.pullRequests.nodes.map((pr) => ({
      number: pr.number,
      head: pr.headRefName,
      base: pr.baseRefName,
      createdAt: pr.createdAt,
      mergedAt: pr.mergedAt,
      commitDates: pr.commits.nodes.map((node) => node.commit.committedDate),
      commentDates: pr.comments.nodes.map((node) => node.createdAt)
    })),
    commits: (history ? history.nodes : []).map((node) => ({
      date: node.committedDate,
      message: node.messageHeadline,
      author: node.author && node.author.user ? node.author.user.login : null
    }))
  };
}
