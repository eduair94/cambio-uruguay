// Un documento vivo, upserted. La cola se recalcula entera en cada corrida y nada de lo que guarda
// es irrecuperable: el autocompletado se puede volver a pedir cualquier día.
//
// La guarda es la misma que aprendieron los otros jobs de este repo: una corrida que vuelve vacía
// es el autocompletado caído o el filtro roto, no un día sin demanda. Antes que pisar una cola
// buena con una vacía, se conserva la anterior.
import { SearchDemandQueueModel } from "../models/SearchDemandQueue";
import type { DemandQueue } from "./refresh";

export const DEMAND_QUEUE_KEY = "demand_queue";

export async function loadDemandQueue(): Promise<DemandQueue | null> {
  return SearchDemandQueueModel.findOne({ key: DEMAND_QUEUE_KEY }).lean<DemandQueue>().exec();
}

/** True cuando escribir esto perdería una cola buena. */
export async function queueWouldRegress(next: DemandQueue): Promise<boolean> {
  if (next.items.length) return false;
  const previous = await loadDemandQueue();
  return !!previous && previous.items.length > 0;
}

export async function saveDemandQueue(queue: DemandQueue): Promise<void> {
  await SearchDemandQueueModel.updateOne(
    { key: DEMAND_QUEUE_KEY },
    { $set: { ...queue, key: DEMAND_QUEUE_KEY } },
    { upsert: true }
  );
}
