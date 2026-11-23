// La clasificación de cada cuenta leída: ¿es un emprendimiento?, ¿uruguayo?, ¿de qué rubro?, una
// oración que lo describa. Créditos de Claude primero y Gemini de respaldo (`classes/llm.ts`), de a
// ocho cuentas por llamada.
//
// La IA describe, no inventa: el resumen sale sólo del nombre, la bio y lo que Instagram dice de
// las fotos, y todo lo que contesta se valida contra listas cerradas — un rubro, un tipo o un
// departamento fuera de la lista se descarta y la cuenta queda sin clasificar (se reintenta en la
// próxima corrida). La decisión de publicar NO es de la IA: ver `decide.ts`.
import crypto from "crypto";
import { askJSON, llmConfigured, preferredLlmModel } from "../llm";
import { DEPARTAMENTOS, isDepartamento, isRubro, RUBROS } from "./taxonomy";
import { ENVIOS, OFRECE, TIPOS, URUGUAYA, type Classification, type ProfileRead, type SourceRef } from "./types";

export const CLASSIFY_BATCH = 8;
/** Días tras los que una cuenta se reclasifica aunque su bio no haya cambiado. */
export const RECLASSIFY_DAYS = 60;

export function classificationInputHash(profile: Pick<ProfileRead, "fullName" | "biography">): string {
  return crypto.createHash("sha1").update(`${profile.fullName}\n${profile.biography}`).digest("hex").slice(0, 16);
}

/** ¿Hace falta (re)clasificar esta cuenta con este perfil? */
export function needsClassification(previous: Classification | null, profile: ProfileRead, now: Date): boolean {
  if (!previous) return true;
  if (previous.inputHash !== classificationInputHash(profile)) return true;
  return now.getTime() - Date.parse(previous.at) > RECLASSIFY_DAYS * 86_400_000;
}

const SCHEMA = {
  type: "object",
  properties: {
    cuentas: {
      type: "array",
      items: {
        type: "object",
        properties: {
          handle: { type: "string" },
          tipo: { type: "string", enum: [...TIPOS] },
          uruguaya: { type: "string", enum: [...URUGUAYA] },
          rubro: { type: "string", enum: RUBROS.map(r => r.slug) },
          etiquetas: { type: "array", items: { type: "string" } },
          resumen: { type: "string" },
          ofrece: { type: "string", enum: [...OFRECE] },
          envios: { type: "string", enum: [...ENVIOS] },
          departamento: { type: "string", enum: ["ninguno", ...DEPARTAMENTOS.map(d => d.slug)] },
          barrio: { type: "string" },
          raro: { type: "boolean" },
          riesgo: { type: "string" },
        },
        required: ["handle", "tipo", "uruguaya", "rubro", "etiquetas", "resumen", "ofrece", "envios", "departamento", "barrio", "raro", "riesgo"],
      },
    },
  },
  required: ["cuentas"],
} as const;

const SYSTEM = [
  "Clasificás cuentas de Instagram para un directorio de emprendimientos uruguayos que venden por Instagram.",
  "Usá SÓLO lo que dice cada cuenta: nombre, biografía, enlaces y la descripción automática de sus fotos. No inventes nada.",
  "tipo: 'emprendimiento' = un negocio chico o mediano que vende productos o servicios (aunque tenga web o local).",
  "'marca-grande' = cadena, empresa conocida, franquicia o marca internacional. 'personal' = una persona, un influencer, un creador de contenido o una cuenta sin nada a la venta.",
  "'medio-o-comunidad' = medio, noticias, memes, comunidad, red o agenda de emprendedores, feria. 'tienda-colectiva' = una tienda que reúne a muchas marcas.",
  "'otro' = equipos (deportivos o de facultad), clubes, instituciones, ONG, partidos, colegios y universidades: no venden nada aunque tengan seguidores.",
  "uruguaya: 'si' sólo si algo del texto lo indica (ciudad, barrio o departamento uruguayo, 🇺🇾, +598, envíos en Uruguay, pesos uruguayos). 'no' si indica otro país. 'dudoso' si no se sabe.",
  "rubro: elegí el que mejor describe lo que vende. etiquetas: hasta 5 productos concretos que vende, en minúscula y en singular (ej. 'torta', 'mate', 'tote bag').",
  "resumen: una oración en castellano rioplatense, de 8 a 18 palabras, que diga qué vende o hace, sin adjetivos de elogio ni signos de exclamación ni emojis. No repitas el nombre de la cuenta.",
  "envios: 'todo-el-pais' si dice que envía a todo Uruguay o al interior; 'local' si dice sólo retiro, delivery en una zona o una ciudad; si no, 'no-dice'.",
  "departamento: el departamento uruguayo que nombra (slug), o 'ninguno'. barrio: el barrio o la ciudad que nombra, o cadena vacía.",
  "raro: true sólo si lo que vende es poco común o sorprendente (tarjetas pop-up 3D, figuras pintadas a mano a pedido, terrarios); false para tortas, ropa, uñas, bijou y lo habitual.",
  "riesgo: si vende préstamos, inversiones, cripto, trading, apuestas, réplicas o falsificaciones, seguidores, medicamentos, armas, contenido adulto, tabaco, vapeadores, cannabis, growshop o artículos para fumar, o 'oportunidades de negocio' multinivel, escribí cuál; si no, cadena vacía.",
].join("\n");

interface RawItem {
  handle?: unknown;
  tipo?: unknown;
  uruguaya?: unknown;
  rubro?: unknown;
  etiquetas?: unknown;
  resumen?: unknown;
  ofrece?: unknown;
  envios?: unknown;
  departamento?: unknown;
  barrio?: unknown;
  raro?: unknown;
  riesgo?: unknown;
}

const oneOf = <T extends string>(list: readonly T[], value: unknown): T | null => (typeof value === "string" && (list as readonly string[]).includes(value) ? (value as T) : null);

const cleanText = (value: unknown, max: number): string =>
  typeof value === "string"
    ? value
        .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, "")
        .replace(/!+/g, ".")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, max)
    : "";

/** La respuesta de la IA para una cuenta → una clasificación válida, o null si algo no valida. */
export function validateItem(raw: RawItem, inputHash: string, model: string, at: string): Classification | null {
  const tipo = oneOf(TIPOS, raw.tipo);
  const uruguaya = oneOf(URUGUAYA, raw.uruguaya);
  const ofrece = oneOf(OFRECE, raw.ofrece);
  const envios = oneOf(ENVIOS, raw.envios);
  if (!tipo || !uruguaya || !ofrece || !envios || !isRubro(raw.rubro)) return null;
  const resumen = cleanText(raw.resumen, 180).replace(/\.$/, "");
  const etiquetas = (Array.isArray(raw.etiquetas) ? raw.etiquetas : [])
    .map(tag => cleanText(tag, 30).toLowerCase())
    .filter(tag => tag.length >= 2)
    .filter((tag, index, all) => all.indexOf(tag) === index)
    .slice(0, 5);
  const departamento = isDepartamento(raw.departamento) ? raw.departamento : null;
  const barrio = cleanText(raw.barrio, 40) || null;
  const riesgo = cleanText(raw.riesgo, 60) || null;
  return {
    tipo,
    uruguaya,
    rubro: raw.rubro,
    etiquetas,
    resumen: resumen ? `${resumen}.` : "",
    ofrece,
    envios,
    departamento,
    barrio,
    raro: raw.raro === true,
    riesgo,
    model,
    at,
    inputHash,
  };
}

export interface ClassifyInput {
  profile: ProfileRead;
  sources: readonly SourceRef[];
}

/** El bloque de una cuenta en el prompt. Corto: la bio entera, los alt de las fotos, las pistas. */
export function accountBlock(input: ClassifyInput): string {
  const { profile } = input;
  const alts = profile.posts
    .filter(post => post.owner === profile.handle && post.alt)
    .map(post => post.alt!)
    .slice(0, 8);
  const hints = input.sources
    .map(source => [source.kind, source.label, source.rubroHint, source.departamentoHint, source.text].filter(Boolean).join(": "))
    .filter(Boolean)
    .slice(0, 3)
    .map(hint => hint.slice(0, 300));
  return [
    `### @${profile.handle}`,
    `nombre: ${profile.fullName || "(sin nombre)"}`,
    `bio: ${profile.biography.replace(/\n+/g, " / ") || "(vacía)"}`,
    profile.links.length ? `enlaces: ${profile.links.join(" ")}` : "",
    `seguidores: ${profile.followers ?? "?"}`,
    alts.length ? `fotos: ${alts.join(" | ")}` : "",
    hints.length ? `de dónde la conocimos: ${hints.join(" || ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export type JsonAsker = <T>(prompt: string, schema: unknown, opts: { system?: string; maxOutputTokens?: number; timeoutMs?: number }) => Promise<T | null>;

/**
 * Clasifica las cuentas de a CLASSIFY_BATCH. Devuelve las que validaron; las que no, faltan del
 * mapa y se reintentan en otra corrida.
 */
export async function classifyAccounts(inputs: readonly ClassifyInput[], ask: JsonAsker = askJSON, now = new Date()): Promise<Map<string, Classification>> {
  const out = new Map<string, Classification>();
  if (!inputs.length || (ask === askJSON && !llmConfigured())) return out;
  const model = preferredLlmModel();
  for (let start = 0; start < inputs.length; start += CLASSIFY_BATCH) {
    const batch = inputs.slice(start, start + CLASSIFY_BATCH);
    const prompt = [
      `Rubros posibles: ${RUBROS.map(r => `${r.slug} (${r.hint})`).join("; ")}.`,
      "",
      `Clasificá estas ${batch.length} cuentas. Devolvé una entrada por cuenta, con su handle tal cual.`,
      "",
      ...batch.map(accountBlock),
    ].join("\n");
    let reply: { cuentas?: RawItem[] } | null = null;
    try {
      reply = await ask<{ cuentas?: RawItem[] }>(prompt, SCHEMA, { system: SYSTEM, maxOutputTokens: 4_000, timeoutMs: 90_000 });
    } catch {
      reply = null;
    }
    const byHandle = new Map(batch.map(input => [input.profile.handle, input.profile]));
    for (const raw of reply?.cuentas ?? []) {
      const handle = typeof raw.handle === "string" ? raw.handle.replace(/^@/, "").toLowerCase() : "";
      const profile = byHandle.get(handle);
      if (!profile || out.has(handle)) continue;
      const item = validateItem(raw, classificationInputHash(profile), model, now.toISOString());
      if (item) out.set(handle, item);
    }
  }
  return out;
}
