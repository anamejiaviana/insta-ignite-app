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
