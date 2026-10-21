import { describe, expect, test } from "bun:test";
import { classifyAiError } from "./aiErrors";
describe("ai error codes", () => {
  test("expired trial is distinct from used-up allowance", () => {
    expect(classifyAiError({ error: "trial_expired" })).toBe("trial_expired");
    expect(classifyAiError({ error: "image_limit_reached" })).toBe("image_limit_reached");
  });
  test("other errors are not limit notices", () => {
    expect(classifyAiError({ error: "boom" })).toBe(null);
  });
});
import { markLimitNotice, shouldSuppressErrorToast } from "./aiLimitNotice";
describe("duplicate error toast", () => {
  test("red toast right after a limit notice is skipped", () => {
    markLimitNotice(1000);
    expect(shouldSuppressErrorToast("destructive", 2000)).toBe(true);
  });
  test("unexpected errors later are still shown", () => {
    markLimitNotice(1000);
    expect(shouldSuppressErrorToast("destructive", 10000)).toBe(false);
  });
});
