export type StoreKind = "tienda-uy" | "marketplace" | "compra-exterior";

export type StoreRubro =
  | "electrodomesticos"
  | "muebles"
  | "colchones"
  | "tecnologia"
  | "celulares"
  | "hogar"
  | "supermercado"
  | "ferreteria"
  | "bicicletas"
  | "motos"
  | "deportes"
  | "farmacia"
  | "moda"
  | "general";

export interface StoreEntry {
  key: string;
  name: string;
  domain: string | null;
  kind: StoreKind;
  rubros: StoreRubro[];
  /** How this store shows up as a seller on ML/other storefronts; always includes `name`. */
  aliases: string[];
  /** Key in classes/retail/stores.ts, when this store is also a harvested storefront. */
  retailStoreKey?: string;
  /** Defaults to `domain` when omitted; `null` means "do not query Trustpilot for this store". */
  trustpilotDomain?: string | null;
  /** Exact phrases to search on Reddit; `[]` means "too ambiguous a name to query at all". */
  redditTerms: string[];
  /** Local confirmation over normalized title+text, for names that still need disambiguating. */
  redditMatch?: RegExp;
}
