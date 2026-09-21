// check_online_store: dated trust signals of an online store (domain age, Google,
// Trustpilot, Reddit mentions, policies, payment methods). Signals, never a verdict.

import { compact, fmt, fold, PUBLIC_SITE } from "../format.js";
import type { ToolOutput } from "../output.js";
import { TTL, type SiteApi } from "../site.js";

interface StoreRow {
  key: string;
  name: string;
  domain?: string;
  kind?: string;
  rubros?: string[];
  since?: string | null;
  trustpilot?: { score?: number; reviews?: number } | null;
  google?: { rating?: number; reviews?: number } | null;
  redditMentions?: number | null;
  catalogOffers?: number | null;
  signals?: number;
  hasProfile?: boolean;
}

interface StoreProfile {
  profile?: {
    name?: string;
    domain?: string;
    age?: { since?: string; source?: string; checkedAt?: string } | null;
    google?: { rating?: number; reviews?: number; address?: string; url?: string; checkedAt?: string } | null;
    trustpilot?: { score?: number; reviews?: number; url?: string; checkedAt?: string } | null;
    reddit?: { mentions?: number; checkedAt?: string } | Record<string, unknown> | null;
    site?: {
      status?: string;
      https?: boolean;
      platform?: string;
      phone?: boolean;
      whatsapp?: boolean;
      email?: boolean;
      rut?: string | null;
      address?: string | null;
      policies?: Record<string, string | null>;
      payments?: string[];
      checkedAt?: string;
    } | null;
    catalog?: { offers?: number; verticals?: string[] } | null;
  };
}

const day = (v?: string | null) => (v ? v.slice(0, 10) : undefined);

export async function checkOnlineStore(site: SiteApi, input: { name: string }): Promise<ToolOutput> {
  const res = await site.get<{ stores?: StoreRow[] }>("/api/stores", undefined, { ttlMs: TTL.catalog });
  const stores = res.stores ?? [];
  const wanted = fold(input.name).replace(/^https?:[/][/]/, "").replace(/^www[.]/, "").replace(/[/].*$/, "");
  const score = (s: StoreRow) => {
    const names = [s.key, s.name, s.domain ?? ""].map(fold);
    if (names.some((n) => n === wanted)) return 3;
    if (names.some((n) => n.startsWith(wanted) || wanted.startsWith(n))) return 2;
    if (names.some((n) => n.includes(wanted))) return 1;
    return 0;
  };
  const ranked = stores.map((s) => ({ s, v: score(s) })).filter((x) => x.v > 0).sort((a, b) => b.v - a.v);
  const hit = ranked[0]?.s;
  if (!hit) {
    return {
      text:
        `"${input.name}" no está entre las ${fmt(stores.length)} tiendas relevadas. ` +
        "Revisá por tu cuenta: antigüedad del dominio, RUT y dirección física en el sitio, políticas de devolución, reseñas en Google y Reddit. " +
        `Directorio: ${PUBLIC_SITE}/tiendas-online-uruguay`,
      data: { found: false, known: stores.length },
    };
  }
  const detail = hit.hasProfile
    ? await site.get<StoreProfile>(`/api/stores/${encodeURIComponent(hit.key)}`, undefined, { ttlMs: TTL.catalog }).catch(() => null)
    : null;
  const p = detail?.profile;
  const siteInfo = p?.site;
  const reddit = p?.reddit && typeof (p.reddit as { mentions?: number }).mentions === "number" ? (p.reddit as { mentions: number }).mentions : hit.redditMentions;
  const signals = compact({
    domainSince: day(p?.age?.since ?? hit.since),
    google: p?.google ?? hit.google ?? undefined,
    trustpilot: p?.trustpilot ?? hit.trustpilot ?? undefined,
    redditMentions: reddit ?? undefined,
    https: siteInfo?.https,
    contact: siteInfo ? compact({ phone: siteInfo.phone, whatsapp: siteInfo.whatsapp, email: siteInfo.email, rut: siteInfo.rut, address: siteInfo.address }) : undefined,
    policies: siteInfo?.policies,
    payments: siteInfo?.payments,
    platform: siteInfo?.platform,
    offersInOurCatalogs: p?.catalog?.offers ?? hit.catalogOffers ?? undefined,
  });
  const g = signals.google as { rating?: number; reviews?: number } | undefined;
  const t = signals.trustpilot as { score?: number; reviews?: number } | undefined;
  const pol = (signals.policies ?? {}) as Record<string, string | null>;
  const lines = [
    `${hit.name} (${hit.domain ?? hit.key})${hit.rubros?.length ? ` · ${hit.rubros.join(", ")}` : ""}${hit.kind === "compra-exterior" ? " · compra en el exterior" : ""}`,
    signals.domainSince ? `• Dominio activo desde ${signals.domainSince}.` : "• Antigüedad del dominio: sin dato.",
    g?.rating ? `• Google: ${fmt(g.rating, 1)}★ con ${fmt(g.reviews ?? 0)} reseñas.` : "• Google: sin ficha propia encontrada.",
    t?.score ? `• Trustpilot: ${fmt(t.score, 1)}/5 con ${fmt(t.reviews ?? 0)} opiniones.` : "",
    typeof signals.redditMentions === "number" ? `• Menciones en r/uruguay y r/montevideo (24 meses): ${fmt(signals.redditMentions)}.` : "",
    siteInfo
      ? `• Sitio: ${siteInfo.https ? "HTTPS" : "sin HTTPS"}; contacto ${[siteInfo.phone && "teléfono", siteInfo.whatsapp && "WhatsApp", siteInfo.email && "email"].filter(Boolean).join(", ") || "no visible"}; RUT ${siteInfo.rut ? "visible" : "no visible"}; ` +
        `política de devoluciones ${pol.returns ? "publicada" : "no encontrada"}.`
      : "",
    signals.payments ? `• Medios de pago: ${(signals.payments as string[]).join(", ")}.` : "",
    "Son señales con fecha, no un veredicto de confianza: una tienda nueva puede ser seria y una vieja puede fallar.",
    `Ficha: ${PUBLIC_SITE}/tiendas-online-uruguay/${hit.key}`,
  ].filter(Boolean);
  return {
    text: lines.join("\n"),
    data: {
      found: true,
      store: compact({ key: hit.key, name: hit.name, domain: hit.domain, kind: hit.kind, rubros: hit.rubros }),
      signals,
      alternatives: ranked.slice(1, 5).map((x) => x.s.name),
      siteUrl: `${PUBLIC_SITE}/tiendas-online-uruguay/${hit.key}`,
    },
  };
}
