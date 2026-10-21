/*
 * World 8, Release to the production org: a musical run, the last stop of the pipeline before world 9 guards it.
 * The guinea pig runs to the music and the player only jumps.
 *
 * The run follows the steps of a release: the three checks worth checking,
 * the rehearsal in the preprod org, the production Pull Request and its check
 * read like it matters, the merge and the deployment watched to its end, then
 * the verification in the production org.
 *
 * The rehearsal is musical: preprod plays the same riff as production, eight
 * bars of it, and there a mistake costs nothing (a release that fails in
 * preprod has cost you nothing). In production the same riff comes back with
 * the full band, with one thing more that preprod did not have: drift.
 *
 * The finale is a DORA card after a first release, and two questions about
 * what its numbers really say.
 */
import { createLevel, createMusicalRun, MUSICAL_TEXTS, MUSICAL_CSS, endMissedInfo, musicalWorld } from "./musical.js";
import { melody } from "../core/music.js";
import { SLDS } from "../core/painter.js";

export const PADS = ["jump"];
// The salesforce items (components, checks, runners, orgs, the rocket, the Cloudity logo and the
// badge), the Kenney springs, trees and bushes far behind, and the bonus vegetables
export const MODELS = ["salesforce", "platform", "nature", "vegetables"];

const SCENERY = [
  { names: ["tree_default", "tree_oak", "tree_pineRoundA"], z: -4.6, depth: 1.6, every: 5.2, height: 3.2, bounce: 0.05 },
  // The CI runners of the pipeline, along the track, and the orgs in the sky
  { names: ["ci-runner"], z: -6.9, every: 9, height: 2.3, bounce: 0.04, turn: 0.4 },
  { names: ["org-cloud"], y: 7.5, rise: 2.5, z: -15, every: 19, height: 2.6, bounce: 0.02, turn: 0.3 }
];

const SONG = {
  bpm: 116,
  // G major: I vi IV V, a sunny evening release
  root: 67,
  progression: [0, 5, 3, 4],
  lead: {
    chorus: melody("7.4.2.4.7.9.7.4. 5.7.9.7.5...2.4. 3.5.7.5.3.5.7.8. 8.6.4.6.8...6.4.")
  },
  start: "intro",
  end: "lounge"
};

const BAR = 4;
// The riff rehearsed in preprod, and played again in production
const RIFF = ["x.x.", "X-x-", "g.o.", "xx..", "x.g.", "o-X-", "x..x", "G-x-"];

export const TEXTS = {
  en: Object.assign({}, MUSICAL_TEXTS.en, {
    intro: "UAT signed off. The release goes to the production org this evening: rehearse the song in the preprod org, then play it for real.",
    how1: "Jump with Up, Space or a tap when the ring closes",
    how2: "In the preprod org a mistake costs nothing: learn the riff there",
    how3: "In production, stop on what you did not expect",
    note: "The rating is about the period, not about you. I wish someone had told me that on my first release. - V.",
    path0: "Checks",
    path1: "preprod",
    path2: "main",
    path3: "Deploy",
    path4: "Verify",
    arch0: "1 · Three checks",
    arch1: "2 · preprod org",
    arch2: "3 · main branch",
    arch3: "4 · Merge, and stay",
    arch4: "5 · Verify",
    goal0: "Jump for the three checks worth checking",
    goal1: "Rehearse in the preprod org: learn the riff, mistakes are free",
    goal1manual: "The first check stops red, on purpose: press Mark as done",
    goal2: "The Pull Request to the main branch: read the check like it matters",
    goal3: "The same riff, for real. Watch for drift",
    goal4: "Verify in the production org: the new story, and an old one",
    coachRehearse: "The preprod org: the same riff as production, for free",
    coachProd: "Same riff as the preprod org, with one surprise",
    coachQuick: "Quick Deploy: the tests already ran during the validation",
    coachVerify: "The most common incident is an old feature breaking",
    s_check1: "UAT signed off",
    s_check2: "Manual steps",
    s_check3: "Look at prod",
    s_jwt: "sf org login jwt",
    s_jwt2: "production org",
    s_quick: "Quick Deploy",
    s_v1: "Customer Tier",
    s_v2: "Contacts",
    s_v3: "Record saves",
    s_green: "Signed off?",
    s_fail: "Fails here",
    s_prod: "Error",
    s_drift: "Drift",
    s_half: "Half done",
    s_old: "Old feature",
    s_late: "Too late",
    s_dora: "DORA metrics",
    p_check1: "UAT signed off: somebody tested it and said yes",
    p_check2: "The manual steps of the release, known before you create anything",
    p_check3: "Look at the production org first: know what is already there before you deploy",
    p_jwt: "sf org login jwt: the certificate key of the preprod org works",
    p_jwt2: "sf org login jwt: the first JWT login into the production org",
    p_quick: "Quick Deploy. Apex tests: Already run during the validation",
    p_v1: "Acme Corp shows Customer Tier: Gold. The new story works",
    p_v2: "The contacts of Acme Corp still show: an older feature still works",
    p_v3: "A record saves: the old features still work",
    o_green: "Green is not signed off",
    o_green_tip: "Is UAT genuinely signed off? Not \"the deployment was green\": somebody tested it and said yes.",
    o_fail: "Failed in the preprod org",
    o_fail_tip: "That is what the preprod org is for: a release that fails here has cost you nothing.",
    o_prod: "Failed in production",
    o_prod_tip: "Rehearse in the preprod org: a release that deploys there cleanly has very little left to surprise you with.",
    o_drift: "Fails in production, worked in the preprod org",
    o_drift_tip: "The production org drifted: an extra validation rule, a record type, real data. Keep the preprod org as close to production as you can.",
    o_half: "The deployment half-succeeded",
    o_half_tip: "Deployments are atomic: a post-deployment action failed. Re-run the action, do not re-run the deployment.",
    o_old: "An old feature broke",
    o_old_tip: "Check something that already worked still works: open an account, its contacts, save a record.",
    o_tests: "Apex tests ran again",
    o_tests_tip: "The validation already ran the tests: the merge job applies it, as a Quick Deploy.",
    o_latemain: "The manual step was never done",
    o_latemain_tip: "A manual action runs once in every org, production included: declare it in World 3, then mark it as done in each org.",
    stopHeader: "1 to do by hand",
    stopButton: "Mark as done",
    stopDone1: "Mark as done in preprod, then Re-run all jobs: green",
    stopDone2: "Done in the production org: the last org that needed the click",
    choiceHeader: "Read the check",
    q0: "The Metadata row of the comment says: 1 deleted",
    q0d: "You did not expect anything to go.",
    q0a: "Read destructiveChanges.xml",
    q0b: "Merge anyway",
    q0c: "Re-run all jobs",
    q0Ok: "Stopping on an unexpected deletion is the job",
    q0bTip: "A deletion in production is permanent and takes data with it. Stop, and find out what goes and who intended it.",
    q0cTip: "A re-run shows the same figure. The comment will not tell you what goes: destructiveChanges.xml and the diff will.",
    mainGreen: "Process Deployment (sfdx-hardis) on the main branch: green",
    doraTitle: "DORA metrics",
    doraPeriod: "main, Last 90 days",
    q1: "Your manager asks for your lead time. You quote:",
    q1a: "5.7 d: the Lead time (median), per User Story",
    q1b: "0.1 d: the Pull Requests of this branch alone",
    q1c: "No data",
    q1bTip: "Flattering and wrong: the User Stories waited days before that last Pull Request. Quote the per-story lead time, 5.7 d.",
    q1cTip: "No data is the honest answer for Recovery, when nothing failed. The lead time has data: 5.7 d.",
    q1Ok: "Days, not weeks: long means work is sitting somewhere.",
    q2: "One deployment so far, 0 % failure rate. One red job next week, and the failure rate reads:",
    q2a: "50 %",
    q2b: "10 %",
    q2c: "Still 0 %, a red job is not a failure",
    q2bTip: "With one deployment, small numbers move in big steps: one red job out of two is 50 %.",
    q2cTip: "A red deployment job is exactly what the failure rate counts.",
    q2Ok: "Small numbers move in big steps. The rating is about the period, not about you.",
    choose: "Up and down choose, Enter answers. Or tap.",
    shipped: "You have shipped once, and the DORA metrics say exactly that.",
    info_checks: "You skipped {{n}} of the three checks of step 1: know the manual steps and look at production before you create anything.",
    info_verify: "You verified {{n}} of 3 things in the production org: the most common incident after a release is an old feature breaking.",
    info_quick: "You missed Quick Deploy: the validation already ran the tests.",
    info_coins: "You ate {{got}} of {{total}} vegetables."
  }),
  fr: Object.assign({}, MUSICAL_TEXTS.fr, {
    intro: "La recette UAT est validée. La release part dans l'org de production ce soir : répétez le morceau dans l'org preprod, puis jouez-le pour de vrai.",
    how1: "Sautez avec Haut, Espace ou en touchant quand l'anneau se referme",
    how2: "Dans l'org preprod, une erreur ne coûte rien : apprenez le riff là",
    how3: "En production, arrêtez-vous sur ce que vous n'attendiez pas",
    note: "La note porte sur la période, pas sur vous. J'aurais aimé qu'on me le dise à ma première release. - V.",
    path0: "Contrôles",
    path1: "preprod",
    path2: "main",
    path3: "Déploiement",
    path4: "Vérifier",
    arch0: "1 · Trois contrôles",
    arch1: "2 · org preprod",
    arch2: "3 · branch main",
    arch3: "4 · Merger, et rester",
    arch4: "5 · Vérifier",
    goal0: "Sautez pour les trois contrôles qui valent la peine",
    goal1: "Répétez dans l'org preprod : apprenez le riff, les erreurs sont gratuites",
    goal1manual: "Le premier contrôle s'arrête en rouge, exprès : appuyez sur Mark as done",
    goal2: "La Pull Request vers la branch main : lisez le contrôle comme si ça comptait",
    goal3: "Le même riff, pour de vrai. Attention à la dérive",
    goal4: "Vérifiez dans l'org de production : la nouvelle story, et une ancienne",
    coachRehearse: "L'org preprod : le même riff qu'en production, gratuitement",
    coachProd: "Le même riff que dans l'org preprod, avec une surprise",
    coachQuick: "Quick Deploy : les tests ont déjà tourné pendant la validation",
    coachVerify: "L'incident le plus courant, c'est une ancienne fonctionnalité qui casse",
    s_check1: "UAT validée",
    s_check2: "Étapes manuelles",
    s_check3: "Regarder la prod",
    s_jwt: "sf org login jwt",
    s_jwt2: "org de production",
    s_quick: "Quick Deploy",
    s_v1: "Customer Tier",
    s_v2: "Contacts",
    s_v3: "Enregistrement OK",
    s_green: "Validée ?",
    s_fail: "Échoue ici",
    s_prod: "Erreur",
    s_drift: "Dérive",
    s_half: "À moitié",
    s_old: "Ancienne fonction",
    s_late: "Trop tard",
    s_dora: "Métriques DORA",
    p_check1: "UAT validée : quelqu'un a testé et a dit oui",
    p_check2: "Les étapes manuelles de la release, connues avant de créer quoi que ce soit",
    p_check3: "Regardez d'abord l'org de production : sachez ce qui s'y trouve déjà avant de déployer",
    p_jwt: "sf org login jwt : la clé du certificat de l'org preprod marche",
    p_jwt2: "sf org login jwt : la première connexion JWT à l'org de production",
    p_quick: "Quick Deploy. Apex tests: Already run during the validation",
    p_v1: "Acme Corp affiche Customer Tier: Gold. La nouvelle story marche",
    p_v2: "Les contacts d'Acme Corp s'affichent toujours : une fonctionnalité plus ancienne marche encore",
    p_v3: "Un enregistrement se sauve : les anciennes fonctionnalités marchent toujours",
    o_green: "Vert n'est pas validé",
    o_green_tip: "La recette UAT est-elle vraiment validée ? Pas \"le déploiement était vert\" : quelqu'un a testé et a dit oui.",
    o_fail: "Échec dans l'org preprod",
    o_fail_tip: "C'est à ça que sert l'org preprod : une release qui échoue ici ne vous a rien coûté.",
    o_prod: "Échec en production",
    o_prod_tip: "Répétez dans l'org preprod : une release qui s'y déploie proprement n'a presque plus de surprise en réserve.",
    o_drift: "Échoue en production, marchait dans l'org preprod",
    o_drift_tip: "L'org de production a dérivé : une règle de validation en plus, un type d'enregistrement, de vraies données. Gardez l'org preprod aussi proche de la production que possible.",
    o_half: "Le déploiement a réussi à moitié",
    o_half_tip: "Les déploiements sont atomiques : une action post-deployment a échoué. Relancez l'action, pas le déploiement.",
    o_old: "Une ancienne fonctionnalité a cassé",
    o_old_tip: "Vérifiez que ce qui marchait marche encore : ouvrez un compte, ses contacts, enregistrez un enregistrement.",
    o_tests: "Les tests Apex ont tourné à nouveau",
    o_tests_tip: "La validation a déjà exécuté les tests : le job du merge l'applique, en Quick Deploy.",
    o_latemain: "L'étape manuelle n'a jamais été faite",
    o_latemain_tip: "Une action manuelle s'exécute une fois dans chaque org, production comprise : déclarez-la dans le Monde 3, puis marquez-la comme faite dans chaque org.",
    stopHeader: "1 to do by hand",
    stopButton: "Mark as done",
    stopDone1: "Mark as done in preprod, puis Re-run all jobs : vert",
    stopDone2: "Fait dans l'org de production : la dernière org qui avait besoin du clic",
    choiceHeader: "Lisez le contrôle",
    q0: "La ligne Metadata du commentaire dit : 1 deleted",
    q0d: "Vous ne vous attendiez à aucune suppression.",
    q0a: "Lire destructiveChanges.xml",
    q0b: "Merger quand même",
    q0c: "Re-run all jobs",
    q0Ok: "S'arrêter sur une suppression inattendue, c'est le métier",
    q0bTip: "Une suppression en production est définitive et emporte des données avec elle. Arrêtez-vous, et cherchez ce qui part et qui l'a voulu.",
    q0cTip: "Relancer affiche le même chiffre. Le commentaire ne dit pas ce qui part : destructiveChanges.xml et le diff, si.",
    mainGreen: "Process Deployment (sfdx-hardis) sur la branch main : vert",
    doraTitle: "Métriques DORA",
    doraPeriod: "main, Last 90 days",
    q1: "Votre manager demande votre lead time. Vous annoncez :",
    q1a: "5.7 d : le Lead time (median), par User Story",
    q1b: "0.1 d : les Pull Requests de cette branch seule",
    q1c: "No data",
    q1bTip: "Flatteur et faux : les User Stories ont attendu des jours avant cette dernière Pull Request. Annoncez le lead time par story, 5.7 d.",
    q1cTip: "No data est la réponse honnête pour Recovery, quand rien n'a échoué. Le lead time a des données : 5.7 d.",
    q1Ok: "Des jours, pas des semaines : long veut dire que du travail attend quelque part.",
    q2: "Un seul déploiement jusqu'ici, 0 % de failure rate. Un job rouge la semaine prochaine, et le failure rate affiche :",
    q2a: "50 %",
    q2b: "10 %",
    q2c: "Toujours 0 %, un job rouge n'est pas un échec",
    q2bTip: "Avec un seul déploiement, les petits nombres bougent par grands pas : un job rouge sur deux, c'est 50 %.",
    q2cTip: "Un job de déploiement rouge, c'est exactement ce que compte le failure rate.",
    q2Ok: "Les petits nombres bougent par grands pas. La note porte sur la période, pas sur vous.",
    choose: "Haut et bas choisissent, Entrée répond. Ou touchez.",
    shipped: "Vous avez livré une fois, et les métriques DORA disent exactement ça.",
    info_checks: "Vous avez sauté {{n}} des trois contrôles de l'étape 1 : connaissez les étapes manuelles et regardez la production avant de créer quoi que ce soit.",
    info_verify: "Vous avez vérifié {{n}} choses sur 3 dans l'org de production : l'incident le plus courant après une release, c'est une ancienne fonctionnalité qui casse.",
    info_quick: "Vous avez raté le Quick Deploy : la validation a déjà exécuté les tests.",
    info_coins: "Vous avez mangé {{got}} légumes sur {{total}}."
  })
};

/** The product words taken word for word from the labs, checked by scripts/verify/check-easter-egg.mjs. */
export const QUOTES = [
  { lab: "1.6", text: "Already run during the validation" },
  { lab: "2.4", text: "Mark as done" },
  { lab: "2.4", text: "1 to do by hand" },
  { lab: "3.6", text: "destructiveChanges.xml" },
  { lab: "3.6", text: "sf org login jwt" },
  { lab: "3.6", text: "Re-run all jobs" },
  { lab: "3.6", text: "Mark as done in preprod" },
  { lab: "3.6", text: "Process Deployment (sfdx-hardis)" },
  { lab: "3.6", text: "Deployments per week" },
  { lab: "3.6", text: "Lead time" },
  { lab: "3.6", text: "Failure rate" },
  { lab: "3.6", text: "Recovery" },
  { lab: "3.6", text: "Rework" },
  { lab: "3.6", text: "No data" },
  { lab: "3.6", text: "Last 90 days" }
];

// The numbers of a DORA card after a first release
const DORA = [
  { metric: "Deployments per week", value: "0.1 / week", rating: "Low" },
  { metric: "Lead time (median)", value: "5.7 d", rating: "High" },
  { metric: "Failure rate", value: "0 %", rating: "Elite" },
  { metric: "Recovery (median)", value: "No data", rating: "" },
  { metric: "Rework", value: "0 %", rating: "Elite" }
];
const RATING_COLORS = { Elite: "#2E844A", High: "#0176D3", Medium: "#DD7A01", Low: "#BA0517", "": "#706E6B" };

function el(tag, className, parent, text) {
  const node = document.createElement(tag);
  if (className) {
    node.className = className;
  }
  if (text !== undefined) {
    node.textContent = text;
  }
  if (parent) {
    parent.appendChild(node);
  }
  return node;
}

export function createWorld(ctx) {
  const { t, hud } = ctx;
  const verdict = ctx.judgePlan();
  const manualOk = verdict.deliverability.ok;

  /* ---------- The track ---------- */

  const look = (id, color, glyph, sign, title, extra) => Object.assign({ id, color, glyph, sign: t(sign), title: t(title), tip: t(title + "_tip") }, extra);
  const LOOKS = {
    green: look("green", SLDS.warningDark, "check", "s_green", "o_green"),
    fail: look("fail", SLDS.purple, "error", "s_fail", "o_fail"),
    prod: look("prod", SLDS.errorDark, "error", "s_prod", "o_prod"),
    drift: look("drift", SLDS.warningDark, "warning", "s_drift", "o_drift", { signEvery: true }),
    half: look("half", SLDS.error, "loop", "s_half", "o_half"),
    old: look("old", SLDS.errorDark, "flow", "s_old", "o_old"),
    tests: look("tests", SLDS.purple, "code", "s_quick", "o_tests", { group: "tests", sign: "" }),
    latemain: look("latemain", SLDS.warningDark, "warning", "s_late", "o_latemain", { signEvery: true })
  };
  // The bonus pickups on the beat: vegetables, as in world 0
  const COIN = { id: "veg", vegetable: true, color: "#2E844A", glyph: "star" };
  const OK = { id: "ok", color: SLDS.success, glyph: "check" };
  const L = createLevel();
  const part = (bar, color, archKey) => {
    L.zone(bar * BAR, color);
    L.arch(bar * BAR + 0.6, t(archKey), { color: "#" + color.toString(16).padStart(6, "0") });
  };
  // Each check, key and component is the salesforce item of what it means
  const ITEM = { check1: "check-pass", check2: "check-warn", check3: "org-cloud", jwt: "permission-set", quick: "lwc", v1: "custom-field", v2: "lwc", v3: "record" };
  const POWER = (id, color, glyph) => ({ id, model: ITEM[id], color, glyph, sign: t("s_" + id) });

  // Part 1: the three checks worth checking
  part(0, 0xffb400, "arch0");
  L.music(0, "intro");
  L.music(2 * BAR, "verse");
  const p1 = { block: LOOKS.green, coin: COIN };
  ["..--", "-.--", "x.--", "x.-.", "x.x.", "-.--"].forEach((p, i) => L.riff(i, p, p1));
  L.power(1 * BAR + 1, POWER("check1", SLDS.success, "check"));
  L.power(3 * BAR + 2, POWER("check2", SLDS.warningDark, "warning"));
  L.power(5 * BAR + 1, POWER("check3", SLDS.brand, "eye"));

  // Part 2: the rehearsal in preprod, where a mistake costs nothing
  L.checkpoint(6 * BAR);
  part(6, 0x9050e9, "arch1");
  L.soft(6 * BAR, 18 * BAR);
  const p2 = { block: LOOKS.fail, coin: COIN };
  L.riff(6, "--..", p2);
  L.power(6 * BAR + 2, POWER("jwt", SLDS.navy, "lock"), true);
  L.riff(7, "-...", p2);
  if (manualOk) {
    L.manual(8 * BAR, { header: t("stopHeader"), button: t("stopButton"), id: "preprod" });
  } else {
    L.block(7 * BAR + 2, LOOKS.latemain);
  }
  L.riff(8, "..-.", p2);
  RIFF.forEach((p, i) => L.riff(9 + i, p, p2));
  L.riff(17, "s-..", p2);
  // Victor's note, at the top of the spring's jump, at the end of the rehearsal
  L.note(17 * BAR + 1, 2 * 2.3 + 0.45);

  // Part 3: the production Pull Request
  L.checkpoint(18 * BAR);
  part(18, 0x032d60, "arch2");
  const p3 = { block: LOOKS.prod, coin: COIN };
  L.riff(18, "--..", p3);
  L.power(18 * BAR + 2, { id: "jwt2", model: "permission-set", color: SLDS.navy, glyph: "lock", sign: t("s_jwt2") }, true);
  L.riff(19, "-...", p3);
  if (manualOk) {
    L.manual(20 * BAR, { header: t("stopHeader"), button: t("stopButton"), id: "prod" });
  } else {
    L.block(19 * BAR + 2, LOOKS.latemain);
  }
  L.riff(20, "..-.", p3);
  L.riff(21, "-.-.", p3);
  L.choice(22 * BAR, {
    header: t("choiceHeader"),
    rounds: [
      {
        prompt: t("q0"),
        detail: t("q0d"),
        lesson: t("q0Ok"),
        options: [
          { label: t("q0b"), ok: false, tip: t("q0bTip") },
          { label: t("q0a"), ok: true },
          { label: t("q0c"), ok: false, tip: t("q0cTip") }
        ]
      }
    ]
  });
  L.riff(22, "..-.", p3);

  // Part 4: merge, and stay: the same riff, for real, with drift
  L.checkpoint(23 * BAR);
  part(23, 0xe3066a, "arch3");
  L.music(23 * BAR, "chorus");
  L.riff(23, "-.--", p3);
  L.power(23 * BAR + 1, POWER("quick", SLDS.purple, "bolt"));
  L.block(24 * BAR, LOOKS.tests, { convert: OK });
  L.block(24 * BAR + 2, LOOKS.tests, { convert: OK });
  L.riff(24, ".-.-", p3);
  RIFF.forEach((p, i) => L.riff(25 + i, p, p3));
  // The one thing preprod did not have
  L.block(26 * BAR + 3, LOOKS.drift);
  L.checkpoint(30 * BAR);
  L.riff(33, "x-..", { block: LOOKS.half, coin: COIN });
  L.riff(34, "--..", p3);

  // Part 5: verify in production, the new story and an old one
  L.checkpoint(35 * BAR);
  part(35, 0x2e844a, "arch4");
  const p5 = { block: LOOKS.old, coin: OK };
  ["-.--", "x.-.", "-.--", "x.x.", "-.--", "----"].forEach((p, i) => L.riff(35 + i, p, p5));
  L.power(35 * BAR + 1, POWER("v1", SLDS.brand, "gear"));
  L.power(37 * BAR + 1, POWER("v2", SLDS.teal, "flow"));
  L.power(39 * BAR + 1, POWER("v3", SLDS.success, "check"));
  // The song speeds up part by part, on bar lines: production plays the riff of preprod faster
  [
    [6, 1.06],
    [18, 1.12],
    [23, 1.2],
    [35, 1.28]
  ].forEach(([bar, pace]) => L.tempo(bar * BAR, pace));
  L.end(41 * BAR, { text: t("s_dora"), glyph: "star", color: SLDS.navy });

  /* ---------- The story on the way ---------- */

  const path = (i) => hud.setPath([t("path0"), t("path1"), t("path2"), t("path3"), t("path4")], i);
  L.script(0, () => {
    path(0);
    hud.goal(t("goal0"));
  });
  L.script(6 * BAR, (api) => {
    path(1);
    hud.goal(t("goal1"));
    api.coach(t("coachRehearse"), 2800, true);
  });
  if (manualOk) {
    L.script(7 * BAR, () => hud.goal(t("goal1manual")));
    L.script(8 * BAR + 1, () => hud.goal(t("goal1")));
  }
  L.script(18 * BAR, () => {
    path(2);
    hud.goal(t("goal2"));
  });
  L.script(23 * BAR, () => {
    path(3);
    hud.goal(t("goal3"));
    hud.tick("Deployment mode: FULL + Quick Deploy");
  });
  L.script(25 * BAR - 1, (api) => api.coach(t("coachProd"), 2600, true));
  L.script(34 * BAR, () => {
    hud.tick(t("mainGreen"));
    ctx.sound.play("gate");
  });
  L.script(35 * BAR, (api) => {
    path(4);
    hud.goal(t("goal4"));
    api.coach(t("coachVerify"), 2800, true);
  });

  let phase = "run";
  let finished = false;
  let card = null;
  let quiz = null;
  const run = createMusicalRun(ctx, {
    song: SONG,
    level: L,
    palette: [0x9050e9, 0xe3066a, 0xffb400, 0x06a59a, 0x1b96ff, 0x2e844a],
    scenery: SCENERY,
    coinModels: { ok: "check-pass" },
    pitModel: "check-fail",
    checkpointModel: "check-pass",
    // The release: the rocket takes off when the world is done, past the Cloudity logo
    // (the shell shows the badge itself, beside its celebration card)
    finish: [{ name: "rocket", height: 3.6 }],
    finishLine: { name: "cloudity-logo", height: 1.3 },
    callbacks: {
      onPower(power) {
        const toast = { check1: "p_check1", check2: "p_check2", check3: "p_check3", jwt: "p_jwt", jwt2: "p_jwt2", quick: "p_quick", v1: "p_v1", v2: "p_v2", v3: "p_v3" }[power.id];
        if (toast) {
          hud.toast(t(toast), "power");
        }
        if (power.id === "quick") {
          run.convert("tests");
          run.coach(t("coachQuick"), 2600, true);
        }
      },
      onSoftHit(look) {
        if (look) {
          hud.tip(look.tip);
        }
      },
      onManual(stop) {
        ctx.collect(150, t(stop.event.id === "preprod" ? "stopDone1" : "stopDone2"));
      },
      onEnd() {
        showDora();
      },
      onEndAction(name) {
        doraAction(name);
      }
    }
  });

  /* ---------- The DORA card ---------- */

  const QUESTIONS = [
    { q: "q1", answers: [{ key: "q1a", ok: true }, { key: "q1b", tip: "q1bTip" }, { key: "q1c", tip: "q1cTip" }], lesson: "q1Ok" },
    { q: "q2", answers: [{ key: "q2a", ok: true }, { key: "q2b", tip: "q2bTip" }, { key: "q2c", tip: "q2cTip" }], lesson: "q2Ok" }
  ];
  let question = 0;
  let choice = 0;
  let buttons = [];

  function showDora() {
    phase = "dora";
    ctx.setData("phase", "dora");
    // The card says what to do; on a phone the goal line and the jump pad would cover it
    hud.goal("");
    hud.setPath([], 0);
    hud.setPads([]);
    card = el("div", "gr-w8-card gr-scroll", hud.layer);
    const head = el("div", "gr-w8-head", card);
    el("strong", "", head, t("doraTitle"));
    el("span", "", head, t("doraPeriod"));
    const grid = el("div", "gr-w8-grid", card);
    for (const row of DORA) {
      const cell = el("div", "gr-w8-metric", grid);
      el("span", "gr-w8-name", cell, row.metric);
      el("strong", "gr-w8-value", cell, row.value);
      if (row.rating) {
        const badge = el("span", "gr-w8-rating", cell, row.rating);
        badge.style.background = RATING_COLORS[row.rating];
      }
    }
    quiz = el("div", "gr-w8-quiz", card);
    ask(0);
  }

  function ask(index) {
    question = index;
    ctx.setData("question", index + 1);
    quiz.replaceChildren();
    const q = QUESTIONS[index];
    el("p", "gr-w8-question", quiz, t(q.q));
    el("p", "gr-w8-hint", quiz, t("choose"));
    const answers = q.answers.slice().sort(() => ctx.random() - 0.5);
    buttons = answers.map((answer, i) => {
      const button = el("button", "gr-w8-answer", quiz, t(answer.key));
      button.type = "button";
      button.dataset.ok = answer.ok ? "1" : "0";
      button.addEventListener("click", () => {
        choice = i;
        answerWith(answer, button);
      });
      return button;
    });
    choice = 0;
    highlight();
  }

  function highlight() {
    buttons.forEach((b, i) => b.classList.toggle("is-chosen", i === choice));
  }

  function answerWith(answer, button) {
    if (!ctx.playing || finished) {
      return;
    }
    const q = QUESTIONS[question];
    if (answer.ok) {
      ctx.sound.play("wheek");
      ctx.collect(250, t(q.lesson));
      if (question + 1 < QUESTIONS.length) {
        ask(question + 1);
      } else {
        finished = true;
        hud.toast(t("shipped"), "good");
        run.finale();
        run.launch();
        const info = missedInfo();
        ctx.setData("missed", info ? "yes" : "no");
        ctx.finish(bonus(), info);
      }
    } else {
      button.disabled = true;
      button.classList.add("is-wrong");
      ctx.loseAttempt(t(answer.key), t(answer.tip));
      // The cursor leaves the wrong answer, so Enter never picks it twice
      const open = buttons.findIndex((b) => !b.disabled);
      if (open >= 0) {
        choice = open;
        highlight();
      }
    }
  }

  function doraAction(name) {
    if (phase !== "dora" || !buttons.length) {
      return;
    }
    const step = name === "jump" || name === "left" ? -1 : name === "duck" || name === "right" ? 1 : 0;
    if (step) {
      for (let i = 0; i < buttons.length; i++) {
        choice = (choice + step + buttons.length) % buttons.length;
        if (!buttons[choice].disabled) {
          break;
        }
      }
      highlight();
    } else if (name === "confirm" && !buttons[choice].disabled) {
      buttons[choice].click();
    }
  }

  function checksTaken() {
    return ["check1", "check2", "check3"].filter((id) => run.powerTaken(id)).length;
  }

  function verified() {
    return ["v1", "v2", "v3"].filter((id) => run.powerTaken(id)).length;
  }

  function bonus() {
    const s = run.stats;
    let points = 200 + Math.round((200 * s.got) / Math.max(1, s.coins));
    points -= (3 - checksTaken()) * 30 + (3 - verified()) * 30;
    if (!run.powerTaken("quick")) {
      points -= 30;
    }
    return Math.max(0, points);
  }

  function missedInfo() {
    const lines = [];
    const s = run.stats;
    if (checksTaken() < 3) {
      lines.push(t("info_checks", { n: 3 - checksTaken() }));
    }
    if (verified() < 3) {
      lines.push(t("info_verify", { n: verified() }));
    }
    return endMissedInfo(lines, run, s, t);
  }

  return musicalWorld(
    run,
    () => finished,
    () => {
      if (card) {
        card.remove();
      }
    }
  );
}

export const CSS =
  MUSICAL_CSS +
  `
.guinea-run .gr-w8-card {
  position: absolute;
  top: 50%;
  left: 50%;
  width: min(560px, calc(100vw - 24px));
  max-height: calc(100dvh - 150px);
  overflow-y: auto;
  overscroll-behavior: contain;
  transform: translate(-50%, -45%);
  border: 3px solid #032d60;
  border-radius: 14px;
  background: #ffffff;
  box-shadow: 0 6px 30px rgba(3, 45, 96, 0.45);
  pointer-events: auto;
  touch-action: pan-y;
  animation: gr-card-in 0.4s ease-out;
}
.guinea-run:not([data-state="playing"]) .gr-w8-card {
  visibility: hidden;
}
.guinea-run .gr-w8-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 10px 14px;
  border-bottom: 2px solid #c9c9c9;
  color: #032d60;
}
.guinea-run .gr-w8-head strong {
  font-size: 19px;
}
.guinea-run .gr-w8-head span {
  color: #444444;
  font-size: 14px;
}
.guinea-run .gr-w8-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 8px;
  padding: 10px 14px;
}
.guinea-run .gr-w8-metric {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 10px;
  border: 1px solid #c9c9c9;
  border-radius: 8px;
}
.guinea-run .gr-w8-name {
  color: #444444;
  font-size: 13px;
}
.guinea-run .gr-w8-value {
  color: #032d60;
  font-size: 20px;
}
.guinea-run .gr-w8-rating {
  align-self: flex-start;
  padding: 1px 8px;
  border-radius: 999px;
  color: #ffffff;
  font-size: 12px;
  font-weight: 800;
}
.guinea-run .gr-w8-quiz {
  padding: 4px 14px 14px;
}
.guinea-run .gr-w8-question {
  margin: 6px 0 2px;
  color: #032d60;
  font-size: 16px;
  font-weight: 800;
}
.guinea-run .gr-w8-hint {
  margin: 0 0 8px;
  color: #444444;
  font-size: 13px;
}
.guinea-run .gr-w8-answer {
  display: block;
  width: 100%;
  min-height: 48px;
  margin: 6px 0;
  padding: 8px 12px;
  border: 2px solid #c9c9c9;
  border-radius: 10px;
  background: #ffffff;
  color: #181818;
  font: inherit;
  font-size: 15px;
  text-align: left;
  cursor: pointer;
  touch-action: manipulation;
}
.guinea-run .gr-w8-answer.is-chosen {
  border-color: #0176d3;
  box-shadow: 0 0 0 2px #0176d3;
  background: #eef4ff;
}
.guinea-run .gr-w8-answer.is-wrong {
  border-color: #ea001e;
  background: #fef1ee;
  color: #ba0517;
  text-decoration: line-through;
}
`;
