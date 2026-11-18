import { it, expect } from "vitest";
import { AdvertisingService } from "../src/services";
it("does not grant a repeated reward receipt twice", async () => {
  const service = new AdvertisingService({
    showRewarded: async () => ({ id: "same-receipt", completed: true }),
  });
  let credits = 0;
  expect(await service.reward(() => credits++)).toBe(true);
  expect(await service.reward(() => credits++)).toBe(false);
  expect(credits).toBe(1);
});
it("does not reward an interrupted advertisement", async () => {
  const service = new AdvertisingService({
    showRewarded: async () => ({ id: "cancelled", completed: false }),
  });
  expect(
    await service.reward(() => {
      throw Error("must not run");
    }),
  ).toBe(false);
});
