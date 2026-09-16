---
id: l1-lab-05-pull-request
level: 1
lab: 5
lang: en
source_rev: ""
screenshots:
  - vscode/devops-pipeline
  - vscode/pipeline-pr-modal
depends_on:
  commands: [hardis:project:deploy:smart]
  flags: [--check]
  config: [testLevel, apexTestsMinCoverageOrgWide]
  panels: [pipeline]
  docs: [salesforce-devops-pull-request-github, salesforce-devops-handle-merge-request-results, salesforce-devops-solve-megalinter-errors]
---

# Lab 5 - Open the Pull Request, get it green, merge

**Level**: 1 Contributor basics
**Time**: ~45 min
**You will**: have a robot check your work before a human does, fix what it finds, and put US-014
into the shared integration org.

## The situation

Your branch is on GitHub. Now you ask for it to be merged, and something interesting happens: before
anybody looks at it, a job takes your changes, deploys them **as a check** into the integration org
without committing anything, runs the tests, runs the linters, and writes the result back on the
Pull Request.

That is the whole point of this way of working. You find out your deployment fails while it is
still yours to fix, not on release night.

## Before you start

- [ ] Lab 4 finished: the branch is pushed to your fork
- [ ] Actions enabled on your fork (Lab 1, step 2)
- [ ] `SFDX_AUTH_URL_INTEGRATION` set as a repository secret (Lab 1, step 6)

## Steps

### 1. Open the Pull Request

In the **DevOps Pipeline** panel, find your branch and click **Create Pull Request**. The extension
opens GitHub on the right page, with base and head already filled in.

![Creating the Pull Request from the DevOps Pipeline panel](../../_assets/vscode/pipeline-pr-modal.png)

Check two things before clicking, every single time:

1. **base** is `integration`, in **your** fork
2. **compare** is `features/US-014-panels-required`

!!! danger "Check the base repository"
    GitHub defaults the base of a fork's Pull Request to the **original** repository. If the base
    says `hardisgroupcom/sfdx-hardis-training`, click it and change it to your own fork. A Pull
    Request opened upstream cannot reach your org, will never turn green, and adds noise to a
    repository a few hundred other learners are using.

The title and body are already filled in from what you wrote in Lab 4. Click **Create pull
request**.

### 2. Watch the check run

Scroll to the bottom of the Pull Request. Within a minute, checks appear:

| Check                               | What it does                                                                                |
|-------------------------------------|---------------------------------------------------------------------------------------------|
| **Check deployment to integration** | Deploys your metadata into `helios-integration` in validation mode, and runs the Apex tests |
| **MegaLinter**                      | Runs the code quality linters on the repository                                             |

Click **Details** on the deployment check and read the log while it runs. You will see it
authenticate with your secret, compute the package, and start a deployment.

### 3. Read the sfdx-hardis comment

When the check finishes, sfdx-hardis posts a comment on the Pull Request. It is the most useful
thing on the page, and it has several sections:

1. **The result**, success or failure, with the deployment id
2. **The list of deployed components**, which should be your three
3. **The Apex test results and coverage**
4. **Quality warnings**, if the linters found anything

### 4. Fix the warning

Your Pull Request is green, but MegaLinter reports one finding on a file you did not write:

```
InstallationScheduler.cls:46  pmd:AvoidDebugStatements  (Moderate)
Avoid debug statements since they impact on performance
```

Open `force-app/main/default/classes/InstallationScheduler.cls` and look at line 46:

```apex
// Left over from debugging the October planning incident. Harmless, and it
// has been in every release since.
System.debug('installationsReadyToSchedule called');
```

Somebody added it during an incident a year ago and never took it out. It is real technical debt,
it is not blocking, and you could ignore it. Do not.

Two reasons the rule exists, and neither is tidiness:

- **Every `System.debug` costs time in production**, on every execution, whether or not anybody is
  reading a log
- **A debug line is where data leaks.** This one prints nothing sensitive. The next one somebody
  copies from it might

Delete the three lines. Commit from the **Source Control** panel with the message
`US-014 remove a leftover debug statement`, and push. The checks run again on their own.

!!! note "Why the warning appeared now and not before"
    MegaLinter runs on the whole repository for every Pull Request into a major branch, so a
    pre-existing problem surfaces on the first Pull Request anybody opens. That is how legacy debt
    actually behaves on a real project: it waits until someone comes near it.

!!! tip "Why this one does not block you"
    The Apex analyzer is configured as **non blocking** on this project: it reports, it does not
    refuse. The deployment check and the test coverage do refuse, and you meet both at Level 2.
    A project decides that balance for itself, in `.mega-linter.yml`.

### 5. Merge

Both checks green, the comment says success. Click **Merge pull request**, then **Confirm merge**.

Then delete the branch. GitHub offers a button for it. A merged branch that stays around is one
more thing in everyone's list for no benefit.

### 6. Watch the real deployment

Merging into `integration` starts a second job, and this one is not a check: it deploys for real.

Go to the **Actions** tab of your fork and open the running **Deploy to integration** job. When it
finishes, open `helios-integration` from **Orgs Manager** and look at an installation.

`Panels Required` is there. You built it in one org and it arrived in another, and you never
deployed anything by hand.

<details markdown="1"><summary>Under the hood: what the two jobs ran</summary>

The Pull Request check ran:

    sf hardis:project:deploy:smart --check

`--check` is a **validation deployment**: Salesforce compiles everything, runs the tests and
reports what it would do, then throws the result away. Your org is not modified. That is why it is
safe to run on every push.

The job after the merge ran the same command **without** `--check`, against the same org. Same
code, same configuration, one flag apart. A check that passes and a deployment that then fails is
rare, and when it happens it is almost always because somebody changed the target org by hand in
between.

Both jobs authenticate first, through the sfdx-hardis hook that reads
`SFDX_AUTH_URL_INTEGRATION` from your repository secrets (Lab 1). The workflow files are in
`.github/workflows/`, and they are worth reading once: they are about thirty lines each.

The test level comes from `config/.sfdx-hardis.yml`:

    testLevel: RunLocalTests
    apexTestsMinCoverageOrgWide: 75

`RunLocalTests` runs every test in the org except those from managed packages. 75% is the Salesforce
minimum, and most real projects set it higher.

</details>

## What you should see

- The Pull Request merged, with a green sfdx-hardis comment above the merge
- The **Deploy to integration** job green in the Actions tab
- `Panels Required` present on the Installation object in `helios-integration`

That is one full delivery loop. Every story for the rest of your life on this project is this loop.

## If it goes wrong

**The checks never start.**
Actions are still disabled on your fork. Lab 1, step 2.

**The check fails at authentication:** *No authentication found for org integration*.
The secret is missing, misnamed, or truncated. It must be named exactly
`SFDX_AUTH_URL_INTEGRATION` and its value must start with `force://`. Recreate it and push an empty
commit to re-trigger.

**The check fails with `INVALID_CROSS_REFERENCE_KEY` on the permission set.**
The permission set grants a field that is not in your package. You unticked the field but kept the
permission set. Redo Lab 4 and select both.

**The check is stuck as "Expected".**
The workflow is waiting for a job that will never run, usually because the base of the Pull Request
is the original repository and not your fork. Close it and open it again with the right base.

**The deployment succeeds but the field is not in the org.**
Look at the deployed components list in the comment. If the field is not there, it is not in
`manifest/package.xml`, and Lab 4 step 4 is where that is decided.

## Check your work

Welcome page > **Training** > **Check my work**, then pick level 1 and lab 5.

## Go deeper

- [Create the Pull Request on GitHub](https://sfdx-hardis.cloudity.com/salesforce-devops-pull-request-github/)
- [Check the Pull Request results](https://sfdx-hardis.cloudity.com/salesforce-devops-handle-merge-request-results/)
- [Solve MegaLinter errors](https://sfdx-hardis.cloudity.com/salesforce-devops-solve-megalinter-errors/)

[Next: Capstone - Deliver US-016 on your own](lab-06-capstone.md){ .md-button .md-button--primary }
