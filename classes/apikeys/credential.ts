// La clave de la API: cómo se genera, cómo se guarda y de dónde se lee. Puro.
//
// Se guarda SÓLO el SHA-256: si la base se filtra, no se filtran claves que funcionen. El prefijo
// de 8 caracteres es lo que se le muestra al dueño para reconocerla. Se lee de tres lados porque
// hay clientes que no pueden poner cabeceras (una planilla, un widget): `?api_key=` existe para ellos.
import { createHash, randomBytes } from "crypto";

export const CREDENTIAL_PREFIX = "cu_";
const BODY_LENGTH = 32;
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const SHAPE = /^cu_[A-Za-z0-9]{32}$/;

export type HeaderBag = Record<string, string | string[] | undefined>;

export type Extracted = { kind: "none" } | { kind: "malformed" } | { kind: "present"; value: string };

export function generateCredential(random: (n: number) => Buffer = randomBytes): string {
  let body = "";
  while (body.length < BODY_LENGTH) {
    for (const byte of random(48)) {
      // 248 = 62 × 4: descartar lo que sobra evita que las primeras letras salgan más seguido.
      if (byte < 248) body += ALPHABET[byte % 62];
      if (body.length === BODY_LENGTH) break;
    }
  }
  return CREDENTIAL_PREFIX + body;
}

export function isWellFormed(raw: string): boolean {
  return SHAPE.test(raw);
}

export function hashCredential(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export function displayPrefix(raw: string): string {
  return raw.slice(0, 8);
}

export function firstHeader(value: unknown): string | undefined {
  if (Array.isArray(value)) return value.length ? String(value[0]) : undefined;
  return value === undefined || value === null ? undefined : String(value);
}

/**
 * Orden: `X-API-Key`, `Authorization: Bearer cu_…`, `?api_key=`. Un `Authorization` que no es de
 * los nuestros (Basic, un JWT de otro servicio) se ignora: no es una clave mal escrita.
 */
export function extractCredential(headers: HeaderBag, query: Record<string, unknown>): Extracted {
  const candidates: string[] = [];
  const header = firstHeader(headers["x-api-key"]);
  if (header !== undefined) candidates.push(header.trim());
  const auth = firstHeader(headers["authorization"]);
  if (auth && /^bearer\s+cu_/i.test(auth.trim())) candidates.push(auth.trim().replace(/^bearer\s+/i, ""));
  const fromQuery = firstHeader(query["api_key"]);
  if (fromQuery !== undefined) candidates.push(fromQuery.trim());
  if (!candidates.length) return { kind: "none" };
  const value = candidates[0];
  return isWellFormed(value) ? { kind: "present", value } : { kind: "malformed" };
}
