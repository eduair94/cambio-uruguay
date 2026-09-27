import { describe, expect, it } from "vitest";
import { DEFAULT_PLAN_LIMITS, effectiveLimits, isPlanId, limitsForJson, planLimits } from "../../classes/apikeys/plans";

describe("planes de la API", () => {
  it("el techo anónimo queda por encima de lo medido (494 en un minuto, ~280 en un día)", () => {
    expect(DEFAULT_PLAN_LIMITS.anonymous.perMinute).toBeGreaterThan(494);
    expect(DEFAULT_PLAN_LIMITS.anonymous.perDay).toBeGreaterThan(280);
  });

  it("reconoce sólo los cuatro planes", () => {
    expect(isPlanId("business")).toBe(true);
    expect(isPlanId("gold")).toBe(false);
    expect(isPlanId(undefined)).toBe(false);
  });

  it("una variable de entorno pisa el límite, y una basura no", () => {
    const env = { API_LIMIT_FREE_PER_DAY: "50", API_LIMIT_FREE_PER_MINUTE: "cero" } as NodeJS.ProcessEnv;
    expect(planLimits("free", env)).toEqual({ perMinute: 600, perDay: 50 });
  });

  it("interno no tiene límite aunque el entorno diga otra cosa", () => {
    const env = { API_LIMIT_INTERNAL_PER_DAY: "5" } as NodeJS.ProcessEnv;
    expect(planLimits("internal", env).perDay).toBe(Infinity);
  });

  it("los límites propios de una clave pisan los del plan, uno por uno", () => {
    expect(effectiveLimits("business", { perDay: 1_000_000 }, {} as NodeJS.ProcessEnv)).toEqual({ perMinute: 3000, perDay: 1_000_000 });
    expect(effectiveLimits("free", { perMinute: -3 }, {} as NodeJS.ProcessEnv)).toEqual({ perMinute: 600, perDay: 20000 });
    expect(effectiveLimits("free", null, {} as NodeJS.ProcessEnv)).toEqual({ perMinute: 600, perDay: 20000 });
  });

  it("sin límite sale como null en JSON", () => {
    expect(limitsForJson({ perMinute: Infinity, perDay: 10 })).toEqual({ perMinute: null, perDay: 10 });
  });
});
