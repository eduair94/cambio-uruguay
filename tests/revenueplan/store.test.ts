// La guarda de corrida flaca y el reuso de veredictos cerrados.
import { describe, expect, it } from "vitest";
import { planExperimentWork } from "../../classes/revenueplan/refresh";
import { planIsThin } from "../../classes/revenueplan/store";
import type { ExperimentResult, ExperimentSpec, PricedAction, RevenuePlanSnapshot } from "../../classes/revenueplan/types";

const action = (i: number): PricedAction => ({
  kind: "striking-distance",
  subject: `q${i}`,
  note: "",
  impressions: 100,
  clicks: 1,
  position: 7,
  potentialClicks: 10,
  url: null,
  bucket: null,
  usdPerClick: 0.0002,
  basis: "tramo",
  expectedUsd: 0.002,
  weightedClicks: 10,
  rankByClicks: i + 1,
});

const plan = (asOf: string, actions: number, experiments: ExperimentResult[] = []): RevenuePlanSnapshot => ({
  key: "revenue_plan",
  asOf,
  searchWindow: { startDate: "", endDate: "" },
  revenueWindow: { start: "", end: "" },
  currency: "USD",
  siteRpm: 0.2,
  siteUsdPerClick: 0.0002,
  revenuePending: false,
  totalUpsideUsd: 1,
  actions: Array.from({ length: actions }, (_, i) => action(i)),
  defend: [],
  families: [],
  experiments,
  alerts: [],
});

describe("planIsThin", () => {
  it("no pisa un plan de 40 acciones con uno de 3", () => {
    // El caso real: currency-gsc falló hoy, este job no encuentra oportunidades, y una cola vacía
    // en la pantalla se ve exactamente igual que "no hay nada para hacer".
    expect(planIsThin(plan("2026-09-20", 3), plan("2026-09-19", 40))).toBe(true);
  });

  it("deja pasar una baja normal", () => {
    expect(planIsThin(plan("2026-09-20", 30), plan("2026-09-19", 40))).toBe(false);
  });

  it("la primera corrida siempre escribe", () => {
    expect(planIsThin(plan("2026-09-20", 0), null)).toBe(false);
  });

  it("la negativa caduca: a los 8 días la caída es el dato, no la sospecha", () => {
    expect(planIsThin(plan("2026-09-28", 1), plan("2026-09-19", 40))).toBe(false);
  });
});

describe("planExperimentWork", () => {
  const spec = (id: string, shippedOn: string): ExperimentSpec => ({
    id,
    shippedOn,
    routes: [`/${id}`],
    hypothesis: "h",
  });

  const closed = (id: string, shippedOn: string): ExperimentResult => ({
    ...spec(id, shippedOn),
    verdict: "mejoró",
    daysAfter: 28,
    daysMissing: 0,
    before: { clicks: 10, impressions: 100, days: 28 },
    after: { clicks: 30, impressions: 300, days: 28 },
    siteBefore: { clicks: 1000, impressions: 10000 },
    siteAfter: { clicks: 1000, impressions: 10000 },
    relativeLift: 3,
    note: "",
  });

  it("no vuelve a medir lo que ya cerró", () => {
    const previous = plan("2026-09-19", 40, [closed("a", "2026-05-01")]);
    const work = planExperimentWork([spec("a", "2026-05-01"), spec("b", "2026-09-16")], previous);
    expect(work.reuse.map((r) => r.id)).toEqual(["a"]);
    expect(work.measure.map((r) => r.id)).toEqual(["b"]);
  });

  it("si cambió el sujeto, el veredicto guardado ya no le corresponde", () => {
    const previous = plan("2026-09-19", 40, [closed("a", "2026-05-01")]);
    const work = planExperimentWork([{ ...spec("a", "2026-05-01"), routes: ["/otra-cosa"] }], previous);
    expect(work.measure.map((r) => r.id)).toEqual(["a"]);
  });

  it("corta por el tope de archivo dejando afuera lo viejo, no lo recién publicado", () => {
    const work = planExperimentWork([spec("viejo", "2026-01-01"), spec("nuevo", "2026-09-16")], null, 90);
    expect(work.measure.map((r) => r.id)).toEqual(["nuevo"]);
    expect(work.dropped.map((r) => r.id)).toEqual(["viejo"]);
  });

  it("el rango pedido cubre las dos ventanas de lo que sí se mide", () => {
    const work = planExperimentWork([spec("uno", "2026-09-16")], null);
    expect(work.from).toBe("2026-08-19");
    expect(work.to).toBe("2026-10-14");
  });
});
