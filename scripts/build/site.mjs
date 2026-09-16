#!/usr/bin/env node
/**
 * Assembles the site sources under site-src/, which is what Zensical builds.
 *
 * The source of truth stays plain markdown in labs/<locale>/. This only copies
 * it into the layout the site wants, so a locale is a folder and adding one is
 * additive:
 *
 *   labs/en/index.md               -> site-src/index.md
 *   labs/en/level-1/lab-00.md      -> site-src/en/level-1/lab-00.md
 *   labs/_assets/**                -> site-src/_assets/**
 *   site-theme/**                  -> site-src/theme/**
 *   BACKLOG.md                     -> site-src/BACKLOG.md
 *   badges/<handle>.md             -> site-src/badges/<handle>.md
 *
 *   node scripts/build/site.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");
const OUT = path.join(ROOT, "site-src");

const universe = JSON.parse(fs.readFileSync(path.join(ROOT, "training-universe.json"), "utf8"));

function copyTree(from, to, filter) {
  if (!fs.existsSync(from)) {
    return 0;
  }
  let count = 0;
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const source = path.join(from, entry.name);
    const target = path.join(to, entry.name);
    if (entry.isDirectory()) {
      count += copyTree(source, target, filter);
    } else if (!filter || filter(entry.name)) {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(source, target);
      count++;
    }
  }
  return count;
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

// The locale trees. index.md of a locale becomes the home page for "en", and
// stays at /<locale>/ for the others.
const localesDir = path.join(ROOT, "labs");
const locales = fs
  .readdirSync(localesDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && /^[a-z]{2}(-[A-Z]{2})?$/.test(entry.name))
  .map((entry) => entry.name);

let pages = 0;
for (const locale of locales) {
  pages += copyTree(path.join(localesDir, locale), path.join(OUT, locale), (name) => name.endsWith(".md"));
}

// The English home page is also the site home page. It moves up one level, so
// its relative links move with it: "level-1/index.md" becomes "en/level-1/...".
const enHome = path.join(OUT, "en", "index.md");
if (fs.existsSync(enHome)) {
  const home = fs
    .readFileSync(enHome, "utf8")
    .replace(/\]\((?!https?:|#|\/)/g, "](en/");
  fs.writeFileSync(path.join(OUT, "index.md"), home, "utf8");
}

const assets = copyTree(path.join(localesDir, "_assets"), path.join(OUT, "_assets"));

// The theme's own files: the stylesheet and its self-hosted fonts, the logo and
// the favicon, the table sorting script. mkdocs.yml points at them under theme/,
// which is where they land in the built site.
const themeFiles = copyTree(path.join(ROOT, "site-theme"), path.join(OUT, "theme"));

// Everything else the site publishes
for (const file of ["BACKLOG.md", "MY-PIPELINE.template.md", "TRANSLATION.md"]) {
  const source = path.join(ROOT, file);
  if (fs.existsSync(source)) {
    fs.copyFileSync(source, path.join(OUT, file));
  }
}
const linkMap = path.join(ROOT, "labs", "link-map.en.md");
if (fs.existsSync(linkMap)) {
  fs.mkdirSync(path.join(OUT, "labs"), { recursive: true });
  fs.copyFileSync(linkMap, path.join(OUT, "labs", "link-map.en.md"));
}

// Badge pages, plus an index of them
const badgesDir = path.join(ROOT, "badges");
const badgePages = copyTree(badgesDir, path.join(OUT, "badges"), (name) => name.endsWith(".md") && !name.startsWith("_"));
copyTree(path.join(badgesDir, "img"), path.join(OUT, "badges", "img"), (name) => name.endsWith(".svg"));

const handles = fs.existsSync(badgesDir)
  ? fs
    .readdirSync(badgesDir)
    .filter((name) => name.endsWith(".json"))
    .map((name) => name.replace(/\.json$/, ""))
    .sort()
  : [];

const badgeIndex = [
  "# Badges",
  "",
  "Everybody who finished a level of this course and claimed it.",
  "",
  "It is a badge, not a certification: there is no exam here. What it says is that a job read the",
  "person's public repository and found the work.",
  "",
  handles.length === 0
    ? "Nobody has claimed a badge yet. Be the first."
    : handles.map((handle) => `- [${handle}](${handle}.md)`).join("\n"),
  "",
  "## Claim yours",
  "",
  `[Open a claim issue](https://github.com/${universe.course.upstreamRepo}/issues/new/choose) with your`,
  "level, your Trailblazer username, the URL of your public fork and the receipt lines printed by",
  "**Training > Check my work**.",
  ""
].join("\n");
fs.mkdirSync(path.join(OUT, "badges"), { recursive: true });
fs.writeFileSync(path.join(OUT, "badges", "index.md"), badgeIndex, "utf8");

console.log(`site-src assembled: ${pages} lab page(s), ${assets} asset(s), ${themeFiles} theme file(s), ${badgePages} badge page(s), ${locales.length} locale(s)`);
