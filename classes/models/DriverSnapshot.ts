// Mirror of app/server/models/DriverSnapshot.ts, bound to the APP's Mongo (classes/appdb.ts).
// READ-ONLY from the backend's side: nitro's drivers:daily task still writes this collection (it
// is not Gemini — see Task 9's surgery note in the migration plan), the backend only reads it to
// build attribution for move explanations.
import { Schema } from "mongoose";
import { appModel } from "../appdb";

export interface DriverSnapshotDoc {
  date: string; // 'YYYY-MM-DD' America/Montevideo
  values: Map<string, number>;
}

const DriverSnapshotSchema = new Schema<DriverSnapshotDoc>(
  {
    date: { type: String, required: true, unique: true, index: true },
    values: { type: Map, of: Number, default: {} },
  },
  { timestamps: true }
);

export const DriverSnapshotModel = appModel<DriverSnapshotDoc>(
  "DriverSnapshot",
  DriverSnapshotSchema,
  "driversnapshots"
);
