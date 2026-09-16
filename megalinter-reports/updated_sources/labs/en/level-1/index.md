---
id: l1-home
level: 1
lang: en
---

# Level 1 - Contributor basics

**Time**: about 4 h 30, in one sitting or six.
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

## What you will do

| Lab                             | Title                                         | Time   |
|---------------------------------|-----------------------------------------------|--------|
| [0](lab-00-setup.md)            | Install the tools and seed your orgs          | 30 min |
| [1](lab-01-fork-and-connect.md) | Fork the repository and connect your pipeline | 45 min |
| [2](lab-02-new-user-story.md)   | Take US-014 from the backlog                  | 20 min |
| [3](lab-03-build-in-org.md)     | Build it in your org                          | 45 min |
| [4](lab-04-publish.md)          | Publish it and read the package.xml diff      | 40 min |
| [5](lab-05-pull-request.md)     | Open the Pull Request, get it green, merge    | 45 min |
| [6](lab-06-capstone.md)         | Capstone: deliver US-016 on your own          | 40 min |

## Three things that are true for the whole course

**Everything happens in your own fork.** You fork the training repository and work only there.
Your feature branch, your Pull Request, your merge, all inside your copy. Nothing is ever pushed
to the shared repository, whose only inbound traffic is badge claims. Two reasons, both hard: a
Pull Request from a fork cannot read the original repository's secrets, so its CI could never
reach your org; and a few hundred learners opening Pull Requests there would bury it.

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
