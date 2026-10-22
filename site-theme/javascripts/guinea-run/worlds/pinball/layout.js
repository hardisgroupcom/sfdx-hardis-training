/*
 * The table of Pipeline Pinball, as data: every wall, post, flipper, target,
 * ramp and light, in table units (see physics.js). The physics, the view and
 * the rules all read it from here, so a post moved here moves everywhere.
 *
 *   y 22 to 30  the Production floor, raised: two small flippers, the Data
 *               Cloud rabbit, the Sales Manager in front of the Release hole
 *   y 17 to 20  three top lanes (the skill shot) under the arc
 *   y 13 to 17  three pop bumpers (Apex triggers), the Pull Request scoop
 *   y 9 to 13   the ramps: integration (left), production (centre, closed
 *               until a promotion opens it), uat (right); the orbits on both
 *               sides (the left one is preprod, with the spinner)
 *   y 6 to 9    the drop targets of Recent Changes (left), three checks
 *               (right), the admins who rise in the middle
 *   y 0 to 6    the slingshots, the inlanes and outlanes, the kickback
 *               (Rollback, left outlane), the flippers; the plunger lane on
 *               the right
 */
import { createPhysics } from "./physics.js";

export const TABLE = {
  left: -5,
  right: 6.1,
  // The playfield's right edge: the plunger lane is beyond it
  laneWall: 5,
  top: 20.55,
  // The Production floor
  upperBottom: 21.8,
  upperTop: 30.4,
  upperLeft: -3.6,
  upperRight: 3.6,
  // How high the Production floor is drawn above the table
  upperHeight: 2.2,
  plunger: { x: 5.56, y: 0.6 },
  scoop: { x: -1.55, y: 12.9 },
  release: { x: -2.75, y: 27.6 },
  arc: { x: 0.55, y: 15, r: 5.55 },
  // The left slingshot's corners (the right one mirrors it): top, bottom, the tip over the flipper
  sling: [
    [-2.6, 6.0],
    [-2.6, 4.35],
    [-1.65, 4.0]
  ]
};

// Under each orbit, a bank turned towards the far flipper sends a ball coming
// down the side wall back into play: the drop targets of Recent Changes on the
// left, three checks on the right. From the wall to the end over the inlane
const BANK_TOP = [-5, 9.4];
const BANK_END = [-3.9, 7.5];
const DROPS = [0.1, 0.3, 0.5, 0.7, 0.9];
const STANDUPS = [0.22, 0.5, 0.78];

/** A point along the left bank (mirrored for the right one), pushed off its face by `off`. */
export function bankPoint(k, off, side) {
  const dx = BANK_END[0] - BANK_TOP[0];
  const dy = BANK_END[1] - BANK_TOP[1];
  const len = Math.hypot(dx, dy);
  // The face looks up and across the table, towards the other flipper
  const nx = -dy / len;
  const ny = dx / len;
  const x = BANK_TOP[0] + dx * k + nx * off;
  const y = BANK_TOP[1] + dy * k + ny * off;
  return [side === -1 ? -x : x, y];
}
const BANK_LENGTH = Math.hypot(BANK_END[0] - BANK_TOP[0], BANK_END[1] - BANK_TOP[1]);
const ADMINS = [
  [-1.6, 9.2],
  [0.12, 10.1],
  [1.6, 9.2]
];
const BUMPERS = [
  [-1.05, 15.75],
  [1.05, 15.75],
  [0, 14.45]
];
// Under the arc on the right, where a plunge that is not a full one falls
const LANES = [1.1, 2.2, 3.3];

/** Builds the table: { physics, parts, walls, lights }. */
export function buildTable() {
  const p = createPhysics();
  const walls = [];
  const keep = (list, kind) => {
    for (const s of Array.isArray(list) ? list : [list]) {
      walls.push({ shape: s, kind });
    }
    return list;
  };
  const T = TABLE;

  // The cabinet: left wall, the arc over the top, the outer wall of the plunger lane
  keep(p.capsule(T.left, -1.5, T.left, T.arc.y, { r: 0.12, bounce: 0.45 }), "wall");
  keep(p.arc(T.arc.x, T.arc.y, T.arc.r, Math.PI, 0, 28, { r: 0.12, bounce: 0.4, friction: 0.01 }), "wall");
  keep(p.capsule(T.right, T.arc.y, T.right, -1.5, { r: 0.08, bounce: 0.4 }), "wall");
  // The plunger lane: its inner wall, and a gate that lets the ball out, not back
  keep(p.capsule(T.laneWall, -1.5, T.laneWall, 13.6, { r: 0.1, bounce: 0.4 }), "wall");
  keep(p.capsule(6.02, 14.45, 5.05, 13.72, { r: 0.06, bounce: 0.2, oneWay: { x: 0, y: 1 } }), "gate");
  p.setPlunger(5.12, 5.98, T.plunger.y);

  // The orbits: an inner wall on each side makes a lane up to the arc
  keep(p.capsule(-3.95, 10.8, -3.95, 14.7, { r: 0.1 }), "wall");
  keep(p.arc(-3.15, 14.7, 0.8, Math.PI, Math.PI / 2, 5, { r: 0.1 }), "wall");
  keep(p.capsule(3.95, 10.8, 3.95, 14.2, { r: 0.1 }), "wall");
  keep(p.arc(3.15, 14.2, 0.8, 0, Math.PI / 2, 5, { r: 0.1 }), "wall");
  const spinner = p.line(-3.95, 11.2, T.left, 11.2, { tag: "spinner" });
  const orbitLeft = p.line(T.left, 14.2, -3.95, 14.2, { tag: "orbitLeft" });
  const orbitRight = p.line(3.95, 13.0, T.laneWall, 13.0, { tag: "orbitRight" });

  // The top lanes, under the arc: three rollovers, lit for the skill shot
  for (const [x, top] of [
    [0.55, 18.7],
    [1.65, 18.6],
    [2.75, 18.45],
    [3.85, 17.9]
  ]) {
    keep(p.capsule(x, 17.4, x, top, { r: 0.08, bounce: 0.5 }), "post");
  }
  const lanes = LANES.map((x, i) => p.line(x + 0.47, 17.9, x - 0.47, 17.9, { tag: "lane" + i }));

  // Apex triggers: the pop bumpers
  const bumpers = BUMPERS.map(([x, y], i) => p.circle(x, y, 0.6, { bounce: 0.6, kick: 17, tag: "bumper" + i }));

  // The Pull Request scoop, with its back wall
  keep(p.arc(T.scoop.x, T.scoop.y, 0.62, -0.25, Math.PI + 0.25, 8, { r: 0.08, bounce: 0.2 }), "wall");
  // A roof between the scoop and the production ramp: no ball rests in the corner
  keep(p.wall([-1.95, 13.4, -1.0, 13.98, -0.66, 13.72], { r: 0.08, bounce: 0.3 }), "wall");
  const scoop = p.hole(T.scoop.x, T.scoop.y, 0.32, { tag: "scoop", capture: true });

  // The ramps: their mouths, and the paths over the table
  const integrationPath = p.path(
    [-3.0, 10.9, 0, -3.0, 12.6, 0.9, -3.15, 14.2, 1.7, -3.7, 15.0, 1.9, -4.35, 14.3, 1.9, -4.5, 12.4, 1.7, -4.45, 9.6, 1.3, -4.0, 7.8, 0.7, -3.3, 6.6, 0.15, -3.25, 6.0, 0],
    { tag: "integration" }
  );
  keep(p.wall([-3.72, 13.2, -3.72, 10.75, -3.6, 10.55], { r: 0.08, bounce: 0.3 }), "rail");
  keep(p.wall([-2.28, 13.2, -2.28, 10.75, -2.4, 10.55], { r: 0.08, bounce: 0.3 }), "rail");
  p.line(-3.6, 10.9, -2.4, 10.9, { path: integrationPath, tag: "integrationMouth" });

  const uatPath = p.path(
    [3.0, 10.9, 0, 3.0, 12.6, 0.9, 3.15, 14.2, 1.7, 3.7, 15.0, 1.9, 4.35, 14.3, 1.9, 4.5, 12.4, 1.7, 4.45, 9.6, 1.3, 4.0, 7.8, 0.7, 3.3, 6.6, 0.15, 3.25, 6.0, 0],
    { tag: "uat" }
  );
  keep(p.wall([3.72, 13.2, 3.72, 10.75, 3.6, 10.55], { r: 0.08, bounce: 0.3 }), "rail");
  keep(p.wall([2.28, 13.2, 2.28, 10.75, 2.4, 10.55], { r: 0.08, bounce: 0.3 }), "rail");
  p.line(2.4, 10.9, 3.6, 10.9, { path: uatPath, tag: "uatMouth" });

  // The production ramp climbs to the Production floor; a gate closes its mouth until it is lit
  const productionPath = p.path(
    [0, 12.75, 0, 0, 14.6, 0.9, 0.15, 17.4, 1.9, 0.6, 20.0, 2.5, 1.6, 21.6, 2.6, 2.6, 22.6, 2.4, 2.75, 23.4, 2.2, 2.4, 24.2, 2.2],
    { tag: "production", exitFloor: 1 }
  );
  keep(p.wall([-0.66, 13.7, -0.66, 12.55], { r: 0.08, bounce: 0.3 }), "rail");
  keep(p.wall([0.66, 13.7, 0.66, 12.55], { r: 0.08, bounce: 0.3 }), "rail");
  const productionGate = keep(p.capsule(-0.58, 12.45, 0.58, 12.45, { r: 0.1, bounce: 0.45, tag: "productionGate" }), "diverter");
  p.line(-0.58, 12.75, 0.58, 12.75, { path: productionPath, tag: "productionMouth" });

  // The two banks: a solid wedge from the wall, its face turned to the middle
  for (const side of [1, -1]) {
    const [tx, ty] = bankPoint(0, 0, side);
    const [ex, ey] = bankPoint(1, 0, side);
    keep(p.wall([tx, ty, ex, ey, side * -5, 7.1], { r: 0.1, bounce: 0.45 }), "wall");
  }
  // Recent Changes: five drop targets along the left bank
  const half = (0.16 / BANK_LENGTH);
  const drops = DROPS.map((k, i) => {
    // Flush with the bank: a ball rolling down it does not knock them over, a shot does
    const [ax, ay] = bankPoint(k - half, 0.04, 1);
    const [bx, by] = bankPoint(k + half, 0.04, 1);
    return p.capsule(ax, ay, bx, by, { r: 0.12, bounce: 0.35, tag: "drop" + i });
  });
  // Three checks along the right bank
  const standups = STANDUPS.map((k, i) => {
    const [ax, ay] = bankPoint(k - half * 1.4, 0.04, -1);
    const [bx, by] = bankPoint(k + half * 1.4, 0.04, -1);
    return p.capsule(ax, ay, bx, by, { r: 0.1, bounce: 0.4, tag: "check" + i });
  });
  // The admins who rise in the middle, with their change sets
  const admins = ADMINS.map(([x, y], i) => p.circle(x, y, 0.44, { bounce: 0.45, tag: "admin" + i, enabled: false }));

  // The inlanes, the outlanes, the slingshots
  for (const side of [-1, 1]) {
    keep(p.wall([side * 3.85, 6.6, side * 3.85, 3.75, side * 3.12, 3.02], { r: 0.1, bounce: 0.4 }), "wall");
    // The post at the top of the inlane guide: a rubber that keeps some balls out of the outlane
    keep(p.circle(side * 3.85, 6.7, 0.17, { bounce: 0.8 }), "rubber");
    const [a, b, c] = T.sling;
    keep(p.capsule(side * -a[0], a[1], side * -b[0], b[1], { r: 0.12, bounce: 0.6 }), "rubber");
    keep(p.capsule(side * -b[0], b[1], side * -c[0], c[1], { r: 0.12, bounce: 0.6 }), "rubber");
  }
  const [sa, , sc] = T.sling;
  const slings = [
    keep(p.capsule(sc[0], sc[1], sa[0], sa[1], { r: 0.14, bounce: 0.7, kick: 14, kickMin: 6, tag: "slingL" }), "sling"),
    keep(p.capsule(-sa[0], sa[1], -sc[0], sc[1], { r: 0.14, bounce: 0.7, kick: 14, kickMin: 6, tag: "slingR" }), "sling")
  ];
  p.line(-3.85, 4.6, T.left, 4.6, { tag: "outlaneL" });
  p.line(T.laneWall, 4.6, 3.85, 4.6, { tag: "outlaneR" });
  p.line(-2.6, 4.6, -3.85, 4.6, { tag: "inlaneL" });
  p.line(3.85, 4.6, 2.6, 4.6, { tag: "inlaneR" });
  const kickback = p.line(-3.85, 1.4, T.left, 1.4, { tag: "kickback" });

  const left = p.flipper(-2.95, 2.75, 2.6, { side: 1, rest: -0.49, up: 0.52, tag: "flipper" });
  const right = p.flipper(2.95, 2.75, 2.6, { side: -1, rest: -0.49, up: 0.52, tag: "flipper" });

  /* ---------- The Production floor ---------- */
  const U = { floor: 1 };
  keep(p.capsule(T.upperLeft, 24.4, T.upperLeft, 27.4, Object.assign({ r: 0.12 }, U)), "upper");
  keep(p.capsule(T.upperRight, 24.4, T.upperRight, 27.4, Object.assign({ r: 0.12 }, U)), "upper");
  keep(p.arc(0, 27.4, T.upperRight, Math.PI, 0, 18, Object.assign({ r: 0.12 }, U)), "upper");
  keep(p.wall([T.upperLeft, 24.4, -2.15, 23.35], Object.assign({ r: 0.1 }, U)), "upper");
  keep(p.wall([T.upperRight, 24.4, 2.15, 23.35], Object.assign({ r: 0.1 }, U)), "upper");
  const upperLeft = p.flipper(-1.85, 23.05, 1.45, { side: 1, rest: -0.5, up: 0.5, r: 0.26, rb: 0.14, floor: 1, tag: "flipper" });
  const upperRight = p.flipper(1.85, 23.05, 1.45, { side: -1, rest: -0.5, up: 0.5, r: 0.26, rb: 0.14, floor: 1, tag: "flipper" });
  // The Data Cloud rabbit walks across the top; the Sales Manager stands in front of the Release hole
  const rabbit = p.circle(0, 27.4, 0.72, Object.assign({ bounce: 0.75, kick: 6, tag: "rabbit", moving: true }, U));
  const salesManager = p.circle(-2.05, 26.75, 0.42, Object.assign({ bounce: 0.5, tag: "salesManager" }, U));
  keep(p.arc(T.release.x, T.release.y, 0.6, Math.PI * 0.35, Math.PI * 1.45, 6, Object.assign({ r: 0.08 }, U)), "upper");
  const release = p.hole(T.release.x, T.release.y, 0.32, Object.assign({ tag: "release", capture: true }, U));
  const upperTargets = [25.3, 26.3].map((y, i) => p.capsule(3.45, y - 0.25, 3.45, y + 0.25, Object.assign({ r: 0.1, bounce: 0.4, tag: "upperCheck" + i }, U)));
  p.line(3.6, 21.9, -3.6, 21.9, Object.assign({ tag: "upperDrain" }, U));
  // Back down from the Production floor: a wire to the bumpers
  const downPath = p.path([0, 22.0, 2.2, 1.6, 21.6, 2.2, 3.0, 20.3, 2.2, 3.3, 18.6, 1.9, 2.9, 17.3, 1.1, 2.1, 16.9, 0.2, 1.75, 16.7, 0], { tag: "down" });
  // After the Release hole: the long way down to the left inlane
  const releasePath = p.path([T.release.x, T.release.y, 2.2, -3.4, 26.4, 2.4, -3.9, 23.4, 2.6, -4.55, 19.0, 2.3, -4.55, 15.4, 2.0, -4.5, 12.4, 1.7, -4.45, 9.6, 1.3, -4.0, 7.8, 0.7, -3.3, 6.6, 0.15, -3.25, 6.0, 0], { tag: "releaseWire" });

  p.build();

  const lights = buildLights();
  return {
    physics: p,
    walls,
    lights,
    parts: {
      flippers: { left, right, upperLeft, upperRight },
      bumpers,
      slings,
      drops,
      standups,
      admins,
      rabbit,
      salesManager,
      productionGate,
      upperTargets,
      scoop,
      release,
      kickback,
      spinner,
      orbitLeft,
      orbitRight,
      lanes,
      paths: { integration: integrationPath, uat: uatPath, production: productionPath, down: downPath, release: releasePath }
    }
  };
}

/**
 * The inserts of the playfield the rules light: an arrow in front of each
 * shot, the drop targets, the lanes, the kickback, the ball save. Each one
 * { id, x, y, floor, size, shape ("arrow", "round", "star"), angle, color }.
 */
function buildLights() {
  const lights = [];
  const add = (id, x, y, options) => {
    lights.push(Object.assign({ id, x, y, floor: 0, size: 0.32, shape: "round", angle: 0, color: 0x0176d3 }, options));
  };
  // The shots, from left to right
  add("shot-preprod", -4.48, 8.7, { shape: "arrow", angle: 0, color: 0x9050e9, size: 0.4 });
  add("shot-integration", -3.0, 9.9, { shape: "arrow", angle: 0, color: 0x0176d3, size: 0.42 });
  add("shot-scoop", -1.55, 11.85, { shape: "arrow", angle: 0.2, color: 0xfe9339, size: 0.4 });
  add("shot-production", 0, 11.6, { shape: "arrow", angle: 0, color: 0x2e844a, size: 0.44 });
  add("shot-uat", 3.0, 9.9, { shape: "arrow", angle: 0, color: 0x06a59a, size: 0.42 });
  add("shot-orbitRight", 4.48, 9.0, { shape: "arrow", angle: 0, color: 0x9050e9, size: 0.36 });
  // The promotion ladder in front of the production ramp
  ["integration", "uat", "preprod"].forEach((name, i) => add("promo-" + name, -0.5 + i * 0.5, 10.95, { size: 0.18, color: 0x2e844a }));
  // The locks of Deploy to all orgs, on the integration ramp
  [0, 1, 2].forEach((i) => add("lock" + i, -3.0, 8.0 + i * 0.5, { size: 0.2, color: 0xfe9339 }));
  DROPS.forEach((k, i) => {
    const [x, y] = bankPoint(k, 0.72, 1);
    add("drop" + i, x, y, { size: 0.16, color: 0x0176d3 });
  });
  STANDUPS.forEach((k, i) => {
    const [x, y] = bankPoint(k, 0.72, -1);
    add("check" + i, x, y, { size: 0.18, color: 0x2e844a });
  });
  LANES.forEach((x, i) => add("lane" + i, x, 16.95, { size: 0.22, color: 0xfe9339 }));
  add("kickback", -4.42, 2.5, { size: 0.26, color: 0xea001e });
  add("ballSave", 0, 0.9, { size: 0.3, shape: "star", color: 0x06a59a });
  add("extraBall", 0, 7.4, { size: 0.3, shape: "star", color: 0xfe9339 });
  add("note", 0, 6.4, { size: 0.28, shape: "star", color: 0xdd7a01 });
  // The ten missions, in a ring round the middle
  for (let i = 0; i < 10; i++) {
    const a = Math.PI * (0.15 + (0.7 * i) / 9);
    add("mission" + i, Math.cos(Math.PI - a) * 2.1, 6.6 + Math.sin(a) * 1.15, { size: 0.17, color: 0x9050e9 });
  }
  add("multiplier", 0, 5.15, { size: 0.22, shape: "star", color: 0x0176d3 });
  // The Production floor
  add("rabbit", 0, 25.4, { floor: 1, size: 0.3, color: 0x0176d3 });
  add("release", -2.2, 25.7, { floor: 1, shape: "arrow", angle: 0.55, size: 0.34, color: 0x2e844a });
  return lights;
}
