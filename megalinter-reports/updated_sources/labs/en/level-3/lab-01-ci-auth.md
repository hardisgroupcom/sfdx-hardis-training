---
id: l3-lab-01-ci-auth
level: 3
lab: 1
lang: en
source_rev: ""
screenshots:
  - vscode/orgs-manager
  - vscode/command-runner-question
depends_on:
  commands: [hardis:project:configure:auth]
  flags: []
  config: [orgAuthenticationMode, targetUsername, instanceUrl]
  panels: [orgManager, commandExecution, promptInput]
  docs: [salesforce-devops-setup-auth, salesforce-devops-setup-auth-github]
---

# Lab 1 - Wire CI authentication for three orgs

**Level**: 3 Release Manager
**Time**: ~60 min
**You will**: replace the shortcut Level 1 gave you with the credential a real project uses, for all
three orgs, and delete the shortcut.

## The situation

Your CI reaches `helios-integration` through `SFDX_AUTH_URL_INTEGRATION`, a secret containing a
long-lived OAuth refresh token. Level 1 told you it was a deliberate exception for a throwaway org
and that you would fix it here.

This is here.

Three things are wrong with an auth URL on a real project, and they are worth being able to say out
loud because somebody will ask you why you are spending an hour on this:

1. **It cannot be rotated.** Changing it means authenticating interactively again, as a human, in a
   browser. There is no unattended rotation
2. **It is a bearer credential with no scope.** Anyone who reads the secret has everything that user
   has, from anywhere, until it is revoked
3. **It is tied to a person.** When that person leaves or their password policy resets their token,
   the pipeline stops, and nobody knows why

The alternative is a **JWT flow through an External Client App**: a certificate you hold, a
pre-authorised user, no password anywhere, and revocation by deleting one app.

## Before you start

- [ ] Lab 0 finished: three major branches with their orgs
- [ ] All four orgs connected in **Orgs Manager**
- [ ] `openssl` available (it ships with Git for Windows, macOS and Linux)

!!! note "This lab is about the CI, not your workstation"
    Your own connection to these orgs already exists and is not changing. Orgs Manager keeps
    working exactly as before. What you are setting up is how a **GitHub runner**, which is not you
    and has no browser, reaches the org.

## Steps

### 1. Run the configuration command for integration

In **Commands > CI/CD (advanced)**, click **Configure Org CI Authentication**.

![A sfdx-hardis command asking its questions in the extension](../../_assets/vscode/command-runner-question.png)

It asks, one screen at a time:

1. **Which major branch?** - `integration`
2. **Which org?** - the `helios-integration` org, picked from the list of connected orgs
3. **Certificate storage mode** - **encrypted certificate in the repository**

Let it run. It takes a couple of minutes.

### 2. Read what it produced

The command wrote several things, and you should look at each one:

| What                              | Where                                                           | What it is                                                     |
|-----------------------------------|-----------------------------------------------------------------|----------------------------------------------------------------|
| A certificate and key pair        | `config/branches/.jwt/integration.key` (encrypted) and a `.crt` | The credential itself                                          |
| An External Client App definition | in the org, created for you                                     | What Salesforce authenticates against                          |
| Branch configuration              | `config/branches/.sfdx-hardis.integration.yml`                  | `targetUsername`, `instanceUrl`, and the app's consumer key    |
| Two values to store as secrets    | printed in the terminal                                         | `SFDX_CLIENT_ID_INTEGRATION` and `SFDX_CLIENT_KEY_INTEGRATION` |

The private key committed to the repository is **encrypted**, with the passphrase held as
`SFDX_CLIENT_KEY_INTEGRATION`. The repository alone is not enough to authenticate, which is what
makes committing it acceptable.

### 3. Store the secrets in your fork

In your fork: **Settings > Secrets and variables > Actions > New repository secret**, twice:

| Name                          | Value                                |
|-------------------------------|--------------------------------------|
| `SFDX_CLIENT_ID_INTEGRATION`  | the consumer key the command printed |
| `SFDX_CLIENT_KEY_INTEGRATION` | the passphrase the command printed   |

The `<ALIAS>` suffix is **the branch name in upper case**. That is the entire convention, and it is
why the names are not arbitrary.

### 4. Finish the org authorisation by hand

sfdx-hardis creates the External Client App, but one step needs a human in Salesforce Setup, and it
is the step people forget:

In `helios-integration`: **Setup > External Client Apps > sfdx-hardis > Policies > Edit**, set
**Permitted Users** to *Admin approved users are pre-authorised*, and **Save**. Then, under
**Profiles** or **Permission Sets**, add the profile of the user the CI authenticates as.

Without this, the JWT flow fails with `user hasn't approved this consumer`, which is an accurate
message that reads like a bug.

### 5. Do the same for uat and main

Run the command twice more, once for each branch and org. Store four more secrets:

- `SFDX_CLIENT_ID_UAT`, `SFDX_CLIENT_KEY_UAT`
- `SFDX_CLIENT_ID_MAIN`, `SFDX_CLIENT_KEY_MAIN`

And pre-authorise the app in each org.

Six secrets, three External Client Apps, three certificates. Tedious once, then never again.

### 6. Prove it works before you delete anything

Push a trivial commit to `integration` and watch the deployment job. In the log, the authentication
step should now say it is using JWT rather than an SFDX auth URL.

Then do the same for `uat` and `main`: open a Pull Request from `integration` into `uat` and check
that the check job authenticates. Do not merge it yet, Lab 5 is the real promotion.

Three green authentications. Now, and only now:

### 7. Delete the shortcut

In your fork: **Settings > Secrets and variables > Actions**, find `SFDX_AUTH_URL_INTEGRATION`, and
delete it.

Push another commit and watch the job still pass. If it does, the JWT path is genuinely what is
being used, and it was not quietly falling back.

### 8. Write down why

In `MY-PIPELINE.md`, under Level 3:

```markdown
- **Lab 1, CI authentication**: deleted the SFDX_AUTH_URL_INTEGRATION secret. It carried a
  long-lived refresh token that could not be rotated, was not scoped, and was tied to one person.
  All three orgs now authenticate with JWT through an External Client App.
```

The badge audit looks for that line. More to the point, it is the answer to the question the next
release manager will ask.

<details markdown="1"><summary>Under the hood: what the JWT flow actually does</summary>

The command ran:

    sf hardis:project:configure:auth

and the CI job now runs, before anything else:

    sf org login jwt \
      --client-id $SFDX_CLIENT_ID_INTEGRATION \
      --jwt-key-file <decrypted key> \
      --username <targetUsername from the branch config> \
      --instance-url <instanceUrl from the branch config> \
      --alias integration

The private key is decrypted at the start of the job with `SFDX_CLIENT_KEY_INTEGRATION`, used, and
never written anywhere persistent.

**How the authentication hook chooses.** For a branch `<B>`, it looks for `SFDX_AUTH_URL_<B>` first.
If it finds one, it uses it and stops. Otherwise it falls back to `SFDX_CLIENT_ID_<B>` plus the
certificate. That order is why step 7 is a real test and not a formality: while the auth URL secret
existed, the JWT path was never being exercised.

`orgAuthenticationMode` in `config/.sfdx-hardis.yml` records which storage mode you chose, and the
pipeline panel warns when a major org is not configured the way the project declared.

</details>

## What you should see

- Six secrets in your fork, none of them an auth URL
- Three `config/branches/.jwt/*.key` files, encrypted
- A green deployment job whose log shows a JWT login
- `SFDX_AUTH_URL_INTEGRATION` gone

## If it goes wrong

**`user hasn't approved this consumer`.**
Step 4. The External Client App exists but the user is not pre-authorised.

**`invalid_grant: audience is invalid`.**
The instance URL does not match the org type. A Developer Edition org uses
`https://login.salesforce.com`, never `test.salesforce.com`.

**The job cannot decrypt the key.**
`SFDX_CLIENT_KEY_<ALIAS>` is wrong or was copied with a trailing newline. Recreate it.

**Everything passes even with the JWT secrets missing.**
The auth URL secret is still there and still winning. That is exactly what step 7 catches.

## Check your work

Welcome page > **Training** > **Check my work**, then pick level 3 and lab 1.

## Go deeper

- [Configure CI authentication](https://sfdx-hardis.cloudity.com/salesforce-devops-setup-auth/)
- [GitHub Actions authentication](https://sfdx-hardis.cloudity.com/salesforce-devops-setup-auth-github/)

[Next: Lab 2 - Review and merge a contributor Pull Request](lab-02-review-pr.md){ .md-button .md-button--primary }
