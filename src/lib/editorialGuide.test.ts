import { describe, it, expect } from "bun:test";
import { aiTone, buildGuideContext, normalizeManual, MAX_GUIDE_CHARS } from "./editorialGuide";

describe("editorial guide", () => {
  it("without an approved guide the tone is unchanged", () => {
    expect(aiTone("Cercano", "")).toBe("Cercano");
    expect(aiTone(null, null)).toBe(null);
  });
  it("approved guide is added to the tone", () => {
    expect(aiTone("Cercano", "Voz: cálida")).toContain("Voz: cálida");
  });
  it("sample copy is never sent to generators", () => {
    const m = normalizeManual({ voice: { description: "cálida" }, sampleCopy: "TEXTO_EJEMPLO" });
    expect(buildGuideContext(m)).not.toContain("TEXTO_EJEMPLO");
  });
  it("guide text is capped", () => {
    const m = normalizeManual({ brandDescription: "x".repeat(5000) });
    expect(buildGuideContext(m).length).toBe(MAX_GUIDE_CHARS);
  });
  it("keeps at most 6 pillars", () => {
    const m = normalizeManual({ pillars: Array.from({ length: 9 }, (_, i) => ({ name: `P${i}` })) });
    expect(m.pillars.length).toBe(6);
  });
});
