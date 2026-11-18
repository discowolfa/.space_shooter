import Phaser from "phaser";
import "./style.css";
import { registerSW } from "virtual:pwa-register";
import { Flight } from "./Flight";
import { load, store } from "./storage";
import {
  levels,
  purchase,
  cost,
  finish,
  validate,
  type Upgrade,
} from "./model";
import { strings } from "./i18n";
const save = await load();
let selected = save.checkpoint;
const scene = new Flight();
scene.save = save;
const $ = (s: string) => document.querySelector(s) as HTMLElement;
const t = () => strings[save.language];
type Page =
  | "home"
  | "pause"
  | "hangar"
  | "map"
  | "settings"
  | "scores"
  | "support"
  | "result";
let current: Page = "home";
let result = { win: false, score: 0 };
function notify(message: string) {
  $("#toast").textContent = message;
  $("#toast").hidden = false;
}
const persist = () => {
  void store(save).catch(() => notify(t().error));
};
scene.persist = persist;
const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  width: 480,
  height: 760,
  backgroundColor: "#050b18",
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [scene],
  input: { activePointers: 2 },
  audio: { noAudio: true },
});
// Refresh Safari's viewport outside layout observation.
let resizeTimer: ReturnType<typeof setTimeout>;
window.visualViewport?.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => game.scale?.refresh(), 100);
});
function button(
  label: string,
  action: () => void,
  disabled = false,
  primary = false,
) {
  const b = document.createElement("button");
  b.textContent = label;
  b.disabled = disabled;
  b.classList.toggle("primary", primary);
  b.onclick = action;
  return b;
}
function text(content: string) {
  const p = document.createElement("p");
  p.textContent = content;
  return p;
}
function resume() {
  if (!scene.active) return;
  scene.paused = false;
  scene.banner.setText("");
  document.body.classList.add("playing");
  $("#overlay").hidden = true;
  ($("#bomb") as HTMLButtonElement).disabled = false;
  $("#pause").focus();
}
function launch() {
  if (!scene.player) return;
  save.checkpoint = selected;
  persist();
  scene.start(selected);
  resume();
  void navigator.storage?.persist?.();
}
function show(page: Page) {
  current = page;
  if (scene.active) {
    scene.paused = true;
    scene.banner.setText("");
  }
  document.body.classList.remove("playing");
  $("#overlay").hidden = false;
  ($("#bomb") as HTMLButtonElement).disabled = true;
  $("#balance").textContent = `${save.crystals} ◇`;
  const p = $("#panel");
  p.replaceChildren();
  $("#menu-scroll").scrollTop = 0;
  const titles = {
    home: "FRONTIER",
    pause: t().pause,
    hangar: t().hangar,
    map: t().map,
    settings: t().settings,
    scores: t().scores,
    support: t().support,
    result: result.win ? t().win : t().lose,
  };
  const h = document.createElement("h2");
  h.id = "menu-title";
  h.textContent = titles[page];
  p.append(h);
  const back = $("#back");
  back.hidden = page === "home";
  back.textContent = scene.active ? t().pause : t().back;
  back.onclick = () => show(scene.active ? "pause" : "home");
  if (page === "home") {
    h.hidden = true;
    const hero = document.createElement("div");
    hero.className = "hero";
    hero.innerHTML =
      '<div><h1>FRONTIER</h1><small>THE OUTER RIM / 2186</small></div><img src="/assets/player.png" alt="AX-01 Scout" width="76" height="100">';
    p.append(hero);
    const info = text(
      `${t().mission} ${String(selected).padStart(2, "0")} · ${levels[selected - 1].name}`,
    );
    info.className = "mission-line";
    p.append(info, button(t().play, launch, false, true));
    const nav = document.createElement("nav");
    nav.className = "menu-grid";
    for (const key of [
      "map",
      "hangar",
      "scores",
      "settings",
      "support",
    ] as const)
      nav.append(button(t()[key], () => show(key)));
    p.append(nav);
  } else if (page === "pause") {
    p.append(
      text(`${t().mission} ${scene.level} · ${scene.score}`),
      button(t().resume, resume, false, true),
    );
    const nav = document.createElement("nav");
    nav.className = "menu-grid pause-grid";
    for (const key of ["hangar", "settings"] as const)
      nav.append(button(t()[key], () => show(key)));
    p.append(
      nav,
      button(t().back, () => {
        scene.active = false;
        show("home");
      }),
    );
    back.hidden = true;
  } else if (page === "hangar") {
    for (const key of ["weapon", "armor", "shield"] as Upgrade[])
      p.append(
        button(
          `${t()[key]} ${save.upgrades[key]}/3 · ${save.upgrades[key] === 3 ? "MAX" : cost(save.upgrades[key]) + " ◇"}`,
          () => {
            if (purchase(save, key)) {
              persist();
              show("hangar");
            }
          },
          save.upgrades[key] >= 3 || save.crystals < cost(save.upgrades[key]),
        ),
      );
  } else if (page === "map") {
    levels.forEach((l, i) =>
      p.append(
        button(
          `${String(i + 1).padStart(2, "0")} · ${l.name}${i + 1 > save.unlocked ? " / " + t().locked : ""}`,
          () => {
            selected = i + 1;
            show("home");
          },
          i + 1 > save.unlocked,
        ),
      ),
    );
  } else if (page === "settings") {
    p.append(
      text(t().saved),
      button(t().export, () => {
        const url = URL.createObjectURL(
          new Blob([JSON.stringify(save, null, 2)], {
            type: "application/json",
          }),
        );
        const a = document.createElement("a");
        a.href = url;
        a.download = "frontier-save.json";
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }),
    );
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.setAttribute("aria-label", t().import);
    input.onchange = async () => {
      try {
        const file = input.files?.[0];
        if (!file || file.size > 100000) throw Error();
        const next = validate(JSON.parse(await file.text()));
        if (!confirm(t().import + "?")) return;
        await store(next);
        scene.active = false;
        Object.assign(save, next);
        selected = save.checkpoint;
        render();
        show("settings");
      } catch {
        notify(t().error);
      }
    };
    p.append(text(t().import), input, text(t().install));
  } else if (page === "scores") {
    if (!save.scores.length) p.append(text("—"));
    save.scores.forEach((s, i) =>
      p.append(text(`${String(i + 1).padStart(2, "0")} · ${s}`)),
    );
  } else if (page === "support") p.append(text(t().disabled));
  else if (page === "result")
    p.append(
      text(`${result.score} · ${save.crystals} ◇`),
      button(
        t().back,
        () => {
          selected = save.checkpoint;
          show("home");
        },
        false,
        true,
      ),
    );
  requestAnimationFrame(() => {
    p.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus({
      preventScroll: true,
    });
  });
}
scene.done = (win, score) => {
  if (win) finish(save, scene.level, score);
  else save.scores = [...save.scores, score].sort((a, b) => b - a).slice(0, 10);
  persist();
  result = { win, score };
  show("result");
};
scene.onPause = () => {
  if (scene.paused) show("pause");
  else resume();
};
function render() {
  document.documentElement.lang = save.language;
  ($("#language") as HTMLSelectElement).value = save.language;
  $("#sound").textContent = save.sound ? "♪" : "×";
  $("#hint").textContent =
    window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 700
      ? t().touchHint
      : t().hint;
  $("#pause").setAttribute("aria-label", t().pause);
  $("#bomb").setAttribute("aria-label", "Nova");
  show(
    scene.active && document.body.classList.contains("playing")
      ? "pause"
      : current,
  );
}
$("#language").onchange = () => {
  save.language = ($("#language") as HTMLSelectElement)
    .value as typeof save.language;
  persist();
  render();
};
$("#sound").onclick = () => {
  save.sound = !save.sound;
  $("#sound").textContent = save.sound ? "♪" : "×";
  persist();
};
$("#pause").onclick = () => {
  if (scene.active) {
    if (document.body.classList.contains("playing")) show("pause");
    else resume();
  } else show("home");
};
$("#bomb").onclick = () => scene.nova();
document.addEventListener("visibilitychange", () => {
  if (document.hidden && scene.active) show("pause");
  persist();
});
window.addEventListener("pagehide", persist);
const updateSW = registerSW({
  onNeedRefresh() {
    if (!scene.active) void updateSW(true);
    else $("#update").hidden = false;
  },
});
$("#update").onclick = () => {
  if (scene.active) show("pause");
  void updateSW(true);
};
render();
