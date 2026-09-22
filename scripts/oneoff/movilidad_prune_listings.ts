// Relee cada aviso guardado de `movilidadlistings` contra el registro de HOY y borra los que hoy
// no entrarían.
//
// Para qué: la regla de "una pieza que abre el título no es un vehículo" (22/9/2026,
// `classes/movilidad/registry.ts`) saca doce pantallas LCD, palancas de freno y kits que la primera
// corrida publicada había guardado. Un aviso que deja de clasificar simplemente no se vuelve a
// escribir, así que se iría solo: sale de la ventana que sirve la API a los 4 días y de la
// colección a los 30. Este script existe para no esperar esos 4 días con una pantalla de $ 2.958
// encabezando "las ofertas más baratas".
//
// Es seguro correrlo cuando sea: nunca toca una fila que sigue pasando el filtro. Por defecto sólo
// informa; borra con `--apply`.
import dotenv from "dotenv";
dotenv.config();
dotenv.config({ path: "app/.env" });

import { categoryFor } from "../../classes/equipar/classify";
import { MOVILIDAD_CATEGORIES } from "../../classes/movilidad/registry";
import { MovilidadListingModel } from "../../classes/models/MovilidadListing";
import { appConnection, appDbConfigured } from "../../classes/appdb";

async function main(): Promise<void> {
  if (!process.env.APP_MONGO_URI && process.env.MONGO_URI) {
    process.env.APP_MONGO_URI = process.env.MONGO_URI;
  }
  if (!appDbConfigured()) {
    throw new Error("[movilidad] falta APP_MONGO_URI/MONGO_URI");
  }
  const apply = process.argv.includes("--apply");

  const rows = (await MovilidadListingModel.find({})
    .select({ listingId: 1, title: 1, category: 1, priceUyu: 1 })
    .lean()) as unknown as Array<{ listingId: string; title: string; category: string; priceUyu: number }>;

  const rejected = rows.filter((row) => !categoryFor(row.title, "", MOVILIDAD_CATEGORIES));
  console.log(`[movilidad] ${rejected.length} de ${rows.length} avisos ya no clasifican con el registro de hoy`);
  for (const row of rejected.sort((a, b) => a.priceUyu - b.priceUyu).slice(0, 40)) {
    console.log(`  ${String(Math.round(row.priceUyu)).padStart(8)}  ${row.category}  ${row.title.slice(0, 80)}`);
  }

  if (!apply) {
    console.log("[movilidad] simulación: nada borrado. Corré con --apply para borrarlos.");
  } else if (rejected.length) {
    const result = await MovilidadListingModel.deleteMany({
      listingId: { $in: rejected.map((row) => row.listingId) },
    });
    console.log(`[movilidad] borrados ${result.deletedCount ?? 0}`);
  }

  await appConnection().close().catch(() => undefined);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
