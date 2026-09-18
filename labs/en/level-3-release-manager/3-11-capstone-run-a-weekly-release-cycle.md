---
id: lab-3-11
title: "Lab 3.11 - Capstone: run a weekly release cycle"
description: "Run a full week as a Salesforce release manager with no step-by-step: review, integrate, promote to UAT, release to production and measure."
level: 3
lab: 11
lang: en
source_rev: ""
screenshots:
  - annotated/vscode/pipeline-cards--new-user-story
depends_on:
  commands: [hardis:project:deploy:smart, hardis:doc:release-notes, hardis:doc:dora-report]
  flags: []
  config: [mergeTargets, productionBranch]
  panels: [pipeline]
  docs: [salesforce-devops-release-home, salesforce-devops-setup-checklist]
---

# Lab 3.11 - Capstone: run a weekly release cycle

**Level**: 3 Release Manager

**Time**: ~45 min

**You will**: do a whole week in one sitting, with no step-by-step, and end with something you could
show somebody.

## The situation

Monday morning. Two Pull Requests are waiting, the business expects a release on Thursday, and
nobody is going to tell you the order to do things in.

## Before you start

- [ ] Labs 3.1 to 3.10 finished
- [ ] All four pipeline orgs working, all four branches deploying

## The week

### Monday: take in what contributors sent you

The only teammate Pull Request still in play is **US-020**, open since Lab 3.5 and still failing. The
other two are merged by now, and each scenario is used once: **Simulate my teammates** will replay a
scenario onto a branch that already has its files, report "Nothing to commit" and open nothing.

So build the second Pull Request yourself, the way a contributor would.

![The New User Story card of the DevOps Pipeline panel](../../_assets/annotated/vscode/pipeline-cards--new-user-story.png)

**New User Story** **(2)**, under **Project Contribution Workflow** **(1)**, targeting
`integration`, one small change of your own in `helios-dev`, published and opened. Pick something a
reviewer could reasonably argue with, because in ten minutes you are that reviewer.

For each of the two:

- Read the sfdx-hardis comment
- Read the diff with the four questions from Lab 3.3: does it match the story, does anything
  disappear, are permissions on a permission set, is it reversible
- Merge it or send it back with a comment, and say why

US-020 still fails its check. It stays with its author, with the failure named. Do not fix it
yourself.

### Tuesday: merge and deploy to integration

Merge what is ready, in an order you can justify. Watch the deployment, read what it sent and what
it skipped, and check the org afterwards.

### Wednesday: promote to UAT

Create the promotion from `integration` into `uat`. Read the deployment actions it carries **before**
merging, and do the manual steps afterwards.

Verify in `helios-uat` that the stories are usable, not only deployed.

### Thursday: release to production

Promote `uat` into `preprod` first, and check `helios-preprod` behaves. Then create the promotion from
`preprod` into `main`. Read the counts line in the sfdx-hardis comment and stop if anything is being
deleted that you were not expecting. Merge, watch, verify, do the manual steps.

This release is also what finally carries the Lab 3.8 retrofit into `main`, so the `Needs Reinspection`
picklist value reaches production through the pipeline and the check for Lab 3.8 passes.

Then generate the release notes, add the sentence at the top that says what this release is for, and
put them in the repository through a Pull Request like anything else.

### Friday: measure and write down

Set `helios-prod` as your default org in **Orgs Manager**, so the report measures production rather
than your sandbox, then run the DORA report and compare it with the baseline you took in Lab 3.7.

Update `MY-PIPELINE.md` with:

- What went out this week, with the link to the release notes you generated on Thursday
- What did not, and why
- Anything you had to do by hand, which is a candidate for a deployment action next time

## What makes this the capstone

Nothing here is new. Every step is a lab you have done. What is new is that **nobody told you the
order**, and the order is the job.

Three decisions you had to make without a lab telling you:

1. Which Pull Requests go into this release and which wait
2. Whether the failing one blocks the release
3. Whether the manual steps are acceptable, or whether the release waits until somebody automates
   them

Those three are what a release manager is for. The tooling handles everything else, which is the
point of having it.

## What you should see

- Two Pull Requests reviewed, one merged, one sent back with a reason
- `integration`, `uat`, `preprod` and `main` all carrying the release, in that order, each through
  its own deployment
- Release notes committed, with a human sentence at the top
- A DORA report, and a `MY-PIPELINE.md` that a successor could actually use

## If it goes wrong

**A check fails and names a lab you are sure you did.**
Read what it says it looked for. The checks assert outcomes on the `integration` branch, not effort:
a story built in your org but never merged does not count, and neither does one merged into a branch
that is not `integration`.

**The Lab 3.8 check wants the hotfix on `main`.**
That is check `3.8`, and it looks at `main`, not `integration`. Thursday is what satisfies it: the
release that takes the week's work to production carries the hotfix with it. If you have not run
Thursday yet, run it.

**A teammate simulation says there is nothing to commit.**
That story is already merged. Each teammate story merges once per level, and the ones Level 3 uses
are listed in each lab. Nothing is wrong: move on.

**A deployment is green and the feature is not in the org.**
Open the log and find **Listing Post-deployment actions**. If it says none were defined, the actions
never ran, and Lab 2.4 explains what to do about it. A green job proves the metadata went in
and nothing else.

**The whole thing is too much to finish in one sitting.**
It is meant to be a week. Stop at the end of any day: each one ends with something merged, and
nothing carries an unfinished state into the next.

## Check your work

Welcome page > **Training: Level 3** > **Check my work**, then pick **Everything in level 3**.

Eleven checks.

## Claim your badge

Welcome page > **Training: Level 3** > **Claim my badge**.

A Level 3 claim re-runs the **Level 1 and Level 2 audits first**. That is how the prerequisite is
enforced, because a Trailmix cannot gate anything. The command runs those same audits on your
machine before it opens anything, so you find out here rather than on the issue.

!!! info "It also asks you to star the VS Code extension"
    Level 3 asks you to star
    [hardisgroupcom/vscode-sfdx-hardis](https://github.com/hardisgroupcom/vscode-sfdx-hardis), the
    extension every click of this course went through, on top of the Level 1 and Level 2 stars. The
    command offers to do all three for you, and the audit checks them.

The badge is **sfdx-hardis Release Manager**.

## What to do with all this

Three things worth doing in the week after you finish, in order of usefulness:

**One: take the setup checklist to your own project.** The
[setup checklist](https://sfdx-hardis.cloudity.com/salesforce-devops-setup-checklist/) is the list
of everything a real pipeline needs. You have now done most of it once. Go through it against
whatever project you actually work on and count what is missing.

**Two: delete your training orgs, or keep them deliberately.** The scratch orgs delete themselves
after 30 days. The two Developer Edition orgs holding a fictional solar company are fine to keep as a
place to try things, and `helios-prod` stays a Dev Hub you can create scratch orgs from. If you keep
them, delete the `SFDX_AUTH_URL_INTEGRATION` and `SFDX_AUTH_URL_UAT` secrets if they are somehow
still there, and remember the JWT certificates in your fork are real credentials to real orgs.

**Three: the promotion branches feature.** Everything you did promotes **everything waiting** from
one branch to the next. Some teams need to promote a subset. That is what
[promotion branches](https://sfdx-hardis.cloudity.com/salesforce-devops-promotion-branches/) are
for, it is experimental, and it will make sense to you now in a way it would not have three levels
ago.

## Thank you

If a lab was unclear, wrong, or assumed something it should not have, say so: open an issue on the
training repository. The labs that are hardest to follow are usually the ones nobody reported.

## Go deeper

- [Release Manager Guide](https://sfdx-hardis.cloudity.com/salesforce-devops-release-home/)
- [Setup checklist for a real project](https://sfdx-hardis.cloudity.com/salesforce-devops-setup-checklist/)
- [Promotion branches (experimental)](https://sfdx-hardis.cloudity.com/salesforce-devops-promotion-branches/)
