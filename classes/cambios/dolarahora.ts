import axios from "axios";
import { load } from "cheerio";
import { CambioObj } from "../../interfaces/Cambio";

const DOLAR_AHORA_CARDS_URL = "https://dolarahora.uy/cards";

export type DolarAhoraInstitution = "scotia" | "bbva";

const INSTITUTION_HOSTS: Record<DolarAhoraInstitution, string> = {
  scotia: "scotiabank.com.uy",
  bbva: "bbva.com.uy",
};

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
  const host = INSTITUTION_HOSTS[institution];
  const anchor = $("a[href]").filter((_, element) => {
    const href = $(element).attr("href") || "";
    try {
      return new URL(href).hostname.endsWith(host);
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

  return {
    code: "USD",
    type: "TRANSFERENCIA",
    name: "Dólar online",
    buy,
    sell,
  };
}

export async function fetchDolarAhoraUsdRate(
  institution: DolarAhoraInstitution
): Promise<CambioObj | null> {
  try {
    const response = await axios.get(DOLAR_AHORA_CARDS_URL, {
      params: {
        institutions: institution,
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
    return typeof response.data === "string"
      ? parseDolarAhoraUsdRate(response.data, institution)
      : null;
  } catch (error) {
    console.warn(
      `DólarAhora: could not fetch ${institution} USD rate`,
      (error as Error).message
    );
    return null;
  }
}
