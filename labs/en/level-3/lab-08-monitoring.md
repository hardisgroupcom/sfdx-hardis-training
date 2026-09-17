---
id: l3-lab-08-monitoring
level: 3
lab: 8
lang: en
source_rev: ""
screenshots:
  - annotated/vscode/org-monitoring--not-a-monitoring-repo
  - annotated/vscode/monitoring-config--what-it-watches
  - annotated/vscode/org-monitoring--first-report
depends_on:
  commands: [hardis:org:configure:monitoring]
  flags: []
  config: [monitoringCommands, monitoringDisable, notificationConfig, msTeamsWebhookUrl]
  panels: [monitoringConfig, orgMonitoring]
  docs: [salesforce-monitoring-home, salesforce-monitoring-config-github, salesforce-monitoring-grafana-v2]
---

# Lab 8 - Put production under monitoring

**Level**: 3 Release Manager

**Time**: ~35 min

**You will**: set up nightly monitoring on production, read its first report, and decide what is
worth being told about.

## The situation

You now know what shipped and when. You do not know what state production is in between releases.

On an org Sofia ran for two years, that would mean: inactive users still holding licences, a
Connected App nobody remembers authorising, Apex on an API version four years old, a scheduled job
that has been failing every night since March. Nobody is looking, because looking means remembering
to look.

Monitoring is the part of the release manager job that happens when nothing is being released.

## Before you start

- [ ] Lab 7 finished
- [ ] `helios-prod` connected in **Orgs Manager**
- [ ] An empty GitHub repository of your own, with `monitoring` in its name
- [ ] About 20 minutes of the 50 will be the first monitoring run

## Steps

### 1. Create the second repository yourself, first

Monitoring **always** lives in its own repository, separate from the one your pipeline deploys
from. Not usually, not by preference: always. This is the part people get wrong, and it is the part
that is expensive to undo once a year of nightly commits has piled up in the wrong place.

`sf hardis:org:configure:monitoring` does not create that repository for you. It checks the name of
the one it is standing in, and if that name does not contain `monitoring` it asks whether you really
mean to mix monitoring and deployment sources.

**The answer is no.** The question exists because the command cannot be certain from a name alone,
not because the two are alternatives. Answer no, and it stops so you can go and make the right
repository.

So, before anything else: create an empty private repository called
`sfdx-hardis-training-monitoring` on GitHub. Then bring it down the way Level 1 lab 1 brought this
one down: **File > Open Folder** on an empty folder, **Source Control** panel, **Clone Repository**,
and paste the address from the green **Code** button of your new repository. Nothing in this lab
happens in the repository you have been working in all course.

Why two repositories, and it is the same reason real projects do it:

| Reason                | Detail                                                                                                                         |
|-----------------------|--------------------------------------------------------------------------------------------------------------------------------|
| Different permissions | Monitoring holds credentials for production. Every contributor has access to the source repository, and does not need this one |
| Different rhythm      | Monitoring commits every night. Mixing that history with your source history makes both unreadable                             |
| Different content     | Monitoring stores nightly org backups. It grows, and it should not grow inside the repository people clone every day           |

Your source repository and your monitoring repository are two different things with two different
audiences. If you ever find yourself about to answer yes to that question, the right move is to stop
and create the second repository, however late it feels.

### 2. Run the configuration

From the monitoring repository, open the **Org Monitoring Workbench** from the Welcome page and click
**Install Org Monitoring**.

!!! note "No such button?"
    Then you are in the wrong folder. Open the same panel from the repository you have been working
    in all course and you get this instead:

    ![The Org Monitoring Workbench opened from a CI/CD repository](../../_assets/annotated/vscode/org-monitoring--not-a-monitoring-repo.png)

    **Org Monitoring Not Present (CI/CD Repo)** **(1)** is the panel telling you it will not install
    monitoring here, and **Learn More** **(2)** is all it offers. A project that has recorded where
    its monitoring repository lives gets an **Open Monitoring Repository** button beside it. The
    install button only exists where the thing it installs belongs.

It runs in a command panel and asks its questions one at a time, the way Lab 1 did:

1. **Did you configure the monitoring pre-requisites on your Git server?** Answering no opens the
   documentation and ends the command, so read that page first if you have not
2. **Which org do you want to monitor?** - `helios-prod`
3. Then the certificate questions from Lab 1, unchanged: self-signed, let sfdx-hardis configure the
   External Client App, encrypted certificate as a file
4. **Push the monitoring branch to the remote?** - yes
5. **Save the configuration on the remote server?** - yes

It never asks for a repository name, a git provider or a schedule, because it does none of those
three. The authentication is the same code as Lab 1: External Client App, JWT, two secrets to store,
this time in the **monitoring** repository. The key lands in `./.ssh/` rather than
`config/branches/.jwt/`, and the configuration in a `.sfdx-hardis.yml` at the repository root, on a
branch named after the org.

### 3. Choose what it watches

Open the **Monitoring Config Workbench** panel. One row per check, and six columns: **Command**
**(1)**, **Frequency** **(2)**, then **Messaging**, **Email** and **API** **(3)**, which are the
severity each channel is sent at, and a last column of per-row actions.

![The Monitoring Config Workbench, with the list of checks, their frequency and their per-channel routing](../../_assets/annotated/vscode/monitoring-config--what-it-watches.png)

There are around thirty checks, they come from the product rather than from your configuration file,
and they are all on by default at frequencies the product chose: some daily, some weekly, some
monthly. That is the right default and the wrong long-term setting.

For a first run, leave it all on. You are about to find out which of them say something useful about
**this** org, and that is not knowable in advance.

### 4. Run it once by hand

Do not wait for tonight. The generated workflow, **Org Monitoring sfdx-hardis**, is scheduled at
`0 0 * * *` (midnight UTC) and also accepts a manual run, so trigger it from the Actions tab of the
monitoring repository.

It takes a while, most of it the org backup. When it finishes, the repository holds a full source
backup of production and a set of reports.

### 5. Read the first report

Open the **Org Monitoring Workbench** panel in VS Code, pointed at the monitoring repository.

![The Org Monitoring Workbench, opened on the CI/CD repository instead of the monitoring one](../../_assets/annotated/vscode/org-monitoring--first-report.png)

Check the banner first **(1)**. **Org Monitoring Not Present (CI/CD Repo)** means you opened the
wrong folder: this panel reads the monitoring repository, not the one you have been working in all
course. Open the monitoring repository and the banner goes.

Each check is a card, and the two worth opening first are **Detect calls to deprecated API versions**
**(2)** and **Detect unsecured Connected Apps in an org** **(3)**.

Be honest about what you are looking at. `helios-prod` is a Developer Edition org that is a few days
old, with one user in it and an app you deployed yourself. Nothing seeds it with the findings a
two-year-old org has, and a report that comes back nearly clean is not a broken report.

What you are reading for is the **shape** of each finding, so that you recognise it on a real org:

| Finding on a real org           | What it actually means                                                     |
|---------------------------------|----------------------------------------------------------------------------|
| **Inactive users still active** | Licences being paid for, and accounts that can still log in                |
| **An unsecured Connected App**  | Something can reach your production data and nobody remembers approving it |
| **Apex on an old API version**  | It will break at a Salesforce release, on a date you do not control        |

The one finding you should genuinely expect here is in the **backup** rather than in a check: the
`Needs Reinspection` picklist value from Lab 7 is in the org, and now it is in the monitoring
repository's git history, dated. That is the answer to "when did that change", and it is the part of
monitoring that pays for itself first.

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

Back in the **Monitoring Config Workbench**, the **Messaging**, **Email** and **API** columns hold
the severity each channel is sent at, per check. Set them so that only failures and critical findings
are sent. A nightly "everything is fine" message is read for a week and filtered forever after.

Those settings are written as `notificationConfig` in the monitoring repository's `.sfdx-hardis.yml`,
one entry per notification type, merged over the product's defaults.

### 8. Write down where it lives

In `MY-PIPELINE.md`:

```markdown
- **Lab 8, monitoring**: https://github.com/<your-handle>/sfdx-hardis-training-monitoring
  Runs nightly at midnight UTC on helios-prod. Notifications go to <channel>. Silenced: <check>,
  because <reason>.
```

The badge audit looks for that URL. The next release manager will need it on their first day.

<details markdown="1"><summary>Under the hood: what runs every night</summary>

The command was:

    sf hardis:org:configure:monitoring

and it copied in the CI files for **every** git provider at once, not only GitHub. The workflow it
generated for GitHub has four jobs:

1. **Backup** runs first, on its own: `sf hardis:org:monitor:backup` retrieves the whole org in
   source format and commits it. The git history of that repository becomes an answer to "what
   changed in production, and when", which nothing else gives you. It also regenerates the project
   documentation as it goes
2. Then three jobs in parallel, each waiting only on the backup: `sf hardis:org:test:apex`,
   MegaLinter, and `sf hardis:org:monitor:all`

`monitor:all` is where the checks live. It runs the `sf hardis:org:diagnose:*` commands itself, one
per check, then applies the thresholds and sends the notifications. You will not find them listed in
the workflow.

`monitoringCommands` in the monitoring repository's `.sfdx-hardis.yml` is **not** the list of checks:
the list is built into the product, around thirty of them, and this key only overrides entries by key
or appends new ones. Leaving it empty still runs everything. `monitoringDisable` is the per-check
off switch, by name, and setting a check's `frequency` to `off` does the same thing.
`notificationConfig` decides what is sent where, and at what severity.

The nightly backup is the underrated part. When somebody asks "when did that validation rule
change", the answer is a `git log` on the monitoring repository, and it works even for changes
nobody made through the pipeline.

If your organisation runs Grafana, the results can feed [ready-made
dashboards](https://sfdx-hardis.cloudity.com/salesforce-monitoring-grafana-v2/). That is out of
scope here, and worth knowing exists.

</details>

## What you should see

- A second repository, created by you, with a green **Org Monitoring sfdx-hardis** workflow run
- A full source backup of `helios-prod` committed in it
- A first report you have read and triaged, however short it is
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
Expected on a first run against any real org, and unlikely on a Developer Edition org a few days
old. Step 6 is the lab either way.

**The command refuses to run.**
You answered no to the question about mixing monitoring and deployment sources, which is the right answer. You are in the CI/CD repository: go back to step 1 and make the monitoring one.

## Check your work

Welcome page > **Training: Level 3** > **Check my work**, then pick lab 8.

## Go deeper

- [Org Monitoring](https://sfdx-hardis.cloudity.com/salesforce-monitoring-home/)
- [Monitoring on GitHub](https://sfdx-hardis.cloudity.com/salesforce-monitoring-config-github/)
- [Grafana dashboards](https://sfdx-hardis.cloudity.com/salesforce-monitoring-grafana-v2/)

[Next: Lab 9 - Generate the project documentation](lab-09-documentation.md){ .md-button .md-button--primary }
