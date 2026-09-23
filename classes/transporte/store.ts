// Dónde se guarda el snapshot del comparador, y las dos guardas que deciden si se guarda.
//
// APP DB `transportsnapshots`, un solo documento `slug: "current"`. La página lo lee entero en cada
// carga (0,35 MB medidos con 68 zonas y cuatro modos), así que no hay historial: es una foto, y
// todo lo que tiene se puede volver a calcular mañana.
import { TransportSnapshotModel } from "../models/TransportSnapshot";
import type { TransportSnapshot } from "./types";

export const TRANSPORT_SNAPSHOT_SLUG = "current";

/**
 * Una corrida que ruteó menos de esta fracción de lo que había guardado no pisa la anterior.
 *
 * Es la misma guarda que tienen equipar, celulares y movilidad, y por el mismo motivo: un ruteador
 * caído o un dataset que la Intendencia republica a medias produce una corrida técnicamente exitosa
 * y sustancialmente vacía. Publicar eso borra una comparación correcta de ayer por una peor de hoy.
 */
export const THIN_RUN_FLOOR = 0.6;

export async function loadTransportSnapshot(): Promise<TransportSnapshot | null> {
  const doc = await TransportSnapshotModel.findOne({ slug: TRANSPORT_SNAPSHOT_SLUG }).lean();
  return (doc as TransportSnapshot | null) ?? null;
}

export interface SaveResult {
  saved: boolean;
  reason: string;
  previousRoutes: number;
  previousTransit: number;
}

/**
 * Guarda el snapshot si la corrida no es flaca.
 *
 * Las dos mitades se miden por separado a propósito: la matriz de rutas y los viajes en ómnibus
 * vienen de fuentes distintas (un ruteador y los datos abiertos de la Intendencia) y se caen por
 * separado. Que una esté floja no dice nada de la otra, así que una corrida con rutas nuevas y
 * ómnibus viejo es una corrida buena y se publica.
 */
export async function saveTransportSnapshot(
  snapshot: TransportSnapshot,
  options: { force?: boolean } = {}
): Promise<SaveResult> {
  const previous = await loadTransportSnapshot().catch(() => null);
  const previousRoutes = previous?.routes?.length ?? 0;
  const previousTransit = previous?.transit?.length ?? 0;

  if (!options.force && previousRoutes > 0) {
    const routesRatio = snapshot.routes.length / previousRoutes;
    const transitRatio = previousTransit > 0 ? snapshot.transit.length / previousTransit : 1;
    if (routesRatio < THIN_RUN_FLOOR && transitRatio < THIN_RUN_FLOOR) {
      return {
        saved: false,
        reason: `corrida flaca: ${snapshot.routes.length} rutas contra ${previousRoutes} y ${snapshot.transit.length} viajes contra ${previousTransit}`,
        previousRoutes,
        previousTransit,
      };
    }
    // Una sola mitad flaca NO cancela la corrida: se conserva la mitad vieja, con su fecha.
    if (routesRatio < THIN_RUN_FLOOR && previous) {
      snapshot.routes = previous.routes;
      snapshot.coverage.notes.push(
        `Las rutas son de la corrida anterior (${previous.coverage?.matrixBuiltAt ?? "sin fecha"}): hoy el ruteador devolvió muy poco.`
      );
      snapshot.coverage.matrixBuiltAt = previous.coverage?.matrixBuiltAt ?? null;
      snapshot.coverage.router = previous.coverage?.router ?? null;
    }
    if (transitRatio < THIN_RUN_FLOOR && previous) {
      snapshot.transit = previous.transit;
      snapshot.coverage.notes.push(
        "Los viajes en ómnibus son de la corrida anterior: hoy los datos del STM vinieron incompletos."
      );
    }
  }

  await TransportSnapshotModel.updateOne(
    { slug: TRANSPORT_SNAPSHOT_SLUG },
    { $set: { ...snapshot, slug: TRANSPORT_SNAPSHOT_SLUG } },
    { upsert: true }
  );

  return { saved: true, reason: "ok", previousRoutes, previousTransit };
}
