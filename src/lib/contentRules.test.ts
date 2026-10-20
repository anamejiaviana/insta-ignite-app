import { describe, expect, test } from "bun:test";
import { DEFAULT_IMAGE_SOURCE, shouldAutoGenerateImage, imageCost, buildEditPrompt, PRESERVE_IDENTITY_RULE } from "./contentRules";

describe("tu negocio, tus fotos", () => {
  test("la fuente por defecto es subir mi foto", () => {
    expect(DEFAULT_IMAGE_SOURCE).toBe("upload");
  });
  test("con la fuente por defecto no se usa IA de imagen en Post, Carrusel ni Story", () => {
    for (const t of ["post", "carousel", "story"]) expect(shouldAutoGenerateImage(t, DEFAULT_IMAGE_SOURCE)).toBe(false);
  });
  test("el carrusel ya no genera imágenes automáticamente", () => {
    expect(shouldAutoGenerateImage("carousel", "upload")).toBe(false);
    expect(shouldAutoGenerateImage("carousel", "library")).toBe(false);
  });
  test("Reel nunca usa IA de imagen", () => {
    for (const s of ["upload", "edit", "generate"]) expect(shouldAutoGenerateImage("reel", s)).toBe(false);
  });
  test("editar y generar gastan cupo; subir no", () => {
    expect(imageCost("post", "upload", 3, 0)).toBe(0);
    expect(imageCost("post", "edit", 3, 0)).toBe(1);
    expect(imageCost("post", "generate", 3, 0)).toBe(1);
    expect(imageCost("carousel", "edit", 5, 4)).toBe(4);
    expect(imageCost("carousel", "generate", 5, 4)).toBe(5);
  });
  test("la edición siempre exige conservar producto e identidad", () => {
    expect(buildEditPrompt([], "")).toContain(PRESERVE_IDENTITY_RULE);
    expect(buildEditPrompt(["light"], "")).toContain("iluminación");
  });
});
