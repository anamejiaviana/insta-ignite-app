import { describe, expect, test } from "bun:test";
import { classifyAiError } from "./aiErrors";
import { consumeLimitToast, registerLimitToken } from "./aiLimitNotice";

describe("ai error codes", () => {
  test("expired trial is distinct from used-up allowance", () => {
    expect(classifyAiError({ error: "trial_expired" })).toBe("trial_expired");
    expect(classifyAiError({ error: "image_limit_reached" })).toBe("image_limit_reached");
  });
  test("other errors are not limit notices", () => {
    expect(classifyAiError({ error: "boom" })).toBe(null);
  });
});

describe("duplicate error toast", () => {
  test("only the toast carrying the limit response is skipped", () => {
    const token = registerLimitToken("trial_expired");
    expect(consumeLimitToast({ title: "Error", description: token })).toBe(true);
  });
  test("an unexpected error right after is still shown", () => {
    registerLimitToken("trial_expired");
    expect(consumeLimitToast({ title: "Error", description: "Edge Function returned a non-2xx status code" })).toBe(false);
  });
  test("the same limit response is skipped only once", () => {
    const token = registerLimitToken("text_limit_reached");
    consumeLimitToast({ description: token });
    expect(consumeLimitToast({ description: token })).toBe(false);
  });
});
