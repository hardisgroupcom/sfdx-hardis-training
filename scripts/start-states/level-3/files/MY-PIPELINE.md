# My Helios pipeline

This is your notebook. Several labs ask you to write one line here, and the badge
audit reads it. It is also the file you would actually keep on a real project, so
that the next person can see how the pipeline was put together.

## Orgs

| Branch      | Org alias          | What it is for                                                                  |
|-------------|--------------------|---------------------------------------------------------------------------------|
| (none)      | helios-dev         | My own scratch org, where I build a story before I publish it.                  |
| integration | helios-integration | Where every contributor merges. A scratch org, deployed on every merge.         |
| uat         | helios-uat         | Where the business tests. A scratch org, deployed when integration is promoted. |
| preprod     | helios-preprod     | Not wired yet. Lab 3.1 is where it becomes a major branch.                      |
| main        | helios-prod        | My Dev Hub since Level 1. Lab 3.1 makes it production.                          |

## Level 2

- **Lab 2.1, backpromote**: took the three merged stories, left my own work in progress alone.
- **Lab 2.2, missing dependency**: `Crew_Warning_Sent__c` was invisible because `.forceignore` still
  had Sofia's `Crew_W*` wildcard from the 2025 spike. Replaced it with the exact file name, so the
  day her field goes nothing else starts being ignored.
- **Lab 2.3, deployment actions**: made Crew Size required, and a pre-deploy Apex action
  (`backfill-crew-size.apex`, run only once by org) fills the empty ones first. After the
  deployment would have been too late: the constraint refuses the very update that fixes it.
- **Lab 2.4, data and batch**: a green deployment carried the object and the class and nothing else.
  Three actions now travel with the story: the `HeliosCrewRefData` import, the `CrewCapacityBatch`
  nightly schedule, and the manual email deliverability check nobody can automate.
- **Lab 2.5, quality and tests**: PMD warns on a query in a loop, coverage blocks. `schedulableOn`
  now queries once with `IN :installationIds`, and two tests cover both of its branches.
- **Lab 2.6, profiles**: permissions go on Permission Sets. minimizeProfiles strips them from
  Profiles before the commit, so a Profile grant is silently dropped rather than deployed.
- **Lab 2.7, conflict with Marco**: took both field permissions on `Helios_Delivery_Manager`. In
  `Installation_Assign_Crew` my flat-roof minimum runs first and his cap runs last, so the cap wins
  on a flat roof whose cap is 2. Safety beats a slow day.
- **Lab 2.8, resetselection**: I had selected the whole org. Reset selected list of items to merge
  cleared the selection, git reset --hard origin/integration dropped the commit, and the org kept
  my actual change: one Layout.
- **Lab 2.9, capstone US-041**: the handover object, ten template rows through
  `HeliosHandoverRefData`, and `Installation_Close_Check` refusing a close while a line is open.
  The data action runs after the deployment, because the object has to exist first.

## Level 3

- **Lab 3.2, CI authentication**: the date I deleted the `SFDX_AUTH_URL_INTEGRATION` and `SFDX_AUTH_URL_UAT` secrets, and why they should never have been there for a real org.
- **Lab 3.4, Smart Deploy**: what the deployment sent, and what it skipped.
- **Lab 3.7, DORA**: deployment frequency, lead time, change failure rate, time to restore.
- **Lab 3.9, monitoring**: the URL of the monitoring repository this created.
- **Lab 3.11, release notes**: the link to the release notes I published.
