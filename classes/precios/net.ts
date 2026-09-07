// El SIPC es una API pública del Estado, sin clave y sin Cloudflare.
//
// `precios.gub.uy` responde 301 hacia `www.precios.uy`, así que la fuente es
// oficial (MEF / Área Defensa del Consumidor) y su `robots.txt` sólo excluye
// `/wp-admin/`.
//
// Acá identificarse no nos hace invisibles —que es lo que pasó con El País, donde
// una UA propia cobraba 403— sino ubicables. Una corrida son 217 peticiones al
// mismo host, así que la pausa entre pedidos existe por cortesía, no por bloqueo.
export const SIPC_BASE = process.env.PRECIOS_BASE_URL || "https://www.precios.uy/sipc2Web/recursos/sipc";

/** West, South, East, North: el bbox que cubre todo el país en una llamada. */
export const NATIONAL_BBOX = Object.freeze({ v1: -58.5, v2: -35.2, v3: -53.0, v4: -30.0 });

const UA =
  process.env.PRECIOS_USER_AGENT ||
  "CambioUruguayBot/1.0 (+https://cambio-uruguay.com/precios-de-supermercado-uruguay; SIPC price index; contact via site)";
const GAP_MS = Number(process.env.PRECIOS_HOST_GAP_MS || 250);
const TIMEOUT_MS = Number(process.env.PRECIOS_HTTP_TIMEOUT_MS || 30_000);
const RETRIES = Number(process.env.PRECIOS_RETRIES || 2);

export const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

let lastHit = 0;

/** Una petición cortés con reintento. Devuelve null en vez de tirar. */
export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T | null> {
  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    const gap = Date.now() - lastHit;
    if (gap < GAP_MS) await sleep(GAP_MS - gap);
    try {
      const response = await fetch(url, {
        ...init,
        headers: { Accept: "application/json", "User-Agent": UA, ...(init?.headers || {}) },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      lastHit = Date.now();
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return (await response.json()) as T;
    } catch (error) {
      lastHit = Date.now();
      if (attempt === RETRIES) {
        console.error(`[precios] falló ${url}: ${(error as Error).message}`);
        return null;
      }
      await sleep(500 * (attempt + 1));
    }
  }
  return null;
}
