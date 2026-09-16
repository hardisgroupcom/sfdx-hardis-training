---
id: l2-lab-02-deployment-actions-apex
level: 2
lab: 2
lang: en
source_rev: ""
screenshots:
  - vscode/pipeline-pr-actions-empty
  - vscode/pipeline-edit-action-apex
  - vscode/pipeline-pr-actions-list
depends_on:
  commands: [hardis:work:save, hardis:project:deploy:smart]
  flags: []
  config: [commandsPostDeploy, apexScript, runOnlyOnceByOrg]
  panels: [pipeline, deploymentAction]
  docs: [salesforce-devops-work-on-user-story-deployment-actions]
---

# Lab 2 - US-024: the field cannot be required yet

**Level**: 2 Contributor advanced
**Time**: ~60 min
**You will**: hit a failure that no amount of metadata fixing solves, and learn the tool that exists
for it: a deployment action.

## The situation

> **US-024 - Crew size becomes mandatory**
>
> As a planner, I want Crew Size to be mandatory on every installation, so that no job is scheduled
> without a crew.
>
> Acceptance criteria:
>
> - Crew Size is required
> - Existing records are backfilled with the default of 2

One checkbox in Setup. Then the deployment fails, and it fails for a reason that has nothing to do
with your metadata: the integration org holds thirty installations with no crew size, and Salesforce
will not make a field required while records violate it.

You cannot fix this with a better package. The org has to change **before** the metadata does, and
that change has to happen in every org this story ever reaches.

## Before you start

- [ ] Lab 1 finished and merged
- [ ] `helios-dev` level with `integration`

## Steps

### 1. Take the story and do the obvious thing

**New User Story**, branch `US-024-crew-size-required`, target `integration`, org `helios-dev`.

In `helios-dev`: **Setup > Object Manager > Installation > Fields & Relationships > Crew Size >
Edit**, tick **Required**, **Save**.

If your own org has records without a crew size, Salesforce refuses here too. Fill them in by hand
for now, or note that it already refused: either way you have just met the problem one org early.

Publish, push, open the Pull Request.

### 2. Read the failure

```
Error: Installation__c.Crew_Size__c - cannot set field to required: 30 existing records have no value
```

Thirty records. You could open the integration org and fill them in by hand, and the deployment
would go through. Then it would fail again in UAT, and again in production, and nobody would
remember why.

**Anything you have to do by hand in one org, you will have to do in every org.** That is what a
deployment action is for.

### 3. Split the story into two moves

The shape of the fix, and it is the shape of most "the org is in the way" problems:

1. Deploy the field **still optional**
2. Run something that makes the data valid
3. Deploy the field **required**

Steps 2 and 3 can travel in the same Pull Request, as long as the tool knows to run them in that
order. That is exactly what a post-deploy action is.

### 4. Write the backfill script

In your repository, create `scripts/apex/backfill-crew-size.apex`:

```apex
// Gives every installation without a crew the default crew of two, so that
// Crew_Size__c can be made mandatory in the next deployment.
List<Installation__c> toFix = [SELECT Id FROM Installation__c WHERE Crew_Size__c = null LIMIT 10000];
for (Installation__c installation : toFix) {
    installation.Crew_Size__c = 2;
}
update toFix;
System.debug('Backfilled ' + toFix.size() + ' installations');
```

Two things worth noticing, because they are what makes a script like this safe to run in
production:

- It only touches records that are actually wrong (`WHERE Crew_Size__c = null`)
- It says how many it changed, so the deployment log is readable afterwards

### 5. Declare it as a deployment action

Open the **DevOps Pipeline** panel, find your Pull Request, and open its **Deployment Actions** tab.

![A Pull Request with no deployment action yet](../../_assets/vscode/pipeline-pr-actions-empty.png)

Click **Add action**, and choose **Run Apex script**.

![The Apex script deployment action editor](../../_assets/vscode/pipeline-edit-action-apex.png)

Fill it in:

| Field                 | Value                                          |
|-----------------------|------------------------------------------------|
| Label                 | `Backfill Crew Size on existing installations` |
| When                  | **After the deployment**                       |
| Apex script           | `scripts/apex/backfill-crew-size.apex`         |
| Context               | All orgs                                       |
| Run only once per org | **yes**                                        |

**Save**.

![The Pull Request with its deployment action listed](../../_assets/vscode/pipeline-pr-actions-list.png)

!!! tip "Run only once per org"
    Tick it whenever the script is a one-time correction rather than something that should happen on
    every deployment. sfdx-hardis records what it has run in each org, so the backfill fires once in
    integration, once in UAT, once in production, and never again. Leave it unticked for a script
    that is genuinely idempotent and should re-run.

### 6. Make the deployment two-step

The action runs **after** the deployment. Your deployment makes the field required. So on the first
run the order would be: make required (fails), then backfill (never reached).

Change the order of your own work instead:

1. On this Pull Request, keep the field **optional**, and keep the backfill action
2. Merge. The field deploys, the backfill runs, the org is now clean
3. Open a second small Pull Request that only makes the field required

Or, in one Pull Request, declare the backfill as a **pre-deploy** action instead of post-deploy.
Both are legitimate. Two Pull Requests is easier to review and easier to roll back; one is faster.

For this lab, do it in one: change the action's **When** to **Before the deployment**, and keep the
field required. Then the order is backfill, then deploy, and the deployment succeeds.

### 7. Watch it run

Push and watch the check. In the job log you will see the action fire before the deployment starts,
with the `System.debug` line reporting how many records it fixed.

Merge. The deployment job to integration runs the action there too, for real, and the field becomes
required in `helios-integration` without anyone opening Setup.

<details markdown="1"><summary>Under the hood: where the action is stored and how it runs</summary>

The editor wrote a YAML file next to your Pull Request, under `scripts/actions/`:

    commandsPreDeploy:
      - id: backfill-crew-size
        label: Backfill Crew Size on existing installations
        apexScript: scripts/apex/backfill-crew-size.apex
        context: all
        runOnlyOnceByOrg: true

`sf hardis:project:deploy:smart` reads it, and around the Salesforce deployment it:

1. Collects the actions of every Pull Request included in this deployment
2. Runs the `commandsPreDeploy` ones, in order
3. Deploys the metadata
4. Runs the `commandsPostDeploy` ones
5. Records in the target org which `runOnlyOnceByOrg` actions have already fired, so the next
   deployment skips them

`context` decides where it runs: `all` for every org, or a list of branches when the action only
makes sense in some of them. A data correction is usually `all`. A "reset the sandbox integration
user" script is usually not.

Because the actions live in the repository and travel with the Pull Request, the same sequence
replays in UAT and in production months later, without anybody remembering it existed. That is the
whole value: **the knowledge is in the repository, not in someone's head.**

</details>

## What you should see

- The Pull Request comment listing the deployment action it ran, above the deployment result
- `Crew Size` required in `helios-integration`, with all thirty installations carrying a value
- No manual step performed by anybody in any org

## If it goes wrong

**The action does not appear in the Deployment Actions tab.**
The panel reads the Pull Request from your fork. If the Pull Request was opened against the original
repository, it cannot see it. Close it and reopen it with the right base.

**The Apex script fails with `Too many DML rows`.**
Raise the `LIMIT` carefully, or convert the script to a batch. Thirty records is nowhere near the
limit, so if you see this you are running against an org with far more data than the training one.

**The deployment still fails on the required field.**
The action ran after the deployment. Change **When** to **Before the deployment**.

**The action ran but nothing changed.**
`runOnlyOnceByOrg` is ticked and it already ran in that org during an earlier attempt. That is
correct behaviour. Untick it temporarily if you need to re-run while experimenting.

## Check your work

Welcome page > **Training** > **Check my work**, then pick level 2 and lab 2.

## Go deeper

- [Deployment actions](https://sfdx-hardis.cloudity.com/salesforce-devops-work-on-user-story-deployment-actions/)

[Next: Lab 3 - US-026, reference data and a batch must follow](lab-03-deployment-actions-data.md){ .md-button .md-button--primary }
