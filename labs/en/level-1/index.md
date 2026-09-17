---
id: l1-home
level: 1
lang: en
---

# Level 1 - Contributor basics

**Time**: about 2 h, in one sitting or six.

**Before you start**: nothing. This is the first level.

## The story

You joined **Helios Energy** on Monday. They install residential solar panels across southern
Europe, sales runs on Salesforce, and the delivery crews track every installation in a custom app
called **Helios Delivery**.

The team already has a pipeline. There is a Git repository, an integration org, a Pull Request
check that deploys your work before anyone reviews it. Nobody is going to teach you Git: the
VS Code extension does the technical part, and by Friday you are expected to have delivered your
first story.

That is this level.

## Six words, before anything else

If you have never used Git, this is the whole vocabulary. Nothing in Level 1 assumes you knew it
beforehand, and you will not have to type a single Git command: the VS Code extension does that
part.

| Word             | What it means                                                                                                                                             |
|------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Repository**   | One project folder, plus every version of it there has ever been. Often shortened to "repo". The Helios repo lives on GitHub.                             |
| **Fork**         | Your own copy of somebody else's repository, made in one click, under your GitHub account. You can change anything in it, and the original never notices. |
| **Clone**        | Downloading a repository onto your laptop, so VS Code can open it.                                                                                        |
| **Branch**       | A named line of work inside a repository. You change what you need on yours, and the team's version stays untouched until you merge.                      |
| **Commit**       | Recording a set of changes in the repository's history, with a message saying why.                                                                        |
| **Pull Request** | Asking for your branch to be folded into the team's. It is where the checks run and where a colleague reads what you did. Everyone says "PR".             |

## What you will do

| Lab                             | Title                                      | Time   |
|---------------------------------|--------------------------------------------|--------|
| [0](lab-00-setup.md)            | Install the tools                          | 15 min |
| [1](lab-01-fork-and-connect.md) | Set up your training environment           | 20 min |
| [2](lab-02-new-user-story.md)   | Take US-014 from the backlog               | 10 min |
| [3](lab-03-build-in-org.md)     | Build it in your org                       | 15 min |
| [4](lab-04-publish.md)          | Choose what to keep, and publish it        | 20 min |
| [5](lab-05-pull-request.md)     | Open the Pull Request, get it green, merge | 20 min |
| [6](lab-06-capstone.md)         | Capstone: deliver US-016 on your own       | 25 min |

## The Training menu

Everything this course asks you to run outside the product's own buttons lives in one menu, and it
is worth knowing where before you need it. Open the **SFDX HARDIS** view in the left bar of VS Code
and expand **Training (custom)** **(1)**:

![The Training menu of the sfdx-hardis command list](../../_assets/annotated/vscode/sidebar-commands-custom-menu--training-menu.png)

Seven commands **(2)**, and the labs call them by these names:

| Command                            | What it does                                                  |
|------------------------------------|---------------------------------------------------------------|
| **Set up my pipeline**             | Forks the repository, turns Actions on, gives the CI a way in |
| **Where am I?**                    | Says which level and lab you reached, and what to do next     |
| **Set up one of my training orgs** | Deploys the Helios app and its data into an org you choose    |
| **Check my work**                  | Verifies the lab you just finished and prints your receipt    |
| **Simulate my teammates**          | Creates the teammate branches and Pull Requests a lab needs   |
| **Reset this level**               | Puts your repository back to the start of a level             |
| **Clean up a training org**        | Removes the Helios app and its data from an org               |

The same seven are on the **Welcome page**, as a card called **Training**. Either route runs the
same thing.

## Three things that are true for the whole course

**You work in your own copy.** Everything in this course happens in a repository that belongs to
you and nobody else. Your changes, your mistakes, your fixes, and nothing you do reaches anybody
else's work. Lab 1 sets that copy up for you in one click, and explains why it has to be that way.

**You click, you do not type.** Every action in these labs is a button in the VS Code extension.
Where a command appears, it is in an **Under the hood** block, which explains what the button did.
You never have to retype it.

**You can always start over.** If a lab goes wrong, Welcome page > **Training** > **Reset this
level** puts your repository back to the start of the level. One botched lab does not end your
course.

## If you get stuck

Every lab has an **If it goes wrong** section with the two or three failures we know happen.
Beyond that, the sfdx-hardis documentation at
[sfdx-hardis.cloudity.com](https://sfdx-hardis.cloudity.com/) is the reference, and each lab links
the exact pages for its topic.

[Start with Lab 0](lab-00-setup.md){ .md-button .md-button--primary }
