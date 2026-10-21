import { describe, expect, test } from "bun:test";
import { bizLimitFromError, bizLimitPrecheck } from "./businessLimit";
import { translations } from "@/contexts/LanguageContext";

describe("business limit messages", () => {
  test("expired trial gets expired message", () => expect(bizLimitPrecheck(0, true).title).toBe("bizLimitExpiredTitle"));
  test("limit 1 / many", () => {
    expect(bizLimitPrecheck(1, false).title).toBe("bizLimitOneTitle");
    expect(bizLimitPrecheck(3, false)).toMatchObject({ title: "bizLimitManyTitle", count: 3 });
  });
  test("server limit error is recognised", () => {
    expect(bizLimitFromError('new row violates: business_limit_reached', false)?.description).toBe("bizLimitServerDesc");
    expect(bizLimitFromError('business_limit_reached', true)?.title).toBe("bizLimitExpiredTitle");
  });
  test("other errors are not hidden", () => expect(bizLimitFromError("network down", false)).toBeNull());
  test("all keys exist in ES and EN", () => {
    const keys = ["bizLimitExpiredTitle","bizLimitExpiredDesc","bizLimitNoneTitle","bizLimitOneTitle","bizLimitManyTitle","bizLimitUpgradeDesc","bizLimitServerDesc","bizLimitGenericDesc"];
    for (const l of ["es", "en"] as const) for (const k of keys) expect((translations[l] as any)[k]).toBeTruthy();
  });
});
