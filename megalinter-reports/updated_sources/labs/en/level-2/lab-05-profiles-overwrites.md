---
id: l2-lab-05-profiles-overwrites
level: 2
lab: 5
lang: en
source_rev: ""
screenshots:
  - vscode/pipeline-config
depends_on:
  commands: [hardis:work:save]
  flags: []
  config: [autoCleanTypes, minimizeProfiles, autoRemoveUserPermissions, packageNoOverwritePath]
  panels: [pipelineConfig, packageXml]
  docs: [salesforce-devops-work-on-user-story-profiles, salesforce-devops-config-overwrite]
---

# Lab 5 - US-033: your Profile change disappeared

**Level**: 2 Contributor advanced
**Time**: ~40 min
**You will**: chase a permission that vanishes between a green deployment and the target org, and
find out it was removed on purpose.

## The situation

> **US-033 - Crews can read the panel batch cost**
>
> As a delivery crew member, I want to see the cost of the batch I am installing, so that I report
> damage with the right value.

You grant the permission, publish, the check is green, the deployment is green, and the permission
is not in the integration org. Nothing failed. Nothing warned you.

This is the failure mode that makes people distrust a pipeline, and it is entirely explainable.

## Before you start

- [ ] Lab 4 finished and merged
- [ ] `helios-dev` level with `integration`

## Steps

### 1. Take the story and do it the way an admin would

**New User Story**, branch `US-033-batch-cost-visibility`, target `integration`, org `helios-dev`.

In `helios-dev`, the quick way: **Setup > Object Manager > Panel Batch > Fields & Relationships >
Cost > Set Field-Level Security**, tick **Visible** for the **System Administrator** profile and for
whatever profile your crew users have.

That is how most people grant a permission, and it is what this lab is built on.

Publish, selecting the Profile you changed. Push, Pull Request, green, merge.

### 2. Discover that nothing happened

Open `helios-integration`, log in as a crew user or check the field-level security on **Panel Batch
> Cost**. The permission is not there.

Go back to the Pull Request. The comment says success. Look at the list of deployed components: the
Profile is not in it.

### 3. Read your own diff

Open the commit in your branch and look at what was actually committed for the Profile.

Almost nothing. The Profile file is there, but the field permission you added is gone, along with
most of the rest of it.

`hardis:work:save` did that, deliberately, before committing. It is the `minimizeProfiles` cleaning
rule declared in `config/.sfdx-hardis.yml`:

```yaml
autoCleanTypes:
  - minimizeProfiles
  ...
```

### 4. Understand why a project would ever do that

Profiles are the single worst metadata type to version, for three reasons that all bite at once:

1. **They are enormous and they are shared.** One Profile file lists every object, field, tab, app
   and class permission in the org. Two people touching two unrelated stories both produce a
   thousand-line diff of the same file, and they conflict every time
2. **They are not additive.** Deploying a Profile replaces the whole thing. If your file was
   retrieved before a colleague's permission existed, deploying yours **removes theirs**, silently
3. **What you retrieve depends on your package.** A Profile is retrieved with only the permissions
   for the components in your package, so the same Profile looks different depending on who
   retrieved it and when

`minimizeProfiles` strips from Profiles everything that a Permission Set could carry instead,
leaving Profiles to hold only what genuinely cannot live anywhere else: login hours, IP ranges,
default record types, page layout assignments.

So the pipeline did not lose your work. It refused to carry it, because carrying it would eventually
delete somebody else's.

### 5. Do it the way the project expects

Redo the grant where it belongs.

In `helios-dev`: **Setup > Permission Sets > Helios Delivery Crew > Object Settings > Panel Batches
> Edit**, tick **Read Access** on `Cost`, **Save**.

Publish again, selecting the **Permission Set** this time. Read `manifest/package.xml`: it lists
`Helios_Delivery_Crew`. Push, green, merge.

Now check `helios-integration`. The permission is there.

### 6. Look at the other protection while you are here

Open the **DevOps Pipeline** panel, then the project **Settings**.

![Project configuration in the DevOps Pipeline panel](../../_assets/vscode/pipeline-config.png)

Two settings on this screen do related jobs, and it is worth knowing which is which:

| Setting                            | What it protects against                                                                                                             |
|------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------|
| `autoCleanTypes: minimizeProfiles` | A Profile carrying permissions that belong on a Permission Set                                                                       |
| `autoRemoveUserPermissions`        | Specific user permissions that must never travel between orgs at all, whatever carries them                                          |
| `packageNoOverwritePath`           | Components that exist in the target org and must never be overwritten by a deployment, listed in `manifest/package-no-overwrite.xml` |

The third one is the overwrite manager, and it is the one to reach for when a component is
deliberately different in each org: a named credential pointing at a different endpoint, a custom
setting holding an environment-specific value, a remote site setting.

### 7. Write it down

In `MY-PIPELINE.md`, under Level 2, add a line saying what you learned. Something like:

```markdown
- **Lab 5, profiles**: permissions go on Permission Sets. minimizeProfiles strips them from
  Profiles before the commit, so a Profile grant is silently dropped rather than deployed.
```

<details markdown="1"><summary>Under the hood: what cleaning actually did to the file</summary>

`hardis:work:save` retrieved the Profile, then ran the cleaning pass before committing. For
`minimizeProfiles` it rewrote the Profile XML, keeping only:

- `loginHours`, `loginIpRanges`
- `layoutAssignments`
- `recordTypeVisibilities` marked as default
- `custom`, `userLicense`, and the identity of the Profile

and removing every `fieldPermissions`, `objectPermissions`, `classAccesses`, `pageAccesses`,
`tabVisibilities` and `userPermissions` entry.

Nothing was removed from your org. The cleaning changes **what the repository carries**, never what
Salesforce holds. Your admin-style grant is still in `helios-dev`, which is exactly why the lab
asks you to do it again on the Permission Set rather than to fix the file by hand.

The rule to take away: **if a permission can live on a Permission Set, put it there.** This is not
an sfdx-hardis opinion, it is what Salesforce has been recommending for years, and this pipeline
enforces it rather than hoping.

</details>

## What you should see

- `manifest/package.xml` listing `Helios_Delivery_Crew`, not a Profile
- `Cost` readable by the crew in `helios-integration`
- No Profile file with meaningful permissions in your branch

## If it goes wrong

**The permission set edit does not show the Cost field.**
The field is not in the permission set's object settings until the object is granted. Grant read on
**Panel Batch** first.

**The deployment fails with `INSUFFICIENT_ACCESS` on the permission set.**
The CI user cannot grant a permission it does not have itself. Assign **Helios Delivery Manager** to
the integration org user, which **Training > Set up one of my training orgs** does.

**A Profile keeps coming back in your commits.**
Something in your selection pulls it in. Do not fight it in the file: untick it at publish time.

## Check your work

Welcome page > **Training** > **Check my work**, then pick level 2 and lab 5.

## Go deeper

- [Profiles and Permission Sets](https://sfdx-hardis.cloudity.com/salesforce-devops-work-on-user-story-profiles/)
- [Overwrite management](https://sfdx-hardis.cloudity.com/salesforce-devops-config-overwrite/)

[Next: Lab 6 - Marco merged first](lab-06-conflicts.md){ .md-button .md-button--primary }
