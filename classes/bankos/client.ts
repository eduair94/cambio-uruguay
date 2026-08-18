// Minimal signed client for the Bankos discounts backend (bankos.uy), reverse-engineered from
// the app `com.anonymous.bankos` v1.1.8. See memory/bankos-api-reverse.md for the full write-up.
//
// The backend keys discounts by BANK, not by card, so one call with every bankId returns the whole
// country's discount map (brands + GeoJSON locations + per-bank discount text). That single response
// is what `sync_bankos.ts` snapshots into the app DB as an outage fallback for
// app/server/api/bankos/discounts.get.ts.
//
// Request signing (recovered from the app's createApiHeaders/createSignature): each request carries
//   X-API-Key, X-Nonce (uuid), X-Signature = HMAC_SHA256(appSecret, nonce + path)  [hex]
// As of 2026-08 the server does not actually verify it, but we sign correctly anyway so this keeps
// working if enforcement is switched on. The credentials ship in cleartext inside the APK bundle.
import axios from "axios";
import crypto from "crypto";

export const BANKOS_BASE = process.env.BANKOS_API_BASE || "https://bankos-backend.onrender.com/api";
export const BANKOS_API_KEY = process.env.BANKOS_API_KEY || "119524fa7c27f24fc6ac040a319fbe7f";
export const BANKOS_APP_SECRET =
  process.env.BANKOS_APP_SECRET || "2eb73b9633fbd9ef2ae77f2e426c712f";

/** The 10 issuers Bankos supports, id + display name + brand colour (from the app's BANKS const). */
export const BANKOS_BANKS: { id: string; name: string; color: string; unique?: string }[] = [
  { id: "itau", name: "Itaú", color: "#EC7000" },
  { id: "bbva", name: "BBVA", color: "#1973B8" },
  { id: "santander", name: "Santander", color: "#EC0000" },
  { id: "scotiabank", name: "Scotiabank", color: "#EC111A" },
  { id: "brou", name: "BROU", color: "#005ca7" },
  { id: "oca", name: "OCA", color: "#006ed2" },
  { id: "clubelpais", name: "Club El País", color: "#a0d9f7", unique: "Tarjeta" },
  { id: "mercadopago", name: "Mercado Pago", color: "#00aff0", unique: "QR" },
  { id: "prex", name: "Prex", color: "#5c19ae", unique: "Tarjeta" },
  { id: "anda", name: "ANDA", color: "#4464dd", unique: "Crédito" },
];

export interface Brand {
  brandId: string;
  name: string;
  avgRating?: number;
  categories?: string[];
  keywords?: string[];
  instagram?: string | null;
  images?: string[];
}
export interface LocationDoc {
  locationId: string;
  brandId: string;
  location: { type: "Point"; coordinates: [number, number] }; // [lng, lat]
  rating?: number;
}
export interface Discount {
  creditDescription: string | null;
  debitDescription: string | null;
  hasCredit: boolean;
  hasDebit: boolean;
  availableDays: unknown | null;
}
export interface MarkersAndBrandsData {
  brands: Record<string, Brand>;
  locations: Record<string, LocationDoc>;
  bankBrands: Record<string, Record<string, Discount>>; // bankId -> brandId -> Discount
  brandLocations: Record<string, string[]>; // brandId -> locationId[]
}

function signHeaders(path: string): Record<string, string> {
  const nonce = crypto.randomUUID();
  const signature = crypto
    .createHmac("sha256", BANKOS_APP_SECRET)
    .update(nonce + path)
    .digest("hex");
  return {
    "X-API-Key": BANKOS_API_KEY,
    "X-Nonce": nonce,
    "X-Signature": signature,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

/**
 * POST /markers-and-brands for the given bankIds. With every bankId it returns the full catalog plus
 * the discount map for all of them. Render's free tier cold-starts, so the timeout is generous.
 */
export async function fetchMarkersAndBrands(
  bankIds: string[],
  timeoutMs = 90_000
): Promise<MarkersAndBrandsData> {
  const path = "/markers-and-brands";
  const res = await axios.post(
    BANKOS_BASE + path,
    { cards: bankIds.map((bankId) => ({ bankId })) },
    { headers: signHeaders(path), timeout: timeoutMs }
  );
  const data = res.data?.data;
  if (!data || typeof data !== "object") throw new Error("Bankos: unexpected response shape");
  return data as MarkersAndBrandsData;
}
