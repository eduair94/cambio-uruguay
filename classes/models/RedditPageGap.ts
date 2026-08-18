import { Schema } from "mongoose";
import { appModel } from "../appdb";

/**
 * Lo que a una página existente le faltó para contestar un hilo.
 *
 * El caso más común no es "no hay página": es "hay página y no dice esto". El primer comentario que
 * el bot publicó terminó admitiendo que no tenía datos sobre Monotributo Social MIDES, sobre una
 * página de facturación que existe y es buena. Ese faltante es información: alguien lo preguntó, y
 * si varios preguntan lo mismo sobre la misma página, la página tiene que crecer.
 *
 * Una fila por (página, hilo). El agrupado y la investigación viven en `classes/gaps/enrich.ts`.
 */
export interface RedditPageGapDoc {
  pagePath: string;
  postId: string;
  /** Qué pedía la pregunta que la página no contesta, en una frase. */
  missing: string;
  /** URLs que la investigación abrió para cubrirlo. Vacío = no encontró con qué sostenerlo. */
  findingsSources: string[];
  /** ¿La investigación consiguió texto verificado, o sólo detectó el faltante? */
  hadEvidence: boolean;
  /** Puesto cuando el faltante ya se publicó como ampliación de la página. */
  addendumAt: Date | null;
}

const RedditPageGapSchema = new Schema<RedditPageGapDoc>(
  {
    pagePath: { type: String, required: true },
    postId: { type: String, required: true },
    missing: { type: String, default: "" },
    findingsSources: { type: [String], default: [] },
    hadEvidence: { type: Boolean, default: false },
    addendumAt: { type: Date, default: null },
  },
  { timestamps: true }
);

RedditPageGapSchema.index({ pagePath: 1, postId: 1 }, { unique: true });
RedditPageGapSchema.index({ pagePath: 1, addendumAt: 1 });

export const RedditPageGapModel = appModel<RedditPageGapDoc>("RedditPageGap", RedditPageGapSchema, "redditpagegaps");
