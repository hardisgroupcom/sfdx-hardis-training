---
id: l1-lab-03-build-in-org
level: 1
lab: 3
lang: en
source_rev: ""
screenshots:
  - vscode/orgs-manager
depends_on:
  commands: []
  flags: []
  config: []
  panels: [orgManager]
  docs: [salesforce-devops-work-on-user-story, salesforce-devops-work-on-user-story-configuration]
---

# Lab 3 - Build it in your org

**Level**: 1 Contributor basics
**Time**: ~45 min
**You will**: build US-014 the way an admin builds anything, by clicking in Salesforce Setup, and
check it against real records.

## The situation

You have a branch and an org. Now do the actual work. Nothing in this lab is specific to CI/CD:
this is ordinary Salesforce configuration. The only rule is **where** you do it: in `helios-dev`,
your own org, never in the shared one.

## Before you start

- [ ] Lab 2 finished: you are on `features/US-014-panels-required`
- [ ] The Status section of the sfdx-hardis panel shows `helios-dev` as the current org

## Steps

### 1. Open your org

In **Orgs Manager**, find `helios-dev` and click **Open**.

![Orgs Manager, where you open the org you are working in](../../_assets/vscode/orgs-manager.png)

Your browser opens the org, already logged in. No password, no login page: the extension used the
credential you stored in Lab 0.

Opening the org from this panel rather than from a bookmark is a habit worth forming. It is the
difference between "the org I meant" and "the org that happened to be open in that tab".

### 2. Create the field

In Salesforce: **Setup > Object Manager > Installation > Fields & Relationships > New**.

| Setting        | Value                                                         |
|----------------|---------------------------------------------------------------|
| Data Type      | **Number**                                                    |
| Field Label    | `Panels Required`                                             |
| Length         | 4                                                             |
| Decimal Places | 0                                                             |
| Field Name     | `Panels_Required__c` (Salesforce fills this from the label)   |
| Description    | `How many panels the crew has to load for this installation.` |
| Help Text      | `Ask the planner if this is empty.`                           |
| Required       | **no**                                                        |

On the field-level security screen, leave every profile unticked and click **Next**. You are going
to grant this through a permission set, not a profile, and Level 2 lab 5 is about why that
distinction matters more than it looks.

On the page layout screen, tick **Installation Layout** so the field appears on the record.

Click **Save**.

!!! tip "Fill in Description and Help Text"
    Two seconds now, and the generated project documentation at Level 3 lab 9 reads like something
    written by a person. Empty descriptions are the most common reason that documentation is
    useless.

### 3. Grant it to the crew

The acceptance criteria say the crew must see it. They do not have it yet: you granted nothing.

**Setup > Permission Sets > Helios Delivery Crew > Object Settings > Installations**, then **Edit**.

Find `Panels Required` and tick **Read Access**. Leave **Edit Access** unticked: a crew member
reads how many panels to load, they do not decide the number.

**Save**.

### 4. Put it where people will look

The field is on the layout, which is what old-style Salesforce pages use. The Installation record
page is a Lightning record page, and it shows the layout inside its **Details** tab, so you are
already done.

Open any installation (**App Launcher > Helios Delivery > Installations**, pick `INST-00001`) and
check the **Details** tab. `Panels Required` is there, empty.

### 5. Test it against real data

Empty fields prove nothing. Put a number in.

1. On `INST-00001`, click **Edit**, set **Panels Required** to `24`, and **Save**
2. Look at the **Panel delivery timeline** component on the right: it lists the pallets booked for
   this installation, with their quantities
3. Do the quantities add up to roughly what you typed? On a real story you would ask the planner
   whether the field should be entered by hand or computed. Here, entered by hand is the story

Do the same on two more installations, so you have something to look at after the deployment.

## What you should see

On three installations: a `Panels Required` value, visible in the Details tab, saved without error.

And in VS Code, **nothing at all**. The repository does not know about any of this yet. Your
changes live in one org and nowhere else, which is exactly the state Lab 4 exists to end.

## If it goes wrong

**Object Manager does not list Installation.**
You are in the wrong org. Check the Status section in VS Code, then reopen the org from **Orgs
Manager**.

**The field does not appear on the record page.**
You skipped the page layout step. **Setup > Object Manager > Installation > Page Layouts >
Installation Layout**, drag `Panels Required` into the Information section, **Save**.

**Save fails with a validation rule error.**
The Helios org has a rule that refuses moving an installation date into the past. If you edited the
date by accident, put it back to a future date.

**You cannot edit the Permission Set.**
You are not assigned **Helios Delivery Manager**. Run **Training > Set up one of my training orgs**
on `helios-dev` again: it assigns it, and repeating it is harmless.

## Check your work

Welcome page > **Training** > **Check my work**, then pick level 1 and lab 3.

It will fail, and that is correct: nothing is in the repository yet. Lab 4 is what makes this check
pass. Run it anyway once, so you see what a failing check looks like before it matters.

## Go deeper

- [Work in your org](https://sfdx-hardis.cloudity.com/salesforce-devops-work-on-user-story/)
- [Configuration guidelines](https://sfdx-hardis.cloudity.com/salesforce-devops-work-on-user-story-configuration/)

[Next: Lab 4 - Publish it and read the package.xml diff](lab-04-publish.md){ .md-button .md-button--primary }
