// Espejo de app/server/models/CharruaText.ts sobre la base del APP (classes/appdb.ts). Un doc por
// post o comentario clasificado de r/CharruaDevs; lo lee el buscador de /mercado-it-uruguay.
// Sin autores a propósito. `createdAt` es la fecha de Reddit, no un timestamp de mongoose.
//
// Los índices viven acá y no en el app: el job los crea (`ensureIndexes`), el app arranca con
// `autoIndex: false` para no construir un índice de texto sobre 150k documentos en cada deploy.
import { Schema } from "mongoose";
import { appModel } from "../appdb";
import type { CharruaText } from "../charruadevs/types";

const CharruaTextSchema = new Schema(
  {
    rid: { type: String, required: true },
    kind: { type: String, required: true },
    thread: { type: String, required: true },
    title: { type: String, default: "" },
    body: { type: String, default: "" },
    createdAt: { type: Date, required: true },
    month: { type: String, required: true },
    score: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    flair: { type: String, default: null },
    rel: { type: Boolean, default: false },
    stance: { type: Number, default: null },
    themes: { type: [String], default: [] },
    ai: { type: String, default: null },
    event: { type: String, default: "ninguno" },
    persona: { type: String, default: null },
    gone: { type: Boolean, default: false },
    url: { type: String, default: "" },
    model: { type: String, default: "" },
  },
  { versionKey: false }
);

CharruaTextSchema.index({ rid: 1 }, { unique: true });
CharruaTextSchema.index({ createdAt: -1 });
CharruaTextSchema.index({ rel: 1, gone: 1, stance: 1, createdAt: -1 });
CharruaTextSchema.index({ themes: 1, createdAt: -1 });
CharruaTextSchema.index({ kind: 1, month: 1 });
CharruaTextSchema.index(
  { title: "text", body: "text" },
  { weights: { title: 2, body: 1 }, default_language: "spanish", name: "text_es" }
);

export const CharruaTextModel = appModel<CharruaText>("CharruaText", CharruaTextSchema, "charruadevstexts");
