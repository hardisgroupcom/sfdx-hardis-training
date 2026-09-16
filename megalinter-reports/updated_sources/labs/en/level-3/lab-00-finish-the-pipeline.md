---
id: l3-lab-00-finish-the-pipeline
level: 3
lab: 0
lang: en
source_rev: ""
screenshots:
  - vscode/devops-pipeline
  - vscode/pipeline-config
depends_on:
  commands: [hardis:project:create]
  flags: []
  config: [availableTargetBranches, availableTargetBranchesLabels, productionBranch, mergeTargets, targetUsername, instanceUrl]
  panels: [pipeline, pipelineConfig]
  docs: [salesforce-devops-setup-home, salesforce-devops-setup-init-project, salesforce-devops-setup-existing-org]
---

# Lab 0 - Your pipeline stops at integration: finish it

**Level**: 3 Release Manager
**Time**: ~60 min
**You will**: turn a one-stage pipeline into a three-stage one, and understand every line of
configuration you add.

## The situation

Open the **DevOps Pipeline** panel and look at what Sofia left.

![The pipeline as it stands: one major branch](../../_assets/vscode/devops-pipeline.png)

One column. `integration`, with its org. The `uat` and `main` branches exist in git, and nothing
knows about them: no org, no merge path, no deployment job.

The panel says so itself, in the warnings at the bottom:

> No merge target defined for branch integration
>
> No encrypted certificate key file found for branch 'integration'

Those two lines are your first week. The first is this lab, the second is the next one.

That is not unusual. Most projects start with one shared org because that is all they need on day
one, and finishing the pipeline gets postponed until the day somebody needs to release.

## Before you start

- [ ] Levels 1 and 2 finished
- [ ] Four orgs connected in **Orgs Manager**: `helios-dev`, `helios-integration`, `helios-uat`,
      `helios-prod`
- [ ] `helios-uat` and `helios-prod` seeded with **Training > Set up one of my training orgs**

## Steps

### 1. Decide the shape before you type anything

Three questions, and their answers are the whole pipeline:

| Question                                                                     | Helios answer                                                      |
|------------------------------------------------------------------------------|--------------------------------------------------------------------|
| Which branches are **major**, meaning they have an org and a deployment job? | `integration`, `uat`, `main`                                       |
| Which branch can merge into which?                                           | `integration` into `uat`, `uat` into `main`. Nothing skips a stage |
| Which branch is production?                                                  | `main`                                                             |

Write those three lines in `MY-PIPELINE.md` now, before you configure anything. If you cannot state
them in one sentence each, configuring them will not help.

### 2. Declare uat and main as targets

Open the **DevOps Pipeline** panel, then the project **Settings**.

![The project configuration screen](../../_assets/vscode/pipeline-config.png)

Under the contribution settings, add `uat` and `main` to the list of available target branches,
with labels contributors will understand:

| Branch      | Label                                                                 |
|-------------|-----------------------------------------------------------------------|
| integration | `integration: shared integration org, where every contributor merges` |
| uat         | `uat: user acceptance, only a release manager targets this`           |
| main        | `main: production, hotfixes only`                                     |

Set the production branch to `main`.

**Save**.

### 3. Give uat and main their orgs

Back in the pipeline diagram, `uat` and `main` now appear as columns with no org.

For each one, open its **Settings** and fill in:

| Branch | Target username                | Instance URL                   |
|--------|--------------------------------|--------------------------------|
| uat    | the `helios-uat` org username  | `https://login.salesforce.com` |
| main   | the `helios-prod` org username | `https://login.salesforce.com` |

Get the usernames from **Orgs Manager**, and check them twice. Pointing `main` at the wrong org is
the single most expensive mistake available in this lab.

### 4. Declare the merge path

Still in the branch settings, set the merge targets:

| Branch      | Merge targets |
|-------------|---------------|
| integration | `uat`         |
| uat         | `main`        |
| main        | none          |

This is what stops a contributor opening a Pull Request straight from a feature branch into
production. It is not a permission, it is a guardrail, and it exists because the alternative is
someone doing it at 18:00 on a Friday.

### 5. Look at the diagram again

Refresh the panel. Three columns, each with its org, connected by arrows in one direction.

That diagram is now the truth about this project, and it is the thing you will point at in every
conversation with a stakeholder who asks "so where is it".

<details markdown="1"><summary>Under the hood: the files you just wrote</summary>

`config/.sfdx-hardis.yml` gained:

    availableTargetBranches:
      - integration
      - uat
      - main
    availableTargetBranchesLabels:
      - "integration: shared integration org, where every contributor merges"
      - "uat: user acceptance, only a release manager targets this"
      - "main: production, hotfixes only"
    productionBranch: main

and two new files appeared under `config/branches/`:

    config/branches/.sfdx-hardis.uat.yml
    config/branches/.sfdx-hardis.main.yml

each holding `targetUsername`, `instanceUrl` and `mergeTargets`.

**A major branch is not declared anywhere as "major".** It becomes one by having a branch
configuration file with an org in it. That is the whole mechanism, and knowing it means you can read
any sfdx-hardis project in two minutes by listing `config/branches/`.

### What `sf hardis:project:create` would have done

Had Helios started today, the project would have been generated rather than assembled:

    sf hardis:project:create

which asks for the branch names and the orgs, then writes `sfdx-project.json`,
`config/.sfdx-hardis.yml`, every `config/branches/` file, `manifest/package.xml`, the `.gitignore`
and `.forceignore`, and the CI workflows for your git provider. It is the same result you have just
produced by hand, which is the point of doing it by hand once.

The other command worth knowing about is `sf hardis:org:retrieve:sources:dx`, which takes an
existing org with no repository at all and produces the initial commit. That is the real starting
point of most projects: not an empty repository, but a two-year-old org nobody has ever versioned.

</details>

### 6. Commit the configuration

This is configuration, so it goes through the same pipeline as everything else. Commit it on a
branch, open a Pull Request into `integration`, and merge it.

Yes, even as the release manager. Especially as the release manager.

## What you should see

- Three columns in the DevOps Pipeline panel, each naming its org
- `config/branches/` holding three files
- A merged Pull Request carrying the configuration change

## If it goes wrong

**The uat column appears with no org even after saving.**
The file was written for a different branch name. Check `config/branches/` for a typo: the file name
has to match the branch exactly.

**The pipeline diagram does not refresh.**
Click **Refresh** in the panel. It caches the git state.

**You pointed a branch at the wrong org.**
Fix the branch configuration file and commit again. Nothing has deployed yet, so nothing is broken.

## Check your work

Welcome page > **Training** > **Check my work**, then pick level 3 and lab 0.

## Go deeper

- [Setup Guide](https://sfdx-hardis.cloudity.com/salesforce-devops-setup-home/)
- [Initialize the SFDX project](https://sfdx-hardis.cloudity.com/salesforce-devops-setup-init-project/)
- [Retrieve an existing org](https://sfdx-hardis.cloudity.com/salesforce-devops-setup-existing-org/)

[Next: Lab 1 - Wire CI authentication for three orgs](lab-01-ci-auth.md){ .md-button .md-button--primary }
