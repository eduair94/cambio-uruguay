import { Schema } from "mongoose";
import { appModel } from "../appdb";
import type { UsageInsightDay } from "../insights/types";

// Vive en la base del APP. Un documento compacto por DÍA DE DATOS (Montevideo), escrito por
// `currency-usage-insights` con `$set` por fuente (`sources.<id>`), así una fuente que falla nunca borra
// lo que otra (u otra corrida del mismo día) ya escribió.
//
// Es el ARCHIVO de dos fuentes que olvidan: Clarity sólo devuelve los últimos 3 días y Cloudflare RUM
// muestrea los días de más de una semana. Sólo backend: ninguna ruta del app lo lee, y por eso no tiene
// espejo en app/server/models.
const UsageInsightDaySchema = new Schema(
  {
    day: { type: String, required: true },
    schemaVersion: { type: Number, default: 1 },
    sources: { type: Schema.Types.Mixed, default: {} },
    signals: { type: [Schema.Types.Mixed], default: [] },
  },
  { timestamps: true, minimize: false }
);

UsageInsightDaySchema.index({ day: 1 }, { unique: true });

export const UsageInsightDayModel = appModel<UsageInsightDay>("UsageInsightDay", UsageInsightDaySchema, "usageinsightdays");
