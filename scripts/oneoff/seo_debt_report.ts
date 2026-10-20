// `npm run seo_debt` — qué deuda de SEO se puede tocar hoy sin arruinar una medición en curso.
//
// Lee la deuda declarada por los trinquetes del app y la cruza con el libro de cambios
// (`docs/seo/experiments.json`). No toca la red, no toca Mongo y no escribe nada: imprime.
//
// Por qué existe y cuál es la regla: `classes/revenueplan/debtFree.ts`.
//
// QUÉ CUBRE. Los CINCO pozos de deuda de SEO del app, cada uno declarado como una lista en el
// trinquete que lo mide. Los dos últimos entraron el 2026-10-20 y son los que faltaban: las migas
// de `seoContract.test.ts` y los dos snippets pasados de `guideSnippetBudget.test.ts` declaraban un
// NÚMERO y nada más, así que este informe no los podía nombrar y la respuesta a «¿cuál puedo tocar
// hoy?» para esos tres pozos vivía en prosa, dentro del comentario de cada presupuesto y con fecha
// de vencimiento escrita a mano («las diez entran cuando su ventana cierre, la última el
// 2026-10-26»). La salida era reimplementar la cuenta acá, que es la segunda cuenta que se separa
// de la primera en silencio que este archivo existe para no hacer; la entrada fue la que el
// encabezado viejo pedía: que esos dos trinquetes declararan sus miembros como los otros tres. Lo
// hacen, y además los exigen EXACTOS, así que ahora el número no se puede compensar solo.
//
// Cada lista se lee como texto y no se copia, por lo que dice `classes/revenueplan/debtFree.ts`.
import fs from "fs";
import path from "path";

import { loadSpecs } from "../../classes/revenueplan/experiments";
import { DebtRoute, parseNumber, parseStringList, reserveReport } from "../../classes/revenueplan/debtFree";

const APP_TESTS = path.resolve(__dirname, "..", "..", "app", "tests", "unit");

/**
 * Los pozos de deuda, cada uno con el archivo que lo declara y cómo se lee.
 *
 * `budget` es el trinquete del propio archivo: se lee al lado de la lista para que el informe pueda
 * decir «19 de 19», y si alguna vez no coinciden es que el trinquete quedó flojo sobre la deuda
 * real, que es la holgura que `seoContract.test.ts` describe para el canonical en 23 sobre una
 * deuda de 0.
 */
const POOLS: Array<{
  pool: string;
  file: string;
  list: string;
  budget: string;
  /** De la entrada declarada a la ruta del sitio. Las guías se declaran por slug. */
  toRoute?: (value: string) => string;
}> = [
  {
    pool: "sin tema (raíz)",
    file: "temaHuerfanas.test.ts",
    list: "DEUDA_SIN_TEMA",
    budget: "DEUDA_MAXIMA",
  },
  {
    pool: "sin tema (guía)",
    file: "temaHuerfanas.test.ts",
    list: "GUIAS_SIN_TEMA",
    budget: "DEUDA_MAXIMA_GUIAS",
    toRoute: (slug) => `/guias/${slug}`,
  },
  {
    pool: "sin enlace de contexto",
    file: "enlacesDeContexto.test.ts",
    list: "DEUDA_SIN_ENLACE",
    budget: "DEUDA_MAXIMA",
  },
  {
    pool: "sin migas",
    file: "seoContract.test.ts",
    list: "DEUDA_SIN_MIGAS",
    budget: "BREADCRUMB_BUDGET",
  },
  {
    pool: "título pasado de 60",
    file: "guideSnippetBudget.test.ts",
    list: "DEUDA_TITULO_LARGO",
    budget: "TITLE_OVER_BUDGET",
    toRoute: (slug) => `/guias/${slug}`,
  },
  {
    pool: "descripción pasada de 155",
    file: "guideSnippetBudget.test.ts",
    list: "DEUDA_DESCRIPCION_LARGA",
    budget: "DESCRIPTION_OVER_BUDGET",
    toRoute: (slug) => `/guias/${slug}`,
  },
];

/** Hoy en UTC, o el día que pida `--today=YYYY-MM-DD` (para mirar la cola desde otra fecha). */
function resolveToday(): string {
  const asked = process.argv.find((arg) => arg.startsWith("--today="))?.slice("--today=".length);
  if (!asked) return new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(asked)) throw new Error(`--today tiene que ser YYYY-MM-DD, vino "${asked}"`);
  return asked;
}

function main(): void {
  const today = resolveToday();
  const { specs, problems, file } = loadSpecs();
  if (problems.length) {
    console.error("El libro de cambios tiene problemas; el informe no puede ser fiel:");
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exit(1);
  }
  console.log(`Libro de cambios: ${file} (${specs.length} filas)`);
  console.log(`Hoy: ${today}\n`);

  const items: DebtRoute[] = [];
  for (const spec of POOLS) {
    const source = fs.readFileSync(path.join(APP_TESTS, spec.file), "utf8");
    const declared = parseStringList(source, spec.list);
    const budget = parseNumber(source, spec.budget);
    console.log(`${spec.pool}: ${declared.length} de ${budget} (${spec.file} → ${spec.list})`);
    for (const value of declared) items.push({ pool: spec.pool, route: spec.toRoute ? spec.toRoute(value) : value });
  }

  const report = reserveReport(items, specs, today);
  const free = report.filter((row) => row.free);
  const reserved = report.filter((row) => !row.free);

  console.log(`\n=== LIBRE HOY (${free.length} de ${report.length}) ===`);
  if (!free.length) console.log("  nada: toda la deuda declarada está dentro de una ventana de medición abierta.");
  for (const row of free) console.log(`  ${row.route}  [${row.pool}]`);

  console.log(`\n=== RESERVADA (${reserved.length}) — primer día en que se puede declarar una fila ===`);
  let shown = "";
  for (const row of reserved) {
    if (row.freeOn !== shown) {
      console.log(`  --- ${row.freeOn} ---`);
      shown = row.freeOn;
    }
    console.log(`    ${row.route}  [${row.pool}]  la reserva: ${row.blockedBy.join(", ")}`);
  }
  console.log(
    "\nUna ruta libre acá NO es una mejora: sigue haciendo falta que el cambio le sirva a un lector.\n" +
      "Los cinco pozos con lista están contados; las dos deudas que no son de ruta (el título y la\n" +
      "descripción de una MISMA guía) salen como dos filas, porque se arreglan por separado."
  );
}

main();
