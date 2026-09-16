---
id: l3-lab-06-production
level: 3
lab: 6
lang: en
source_rev: ""
screenshots:
  - vscode/devops-pipeline
depends_on:
  commands: [hardis:doc:dora-report, hardis:project:deploy:smart]
  flags: []
  config: [productionBranch, mergeTargets]
  panels: [pipeline]
  docs: [salesforce-devops-deploy-major-branches]
---

# Lab 6 - Ship to production and read your DORA metrics

**Level**: 3 Release Manager
**Time**: ~50 min
**You will**: release to production, and then measure whether your pipeline is any good.

## The situation

UAT signed off. The release goes to production this evening.

This is the same mechanism as Lab 5, with one difference that is not technical: if you get it wrong,
real people cannot do their jobs tomorrow. Everything in this lab that looks like ceremony is there
because somebody skipped it once.

## Before you start

- [ ] Lab 5 finished: `uat` carries the release and the testers signed it off
- [ ] `helios-prod` connected, seeded and configured as the `main` org
- [ ] JWT authentication working for `main`

## Steps

### 1. Check the three things that are worth checking

Before creating anything:

**One: is UAT genuinely signed off?** Not "the deployment was green". Somebody tested it and said
yes. On this project that person is you, and you did it in Lab 5 step 5.

**Two: what manual steps will this carry?** Look at the deployment actions of the stories going out.
A manual step in production is something you will do, live, in front of nobody, at whatever time the
release is. Know about it now.

**Three: is production where you think it is?** Open `helios-prod` and look. It is seeded one
version behind, and Lab 7 is about an admin who changed something there by hand. Assume nothing.

### 2. Create the production Pull Request

From the **DevOps Pipeline** panel, the `uat` column, create the Pull Request into `main`.

Title it plainly:

> Release 2026-09-3 to production

### 3. Read the check like it matters

When the check finishes, read the sfdx-hardis comment the way Lab 2 taught, and add two questions
that only apply to production:

| Question                     | Where to look                                                                                                               |
|------------------------------|-----------------------------------------------------------------------------------------------------------------------------|
| **Does it delete anything?** | The destructive changes section. A deletion in production is permanent and takes data with it                               |
| **How long will it take?**   | The check duration is a reasonable estimate. If it is 40 minutes, that is 40 minutes during which the org is being modified |

If the destructive changes section is not empty and you were not expecting it, **stop**. Find out
what it is and who intended it. That is not being careful, that is the job.

### 4. Merge, and stay

Merge. The **Deploy to main** job starts.

Watch it. Not because you can do anything while it runs, but because knowing whether it failed at
minute two or minute thirty-five changes what you do next.

When it finishes, do any manual steps, then check the org.

### 5. Verify in production

Same as UAT, with more care:

- The two stories work
- Something that was already working still works: open an installation, check the timeline
  component, save a record

That last check exists because the most common production incident after a release is not the new
feature failing. It is an old one.

### 6. Now measure the pipeline

You have shipped. The question a release manager gets asked next is "how are we doing", and it
deserves a better answer than a feeling.

In **Commands > CI/CD (misc)**, run **Generate DORA report**, against `helios-prod`.

The four metrics, and what they mean here:

| Metric                    | What it measures                                | What good looks like                                                          |
|---------------------------|-------------------------------------------------|-------------------------------------------------------------------------------|
| **Deployment frequency**  | How often you release to production             | Weekly is fine. Quarterly means every release is enormous and therefore risky |
| **Lead time for changes** | Merge into `integration`, to live in production | Days, not weeks. A long lead time usually means work sits in UAT waiting      |
| **Change failure rate**   | Releases needing a fix afterwards               | Below 15%. Above that, the check is not catching what it should               |
| **Time to restore**       | Incident to fix live                            | Hours. This is the number Lab 7 is about                                      |

The report covers the releases you just made **plus the deployment history seeded into
`helios-prod`**, so there is a curve to read rather than a single point.

### 7. Read the curve, not the number

Look at deployment frequency over time. Helios went from deploying every few weeks to deploying
weekly when the pipeline was finished. That is the story the report tells, and it is the one worth
repeating to whoever asks whether the pipeline was worth it.

Write the four numbers in `MY-PIPELINE.md`:

```markdown
- **Lab 6, DORA**: deployment frequency X per month, lead time Y days, change failure rate Z%,
  time to restore W hours. Frequency is up since the pipeline reached production.
```

<details markdown="1"><summary>Under the hood: where the DORA numbers come from</summary>

The command was:

    sf hardis:doc:dora-report

and every number comes from the git history and the git provider API, not from Salesforce:

- **Deployment frequency**: merges into the production branch, from `productionBranch`
- **Lead time**: for each story, the time between its merge into `developmentBranch` and the merge
  of the release carrying it into `productionBranch`
- **Change failure rate**: releases followed within a short window by a hotfix, recognised by the
  branch naming convention
- **Time to restore**: the interval between such a release and its hotfix reaching production

Which means all four depend on the conventions this pipeline enforces: merge commits rather than
squashes, branch prefixes, and a production branch that is actually declared. A project that does
not follow them gets a report full of zeros, and the report is not wrong.

It also means the numbers are honest in a way a dashboard somebody fills in by hand never is. Nobody
can improve deployment frequency by editing a spreadsheet.

</details>

## What you should see

- `main` carrying the release
- A green **Deploy to main** job
- The stories working in `helios-prod`
- A DORA report with a curve, and its four numbers in `MY-PIPELINE.md`

## If it goes wrong

**The deployment to production fails on a component that worked in UAT.**
Production has drifted, or has something UAT does not: an extra validation rule, a record type, real
data that violates a new constraint. Read the error. This is the single most common production
deployment failure, and it is the argument for keeping the orgs close to each other.

**The deployment half-succeeded.**
Salesforce deployments are atomic per deployment, so this usually means a post-deploy action failed
after a successful deployment. The metadata is in, the action is not. Re-run the action, do not
re-run the deployment.

**The DORA report is empty or all zeros.**
Either the production branch is not declared (`productionBranch` in `config/.sfdx-hardis.yml`), or
the history has no merge commits it can attribute.

## Check your work

Welcome page > **Training** > **Check my work**, then pick level 3 and lab 6.

## Go deeper

- [Deploy to major orgs](https://sfdx-hardis.cloudity.com/salesforce-devops-deploy-major-branches/)
- [DORA Metrics](https://sfdx-hardis.cloudity.com/hardis/doc/salesforce-devops-dora-report/)

[Next: Lab 7 - Production is broken](lab-07-hotfix-retrofit.md){ .md-button .md-button--primary }
