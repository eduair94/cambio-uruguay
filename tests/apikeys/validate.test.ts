import { describe, expect, it } from "vitest";
import { validateNewKey, validatePatch } from "../../classes/apikeys/validate";

const good = {
  ownerUid: "uid-1",
  ownerEmail: "ana@empresa.uy",
  label: "Pantalla del local",
  company: "Cambio Ejemplo",
  useCase: "Mostrar la pizarra en una pantalla del local",
  website: "https://ejemplo.uy",
};

describe("alta de clave", () => {
  it("acepta y recorta un alta completa", () => {
    const r = validateNewKey({ ...good, label: "  Pantalla del local  " });
    expect(r).toEqual({ ok: true, value: { ...good } });
  });

  it("el sitio web es opcional, pero si viene tiene que ser http(s)", () => {
    expect(validateNewKey({ ...good, website: "" })).toMatchObject({ ok: true, value: { website: null } });
    expect(validateNewKey({ ...good, website: "javascript:alert(1)" })).toMatchObject({ ok: false });
  });

  it("rechaza con un mensaje en español lo que falta o sobra", () => {
    expect(validateNewKey({ ...good, useCase: "api" })).toEqual({
      ok: false,
      error: "Contanos para qué la vas a usar (entre 10 y 500 caracteres).",
    });
    expect(validateNewKey({ ...good, ownerUid: "" })).toMatchObject({ ok: false });
    expect(validateNewKey(null)).toMatchObject({ ok: false });
  });

  it("saca caracteres de control", () => {
    expect(validateNewKey({ ...good, company: "Cambio\u0000 Ejemplo" })).toMatchObject({
      ok: true,
      value: { company: "Cambio Ejemplo" },
    });
  });
});

describe("cambios a una clave", () => {
  it("el dueño de la clave sólo puede revocarla o renombrarla", () => {
    expect(validatePatch({ status: "revoked" }, true)).toEqual({ ok: true, value: { status: "revoked" } });
    expect(validatePatch({ label: "Planilla" }, true)).toEqual({ ok: true, value: { label: "Planilla" } });
    expect(validatePatch({ plan: "business" }, true)).toMatchObject({ ok: false });
    expect(validatePatch({ status: "active" }, true)).toMatchObject({ ok: false });
  });

  it("el administrador cambia plan, límites, estado y notas", () => {
    expect(validatePatch({ plan: "business", notes: "Factura mensual", limits: { perDay: 800000 } }, false)).toEqual({
      ok: true,
      value: { plan: "business", notes: "Factura mensual", limits: { perDay: 800000 } },
    });
    expect(validatePatch({ limits: null, notes: "" }, false)).toEqual({ ok: true, value: { limits: null, notes: null } });
  });

  it("nadie asigna el plan anónimo ni un plan que no existe, ni límites basura", () => {
    expect(validatePatch({ plan: "anonymous" }, false)).toMatchObject({ ok: false });
    expect(validatePatch({ plan: "gold" }, false)).toMatchObject({ ok: false });
    expect(validatePatch({ limits: { perDay: -1 } }, false)).toMatchObject({ ok: false });
  });

  it("un cambio vacío no es un cambio", () => {
    expect(validatePatch({}, false)).toMatchObject({ ok: false });
  });
});
