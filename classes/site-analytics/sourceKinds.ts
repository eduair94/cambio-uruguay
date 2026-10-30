// Qué es cada fuente de tráfico: el id con que se agrupa y el tipo con que se publica.
//
// GA4 entrega `sessionSource` tal cual llegó, y la misma fuente viene escrita de muchas maneras:
// `t.co` es X, `com.reddit.frontpage` es la app de Reddit, `es.search.yahoo.com` y `yahoo` son el
// mismo buscador. Sin normalizar, la tabla de /origen-del-trafico partía a Reddit en tres filas y a
// Yahoo en doce.
//
// Y hay fuentes que no son fuentes: `auto`, `button` y `/tarjetas-de-credito-uruguay` con medio
// `(not set)` eran eventos propios con un parámetro `source` que GA4 tomó como campaña (corregido en
// `a0417e0b`), y `localhost:3311` es un servidor de desarrollo que reporta a la misma propiedad.
// Todo eso va a "sin-atribuir" y nunca se lista con nombre.

export type SourceKind = "buscador" | "ia" | "social" | "mensajes" | "sitio" | "propio" | "directo" | "sin-atribuir";

/** Orden en que la página los muestra. */
export const SOURCE_KINDS: readonly SourceKind[] = Object.freeze([
  "buscador",
  "directo",
  "ia",
  "social",
  "sitio",
  "mensajes",
  "propio",
  "sin-atribuir",
]);

/** Las apps de Android llegan como `android-app://<paquete>`. */
const APP_PACKAGES: Record<string, string> = {
  "com.reddit.frontpage": "reddit.com",
  "com.google.android.googlequicksearchbox": "google",
  "com.google.android.gm": "gmail",
  "com.linkedin.android": "linkedin.com",
  "com.slack": "slack",
  "com.facebook.katana": "facebook.com",
  "com.facebook.orca": "messenger",
  "com.instagram.android": "instagram.com",
  "com.whatsapp": "whatsapp",
  "org.telegram.messenger": "telegram",
  "com.twitter.android": "x.com",
  "com.microsoft.teams": "teams",
  // La app de Android del propio sitio (TWA).
  "com.cambio_uruguay.twa": "app-cambio-uruguay",
};

/** Alias exactos, después de sacar `www.`, `m.`, `l.`… */
const ALIASES: Record<string, string> = {
  "t.co": "x.com",
  "twitter.com": "x.com",
  "chat.openai.com": "chatgpt.com",
  openai: "chatgpt.com",
  chatgpt: "chatgpt.com",
  "copilot.microsoft.com": "copilot.com",
  copilot: "copilot.com",
  gemini: "gemini.google.com",
  "bard.google.com": "gemini.google.com",
  perplexity: "perplexity.ai",
  deepseek: "chat.deepseek.com",
  "deepseek.com": "chat.deepseek.com",
  "mail.google.com": "gmail",
  "outlook.live.com": "outlook",
  "outlook.office.com": "outlook",
  "outlook.office365.com": "outlook",
  "web.whatsapp.com": "whatsapp",
  "wa.me": "whatsapp",
  "web.telegram.org": "telegram",
  "t.me": "telegram",
  "teams.microsoft.com": "teams",
  "teams.live.com": "teams",
  "teams.public.onecdn.static.microsoft": "teams",
  "youtu.be": "youtube.com",
  "lnkd.in": "linkedin.com",
  "search.brave.com": "brave",
  "duckduckgo.com": "duckduckgo",
  "ecosia.org": "ecosia",
  "qwant.com": "qwant",
  "petalsearch.com": "petal",
  "startpage.com": "startpage",
  "ya.ru": "yandex",
};

/** Prefijos que no cambian quién mandó la visita: `m.facebook.com` es Facebook. */
const NOISE_PREFIX = /^(?:www\d?|m|l|lm|mobile|out|old|new|np|amp)\./;

/** `google.com`, `google.com.uy`, `google.es`: el buscador; `mail.google.com` no. */
const GOOGLE_HOST = /^google\.[a-z]{2,3}(?:\.[a-z]{2})?$/;
const YANDEX_HOST = /^yandex\.[a-z]{2,3}(?:\.[a-z]{2})?$/;
const BAIDU_HOST = /^baidu\.[a-z]{2,3}$/;
const BING_HOST = /^(?:[a-z]{2}\.)?bing\.com$/;

/** Una dirección de red local o de desarrollo, o una IP pelada (nadie enlaza a una IP). */
function isDevOrIp(host: string): boolean {
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".localhost")) return true;
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)) return true;
  return host.startsWith("[") || (host.includes(":") && /^[0-9a-f:]+$/.test(host));
}

/**
 * El id con que se agrupa una fuente. Para un dominio es el dominio sin `www.` ni puerto; para los
 * conocidos, su alias (`x.com`, `google`, `yahoo`). Una fuente con forma de ruta (`/algo`) se
 * devuelve tal cual: es un artefacto y `kindOf` la manda a "sin-atribuir".
 */
export function sourceId(raw: string): string {
  let s = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (!s) return "(not set)";
  if (s.startsWith("/") || s.startsWith("(")) return s;
  s = s.replace(/^android-app:\/\//, "app:").replace(/^[a-z]+:\/\//, "");
  if (s.startsWith("app:")) {
    const pkg = s.slice(4).split("/")[0];
    return APP_PACKAGES[pkg] || pkg;
  }
  // Host sin ruta ni puerto. `localhost:3311` → `localhost`.
  let host = s.split(/[/?#]/)[0].replace(/:\d+$/, "").replace(/\.$/, "");
  if (APP_PACKAGES[host]) return APP_PACKAGES[host];
  while (NOISE_PREFIX.test(host) && host.split(".").length > 2) host = host.replace(NOISE_PREFIX, "");
  if (ALIASES[host]) return ALIASES[host];
  // Teams y los documentos de Office abiertos en el navegador: un enlace pegado en un chat o en una
  // planilla de trabajo, no un sitio que enlaza.
  if (host.endsWith(".teams.cdn.office.net") || host.endsWith(".teams.microsoft.com")) return "teams";
  if (host.endsWith("officeapps.live.com") || host.endsWith(".office.com") || host.endsWith(".sharepoint.com"))
    return "office";
  if (host === "google" || GOOGLE_HOST.test(host)) return "google";
  if (host === "bing" || BING_HOST.test(host)) return "bing";
  if (host === "yahoo" || host === "search.yahoo.com" || host.endsWith(".search.yahoo.com")) return "yahoo";
  if (host === "yandex" || YANDEX_HOST.test(host)) return "yandex";
  if (host === "baidu" || BAIDU_HOST.test(host)) return "baidu";
  return host;
}

const SEARCH = new Set([
  "google",
  "bing",
  "yahoo",
  "duckduckgo",
  "yandex",
  "ecosia",
  "brave",
  "qwant",
  "petal",
  "baidu",
  "startpage",
]);
const AI = new Set([
  "chatgpt.com",
  "gemini.google.com",
  "perplexity.ai",
  "copilot.com",
  "claude.ai",
  "chat.deepseek.com",
  "meta.ai",
  "grok.com",
  "you.com",
  "phind.com",
  "chat.mistral.ai",
]);
const SOCIAL = new Set([
  "x.com",
  "reddit.com",
  "facebook.com",
  "instagram.com",
  "linkedin.com",
  "youtube.com",
  "tiktok.com",
  "threads.net",
  "bsky.app",
  "pinterest.com",
  "mastodon.social",
]);
const MESSAGES = new Set([
  "gmail",
  "outlook",
  "whatsapp",
  "telegram",
  "messenger",
  "slack",
  "teams",
  "office",
  "discord.com",
  "newsletter",
]);
/**
 * Herramientas que abren la página sin que nadie haya seguido un enlace: rastreadores de posiciones
 * SEO y gestores de pestañas. `online.seranking.com` trajo 4 "visitas" un solo día a la página que
 * se estaba midiendo; contarlo como un sitio que enlaza sería inventar un backlink.
 */
const TOOLS = new Set([
  "online.seranking.com",
  "seranking.com",
  "app.ahrefs.com",
  "ahrefs.com",
  "semrush.com",
  "similarweb.com",
  "workona.com",
  "pagespeed.web.dev",
  "search.google.com",
  "lookerstudio.google.com",
  "analytics.google.com",
  "tagassistant.google.com",
]);
/** Sitios y apps del mismo dueño: un enlace desde ahí no es un backlink ganado. */
const OWN_SUFFIXES = ["digitalshopuy.com", "checkleaked.cc", "eduair94.github.io", "cambio-uruguay.com"];
export const SITE_HOSTS: readonly string[] = Object.freeze(["cambio-uruguay.com", "www.cambio-uruguay.com"]);

/** El tipo de una fuente, a partir de su id y del medio que informó GA4. */
export function kindOf(id: string, medium: string): SourceKind {
  const m = String(medium ?? "")
    .trim()
    .toLowerCase();
  if (id === "(direct)") return "directo";
  if (!id || id.startsWith("/") || id.startsWith("(") || isDevOrIp(id)) return "sin-atribuir";
  // El propio sitio como referente es navegación interna que GA4 partió en dos sesiones.
  if (SITE_HOSTS.includes(id) || TOOLS.has(id)) return "sin-atribuir";
  if (SEARCH.has(id) || m === "organic") return "buscador";
  if (AI.has(id) || m === "ai-assistant") return "ia";
  if (SOCIAL.has(id) || m === "social") return "social";
  if (MESSAGES.has(id) || id.startsWith("webmail.") || id.startsWith("mail.") || m === "email") return "mensajes";
  if (id === "app-cambio-uruguay" || OWN_SUFFIXES.some((s) => id === s || id.endsWith(`.${s}`))) return "propio";
  // Sin punto no es un dominio: `auto`, `button` y otros nombres de evento colados como campaña.
  if (!id.includes(".")) return "sin-atribuir";
  return "sitio";
}

const LABELS: Record<string, string> = {
  google: "Google",
  bing: "Bing",
  yahoo: "Yahoo",
  duckduckgo: "DuckDuckGo",
  yandex: "Yandex",
  ecosia: "Ecosia",
  brave: "Brave Search",
  qwant: "Qwant",
  petal: "Petal Search",
  baidu: "Baidu",
  startpage: "Startpage",
  "chatgpt.com": "ChatGPT",
  "gemini.google.com": "Gemini",
  "perplexity.ai": "Perplexity",
  "copilot.com": "Copilot",
  "claude.ai": "Claude",
  "chat.deepseek.com": "DeepSeek",
  "meta.ai": "Meta AI",
  "grok.com": "Grok",
  "x.com": "X (Twitter)",
  "reddit.com": "Reddit",
  "facebook.com": "Facebook",
  "instagram.com": "Instagram",
  "linkedin.com": "LinkedIn",
  "youtube.com": "YouTube",
  "tiktok.com": "TikTok",
  gmail: "Gmail",
  outlook: "Outlook",
  whatsapp: "WhatsApp",
  telegram: "Telegram",
  messenger: "Messenger",
  slack: "Slack",
  teams: "Microsoft Teams",
  office: "Documentos de Office",
  newsletter: "Newsletter de Cambio Uruguay",
  "github.com": "GitHub",
  "app-cambio-uruguay": "App de Cambio Uruguay (Android)",
  "(direct)": "Directo",
};

export function sourceLabel(id: string): string {
  return LABELS[id] || id;
}
