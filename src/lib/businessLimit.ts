// Maps business-limit situations to i18n keys (no hardcoded copy). The DB trigger is the real enforcement.
export type BizLimitMessage = { title: string; description: string; count?: number; showPlans: boolean };

/** Pre-check before opening the form. limit: -1 unlimited, 0 = none allowed (expired). */
export function bizLimitPrecheck(limit: number, expired: boolean): BizLimitMessage {
  if (expired) return { title: "bizLimitExpiredTitle", description: "bizLimitExpiredDesc", showPlans: true };
  const n = Math.max(limit, 0);
  if (n === 0) return { title: "bizLimitNoneTitle", description: "bizLimitUpgradeDesc", showPlans: true };
  return { title: n === 1 ? "bizLimitOneTitle" : "bizLimitManyTitle", description: "bizLimitUpgradeDesc", count: n, showPlans: true };
}

/** Error returned when saving a business. null = not a limit error (caller should show the real error). */
export function bizLimitFromError(message: unknown, expired: boolean): BizLimitMessage | null {
  if (!String(message ?? "").includes("business_limit_reached")) return null;
  return expired
    ? { title: "bizLimitExpiredTitle", description: "bizLimitExpiredDesc", showPlans: true }
    : { title: "errorSavingBusiness", description: "bizLimitServerDesc", showPlans: true };
}
