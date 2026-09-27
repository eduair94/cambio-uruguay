import { describe, expect, it } from "vitest";
import {
  displayPrefix,
  extractCredential,
  generateCredential,
  hashCredential,
  isWellFormed,
} from "../../classes/apikeys/credential";

// Valor de baja entropía a propósito: gitleaks marca los identificadores tipo "key" con valores aleatorios.
const sample = "cu_" + "A".repeat(32);

describe("credencial", () => {
  it("genera cu_ + 32 caracteres base62", () => {
    const made = generateCredential();
    expect(isWellFormed(made)).toBe(true);
    expect(made).toHaveLength(35);
    expect(generateCredential()).not.toBe(made);
  });

  it("descarta los bytes que sesgarían el alfabeto", () => {
    // 248..255 se descartan; 0 → "A". Con una fuente que sólo da 255 y 0 alternados, todo es "A".
    const fake = (n: number) => Buffer.from(Array.from({ length: n }, (_, i) => (i % 2 ? 0 : 255)));
    expect(generateCredential(fake)).toBe(sample);
  });

  it("guarda un hash estable y muestra 8 caracteres", () => {
    expect(hashCredential(sample)).toMatch(/^[a-f0-9]{64}$/);
    expect(hashCredential(sample)).toBe(hashCredential(sample));
    expect(displayPrefix(sample)).toBe("cu_AAAAA");
  });

  it("lee la clave de X-API-Key, de Bearer o de ?api_key=", () => {
    expect(extractCredential({ "x-api-key": sample }, {})).toEqual({ kind: "present", value: sample });
    expect(extractCredential({ authorization: `Bearer ${sample}` }, {})).toEqual({ kind: "present", value: sample });
    expect(extractCredential({}, { api_key: sample })).toEqual({ kind: "present", value: sample });
  });

  it("una clave vacía es no mandar clave (el «Try it» de la documentación o una celda en blanco)", () => {
    expect(extractCredential({ "x-api-key": "" }, {})).toEqual({ kind: "none" });
    expect(extractCredential({ "x-api-key": "   " }, {})).toEqual({ kind: "none" });
    expect(extractCredential({}, { api_key: "" })).toEqual({ kind: "none" });
    expect(extractCredential({ "x-api-key": "" }, { api_key: "hola" })).toEqual({ kind: "malformed" });
  });

  it("sin clave es anónimo, y un Authorization ajeno no cuenta como clave", () => {
    expect(extractCredential({}, {})).toEqual({ kind: "none" });
    expect(extractCredential({ authorization: "Basic dXNlcjpwYXNz" }, {})).toEqual({ kind: "none" });
  });

  it("una clave con otra forma es inválida, no anónima", () => {
    expect(extractCredential({ "x-api-key": "hola" }, {})).toEqual({ kind: "malformed" });
    expect(extractCredential({ authorization: "Bearer cu_corta" }, {})).toEqual({ kind: "malformed" });
  });
});
