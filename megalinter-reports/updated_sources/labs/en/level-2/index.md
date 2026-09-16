---
id: l2-home
level: 2
lang: en
---

# Level 2 - Contributor advanced

**Time**: about 7 h.
**Before you start**: [Level 1](../level-1/index.md). Not optional: every lab here assumes the loop
is automatic for you.

## The story

Three months in. You have delivered a dozen stories and the loop is muscle memory. Then the ones
that do not go through start arriving.

A deployment that fails on a dependency nobody told you about. A field that cannot be made required
because the org already holds thirty records without it. Reference records and a nightly batch that
have to follow your change into every org, and no deployment will carry them for you. Marco, who
edited the same flow and the same permission set as you and merged first.

This is the half of the contributor path that decides whether you enjoy working on a CI/CD project.

## What you will do

| Lab                                    | Title                                          | Time   |
|----------------------------------------|------------------------------------------------|--------|
| [0](lab-00-refresh.md)                 | Your org is behind, catch it up                | 25 min |
| [1](lab-01-missing-dependency.md)      | US-021 will not deploy: a missing dependency   | 50 min |
| [2](lab-02-deployment-actions-apex.md) | US-024: the field cannot be required yet       | 60 min |
| [3](lab-03-deployment-actions-data.md) | US-026: reference data and a batch must follow | 55 min |
| [4](lab-04-quality-and-tests.md)       | US-027 fails the quality gate and the tests    | 45 min |
| [5](lab-05-profiles-overwrites.md)     | US-033: your Profile change disappeared        | 40 min |
| [6](lab-06-conflicts.md)               | Marco merged first: resolve the conflict       | 60 min |
| [7](lab-07-recover-selection.md)       | You committed the wrong things: recover        | 30 min |
| [8](lab-08-capstone.md)                | Capstone: deliver US-041                       | 60 min |

## If you are joining here

You can start Level 2 without having done Level 1, as long as you accept that the labs assume the
loop. Get to a known state first:

1. Do [Level 1 lab 0](../level-1/lab-00-setup.md) and [lab 1](../level-1/lab-01-fork-and-connect.md)
   in full: tools, orgs, fork, Actions, the integration secret
2. Welcome page > **Training** > **Reset this level**, and pick **Level 2**

That puts your `integration` branch at `training/start-level-2`, which is what the repository looks
like once Level 1 is done.

## One thing to keep open

`MY-PIPELINE.md`. Several labs here ask you to write a line in it, and the badge audit reads it. It
is also the file you would keep on a real project so the next person can see how things were put
together. Copy `MY-PIPELINE.template.md` over it and start filling it in.

[Start with Lab 0](lab-00-refresh.md){ .md-button .md-button--primary }
