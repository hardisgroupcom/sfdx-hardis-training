---
id: l2-lab-00-refresh
level: 2
lab: 0
lang: en
source_rev: ""
screenshots:
  - vscode/backpromote
  - vscode/backpromote-what
depends_on:
  commands: [hardis:work:backpromote, hardis:work:refresh]
  flags: []
  config: [backpromoteScanLimit]
  panels: [backpromote, pipeline]
  docs: [salesforce-devops-backpromote]
---

# Lab 0 - Your org is behind, catch it up

**Level**: 2 Contributor advanced
**Time**: ~25 min
**You will**: bring three teammates' merged stories into your own dev org, decide what to keep when
the tool asks, and learn what a backpromote will never do for you.

## The situation

You were away for two weeks. While you were gone, three stories were merged into `integration` and
deployed. Your `helios-dev` org still looks like the day you left.

Build your next story on top of that and you will produce a diff full of things that look like
deletions, because your org does not have what everyone else's has. This is the most common way a
contributor accidentally undoes a teammate's work.

## Before you start

- [ ] Level 1 finished, or **Training > Reset this level** on level 2
- [ ] `helios-dev` connected in **Orgs Manager**
- [ ] No uncommitted changes you care about

## Steps

### 1. See how far behind you are

Open the **DevOps Pipeline** panel. Above the `integration` column, the Pull Requests merged since
your last refresh are listed. Three of them.

That list, not your memory, is what tells you whether a refresh is needed.

### 2. Open Backpromote

On the Welcome page, or in **Commands > CI/CD (advanced)**, click **Backpromote**.

![The Backpromote panel](../../_assets/vscode/backpromote.png)

"Backpromote" is the direction that matters: work normally flows **up**, from your branch to
integration to uat to production. A backpromote brings it **down** again, from a major branch into
your own environment, so you are building on what the team has rather than on what you remember.

### 3. Choose what comes down

The panel shows what differs between `integration` and your org, item by item.

![Choosing what the backpromote brings down](../../_assets/vscode/backpromote-what.png)

Go through the list rather than clicking "all":

| What you see                                         | What to do                                                        |
|------------------------------------------------------|-------------------------------------------------------------------|
| Metadata from the three merged stories               | **Take it.** That is the whole point                              |
| Something you are half way through building yourself | **Leave it.** A backpromote would overwrite your work in progress |
| Something you do not recognise at all                | **Take it.** If it is on `integration`, it is the team's truth    |

The rule when you hesitate: `integration` wins. It is the shared reality, and your org is a copy of
it that you are allowed to modify temporarily.

### 4. Run it and read the result

Click **Backpromote**. The panel deploys the selected items into your org and reports each one, with
the deployment actions the merged stories declared.

<details markdown="1"><summary>Under the hood: what Backpromote just did</summary>

The panel ran:

    sf hardis:work:backpromote

which:

1. Fetched `integration` and compared it with your branch
2. Built a plan: the components that differ, and for each one whether it is added, changed or
   removed
3. Deployed the ones you selected into your dev org, using the same deployment engine as the CI
4. Recorded what it did, so a second run does not redo the same work

Three things it deliberately does **not** do, and knowing them saves an afternoon:

- **It does not bring records.** Metadata only. If a teammate's story needed reference data, that
  data is not in your org, and no deployment will ever put it there. Lab 3 is about that exact
  problem
- **It does not undo what you did by hand.** If you changed something in your org that
  `integration` also changed, the deployment overwrites it. That is why you read the list
- **It does not touch the shared orgs.** A backpromote only ever writes to your own environment

</details>

### 5. Write it down

Open `MY-PIPELINE.md` (copy `MY-PIPELINE.template.md` if you have not yet) and add one line under
Level 2:

```markdown
- **Lab 0, backpromote**: took the three merged stories, left my own work in progress alone.
```

The badge audit reads this file. More usefully, it is the note your successor will want.

## What you should see

Open `helios-dev` and check that the metadata from the three merged stories is there. In particular
`Panels_Required__c` and `Crew_Notes__c` from Level 1, if you did Level 1 in a different org.

## If it goes wrong

**The panel says there is nothing to backpromote.**
Your org is already level with `integration`, which happens if you just finished Level 1 in the same
org. Nothing to do: write the line in `MY-PIPELINE.md` and move on.

**The deployment fails on a component that depends on something else.**
Take the whole set rather than a subset. Metadata has dependencies, and half a story often does not
deploy.

**Your own work in progress was overwritten.**
It was in the list and you took it. Rebuild it in the org: it is still in your branch if you
committed it, and the deployment only changed the org.

## Check your work

Welcome page > **Training** > **Check my work**, then pick level 2 and lab 0.

## Go deeper

- [Backpromote](https://sfdx-hardis.cloudity.com/salesforce-devops-backpromote/)

[Next: Lab 1 - US-021 will not deploy](lab-01-missing-dependency.md){ .md-button .md-button--primary }
