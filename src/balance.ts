export const bosses = [
  { name: "SENTINEL", hp: 3200, reward: 120, color: 0xffbd70 },
  { name: "REVENANT", hp: 4800, reward: 190, color: 0xff849b },
  { name: "WARDEN", hp: 7000, reward: 280, color: 0x8eeaff },
  { name: "LEVIATHAN", hp: 9600, reward: 390, color: 0xc69aff },
  { name: "OBLIVION", hp: 12800, reward: 550, color: 0xff655f },
];
export function enemyStats(
  level: number,
  wave: number,
  kind: number,
  elite = false,
) {
  const hp = Math.round(
    (48 + kind * 29 + wave * 1.9) *
      (1 + (level - 1) * 0.48) *
      (elite ? 1.65 : 1),
  );
  const shield =
    level >= 2
      ? Math.round((12 + level * 8 + kind * 6) * (elite ? 1.6 : 1))
      : 0;
  return {
    hp,
    shield,
    armor: elite ? 0.25 : kind === 2 ? 0.16 : 0,
    speed: 64 + level * 8 + Math.min(wave, 24) * 1.4,
    shotSpeed: 120 + level * 15,
    fireInterval: Math.max(1.05, 2.7 - level * 0.2 - wave * 0.018),
  };
}
export function bossPhase(hp: number, maxHp: number) {
  return hp > maxHp * 0.66 ? 1 : hp > maxHp * 0.33 ? 2 : 3;
}
export function entryProtected(y: number, age: number) {
  return y < 140 || age < 1.1;
}
export const DESTRUCTION_DURATION = 5.2;
export function nextLevel(completed: number, count: number) {
  return completed < count ? completed + 1 : null;
}
