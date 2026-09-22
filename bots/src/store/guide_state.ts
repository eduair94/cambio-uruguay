// Qué guía del día sale en el próximo resumen diario.
//
// Es una copia deliberada de `promo_state.ts` con OTRA colección. La tentación
// era reusar `BotPromoPost` (misma forma, misma regla de "la menos reciente
// gana"), pero las dos colas se pisarían: el resumen de Telegram marcaría como
// recién posteada una página y la mandaría al fondo de la cola de X, y el tuit
// haría lo mismo al revés. Y agregarle un campo `channel` a `BotPromoPost` no es
// un cambio de código: su `slug` es `unique: true`, así que habría que tirar y
// rehacer un índice vivo en la Mongo del VPS. Una colección propia cuesta cero.
//
// Sin Mongo rota igual, por día (`dayIndex`), como el promotor: sin credenciales
// se degrada, nunca se rompe.
import mongoose, { Schema } from "mongoose";
import type { DailyGuide } from "../format/guides.js";
import { isMongoReady } from "./mongo.js";
import { dayIndex } from "./promo_state.js";

interface GuidePostDoc {
  slug: string;
  lastPostedAt: Date;
  count: number;
}

const guidePostSchema = new Schema<GuidePostDoc>({
  slug: { type: String, required: true, unique: true },
  lastPostedAt: { type: Date, default: () => new Date() },
  count: { type: Number, default: 0 },
});

/** Nombre de la colección, explícito para que el test lo compare con la del promotor de X. */
export const GUIDE_POSTS_COLLECTION = "botdailyguideposts";

export const GuidePostModel =
  mongoose.models.BotDailyGuidePost ||
  mongoose.model<GuidePostDoc>("BotDailyGuidePost", guidePostSchema, GUIDE_POSTS_COLLECTION);

/**
 * La guía que toca hoy, o `undefined` con catálogo vacío.
 *
 * Con Mongo: primero las que nunca salieron, después la más vieja; empate por
 * slug, para que dos procesos en carrera elijan la misma y el dedup diario haga
 * su trabajo. Sin Mongo: el cursor por día, que dentro del mismo día devuelve
 * siempre la misma entrada, así que un reintento no saltea ninguna.
 */
export async function pickNextGuide(guides: readonly DailyGuide[], now: Date = new Date()): Promise<DailyGuide | undefined> {
  if (guides.length === 0) return undefined;
  if (!isMongoReady()) {
    return guides[dayIndex(now) % guides.length];
  }
  const docs = await GuidePostModel.find({ slug: { $in: guides.map((g) => g.slug) } })
    .select({ slug: 1, lastPostedAt: 1 })
    .lean<{ slug: string; lastPostedAt: Date }[]>();
  const lastBySlug = new Map(docs.map((d) => [d.slug, new Date(d.lastPostedAt).getTime()]));
  return [...guides].sort((a, b) => {
    const at = lastBySlug.get(a.slug) ?? 0;
    const bt = lastBySlug.get(b.slug) ?? 0;
    return at - bt || a.slug.localeCompare(b.slug);
  })[0];
}

/** Deja constancia de que `slug` acaba de salir. No-op sin Mongo (el cursor por día lo cubre). */
export async function markGuidePosted(slug: string, now: Date = new Date()): Promise<void> {
  if (!isMongoReady()) return;
  await GuidePostModel.updateOne({ slug }, { $set: { lastPostedAt: now }, $inc: { count: 1 } }, { upsert: true });
}

export { dayIndex };
