import { describe, it, expect } from "vitest";
import {
  bosses,
  enemyStats,
  bossPhase,
  entryProtected,
  nextLevel,
  DESTRUCTION_DURATION,
} from "../src/balance";
describe("campaign challenge", () => {
  it("gives every mission a stronger boss and a larger reward", () => {
    expect(bosses).toHaveLength(5);
    for (let i = 1; i < bosses.length; i++) {
      expect(bosses[i].hp).toBeGreaterThan(bosses[i - 1].hp);
      expect(bosses[i].reward).toBeGreaterThan(bosses[i - 1].reward);
    }
    expect(DESTRUCTION_DURATION).toBeGreaterThanOrEqual(5);
  });
  it("increases enemy durability, shield, projectile speed and firing rate between levels", () => {
    for (let l = 2; l <= 5; l++) {
      const old = enemyStats(l - 1, 10, 1),
        next = enemyStats(l, 10, 1);
      expect(next.hp).toBeGreaterThan(old.hp);
      expect(next.shield).toBeGreaterThan(old.shield);
      expect(next.shotSpeed).toBeGreaterThan(old.shotSpeed);
      expect(next.fireInterval).toBeLessThan(old.fireInterval);
    }
  });
  it("makes elites more durable and armored than regular ships", () => {
    const regular = enemyStats(3, 8, 1),
      elite = enemyStats(3, 8, 1, true);
    expect(elite.hp).toBeGreaterThan(regular.hp);
    expect(elite.shield).toBeGreaterThan(regular.shield);
    expect(elite.armor).toBeGreaterThan(regular.armor);
  });
  it("protects ships until they enter the battle area", () => {
    expect(entryProtected(-40, 4)).toBe(true);
    expect(entryProtected(139, 4)).toBe(true);
    expect(entryProtected(180, 0.9)).toBe(true);
    expect(entryProtected(180, 1.2)).toBe(false);
  });
  it("has three boss phases and ends campaign without nonexistent level six", () => {
    expect(bossPhase(1000, 1000)).toBe(1);
    expect(bossPhase(600, 1000)).toBe(2);
    expect(bossPhase(300, 1000)).toBe(3);
    expect(nextLevel(1, 5)).toBe(2);
    expect(nextLevel(5, 5)).toBeNull();
  });
});
