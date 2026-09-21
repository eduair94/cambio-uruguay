// El número comercial de una automotora, leído de la página de contacto de SU propia web (una URL
// fija por fuente, `contactPage` en el registro). Una lectura por corrida diaria, con la misma red que
// el resto de esa fuente (Car One sale por proxy desde el VPS). Una lectura fallida o vacía conserva
// lo anterior con su fecha vieja, que vence sola (CAR_CONTACT_MAX_AGE_DAYS en ./build.ts).
//
// Medido el 2026-09-21: las seis publican su número ahí, en `tel:`, en un enlace de WhatsApp o
// impreso; dos de ellas un 0800. Ninguna lo pone en la descripción de sus autos (0 de 90).
import { autosFetchText, htmlText } from "../sources/common";
import { CAR_SOURCES, CAR_SOURCE_LIST } from "../sources/registry";
import type { CarSource } from "../types";
import { phonesInLinks, phonesInText, type CarPhone } from "./phones";

export interface DealerContactRecord {
  source: CarSource;
  phones: CarPhone[];
  sourceUrl: string;
  /** La última lectura que encontró números: la fecha que se publica y la que vence. */
  observedAt: string | null;
  lastAttemptAt: string;
  ok: boolean;
  note: string | null;
  failingSince: string | null;
}

export const DEALER_CONTACT_SOURCES: CarSource[] = CAR_SOURCE_LIST.filter(source => !!CAR_SOURCES[source].contactPage);
const MAX_DEALER_PHONES = 4;

/** Enlaces primero (WhatsApp, después `tel:`), después lo impreso en el texto visible. */
export function dealerPagePhones(html: string): CarPhone[] {
  const phones = [...phonesInLinks(html), ...phonesInText(htmlText(html), { contactPage: true, max: 10 })];
  return [...new Map(phones.map(phone => [phone.value, phone])).values()].slice(0, MAX_DEALER_PHONES);
}

export function nextDealerContact(
  previous: DealerContactRecord | null,
  read: { phones: CarPhone[]; failure: string | null },
  source: CarSource,
  at: string,
): DealerContactRecord {
  const sourceUrl = CAR_SOURCES[source].contactPage!;
  if (!read.failure && read.phones.length) {
    return { source, phones: read.phones, sourceUrl, observedAt: at, lastAttemptAt: at, ok: true, note: null, failingSince: null };
  }
  return {
    source,
    phones: previous?.phones ?? [],
    sourceUrl,
    observedAt: previous?.observedAt ?? null,
    lastAttemptAt: at,
    ok: false,
    note: read.failure ?? "sin números",
    failingSince: previous?.failingSince ?? at,
  };
}

export async function readDealerContacts(
  previous: ReadonlyMap<CarSource, DealerContactRecord>,
  options: { fetchPage?: (url: string, source: CarSource) => Promise<string | null>; now?: () => Date; gapMs?: number } = {},
): Promise<DealerContactRecord[]> {
  const clock = options.now ?? (() => new Date());
  const gapMs = options.gapMs ?? 1_500;
  const records: DealerContactRecord[] = [];
  for (const [index, source] of DEALER_CONTACT_SOURCES.entries()) {
    if (index && gapMs) await new Promise(resolve => setTimeout(resolve, gapMs));
    const url = CAR_SOURCES[source].contactPage!;
    let html: string | null;
    let failure: string | null = null;
    if (options.fetchPage) html = await options.fetchPage(url, source);
    else ({ body: html, failure } = await autosFetchText(url, 30_000, source));
    if (html === null) failure = failure ?? "sin respuesta";
    const phones = html ? dealerPagePhones(html) : [];
    records.push(nextDealerContact(previous.get(source) ?? null, { phones, failure }, source, clock().toISOString()));
  }
  return records;
}
