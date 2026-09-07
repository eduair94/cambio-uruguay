// Los precios oficiales del SIPC, todos los días, con el histórico que el
// Estado no guarda.
//
// `precios.gub.uy` responde 301 hacia `www.precios.uy`, así que la fuente es
// oficial (MEF / Área Defensa del Consumidor). Su API devuelve sólo el precio
// de hoy con su fecha: no hay endpoint de serie, y nadie publica la evolución.
// Este job es el archivo.
//
// Barre 215 × `compararArticulo` con bbox nacional. NO usa `compararCanasta`,
// que imputa —694 de 722 celdas con precio y sin fecha, el mismo `$509.32 (*)`
// en todos los locales para un artículo con 28 observaciones reales—: ver
// `classes/precios/parse.ts` y el tripwire en
// `tests/precios/no_imputed_endpoint.test.ts`.
//
// Propiedades que este job debe mantener:
//   * un artículo que no contesta degrada la corrida, nunca la falla;
//   * se niega a reemplazar un día bueno con una corrida flaca;
//   * nada se ordena por un total que no sea comparable entre locales.
import dotenv from "dotenv";
dotenv.config();

import { MongooseServer, withTimeout } from "./classes/database";
import { refreshPrecios } from "./classes/precios/refresh";

async function main(): Promise<void> {
  // Primero y obligatorio: `classes/precios/store.ts` se ata a la conexión
  // mongoose por defecto, que nadie abre solo. Sin esto cada escritura buffea
  // diez segundos y el job sale reportando éxito (ver
  // tests/sync/connect_tripwire.test.ts).
  try {
    await withTimeout(MongooseServer.startConnectionPromise(), 15_000);
  } catch (error) {
    console.error("[precios] sin conexión a Mongo:", error);
    process.exit(1);
  }

  const startedAt = Date.now();
  const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
  const limit = limitArg ? Number(limitArg.split("=")[1]) : undefined;

  const report = await refreshPrecios({ limit });

  console.log(
    `[precios] listo en ${Math.round((Date.now() - startedAt) / 1000)}s :: ` +
      `${report.articles} artículos, ${report.observations} observaciones, ${report.rejected} descartadas, ` +
      `${report.changes} cambios al ledger, ${report.qualifiedStores} locales con canasta calificada`
  );
  console.log(`[precios] índice :: ${report.indexReason}`);
  if (report.failures.length) console.log(`[precios] artículos sin respuesta: ${report.failures.join(", ")}`);

  // Una corrida que no pudo publicar es una corrida fallida aunque nada haya
  // tirado: pm2 no debe reportar éxito mientras el tablero envejece.
  process.exit(report.published ? 0 : 1);
}

main().catch((error) => {
  console.error("[precios] falló:", error);
  process.exit(1);
});
