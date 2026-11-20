import { describe, expect, it } from "vitest";
import { renderDayDigest, renderDigest } from "../../classes/insights/digest";
import { cappedDay, cappedSnapshot, P } from "./capped";

const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;

function snap() {
  const s = cappedSnapshot();
  // una página sin medición, una pendiente
  s.pages[1] = { ...s.pages[1], ga4: { ...s.pages[1].ga4!, read50Rate: null, outboundRate: null, readMeasured: false } };
  s.pages[2] = { ...s.pages[2], index: { class: "crawled-not-indexed", checkedAt: "2026-11-19", pending: true } };
  s.signals[8] = { ...s.signals[8], status: "unavailable", reason: "falta CLARITY_EXPORT_TOKEN (paso 5.1)", rows: [], severity: "none" };
  return s;
}

describe("renderDigest", () => {
  it("las señales primero, después las páginas", () => {
    const out = renderDigest(snap(), { top: 5 });
    expect(out.indexOf("## Señales con páginas")).toBeGreaterThan(-1);
    expect(out.indexOf("## Señales con páginas")).toBeLessThan(out.indexOf("## Páginas"));
    expect(out).toMatch(/^# Uso del sitio · corrida 2026-11-20 12:21 UTC · datos hasta 2026-11-19/);
    expect(out).toMatch(/sin medición/);
    expect(out).toMatch(/pendiente/);
    expect(out).toMatch(/12\.340/);
    expect(out).not.toMatch(EMOJI);
  });

  it("--all muestra las que no tienen datos, con el motivo", () => {
    expect(renderDigest(snap(), { all: true })).toMatch(/friction: unavailable — falta CLARITY_EXPORT_TOKEN/);
  });

  it("--page y --signal", () => {
    const page = renderDigest(snap(), { page: `https://cambio-uruguay.com${P(0)}?x=1` });
    expect(page).toContain(`## Página ${P(0)}`);
    expect(page).toContain("### Señales de esta página");
    const sig = renderDigest(snap(), { signal: "poor-vitals" });
    expect(sig).toContain("¿Qué páginas tienen LCP, INP o CLS malos");
    expect(sig).toContain("Umbrales:");
  });

  it("--source imprime el bloque", () => {
    expect(renderDigest(snap(), { source: "bing" })).toContain("## Fuente bing");
  });

  it("nunca imprime un token ni una URL con apikey", () => {
    const s = snap();
    const marker = ["no", "sale", "nunca"].join("_");
    process.env.CLARITY_EXPORT_TOKEN = marker;
    try {
      const out = renderDigest(s, { all: true });
      expect(out).not.toContain(marker);
      expect(out).not.toMatch(/apikey=/i);
    } finally {
      delete process.env.CLARITY_EXPORT_TOKEN;
    }
  });

  it("--day imprime las señales archivadas", () => {
    expect(renderDayDigest(cappedDay(10))).toMatch(/# Archivo del 2026-11-19/);
  });
});
