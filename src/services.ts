/** Development adapters only. No money or real entitlements. */
export interface AdProvider {
  showRewarded(): Promise<{ id: string; completed: boolean }>;
}
export class MockAdProvider implements AdProvider {
  async showRewarded() {
    if (import.meta.env.PROD) throw Error("Mock disabled in production");
    return { id: crypto.randomUUID(), completed: true };
  }
}
export class AdvertisingService {
  private claimed = new Set<string>();
  constructor(private provider: AdProvider) {}
  async reward(grant: () => void) {
    const receipt = await this.provider.showRewarded();
    if (!receipt.completed || this.claimed.has(receipt.id)) return false;
    this.claimed.add(receipt.id);
    grant();
    return true;
  }
}
export interface PaymentProvider {
  checkout(): Promise<{ test: true }>;
}
export class MockPaymentProvider implements PaymentProvider {
  async checkout() {
    if (import.meta.env.PROD) throw Error("Mock disabled in production");
    return { test: true as const };
  }
}
export class MockSubscriptionProvider {
  async status() {
    return { active: false, test: true as const };
  }
}
