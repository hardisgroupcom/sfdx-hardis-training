---
id: l2-lab-01-missing-dependency
level: 2
lab: 1
lang: en
source_rev: ""
screenshots:
  - vscode/devops-pipeline
depends_on:
  commands: [hardis:work:new, hardis:work:save, hardis:project:deploy:smart]
  flags: [--check]
  config: []
  panels: [pipeline, packageXml]
  docs: [salesforce-devops-solve-deployment-errors, salesforce-devops-retrieve]
---

# Lab 1 - US-021 will not deploy: a missing dependency

**Level**: 2 Contributor advanced
**Time**: ~50 min
**You will**: meet your first failing deployment check, read the error properly, and find the cause
in a file most people never open.

## The situation

> **US-021 - Warn the planner when a crew is too small**
>
> As a planner, I want a warning on the installation when the assigned crew is smaller than the job
> needs, so that I fix it before the van leaves.

Straightforward: a record-triggered flow that compares `Crew_Size__c` with what the panels
require. You build it, you publish it, and the check fails with an error about a field that is
right there in front of you in the org.

This lab is about the gap between "it exists in my org" and "it is in the package".

## Before you start

- [ ] Lab 0 finished
- [ ] `helios-dev` level with `integration`

## Steps

### 1. Take the story

**New User Story**, branch `US-021-crew-size-warning`, target `integration`, org `helios-dev`.

### 2. Build the warning flow

First, the field the flow needs so it does not warn twice. In `helios-dev`,
**Setup > Object Manager > Installation > Fields & Relationships > New**:

| Setting       | Value                  |
|---------------|------------------------|
| Data Type     | **Checkbox**           |
| Field Label   | `Crew Warning Sent`    |
| Field Name    | `Crew_Warning_Sent__c` |
| Default Value | Unchecked              |

Then the flow. **Setup > Flows > New Flow > Record-Triggered Flow**:

| Setting          | Value                                                         |
|------------------|---------------------------------------------------------------|
| Object           | `Installation`                                                |
| Trigger          | A record is created or updated                                |
| Entry conditions | `Crew Size` is not null **and** `Panels Required` is not null |
| Optimize for     | Actions and Related Records                                   |
| Flow Label       | `Installation Crew Warning`                                   |
| Flow API Name    | `Installation_Crew_Warning`                                   |

Inside, add a **Decision** named `Crew Too Small` whose outcome condition is a
formula:

```
AND(
  {!$Record.Crew_Size__c} * 8 < {!$Record.Panels_Required__c},
  NOT({!$Record.Crew_Warning_Sent__c})
)
```

On that outcome, add a **Create Records** element that creates a Task on the installation's owner,
subject `Crew may be too small for this installation`, then an **Update Records** element that sets
`Crew Warning Sent` to true on the triggering record.

Save and **Activate**.

Test it: open an installation, set `Panels Required` to 40 and `Crew Size` to 2, save. A task
appears, and the checkbox ticks. Save again: no second task. That is the story working, in your
org.

### 3. Publish and watch it fail

**Save / Publish User Story**. Select the flow, and the `Crew_Warning_Sent__c` field.

Push, open the Pull Request into `integration` in your fork, and wait.

The check fails:

```
Error: Installation_Crew_Warning - The flow references a field that does not exist:
Installation__c.Crew_Warning_Sent__c
```

Read that twice. The field **does** exist. You can see it in the org. You created it ten minutes
ago and the flow you just tested reads it.

### 4. Read the package before you read anything else

When a deployment says something does not exist, the first question is never "is it in the org".
It is **"is it in the package"**.

Open `manifest/package.xml`. It lists your flow. It does not list
`Installation__c.Crew_Warning_Sent__c`.

The integration org is being sent a flow that reads a field the package does not carry, and the
integration org does not have that field either. From Salesforce's point of view the error is
exactly right.

So why is the field not in the package? `hardis:work:save` generates the package from the git diff,
and the field is not in the diff, because the field never reached `force-app` at all. Look for it
on disk under `force-app/main/default/objects/Installation__c/fields/`: it is not there, even
though you selected it when publishing.

### 5. Find why the field never reached the repository

Open `.forceignore` at the root of the repository.

```
# Local artifacts, never versioned
**/jsconfig.json
...
# Temporary technical fields from the 2025 capacity spike, not versioned.
# TODO remove once the spike is over  (Sofia, 2025-11)
**/objects/Installation__c/fields/Crew_W*.field-meta.xml
```

Sofia left a year ago. The spike is long over. The pattern she wrote for her `Crew_Workaround__c`
field is still there, and it matches every field on Installation whose name starts with `Crew_W`,
including the one you created this morning.

`.forceignore` tells the Salesforce CLI what to ignore when retrieving **and** when deploying. A
component listed there is invisible in both directions, with no error and no warning: the retrieve
quietly skipped your field, the publish quietly built a package without it, and the first thing
that noticed was Salesforce, in the integration org, three steps later.

### 6. Fix it

Delete the stale pattern. If you would rather keep Sofia's field excluded, name it
exactly instead of guessing with a wildcard:

```
**/objects/Installation__c/fields/Crew_Workaround__c.field-meta.xml
```

An exact path ages badly too, but it ages **loudly**: the day the file disappears, nothing else
starts being ignored.

Then retrieve your field properly. Open the **Metadata Retriever** panel, search for
`Installation__c.Crew_Warning_Sent__c`, and retrieve it. It appears under
`force-app/main/default/objects/Installation__c/fields/`.

### 7. Publish again

**Save / Publish User Story** again. `manifest/package.xml` now lists both the field and the flow.
Push. The check goes green.

<details markdown="1"><summary>Under the hood: why the error said what it said</summary>

The check job ran:

    sf hardis:project:deploy:smart --check

which computed the package from the git diff between your branch and `integration`, then handed it
to Salesforce as a validation deployment. Salesforce compiled the flow, looked for
`Installation__c.Crew_Warning_Sent__c` in the package **and** in the target org, found it in
neither, and refused.

The important part is the order of the two questions:

1. **Is it in the package?** `manifest/package.xml`, and behind it the git diff, and behind that
   `.forceignore`
2. **Is it in the target org?** Only ask this once the answer to the first is yes

Most deployment errors that say "does not exist" are question 1, and most people spend twenty
minutes on question 2 first. `.forceignore` is where the trail usually ends, because it is the one
file that makes metadata invisible without any error anywhere.

</details>

## What you should see

- `manifest/package.xml` listing `Installation__c.Crew_Warning_Sent__c` and
  `Installation_Crew_Warning`
- The Pull Request check green
- After the merge, the flow present and active in `helios-integration`

## If it goes wrong

**The retrieve brings nothing.**
The `.forceignore` change was not saved, or the pattern still matches. Check it by retrieving again
and looking for the file on disk.

**The check now fails on the flow being inactive.**
Salesforce will not deploy an active flow over an active flow of the same version in some
configurations. Deactivate the old version in the target org, or bump the flow version in your org
and retrieve again.

**The check fails on a Task field.**
Your Create Records element sets a field the integration org does not have, because you picked
something specific to your org. Simplify: subject and WhatId are enough.

## Check your work

Welcome page > **Training** > **Check my work**, then pick level 2 and lab 1.

## Go deeper

- [Solve deployment errors](https://sfdx-hardis.cloudity.com/salesforce-devops-solve-deployment-errors/)
- [Source retrieve issues](https://sfdx-hardis.cloudity.com/salesforce-devops-retrieve/)

[Next: Lab 2 - US-024, green deployment, broken records](lab-02-deployment-actions-apex.md){ .md-button .md-button--primary }
