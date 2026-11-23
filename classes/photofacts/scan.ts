// La cola de la corrida, leída por tandas: un cursor sobre la base que corta apenas junta lo que la
// corrida puede mirar. Nunca se cargan las ~73.000 propiedades de alquiler con sus galerías enteras
// (la proyección de galerías ya tumbó la memoria del sitio una vez: docs/app/RENTALS.md).
import { appConnection } from "../appdb";
import { SALE_CATALOG_COLLECTION } from "../propertysales/store";
import { PHOTO_FACTS_SCHEMA_VERSION } from "./schema";
import { loadStates, type StoredStateWithFailures } from "./store";
import {
  OFFER_STALE_DAYS,
  RENTAL_PHOTO_SOURCES,
  SALE_PHOTO_SOURCES,
  orderSubjects,
  rentalSubjects,
  saleSubjects,
  type PhotoSubject,
} from "./subjects";

const BATCH = 300;

const RENTAL_PROJECTION = {
  key: 1,
  department: 1,
  propertyType: 1,
  freshAt: 1,
  "offers.source": 1,
  "offers.listingId": 1,
  "offers.image": 1,
  "offers.details.images": 1,
  "offers.lastSeen": 1,
  "offers.firstSeen": 1,
  "offers.sellerName": 1,
  "offers.agency.key": 1,
};

const SALE_PROJECTION = {
  key: 1,
  id: 1,
  listingId: 1,
  source: 1,
  department: 1,
  propertyType: 1,
  image: 1,
  images: 1,
  sellerName: 1,
  "agency.key": 1,
  publishedAt: 1,
  firstSeen: 1,
  lastSeen: 1,
};

interface Pass {
  name: string;
  collection: string;
  filter: Record<string, unknown>;
  sort: Record<string, 1 | -1>;
  projection: Record<string, number>;
  toSubjects: (docs: unknown[]) => PhotoSubject[];
}

function passes(now: Date): Pass[] {
  const cutoff = new Date(now.getTime() - OFFER_STALE_DAYS * 86_400_000).toISOString();
  const rentals = (department: unknown): Pass => ({
    name: `alquileres ${typeof department === "string" ? department : "resto"}`,
    collection: "rentallistings",
    filter: { department, lastSeen: { $gte: cutoff }, sources: { $in: [...RENTAL_PHOTO_SOURCES] } },
    sort: { freshAt: -1, key: 1 },
    projection: RENTAL_PROJECTION,
    toSubjects: docs => rentalSubjects(docs, now),
  });
  const sales = (department: unknown): Pass => ({
    name: `ventas ${typeof department === "string" ? department : "resto"}`,
    collection: SALE_CATALOG_COLLECTION,
    filter: { department, source: { $in: [...SALE_PHOTO_SOURCES] } },
    sort: { firstSeen: -1, key: 1 },
    projection: SALE_PROJECTION,
    toSubjects: docs => saleSubjects(docs),
  });
  return [rentals("Montevideo"), sales("Montevideo"), rentals({ $ne: "Montevideo" }), sales({ $ne: "Montevideo" })];
}

/**
 * Hasta `want` avisos para mirar, en el orden de la corrida, con el estado guardado de cada uno (la
 * cantidad de fallas previas decide la espera de la próxima).
 */
export async function collectSubjects(
  now: Date,
  want: number,
): Promise<{ subjects: PhotoSubject[]; states: Map<string, StoredStateWithFailures>; scanned: Record<string, number> }> {
  const subjects: PhotoSubject[] = [];
  const states = new Map<string, StoredStateWithFailures>();
  const scanned: Record<string, number> = {};
  const taken = new Set<string>();
  for (const pass of passes(now)) {
    if (subjects.length >= want) break;
    scanned[pass.name] = 0;
    const cursor = appConnection()
      .collection(pass.collection)
      .find(pass.filter, { projection: pass.projection, sort: pass.sort, batchSize: BATCH, maxTimeMS: 60_000, allowDiskUse: true });
    try {
      let batch: unknown[] = [];
      const flush = async (): Promise<void> => {
        const found = pass.toSubjects(batch);
        batch = [];
        const known = await loadStates(found.map(subject => subject.id));
        for (const subject of orderSubjects(found, known, now, PHOTO_FACTS_SCHEMA_VERSION)) {
          if (subjects.length >= want || taken.has(subject.id)) continue;
          taken.add(subject.id);
          subjects.push(subject);
          const state = known.get(subject.id);
          if (state) states.set(subject.id, state);
        }
      };
      for await (const doc of cursor) {
        scanned[pass.name]++;
        batch.push(doc);
        if (batch.length >= BATCH) {
          await flush();
          if (subjects.length >= want) break;
        }
      }
      if (batch.length && subjects.length < want) await flush();
    } finally {
      await cursor.close().catch(() => undefined);
    }
  }
  return { subjects, states, scanned };
}
