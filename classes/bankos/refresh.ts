// Builds the Bankos snapshot: one live call for every issuer, sanity-checked so an empty/garbage
// response can never overwrite a good fallback (sync_bankos.ts only writes when this resolves).
import { BANKOS_BANKS, fetchMarkersAndBrands, type MarkersAndBrandsData } from "./client";

export interface BankosSnapshot {
  data: MarkersAndBrandsData;
  banks: string[];
  counts: { brands: number; locations: number; banksWithDiscounts: number };
}

export async function buildSnapshot(): Promise<BankosSnapshot> {
  const banks = BANKOS_BANKS.map((b) => b.id);
  const data = await fetchMarkersAndBrands(banks);

  const brands = data.brands ?? {};
  const locations = data.locations ?? {};
  const bankBrands = data.bankBrands ?? {};

  const counts = {
    brands: Object.keys(brands).length,
    locations: Object.keys(locations).length,
    banksWithDiscounts: Object.keys(bankBrands).length,
  };

  // A healthy pull has thousands of locations and discounts for most banks. Anything far below that
  // is a partial/broken response — throw so the previous snapshot survives as the fallback.
  if (counts.locations < 100 || counts.banksWithDiscounts < 1) {
    throw new Error(
      `Bankos: refusing to store a thin snapshot (locations=${counts.locations}, banksWithDiscounts=${counts.banksWithDiscounts})`
    );
  }

  return { data, banks, counts };
}
