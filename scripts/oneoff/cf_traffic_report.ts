// ¿De dónde viene el tráfico que GA4 atribuye a "Singapur"? (docs/seo/data/propuesta-trafico-ingresos-2026-09-22.md, F0.1)
//
//   npm run cf_traffic            # últimos 7 días
//   npm run cf_traffic -- 3       # últimos N días (máx. 30 en el plan gratuito)
//
// Cloudflare ve cada petición y la clasifica; GA4 sólo ve a quien ejecuta gtag y el VPS no tiene
// access log. Este script pide al GraphQL de Cloudflare el desglose por país, ruta, User-Agent,
// estado y caché de la zona y lo imprime como tablas: alcanza para decidir una regla WAF sobre las
// rutas que el cliente recorre, sin bloquear países por suposición.
//
// Necesita un token con **Zone Analytics: Read**: `CLOUDFLARE_ANALYTICS_TOKEN` en el `.env` (o
// `CLOUDFLARE_TOKEN` si ese ya tiene el permiso). El token que purga la caché NO alcanza: devuelve
// "does not have permission 'com.cloudflare.api.account.zone.analytics.read'". No escribe nada.
//
// El plan gratuito NO expone todas las dimensiones (ASN, nombre del ASN, bot management): cada
// tabla se pide por separado y la que no está disponible lo dice en vez de tumbar el informe.
import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const ZONE_TAG = process.env.CLOUDFLARE_ZONE_ID || "fcd8289e0c93d7f889d8cd583929a4e5";
const ENDPOINT = "https://api.cloudflare.com/client/v4/graphql";

type Row = { count: number; dimensions: Record<string, string | number> };
type Filter = Record<string, unknown>;

async function query(token: string, gql: string, variables: Record<string, unknown>): Promise<any> {
  const res = await axios.post(ENDPOINT, { query: gql, variables }, {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    timeout: 60_000,
    validateStatus: () => true,
  });
  if (res.status !== 200 || res.data?.errors?.length) {
    throw new Error(`Cloudflare GraphQL ${res.status}: ${JSON.stringify(res.data?.errors || res.data).slice(0, 600)}`);
  }
  return res.data.data;
}

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function table(title: string, rows: Row[], cols: string[]): void {
  console.log(`\n## ${title}`);
  if (!rows.length) {
    console.log("(sin filas)");
    return;
  }
  const total = rows.reduce((s, r) => s + r.count, 0);
  console.log([...cols, "requests", "%"].join(" | "));
  for (const r of rows) {
    console.log([...cols.map(c => String(r.dimensions[c] ?? "")), r.count, ((100 * r.count) / Math.max(1, total)).toFixed(1)].join(" | "));
  }
}

function groupQuery(dims: string): string {
  return [
    "query($zone: String!, $filter: ZoneHttpRequestsAdaptiveGroupsFilter_InputObject!, $limit: Int!) {",
    "  viewer { zones(filter: { zoneTag: $zone }) {",
    "    httpRequestsAdaptiveGroups(limit: $limit, filter: $filter, orderBy: [count_DESC]) {",
    "      count",
    `      dimensions { ${dims} }`,
    "    }",
    "  } }",
    "}",
  ].join("\n");
}

async function main(): Promise<void> {
  const token = process.env.CLOUDFLARE_ANALYTICS_TOKEN || process.env.CLOUDFLARE_TOKEN;
  if (!token) {
    console.error("[cf-traffic] falta CLOUDFLARE_ANALYTICS_TOKEN (o CLOUDFLARE_TOKEN) en el .env, con Zone Analytics: Read");
    process.exit(1);
  }
  const days = Math.min(30, Math.max(1, Number(process.argv[2] || 7)));
  const end = new Date();
  const start = new Date(end.getTime() - days * 86_400_000);
  const base: Filter = { datetime_geq: start.toISOString(), datetime_lt: end.toISOString() };
  console.log(`[cf-traffic] zona ${ZONE_TAG}, ${isoDay(start)} → ${isoDay(end)} (${days} días)`);

  const run = async (dims: string, limit = 25, extraFilter: Filter = {}): Promise<Row[]> => {
    try {
      const data = await query(token, groupQuery(dims), { zone: ZONE_TAG, filter: { ...base, ...extraFilter }, limit });
      return (data?.viewer?.zones?.[0]?.httpRequestsAdaptiveGroups || []) as Row[];
    } catch (e: any) {
      const msg = String(e?.message || e);
      if (/does not have access to the field/.test(msg)) {
        console.log(`\n(${dims}: dimensión no disponible en este plan de Cloudflare)`);
        return [];
      }
      throw e;
    }
  };

  table("Por país", await run("clientCountryName"), ["clientCountryName"]);
  table("Por ASN (si el plan lo expone; nombre en bgp.he.net/AS<n>)", await run("clientAsn"), ["clientAsn"]);
  table("Por estado de respuesta y caché", await run("edgeResponseStatus cacheStatus", 20), ["edgeResponseStatus", "cacheStatus"]);
  table("Por tipo de dispositivo", await run("clientDeviceType", 5), ["clientDeviceType"]);
  table("Por User-Agent (top 25)", await run("userAgent", 25), ["userAgent"]);
  table("Por ruta (top 40)", await run("clientRequestPath", 40), ["clientRequestPath"]);

  // El cruce que decide la regla: quién recorre /en/alquileres y /pt/alquileres.
  table(
    "Quién pide /en|pt/alquileres/* (país × UA × dispositivo)",
    await run("clientCountryName userAgent clientDeviceType", 25, { clientRequestPath_like: "/%/alquileres/%" }),
    ["clientCountryName", "userAgent", "clientDeviceType"],
  );
  table(
    "Desde Singapur: ruta × UA (top 30)",
    await run("clientRequestPath userAgent", 30, { clientCountryName: "SG" }),
    ["clientRequestPath", "userAgent"],
  );
  table(
    "Desde Estados Unidos: UA (top 20)",
    await run("userAgent", 20, { clientCountryName: "US" }),
    ["userAgent"],
  );

  console.log(
    "\nSiguiente paso (panel o API con Zone WAF: Edit): una regla WAF con expresión sobre el UA/ASN\n" +
      '  hallado y (http.request.uri.path matches "^/(en|pt)/alquileres/"), acción Managed Challenge o Block.\n' +
      "Nunca por país.",
  );
}

main().catch(e => {
  console.error(`[cf-traffic] ${e?.message || e}`);
  process.exit(1);
});
