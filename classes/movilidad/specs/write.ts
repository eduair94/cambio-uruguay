// Qué escribe una lectura de ficha en `movilidadspecs`. Puro, para que la regla que más importa
// tenga test: una lectura que NO trae ficha nunca borra la ficha buena que ya estaba guardada.
//
// Encontrado por la revisión final (3/11/2026): la primera versión escribía `specs: read.specs` en
// toda lectura buena, y `readFicha` contesta `ok: true, specs: null` cuando la página carga pero no
// se le entiende nada. Si ML cambia el marcado de su tabla o sirve una página reducida, cada relectura
// de 45 días habría borrado, de a 90 por hora y sin avisar, fichas que estaban bien.
import type { FichaRead, FichaTarget } from "./read";

export interface FichaUpdate {
  $set: Record<string, unknown>;
  $setOnInsert?: Record<string, unknown>;
  $inc?: Record<string, number>;
}

export function fichaUpdate(target: FichaTarget, read: FichaRead, triedAt: string): FichaUpdate {
  const base = { listingId: target.listingId, url: target.url, source: target.source, lastTriedAt: triedAt };
  if (read.ok && read.specs) {
    return {
      $set: {
        ...base,
        ok: true,
        gone: false,
        failures: 0,
        readAt: triedAt,
        specs: read.specs,
        brand: read.brand,
        model: read.model,
      },
    };
  }
  if (read.ok) {
    // La página se leyó pero no dijo nada: cuenta como leída (no vuelve a la cola por 45 días) y lo
    // que estaba guardado sigue ahí.
    return {
      $set: { ...base, ok: true, gone: false, failures: 0, readAt: triedAt },
      $setOnInsert: { specs: null, brand: null, model: null },
    };
  }
  return {
    $set: { ...base, ok: false, gone: read.gone },
    $setOnInsert: { specs: null, readAt: null },
    ...(read.gone ? {} : { $inc: { failures: 1 } }),
  };
}
