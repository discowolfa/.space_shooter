export const levels = [
  {
    name: "The quiet belt",
    waves: 16,
    interval: 7.5,
    duration: 120,
    color: 0x264873,
  },
  {
    name: "Crimson passage",
    waves: 18,
    interval: 7.5,
    duration: 135,
    color: 0x623354,
  },
  {
    name: "Ghost signal",
    waves: 20,
    interval: 7.5,
    duration: 150,
    color: 0x235858,
  },
  {
    name: "Event horizon",
    waves: 22,
    interval: 7.5,
    duration: 165,
    color: 0x493770,
  },
  {
    name: "The destroyer",
    waves: 22,
    interval: 7.5,
    duration: 165,
    color: 0x733a40,
  },
];
export type Upgrade = "weapon" | "armor" | "shield";
export interface Save {
  version: 1;
  id: string;
  crystals: number;
  unlocked: number;
  upgrades: Record<Upgrade, number>;
  scores: number[];
  checkpoint: number;
  language: "en" | "es" | "ru";
  sound: boolean;
}
export const fresh = (): Save => ({
  version: 1,
  id: crypto.randomUUID(),
  crystals: 0,
  unlocked: 1,
  upgrades: { weapon: 1, armor: 1, shield: 1 },
  scores: [],
  checkpoint: 1,
  language: navigator.language.startsWith("ru")
    ? "ru"
    : navigator.language.startsWith("es")
      ? "es"
      : "en",
  sound: true,
});
export function validate(value: unknown): Save {
  const s = value as Save;
  if (
    !s ||
    s.version !== 1 ||
    typeof s.id !== "string" ||
    s.id.length > 100 ||
    !Number.isSafeInteger(s.crystals) ||
    s.crystals < 0 ||
    s.crystals > 1e9 ||
    !Number.isInteger(s.unlocked) ||
    s.unlocked < 1 ||
    s.unlocked > 5 ||
    !Number.isInteger(s.checkpoint) ||
    s.checkpoint < 1 ||
    s.checkpoint > s.unlocked ||
    !["en", "es", "ru"].includes(s.language) ||
    typeof s.sound !== "boolean" ||
    !Array.isArray(s.scores) ||
    s.scores.length > 10 ||
    s.scores.some((n) => !Number.isSafeInteger(n) || n < 0) ||
    !s.upgrades ||
    Object.values(s.upgrades).length !== 3 ||
    (["weapon", "armor", "shield"] as const).some(
      (k) =>
        !Number.isInteger(s.upgrades[k]) ||
        s.upgrades[k] < 1 ||
        s.upgrades[k] > 3,
    )
  )
    throw Error("Invalid save");
  return structuredClone(s);
}
export const cost = (level: number) => level * 100;
export function purchase(s: Save, k: Upgrade): boolean {
  if (s.upgrades[k] >= 3 || s.crystals < cost(s.upgrades[k])) return false;
  s.crystals -= cost(s.upgrades[k]);
  s.upgrades[k]++;
  return true;
}
export function finish(s: Save, level: number, score: number) {
  s.unlocked = Math.max(s.unlocked, Math.min(5, level + 1));
  s.checkpoint = Math.min(5, level + 1);
  s.scores = [...s.scores, score].sort((a, b) => b - a).slice(0, 10);
}
