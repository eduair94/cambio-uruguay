// La escritura del catálogo de modelos: un upsert por slug con la serie diaria mezclada.
//
// Un modelo que deja de verse NO se borra: conserva su documento con su `lastSeen` viejo, y la API
// deja de servirlo a los 7 días (`MONOPATIN_MODEL_STALE_DAYS` en app/utils/monopatinModelos.ts). Así
// un aviso que vuelve no le cambia la URL a nadie y una corrida mala no tumba páginas.
import { mergeHistory, type ModelHistoryPoint, type MovilidadModelDoc } from "./build";

export function modelsWrites(models: MovilidadModelDoc[], prevHistory: Map<string, ModelHistoryPoint[]>) {
  return models.map((model) => ({
    updateOne: {
      filter: { slug: model.slug },
      update: { $set: { ...model, history: mergeHistory(prevHistory.get(model.slug), model) } },
      upsert: true,
    },
  }));
}
