// Los modelos de Mongo (base del backend, `MONGODB_URI`) de las claves de API y del uso diario.
// Separado de store.ts para que los tests no importen mongoose: el store recibe el modelo.
import { MongooseServer, Schema } from "../database";
import { createKeyStore, type KeyModel, type KeyStore } from "./store";
import { usageUpsertOps, type UsageDaysRepo, type UsageRow } from "./usage";

const keySchema = new Schema(
  {
    keyHash: { type: String, required: true, unique: true },
    prefix: String,
    label: String,
    ownerUid: { type: String, index: true },
    ownerEmail: String,
    company: String,
    useCase: String,
    website: String,
    plan: String,
    limits: Schema.Types.Mixed,
    status: String,
    createdAt: Date,
    revokedAt: Date,
    lastUsedAt: Date,
    notes: String,
  },
  { collection: "api_keys", versionKey: false }
);

const usageSchema = new Schema(
  { day: String, client: String, route: String, count: Number },
  { collection: "api_usage_days", versionKey: false }
);
usageSchema.index({ day: 1, client: 1, route: 1 }, { unique: true });
usageSchema.index({ client: 1, day: 1 });

let keyStore: KeyStore | null = null;

export function apiKeyStore(): KeyStore {
  if (!keyStore) {
    const model = MongooseServer.getInstance("api_keys", keySchema).getModel();
    keyStore = createKeyStore(model as unknown as KeyModel);
  }
  return keyStore;
}

export function usageDaysRepo(): UsageDaysRepo {
  const model = MongooseServer.getInstance("api_usage_days", usageSchema).getModel();
  return {
    async upsertDay(day: string, rows: UsageRow[]) {
      if (!rows.length) return 0;
      await model.bulkWrite(usageUpsertOps(day, rows) as any[], { ordered: false });
      return rows.length;
    },
    async readRange(from: string, to: string, clients?: string[]) {
      const filter: Record<string, unknown> = { day: { $gte: from, $lte: to } };
      if (clients) filter.client = { $in: clients };
      const docs = await model.find(filter, { _id: 0, day: 1, client: 1, route: 1, count: 1 }).lean();
      return (docs as any[]).map((d) => ({ day: d.day, client: d.client, route: d.route, count: Number(d.count) || 0 }));
    },
  };
}
