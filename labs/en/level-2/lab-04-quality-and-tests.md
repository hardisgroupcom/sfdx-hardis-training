---
id: l2-lab-04-quality-and-tests
level: 2
lab: 4
lang: en
source_rev: ""
screenshots:
  - vscode/devops-pipeline
depends_on:
  commands: [hardis:work:save, hardis:project:deploy:smart]
  flags: []
  config: [testLevel, apexTestsMinCoverageOrgWide, testCoverageNotBlocking]
  panels: [apexTestsSelect, pipeline]
  docs: [salesforce-devops-solve-megalinter-errors, salesforce-devops-work-on-user-story-development]
---

# Lab 4 - US-027 fails the quality gate and the tests

**Level**: 2 Contributor advanced
**Time**: ~45 min
**You will**: get blocked twice by robots, fix both properly rather than around them, and learn to
run the checks before pushing.

## The situation

> **US-027 - Schedule installations by panel batch availability**
>
> As a planner, I want the scheduler to refuse a date before the panels arrive, so that crews stop
> turning up to an empty warehouse.

An Apex change in `InstallationScheduler`. Two things will stop you, and neither is Salesforce
refusing your metadata:

1. **PMD**, through MegaLinter, on a query inside a loop that you are about to write by copying an
   existing pattern. It **warns**
2. **Code coverage**, because the new branch of logic has no test. It **blocks**

Both are the project's rules, not Salesforce's. Knowing which of your gates warn and which refuse is
half of working on a pipeline, so this lab makes you meet one of each.

## Before you start

- [ ] Lab 3 finished and merged
- [ ] Comfortable enough with Apex to read fifteen lines of it

## Steps

### 1. Take the story

**New User Story**, branch `US-027-schedule-by-availability`, target `integration`, org
`helios-dev`.

### 2. Write the change the way people actually write it

Open `force-app/main/default/classes/InstallationScheduler.cls` and add a method. The planner wants
to check several installations at once, so you write the obvious thing:

```apex
    /**
     * The installations from the list that can be scheduled on the given day.
     *
     * @param installationIds the installations to check
     * @param wanted the day the planner wants
     * @return the ids that can take a crew that day
     */
    public static List<Id> schedulableOn(List<Id> installationIds, Date wanted) {
        List<Id> allowed = new List<Id>();
        for (Id installationId : installationIds) {
            for (Panel_Batch__c batch : [
                SELECT Arrival_Date__c
                FROM Panel_Batch__c
                WHERE Installation__c = :installationId
                ORDER BY Arrival_Date__c DESC
                LIMIT 1
            ]) {
                if (batch.Arrival_Date__c != null && wanted >= batch.Arrival_Date__c.addDays(PREPARATION_DAYS)) {
                    allowed.add(installationId);
                }
            }
        }
        return allowed;
    }
```

Publish, push, open the Pull Request.

### 3. MegaLinter warns you

```
InstallationScheduler.cls:56  pmd:OperationWithLimitsInLoop  (Moderate)
Avoid operations in loops that may hit governor limits
```

A SOQL query inside a `for` loop. Salesforce allows 100 queries per transaction, so this method
works perfectly for a planner checking five installations and throws
`System.LimitException: Too many SOQL queries: 101` the first time somebody checks a hundred and
one. It will pass every test you write and fail on a busy Monday.

The fix is the one Apex pattern worth knowing by heart: **query once, outside the loop, and index
what you get back**.

```apex
    public static List<Id> schedulableOn(List<Id> installationIds, Date wanted) {
        Map<Id, Date> latestArrival = new Map<Id, Date>();
        for (Panel_Batch__c batch : [
            SELECT Installation__c, Arrival_Date__c
            FROM Panel_Batch__c
            WHERE Installation__c IN :installationIds
            AND Arrival_Date__c != null
            ORDER BY Arrival_Date__c ASC
        ]) {
            latestArrival.put(batch.Installation__c, batch.Arrival_Date__c);
        }
        List<Id> allowed = new List<Id>();
        for (Id installationId : installationIds) {
            Date arrival = latestArrival.get(installationId);
            if (arrival != null && wanted >= arrival.addDays(PREPARATION_DAYS)) {
                allowed.add(installationId);
            }
        }
        return allowed;
    }
```

One query, whatever the size of the list.

!!! note "This one warns, it does not block"
    The Apex analyzer is non blocking on this project: your Pull Request is still mergeable with
    that finding on it. Nothing stops you shipping the loop except reading the comment. That is a
    deliberate choice a project makes, and it is why the next step is the one that actually refuses.

### 4. The tests block you

Push the fix. MegaLinter is clean. Now the deployment check **fails**, and this one is not advice:

```
Code coverage of InstallationScheduler is 71%, below the required 75%
```

You added a method with three branches and no test. Add them to
`force-app/main/default/classes/InstallationSchedulerTest.cls`:

```apex
    @isTest
    static void schedulableOnRefusesBeforeThePanelsArrive() {
        Installation__c inst = [SELECT Id FROM Installation__c LIMIT 1];
        Test.startTest();
        List<Id> tooEarly = InstallationScheduler.schedulableOn(new List<Id>{ inst.Id }, Date.today());
        List<Id> lateEnough = InstallationScheduler.schedulableOn(new List<Id>{ inst.Id }, Date.today().addDays(60));
        Test.stopTest();
        System.assert(tooEarly.isEmpty(), 'The crew cannot be sent before the panels arrive');
        System.assertEquals(1, lateEnough.size(), 'A date after the buffer is allowed');
    }

    @isTest
    static void schedulableOnIgnoresInstallationsWithNoBatch() {
        Installation__c lonely = new Installation__c(Status__c = 'Planned', External_Id__c = 'TEST-INST-003');
        insert lonely;
        Test.startTest();
        List<Id> allowed = InstallationScheduler.schedulableOn(new List<Id>{ lonely.Id }, Date.today().addDays(30));
        Test.stopTest();
        System.assert(allowed.isEmpty(), 'With no panel batch, nothing can be scheduled');
    }
```

Note what the assertions do: they check the **behaviour the story asked for**, with a message that
says why. A test that only runs the code to lift a percentage is worse than no test, because it
makes the number lie.

### 5. Run the checks before pushing this time

Two round trips through CI to find two things you could have found in two minutes locally. Do it
the other way round from now on.

**Apex tests**: in **Commands > Org Monitoring**, click **Run Apex tests**, and pick `helios-dev`.
It runs the org's Apex tests and checks the same coverage threshold the pipeline checks, so you get
the pass, the fail and the percentage without pushing anything. From a terminal it is
`sf hardis:org:test:apex`.

!!! note "The Apex Tests tab is a different thing"
    A Pull Request in the **DevOps Pipeline** panel can show an **Apex Tests (n) (beta)** tab. It
    runs nothing. It picks which test classes that Pull Request's deployment will run, and it only
    appears on projects that set `enableDeploymentApexTestClasses`. Helios does not: it runs
    `RunLocalTests`, every test in the org, every time.

**Linters**: run MegaLinter locally once, from a terminal:

```bash
npx mega-linter-runner --flavor salesforce
```

The first run downloads a container image and takes a few minutes. Every run after that is fast,
and it is exactly what the CI runs.

### 6. Push and merge

Both green. Merge, and check `helios-integration`.

<details markdown="1"><summary>Under the hood: where these two gates come from</summary>

**The coverage gate** is `config/.sfdx-hardis.yml`:

    testLevel: RunLocalTests
    apexTestsMinCoverageOrgWide: 75
    testCoverageNotBlocking: false

`RunLocalTests` runs every test in the org except managed package ones. The threshold is checked
**org-wide**, not per class, which is why one badly covered class can be carried by the rest of the
org for a while and then suddenly block somebody else's Pull Request. 75% is the Salesforce
minimum; most real projects set 80 or 85.

`testCoverageNotBlocking: true` turns the gate into a warning. It exists for projects taking over a
legacy org, and it is a temporary measure, not a setting.

**The linters** are MegaLinter, configured in `.mega-linter.yml`. The Salesforce flavour runs PMD
through Salesforce Code Analyzer on Apex, plus a flow scanner, plus the generic linters. It runs on
the whole repository for a Pull Request into a major branch, which is why a rule can fire on a file
you did not write.

Neither gate is Salesforce refusing your deployment. Both are your team refusing it, which is the
point: Salesforce is happy to deploy a hardcoded id.

</details>

## What you should see

- The MegaLinter check reporting no findings
- The deployment check green, with coverage above 75% in the comment
- `schedulableOn` in `helios-integration`, with one query outside the loop

## If it goes wrong

**MegaLinter fails on files you never touched.**
It lints the whole repository for a Pull Request into a major branch. If a pre-existing problem
surfaces, fix it: you are the one who found it. If it is genuinely out of scope, the escape hatch is
a documented exclusion in `.mega-linter.yml`, never a blanket disable.

**Coverage is still below the threshold after adding tests.**
Coverage is org-wide. Look at the per-class table in the Pull Request comment: another class may be
dragging the average down.

**The local MegaLinter run does nothing.**
It needs Docker. Without Docker, run **Run Apex tests** locally and let the CI run the linters.

**The Apex tests pass locally and fail in CI.**
Almost always data. Your dev org has records the integration org does not, or the other way round.
A test that needs data must create it with `@testSetup`, never rely on what happens to be there.

## Check your work

Welcome page > **Training** > **Check my work**, then pick level 2 and lab 4.

## Go deeper

- [Solve MegaLinter errors](https://sfdx-hardis.cloudity.com/salesforce-devops-solve-megalinter-errors/)
- [Development guidelines](https://sfdx-hardis.cloudity.com/salesforce-devops-work-on-user-story-development/)

[Next: Lab 5 - US-033, your Profile change disappeared](lab-05-profiles-overwrites.md){ .md-button .md-button--primary }
