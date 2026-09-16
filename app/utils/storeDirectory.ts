// Hand-kept mirror of classes/stores/registry.ts's STORES. app/ is a separate package (own build,
// own deploy, cannot import from the repo root — see AGENTS.md), so this file re-lists the fields
// the frontend actually needs (no retailStoreKey/trustpilotDomain/redditTerms/redditMatch — those
// stay backend-only) and re-implements `storeNorm`'s normalization rule rather than importing it.
// tests/stores/mirror_parity.test.ts is what keeps the two in sync: it imports both this file and
// the root registry directly and fails if a store, or any of its aliases, drifts between them.
//
// Every export here is prefixed `store`/`STORE_` because app/utils/ is a flat auto-import
// namespace — an unprefixed name here would be one collision away from shadowing an unrelated util.
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

export interface StoreDirectoryEntry {
  key: string;
  name: string;
  domain: string | null;
  kind: StoreKind;
  rubros: StoreRubro[];
  aliases: string[];
}

export const STORE_DIRECTORY: readonly StoreDirectoryEntry[] = [
  {
    key: "bertoni",
    name: "Bertoni",
    domain: "bertoni.com.uy",
    kind: "tienda-uy",
    rubros: ["muebles"],
    aliases: ["Bertoni"],
  },
  {
    key: "divino",
    name: "Divino",
    domain: "divino.com.uy",
    kind: "tienda-uy",
    rubros: ["muebles", "electrodomesticos", "colchones", "hogar"],
    aliases: ["Divino"],
  },
  {
    key: "electroventas",
    name: "Electroventas",
    domain: "electroventas.com.uy",
    kind: "tienda-uy",
    rubros: ["electrodomesticos", "muebles"],
    aliases: ["Electroventas"],
  },
  {
    key: "la-cueva-muebles",
    name: "La Cueva Muebles",
    domain: "lacuevamuebles.com.uy",
    kind: "tienda-uy",
    rubros: ["muebles", "colchones"],
    aliases: ["La Cueva Muebles", "LaCuevaMuebles"],
  },
  {
    key: "clemur",
    name: "Clemur",
    domain: "clemur.uy",
    kind: "tienda-uy",
    rubros: ["muebles"],
    aliases: ["Clemur"],
  },
  {
    key: "tienda-santander",
    name: "Tienda Santander",
    domain: "tienda.soysantander.com.uy",
    kind: "tienda-uy",
    rubros: ["general"],
    aliases: ["Tienda Santander", "Soy Santander"],
  },
  {
    key: "dimm",
    name: "DIMM",
    domain: "dimm.com.uy",
    kind: "tienda-uy",
    rubros: ["tecnologia", "muebles", "celulares"],
    aliases: ["DIMM"],
  },
  {
    key: "armo",
    name: "Armo",
    domain: "armo.uy",
    kind: "tienda-uy",
    rubros: ["muebles"],
    aliases: ["Armo"],
  },
  {
    key: "grassi",
    name: "Grassi",
    domain: "grassi.uy",
    kind: "tienda-uy",
    rubros: ["muebles"],
    aliases: ["Grassi"],
  },
  {
    key: "cover-company",
    name: "Cover Company",
    domain: "covercompany.com.uy",
    kind: "tienda-uy",
    rubros: ["tecnologia", "celulares", "hogar"],
    aliases: ["Cover Company"],
  },
  {
    key: "american-mesh",
    name: "American Mesh",
    domain: "americanmesh.com.uy",
    kind: "tienda-uy",
    rubros: ["muebles"],
    aliases: ["American Mesh"],
  },
  {
    key: "prontometal",
    name: "Prontometal",
    domain: "prontometal.com.uy",
    kind: "tienda-uy",
    rubros: ["muebles"],
    aliases: ["Prontometal"],
  },
  {
    key: "punto-union",
    name: "Punto Unión",
    domain: "puntounion.com.uy",
    kind: "tienda-uy",
    rubros: ["muebles", "colchones", "hogar"],
    aliases: ["Punto Unión", "Punto Union"],
  },
  {
    key: "tyt",
    name: "TYT",
    domain: "tyt.com.uy",
    kind: "tienda-uy",
    rubros: ["electrodomesticos", "tecnologia", "hogar"],
    aliases: ["TYT", "TYT IMPORTAMOS SOLUCIONES"],
  },
  {
    key: "ufficio",
    name: "Ufficio Equipamientos",
    domain: "ufficio.com.uy",
    kind: "tienda-uy",
    rubros: ["muebles"],
    aliases: ["Ufficio Equipamientos", "Ufficio"],
  },
  {
    key: "el-dorado",
    name: "El Dorado",
    domain: "eldorado.com.uy",
    kind: "tienda-uy",
    rubros: ["supermercado", "electrodomesticos", "hogar"],
    aliases: ["El Dorado"],
  },
  {
    key: "expansion-uy",
    name: "Expansión UY",
    domain: "expansionuy.com",
    kind: "tienda-uy",
    rubros: ["muebles", "colchones"],
    aliases: ["Expansión UY", "Expansion UY", "Expansionuy"],
  },
  {
    key: "universo-hobby",
    name: "Universo Hobby",
    domain: "universohobby.uy",
    kind: "tienda-uy",
    rubros: ["hogar", "general"],
    aliases: ["Universo Hobby"],
  },
  {
    key: "carolinas-home",
    name: "Carolina's Home",
    domain: "carolinashome.uy",
    kind: "tienda-uy",
    rubros: ["muebles", "hogar"],
    aliases: ["Carolina's Home", "Carolinas Home"],
  },
  {
    key: "ultrashop",
    name: "Ultrashop",
    domain: "ultrashopuy.com.uy",
    kind: "tienda-uy",
    rubros: ["general"],
    aliases: ["Ultrashop", "ultrashopuy", "UltraShopUy"],
  },
  {
    key: "lg-amoblamientos",
    name: "LG Amoblamientos",
    domain: "lgamoblamientos.com",
    kind: "tienda-uy",
    rubros: ["muebles"],
    aliases: ["LG Amoblamientos"],
  },
  {
    key: "tushop",
    name: "Tushop",
    domain: "tushop.uy",
    kind: "tienda-uy",
    rubros: ["general", "electrodomesticos"],
    aliases: ["Tushop", "TuShopuy", "TuShop"],
  },
  {
    key: "silverled",
    name: "Silverled",
    domain: "silverled.com.uy",
    kind: "tienda-uy",
    rubros: ["hogar", "muebles"],
    aliases: ["Silverled", "Uruguay Silverled"],
  },
  {
    key: "muebles-web",
    name: "Muebles Web",
    domain: "mueblesweb.com.uy",
    kind: "tienda-uy",
    rubros: ["muebles"],
    aliases: ["Muebles Web"],
  },
  {
    key: "strada",
    name: "Strada",
    domain: "strada.com.uy",
    kind: "tienda-uy",
    rubros: ["muebles"],
    aliases: ["Strada"],
  },
  {
    key: "boxbit",
    name: "Boxbit",
    domain: "boxbit.com.uy",
    kind: "tienda-uy",
    rubros: ["muebles", "tecnologia"],
    aliases: ["Boxbit"],
  },
  {
    key: "world-vigo",
    name: "World Vigo",
    domain: "worldvigo.com",
    kind: "tienda-uy",
    rubros: ["muebles"],
    aliases: ["World Vigo", "Vigo"],
  },
  {
    key: "estacion-hogar",
    name: "Estación Hogar",
    domain: "estacionhogar.uy",
    kind: "tienda-uy",
    rubros: ["electrodomesticos", "hogar"],
    aliases: ["Estación Hogar", "Estacion Hogar"],
  },
  {
    key: "fama",
    name: "Fama Electrodomésticos",
    domain: "fama.com.uy",
    kind: "tienda-uy",
    rubros: ["electrodomesticos"],
    aliases: ["Fama Electrodomésticos", "Fama"],
  },
  {
    key: "cartoons",
    name: "Cartoons",
    domain: "cartoons.com.uy",
    kind: "tienda-uy",
    rubros: ["electrodomesticos", "tecnologia"],
    aliases: ["Cartoons"],
  },
  {
    key: "cosmos",
    name: "Cosmos",
    domain: "cosmos.uy",
    kind: "tienda-uy",
    rubros: ["electrodomesticos", "tecnologia"],
    aliases: ["Cosmos", "COSMOS"],
  },
  {
    key: "tech-house",
    name: "Tech House",
    domain: "techhouse.uy",
    kind: "tienda-uy",
    rubros: ["tecnologia"],
    aliases: ["Tech House"],
  },
  {
    key: "narvaja",
    name: "Narvaja",
    domain: "narvaja.online",
    kind: "tienda-uy",
    rubros: ["hogar", "colchones"],
    aliases: ["Narvaja"],
  },
  {
    key: "la-tentacion",
    name: "La Tentación",
    domain: "latentacion.com.uy",
    kind: "tienda-uy",
    rubros: ["electrodomesticos", "hogar"],
    aliases: ["La Tentación", "La Tentacion"],
  },
  {
    key: "amv-store",
    name: "AMV Store",
    domain: "amvstore.com.uy",
    kind: "tienda-uy",
    rubros: ["electrodomesticos", "tecnologia", "celulares"],
    aliases: ["AMV Store", "AMV"],
  },
  {
    key: "sep-importaciones",
    name: "SEP Importaciones",
    domain: "sepimportaciones.com.uy",
    kind: "tienda-uy",
    rubros: ["electrodomesticos"],
    aliases: ["SEP Importaciones"],
  },
  {
    key: "goldsky",
    name: "Goldsky",
    domain: "goldsky.com.uy",
    kind: "tienda-uy",
    rubros: ["electrodomesticos"],
    aliases: ["Goldsky", "GOLDSKY SA"],
  },
  {
    key: "el-rey-de-las-ofertas",
    name: "El Rey de las Ofertas",
    domain: "elreydelasofertas.com.uy",
    kind: "tienda-uy",
    rubros: ["general"],
    aliases: ["El Rey de las Ofertas"],
  },
  {
    key: "tienda-max",
    name: "Tienda Max",
    domain: "tiendamax.uy",
    kind: "tienda-uy",
    rubros: ["general"],
    aliases: ["Tienda Max"],
  },
  {
    key: "aiwa",
    name: "Aiwa Uruguay",
    domain: "aiwa.com.uy",
    kind: "tienda-uy",
    rubros: ["electrodomesticos", "tecnologia"],
    aliases: ["Aiwa Uruguay", "Aiwa"],
  },
  {
    key: "magic-center",
    name: "Magic Center",
    domain: "magiccenter.com.uy",
    kind: "tienda-uy",
    rubros: ["electrodomesticos", "tecnologia", "celulares"],
    aliases: ["Magic Center"],
  },
  {
    key: "loi",
    name: "LOi",
    domain: "loi.com.uy",
    kind: "tienda-uy",
    rubros: ["tecnologia", "electrodomesticos", "celulares"],
    aliases: ["LOi", "LOI"],
  },
  {
    key: "tienda-inglesa",
    name: "Tienda Inglesa",
    domain: "tiendainglesa.com.uy",
    kind: "tienda-uy",
    rubros: ["supermercado", "electrodomesticos", "hogar"],
    aliases: ["Tienda Inglesa"],
  },
  {
    key: "sodimac",
    name: "Sodimac",
    domain: "sodimac.com.uy",
    kind: "tienda-uy",
    rubros: ["ferreteria", "hogar"],
    aliases: ["Sodimac"],
  },
  {
    key: "tata",
    name: "Ta-Ta",
    domain: "tata.com.uy",
    kind: "tienda-uy",
    rubros: ["supermercado", "electrodomesticos"],
    aliases: ["Ta-Ta", "TaTa", "Tata"],
  },
  {
    key: "geant",
    name: "Géant",
    domain: "geant.com.uy",
    kind: "tienda-uy",
    rubros: ["supermercado", "electrodomesticos"],
    aliases: ["Géant", "Geant"],
  },
  {
    key: "zonatecno",
    name: "Zonatecno",
    domain: "zonatecno.com.uy",
    kind: "tienda-uy",
    rubros: ["tecnologia", "celulares"],
    aliases: ["Zonatecno", "Zona Tecno"],
  },
  {
    key: "iplace",
    name: "iPlace",
    domain: "iplace.com.uy",
    kind: "tienda-uy",
    rubros: ["celulares", "tecnologia"],
    aliases: ["iPlace"],
  },
  {
    key: "cellular-center",
    name: "Cellular Center",
    domain: "cellularcenter.com.uy",
    kind: "tienda-uy",
    rubros: ["celulares"],
    aliases: ["Cellular Center"],
  },
  {
    key: "nstore",
    name: "nStore",
    domain: "nstore.com.uy",
    kind: "tienda-uy",
    rubros: ["tecnologia", "celulares"],
    aliases: ["nStore"],
  },
  {
    key: "mundo-electro",
    name: "Mundo Electro",
    domain: "mundoelectro.com.uy",
    kind: "tienda-uy",
    rubros: ["electrodomesticos"],
    aliases: ["Mundo Electro", "Mundoelectro"],
  },
  {
    key: "barraca-europa",
    name: "Barraca Europa",
    domain: "barracaeuropa.com.uy",
    kind: "tienda-uy",
    rubros: ["ferreteria", "electrodomesticos"],
    aliases: ["Barraca Europa"],
  },
  {
    key: "rosas-hermanos",
    name: "Rosas Hermanos",
    domain: "rosashermanos.com.uy",
    kind: "tienda-uy",
    rubros: ["hogar", "electrodomesticos"],
    aliases: ["Rosas Hermanos"],
  },
  {
    key: "via-confort",
    name: "Vía Confort",
    domain: "viaconfort.com.uy",
    kind: "tienda-uy",
    rubros: ["electrodomesticos", "muebles"],
    aliases: ["Vía Confort", "Via Confort"],
  },
  {
    key: "dormimundo",
    name: "Dormimundo",
    domain: "dormimundo.com.uy",
    kind: "tienda-uy",
    rubros: ["colchones"],
    aliases: ["Dormimundo"],
  },
  {
    key: "thot",
    name: "Thot Computación",
    domain: "thotcomputacion.com.uy",
    kind: "tienda-uy",
    rubros: ["tecnologia"],
    aliases: ["Thot Computación", "Thot"],
  },
  {
    key: "pc-compu",
    name: "PC Compu",
    domain: "pccompu.com.uy",
    kind: "tienda-uy",
    rubros: ["tecnologia"],
    aliases: ["PC Compu", "PcCompu"],
  },
  {
    key: "caribe-sur-store",
    name: "Caribe Sur Store",
    domain: "caribesurstore.uy",
    kind: "tienda-uy",
    rubros: ["tecnologia", "celulares"],
    aliases: ["Caribe Sur Store", "CARIBE SUR STORE"],
  },
  {
    key: "deceleste",
    name: "Deceleste",
    domain: "deceleste.com.uy",
    kind: "tienda-uy",
    rubros: ["motos", "bicicletas"],
    aliases: ["Deceleste", "De Celeste"],
  },
  {
    key: "albanes",
    name: "Albanés",
    domain: "albanes.com.uy",
    kind: "tienda-uy",
    rubros: ["motos"],
    aliases: ["Albanés", "Albanes"],
  },
  {
    key: "epicbike",
    name: "Epic Bike",
    domain: "epicbike.uy",
    kind: "tienda-uy",
    rubros: ["bicicletas"],
    aliases: ["Epic Bike", "Epicbike"],
  },
  {
    key: "bikestore",
    name: "Bike Store",
    domain: "bikestore.com.uy",
    kind: "tienda-uy",
    rubros: ["bicicletas"],
    aliases: ["Bike Store"],
  },
  {
    key: "decathlon",
    name: "Decathlon Uruguay",
    domain: "decathlon.com.uy",
    kind: "tienda-uy",
    rubros: ["deportes", "bicicletas"],
    aliases: ["Decathlon Uruguay", "Decathlon"],
  },
  {
    key: "carlos-gutierrez",
    name: "Carlos Gutiérrez",
    domain: "carlosgutierrez.com.uy",
    kind: "tienda-uy",
    rubros: ["electrodomesticos"],
    aliases: ["Carlos Gutiérrez", "Carlos Gutierrez"],
  },
  {
    key: "farmashop",
    name: "Farmashop",
    domain: "farmashop.com.uy",
    kind: "tienda-uy",
    rubros: ["farmacia"],
    aliases: ["Farmashop"],
  },
  {
    key: "san-roque",
    name: "San Roque",
    domain: "sanroque.com.uy",
    kind: "tienda-uy",
    rubros: ["farmacia"],
    aliases: ["San Roque"],
  },
  {
    key: "tienda-claro",
    name: "Tienda Claro",
    domain: "tienda.claro.com.uy",
    kind: "tienda-uy",
    rubros: ["celulares"],
    aliases: ["Tienda Claro", "Claro"],
  },
  {
    key: "tienda-antel",
    name: "Tienda Antel",
    domain: "tienda.antel.com.uy",
    kind: "tienda-uy",
    rubros: ["celulares", "tecnologia"],
    aliases: ["Tienda Antel", "Antel"],
  },
  {
    key: "tigo",
    name: "Tigo Uruguay",
    domain: "tigo.com.uy",
    kind: "tienda-uy",
    rubros: ["celulares"],
    aliases: ["Tigo Uruguay", "Tigo", "Movistar"],
  },
  {
    key: "mercado-libre",
    name: "Mercado Libre",
    domain: "mercadolibre.com.uy",
    kind: "marketplace",
    rubros: ["general"],
    aliases: ["Mercado Libre", "MercadoLibre"],
  },
  {
    key: "temu",
    name: "Temu",
    domain: "temu.com",
    kind: "compra-exterior",
    rubros: ["general", "moda"],
    aliases: ["Temu"],
  },
  {
    key: "shein",
    name: "Shein",
    domain: "shein.com",
    kind: "compra-exterior",
    rubros: ["moda"],
    aliases: ["Shein"],
  },
  {
    key: "aliexpress",
    name: "AliExpress",
    domain: "aliexpress.com",
    kind: "compra-exterior",
    rubros: ["general", "tecnologia"],
    aliases: ["AliExpress"],
  },
  {
    key: "amazon",
    name: "Amazon",
    domain: "amazon.com",
    kind: "compra-exterior",
    rubros: ["general", "tecnologia"],
    aliases: ["Amazon"],
  },
  {
    key: "ebay",
    name: "eBay",
    domain: "ebay.com",
    kind: "compra-exterior",
    rubros: ["general", "tecnologia"],
    aliases: ["eBay"],
  },
  {
    key: "tiendamia",
    name: "Tiendamia",
    domain: "tiendamia.com",
    kind: "compra-exterior",
    rubros: ["general", "tecnologia"],
    aliases: ["Tiendamia"],
  },
];

export const STORE_RUBRO_LABELS: Record<StoreRubro, string> = {
  electrodomesticos: "Electrodomésticos",
  muebles: "Muebles",
  colchones: "Colchones",
  tecnologia: "Tecnología",
  celulares: "Celulares",
  hogar: "Hogar",
  supermercado: "Supermercados",
  ferreteria: "Ferretería y construcción",
  bicicletas: "Bicicletas",
  motos: "Motos",
  deportes: "Deportes",
  farmacia: "Farmacias",
  moda: "Ropa y moda",
  general: "Variedades",
};

export const STORE_KIND_LABELS: Record<StoreKind, string> = {
  "tienda-uy": "Tienda uruguaya",
  marketplace: "Marketplace",
  "compra-exterior": "Compras al exterior",
};

function storeDirectoryNorm(value: string): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Kept out of the lookup index on purpose: see classes/stores/match.ts for why the literal
// "Mercado Libre" seller label must never resolve to the Mercado Libre store entry.
const EXCLUDED_ALIAS_NORMS = new Set<string>([storeDirectoryNorm("Mercado Libre")]);

const STORE_DIRECTORY_ALIAS_INDEX: ReadonlyMap<string, string> = (() => {
  const index = new Map<string, string>();
  for (const store of STORE_DIRECTORY) {
    for (const alias of store.aliases) {
      const norm = storeDirectoryNorm(alias);
      if (!norm || EXCLUDED_ALIAS_NORMS.has(norm)) continue;
      if (!index.has(norm)) index.set(norm, store.key);
    }
  }
  return index;
})();

const STORE_DIRECTORY_BY_KEY: ReadonlyMap<string, StoreDirectoryEntry> = new Map(
  STORE_DIRECTORY.map((store) => [store.key, store] as const)
);

export function storeDirectoryEntry(key: string): StoreDirectoryEntry | undefined {
  return STORE_DIRECTORY_BY_KEY.get(key);
}

export function isStoreDirectoryKey(key: string): boolean {
  return STORE_DIRECTORY_BY_KEY.has(key);
}

export function storeSlugForSeller(sellerName: string): string | null {
  const norm = storeDirectoryNorm(sellerName);
  if (!norm) return null;
  return STORE_DIRECTORY_ALIAS_INDEX.get(norm) ?? null;
}
