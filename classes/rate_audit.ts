// La pasada que mira todas las casas juntas, que es lo único que ve el caso espejo.
//
// La guarda de `save` (classes/rate_plausibility.ts, regla compra > venta) corre por fila y por
// casa, y por eso no puede ver que una venta de 4120 es absurda: sola, esa fila es perfectamente
// coherente. Sólo se nota al lado de las otras 40 casas que venden a 41,20.
//
// Corre al final de `sync_cambios`, después de que todas las casas escribieron. Si la guillotina de
// cinco minutos mata el loop antes, esto no corre y no pasa nada: el scrape entero se repite cinco
// minutos después.
//
// QUÉ HACE CON CADA VEREDICTO:
//   * `imposible`  borra la fila y avisa. Es un error de la fuente, no un precio.
//   * `sospechosa` avisa y no toca nada. Puede ser un precio malo de verdad — tradelix cotiza el
//     peso argentino cuatro veces por encima del resto y es su precio, no un error nuestro.
//
// El aviso sale una vez por día por cotización (mismo memo que la guarda por fila): el scrape corre
// cada cinco minutos y un canal que repite lo mismo 288 veces es un canal que nadie lee.
import moment from "moment-timezone";
import { ratesCollection } from "./cambio";
import type { MongooseServer } from "./database";
import { notifyAdmin } from "./notify";
import { auditAgainstPeers, rateKey, shouldAlert } from "./rate_plausibility";
import type { BandedRow } from "./rate_plausibility";
import { describeFrozen, findFrozenQuotes, frozenSeverity } from "./rate_staleness";
import type { FrozenQuote, StalenessRow } from "./rate_staleness";

export interface AuditOutcome {
  checked: number;
  removed: number;
  suspicious: number;
  lines: string[];
}

/**
 * Audita las cotizaciones de hoy contra el resto de las casas.
 *
 * Nunca lanza: una auditoría que rompe el scrape convierte una fila dudosa en cero filas.
 */
export async function auditTodaysRates(): Promise<AuditOutcome> {
  const outcome: AuditOutcome = { checked: 0, removed: 0, suspicious: 0, lines: [] };
  try {
    const db = ratesCollection();
    const date = moment.tz("America/Montevideo").startOf("day").toDate();
    const rows: any[] = await db.allEntries({ date });
    outcome.checked = rows.length;
    if (rows.length < 20) {
      // Un día con cuatro filas no tiene grupos que comparar; auditarlo sólo produce ruido.
      return outcome;
    }

    const judged = auditAgainstPeers(rows);
    const impossible = judged.filter((r) => r.verdict.level === "imposible");
    const suspicious = judged.filter((r) => r.verdict.level === "sospechosa");
    outcome.suspicious = suspicious.length;

    for (const row of impossible) {
      const removed = await removeRow(db, date, row);
      if (removed) outcome.removed++;
    }

    const day = moment.tz("America/Montevideo").format("YYYY-MM-DD");
    const fresh: string[] = [];
    for (const row of [...impossible, ...suspicious]) {
      const key = `banda|${rateKey(row)}`;
      if (!shouldAlert(key, day)) continue;
      const mark = row.verdict.level === "imposible" ? "🔴 borrada" : "🟠 sospechosa";
      fresh.push(`${mark} — ${row.origin} ${row.code}${row.type ? "/" + row.type : ""}: ${row.verdict.reason}`);
    }
    outcome.lines = fresh;
    if (fresh.length) {
      await notifyAdmin(["*Cotizaciones fuera de banda*", ...fresh].join("\n"));
    }
  } catch (e) {
    console.error("[rate-audit] la auditoría falló, el scrape sigue igual:", e);
  }
  return outcome;
}

// ---------------------------------------------------------------------------------------------
// La pizarra que no se rompió, se quedó quieta.
//
// `auditTodaysRates` mira las casas de HOY entre sí. Esto mira a cada casa contra su propio pasado,
// que es el único eje donde se ve un origen que publica el mismo número desde hace dos meses. La
// lógica pura y el porqué están en `classes/rate_staleness.ts`.
//
// NO BORRA NADA, y es a propósito: una pizarra quieta puede ser un precio real. Avisa, y deja el
// informe en un archivo para que `/estado` lo muestre.

/** Cuántos días de historia se leen para medir. Suficiente para ver un tramo largo sin traer todo. */
const STALENESS_WINDOW_DAYS = 120;

export interface FrozenReport {
  generatedAt: string;
  windowDays: number;
  checked: number;
  quotes: FrozenQuote[];
}

/**
 * Busca las cotizaciones que no cambiaron de precio en una semana o más.
 *
 * Nunca lanza: igual que la auditoría de banda, un informe que rompe el scrape cambia un dato
 * dudoso por cero datos.
 */
export async function reportFrozenQuotes(windowDays = STALENESS_WINDOW_DAYS): Promise<FrozenReport> {
  const report: FrozenReport = {
    generatedAt: new Date().toISOString(),
    windowDays,
    checked: 0,
    quotes: [],
  };
  try {
    const db = ratesCollection();
    const today = moment.tz("America/Montevideo").startOf("day").toDate();
    const from = new Date(today.getTime() - windowDays * 86_400_000);
    const rows: StalenessRow[] = await db.allEntries({ date: { $gte: from } });
    report.checked = rows.length;
    if (rows.length < 100) {
      // Sin historia no hay nada que medir, y medir poco produce falsos positivos: una serie de
      // tres días parece congelada el día que arranca.
      return report;
    }

    report.quotes = findFrozenQuotes(rows, { today });

    const day = moment.tz("America/Montevideo").format("YYYY-MM-DD");
    const fresh: string[] = [];
    for (const q of report.quotes) {
      const severity = frozenSeverity(q);
      if (severity !== "grave") continue; // los avisos van al informe, no al canal
      // Mismo memo diario que la guarda de banda: el scrape corre cada cinco minutos y un canal que
      // repite lo mismo 288 veces es un canal que nadie lee.
      if (!shouldAlert(`congelada|${q.origin}|${q.code}|${q.type}`, day)) continue;
      fresh.push(`🧊 ${describeFrozen(q)}`);
    }
    if (fresh.length) {
      await notifyAdmin(["*Pizarras congeladas*", ...fresh].join("\n"));
    }
  } catch (e) {
    console.error("[frozen] el informe falló, el scrape sigue igual:", e);
  }
  return report;
}

async function removeRow(db: MongooseServer, date: Date, row: BandedRow): Promise<boolean> {
  try {
    // `deleteEntry` es la puerta pública; `Model` es privado a propósito.
    await db.deleteEntry({ origin: row.origin, date, code: row.code, type: row.type || "" });
    console.error(
      `[rate-audit] borrada ${row.origin} ${row.code}${row.type ? "/" + row.type : ""}: ${row.verdict.reason}`
    );
    return true;
  } catch (e) {
    console.error("[rate-audit] no se pudo borrar la fila:", e);
    return false;
  }
}
