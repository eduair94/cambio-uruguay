import axios from "axios";
import { load } from "cheerio";
import { CambioObj } from "../../interfaces/Cambio";

const DOLAR_AHORA_CARDS_URL = "https://dolarahora.uy/cards";
const CACHE_TTL_MS = 60_000;

export type DolarAhoraInstitution =
  | "brou"
  | "scotia"
  | "itau"
  | "santander"
  | "bbva"
  | "prex"
  | "oca";

type InstitutionProfile = {
  /** Hostname of the link DólarAhora renders inside the institution card. */
  host: string;
  /**
   * Row shape the fallback publishes. DólarAhora tracks the *online* rate for
   * the banks (verified against BROU: its card mirrors "Dólar eBROU", not the
   * pizarra), while OCA and Prex quote a single rate for every channel.
   */
  row: Pick<CambioObj, "code" | "type" | "name">;
};

const INSTITUTIONS: Record<DolarAhoraInstitution, InstitutionProfile> = {
  brou: {
    host: "brou.com.uy",
    row: { code: "USD", type: "EBROU", name: "Dólar eBROU" },
  },
  scotia: {
    host: "scotiabank.com.uy",
    row: { code: "USD", type: "TRANSFERENCIA", name: "Dólar online" },
  },
  itau: {
    host: "itau.com.uy",
    row: { code: "USD", type: "TRANSFERENCIA", name: "Dólar online" },
  },
  santander: {
    host: "santander.com.uy",
    row: { code: "USD", type: "TRANSFERENCIA", name: "Dólar online" },
  },
  bbva: {
    host: "bbva.com.uy",
    row: { code: "USD", type: "TRANSFERENCIA", name: "Dólar online" },
  },
  prex: {
    host: "prexcard.com",
    row: { code: "USD", type: "", name: "Dólar" },
  },
  oca: {
    host: "oca.com.uy",
    row: { code: "USD", type: "", name: "Dólar" },
  },
};

export const DOLAR_AHORA_INSTITUTIONS = Object.keys(
  INSTITUTIONS
) as DolarAhoraInstitution[];

function parseMoney(value: string): number {
  const compact = value.replace(/[^\d,.-]/g, "");
  const comma = compact.lastIndexOf(",");
  const dot = compact.lastIndexOf(".");
  const normalized =
    comma > dot
      ? compact.replace(/\./g, "").replace(",", ".")
      : compact.replace(/,/g, "");
  return Number.parseFloat(normalized);
}

function labelledMoney(cardText: string, label: "Compra" | "Venta"): number {
  const match = cardText.match(new RegExp(`${label}\\s*\\$?\\s*([\\d.,]+)`, "i"));
  return match ? parseMoney(match[1]) : Number.NaN;
}

export function parseDolarAhoraUsdRate(
  html: string,
  institution: DolarAhoraInstitution
): CambioObj | null {
  if (!html) return null;

  const $ = load(html);
  const profile = INSTITUTIONS[institution];
  if (!profile) return null;

  const anchor = $("a[href]").filter((_, element) => {
    const href = $(element).attr("href") || "";
    try {
      return new URL(href).hostname.endsWith(profile.host);
    } catch {
      return false;
    }
  }).first();
  if (anchor.length === 0) return null;

  const card = anchor.closest(".card");
  if (card.length === 0) return null;
  const text = card.text().replace(/\s+/g, " ").trim();
  const buy = labelledMoney(text, "Compra");
  const sell = labelledMoney(text, "Venta");
  if (
    !Number.isFinite(buy) ||
    !Number.isFinite(sell) ||
    buy <= 0 ||
    sell <= 0 ||
    buy >= sell
  ) {
    return null;
  }

  return { ...profile.row, buy, sell };
}

type CardsSnapshot = {
  at: number;
  rates: Partial<Record<DolarAhoraInstitution, CambioObj>>;
};

let snapshot: CardsSnapshot | null = null;
let inFlight: Promise<CardsSnapshot> | null = null;

async function loadCards(): Promise<CardsSnapshot> {
  const rates: CardsSnapshot["rates"] = {};

  try {
    const response = await axios.get(DOLAR_AHORA_CARDS_URL, {
      params: {
        institutions: DOLAR_AHORA_INSTITUTIONS.join(","),
        order_field: "buy",
        order_direction: "desc",
      },
      headers: {
        Accept: "text/html, */*; q=0.01",
        "Accept-Language": "es-UY,es;q=0.9",
        Referer: "https://dolarahora.uy/",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
          "(KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36",
        "X-Requested-With": "XMLHttpRequest",
      },
      timeout: 20000,
    });

    if (typeof response.data === "string") {
      for (const institution of DOLAR_AHORA_INSTITUTIONS) {
        const rate = parseDolarAhoraUsdRate(response.data, institution);
        if (rate) rates[institution] = rate;
      }
    }
  } catch (error) {
    console.warn(
      "DólarAhora: could not fetch the quotation cards",
      (error as Error).message
    );
  }

  // A failed fetch is cached too: several scrapers can fail inside the same
  // sync run and none of them should re-hammer DólarAhora while it is down.
  return { at: Date.now(), rates };
}

async function cards(): Promise<CardsSnapshot> {
  if (snapshot && Date.now() - snapshot.at < CACHE_TTL_MS) return snapshot;
  if (inFlight) return inFlight;

  inFlight = loadCards()
    .then((fresh) => {
      snapshot = fresh;
      return fresh;
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}

export function resetDolarAhoraCache(): void {
  snapshot = null;
  inFlight = null;
}

export async function fetchDolarAhoraUsdRate(
  institution: DolarAhoraInstitution
): Promise<CambioObj | null> {
  const { rates } = await cards();
  return rates[institution] || null;
}

/**
 * Runs a casa's own scraper and, when it fails or comes back without a USD
 * quote, publishes the DólarAhora reading for that institution instead of
 * leaving the casa without a dollar for the day. Rows the scraper did return
 * are always kept — the fallback only fills the missing USD slot.
 */
export async function withDolarAhoraFallback(
  institution: DolarAhoraInstitution,
  label: string,
  produce: () => Promise<CambioObj[]>
): Promise<CambioObj[]> {
  let rows: CambioObj[] = [];

  try {
    rows = (await produce()) || [];
  } catch (error) {
    console.warn(
      `${label}: own quotation failed; trying DólarAhora`,
      (error as Error).message
    );
  }

  if (rows.some((row) => row.code === "USD")) return rows;

  const fallback = await fetchDolarAhoraUsdRate(institution);
  if (!fallback) {
    console.warn(`${label}: DólarAhora has no valid USD quote either`);
    return rows;
  }

  console.log(
    `${label} DólarAhora USD fallback: buy=${fallback.buy}, sell=${fallback.sell}`
  );
  return [...rows, fallback];
}
