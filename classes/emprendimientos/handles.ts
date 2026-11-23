// Handles de Instagram: normalizar y sacarlos de un texto (una bio, un comentario de Reddit, una
// ficha de Uruguay Emprendedor). Precisión sobre recall: un handle mal leído cuesta una lectura de
// Instagram, y una ruta de Instagram (`/p/`, `/explore/`) leída como cuenta cuesta lo mismo.

/** Las reglas de Instagram: 1–30 letras, números, punto y guion bajo, sin punto al final. */
const HANDLE = /^[a-z0-9._]{1,30}$/;

/** Primeros segmentos de instagram.com que no son una cuenta. */
const RESERVED = new Set([
  "p", "reel", "reels", "tv", "stories", "explore", "accounts", "about", "legal", "developer", "direct", "web",
  "challenge", "privacy", "emails", "session", "ar", "lite", "download", "directory", "topics", "invites",
  "share", "s", "tags", "locations", "help", "api", "oauth", "graphql", "static", "embed", "instagram",
]);

export function normalizeHandle(raw: string | null | undefined): string | null {
  const handle = String(raw ?? "").trim().replace(/^@+/, "").replace(/\/+$/, "").toLowerCase();
  if (!HANDLE.test(handle)) return null;
  if (handle.endsWith(".") || handle.startsWith(".") || handle.includes("..")) return null;
  if (RESERVED.has(handle)) return null;
  // Un handle de sólo números o de sólo signos no es una tienda que alguien escribió a mano.
  if (!/[a-z]/.test(handle)) return null;
  return handle;
}

/** La cuenta de una URL de Instagram (`instagram.com/<handle>`, con o sin www, query o barra). */
export function handleFromInstagramUrl(url: string): string | null {
  const match = /(?:^|\/\/|\.)instagram\.com\/([A-Za-z0-9._]{1,30})(?=$|[/?#\s"'<>)\]])/i.exec(String(url || ""));
  return match ? normalizeHandle(match[1]) : null;
}

/** Todas las cuentas que un texto enlaza con una URL de Instagram, en orden, una vez cada una. */
export function instagramLinksIn(text: string): string[] {
  const out: string[] = [];
  // Reddit escapa el guion bajo en markdown (`vapo\_\_herbs`): se saca la barra antes de leer.
  const clean = String(text || "").replace(/\\_/g, "_");
  for (const match of clean.matchAll(/instagram\.com\/([A-Za-z0-9._]{1,30})(?=$|[/?#\s"'<>)\]])/gi)) {
    const handle = normalizeHandle(match[1]);
    if (handle && !out.includes(handle)) out.push(handle);
  }
  return out;
}

/**
 * Las `@menciones` de un texto. Sólo con la arroba pegada al handle y sin una letra antes (un
 * correo `hola@tienda.com` no es una mención), y nunca un dominio (`@tienda.com.uy`).
 *
 * Un handle que TERMINA en `.uy` es un handle, no un dominio: `@retroka.uy`, `@bombshop.uy`. Hasta
 * el 23/11/2026 la regla los descartaba y la bola de nieve perdía justo a las cuentas uruguayas.
 */
export function mentionsIn(text: string): string[] {
  const out: string[] = [];
  const clean = String(text || "").replace(/\\_/g, "_");
  for (const match of clean.matchAll(/(?<![\w@.])@([A-Za-z0-9._]{2,30})/g)) {
    const raw = match[1]!.replace(/\.+$/, "");
    if (/\.(?:com|net|org|gub|edu)(?:\.[a-z]{2})?$/i.test(raw)) continue;
    const handle = normalizeHandle(raw);
    if (handle && !out.includes(handle)) out.push(handle);
  }
  return out;
}

/** `l.instagram.com/?u=<destino>` → el destino; cualquier otra URL, tal cual. */
export function unwrapInstagramLink(url: string): string {
  try {
    const parsed = new URL(url);
    if (/(^|\.)l\.instagram\.com$/i.test(parsed.hostname)) {
      const target = parsed.searchParams.get("u");
      if (target) return target;
    }
  } catch {
    /* no es una URL: se devuelve como vino */
  }
  return url;
}

/** Hosts que no son "un sitio propio": mensajería, otras redes, agregadores de enlaces. */
const NOT_OWN_SITE = /(?:^|\.)(?:wa\.me|whatsapp\.com|instagram\.com|facebook\.com|fb\.me|fb\.com|tiktok\.com|youtube\.com|youtu\.be|twitter\.com|x\.com|threads\.net|threads\.com|linktr\.ee|linktree\.com|beacons\.ai|bio\.link|campsite\.bio|taplink\.cc|lnk\.bio|linkin\.bio|msha\.ke|carrd\.co|t\.me|telegram\.me|spotify\.com|pinterest\.com|google\.com|goo\.gl|forms\.gle|bit\.ly|tinyurl\.com|mercadolibre\.com\.uy|mercadopago\.com\.uy|mpago\.la|calendly\.com)$/i;

/** Dominio del sitio propio de la cuenta (sin www), o null si sus enlaces son sólo redes/mensajería. */
export function ownWebsite(links: readonly string[]): string | null {
  for (const link of links) {
    try {
      const host = new URL(/^https?:\/\//i.test(link) ? link : `https://${link}`).hostname.toLowerCase().replace(/^www\./, "");
      if (!host.includes(".") || NOT_OWN_SITE.test(host)) continue;
      return host;
    } catch {
      /* enlace roto: no es un sitio */
    }
  }
  return null;
}

export const hasWhatsapp = (links: readonly string[], biography: string): boolean =>
  links.some(link => /(?:^|\/\/|\.)(?:wa\.me|api\.whatsapp\.com|whatsapp\.com)\b/i.test(link)) || /\bwhats?app\b|\bwpp\b|\bwsp\b/i.test(biography);
