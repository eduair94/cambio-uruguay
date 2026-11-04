// La escritura del catálogo de modelos: un upsert por slug con la serie diaria mezclada.
//
// Un modelo que deja de verse NO se borra: conserva su documento con su `lastSeen` viejo, y la API
// deja de servirlo a los 7 días (`MONOPATIN_MODEL_STALE_DAYS` en app/utils/monopatinModelos.ts). Así
// un aviso que vuelve no le cambia la URL a nadie y una corrida mala no tumba páginas.
//
// Pero mientras tanto queda RETIRADO (revisión final, 4/11): sin esto, un modelo cuya clave cambió
// (llegó la ficha de "Enxuta 45 Meenx552n" y pasó a `enxuta-meenx552n`) seguía 7 días en la tabla del
// hub, en el sitemap y como "Comparalo con" de su propio gemelo, con precios viejos.
import { mergeHistory, type ModelHistoryPoint, type MovilidadModelDoc } from "./build";

/** Los modelos frescos que esta corrida no armó: fuera de la tabla, del sitemap y de los hermanos. */
export function modelsRetireWrite(builtSlugs: string[], freshFloor: string) {
  return {
    updateMany: {
      filter: { slug: { $nin: builtSlugs }, retired: { $ne: true }, lastSeen: { $gte: freshFloor } },
      update: { $set: { retired: true, indexable: false } },
    },
  };
}

export function modelsWrites(models: MovilidadModelDoc[], prevHistory: Map<string, ModelHistoryPoint[]>) {
  return models.map((model) => ({
    updateOne: {
      filter: { slug: model.slug },
      update: { $set: { ...model, history: mergeHistory(prevHistory.get(model.slug), model) } },
      upsert: true,
    },
  }));
}
