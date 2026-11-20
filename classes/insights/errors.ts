// La ÚNICA manera en que un error de `currency-usage-insights` se vuelve texto.
//
// Por qué existe: un error de axios lleva en `config.headers.Authorization` el token de Cloudflare,
// el JWT de Clarity o el token de acceso de Google; en `config.headers["X-Goog-Api-Key"]` la clave de
// CrUX; y en `config.params.apikey` y `request.path` la clave de Bing. Pasarle el objeto de error a la
// consola (la forma que tienen casi todos los jobs del repo) imprime todo eso en los logs de pm2. Acá un error de
// axios se reduce a la fuente, el código HTTP y el código del proveedor, sin leer nunca `config`,
// `request` ni `message`, y todo resultado pasa además por `redact()`.

const REDACT_RE =
  /(Bearer\s+\S+|(?:api)?key=[^&\s]+|(?:access_)?token=[^&\s]+|eyJ[\w-]+\.[\w-]+\.[\w-]+|ya29\.[\w.-]+|AIza[\w-]{30,}|com\.cloudflare\.api\.token\.\w+)/gi;

/** Reemplaza todo lo que tenga forma de secreto por `[redacted]`. */
export function redact(text: string): string {
  return String(text).replace(REDACT_RE, "[redacted]");
}

const VENDOR_RE = /^[\w.-]{1,40}$/;

function vendorCode(e: any): string | null {
  const data = e?.response?.data;
  const candidates = [
    data?.error?.status,
    data?.ErrorCode !== undefined && data?.ErrorCode !== null ? `ErrorCode ${data.ErrorCode}` : undefined,
    data?.errors?.[0]?.extensions?.code,
    data?.errors?.[0]?.code !== undefined ? String(data.errors[0].code) : undefined,
    e?.response ? undefined : e?.code,
  ];
  for (const c of candidates) {
    if (c === undefined || c === null) continue;
    const s = String(c);
    // "ErrorCode 3" tiene un espacio: se valida el número aparte.
    if (/^ErrorCode \d{1,4}$/.test(s) || VENDOR_RE.test(s)) return s;
  }
  return null;
}

function isAxiosLike(e: any): boolean {
  return !!e && typeof e === "object" && (e.isAxiosError === true || "response" in e || "config" in e);
}

/**
 * El error como texto para una nota, una línea de log o Telegram.
 * - axios: `<fuente>: http <status|sin respuesta>[ <código del proveedor>]`, nada más.
 * - otro Error: `<fuente>: <name>: <message, 120 caracteres>`.
 * - cualquier otra cosa: `String(e)`, 120 caracteres.
 */
export function sanitizeError(e: unknown, source?: string): string {
  let text: string;
  const err = e as any;
  if (isAxiosLike(err)) {
    const status = err?.response?.status ?? "sin respuesta";
    const vendor = vendorCode(err);
    text = `${source ?? "http"}: http ${status}${vendor ? " " + vendor : ""}`;
  } else if (err instanceof Error) {
    text = `${source ? source + ": " : ""}${err.name}: ${String(err.message || "").slice(0, 120)}`;
  } else {
    text = String(e).slice(0, 120);
  }
  return redact(text).slice(0, 300);
}

/** La línea de un error que se escapó hasta el proceso (catch de main y los dos handlers). */
export function formatFatal(e: unknown): string {
  return `[usage-insights] sync failed: ${sanitizeError(e)}`;
}
