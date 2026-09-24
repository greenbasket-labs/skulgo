export const SUBSCRIPTION_PLANS = {
  BASIC: { name: "Basic", price: 2500 },
  STARTER: { name: "Starter", price: 5000 },
  PRO: { name: "Pro", price: 10000 },
  PREMIUM: { name: "Premium", price: 18000 },
} as const;

export type SubscriptionPlanCode = keyof typeof SUBSCRIPTION_PLANS;

export function planPrice(plan: SubscriptionPlanCode) {
  return SUBSCRIPTION_PLANS[plan].price;
}

export function planName(plan: SubscriptionPlanCode) {
  return SUBSCRIPTION_PLANS[plan].name;
}

export function isPlanCode(value: string): value is SubscriptionPlanCode {
  return value in SUBSCRIPTION_PLANS;
}
