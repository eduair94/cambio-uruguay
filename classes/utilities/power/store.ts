import { appConnection } from "../../appdb";
import type { PowerDayIncrement, PowerState } from "./ledger";

export const POWER_DAYS_COLLECTION = "poweroutagedays";
export const POWER_STATE_COLLECTION = "poweroutagestate";
const STATE_ID = "ute-ecse";

/** One document per ECSE zone and Montevideo day. Additive: every field is a sum except `customers`. */
export interface PowerDayDoc {
  _id: string;
  zone: string;
  day: string;
  name: string;
  type: PowerDayIncrement["type"];
  customers: number;
  coveredMinutes: number;
  unplannedCustomerMinutes: number;
  plannedCustomerMinutes: number;
  newIncidents: number;
  samples: number;
}

export interface PowerStore {
  readState(): Promise<PowerState | null>;
  writeState(state: PowerState): Promise<void>;
  addIncrements(increments: PowerDayIncrement[]): Promise<void>;
  prune(beforeDay: string): Promise<number>;
}

export function mongoPowerStore(): PowerStore {
  const days = () => appConnection().collection(POWER_DAYS_COLLECTION);
  const state = () => appConnection().collection(POWER_STATE_COLLECTION);
  return {
    async readState() {
      const doc = await state().findOne({ _id: STATE_ID as any }, { projection: { _id: 0 }, maxTimeMS: 5000 });
      return doc && typeof doc.observedAt === "string" && doc.zones ? { observedAt: doc.observedAt, zones: doc.zones } : null;
    },
    async writeState(value) {
      await state().replaceOne({ _id: STATE_ID as any }, { _id: STATE_ID, ...value }, { upsert: true });
    },
    async addIncrements(increments) {
      if (!increments.length) return;
      await days().bulkWrite(increments.map(item => ({
        updateOne: {
          filter: { _id: `${item.zone}|${item.day}` as any },
          update: {
            $set: { zone: item.zone, day: item.day, name: item.name, type: item.type },
            $max: { customers: item.customers },
            $inc: {
              coveredMinutes: item.coveredMinutes, unplannedCustomerMinutes: item.unplannedCustomerMinutes,
              plannedCustomerMinutes: item.plannedCustomerMinutes, newIncidents: item.newIncidents, samples: item.samples,
            },
          },
          upsert: true,
        },
      })), { ordered: false });
    },
    async prune(beforeDay) {
      const result = await days().deleteMany({ day: { $lt: beforeDay } });
      return result.deletedCount || 0;
    },
  };
}

/** Every day document on or after `fromDay`, projected for the zone job. */
export async function readPowerDays(fromDay: string): Promise<PowerDayDoc[]> {
  return await appConnection().collection(POWER_DAYS_COLLECTION)
    .find({ day: { $gte: fromDay } }, { maxTimeMS: 30_000 }).limit(200_000).toArray() as unknown as PowerDayDoc[];
}
