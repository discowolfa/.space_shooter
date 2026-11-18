import { describe, it, expect } from "vitest";
import {
  applyBoost,
  newBoosts,
  tickBoosts,
  weaponCount,
  readyToClear,
  supplyPickup,
  pickupTypes,
} from "../src/combat";
import { levels } from "../src/model";
describe("in-flight upgrades", () => {
  it("builds weapon power during a mission without exceeding five guns", () => {
    const b = newBoosts();
    for (let i = 0; i < 12; i++) applyBoost(b, "power");
    expect(weaponCount(1, b)).toBe(5);
    expect(weaponCount(3, b)).toBe(5);
    expect(newBoosts().power).toBe(0);
  });
  it("extends timed bonuses with caps and expires them independently", () => {
    const b = newBoosts();
    applyBoost(b, "rapid");
    applyBoost(b, "rapid");
    applyBoost(b, "drone");
    expect(b.rapid).toBe(30);
    expect(b.drone).toBe(25);
    tickBoosts(b, 26);
    expect(b.rapid).toBe(4);
    expect(b.drone).toBe(0);
    tickBoosts(b, 10);
    expect(b.rapid).toBe(0);
  });
  it("supplies every bonus before repeating its cycle", () => {
    expect(pickupTypes.map((_, i) => supplyPickup(i))).toEqual(pickupTypes);
    expect(supplyPickup(8)).toBe("power");
  });
});
describe("mission completion", () => {
  it("cannot complete before the duration, even with every wave destroyed", () => {
    for (const l of levels) {
      expect(l.duration).toBeGreaterThanOrEqual(120);
      expect(readyToClear(l, l.duration - 1, l.waves, 0)).toBe(false);
      expect(readyToClear(l, l.duration, l.waves, 0)).toBe(true);
    }
  });
  it("requires all waves and remaining enemies to be cleared", () => {
    const l = levels[0];
    expect(readyToClear(l, 999, l.waves - 1, 0)).toBe(false);
    expect(readyToClear(l, 999, l.waves, 1)).toBe(false);
  });
  it("spaces waves throughout the whole mission", () => {
    for (const l of levels) {
      expect((l.waves - 1) * l.interval).toBeGreaterThan(l.duration - 12);
      expect((l.waves - 1) * l.interval).toBeLessThan(l.duration);
    }
  });
});
