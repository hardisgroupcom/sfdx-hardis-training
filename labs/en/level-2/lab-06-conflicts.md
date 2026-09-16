---
id: l2-lab-06-conflicts
level: 2
lab: 6
lang: en
source_rev: ""
screenshots:
  - vscode/devops-pipeline
depends_on:
  commands: [hardis:work:save, hardis:work:refresh]
  flags: []
  config: [autoCleanTypes]
  panels: [pipeline, commandExecution]
  docs: [salesforce-devops-work-on-user-story-profiles, salesforce-devops-config-overwrite]
---

# Lab 6 - Marco merged first: resolve the conflict

**Level**: 2 Contributor advanced
**Time**: ~60 min
**You will**: face a real merge conflict on two files that conflict very differently, and resolve
both without losing anybody's work.

## The situation

Marco Bianchi has been working on **US-018 - Cap the crew size a planner can assign**, in the same
flow and the same permission set as you. He merged this morning. You did not.

> Git conflicts on a Salesforce project are almost always one of two shapes: a Permission Set where
> two people added different entries, and a Flow where two people changed the logic. The first is
> mechanical. The second requires you to understand both changes.

## Before you start

- [ ] Lab 5 finished and merged
- [ ] A clean working tree

## Steps

### 1. Bring Marco into your fork

Marco does not exist. His work does, and the training reproduces it inside **your own** fork so you
can genuinely review and merge it.

Welcome page > **Training** > **Simulate my teammates**, and choose
**US-018 Cap the crew size a planner can assign**.

It creates the branch `training/mate-us-018-crew-capacity` from your current `integration`, commits
Marco's changes under his name, pushes it to your fork, and opens the Pull Request.

Review it briefly, then **merge it**. Marco is now in `integration`, and you are behind.

<details markdown="1"><summary>Under the hood: why the teammate is replayed rather than pre-existing</summary>

The command ran:

    node scripts/training.mjs simulate

which copied the files from `scripts/simulate/us-018-crew-capacity/files/` over your working tree,
committed them with Marco's name and email, pushed the branch to **your** fork and opened the Pull
Request there with `gh pr create`.

It has to work this way. A Pull Request lives in one repository: you cannot review one that exists
in somebody else's. And a branch shipped in the repository months ago would not share a sensible
ancestor with the `integration` you have built up over five labs, so the conflict would be either
absent or absurd.

The same patch set produced the real teammate Pull Requests on the public training repository, so
what you are reviewing is byte for byte what the screenshots show.

</details>

### 2. Build your own change on top of an out-of-date branch

**New User Story**, branch `US-034-crew-override`, target `integration`, org `helios-dev`.

!!! warning "Do not refresh your org this time"
    `hardis:work:new` offers to bring `integration` down into your org. For this lab, **decline**.
    You are deliberately reproducing the situation of somebody who started before Marco merged.

In `helios-dev`:

1. Open the flow `Installation Assign Crew` and add a decision so that an installation whose roof
   type is `Flat` gets a crew of at least 3, whatever else the flow decided. Connect it to the
   **same assignment** the flow already ends on, so the new rule runs after the status change
2. On the permission set `Helios Delivery Manager`, grant edit access on
   `Installation__c.Crew_Notes__c`, so a planner can say why a crew was raised

Publish, selecting the flow and the permission set. Push.

### 3. Open the Pull Request and watch it refuse to merge

GitHub shows:

> This branch has conflicts that must be resolved
> `force-app/main/default/flows/Installation_Assign_Crew.flow-meta.xml`
> `force-app/main/default/permissionsets/Helios_Delivery_Manager.permissionset-meta.xml`

Two files, two completely different kinds of problem.

Neither of them is git being awkward. Both changes are real, both are wanted, and in both files the
two of you wrote in the same place: Marco granted a field on the permission set one line from where
you granted yours, and he connected the same assignment element in the flow to a decision of his
own. A merge tool cannot know which of two connectors should win. You can.

### 4. Bring integration into your branch

Do it locally, where you have proper tools.

In the **Source Control** panel: **...** menu > **Branch** > **Merge Branch**, and pick
`integration`. Or from the terminal, since this is one of the few places where seeing the command
helps:

```bash
git fetch origin
git merge origin/integration
```

Git reports the two conflicting files.

### 5. Resolve the permission set: take both

Open
`force-app/main/default/permissionsets/Helios_Delivery_Manager.permissionset-meta.xml`.

You will see something like:

```xml
    <fieldPermissions>
        <editable>true</editable>
<<<<<<< HEAD
        <field>Installation__c.Crew_Notes__c</field>
=======
        <field>Installation__c.Crew_Capacity_Cap__c</field>
>>>>>>> origin/integration
        <readable>true</readable>
    </fieldPermissions>
```

Git conflicts on lines, not on XML, so the markers land inside one `<fieldPermissions>` block
rather than around two. That is normal and it is why the resolution has to be read rather than
clicked through.

This one is mechanical: **both entries belong**. Marco's field and yours are different fields, and
a permission set holds as many as it needs. Delete the three markers and keep both blocks, in
alphabetical order because that is how Salesforce writes them:

```xml
    <fieldPermissions>
        <editable>true</editable>
        <field>Installation__c.Crew_Capacity_Cap__c</field>
        <readable>true</readable>
    </fieldPermissions>
    <fieldPermissions>
        <editable>true</editable>
        <field>Installation__c.Crew_Notes__c</field>
        <readable>true</readable>
    </fieldPermissions>
```

**Take both** is the right answer for almost every permission set conflict. Choosing one side is
how a teammate's permission quietly disappears.

### 6. Resolve the flow: understand both, then decide

Open `force-app/main/default/flows/Installation_Assign_Crew.flow-meta.xml`. This one you cannot
resolve by taking both, because the two changes are in the same decision path.

- **Marco's change** caps the crew at what the installation allows: never more than N
- **Your change** raises the crew to at least 3 on flat roofs: never fewer than 3

Read on their own, both are correct. Together, they can contradict each other on a flat roof whose
cap is 2.

This is the moment that matters, and the answer is not technical: **go and ask Marco**. On a real
project, a conflict in business logic is a conversation, not a merge strategy.

For this lab, the decision has been made for you: **the cap wins**. A crew larger than the
installation allows is a safety problem; a crew of 2 on a flat roof is a slow day. Resolve so that
your minimum applies **only when it does not exceed Marco's cap**.

Practically:

1. Take Marco's version of the file as the base (his cap decision and its connectors)
2. Re-add your flat-roof decision **after** his cap, so the cap runs last and wins
3. Delete every conflict marker

!!! tip "When a flow conflict is too tangled to resolve in XML"
    It often is. The escape hatch: take one side wholesale, deploy that version to your dev org,
    redo the other change in the Flow Builder, and re-publish. Slower to type, far faster than
    hand-editing flow XML, and much less likely to produce a flow that deploys but behaves wrongly.

### 7. Finish the merge and re-validate

Mark both files resolved in the Source Control panel, commit the merge, push.

Then **re-publish**: **Save / Publish User Story**. This matters. The merge produced XML by hand,
and `hardis:work:save` re-runs the cleaning rules over it and regenerates `manifest/package.xml`
from the new diff. Skipping it is how a stray conflict marker reaches a deployment.

Watch the check go green, then merge.

### 8. Verify both changes survived

In `helios-integration`:

- The flow caps the crew, Marco's rule
- The flow raises flat-roof crews, your rule, without breaking the cap
- The permission set grants both fields

If either side is missing, the resolution lost work, and the badge audit will say so.

## What you should see

- No conflict markers anywhere: search the repository for `<<<<<<<`
- Both field permissions in `Helios_Delivery_Manager`
- Both behaviours in the flow

## If it goes wrong

**The flow will not deploy after the merge: "duplicate element name".**
You kept both sides of an element that can only exist once. Flow element names are unique. Rename or
remove one.

**You lost your change entirely.**
You resolved with "take theirs" on the whole file. `git merge --abort` before committing, or reset
your branch and start the merge again.

**The check fails on a conflict marker.**
Search the whole repository for `<<<<<<<`, `=======` and `>>>>>>>`. A marker in an XML file is
sometimes syntactically tolerated by git and always fatal to Salesforce.

**You cannot untangle it at all.**
**Training > Reset this level**, then redo from step 1. Losing twenty minutes is better than
merging something you do not understand.

## Check your work

Welcome page > **Training** > **Check my work**, then pick level 2 and lab 6.

The check asserts **outcomes, not procedure**: both changes present and correct on `integration`,
no markers left. However you got there, including resolving in the GitHub web editor or redoing the
work in the Flow Builder, passes.

## Go deeper

- [Profiles and Permission Sets](https://sfdx-hardis.cloudity.com/salesforce-devops-work-on-user-story-profiles/)
- [Overwrite management](https://sfdx-hardis.cloudity.com/salesforce-devops-config-overwrite/)

[Next: Lab 7 - You committed the wrong things](lab-07-recover-selection.md){ .md-button .md-button--primary }
