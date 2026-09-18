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
> As a delivery crew member, I want a free text notes field and a list view of my open
> installations, so that I hand over cleanly to the next shift.
>
> Acceptance criteria:
>
> - A **Crew Notes** field exists on Installation, long text, editable by the crew
> - It is on the Installation page layout, where the crew can see it
> - A **My Open Installations** list view exists on Installation
> - The crew permission set grants the field

## Before you start

- [ ] Lab 1.6 finished: US-014 is merged into `integration` and deployed
- [ ] The Source Control panel shows nothing left uncommitted

## What to do

No numbered clicks this time. The loop, in order:

1. **Start the User Story.** Branch `US-016-crew-notes`, target `integration`, then **Scratch org**
   and **Reuse scratch org helios-dev**. Your org already has US-014, because you built it there
2. **Build it in `helios-dev`**
    - A **Long Text Area** field `Crew_Notes__c` on `Installation__c`, 4000 characters, with a
      description and help text
    - Grant it **Read** and **Edit** on `Helios Delivery Crew`, because a crew member writes notes,
      and on `Helios Delivery Manager`, because planners read the handover and it is the permission
      set you look through
    - On the Installation page layout
    - A list view on Installation called **My Open Installations**, filtered on installations whose
      status is not Completed, showing the account, the status, the install date and Panels Required
3. **Bring it down.** **Commit changes**, **Recent Changes**, **Search Metadata**, and take the
   field, the layout, the list view and the two permission sets. Nothing else. Commit them
4. **Publish**, and read the **Git Delta package.xml** report before pushing. Five things, all
   yours
5. **Open the Pull Request** into `integration` in your own fork, get it green, merge
6. **Check the integration org** after the deployment job

## The one thing that catches everybody

**The permission set and the field travel together.** If you retrieve the field and forget the
permission set, the deployment succeeds and nobody can see the field. If you retrieve the
permission set and forget the field, the deployment fails outright, because a permission set cannot
grant something that is not there. Take both, every time. It is the same pair you took in Lab 1.5,
and the list view has the same habit: it names Panels Required, so it needs that field to be in the
target org already, which it is since Lab 1.6.

## What you should see

In `helios-integration`, after the merge deployment:

- `Crew Notes` on the Installation record, editable, with your help text under it
- **My Open Installations** in the list view picker on the Installations tab

One thing may surprise you on the way. If you built the list view with the scope set to your own
records, the commit Save / Publish adds shows it as **Everything**, and `config/.sfdx-hardis.yml`
gains a `listViewsToSetToMine` entry naming it. That is the `listViewsMine` cleaning rule from Lab
1.5: a deployment refuses a list view scoped to **Mine** in many orgs, so the file travels as
Everything, and the deployment job sets it back to Mine in the org afterwards, through a browser it
drives itself. The line **Successfully set Installation__c.My_Open_Installations as "Mine"** in the
job log is that step.

## If it goes wrong

Everything you need is in Labs 1.3 to 1.6. The failures are the same ones, and the **If it goes wrong**
sections there cover them. Resist the urge to reread the whole lab: look up the one step you are
stuck on.

If your repository ends up in a state you cannot untangle, Welcome page > **Training: Level 1** > **Reset
this level** puts it back to the start of Level 1 and you can redo the capstone cleanly. Using it
is not failing. Not using it and giving up is.

## Check your work

Welcome page > **Training: Level 1** > **Check my work**, then pick **Everything in level 1**.

Six checks should pass. The receipt lines it prints are your progress record, and the claim below
picks them up on its own.

## Claim your badge

You finished Level 1.

Welcome page > **Training: Level 1** > **Claim my badge**.

It checks the whole level again first and refuses to claim anything that does not pass: a claim that
would be rejected is a claim not worth opening. Then it opens the claim form of the training
repository in your browser, with the level, your username, your fork and your receipts already in
it. Tick the three boxes and click **Submit**.

Those three boxes are yours to tick, and nothing ticks them for you. They say your fork is public
and your GitHub handle becomes public in the training repository, which is a decision about your
name rather than a formality.

!!! info "It also asks you to star sfdx-hardis"
    Level 1 asks you to star [hardisgroupcom/sfdx-hardis](https://github.com/hardisgroupcom/sfdx-hardis),
    the open source project this whole course is about. The command offers to do it for you, and the
    audit checks it. One click, free, and it is what keeps a project like this one visible.

A job then clones your fork, re-runs every check above against it, and answers on the issue. Nobody
reviews it by hand, so it usually takes a couple of minutes. If something does not verify, the
comment names the exact lab and what it looked for, you fix it, and you edit the issue to run it
again.

Your fork has to be **public** for the audit to read it. If it is private, the command offers to
make it public.

!!! note "It is a badge, not a certification"
    There is no exam and no accreditation here. Share it under *Featured* on LinkedIn, not under
    *Licenses & certifications*.

## What comes next

Level 1 taught you the loop when everything goes right. Level 2 is the other half: the deployment
that fails on a dependency you did not know about, the field that cannot be made required, the
teammate who edited the same flow as you.

It is recommended for any contributor, and **required** before Level 3.

[Continue to Level 2 - Contributor advanced](../level-2-contributor-advanced/index.md){ .md-button .md-button--primary }
