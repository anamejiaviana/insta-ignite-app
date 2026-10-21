import { describe, expect, test } from "bun:test";
import { isTrialExpired, trialDaysLeft } from "@/hooks/useUserPlan";

const now = Date.parse("2026-10-21T10:00:00Z");

describe("trial rules", () => {
  test("trial before end date is not expired", () => {
    expect(isTrialExpired({ status: "trial", trial_ends_at: "2026-10-28T10:00:00Z" }, now)).toBe(false);
  });
  test("trial after end date is expired", () => {
    expect(isTrialExpired({ status: "trial", trial_ends_at: "2026-10-21T09:59:00Z" }, now)).toBe(true);
  });
  test("legacy and comp accounts never expire", () => {
    expect(isTrialExpired({ status: "legacy", trial_ends_at: null }, now)).toBe(false);
    expect(isTrialExpired({ status: "comp", trial_ends_at: null }, now)).toBe(false);
  });
  test("new trial shows 7 days left", () => {
    expect(trialDaysLeft({ trial_ends_at: "2026-10-28T10:00:00Z" }, now)).toBe(7);
  });
});

import { businessLimitFor } from "@/hooks/useUserPlan";
describe("business limits per plan", () => {
  test("trial allows 1 business", () => expect(businessLimitFor({ status: "trial", plan_name: "basic", business_limit: 1 })).toBe(1));
  test("active Solo 1, Pro 3, Studio 5", () => {
    expect(businessLimitFor({ status: "active", plan_name: "basic", business_limit: 1 })).toBe(1);
    expect(businessLimitFor({ status: "active", plan_name: "pro", business_limit: 1 })).toBe(3);
    expect(businessLimitFor({ status: "active", plan_name: "studio", business_limit: 1 })).toBe(5);
  });
  test("comp unlimited, expired none, legacy keeps stored limit", () => {
    expect(businessLimitFor({ status: "comp", plan_name: "admin", business_limit: -1 })).toBe(-1);
    expect(businessLimitFor({ status: "expired", plan_name: "basic", business_limit: 1 })).toBe(0);
    expect(businessLimitFor({ status: "legacy", plan_name: "basic", business_limit: 1 })).toBe(1);
  });
});
