---
id: l1-lab-00-setup
level: 1
lab: 0
lang: en
source_rev: ""
screenshots:
  - annotated/web/vscode-download
  - annotated/web/nodejs-download
  - annotated/web/vscode-marketplace
  - annotated/vscode/welcome--first-open
  - annotated/vscode/welcome--setup-button
  - annotated/vscode/setup
  - annotated/web/sf-signup
  - annotated/vscode/orgs-manager
  - annotated/vscode/welcome--training-menu
depends_on:
  commands: [hardis:org:data:import]
  flags: []
  config: [customCommands, customCommandsPosition]
  panels: [welcome, setup, orgManager]
  docs: [salesforce-devops-use-install, vscode-extension]
---

# Lab 0 - Install the tools and seed your orgs

**Level**: 1 Contributor basics
**Time**: ~30 min
**You will**: get a working workstation and two Salesforce orgs that already contain the Helios
Delivery app and its data, without typing a single command.

## The situation

Your first morning. Somebody sends you a repository link and says "set yourself up, we will give
you a ticket after lunch". At Helios that means: the tools, and two orgs. One to build in, and the
shared integration org the team merges into.

## Before you start

- [ ] A computer where you can install software
- [ ] A GitHub account
- [ ] Two working email addresses, or one address that supports plus-addressing

## Steps

### 1. Install VS Code and the extension

Open [Visual Studio Code](https://code.visualstudio.com/) and take the download for your machine.
On Windows that is the **Windows** button **(1)**; the two cards next to it hold the macOS and Linux
builds.

![The Visual Studio Code download page, one card per operating system](../../_assets/annotated/web/vscode-download.png)

Then [Node.js](https://nodejs.org/), version 20 or later. Two things to get right on that page:

1. the version selector, left on **LTS** **(1)**
2. **Windows Installer (.msi)** **(2)**, or the equivalent for your machine

![The Node.js download page, with the version selector and the installer buttons](../../_assets/annotated/web/nodejs-download.png)

Both are next-next-finish installers.

Then open VS Code, click the **Extensions** icon in the left bar, type `sfdx-hardis`, and click
**Install** on **sfdx-hardis** by Cloudity. Its page on the Visual Studio Marketplace carries the
same **Install** button **(1)**, if you would rather start from your browser.

![The sfdx-hardis extension page on the Visual Studio Marketplace](../../_assets/annotated/web/vscode-marketplace.png)

A new icon appears in the left bar **(1)**. Click it: the **Welcome** tab **(2)** opens, and that
tab is where every lab of this course starts.

![VS Code with the sfdx-hardis Welcome tab open](../../_assets/annotated/vscode/welcome--first-open.png)

### 2. Let the Setup panel install the rest

You need the Salesforce CLI and a few plugins. You are not going to install them by hand: the
extension has a panel that checks what is missing and installs it.

On the Welcome page, the button at the top left of the header band **(1)** opens the Setup panel.
There is no card called Setup: the button is labelled with the state of your dependencies, so it
reads **Check in progress** while it is still looking, then either **Dependencies up to date** or
**N update(s) needed**. Hover it and the tooltip says **Open Setup**. Wait for the check to finish,
then click it.

![The Welcome page header, with the dependency-state button at its left](../../_assets/annotated/vscode/welcome--setup-button.png)

The panel lists every dependency the pipeline needs, with the version you have and the version
that is current:

1. **Salesforce CLI** - the `sf` command everything else runs on
2. **sfdx-hardis** - the plugin that adds the User Story commands
3. **SFDMU** - loads and extracts records, which is how your orgs get their data
4. **sfdx-git-delta** - computes what changed between two commits, used by the deployments
5. **Salesforce Extension Pack** - the official Salesforce tooling for VS Code

![The Setup panel, listing every dependency with its version](../../_assets/annotated/vscode/setup.png)

A dependency that is already fine is green and offers only **Re-check** **(3)**. One that is missing
or out of date carries its own **Upgrade** button **(2)**, and **Run pending installs** **(1)** does
the whole list in one go. Use that one: the panel queues the installations and reports each as it
finishes.

This takes a few minutes. It is the longest part of this lab and the only one you never repeat.

<details markdown="1"><summary>Under the hood: what the Setup panel just did</summary>

For each missing dependency it ran the plain npm command you would have run yourself, for example:

    npm install --global @salesforce/cli
    sf plugins install sfdx-hardis
    sf plugins install sfdmu
    sf plugins install sfdx-git-delta

then re-ran `sf version` and `sf plugins` and compared the answers with the versions published on
the npm registry. That comparison is the whole point of the panel: a pipeline breaks in confusing
ways when one person is two major versions behind, and nobody notices until a deployment fails.

</details>

### 3. Create your two Developer Edition orgs

Go to [developer.salesforce.com/signup](https://developer.salesforce.com/signup) and sign up
**twice**. Free, unlimited, no credit card.

The form asks for your first name, last name, job title, company and country or region, then three
things that decide whether the signup goes through:

1. **Work email** **(1)**
2. the tick that accepts the master subscription agreement **(2)**
3. **Sign me up** **(3)**

![The Salesforce Developer Edition signup form](../../_assets/annotated/web/sf-signup.png)

You do not choose a username: it is generated and sent to you.

**Work email** is the field that decides whether the second signup works. It must be a real
address you can open, because the signup is confirmed by email, and the two orgs cannot share one
address. If you only have one, use plus-addressing: `you+heliosdev@example.com` and
`you+heliosinteg@example.com` both arrive in the same inbox for most providers.

Name them so you can tell them apart later:

| Org             | What it is for                                              |
|-----------------|-------------------------------------------------------------|
| your first org  | your own development environment, where you build           |
| your second org | the shared integration org, where the team's work is merged |

Open each confirmation email and set a password. The email also carries the username Salesforce
generated for that org: it looks like an email address but it is not one, and it is what you log in
with, what `sf org login` authenticates, and what you will type into the pipeline configuration in
Lab 1. Keep both usernames somewhere.

!!! note "A Developer Edition org never expires, but it is deactivated after a long period of inactivity. Finish a level within a few weeks and you will never meet that."

### 4. Connect both orgs in Orgs Manager

Back in VS Code, on the Welcome page, click **Orgs Manager**.

![The Orgs Manager table, with the Helios orgs and their connection state](../../_assets/annotated/vscode/orgs-manager.png)

1. Click **Add Org** **(1)**
2. Leave the login URL on **Production / Developer Edition** (`login.salesforce.com`), because a
   Developer Edition org is not a sandbox
3. Give it the alias `helios-dev`
4. Your browser opens the Salesforce login page. Sign in with the first org, and allow access
5. Repeat for the second org, with the alias `helios-integration`

Both orgs now appear in the table, under the alias you gave them **(2)**, with a green **Connected**
**(3)**. **This panel is how you authenticate to an org for the rest of the course.** Whenever a lab
says "connect an org" or "switch to an org", this is where you do it, and it is also how you check
which org you are pointed at, which saves more confusion than anything else in this training.

<details markdown="1"><summary>Under the hood: what connecting an org just did</summary>

The panel ran:

    sf org login web --alias helios-dev --instance-url https://login.salesforce.com

which opened your browser, let Salesforce authenticate you, and stored an OAuth refresh token in
your user profile (`~/.sfdx`). Nothing is stored in the project, and nothing is committed: the
credential is yours and stays on your machine.

The alias is the name everything else uses. `sf org display --target-org helios-dev` works from
now on, and so does every sfdx-hardis command with `--target-org helios-dev`.

</details>

### 5. Get the repository

You need the training project on your machine before you can seed the orgs from it.

1. Open [the training repository](https://github.com/hardisgroupcom/sfdx-hardis-training) and
   click **Fork**, top right, then **Create fork**. You now have your own copy
2. In VS Code, **File > Open Folder**, pick an empty folder, then use the Source Control panel to
   clone your fork into it

Lab 1 goes through forking and cloning properly, with what each step means. For now you only need
the files.

### 6. Seed each org

Open the Welcome page again. Above the built-in cards there is a **CUSTOM MENUS** heading **(1)**,
holding a single card: **Training (custom)** **(2)**.

![The Welcome page, with the CUSTOM MENUS group and the Training card](../../_assets/annotated/vscode/welcome--training-menu.png)

!!! note "Why the card says \"Training (custom)\""
    The extension appends `(custom)` to every menu a project declares in its own
    `config/.sfdx-hardis.yml`, so you can always tell a project's commands from the ones the
    product ships. The rest of these labs call it the **Training** menu.

Click it, then click **Set up one of my training orgs**.

The command asks which org. Pick `helios-dev`. It then:

1. Deploys the Helios Delivery app into the org
2. Grants you the **Helios Delivery Manager** permission set
3. Loads 40 accounts, 60 contacts, 25 opportunities, 30 installations and 80 panel batches
4. Tells you what it put there

Run it a second time for `helios-integration`.

Each org takes a few minutes, most of it the metadata deployment. It is not stuck.

<details markdown="1"><summary>Under the hood: what "Set up one of my training orgs" just did</summary>

The card runs one command, declared by this project in `config/.sfdx-hardis.yml` under
`customCommands`:

    node scripts/training.mjs seed

which in turn runs three real commands against the org you picked:

    sf project deploy start --source-dir force-app --target-org helios-dev --wait 60
    sf org assign permset --name Helios_Delivery_Manager --target-org helios-dev
    sf hardis:org:data:import --path scripts/data/HeliosBaseline --target-org helios-dev

The order matters, and not in the way you would guess. A metadata deployment grants **no field
level security to anybody**, not even to a System Administrator. Load the data before assigning the
permission set and the load fails on fields the running user cannot see, with an error message that
says nothing about permissions. That is why step 2 sits between the deployment and the data.

The data load is an **upsert on an external id**, so running the card twice updates the same 235
records instead of creating 470. Anything in this course that can be run twice, can be run twice.

</details>

## What you should see

Open `helios-dev` from the Orgs Manager panel (the **Open** button next to the org). In Salesforce,
click the App Launcher, find **Helios Delivery**, and open the **Installations** tab.

You should see 30 installations with names like `INST-00001`, each linked to an account, with a
status and an install date. Open one: the **Panel delivery timeline** component on the right lists
the pallets booked for that job.

That is the app you are going to change.

## If it goes wrong

**The Setup panel says a dependency is still missing after installing it.**
Close and reopen VS Code. The panel reads your PATH, and a freshly installed global npm package is
not on the PATH of a terminal that was already open.

**The org signup email never arrives.**
Check spam, then check the address you typed in **Work email**. If you are signing up the second
org with the same address as the first, Salesforce refuses it: use plus-addressing.

**The deployment fails with "This org does not have the required feature".**
You signed up for something other than a Developer Edition, most likely a Trailhead Playground with
a restricted edition. Sign up again at
[developer.salesforce.com/signup](https://developer.salesforce.com/signup).

**The data load fails on `Installation__c` with an external id message.**
The permission set was not assigned. Run **Training > Set up one of my training orgs** again on the
same org: it repeats safely and the second run fixes it.

## Check your work

Welcome page > **Training** > **Check my work**, then pick level 1 and lab 0.

## Go deeper

- [Install the tools](https://sfdx-hardis.cloudity.com/salesforce-devops-use-install/)
- [The VS Code extension](https://sfdx-hardis.cloudity.com/vscode-extension/)
- [Data workspaces with SFDMU](https://sfdx-hardis.cloudity.com/salesforce-devops-agent-data-workspaces/)

[Next: Lab 1 - Fork the repository and connect your pipeline](lab-01-fork-and-connect.md){ .md-button .md-button--primary }
