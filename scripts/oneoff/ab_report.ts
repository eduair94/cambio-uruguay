// `npm run ab_report` — la lectura de los experimentos A/B del sitio (docs/analytics/AB_TESTS.md).
//
// Por cada experimento de `app/utils/abTests.ts`, desde que arrancó hasta ayer y sólo Uruguay en el
// host del sitio: sesiones, % con interacción, segundos de interacción y páginas por sesión, por
// brazo, más los eventos propios de ese experimento. Usa la dimensión de usuario `ab_<id>` que manda
// `app/plugins/ab-tests.client.ts` (hay que registrarla en GA4 → Definiciones personalizadas, con
// alcance Usuario; sin eso GA4 contesta error de dimensión).
//
// Sólo lee la API de datos de GA4 (la misma cuenta de servicio de currency-site-analytics). Corre
// donde estén las credenciales: el VPS (`GA4_PROPERTY_ID` + `sheet_key.json`). No escribe nada.
//
// Lo que NO hace: decidir. Imprime la diferencia de la tasa de interacción con su intervalo de 95 %
// y las tasas de cada evento por sesión; los promedios de segundos y páginas no traen varianza en
// GA4, así que se leen como dirección, no como prueba. Un experimento se cierra en su `endsOn`.
import "dotenv/config";
import fs from "fs";
import path from "path";
import { exactDimension, reportRows, runReports, type Ga4Row } from "../../classes/site-analytics/ga4";

interface AbTest {
  id: "jubilaciones" | "seguimiento" | "alquiler-tarjeta";
  param: string;
  startsOn: string;
  endsOn: string;
  what: string;
}

/**
 * El registro se LEE como texto de app/utils/abTests.ts, no se copia: el paquete del app es ESM y
 * ts-node de la raíz no lo puede importar, y una copia se separaría en silencio de la original.
 */
function readAbTests(): AbTest[] {
  const source = fs.readFileSync(path.join(__dirname, "..", "..", "app", "utils", "abTests.ts"), "utf8");
  const block = /\{\s*id: '([a-z-]+)',\s*param: '([a-z_]+)',\s*startsOn: '(\d{4}-\d{2}-\d{2})',\s*endsOn: '(\d{4}-\d{2}-\d{2})',\s*what: '([^']+)',?\s*\}/g;
  const tests: AbTest[] = [];
  for (const m of source.matchAll(block))
    tests.push({ id: m[1] as AbTest["id"], param: m[2]!, startsOn: m[3]!, endsOn: m[4]!, what: m[5]! });
  if (!tests.length) throw new Error("no encontré AB_TESTS en app/utils/abTests.ts");
  return tests;
}
const AB_TESTS = readAbTests();

interface Scope {
  /** Filtro extra además de Uruguay + host. */
  filter?: Record<string, unknown>;
  /** Eventos propios del experimento (conteo por sesión del brazo). */
  events: string[];
  note: string;
}

const SCOPES: Record<AbTest["id"], Scope> = {
  jubilaciones: {
    filter: exactDimension("landingPage", "/guias/aumento-de-jubilaciones-uruguay"),
    events: ["estimator_use", "topic_subscribe_submit", "topic_subscribe", "internal_navigation"],
    note: "sesiones que entraron por la guía del aumento de jubilaciones",
  },
  seguimiento: {
    events: [
      "newsletter_capture_view",
      "newsletter_signup",
      "topic_followup_view",
      "topic_subscribe",
      "cta_click",
    ],
    note: "todas las sesiones (la invitación del final vive en el layout); cta_click incluye *-alert-open",
  },
  "alquiler-tarjeta": {
    filter: {
      andGroup: {
        expressions: [
          exactDimension("landingPage", "/alquileres-uruguay"),
          exactDimension("deviceCategory", "mobile"),
        ],
      },
    },
    events: ["internal_navigation", "cta_click", "directory_filter"],
    note: "sesiones de celular que entraron por /alquileres-uruguay",
  },
};

const ON_SITE = {
  filter: { fieldName: "hostName", inListFilter: { values: ["cambio-uruguay.com", "www.cambio-uruguay.com"] } },
};

function yesterday(): string {
  return new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
}

function filterFor(scope: Scope): Record<string, unknown> {
  const expressions: unknown[] = [ON_SITE, exactDimension("countryId", "UY")];
  if (scope.filter) expressions.push(scope.filter);
  return { andGroup: { expressions } };
}

const num = (row: Ga4Row | undefined, key: string) => Number(row?.[key] ?? 0);

/** Diferencia de dos proporciones con intervalo de 95 % (aproximación normal). */
function diffCi(x1: number, n1: number, x2: number, n2: number): string {
  if (!n1 || !n2) return "sin datos";
  const p1 = x1 / n1;
  const p2 = x2 / n2;
  const se = Math.sqrt((p1 * (1 - p1)) / n1 + (p2 * (1 - p2)) / n2);
  const d = p2 - p1;
  const pts = (v: number) => `${(v * 100).toFixed(1)} pts`;
  return `${d >= 0 ? "+" : ""}${pts(d)} (IC 95 %: ${pts(d - 1.96 * se)} a ${pts(d + 1.96 * se)})`;
}

async function readTest(test: AbTest): Promise<void> {
  const scope = SCOPES[test.id];
  const end = [test.endsOn, yesterday()].sort()[0]!;
  console.log(`\n## ${test.id} — ${test.what}`);
  console.log(`   ${test.startsOn} → ${end} · ${scope.note}`);
  if (end < test.startsOn) {
    console.log("   todavía no hay días cerrados");
    return;
  }
  const dim = `customUser:${test.param}`;
  const dateRanges = [{ startDate: test.startsOn, endDate: end }];
  const dimensionFilter = filterFor(scope);
  const [sessions, events] = await runReports([
    {
      dateRanges,
      dimensions: [{ name: dim }],
      metrics: ["sessions", "engagedSessions", "userEngagementDuration", "screenPageViews"].map(name => ({ name })),
      dimensionFilter,
    },
    {
      dateRanges,
      dimensions: [{ name: dim }, { name: "eventName" }],
      metrics: [{ name: "eventCount" }],
      dimensionFilter: {
        andGroup: {
          expressions: [
            dimensionFilter,
            { filter: { fieldName: "eventName", inListFilter: { values: scope.events } } },
          ],
        },
      },
    },
  ]);
  const rows = reportRows(sessions);
  const arm = (a: string) => rows.find(r => r[dim] === a);
  const a = arm("a");
  const b = arm("b");
  for (const [label, row] of [["a (control)", a], ["b (tratamiento)", b]] as const) {
    const n = num(row, "sessions");
    if (!n) {
      console.log(`   ${label}: sin sesiones`);
      continue;
    }
    console.log(
      `   ${label}: ${n} sesiones · ${((num(row, "engagedSessions") / n) * 100).toFixed(1)} % con interacción · ` +
        `${(num(row, "userEngagementDuration") / n).toFixed(0)} s · ${(num(row, "screenPageViews") / n).toFixed(2)} pág/ses`
    );
  }
  console.log(
    `   interacción b − a: ${diffCi(num(a, "engagedSessions"), num(a, "sessions"), num(b, "engagedSessions"), num(b, "sessions"))}`
  );
  const eventRows = reportRows(events);
  for (const name of scope.events) {
    const count = (armId: string) =>
      num(eventRows.find(r => r[dim] === armId && r.eventName === name), "eventCount");
    const na = num(a, "sessions");
    const nb = num(b, "sessions");
    const per = (c: number, n: number) => (n ? (c / n).toFixed(3) : "—");
    console.log(`   ${name}: a ${count("a")} (${per(count("a"), na)}/ses) · b ${count("b")} (${per(count("b"), nb)}/ses)`);
  }
}

(async () => {
  for (const test of AB_TESTS) {
    try {
      await readTest(test);
    } catch (err) {
      const message = (err as { response?: { data?: unknown }; message?: string })?.response?.data ?? (err as Error).message;
      console.log(`   error: ${JSON.stringify(message).slice(0, 300)}`);
      console.log("   ¿Está registrada la dimensión de usuario en GA4? (docs/analytics/AB_TESTS.md)");
    }
  }
})();
