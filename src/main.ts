import Phaser from "phaser";
import "./style.css";
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
const persist = () => {
  void store(save).catch(() => {
    $("#panel").textContent = t().error;
  });
};
scene.persist = persist;
new Phaser.Game({
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
function button(label: string, action: () => void, disabled = false) {
  const b = document.createElement("button");
  b.textContent = label;
  b.disabled = disabled;
  b.onclick = action;
  return b;
}
function panel(title: string) {
  $("#panel").replaceChildren();
  const h = document.createElement("h2");
  h.textContent = title;
  $("#panel").append(h);
  return $("#panel");
}
function menu() {
  const p = panel(
    `${t().mission} ${String(selected).padStart(2, "0")} / ${levels[selected - 1].name}`,
  );
  const subtitle = document.createElement("p");
  subtitle.textContent = `AX-01 SCOUT · ${save.crystals} ◇`;
  p.append(
    subtitle,
    button(t().play, () => {
      if (!scene.player) return;
      save.checkpoint = selected;
      persist();
      scene.start(selected);
      p.replaceChildren(
        button(t().pause, () => scene.toggle()),
        button(t().back, () => {
          scene.active = false;
          menu();
        }),
      );
      void navigator.storage?.persist?.();
    }),
  );
}
function hangar() {
  const p = panel(t().hangar);
  const balance = document.createElement("p");
  balance.textContent = `${save.crystals} ◇`;
  p.append(balance);
  for (const key of ["weapon", "armor", "shield"] as Upgrade[])
    p.append(
      button(
        `${t()[key]} ${save.upgrades[key]}/3 · ${save.upgrades[key] === 3 ? "MAX" : cost(save.upgrades[key]) + " ◇"}`,
        () => {
          if (purchase(save, key)) {
            persist();
            hangar();
          }
        },
        save.upgrades[key] >= 3 || save.crystals < cost(save.upgrades[key]),
      ),
    );
}
function map() {
  const p = panel(t().map);
  levels.forEach((l, i) =>
    p.append(
      button(
        `${String(i + 1).padStart(2, "0")} · ${l.name}${i + 1 > save.unlocked ? " / " + t().locked : ""}`,
        () => {
          selected = i + 1;
          menu();
        },
        i + 1 > save.unlocked,
      ),
    ),
  );
}
function settings() {
  const p = panel(t().settings);
  const info = document.createElement("p");
  info.textContent = t().saved + " " + t().install;
  p.append(
    info,
    button(t().export, () => {
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(save, null, 2)], { type: "application/json" }),
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
      scene.active = false;
      await store(next);
      Object.assign(save, next);
      selected = save.checkpoint;
      render();
    } catch {
      info.textContent = t().error;
    }
  };
  p.append(input);
}
scene.done = (win, score) => {
  if (win) finish(save, scene.level, score);
  else save.scores = [...save.scores, score].sort((a, b) => b - a).slice(0, 10);
  persist();
  const p = panel(win ? t().win : t().lose);
  const info = document.createElement("p");
  info.textContent = `${score} POINTS · ${save.crystals} ◇`;
  p.append(
    info,
    button(t().back, () => {
      selected = save.checkpoint;
      menu();
    }),
  );
};
function render() {
  $("#intro").textContent = t().intro;
  $("#hint").textContent = t().hint;
  document.documentElement.lang = save.language;
  ($("#language") as HTMLSelectElement).value = save.language;
  $("#nav").replaceChildren();
  for (const [label, action] of [
    [t().map, map],
    [t().hangar, hangar],
    [
      t().scores,
      () => {
        const p = panel(t().scores);
        save.scores.forEach((s, i) => {
          const row = document.createElement("p");
          row.textContent = `${i + 1}.  ${s}`;
          p.append(row);
        });
      },
    ],
    [t().settings, settings],
    [
      t().support,
      () => {
        const p = panel(t().support);
        const text = document.createElement("p");
        text.textContent = t().disabled;
        p.append(text);
      },
    ],
  ] as [string, () => void][])
    $("#nav").append(
      button(label, () => {
        if (scene.active) {
          scene.paused = true;
          scene.banner.setText("Ⅱ");
        }
        action();
      }),
    );
  menu();
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
$("#pause").onclick = () => scene.toggle();
$("#bomb").onclick = () => scene.nova();
document.addEventListener("visibilitychange", () => {
  if (document.hidden && scene.active) {
    scene.paused = true;
    scene.banner.setText("Ⅱ");
  }
  persist();
});
window.addEventListener("pagehide", persist);
render();
