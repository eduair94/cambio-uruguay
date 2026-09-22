// Puente de una sola vez: le pone `listingId` a las ofertas YA publicadas de celulares, equipar y
// movilidad, cruzándolas por URL contra `pricewatchoffers`.
//
// Por qué hace falta: la ficha cruza cada oferta con su historial por el id del aviso, y esos tres
// catálogos no lo guardaban. Los jobs ya lo escriben desde el 2026-09-22, pero recién lo aplican en su
// próxima corrida diaria (14:29, 12:47 y 15:33 UTC), así que hasta entonces la variación por oferta no
// se podía mostrar. Esto lo adelanta SIN volver a raspar nada: la URL de la oferta publicada es la
// misma que `pricewatchoffers` ya guardó junto al id.
//
// No toca sillas (sus ofertas ya traen `id`) ni ningún precio: sólo agrega un campo que faltaba.
//
//   npm run backfill_offer_listing_ids -- --dry-run
import dotenv from "dotenv";
dotenv.config();
dotenv.config({ path: "app/.env" });

import { appConnection, appDbConfigured } from "../../classes/appdb";

interface Target {
  collection: string;
  vertical: string;
  /** Dónde viven las ofertas dentro del documento. */
  paths: ("offers" | "products")[];
}

const TARGETS: Target[] = [
  { collection: "phonemodels", vertical: "celulares", paths: ["offers"] },
  { collection: "equiparitems", vertical: "equipar", paths: ["offers", "products"] },
  { collection: "movilidaditems", vertical: "movilidad", paths: ["offers", "products"] },
];

async function urlIndex(vertical: string): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const cursor = appConnection()
    .collection("pricewatchoffers")
    .find({ vertical }, { projection: { _id: 0, listingId: 1, url: 1 }, batchSize: 1000 });
  for await (const row of cursor) {
    const url = typeof row.url === "string" ? row.url : "";
    const listingId = typeof row.listingId === "string" ? row.listingId : "";
    // Una URL repetida entre dos avisos (mismo producto, dos publicaciones) se deja fuera: sin poder
    // decidir cuál es, es mejor no ponerle ninguna que ponerle la del otro.
    if (!url || !listingId) continue;
    if (map.has(url) && map.get(url) !== listingId) map.set(url, "");
    else map.set(url, listingId);
  }
  for (const [url, id] of [...map]) if (!id) map.delete(url);
  return map;
}

async function run(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  process.env.APP_MONGO_URI = process.env.APP_MONGO_URI || process.env.MONGO_URI;
  if (!appDbConfigured()) {
    console.error("[backfill-ids] falta APP_MONGO_URI/MONGO_URI");
    process.exit(1);
  }
  // `collection().find()` del driver es SÍNCRONO y mongoose lo rechaza hasta que la conexión está
  // abierta ("Collection method find is synchronous"). Los jobs no lo notan porque su primera lectura
  // va por un Model, que sí espera; acá la primera es cruda.
  await appConnection().asPromise();

  for (const target of TARGETS) {
    const index = await urlIndex(target.vertical);
    const collection = appConnection().collection(target.collection);
    let docs = 0;
    let filled = 0;
    let missing = 0;
    const ops: any[] = [];

    const cursor = collection.find({}, { batchSize: 200 });
    for await (const doc of cursor) {
      docs += 1;
      let touched = false;
      const set: Record<string, unknown> = {};

      const fill = (offers: any[], prefix: string) => {
        offers.forEach((offer, index2) => {
          if (!offer || typeof offer !== "object") return;
          if (typeof offer.listingId === "string" && offer.listingId) return;
          const listingId = index.get(typeof offer.url === "string" ? offer.url : "");
          if (!listingId) {
            missing += 1;
            return;
          }
          set[`${prefix}${index2}.listingId`] = listingId;
          filled += 1;
          touched = true;
        });
      };

      for (const path of target.paths) {
        if (path === "offers") fill(Array.isArray(doc.offers) ? doc.offers : [], "offers.");
        else
          (Array.isArray(doc.products) ? doc.products : []).forEach((product: any, index2: number) =>
            fill(Array.isArray(product?.offers) ? product.offers : [], `products.${index2}.offers.`)
          );
      }

      if (touched) ops.push({ updateOne: { filter: { _id: doc._id }, update: { $set: set } } });
      if (ops.length >= 500 && !dryRun) {
        await collection.bulkWrite(ops.splice(0), { ordered: false });
      }
    }
    if (ops.length && !dryRun) await collection.bulkWrite(ops, { ordered: false });

    console.log(
      `[backfill-ids] ${target.collection}: ${docs} documentos, ${filled} ofertas con id nuevo, ` +
        `${missing} sin coincidencia por URL${dryRun ? " (dry-run, no se escribió)" : ""}`
    );
  }

  await appConnection().close();
  process.exit(0);
}

run().catch((error) => {
  console.error("[backfill-ids] falló", error);
  process.exit(1);
});
