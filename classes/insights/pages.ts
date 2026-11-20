// La tabla de páginas, la comparación de consentimiento y la tendencia. Puro.
//
// La tabla junta las fuentes por ruta acá, en el backend, para que ni la página ni el CLI tengan que
// cruzar nada. La cobertura (GA4 ÷ Cloudflare) se lee SÓLO de los dos bloques `consent`, que cubren
// los mismos días (R1, R17); nunca de vistas de 28 días contra cargas de otros días.
import { addDays } from "../site-analytics/refresh";
import { INSIGHT_PAGES, TREND_DAYS } from "./caps";
import { insightFamily, stripLocale } from "./paths";
import { THRESHOLDS } from "./signals";
import type { ConsentCheck, CoverageClass, InsightPageRow, InsightSources, InsightTrend, Signal, SignalId, VitalBrief } from "./types";

const r4 = (x: number) => Math.round(x * 10000) / 10000;
const ratio = (a: number, b: number) => (b > 0 ? r4(a / b) : null);

export function buildConsentCheck(sources: InsightSources): ConsentCheck {
  const cfData = sources.cloudflareRum.data;
  const gaData = sources.ga4Behavior.data;
  const cf = cfData?.consent || null;
  const ga = gaData?.consent || null;
  const tz = gaData?.timeZone ?? null;
  const out: ConsentCheck = {
    usable: false,
    reason: null,
    cfRange: cf ? { ...cf.range } : null,
    ga4Range: ga ? { ...ga.range } : null,
    ga4TimeZone: tz,
    days: cf?.days ?? 0,
    siteCoverage: null,
    siteCoverageLoads: null,
    cfInternalShare: cfData?.internalLoadsShare ?? null,
    ga4InternalShare: gaData && gaData.totals.views > 0 ? ratio(gaData.flowsTotalViews, gaData.totals.views) : null,
    cfPagesTruncated: !!cf?.pagesTruncated,
    ga4Truncated: !!ga?.truncated,
  };
  const sameRange = !!cf && !!ga && cf.range.start === ga.range.start && cf.range.end === ga.range.end;
  if (sameRange) {
    out.siteCoverage = ratio(ga!.totals.landingSessions, cf!.totals.visits);
    out.siteCoverageLoads = ratio(ga!.totals.views, cf!.totals.loads);
  }
  // R17: hace falta que GA4 DIGA que corta en Montevideo; una zona que no informó no se supone.
  if (gaData && tz !== "America/Montevideo")
    out.reason = tz
      ? `la propiedad GA4 está en ${tz}, Cloudflare se corta en America/Montevideo`
      : "la propiedad GA4 no informó su zona horaria";
  else if (!cf) out.reason = `faltan días: 0 de ${THRESHOLDS.CG_MIN_DAYS}`;
  else if (cf.totalsUndercount)
    out.reason = "Cloudflare cortó la lista de páginas de algún día y no se pudo leer su total: la cobertura saldría inflada";
  else if (!ga) out.reason = "Google Analytics no trajo los días de la comparación";
  else if (!sameRange) out.reason = `rangos distintos: GA4 ${ga.range.start}–${ga.range.end}, Cloudflare ${cf.range.start}–${cf.range.end}`;
  else if (cf.days < THRESHOLDS.CG_MIN_DAYS) out.reason = `faltan días: ${cf.days} de ${THRESHOLDS.CG_MIN_DAYS}`;
  else if (!cf.totals.visits) out.reason = "Cloudflare no contó entradas en el rango";
  else out.usable = true;
  return out;
}

export interface PageExtras {
  /** Último resultado de inspección por ruta. */
  index?: Map<string, { class: CoverageClass; checkedAt: string; pending: boolean }>;
}

export function buildPages(
  sources: InsightSources,
  signals: Signal[],
  consentCheck: ConsentCheck | null,
  extras: PageExtras = {}
): InsightPageRow[] {
  const cfPages = new Map((sources.cloudflareRum.data?.pages || []).map((p) => [p.path, p]));
  const gaPages = new Map((sources.ga4Behavior.data?.pages || []).map((p) => [p.path, p]));
  const templates = new Map((sources.ga4Behavior.data?.templates || []).map((t) => [t.template, t]));
  const usable = !!consentCheck?.usable;
  const cfConsent = new Map((sources.cloudflareRum.data?.consent?.pages || []).map((p) => [p.path, p]));
  const gaConsent = new Map((sources.ga4Behavior.data?.consent?.pages || []).map((p) => [p.path, p]));
  const gaCut = !!sources.ga4Behavior.data?.consent?.truncated;
  const vitals = new Map((sources.cloudflareRum.data?.vitals || []).map((v) => [`${v.path}|${v.device}`, v]));
  const crux = new Map((sources.crux.data?.urls || []).map((u) => [`${u.path}|${u.formFactor}`, u]));
  const cl = sources.clarity.data;
  const clarity = new Map(((cl?.urlsUy?.length ? cl.urlsUy : cl?.urls) || []).map((u) => [u.path, u]));
  const feedback = new Map((sources.feedback.data?.pages || []).map((p) => [p.path, p]));
  const signalPaths = new Map<string, Set<SignalId>>();
  for (const s of signals) {
    for (const r of s.rows) {
      if (!r.path) continue;
      const set = signalPaths.get(r.path) || new Set<SignalId>();
      set.add(s.id);
      signalPaths.set(r.path, set);
    }
  }

  const paths = new Set<string>([...cfPages.keys(), ...gaPages.keys()]);
  const ranked = [...paths]
    .map((path) => ({ path, score: Math.max(cfPages.get(path)?.loads || 0, gaPages.get(path)?.views || 0) }))
    .sort((a, b) => b.score - a.score || a.path.localeCompare(b.path))
    .slice(0, INSIGHT_PAGES);

  const brief = (path: string, device: string): VitalBrief | null => {
    const v = vitals.get(`${path}|${device}`);
    return v ? { lcp: v.lcp.rating, inp: v.inp.rating, cls: v.cls.rating, samples: v.samples, realSamples: v.realSamples } : null;
  };

  return ranked.map(({ path }) => {
    const c = cfPages.get(path);
    const g = gaPages.get(path);
    const t = g?.template ? templates.get(g.template) : null;
    const rates = g?.rates || t?.rates || null;
    const fb = feedback.get(path);
    const cc = cfConsent.get(path);
    const gc = gaConsent.get(path);
    const mob = brief(path, "mobile");
    const desk = brief(path, "desktop");
    const cp = crux.get(`${path}|PHONE`);
    const cd = crux.get(`${path}|DESKTOP`);
    const clr = clarity.get(path);
    return {
      path,
      family: insightFamily(path),
      locale: stripLocale(path).locale,
      cf: c ? { loads: c.loads, visits: c.visits, mobileShare: ratio(c.mobile, c.loads) } : null,
      ga4: g
        ? {
            views: g.views,
            sessions: g.sessions,
            engagementRate: g.engagementRate,
            avgEngagementSec: g.avgEngagementSec,
            mobileEngagement: g.mobile?.engagementRate ?? null,
            desktopEngagement: g.desktop?.engagementRate ?? null,
            landingSessions: g.landingSessions,
            read50Rate: rates?.readMeasured ? rates.read50 : null,
            outboundRate: rates?.measured ? rates.outbound : null,
            readMeasured: !!rates?.readMeasured,
            helpfulViews: g.events?.helpfulViews || 0,
            template: g.template,
          }
        : null,
      // Con la lista de GA4 cortada, una ruta que no vino no tiene cobertura cero: no se sabe.
      coverage: usable && cc && cc.visits > 0 && (gc || !gaCut) ? ratio(gc?.landingSessions || 0, cc.visits) : null,
      coverageLoads: usable && cc && cc.loads > 0 && (gc || !gaCut) ? ratio(gc?.views || 0, cc.loads) : null,
      vitals: mob || desk ? { mobile: mob, desktop: desk } : null,
      crux: cp || cd ? { phone: cp?.rating ?? null, desktop: cd?.rating ?? null } : null,
      clarity: clr
        ? {
            sessions: clr.sessions,
            rage: clr.rage?.sessionsShare ?? null,
            dead: clr.dead?.sessionsShare ?? null,
            quickback: clr.quickback?.sessionsShare ?? null,
            scrollDepth: clr.scrollDepth,
          }
        : null,
      index: extras.index?.get(path) || null,
      feedback: fb ? { yes: fb.helpfulYes, no: fb.helpfulNo, written: fb.suggestion + fb.bug + fb.praise } : null,
      signals: [...(signalPaths.get(path) || [])],
    };
  });
}

export interface ArchiveTrendDay {
  day: string;
  inspected: number | null;
  indexed: number | null;
}

/**
 * 28 días que terminan en el día de datos. La cobertura diaria (sesiones GA4 ÷ entradas Cloudflare) es
 * null en el día de datos (GA4 puede seguir procesando, R17) y cuando la propiedad no está en Montevideo.
 */
export function buildTrend(sources: InsightSources, dataDay: string, archive: ArchiveTrendDay[] = []): InsightTrend {
  const days: string[] = [];
  for (let i = TREND_DAYS - 1; i >= 0; i--) days.push(addDays(dataDay, -i));
  const cf = new Map((sources.cloudflareRum.data?.daily || []).map((d) => [d.day, d]));
  const ga = new Map((sources.ga4Behavior.data?.daily || []).map((d) => [d.day, d]));
  const arch = new Map(archive.map((a) => [a.day, a]));
  // Una zona que GA4 no informó no se supone Montevideo (R17).
  const tzOk = sources.ga4Behavior.data?.timeZone === "America/Montevideo";
  return {
    days,
    cfLoadsUy: days.map((d) => cf.get(d)?.loadsUy ?? null),
    cfVisitsUy: days.map((d) => cf.get(d)?.visitsUy ?? null),
    ga4ViewsUy: days.map((d) => ga.get(d)?.views ?? null),
    ga4SessionsUy: days.map((d) => ga.get(d)?.sessions ?? null),
    coverage: days.map((d) => {
      if (d >= dataDay || !tzOk) return null;
      const v = cf.get(d)?.visitsUy;
      const s = ga.get(d)?.sessions;
      return v && s !== undefined ? r4(s / v) : null;
    }),
    inspected: days.map((d) => arch.get(d)?.inspected ?? null),
    inspectedIndexedShare: days.map((d) => {
      const a = arch.get(d);
      return a && a.inspected ? ratio(a.indexed || 0, a.inspected) : null;
    }),
  };
}
