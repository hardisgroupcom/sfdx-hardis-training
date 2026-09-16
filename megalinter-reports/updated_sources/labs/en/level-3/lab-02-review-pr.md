---
id: l3-lab-02-review-pr
level: 3
lab: 2
lang: en
source_rev: ""
screenshots:
  - vscode/devops-pipeline
depends_on:
  commands: [hardis:project:deploy:smart]
  flags: [--check]
  config: []
  panels: [pipeline]
  docs: [salesforce-devops-validate-merge-request, salesforce-devops-handle-merge-request-results]
---

# Lab 2 - Review and merge a contributor Pull Request

**Level**: 3 Release Manager
**Time**: ~45 min
**You will**: review somebody else's work, find the thing the robot did not, ask for a change, and
merge.

## The situation

Marco has opened **US-018 - Cap the crew size a planner can assign**. The checks are green. The
sfdx-hardis comment says the deployment validated and the tests passed.

Green checks mean "this will deploy". They do not mean "this is right". Deciding the second is your
job now, and it is the part of release management that cannot be automated.

## Before you start

- [ ] Lab 1 finished: JWT authentication on all three orgs
- [ ] A clean working tree

## Steps

### 1. Bring Marco's Pull Request into your fork

Welcome page > **Training** > **Simulate my teammates**, and choose
**US-018 Cap the crew size a planner can assign**.

It creates the branch and opens the Pull Request in your fork, as Marco. Wait for the checks.

### 2. Read the robot first

Open the Pull Request and read the sfdx-hardis comment, top to bottom. Four things, in this order:

1. **Did it deploy?** Validation result and deployment id
2. **What does it deploy?** The component list. This is the first place a review can go wrong: if a
   component is in the list that the story does not mention, ask why
3. **What does it delete?** Destructive changes are listed separately, and they deserve more
   attention than anything else on the page
4. **Tests and coverage**

Reading it in that order takes two minutes and catches most problems.

### 3. Read the diff, looking for what the robot cannot see

The robot checks that the deployment works. It cannot check that the deployment is a good idea.

Go through Marco's diff file by file with four questions:

| Question                                 | Why it matters                                                                                                        |
|------------------------------------------|-----------------------------------------------------------------------------------------------------------------------|
| **Does this match the story?**           | Compare with US-018 in the backlog. Extra changes are either scope creep or an accident, and both are worth a comment |
| **Does anything disappear?**             | A removed field, a removed picklist value, a removed permission. Salesforce will happily deploy a deletion            |
| **Are permissions on a Permission Set?** | A Profile carrying field permissions means somebody bypassed the convention                                           |
| **Would this be reversible?**            | If this turns out wrong in production on Friday, what is the path back?                                               |

### 4. Find the one the robot missed

In Marco's diff, the flow now reads `Installation__c.Crew_Capacity_Cap__c`, and the permission set
grants it. Both fine.

But look at the layout change. Marco removed `Total_Capacity_kW__c` from the Installation layout,
because his new cap field took the space.

Nothing fails. The field still exists, the deployment is green, the tests pass.

And the **Installation Capacity Report** that the operations team runs every Monday uses that field
on that layout. Removing it from the layout does not break the report, but it does mean nobody can
see the value on a record any more, and the first person to notice will be an operations lead on
Monday morning.

**Nothing in the pipeline can catch that.** Only somebody who knows the org can.

### 5. Ask for the change

On the Pull Request, click **Files changed**, find the layout, click the line, and leave a review
comment:

> `Total_Capacity_kW__c` comes off the layout here. Operations reads it on the record every week.
> Can the cap field go in the second column instead, so we keep both?

Then **Review changes > Request changes**, with a one-line summary.

Two things about that comment worth copying:

- **It says why**, so Marco can decide rather than just comply
- **It proposes a fix**, so he is not left guessing what would be acceptable

### 6. Approve and merge

Marco pushes a fix (for this lab, make the change yourself on his branch: put the cap field in the
second column and restore `Total_Capacity_kW__c`).

The checks run again. When they are green: **Review changes > Approve**, then **Merge pull
request**.

Use **Create a merge commit**, not squash. On a pipeline where the release notes and the DORA report
are built from merged Pull Requests, the merge commit is what carries the link back to the Pull
Request, and squashing loses it.

### 7. Delete the branch

GitHub offers the button. Take it.

<details markdown="1"><summary>Under the hood: what produced the comment you just read</summary>

The check job ran:

    sf hardis:project:deploy:smart --check

and then posted the comment through the GitHub API with the token the workflow already has. The
comment is updated in place on every push rather than added again, which is why the Pull Request
does not fill up with twenty robot comments.

The component list comes from the package the deployment computed, not from the git diff. The two
can differ, and when they do the package is the truth: it is what Salesforce will receive.

The deletions section is built from `manifest/destructiveChanges.xml`, which `hardis:work:save`
generates when a contributor removes something. It is worth knowing that a contributor can produce a
destructive change **without meaning to**, by unticking something in the selection screen after it
was committed. That is why it has its own section rather than being one line in a list.

</details>

## What you should see

- The Pull Request merged into `integration` with your approval on it
- A review comment that asked for a change, and a follow-up commit answering it
- `Total_Capacity_kW__c` still on the layout in `integration`

## If it goes wrong

**The simulate command says the branch already exists.**
It recreates it from your current `integration`. Let it.

**The checks never run on the simulated Pull Request.**
Actions are disabled, or the JWT secrets are missing for `integration`. Lab 1.

**You merged without reviewing.**
Revert the merge from the Pull Request page and redo it. Merging fast is the failure mode this
whole level is about.

## Check your work

Welcome page > **Training** > **Check my work**, then pick level 3 and lab 2.

## Go deeper

- [Review and merge Pull Requests](https://sfdx-hardis.cloudity.com/salesforce-devops-validate-merge-request/)
- [Check the Pull Request results](https://sfdx-hardis.cloudity.com/salesforce-devops-handle-merge-request-results/)

[Next: Lab 3 - Deploy to integration and read what happened](lab-03-deploy-integration.md){ .md-button .md-button--primary }
