/*
 * World 9, Monitor production: a Space Invaders over the production org.
 *
 * US-014 is in production, and admins keep changing the production org by
 * hand, in Setup: "But it's faster!". They march down in formation, the way
 * invaders do, and drop their manual changes (Setup gears, wrenches) on the
 * guinea pig, who guards production at the bottom of the screen. A hit costs
 * a heart.
 *
 * The guinea pig throws vegetables. Each one that hits an admin is the
 * monitoring catching the change: an alert ("Detected by the monitoring:
 * ..."), and the change flies back up to the pipeline as a Pull Request. That
 * is Lab 3.8: the nightly backup of production shows every change made by
 * hand, and each one belongs in a Pull Request.
 *
 * Three waves, each a little faster, then the boss: the Sales Manager, a
 * System Administrator badge on his suit, who updates Flows directly in
 * production on weekends. He has a health bar and three attacks, all
 * readable: a fan of Flows aimed at the guinea pig, a rain of gears whose gap
 * shows on the floor before it falls, and, once he is angry, admins called to
 * help. Beaten, he gives up in one line and the world ends.
 *
 * Each admin wears one of nine cartoon faces (images/bosses/boss-N.svg), the
 * boss his own (final-boss.svg): one atlas texture, one instanced disc per
 * face. A face that does not load is drawn plain, the world never waits.
 *
 * Victor's note crosses the top of the field once in wave 2 and once in wave
 * 3, behind the formation: a vegetable thrown through a gap finds it.
 *
 * Fair by design: nothing is dropped from closer than DROP_MIN_Z, a lost
 * heart clears every falling thing, slows the pace for a few seconds and
 * eases the rest of the world a little; admins that reach production cost
 * one heart and leave, the formation steps back: nothing missed blocks the
 * end. The boss attacks one pattern at a time, stops and shakes his phone
 * before each, and a player out of hearts at the boss tries again from the
 * boss, not from the first wave.
 *
 * On a phone the guinea pig throws on its own: the thumbs steer, a held fire
 * button would hide part of the field, and the rate is the one a held key
 * gets, so it is not easier.
 */

import { glyph, fitText } from "../core/painter.js";

export const PADS = ["left", "right", "jump"];
// The salesforce pack for the Flows, the Pull Requests and Victor's note; the vegetables are thrown
export const MODELS = ["salesforce", "vegetables"];

// What the guinea pig throws, in turn
const VEGETABLES = ["carrot", "fennel", "bell-pepper", "cucumber", "romaine", "parsley"];
const VEGETABLE_COLORS = [0xff8a3d, 0x7bc96f, 0xe8473b, 0x3e9b4f, 0x8cd17d, 0x2e844a];

// The field: x from -FIELD_HALF to FIELD_HALF, the guinea pig at z = 0, the
// admins coming down from the far end towards the production line
const FIELD_HALF = 5;
const PIG_LIMIT = 4.2;
const PIG_SPEED = 7.5;
const DRAG_SPEED = 18;
// A finger does not have to cross the whole screen to cross the field
const DRAG_GAIN = 1.35;
const NUDGE_S = 0.12;
const PROD_Z = -1.5;
const NEAR_Z = 1.25;
const TOP_Z = -14.4;

// The admins: a big face over a small body holding a laptop
const MAX_ADMINS = 26;
const FACES = 9;
const FACE_SIZE = 1.42;
const FACE_Y = 1.2;
const COL_GAP = 1.58;
const ROW_GAP = 1.65;
const FORMATION_Z = -12.4;
const ENTER_S = 1.4;
const STEP_DOWN = 0.5;
const ADMIN_HALF = 0.68;
const ADMIN_DEPTH = 0.5;
const DIE_S = 0.32;
// Back to front: purple, blue, teal, pink shirts
const ROW_COLORS = [0x9050e9, 0x0176d3, 0x06a59a, 0xe3066a];
const WAVES = [
  { rows: 2, cols: 5, speed: 1.0, drop: 2.4, dropSpeed: 4.1, maxDrops: 2 },
  { rows: 3, cols: 5, speed: 1.2, drop: 1.9, dropSpeed: 4.5, maxDrops: 3 },
  { rows: 4, cols: 5, speed: 1.4, drop: 1.55, dropSpeed: 4.9, maxDrops: 4 }
];
const ADMIN_POINTS = 20;

// The vegetables: one in the air at a time, as in the arcade, so a miss costs its flight and aiming matters
const SHOT_POOL = 1;
const SHOT_SPEED = 14;
const SHOT_COOLDOWN = 0.25;
const SHOT_HALF = 0.16;
const SHOT_Y = 0.85;
const FIRE_BUFFER_S = 0.18;

// What falls on production: gears and wrenches from the admins, Flows from the boss
const DROP_POOL = 28;
const GEAR = 0;
const WRENCH = 1;
const FLOW = 2;
const DROP_RADIUS = [0.3, 0.3, 0.45];
const FLOW_SIZE = 1.15;
// Nothing is dropped closer than this: never a shot that cannot be dodged
const DROP_MIN_Z = -4.6;
const PIG_HIT_X = 0.36;
const PIG_HIT_Z = 0.45;
const INVULNERABLE_S = 1.8;

// The pace: 1 at the start, about +35% by the end of the boss. A lost heart
// takes MERCY off for a while, and eases the rest of the world for good
const PACE_GAIN = 0.35;
const PACE_CUES = [1.1, 1.2, 1.3];
const MERCY = 0.15;
const MERCY_FADE = 0.03;
const EASE_PER_LOSS = 0.06;
const EASE_MIN = 0.76;

// The Sales Manager
const BOSS_HP = 32;
const BOSS_Z = -11.4;
const BOSS_SCALE = 1.25;
const BOSS_HALF = 1.25;
const BOSS_FACE = 2.8;
const BOSS_FACE_Y = 3.85;
// The top of his face, which the camera always keeps in view
const BOSS_TOP = 5.3;
const BOSS_ENTER_S = 2.4;
const BOSS_TALK_S = 7.5;
const WINDUP_S = 0.6;
const FLOW_SPEED = 3.9;
const RAIN_SPEED = 5;
const RAIN_WARN_S = 1.1;
const RAIN_X = [-4.2, -2.8, -1.4, 0, 1.4, 2.8, 4.2];
const HELPER_SPEED = 1.05;
const HELPER_X = [-3.6, -1.2, 1.2, 3.6];

// Victor's note crosses behind the formation
const NOTE_Z = -14;
const NOTE_SPEED = 2.3;

// A player out of hearts at the boss starts the next try at the boss, within
// this long: the three waves are behind them. Kept by the module, which outlives
// a world (the shell builds a fresh one for each try)
const BOSS_RETRY_MS = 15 * 60000;
let bossRetryAt = 0;

const PR_POOL = 10;
const PR_LIFE = 1.1;
const ALERTS = 12;
const SAYINGS = 6;

export const TEXTS = {
  en: {
    intro: "US-014 is in production, and now admins change the production org by hand, in Setup, because it's faster. Each vegetable that hits one is the monitoring catching the change: it goes back to the pipeline as a Pull Request.",
    how1: "Move with Left and Right or A / D, or drag on a phone",
    how2: "Hold Space or Up to throw vegetables (a phone throws on its own)",
    how3: "Dodge the gears they drop, then beat the Sales Manager",
    note: "Read last night's backup of production every morning: a change you did not deploy was made by hand. Put it in a Pull Request the same day, before the next deployment overwrites it. - V.",
    keysJump: "Throw: Space, up arrow or W (Z on AZERTY), hold it to keep throwing",
    keysTouch: "Drag or use the buttons to move: the guinea pig throws on its own",
    btnJump: "Throw",
    p1: "Wave 1",
    p2: "Wave 2",
    p3: "Wave 3",
    p4: "Sales Manager",
    prodSign: "PRODUCTION ORG",
    goalWave: "{{n}} admins left: keep them off production",
    goalTalk: "The Sales Manager has something to say...",
    goalBoss: "Beat the Sales Manager, dodge his Flows",
    goalHelpers: "Stop his admins before they reach production",
    coachStart: "Throw vegetables at the admins!",
    coachFire: "Hold Space to throw vegetables!",
    coachDrop: "Dodge the gears: manual changes!",
    coachWave2: "Wave 2: more admins!",
    coachWave3: "Wave 3: they march faster!",
    coachCleared: "Wave cleared!",
    coachBoss: "Here comes the boss...",
    coachFight: "Dodge his Flows, keep throwing!",
    coachAngry: "He is angry: faster!",
    coachHelpers: "He calls his admins!",
    faster: "Faster!",
    say0: "But it's faster!",
    say1: "Just one tiny change!",
    say2: "Nobody will notice!",
    say3: "I'll put it in git later!",
    say4: "It's only a checkbox!",
    say5: "No time for a Pull Request!",
    bossName: "Sales Manager",
    bossBadge: "System Administrator",
    bossLine: "I am the boss, the sales manager! I must be admin, I do what I want, even updating Flows directly in production on weekends!",
    bossGiveUp: "OK... I'll open a Pull Request.",
    bossDown: "The Sales Manager gives up!",
    retryBoss: "Straight back to the Sales Manager: the waves are done",
    retryHint: "Try again starts at the Sales Manager.",
    monTitle: "Production monitoring",
    monCounts: "Alerts {{alerts}} · Pull Requests {{prs}}",
    monIdle: "Watching the production org",
    alertHead: "Detected by the monitoring:",
    a0: "Flow on Case changed directly in production",
    a1: "Validation rule on Opportunity changed directly in production",
    a2: "Field on Contact changed directly in production",
    a3: "Profile Sales User changed directly in production",
    a4: "Permission set Sales_Manager changed directly in production",
    a5: "Page layout on Account changed directly in production",
    a6: "Flow on Opportunity changed directly in production",
    a7: "Validation rule on Account changed directly in production",
    a8: "Field on Case changed directly in production",
    a9: "Permission set Sales_Rep changed directly in production",
    a10: "List view on Contact changed directly in production",
    a11: "Flow on Account changed directly in production",
    aBoss: "Flows changed directly in production on the weekend",
    hitTitle: "A manual change hit production",
    hitTip: "Made by hand in production, a change is in no branch: the next deployment can overwrite it. It belongs in a Pull Request.",
    flowTitle: "A Flow updated directly in production",
    flowTip: "Even on a weekend, a Flow goes through a Pull Request: built in a sandbox, checked, deployed the same way everywhere.",
    invadeTitle: "Admins changed production unseen",
    invadeTip: "Nobody watches production between releases. The nightly monitoring backup does: its git history shows each change.",
    endToast: "Production is clean: every change is in a Pull Request",
    missedInfo: "{{n}} admins changed production before you caught them. In real life the nightly backup still shows their changes in the git history of the monitoring repository: read it, and put each one in a Pull Request."
  },
  fr: {
    intro: "US-014 est en production, et maintenant des admins modifient l'org de production à la main, dans Setup, parce que c'est plus rapide. Chaque légume qui en touche un, c'est le monitoring qui attrape le changement : il repart dans le pipeline en Pull Request.",
    how1: "Bougez avec Gauche et Droite ou Q / D, ou glissez sur un téléphone",
    how2: "Maintenez Espace ou Haut pour lancer des légumes (tout seul sur téléphone)",
    how3: "Évitez les engrenages qu'ils lâchent, puis battez le directeur commercial",
    note: "Lisez chaque matin la sauvegarde de production de la nuit : un changement que vous n'avez pas déployé a été fait à la main. Mettez-le dans une Pull Request le jour même, avant que le prochain déploiement ne l'écrase. - V.",
    keysJump: "Lancer : Espace, flèche haut ou Z en AZERTY (W en QWERTY), maintenez pour continuer",
    keysTouch: "Glissez ou utilisez les boutons pour bouger : le cochon d'Inde lance tout seul",
    btnJump: "Lancer",
    p1: "Vague 1",
    p2: "Vague 2",
    p3: "Vague 3",
    p4: "Directeur commercial",
    prodSign: "ORG DE PRODUCTION",
    goalWave: "Encore {{n}} admins : gardez la production",
    goalTalk: "Le directeur commercial a quelque chose à dire...",
    goalBoss: "Battez le directeur commercial, évitez ses Flows",
    goalHelpers: "Arrêtez ses admins avant la production",
    coachStart: "Lancez des légumes sur les admins !",
    coachFire: "Maintenez Espace pour lancer des légumes !",
    coachDrop: "Évitez les engrenages : des changements manuels !",
    coachWave2: "Vague 2 : plus d'admins !",
    coachWave3: "Vague 3 : ils avancent plus vite !",
    coachCleared: "Vague terminée !",
    coachBoss: "Voici le chef...",
    coachFight: "Évitez ses Flows, continuez à lancer !",
    coachAngry: "Il s'énerve : plus vite !",
    coachHelpers: "Il appelle ses admins !",
    faster: "Plus vite !",
    say0: "Mais c'est plus rapide !",
    say1: "Juste un petit changement !",
    say2: "Personne ne verra rien !",
    say3: "Je le mettrai dans git plus tard !",
    say4: "C'est juste une case à cocher !",
    say5: "Pas le temps pour une Pull Request !",
    bossName: "Directeur commercial",
    bossBadge: "Administrateur système",
    bossLine: "Je suis le chef, le directeur commercial ! Je dois être admin, je fais ce que je veux, même modifier des Flows directement en production le week-end !",
    bossGiveUp: "Bon... J'ouvre une Pull Request.",
    bossDown: "Le directeur commercial abandonne !",
    retryBoss: "Retour direct au directeur commercial : les vagues sont faites",
    retryHint: "Réessayer reprend au directeur commercial.",
    monTitle: "Monitoring de la production",
    monCounts: "Alertes {{alerts}} · Pull Requests {{prs}}",
    monIdle: "Surveille l'org de production",
    alertHead: "Détecté par le monitoring :",
    a0: "Flow sur Requête modifié directement en production",
    a1: "Règle de validation sur Opportunité modifiée directement en production",
    a2: "Champ sur Contact modifié directement en production",
    a3: "Profil Sales User modifié directement en production",
    a4: "Permission set Sales_Manager modifié directement en production",
    a5: "Présentation de page sur Compte modifiée directement en production",
    a6: "Flow sur Opportunité modifié directement en production",
    a7: "Règle de validation sur Compte modifiée directement en production",
    a8: "Champ sur Requête modifié directement en production",
    a9: "Permission set Sales_Rep modifié directement en production",
    a10: "Vue de liste sur Contact modifiée directement en production",
    a11: "Flow sur Compte modifié directement en production",
    aBoss: "Flows modifiés directement en production le week-end",
    hitTitle: "Un changement manuel a touché la production",
    hitTip: "Fait à la main en production, un changement n'est dans aucune branch : le prochain déploiement peut l'écraser. Sa place est dans une Pull Request.",
    flowTitle: "Un Flow modifié directement en production",
    flowTip: "Même le week-end, un Flow passe par une Pull Request : construit dans une sandbox, contrôlé, déployé partout de la même façon.",
    invadeTitle: "Des admins ont modifié la production sans être vus",
    invadeTip: "Personne ne surveille la production entre deux releases. La sauvegarde du monitoring, chaque nuit, si : son historique git montre chaque changement.",
    endToast: "La production est propre : chaque changement est dans une Pull Request",
    missedInfo: "{{n}} admins ont modifié la production avant d'être attrapés. En vrai, la sauvegarde de la nuit montre quand même leurs changements dans l'historique git du repository de monitoring : lisez-le, et mettez chacun dans une Pull Request."
  }
};

/** Nothing here is quoted from the lab word for word. */
export const QUOTES = [];

export function createWorld(ctx) {
  const { THREE, root, pig, paint, t, hud, engine, camera } = ctx;
  const random = ctx.random;
  const scene = ctx.scene;
  const touch = Boolean(hud.touch);
  const overlay = hud.layer.parentElement;
  const canvas = overlay.querySelector(".gr-canvas");
  // What this world makes outside the painter, freed in dispose()
  const owned = [];

  // Scratch objects: a frame allocates nothing
  const matrix = new THREE.Matrix4();
  const work = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const roll = new THREE.Quaternion();
  const euler = new THREE.Euler();
  const scale = new THREE.Vector3();
  const color = new THREE.Color();
  const point = new THREE.Vector3();
  const AXIS_Z = new THREE.Vector3(0, 0, 1);
  const up = new THREE.Vector3();

  /* ---------- The night over production ---------- */

  // The monitoring runs at night: a starry sky over a lit stage
  const previous = { background: scene.background, fog: scene.fog };
  const sky = nightSky(THREE, random);
  owned.push(sky);
  scene.background = sky;
  scene.fog = new THREE.Fog(0x2b1d66, 30, 75);
  engine.hemi.intensity = 1.7;
  engine.sun.intensity = 2.3;

  const floor = new THREE.Mesh(
    paint.geometry("w9-floor", () => new THREE.PlaneGeometry(12, 24)),
    paint.material("w9-floor", 512, 1024, (c, w, h) => drawFloor(c, w, h, t), { roughness: 0.85 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, -8.5);
  floor.receiveShadow = true;
  root.add(floor);
  // The production line: where an admin must never set foot
  const line = new THREE.Mesh(
    paint.geometry("w9-line", () => new THREE.BoxGeometry(FIELD_HALF * 2 + 0.5, 0.06, 0.12)),
    paint.plain(0xff5d8f, { emissive: 0xe3066a, emissiveIntensity: 1.3, roughness: 0.4 })
  );
  line.position.set(0, 0.03, PROD_Z);
  root.add(line);
  const railGeometry = paint.geometry("w9-rail", () => new THREE.BoxGeometry(0.16, 0.3, 22));
  for (const [x, glow] of [
    [-FIELD_HALF - 0.3, 0x1b96ff],
    [FIELD_HALF + 0.3, 0x9050e9]
  ]) {
    const rail = new THREE.Mesh(railGeometry, paint.plain(glow, { emissive: glow, emissiveIntensity: 0.9, roughness: 0.4 }));
    rail.position.set(x, 0.15, -9);
    root.add(rail);
  }
  // Org clouds far away, over the night
  const clouds = [];
  [
    [-9, 3.5, -26, 2.6],
    [9.5, 5.5, -30, 3.2],
    [-3, 8.5, -38, 3.6],
    [12, 2.5, -20, 2],
    [-13, 6, -32, 3]
  ].forEach(([x, y, z, h], i) => {
    const cloud = ctx.models && ctx.models.get(i % 2 ? "scratch-cloud" : "org-cloud", { height: h, shadows: false });
    if (cloud) {
      cloud.position.set(x, y, z);
      cloud.rotation.y = -x * 0.04;
      root.add(cloud);
      clouds.push({ cloud, y, phase: i * 1.7 });
    }
  });

  /* ---------- Instancing helpers ---------- */

  function instanced(geometry, material, count, colored) {
    const mesh = new THREE.InstancedMesh(geometry, material, count);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    // The instances move every frame: a bounding sphere computed once would cull them wrongly
    mesh.frustumCulled = false;
    mesh.count = 0;
    if (colored) {
      color.setHex(0xffffff);
      for (let i = 0; i < count; i++) {
        mesh.setColorAt(i, color);
      }
    }
    root.add(mesh);
    owned.push(mesh);
    return mesh;
  }

  /**
   * One InstancedMesh per mesh of a model, centred on the middle of the model
   * so it spins on itself. The fallback shape stands in when the pack is missing.
   */
  function instancedModel(name, count, height, glowColor, fallback) {
    const copy = ctx.models ? ctx.models.get(name, { height, shadows: false }) : null;
    const parts = [];
    const centre = new THREE.Matrix4().makeTranslation(0, -height / 2, 0);
    if (copy) {
      copy.updateMatrixWorld(true);
      copy.traverse((child) => {
        if (child.isMesh) {
          const material = child.material.clone();
          material.emissive = new THREE.Color(glowColor);
          material.emissiveIntensity = 0.45;
          owned.push(material);
          parts.push({ mesh: instanced(child.geometry, material, count), local: new THREE.Matrix4().multiplyMatrices(centre, child.matrixWorld) });
        }
      });
    }
    if (!parts.length) {
      parts.push({ mesh: instanced(fallback.geometry, fallback.material, count), local: new THREE.Matrix4() });
    }
    return parts;
  }

  function setParts(parts, i, m) {
    for (const part of parts) {
      work.multiplyMatrices(m, part.local);
      part.mesh.setMatrixAt(i, work);
    }
  }

  function partsDone(parts, count) {
    for (const part of parts) {
      part.mesh.count = count;
      part.mesh.instanceMatrix.needsUpdate = true;
    }
  }

  /* ---------- The faces: one atlas, nine tiles ---------- */

  const TILE = 256;
  const atlas = document.createElement("canvas");
  atlas.width = TILE * 3;
  atlas.height = TILE * 3;
  const atlasContext = atlas.getContext("2d");
  const faceTexture = new THREE.CanvasTexture(atlas);
  faceTexture.colorSpace = THREE.SRGBColorSpace;
  faceTexture.anisotropy = 4;
  owned.push(faceTexture);
  const faceMaterial = new THREE.MeshBasicMaterial({ map: faceTexture, alphaTest: 0.5, toneMapped: false, fog: false });
  owned.push(faceMaterial);
  let disposed = false;
  for (let i = 0; i < FACES; i++) {
    drawPlainFace(atlasContext, (i % 3) * TILE, Math.floor(i / 3) * TILE, TILE, i);
    loadFace("boss-" + (i + 1) + ".svg", (image) => {
      const x = (i % 3) * TILE;
      const y = Math.floor(i / 3) * TILE;
      atlasContext.clearRect(x, y, TILE, TILE);
      drawFace(atlasContext, image, x, y, TILE);
      faceTexture.needsUpdate = true;
    });
  }
  faceTexture.needsUpdate = true;

  function loadFace(file, done) {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      if (!disposed) {
        done(image);
      }
    };
    // A face that does not load keeps its plain drawing
    image.onerror = () => {};
    image.src = new URL("../../../images/bosses/" + file, import.meta.url).href;
  }

  // A disc per face, its UVs on its tile of the atlas
  const faceMeshes = [];
  for (let i = 0; i < FACES; i++) {
    const geometry = paint.geometry("w9-face-" + i, () => {
      const disc = new THREE.CircleGeometry(FACE_SIZE / 2, 40);
      const uv = disc.attributes.uv;
      const col = i % 3;
      const row = Math.floor(i / 3);
      for (let k = 0; k < uv.count; k++) {
        uv.setXY(k, (col + uv.getX(k)) / 3, 1 - (row + 1 - uv.getY(k)) / 3);
      }
      return disc;
    });
    faceMeshes.push({ mesh: instanced(geometry, faceMaterial, MAX_ADMINS), n: 0 });
  }

  /* ---------- The admins ---------- */

  const lidMaterial = paint.material("w9-lid", 128, 96, drawLid, { roughness: 0.45, emissive: 0x1a2a4a });
  const adminParts = [
    // A small body in the colour of its row
    { mesh: instanced(paint.geometry("w9-body", () => new THREE.CapsuleGeometry(0.22, 0.26, 4, 12)), paint.plain(0xffffff, { roughness: 0.55 }), MAX_ADMINS, true), local: new THREE.Matrix4().makeTranslation(0, 0.36, 0) },
    // The laptop it changes production with: Setup open, the gear on its lid
    { mesh: instanced(paint.geometry("w9-base", () => new THREE.BoxGeometry(0.56, 0.035, 0.32)), paint.plain(0xc9d3e3, { roughness: 0.4, metalness: 0.3 }), MAX_ADMINS), local: new THREE.Matrix4().makeTranslation(0, 0.42, 0.42) },
    {
      mesh: instanced(paint.geometry("w9-lid", () => new THREE.BoxGeometry(0.56, 0.4, 0.03)), lidMaterial, MAX_ADMINS),
      local: new THREE.Matrix4().compose(new THREE.Vector3(0, 0.62, 0.6), new THREE.Quaternion().setFromEuler(new THREE.Euler(0.3, 0, 0)), new THREE.Vector3(1, 1, 1))
    }
  ];
  const bodyMesh = adminParts[0].mesh;
  const admins = [];
  for (let i = 0; i < MAX_ADMINS; i++) {
    admins.push({ index: i, alive: false, dying: 0, x: 0, z: 0, col: 0, row: 0, helper: false, face: 0, phase: random() * 6, say: 0, vx: 0, dropAt: 0 });
  }
  let used = 0;
  const formation = { x: 0, z: 0, targetZ: 0, dir: 1, cols: 5, rows: 2, enter: 0, pause: 0 };
  let wave = -1;
  let waveTotal = 0;
  let waveCaught = 0;
  let waveTime = 0;

  /* ---------- What flies: vegetables, drops, Flows, Pull Requests ---------- */

  const sphere = paint.geometry("w9-ball", () => new THREE.SphereGeometry(0.2, 12, 8));
  const vegetableParts = VEGETABLES.map((name, i) => instancedModel(name, SHOT_POOL, 0.8, VEGETABLE_COLORS[i], { geometry: sphere, material: paint.plain(VEGETABLE_COLORS[i]) }));
  const vegetableCounts = VEGETABLES.map(() => 0);
  const shots = [];
  for (let i = 0; i < SHOT_POOL; i++) {
    shots.push({ live: false, x: 0, z: 0, kind: 0, spin: 0 });
  }
  let shotCount = 0;
  let kindCursor = 0;

  const gearMesh = instanced(paint.geometry("w9-gear", () => gearGeometry(THREE)), paint.plain(0xff9a2e, { emissive: 0xdd5a01, emissiveIntensity: 0.7, roughness: 0.35, metalness: 0.2 }), DROP_POOL);
  const wrenchMesh = instanced(paint.geometry("w9-wrench", () => wrenchGeometry(THREE)), paint.plain(0xff4b5c, { emissive: 0xba0517, emissiveIntensity: 0.7, roughness: 0.35, metalness: 0.2 }), DROP_POOL);
  // The boss's Flows: a Flow icon in a red ring, facing the camera
  const flowMaterial = new THREE.MeshBasicMaterial({ map: paint.texture("w9-flow", 128, 128, drawFlowIcon), alphaTest: 0.5, toneMapped: false, fog: false });
  owned.push(flowMaterial);
  const flowMesh = instanced(paint.geometry("w9-flow-disc", () => new THREE.CircleGeometry(FLOW_SIZE / 2, 32)), flowMaterial, DROP_POOL);
  const drops = [];
  for (let i = 0; i < DROP_POOL; i++) {
    drops.push({ live: false, kind: GEAR, x: 0, z: 0, vx: 0, vz: 0, spin: 0 });
  }

  // The change back on its way to the pipeline: a green Pull Request icon facing the camera
  const prMaterial = new THREE.MeshBasicMaterial({ map: paint.texture("w9-pr", 128, 128, drawPrIcon), alphaTest: 0.5, toneMapped: false, fog: false });
  owned.push(prMaterial);
  const prMesh = instanced(paint.geometry("w9-pr-disc", () => new THREE.CircleGeometry(0.5, 32)), prMaterial, PR_POOL);
  const prs = [];
  for (let i = 0; i < PR_POOL; i++) {
    prs.push({ live: false, x: 0, y: 0, z: 0, age: 0 });
  }

  // The warnings on the floor before a rain of gears: one stripe per column
  const warnMaterial = new THREE.MeshBasicMaterial({ color: 0xff2d55, transparent: true, opacity: 0.35, depthWrite: false, toneMapped: false });
  owned.push(warnMaterial);
  const warnMesh = instanced(paint.geometry("w9-warn", () => new THREE.PlaneGeometry(0.9, 1).rotateX(-Math.PI / 2)), warnMaterial, RAIN_X.length);
  const rain = { on: false, time: 0, columns: [] };

  /* ---------- The Sales Manager ---------- */

  const boss = buildBoss();
  const fight = { on: false, state: "", hp: BOSS_HP, x: 0, z: -24, goal: 0, rest: 0, windup: 0, time: 0, next: 0, step: 0, flash: 0, angry: false, called: 0, slump: 0 };

  function buildBoss() {
    const group = new THREE.Group();
    group.scale.setScalar(BOSS_SCALE);
    group.visible = false;
    root.add(group);
    const suit = paint.plain(0x22325a, { roughness: 0.6 });
    const block = (geometry, material, x, y, z, sx, sy, sz) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      mesh.scale.set(sx || 1, sy || 1, sz || 1);
      mesh.castShadow = true;
      group.add(mesh);
      return mesh;
    };
    const cube = paint.geometry("w9-cube", () => new THREE.BoxGeometry(1, 1, 1));
    const capsule = paint.geometry("w9-boss-capsule", () => new THREE.CapsuleGeometry(0.5, 0.7, 6, 16));
    block(cube, paint.plain(0x1b1b28), -0.24, 0.42, 0, 0.32, 0.84, 0.34);
    block(cube, paint.plain(0x1b1b28), 0.24, 0.42, 0, 0.32, 0.84, 0.34);
    const jacket = block(capsule, suit, 0, 1.55, 0, 1.3, 1, 0.9);
    block(cube, paint.plain(0xffffff), 0, 1.75, 0.42, 0.34, 0.55, 0.04);
    block(cube, paint.plain(0xea001e, { emissive: 0x6a0010, emissiveIntensity: 0.5 }), 0, 1.68, 0.45, 0.13, 0.5, 0.04);
    const armGeometry = paint.geometry("w9-boss-arm", () => new THREE.CapsuleGeometry(0.16, 0.7, 4, 10));
    const leftArm = block(armGeometry, suit, -0.82, 1.55, 0.1);
    leftArm.rotation.z = -0.35;
    const rightArm = block(armGeometry, suit, 0.82, 1.6, 0.25);
    rightArm.rotation.set(-0.9, 0, 0.3);
    // His phone: Setup, from anywhere, on a Sunday
    block(cube, paint.plain(0x111111, { emissive: 0x0176d3, emissiveIntensity: 0.4 }), 0.95, 1.4, 0.72, 0.2, 0.34, 0.05);
    // The badge of his profile, as big as a sign so a phone reads it
    const badge = paint.sign("w9-badge", t("bossBadge"), { color: "#0176D3", glyph: "profile", height: 0.62 });
    badge.position.set(0, 1.2, 0.8);
    group.add(badge);
    // His face, from final-boss.svg, over the suit
    const faceCanvas = document.createElement("canvas");
    faceCanvas.width = 512;
    faceCanvas.height = 512;
    const faceContext = faceCanvas.getContext("2d");
    drawPlainFace(faceContext, 0, 0, 512, 4);
    const texture = new THREE.CanvasTexture(faceCanvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    owned.push(texture);
    loadFace("final-boss.svg", (image) => {
      faceContext.clearRect(0, 0, 512, 512);
      drawFace(faceContext, image, 0, 0, 512);
      texture.needsUpdate = true;
    });
    const faceMat = new THREE.MeshBasicMaterial({ map: texture, alphaTest: 0.5, toneMapped: false, fog: false });
    owned.push(faceMat);
    const face = new THREE.Mesh(paint.geometry("w9-boss-face", () => new THREE.CircleGeometry(BOSS_FACE / 2, 48)), faceMat);
    face.renderOrder = 1;
    root.add(face);
    face.visible = false;
    return { group, jacket, face, faceMaterial: faceMat, suit };
  }

  /* ---------- Victor's note ---------- */

  const note = { on: false, found: false, x: 0, dir: 1, passes: 0, object: null };
  {
    const copy = ctx.models && ctx.models.get("note", { height: 1.25, shadows: false });
    const object = new THREE.Group();
    if (copy) {
      // Its face to the camera (the salesforce items face -Z), glowing a little so it is noticed
      copy.position.y = -0.62;
      copy.rotation.y = Math.PI;
      copy.traverse((child) => {
        if (child.isMesh) {
          child.material = child.material.clone();
          child.material.emissive = new THREE.Color(0xffd84d);
          child.material.emissiveIntensity = 0.5;
          owned.push(child.material);
        }
      });
      object.add(copy);
    } else {
      object.add(new THREE.Mesh(paint.geometry("w9-note-box", () => new THREE.BoxGeometry(0.7, 0.7, 0.08)), paint.tile("w9-note", "#F2C94C", "note")));
    }
    object.visible = false;
    root.add(object);
    note.object = object;
  }

  /* ---------- The HTML: the monitoring panel, the boss bar, the bubbles ---------- */

  const panel = el("div", "gr-w9-panel", hud.extra);
  const panelHead = el("div", "gr-w9-head", panel);
  el("i", "gr-w9-dot", panelHead);
  el("strong", "", panelHead, t("monTitle"));
  const counts = el("span", "gr-w9-counts", panelHead);
  const alertLine = el("div", "gr-w9-alert", panel);
  const alertHead = el("b", "", alertLine);
  const alertText = el("span", "", alertLine, t("monIdle"));
  const bossBar = el("div", "gr-w9-bossbar", hud.extra);
  bossBar.hidden = true;
  el("strong", "", bossBar, t("bossName"));
  const bossTrack = el("i", "", bossBar);
  const bossFill = el("b", "", bossTrack);
  let alerts = 0;
  let sent = 0;
  const alertOrder = shuffle([...Array(ALERTS).keys()]);

  const bubbleLayer = el("div", "gr-w9-bubbles", hud.layer);
  // Two at most at once: more is a wall of text over the formation
  const bubbles = [0, 1].map(() => {
    const node = el("div", "gr-w9-say", bubbleLayer);
    node.hidden = true;
    return { node, admin: null, until: 0, px: -1, py: -1, width: 0 };
  });
  const bossBubble = { node: el("div", "gr-w9-say gr-w9-say--boss", bubbleLayer), until: 0, px: -1, py: -1, width: 0 };
  bossBubble.node.hidden = true;
  let nextSay = 1.5;

  function renderCounts() {
    counts.textContent = t("monCounts", { alerts, prs: sent });
    ctx.setData("alerts", alerts);
  }
  renderCounts();

  /* ---------- State ---------- */

  const player = { x: 0, target: null, vx: 0, invulnerable: 0, wobble: 0, cooldown: 0, buffer: 0, throwing: 0 };
  // Up on its back legs, front paws free to throw: its face shows from above
  pig.setSitting(true);
  let phase = "waves";
  let clock = 0;
  let shake = 0;
  let pace = 1;
  let mercy = 0;
  let ease = 1;
  let cue = 0;
  let missed = 0;
  let lastInvasion = -10;
  let chargedCall = 0;
  let finished = false;
  let endAt = 0;
  let endToastShown = false;
  let coachedDrop = false;
  let firedOnce = false;
  // What the data attributes last said, in hundredths: written only when it changes
  let paceShown = 100;
  let shownX = 0;
  const pigState = { running: false, airborne: false, ducking: false, speed: 0, height: 0 };
  const later = [];

  function after(seconds, run) {
    later.push({ at: clock + seconds, run });
  }

  function coach(key, ms) {
    hud.coach(t(key), ms || 2400);
  }

  /* ---------- Input: held keys, pads and a finger, on top of the shell's actions ---------- */

  const held = { left: false, right: false, fire: false };
  const nudge = { left: 0, right: 0 };
  const KEYS = { ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right", ArrowUp: "fire", KeyW: "fire", Space: "fire", Enter: "fire", NumpadEnter: "fire" };
  const pointers = new Map();
  let drag = null;
  // A drag ends on a pointerup the shell reads as a swipe: that one is not a move
  let dragEnded = false;

  function onKey(event) {
    const name = KEYS[event.code];
    if (!name || event.repeat) {
      return;
    }
    held[name] = event.type === "keydown";
  }
  function onPadDown(event) {
    const pad = event.target.closest ? event.target.closest("[data-pad]") : null;
    if (!pad) {
      if (event.target === canvas && ctx.playing) {
        drag = { id: event.pointerId, x: event.clientX, from: player.x, moved: false };
      }
      return;
    }
    const name = pad.getAttribute("data-pad") === "jump" ? "fire" : pad.getAttribute("data-pad");
    if (held[name] !== undefined) {
      pointers.set(event.pointerId, name);
      held[name] = true;
    }
  }
  function onPointerMove(event) {
    if (!drag || drag.id !== event.pointerId) {
      return;
    }
    const dx = event.clientX - drag.x;
    if (Math.abs(dx) > 6) {
      drag.moved = true;
    }
    if (drag.moved) {
      player.target = clamp(drag.from + dx * view.unitsPerPx * DRAG_GAIN, -PIG_LIMIT, PIG_LIMIT);
    }
  }
  function onPointerUp(event) {
    const name = pointers.get(event.pointerId);
    if (name) {
      pointers.delete(event.pointerId);
      held[name] = false;
    }
    if (drag && drag.id === event.pointerId) {
      dragEnded = drag.moved;
      drag = null;
      player.target = null;
    }
  }
  function releaseAll() {
    held.left = held.right = held.fire = false;
    pointers.clear();
    drag = null;
    player.target = null;
  }
  window.addEventListener("keydown", onKey, true);
  window.addEventListener("keyup", onKey, true);
  window.addEventListener("blur", releaseAll);
  overlay.addEventListener("pointerdown", onPadDown, true);
  window.addEventListener("pointermove", onPointerMove, true);
  window.addEventListener("pointerup", onPointerUp, true);
  window.addEventListener("pointercancel", onPointerUp, true);
  // The fire pad is a throw here
  const firePad = overlay.querySelector('.gr-controls [data-pad="jump"]');
  const firePadLabel = firePad ? firePad.getAttribute("aria-label") : "";
  if (firePad) {
    firePad.setAttribute("aria-label", t("btnJump"));
  }
  // A phone throws on its own: the pads only steer
  if (touch) {
    hud.setPads(["left", "right"]);
  }

  /* ---------- The camera: the whole field on screen, whatever its shape ---------- */

  const view = { width: 0, height: 0, pads: null, look: new THREE.Vector3(), eye: new THREE.Vector3(), unitsPerPx: 0.03 };
  const corner = new THREE.Vector3();

  function ndc(x, y, z) {
    return corner.set(x, y, z).project(camera);
  }

  /**
   * Fits the field to the screen once per size: the width on a phone, the
   * depth on a wide screen, with room for the HUD above and the pads below.
   * What is left over goes above the field, where the messages show.
   */
  function fitCamera() {
    const w = overlay.clientWidth || window.innerWidth;
    const h = overlay.clientHeight || window.innerHeight;
    const pads = overlay.classList.contains("gr-show-buttons");
    if (w === view.width && h === view.height && pads === view.pads) {
      return;
    }
    view.width = w;
    view.height = h;
    view.pads = pads;
    const portrait = w < h;
    camera.clearViewOffset();
    camera.fov = portrait ? 58 : 46;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const pitch = portrait ? 1.24 : 0.98;
    const topPx = w <= 600 ? 156 : 120;
    const bottomPx = pads ? 98 : 16;
    const wantBottom = -1 + (2 * bottomPx) / h;
    const wantTop = 1 - (2 * topPx) / h;
    view.look.set(0, 0, (NEAR_Z + TOP_Z) / 2);
    let d = 22;
    let yNear = 0;
    for (let i = 0; i < 8; i++) {
      view.eye.set(0, Math.sin(pitch) * d, view.look.z + Math.cos(pitch) * d);
      camera.position.copy(view.eye);
      camera.lookAt(view.look);
      camera.updateMatrixWorld(true);
      yNear = ndc(0, 0, NEAR_Z).y;
      const yTop = Math.max(ndc(0, 0, TOP_Z).y, ndc(0, BOSS_TOP, BOSS_Z).y);
      const xNear = Math.abs(ndc(FIELD_HALF + 0.35, 0, NEAR_Z).x);
      d *= Math.max((yTop - yNear) / (wantTop - wantBottom), xNear / 0.97);
    }
    view.eye.set(0, Math.sin(pitch) * d, view.look.z + Math.cos(pitch) * d);
    camera.position.copy(view.eye);
    camera.lookAt(view.look);
    camera.updateMatrixWorld(true);
    yNear = ndc(0, 0, NEAR_Z).y;
    // The near edge of the field sits on the bottom margin
    camera.setViewOffset(w, h, 0, ((wantBottom - yNear) * h) / 2, w, h);
    camera.updateProjectionMatrix();
    const px = ndc(FIELD_HALF, 0, 0).x * (w / 2);
    view.unitsPerPx = px > 0 ? FIELD_HALF / px : 0.03;
  }

  function placeCamera(time, dt) {
    fitCamera();
    const jitter = shake > 0 && engine.motion ? (Math.random() - 0.5) * shake : 0;
    shake = Math.max(0, shake - (dt || 0));
    const sway = Math.sin(time * 0.35) * 0.12;
    camera.position.set(view.eye.x + sway + jitter, view.eye.y + jitter * 0.5, view.eye.z);
    camera.lookAt(view.look.x + sway * 0.5, view.look.y, view.look.z);
    engine.aimSun(0, -5);
  }

  /* ---------- Waves ---------- */

  function startWave(n) {
    wave = n;
    waveTime = 0;
    const spec = WAVES[n];
    formation.cols = spec.cols;
    formation.rows = spec.rows;
    formation.x = 0;
    formation.dir = random() < 0.5 ? -1 : 1;
    formation.targetZ = FORMATION_Z;
    // The first wave stands in place behind the intro card, the next ones march in
    formation.z = n === 0 ? FORMATION_Z : FORMATION_Z - 7;
    formation.enter = n === 0 ? 0.8 : ENTER_S;
    formation.pause = 0;
    // Every face comes in every wave: the nine in a shuffled order, then again
    const faces = shuffle([...Array(FACES).keys()]);
    let k = 0;
    for (let row = 0; row < spec.rows; row++) {
      for (let col = 0; col < spec.cols; col++) {
        const a = admins[k];
        Object.assign(a, { alive: true, dying: 0, col, row, helper: false, face: faces[k % FACES], say: 0, vx: 0 });
        bodyMesh.setColorAt(k, color.setHex(ROW_COLORS[row + (4 - spec.rows)]));
        k += 1;
      }
    }
    for (let i = k; i < MAX_ADMINS; i++) {
      admins[i].alive = false;
      admins[i].dying = 0;
    }
    used = k;
    bodyMesh.instanceColor.needsUpdate = true;
    waveTotal = k;
    waveCaught = 0;
    ctx.setData("wave", n + 1);
    hud.setPath([t("p1"), t("p2"), t("p3"), t("p4")], n);
    if (n > 0) {
      coach(n === 1 ? "coachWave2" : "coachWave3", 2400);
      ctx.sound.play("gate");
    }
    nextSay = 1.6;
    updateGoal();
  }

  function anyDying() {
    for (let i = 0; i < used; i++) {
      if (admins[i].dying > 0) {
        return true;
      }
    }
    return false;
  }

  function liveAdmins() {
    let n = 0;
    for (let i = 0; i < used; i++) {
      if (admins[i].alive) {
        n += 1;
      }
    }
    return n;
  }

  function updateFormation(dt) {
    const spec = WAVES[wave];
    if (formation.enter > 0) {
      formation.enter -= dt;
      formation.z += (formation.targetZ - formation.z) * Math.min(1, dt * 3.4);
    } else if (formation.pause > 0) {
      formation.pause -= dt;
    } else {
      let minCol = 99;
      let maxCol = -1;
      let frontRow = -1;
      for (let i = 0; i < used; i++) {
        const a = admins[i];
        if (a.alive && !a.helper) {
          minCol = Math.min(minCol, a.col);
          maxCol = Math.max(maxCol, a.col);
          frontRow = Math.max(frontRow, a.row);
        }
      }
      if (maxCol >= 0) {
        // Fewer admins march faster, as invaders do
        const speed = spec.speed * (1 + 0.9 * Math.pow(waveCaught / waveTotal, 1.4)) * pace * ease;
        formation.x += formation.dir * speed * dt;
        const offset = ((formation.cols - 1) * COL_GAP) / 2;
        const left = formation.x + minCol * COL_GAP - offset - ADMIN_HALF;
        const right = formation.x + maxCol * COL_GAP - offset + ADMIN_HALF;
        if (right > FIELD_HALF && formation.dir > 0) {
          formation.x -= right - FIELD_HALF;
          formation.dir = -1;
          formation.targetZ += STEP_DOWN;
        } else if (left < -FIELD_HALF && formation.dir < 0) {
          formation.x += -FIELD_HALF - left;
          formation.dir = 1;
          formation.targetZ += STEP_DOWN;
        }
        formation.z += (formation.targetZ - formation.z) * Math.min(1, dt * 5);
        if (formation.z + frontRow * ROW_GAP + ADMIN_DEPTH >= PROD_Z) {
          invasion(frontRow);
        }
      }
    }
    const offset = ((formation.cols - 1) * COL_GAP) / 2;
    for (let i = 0; i < used; i++) {
      const a = admins[i];
      if (!a.helper && (a.alive || a.dying > 0)) {
        a.x = formation.x + a.col * COL_GAP - offset;
        a.z = formation.z + a.row * ROW_GAP;
      }
    }
  }

  /** The front row stepped on production: it made its changes, unseen, and leaves. */
  function invasion(row) {
    let n = 0;
    for (let i = 0; i < used; i++) {
      const a = admins[i];
      if (a.alive && !a.helper && a.row === row) {
        a.alive = false;
        a.dying = DIE_S;
        n += 1;
        ctx.fx.burst(a.x, 0.8, a.z, { count: 12, colors: [0xea001e, 0xff5d2d, 0x032d60], speed: 3, up: 3 });
      }
    }
    missed += n;
    waveCaught += n;
    formation.targetZ -= ROW_GAP * 2;
    formation.pause = 0.8;
    hurt("invadeTitle", "invadeTip", true);
    updateGoal();
  }

  function updateHelpers(dt) {
    for (let i = 0; i < used; i++) {
      const a = admins[i];
      if (!a.helper || !a.alive) {
        continue;
      }
      a.z += HELPER_SPEED * pace * ease * dt;
      a.x += Math.sin(clock * 1.6 + a.phase) * 0.9 * dt;
      a.x = clamp(a.x, -FIELD_HALF + 0.6, FIELD_HALF - 0.6);
      if (a.dropAt > 0 && a.z > a.dropAt && a.z < DROP_MIN_Z) {
        a.dropAt = 0;
        spawnDrop(random() < 0.5 ? GEAR : WRENCH, a.x, a.z + 0.4, 0, WAVES[2].dropSpeed * pace * ease);
        say(a);
      }
      if (a.z + ADMIN_DEPTH >= PROD_Z) {
        a.alive = false;
        a.dying = DIE_S;
        missed += 1;
        ctx.fx.burst(a.x, 0.8, a.z, { count: 12, colors: [0xea001e, 0xff5d2d, 0x032d60], speed: 3, up: 3 });
        // One heart for a call of helpers, however many of them get through
        if (a.call !== chargedCall) {
          chargedCall = a.call;
          hurt("invadeTitle", "invadeTip", true);
        }
      }
    }
  }

  /** The admins drop their manual changes on production, from far enough to be dodged. */
  function updateDrops(dt) {
    if (phase === "waves" && formation.enter <= 0 && formation.pause <= 0) {
      const spec = WAVES[wave];
      dropTimer -= dt * pace * ease;
      if (dropTimer <= 0 && liveDrops() < spec.maxDrops) {
        dropTimer = spec.drop * (0.75 + random() * 0.5);
        const shooter = pickShooter();
        if (shooter) {
          spawnDrop(random() < 0.6 ? GEAR : WRENCH, shooter.x, shooter.z + 0.45, 0, spec.dropSpeed * pace * ease);
          // The one who drops it says why
          if (random() < 0.6) {
            say(shooter);
          }
          if (!coachedDrop) {
            coachedDrop = true;
            coach("coachDrop", 2600);
          }
        }
      }
    }
    for (const d of drops) {
      if (!d.live) {
        continue;
      }
      d.x += d.vx * dt;
      d.z += d.vz * dt;
      d.spin += dt * (d.kind === FLOW ? 2 : 7);
      if (d.z > NEAR_Z + 0.6 || Math.abs(d.x) > FIELD_HALF + 1.5) {
        d.live = false;
        continue;
      }
      const r = DROP_RADIUS[d.kind];
      if (player.invulnerable <= 0 && Math.abs(d.x - player.x) < PIG_HIT_X + r && Math.abs(d.z) < PIG_HIT_Z + r) {
        d.live = false;
        if (d.kind === FLOW) {
          hurt("flowTitle", "flowTip");
        } else {
          hurt("hitTitle", "hitTip");
        }
        if (!ctx.playing) {
          return;
        }
      }
    }
  }
  let dropTimer = 2.2;

  function dropsBeyond(z) {
    for (const d of drops) {
      if (d.live && d.z < z) {
        return true;
      }
    }
    return false;
  }

  function helpersOut() {
    for (let i = 0; i < used; i++) {
      if (admins[i].helper && admins[i].alive) {
        return true;
      }
    }
    return false;
  }

  function liveDrops() {
    let n = 0;
    for (const d of drops) {
      if (d.live) {
        n += 1;
      }
    }
    return n;
  }

  /** The front admin of a random column, if it is far enough from the guinea pig. */
  function pickShooter() {
    const start = Math.floor(random() * formation.cols);
    for (let k = 0; k < formation.cols; k++) {
      const col = (start + k) % formation.cols;
      let front = null;
      for (let i = 0; i < used; i++) {
        const a = admins[i];
        if (a.alive && !a.helper && a.col === col && (!front || a.row > front.row)) {
          front = a;
        }
      }
      if (front && front.z < DROP_MIN_Z) {
        return front;
      }
    }
    return null;
  }

  function spawnDrop(kind, x, z, vx, vz) {
    for (const d of drops) {
      if (!d.live) {
        Object.assign(d, { live: true, kind, x, z, vx, vz, spin: random() * 6 });
        return d;
      }
    }
    return null;
  }

  /* ---------- Throwing ---------- */

  function fire() {
    if (player.cooldown > 0) {
      return false;
    }
    for (const s of shots) {
      if (!s.live) {
        s.live = true;
        s.x = player.x;
        s.z = -0.45;
        s.kind = kindCursor;
        s.spin = random() * 6;
        kindCursor = (kindCursor + 1) % VEGETABLES.length;
        player.cooldown = SHOT_COOLDOWN;
        player.throwing = 0.12;
        shotCount += 1;
        firedOnce = true;
        ctx.setData("shots", shotCount);
        ctx.sound.play("throw");
        return true;
      }
    }
    return false;
  }

  function updateShots(dt) {
    for (const s of shots) {
      if (!s.live) {
        continue;
      }
      const from = s.z;
      s.z -= SHOT_SPEED * dt;
      s.spin += dt * 12;
      const to = s.z;
      // The nearest thing in its column between where it was and where it is
      let best = null;
      let bestZ = -Infinity;
      let what = "";
      for (let i = 0; i < used; i++) {
        const a = admins[i];
        if (a.alive && Math.abs(a.x - s.x) < ADMIN_HALF + SHOT_HALF && a.z + ADMIN_DEPTH >= to && a.z - ADMIN_DEPTH <= from && a.z > bestZ) {
          best = a;
          bestZ = a.z;
          what = "admin";
        }
      }
      for (const d of drops) {
        if (d.live && d.kind !== FLOW && Math.abs(d.x - s.x) < DROP_RADIUS[d.kind] + SHOT_HALF && d.z + 0.3 >= to && d.z - 0.3 <= from && d.z > bestZ) {
          best = d;
          bestZ = d.z;
          what = "drop";
        }
      }
      if (note.on && Math.abs(note.x - s.x) < 0.55 && NOTE_Z + 0.4 >= to && NOTE_Z - 0.4 <= from && NOTE_Z > bestZ) {
        best = note;
        bestZ = NOTE_Z;
        what = "note";
      }
      if (fight.on && fight.state === "fight" && Math.abs(fight.x - s.x) < BOSS_HALF && fight.z + 0.7 >= to && fight.z - 0.7 <= from && fight.z > bestZ) {
        best = fight;
        bestZ = fight.z;
        what = "boss";
      }
      if (best) {
        s.live = false;
        if (what === "admin") {
          catchAdmin(best);
        } else if (what === "drop") {
          best.live = false;
          ctx.fx.burst(best.x, 0.6, best.z, { count: 8, colors: [0xffb400, 0xff9a2e, 0xffffff], speed: 2.5, up: 2, life: 0.6 });
          ctx.points(5);
          ctx.sound.play("click");
        } else if (what === "note") {
          findNote();
        } else {
          hitBoss();
        }
        if (!ctx.playing) {
          return;
        }
      } else if (s.z < TOP_Z - 1) {
        s.live = false;
      }
    }
  }

  /** A vegetable on an admin: the monitoring caught the change, and it goes back as a Pull Request. */
  function catchAdmin(a) {
    a.alive = false;
    a.dying = DIE_S;
    if (!a.helper) {
      waveCaught += 1;
    }
    for (const b of bubbles) {
      if (b.admin === a) {
        b.until = 0;
      }
    }
    alerts += 1;
    sent += 1;
    renderCounts();
    showAlert(t("a" + alertOrder[(alerts - 1) % ALERTS]));
    spawnPr(a.x, a.z);
    ctx.fx.burst(a.x, FACE_Y, a.z, { count: 16, colors: [0x2e844a, 0x45c65a, 0xffb400, 0x1b96ff], speed: 3.2, up: 3.5, life: 0.8 });
    ctx.collect(ADMIN_POINTS);
    updateGoal();
  }

  function showAlert(text) {
    alertHead.textContent = t("alertHead");
    alertText.textContent = " " + text;
    if (!hud.reduced) {
      panel.classList.remove("is-new");
      void panel.offsetWidth;
      panel.classList.add("is-new");
    }
  }

  function spawnPr(x, z) {
    for (const p of prs) {
      if (!p.live) {
        Object.assign(p, { live: true, x, y: FACE_Y, z, age: 0 });
        return;
      }
    }
  }

  /* ---------- Victor's note ---------- */

  function startNote() {
    if (note.found || note.on) {
      return;
    }
    note.passes += 1;
    note.on = true;
    note.dir = note.passes % 2 ? 1 : -1;
    note.x = -note.dir * (FIELD_HALF + 1.5);
    note.object.visible = true;
  }

  function updateNote(dt, time) {
    if (!note.on) {
      return;
    }
    note.x += note.dir * NOTE_SPEED * dt;
    note.object.position.set(note.x, 1.3 + Math.sin(time * 3) * 0.15, NOTE_Z);
    roll.setFromAxisAngle(AXIS_Z, Math.sin(time * 4) * 0.2);
    note.object.quaternion.copy(camera.quaternion).multiply(roll);
    if (Math.abs(note.x) > FIELD_HALF + 1.6) {
      note.on = false;
      note.object.visible = false;
    }
  }

  function findNote() {
    note.on = false;
    note.found = true;
    note.object.visible = false;
    ctx.fx.burst(note.x, 1.2, NOTE_Z, { count: 40, colors: [0xffd84d, 0xffb400, 0xffffff], speed: 4, up: 4 });
    ctx.collect(150);
    ctx.foundNote();
  }

  /* ---------- The boss ---------- */

  function startBoss() {
    phase = "boss";
    fight.on = true;
    fight.state = "enter";
    fight.time = 0;
    fight.x = 0;
    fight.z = -24;
    fight.hp = BOSS_HP;
    boss.group.visible = true;
    boss.face.visible = true;
    hud.setPath([t("p1"), t("p2"), t("p3"), t("p4")], 3);
    ctx.setData("wave", "boss");
    ctx.setData("boss", fight.hp);
    coach("coachBoss", 2400);
    ctx.sound.play("gate");
    panel.hidden = true;
    bossBar.hidden = false;
    renderBossBar();
    // A player who lost a lot comes to the boss with a heart back
    if (ctx.attempts < 3) {
      ctx.gainAttempt();
    }
    updateGoal();
  }

  function renderBossBar() {
    bossFill.style.width = Math.max(0, (fight.hp / BOSS_HP) * 100) + "%";
    bossBar.classList.toggle("is-angry", fight.angry);
  }

  function updateBoss(dt) {
    if (!fight.on) {
      return;
    }
    fight.time += dt;
    fight.flash = Math.max(0, fight.flash - dt);
    if (fight.state === "enter") {
      fight.z += (BOSS_Z - fight.z) * Math.min(1, dt * 2.2);
      if (fight.time > BOSS_ENTER_S) {
        fight.state = "talk";
        fight.time = 0;
        bossSay(t("bossLine"), BOSS_TALK_S);
        updateGoal();
      }
    } else if (fight.state === "talk") {
      fight.z += (BOSS_Z - fight.z) * Math.min(1, dt * 2.2);
      if (fight.time > BOSS_TALK_S) {
        fight.state = "fight";
        fight.time = 0;
        fight.next = 1.2;
        coach("coachFight", 2400);
        updateGoal();
      }
    } else if (fight.state === "fight") {
      const hurtShare = 1 - fight.hp / BOSS_HP;
      // He walks from spot to spot and stops a moment at each, a target that can be hit
      if (fight.windup > 0) {
        // Before an attack he stands still and shakes his phone: the warning
        fight.windup -= dt;
        if (fight.windup <= 0) {
          attack();
        }
      } else if (fight.rest > 0) {
        fight.rest -= dt;
      } else {
        const speed = (fight.angry ? 2 : 1.3) * (1 + (pace - 1) * 0.5) * ease;
        const dx = fight.goal - fight.x;
        fight.x += Math.sign(dx) * Math.min(Math.abs(dx), speed * dt);
        if (Math.abs(dx) < 0.05) {
          fight.rest = fight.angry ? 0.5 : 0.9;
          fight.goal = clamp(fight.x + (random() < 0.5 ? -1 : 1) * (1.5 + random() * 3), -3.4, 3.4);
        }
      }
      // One attack at a time: the next one waits until the last is nearly past
      // the guinea pig, and while his admins are down on the field
      const busy = rain.on || fight.windup > 0 || dropsBeyond(-3.5) || helpersOut();
      if (!busy) {
        fight.next -= dt * pace * ease;
      }
      if (fight.next <= 0 && !busy) {
        // Faster when hurt: from 3 s between two attacks to 1.9 s
        fight.next = 3 - 1.1 * hurtShare;
        fight.windup = WINDUP_S;
        ctx.sound.play("click");
      }
    } else if (fight.state === "beaten") {
      fight.slump = Math.min(1, fight.slump + dt * 1.5);
    }
    updateRain(dt);
  }

  /** The next attack, in a fixed rhythm: Flows, gears, Flows, Flows, gears... */
  function attack() {
    if (fight.angry && fight.called < 2 && fight.hp <= BOSS_HP * (fight.called === 0 ? 0.5 : 0.25)) {
      callHelpers();
      return;
    }
    const pattern = ["flows", "rain", "flows", "flows", "rain"][fight.step % 5];
    fight.step += 1;
    if (pattern === "flows") {
      flowFan();
    } else {
      startRain();
    }
  }

  /** A fan of Flows aimed at the guinea pig: the middle one at it, the others wide. */
  function flowFan() {
    const n = fight.angry ? 5 : 3;
    const fromZ = fight.z + 1.2;
    const aim = Math.atan2(player.x - fight.x, -fromZ);
    const speed = (fight.angry ? FLOW_SPEED * 1.15 : FLOW_SPEED) * (1 + (pace - 1) * 0.5) * ease;
    for (let i = 0; i < n; i++) {
      // Wide enough that a step aside is always a way out
      const angle = aim + (i - (n - 1) / 2) * (fight.angry ? 0.36 : 0.42);
      spawnDrop(FLOW, fight.x, fromZ, Math.sin(angle) * speed, Math.cos(angle) * speed);
    }
    ctx.sound.play("power");
  }

  /** A rain of gears: every column but a gap, shown on the floor first. */
  function startRain() {
    const gap = fight.angry ? 1 : 2;
    const first = Math.floor(random() * (RAIN_X.length - gap + 1));
    rain.columns.length = 0;
    for (let i = 0; i < RAIN_X.length; i++) {
      if (i < first || i >= first + gap) {
        rain.columns.push(RAIN_X[i]);
      }
    }
    rain.on = true;
    rain.time = 0;
    ctx.sound.play("gate");
  }

  function updateRain(dt) {
    if (!rain.on) {
      warnMesh.count = 0;
      return;
    }
    rain.time += dt;
    const length = -fight.z - 0.5;
    const pulse = 0.25 + 0.2 * Math.abs(Math.sin(rain.time * 10));
    warnMaterial.opacity = pulse;
    for (let i = 0; i < rain.columns.length; i++) {
      position.set(rain.columns[i], 0.02, fight.z + length / 2 + 0.8);
      quaternion.identity();
      scale.set(1, 1, length);
      matrix.compose(position, quaternion, scale);
      warnMesh.setMatrixAt(i, matrix);
    }
    warnMesh.count = rain.columns.length;
    warnMesh.instanceMatrix.needsUpdate = true;
    if (rain.time >= RAIN_WARN_S) {
      rain.on = false;
      warnMesh.count = 0;
      const speed = (fight.angry ? RAIN_SPEED * 1.1 : RAIN_SPEED) * (1 + (pace - 1) * 0.5) * ease;
      for (const x of rain.columns) {
        spawnDrop(GEAR, x, fight.z + 1.4, 0, speed);
      }
    }
  }

  function callHelpers() {
    fight.called += 1;
    coach("coachHelpers", 2200);
    const faces = shuffle([...Array(FACES).keys()]);
    const lanes = shuffle([0, 1, 2, 3]);
    let placed = 0;
    for (let i = 0; i < MAX_ADMINS && placed < 4; i++) {
      const a = admins[i];
      if (a.alive || a.dying > 0) {
        continue;
      }
      // Spread across the field, one per lane, so none hides behind another
      Object.assign(a, { alive: true, dying: 0, helper: true, call: fight.called, face: faces[placed], x: HELPER_X[lanes[placed]], z: fight.z + 1.2, say: 0, dropAt: -9 + random() * 3 });
      bodyMesh.setColorAt(i, color.setHex(ROW_COLORS[(placed + 1) % ROW_COLORS.length]));
      used = Math.max(used, i + 1);
      placed += 1;
      if (placed === 1) {
        say(a);
      }
    }
    bodyMesh.instanceColor.needsUpdate = true;
    updateGoal();
  }

  function hitBoss() {
    fight.hp -= 1;
    fight.flash = 0.08;
    shake = Math.max(shake, 0.08);
    ctx.fx.burst(fight.x, 2.5, fight.z + 0.6, { count: 6, colors: [0xffffff, 0xffb400, 0xea001e], speed: 2.5, up: 2, life: 0.5 });
    ctx.points(10);
    ctx.sound.play("click");
    ctx.setData("boss", fight.hp);
    if (!fight.angry && fight.hp <= BOSS_HP / 2) {
      fight.angry = true;
      coach("coachAngry", 2400);
      ctx.sound.play("power");
    }
    renderBossBar();
    if (fight.hp <= 0) {
      beatBoss();
    }
  }

  function beatBoss() {
    bossRetryAt = 0;
    fight.state = "beaten";
    fight.slump = 0;
    phase = "end";
    rain.on = false;
    warnMesh.count = 0;
    for (const d of drops) {
      d.live = false;
    }
    for (let i = 0; i < used; i++) {
      if (admins[i].alive) {
        catchAdmin(admins[i]);
      }
    }
    bossSay(t("bossGiveUp"), 3.6);
    shake = 0.5;
    ctx.fx.burst(fight.x, 3, fight.z + 0.6, { count: 70, speed: 6, up: 6, life: 1.4 });
    ctx.sound.play("smash");
    alerts += 1;
    sent += 1;
    panel.hidden = false;
    bossBar.hidden = true;
    renderCounts();
    showAlert(t("aBoss"));
    spawnPr(fight.x, fight.z);
    ctx.collect(500, t("bossDown"));
    hud.goal("");
    finished = true;
    endAt = clock + 3.8;
  }

  /* ---------- Bubbles ---------- */

  function say(a) {
    let slot = null;
    for (const b of bubbles) {
      if (b.until > clock && b.admin && (b.admin === a || (Math.abs(b.admin.x - a.x) < 3.2 && Math.abs(b.admin.z - a.z) < 3.4))) {
        return;
      }
      if (!slot && b.until <= clock) {
        slot = b;
      }
    }
    if (!slot) {
      return;
    }
    // "But it's faster!" most of the time, a cousin of it otherwise
    const key = random() < 0.6 ? 0 : 1 + Math.floor(random() * (SAYINGS - 1));
    slot.admin = a;
    slot.until = clock + 2.2;
    slot.node.textContent = keepTogether(t("say" + key));
    slot.node.hidden = false;
    slot.px = -1;
    slot.width = 0;
    a.say = 0.3;
  }

  function bossSay(text, seconds) {
    bossBubble.node.textContent = keepTogether(text);
    bossBubble.node.hidden = false;
    bossBubble.until = clock + seconds;
    bossBubble.px = -1;
    bossBubble.width = 0;
  }

  function placeBubble(b, x, y, z) {
    point.set(x, y, z).project(camera);
    if (point.z > 1) {
      b.node.hidden = true;
      return;
    }
    const w = view.width;
    if (!b.width) {
      b.width = b.node.offsetWidth;
    }
    const half = Math.min(b.width / 2 + 6, w / 2);
    const px = Math.round(Math.max(half, Math.min(w - half, ((point.x + 1) / 2) * w)));
    const py = Math.round(((1 - point.y) / 2) * view.height);
    if (px !== b.px || py !== b.py) {
      b.px = px;
      b.py = py;
      b.node.style.transform = "translate(" + px + "px, " + py + "px)";
    }
  }

  function updateBubbles(dt) {
    up.set(0, 1, 0).applyQuaternion(camera.quaternion);
    if (phase === "waves" && formation.enter <= 0) {
      nextSay -= dt;
      if (nextSay <= 0) {
        nextSay = 2.2 + random() * 1.6;
        const pick = Math.floor(random() * Math.max(1, used));
        for (let k = 0; k < used; k++) {
          const a = admins[(pick + k) % used];
          if (a.alive) {
            say(a);
            break;
          }
        }
      }
    }
    for (const b of bubbles) {
      if (b.until <= clock || !b.admin || (!b.admin.alive && b.admin.dying <= 0)) {
        if (!b.node.hidden) {
          b.node.hidden = true;
        }
        b.admin = null;
        continue;
      }
      placeBubble(b, b.admin.x + up.x * (FACE_SIZE / 2 + 0.08), FACE_Y + up.y * (FACE_SIZE / 2 + 0.08), b.admin.z + up.z * (FACE_SIZE / 2 + 0.08));
    }
    if (bossBubble.until > clock) {
      placeBubble(bossBubble, fight.x, 0.2, fight.z + 2.6);
    } else if (!bossBubble.node.hidden) {
      bossBubble.node.hidden = true;
    }
  }

  /* ---------- Hearts, mercy and the pace ---------- */

  /** Something reached production: one heart, a clean field and a slower pace for a while. */
  function hurt(titleKey, tipKey, invaded) {
    if (finished || (!invaded && player.invulnerable > 0)) {
      return;
    }
    if (invaded) {
      lastInvasion = clock;
    }
    player.invulnerable = INVULNERABLE_S;
    player.wobble = 1;
    shake = 0.45;
    mercy = MERCY;
    ease = Math.max(EASE_MIN, ease - EASE_PER_LOSS);
    for (const d of drops) {
      if (d.live) {
        d.live = false;
        ctx.fx.burst(d.x, 0.5, d.z, { count: 5, colors: [0xffffff, 0xc9c9c9], speed: 2, up: 1.5, life: 0.5 });
      }
    }
    rain.on = false;
    warnMesh.count = 0;
    if (fight.on && fight.state === "fight") {
      fight.next = Math.max(fight.next, 2.2);
      fight.windup = 0;
    }
    formation.pause = Math.max(formation.pause, 0.8);
    dropTimer = Math.max(dropTimer, 1.6);
    // The last heart at the boss: the result card says the next try starts at him
    const last = phase === "boss" && ctx.attempts <= 1;
    ctx.loseAttempt(t(titleKey), t(tipKey) + (last ? " " + t("retryHint") : ""));
    if (!ctx.playing && phase === "boss") {
      bossRetryAt = Date.now();
    }
  }

  function progress() {
    if (phase === "waves") {
      const share = waveTotal ? waveCaught / waveTotal : 0;
      return [0, 0.22, 0.46][wave] + [0.22, 0.24, 0.24][wave] * share;
    }
    if (fight.on) {
      return 0.7 + 0.3 * (1 - fight.hp / BOSS_HP);
    }
    return 1;
  }

  function updatePace(dt) {
    const target = Math.max(0.85, 1 + PACE_GAIN * Math.pow(progress(), 1.4) - mercy);
    mercy = Math.max(0, mercy - MERCY_FADE * dt);
    pace += (target - pace) * Math.min(1, dt * 0.8);
    const hundredths = Math.round(pace * 100);
    if (hundredths !== paceShown) {
      paceShown = hundredths;
      ctx.setData("pace", pace.toFixed(2));
    }
    if (cue < PACE_CUES.length && pace >= PACE_CUES[cue] && (phase === "waves" || fight.state === "fight")) {
      cue += 1;
      coach("faster", 1600);
      ctx.sound.play("combo");
    }
  }

  function updateGoal() {
    if (finished) {
      hud.goal("");
      return;
    }
    if (phase === "waves") {
      hud.goal(t("goalWave", { n: liveAdmins() }));
      ctx.setData("admins", liveAdmins());
    } else if (fight.state === "fight") {
      hud.goal(t(helpersOut() ? "goalHelpers" : "goalBoss"));
    } else {
      hud.goal(t("goalTalk"));
    }
  }

  /* ---------- Moving and drawing ---------- */

  function movePlayer(dt) {
    player.cooldown = Math.max(0, player.cooldown - dt);
    player.invulnerable = Math.max(0, player.invulnerable - dt);
    player.throwing = Math.max(0, player.throwing - dt);
    nudge.left = Math.max(0, nudge.left - dt);
    nudge.right = Math.max(0, nudge.right - dt);
    if (player.target !== null) {
      const dx = player.target - player.x;
      player.vx = Math.sign(dx) * Math.min(Math.abs(dx) / dt, DRAG_SPEED);
    } else {
      const left = held.left || nudge.left > 0;
      const right = held.right || nudge.right > 0;
      const want = (right ? 1 : 0) - (left ? 1 : 0);
      // A short ramp, so a tap moves a little and a hold glides
      player.vx += (want * PIG_SPEED - player.vx) * Math.min(1, dt * 18);
    }
    player.x = clamp(player.x + player.vx * dt, -PIG_LIMIT, PIG_LIMIT);
    if (Math.abs(player.x) >= PIG_LIMIT) {
      player.vx = 0;
    }
    const wantFire = held.fire || touch || player.buffer > 0;
    player.buffer = Math.max(0, player.buffer - dt);
    if (wantFire && !finished && fire()) {
      player.buffer = 0;
    }
    const hundredths = Math.round(player.x * 100);
    if (hundredths !== shownX) {
      shownX = hundredths;
      ctx.setData("x", player.x.toFixed(2));
    }
  }

  function placePig(dt, time) {
    const hop = player.throwing > 0 ? Math.sin((player.throwing / 0.12) * Math.PI) * 0.06 : 0;
    pig.object.position.set(player.x, hop, 0);
    pig.object.scale.setScalar(1.4);
    // Turned a little into its way, so it is not only a back
    const turn = clamp(-player.vx * 0.07, -0.5, 0.5) + 1.0;
    pig.object.rotation.set(-0.35, pig.object.rotation.y + (turn - pig.object.rotation.y) * Math.min(1, dt * 10), 0, "YXZ");
    pig.shadow.position.set(player.x, 0.012, 0.05);
    pigState.running = Math.abs(player.vx) > 0.5;
    pigState.speed = Math.abs(player.vx);
    pig.state = pigState;
    pig.object.visible = !(player.invulnerable > 0 && Math.floor(time * 12) % 2 === 0);
    if (player.wobble > 0) {
      player.wobble = Math.max(0, player.wobble - dt * 1.6);
      pig.hitWobble(player.wobble);
    }
  }

  function drawAdmins(time, dt) {
    for (const f of faceMeshes) {
      f.n = 0;
    }
    for (let i = 0; i < used; i++) {
      const a = admins[i];
      let s = a.alive ? 1 : 0;
      if (a.dying > 0) {
        a.dying = Math.max(0, a.dying - dt);
        s = a.dying / DIE_S;
      }
      a.say = Math.max(0, a.say - dt);
      const step = Math.sin(time * 9 + a.phase);
      // The one talking stands up on tiptoe
      const lift = Math.abs(step) * 0.06 + (a.say > 0 ? Math.sin((a.say / 0.3) * Math.PI) * 0.18 : 0);
      position.set(a.x, lift, a.z);
      euler.set(0, a.dying > 0 ? (1 - s) * 7 : 0, step * 0.08);
      quaternion.setFromEuler(euler);
      scale.setScalar(s);
      matrix.compose(position, quaternion, scale);
      for (const part of adminParts) {
        work.multiplyMatrices(matrix, part.local);
        part.mesh.setMatrixAt(i, work);
      }
      if (s > 0) {
        // The face always looks at the camera, with the waddle of the march
        const face = faceMeshes[a.face];
        position.set(a.x, FACE_Y + lift, a.z);
        roll.setFromAxisAngle(AXIS_Z, step * 0.1 + (a.dying > 0 ? (1 - s) * 5 : 0));
        quaternion.copy(camera.quaternion).multiply(roll);
        scale.setScalar(s);
        matrix.compose(position, quaternion, scale);
        face.mesh.setMatrixAt(face.n, matrix);
        face.n += 1;
      }
    }
    for (const part of adminParts) {
      part.mesh.count = used;
      part.mesh.instanceMatrix.needsUpdate = true;
    }
    for (const f of faceMeshes) {
      f.mesh.count = f.n;
      f.mesh.instanceMatrix.needsUpdate = true;
    }
  }

  function drawShots() {
    for (let k = 0; k < vegetableCounts.length; k++) {
      vegetableCounts[k] = 0;
    }
    for (const s of shots) {
      if (!s.live) {
        continue;
      }
      position.set(s.x, SHOT_Y, s.z);
      euler.set(s.spin, s.spin * 0.4, 0);
      quaternion.setFromEuler(euler);
      scale.setScalar(1);
      matrix.compose(position, quaternion, scale);
      setParts(vegetableParts[s.kind], vegetableCounts[s.kind], matrix);
      vegetableCounts[s.kind] += 1;
    }
    for (let k = 0; k < vegetableParts.length; k++) {
      partsDone(vegetableParts[k], vegetableCounts[k]);
    }
  }

  function drawDrops() {
    let gears = 0;
    let wrenches = 0;
    let flows = 0;
    for (const d of drops) {
      if (!d.live) {
        continue;
      }
      if (d.kind === FLOW) {
        position.set(d.x, 0.8, d.z);
        roll.setFromAxisAngle(AXIS_Z, Math.sin(d.spin * 2) * 0.25);
        quaternion.copy(camera.quaternion).multiply(roll);
      } else {
        // Gears and wrenches turn on themselves, face to the camera, so they read at a glance
        position.set(d.x, 0.45, d.z);
        roll.setFromAxisAngle(AXIS_Z, d.kind === GEAR ? d.spin : Math.sin(d.spin * 0.6) * 1.2);
        quaternion.copy(camera.quaternion).multiply(roll);
      }
      scale.setScalar(1);
      matrix.compose(position, quaternion, scale);
      if (d.kind === GEAR) {
        gearMesh.setMatrixAt(gears++, matrix);
      } else if (d.kind === WRENCH) {
        wrenchMesh.setMatrixAt(wrenches++, matrix);
      } else {
        flowMesh.setMatrixAt(flows++, matrix);
      }
    }
    gearMesh.count = gears;
    gearMesh.instanceMatrix.needsUpdate = true;
    wrenchMesh.count = wrenches;
    wrenchMesh.instanceMatrix.needsUpdate = true;
    flowMesh.count = flows;
    flowMesh.instanceMatrix.needsUpdate = true;
  }

  function drawPrs(dt, time) {
    let n = 0;
    for (const p of prs) {
      if (!p.live) {
        continue;
      }
      p.age += dt;
      if (p.age > PR_LIFE) {
        p.live = false;
        continue;
      }
      // Up and away, back to the pipeline
      p.y += dt * 3.2;
      p.z -= dt * 3;
      const k = p.age / PR_LIFE;
      position.set(p.x, p.y, p.z);
      roll.setFromAxisAngle(AXIS_Z, Math.sin(time * 6 + p.x) * 0.2);
      quaternion.copy(camera.quaternion).multiply(roll);
      scale.setScalar(k < 0.15 ? (k / 0.15) * 1.2 : 1.2 - Math.max(0, (k - 0.7) / 0.3) * 1.2);
      matrix.compose(position, quaternion, scale);
      prMesh.setMatrixAt(n++, matrix);
    }
    prMesh.count = n;
    prMesh.instanceMatrix.needsUpdate = true;
  }

  function drawBoss(time) {
    if (!fight.on) {
      return;
    }
    const g = boss.group;
    const bob = fight.state === "beaten" ? 0 : Math.abs(Math.sin(time * 4)) * 0.08;
    g.position.set(fight.x, bob, fight.z);
    const shaking = fight.windup > 0 ? Math.sin(time * 40) * 0.08 : 0;
    g.rotation.set(fight.slump * 0.35, Math.sin(time * 1.3) * 0.12, (fight.state === "fight" ? Math.sin(time * 6) * 0.04 : 0) + shaking);
    const shrink = 1 - fight.slump * 0.25;
    g.scale.setScalar(BOSS_SCALE * shrink);
    boss.suit.emissive.setHex(fight.flash > 0 ? 0xff5d5d : 0x000000);
    boss.suit.emissiveIntensity = fight.flash > 0 ? 0.35 : 0;
    // Red with anger when hurt, his face over the suit
    boss.faceMaterial.color.setHex(fight.angry && fight.state === "fight" ? (Math.floor(time * 4) % 2 ? 0xffb3b3 : 0xffffff) : fight.flash > 0 ? 0xfff0c0 : 0xffffff);
    boss.face.position.set(fight.x, (BOSS_FACE_Y + bob) * shrink - fight.slump * 0.4, fight.z + 0.2);
    roll.setFromAxisAngle(AXIS_Z, Math.sin(time * 2) * 0.06 + fight.slump * 0.3);
    boss.face.quaternion.copy(camera.quaternion).multiply(roll);
    boss.face.scale.setScalar(shrink);
  }

  /* ---------- The test hook, on test pages only ---------- */

  if (/[?&]guinea-(unlock=all|test=1)/.test(window.location.search)) {
    window.__guineaShooter = { admins, drops, shots, fight, player, note, formation, bubbles, rain, used: () => used, phase: () => phase, clock: () => clock, nextSay: () => nextSay };
  }

  ctx.setData("shots", 0);
  ctx.setData("wave", 1);
  ctx.setData("pace", "1.00");
  ctx.setData("x", "0.00");
  startWave(0);
  // The world is drawn behind the intro card
  placePig(0, 0);
  placeCamera(0, 0);
  updateFormation(0);
  drawAdmins(0, 0);

  return {
    start() {
      // guinea-at=2 or 3 (a check setting, like a runner's metres) opens that wave, 4 the boss
      const at = ctx.params.startAt;
      if (at >= 2 && at <= 3) {
        startWave(at - 1);
      } else if (at === 4 || (!at && bossRetryAt && Date.now() - bossRetryAt < BOSS_RETRY_MS)) {
        const retry = at !== 4;
        bossRetryAt = 0;
        for (const a of admins) {
          a.alive = false;
        }
        if (retry) {
          // A little easier too, as after any lost heart
          ease = 1 - EASE_PER_LOSS * 2;
          hud.toast(t("retryBoss"), "power");
        }
        startBoss();
        return;
      }
      coach("coachStart", 2600);
      updateGoal();
    },
    update(dt, time) {
      clock += dt;
      for (let i = later.length - 1; i >= 0; i--) {
        if (later[i].at <= clock) {
          const run = later[i].run;
          later.splice(i, 1);
          run();
          if (!ctx.playing) {
            return;
          }
        }
      }
      dragEnded = false;
      if (finished) {
        movePlayer(dt);
        updateBoss(dt);
        updateShots(dt);
        if (!endToastShown && clock >= endAt - 1.6) {
          endToastShown = true;
          hud.toast(t("endToast"), "good");
        }
        if (clock >= endAt && ctx.playing) {
          ctx.finish(200 + (missed === 0 ? 200 : 0), missed > 0 ? t("missedInfo", { n: missed }) : "");
          return;
        }
      } else {
        updatePace(dt);
        movePlayer(dt);
        if (phase === "waves") {
          waveTime += dt;
          updateFormation(dt);
          if (!ctx.playing) {
            return;
          }
          // Victor's note crosses once in wave 2, once more in wave 3
          if ((wave === 1 && waveTime > 9 && note.passes === 0) || (wave === 2 && waveTime > 7 && note.passes < 2)) {
            startNote();
          }
          if (liveAdmins() === 0 && !anyDying()) {
            if (wave < WAVES.length - 1) {
              phase = "between";
              coach("coachCleared", 1600);
              ctx.sound.play("power");
              ctx.sound.play("wheek");
              pig.hop();
              after(1.8, () => {
                phase = "waves";
                startWave(wave + 1);
              });
            } else {
              phase = "between";
              coach("coachCleared", 1600);
              ctx.sound.play("power");
              ctx.sound.play("wheek");
              pig.hop();
              after(1.6, startBoss);
            }
          }
          // Desktop: a player who has not found the throw yet is told
          if (!touch && !firedOnce && waveTime > 4.5 && waveTime - dt <= 4.5) {
            coach("coachFire", 2600);
          }
        }
        updateHelpers(dt);
        updateDrops(dt);
        if (!ctx.playing) {
          return;
        }
        updateShots(dt);
        if (!ctx.playing) {
          return;
        }
        updateBoss(dt);
      }
      updateNote(dt, time);
      drawAdmins(time, dt);
      drawShots();
      drawDrops();
      drawPrs(dt, time);
      drawBoss(time);
      for (const c of clouds) {
        c.cloud.position.y = c.y + Math.sin(time * 0.5 + c.phase) * 0.3;
      }
      placePig(dt, time);
      placeCamera(time, dt);
      updateBubbles(dt);
    },
    action(name) {
      if (name === "left" || name === "right") {
        // The end of a drag is not a swipe
        if (dragEnded) {
          return;
        }
        nudge[name] = NUDGE_S;
        nudge[name === "left" ? "right" : "left"] = 0;
      } else if (name === "jump" || name === "confirm" || name === "tap") {
        player.buffer = FIRE_BUFFER_S;
      }
    },
    idleCamera(time) {
      placeCamera(time, 0);
    },
    dispose() {
      disposed = true;
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("keyup", onKey, true);
      window.removeEventListener("blur", releaseAll);
      overlay.removeEventListener("pointerdown", onPadDown, true);
      window.removeEventListener("pointermove", onPointerMove, true);
      window.removeEventListener("pointerup", onPointerUp, true);
      window.removeEventListener("pointercancel", onPointerUp, true);
      if (firePad) {
        firePad.setAttribute("aria-label", firePadLabel);
      }
      for (const thing of owned) {
        if (thing.dispose) {
          thing.dispose();
        }
      }
      scene.background = previous.background;
      scene.fog = previous.fog;
      camera.clearViewOffset();
      panel.remove();
      bossBar.remove();
      bubbleLayer.remove();
      hud.goal("");
      hud.setPath([], 0);
      pig.object.scale.setScalar(1);
      pig.object.rotation.set(0, 0, 0, "XYZ");
      pig.object.visible = true;
      pig.setSitting(false);
      if (window.__guineaShooter && window.__guineaShooter.player === player) {
        delete window.__guineaShooter;
      }
    }
  };

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

  function shuffle(list) {
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      const swap = list[i];
      list[i] = list[j];
      list[j] = swap;
    }
    return list;
  }
}

/** French puts a space before ! ? : and ; that must not start a line. */
function keepTogether(text) {
  return text.replace(/ ([!?:;])/g, "\u00a0$1");
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/** A starry night, deep blue up high, violet on the horizon. */
function nightSky(THREE, random) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 512;
  const c = canvas.getContext("2d");
  const gradient = c.createLinearGradient(0, 0, 0, 512);
  gradient.addColorStop(0, "#0a1240");
  gradient.addColorStop(0.45, "#1d2a7a");
  gradient.addColorStop(0.78, "#4b2a8c");
  gradient.addColorStop(1, "#8a3f8f");
  c.fillStyle = gradient;
  c.fillRect(0, 0, 256, 512);
  for (let i = 0; i < 140; i++) {
    const y = random() * 380;
    c.globalAlpha = 0.35 + random() * 0.65;
    c.fillStyle = random() < 0.15 ? "#ffd84d" : "#ffffff";
    c.fillRect(random() * 256, y, random() < 0.2 ? 2 : 1, random() < 0.2 ? 2 : 1);
  }
  c.globalAlpha = 1;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** The floor: a lit grid, and the production zone under the guinea pig. */
function drawFloor(c, w, h, t) {
  // 12 x 24 world units: the far end is at the top of the picture
  const unit = w / 12;
  const zToY = (z) => (z + 20.5) * unit;
  const gradient = c.createLinearGradient(0, 0, 0, h);
  gradient.addColorStop(0, "#1a1650");
  gradient.addColorStop(0.7, "#173a7a");
  gradient.addColorStop(1, "#1d4f9c");
  c.fillStyle = gradient;
  c.fillRect(0, 0, w, h);
  c.strokeStyle = "rgba(140, 190, 255, 0.2)";
  c.lineWidth = 2;
  for (let x = 0; x <= 12; x++) {
    c.beginPath();
    c.moveTo(x * unit, 0);
    c.lineTo(x * unit, h);
    c.stroke();
  }
  for (let z = 0; z <= 24; z++) {
    c.beginPath();
    c.moveTo(0, z * unit);
    c.lineTo(w, z * unit);
    c.stroke();
  }
  // The field, a shade lighter between its two rails
  c.fillStyle = "rgba(120, 180, 255, 0.08)";
  c.fillRect(unit, 0, unit * 10, zToY(PROD_Z));
  // Production: a navy band with white stripes, under the guinea pig
  const top = zToY(PROD_Z);
  c.fillStyle = "#032d60";
  c.fillRect(0, top, w, h - top);
  c.fillStyle = "rgba(255, 255, 255, 0.07)";
  for (let x = -h; x < w; x += 36) {
    c.beginPath();
    c.moveTo(x, h);
    c.lineTo(x + 18, h);
    c.lineTo(x + 18 + (h - top), top);
    c.lineTo(x + (h - top), top);
    c.fill();
  }
  c.fillStyle = "rgba(255, 255, 255, 0.85)";
  c.textAlign = "center";
  c.textBaseline = "middle";
  const label = t("prodSign");
  // Between a rail and the guinea pig, on each side
  fitText(c, label, unit * 3.1, zToY(0.55), unit * 3.6, 19, "800");
  fitText(c, label, unit * 8.9, zToY(0.55), unit * 3.6, 19, "800");
}

/** A Flow thrown by the boss: the Flow icon in a red ring that says danger. */
function drawFlowIcon(c, w, h) {
  const r = w / 2;
  c.beginPath();
  c.arc(r, r, r - 2, 0, Math.PI * 2);
  c.fillStyle = "#ea001e";
  c.fill();
  c.beginPath();
  c.arc(r, r, r * 0.8, 0, Math.PI * 2);
  c.fillStyle = "#ffffff";
  c.fill();
  c.beginPath();
  c.arc(r, r, r * 0.68, 0, Math.PI * 2);
  c.fillStyle = "#0176d3";
  c.fill();
  glyph(c, "flow", r, r, r * 1.05, "#ffffff");
}

/** A change sent back as a Pull Request: the branch glyph on green. */
function drawPrIcon(c, w) {
  const r = w / 2;
  c.beginPath();
  c.arc(r, r, r - 2, 0, Math.PI * 2);
  c.fillStyle = "#ffffff";
  c.fill();
  c.beginPath();
  c.arc(r, r, r * 0.84, 0, Math.PI * 2);
  c.fillStyle = "#2e844a";
  c.fill();
  glyph(c, "branch", r, r, r * 1.05, "#ffffff");
}

/** The lid of an admin's laptop: Setup, the gear on a blue tile. */
function drawLid(c, w, h) {
  c.fillStyle = "#e8edf3";
  c.fillRect(0, 0, w, h);
  const size = Math.min(w, h) * 0.78;
  c.fillStyle = "#0176d3";
  c.beginPath();
  const x = (w - size) / 2;
  const y = (h - size) / 2;
  const r = size * 0.2;
  c.moveTo(x + r, y);
  c.arcTo(x + size, y, x + size, y + size, r);
  c.arcTo(x + size, y + size, x, y + size, r);
  c.arcTo(x, y + size, x, y, r);
  c.arcTo(x, y, x + size, y, r);
  c.fill();
  // The gear
  c.save();
  c.translate(w / 2, h / 2);
  c.fillStyle = "#ffffff";
  const outer = size * 0.36;
  const inner = size * 0.27;
  c.beginPath();
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const radius = i % 2 ? inner : outer;
    c.lineTo(Math.cos(a - 0.15) * radius, Math.sin(a - 0.15) * radius);
    c.lineTo(Math.cos(a + 0.15) * radius, Math.sin(a + 0.15) * radius);
  }
  c.closePath();
  c.fill();
  c.fillStyle = "#0176d3";
  c.beginPath();
  c.arc(0, 0, size * 0.12, 0, Math.PI * 2);
  c.fill();
  c.restore();
}

/** A face from its SVG, in its round frame with a white ring. */
function drawFace(c, image, x, y, size) {
  const r = size / 2;
  c.save();
  c.beginPath();
  c.arc(x + r, y + r, r - 2, 0, Math.PI * 2);
  c.fillStyle = "#ffffff";
  c.fill();
  c.beginPath();
  c.arc(x + r, y + r, r - size * 0.05, 0, Math.PI * 2);
  c.clip();
  const inset = size * 0.05;
  c.drawImage(image, x + inset, y + inset, size - inset * 2, size - inset * 2);
  c.restore();
}

/** A plain cartoon face, until the drawn one has loaded, or if it never does. */
function drawPlainFace(c, x, y, size, i) {
  const skins = ["#f1c8a8", "#e0ac8a", "#c68863", "#8d5a3b", "#f6d5bd", "#d9a07a", "#b57a55", "#f0c09a", "#a86c48"];
  const hairs = ["#3b2416", "#1c1c1c", "#8a5a2b", "#d9a441", "#6b3a1e", "#b5451b", "#2a2a2a", "#c98e4a", "#4a2f1d"];
  const backs = ["#e9dcfb", "#d8ecff", "#d5f5ef", "#ffe3ec", "#fff1cc", "#e3f5d8", "#fde2d2", "#e0e7ff", "#f3e8ff"];
  const r = size / 2;
  const cx = x + r;
  const cy = y + r;
  c.save();
  c.beginPath();
  c.arc(cx, cy, r - 2, 0, Math.PI * 2);
  c.fillStyle = "#ffffff";
  c.fill();
  c.beginPath();
  c.arc(cx, cy, r - size * 0.05, 0, Math.PI * 2);
  c.clip();
  c.fillStyle = backs[i % backs.length];
  c.fillRect(x, y, size, size);
  // Shoulders, head, hair, eyes, smile
  c.fillStyle = "#0176d3";
  c.beginPath();
  c.ellipse(cx, y + size * 1.02, size * 0.42, size * 0.3, 0, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = skins[i % skins.length];
  c.beginPath();
  c.ellipse(cx, cy - size * 0.02, size * 0.25, size * 0.29, 0, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = hairs[i % hairs.length];
  c.beginPath();
  c.ellipse(cx, cy - size * 0.2, size * 0.27, size * 0.15, 0, Math.PI, Math.PI * 2);
  c.fill();
  c.fillStyle = "#1a1a2e";
  for (const side of [-1, 1]) {
    c.beginPath();
    c.arc(cx + side * size * 0.09, cy - size * 0.02, size * 0.03, 0, Math.PI * 2);
    c.fill();
  }
  c.strokeStyle = "#7a2e2e";
  c.lineWidth = size * 0.025;
  c.lineCap = "round";
  c.beginPath();
  c.arc(cx, cy + size * 0.06, size * 0.08, 0.2 * Math.PI, 0.8 * Math.PI);
  c.stroke();
  c.restore();
}

/** A Setup gear, flat in XY. */
function gearGeometry(THREE) {
  const shape = new THREE.Shape();
  const teeth = 8;
  const outer = 0.33;
  const rootRadius = 0.25;
  for (let i = 0; i < teeth; i++) {
    const a = (i / teeth) * Math.PI * 2;
    const half = Math.PI / teeth;
    const points = [
      [rootRadius, a - half],
      [outer, a - half * 0.55],
      [outer, a + half * 0.55],
      [rootRadius, a + half]
    ];
    points.forEach(([radius, angle], k) => {
      const px = Math.cos(angle) * radius;
      const py = Math.sin(angle) * radius;
      if (i === 0 && k === 0) {
        shape.moveTo(px, py);
      } else {
        shape.lineTo(px, py);
      }
    });
  }
  shape.closePath();
  const hole = new THREE.Path();
  hole.absarc(0, 0, 0.1, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.13, bevelEnabled: false, curveSegments: 12 });
  geometry.center();
  return geometry;
}

/** A wrench, its handle along X. */
function wrenchGeometry(THREE) {
  const shape = new THREE.Shape();
  const head = 0.14;
  const hx = 0.24;
  const slot = 0.055;
  const meet = Math.sqrt(head * head - 0.05 * 0.05);
  const slotAngle = Math.asin(slot / head);
  shape.moveTo(-0.36, -0.05);
  shape.lineTo(hx - meet, -0.05);
  shape.absarc(hx, 0, head, Math.PI + Math.asin(0.05 / head), Math.PI * 2 - slotAngle, false);
  shape.lineTo(hx - 0.02, -slot);
  shape.lineTo(hx - 0.02, slot);
  shape.lineTo(hx + Math.cos(slotAngle) * head, slot);
  shape.absarc(hx, 0, head, slotAngle, Math.PI - Math.asin(0.05 / head), false);
  shape.lineTo(-0.36, 0.05);
  shape.absarc(-0.36, 0, 0.05, Math.PI / 2, Math.PI * 1.5, false);
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.08, bevelEnabled: false, curveSegments: 10 });
  geometry.center();
  geometry.scale(1.3, 1.3, 1.3);
  geometry.rotateZ(0.6);
  return geometry;
}

export const CSS = `
.guinea-run .gr-w9-panel {
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-width: 560px;
  padding: 6px 12px;
  border: 2px solid #ffffff;
  border-left: 6px solid #e3066a;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 3px 0 rgba(3, 45, 96, 0.25);
  color: #032d60;
  font-size: 13px;
  line-height: 1.3;
  pointer-events: none;
}
.guinea-run .gr-w9-panel[hidden],
.guinea-run .gr-w9-bossbar[hidden] {
  display: none;
}
.guinea-run .gr-w9-panel.is-new {
  animation: gr-w9-flash 0.6s ease-out;
}
.guinea-run .gr-w9-head {
  display: flex;
  flex-wrap: wrap;
  gap: 2px 8px;
  align-items: center;
}
.guinea-run .gr-w9-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #2e844a;
  box-shadow: 0 0 0 3px rgba(46, 132, 74, 0.25);
  animation: gr-w9-blink 1.6s infinite;
}
.guinea-run .gr-w9-counts {
  margin-left: auto;
  color: #444444;
  font-weight: 700;
}
.guinea-run .gr-w9-alert b {
  color: #ba0517;
}
.guinea-run .gr-w9-bossbar {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 260px;
  max-width: 560px;
  padding: 6px 12px;
  border: 2px solid #ffffff;
  border-radius: 12px;
  background: rgba(3, 45, 96, 0.92);
  box-shadow: 0 3px 0 rgba(0, 0, 0, 0.3);
  color: #ffffff;
  font-size: 14px;
  pointer-events: none;
}
.guinea-run .gr-w9-bossbar i {
  flex: 1 1 auto;
  display: block;
  min-width: 120px;
  height: 12px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.2);
}
.guinea-run .gr-w9-bossbar b {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #ff5d2d, #ea001e);
  transition: width 0.15s;
}
.guinea-run .gr-w9-bossbar.is-angry b {
  background: linear-gradient(90deg, #ea001e, #ba0517);
  animation: gr-w9-blink 0.5s infinite;
}
.guinea-run .gr-layer > .gr-w9-bubbles {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}
.guinea-run .gr-w9-say {
  position: absolute;
  left: 0;
  top: 0;
  width: max-content;
  max-width: 200px;
  margin: 0;
  padding: 5px 11px;
  border: 2px solid #032d60;
  border-radius: 14px;
  background: #ffffff;
  box-shadow: 0 3px 0 rgba(3, 45, 96, 0.35);
  color: #032d60;
  font-size: 14px;
  font-weight: 800;
  line-height: 1.25;
  text-align: center;
  translate: -50% -100%;
  pointer-events: none;
}
.guinea-run .gr-w9-say::after {
  content: "";
  position: absolute;
  left: 50%;
  bottom: -9px;
  width: 12px;
  height: 12px;
  border-right: 2px solid #032d60;
  border-bottom: 2px solid #032d60;
  background: #ffffff;
  transform: translateX(-50%) rotate(45deg);
}
.guinea-run .gr-w9-say[hidden] {
  display: none;
}
.guinea-run .gr-w9-say--boss {
  max-width: min(360px, calc(100vw - 24px));
  padding: 10px 16px;
  border-color: #ea001e;
  font-size: 16px;
  translate: -50% 0;
}
.guinea-run .gr-w9-say--boss::after {
  top: -9px;
  bottom: auto;
  border: 0;
  border-left: 2px solid #ea001e;
  border-top: 2px solid #ea001e;
}
@keyframes gr-w9-flash {
  0% { background: #ffe3e8; transform: scale(1.03); }
  100% { background: rgba(255, 255, 255, 0.95); transform: scale(1); }
}
@keyframes gr-w9-blink {
  50% { opacity: 0.45; }
}
/* A wide screen has room on both sides of the field: the coach goes right, the tip left */
@media (min-width: 601px) {
  .guinea-run .gr-coach {
    top: 56%;
  }
}
@media (min-width: 601px) and (min-aspect-ratio: 3/2) {
  .guinea-run .gr-coach {
    top: 46%;
    left: calc(75vw + 17vh);
    max-width: min(320px, calc(50vw - 34vh - 24px));
    padding: 12px 18px;
    font-size: 22px;
  }
  .guinea-run .gr-tipbar {
    left: calc(25vw - 17vh);
    max-width: min(360px, calc(50vw - 34vh - 24px));
    font-size: 15px;
  }
}
@media (max-width: 600px) {
  .guinea-run .gr-extra,
  .guinea-run .gr-goal {
    margin-right: -140px;
    max-width: none;
  }
  .guinea-run .gr-w9-panel {
    padding: 4px 8px;
    font-size: 15px;
  }
  .guinea-run .gr-w9-head strong {
    display: none;
  }
  .guinea-run .gr-w9-counts {
    margin-left: 0;
  }
  .guinea-run .gr-w9-bossbar {
    min-width: 0;
    font-size: 15px;
  }
  .guinea-run .gr-w9-say {
    padding: 4px 8px;
    font-size: 13px;
  }
  .guinea-run .gr-w9-say--boss {
    max-width: calc(100vw - 32px);
    font-size: 14px;
  }
  /* The tip after a mistake takes the whole width, so it stays short above the field */
  .guinea-run .gr-tipbar {
    width: calc(100vw - 24px);
    padding: 6px 10px;
    font-size: 12.5px;
    line-height: 1.3;
  }
}
@media (prefers-reduced-motion: reduce) {
  .guinea-run .gr-w9-dot,
  .guinea-run .gr-w9-bossbar.is-angry b {
    animation: none;
  }
}
`;
