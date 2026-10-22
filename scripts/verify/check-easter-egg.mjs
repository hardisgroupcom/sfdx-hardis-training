#!/usr/bin/env node
/**
 * Checks Guinea Run, the game hidden in the course: that readers can find it,
 * that every world opens, plays, ends and frees what it drew, that progress
 * is kept, and that what the game quotes from the labs is still in the labs.
 *
 *   node scripts/build/site.mjs && python -m zensical build -f course-site.yml
 *   node scripts/verify/check-easter-egg.mjs
 *
 * What it proves:
 * - the Konami code typed with the arrows opens the map, in English on an
 *   English page; typed on WASD it opens it in French on a French page; typed
 *   in a text field it does not
 * - from the map, the keyboard alone opens world 0, starts it and plays it
 * - each world opens, starts, takes its controls, ends, and gives back what
 *   it drew when the player returns to the map; the last one ends on the credits,
 *   and its retrofit button takes a click
 * - finishing a world opens the next one, and the browser remembers it
 * - a deployment action declared in the wrong place in world 3 comes back as
 *   a failing gate in world 6
 * - every lab a world card links to exists, in English and in French
 * - every string a world quotes from a lab (its QUOTES) is still in that lab,
 *   in English and in French: a reworded lab fails here, naming the line
 * - on a phone, five taps on the footer guinea pig open it, the pads show,
 *   a swipe and a pad move the guinea pig, the page never scrolls sideways
 * - Esc closes it and gives the page its scroll back; a page change under it
 *   removes it
 *
 * Three.js comes from jsDelivr, so this needs the network, like the site does.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { serveSite, SITE } from "../lib/site-server.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");
const GAME = path.join(ROOT, "site-theme", "javascripts", "guinea-run");
// The software renderer of CI builds every shader on the CPU: a world with
// its 3D models takes half a minute to open there, a second on a real GPU
const OPEN_TIMEOUT = 90000;
const KONAMI_ARROWS = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
const KONAMI_WASD = ["w", "w", "s", "s", "a", "d", "a", "d", "b", "a"];
const PROGRESS_KEY = "guinea-run-progress-v1";

const problems = [];

function expect(condition, message) {
  if (!condition) {
    problems.push(message);
  }
  console.log(`${condition ? "ok  " : "FAIL"} ${message}`);
}

/* ---------- Without a browser: the quotes and the lab links ---------- */

function labFile(locale, id) {
  const [major, minor] = id.split(".");
  const localeDir = path.join(ROOT, "labs", locale);
  const level = fs.readdirSync(localeDir).find((name) => name.startsWith(`level-${major}-`));
  if (!level) {
    return null;
  }
  const file = fs.readdirSync(path.join(localeDir, level)).find((name) => name.startsWith(`${major}-${minor}-`) && name.endsWith(".md"));
  return file ? path.join(localeDir, level, file) : null;
}

const { WORLDS } = await import(pathToFileURL(path.join(GAME, "core", "story.js")).href);
for (const world of WORLDS) {
  const module = await import(pathToFileURL(path.join(GAME, "worlds", world.module)).href);
  expect(typeof module.createWorld === "function", `world ${world.id} (${world.module}) exports createWorld`);
  expect(Boolean(module.TEXTS && module.TEXTS.en && module.TEXTS.en.intro && module.TEXTS.en.note), `world ${world.id} has an intro and a note in English`);
  const missingFr = Object.keys(module.TEXTS.en).filter((key) => !(module.TEXTS.fr && key in module.TEXTS.fr));
  expect(missingFr.length === 0, `world ${world.id} has every key in French${missingFr.length ? ": missing " + missingFr.join(", ") : ""}`);
  for (const quote of module.QUOTES || []) {
    // A sentence the French lab translates is checked in English only
    for (const locale of quote.locales || ["en", "fr"]) {
      const file = labFile(locale, quote.lab);
      const found = file && fs.readFileSync(file, "utf8").includes(quote.text);
      if (!found) {
        expect(false, `world ${world.id} quotes "${quote.text}" from Lab ${quote.lab}, and labs/${locale} no longer says it`);
      }
    }
  }
}
console.log("ok   every quote of the worlds is still in its lab, in English and in French (or listed above)");

const labsModule = path.join(SITE, "theme", "javascripts", "guinea-run", "labs.js");
expect(fs.existsSync(labsModule), "the build wrote the lab links of the game");
if (fs.existsSync(labsModule)) {
  const { LABS } = await import(pathToFileURL(labsModule).href);
  for (const locale of ["en", "fr"]) {
    const dead = [];
    for (const world of WORLDS) {
      for (const id of world.labs) {
        const lab = LABS[locale] && LABS[locale][id];
        if (!lab || !fs.existsSync(path.join(SITE, lab.url, "index.html"))) {
          dead.push(`world ${world.id} -> Lab ${id}`);
        }
      }
    }
    expect(dead.length === 0, `every lab a world card links to exists in ${locale}${dead.length ? ": " + dead.join(", ") : ""}`);
  }
}

/* ---------- In a browser ---------- */

let chromium;
try {
  ({ chromium } = await import("playwright-core"));
} catch {
  console.error(["playwright-core is needed to open the pages. Install it first:", "  npm install --no-save playwright-core", "  npx playwright-core install chrome"].join("\n"));
  process.exit(1);
}

const site = await serveSite();
// A browser of this script's own, never the user's
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });

async function newPage(options) {
  const context = await browser.newContext(options);
  // Google Analytics is answered locally: a CI run is not a reader, and its
  // events would land in the course numbers. What is checked is what the page
  // pushes into dataLayer, which is all gtag.js ever reads.
  await context.route(/google-analytics\.com|googletagmanager\.com/, (route) => route.abort());
  const page = await context.newPage();
  page.on("pageerror", (error) => problems.push(`page error on ${page.url()}: ${error.message}`));
  if (process.env.EGG_DEBUG) {
    page.on("console", (m) => console.log("console:", m.text()));
  }
  return page;
}

const state = (page) => page.evaluate(() => document.querySelector(".guinea-run")?.getAttribute("data-state") || null);
const data = (page, name) => page.evaluate((n) => document.querySelector(".guinea-run")?.getAttribute("data-" + n) || null, name);
// One frame of the software renderer can take longer than a fixed wait: poll
// for what should happen, and give up after a few seconds
async function settles(page, read, wanted, ms = 5000) {
  const end = Date.now() + ms;
  let value = await read();
  while (value !== wanted && Date.now() < end) {
    await page.waitForTimeout(150);
    value = await read();
  }
  return value === wanted;
}
const waitState = (page, values) =>
  page
    .waitForFunction((list) => list.includes(document.querySelector(".guinea-run")?.getAttribute("data-state")), [].concat(values), { timeout: OPEN_TIMEOUT })
    .then(
      () => true,
      () => false
    );

async function typeKeys(page, keys, gap) {
  for (const key of keys) {
    await page.keyboard.press(key);
    if (gap) {
      await page.waitForTimeout(gap);
    }
  }
}

async function openWorld(page, locale, world, extra) {
  await page.goto(`${site.base}${locale}/?guinea-unlock=all&guinea-world=${world}&guinea-seed=3${extra || ""}`, { waitUntil: "load" });
  await typeKeys(page, KONAMI_ARROWS);
  return waitState(page, "intro");
}

// What each world must react to, and how the check sees it
const WORLD_PROBES = {
  0: { keys: ["ArrowLeft"], attr: "lane", expect: "0" },
  1: { keys: ["ArrowRight", "ArrowRight", "ArrowRight"], attr: "x", changes: true },
  2: { keys: ["ArrowLeft"], attr: "lane", expect: "0" },
  3: { keys: ["Enter"], attr: "phase", changes: true },
  4: { keys: ["ArrowLeft"], attr: "lane", expect: "0" },
  5: { keys: [], attr: "round", expect: "1" },
  6: { keys: ["ArrowUp"], attr: "jumps", changes: true },
  7: { keys: ["ArrowLeft"], attr: "lane", expect: "0" },
  8: { keys: ["ArrowUp"], attr: "jumps", changes: true },
  // World 9 opens on its whack-a-mole: the left arrow takes the guinea pig from the middle hole to the one on its left
  9: { keys: ["ArrowLeft"], attr: "hole", expect: "3" }
};

try {
  // 1. English page, the arrows, the map, and world 0 with the keyboard alone
  {
    const page = await newPage({ viewport: { width: 1280, height: 860 } });
    await page.goto(`${site.base}en/`, { waitUntil: "load" });
    await typeKeys(page, KONAMI_ARROWS);
    expect(await waitState(page, "map"), "the Konami code with arrows opens the map on an English page");
    const title = await page.textContent(".guinea-run .gr-panel");
    expect(/The pipeline of US-014/.test(title || ""), "the game speaks English on an English page");
    expect((await page.locator(".guinea-run .gr-card").count()) === WORLDS.length, `the map shows the ${WORLDS.length} worlds`);
    expect((await page.locator(".guinea-run .gr-card.is-locked").count()) === WORLDS.length - 1, "a new player has only world 0 open");
    expect(
      await page.evaluate(() => (window.dataLayer || []).some((entry) => entry[0] === "event" && entry[1] === "easter_egg_found")),
      "finding the egg is sent to Google Analytics"
    );
    await page.keyboard.press("Enter");
    expect(await waitState(page, "intro"), "Enter on the map opens world 0");
    await page.keyboard.press("Enter");
    expect(await waitState(page, "playing"), "Enter on the world card starts it");
    await page.keyboard.press("ArrowLeft");
    expect(await settles(page, () => data(page, "lane"), "0"), "the left arrow moves the guinea pig to the left lane");
    await page.keyboard.press("d");
    expect(await settles(page, () => data(page, "lane"), "1"), "D moves it back to the middle lane");
    await page.keyboard.press("p");
    expect((await state(page)) === "paused", "P pauses the world");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    expect((await state(page)) === null, "Esc closes the game");
    expect(await page.evaluate(() => !document.documentElement.classList.contains("guinea-run-open")), "the page scrolls again once the game is closed");

    // A page change under an open game removes it
    await typeKeys(page, KONAMI_ARROWS);
    expect(await waitState(page, "map"), "the game opens a second time on the same page");
    await page.evaluate(() => {
      document.querySelector(".md-nav--primary a.md-nav__link[href*='level-1']").click();
    });
    await page.waitForFunction(() => /level-1/.test(window.location.pathname), null, { timeout: 10000 });
    expect(await settles(page, () => state(page), null), "an instant navigation closes the game");
    await page.context().close();
  }

  // 2. French page, WASD, and nothing from a text field
  {
    const page = await newPage({ viewport: { width: 1280, height: 860 } });
    await page.goto(`${site.base}fr/`, { waitUntil: "load" });
    await page.evaluate(() => {
      const field = document.createElement("input");
      field.id = "egg-check-field";
      document.querySelector(".md-content").prepend(field);
      field.focus();
    });
    await typeKeys(page, KONAMI_ARROWS);
    await page.waitForTimeout(800);
    expect((await state(page)) === null, "the code typed in a text field does not open the game");
    await page.evaluate(() => document.getElementById("egg-check-field").remove());
    await typeKeys(page, KONAMI_WASD);
    expect(await waitState(page, "map"), "the Konami code on WASD opens the map on a French page");
    const title = await page.textContent(".guinea-run .gr-panel");
    expect(/Le pipeline de US-014/.test(title || ""), "the game speaks French on a French page");
    const link = await page.evaluate(() => {
      document.querySelector('.guinea-run [data-action="play"]').click();
      return null;
    });
    void link;
    expect(await waitState(page, "intro"), "a world card opens on the French page");
    const href = await page.getAttribute(".guinea-run .gr-labs a", "href");
    expect(Boolean(href && href.includes("/fr/level-1-contributor-basics/1-1-")), "the lab link of a French world card goes to the French lab");
    await page.context().close();
  }

  // 3. Every world: opens, starts, reacts, ends, and gives back what it drew
  for (const world of WORLDS) {
    const page = await newPage({ viewport: { width: 1280, height: 860 } });
    const opened = await openWorld(page, "en", world.id);
    expect(opened, `world ${world.id} opens its card`);
    if (!opened) {
      await page.context().close();
      continue;
    }
    await page.click('.guinea-run [data-action="start"]');
    expect(await waitState(page, "playing"), `world ${world.id} starts`);
    const probe = WORLD_PROBES[world.id];
    const before = await data(page, probe.attr);
    await page.waitForTimeout(600);
    await typeKeys(page, probe.keys, 250);
    await page.waitForTimeout(700);
    const after = await data(page, probe.attr);
    const reacted = probe.changes ? after !== null && after !== before : after === probe.expect;
    expect(reacted, `world ${world.id} reacts to its controls (data-${probe.attr}: ${before} -> ${after})`);
    await page.waitForTimeout(1500);
    const playing = await state(page);
    expect(playing === "playing" || playing === "failed", `world ${world.id} keeps running for a few seconds (state ${playing})`);
    if (world.module === "world-9-monitoring.js") {
      // An admin who gets away brings up the retrofit button, and a click takes it
      const waiting = () => data(page, "retrofit").then((n) => Number(n || 0));
      const shown = await settles(page, async () => (await waiting()) > 0, true, 15000);
      expect(shown, "world 9 brings up the retrofit button when an admin gets away");
      if (shown) {
        const queued = await waiting();
        await page.click(".guinea-run .gr-w9-retro");
        expect(await settles(page, async () => (await waiting()) < queued, true, 5000), "world 9 takes the retrofit on a click");
      }
    }
    await page.evaluate(() => window.__guineaRun.finish());
    // The last world ends on the credits, the others on their result
    const last = world.id === WORLDS.length - 1;
    const endState = last ? "credits" : "done";
    const end = world.badge ? ["celebrating", endState] : [endState];
    expect(await waitState(page, end), `world ${world.id} ends on ${last ? "the credits" : "its result"}${world.badge ? ", with its badge" : ""}`);
    if (world.badge) {
      await page.keyboard.press("Enter");
      expect(await waitState(page, endState), `world ${world.id} goes from its badge to ${last ? "the credits" : "its result"}`);
    }
    if (!last) {
      expect((await page.locator('.guinea-run [data-action="next"]').count()) === 1, `world ${world.id} offers the next world`);
    }
    const geometriesInWorld = await page.evaluate(() => window.__guineaRun.geometries());
    await page.click('.guinea-run [data-action="map"]');
    expect(await waitState(page, "map"), `world ${world.id} goes back to the map`);
    await page.waitForTimeout(400);
    const geometriesOnMap = await page.evaluate(() => window.__guineaRun.geometries());
    expect(geometriesOnMap < geometriesInWorld || geometriesInWorld < 60, `world ${world.id} frees its geometries (${geometriesInWorld} in the world, ${geometriesOnMap} on the map)`);
    expect(await page.evaluate(() => !document.getElementById("guinea-run-world-css")), `world ${world.id} takes its styles away with it`);
    await page.context().close();
  }

  // 4. Progress: finishing a world opens the next, and the browser remembers
  {
    const page = await newPage({ viewport: { width: 1280, height: 860 } });
    await page.goto(`${site.base}en/?guinea-test=1`, { waitUntil: "load" });
    await page.evaluate((key) => window.localStorage.removeItem(key), PROGRESS_KEY);
    await typeKeys(page, KONAMI_ARROWS);
    await waitState(page, "map");
    await page.click('.guinea-run [data-action="play"][data-world="0"]');
    await waitState(page, "intro");
    await page.click('.guinea-run [data-action="start"]');
    await waitState(page, "playing");
    await page.evaluate(() => window.__guineaRun.finish());
    await waitState(page, "done");
    await page.click('.guinea-run [data-action="map"]');
    await waitState(page, "map");
    expect((await page.locator('.guinea-run [data-action="play"][data-world="1"]').count()) === 1, "finishing world 0 opens world 1");
    await page.reload({ waitUntil: "load" });
    await typeKeys(page, KONAMI_ARROWS);
    await waitState(page, "map");
    expect((await page.locator('.guinea-run [data-action="play"][data-world="1"]').count()) === 1, "the browser remembers world 1 is open");
    expect((await page.textContent('.guinea-run .gr-card[data-world="0"] .gr-stars')).includes("★"), "the map shows the stars of world 0");
    await page.evaluate((key) => window.localStorage.removeItem(key), PROGRESS_KEY);
    await page.context().close();
  }

  // 5. The plan of world 3 reaches world 6
  {
    const page = await newPage({ viewport: { width: 1280, height: 860 } });
    await page.goto(`${site.base}en/`, { waitUntil: "load" });
    await page.evaluate((key) => {
      const plan = { pre: ["deliverability", "backfill"], post: ["refdata", "schedule"] };
      window.localStorage.setItem(key, JSON.stringify({ v: 1, unlocked: 8, worlds: {}, badges: [], notes: {}, plan, finished: false }));
    }, PROGRESS_KEY);
    await openWorld(page, "en", 6);
    expect((await data(page, "misplaced")) === "1", "an action declared before the deployment in world 3 fails in world 6");
    await page.evaluate((key) => window.localStorage.removeItem(key), PROGRESS_KEY);
    await page.context().close();
  }

  // 6. A phone: the footer guinea pig, the pads, swipes
  {
    const page = await newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
    await page.goto(`${site.base}fr/`, { waitUntil: "load" });
    const egg = page.locator("[data-guinea-egg]");
    await page.waitForLoadState("networkidle").catch(() => {});
    // Scroll until the footer stops moving: the site scrolls smoothly, and late
    // content above it can still push it down
    let spot = null;
    for (let tries = 0; tries < 20; tries++) {
      const next = await egg.evaluate((node) => {
        // The comment frame never settles on a local copy: it resizes as it
        // retries, and the footer moves with it. It is not what this checks.
        document.querySelectorAll(".giscus, .giscus-frame").forEach((frame) => frame.remove());
        node.scrollIntoView({ block: "center", behavior: "instant" });
        const r = node.getBoundingClientRect();
        return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
      });
      if (spot && Math.abs(next.y - spot.y) < 1) {
        break;
      }
      spot = next;
      await page.waitForTimeout(300);
    }
    // Then tap fast, as a reader does: the five taps must fit in three seconds
    for (let i = 0; i < 5; i++) {
      await page.touchscreen.tap(spot.x, spot.y);
    }
    expect(await waitState(page, "map"), "five taps on the footer guinea pig open the map on a phone");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), "the map fits the width of a phone");
    await page.tap('.guinea-run [data-action="play"][data-world="0"]');
    expect(await waitState(page, "intro"), "tapping Play opens the world card on a phone");
    expect(await page.isChecked(".guinea-run .gr-toggle input"), "the pads are offered by default on a touch screen");
    await page.tap('.guinea-run [data-action="start"]');
    expect(await waitState(page, "playing"), "tapping Start starts the world");
    expect(await page.isVisible(".guinea-run .gr-controls"), "the pads are shown during the world");
    const box = await page.locator(".guinea-run .gr-canvas").boundingBox();
    const y = box.y + box.height * 0.45;
    await page.mouse.move(box.x + box.width * 0.3, y);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.7, y, { steps: 4 });
    await page.mouse.up();
    expect(await settles(page, () => data(page, "lane"), "2"), "a swipe to the right moves the guinea pig to the right lane");
    await page.tap('.guinea-run .gr-controls [data-pad="left"]');
    expect(await settles(page, () => data(page, "lane"), "1"), "the left pad moves it back to the middle lane");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), "the page does not scroll sideways on a phone");
    await page.tap('.guinea-run [data-action="quit"]');
    await page.waitForTimeout(300);
    expect((await state(page)) === null, "the close button closes the game on a phone");
    await page.context().close();
  }
} finally {
  await browser.close();
  await site.close();
}

if (problems.length) {
  console.error(`\n${problems.length} problem(s):`);
  for (const problem of problems) {
    console.error(`- ${problem}`);
  }
  process.exit(1);
}
console.log("\nGuinea Run opens, plays, ends and keeps its word to the labs.");
