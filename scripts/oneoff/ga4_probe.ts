// Diagnóstico de la integración GA4 (docs/analytics/GA4_DATA_API.md).
//
//   npm run ga4_probe
//
// Contesta, en orden, las tres preguntas que se confunden entre sí porque Google devuelve 403 para
// todas:
//   1. ¿La cuenta de servicio puede autenticarse?           → token
//   2. ¿A qué propiedades la dejaron entrar, y con qué ID?   → Admin API (accountSummaries)
//   3. ¿La Data API responde de verdad?                      → runReport + runRealtimeReport
//
// Existe porque el ID de propiedad NO se puede adivinar desde el measurement ID `G-XXXXXXX`, y
// pedirlo a mano en la consola es justo el paso donde se cuela el error. Si la cuenta ya tiene el
// rol Lector, este script imprime el `GA4_PROPERTY_ID` listo para pegar en el `.env`.
import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

import { ga4AccessToken, ga4Credentials, ga4PropertyId, runRealtimeReport, runReports } from "../../classes/site-analytics/ga4";

const ADMIN_ROOT = "https://analyticsadmin.googleapis.com/v1beta";

function detail(e: any): string {
  const data = e?.response?.data;
  if (!data) return e?.message || String(e);
  const err = data.error || data;
  return `${err.status || e?.response?.status || ""} ${err.message || JSON.stringify(data)}`.trim();
}

async function main(): Promise<void> {
  const creds = ga4Credentials();
  if (!creds) {
    console.error(
      "[ga4-probe] sin credenciales. Usá GA4_CLIENT_EMAIL + GA4_PRIVATE_KEY, o GA4_KEY_FILE=./ga4_key.json,\n" +
        "            o dejá sheet_key.json en la raíz. Ver docs/analytics/GA4_DATA_API.md"
    );
    process.exit(1);
  }
  console.log(`[ga4-probe] cuenta de servicio: ${creds.clientEmail}`);

  let token: string;
  try {
    token = await ga4AccessToken(creds);
    console.log("[ga4-probe] 1/3 autenticación: OK");
  } catch (e) {
    console.error(`[ga4-probe] 1/3 autenticación: FALLÓ — ${detail(e)}`);
    console.error("            invalid_grant suele ser reloj del servidor desfasado o clave mal pegada.");
    process.exit(1);
  }

  // 2 — qué propiedades ve. Este es el paso que dice si el rol Lector quedó bien puesto.
  const properties: { id: string; display: string; account: string }[] = [];
  try {
    const { data } = await axios.get(`${ADMIN_ROOT}/accountSummaries`, {
      headers: { authorization: `Bearer ${token}` },
      params: { pageSize: 200 },
      timeout: 20000,
    });
    for (const account of data?.accountSummaries || []) {
      for (const p of account.propertySummaries || []) {
        properties.push({
          id: String(p.property || "").replace(/^properties\//, ""),
          display: p.displayName || "",
          account: account.displayName || "",
        });
      }
    }
    if (!properties.length) {
      console.error(
        "[ga4-probe] 2/3 acceso: la cuenta se autentica pero NO ve ninguna propiedad.\n" +
          "            Falta agregarla en GA4 → Administrar → Gestión de accesos a la propiedad,\n" +
          "            con rol Lector (y sin marcar «Notificar por correo»)."
      );
    } else {
      console.log(`[ga4-probe] 2/3 acceso: ve ${properties.length} propiedad(es):`);
      for (const p of properties) {
        console.log(`            GA4_PROPERTY_ID=${p.id}   ${p.display}${p.account ? ` (cuenta: ${p.account})` : ""}`);
      }
    }
  } catch (e) {
    // La Admin API se habilita aparte de la Data API; que falte NO impide leer datos.
    console.warn(`[ga4-probe] 2/3 acceso: no se pudo listar propiedades — ${detail(e)}`);
    console.warn("            (si dice SERVICE_DISABLED, habilitá también la Google Analytics Admin API,");
    console.warn("             o pasá el ID a mano: GA4_PROPERTY_ID=... npm run ga4_probe)");
  }

  const property = ga4PropertyId() || (properties.length === 1 ? properties[0].id : "");
  if (!property) {
    console.error("[ga4-probe] 3/3 datos: sin GA4_PROPERTY_ID no hay nada que consultar.");
    process.exit(properties.length ? 0 : 1);
  }

  try {
    const [report] = await runReports(
      [
        {
          dateRanges: [{ startDate: "7daysAgo", endDate: "yesterday" }],
          metrics: [{ name: "activeUsers" }, { name: "sessions" }, { name: "screenPageViews" }],
        },
      ],
      property
    );
    const row = report?.rows?.[0]?.metricValues?.map((m) => m.value) || [];
    console.log(
      `[ga4-probe] 3/3 datos (propiedad ${property}, últimos 7 días): ` +
        `${row[0] ?? "?"} usuarios, ${row[1] ?? "?"} sesiones, ${row[2] ?? "?"} páginas vistas` +
        ` · zona horaria ${report?.metadata?.timeZone || "?"}`
    );
  } catch (e) {
    console.error(`[ga4-probe] 3/3 datos: FALLÓ — ${detail(e)}`);
    console.error("            SERVICE_DISABLED = falta habilitar la Data API en el proyecto de Cloud.");
    console.error("            PERMISSION_DENIED = la cuenta no tiene acceso a ESA propiedad.");
    process.exit(1);
  }

  try {
    const realtime = await runRealtimeReport({ metrics: [{ name: "activeUsers" }] }, property);
    const now = realtime?.rows?.[0]?.metricValues?.[0]?.value ?? "0";
    console.log(`[ga4-probe] en vivo: ${now} personas en los últimos 30 minutos`);
  } catch (e) {
    console.warn(`[ga4-probe] en vivo: FALLÓ — ${detail(e)} (la foto diaria igual funciona)`);
  }

  console.log("[ga4-probe] listo. Pegá el GA4_PROPERTY_ID en el .env del backend y corré npm run sync_site_analytics");
  process.exit(0);
}

main().catch((e) => {
  console.error("[ga4-probe] error inesperado", e);
  process.exit(1);
});
