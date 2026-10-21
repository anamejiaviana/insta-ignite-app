import { describe, expect, test } from "bun:test";
import { billingErrorKey, hasPaidAccess, paymentsEnvironment, planChangeKind } from "./billing";

describe("billing rules", () => {
  test("test token routes to sandbox, live token to live, missing token is not configured", () => {
    expect(paymentsEnvironment("pk_test_abc")).toBe("sandbox");
    expect(paymentsEnvironment("pk_live_abc")).toBe("live");
    expect(paymentsEnvironment(undefined)).toBeNull();
  });
  test("solo -> studio is an upgrade, studio -> pro is a downgrade", () => {
    expect(planChangeKind("solo", "studio")).toBe("upgrade");
    expect(planChangeKind("studio", "pro")).toBe("downgrade");
    expect(planChangeKind("pro", "pro")).toBe("same");
  });
  test("past_due keeps access during grace; canceled keeps access only until period end", () => {
    const now = Date.parse("2026-10-21T00:00:00Z");
    expect(hasPaidAccess({ status: "past_due", current_period_end: "2026-11-01T00:00:00Z" }, now)).toBe(true);
    expect(hasPaidAccess({ status: "canceled", current_period_end: "2026-11-01T00:00:00Z" }, now)).toBe(true);
    expect(hasPaidAccess({ status: "canceled", current_period_end: "2026-10-01T00:00:00Z" }, now)).toBe(false);
    expect(hasPaidAccess({ status: "unpaid", current_period_end: "2026-11-01T00:00:00Z" }, now)).toBe(false);
  });
  test("non-tester in test mode gets the 'not available' message", () => {
    expect(billingErrorKey("payments_unavailable")).toBe("billErrUnavailable");
    expect(billingErrorKey("weird")).toBe("billErrGeneric");
  });
});
