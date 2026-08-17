import { Schema } from "mongoose";
import { appModel } from "../appdb";

/**
 * One embedded slice of one page of cambio-uruguay.com.
 *
 * Lives in the APP database — that is the Mongo running on the same box the site is deployed to
 * (`APP_MONGO_URI` → localhost:27017 there), which is where the index was asked to live. It has no
 * mirror under `app/server/models`: nothing in the Nuxt app reads it, so `tests/appdb/
 * schema_parity.test.ts` has no pair to check. If a page ever surfaces this collection, add the
 * mirror and the parity assertion at the same time.
 *
 * `vector` is a Buffer of little-endian float32s, not an array of numbers. BSON stores every array
 * number as a 64-bit double plus per-element index overhead — a 768-dim vector costs ~13 KB that
 * way against 3 KB packed, i.e. ~70 MB versus ~16 MB for the whole index. The 16 MB version fits
 * comfortably in a cron process's heap; the other one is a document-size and RAM problem for no
 * gain, since nothing queries inside the vector.
 */
export interface RagChunkDoc {
  path: string;
  tier: "full" | "stub";
  chunkIndex: number;
  title: string;
  headingPath: string;
  text: string;
  contentHash: string;
  vector: Buffer;
  dims: number;
  model: string;
  lastmod: string;
  crawledAt: Date;
  embeddedAt: Date;
}

const RagChunkSchema = new Schema<RagChunkDoc>(
  {
    path: { type: String, required: true },
    tier: { type: String, default: "full" },
    chunkIndex: { type: Number, default: 0 },
    title: { type: String, default: "" },
    headingPath: { type: String, default: "" },
    text: { type: String, default: "" },
    contentHash: { type: String, default: "" },
    vector: { type: Buffer, required: true },
    dims: { type: Number, default: 0 },
    model: { type: String, default: "" },
    lastmod: { type: String, default: "" },
    crawledAt: { type: Date, default: () => new Date() },
    embeddedAt: { type: Date, default: () => new Date() },
  },
  { timestamps: true }
);

RagChunkSchema.index({ path: 1, chunkIndex: 1 }, { unique: true });
RagChunkSchema.index({ contentHash: 1 });

export const RagChunkModel = appModel<RagChunkDoc>("RagChunk", RagChunkSchema, "ragchunks");
