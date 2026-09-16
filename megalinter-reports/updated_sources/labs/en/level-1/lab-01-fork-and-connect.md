---
id: l1-lab-01-fork-and-connect
level: 1
lab: 1
lang: en
source_rev: ""
screenshots:
  - vscode/devops-pipeline
  - vscode/pipeline-config
depends_on:
  commands: []
  flags: []
  config: [developmentBranch, availableTargetBranches, targetUsername, instanceUrl]
  panels: [pipeline, pipelineConfig, orgManager]
  docs: [salesforce-devops-git-tokens, salesforce-devops-clone-repository, salesforce-devops-setup-auth-github]
---

# Lab 1 - Fork the repository and connect your pipeline

**Level**: 1 Contributor basics
**Time**: ~45 min
**You will**: own a copy of the Helios repository, wire it to your integration org, and read the
pipeline diagram that tells you which branch deploys where.

## The situation

The Helios team works in one repository. You are not going to push to it: you work in **your own
copy**, and so does everyone in this course. By the end of this lab, a Pull Request opened in your
copy will really deploy to an org you own.

## Before you start

- [ ] Lab 0 finished: both orgs connected in **Orgs Manager** and seeded
- [ ] The project open in VS Code, with the sfdx-hardis panel showing

## Steps

### 1. Fork the repository

Open [github.com/hardisgroupcom/sfdx-hardis-training](https://github.com/hardisgroupcom/sfdx-hardis-training),
click **Fork** at the top right, then **Create fork**.

Leave every option at its default. In particular, **do not** tick "Copy the `main` branch only":
this course needs the other branches.

You now own `github.com/<your-handle>/sfdx-hardis-training`. Everything from here happens there.

!!! warning "Why you never push to the shared repository"
    Two reasons, and both are hard limits rather than etiquette. A Pull Request opened **from** a
    fork cannot read the original repository's secrets, so its CI could never reach a Salesforce
    org. And a few hundred learners opening Pull Requests on one repository would bury it. The
    shared repository's only inbound traffic is badge claims.

### 2. Turn Actions on

**GitHub disables Actions on every new fork** until the owner says otherwise. If you skip this,
your Pull Request checks will silently never run and you will conclude the course is broken.

In your fork, click the **Actions** tab. GitHub shows a yellow banner:

> Workflows aren't being run on this forked repository

Click **I understand my workflows, go ahead and enable them**.

### 3. Clone your fork

In VS Code, close the folder you opened in Lab 0 if it was not your fork, then:

1. **File > Open Folder**, pick an empty folder
2. Open the **Source Control** panel (the branch icon in the left bar)
3. Click **Clone Repository**, paste your fork URL, and pick the folder

When VS Code asks, click **Open** to work in the cloned folder.

If GitHub asks you to authenticate, let VS Code handle it: **Sign in with your browser** is enough.
You do not need a personal access token for this course, and you should not create one unless you
want to.

<details markdown="1"><summary>Under the hood: what cloning did</summary>

VS Code ran:

    git clone https://github.com/<your-handle>/sfdx-hardis-training.git

and then, because you opened the folder, the sfdx-hardis extension read three things it needs:

- `sfdx-project.json`, which says the Salesforce sources live in `force-app`
- `config/.sfdx-hardis.yml`, the project configuration: major branches, cleaning rules, the
  Training menu
- `config/branches/.sfdx-hardis.integration.yml`, the branch configuration: which org the
  `integration` branch deploys to

The extension reads them again whenever they change, so you never have to reload the window.

</details>

### 4. Look at the pipeline before touching anything

On the Welcome page, click **DevOps Pipeline**.

![The DevOps Pipeline panel showing the Helios branches and orgs](../../_assets/vscode/devops-pipeline.png)

This diagram is the single most useful thing in the extension. Read it top to bottom:

1. **`integration`** is the only major branch this project has today. It is where every contributor
   merges, and it deploys to the integration org
2. Your **feature branches** appear as small boxes feeding into it
3. The **Pull Requests** waiting on it are listed with their CI job status
4. **`uat`** and **`main`** exist as branches but are **not** part of the pipeline. Nobody wired
   them. That is not an accident: finishing this pipeline is what Level 3 is about

The branch you work on, and the org it ends up in, are the two facts that matter. Everything else
in this course is detail.

!!! note "About the two warnings at the bottom"
    The panel warns that `integration` has no merge target, and that there is no certificate key
    file for it. Both are correct, and both are deliberate.

    The missing merge target is the missing rest of the pipeline: `uat` and `main` are not wired,
    and Level 3 lab 0 wires them. The missing certificate is the proper CI authentication, which
    Level 3 lab 1 sets up and which you are about to replace with a shortcut in step 6.

    A panel that tells you what is not finished is doing its job. Read these warnings on your own
    projects: they are usually right.

### 5. Tell the integration branch which org it deploys to

The repository does not know your orgs: it cannot, they did not exist when it was written. You
declare them once.

In the DevOps Pipeline panel, find the **integration** column, click its menu, and choose
**Settings**.

![The pipeline configuration screen for a branch](../../_assets/vscode/pipeline-config.png)

Fill in two fields with the values of your **second** org, the integration one:

1. **Target username** - the org username, the one that looks like
   `you.helios.integration@heliostraining.invalid`
2. **Instance URL** - `https://login.salesforce.com`

Save. If you are unsure of the username, open **Orgs Manager**: it is the column next to the alias.

<details markdown="1"><summary>Under the hood: what the Settings screen wrote</summary>

It edited one file, `config/branches/.sfdx-hardis.integration.yml`:

    targetUsername: you.helios.integration@heliostraining.invalid
    instanceUrl: https://login.salesforce.com
    mergeTargets: []

sfdx-hardis has three layers of configuration, and this is the middle one:

| Layer   | File                                        | Who it applies to           |
|---------|---------------------------------------------|-----------------------------|
| project | `config/.sfdx-hardis.yml`                   | everyone, committed         |
| branch  | `config/branches/.sfdx-hardis.<branch>.yml` | one major branch, committed |
| user    | `config/user/.sfdx-hardis.<username>.yml`   | you only, git-ignored       |

A branch file is committed on purpose: on a real project, everybody has to agree on which org
`integration` means.

</details>

### 6. Give the CI a way into your org

Your Pull Request check runs on GitHub's machines, not yours. It has no idea who you are, so you
have to give it a credential.

The proper way is an External Client App with a JWT certificate. It takes about an hour, and it is
Level 3 lab 1. For a throwaway Developer Edition org you created twenty minutes ago, sfdx-hardis
supports a shortcut, and this is the **one place in the whole course** where you copy a command.

Open a terminal in VS Code (**Terminal > New Terminal**) and run:

```bash
sf org auth show-sfdx-auth-url --target-org helios-integration --no-prompt --json
```

Copy the value of `sfdxAuthUrl` from the answer. It starts with `force://`.

Then in your fork on GitHub:

1. **Settings > Secrets and variables > Actions**
2. **New repository secret**
3. Name: `SFDX_AUTH_URL_INTEGRATION`
4. Value: the `force://...` string you copied
5. **Add secret**

!!! danger "This is a deliberate exception, and you should know why"
    An SFDX auth URL embeds a **long-lived OAuth refresh token**. Anyone who reads it has your org
    until you revoke it, and it cannot be rotated without authenticating again. The sfdx-hardis
    documentation says plainly: [never use it for a major
    org](https://sfdx-hardis.cloudity.com/salesforce-devops-setup-auth/).

    That guidance is right, and it is about real major orgs. Here the org is a throwaway Developer
    Edition holding fictional solar installations, in a repository you own, for a course. The
    trade is: a beginner reaches a working pipeline in their first hour instead of their second
    day.

    **Level 3 lab 1 sets up JWT properly for all three orgs, and deletes this secret.** If you only
    ever do Levels 1 and 2, delete the secret and the orgs when you are done.

<details markdown="1"><summary>Under the hood: how sfdx-hardis uses that secret</summary>

Before any deployment, the CI job calls the sfdx-hardis authentication hook. It looks for
`SFDX_AUTH_URL_<ALIAS>`, where `<ALIAS>` is the **branch name in upper case**. On the `integration`
branch that is `SFDX_AUTH_URL_INTEGRATION`, which is why the name is not arbitrary.

When it finds one containing `force://`, it writes it to a temporary file and runs:

    sf org login sfdx-url -f <temp file> --alias integration

and skips JWT entirely. When it does **not** find one, it falls back to the certificate flow and
looks for `SFDX_CLIENT_ID_INTEGRATION` and `SFDX_CLIENT_KEY_INTEGRATION`, which is what Level 3
sets up.

That is the whole mechanism. One environment variable decides which of the two paths runs.

</details>

## What you should see

Back in the DevOps Pipeline panel, click **Refresh**. The `integration` column now names your org
under the branch name. That link, branch to org, is what the rest of this course rests on.

## If it goes wrong

**The Actions tab shows no workflows.**
You skipped step 2, or you ticked "Copy the `main` branch only" when forking. Delete the fork and
fork again, leaving the defaults.

**`sf org auth show-sfdx-auth-url` says the org is not authenticated.**
The alias is wrong. Open **Orgs Manager** and check the exact alias of your integration org, then
use that after `--target-org`.

**The pipeline diagram is empty.**
The extension did not find `config/.sfdx-hardis.yml`. You opened the wrong folder: it must be the
root of the clone, the folder that directly contains `sfdx-project.json`.

**VS Code cannot push and asks for credentials in a loop.**
Sign out of GitHub in VS Code (**Accounts** icon, bottom left) and sign in again with your browser.

## Check your work

Welcome page > **Training** > **Check my work**, then pick level 1 and lab 1.

## Go deeper

- [Clone the repository](https://sfdx-hardis.cloudity.com/salesforce-devops-clone-repository/)
- [Create a Git access token](https://sfdx-hardis.cloudity.com/salesforce-devops-git-tokens/)
- [GitHub Actions authentication](https://sfdx-hardis.cloudity.com/salesforce-devops-setup-auth-github/)

[Next: Lab 2 - Take US-014 from the backlog](lab-02-new-user-story.md){ .md-button .md-button--primary }
