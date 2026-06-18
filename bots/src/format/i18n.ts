// Language helpers + number/currency formatting for chat messages. Pure, no IO.

export type Lang = "es" | "en" | "pt";

const LANGS: Lang[] = ["es", "en", "pt"];

/** Map any locale string (e.g. "en-US") to a supported base language; default es. */
export function normalizeLang(x?: string): Lang {
  const base = (x || "").slice(0, 2).toLowerCase();
  return (LANGS as string[]).includes(base) ? (base as Lang) : "es";
}

const INTL_LOCALE: Record<Lang, string> = {
  es: "es-UY",
  en: "en-US",
  pt: "pt-BR",
};

/** Amount in Uruguayan pesos, localized (e.g. es → "$ 40,50"). */
export function fmtUYU(n: number, lang: Lang): string {
  return new Intl.NumberFormat(INTL_LOCALE[lang], {
    style: "currency",
    currency: "UYU",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

/** Plain number, localized. */
export function fmtNum(n: number, lang: Lang): string {
  return new Intl.NumberFormat(INTL_LOCALE[lang], {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
}

/** Signed percentage with es-style comma and 2 decimals (e.g. "+1,23%"). */
export function fmtPct(n: number): string {
  const sign = n > 0 ? "+" : n < 0 ? "-" : "";
  const body = new Intl.NumberFormat("es-UY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(n));
  return `${sign}${body}%`;
}

export interface LabelSet {
  buy: string;
  sell: string;
  spread: string;
  bestBuy: string;
  bestSell: string;
  lowestSpread: string;
  market: string;
  news: string;
  updated: string;
  house: string;
  dailyTitle: string;
  alertTitle: string;
  up: string;
  down: string;
  noData: string;
  result: string;
  help: string;
  subscribed: string;
  unsubscribed: string;
  langSet: string;
  more: string;
}

const LABELS: Record<Lang, LabelSet> = {
  es: {
    buy: "Compra",
    sell: "Venta",
    spread: "Spread",
    bestBuy: "Mejor compra",
    bestSell: "Mejor venta",
    lowestSpread: "Menor spread",
    market: "Promedio mercado",
    news: "Noticias",
    updated: "Actualizado",
    house: "Casa",
    dailyTitle: "Resumen del mercado",
    alertTitle: "Alerta de cotización",
    up: "subió",
    down: "bajó",
    noData: "Sin datos disponibles",
    result: "Resultado",
    help: "Comandos disponibles",
    subscribed: "Suscripción activada. Recibirás el resumen diario.",
    unsubscribed: "Suscripción cancelada.",
    langSet: "Idioma actualizado",
    more: "ver más",
  },
  en: {
    buy: "Buy",
    sell: "Sell",
    spread: "Spread",
    bestBuy: "Best buy",
    bestSell: "Best sell",
    lowestSpread: "Lowest spread",
    market: "Market average",
    news: "News",
    updated: "Updated",
    house: "House",
    dailyTitle: "Market summary",
    alertTitle: "Rate alert",
    up: "rose",
    down: "fell",
    noData: "No data available",
    result: "Result",
    help: "Available commands",
    subscribed: "Subscribed. You'll get the daily summary.",
    unsubscribed: "Unsubscribed.",
    langSet: "Language updated",
    more: "see more",
  },
  pt: {
    buy: "Compra",
    sell: "Venda",
    spread: "Spread",
    bestBuy: "Melhor compra",
    bestSell: "Melhor venda",
    lowestSpread: "Menor spread",
    market: "Média do mercado",
    news: "Notícias",
    updated: "Atualizado",
    house: "Casa",
    dailyTitle: "Resumo do mercado",
    alertTitle: "Alerta de cotação",
    up: "subiu",
    down: "caiu",
    noData: "Sem dados disponíveis",
    result: "Resultado",
    help: "Comandos disponíveis",
    subscribed: "Inscrição ativada. Você receberá o resumo diário.",
    unsubscribed: "Inscrição cancelada.",
    langSet: "Idioma atualizado",
    more: "ver mais",
  },
};

export function L(lang: Lang): LabelSet {
  return LABELS[lang];
}
