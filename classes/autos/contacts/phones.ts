// Teléfonos uruguayos que el propio vendedor escribió. Precisión antes que cobertura: ocho dígitos
// pelados también son un precio en pesos, así que un celular sin el 0 ni el 598, o un fijo, sólo
// cuentan con una palabra de contacto cerca (en la página de contacto de una automotora el contexto
// ya es de contacto). Ver docs/app/AUTOS_CONTACTOS.md.
import { fold } from "../normalize";

export interface CarPhone {
  /** "+59899123456", "+59829012345" o "08002525" (el 0800 no tiene forma internacional). */
  value: string;
  /** Celular: además de llamar se ofrece WhatsApp. */
  mobile: boolean;
}

const VALID = /^(?:\+598(?:9[1-9]\d{6}|[24]\d{7})|0800\d{4})$/;
export const validCarPhone = (value: string): boolean => VALID.test(String(value || ""));

export function normalizeCarPhone(raw: string): CarPhone | null {
  let digits = String(raw || "").replace(/\D/g, "");
  if (digits.startsWith("598")) digits = digits.slice(3);
  if (/^0?800\d{4}$/.test(digits)) return { value: `0${digits.replace(/^0/, "")}`, mobile: false };
  if (digits.startsWith("0")) digits = digits.slice(1);
  if (/^9[1-9]\d{6}$/.test(digits)) return { value: `+598${digits}`, mobile: true };
  if (/^[24]\d{7}$/.test(digits)) return { value: `+598${digits}`, mobile: false };
  return null;
}

export function displayCarPhone(value: string): string {
  if (/^0800\d{4}$/.test(value)) return `0800 ${value.slice(4)}`;
  const national = value.replace(/^\+598/, "");
  if (/^9\d{7}$/.test(national)) return `0${national.slice(0, 2)} ${national.slice(2, 5)} ${national.slice(5)}`;
  if (/^[24]\d{7}$/.test(national)) return `${national.slice(0, 4)} ${national.slice(4)}`;
  return value;
}

const WHATSAPP_LINK = /(?:wa\.me\/|api\.whatsapp\.com\/send\/?\?phone=|whatsapp:\/\/send\?phone=)\+?(\d{8,13})/gi;
const TEL_LINK = /href=["']tel:([^"']+)["']/gi;

const dedupe = (phones: readonly CarPhone[]): CarPhone[] => [...new Map(phones.map(phone => [phone.value, phone])).values()];

/** `tel:` y enlaces de WhatsApp de una página: WhatsApp primero, que es como se contacta acá. */
export function phonesInLinks(html: string): CarPhone[] {
  const source = String(html || "");
  const found: CarPhone[] = [];
  for (const match of source.matchAll(WHATSAPP_LINK)) {
    const phone = normalizeCarPhone(match[1]!);
    if (phone?.mobile) found.push(phone);
  }
  for (const match of source.matchAll(TEL_LINK)) {
    const phone = normalizeCarPhone(match[1]!);
    if (phone) found.push(phone);
  }
  return dedupe(found);
}

const CONTACT_WORD = /\b(?:cel(?:ular)?|tel(?:efono|ef)?|whats?app|whats|wsp|wpp|llam(?:ar|en|a|ame)|contacto|contactar(?:se)?|consultas?|comunicarse|comunicate|escribime|escribir|numero|nro)\b/;
// "precio $ 24500000" o "U$S 91500000": ocho dígitos detrás de una moneda son un monto, no un número.
const MONEY_BEFORE = /(?:\$|u\$s|us\$|usd|u\$d|precio|pesos)\s*[:.]?\s*$/;
// Celular con el 0 o el 598, cualquier agrupación de a un separador: "099 123 456", "(094) 44 22 99".
const MOBILE = /(?<!\d)(\+?\s?598[\s.-]*)?\(?(0)?9[1-9]\)?(?:[\s.-]?\d){6}(?!\d)/g;
// Fijo: agrupación estricta, porque "2.450.000" con agrupación libre también son ocho dígitos.
const LANDLINE = /(?<!\d)(?:\+?\s?598[\s.-]*)?([24]\d{3})[\s.-]?(\d{4})(?!\d)/g;
const TOLL_FREE = /(?<!\d)0800[\s.-]?\d{4}(?!\d)/g;
const YEAR = /^(?:19|20)\d{2}$/;

export function phonesInText(text: string, options: { contactPage?: boolean; max?: number } = {}): CarPhone[] {
  const source = String(text || "");
  const max = options.max ?? 3;
  const hits: Array<{ index: number; phone: CarPhone }> = [];
  const nearContact = (start: number, end: number): boolean =>
    !!options.contactPage || CONTACT_WORD.test(fold(source.slice(Math.max(0, start - 40), end + 20)));
  const afterMoney = (start: number): boolean => MONEY_BEFORE.test(fold(source.slice(Math.max(0, start - 12), start)));
  for (const match of source.matchAll(WHATSAPP_LINK)) {
    const phone = normalizeCarPhone(match[1]!);
    if (phone?.mobile) hits.push({ index: match.index!, phone });
  }
  for (const match of source.matchAll(TOLL_FREE)) {
    const phone = normalizeCarPhone(match[0]);
    if (phone) hits.push({ index: match.index!, phone });
  }
  for (const match of source.matchAll(MOBILE)) {
    const start = match.index!;
    const bare = !match[1] && !match[2];
    if (bare && (!nearContact(start, start + match[0].length) || afterMoney(start))) continue;
    const phone = normalizeCarPhone(match[0]);
    if (phone) hits.push({ index: start, phone });
  }
  for (const match of source.matchAll(LANDLINE)) {
    const start = match.index!;
    if (YEAR.test(match[1]!) && YEAR.test(match[2]!)) continue;
    if (!nearContact(start, start + match[0].length) || afterMoney(start)) continue;
    const phone = normalizeCarPhone(match[0]);
    if (phone) hits.push({ index: start, phone });
  }
  const phones = dedupe(hits.sort((a, b) => a.index - b.index).map(hit => hit.phone));
  // Más de cinco números distintos no es un vendedor: es una lista (una agencia, un grupo, un spam).
  if (phones.length > 5) return [];
  return phones.slice(0, max);
}
