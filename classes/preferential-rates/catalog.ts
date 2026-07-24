import {
  buildSantanderPreferentialRatesResponse,
  loadSantanderPreferentialRates,
  SantanderPreferentialRatesDoc,
  SantanderPreferentialRatesResponse,
} from "../santander-preferential/store";

export interface PreferentialRateProvider {
  provider: string;
  displayName: string;
  source: string;
  requiresAuthentication: boolean;
  currencies: string[];
  boundaryRule: string;
  current: SantanderPreferentialRatesResponse["current"];
  history: SantanderPreferentialRatesResponse["history"];
  updatedAt: string;
}

export interface PreferentialRatesCatalogResponse {
  currency: string | null;
  amount: number | null;
  providers: PreferentialRateProvider[];
  providerCount: number;
  updatedAt: string;
}

interface PreferentialRateProviderAdapter {
  id: string;
  displayName: string;
  requiresAuthentication: boolean;
  load: () => Promise<SantanderPreferentialRatesDoc>;
  build: (
    doc: SantanderPreferentialRatesDoc,
    currency?: string,
    amount?: number
  ) => SantanderPreferentialRatesResponse;
}

const adapters: PreferentialRateProviderAdapter[] = [
  {
    id: "santander",
    displayName: "Santander",
    requiresAuthentication: true,
    load: loadSantanderPreferentialRates,
    build: buildSantanderPreferentialRatesResponse,
  },
];

export const preferentialRateProviderIds = adapters.map(
  (adapter) => adapter.id
);

export function buildPreferentialRatesCatalogResponse(
  entries: Array<{
    adapter: Pick<
      PreferentialRateProviderAdapter,
      "id" | "displayName" | "requiresAuthentication" | "build"
    >;
    doc: SantanderPreferentialRatesDoc;
  }>,
  currency?: string,
  amount?: number
): PreferentialRatesCatalogResponse {
  const providers = entries.map(({ adapter, doc }) => {
    const response = adapter.build(doc, currency, amount);
    return {
      provider: adapter.id,
      displayName: adapter.displayName,
      source: response.source,
      requiresAuthentication: adapter.requiresAuthentication,
      currencies: response.currencies,
      boundaryRule: response.boundaryRule,
      current: response.current,
      history: response.history,
      updatedAt: response.updatedAt,
    };
  });

  const updateDates = providers
    .map((provider) => provider.updatedAt)
    .filter(Boolean)
    .sort();

  return {
    currency: currency ?? null,
    amount: amount ?? null,
    providers,
    providerCount: providers.length,
    updatedAt: updateDates[updateDates.length - 1] ?? "",
  };
}

export async function loadPreferentialRatesCatalog(
  provider?: string,
  currency?: string,
  amount?: number
): Promise<PreferentialRatesCatalogResponse> {
  const selectedAdapters = provider
    ? adapters.filter((adapter) => adapter.id === provider)
    : adapters;
  const entries = await Promise.all(
    selectedAdapters.map(async (adapter) => ({
      adapter,
      doc: await adapter.load(),
    }))
  );
  return buildPreferentialRatesCatalogResponse(entries, currency, amount);
}
