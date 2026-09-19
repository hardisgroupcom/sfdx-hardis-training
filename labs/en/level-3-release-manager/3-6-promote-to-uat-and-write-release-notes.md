---
id: lab-3-6
title: "Lab 3.6 - Promote to UAT and write the release notes"
description: "Protect what UAT keeps for itself with package-no-overwrite, promote integration to UAT, read its deployment actions and write the release notes."
level: 3
lab: 6
lang: en
source_rev: ""
screenshots:
  - annotated/vscode/devops-pipeline-level3--create-promotion
  - annotated/vscode/pipeline-branch-modal-level3--what-it-carries
  - annotated/vscode/pipeline-branch-modal--no-merge-target
depends_on:
  commands: [hardis:doc:release-notes, hardis:project:deploy:smart]
  flags: []
  config: [mergeTargets, availableTargetBranches, packageNoOverwritePath]
  panels: [pipeline, deploymentAction]
  docs: [salesforce-devops-deploy-major-branches, hardis/doc/salesforce-devops-release-notes]
---

# Lab 3.6 - Promote to UAT and write the release notes

**Level**: 3 Release Manager

**Time**: ~35 min

**You will**: protect a setting UAT keeps for itself, make your first promotion between two major
branches, read the deployment actions it carries, and produce the document the business actually
reads.

## The situation

Everything the team built this week is in `integration`. The business testers work in UAT. Monday
morning they expect to find this week's work there, with a note saying what changed.

A promotion between major branches is not a contributor Pull Request. It carries several stories at
once, it may carry deployment actions declared weeks ago by different people, and the org it
deploys to has real testers in it.

## Before you start

- [ ] Lab 3.5 finished: US-018 and US-019 merged into `integration`
- [ ] `helios-uat` connected: the scratch org Level 1 created, configured as the `uat` org since then
- [ ] JWT authentication working for `uat` (Lab 3.2)

## Steps

### 1. See what you are about to ship

Open the **DevOps Pipeline** panel and click the `integration` node in the diagram. A window opens
on that branch, titled **Pull Requests in integration**.

![The branch window of integration, listing what it carries](../../_assets/annotated/vscode/pipeline-branch-modal-level3--what-it-carries.png)

**Pull Requests** **(1)** is the list that matters: every Pull Request merged into `integration`
since the last promotion to `uat`, with who merged it and when. That list **is** the release. Read
it before you create anything: if a story in it should not go out this week, now is the moment, not
after the deployment.

**Deployment Actions** **(2)** is the list of actions those Pull Requests carried, gathered in one
place, and step 4 comes back to it. **Tickets** beside it is the same again for the stories, each with its
title, read from the backlog the project declares as its ticketing system. A fourth tab, **Apex Tests**, appears only on a project that sets
`enableDeploymentApexTestClasses`, and this one does not.

The footer holds the two buttons step 7 uses: **(3)** generates the notes for what has already been
promoted, **(4)** previews the notes for what has not.

!!! note "Empty, with a Go Live selector instead?"
    Then this branch has no merge target yet, and the panel is showing you its go-lives **(1)**
    rather than what is waiting to be promoted:

    ![The same window on a branch with no merge target](../../_assets/annotated/vscode/pipeline-branch-modal--no-merge-target.png)

    `integration` has had `uat` as its merge target since Lab 1.2. If it is missing, the branch
    file lost it: click **Training: Level 3 > Set up my training environment**, which writes it
    again. It refreshes the org and the login URL of a file that already exists and leaves the rest
    alone, so what you set in Lab 3.1 survives.

### 2. Protect what UAT keeps for itself

One component of the Helios app is meant to be different in every org: the remote site setting
`Helios_Warehouse`, the address of the warehouse stock system the panel batches are booked with.
Production talks to the real warehouse, UAT to the warehouse's test system. An admin set that address
in UAT by hand, and the repository holds the production one.

See it for yourself: in `helios-uat`, **Setup > Remote Site Settings**, open `Helios_Warehouse`,
**Edit**, and set **Remote Site URL** to `https://warehouse-test.helios.invalid`, the way
the UAT admin did. **Save**.

Now the promotion. It sends the whole package, remote site setting included, and would put the
production address back in UAT without a word. The **overwrite manager** is for exactly this:
anything listed in `manifest/package-no-overwrite.xml` is taken out of the deployment when the target
org already has it, and created when it does not.

In the Explorer, create the file `manifest/package-no-overwrite.xml` and copy this into it:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Package xmlns="http://soap.sforce.com/2006/04/metadata">
    <types>
        <members>Helios_Warehouse</members>
        <name>RemoteSiteSetting</name>
    </types>
    <version>64.0</version>
</Package>
```

It has the shape of `manifest/package.xml`: one `<types>` block per kind of component, its members
listed by name. Then **Training: Level 3** > **Publish my pipeline configuration**: the list of what
must never be overwritten is pipeline configuration, like the rest.

!!! note "Created where missing, never overwritten where present"
    A new org, a fresh sandbox for instance, has no `Helios_Warehouse` yet, and the deployment creates
    it from the repository. From then on it belongs to that org. The overwrite manager does not
    compare versions: present means protected.

### 3. Create the promotion Pull Request

In the **DevOps Pipeline** diagram, the arrow from `integration` to `uat` carries a **+ PR** chip
**(1)**. Click it: GitHub opens on a new Pull Request from `integration` into `uat`, both branches
already filled in.

![The + PR chip on the arrow from integration to uat](../../_assets/annotated/vscode/devops-pipeline-level3--create-promotion.png)

The chip is there because no Pull Request is open on that arrow. Once you create one, the chip is
replaced by the Pull Request number and its status.

!!! note "Not the promotion button of the branch window"
    The branch window can also show a **Create promotion from integration (experimental)** button,
    but only on a project that turns on `enablePromotionBranches`, which this one does not. That
    feature is for promoting a **subset** of what is waiting. What you are doing is promoting
    everything, and everything is what a plain Pull Request from one branch to the next carries.

Title it for the humans who will read it, not for git:

> Release 2026-09: crew capacity cap, quote PDF

### 4. Read the deployment actions it carries

Once the check runs, the sfdx-hardis comment gains two sections, **Pre-deployment Actions Results**
and **Post-deployment Actions Results**. What a promotion adds on top is the paragraph naming the
scope: which branch into which, and everything it carries.

Every action any contributor declared on any of the merged stories is collected into one table, with
its label, its type, its status and a link back to the Pull Request it came from. Anything needing a
human gets a **checklist above the table**, headed *Manual Actions to perform before proceeding with
deployment* or *after deployment*. The two checklists land on different jobs: the check job carries
the before one, so you can act on it while deciding, and the merge job carries the after one.

**Read it before merging.** Two things to look for:

| What you see      | What it means for you                                                                                   |
|-------------------|---------------------------------------------------------------------------------------------------------|
| A **manual step** | Somebody has to click something in UAT. That somebody is you, and it will not happen unless you plan it |
| A **data import** | Records will be written to UAT. Testers may have their own records there                                |

You cannot edit a contributor's action from here: it belongs to their Pull Request and to every org
after this one, so a wrong action is fixed in a new Pull Request rather than in this promotion.

The checklist is the exception, and it is not decoration. **Tick a box once you have done the thing
in the org**, and the next sfdx-hardis job reads the box back and records the action as done. Leave
it unticked and the next promotion will still be asking you for it.

### 5. Merge and watch the deployment

Merge the promotion. The **Process Deployment (sfdx-hardis)** run starts, this time on `uat`.

This is the first deployment to this org through the pipeline, so it will be larger than the ones to
integration: UAT is behind by everything the team has done. Expect several minutes.

When it finishes, do the manual steps the comment listed, in `helios-uat`.

Then read the log for the overwrite manager, above the deployment, in the lines that start with
`[NoOverwrite]`:

```
Type RemoteSiteSetting: 1 item(s) skipped because they already exist in the target org (protected), 0 item(s) to deploy
```

`helios-uat` already has `Helios_Warehouse`, so the promotion left it out of the package, and the
**Final package.xml to deploy** printed right after it has one item fewer.

### 6. Verify with a tester's eyes

Open `helios-uat` and check the two stories are genuinely usable, not just deployed:

- A crew larger than the cap is brought back down to the cap when you save: put `Crew Capacity Cap`
  at 3 and `Crew Size` at 6 on a planned installation, save, and it reads 3
- The quote PDF permission is on the manager permission set
- **Setup > Remote Site Settings** still says `https://warehouse-test.helios.invalid` for
  `Helios_Warehouse`: the promotion left it alone

Deployed and usable are different states, and the gap between them is almost always a permission or
a piece of reference data.

### 7. Generate the release notes

Open the **DevOps Pipeline** panel and click the `uat` node, the same way you clicked `integration`
in step 1. In the footer of that window, the button marked **(3)** in the picture at step 1 now
reads **Generate Promotion Notes for uat**. Click it.

It asks one question, **Select the merge commit for this release or promotion**, listing the merges
that landed on `uat`, newest first. Take the top one, **Merge pull request #N from
*your-handle*/integration**: the promotion you have just merged. The notes cover what that merge
brought into `uat`, and nothing before it.

The button is named after what the branch is. `uat` merges into `preprod`, so what arrived there is
a promotion. On a branch with no merge target, `main`, the same button reads **Generate Release
Notes for Latest Release in main**, and once you pick a go-live in the selector at the top of the
window it reads **Generate Release Notes for** that go-live.

Next to it, the button marked **(4)**, **Preview Upcoming Promotion Notes from uat**, does the same
thing for what has not been promoted yet. It is the one to use on a Wednesday, when somebody asks
what Thursday's release will contain.

You get a markdown document listing the Pull Requests, their authors, their stories and the manual
steps, generated from the merge history rather than from anybody's memory. It lands under
`hardis-report/release-notes/`, in a folder named after the release tag and the date, or after the
target branch and the date when there is no tag, so here `uat-<date>`. Markdown and PDF every time,
plus a spreadsheet when there is anything to put in it.

Read it and then improve it. Generated notes are a complete list, and a release note the business
reads needs two things the generator cannot know:

1. **One sentence at the top saying what this release is for.** "Crews can no longer be
   over-staffed, and sales can generate quote PDFs."
2. **The manual steps, stated as instructions to a named person**, not as a technical list

Then give them to the people who read them. Open the promotion Pull Request you merged, **...** at
the top right of its description, **Edit**, and paste the improved notes in place of the one-line
description. A merged Pull Request stays editable, and it is where the release is: its link is what
you send the business, and what the release notes of the next promotion point back to.

<details markdown="1"><summary>Under the hood: what generated the notes, and what a promotion really is</summary>

The command was:

    sf hardis:doc:release-notes --mode post --target-branch uat

which walks the git history between two references, collects the merge commits, matches each one
with its Pull Request through the git provider API, and pulls the title, author, body and declared
deployment actions.

**That API call is the part that can quietly fail.** The command needs a git provider token, taken
from the environment (`GITHUB_TOKEN` or `CI_SFDX_HARDIS_GITHUB_TOKEN` on GitHub). With no token it
does not stop: it warns, collects zero Pull Requests, and writes you a perfectly formatted document
with nothing in it. An empty release note is more often a missing token than an empty release.

**This is also why Lab 3.3 said not to squash.** A squashed merge loses the link between the commit and
the Pull Request, and both the release notes and the DORA report in Lab 3.7 lean on exactly that link.
A project that squashes everything has no release notes it did not write by hand.

**A promotion is an ordinary Pull Request.** There is no special promotion machinery in the default
setup: `integration` into `uat` is a branch merged into another branch, and the deployment job on
`uat` behaves like the one on `integration`. What differs is only what the configuration says about
`uat`: its org, its merge targets, and whether delta deployment applies between major branches
(`enableDeltaDeploymentBetweenMajorBranches`, off by default, because a promotion is the worst
moment to discover the target org drifted).

There is an experimental feature for teams who want to promote a **subset** of what is waiting,
rather than everything: [promotion
branches](https://sfdx-hardis.cloudity.com/salesforce-devops-promotion-branches/). It is worth
reading about once you have done a few releases the ordinary way.

</details>

## What you should see

- The `uat` branch carrying everything `integration` had
- A green **Process Deployment (sfdx-hardis)** run on `uat`
- Both stories working in `helios-uat`
- `Helios_Warehouse` in `helios-uat` still pointing at the test warehouse
- The release notes in the description of the promotion Pull Request

## If it goes wrong

**The check fails with authentication errors for uat.**
Lab 3.2 for the `uat` branch: the secrets, and the pre-authorisation of the External Client App in
`helios-uat`.

**The deployment fails on something that worked in integration.**
The orgs differ. Usually UAT is missing a feature, a licence, or a component somebody deleted there
by hand. Read the error and check the org.

**The promotion Pull Request shows hundreds of files.**
That is expected on a first promotion: UAT is behind by the whole history. It settles after this
one.

**The release notes are empty.**
Three causes, in order of likelihood: the wrong merge commit was picked, so check that the top of
the list was the promotion; no git provider token in the environment, so the Pull Request lookup
returned nothing and only warned; or the merges were squashed, so there is no link to look up.

## Check your work

Welcome page > **Training: Level 3** > **Check my work**, then pick Lab 3.6.

## Go deeper

- [Deploy to major orgs](https://sfdx-hardis.cloudity.com/salesforce-devops-deploy-major-branches/)
- [Release Notes](https://sfdx-hardis.cloudity.com/hardis/doc/salesforce-devops-release-notes/)

[Next: Lab 3.7 - Release to production and read your DORA metrics](3-7-release-to-production-and-read-dora-metrics.md){ .md-button .md-button--primary }
