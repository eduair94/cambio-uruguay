// Quién hace el pedido, en lo que depende de la red: su IP, si es de adentro del VPS y si es el
// navegador de un lector del propio sitio. Puro.
//
// La IP sale de `CF-Connecting-IP` si viene. Quien le pegue directo al origen puede falsificarla (o
// el Referer) y saltarse el techo anónimo: está aceptado en el diseño, porque antes no había techo
// alguno y lo que se vende —el plan de una clave— no depende de la IP.
import { firstHeader, type HeaderBag } from "./credential";

const LOOPBACK = ["127.0.0.1", "::1"];
const SITE_HOST = "cambio-uruguay.com";

export function normalizeIp(ip?: string): string {
  const raw = String(ip ?? "").trim();
  if (!raw) return "unknown";
  return raw.startsWith("::ffff:") ? raw.slice(7) : raw;
}

export function clientIp(headers: HeaderBag, reqIp?: string): string {
  const cf = firstHeader(headers["cf-connecting-ip"]);
  return normalizeIp(cf && cf.trim() ? cf : reqIp);
}

/** Loopback siempre (el SSR del sitio, el MCP y los bots viven en el VPS) más `API_INTERNAL_IPS`. */
export function internalIps(env: NodeJS.ProcessEnv = process.env): Set<string> {
  const extra = String(env.API_INTERNAL_IPS || "")
    .split(/[\s,;]+/)
    .map((ip) => normalizeIp(ip))
    .filter((ip) => ip !== "unknown");
  return new Set([...LOOPBACK, ...extra]);
}

/**
 * El navegador de un lector del sitio: detrás de un CGNAT comparten IP cientos de lectores, así que
 * no pueden contar contra el techo anónimo de esa IP. Se compara el HOST, nunca un "contiene".
 */
export function isSiteReferrer(origin?: string, referer?: string): boolean {
  for (const raw of [origin, referer]) {
    if (!raw) continue;
    try {
      const host = new URL(raw).hostname.toLowerCase();
      if (host === SITE_HOST || host.endsWith(`.${SITE_HOST}`)) return true;
    } catch {
      // Una cabecera que no es URL no prueba nada.
    }
  }
  return false;
}
