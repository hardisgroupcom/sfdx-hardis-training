/**
 * The badge picture: badges/_template.svg filled in for one learner and one level.
 * Used by render.mjs when a claim passes, and by examples.mjs for the home page.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE = path.resolve(HERE, "..", "..", "badges", "_template.svg");

/**
 * One entry per level, and the colours the template paints it with.
 *
 * The ramp deepens as the level rises, in the course's own colours: Cloudity
 * blue, then Cloudity purple, then the midnight the site's dark scheme uses,
 * rimmed and chipped in gold. `hue` stays the level's one representative colour,
 * for anything that needs a single value.
 *
 *   top, deep   the colour field, top to bottom
 *   lite        the second cloud of the Cloudity mark on that field
 *   rim         the edge, which has to read on a white page and on #0A0620
 *   pill, ink   the LEVEL chip, inverted at level 3 so gold carries the top rank
 */
export const LEVELS = {
  1: {
    name: "sfdx-hardis Contributor Basics",
    blurb: "Delivers a User Story through a Pull Request, end to end.",
    hue: "#0053FF",
    top: "#2E7BFF",
    deep: "#0032A8",
    lite: "#9DC0FF",
    rim: "#0053FF",
    pill: "#FFFFFF",
    ink: "#0053FF"
  },
  2: {
    name: "sfdx-hardis Contributor Advanced",
    blurb: "Solves deployment errors, declares deployment actions, resolves conflicts.",
    hue: "#660FF2",
    top: "#8A3DFF",
    deep: "#3D078F",
    lite: "#CDB0FF",
    rim: "#660FF2",
    pill: "#FFFFFF",
    ink: "#660FF2"
  },
  3: {
    name: "sfdx-hardis Release Manager",
    blurb: "Owns the pipeline, the releases, the hotfixes and the monitoring.",
    hue: "#1B0A3F",
    top: "#2C1263",
    deep: "#0A0620",
    lite: "#FFC96B",
    rim: "#FFB020",
    pill: "#FFB020",
    ink: "#1B0A3F"
  }
};

export function escapeXml(value) {
  return String(value).replace(/[<>&"']/g, (ch) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[ch]);
}

// Long names get a smaller font rather than running off the face of the badge
function fitSize(text, max, width) {
  return Math.max(10, Math.min(max, Math.floor(width / (String(text).length * 0.56))));
}

/**
 * fullName is the GitHub display name, handle the GitHub login, trailblazer the
 * Trailblazer username or nothing.
 */
export function renderSvg({ level, handle, fullName, trailblazer, date }) {
  const def = LEVELS[level];
  const shortName = def.name.replace(/^sfdx-hardis /, "");
  const name = String(fullName || "").trim() || handle;
  return fs
    .readFileSync(TEMPLATE, "utf8")
    .replace(/\{\{HUE_TOP\}\}/g, def.top)
    .replace(/\{\{HUE_DEEP\}\}/g, def.deep)
    .replace(/\{\{HUE_LITE\}\}/g, def.lite)
    .replace(/\{\{HUE_RIM\}\}/g, def.rim)
    .replace(/\{\{PILL_FILL\}\}/g, def.pill)
    .replace(/\{\{PILL_INK\}\}/g, def.ink)
    .replace(/\{\{HUE\}\}/g, def.hue)
    .replace(/\{\{LEVEL\}\}/g, String(level))
    .replace(/\{\{NAME\}\}/g, escapeXml(def.name))
    .replace(/\{\{SHORT_NAME\}\}/g, escapeXml(shortName))
    .replace(/\{\{NAME_SIZE\}\}/g, String(fitSize(shortName, 19, 232)))
    // Functions, not strings, for what a learner typed: a string replacement expands
    // $& and $' patterns, and a name holding one would rewrite the badge
    .replace(/\{\{FULLNAME\}\}/g, () => escapeXml(name))
    .replace(/\{\{FULLNAME_SIZE\}\}/g, String(fitSize(name, 19, 208)))
    .replace(/\{\{HANDLE\}\}/g, () => escapeXml(handle))
    .replace(/\{\{TRAILBLAZER_LINE\}\}/g, () => (trailblazer ? `Trailblazer ${escapeXml(trailblazer)}` : ""))
    .replace(/\{\{DATE\}\}/g, date);
}
