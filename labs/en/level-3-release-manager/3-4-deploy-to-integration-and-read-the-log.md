---
id: lab-3-4
title: "Lab 3.4 - Deploy to integration and read the deployment log"
description: "Read an sfdx-hardis deployment log properly, and understand why what was deployed to the integration org is smaller than what changed."
level: 3
lab: 4
lang: en
source_rev: ""
screenshots:
  - annotated/vscode/pipeline-config-deployment--delta
  - annotated/vscode/orgs-manager
  - annotated/vscode/devops-pipeline--deployment-status
depends_on:
  commands: [hardis:project:deploy:smart]
  flags: []
  config: [useDeltaDeployment, enableDeltaDeploymentBetweenMajorBranches, testLevel]
  panels: [pipeline]
  docs: [salesforce-devops-deploy-major-branches, salesforce-devops-smart-deployment]
---

# Lab 3.4 - Deploy to integration and read the deployment log

**Level**: 3 Release Manager

**Time**: ~25 min

**You will**: read a deployment log properly, and understand why what was deployed is smaller than
what changed.

## The situation

Merging your layout fix started a deployment job. Most people watch the colour and move on.

A release manager reads it, because the deployment log is the only place that says what actually
reached the org, and the difference between that and what you thought you were shipping is where
incidents come from.

## Before you start

- [ ] Lab 3.3 finished: your layout fix merged into `integration`

## Steps

### 1. Open the job

**Actions** tab of your fork, the **Process Deployment (sfdx-hardis)** run that started when you
merged.

Or from VS Code: the **DevOps Pipeline** panel puts the job on the arrow between `integration` and
its org **(1)**, coloured with its status, and the legend under the diagram **(2)** says what each
colour means. Click the marker to open the run.

![The DevOps Pipeline panel, with the deployment status on the arrow to the org](../../_assets/annotated/vscode/devops-pipeline--deployment-status.png)

### 2. Read it in five parts

An sfdx-hardis deployment log has the same shape every time:

**One: authentication.** Which org, which mechanism. After Lab 3.2 this says JWT. If it ever says
something else, something changed that you did not change.

**Two: what to deploy.** The package it computed, and where from. This is the interesting part and
step 3 is about it.

**Three: pre-deploy actions.** Anything declared to run before, with its result.

**Four: the Salesforce deployment.** Components deployed, tests run, coverage, duration. On a merge
job, look for `Deployment mode: FULL + Quick Deploy`. The check job of your Pull Request already
validated this exact package, tests included, and the merge job asked Salesforce to apply that
validation rather than deploy again. That is why it takes seconds, and why it runs no test itself.

**Five: post-deploy actions**, then the notification.

### 3. Understand why the package is bigger than the diff

You changed one component. Now read what the job actually sent.

Open `manifest/package.xml`. It lists the whole Helios app, about fifty components, and **that is
the package**: on this project every deployment to `integration` sends all of it, whatever the diff
said. The log's count of components sent will say so.

That is the default, and it is worth feeling once before you learn the thing that fixes it.

**Delta deployment.** Instead of sending the declared package, sfdx-hardis computes what changed
between the commit already deployed to this org and the new one, and sends only that. A full
Salesforce deployment of a mature project takes 40 minutes; a delta takes 3. The trade is that the
org has to genuinely be at the commit the pipeline thinks it is at.

![The Global Pipeline Settings panel, Deployment tab](../../_assets/annotated/vscode/pipeline-config-deployment--delta.png)

!!! note "This project has delta off, on purpose"
    `useDeltaDeployment` is absent from `config/.sfdx-hardis.yml`, so every deployment in this
    course sends the full package. Read it for yourself: **DevOps Pipeline**, gear menu,
    **Pipeline Settings**, scope **Global Settings** **(1)**, **Deployment** tab **(2)**.
    **Use Delta Deployment** **(3)** shows **Disabled**.

    The Helios app is about fifty components, so a full deployment costs a minute and delta would save
    nothing while adding a way for the course to fail confusingly on a missing dependency. Turn it
    on when a deployment starts costing you real time, which on a real project is soon. There is a
    second key for promotions between major branches,
    `enableDeltaDeploymentBetweenMajorBranches`, on the **Danger Zone** tab, and it is off by
    default for the same reason: a promotion carries more, and is the riskiest place to send less.

Find the line `Components: N deployed` in the log, under *Deployment summary*. On a standard run of
this course it is a little over fifty. Compare it with the one file of your Pull Request. The gap
is the cost of having delta off, and it is the argument for turning it on.

### 4. Know what Smart Deploy is, and what it is not

"Smart Deploy" is the name of the command, not of a filter. `sf hardis:project:deploy:smart` is the
orchestrator: it decides the package, reuses a validated deployment as a Quick Deploy when it can,
runs the pre and post deployment actions, translates Salesforce errors into advice, and writes the
Pull Request comment. It is smart about the **job**, not about comparing your repository with the
org component by component.

Two things are often assumed to be part of it and are not:

- **Nothing compares each component with the org and drops the identical ones.** There is an opt-in
  mechanism that does something close, `manifest/packageDeployOnChange.xml`, and it only ever looks
  at the components listed in that file. The file does not exist in this project, and it does
  nothing unless it does
- **Cleaning is not a deployment filter.** It ran on a contributor's machine, at commit time. Step 3
  of the under the hood section below is about that

So the honest answer to "why did it deploy fifty components to change one" is: because nothing was
configured to stop it. That is a decision this project made, not a thing the tool does for you.

### 5. Verify in the org, not in the log

Open `helios-integration` from **Orgs Manager**: find it by its alias **(2)**, check it still says
**Connected** **(3)**, then **Open** from the actions menu at the end of its row. If it says
disconnected instead, that same menu offers **Reconnect**, and **Add Org** **(1)** is how you
connect an org the table does not have at all.

![The Orgs Manager table, with the alias and connection state of each org](../../_assets/annotated/vscode/orgs-manager.png)

Check your change is actually there: open an Installation record, and **Total Capacity (kW)** is
back on the layout, in the right-hand column beside Marco's cap field.

A log is a claim. The org is the fact. On a real project you check the org after every deployment to
a major environment, and it takes thirty seconds.

### 6. Write down what you read

In `MY-PIPELINE.md`, under Level 3, replace the Lab 3.4 line with what you read, numbers included:

```markdown
- **Lab 3.4, Smart Deploy**: the deployment sent N components to change M. Delta is off on this
  project, there is no package-no-overwrite file and no deploy-on-change file, so the whole declared
  package goes every time.
```

Leave it uncommitted. This lab has no story of its own, so the line goes to `integration` with your
next one, in Lab 3.6.

<details markdown="1"><summary>Under the hood: where the package comes from, and where cleaning really happens</summary>

The job ran:

    sf hardis:project:deploy:smart

and the package it sent was built like this:

1. **Start from `manifest/package.xml`**, the declared package, plus
   `manifest/destructiveChanges.xml` for what is being removed
2. **Delta**, if `useDeltaDeployment` is on: `sfdx-git-delta` computes the changed components
   between the last deployed commit and `HEAD`, and everything else is taken back out of the
   package. `enableDeltaDeploymentBetweenMajorBranches` controls whether the same applies to a
   major-to-major deployment, and is off by default because a promotion to production is the worst
   possible place to discover that the org drifted
3. **The overwrite manager**, if `manifest/package-no-overwrite.xml` exists: the org is queried, and
   any component **listed in that file** that the org already has is taken out. It is scoped to its
   own list and nothing else, and a component it protects is still created in an org that does not
   have it yet
4. **Deploy-on-change**, if `manifest/packageDeployOnChange.xml` exists: those components, and only
   those, are retrieved from the org and compared, and the unchanged ones are dropped

Steps 2, 3 and 4 are all off in this project, so what Salesforce receives is step 1.

**Cleaning is not in that list, and this is the thing to take away.** The `autoCleanTypes` rules run
inside `sf hardis:work:save`, on a contributor's machine, before the commit. They rewrite the files
on disk and commit the result, which is why Lab 1.5 could show you the diff they produced. By
the time a deployment runs, there is nothing left to clean: the repository already is the cleaned
version.

Two failure modes worth recognising:

- **The org drifted.** Somebody changed something in the org by hand and the deployment overwrites
  it without a word, because nothing compared. Lab 3.8 is about that
- **Delta lost a dependency.** Your change needs a component that did not change, so the delta does
  not carry it, and the deployment fails on a reference. The fix is not to disable delta: it is to
  include the dependency, which `manifest/package.xml` is for

</details>

## What you should see

- A green **Process Deployment (sfdx-hardis)** run on `integration`
- A log where you can name how many components went, and why that number is not one
- The change present in `helios-integration`

## If it goes wrong

**The deployment failed after the check passed.**
Something changed between the two: the org, or another deployment landing first. Read the error, and
check whether somebody deployed by hand.

**The log says "nothing to deploy".**
With delta off that should not happen on this project, because the package is declared rather than
computed. If it does, check that `manifest/package.xml` is still in the branch and still lists
something.

**The job never started.**
The workflow only triggers on pushes to major branches. Check that the merge really landed on
`integration`.

## Check your work

Welcome page > **Training: Level 3** > **Check my work**, then pick Lab 3.4.

## Go deeper

- [Deploy to major orgs](https://sfdx-hardis.cloudity.com/salesforce-devops-deploy-major-branches/)
- [Smart Deploy internals](https://sfdx-hardis.cloudity.com/salesforce-devops-smart-deployment/)

[Next: Lab 3.5 - Three Pull Requests collide: choose the merge order](3-5-merge-colliding-pull-requests.md){ .md-button .md-button--primary }
