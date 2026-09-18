#!/usr/bin/env node
/**
 * Assembles the site sources under site-src/, which is what Zensical builds.
 *
 * The source of truth stays plain markdown in labs/<locale>/. This only copies
 * it into the layout the site wants, so a locale is a folder and adding one is
 * additive:
 *
 *   labs/en/index.md               -> site-src/index.md
 *   labs/en/level-1-contributor-basics/1-1-*.md  -> site-src/en/level-1-contributor-basics/1-1-*.md
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

function copyTree(from, to, filter, transform) {
  if (!fs.existsSync(from)) {
    return 0;
  }
  let count = 0;
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const source = path.join(from, entry.name);
    const target = path.join(to, entry.name);
    if (entry.isDirectory()) {
      count += copyTree(source, target, filter, transform);
    } else if (!filter || filter(entry.name)) {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      if (transform && entry.name.endsWith(".md")) {
        fs.writeFileSync(target, transform(fs.readFileSync(source, "utf8"), source, target), "utf8");
      } else {
        fs.copyFileSync(source, target);
      }
      count++;
    }
  }
  return count;
}

/**
 * Rewrites the links that reach out of labs/.
 *
 * A lab linking to a file at the root of the repository needs one more "../"
 * there than it does here: labs/en/level-1-contributor-basics/1-3-*.md has labs/ above it and the
 * site page does not. The link resolves on GitHub and 404s on the site, and
 * check-links.mjs cannot see it because it resolves against the repository.
 * Links that stay inside labs/ keep their depth and are left alone.
 */
function rewriteEscapingLinks(content, source, target) {
  return content.replace(/\]\((\.\.\/[^)\s]+)\)/g, (whole, link) => {
    const [rel, fragment] = link.split("#");
    const resolved = path.resolve(path.dirname(source), rel);
    if (resolved.startsWith(path.join(ROOT, "labs") + path.sep)) {
      return whole;
    }
    const fromRoot = path.relative(ROOT, resolved);
    if (fromRoot.startsWith("..")) {
      return whole;
    }
    const fixed = path
      .relative(path.dirname(target), path.join(OUT, fromRoot))
      .split(path.sep)
      .join("/");
    return `](${fixed}${fragment ? "#" + fragment : ""})`;
  });
}

/**
 * Folds the "If it goes wrong" section of a lab into a collapsed block.
 *
 * It is the one section of a lab that is not meant to be read in order. It
 * lists the two or three ways the step before it fails, and a reader whose
 * step worked has to scroll past all of it to reach the next thing to do.
 * Collapsed, it stays one click away for the reader who needs it, and out of
 * the way of the one who does not.
 *
 * The markdown keeps an ordinary heading, so the labs stay readable on GitHub
 * and an author has nothing to indent by hand. The section runs from its
 * heading to the next heading of the same level, or to the end of the page.
 */
function foldTroubleshooting(content) {
  return content.replace(/^## If it goes wrong\r?\n([\s\S]*?)(?=^## |$(?![\s\S]))/m, (whole, body) => {
    const indented = body
      .replace(/\s+$/, "")
      .split(/\r?\n/)
      .map((line) => (line.trim() === "" ? "" : "    " + line))
      .join("\n");
    return '??? troubleshoot "If it goes wrong"\n\n' + indented + "\n\n";
  });
}

function prepareLab(content, source, target) {
  return foldTroubleshooting(rewriteEscapingLinks(content, source, target));
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
  pages += copyTree(
    path.join(localesDir, locale),
    path.join(OUT, locale),
    (name) => name.endsWith(".md"),
    prepareLab
  );
}

// The English home page is also the site home page. It moves up one level, so
// its relative links move with it: "level-1-contributor-basics/index.md" becomes "en/level-1-contributor-basics/...".
const enHome = path.join(OUT, "en", "index.md");
if (fs.existsSync(enHome)) {
  const home = fs
    .readFileSync(enHome, "utf8")
    .replace(/\]\((?!https?:|#|\/)/g, "](en/");
  fs.writeFileSync(path.join(OUT, "index.md"), home, "utf8");
}

const assets = copyTree(path.join(localesDir, "_assets"), path.join(OUT, "_assets"));

// The theme's own files: the stylesheet and its self-hosted fonts, the logo and
// the favicon, the table sorting script. course-site.yml points at them under theme/,
// which is where they land in the built site.
const themeFiles = copyTree(path.join(ROOT, "site-theme"), path.join(OUT, "theme"));

// Everything else the site publishes. These files are read on GitHub too, where
// front matter renders as a table, so their search title and description are
// added here, on the way into the site, rather than in the files themselves.
const PAGE_META = {
  "BACKLOG.md": {
    title: "Helios Energy backlog: the User Stories of the course",
    description: "Every User Story of the Salesforce DevOps training with sfdx-hardis, with its acceptance criteria, its Git branch and the lab that delivers it."
  },
  "MY-PIPELINE.template.md": {
    title: "My pipeline notebook: template",
    description: "The notebook a learner fills in during the Salesforce DevOps training: the orgs of the pipeline, and one line per lab on what was decided and why."
  },
  "TRANSLATION.md": {
    title: "Translating the Salesforce DevOps training",
    description: "How to translate the labs of the free Salesforce DevOps training with sfdx-hardis, and how translations are kept in step with the English source."
  }
};
const frontMatter = (meta) =>
  meta ? `---\ntitle: ${JSON.stringify(meta.title)}\ndescription: ${JSON.stringify(meta.description)}\n---\n\n` : "";
for (const file of ["BACKLOG.md", "MY-PIPELINE.template.md", "TRANSLATION.md"]) {
  const source = path.join(ROOT, file);
  if (fs.existsSync(source)) {
    fs.writeFileSync(path.join(OUT, file), frontMatter(PAGE_META[file]) + fs.readFileSync(source, "utf8"), "utf8");
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
  frontMatter({
    title: "Salesforce DevOps training badges",
    description: "The learners who finished a level of the free Salesforce DevOps training with sfdx-hardis, checked by a job that read their public repository."
  }) + "# Badges",
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
  "In VS Code: Welcome page > **Training: Level N** > **Claim my badge**. It checks the whole level",
  "on your machine first, then opens the claim form with everything already filled in, and you tick",
  "the three boxes and submit.",
  "",
  "Each level also asks you to star the open source project it teaches, which the command offers to",
  "do and the audit checks.",
  "",
  `You can also [open a claim issue](https://github.com/${universe.course.upstreamRepo}/issues/new/choose) by hand,`,
  "with your level, your Trailblazer username, the URL of your public fork and the receipt lines",
  "printed by **Check my work**.",
  ""
].join("\n");
fs.mkdirSync(path.join(OUT, "badges"), { recursive: true });
fs.writeFileSync(path.join(OUT, "badges", "index.md"), badgeIndex, "utf8");

console.log(`site-src assembled: ${pages} lab page(s), ${assets} asset(s), ${themeFiles} theme file(s), ${badgePages} badge page(s), ${locales.length} locale(s)`);
