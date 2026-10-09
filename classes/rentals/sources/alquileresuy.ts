// alquileres.uy — the rental side of the BuscandoCasa network, named in the r/uruguay thread
// "Páginas para buscar alquileres" and read since 2026-10-09.
//
// What was measured that day (docs/research/rental-sources-reddit-thread-2026-10-09.md):
//   * ONE database behind two sites. alquileres.uy and www.buscandocasa.com run the same classic-ASP
//     search and answer with the same refs; alquileres.uy only adds the hidden `idinmo=G10`, which
//     widens the agency set (BuscandoCasa alone showed 54 of the 62 apartments). So only alquileres.uy
//     is read, and it carries the source name people know.
//   * 191 annual rentals from ~20 agencies, 131 of them homes not marked reserved. A sample of 40 found
//     14 already in the index through Mercado Libre, InfoCasas or El País; most of the rest sits on the
//     Canelones coast and in Piriápolis, where the big portals are thin.
//   * Nothing expires and there is no status field. The card date is the LAST UPDATE (the oldest one
//     listed was from 2016), and of the sampled homes nobody had touched in over 180 days only 1 of 14
//     was anywhere else. An advert untouched for `RENTALS_AU_MAX_AGE_DAYS` (180) is treated as gone —
//     the stale-ad complaint in that same thread. The date is never a publication date.
//   * The site answers only over plain HTTP and in ISO-8859-1. Photos are served over HTTPS by
//     buscandocasa.com, and each advert's own page lives at `<ref>.ver.uy`, the link the site shares.
//
// One POST per property type returns the whole category (`nresultados=500`), so a full run is seven
// searches plus one advert page per accepted row. The hourly run reads nothing: these listings move in
// weeks, not hours. No contact data is read: the advert page carries the agency's phones and mail, and
// only its sections below the location block are parsed; comments go through `rentalDescription`.
import * as cheerio from "cheerio";
import { rentalDescription, rentalOfferDetails } from "../details";
import { guaranteesFromField, guaranteesFromText, mergeGuarantees, type RentalGuarantee } from "../guarantees";
import { fetchBuffer, type FetchOptions } from "../net";
import { canonicalDepartment, flatten, isPlausibleRent, looksLikeRentalAdvert, parseCurrency, parseMoney, parseStreet } from "../normalize";
import type { RawRental, RentalCurrency, RentalPropertyType } from "../types";
import type { RentalSourceResult } from "./types";

export const ALQUILERESUY_ORIGIN = "http://alquileres.uy";
const SEARCH_URL = `${ALQUILERESUY_ORIGIN}/0/0_ina_v30.asp?fav=0`;
const PHOTO_ORIGIN = "https://www.buscandocasa.com";
/** Every `<ref>.ver.uy` page comes from one server: they are paced together, not per subdomain. */
const DETAIL_THROTTLE = "ver.uy";

/** The annual-rental categories of the search form, in the order they are read. */
export const ALQUILERESUY_CATEGORIES: ReadonlyArray<{ code: string; type: RentalPropertyType }> = [
  { code: "ap", type: "apartamento" },
  { code: "ca", type: "casa" },
  { code: "lo", type: "local" },
  { code: "of", type: "oficina" },
  { code: "te", type: "terreno" },
  { code: "ga", type: "garaje" },
  // Chacras: a house with land, the way Casasweb's chacras resolve.
  { code: "ch", type: "casa" },
];

// The form's own defaults. Leaving the radios out makes the search answer zero results.
const DEFAULT_FORM = [
  "tipo_pago=0", "aph=0", "permuta=0", "alquilado=0", "moneda=2", "gcincluidos=2", "peri=adic", "consultar=0",
  "ec=0", "aa=0", "ar=0", "pe=0", "pe0=0", "pe1=0", "pe2=0", "pe3=0", "lo_ti_ga=0", "lo_ti_co=0", "lo_ti_in=0",
  "lo_ti_de=0", "ev=-1", "techo=0", "conoficina=0", "lo_plantas=0", "dserv=0", "suits=0", "bserv=0",
  "distanciamar=-1", "vista=0", "ub0=0", "ub1=0", "ub2=0", "ub3=0", "ub4=0", "ph=0", "plantas=0", "bp=0",
  "or0=0", "or1=0", "or2=0", "or3=0", "amueblado=0", "calefaccion=0", "ascensor=0", "piscina=0", "parrillero=0",
  "barbacoa=0", "fondo=0", "vivienda=0", "funcionando=0", "coninmueble=0", "asociaciones=0", "xin=-", "ci0=0",
  "ci1=0", "ci2=0", "ci3=0", "fu9=0", "fu8=0", "fu7=0", "fu6=0", "fu5=0", "fu4=0", "fu3=0", "fu2=0", "fu1=0",
  "fu0=0", "fu11=0", "fu10=0",
].join("&");

/** One annual-rental category, the whole of it in one page, with the agency set of alquileres.uy. */
export function alquileresUySearchBody(code: string): string {
  const params = new URLSearchParams({ op: "a", inmueble: code, inmueble_fav: code.toUpperCase(), orria: "1", nresultados: "500", idinmo: "G10" });
  return `${DEFAULT_FORM}&${params.toString()}`;
}

/** "696AP1642" -> https://696apa1642.ver.uy/ (agency code, type, "a" for alquiler, own code). */
export function alquileresUyAdvertUrl(ref: string): string | null {
  const label = advertHost(ref);
  return label ? `https://${label}.ver.uy/` : null;
}

function advertHost(ref: string): string | null {
  if (!/^[0-9A-Za-z]{6,40}$/.test(ref)) return null;
  return `${ref.slice(0, 5)}a${ref.slice(5)}`.toLowerCase();
}

function photoUrl(path: string | undefined): string | null {
  const clean = String(path || "").trim();
  return /^\/(?:fotos|fotostemp)\/[\w-]+(?:\/[\w-]+)?\.jpe?g$/i.test(clean) ? `${PHOTO_ORIGIN}${clean}` : null;
}

const clean = (text: string): string => text.replace(/[\s ]+/g, " ").trim();

function cellLines(cell: cheerio.Cheerio<any>): string[] {
  const copy = cell.clone();
  copy.find("br").replaceWith("\n");
  // Cells end lines too: "Impecable</td><td>Garage 1 auto" is two facts, not "ImpecableGarage".
  copy.find("td,tr,div,p,li").append("\n");
  return copy.text().split("\n").map(clean).filter(Boolean);
}

const SMALL_WORDS = new Set(["de", "del", "la", "las", "los", "el", "y", "e"]);

/** "CERRO DEL TORO" -> "Cerro del Toro". The platform writes every place in capitals. */
export function alquileresUyDisplayCase(text: string): string {
  return clean(text).toLocaleLowerCase("es").split(" ").filter(Boolean)
    .map((word, index) => (index > 0 && SMALL_WORDS.has(word) ? word : word.replace(/\p{L}/u, letter => letter.toLocaleUpperCase("es"))))
    .join(" ");
}

/** Agency names come in capitals too; a two- or three-letter name ("IA") is an acronym and stays one. */
function displayAgency(text: string): string {
  return clean(text).split(" ").filter(Boolean)
    .map(word => (/^\p{Lu}{1,3}$/u.test(word) ? word : alquileresUyDisplayCase(word)))
    .join(" ");
}

export interface AlquileresUyPin {
  latitude?: number;
  longitude?: number;
  /** The platform's own spelling of the agency ("Abacos"), which the cards print in capitals. */
  agency?: string;
}

export interface AlquileresUyCard {
  ref: string;
  agency: string;
  /** Null when the agency publishes "CONSULTAR": no price is invented. */
  price: number | null;
  currency: RentalCurrency | null;
  /** As published: "MONTEVIDEO", "CD. DE LA COSTA", "COSTA DE ORO", "PIRIÁPOLIS", "LA PAZ". */
  zone: string;
  barrio: string;
  /** The free line under the place: a corner, a street, or a pitch ("SOBRE RAMBLA!!"). */
  note: string;
  bedrooms: number | null;
  bathrooms: number | null;
  /** Built area; for a plot, the plot. */
  area: number | null;
  landArea: number | null;
  /** 0 only when the card says "NO"; "?" and silence are null. */
  commonExpenses: number | null;
  commonExpensesCurrency: RentalCurrency | null;
  parkingSpaces: number | null;
  /** YYYY-MM-DD of the LAST UPDATE, never a publication date. */
  updatedOn: string | null;
  photo: string | null;
  reserved: boolean;
}

export interface AlquileresUyResults {
  total: number;
  cards: AlquileresUyCard[];
  pins: Map<string, AlquileresUyPin>;
}

const RESERVED = /\b(?:reservad[oa]s?|alquilad[oa]s?|suspendid[oa]s?)\b/i;

function amount(text: string | undefined): number | null {
  // "926/1.060" is covered/total: the first figure is the built one.
  return parseMoney(String(text ?? "").split("/")[0]);
}

function parsePins(text: string): Map<string, AlquileresUyPin> {
  const pins = new Map<string, AlquileresUyPin>();
  for (const match of text.matchAll(/\['([0-9A-Za-z]+)',(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?),'([^']*)','[^']*','[^']*'\]/g)) {
    const longitude = Number(match[2]);
    const latitude = Number(match[3]);
    const agency = clean(cheerio.load(match[4]!, {}, false).root().text());
    pins.set(match[1]!, { latitude, longitude, ...(agency ? { agency } : {}) });
  }
  return pins;
}

function parseStats($: cheerio.CheerioAPI, card: cheerio.Cheerio<any>) {
  let bedrooms: number | null = null;
  let bathrooms: number | null = null;
  let area: number | null = null;
  let landArea: number | null = null;
  const rows = card.find("td[id^=td7] table").first().find("tr");
  // Stacked layout (homes, offices): the value spans two rows and its label sits in the second one.
  const labels = rows.eq(1).find("td.txiki").map((_, td) => flatten($(td).text())).get();
  let label = 0;
  rows.eq(0).children("td").each((_, td) => {
    const cell = $(td);
    const kind = cell.attr("class") || "";
    if (kind === "ertaina") {
      // Houses: built area over land area, each a <b> number.
      const values = cell.find("b").map((__, b) => amount($(b).text())).get() as Array<number | null>;
      area = values[0] ?? null;
      landArea = values[1] ?? null;
      return;
    }
    if (kind !== "haundi" && kind !== "haundi_2") return;
    const text = clean(cell.text());
    if (!text) return;
    if (/m²|m2/i.test(text)) {
      area = amount(text);
      return;
    }
    // Inline layout (plots, shops): the label is the very next cell.
    const next = cell.next("td.txiki");
    const name = cell.attr("rowspan") ? labels[label++] ?? "" : flatten(next.text());
    const value = amount(text);
    if (/^dorm/.test(name)) bedrooms = value;
    // "1 amb." is a studio. More rooms than that do not say how many of them are bedrooms.
    else if (/^amb/.test(name)) bedrooms = bedrooms ?? (value === 1 ? 0 : null);
    else if (/^bano/.test(name)) bathrooms = value;
    else if (/^m(?:²|2)$/.test(name)) area = value;
  });
  return { bedrooms, bathrooms, area, landArea };
}

function parseCard($: cheerio.CheerioAPI, card: cheerio.Cheerio<any>): AlquileresUyCard | null {
  const html = $.html(card);
  const ref = /cargar_ficha\('([0-9A-Za-z]{6,40})'/.exec(html)?.[1];
  if (!ref) return null;
  const agencyCell = card.find(".list_numero").first().parent();
  const agency = clean(agencyCell.clone().find(".list_numero").remove().end().text());
  const priceText = clean(card.find("div.precio").first().text());
  const consult = /consultar/i.test(priceText);
  const place = card.find("div[class^=resultados_lugar_]").first();
  const [zone = "", barrio = ""] = clean(place.find("b").first().text()).split(" / ").map(clean);
  const note = clean(place.find("span").first().text());
  const extras = cellLines(card.find("td[id^=td6]").first()).join("\n");
  const expenses = /Gtos\.\s*Comunes:\s*(?:(US\$|U\$S|\$)\s*([\d.,]+)|(NO)\b)/i.exec(extras);
  const parking = /\bGarage\s+(\d{1,2})\s+autos?\b/i.exec(extras) ?? /\bCochera\s+(\d{1,2})\s+autos?\b/i.exec(extras);
  const dates = [...extras.matchAll(/\b(\d{2})\/(\d{2})\/(20\d{2})\b/g)];
  const date = dates[dates.length - 1];
  const background = /background-image:url\('([^']+)'\)/.exec(html)?.[1];
  return {
    ref,
    agency,
    price: consult ? null : parseMoney(priceText),
    currency: consult ? null : parseCurrency(priceText),
    zone,
    barrio,
    note,
    ...parseStats($, card),
    commonExpenses: expenses ? (expenses[3] ? 0 : parseMoney(expenses[2])) : null,
    commonExpensesCurrency: expenses ? (expenses[3] ? null : parseCurrency(expenses[1])) : null,
    parkingSpaces: parking ? Number(parking[1]) : null,
    updatedOn: date ? `${date[3]}-${date[2]}-${date[1]}` : null,
    photo: photoUrl(background),
    reserved: RESERVED.test(note),
  };
}

/**
 * The search answers `total||cards||firstRef||[pins]`. A page with no number in front, or a total
 * with no card to show for it, is not a result page — the caller treats it as a failed search, never
 * as an empty category. The site's own "nothing found" answer is `0||` plus a sentence.
 */
export function parseAlquileresUyResults(text: string): AlquileresUyResults | null {
  const parts = String(text ?? "").split("||");
  const head = (parts[0] ?? "").trim();
  if (parts.length < 2 || !/^\d{1,5}$/.test(head)) return null;
  const total = Number(head);
  const $ = cheerio.load(parts[1] ?? "");
  const cards: AlquileresUyCard[] = [];
  $("div[id^=div_]").each((_, element) => {
    // "div_resultados_ap_0_0" or "div_resultados_ap_0_": the trailing view index depends on form
    // fields this search does not send (measured live, 2026-10-09). Only the prefix identifies a card.
    if (!/(?:^|\s)div_resultados_[a-z]{2}_/.test($(element).attr("class") || "")) return;
    const card = parseCard($, $(element));
    if (card) cards.push(card);
  });
  if (total > 0 && !cards.length) return null;
  return { total, cards, pins: parsePins(parts[3] ?? "") };
}

export interface AlquileresUyDetail {
  found: true;
  /** The advert's host label as its own page title prints it ("[0z8caa1793]"). */
  ref: string;
  location: string;
  department: string;
  description: string;
  guarantees: RentalGuarantee[];
  guaranteeText: string;
  transfer: boolean;
  furnished: boolean;
  commonExpenses: number | null;
  commonExpensesCurrency: RentalCurrency | null;
  builtArea: number | null;
  landArea: number | null;
  amenities: string[];
  images: string[];
}

/** The sections whose ticked items are amenities; "DETALLES" ticks are facts like "Propiedad Horizontal". */
const AMENITY_SECTIONS = /^(?:interior|exterior|equipamiento|servicios y accesorios|comodidades del edificio|areas recreativas)$/;

/**
 * The advert's own page. Only the block from "UBICACIÓN" down is read; the agency card above it, with
 * its phones, mail and tax id, never is. A ✓ (`ok.svg`) is a statement; a ✗ is the form's default and
 * says nothing, so it is never read as "no".
 */
export function parseAlquileresUyDetail(html: string): AlquileresUyDetail | { found: false } | null {
  const text = String(html ?? "");
  if (/^\s*No existe\s*$/i.test(text)) return { found: false };
  const $ = cheerio.load(text);
  const block = $("#ficha_entera").first();
  const ref = /\[([0-9a-z]{6,41})\]/i.exec($("title").first().text())?.[1]?.toLowerCase();
  if (!block.length || !ref) return null;

  let section = "";
  const comments: string[] = [];
  const guarantees: string[] = [];
  const amenities: string[] = [];
  const result: AlquileresUyDetail = {
    found: true, ref, location: "", department: "", description: "", guarantees: [], guaranteeText: "",
    transfer: false, furnished: false, commonExpenses: null, commonExpensesCurrency: null,
    builtArea: null, landArea: null, amenities: [], images: [],
  };
  block.find(".ficha_titulo, .ficha_item, .ficha_item_n, .ficha_item_0").each((_, element) => {
    const node = $(element);
    if (node.hasClass("ficha_titulo")) {
      section = flatten(node.text());
      return;
    }
    if (node.hasClass("ficha_item_0")) {
      const lines = cellLines(node);
      if (section === "ubicacion") {
        result.location = lines[0] ?? "";
        result.department = canonicalDepartment((lines.find(line => /^depto\.?/i.test(line)) ?? "").replace(/^depto\.?\s*/i, ""));
      } else if (section === "comentarios" && lines.length) comments.push(lines.join("\n"));
      return;
    }
    const label = clean(node.find(".ficha_item_1").first().text());
    const value = node.find(".ficha_item_2").first();
    const ticked = value.find("img[src*='ok.svg']").length > 0;
    const flatLabel = flatten(label);
    if (section === "garantias aceptadas") {
      if (ticked) guarantees.push(label);
    } else if (flatLabel === "traspaso") result.transfer = ticked;
    else if (flatLabel === "gastos comunes") {
      const said = clean(value.text());
      if (/^no$/i.test(said)) result.commonExpenses = 0;
      else if (/\d/.test(said)) {
        result.commonExpenses = parseMoney(said.replace(/al mes/i, ""));
        result.commonExpensesCurrency = result.commonExpenses === null ? null : parseCurrency(said);
      }
    } else if (flatLabel === "superficie edificada") result.builtArea = amount(value.text());
    else if (flatLabel === "superficie terreno") result.landArea = amount(value.text());
    else if (AMENITY_SECTIONS.test(section) && ticked) {
      if (flatLabel === "amueblado") result.furnished = true;
      amenities.push(label);
    }
  });
  result.guaranteeText = guarantees.join(", ");
  result.guarantees = guaranteesFromField(result.guaranteeText);
  // The rental comments come first in the page; the general ones describe the property. Both are the
  // agency's own words, and both go through the same contact scrub as every other description.
  result.description = rentalDescription([result.location, ...comments.reverse()].filter(Boolean).join("\n\n"), 4_000);
  result.amenities = amenities;
  result.images = [...new Set($("img[src*='/fotostemp/'], a[href*='/fotostemp/']").map((_, el) => photoUrl($(el).attr("src") || $(el).attr("href"))).get().filter(Boolean))] as string[];
  return result;
}

const ZONES: ReadonlyMap<string, { department: string; locality?: string }> = new Map([
  ["montevideo", { department: "Montevideo" }],
  ["cd. de la costa", { department: "Canelones", locality: "Ciudad de la Costa" }],
  ["ciudad de la costa", { department: "Canelones", locality: "Ciudad de la Costa" }],
  // A stretch of coast, not a town: the barrio ("ATLÁNTIDA SUR", "PQUE. PLATA SUR") names the town.
  ["costa de oro", { department: "Canelones" }],
  ["la paz", { department: "Canelones", locality: "La Paz" }],
  ["piriapolis", { department: "Maldonado", locality: "Piriápolis" }],
]);

const TYPE_TITLE: Record<RentalPropertyType, string> = {
  apartamento: "Apartamento", casa: "Casa", habitacion: "Habitación", local: "Local", oficina: "Oficina",
  garaje: "Garaje", terreno: "Terreno", otro: "Inmueble",
};

/** The card has no headline of its own; the title says only what the card states. */
function rentalTitle(type: RentalPropertyType, bedrooms: number | null, place: string, transfer: boolean): string {
  const home = type === "apartamento" || type === "casa";
  let head = type === "apartamento" && bedrooms === 0 ? "Monoambiente" : TYPE_TITLE[type];
  if (home && bedrooms && bedrooms > 0) head += ` de ${bedrooms} dormitorio${bedrooms === 1 ? "" : "s"}`;
  const title = `${head} en alquiler${place ? ` en ${place}` : ""}`;
  return transfer ? `Traspaso: ${title}` : title;
}

const GENERIC_STREET = /^(?:calle|ruta|camino|avenida|rambla|bulevar|pasaje|senda|km|kilometro)$/;
const NO_ADDRESS = { address: "", street: "", streetNumber: "" };

/**
 * A door number only when the line is nothing but a street and a three-to-five digit door: "CALLE 77"
 * is a street in Solymar, not door 77 of a street called "calle", and a pitch ("SOBRE RAMBLA!!") or a
 * corner never becomes an address. Measured: 5 of 131 homes publish one.
 */
function doorAddress(note: string): typeof NO_ADDRESS {
  if (!note || note.length > 60 || /[!¡?]/.test(note)) return NO_ADDRESS;
  const { street, number } = parseStreet(note);
  if (!street || !/^\d{3,5}$/.test(number) || GENERIC_STREET.test(street)) return NO_ADDRESS;
  return { address: alquileresUyDisplayCase(note), street, streetNumber: number };
}

export type AlquileresUyRejection = "url" | "reserved" | "price" | "stale" | "zone" | "implausible" | "stay";

export interface AlquileresUyContext {
  usdUyu: number;
  now: Date;
  maxAgeDays: number;
  observedAt: string;
  pin?: AlquileresUyPin;
  detail?: AlquileresUyDetail;
}

const DAY_MS = 86_400_000;

export function alquileresUyToRawRental(card: AlquileresUyCard, type: RentalPropertyType, ctx: AlquileresUyContext): { rental: RawRental | null; reason?: AlquileresUyRejection } {
  const reject = (reason: AlquileresUyRejection) => ({ rental: null, reason });
  const url = alquileresUyAdvertUrl(card.ref);
  if (!url) return reject("url");
  const detail = ctx.detail;
  if (card.reserved || RESERVED.test(detail?.location ?? "")) return reject("reserved");
  if (!card.price || !card.currency) return reject("price");
  const updated = card.updatedOn ? Date.parse(`${card.updatedOn}T12:00:00Z`) : NaN;
  if (!Number.isFinite(updated) || ctx.now.getTime() - updated > ctx.maxAgeDays * DAY_MS) return reject("stale");
  const zone = ZONES.get(flatten(card.zone));
  const department = zone?.department || canonicalDepartment(card.zone) || detail?.department || "";
  if (!department) return reject("zone");
  if (!isPlausibleRent(card.price * (card.currency === "USD" ? ctx.usdUyu : 1), type)) return reject("implausible");

  const neighborhood = card.barrio ? alquileresUyDisplayCase(card.barrio) : "";
  const locality = zone?.locality;
  const title = rentalTitle(type, card.bedrooms, neighborhood || locality || department, detail?.transfer === true);
  const description = detail?.description ?? "";
  // A summer stay the advert describes in its own words; a winter contract is a month's rent and stays.
  if (!looksLikeRentalAdvert(title, description)) return reject("stay");

  const builtArea = detail?.builtArea ?? (type === "terreno" ? null : card.area);
  const landArea = detail?.landArea ?? (type === "terreno" ? card.area : card.landArea);
  const area = type === "terreno" ? landArea : builtArea;
  const pinned = ctx.pin?.latitude !== undefined && ctx.pin.longitude !== undefined &&
    ctx.pin.latitude >= -35.9 && ctx.pin.latitude <= -30 && ctx.pin.longitude >= -58.6 && ctx.pin.longitude <= -53;
  const commonExpenses = card.commonExpenses ?? detail?.commonExpenses ?? null;
  const commonExpensesCurrency = commonExpenses === null ? null
    : card.commonExpenses !== null ? card.commonExpensesCurrency ?? (commonExpenses === 0 ? null : "UYU")
      : detail?.commonExpensesCurrency ?? (commonExpenses === 0 ? null : "UYU");
  const images = detail?.images ?? [];
  return {
    rental: {
      source: "alquileresuy",
      listingId: `alquileresuy:${card.ref}`,
      url,
      title,
      ...(detail ? {
        description: rentalDescription(description),
        details: rentalOfferDetails({
          description,
          // The card's 320 px thumbnail is the first of these photos, smaller: it only stands in.
          images: images.length ? images : card.photo ? [card.photo] : [],
          builtArea,
          landArea,
          amenities: detail.amenities,
          guaranteeText: detail.guaranteeText,
        }, description, type),
      } : {}),
      price: card.price,
      currency: card.currency,
      commonExpenses,
      commonExpensesCurrency,
      sellerName: ctx.pin?.agency || displayAgency(card.agency) || "alquileres.uy",
      // A network of agencies: "Listado de Empresas Inmobiliarias" is the only kind of publisher it has.
      sellerType: "inmobiliaria",
      image: card.photo ?? images[0] ?? null,
      publishedAt: null,
      propertyType: type,
      department,
      ...(locality ? { locality } : {}),
      neighborhood,
      ...doorAddress(card.note),
      latitude: pinned ? ctx.pin!.latitude! : null,
      longitude: pinned ? ctx.pin!.longitude! : null,
      bedrooms: type === "apartamento" || type === "casa" ? card.bedrooms : null,
      bathrooms: card.bathrooms && card.bathrooms > 0 ? card.bathrooms : null,
      area,
      parkingSpaces: card.parkingSpaces,
      // A ticked "Amueblado" is the portal's structured field, like InfoCasas' facility: kept apart so
      // the shared text pass (textFacts.ts) can weigh it against the advert's own words.
      furnished: detail?.furnished ? true : null,
      ...(detail?.furnished ? { furnishedPortal: true } : {}),
      petsAllowed: null,
      guarantees: detail ? mergeGuarantees([detail.guarantees, guaranteesFromText(description)]) : [],
    },
  };
}

export interface HarvestAlquileresUyDeps {
  fetchBuffer: (url: string, options?: FetchOptions) => Promise<Buffer | null>;
  now: () => Date;
  env: Record<string, string | undefined>;
}

const envNumber = (value: string | undefined, fallback: number): number => {
  const number = Number(value);
  return value !== undefined && value.trim() !== "" && Number.isFinite(number) && number >= 0 ? number : fallback;
};

const decode = (buffer: Buffer): string => new TextDecoder("windows-1252").decode(buffer);
const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;

const REJECTION_NOTE: Record<AlquileresUyRejection, [string, string]> = {
  stale: ["sin actualizar hace más de {days} días", "sin actualizar hace más de {days} días"],
  reserved: ["reservado", "reservados"],
  price: ["sin precio publicado", "sin precio publicado"],
  zone: ["con zona desconocida", "con zona desconocida"],
  implausible: ["con precio inverosímil", "con precio inverosímil"],
  stay: ["de temporada", "de temporada"],
  url: ["con referencia ilegible", "con referencia ilegible"],
};

export async function harvestAlquileresUy(mode: "full" | "fast", usdUyu: number, overrides: Partial<HarvestAlquileresUyDeps> = {}): Promise<RentalSourceResult> {
  const deps: HarvestAlquileresUyDeps = { fetchBuffer, now: () => new Date(), env: process.env, ...overrides };
  const idle = (note: string): RentalSourceResult => ({ key: "alquileresuy", ok: true, complete: false, listings: [], note });
  if (deps.env.RENTALS_AU_ENABLED === "0") return idle("deshabilitado por configuración");
  if (mode === "fast") return idle("sólo en la corrida completa");

  const now = deps.now();
  const ctx = { usdUyu, now, maxAgeDays: envNumber(deps.env.RENTALS_AU_MAX_AGE_DAYS, 180), observedAt: now.toISOString() };
  const maxDetails = envNumber(deps.env.RENTALS_AU_MAX_DETAILS, 250);
  const detailBudgetMs = envNumber(deps.env.RENTALS_AU_DETAIL_MINUTES, 12) * 60_000;

  // 1. Every category in one page each.
  const failures = new Map<string, number>();
  const found = new Map<string, { card: AlquileresUyCard; type: RentalPropertyType }>();
  const pins = new Map<string, AlquileresUyPin>();
  let searches = 0;
  let partial = false;
  for (const { code, type } of ALQUILERESUY_CATEGORIES) {
    let reason = "sin respuesta";
    const buffer = await deps.fetchBuffer(SEARCH_URL, {
      method: "POST", body: alquileresUySearchBody(code), timeoutMs: 40_000,
      headers: { "content-type": "application/x-www-form-urlencoded" },
      onFailure: (why) => { reason = why; },
    });
    const parsed = buffer ? parseAlquileresUyResults(decode(buffer)) : null;
    if (!parsed) {
      const why = buffer ? "página irreconocible" : reason;
      failures.set(why, (failures.get(why) ?? 0) + 1);
      partial = true;
      continue;
    }
    searches++;
    // The page says how many it holds; fewer cards than that is a page we did not read whole.
    if (parsed.cards.length !== parsed.total) partial = true;
    for (const card of parsed.cards) if (!found.has(card.ref)) found.set(card.ref, { card, type });
    for (const [ref, pin] of parsed.pins) pins.set(ref, pin);
  }
  const failed = [...failures.values()].reduce((sum, n) => sum + n, 0);
  const failureNote = failed ? `; ${plural(failed, "búsqueda fallida", "búsquedas fallidas")}: ${[...failures].map(([why, n]) => `${why} ×${n}`).join(", ")}` : "";
  if (!searches) return { key: "alquileresuy", ok: false, complete: false, listings: [], note: `ninguna búsqueda respondió${failureNote}` };

  // A pin shared by three adverts is a default pin, not three homes on one spot. The agency's
  // spelling still holds.
  const spots = new Map<string, number>();
  const spot = (pin: AlquileresUyPin) => `${pin.latitude?.toFixed(4)},${pin.longitude?.toFixed(4)}`;
  for (const pin of pins.values()) spots.set(spot(pin), (spots.get(spot(pin)) ?? 0) + 1);
  const pinFor = (ref: string): AlquileresUyPin | undefined => {
    const pin = pins.get(ref);
    if (!pin) return undefined;
    return (spots.get(spot(pin)) ?? 0) >= 3 ? { ...(pin.agency ? { agency: pin.agency } : {}) } : pin;
  };

  // 2. What the cards alone already rule out, before spending a page read on it.
  const rejected = new Map<AlquileresUyRejection, number>();
  const reject = (reason: AlquileresUyRejection) => rejected.set(reason, (rejected.get(reason) ?? 0) + 1);
  const candidates: Array<{ card: AlquileresUyCard; type: RentalPropertyType }> = [];
  for (const entry of found.values()) {
    const { rental, reason } = alquileresUyToRawRental(entry.card, entry.type, { ...ctx, pin: pinFor(entry.card.ref) });
    if (rental) candidates.push(entry);
    else reject(reason!);
  }

  // 3. The advert's own page: homes first, inside a count and a clock. A page that is missing or
  // belongs to another advert leaves the card as it was; "No existe" withdraws it.
  const homesFirst = (entry: { type: RentalPropertyType }) => (entry.type === "apartamento" || entry.type === "casa" ? 0 : 1);
  candidates.sort((a, b) => homesFirst(a) - homesFirst(b));
  const started = Date.now();
  const listings: RawRental[] = [];
  let read = 0;
  let unread = 0;
  let withdrawn = 0;
  for (const entry of candidates) {
    let detail: AlquileresUyDetail | undefined;
    if (read + unread < maxDetails && Date.now() - started < detailBudgetMs) {
      const buffer = await deps.fetchBuffer(alquileresUyAdvertUrl(entry.card.ref)!, { throttleKey: DETAIL_THROTTLE, timeoutMs: 30_000, retries: 1 });
      const page = buffer ? parseAlquileresUyDetail(decode(buffer)) : null;
      if (page?.found === false) {
        withdrawn++;
        continue;
      }
      if (page?.found && page.ref === advertHost(entry.card.ref)) {
        detail = page;
        read++;
      } else unread++;
    }
    const { rental, reason } = alquileresUyToRawRental(entry.card, entry.type, { ...ctx, pin: pinFor(entry.card.ref), detail });
    if (rental) listings.push(rental);
    else reject(reason!);
  }

  // Every card turned away is a page that changed, not a market that emptied: keep what was stored.
  const collapsed = found.size >= 20 && !listings.length;
  const reasons = [...rejected].map(([reason, n]) => {
    const [one, many] = REJECTION_NOTE[reason];
    return plural(n, one, many).replace("{days}", String(ctx.maxAgeDays));
  });
  const note = `${plural(searches, "búsqueda", "búsquedas")}, ${plural(found.size, "aviso", "avisos")}, ${listings.length} publicados` +
    (reasons.length ? ` (${reasons.join(", ")})` : "") +
    `; ${plural(read, "ficha leída", "fichas leídas")}` +
    (unread ? `, ${plural(unread, "ficha sin leer", "fichas sin leer")}` : "") +
    (withdrawn ? `, ${plural(withdrawn, "aviso retirado", "avisos retirados")}` : "") +
    (partial ? " — cobertura parcial; se conservan avisos no vistos" : "") +
    (collapsed ? " — se descartaron todos: la página cambió, se conserva lo anterior" : "") +
    failureNote;
  return { key: "alquileresuy", ok: !collapsed, complete: !partial && !collapsed, listings: collapsed ? [] : listings, note };
}
