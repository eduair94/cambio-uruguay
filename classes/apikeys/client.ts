// Quién hace el pedido, en lo que depende de la red: su IP, si es de adentro del VPS y si es el
// navegador de un lector del propio sitio. Puro.
//
// La IP sale de `CF-Connecting-IP` si viene. Quien le pegue directo al origen puede falsificarla (o
// el Referer) y saltarse el techo anónimo: está aceptado en el diseño, porque antes no había techo
// alguno y lo que se vende —el plan de una clave— no depende de la IP.
import { networkInterfaces } from "os";
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

type Interfaces = ReturnType<typeof networkInterfaces>;

/**
 * Loopback siempre, las direcciones de la propia máquina (IPv4 e IPv6: el SSR del sitio le pega a
 * la IP pública del VPS, y el MCP y los bots salen por Cloudflare con la del VPS) y además
 * `API_INTERNAL_IPS`. Las propias salen de la máquina y no de la configuración: si la variable
 * falta o está mal escrita, el sitio no puede terminar compartiendo un solo techo anónimo.
 */
export function internalIps(env: NodeJS.ProcessEnv = process.env, interfaces: Interfaces = networkInterfaces()): Set<string> {
  const own = Object.values(interfaces)
    .flat()
    .map((info) => normalizeIp(info?.address))
    .filter((ip) => ip !== "unknown");
  const extra = String(env.API_INTERNAL_IPS || "")
    .split(/[\s,;]+/)
    .map((ip) => normalizeIp(ip))
    .filter((ip) => ip !== "unknown");
  return new Set([...LOOPBACK, ...own, ...extra]);
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
