// Letras de Regulación Monetaria (pm2 app `currency-lrm`).
//
// Lee la planilla oficial de operaciones del BCU (todas las licitaciones de LRM desde 2019 y las de
// Notas del Tesoro del MEF) y el calendario tentativo de las próximas dos semanas, y escribe UN
// documento (`lrmsnapshots`) en la base del APP, que /api/letras-regulacion-monetaria sirve a
// /letras-de-regulacion-monetaria-uruguay.
//
// Por qué un job y no una lectura en el pedido: la planilla pesa 6,5 MB y trae 1.400 filas; el
// visitante no puede esperar eso, y la regla del sitio es que lo que procesa datos se precalcula.
// Dos veces por día porque la mesa del BCU sube la planilla a última hora (Last-Modified del
// 16/10/2026: 22:32 UTC) y las licitaciones son de lunes a viernes a las 14:00.
//
// Nunca deja la página vacía: una planilla flaca, más vieja que la guardada o sin las LRM a 30 y 90
// días no se escribe (ver `refuseReasons`). `--dry-run` imprime lo que guardaría y no toca la base.
import "dotenv/config";

import { appDbConfigured } from "./classes/appdb";
import { buildLrmSnapshot, fetchCalendarText, fetchOperationsSheets, refuseReasons } from "./classes/lrm/refresh";
import { loadLrm, saveLrm } from "./classes/lrm/store";

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  if (!dryRun && !appDbConfigured()) {
    console.error(
      "[lrm] APP_MONGO_URI is not set — refusing to run. The snapshot lives in the Nuxt app's database " +
        "(copy the value from app/.env's MONGO_URI); writing it anywhere else would leave " +
        "/letras-de-regulacion-monetaria-uruguay on its baked baseline forever with no error anywhere."
    );
    process.exit(1);
  }

  try {
    const previous = dryRun && !appDbConfigured() ? null : await loadLrm();
    const [{ sheets, modified }, calendarText] = await Promise.all([fetchOperationsSheets(), fetchCalendarText()]);
    const { snapshot, notes, rejected } = buildLrmSnapshot(
      { sheets, calendarText, operationsModified: modified, now: new Date() },
      previous
    );
    for (const note of notes) console.warn(`[lrm] ${note}`);
    // Sólo las descartadas del último año: las desiertas de 2019 no le dicen nada a quien lee el log.
    const oldest = snapshot ? snapshot.recent[snapshot.recent.length - 1]?.date ?? "" : "";
    for (const row of rejected.filter((r) => r.date >= oldest)) {
      console.warn(`[lrm] descartada ${row.date} ${row.series}: ${row.reason}`);
    }

    if (!snapshot) {
      console.error("[lrm] no se pudo armar la foto; se conserva la anterior");
      process.exit(1);
    }

    const latest = snapshot.latest.map((a) => `${a.termRef}d ${a.cutRate}% (${a.date})`).join(" · ");
    console.log(
      `[lrm] ${snapshot.counts.auctions} licitaciones válidas, ${snapshot.counts.rejected} descartadas · ${latest}` +
        ` · calendario ${snapshot.calendar ? `${snapshot.calendar.from}..${snapshot.calendar.to} (${snapshot.calendar.items.length})` : "—"}` +
        ` · NT ${snapshot.treasury.map((t) => `${t.currency} ${t.yield}%`).join(", ")}`
    );

    const reasons = refuseReasons(snapshot, previous);
    if (reasons.length) {
      console.error(`[lrm] no se pisa la foto anterior: ${reasons.join("; ")}`);
      process.exit(1);
    }

    if (dryRun) {
      console.log("[lrm] --dry-run: no se escribe nada");
      process.exit(0);
    }
    await saveLrm(snapshot);
    console.log(`[lrm] guardado ${snapshot.capturedAt.toISOString()}`);
    process.exit(0);
  } catch (err) {
    console.error("[lrm] falló, se conserva la foto anterior:", err);
    process.exit(1);
  }
}

void main();
