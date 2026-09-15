/**
 * Training > Check my work.
 *
 * Asks which level and which lab, then runs the same rules the badge claim runs.
 */
import { select, universe, title, info, c } from "../lib/util.mjs";
import runCheck from "../verify/check.mjs";

export default async function check(args) {
  title("Check my work");

  const levels = universe().levels;
  const level = Number(
    await select(
      "Which level are you on?",
      levels.map((l) => ({ value: String(l.level), label: `Level ${l.level} - ${l.name}` })),
      args.level
    )
  );

  const levelDef = levels.find((l) => l.level === level);
  const labChoices = [
    { value: "all", label: `Everything in level ${level}  ${c.dim("(what the badge claim checks)")}` },
    ...levelDef.labs.map((l) => ({ value: String(l.lab), label: `Lab ${l.lab} - ${l.title}` }))
  ];
  const lab = await select("Which lab?", labChoices, args.lab);

  info("");
  await runCheck({ level: String(level), lab: lab === "all" ? undefined : lab });
}
