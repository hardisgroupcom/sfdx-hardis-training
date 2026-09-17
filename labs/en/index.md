---
title: "Free hands-on Salesforce DevOps course"
description: "Free hands-on Salesforce DevOps course in three levels: Git, Pull Requests, CI/CD pipelines and release management with sfdx-hardis and VS Code."
id: home
lang: en
---

# Salesforce DevOps training with sfdx-hardis

Three free learning paths that take you from "I have never used Git" to "I own the pipeline".

You will work on a real repository for a fictional solar installer, **Helios Energy**, with free
Salesforce orgs that come pre-loaded with the app and its data. Everything you do here is
what a real Salesforce team does every day, with the same tools.

If Git is new to you, that is the expected starting point. Level 1 defines the six words you need,
repository and fork among them, at the moment you first meet each one, and the VS Code extension
runs the Git commands for you.

## The three levels

| Level                                                                 | Who it is for                                                    | Time | Before you start   | You finish able to                                                                                  |
|-----------------------------------------------------------------------|------------------------------------------------------------------|------|--------------------|-----------------------------------------------------------------------------------------------------|
| [**1 - Contributor basics**](level-1-contributor-basics/index.md)     | Admins and developers joining a team that already has a pipeline | 2 h  | Nothing            | Take a User Story, build it, publish it, get a green Pull Request, merge it                         |
| [**2 - Contributor advanced**](level-2-contributor-advanced/index.md) | The same people, once the easy stories are behind them           | 4 h  | Level 1            | Solve deployment errors, declare deployment actions, handle overwrites, resolve conflicts           |
| [**3 - Release Manager**](level-3-release-manager/index.md)           | The person who owns the pipeline, the orgs and the releases      | 6 h  | Levels 1 **and** 2 | Take over an org with no pipeline, review and merge, release to UAT and production, hotfix, monitor |

Levels 1 and 2 are both the contributor path. You may stop after Level 1 and you will be able to
deliver. Level 2 is where you learn what to do when delivery goes wrong, which is most of the job.

**Level 2 is required before Level 3.** A release manager reviews other people's deployment errors,
conflicts and deployment actions. Someone who has never solved one cannot review one.

!!! note "About the times"
    They are measured, not padded. Every lab in this course was walked against real Developer
    Edition orgs and a real GitHub fork while it was written: a Pull Request check comes back in
    about two minutes, a deployment in about two, and you read the result while it runs.

    They assume you already know Salesforce. Creating a field, ticking field level security or
    building a small flow is not what this course teaches, so those minutes are counted as the setup
    they are. What is budgeted properly is the DevOps: the failures, the conflicts, the deployment
    actions.

    They also assume you work through a lab rather than stopping to explore, and that you read the
    **Under the hood** panels once rather than twice. Take longer if you like: none of this is a
    race. The one thing with a clock is the scratch orgs, which live 30 days, and one click
    rebuilds them.

## What you need

- A computer you are allowed to install software on. Lab 1.1 walks through what to install,
  one download at a time, with screenshots.
- A [GitHub](https://github.com/) account, free.
- One free [Salesforce Developer Edition org](https://developer.salesforce.com/signup) to start
  with, and one more at Level 3. Lab 1.2 signs you up, and creates the other orgs the course
  needs from that one.
- Nothing else. No paid service, no licence, no credit card.

## What you get

A **Cloudity badge** per level, on a page you can share.

It is a badge, not a certification. There is no exam and no accreditation. Share it under
*Featured* on LinkedIn, not under *Licenses & certifications*.

## Under the hood, every time

Every lab is written as clicks in the VS Code extension, because that is how the product is meant
to be used. Every significant step then closes with an **Under the hood** block naming the exact
command that ran and the files it touched, so you finish with a mental model rather than a muscle
memory.

## Start

[Level 1 - Contributor basics](level-1-contributor-basics/index.md){ .md-button .md-button--primary }
