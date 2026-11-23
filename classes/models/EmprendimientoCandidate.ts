// Backend-only (the app never reads it): the private memory of /emprendimientos-de-instagram-uruguay.
// One document per Instagram handle the job has heard of — its state, why, the sources that named
// it, the last good profile read and the classification. `dueAt` + `priority` are what the job
// queries to choose the next reads, so a run never loads the whole collection.
import { Schema } from "mongoose";
import { appModel } from "../appdb";
import type { Candidate } from "../emprendimientos/types";

const EmprendimientoCandidateSchema = new Schema(
  {
    handle: { type: String, required: true },
    state: { type: String, required: true },
    reason: { type: String, default: null },
    sources: { type: [Schema.Types.Mixed], default: [] },
    firstSeenAt: { type: String, required: true },
    profile: { type: Schema.Types.Mixed, default: null },
    lastReadAt: { type: String, default: null },
    lastReadStatus: { type: String, default: null },
    unreadableStreak: { type: Number, default: 0 },
    goneStreak: { type: Number, default: 0 },
    classification: { type: Schema.Types.Mixed, default: null },
    listedAt: { type: String, default: null },
    dueAt: { type: Date, required: true },
    priority: { type: Number, default: 9 },
  },
  { timestamps: true }
);

EmprendimientoCandidateSchema.index({ handle: 1 }, { unique: true });
EmprendimientoCandidateSchema.index({ dueAt: 1, priority: 1 });
EmprendimientoCandidateSchema.index({ state: 1 });

export type EmprendimientoCandidateDocument = Candidate & { dueAt: Date; priority: number };

export const EmprendimientoCandidateModel = appModel<EmprendimientoCandidateDocument>(
  "EmprendimientoCandidate",
  EmprendimientoCandidateSchema,
  "emprendimientocandidates"
);
