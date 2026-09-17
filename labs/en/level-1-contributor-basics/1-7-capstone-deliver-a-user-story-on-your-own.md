---
id: lab-1-7
title: "Lab 1.7 - Capstone: deliver a User Story on your own"
description: "Deliver a Salesforce User Story end to end with no step-by-step: branch, build, retrieve, commit, Pull Request and deployment with sfdx-hardis."
level: 1
lab: 7
lang: en
source_rev: ""
screenshots:
depends_on:
  commands: [hardis:work:new, hardis:work:save]
  flags: []
  config: [autoCleanTypes]
  panels: [pipeline, orgManager]
  docs: [salesforce-devops-use-home]
---

# Lab 1.7 - Capstone: deliver a User Story on your own

**Level**: 1 Contributor basics

**Time**: ~25 min

**You will**: do the whole loop again with no step-by-step, which is the only way to find out
whether you learned it.

## The situation

Second ticket, second day. Nobody is going to walk you through this one.

> **US-016 - Let the crew leave notes on an installation**
>
> As a delivery crew member, I want a free text notes field on an installation, so that I hand
> over cleanly to the next shift.
>
> Acceptance criteria:
>
> - A **Crew Notes** field exists on Installation, long text, editable by the crew
> - It is on the Installation page layout, where the crew can see it
> - The crew permission set grants it

## Before you start

- [ ] Lab 1.6 finished: US-014 is merged into `integration` and deployed
- [ ] You are back on a clean state

## What to do

No numbered clicks this time. The loop, in order:

1. **Start the User Story.** Branch `US-016-crew-notes`, target `integration`, then **Scratch org**
   and **Reuse scratch org helios-dev**. Your org already has US-014, because you built it there
2. **Build it in `helios-dev`**
    - A **Long Text Area** field `Crew_Notes__c` on `Installation__c`, 4000 characters, with a
      description and help text
    - Grant it **Read** and **Edit** on `Helios Delivery Crew`, because a crew member writes notes
    - On the Installation page layout
3. **Bring it down.** **Commit changes**, **Recent Changes**, **Search Metadata**, and take the
   field, the permission set and the layout. Nothing else. Commit them
4. **Publish**, and read `manifest/package.xml` before pushing. Three entries, all yours
5. **Open the Pull Request** into `integration` in your own fork, get it green, merge
6. **Check the integration org** after the deployment job

## The one thing that catches everybody

**The permission set and the field travel together.** If you retrieve the field and forget the
permission set, the deployment succeeds and nobody can see the field. If you retrieve the
permission set and forget the field, the deployment fails outright, because a permission set cannot
grant something that is not there. Take both, every time. It is the same pair you took in Lab 1.5.

## What you should see

In `helios-integration`, after the merge deployment:

- `Crew Notes` on the Installation record, editable, with your help text under it

## If it goes wrong

Everything you need is in Labs 1.3 to 1.6. The failures are the same ones, and the **If it goes wrong**
sections there cover them. Resist the urge to reread the whole lab: look up the one step you are
stuck on.

If your repository ends up in a state you cannot untangle, Welcome page > **Training: Level 1** > **Reset
this level** puts it back to the start of Level 1 and you can redo the capstone cleanly. Using it
is not failing. Not using it and giving up is.

## Check your work

Welcome page > **Training: Level 1** > **Check my work**, then pick **Everything in level 1**.

Six checks should pass. Keep the receipt lines it prints: they are what you paste into your badge
claim.

## Claim your badge

You finished Level 1.

1. Open [a new issue on the training repository](https://github.com/hardisgroupcom/sfdx-hardis-training/issues/new/choose)
2. Pick **Claim a training badge**
3. Fill in: level **1**, your Trailblazer username, the URL of **your public fork**, and the
   receipt lines
4. Submit

A job clones your fork, re-runs every check above against it, and answers on the issue. Nobody
reviews it by hand, so it usually takes a couple of minutes. If something does not verify, the
comment names the exact lab and what it looked for, you fix it, and you edit the issue to run it
again.

Your fork has to be **public** for the audit to read it.

!!! note "It is a badge, not a certification"
    There is no exam and no accreditation here. Share it under *Featured* on LinkedIn, not under
    *Licenses & certifications*.

## What comes next

Level 1 taught you the loop when everything goes right. Level 2 is the other half: the deployment
that fails on a dependency you did not know about, the field that cannot be made required, the
teammate who edited the same flow as you.

It is recommended for any contributor, and **required** before Level 3.

[Continue to Level 2 - Contributor advanced](../level-2-contributor-advanced/index.md){ .md-button .md-button--primary }
