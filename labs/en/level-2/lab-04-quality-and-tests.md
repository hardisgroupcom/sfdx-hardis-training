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

An Apex change in `InstallationScheduler`. Two things will stop you, and neither is about
Salesforce refusing your metadata:

1. **PMD**, through MegaLinter, on a hardcoded id you are about to introduce by copying an existing
   pattern
2. **Code coverage**, because the new branch of logic has no test

Both are the project's rules, not Salesforce's. Both exist because somebody got burned.

## Before you start

- [ ] Lab 3 finished and merged
- [ ] Comfortable enough with Apex to read fifteen lines of it

## Steps

### 1. Take the story

**New User Story**, branch `US-027-schedule-by-availability`, target `integration`, org
`helios-dev`.

### 2. Write the change the way people actually write it

Open `force-app/main/default/classes/InstallationScheduler.cls` and add a method. You are going to
copy the shape of something that already exists nearby, because that is what everyone does:

```apex
    /**
     * Whether this installation can be scheduled on the given day: the panels have
     * to have arrived, plus the preparation buffer.
     *
     * @param installationId the installation to check
     * @param wanted the day the planner wants
     * @return true when the crew can be sent that day
     */
    public static Boolean canScheduleOn(Id installationId, Date wanted) {
        // Standard record type of Installation, same id in every org
        Id standardRecordType = '0125f000000XyZaAAK';
        Date earliest = earliestInstallDate(installationId);
        if (earliest == null) {
            return false;
        }
        return wanted >= earliest;
    }
```

Publish, push, open the Pull Request.

### 3. MegaLinter blocks you

```
InstallationScheduler.cls:42  AvoidHardcodedId  Avoid hardcoding Salesforce IDs
```

The comment says "same id in every org". It is not. Record type ids, profile ids, queue ids and
every other Salesforce id are **generated per org**. A hardcoded id works in the org it was copied
from and silently misbehaves everywhere else, which is the most expensive kind of bug this pipeline
exists to catch.

Fix it by asking the org rather than remembering:

```apex
    public static Boolean canScheduleOn(Id installationId, Date wanted) {
        Date earliest = earliestInstallDate(installationId);
        if (earliest == null) {
            return false;
        }
        return wanted >= earliest;
    }
```

In this case the variable was not used at all, which is the other thing copy-paste does. If you do
need a record type id, the way to get it is:

```apex
Id standardRecordType = Schema.SObjectType.Installation__c
    .getRecordTypeInfosByDeveloperName()
    .get('Standard')
    .getRecordTypeId();
```

### 4. The tests block you

Push the fix. MegaLinter passes. Now the deployment check fails:

```
Code coverage of InstallationScheduler is 71%, below the required 75%
```

You added a method with three branches and no test. Add them to
`force-app/main/default/classes/InstallationSchedulerTest.cls`:

```apex
    @isTest
    static void canScheduleOnRefusesBeforeThePanelsArrive() {
        Installation__c inst = [SELECT Id FROM Installation__c LIMIT 1];
        Test.startTest();
        Boolean tooEarly = InstallationScheduler.canScheduleOn(inst.Id, Date.today());
        Boolean lateEnough = InstallationScheduler.canScheduleOn(inst.Id, Date.today().addDays(60));
        Test.stopTest();
        System.assertEquals(false, tooEarly, 'The crew cannot be sent before the panels arrive');
        System.assertEquals(true, lateEnough, 'A date after the buffer is allowed');
    }

    @isTest
    static void canScheduleOnIsFalseWithoutAnyBatch() {
        Installation__c lonely = new Installation__c(Status__c = 'Planned', External_Id__c = 'TEST-INST-003');
        insert lonely;
        Test.startTest();
        Boolean allowed = InstallationScheduler.canScheduleOn(lonely.Id, Date.today().addDays(30));
        Test.stopTest();
        System.assertEquals(false, allowed, 'With no panel batch, nothing can be scheduled');
    }
```

Note what the assertions do: they check the **behaviour the story asked for**, with a message that
says why. A test that only runs the code to lift a percentage is worse than no test, because it
makes the number lie.

### 5. Run the checks before pushing this time

Two round trips through CI to find two things you could have found in two minutes locally. Do it
the other way round from now on.

**Apex tests**: open the **Apex Tests** panel, select `InstallationSchedulerTest`, and run it
against `helios-dev`. You get the pass or fail and the coverage without pushing anything.

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

- The MegaLinter check green
- The deployment check green, with coverage above 75% in the comment
- `canScheduleOn` in `helios-integration`, with no hardcoded id anywhere in the class

## If it goes wrong

**MegaLinter fails on files you never touched.**
It lints the whole repository for a Pull Request into a major branch. If a pre-existing problem
surfaces, fix it: you are the one who found it. If it is genuinely out of scope, the escape hatch is
a documented exclusion in `.mega-linter.yml`, never a blanket disable.

**Coverage is still below the threshold after adding tests.**
Coverage is org-wide. Look at the per-class table in the Pull Request comment: another class may be
dragging the average down.

**The local MegaLinter run does nothing.**
It needs Docker. Without Docker, use the Apex Tests panel locally and let the CI run the linters.

**The Apex tests pass locally and fail in CI.**
Almost always data. Your dev org has records the integration org does not, or the other way round.
A test that needs data must create it with `@testSetup`, never rely on what happens to be there.

## Check your work

Welcome page > **Training** > **Check my work**, then pick level 2 and lab 4.

## Go deeper

- [Solve MegaLinter errors](https://sfdx-hardis.cloudity.com/salesforce-devops-solve-megalinter-errors/)
- [Development guidelines](https://sfdx-hardis.cloudity.com/salesforce-devops-work-on-user-story-development/)

[Next: Lab 5 - US-033, your Profile change disappeared](lab-05-profiles-overwrites.md){ .md-button .md-button--primary }
