export const pickupTypes = [
  "power",
  "rapid",
  "missiles",
  "shield",
  "repair",
  "nova",
  "drone",
  "magnet",
] as const;
export type PickupType = (typeof pickupTypes)[number];
export const pickupStyle: Record<
  PickupType,
  { symbol: string; color: number }
> = {
  power: { symbol: "P", color: 0xffcb68 },
  rapid: { symbol: "R", color: 0xff8ee5 },
  missiles: { symbol: "M", color: 0xffa36d },
  shield: { symbol: "S", color: 0x72caff },
  repair: { symbol: "+", color: 0x83f0a4 },
  nova: { symbol: "N", color: 0xe4c0ff },
  drone: { symbol: "D", color: 0x9ce9f0 },
  magnet: { symbol: "G", color: 0xffee9a },
};
export interface CombatBoosts {
  power: number;
  rapid: number;
  missiles: number;
  drone: number;
  magnet: number;
}
export const newBoosts = (): CombatBoosts => ({
  power: 0,
  rapid: 0,
  missiles: 0,
  drone: 0,
  magnet: 0,
});
export function tickBoosts(b: CombatBoosts, dt: number) {
  for (const key of ["rapid", "missiles", "drone", "magnet"] as const)
    b[key] = Math.max(0, b[key] - dt);
}
export function weaponCount(base: number, b: CombatBoosts) {
  return Math.min(5, base + b.power);
}
export function applyBoost(b: CombatBoosts, type: PickupType) {
  if (type === "power") b.power = Math.min(4, b.power + 1);
  if (type === "rapid") b.rapid = Math.min(30, b.rapid + 18);
  if (type === "missiles") b.missiles = Math.min(40, b.missiles + 22);
  if (type === "drone") b.drone = Math.min(40, b.drone + 25);
  if (type === "magnet") b.magnet = Math.min(35, b.magnet + 20);
}
export interface MissionTiming {
  waves: number;
  interval: number;
  duration: number;
}
export function readyToClear(
  t: MissionTiming,
  elapsed: number,
  wave: number,
  remaining: number,
) {
  return elapsed >= t.duration && wave >= t.waves && remaining === 0;
}
// Enemy drops are weighted; supply crates cycle through every type without repeats.
const loot: PickupType[] = [
  "power",
  "power",
  "rapid",
  "missiles",
  "shield",
  "repair",
  "repair",
  "nova",
  "drone",
  "magnet",
];
export function rollPickup(random = Math.random): PickupType {
  return loot[
    Math.min(loot.length - 1, Math.max(0, Math.floor(random() * loot.length)))
  ];
}
export function supplyPickup(index: number): PickupType {
  return pickupTypes[index % pickupTypes.length];
}
