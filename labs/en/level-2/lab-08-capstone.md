---
id: l2-lab-08-capstone
level: 2
lab: 8
lang: en
source_rev: ""
screenshots:
  - vscode/devops-pipeline
depends_on:
  commands: [hardis:work:new, hardis:work:save, hardis:org:data:import]
  flags: []
  config: [commandsPostDeploy, autoCleanTypes]
  panels: [pipeline, deploymentAction, dataWorkbench]
  docs: [salesforce-devops-work-on-user-story-deployment-actions]
---

# Capstone - Deliver US-041, which has all of it at once

**Level**: 2 Contributor advanced
**Time**: ~60 min
**You will**: deliver one story that contains a dependency error, a data deployment action and a
conflict with a teammate, with no step-by-step.

## The situation

> **US-041 - Installation handover checklist**
>
> As a planner, I want a handover checklist on the installation with its reference items, so that a
> job is only closed when the checklist is complete.
>
> Acceptance criteria:
>
> - A `Handover_Item__c` object exists, child of Installation
> - 10 reference checklist items are loaded in every org
> - The close flow blocks on an incomplete checklist

Three of the failures you met separately are waiting in this one story. You already know all three
fixes.

## Before you start

- [ ] Labs 0 to 7 finished and merged
- [ ] `helios-dev` level with `integration`

## What to do

### The story

1. **Take it.** Branch `US-041-handover-checklist`, target `integration`, org `helios-dev`
2. **Build the object**: `Handover_Item__c`, with `External_Id__c` (Text 40, external id, unique),
   `Installation__c` (lookup), `Label__c`, `Sequence__c`, `Is_Done__c`, `Is_Template__c`
3. **Build the reference data**: 10 template `Handover_Item__c` records with no installation, the
   checklist every job starts from
4. **Build the close check**: a record-triggered flow `Installation_Close_Check` on Installation
   that blocks a save into `Completed` while any related handover item is not done
5. **Publish, Pull Request, green, merge**

### The three things waiting for you

**One: the dependency.** One of the fields you create will not reach the repository. You have met
this exact failure. The evidence is in `manifest/package.xml`, and the cause is in a file at the
root of the repository. Do not guess: look.

**Two: the data.** Ten records in your org are ten records in your org. A green deployment will put
the object and the flow into `helios-integration` and the checklist will be empty there, and the
feature will do nothing at all. Build a data workspace and declare an action.

**Three: the conflict.** Before you open your Pull Request, run **Training > Simulate my
teammates** and pick **US-019**, then merge it. Amina adds a quote PDF field and grants it on
`Helios Delivery Manager`, the same permission set your checklist fields need. Bring `integration`
into your branch and resolve what git reports, the way Lab 6 taught: on a permission set, take both.

!!! note "Not US-018 again"
    Lab 6 already merged US-018, so simulating it a second time reports nothing to commit. Each
    teammate story merges once per level.

### A hint on sequencing, because getting this wrong costs an hour

The reference records need the object to exist before they can be loaded. So:

- The object and the flow deploy as metadata
- The data action runs **after** the deployment, not before

That is the opposite of Lab 2, where the backfill had to run first. The rule is not "always before"
or "always after": it is **what does this action need to already exist?**

## What you should see

In `helios-integration`, after the merge:

- `Handover_Item__c` with 10 template records
- Saving an installation to `Completed` with an incomplete checklist is refused, with your message
- `Helios_Delivery_Crew` granting the new fields, and Marco's change still present

## If it goes wrong

Everything you need is in labs 1, 3 and 6. Look up the one step you are stuck on rather than
rereading the labs.

**Training > Reset this level** if the repository gets away from you. It resets to the start of
Level 2, which means redoing the capstone, not the whole level.

## Check your work

Welcome page > **Training** > **Check my work**, then pick level 2 and **Everything in level 2**.

Nine checks. Keep the receipts.

## Claim your badge

1. Open [a new issue on the training repository](https://github.com/hardisgroupcom/sfdx-hardis-training/issues/new/choose)
2. Pick **Claim a training badge**
3. Level **2**, your Trailblazer username, the URL of your public fork, your receipts
4. Submit

A Level 2 claim re-runs the **Level 1 audit as well**, because the badge says you can do both. If
you skipped Level 1, that is where it will say so.

The badge for this level is called **sfdx-hardis Contributor**, without a qualifier. That is
deliberate: Level 1 makes you able to deliver, Level 2 makes you a contributor.

## What comes next

You can stop here and be genuinely good at the contributor job.

Level 3 is a different role. You stop asking for your work to be merged and start deciding what
gets merged, when it is released, and what happens when production breaks at 17:40 on a Friday.

The project you have been contributing to stops at `integration`: no UAT, no production, no proper
CI authentication, no monitoring. Level 3 is finishing it.

[Continue to Level 3 - Release Manager](../level-3/index.md){ .md-button .md-button--primary }
