---
id: lab-3-10
title: "Lab 3.10 - Promouvoir un sous-ensemble avec les promotion branches (Beta)"
description: "Transportez une seule User Story approuvée de uat vers preprod avec une promotion branch sfdx-hardis, et mesurez ce que ce raccourci coûte aux orgs derrière."
level: 3
lab: 10
lang: fr
source_rev: "e9553a6a7ef341a7da8fb1a339dcbabb0337c4a4"
screenshots:
  - annotated/vscode/welcome-custom-menu-3
  - annotated/vscode/pipeline-config-danger--promotion-branches
  - annotated/vscode/pipeline-branch-modal-promotion--pick-what-goes
  - annotated/vscode/devops-pipeline-promotion--in-flight
depends_on:
  commands: [hardis:project:promotion:create, hardis:project:deploy:smart, hardis:doc:release-notes]
  flags: []
  config: [enablePromotionBranches, allowedPromotionSteps, mergeTargets]
  panels: [pipeline, pipelineConfig, commandExecution]
  docs: [salesforce-devops-promotion-branches, hardis/project/promotion/create]
---

# Lab 3.10 - Promouvoir un sous-ensemble avec les promotion branches (Beta)

**Niveau** : 3 Release Manager

**Durée** : ~35 min

**Vous allez** : livrer en preprod une User Story approuvée pendant qu'une autre reste en UAT, avec
la seule fonctionnalité de sfdx-hardis dont vous devriez espérer ne jamais avoir besoin deux
semaines de suite.

## La situation

Deux stories sont arrivées cette semaine, et toutes les deux sont en UAT.

**US-057**, celle de Mariia, donne aux planificateurs un statut *Awaiting Parts* pour une
installation bloquée par une pièce manquante. Le responsable des opérations l'a testée mardi et l'a
validée par écrit.

**US-058**, celle de Romain, stocke la durée de garantie sur un panel batch. Elle fonctionne.
Personne n'a validé la formulation, parce que la personne qui valide les formulations est absente
jusqu'au milieu de la semaine prochaine.

La livraison est jeudi et la date ne bouge pas : la bascule de l'entrepôt a besoin du nouveau statut
en production avant le week-end.

Vous avez donc une fenêtre de promotion qui contient une story approuvée et une story à laquelle
personne n'a dit oui, et la promotion ordinaire est tout ou rien. Elle transporte `uat` telle
qu'elle est, US-058 comprise.

!!! warning "C'est l'exception, et elle doit le rester"
    Promouvoir des branches plutôt que des fonctionnalités est la manière recommandée, et tous les
    autres labs de ce niveau le font. Une version dont les stories ont été testées ensemble est la
    version qui a été testée.

    Une promotion branch casse cela volontairement. Après elle, `uat` et `preprod` ne contiennent
    plus la même chose, les orgs derrière divergent, et la production fait tourner une combinaison
    que personne n'a jamais testée dans son ensemble. C'est un coût réel, payé plus tard, en général
    par la personne d'astreinte.

    Utilisez-la quand une date ne peut pas bouger et qu'une validation n'est pas arrivée. N'en
    faites pas un processus : une équipe qui assemble une promotion branch toutes les semaines a un
    problème de validation, pas un problème d'outillage, et cela se corrige en amont.

## Avant de commencer

- [ ] [Lab 3.9](3-9-generate-the-project-documentation.md) terminé
- [ ] Les quatre branches déploient, et les quatre orgs sont connectées
- [ ] `enablePromotionBranches` et `allowedPromotionSteps` publiés au
      [Lab 3.1](3-1-configure-the-pipeline-up-to-production.md), et remontés jusqu'à `preprod` par les promotions des Labs 3.5 et 3.6

## Les étapes

### 1. Vérifier que la fonctionnalité est active, et où elle est autorisée

Les deux réglages dont ce lab a besoin ont été publiés au [Lab 3.1](3-1-configure-the-pipeline-up-to-production.md) et remontent la pipeline avec
chaque promotion depuis. Regardez-les avant de compter dessus.

Ouvrez le panneau **DevOps Pipeline**, le menu engrenage, **Pipeline Settings**, portée **Global
Settings**, puis l'onglet **Danger Zone**.

![La Danger Zone des Global Pipeline Settings, avec les deux réglages des promotion branches](../../_assets/annotated/vscode/pipeline-config-danger--promotion-branches.png)

Lisez la ligne en haut de cet onglet avant tout le reste : *Use these settings with caution, be sure
to understand their impact as they drift from DevOps best practices.* Le produit range cette
fonctionnalité dans le même tiroir que les déploiements delta entre branches majeures, et pour la
même raison.

**Enable promotion branches (Beta)** **(1)** affiche **Enabled** : la fonctionnalité est active pour
tout le projet. **Allowed promotion steps (Beta)** **(2)** contient une ligne, source `uat` et cible
`preprod`, et dit que c'est la seule étape sur laquelle un release manager peut ici assembler une
promotion.

Ce deuxième réglage n'est pas de la paperasse. C'est la raison pour laquelle le bouton que vous
allez utiliser existe sur `uat` et pas sur `integration` : un sous-ensemble est une décision sur ce
qui part vers l'étape juste avant la production, et personne n'a besoin de la prendre en entrant
dans une org d'intégration qui est reconstruite depuis la branche de toute façon.
`sf hardis:project:promotion:create` refuse purement et simplement de tourner tant que la liste est
absente, plutôt que de deviner que chaque branche majeure peut promouvoir vers toutes les autres.

<details markdown="1"><summary>Sous le capot : pourquoi un réglage publié au [Lab 3.1](3-1-configure-the-pipeline-up-to-production.md) compte maintenant</summary>

Les deux réglages sont au niveau projet, dans `config/.sfdx-hardis.yml` :

    enablePromotionBranches: true
    allowedPromotionSteps:
      - source: uat
        target: preprod

Le job de déploiement d'une Pull Request de promotion tourne sur la promotion branch, et une
promotion branch est coupée depuis sa **cible** : la configuration qu'il lit est donc celle que
porte `preprod`. Un réglage activé aujourd'hui dans `integration` ne serait pas dans `preprod` avant
qu'une promotion l'y porte, et d'ici là le job traiterait la Pull Request de promotion comme une
branche de fonctionnalité ordinaire : il déploierait quand même, et il ignorerait silencieusement
les stories que la branche déclare.

C'est pour cela que le réglage a été publié au [Lab 3.1](3-1-configure-the-pipeline-up-to-production.md) avec le reste de la configuration du
pipeline, et pour cela qu'il est resté inerte depuis : sans aucune promotion branch dans le
repository, un projet avec la fonctionnalité active se comporte exactement comme un projet sans.

</details>

### 2. Prendre les deux stories, et les promouvoir comme d'habitude

Rien de nouveau ici, c'est donc écrit court. Si une étape ne vous dit rien, le lab qui l'a enseignée
est en lien.

**Welcome page** > **Training: Level 3** > **Simulate my teammates**, et prenez les deux :

- **US-057 Park an installation that is waiting for parts**
- **US-058 Record the warranty term on a panel batch**

![Le menu Training Level 3 sur la Welcome page](../../_assets/annotated/vscode/welcome-custom-menu-3.png)

Relisez chacune avec les quatre questions du [Lab 3.2](3-2-review-a-contributor-pull-request.md) et mergez les deux dans `integration`, puis
regardez le déploiement. Promouvez ensuite `integration` vers `uat` comme au [Lab 3.5](3-5-promote-to-uat-and-write-release-notes.md) : la pastille
**+ PR** sur la flèche, un titre lisible par un humain, **Merge pull request** et jamais de squash.

Les deux stories sont maintenant dans `uat`, déployées dans `helios-uat`, et c'est le moment que
toute vraie semaine finit par atteindre : tout est testable, et une partie seulement est approuvée.

### 3. Décider, avant de toucher à quoi que ce soit

Vous avez trois options et l'outil n'en sert qu'une. Sachez pourquoi vous choisissez celle-là.

| Option                       | Ce qu'elle coûte                                                                                                       | Quand elle est la bonne                                                                                            |
|------------------------------|------------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------|
| **Attendre la validation**   | La livraison glisse d'une semaine                                                                                      | Presque toujours. C'est la seule option qui garde les orgs alignées                                                |
| **Sortir US-058 de `uat`**   | Un revert sur une branche sur laquelle d'autres construisent, et la story devra revenir plus tard, rebasée et retestée | Quand la story est vraiment mauvaise, pas simplement non validée                                                   |
| **Transporter US-057 seule** | `uat` et `preprod` divergent jusqu'à la prochaine promotion complète                                                   | Quand la date est fixe, que la validation n'arrivera pas, et que la story laissée derrière est bien là où elle est |

Cette semaine, c'est la troisième, et la raison est écrite : la bascule de l'entrepôt.

Écrivez cette raison quelque part où un successeur la trouvera. La Pull Request que vous allez créer
est un bon endroit, et l'étape 6 y revient.

### 4. Choisir ce qui part

Ouvrez le panneau **DevOps Pipeline** et cliquez sur le nœud `uat`. La fenêtre qui s'ouvre est celle
que le [Lab 3.5](3-5-promote-to-uat-and-write-release-notes.md) utilisait pour lire une fenêtre de promotion, avec deux choses dessus qui ne
servaient à rien jusqu'ici.

![La fenêtre de branche d'uat, avec la colonne de cases à cocher et le bouton Create promotion](../../_assets/annotated/vscode/pipeline-branch-modal-promotion--pick-what-goes.png)

Une **case à cocher** sur chaque ligne de User Story **(1)**, et **Create promotion from uat (Beta)**
dans le pied de la fenêtre **(2)**. Les deux apparaissent parce que `uat` est la source d'une étape
de promotion autorisée et que `preprod` en est la cible.

Cochez **US-057** et laissez US-058 tranquille. Le libellé du bouton compte ce que vous avez coché :
**Create promotion from uat (1 selected) (Beta)**. Cliquez dessus.

Un onglet d'exécution de commande s'ouvre et pose une seule question, **Select the Pull Requests to
carry in the promotion branch**, avec US-057 déjà cochée : le panneau a passé votre choix à la
commande, et la commande vous demande de le confirmer plutôt que de le prendre pour acquis.
Confirmez.

Lisez ensuite le log, parce qu'il fait quelque chose que vous feriez à la main sinon :

```
Creating promotion branch promotion/uat/preprod/2026-09-24-0930 from origin/preprod...
Cherry-picking #NNN US-057 Park an installation that is waiting for parts (my-username) [7c41ab9]...
Pushing promotion branch promotion/uat/preprod/2026-09-24-0930...
Creating the Pull Request from promotion/uat/preprod/2026-09-24-0930 to preprod...
Promotion Pull Request created: https://github.com/my-username/sfdx-hardis-training/pull/NNN
Promotion branch promotion/uat/preprod/2026-09-24-0930 assembled with 1 User Story(ies): #NNN
```

<details markdown="1"><summary>Sous le capot : ce que le bouton a lancé, et ce que le nom de la branche veut dire</summary>

Le bouton a lancé, dans le panneau d'exécution de commande :

    sf hardis:project:promotion:create --source-branch uat --target-branch preprod --pull-requests NNN

`--target-branch` a été passé plutôt que demandé parce que `allowedPromotionSteps` ne laisse à `uat`
qu'une seule cible. Avec plusieurs cibles autorisées, la commande aurait posé la question.

La branche est nommée `promotion/<source>/<cible>/<YYYY-MM-DD>-<HHMM>`, en UTC, et un `-2`, `-3`
n'est ajouté que si cette minute est déjà prise. La forme est fixe et non configurable : les jobs de
déploiement, le diagramme de la pipeline et les notes de version reconnaissent tous une promotion à ça.

Elle est coupée depuis `origin/preprod`, pas depuis `uat`. C'est toute l'astuce : une branche qui
part de la cible et ne reçoit que les commits choisis ne peut pas transporter ce que vous n'avez pas
choisi. Les commits sont copiés avec `git cherry-pick -x`, qui garde le message d'origine et ajoute
une ligne `(cherry picked from commit ...)`, de sorte que la copie peut être remontée jusqu'au
commit de `uat` dont elle vient.

Un cherry-pick réécrit le SHA du commit, et c'est pour cela que la Pull Request doit déclarer en
toutes lettres ce qu'elle transporte : plus rien dans git ne relie la copie à la Pull Request dont
elle vient.

<!-- command-links:start -->
Documentation de la commande : [hardis:project:promotion:create](https://sfdx-hardis.cloudity.com/hardis/project/promotion/create/)
<!-- command-links:end -->

</details>

### 5. Lire ce qu'elle a créé

Ouvrez la Pull Request. Elle s'intitule `Promotion uat to preprod (2026-09-24-0930)`, et sa
description contient la seule chose qui fait marcher tout le reste :

````markdown
Promotion branch `promotion/uat/preprod/2026-09-24-0930` carrying 1 User Story approved in `uat`,
cherry-picked for `preprod`.

```yaml
promotionPullRequests: [NNN]
```

## Carried Pull Requests

| Pull Request | Title                                                 | Author      | Source branch                         | Commit    |
|--------------|-------------------------------------------------------|-------------|---------------------------------------|-----------|
| #NNN         | US-057 Park an installation that is waiting for parts | my-username | `training/mate-us-057-awaiting-parts` | `7c41ab9` |
````

La colonne **Author** est le compte GitHub qui a ouvert la Pull Request : sur cette formation,
c'est donc votre propre identifiant et non celui de Mariia. La coéquipière a écrit le commit,
**Simulate my teammates** a ouvert la Pull Request avec votre compte. La fenêtre de branche du
panneau affiche l'auteur du commit, et c'est pour cela que les deux ne disent pas la même chose.

La colonne **Title** vient de la Pull Request, lue via l'API du git provider. La commande exige
cette connexion et refuse de démarrer sans elle : une promotion se comporte ainsi de la même façon
sur GitHub, GitLab, Bitbucket et Azure DevOps, et chaque ligne portée nomme sa vraie story. Ici
vous ne voyez jamais ce refus : l'extension transmet sa propre connexion GitHub, ouverte depuis le
[Lab 1.2](../level-1-contributor-basics/1-2-create-your-dev-hub-scratch-orgs-and-pipeline.md). Depuis un terminal ou un agent, le token doit être fourni
(`GITHUB_TOKEN`, dans l'environnement ou dans un fichier `.env` à la racine du repository).

**Ce bloc yaml est la déclaration**, et chaque job qui tourne sur cette Pull Request le lit. C'est
ainsi qu'US-057 garde, dans `preprod`, tout ce qu'elle aurait eu dans une promotion ordinaire : ses
deployment actions s'exécutent, ses classes de test Apex sont sélectionnées, son ticket est mis à
jour, et les notes de version de `preprod` nomment la story plutôt que la promotion qui l'a
transportée.

Supprimez ce bloc et il vous reste une branche avec des commits dessus et aucune idée de ce à quoi
ils servent. Gardez-le, et ne retouchez pas les numéros à la main : la commande a écrit ce qu'elle a
réellement cherry-pické.

Retournez maintenant dans le panneau **DevOps Pipeline** et regardez le diagramme.

![La promotion ouverte dessinée sur la flèche de uat vers preprod](../../_assets/annotated/vscode/devops-pipeline-promotion--in-flight.png)

La promotion en vol est dessinée sur la flèche entre `uat` et `preprod` **(1)**, avec son numéro de
Pull Request, là où se trouvait la pastille **+ PR** : ce n'est pas une branche de votre pipeline,
c'est quelque chose qui se déplace entre deux d'entre elles, et cela vit exactement le temps de sa
Pull Request.

Le compteur sur le nœud `uat` **(2)** affiche toujours deux User Stories en attente, et c'est
correct : rien n'a encore bougé. Une promotion ouverte est une proposition. Mergez-la, revenez, et
le compteur affiche une seule story, parce qu'**une Pull Request n'apparaît qu'à un seul endroit** :
à partir de là US-057 est listée dans la fenêtre de `preprod`, la branche qu'elle a atteinte, et
plus dans celle de `uat`, la branche qu'elle a quittée.

### 6. Ajouter la raison, puis lire la validation

**Éditez la description** et mettez votre raison au-dessus du texte généré, dans une phrase
utilisable par la personne qui lira ça dans six mois :

> Warehouse cutover on Monday needs the Awaiting Parts status in production. US-058 stays in UAT
> until the wording is approved, expected Wednesday next week.

Lisez ensuite le commentaire sfdx-hardis sur la Pull Request. Sa première ligne est celle à
vérifier :

> ℹ️ `promotion/uat/preprod/2026-09-24-0930` is a promotion branch carrying 1 Pull Request(s)
> declared in its description: #NNN. Deployment actions, Apex test classes and custom behaviors of
> those Pull Requests are processed.

Si cette ligne manque, ou si elle dit qu'aucune des Pull Requests déclarées n'a pu être utilisée,
**arrêtez-vous et corrigez avant de merger**. Cela veut dire que le job n'a pas lu la déclaration, et
que le déploiement sur le point de partir, ce sont les métadonnées sans rien de ce qui va avec.

Le reste de la validation se lit comme n'importe quelle autre : la ligne de comptage, ce qui est
ajouté, modifié et supprimé. Le delta est petit, et c'est volontaire. Une promotion branch
transporte une story, elle déploie donc une story.

### 7. Merger, et vérifier la sélectivité dans l'org

Mergez avec **Merge pull request**. Jamais de squash : les commits cherry-pickés et leurs lignes de
traçabilité sont ce que la prochaine promotion, le retrofit et les notes de version lisent tous.

L'exécution **Process Deployment (sfdx-hardis)** démarre sur `preprod`. Quand elle est verte, ouvrez
`helios-preprod` et vérifiez les deux moitiés de ce que vous avez fait :

- **Setup > Object Manager > Installation > Fields & Relationships > Status** : la liste de sélection
  propose **Awaiting Parts**. US-057 est là
- **Setup > Object Manager > Panel Batch > Fields & Relationships** : il n'y a pas de champ
  **Warranty Years**. US-058 n'y est pas, et c'est tout l'objet du lab

Déployé et *seulement* ce que vous avez choisi est déployé sont deux vérifications différentes, et
ce lab est celui où la seconde compte.

### 8. Compter ce que cela a coûté

Regardez la pipeline maintenant, et dites à voix haute ce qui est vrai :

- `uat` contient US-057 et US-058. `preprod` ne contient qu'US-057
- `helios-uat` et `helios-preprod` ne sont plus la même org, et elles resteront différentes jusqu'à
  la prochaine promotion complète
- La production est sur le point de faire tourner une combinaison de métadonnées qui n'a jamais été
  testée dans son ensemble nulle part : ce que `preprod` contient aujourd'hui n'existait dans aucune
  org ce matin

Rien de tout cela n'est un bug. C'est le prix, et vous l'avez payé délibérément pour une date fixe.
Le mode de défaillance n'est pas de le payer une fois : c'est de le payer toutes les semaines, sans
bruit, jusqu'à ce que plus personne ne sache ce que contient chacune des quatre orgs.

Deux habitudes gardent cela honnête, et elles ne coûtent rien :

1. **La Pull Request de promotion dit pourquoi.** Vous l'avez fait à l'étape 6
2. **L'exception se termine.** La prochaine promotion ordinaire de `uat` fait remonter US-058, et le
   pipeline est aligné de nouveau. Le [Lab 3.11](3-11-capstone-run-a-weekly-release-cycle.md) est cette promotion : US-058 attend encore dans
   `uat` lundi matin, et elle part avec tout le reste

<details markdown="1"><summary>Sous le capot : ce qui arrive à US-058 ensuite, et à quoi ressemble une promotion vue d'en haut</summary>

Rien de spécial. US-058 est une User Story mergée dans `uat` qui n'a pas été promue, exactement comme
n'importe quelle autre story la veille d'une livraison, et la prochaine Pull Request de `uat` vers
`preprod` la transporte de manière ordinaire.

Ce sur quoi sfdx-hardis doit faire attention, c'est US-057, qui est dans les **deux** branches par
des chemins différents : mergée dans `uat`, cherry-pickée dans `preprod`. La prochaine promotion de
`uat` fera aussi remonter le commit d'origine, et git mergera proprement parce que le contenu y est
déjà. Le diagramme de la pipeline et les notes de version savent tous les deux qu'elle a déjà été
promue (`promotedAway`), elle est donc listée une seule fois, sur la branche qu'elle a réellement
atteinte, et les notes de la livraison suivante ne l'annoncent pas deux fois.

La même expansion fonctionne un niveau plus haut : quand `preprod` est promue vers `main`, le commit
de merge qui arrive transporte la promotion, pas les stories en dessous. sfdx-hardis lit la
déclaration de la promotion et remet US-057 dans le périmètre par son nom, pour que ses deployment
actions s'exécutent en production aussi.

</details>

## Ce que vous devez voir

- Une Pull Request mergée intitulée `Promotion uat to preprod (<date>-<heure>)`, depuis une branche
  nommée `promotion/uat/preprod/<date>-<heure>`
- Un bloc `promotionPullRequests` dans sa description qui nomme US-057 et rien d'autre, avec votre
  raison écrite au-dessus
- Une exécution **Process Deployment (sfdx-hardis)** verte sur `preprod`
- **Awaiting Parts** dans la liste de sélection Status de `helios-preprod`, et aucun champ
  **Warranty Years** sur Panel Batch là-bas
- Le nœud `uat` du diagramme qui compte une User Story encore en attente

## En cas de problème

**La fenêtre d'uat n'a ni cases à cocher ni bouton Create promotion.**
Soit la fonctionnalité est inactive dans la configuration que lit votre workspace, soit
`allowedPromotionSteps` ne nomme pas `uat` comme source avec `preprod` comme cible. L'étape 1 montre
les deux. Une étape qui pointe vers une branche dans laquelle la pipeline ne merge pas n'ouvre rien,
et c'est volontaire.

**La commande s'arrête en disant que les étapes autorisées manquent.**
`allowedPromotionSteps` est obligatoire dès que `enablePromotionBranches` est actif. Ce n'est pas une
valeur par défaut que sfdx-hardis accepte d'inventer : entre quelles branches un release manager peut
promouvoir est une décision sur votre pipeline.

**Le cherry-pick entre en conflit.**
La story que vous avez choisie dépend d'une story que vous avez laissée derrière. La commande propose
de la laisser de côté, ou de la committer avec ses marqueurs de conflit et de les résoudre ensuite
sur la branche, à la main ou avec un agent de code. Quel que soit votre choix, le job de validation
refuse de déployer une branche qui contient encore des marqueurs de conflit, et il le dit dans un
commentaire sur la Pull Request plutôt que d'échouer en silence. La réponse honnête est en général de
promouvoir aussi la story dont elle dépend.

**Le commentaire sfdx-hardis ne parle pas de promotion branch.**
Le job de déploiement a lu une configuration avec la fonctionnalité inactive. Vérifiez que `preprod`
porte bien `enablePromotionBranches: true` dans `config/.sfdx-hardis.yml` : la branche que le job lit
est la promotion branch, qui a été coupée depuis `preprod`.

**La commande s'arrête en disant qu'elle a besoin de la connexion au git provider.**
La promotion est assemblée à partir des Pull Requests de `uat`, et seul le git provider les nomme
de façon fiable, donc la commande refuse de deviner sans lui. Dans VS Code, cette connexion est la
session GitHub du [Lab 1.2](../level-1-contributor-basics/1-2-create-your-dev-hub-scratch-orgs-and-pipeline.md), et l'extension la transmet toute seule : reconnectez-vous si
elle a été révoquée. Depuis un terminal ou un agent, définissez `GITHUB_TOKEN`, dans
l'environnement ou dans un fichier `.env` à la racine du repository, et gardez ce fichier hors de
git.

**Le déploiement est beaucoup plus gros qu'une story.**
Regardez depuis quoi la branche a été coupée. Une promotion branch construite alors que `preprod`
était en retard emporte l'écart avec elle. C'est une raison de promouvoir normalement plus souvent,
pas une raison de construire une plus grosse promotion.

## Vérifiez votre travail

Welcome page > **Training: Level 3** > **Check my work**, puis choisissez le Lab 3.10.

## Pour aller plus loin

- [Promotion branches (Beta)](https://sfdx-hardis.cloudity.com/salesforce-devops-promotion-branches/)
- [hardis:project:promotion:create](https://sfdx-hardis.cloudity.com/hardis/project/promotion/create/)
- [Hotfixes](https://sfdx-hardis.cloudity.com/salesforce-devops-hotfixes/), qui est le bon outil pour
  un correctif urgent qui n'est jamais passé par `uat`

[Suite : Lab 3.11 - Épreuve finale : mener un cycle de release hebdomadaire](3-11-capstone-run-a-weekly-release-cycle.md){ .md-button .md-button--primary }
