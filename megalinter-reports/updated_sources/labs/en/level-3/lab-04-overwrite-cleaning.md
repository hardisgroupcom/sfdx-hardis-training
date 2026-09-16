---
id: l3-lab-04-overwrite-cleaning
level: 3
lab: 4
lang: en
source_rev: ""
screenshots:
  - vscode/devops-pipeline
  - vscode/pipeline-config
depends_on:
  commands: [hardis:project:deploy:smart]
  flags: []
  config: [autoCleanTypes, packageNoOverwritePath, useDeltaDeployment]
  panels: [pipeline, pipelineConfig, packageXml]
  docs: [salesforce-devops-config-cleaning, salesforce-devops-config-delta-deployment, salesforce-devops-config-overwrite]
---

# Lab 4 - Three Pull Requests collide

**Level**: 3 Release Manager
**Time**: ~60 min
**You will**: decide the order three Pull Requests go in, when two of them fight over the same file
and one of them does not work.

## The situation

Friday afternoon. Three Pull Requests are waiting:

| Pull Request                              | Author        | Checks      | What it touches                            |
|-------------------------------------------|---------------|-------------|--------------------------------------------|
| **US-018** Cap the crew size              | Marco Bianchi | green       | the assign flow, `Helios_Delivery_Manager` |
| **US-019** Quote PDF                      | Amina Diallo  | green       | `Helios_Delivery_Manager`                  |
| **US-020** Refactor InstallationScheduler | Marco Bianchi | **failing** | `InstallationScheduler`                    |

Two of them edit the same permission set. One does not deploy. Everyone wants to go home.

Deciding what goes in, in what order, and what waits, is the job.

## Before you start

- [ ] Lab 3 finished
- [ ] A clean working tree

## Steps

### 1. Create the three Pull Requests

Welcome page > **Training** > **Simulate my teammates**, three times, once for each of US-018,
US-019 and US-020.

If US-018 is already merged from Lab 2, that is fine: this lab is about the other two colliding
with what is already in `integration`.

Wait for the checks.

### 2. Triage before you touch anything

Look at the three and sort them, in this order of questions:

**Which ones are green?** A failing Pull Request is not a decision, it is a task for its author. Do
not spend your Friday fixing Marco's refactor.

**Which ones conflict?** US-018 and US-019 both edit `Helios_Delivery_Manager`. Whichever merges
second will have to resolve.

**Which one is smaller?** All else equal, merge the smaller one first. Its author resolves nothing,
and the larger one has a better-defined conflict to resolve.

Your order: **US-019 first** (small, green, no dependants), then **US-018** (green, resolves the
conflict), and **US-020 goes back to Marco**.

### 3. Send US-020 back, properly

Open it and read the failure. It is a genuine failure, in his code, and it is his to fix.

Leave one review comment that does three things:

> The check fails on `InstallationSchedulerTest.earliestInstallDateAddsThePreparationBuffer`:
> the refactor changed the return type and the test was not updated. Not blocking anything else, so
> I am taking US-019 and US-018 into this week's release and this one can land on Monday.

Names the failure, says who owns it, says what happens to the release. Then **Request changes** and
move on.

!!! tip "Do not fix a contributor's Pull Request yourself"
    It is faster once and expensive every time after. The author does not learn the failure, and you
    become the person every failing check is escalated to.

### 4. Merge US-019

Green, small, no conflict. Review it the way Lab 2 taught, approve, merge.

### 5. Merge US-018, which now conflicts

GitHub now reports a conflict on
`force-app/main/default/permissionsets/Helios_Delivery_Manager.permissionset-meta.xml`.

Permission set conflicts are almost always **take both**: Amina granted one field, Marco granted
another, and the permission set holds as many as it needs. Resolve it in the GitHub web editor,
keeping both `<fieldPermissions>` blocks in alphabetical order.

Then **wait for the checks to run again** on the resolved branch. A conflict resolved in the web
editor is a new commit, and it has never been validated. Merging without re-validating is how a
resolution that dropped a closing tag reaches an org.

Green. Merge.

### 6. Watch the deployment, then look at the permission set in the org

In `helios-integration`, check `Helios_Delivery_Manager` has **both** new field permissions.

If one is missing, the resolution dropped it, and the fix is a follow-up Pull Request, not an edit
in the org.

### 7. Understand why this was survivable

Three things kept this from being much worse, and they are all configuration you can point at:

**Cleaning** (`autoCleanTypes`) meant the conflict was on two small blocks rather than on a
thousand-line Profile. This is most of the reason the project bans permissions on Profiles.

**The overwrite manager** (`packageNoOverwritePath`) protects components that are deliberately
different per org. Open the project **Settings** in the DevOps Pipeline panel and look at the
configuration.

![Project configuration, where the cleaning and overwrite settings live](../../_assets/vscode/pipeline-config.png)

Anything listed in `manifest/package-no-overwrite.xml` is removed from the package when the target
org already has it, so a deployment cannot flatten a named credential that points at a different
endpoint in each environment.

**Delta deployment** meant each merge deployed its own components rather than the whole repository,
so US-019's deployment could not accidentally roll back US-018.

### 8. Write the decision down

In `MY-PIPELINE.md`:

```markdown
- **Lab 4, three Pull Requests**: merged US-019 then US-018, resolved the Helios_Delivery_Manager
  conflict by keeping both grants, sent US-020 back to its author with the failing test named.
```

<details markdown="1"><summary>Under the hood: the three mechanisms and where each one lives</summary>

| Mechanism         | Configuration                                                     | What it does                                                                          |
|-------------------|-------------------------------------------------------------------|---------------------------------------------------------------------------------------|
| Cleaning          | `autoCleanTypes` in `config/.sfdx-hardis.yml`                     | Rewrites the sources **at commit time**, in the contributor branch                    |
| Overwrite manager | `packageNoOverwritePath` plus `manifest/package-no-overwrite.xml` | Removes components from the package **at deploy time**, when the org already has them |
| Delta             | `useDeltaDeployment`                                              | Reduces the package to what changed since the last deployed commit                    |

The distinction between the first two is worth keeping straight, because they fail differently.

Cleaning is a **source** decision: what the repository is allowed to contain. When it drops
something, the component is genuinely not in the repository any more, and the diff shows it.

Overwrite is a **deployment** decision: what this particular org is allowed to receive. The
component stays in the repository, and it is simply not sent to an org that already has its own
version. A new org, which has nothing, receives it.

That is why a named credential belongs in the overwrite list and not in the cleaning rules: a fresh
org must get one, and an existing org must keep its own.

</details>

## What you should see

- US-019 and US-018 merged, in that order
- US-020 open, with a review that names the failure
- `Helios_Delivery_Manager` in `helios-integration` carrying both grants

## If it goes wrong

**The conflict resolution broke the XML.**
The check fails on a parse error. Fix it on the branch and let the checks run again. Never merge a
red conflict resolution.

**Merging US-018 rolled back US-019.**
The resolution took one side of the file wholesale. Revert the merge and redo it taking both.

**All three Pull Requests conflict with each other.**
Merge them one at a time, waiting for each deployment to finish. Merging two at once into the same
branch is how a release manager loses an evening.

## Check your work

Welcome page > **Training** > **Check my work**, then pick level 3 and lab 4.

## Go deeper

- [Automated cleaning](https://sfdx-hardis.cloudity.com/salesforce-devops-config-cleaning/)
- [Delta deployments](https://sfdx-hardis.cloudity.com/salesforce-devops-config-delta-deployment/)
- [Overwrite management](https://sfdx-hardis.cloudity.com/salesforce-devops-config-overwrite/)

[Next: Lab 5 - Promote integration to UAT](lab-05-uat-release-notes.md){ .md-button .md-button--primary }
