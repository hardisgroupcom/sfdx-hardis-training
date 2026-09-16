---
id: l3-lab-07-hotfix-retrofit
level: 3
lab: 7
lang: en
source_rev: ""
screenshots:
  - vscode/devops-pipeline
  - vscode/metadata-retriever
depends_on:
  commands: [hardis:org:retrieve:sources:retrofit, hardis:project:deploy:smart]
  flags: []
  config: [retrofitBranch, sourcesToRetrofit, retrofitIgnoredFiles, productionBranch]
  panels: [pipeline, metadataRetriever]
  docs: [salesforce-devops-hotfixes, salesforce-devops-retrofit]
---

# Lab 7 - Production is broken: hotfix and retrofit

**Level**: 3 Release Manager
**Time**: ~60 min
**You will**: ship a fix straight to production without breaking the pipeline, then bring back a
change an admin made by hand.

## The situation

Two problems, and they arrive in the order they always do.

**17:40 on a Friday.** Planners cannot save an installation. The validation rule that went out this
week refuses a date that used to be fine. Waiting for the normal path means Monday.

**Monday morning.** While fixing the incident, an admin added a picklist value directly in
production, because that was the fastest way to unblock people. It works. It is in production and in
no branch, and the next deployment will silently remove it.

Both are normal. Handling them badly is what turns a normal week into a bad quarter.

## Before you start

- [ ] Lab 6 finished: the release is in production
- [ ] `helios-prod` connected in **Orgs Manager**

## Part 1: the hotfix

### 1. Decide that it is a hotfix

A hotfix skips the pipeline. That is its point, and its cost. Use it when **all three** are true:

1. Production is broken for real users right now
2. The fix is small and you can describe its blast radius in one sentence
3. Waiting for `integration` to `uat` to `main` is genuinely not acceptable

If any one is false, it is an ordinary story that happens to be urgent. Most things called hotfixes
are ordinary stories.

### 2. Branch from main, not from integration

This is the part people get wrong, and it produces an incident on top of an incident.

`integration` carries next week's work. Branch a hotfix from it and you ship next week's work to
production tonight.

In VS Code, **New User Story**, with:

| Question      | Answer                                                        |
|---------------|---------------------------------------------------------------|
| Target branch | **`main`**                                                    |
| Type          | **Fix**                                                       |
| Name          | `US-045-installation-date-hotfix`                             |
| Org           | `helios-prod`, because that is where you have to reproduce it |

### 3. Fix it

In `helios-prod`, adjust the validation rule so it no longer refuses a date that was already on the
record:

```
AND(
  ISCHANGED(Install_Date__c),
  Install_Date__c < TODAY(),
  NOT(ISPICKVAL(Status__c, "Completed"))
)
```

The `ISCHANGED` is what was missing: the rule was firing on every save of an old record, not only
when somebody moved the date.

### 4. Publish and ship

Publish, selecting only the validation rule. The Pull Request targets **`main`**.

The check deploys against production in validation mode, which is exactly what you want at 17:40:
the same gate, on the real org, taking two minutes.

Green. Merge. Watch the deployment. Confirm with a planner, or by saving a record yourself.

### 5. Put the fix back into the pipeline

Production now has a fix that `uat` and `integration` do not. Leave it there and the next release
overwrites it.

Open a second Pull Request, from your hotfix branch into `integration`. Same content, ordinary path.
Merge it, and the fix flows back up to `uat` on the next promotion.

**A hotfix is two Pull Requests.** One to production, one back into the pipeline. Doing only the
first is how a fix gets shipped twice and regressed once.

## Part 2: the retrofit

### 6. Find what production has that the repository does not

The admin added a picklist value `Needs Reinspection` to `Installation__c.Status__c`, live, on
Monday morning.

Run the retrofit: in **Commands > CI/CD (advanced)**, click **Retrofit from org**, against
`helios-prod`.

It compares the org with the repository, for the metadata types the project declared worth watching,
and reports the differences.

![The Metadata Retriever, used to pull org changes into the repository](../../_assets/vscode/metadata-retriever.png)

### 7. Read every difference before you accept any

The retrofit will report several things. They are not all the same kind of thing:

| What it reports                                      | What to do                                                                |
|------------------------------------------------------|---------------------------------------------------------------------------|
| The picklist value an admin added to fix an incident | **Take it.** It is real, it is needed, and it has to be in the repository |
| A field a managed package added on install           | **Ignore it.** It belongs to the package                                  |
| Something that differs because production is behind  | **Do not take it.** That is the pipeline's job, not the retrofit's        |

The third one is the trap. A retrofit shows every difference, and some differences mean production
is **behind**, not ahead. Taking those rolls the repository back.

`retrofitIgnoredFiles` and `sourcesToRetrofit` in `config/.sfdx-hardis.yml` are how a project makes
this decision once instead of every time.

### 8. Bring the picklist value in, through the pipeline

Accept the picklist value. It lands in your working copy, on the retrofit branch.

Then treat it as an ordinary change: Pull Request into `integration`, review it, merge it. It flows
to `uat` and comes back to `main` on the next release, at which point production and the repository
agree again.

That last sentence is the whole point of a retrofit: **not to change production, but to stop
production being changed back.**

### 9. Write both down

```markdown
- **Lab 7, hotfix**: US-045 shipped straight to main, then merged back into integration so the next
  release does not regress it.
- **Lab 7, retrofit**: took the Needs Reinspection picklist value an admin added in production, put
  it through the pipeline from integration.
```

<details markdown="1"><summary>Under the hood: the two commands and the two configuration keys</summary>

**The hotfix** used nothing special. `hardis:work:new` with `main` as the target branch produces a
branch from `main`, and `hardis:work:save` computes the package against `main`. The pipeline treats
`main` as any other major branch. What makes it a hotfix is the target, not a mode.

The branch prefix matters for a reason beyond tidiness: the DORA change failure rate in Lab 6 counts
releases followed by a fix, and it recognises a fix by its branch name.

**The retrofit** ran:

    sf hardis:org:retrieve:sources:retrofit

which retrieves the declared metadata types from the org, compares them with the branch, and puts
the differences on a branch named by `retrofitBranch`. Three configuration keys shape it:

    retrofitBranch: retrofit
    sourcesToRetrofit:
      - CustomField
      - Layout
      - ValidationRule
      - CustomObject
    retrofitIgnoredFiles:
      - force-app/main/default/objects/Account/fields/OldLegacy__c.field-meta.xml

`sourcesToRetrofit` keeps the comparison to types where a manual change is plausible and worth
catching. Comparing everything produces hundreds of meaningless differences and gets switched off
within a month, which is worse than not having it.

Many teams run the retrofit on a schedule, weekly, so that a manual production change is noticed in
days rather than discovered by a deployment that removes it.

</details>

## What you should see

- The validation rule fixed in `helios-prod`, through a Pull Request into `main`
- The same fix merged into `integration`
- `Needs Reinspection` present in the repository, in
  `force-app/main/default/objects/Installation__c/fields/Status__c.field-meta.xml`
- Two lines in `MY-PIPELINE.md`

## If it goes wrong

**The hotfix Pull Request wants to bring next week's work with it.**
You branched from `integration`. Start again from `main`.

**The retrofit reports hundreds of differences.**
`sourcesToRetrofit` is too wide, or absent. Narrow it to the types that matter.

**The retrofit wants to remove things.**
Production is behind the repository for those components. Do not accept them: that is a deployment
problem, not a retrofit one.

**The picklist value disappears again after the next release.**
It reached the repository on a branch that never got merged. Check that it is really on
`integration`.

## Check your work

Welcome page > **Training** > **Check my work**, then pick level 3 and lab 7.

## Go deeper

- [Hotfixes](https://sfdx-hardis.cloudity.com/salesforce-devops-hotfixes/)
- [Retrofit](https://sfdx-hardis.cloudity.com/salesforce-devops-retrofit/)

[Next: Lab 8 - Put production under monitoring](lab-08-monitoring.md){ .md-button .md-button--primary }
