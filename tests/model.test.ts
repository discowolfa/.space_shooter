import { describe, it, expect, vi } from "vitest";
import { fresh, validate, purchase, finish } from "../src/model";
vi.stubGlobal("navigator", { language: "en" });
describe("progress", () => {
  it("validates exported saves and rejects unsafe data", () => {
    const s = fresh();
    expect(validate(s)).toEqual(s);
    for (const change of [
      { crystals: -1 },
      { version: 2 },
      { checkpoint: 6 },
      { scores: [NaN] },
      { upgrades: { weapon: 9, armor: 1, shield: 1 } },
    ])
      expect(() => validate({ ...s, ...change })).toThrow();
  });
  it("charges upgrades once and refuses insufficient funds or maximum level", () => {
    const s = fresh();
    expect(purchase(s, "weapon")).toBe(false);
    s.crystals = 400;
    expect(purchase(s, "weapon")).toBe(true);
    expect(s.crystals).toBe(300);
    expect(purchase(s, "weapon")).toBe(true);
    expect(s.crystals).toBe(100);
    expect(purchase(s, "weapon")).toBe(false);
  });
  it("unlocks sequential sectors and caps the campaign and leaderboard", () => {
    const s = fresh();
    finish(s, 1, 400);
    expect(s.unlocked).toBe(2);
    for (let i = 0; i < 20; i++) finish(s, 5, i);
    expect(s.unlocked).toBe(5);
    expect(s.checkpoint).toBe(5);
    expect(s.scores).toHaveLength(10);
    expect(s.scores[0]).toBe(400);
  });
});
