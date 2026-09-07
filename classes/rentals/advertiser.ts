import * as cheerio from "cheerio";
import { rentalDescription } from "./details";
import { flatten } from "./normalize";
import type { RentalAdvertiserFields, RentalAgency, RentalOwnerDirect, RentalPublicContact, RentalSellerType, RentalSource } from "./types";

const ORIGINS: Record<RentalSource, string> = {
  infocasas: "https://www.infocasas.com.uy", casasweb: "https://casasweb.com",
  elpais: "https://inmuebles.elpais.com.uy", mercadolibre: "https://www.mercadolibre.com.uy", facebook: "https://www.facebook.com",
};
const date = (value: unknown): string | null => typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : null;
const name = (value: unknown) => rentalDescription(value, 160).replace(/\s+/g, " ").trim();

/** A link, never executable input or a signed/private account URL. */
export function publicAdvertiserUrl(value: unknown, base?: string): string | null {
  if (typeof value !== "string" || !value.trim() || value.length > 2048) return null;
  try {
    const url = new URL(value, base);
    if (url.protocol !== "https:" || url.username || url.password || url.port || !url.hostname.includes(".") ||
      /^(?:\d{1,3}\.){3}\d{1,3}$/.test(url.hostname) || url.hostname.startsWith("[") ||
      /(?:^|\.)(?:localhost|local|internal|invalid|test)$/.test(url.hostname) ||
      /\/(?:login|signin|dashboard|account|cuenta|auth|oauth)(?:\/|$)/i.test(url.pathname)) return null;
    // Commercial links need no credentials, fragments or campaign parameters.
    if ([...url.searchParams.keys()].some(key => /token|auth|secret|session|password|signature|code/i.test(key))) return null;
    url.search = ""; url.hash = "";
    return url.href;
  } catch { return null; }
}

export function publicContactPhone(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 60 || /[*xX#a-zA-Z]/.test(value)) return null;
  let digits = value.replace(/[\s().\-–—]/g, "");
  if (digits.startsWith("00598")) digits = `+${digits.slice(2)}`;
  if (/^598[249]\d{7}$/.test(digits)) digits = `+${digits}`;
  if (/^09\d{7}$/.test(digits)) digits = digits.slice(1);
  if (/^[249]\d{7}$/.test(digits)) digits = `+598${digits}`;
  return /^\+598[249]\d{7}$/.test(digits) ? digits : null;
}

function contactEmail(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 254) return null;
  const email = value.trim().toLowerCase();
  return /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/.test(email) ? email : null;
}

export interface AdvertiserEvidence {
  type?: unknown;
  particular?: unknown;
  ownerDirect?: unknown;
  agencyPositive?: boolean;
  title?: unknown;
  description?: unknown;
}

function negativeOwnerClaim(text: string): boolean {
  text = flatten(text);
  return /\bno\s+(?:(?:soy|somos|es|son)\s+(?:el\s+|la\s+)?(?:dueno|propietario)|(?:alquila|vende)\s+(?:el\s+|la\s+)?(?:dueno|propietario))\b/.test(text) ||
    /\b(?:no (?:hay|existe|ofrecemos|ofrece|tenemos)|sin)\s+(?:trato|contacto|contrato|alquiler|venta)\s+direct[oa]\s+con\s+(?:el\s+|la\s+)?(?:dueno|propietario)\b/.test(text);
}

/** Only a statement about this transaction; a request, negation or commission is not owner proof. */
export function directOwnerClaim(title: unknown, description?: unknown): boolean {
  return directOwnerText(`${rentalDescription(title)}\n${rentalDescription(description)}`);
}

function directOwnerText(text: string): boolean {
  if (negativeOwnerClaim(text)) return false;
  const sentences = text.split(/[.!?;\n]+/).map(flatten);
  return sentences.some(sentence => {
    if (/\b(?:busco|buscamos|necesito|necesitamos|se busca|preferentemente|no es|no soy|no somos|no trata|no trato|sin trato)\b/.test(sentence)) return false;
    if (/\b(?:no|sin)\s+(?:dueno|propietario)\b/.test(sentence)) return false;
    return /\b(?:dueno|propietario)(?:\s+directo)?\s+(?:alquila|vende)\b|\b(?:alquila|vende)\s+(?:el\s+)?(?:dueno|propietario)\b|\b(?:dueno|propietario)\s+directo\b|\b(?:trato|contrato|alquiler|venta|contacto)\s+(?:directo|directamente)\s+con\s+(?:el\s+|la\s+)?(?:dueno|propietario)\b/.test(sentence);
  });
}

function intermediaryTerms(ownText: string): boolean {
  const text = flatten(ownText)
    .replace(/\b(?:sin|no (?:se )?(?:cobra|cobramos|hay|paga))\s+(?:comision(?:es)?|honorarios?)(?:\s+inmobiliari[oa]s?)?/g, "");
  return /\b(?:comision inmobiliaria|honorarios inmobiliarios|somos (?:una )?inmobiliaria|inmobiliaria (?:cobra|cobrara)|corredor responsable)\b/.test(text);
}

export function advertiserClassification(input: AdvertiserEvidence): { sellerType: RentalSellerType; direct: boolean; sourceDirect: boolean } {
  const type = flatten(String(input.type || "")).trim();
  const agency = input.agencyPositive === true || ["inmobiliaria", "constructora", "real_estate_agency", "agencia"].includes(type);
  const sourceDirect = input.ownerDirect === true || ["dueno", "dueño", "propietario", "dueno directo", "dueño directo"].includes(type);
  const ownText = `${rentalDescription(input.title)}\n${rentalDescription(input.description)}`;
  if (sourceDirect && negativeOwnerClaim(ownText)) return { sellerType: "desconocido", direct: false, sourceDirect: false };
  const privateSeller = input.particular === true || type === "particular" || sourceDirect;
  const declaration = sourceDirect || directOwnerText(ownText);
  const intermediary = intermediaryTerms(ownText);
  if ((agency && (privateSeller || declaration)) || (privateSeller && intermediary)) return { sellerType: "desconocido", direct: false, sourceDirect: false };
  if (agency || intermediary) return { sellerType: "inmobiliaria", direct: false, sourceDirect: false };
  return { sellerType: privateSeller || declaration ? "particular" : "desconocido", direct: declaration, sourceDirect };
}

export function ownerDirectDeclaration(input: AdvertiserEvidence, sourceUrl: string, observedAt: string): RentalOwnerDirect | null {
  return directDeclaration(advertiserClassification(input), sourceUrl, observedAt);
}

function directDeclaration(verdict: ReturnType<typeof advertiserClassification>, sourceUrl: string, observedAt: string): RentalOwnerDirect | null {
  const url = publicAdvertiserUrl(sourceUrl), at = date(observedAt);
  return verdict.direct && url && at ? { declared: true, evidence: verdict.sourceDirect ? "source_field" : "advert_text", sourceUrl: url, observedAt: at } : null;
}

export interface InfoCasasAdvertiserRow {
  id?: unknown; name?: unknown; type?: unknown; particular?: unknown; active?: unknown;
  inmoLink?: unknown; inmoPropsLink?: unknown;
  // Deliberately no masked_phone, whatsapp_phone, subsidiaries or arbitrary owner fields.
}

export function infoCasasAdvertiser(owner: InfoCasasAdvertiserRow | null | undefined, advert: {
  url: string; title: unknown; description?: unknown; observedAt: string;
}): RentalAdvertiserFields & { sellerType: RentalSellerType } {
  const evidence: AdvertiserEvidence = { type: owner?.type, particular: owner?.particular, title: advert.title, description: advert.description };
  const verdict = advertiserClassification(evidence), observedAt = date(advert.observedAt);
  const id = String(owner?.id || ""), publicName = name(owner?.name);
  const checkedLink = (value: unknown, profile: boolean): string | null => {
    const link = publicAdvertiserUrl(value, ORIGINS.infocasas);
    if (!link || new URL(link).origin !== ORIGINS.infocasas) return null;
    const path = new URL(link).pathname;
    return (profile ? new RegExp(`^/inmobiliarias/perfil/${id}(?:-|/|$)`) : new RegExp(`^/inmobiliarias/${id}(?:-|/|$).*?/propiedades/?$`)).test(path) ? link : null;
  };
  let agency: RentalAgency | null = null;
  if (verdict.sellerType === "inmobiliaria" && ["inmobiliaria", "constructora", "real_estate_agency", "agencia"].includes(flatten(String(owner?.type || ""))) && owner?.active !== false && /^\d{1,18}$/.test(id) && publicName && observedAt) {
    const profileUrl = checkedLink(owner?.inmoLink, true), listingsUrl = checkedLink(owner?.inmoPropsLink, false);
    // The source's own advertiser listing is a public profile when no richer profile exists.
    if (profileUrl || listingsUrl) agency = { version: 1, key: `infocasas:${id}`, name: publicName, profileUrl: profileUrl || listingsUrl!, ...(listingsUrl ? { listingsUrl } : {}), observedAt };
  }
  return { sellerType: verdict.sellerType, agency,
    ownerDirect: directDeclaration(verdict, advert.url, advert.observedAt),
    // Search cards do not inspect commercial channels. Enrichment owns this field.
  };
}

/** Defends public projections even against malformed Mixed records already in storage. */
export function publicAgency(value: unknown, source: RentalSource, now?: string): RentalAgency | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Partial<RentalAgency>, at = date(row.observedAt), publicName = name(row.name);
  if (row.version !== 1 || !at || !publicName || typeof row.key !== "string" || !new RegExp(`^${source}:[a-zA-Z0-9_-]{1,80}$`).test(row.key)) return null;
  if (now && (Date.parse(at) > Date.parse(now) + 300_000 || Date.parse(at) < Date.parse(now) - 21 * 86_400_000)) return null;
  const profileUrl = publicAdvertiserUrl(row.profileUrl), listingsUrl = publicAdvertiserUrl(row.listingsUrl);
  if (!profileUrl || new URL(profileUrl).hostname.replace(/^www\./, "") !== new URL(ORIGINS[source]).hostname.replace(/^www\./, "")) return null;
  const nativeId = row.key.slice(source.length + 1);
  if (source === "infocasas" && !new RegExp(`^/inmobiliarias/(?:perfil/)?${nativeId}(?:-|/|$)`).test(new URL(profileUrl).pathname)) return null;
  if (listingsUrl && new URL(listingsUrl).origin !== new URL(profileUrl).origin) return null;
  if (source === "infocasas" && listingsUrl && !new RegExp(`^/inmobiliarias/${nativeId}(?:-|/|$).*?/propiedades/?$`).test(new URL(listingsUrl).pathname)) return null;
  return { version: 1, key: row.key, name: publicName, profileUrl, ...(listingsUrl ? { listingsUrl } : {}), observedAt: at };
}

export function publicAdvertiserFields(value: RentalAdvertiserFields, context: {
  source: RentalSource; url: string; sellerType?: RentalSellerType; now?: string;
}): RentalAdvertiserFields {
  const agency = context.sellerType === "particular" ? null : publicAgency(value.agency, context.source, context.now);
  const sources = new Set([publicAdvertiserUrl(context.url), agency?.profileUrl, agency?.listingsUrl].filter(Boolean));
  const contact = value.publicContact;
  const channels: RentalPublicContact["channels"] = [];
  if (contact?.version === 1 && Array.isArray(contact.channels)) for (const item of contact.channels.slice(0, 24)) {
    const sourceUrl = publicAdvertiserUrl(item?.sourceUrl), at = date(item?.observedAt);
    if (!sourceUrl || !sources.has(sourceUrl) || !at || (context.now && (Date.parse(at) > Date.parse(context.now) + 300_000 || Date.parse(at) < Date.parse(context.now) - 21 * 86_400_000))) continue;
    const channelValue = item.kind === "phone" || item.kind === "whatsapp" ? publicContactPhone(item.value)
      : item.kind === "email" ? contactEmail(item.value)
        : item.kind === "website" || item.kind === "profile" ? publicAdvertiserUrl(item.value) : null;
    if (!channelValue || (item.kind === "profile" && !sources.has(channelValue))) continue;
    if (!channels.some(channel => channel.kind === item.kind && channel.value === channelValue)) channels.push({ kind: item.kind, value: channelValue, sourceUrl, observedAt: at });
    if (channels.length === 12) break;
  }
  const declaration = value.ownerDirect;
  const observedAt = date(declaration?.observedAt), sourceUrl = publicAdvertiserUrl(declaration?.sourceUrl);
  const ownerDirect = !agency && context.sellerType !== "inmobiliaria" && declaration?.declared === true &&
    ["source_field", "advert_text"].includes(declaration.evidence) && observedAt && sourceUrl === publicAdvertiserUrl(context.url) &&
    (!context.now || (Date.parse(observedAt) <= Date.parse(context.now) + 300_000 && Date.parse(observedAt) >= Date.parse(context.now) - 21 * 86_400_000))
    ? { declared: true as const, evidence: declaration.evidence, sourceUrl: sourceUrl!, observedAt } : null;
  return { ...(value.agency !== undefined ? { agency } : {}),
    ...(value.publicContact !== undefined ? { publicContact: channels.length ? { version: 1 as const, name: name(contact?.name) || agency?.name || "Anunciante", channels } : null } : {}),
    ...(value.ownerDirect !== undefined ? { ownerDirect } : {}) };
}

/** Use only a caller-verified public commercial block, never page footers or hidden JSON. */
export function publicContactFromVisibleHtml(html: string, context: { name: string; source: RentalSource; sourceUrl: string; observedAt: string; agency?: RentalAgency }): RentalPublicContact | null {
  const { sourceUrl, observedAt, agency } = context;
  const $ = cheerio.load(html, {}, false);
  $("script,style,template,noscript,form,input,textarea,[hidden],[aria-hidden='true']").remove();
  $("[style]").filter((_, el) => /display\s*:\s*none|visibility\s*:\s*hidden/i.test($(el).attr("style") || "")).remove();
  const channels: RentalPublicContact["channels"] = [];
  const add = (kind: RentalPublicContact["channels"][number]["kind"], value: string | null) => { if (value && !channels.some(item => item.kind === kind && item.value === value)) channels.push({ kind, value, sourceUrl, observedAt }); };
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") || "";
    if (/^tel:/i.test(href)) add("phone", publicContactPhone(href.slice(4)));
    else if (/^mailto:/i.test(href)) add("email", contactEmail(href.slice(7).split("?")[0]));
    else if (/^https:\/\/(?:wa\.me|api\.whatsapp\.com)\//i.test(href)) {
      try { const url = new URL(href); add("whatsapp", publicContactPhone(url.hostname === "wa.me" ? url.pathname.slice(1) : url.searchParams.get("phone"))); } catch { /* no invented link */ }
    } else if (/sitio web|website|web oficial|página web|pagina web/i.test($(el).text()) || $(el).attr("data-contact-kind") === "website") add("website", publicAdvertiserUrl(href));
  });
  // Emails printed as ordinary text in the agency's public branch/contact block.
  const visible = $.root().text();
  for (const match of visible.matchAll(/[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)) add("email", contactEmail(match[0]));
  for (const match of visible.matchAll(/(?:tel[eé]fono|tel\.?|celular|cel\.?|whatsapp)\s*[:=-]\s*(\+?\d[\d\s().–—-]{6,30})/gi)) add("phone", publicContactPhone(match[1]));
  if (agency) add("profile", agency.profileUrl);
  return publicAdvertiserFields({ agency, publicContact: { version: 1, name: context.name, channels } }, { source: context.source, url: sourceUrl, now: observedAt }).publicContact || null;
}

export function contactFromVisibleHtml(html: string, agency: RentalAgency, sourceUrl: string, observedAt: string): RentalPublicContact | null {
  return publicContactFromVisibleHtml(html, { name: agency.name, source: agency.key.split(":")[0] as RentalSource, sourceUrl, observedAt, agency });
}
