---
id: l1-lab-06-capstone
level: 1
lab: 6
lang: en
source_rev: ""
screenshots:
  - vscode/devops-pipeline
depends_on:
  commands: [hardis:work:new, hardis:work:save]
  flags: []
  config: [autoCleanTypes]
  panels: [pipeline, orgManager]
  docs: [salesforce-devops-use-home]
---

# Capstone - Deliver US-016 on your own

**Level**: 1 Contributor basics
**Time**: ~30 min
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
> - A **My Open Installations** list view exists, showing installations that are not completed
> - The crew permission set grants the field

## Before you start

- [ ] Lab 5 finished: US-014 is merged into `integration` and deployed
- [ ] You are back on a clean state

## What to do

No numbered clicks this time. The loop, in order:

1. **Start the User Story.** Branch `US-016-crew-notes`, target `integration`, org `helios-dev`
2. **Refresh your org first.** `hardis:work:new` offers it. Say yes: `integration` now has US-014,
   and your org should have it too before you build on top
3. **Build it in `helios-dev`**
    - A **Long Text Area** field `Crew_Notes__c` on `Installation__c`, 4000 characters, with a
      description and help text
    - Grant it **Read** and **Edit** on `Helios Delivery Crew`, because a crew member writes notes
    - On the layout
    - A list view `My Open Installations` on Installation, filtered to `Status not equal to
      Completed`, with the columns a crew member needs
4. **Publish.** Select the field, the permission set, the layout and the list view. Nothing else
5. **Read `manifest/package.xml`** before pushing. Four entries, all yours
6. **Open the Pull Request** into `integration` in your own fork, get it green, merge
7. **Check the integration org** after the deployment job

## Two things that will catch you

**The list view will look different after publishing.** Salesforce records list views with a scope
that means "mine" for the person who retrieved them. The `listViewsMine` cleaning rule rewrites
that, because a list view whose scope is one developer's user is useless to everybody else. Look at
the diff and you will see it happen.

**Long text areas cannot go everywhere.** A Long Text Area cannot be used in a list view column and
cannot be filtered on. If you try to put `Crew_Notes__c` in the `My Open Installations` columns,
Salesforce refuses. Pick the columns a crew actually needs: name, account, status, install date.

## What you should see

In `helios-integration`, after the merge deployment:

- `Crew Notes` on the Installation record, editable
- `My Open Installations` in the list view picker, showing fewer records than `All Installations`

## If it goes wrong

Everything you need is in Labs 2 to 5. The failures are the same ones, and the **If it goes wrong**
sections there cover them. Resist the urge to reread the whole lab: look up the one step you are
stuck on.

If your repository ends up in a state you cannot untangle, Welcome page > **Training** > **Reset
this level** puts it back to the start of Level 1 and you can redo the capstone cleanly. Using it
is not failing. Not using it and giving up is.

## Check your work

Welcome page > **Training** > **Check my work**, then pick level 1 and **Everything in level 1**.

Seven checks should pass. Keep the receipt lines it prints: they are what you paste into your badge
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

[Continue to Level 2 - Contributor advanced](../level-2/index.md){ .md-button .md-button--primary }
