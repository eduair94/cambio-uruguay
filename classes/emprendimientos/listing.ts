// La ficha pública de una cuenta, armada CAMPO POR CAMPO desde el candidato privado. Lo que no
// está acá no sale: ni el texto de las fuentes (un comentario de Reddit, la ficha de Uruguay
// Emprendedor con teléfono y correo), ni los motivos de rechazo, ni los enlaces de la bio (un
// wa.me lleva el teléfono: sale sólo `whatsapp: true`). `tests/emprendimientos/listing.test.ts`
// lo vigila.
import { neighborhoodFromText } from "../rentals/neighborhoods";
import { flatten } from "../rentals/normalize";
import { hasWhatsapp, ownWebsite } from "./handles";
import { lastPostDate } from "./decide";
import { DEPARTAMENTOS, RUBROS } from "./taxonomy";
import type { Candidate, EmprendimientoListing, PublicPost, PublicSource } from "./types";
import type { UruguayEvidence } from "./uruguay";

/** Una ficha cuya última lectura buena tiene más que esto no se sirve: sus fotos ya vencieron. */
export const LISTING_MAX_AGE_DAYS = 14;

/** El vencimiento de una URL firmada de Instagram/Facebook (`oe=` en hexadecimal), en ms. */
export function signedUrlExpiry(url: string | null | undefined): number | null {
  const oe = /[?&]oe=([0-9A-Fa-f]{8})\b/.exec(String(url || ""))?.[1];
  if (!oe) return null;
  const seconds = Number.parseInt(oe, 16);
  return Number.isFinite(seconds) ? seconds * 1000 : null;
}

const RUBRO_LABEL = new Map(RUBROS.map(r => [r.slug, r.label]));
const DEPTO_LABEL = new Map(DEPARTAMENTOS.map(d => [d.slug, d.label]));

/** Un barrio o localidad reconocido en `text` (del departamento dado, si lo hay), o null. */
export function barrioFromText(text: string | null | undefined, departamento: string | null): string | null {
  if (!text) return null;
  const found = neighborhoodFromText(text, departamento ? (DEPTO_LABEL.get(departamento) ?? "") : "");
  return found && found.neighborhood !== found.department ? found.neighborhood : null;
}

function publicSources(candidate: Candidate): PublicSource[] {
  const out: PublicSource[] = [];
  const push = (source: PublicSource): void => {
    if (!out.some(s => s.label === source.label)) out.push(source);
  };
  for (const source of candidate.sources) {
    switch (source.kind) {
      case "uruguay-emprendedor":
        push({ kind: source.kind, label: "Ficha en Uruguay Emprendedor", url: source.url ?? null });
        break;
      case "reddit":
        push({ kind: source.kind, label: source.label ? `Recomendada en Reddit: «${source.label.slice(0, 90)}»` : "Recomendada en Reddit", url: source.url ?? null });
        break;
      case "colaboracion":
        if (source.via) push({ kind: source.kind, label: `Publicó en conjunto con @${source.via}`, url: `https://www.instagram.com/${source.via}/` });
        break;
      case "mencion":
        if (source.via) push({ kind: source.kind, label: `La nombra @${source.via}`, url: `https://www.instagram.com/${source.via}/` });
        break;
      case "sugerencia":
        push({ kind: source.kind, label: "Sugerida por un lector", url: null });
        break;
      case "semilla":
        push({ kind: source.kind, label: source.label || "Relevamiento propio", url: source.url ?? null });
        break;
      case "web":
        // Sin la consulta: es nuestra, no algo que la cuenta o un tercero haya dicho.
        push({ kind: source.kind, label: "Encontrada en una búsqueda web", url: null });
        break;
    }
  }
  return out.slice(0, 4);
}

/** La ficha pública, o null si al candidato le falta algo para tener una. */
export function publicListing(candidate: Candidate, evidence: UruguayEvidence | null, now: Date): EmprendimientoListing | null {
  const profile = candidate.profile;
  const cls = candidate.classification;
  if (candidate.state !== "publicada" || !profile || profile.status !== "ok" || !cls) return null;
  if (now.getTime() - Date.parse(profile.readAt) > LISTING_MAX_AGE_DAYS * 86_400_000) return null;

  const posts: PublicPost[] = profile.posts
    .filter(post => post.owner === profile.handle && post.image)
    .slice(0, 12)
    .map(post => ({ code: post.code, reel: post.reel, date: post.date, image: post.image! }));
  const today = now.getTime();
  const postsLast90 = profile.posts.filter(post => post.owner === profile.handle && post.date && today - Date.parse(`${post.date}T12:00:00Z`) <= 90 * 86_400_000).length;
  const ueHint = candidate.sources.find(source => source.kind === "uruguay-emprendedor" && source.departamentoHint)?.departamentoHint ?? null;
  const departamento = cls.departamento ?? evidence?.departamento ?? ueHint ?? null;
  // El barrio sale del diccionario de barrios y localidades de alquileres, nunca del texto libre de
  // la IA: en la primera prueba escribió "ninguno", "zona Nuevo Centro" y "próxima a Antel Arena".
  const barrio = evidence?.barrio ?? barrioFromText(cls.barrio, departamento);
  const website = ownWebsite(profile.links);
  const expiries = [profile.profilePic, ...posts.map(post => post.image)].map(signedUrlExpiry).filter((ms): ms is number => ms !== null);
  const name = (profile.fullName || profile.handle).slice(0, 90);
  const search = flatten(
    [name, profile.handle, cls.resumen, ...cls.etiquetas, RUBRO_LABEL.get(cls.rubro) ?? "", barrio ?? "", departamento ? (DEPTO_LABEL.get(departamento) ?? "") : ""].join(" ")
  ).replace(/[^a-z0-9ñ ]+/g, " ").replace(/\s+/g, " ").trim();

  return {
    handle: profile.handle,
    name,
    summary: cls.resumen,
    rubro: cls.rubro,
    tags: [...cls.etiquetas],
    departamento,
    barrio,
    envios: cls.envios,
    ofrece: cls.ofrece,
    raro: cls.raro,
    soloInstagram: website === null,
    website,
    whatsapp: hasWhatsapp(profile.links, profile.biography),
    followers: profile.followers,
    profilePic: profile.profilePic,
    posts,
    lastPostAt: lastPostDate(profile),
    postsLast90,
    sources: publicSources(candidate),
    listedAt: candidate.listedAt ?? profile.readAt,
    readAt: profile.readAt,
    photosExpireAt: expiries.length ? new Date(Math.min(...expiries)).toISOString() : null,
    search,
  };
}
