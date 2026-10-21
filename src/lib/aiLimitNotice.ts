// When a friendly limit notice (trial ended, allowance used up, daily cap) is shown,
// the generic red error toast that follows from the same request is skipped.
let lastLimitAt = 0;
const WINDOW_MS = 4000;

export function markLimitNotice(now = Date.now()) {
  lastLimitAt = now;
}

export function shouldSuppressErrorToast(variant: unknown, now = Date.now()) {
  return variant === "destructive" && now - lastLimitAt < WINDOW_MS;
}
