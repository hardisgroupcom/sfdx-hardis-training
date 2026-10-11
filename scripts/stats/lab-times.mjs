/**
 * The time each page of the site announces: the time learners were observed to
 * take, wherever enough of them went through, and the estimate the lab was
 * written with everywhere else.
 *
 * The markdown under labs/ keeps the estimate, and nobody edits it to follow
 * the figures. scripts/build/site.mjs writes the observed time over it on the
 * way into the site, in every language, from stats/course-stats.json: the pages
 * follow the learners at every build, and a week with new figures needs no
 * commit to any lab.
 *
 * For one lab, in this order:
 *   1. its own median, from the learners whose receipts time each lab
 *   2. the median of its segment, when the segment is that lab alone
 *   3. its share of the median of a segment it is measured with, in proportion
 *      to the estimates of the labs of that segment
 *   4. its estimate
 * The first three need the minimum sample, which course-stats.mjs applies by
 * leaving a median out.
 *
 * An observed time is rounded down, never up: to five minutes for a lab and to
 * a quarter of an hour for a level. 38 minutes observed is announced as 35, and
 * a level observed at 2 h 22 as 2 h 15. A level is the sum of what its labs
 * were observed to take, before any rounding, so the rounding of each lab does
 * not add up in it. A level nobody was observed in keeps the sum of its
 * estimates, as it is written.
 *
 * Next to the time it announces, a page says what was observed: the fastest
 * learner, the slowest, the median and how many they were. Those are the
 * figures as they were measured, and for the labs they were measured on: a lab
 * timed together with its neighbours says so rather than inventing its share
 * of their extremes.
 */

const LAB_STEP = 5;
const LEVEL_STEP = 15;
const floor = (minutes, step) => Math.max(step, Math.floor(minutes / step) * step);

/** 25 as "25 min", 130 as "2 h 10": the way the labs write a duration. */
export function duration(minutes) {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const rest = minutes % 60;
  return `${Math.floor(minutes / 60)} h${rest ? ` ${String(rest).padStart(2, "0")}` : ""}`;
}

const hasMedian = (row) => typeof row.medianMinutes === "number";
/** What was observed on a row of the figures, for the labs it was measured on. */
const observationOf = (row, labs) => ({
  labs,
  fastest: typeof row.minMinutes === "number" ? row.minMinutes : null,
  slowest: typeof row.maxMinutes === "number" ? row.maxMinutes : null,
  median: row.medianMinutes,
  sample: row.sample
});

/**
 * The minutes to announce, per lab ("1.5") and per level (1), and what was
 * observed behind each of them, or null.
 *
 * estimates is the minutes each lab was written with, keyed like the labs, and
 * stats is stats/course-stats.json, or null before its first run.
 */
export function announcedTimes(stats, estimates) {
  const labs = {};
  const raw = {};
  const own = new Map(((stats && stats.labs) || []).filter(hasMedian).map((row) => [row.lab, row]));
  const segments = ((stats && stats.segments) || []).filter(hasMedian);
  for (const [lab, estimate] of Object.entries(estimates)) {
    const segment = segments.find((row) => row.labs.includes(lab));
    let observed = null;
    let observation = null;
    if (own.has(lab)) {
      observed = own.get(lab).medianMinutes;
      observation = observationOf(own.get(lab), [lab]);
    } else if (segment && segment.labs.length === 1) {
      observed = segment.medianMinutes;
      observation = observationOf(segment, segment.labs);
    } else if (segment && segment.labs.every((one) => typeof estimates[one] === "number")) {
      const whole = segment.labs.reduce((total, one) => total + estimates[one], 0);
      observed = whole > 0 ? (segment.medianMinutes * estimate) / whole : null;
      observation = observed === null ? null : observationOf(segment, segment.labs);
    }
    labs[lab] = { minutes: observed === null ? estimate : floor(observed, LAB_STEP), observed: observed !== null, observation };
    raw[lab] = observed === null ? estimate || 0 : observed;
  }
  const levels = {};
  const levelObservations = {};
  for (const level of new Set(Object.keys(labs).map((lab) => Number(lab.split(".")[0])))) {
    const mine = Object.keys(labs).filter((lab) => Number(lab.split(".")[0]) === level);
    const total = mine.reduce((sum, lab) => sum + raw[lab], 0);
    levels[level] = mine.some((lab) => labs[lab].observed) ? floor(total, LEVEL_STEP) : total;
    // The whole level, for the learners who went through all of its measured labs
    const row = ((stats && stats.levels) || []).find((one) => one.level === level && hasMedian(one));
    const measured = ((stats && stats.segments) || []).filter((one) => one.level === level).flatMap((one) => one.labs);
    levelObservations[level] = row && measured.length > 0 ? observationOf(row, measured) : null;
  }
  return { labs, levels, levelObservations };
}

/**
 * A page of the course, with the times it announces replaced.
 *
 * rel is the path of the page inside its locale, with forward slashes. The
 * patterns hold no word of any language: a time line is a bold label, a colon
 * and a duration, whatever the label says.
 *
 * describe turns what was observed into a sentence of the language of the
 * page, and is given the labs of the page so it can tell a lab timed alone
 * from one timed with its neighbours. Without it, only the times change.
 */
export function withAnnouncedTimes(content, rel, times, universe, describe = () => "") {
  const levelOf = (slug) => universe.levels.find((level) => level.slug === slug);
  const [folder, file] = rel.split("/");
  const said = (observation, own) => {
    const text = observation ? describe(observation, own) : "";
    return text ? ` ${text}` : "";
  };

  // The home page: one row per level, with the time of the level
  if (rel === "index.md") {
    return content
      .split("\n")
      .map((line) => {
        const level = universe.levels.find((one) => line.startsWith("|") && line.includes(`](${one.slug}/index.md)`));
        return level && times.levels[level.level]
          ? line.replace(/\| \d+ h(?: \d+)?( *\|)/, `| ${duration(times.levels[level.level])}$1`)
          : line;
      })
      .join("\n");
  }

  const level = file ? levelOf(folder) : null;
  if (!level) {
    return content;
  }

  // The page of a level: one row per lab, and the time of the whole level
  if (file === "index.md") {
    let out = content;
    for (const lab of level.labs) {
      const id = `${level.level}.${lab.lab}`;
      const row = new RegExp(`^(\\| \\[${id.replace(".", "\\.")}\\]\\(.*\\| )\\d+ min( *\\|)\\s*$`, "m");
      if (!row.test(out)) {
        throw new Error(`${rel}: no row announcing the time of Lab ${id}`);
      }
      out = out.replace(row, `$1${times.labs[id].minutes} min$2`);
    }
    const total = /^(\*\*[^*\n]+\*\* ?: [^\d\n]{0,12})\d+ h(?: \d+)?(.*)$/m;
    if (!total.test(out)) {
      throw new Error(`${rel}: no line announcing the time of the level`);
    }
    const all = level.labs.map((lab) => `${level.level}.${lab.lab}`);
    const observed = said((times.levelObservations || {})[level.level], all);
    return out.replace(total, (whole, before, after) => `${before}${duration(times.levels[level.level])}${after}${observed}`);
  }

  // A lab
  const lab = level.labs.find((one) => `${one.slug}.md` === file);
  if (!lab) {
    return content;
  }
  const line = /^(\*\*[^*\n]+\*\* ?: ~)\d+( min.*)$/m;
  if (!line.test(content)) {
    throw new Error(`${rel}: no line announcing the time of the lab`);
  }
  const id = `${level.level}.${lab.lab}`;
  return content.replace(line, (whole, before, after) => `${before}${times.labs[id].minutes}${after}${said(times.labs[id].observation, [id])}`);
}
