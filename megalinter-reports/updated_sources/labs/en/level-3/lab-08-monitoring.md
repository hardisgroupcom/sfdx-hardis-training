---
id: l3-lab-08-monitoring
level: 3
lab: 8
lang: en
source_rev: ""
screenshots:
  - vscode/monitoring-config
  - vscode/org-monitoring
depends_on:
  commands: [hardis:org:configure:monitoring]
  flags: []
  config: [monitoringCommands, monitoringDisable, notificationConfig, msTeamsWebhookUrl]
  panels: [monitoringConfig, orgMonitoring]
  docs: [salesforce-monitoring-home, salesforce-monitoring-config-github, salesforce-monitoring-grafana-v2]
---

# Lab 8 - Put production under monitoring

**Level**: 3 Release Manager
**Time**: ~50 min
**You will**: set up nightly monitoring on production, read its first report, and decide what is
worth being told about.

## The situation

You now know what shipped and when. You do not know what state production is in between releases.

Today: inactive users still holding licences, a Connected App nobody remembers authorising, Apex on
an API version four years old, a scheduled job that has been failing every night since March.
Nobody is looking, because looking means remembering to look.

Monitoring is the part of the release manager job that happens when nothing is being released.

## Before you start

- [ ] Lab 7 finished
- [ ] `helios-prod` connected in **Orgs Manager**
- [ ] About 20 minutes of the 50 will be the first monitoring run

## Steps

### 1. Understand what this creates before you run it

`sf hardis:org:configure:monitoring` creates a **second, separate repository**. That surprises
people, so here is why, and it is the same reason real projects do it:

| Reason                | Detail                                                                                                                         |
|-----------------------|--------------------------------------------------------------------------------------------------------------------------------|
| Different permissions | Monitoring holds credentials for production. Every contributor has access to the source repository, and does not need this one |
| Different rhythm      | Monitoring commits every night. Mixing that history with your source history makes both unreadable                             |
| Different content     | Monitoring stores nightly org backups. It grows, and it should not grow inside the repository people clone every day           |

Your source repository and your monitoring repository are two different things with two different
audiences.

### 2. Run the configuration

Open the **Monitoring Config** panel.

![The Monitoring Config panel](../../_assets/vscode/monitoring-config.png)

Answer:

1. **Which org?** - `helios-prod`
2. **Repository name** - `sfdx-hardis-training-monitoring`, or whatever you prefer
3. **Git provider** - GitHub
4. **Schedule** - nightly, at an hour when nobody is deploying

It creates the repository, generates the workflow, and sets up authentication to `helios-prod` the
same way Lab 1 did: External Client App, JWT, secrets. You already know that part.

### 3. Choose what it watches

The panel lists what monitoring can check. Everything is on by default, which is the right default
and the wrong long-term setting.

For a first run, leave it all on. You are about to find out which of them say something useful about
**this** org, and that is not knowable in advance.

### 4. Run it once by hand

Do not wait for tonight. Trigger the workflow from the Actions tab of the new repository.

It takes a while, most of it the org backup. When it finishes, the repository holds a full source
backup of production and a set of reports.

### 5. Read the first report

Open the **Org Monitoring** panel in VS Code, pointed at the monitoring repository.

![The Org Monitoring panel, reading the monitoring results](../../_assets/vscode/org-monitoring.png)

On the seeded Helios production org you will find at least:

| Finding                                         | What it actually means                                                     |
|-------------------------------------------------|----------------------------------------------------------------------------|
| **2 inactive users** still active in Salesforce | Licences being paid for, and two accounts that can still log in            |
| **An unsecured Connected App**                  | Something can reach your production data and nobody remembers approving it |
| **Apex on an old API version**                  | It will break at a Salesforce release, on a date you do not control        |

### 6. Decide what is noise, which is the actual skill

This is the step that decides whether monitoring survives six months.

Go through every finding and put it in one of three buckets:

| Bucket                     | What you do                                                 | Example                                 |
|----------------------------|-------------------------------------------------------------|-----------------------------------------|
| **Act now**                | Fix it this week                                            | The unsecured Connected App             |
| **Track**                  | Put it in the backlog as a story                            | The old API version                     |
| **Silence, with a reason** | Turn it off in the configuration, with a comment saying why | A check that does not apply to this org |

**Silencing is legitimate.** A monitoring report with forty findings that nobody acts on is worse
than no monitoring, because it teaches the team that the report is noise. A report with four
findings that all matter gets read every morning.

What is not legitimate is silencing something because it is inconvenient. Write the reason in the
configuration file, and the next person can disagree with you knowingly.

### 7. Route one notification

A report nobody opens is not monitoring.

Configure **one** channel: Slack, Teams, Google Chat or email. One is enough, and more than one on
day one means the same message arriving twice and being ignored in both places.

Set the threshold so that only failures and critical findings are sent. A nightly "everything is
fine" message is read for a week and filtered forever after.

### 8. Write down where it lives

In `MY-PIPELINE.md`:

```markdown
- **Lab 8, monitoring**: https://github.com/<your-handle>/sfdx-hardis-training-monitoring
  Runs nightly at 02:00 on helios-prod. Notifications go to <channel>. Silenced: <check>, because
  <reason>.
```

The badge audit looks for that URL. The next release manager will need it on their first day.

<details markdown="1"><summary>Under the hood: what runs every night</summary>

The command was:

    sf hardis:org:configure:monitoring

and the workflow it generated runs, nightly:

1. `sf hardis:org:monitor:backup` - retrieves the whole org in source format and commits it. The git
   history of that repository becomes an answer to "what changed in production, and when", which
   nothing else gives you
2. `sf hardis:org:diagnose:*` - the checks: inactive users, unsecured Connected Apps, API versions,
   release updates, legacy API usage, org limits, and more
3. `sf hardis:org:monitor:all` - collects the results, applies the thresholds, and sends the
   notifications

`monitoringCommands` in the monitoring repository's `.sfdx-hardis.yml` is the list of checks, and
each one can be disabled with `monitoringDisable`. `notificationConfig` decides what is sent where,
and at what severity.

The nightly backup is the underrated part. When somebody asks "when did that validation rule
change", the answer is a `git log` on the monitoring repository, and it works even for changes
nobody made through the pipeline.

If your organisation runs Grafana, the results can feed [ready-made
dashboards](https://sfdx-hardis.cloudity.com/salesforce-monitoring-grafana-v2/). That is out of
scope here, and worth knowing exists.

</details>

## What you should see

- A second repository, with a green scheduled workflow
- A full source backup of `helios-prod` committed in it
- A first report with at least three findings
- One notification channel configured, and the URL in `MY-PIPELINE.md`

## If it goes wrong

**The monitoring workflow fails at authentication.**
Same as Lab 1: the External Client App needs the user pre-authorised, and the secrets have to be in
the **monitoring** repository, not the source one.

**The backup times out.**
A large org takes a long time. On a Developer Edition org it should not, so if it does, look at
which metadata type it is stuck on and exclude it.

**Notifications never arrive.**
The webhook is wrong, or the threshold is above what the report produced. Lower the threshold
temporarily to prove the channel works, then raise it again.

**The report has forty findings.**
Expected on a first run against any real org. Step 6 is the lab.

## Check your work

Welcome page > **Training** > **Check my work**, then pick level 3 and lab 8.

## Go deeper

- [Org Monitoring](https://sfdx-hardis.cloudity.com/salesforce-monitoring-home/)
- [Monitoring on GitHub](https://sfdx-hardis.cloudity.com/salesforce-monitoring-config-github/)
- [Grafana dashboards](https://sfdx-hardis.cloudity.com/salesforce-monitoring-grafana-v2/)

[Next: Lab 9 - Generate the project documentation](lab-09-documentation.md){ .md-button .md-button--primary }
