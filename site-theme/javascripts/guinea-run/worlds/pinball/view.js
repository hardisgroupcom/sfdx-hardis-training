/*
 * What Pipeline Pinball looks like: the cabinet, the painted playfield, every
 * wall and toy of layout.js in 3D, the lights the rules switch, the guinea pig
 * rolled into a ball, and the camera at the flipper end that follows the play.
 *
 * Table units are scene units: the table point (x, y) is (x, 0, -y) in the
 * table group, which leans back like a real cabinet. Walls, posts and lights
 * are instanced, one draw per kind; nothing is allocated per frame.
 */
import { TABLE } from "./layout.js";
import { SLDS, rounded, fitText, font, glyph } from "../../core/painter.js";
import { createBallMesh } from "./ball.js";

const LEAN = 0.11;
const WALL_HEIGHT = { wall: 0.62, rubber: 0.42, rail: 0.36, post: 0.5, gate: 0.3, diverter: 0.42, sling: 0.44, upper: 0.5 };
const WALL_COLOR = { wall: 0xe8eef5, rubber: 0x1b1b24, rail: 0xb8c4d0, post: 0xf3f6fa, gate: 0xc9c9c9, diverter: 0x2e844a, sling: 0xea001e, upper: 0xd5f5df };
const FLASH_DECAY = 6;

export function createView(THREE, ctx, table, options) {
  const t = ctx.t;
  const root = ctx.root;
  const engine = ctx.engine;
  const camera = ctx.camera;
  const tier = engine.tier;
  const disposables = [];
  const keep = (thing) => {
    disposables.push(thing);
    return thing;
  };

  const group = new THREE.Group();
  group.rotation.x = LEAN;
  root.add(group);
  const upper = new THREE.Group();
  upper.position.y = TABLE.upperHeight;
  group.add(upper);

  const tmp = new THREE.Object3D();
  const color = new THREE.Color();
  const vec = new THREE.Vector3();

  /* ---------- The playfield and the cabinet ---------- */

  const fieldW = TABLE.right - TABLE.left + 0.4;
  const fieldY0 = -1.6;
  const fieldY1 = TABLE.top + 0.3;
  const fieldTexture = keep(paintField(THREE, t, fieldW, fieldY1 - fieldY0, fieldY0, tier));
  const field = new THREE.Mesh(keep(new THREE.PlaneGeometry(fieldW, fieldY1 - fieldY0)), keep(new THREE.MeshStandardMaterial({ map: fieldTexture, roughness: 0.55, metalness: 0.05 })));
  field.rotation.x = -Math.PI / 2;
  field.position.set((TABLE.left + TABLE.right) / 2, 0, -(fieldY0 + fieldY1) / 2);
  field.receiveShadow = true;
  group.add(field);

  const wood = keep(new THREE.MeshStandardMaterial({ color: 0x0b2a55, roughness: 0.5, metalness: 0.2 }));
  const chrome = keep(new THREE.MeshStandardMaterial({ color: 0xdfe7ef, roughness: 0.25, metalness: 0.8 }));
  const box = keep(new THREE.BoxGeometry(1, 1, 1));
  // Side rails of the cabinet, and the apron that hides the drain
  for (const [x0, x1, y0, y1, h] of [
    [TABLE.left - 0.75, TABLE.left - 0.1, fieldY0, TABLE.arc.y + 4, 1.0],
    [TABLE.right + 0.08, TABLE.right + 0.7, fieldY0, TABLE.arc.y + 4, 1.0],
    [TABLE.left - 0.75, TABLE.right + 0.7, TABLE.arc.y + 4, TABLE.arc.y + 5.4, 1.0]
  ]) {
    const m = new THREE.Mesh(box, wood);
    m.scale.set(x1 - x0, h, y1 - y0);
    m.position.set((x0 + x1) / 2, h / 2 - 0.15, -(y0 + y1) / 2);
    m.receiveShadow = true;
    group.add(m);
  }
  const apronTexture = keep(paintApron(THREE, t));
  const apron = new THREE.Mesh(box, [wood, wood, keep(new THREE.MeshStandardMaterial({ map: apronTexture, roughness: 0.6 })), wood, wood, wood]);
  apron.scale.set(TABLE.laneWall - TABLE.left - 0.1, 0.32, 1.9);
  apron.position.set((TABLE.left + TABLE.laneWall) / 2, 0.16, 0.65);
  group.add(apron);

  /* ---------- Walls, posts, rubbers: a box and two round ends per capsule ---------- */

  const kinds = {};
  for (const w of table.walls) {
    (kinds[w.kind] = kinds[w.kind] || []).push(w.shape);
  }
  const cylinder = keep(new THREE.CylinderGeometry(1, 1, 1, 12));
  const wallMeshes = [];
  for (const [kind, shapes] of Object.entries(kinds)) {
    const material = keep(new THREE.MeshStandardMaterial({ color: WALL_COLOR[kind], roughness: kind === "rubber" || kind === "sling" ? 0.7 : 0.35, metalness: kind === "rail" ? 0.7 : 0.1 }));
    const h = WALL_HEIGHT[kind] || 0.5;
    const bodies = new THREE.InstancedMesh(box, material, shapes.length);
    const ends = new THREE.InstancedMesh(cylinder, material, shapes.length * 2);
    shapes.forEach((s, i) => {
      placeWall(bodies, i, s, h);
      placePost(ends, i * 2, s.ax, s.ay, s.r, h, s.floor);
      placePost(ends, i * 2 + 1, s.bx, s.by, s.rb, h, s.floor);
    });
    for (const m of [bodies, ends]) {
      m.castShadow = tier > 0;
      m.receiveShadow = true;
      m.instanceMatrix.needsUpdate = true;
      group.add(m);
    }
    wallMeshes.push({ kind, shapes, bodies, ends, h });
  }

  function floorY(floor) {
    return floor === 1 ? TABLE.upperHeight : 0;
  }

  function placeWall(mesh, i, s, h) {
    const dx = s.bx - s.ax;
    const dy = s.by - s.ay;
    const len = Math.hypot(dx, dy);
    tmp.position.set((s.ax + s.bx) / 2, floorY(s.floor) + h / 2, -(s.ay + s.by) / 2);
    tmp.rotation.set(0, Math.atan2(dy, dx), 0);
    tmp.scale.set(Math.max(0.001, len), h, (s.r + s.rb));
    tmp.updateMatrix();
    mesh.setMatrixAt(i, tmp.matrix);
  }

  function placePost(mesh, i, x, y, r, h, floor) {
    tmp.position.set(x, floorY(floor) + h / 2, -y);
    tmp.rotation.set(0, 0, 0);
    tmp.scale.set(r, h, r);
    tmp.updateMatrix();
    mesh.setMatrixAt(i, tmp.matrix);
  }

  // The production gate drops into the table when production opens
  const gateEntry = wallMeshes.find((w) => w.kind === "diverter");

  /* ---------- The slingshots' plastics ---------- */

  const slingMaterial = keep(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, transparent: true, opacity: 0.88 }));
  const slingFlash = [];
  for (const side of [-1, 1]) {
    const shape = new THREE.Shape();
    const [a, b, c] = TABLE.sling;
    shape.moveTo(side * -a[0], a[1]);
    shape.lineTo(side * -b[0], b[1]);
    shape.lineTo(side * -c[0], c[1]);
    shape.closePath();
    const geometry = keep(new THREE.ExtrudeGeometry(shape, { depth: 0.4, bevelEnabled: false }));
    const material = slingMaterial.clone();
    keep(material);
    const mesh = new THREE.Mesh(geometry, material);
    // Shape y is table y: laid flat, it lands on -z and the depth goes up
    mesh.rotation.x = -Math.PI / 2;
    group.add(mesh);
    slingFlash.push({ material, flash: 0 });
  }

  /* ---------- Pop bumpers: Apex triggers ---------- */

  const capTexture = keep(paintBumperCap(THREE));
  const bumperBody = keep(new THREE.MeshStandardMaterial({ color: 0xf3f6fa, roughness: 0.3 }));
  const bumpers = table.parts.bumpers.map((b) => {
    const g = new THREE.Group();
    const base = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.58, 0.62, 0.42, 24)), bumperBody);
    base.position.y = 0.21;
    base.castShadow = tier > 0;
    const capMaterial = keep(new THREE.MeshStandardMaterial({ map: capTexture, emissive: 0x1b96ff, emissiveIntensity: 0.15, roughness: 0.35 }));
    const cap = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.66, 0.66, 0.14, 24)), capMaterial);
    cap.position.y = 0.5;
    const ring = new THREE.Mesh(keep(new THREE.TorusGeometry(0.6, 0.05, 6, 24)), chrome);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.32;
    g.add(base, cap, ring);
    g.position.set(b.ax, 0, -b.ay);
    group.add(g);
    return { group: g, cap, capMaterial, flash: 0 };
  });

  /* ---------- Flippers ---------- */

  const flipperMaterial = keep(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 }));
  const flipperRubber = keep(new THREE.MeshStandardMaterial({ color: 0xea001e, roughness: 0.7 }));
  const flippers = Object.values(table.parts.flippers).map((f) => {
    const s = f.shape;
    const g = new THREE.Group();
    const geometry = keep(flipperGeometry(THREE, f.length, s.r, s.rb, 0.3));
    const body = new THREE.Mesh(geometry, flipperMaterial);
    body.castShadow = tier > 0;
    const rim = new THREE.Mesh(keep(flipperGeometry(THREE, f.length, s.r + 0.04, s.rb + 0.04, 0.12)), flipperRubber);
    rim.position.y = 0.06;
    g.add(rim, body);
    g.position.set(s.pivotX, floorY(s.floor) + 0.02, -s.pivotY);
    group.add(g);
    return { f, group: g };
  });

  /* ---------- Targets ---------- */

  const dropMaterial = keep(new THREE.MeshStandardMaterial({ color: 0x0176d3, roughness: 0.4, emissive: 0x0176d3, emissiveIntensity: 0.2 }));
  const drops = table.parts.drops.map((d) => {
    const m = new THREE.Mesh(box, dropMaterial);
    m.scale.set(0.22, 0.5, 0.42);
    m.position.set(d.ax, 0.25, -(d.ay + d.by) / 2);
    m.castShadow = tier > 0;
    group.add(m);
    return { mesh: m, sink: 0 };
  });
  const checkMaterial = keep(new THREE.MeshStandardMaterial({ color: 0x2e844a, roughness: 0.4, emissive: 0x2e844a, emissiveIntensity: 0.25 }));
  for (const c of table.parts.standups.concat(table.parts.upperTargets)) {
    const m = new THREE.Mesh(box, checkMaterial);
    m.scale.set(0.2, 0.46, 0.5);
    m.position.set(c.ax, floorY(c.floor) + 0.23, -(c.ay + c.by) / 2);
    group.add(m);
  }

  /* ---------- The admins who rise, with their faces ---------- */

  const faceLoader = new THREE.TextureLoader();
  const disc = keep(new THREE.CircleGeometry(0.44, 28));
  const admins = table.parts.admins.map((a, i) => {
    const g = new THREE.Group();
    const post = new THREE.Mesh(cylinder, keep(new THREE.MeshStandardMaterial({ color: 0x032d60, roughness: 0.5 })));
    post.scale.set(0.42, 0.5, 0.42);
    post.position.y = 0.25;
    const material = keep(new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true }));
    const url = options.faceUrl(i);
    if (url) {
      faceLoader.load(url, (texture) => {
        keep(texture);
        texture.colorSpace = THREE.SRGBColorSpace;
        material.map = texture;
        material.needsUpdate = true;
      });
    }
    const face = new THREE.Mesh(disc, material);
    face.position.y = 0.95;
    face.rotation.x = -0.35;
    g.add(post, face);
    g.position.set(a.ax, -1.2, -a.ay);
    g.visible = false;
    group.add(g);
    return { group: g, rise: 0, up: false };
  });

  /* ---------- Scoop, release hole, spinner, plunger ---------- */

  const holeMaterial = keep(new THREE.MeshBasicMaterial({ color: 0x050a14 }));
  for (const [x, y, floor] of [
    [TABLE.scoop.x, TABLE.scoop.y, 0],
    [TABLE.release.x, TABLE.release.y, 1]
  ]) {
    const h = new THREE.Mesh(keep(new THREE.CircleGeometry(0.42, 24)), holeMaterial);
    h.rotation.x = -Math.PI / 2;
    h.position.set(x, floorY(floor) + 0.012, -y);
    group.add(h);
    const rim = new THREE.Mesh(keep(new THREE.TorusGeometry(0.44, 0.05, 6, 24)), keep(new THREE.MeshStandardMaterial({ color: 0xfe9339, emissive: 0xfe9339, emissiveIntensity: 0.4 })));
    rim.rotation.x = Math.PI / 2;
    rim.position.set(x, floorY(floor) + 0.03, -y);
    group.add(rim);
  }
  const spinner = new THREE.Mesh(box, chrome);
  spinner.scale.set(1.0, 0.42, 0.03);
  spinner.position.set(-4.47, 0.42, -11.2);
  group.add(spinner);
  let spinLeft = 0;
  const plunger = new THREE.Group();
  const rod = new THREE.Mesh(cylinder, chrome);
  rod.scale.set(0.08, 1.4, 0.08);
  rod.rotation.x = Math.PI / 2;
  rod.position.set(0, 0.3, 0.7);
  const knob = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.4, 0.4, 0.14, 18)), keep(new THREE.MeshStandardMaterial({ color: 0xea001e, roughness: 0.4 })));
  knob.rotation.x = Math.PI / 2;
  knob.position.set(0, 0.3, 0);
  plunger.add(rod, knob);
  plunger.position.set(TABLE.plunger.x, 0, -TABLE.plunger.y + 0.1);
  group.add(plunger);

  /* ---------- Ramps and wires ---------- */

  const rampMaterial = keep(new THREE.MeshStandardMaterial({ color: 0xcfe6ff, roughness: 0.2, metalness: 0.75 }));
  const plastic = { integration: 0x1b96ff, uat: 0x06a59a, production: 0x45c65a };
  for (const [name, p] of Object.entries(table.parts.paths)) {
    const pts = [];
    for (let i = 0; i < p.points.length; i += 3) {
      pts.push(new THREE.Vector3(p.points[i], p.points[i + 2] + 0.42, -p.points[i + 1]));
    }
    const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal");
    const segments = Math.max(24, Math.round(p.total * 4));
    // Two side rails at the ball's sides, one under it
    for (const [side, drop] of [
      [-0.46, 0],
      [0.46, 0],
      [0, -0.42]
    ]) {
      const offset = [];
      for (let i = 0; i <= segments; i++) {
        const u = i / segments;
        const at = curve.getPointAt(u);
        const tangent = curve.getTangentAt(u);
        const sideV = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
        offset.push(at.clone().addScaledVector(sideV, side).add(new THREE.Vector3(0, drop, 0)));
      }
      const rail = new THREE.Mesh(keep(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(offset), segments, 0.045, 5, false)), rampMaterial);
      rail.castShadow = tier > 1;
      group.add(rail);
    }
    if (plastic[name]) {
      // A coloured plastic flap at the mouth, so the shot reads from the flippers
      const flap = new THREE.Mesh(box, keep(new THREE.MeshStandardMaterial({ color: plastic[name], roughness: 0.2, transparent: true, opacity: 0.75, emissive: plastic[name], emissiveIntensity: 0.25 })));
      flap.scale.set(1.36, 0.08, 1.6);
      flap.position.set(p.points[3], p.points[5] + 0.62, -(p.points[1] + p.points[4]) / 2 - 0.2);
      flap.rotation.x = Math.atan2(p.points[5] - p.points[2], p.points[4] - p.points[1]);
      group.add(flap);
    }
  }

  /* ---------- The Production floor ---------- */

  const upperTexture = keep(paintUpper(THREE, t, tier));
  const upperW = TABLE.upperRight - TABLE.upperLeft + 0.6;
  const upperL = TABLE.upperTop - TABLE.upperBottom;
  const deck = new THREE.Mesh(box, [wood, wood, keep(new THREE.MeshStandardMaterial({ map: upperTexture, roughness: 0.5 })), wood, wood, wood]);
  deck.scale.set(upperW, 0.18, upperL);
  deck.position.set(0, -0.09, -(TABLE.upperBottom + TABLE.upperTop) / 2);
  deck.receiveShadow = true;
  upper.add(deck);
  for (const [x, y] of [
    [TABLE.upperLeft, TABLE.upperBottom + 0.3],
    [TABLE.upperRight, TABLE.upperBottom + 0.3]
  ]) {
    const leg = new THREE.Mesh(cylinder, chrome);
    leg.scale.set(0.12, TABLE.upperHeight, 0.12);
    leg.position.set(x, -TABLE.upperHeight / 2, -y);
    upper.add(leg);
  }
  // The Data Cloud rabbit, and the Sales Manager in front of the Release hole
  const rabbitShape = table.parts.rabbit;
  const rabbit = new THREE.Group();
  const rabbitModel = ctx.models.get("data-cloud", { height: 1.7 });
  if (rabbitModel) {
    rabbit.add(rabbitModel);
  } else {
    const blob = new THREE.Mesh(keep(new THREE.SphereGeometry(0.7, 16, 12)), keep(new THREE.MeshStandardMaterial({ color: 0x1b96ff })));
    blob.position.y = 0.7;
    rabbit.add(blob);
  }
  rabbit.position.set(0, TABLE.upperHeight, -rabbitShape.ay);
  group.add(rabbit);
  let rabbitHop = 0;
  const smShape = table.parts.salesManager;
  const salesManager = new THREE.Group();
  const smMaterial = keep(new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true }));
  faceLoader.load(options.salesManagerUrl, (texture) => {
    keep(texture);
    texture.colorSpace = THREE.SRGBColorSpace;
    smMaterial.map = texture;
    smMaterial.needsUpdate = true;
  });
  const smPost = new THREE.Mesh(cylinder, keep(new THREE.MeshStandardMaterial({ color: 0x181818, roughness: 0.5 })));
  smPost.scale.set(0.42, 0.6, 0.42);
  smPost.position.y = 0.3;
  const smFace = new THREE.Mesh(keep(new THREE.CircleGeometry(0.55, 28)), smMaterial);
  smFace.position.y = 1.15;
  smFace.rotation.x = -0.3;
  salesManager.add(smPost, smFace);
  salesManager.position.set(smShape.ax, TABLE.upperHeight, -smShape.ay);
  group.add(salesManager);
  let smShake = 0;

  /* ---------- Lights ---------- */

  const lightMeshes = {};
  const lightGeometry = {
    round: keep(new THREE.CircleGeometry(1, 20)),
    arrow: keep(arrowGeometry(THREE)),
    star: keep(starGeometry(THREE))
  };
  const lightMaterial = keep(new THREE.MeshBasicMaterial({ toneMapped: false }));
  for (const shape of Object.keys(lightGeometry)) {
    const list = table.lights.map((l, i) => ({ l, i })).filter((x) => x.l.shape === shape);
    if (!list.length) {
      continue;
    }
    const mesh = new THREE.InstancedMesh(lightGeometry[shape], lightMaterial, list.length);
    list.forEach(({ l }, k) => {
      tmp.position.set(l.x, floorY(l.floor) + 0.015, -l.y);
      tmp.rotation.set(-Math.PI / 2, 0, -l.angle);
      tmp.scale.setScalar(l.size);
      tmp.updateMatrix();
      mesh.setMatrixAt(k, tmp.matrix);
      mesh.setColorAt(k, color.setHex(l.color));
    });
    mesh.instanceMatrix.needsUpdate = true;
    group.add(mesh);
    lightMeshes[shape] = { mesh, list };
  }

  /* ---------- The balls ---------- */

  const ballMeshes = table.physics.balls.map(() => {
    const m = createBallMesh(THREE, { furShells: tier });
    m.group.visible = false;
    group.add(m.group);
    return m;
  });
  let giant = false;

  /* ---------- The camera ---------- */

  const look = { y: 6, target: 6 };

  function placeCamera(dt) {
    const balls = table.physics.balls;
    // Follow the lowest ball on the table, the one that needs the flippers next;
    // the Production floor when only balls up there are in play
    let low = null;
    let up = null;
    for (const b of balls) {
      if (!b.active) {
        continue;
      }
      if (b.floor === 1 && b.mode === "table") {
        up = up && up.y < b.y ? up : b;
      } else if (!low || b.y < low.y) {
        low = b;
      }
    }
    const aspect = camera.aspect || 1;
    const portrait = aspect < 1;
    // A phone looks down more, so the whole length fits; a wide screen leans
    // back like a player at the cabinet and follows the ball
    const vfov = portrait ? 58 : 46;
    camera.fov = vfov;
    const half = (vfov * Math.PI) / 360;
    const hfov = 2 * Math.atan(Math.tan(half) * aspect);
    const width = TABLE.right - TABLE.left + 1.0;
    const pitch = portrait ? 1.18 : 1.08;
    // Far enough for the width, and on a wide screen for the whole length too:
    // the flippers and the top of the table are always in sight there
    let distance = width / 2 / Math.tan(hfov / 2) + 1.0;
    let below = 0;
    let above = 0;
    for (let i = 0; i < 40; i++) {
      // How far the view reaches below and above its centre, on the table
      const height = Math.sin(pitch) * distance;
      const across = Math.cos(pitch) * distance;
      below = across - height / Math.tan(pitch + half);
      above = pitch - half > 0.06 ? height / Math.tan(pitch - half) - across : 40;
      if (portrait || below + above >= TABLE.top + 2.2) {
        break;
      }
      distance *= 1.04;
    }
    const span = below + above;
    // The flippers stay in sight while the ball is in the lower part
    const min = -0.9 + below;
    const max = Math.max(min, TABLE.top + 0.6 - above);
    let target;
    if (up && (!low || low.y > 9 || low.mode === "path")) {
      target = Math.max(min, Math.min((TABLE.upperBottom + TABLE.upperTop) / 2 + below - span / 2, TABLE.upperTop + 0.6 - above));
    } else if (low) {
      // The ball a quarter of the way up the view
      target = Math.max(min, Math.min(max, low.y - span * 0.28 + below));
    } else {
      target = min;
    }
    look.target = target;
    const k = 1 - Math.exp(-dt * (low && low.y < 4 ? 6 : 3));
    look.y += (look.target - look.y) * k;
    vec.set((TABLE.left + TABLE.right) / 2, look.y > 20 ? TABLE.upperHeight : 0, -look.y);
    group.localToWorld(vec);
    const tx = vec.x;
    const ty = vec.y;
    const tz = vec.z;
    camera.position.set(tx, ty + Math.sin(pitch) * distance, tz + Math.cos(pitch) * distance);
    camera.lookAt(tx, ty, tz);
    camera.updateProjectionMatrix();
    engine.aimSun(tx, tz);
  }

  /* ---------- Each frame ---------- */

  let time = 0;
  const q = new THREE.Quaternion();
  const axis = new THREE.Vector3();

  function update(dt, lights) {
    time += dt;
    const physics = table.physics;
    // Balls
    physics.balls.forEach((b, i) => {
      const m = ballMeshes[i];
      m.group.visible = b.active;
      if (!b.active) {
        return;
      }
      const h = b.mode === "path" ? b.h : floorY(b.floor);
      const scale = giant ? 1.5 : 1;
      m.group.position.set(b.x, h + b.r * scale, -b.y);
      m.group.scale.setScalar(scale);
      // Rolling: the distance covered turns it round the axis across the motion
      const dx = b.spinX;
      const dy = b.spinY;
      b.spinX = 0;
      b.spinY = 0;
      const d = Math.hypot(dx, dy);
      if (d > 1e-5) {
        axis.set(-dy, 0, -dx).normalize();
        q.setFromAxisAngle(axis, -d / (b.r * scale));
        m.body.quaternion.premultiply(q);
      }
      m.update(dt);
    });
    // Flippers
    for (const { f, group: g } of flippers) {
      const a = f.side === 1 ? f.angle : Math.PI - f.angle;
      g.rotation.y = a;
    }
    // Plunger
    const pull = physics.plunger ? physics.plunger.pull : 0;
    plunger.position.z = -TABLE.plunger.y + 0.1 + pull * 0.9;
    // Bumpers and slings flash
    for (const b of bumpers) {
      b.flash = Math.max(0, b.flash - dt * FLASH_DECAY);
      b.capMaterial.emissiveIntensity = 0.15 + b.flash * 1.6;
      b.cap.position.y = 0.5 - b.flash * 0.08;
    }
    for (const s of slingFlash) {
      s.flash = Math.max(0, s.flash - dt * FLASH_DECAY);
      s.material.emissive.setHex(0xea001e);
      s.material.emissiveIntensity = s.flash;
    }
    // Drop targets sink, admins rise
    table.parts.drops.forEach((d, i) => {
      const target = d.enabled ? 0 : 1;
      drops[i].sink += (target - drops[i].sink) * Math.min(1, dt * 14);
      drops[i].mesh.position.y = 0.25 - drops[i].sink * 0.5;
    });
    table.parts.admins.forEach((a, i) => {
      const v = admins[i];
      const target = a.enabled ? 1 : 0;
      v.rise += (target - v.rise) * Math.min(1, dt * 8);
      v.group.visible = v.rise > 0.02;
      v.group.position.y = -1.2 + v.rise * 1.2;
      v.group.rotation.y = Math.sin(time * 3 + i) * 0.15;
    });
    if (gateEntry) {
      const open = !table.parts.productionGate.enabled;
      const y = open ? -gateEntry.h : 0;
      gateEntry.bodies.position.y += (y - gateEntry.bodies.position.y) * Math.min(1, dt * 8);
      gateEntry.ends.position.y = gateEntry.bodies.position.y;
    }
    if (spinLeft > 0) {
      spinner.rotation.x += dt * 30;
      spinLeft -= dt;
    } else {
      spinner.rotation.x += (Math.round(spinner.rotation.x / Math.PI) * Math.PI - spinner.rotation.x) * Math.min(1, dt * 6);
    }
    // The rabbit walks and hops, the Sales Manager shakes his head
    rabbit.position.x = rabbitShape.ax;
    rabbitHop = Math.max(0, rabbitHop - dt * 3);
    rabbit.position.y = TABLE.upperHeight + Math.abs(Math.sin(time * 6)) * 0.12 + rabbitHop * 0.6;
    rabbit.rotation.y = rabbitShape.vx > 0 ? -0.6 : 0.6;
    const smUp = smShape.enabled;
    salesManager.position.y += ((smUp ? TABLE.upperHeight : TABLE.upperHeight - 1.6) - salesManager.position.y) * Math.min(1, dt * 6);
    smShake = Math.max(0, smShake - dt * 2.5);
    salesManager.rotation.y = Math.sin(time * 18) * smShake * 0.5;
    // Lights
    for (const { mesh, list } of Object.values(lightMeshes)) {
      list.forEach(({ i }, k) => {
        const l = lights[i];
        let level = 0.14;
        if (l.mode === 1) {
          level = 1;
        } else if (l.mode === 2) {
          level = Math.sin(time * 6) > 0 ? 1 : 0.2;
        } else if (l.mode === 3) {
          level = Math.sin(time * 16) > 0 ? 1.15 : 0.2;
        }
        color.setHex(l.color).multiplyScalar(level * (level > 0.5 ? 1.6 : 1));
        mesh.setColorAt(k, color);
      });
      mesh.instanceColor.needsUpdate = true;
    }
    placeCamera(dt);
  }

  return {
    update,
    placeCamera,
    /** The point of the scene over a table point, for confetti. */
    worldPoint(x, y, floor, out) {
      out.set(x, floorY(floor || 0) + 0.6, -y);
      return group.localToWorld(out);
    },
    flashBumper(i) {
      if (bumpers[i]) {
        bumpers[i].flash = 1;
      }
    },
    flashSling(i) {
      if (slingFlash[i]) {
        slingFlash[i].flash = 1;
      }
    },
    spin(n) {
      spinLeft = Math.min(1.5, spinLeft + n * 0.08);
    },
    rabbitHit() {
      rabbitHop = 1;
    },
    salesManagerHit() {
      smShake = 1;
    },
    setGiant(on) {
      giant = on;
    },
    snapCamera() {
      look.y = look.target;
    },
    dispose() {
      for (const m of ballMeshes) {
        m.dispose();
      }
      for (const thing of disposables) {
        if (thing && thing.dispose) {
          thing.dispose();
        }
      }
      root.remove(group);
    }
  };
}

/* ---------- Geometry ---------- */

function flipperGeometry(THREE, length, r1, r2, height) {
  const shape = new THREE.Shape();
  const a = Math.asin(Math.max(-1, Math.min(1, (r1 - r2) / length)));
  shape.absarc(0, 0, r1, Math.PI / 2 + a, Math.PI * 1.5 - a, false);
  shape.absarc(length, 0, r2, -Math.PI / 2 - a, Math.PI / 2 + a, false);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 2, curveSegments: 10 });
  // Flat on the table: shape y becomes -z (table y), the depth goes up
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}

function arrowGeometry(THREE) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 1);
  shape.lineTo(0.8, -0.2);
  shape.lineTo(0.3, -0.2);
  shape.lineTo(0.3, -0.9);
  shape.lineTo(-0.3, -0.9);
  shape.lineTo(-0.3, -0.2);
  shape.lineTo(-0.8, -0.2);
  shape.closePath();
  return new THREE.ShapeGeometry(shape);
}

function starGeometry(THREE) {
  const shape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 1 : 0.45;
    const a = Math.PI / 2 + (i * Math.PI) / 5;
    if (i === 0) {
      shape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    } else {
      shape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
  }
  shape.closePath();
  return new THREE.ShapeGeometry(shape);
}

/* ---------- Pictures ---------- */

function canvasTexture(THREE, canvas, tier) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = tier > 1 ? 8 : 2;
  return texture;
}

/** The playfield, painted: the pipeline, the shot names, the mission ring, the inserts' labels. */
function paintField(THREE, t, width, length, y0, tier) {
  const scale = tier > 0 ? 96 : 64;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(length * scale);
  const c = canvas.getContext("2d");
  const X = (x) => (x - (TABLE.left - 0.2)) * scale;
  const Y = (y) => canvas.height - (y - y0) * scale;
  const g = c.createLinearGradient(0, canvas.height, 0, 0);
  g.addColorStop(0, "#021b3d");
  g.addColorStop(0.45, SLDS.navy);
  g.addColorStop(1, "#0b4f9c");
  c.fillStyle = g;
  c.fillRect(0, 0, canvas.width, canvas.height);
  // A circuit of thin lines, the cloud behind the pipeline
  c.strokeStyle = "rgba(27,150,255,0.14)";
  c.lineWidth = scale * 0.03;
  for (let y = 0; y < 21; y += 1.5) {
    c.beginPath();
    c.moveTo(X(-5), Y(y));
    c.lineTo(X(5), Y(y + 0.6));
    c.stroke();
  }
  c.fillStyle = "rgba(255,255,255,0.06)";
  for (const [x, y, r] of [
    [-2, 16, 3.2],
    [2.4, 12.5, 2.6],
    [-1, 6.5, 3.6]
  ]) {
    c.beginPath();
    c.arc(X(x), Y(y), r * scale, 0, Math.PI * 2);
    c.fill();
  }
  // The pipeline road from the flippers up to production
  c.strokeStyle = "rgba(255,255,255,0.18)";
  c.lineWidth = scale * 0.5;
  c.lineCap = "round";
  c.beginPath();
  c.moveTo(X(0), Y(2.2));
  c.bezierCurveTo(X(-2.5), Y(7), X(2.5), Y(9), X(0), Y(12.3));
  c.stroke();
  c.textAlign = "center";
  c.textBaseline = "middle";
  const label = (text, x, y, size, colorName, angle) => {
    c.save();
    c.translate(X(x), Y(y));
    c.rotate(angle || 0);
    c.fillStyle = colorName;
    fitText(c, text, 0, 0, scale * 2.6, size * scale, "800");
    c.restore();
  };
  label(t("pbFieldIntegration"), -3.0, 9.3, 0.36, "#9fd4ff");
  label(t("pbFieldUat"), 3.0, 9.3, 0.36, "#8ff0e4");
  label(t("pbFieldPreprod"), -4.47, 8.1, 0.24, "#d8b8ff", -Math.PI / 2);
  label(t("pbFieldProduction"), 0, 11.15, 0.32, "#a8f0b5");
  label(t("pbFieldPullRequest"), -1.55, 12.15, 0.22, "#ffd0a8");
  label(t("pbFieldRecentChanges"), -4.2, 8.35, 0.2, "#9fd4ff", -Math.PI / 2);
  label(t("pbFieldChecks"), 4.25, 8.1, 0.2, "#a8f0b5", -Math.PI / 2);
  label(t("pbFieldRollback"), -4.42, 3.2, 0.2, "#ffb3bd");
  label(t("pbFieldBallSave"), 0, 0.45, 0.2, "#8ff0e4");
  label(t("pbFieldExtraBall"), 0, 7.95, 0.2, "#ffd0a8");
  label(t("pbFieldNote"), 0, 5.85, 0.18, "#ffd0a8");
  label(t("pbFieldDeploy"), -3.0, 7.4, 0.17, "#ffd0a8");
  label(t("pbFieldBonus"), 0, 4.7, 0.16, "#9fd4ff");
  // The mission ring, numbered like the worlds
  for (let i = 0; i < 10; i++) {
    const a = Math.PI * (0.15 + (0.7 * i) / 9);
    const x = Math.cos(Math.PI - a) * 2.1;
    const y = 6.6 + Math.sin(a) * 1.15;
    c.fillStyle = "rgba(255,255,255,0.8)";
    font(c, Math.round(scale * 0.2), "800");
    c.fillText(String(i), X(x * 1.18), Y(6.6 + (y - 6.6) * 1.35));
  }
  c.save();
  c.translate(X(0), Y(3.4));
  c.fillStyle = "rgba(255,255,255,0.85)";
  fitText(c, t("pbTitle"), 0, 0, scale * 3.0, scale * 0.42, "800");
  c.restore();
  // The plunger lane
  c.fillStyle = "rgba(0,0,0,0.35)";
  c.fillRect(X(5.0), Y(14), X(6.1) - X(5.0), Y(-1.6) - Y(14));
  return canvasTexture(THREE, canvas, tier);
}

function paintUpper(THREE, t, tier) {
  const scale = tier > 0 ? 96 : 64;
  const w = TABLE.upperRight - TABLE.upperLeft + 0.6;
  const l = TABLE.upperTop - TABLE.upperBottom;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(l * scale);
  const c = canvas.getContext("2d");
  const g = c.createLinearGradient(0, canvas.height, 0, 0);
  g.addColorStop(0, "#0b3d1c");
  g.addColorStop(1, "#2e844a");
  c.fillStyle = g;
  c.fillRect(0, 0, canvas.width, canvas.height);
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillStyle = "rgba(255,255,255,0.85)";
  fitText(c, t("pbFieldProductionOrg"), canvas.width / 2, canvas.height * 0.62, canvas.width * 0.8, scale * 0.42, "800");
  c.fillStyle = "rgba(255,255,255,0.6)";
  fitText(c, t("pbFieldRelease"), canvas.width * 0.16, canvas.height * 0.2, canvas.width * 0.3, scale * 0.24, "800");
  glyph(c, "cloud", canvas.width / 2, canvas.height * 0.4, scale * 0.9, "rgba(255,255,255,0.25)");
  return canvasTexture(THREE, canvas, tier);
}

function paintApron(THREE, t) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 192;
  const c = canvas.getContext("2d");
  c.fillStyle = SLDS.brandDark;
  c.fillRect(0, 0, canvas.width, canvas.height);
  rounded(c, 24, 24, canvas.width - 48, canvas.height - 48, 28);
  c.fillStyle = SLDS.navy;
  c.fill();
  c.fillStyle = "#ffffff";
  c.textAlign = "center";
  c.textBaseline = "middle";
  fitText(c, "Cloudity · sfdx-hardis", canvas.width / 2, canvas.height / 2, canvas.width * 0.8, 64, "800");
  void t;
  return canvasTexture(THREE, canvas, 1);
}

function paintBumperCap(THREE) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const c = canvas.getContext("2d");
  const g = c.createRadialGradient(128, 128, 10, 128, 128, 128);
  g.addColorStop(0, "#5ab0ff");
  g.addColorStop(1, SLDS.brand);
  c.fillStyle = g;
  c.fillRect(0, 0, 256, 256);
  glyph(c, "apex", 128, 128, 120, "#ffffff");
  return canvasTexture(THREE, canvas, 1);
}
