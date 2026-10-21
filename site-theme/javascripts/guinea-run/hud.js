/*
 * What Guinea Run shows over the 3D view, in plain HTML so it stays sharp at
 * any resolution, styled after the Lightning Design System:
 * - the map of the worlds, with their stars, best scores and lab links
 * - the card of a world before it starts, and its result after
 * - the top bar (world, score, attempts, badges), sound, pause and close
 * - toasts, the chat of the cast, Victor's notes, the log ticker
 * - the pads at the bottom of the screen
 * - the level-complete animation with the Cloudity logo and the badge
 *
 * A world draws its own HTML in `layer`, between the 3D view and this HUD.
 * Buttons carry data-action, which input.js turns into actions; pads carry
 * data-pad and react on pointerdown.
 */
import { WORLDS } from "./core/story.js";

/**
 * The guinea pig of the cards: a picture of the 3D model
 * (scripts/blender/guinea-pig.py with GUINEA_PORTRAIT=1), set by guinea-run.css.
 */
const GUINEA_ART = '<span class="gr-pig" aria-hidden="true"></span>';

export const BADGE_NAMES = {
  1: "sfdx-hardis Contributor Basics",
  2: "sfdx-hardis Contributor Advanced",
  3: "sfdx-hardis Release Manager"
};

const CAST = {
  // face: a cartoon portrait in theme/images, set by guinea-run.css
  mariia: { name: "Mariia Pyvovarchuk", initials: "MP", color: "#9050E9", face: true },
  romain: { name: "Romain Panda", initials: "RP", color: "#06A59A" },
  victor: { name: "Victor Squeeker", initials: "VS", color: "#DD7A01" },
  you: { name: "You", initials: "US", color: "#0176D3" }
};

const CELEBRATION_MS = 3800;
const FLY_MS = 650;

function element(tag, className, parent, text) {
  const node = document.createElement(tag);
  if (className) {
    node.className = className;
  }
  if (text !== undefined && text !== null) {
    node.textContent = text;
  }
  if (parent) {
    parent.appendChild(node);
  }
  return node;
}

function button(parent, action, label, className, content) {
  const node = element("button", "gr-button " + (className || ""), parent, content === undefined ? label : content);
  node.type = "button";
  node.setAttribute("data-action", action);
  node.setAttribute("aria-label", label);
  return node;
}

function image(parent, className, src, alt) {
  const node = element("img", className, parent);
  node.src = src;
  node.alt = alt || "";
  node.decoding = "async";
  node.draggable = false;
  return node;
}

function starsText(n) {
  return "★".repeat(n) + "☆".repeat(Math.max(0, 3 - n));
}

/**
 * options: logoUrl, badgeUrl(level), labs (the lab links of the page
 * language: { "1.4": { url, title } }).
 */
export function createHud(t, options) {
  const overlay = element("div", "guinea-run");
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", t("title"));
  overlay.setAttribute("data-state", "loading");
  overlay.tabIndex = -1;

  const canvas = element("canvas", "gr-canvas", overlay);
  canvas.setAttribute("aria-hidden", "true");
  const layer = element("div", "gr-layer", overlay);

  // The top bar
  const top = element("div", "gr-top", overlay);
  const path = element("ol", "gr-path", top);
  path.hidden = true;
  const bar = element("div", "gr-bar", top);
  const worldPill = element("div", "gr-pill gr-world", bar);
  const score = element("div", "gr-pill", bar);
  const attempts = element("div", "gr-pill gr-attempts", bar);
  attempts.setAttribute("aria-label", t("attempts"));
  const shelf = element("div", "gr-pill gr-shelf", bar);
  shelf.setAttribute("aria-label", t("badgesEarned"));
  const slots = [1, 2, 3].map((level) => {
    const slot = element("span", "gr-slot", shelf);
    slot.setAttribute("data-level", String(level));
    image(slot, "", options.badgeUrl(level), BADGE_NAMES[level]);
    return slot;
  });
  const extra = element("div", "gr-extra", top);
  // Where the top bar ends, for the messages that sit under it on a phone
  if (window.ResizeObserver) {
    const watch = new ResizeObserver(() => {
      const box = top.getBoundingClientRect();
      const frame = overlay.getBoundingClientRect();
      overlay.style.setProperty("--gr-top-end", Math.round(box.bottom - frame.top) + "px");
    });
    watch.observe(top);
  }
  // What to do right now, in one line that stays
  const goal = element("div", "gr-goal", top);
  goal.hidden = true;
  const goalText = element("span", "", goal);

  const corner = element("div", "gr-corner", overlay);
  const muteButton = button(corner, "mute", t("mute"), "gr-icon gr-mute", "♪");
  button(corner, "pause", t("btnPause"), "gr-icon gr-pause", "II");
  button(corner, "quit", t("close"), "gr-icon", "✕");

  // A big instruction in the middle, for the moments that matter
  const coach = element("div", "gr-coach", overlay);
  coach.setAttribute("aria-live", "assertive");
  let coachTimer = 0;
  let pendingCoach = null;
  let coaching = false;
  let goalValue = "";
  const narrow = window.matchMedia ? window.matchMedia("(max-width: 600px)") : { matches: false };
  // Why a move was wrong, and what to do instead, right after a mistake
  const tipBar = element("div", "gr-tipbar", overlay);
  tipBar.setAttribute("aria-live", "polite");
  const tipTitle = element("strong", "", tipBar);
  const tipText = element("span", "", tipBar);
  let tipTimer = 0;
  const toast = element("div", "gr-toast", overlay);
  toast.setAttribute("aria-live", "polite");
  let toastTimer = 0;
  const chat = element("div", "gr-chat", overlay);
  chat.setAttribute("aria-live", "polite");
  const ticker = element("div", "gr-ticker", overlay);
  ticker.setAttribute("aria-hidden", "true");

  const panel = element("div", "gr-panel", overlay);
  panel.hidden = true;

  const controls = element("div", "gr-controls", overlay);
  const pads = {};
  for (const [pad, label, glyph] of [
    ["left", "btnLeft", "◀"],
    ["duck", "btnDuck", "▼"],
    ["confirm", "btnOk", "OK"],
    ["jump", "btnJump", "▲"],
    ["right", "btnRight", "▶"]
  ]) {
    const node = element("button", "gr-button gr-pad", controls, glyph);
    node.type = "button";
    node.setAttribute("data-pad", pad);
    node.setAttribute("aria-label", t(label));
    pads[pad] = node;
  }

  const touch = Boolean(window.matchMedia && window.matchMedia("(pointer: coarse)").matches);
  const reduced = Boolean(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  let showButtons = touch;
  overlay.classList.toggle("gr-show-buttons", showButtons);
  let celebration = null;
  let lastUpdate = "";

  // The pads of the world on screen: the keys list names only those
  let worldPads = null;
  function keysHelp(parent) {
    const list = element("ul", "gr-keys", parent);
    const uses = { keysMove: ["left", "right"], keysJump: ["jump"], keysDuck: ["duck"], keysConfirm: ["confirm"] };
    const all = touch ? ["keysTouch", "keysMove", "keysJump", "keysConfirm"] : ["keysMove", "keysJump", "keysDuck", "keysConfirm", "keysOther"];
    const lines = all.filter((key) => !worldPads || !uses[key] || uses[key].some((pad) => worldPads.includes(pad)));
    for (const key of lines) {
      element("li", "", list, t(key));
    }
    const label = element("label", "gr-toggle", parent);
    const box = element("input", "", label);
    box.type = "checkbox";
    box.checked = showButtons;
    box.addEventListener("change", () => {
      showButtons = box.checked;
      overlay.classList.toggle("gr-show-buttons", showButtons);
    });
    element("span", "", label, t("showButtons"));
  }

  /** A Lightning modal: a header, a body, and the buttons in the footer. */
  function screen(state, title, build, wide) {
    overlay.setAttribute("data-state", state);
    panel.replaceChildren();
    panel.hidden = false;
    panel.classList.toggle("gr-wide", Boolean(wide));
    const header = element("div", "gr-modal-header", panel);
    element("h2", "", header, title);
    const body = element("div", "gr-modal-body", panel);
    const footer = element("div", "gr-modal-footer", panel);
    build(body, footer, header);
    const primary = panel.querySelector(".gr-primary");
    if (primary) {
      primary.focus({ preventScroll: true });
    }
  }

  function labLinks(parent, labs) {
    const list = element("ul", "gr-labs", parent);
    for (const id of labs) {
      const lab = options.labs[id];
      const item = element("li", "", list);
      if (lab) {
        const link = element("a", "", item, "Lab " + id + " · " + lab.title);
        link.href = lab.url;
        link.target = "_blank";
        link.rel = "noopener";
      } else {
        item.textContent = "Lab " + id;
      }
    }
    return list;
  }

  function badgesRow(parent, earned) {
    const row = element("div", "gr-badges", parent);
    for (const level of [1, 2, 3]) {
      const cell = element("figure", "gr-badge" + (earned.includes(level) ? " is-earned" : ""), row);
      image(cell, "", options.badgeUrl(level), BADGE_NAMES[level]);
      element("figcaption", "", cell, BADGE_NAMES[level].replace("sfdx-hardis ", ""));
    }
  }

  function finishCelebration() {
    if (!celebration || celebration.leaving) {
      return;
    }
    celebration.leaving = true;
    window.clearTimeout(celebration.timer);
    const { node, badge, level, done } = celebration;
    const slot = slots[level - 1];
    const from = badge.getBoundingClientRect();
    const to = slot.getBoundingClientRect();
    const land = () => {
      slot.classList.add("is-earned");
      node.remove();
      celebration = null;
      done();
    };
    if (reduced || !from.width || !to.width) {
      land();
      return;
    }
    // The badge flies to its place on the shelf
    const flyer = badge.cloneNode(true);
    flyer.className = "gr-flyer";
    Object.assign(flyer.style, { left: from.left + "px", top: from.top + "px", width: from.width + "px", height: from.height + "px" });
    overlay.appendChild(flyer);
    node.classList.add("is-leaving");
    badge.style.visibility = "hidden";
    requestAnimationFrame(() => {
      const scale = to.width / from.width;
      flyer.style.transform =
        "translate(" + (to.left + to.width / 2 - (from.left + from.width / 2)) + "px," + (to.top + to.height / 2 - (from.top + from.height / 2)) + "px) scale(" + scale + ")";
    });
    window.setTimeout(() => {
      flyer.remove();
      land();
    }, FLY_MS);
  }

  const hud = {
    overlay,
    canvas,
    layer,
    touch,
    reduced,

    loading() {
      screen("loading", t("title"), (body) => {
        element("p", "gr-muted", body, t("loading"));
      });
    },

    message(text, retry) {
      screen("error", t("title"), (body, footer) => {
        element("p", "", body, text);
        button(footer, "quit", t("close"), retry ? "" : "gr-primary");
        if (retry) {
          button(footer, "retry-load", t("retry"), "gr-primary");
        }
      });
    },

    /** The map of the worlds. progress: the progress store. */
    map(progress, onReset) {
      screen(
        "map",
        t("mapTitle"),
        (body, footer) => {
          // A world added after a player finished the game is not done yet
          const allDone = progress.finished && progress.world(WORLDS[WORLDS.length - 1].id).stars > 0;
          element("p", "gr-muted gr-map-hint", body, allDone ? t("allDone") : t("mapHint"));
          const grid = element("ol", "gr-map", body);
          let focus = null;
          for (const world of WORLDS) {
            const record = progress.world(world.id);
            const open = world.id <= progress.unlocked;
            const card = element("li", "gr-card" + (open ? "" : " is-locked") + (record.stars > 0 ? " is-done" : ""), grid);
            card.setAttribute("data-world", String(world.id));
            const head = element("div", "gr-card-head", card);
            element("span", "gr-card-number", head, String(world.id));
            const titles = element("div", "gr-card-titles", head);
            element("strong", "", titles, t("w" + world.id + "_name"));
            element("span", "gr-card-style", titles, t("style_" + world.style) + (world.badge ? " · " + BADGE_NAMES[world.badge].replace("sfdx-hardis ", "") : ""));
            element("p", "gr-card-pitch", card, t("w" + world.id + "_pitch"));
            const foot = element("div", "gr-card-foot", card);
            const stars = element("span", "gr-stars", foot, starsText(record.stars));
            stars.setAttribute("aria-label", t("starsLabel", { n: record.stars }));
            if (record.best > 0) {
              element("span", "gr-muted", foot, t("best") + ": " + record.best);
            }
            if (open) {
              const play = button(foot, "play", t("w" + world.id + "_name"), "gr-primary gr-small", record.stars > 0 ? t("replay") : t("play"));
              play.setAttribute("data-world", String(world.id));
              if (!focus && record.stars === 0) {
                focus = play;
              }
            } else {
              element("span", "gr-lock", foot, t("locked"));
            }
          }
          const meta = element("div", "gr-map-meta", body);
          badgesRow(meta, progress.badges);
          element("p", "gr-muted", meta, t("notesFound", { n: progress.notesFound(), total: WORLDS.length }));
          const reset = element("button", "gr-link", meta, t("resetProgress"));
          reset.type = "button";
          reset.addEventListener("click", () => {
            if (window.confirm(t("resetConfirm"))) {
              onReset();
            }
          });
          button(footer, "quit", t("close"));
          window.setTimeout(() => {
            const target = focus || panel.querySelector('[data-action="play"]') || footer.querySelector("button");
            if (target) {
              target.focus({ preventScroll: true });
            }
          }, 0);
        },
        true
      );
      for (const level of [1, 2, 3]) {
        slots[level - 1].classList.toggle("is-earned", progress.badges.includes(level));
      }
    },

    /** The card of a world, before it starts. */
    intro(world, record, story, how, pads) {
      worldPads = pads || null;
      screen("intro", t("world", { n: world.id }) + " · " + t("w" + world.id + "_name"), (body, footer) => {
        element("p", "", body, story || t("w" + world.id + "_pitch"));
        if (how && how.length) {
          element("p", "gr-small-title", body, t("howToPlay"));
          const steps = element("ol", "gr-how", body);
          how.forEach((step) => element("li", "", steps, step));
        }
        const rule = element("div", "gr-rule", body);
        element("strong", "", rule, t("theRule"));
        element("span", "", rule, t("w" + world.id + "_rule"));
        const stars = element("ul", "gr-star-goals", body);
        ["starFinish", "starClean", "starNote"].forEach((key, i) => {
          element("li", record.stars > i ? "is-earned" : "", stars, "★ " + t(key));
        });
        keysHelp(body);
        element("p", "gr-small-title", body, t("labs"));
        labLinks(body, world.labs);
        button(footer, "map", t("backToMap"));
        button(footer, "start", t("start"), "gr-primary");
      });
    },

    paused() {
      screen("paused", t("paused"), (body, footer) => {
        keysHelp(body);
        button(footer, "map", t("backToMap"));
        button(footer, "resume", t("resume"), "gr-primary");
      });
    },

    /** After a world: result = { ok, world, score, best, newBest, stars, tip, hasNext }. */
    result(result) {
      const world = result.world;
      screen(result.ok ? "done" : "failed", result.ok ? t("worldDone") : t("worldFailed"), (body, footer) => {
        element("div", "gr-logo" + (result.ok ? " gr-logo--happy" : " gr-logo--sad"), body).innerHTML = GUINEA_ART;
        if (result.ok) {
          element("p", "gr-result-stars", body, starsText(result.stars));
          element("p", "gr-score", body, t("score") + ": " + result.score);
          element("p", "gr-muted", body, result.newBest ? t("newBest") : t("best") + ": " + result.best);
          if (result.missed) {
            const missed = element("div", "gr-rule gr-rule--info", body);
            element("strong", "", missed, t("goodToKnow"));
            element("span", "", missed, result.missed);
          }
          const rule = element("div", "gr-rule", body);
          element("strong", "", rule, t("theRule"));
          element("span", "", rule, t("w" + world.id + "_rule"));
        } else if (result.tip) {
          const tip = element("div", "gr-rule gr-rule--tip", body);
          element("strong", "", tip, t("inRealLife"));
          element("span", "", tip, result.tip);
        }
        element("p", "gr-small-title", body, t("labs"));
        labLinks(body, world.labs);
        button(footer, "map", t("backToMap"));
        if (result.ok && result.hasNext) {
          button(footer, "next", t("nextWorld"), "gr-primary");
        } else {
          button(footer, "start", result.ok ? t("replay") : t("retry"), "gr-primary");
        }
      });
    },

    /** The end of the game, after the last world. */
    credits(earned, result) {
      screen("credits", t("creditsTitle"), (body, footer) => {
        element("div", "gr-logo gr-logo--happy", body).innerHTML = GUINEA_ART;
        // The result of the last world first, as any world shows it
        element("p", "gr-result-stars", body, starsText(result.stars));
        element("p", "gr-score", body, t("score") + ": " + result.score);
        element("p", "gr-muted", body, result.newBest ? t("newBest") : t("best") + ": " + result.best);
        if (result.missed) {
          const box = element("div", "gr-rule gr-rule--info", body);
          element("strong", "", box, t("goodToKnow"));
          element("span", "", box, result.missed);
        }
        const rule = element("div", "gr-rule", body);
        element("strong", "", rule, t("theRule"));
        element("span", "", rule, t("w" + result.world.id + "_rule"));
        element("p", "gr-small-title", body, t("labs"));
        labLinks(body, result.world.labs);
        element("p", "", body, t("creditsText"));
        badgesRow(body, earned);
        element("p", "gr-teaser", body, t("teaser"));
        button(footer, "start", t("replay"));
        button(footer, "map", t("backToMap"), "gr-primary");
      });
    },

    playing() {
      overlay.setAttribute("data-state", "playing");
      panel.hidden = true;
      panel.replaceChildren();
      overlay.focus({ preventScroll: true });
      if (pendingCoach) {
        const [text, ms] = pendingCoach;
        pendingCoach = null;
        hud.coach(text, ms);
      }
    },

    /** Which pads a world uses, e.g. ["left", "right", "jump", "duck"]. */
    setPads(list) {
      for (const [name, node] of Object.entries(pads)) {
        node.hidden = !list.includes(name);
      }
    },

    /** The branches of a runner, as a Path: steps and the current index. */
    setPath(steps, current) {
      path.replaceChildren();
      path.hidden = !steps || !steps.length;
      (steps || []).forEach((name, i) => {
        const step = element("li", i < current ? "is-done" : i === current ? "is-current" : "", path);
        element("span", "", step, name);
      });
    },

    /** Free HTML under the top bar, for a world's own meter or checklist. */
    get extra() {
      return extra;
    },

    update(state) {
      const key = [state.world, state.score, state.attempts, state.maxAttempts].join("|");
      if (key === lastUpdate) {
        return;
      }
      lastUpdate = key;
      worldPill.textContent = state.world;
      score.textContent = t("score") + ": " + state.score;
      attempts.textContent = "❤".repeat(Math.max(state.attempts, 0)) + "♡".repeat(Math.max((state.maxAttempts || 3) - state.attempts, 0));
    },

    setBadges(earned) {
      for (const level of [1, 2, 3]) {
        slots[level - 1].classList.toggle("is-earned", earned.includes(level));
      }
    },

    setMuted(muted) {
      muteButton.textContent = muted ? "✕" : "♪";
      muteButton.classList.toggle("is-muted", muted);
      muteButton.setAttribute("aria-label", muted ? t("unmute") : t("mute"));
      muteButton.title = muted ? t("unmute") : t("mute");
    },

    toast(text, tone) {
      toast.textContent = text;
      toast.className = "gr-toast gr-toast--show" + (tone ? " gr-toast--" + tone : "");
      window.clearTimeout(toastTimer);
      toastTimer = window.setTimeout(() => {
        toast.className = "gr-toast";
      }, 1800);
    },

    /** The goal line under the top bar; an empty text hides it. */
    goal(text) {
      goalValue = text || "";
      if (coaching) {
        return;
      }
      goalText.textContent = goalValue;
      goal.hidden = !text;
      if (text && !reduced) {
        goal.classList.remove("is-new");
        void goal.offsetWidth;
        goal.classList.add("is-new");
      }
    },

    /** Why that was wrong: a tip box for a few seconds, after a mistake. */
    tip(text, ms, heading) {
      window.clearTimeout(tipTimer);
      // On a phone the toast hides behind the tip: the tip says what went wrong
      tipTitle.textContent = narrow.matches && heading ? heading : t("tipTitle");
      tipText.textContent = text;
      tipBar.classList.add("is-shown");
      tipTimer = window.setTimeout(() => tipBar.classList.remove("is-shown"), ms || Math.min(11000, 4000 + text.length * 45));
    },

    /** A good move: the tip of the last mistake is no longer the point. */
    hideTip() {
      window.clearTimeout(tipTimer);
      tipBar.classList.remove("is-shown");
    },

    /** A big instruction in the middle of the screen, for a few seconds. */
    coach(text, ms) {
      // Said before the world starts: kept for the moment it does
      if (overlay.getAttribute("data-state") !== "playing") {
        pendingCoach = [text, ms];
        return;
      }
      window.clearTimeout(coachTimer);
      // A phone keeps the middle of the screen for what is coming: the coach
      // speaks in the goal line for a moment, then the goal comes back
      if (narrow.matches) {
        coaching = true;
        goal.hidden = false;
        goal.classList.add("is-coach");
        goalText.textContent = text;
        coachTimer = window.setTimeout(() => {
          coaching = false;
          goal.classList.remove("is-coach");
          goalText.textContent = goalValue;
          goal.hidden = !goalValue;
        }, ms || 2200);
        return;
      }
      coach.textContent = text;
      coach.classList.remove("is-shown");
      void coach.offsetWidth;
      coach.classList.add("is-shown");
      coachTimer = window.setTimeout(() => coach.classList.remove("is-shown"), ms || 2000);
    },

    /** A message from the cast, as a Lightning chat bubble. */
    chat(who, text, ms) {
      const person = CAST[who] || CAST.you;
      const bubble = element("div", "gr-bubble", chat);
      const avatar = element("span", "gr-avatar", bubble, person.face ? "" : person.initials);
      avatar.style.backgroundColor = person.color;
      if (person.face) {
        avatar.classList.add("gr-avatar--" + who);
      }
      const content = element("div", "", bubble);
      element("strong", "", content, person === CAST.you ? t("castYou") : person.name);
      element("span", "", content, text);
      while (chat.children.length > 2) {
        chat.firstChild.remove();
      }
      const life = ms || 4500;
      window.setTimeout(() => bubble.classList.add("is-leaving"), life - 400);
      window.setTimeout(() => bubble.remove(), life);
    },

    /** Victor's note, found: a sticky note that pops up for a moment. */
    note(text) {
      const card = element("div", "gr-note", overlay);
      element("strong", "", card, t("noteFoundTitle"));
      element("span", "", card, text);
      window.setTimeout(() => card.classList.add("is-leaving"), 3600);
      window.setTimeout(() => card.remove(), 4000);
    },

    /** One line of a deployment log, at the bottom left. */
    tick(line) {
      const row = element("div", "gr-tick", ticker, line);
      while (ticker.children.length > 4) {
        ticker.firstChild.remove();
      }
      // A log line fades after a while, so it never covers a world for good
      window.setTimeout(() => row.classList.add("is-leaving"), 7600);
      window.setTimeout(() => row.remove(), 8000);
    },

    clearTicker() {
      ticker.replaceChildren();
    },

    clearWorldUi() {
      layer.replaceChildren();
      extra.replaceChildren();
      ticker.replaceChildren();
      chat.replaceChildren();
      hud.goal("");
      coach.classList.remove("is-shown");
      pendingCoach = null;
      window.clearTimeout(coachTimer);
      coaching = false;
      goal.classList.remove("is-coach");
      goalText.textContent = "";
      goal.hidden = true;
      tipBar.classList.remove("is-shown");
      hud.setPath([], 0);
      lastUpdate = "";
    },

    /** A level is done: the Cloudity logo, then its badge spins in and flies to the shelf. */
    celebrate(level, done) {
      overlay.setAttribute("data-state", "celebrating");
      const node = element("div", "gr-celebrate", overlay);
      node.setAttribute("data-action", "skip");
      node.setAttribute("role", "status");
      if (!reduced) {
        const confetti = element("div", "gr-confetti", node);
        const colors = ["#0176D3", "#9050E9", "#2E844A", "#FE9339", "#FFB020", "#EA001E", "#06A59A"];
        for (let i = 0; i < 44; i++) {
          const piece = element("i", "", confetti);
          piece.style.left = Math.random() * 100 + "%";
          piece.style.background = colors[i % colors.length];
          piece.style.animationDelay = Math.random() * 0.8 + "s";
          piece.style.animationDuration = 1.8 + Math.random() * 1.4 + "s";
          piece.style.setProperty("--gr-drift", (Math.random() - 0.5) * 160 + "px");
          piece.style.setProperty("--gr-spin", Math.random() * 900 + "deg");
        }
      }
      const card = element("div", "gr-cel-card", node);
      const brand = element("div", "gr-cel-brand", card);
      image(brand, "gr-cel-logo", options.logoUrl, "Cloudity");
      element("p", "gr-cel-level", card, t("levelComplete", { level }));
      const holder = element("div", "gr-cel-badge", card);
      const badge = image(holder, "", options.badgeUrl(level), BADGE_NAMES[level]);
      element("span", "gr-shine", holder);
      element("p", "gr-cel-earned", card, t("badgeEarned"));
      element("p", "gr-cel-name", card, BADGE_NAMES[level]);
      element("p", "gr-cel-hint", card, touch ? t("tapToContinue") : t("pressToContinue"));
      celebration = { node, badge, level, done, leaving: false, timer: window.setTimeout(finishCelebration, CELEBRATION_MS) };
    },

    skipCelebration() {
      finishCelebration();
    },

    dispose() {
      window.clearTimeout(toastTimer);
      if (celebration) {
        window.clearTimeout(celebration.timer);
      }
      overlay.remove();
    }
  };
  return hud;
}
