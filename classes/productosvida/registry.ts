// What r/uruguay named in the thread «¿Qué producto les cambió la vida?» (19/11/2026), as categories
// of the injectable equipar registry, for /productos-que-te-cambian-la-vida-uruguay.
//
// Third consumer of the same machinery, after equipar and movilidad: `specsFor`, `buildEquiparCatalog`,
// `buildEquiparListings` and `uncoveredCategories` take this array as `registry`, so the two regimes,
// the variants, the per-condition screen and the new/used split are reused without a fork.
// `classes/equipar/basket.ts` only iterates `EQUIPAR_CATEGORIES`, so nothing here can reach the
// equipar basket.
//
// MercadoLibre only (no storefronts, no Facebook): `storeQueries` and `fbQueries` are empty on every
// entry, so the shared harvester never opens Marketplace for this job.
//
// Every regex runs against `norm()` output (classes/equipar/classify.ts): lower case, no accents, and
// every character outside `[a-z0-9%"'\s.,+-]` turned into a space. So no literal here may carry an
// accent, an «ñ» or a «/» — those alternatives could never match (tests/productosvida/registry.test.ts
// checks the sources). The shared NOT_A_PRODUCT filter of equipar runs first for every category and
// is not bypassed (it is what leaves the smartwatch without a price: «correa»).
//
// This file is also read by the app CI (app/tests/unit/productosVidaParity.test.ts), which has no
// root dependencies: its ONLY import is the type below, and the window check is pure.
import type { EquiparCategory } from "../equipar/types";

export const PRODUCTOS_VIDA_META_KEY = "productos-que-te-cambian-la-vida-uruguay";

export const PRODUCTOS_VIDA_COLLECTIONS = {
  items: "productosvidaitems",
  meta: "productosvidameta",
  listings: "productosvidalistings",
} as const;

/** Result pages per search. 33 searches × 2 = at most 66 bridge requests per run. */
export const PRODUCTOS_VIDA_ML_PAGES_PER_QUERY = 2;
/** Cap on searches per run; the registry uses 33. */
export const PRODUCTOS_VIDA_ML_MAX_SCANS = 40;
/** No new bridge page after this, counted from process start. */
export const PRODUCTOS_VIDA_ML_DEADLINE_MS = 6 * 60_000;

/**
 * The bridge window: minute 13 or 14 of 00, 04, 16 or 20 UTC. Same idea as autos-parts'
 * `bridgeWindowOpen` (classes/autos/repuestosHarvest.ts).
 *
 * pm2 launches a cron app the moment it is registered, recreated or resurrected, at whatever minute
 * that happens; `main()` checks this before reading anything, so such a launch exits without a single
 * request. Minute 13 is the free gap of the shared MercadoLibre bridge (after movilidad-specs :01 and
 * movilidad-hourly :07, before chairs-hourly :23). The hours skip autos-parts (02/18/22), the autos
 * daily sweep (07:43 to about 10:15) and the chairs daily run (11:41). The cron in ecosystem.config.js
 * is built from the same numbers (tests/productosvida/schedule.test.ts).
 */
export const PRODUCTOS_VIDA_WINDOW = { hours: [0, 4, 16, 20], fromMinute: 13, toMinute: 14 } as const;

export function productosVidaBridgeWindowOpen(now: Date): boolean {
  const minute = now.getUTCMinutes();
  return (
    (PRODUCTOS_VIDA_WINDOW.hours as readonly number[]).includes(now.getUTCHours()) &&
    minute >= PRODUCTOS_VIDA_WINDOW.fromMinute &&
    minute <= PRODUCTOS_VIDA_WINDOW.toMinute
  );
}

export const PRODUCTOS_VIDA_REASON =
  "Nombrado en el hilo de r/uruguay que preguntó qué producto les cambió la vida.";

// Litres written with a decimal comma or point ("6,5 lts", "8.8 litros") must not read as the digit
// after the separator.
const L = String.raw`(?:l|lt|lts|litro|litros)\b`;
const NOT_AFTER_DIGIT = String.raw`(?<![\d.,])`;

// The two dehumidifier variants, also read by its titleExclude: a title that matches neither is not
// counted (see the entry).
// Compressor units declare litres per day (10, 12, 20, 50), US pints or 1000+ square feet.
const DESHUMIDIFICADOR_COMPRESOR =
  /(?<![\d.,])(9|[1-9]\d)(?:[.,]\d)? ?(l|lt|lts|litros)\b|\b\d{2} ?pintas\b|\b\d{2,3} ?lt dia\b|\b[1-9]\d{3} pies\b/;
// A USB or "mini" Peltier box pulls a few hundred millilitres and sells for a fraction. It is also sold
// by the room it covers in square feet (3 digits) and by a tank in ounces: «Deshumidificador Nine Sky
// 300 Pies Cuadrados Baño 35oz Blanc» (real run of 2026-11-20) fell to «de compresor»; the compressor
// ones say 1000+ pies or a 95 oz tank.
const DESHUMIDIFICADOR_MINI =
  /\b(usb|mini|placard|ropero|armario|pequeno|portatil|silencioso|\d{3,4} ?ml|[1-3](?:[.,]\d)? ?(l|lt|lts|litros)|[1-4]\d ?w|[1-9]\d{2} pies|[1-6]\d ?oz)\b/;

/** The fields every entry shares: MercadoLibre only, tier B, the same reason. */
const COMMON = {
  room: "productos-vida",
  tier: "B",
  reason: PRODUCTOS_VIDA_REASON,
  storeQueries: [],
  fbQueries: [],
} as const;

/**
 * In the thread's order (mentions descending, then name), which is also the budget order: planScans
 * interleaves by round, so a run that is cut loses second queries before a whole product.
 */
export const PRODUCTOS_VIDA_CATEGORIES: EquiparCategory[] = [
  {
    ...COMMON,
    key: "calientacama",
    label: "Calientacama",
    mlQueries: ["calientacama", "manta electrica"],
    include:
      /\b(calienta ?camas?|mantas? (electrica|termica electrica|calefactora|electrica termica)|frazadas? (electrica|termica)|cobertor electrico)\b/,
    // Shawls, ponchos, neck warmers and 50x60 pads are body or pet warmers, not bed warmers.
    titleExclude:
      /\b(chal|poncho|cuello|hombros?|cervical|lumbar|pies|mascotas?|perros?|gatos?|de auto|para auto|12v|usb|portatil|sofa)\b|\b[3-6]0 ?x ?[3-7]0\b/,
    variants: [
      // The thread's point: the over-blanket kind ("tipo frazada") versus the under-sheet one.
      // Real run of 2026-11-20: a title that OPENS with «frazada» is the over-blanket even when it
      // says «1 Pz» («Frazada Electrica Futura Fut-mt203a Manta Termica 1 Pz Dimm» sat under «bajo la
      // sábana»), and straps or elastics hold a pad under the sheet («Manta Eléctrica Futura Individual
      // Lavable Con Correas» sat under «por encima»).
      {
        key: "manta",
        label: "Manta por encima (tipo frazada)",
        match: /^frazadas?\b|^(?!.*\b(calienta ?camas?|plazas?|pzas?|pz|correas|elasticos)\b).*\b(manta|frazada|cobertor)\b/,
        rank: 3,
      },
      // A title that names 2 plazas is not a single («Calientacamas Futura 2 Plazas Doble Control + 1
      // Plaza», 2026-11-20, was the dearest «1 plaza»).
      {
        key: "una-plaza",
        label: "Bajo la sábana, 1 plaza",
        match: /^(?!.*\b(2|dos) ?(plazas|pzas|pz)\b).*(\b(1|una) ?(plaza|plazas|pza|pz)\b|\bindividual\b|\btwin\b)/,
        rank: 1,
      },
      { key: "dos-plazas", label: "Bajo la sábana, 2 plazas o más", fallback: true, rank: 2 },
    ],
    regime: "modelo",
    usedOk: false,
  },
  {
    ...COMMON,
    key: "lavavajillas",
    label: "Lavavajillas",
    mlQueries: ["lavavajillas", "lavavajillas compacto"],
    // The word alone is ALSO the Uruguayan name of dish soap ("Sun Lavavajilla", "Detergente
    // lavavajillas"): the whole detergent aisle is rejected by name, by unit and by brand.
    include: /\blavavajillas?\b/,
    titleExclude:
      /\b(detergentes?|pastillas?|tabletas?|tabs|capsulas?|sal|abrillantador|jabon|liquido|polvo|gel|limpiador|limpiadoras?|apto|aptas?|para lavavajillas?|sun|somat|finish|jimo|piatti|prakti|cascade|dropps|axion|cif|magistral|\d+ ?(ml|cc|kg|kilos?|gr|gramos|unidades|uds|un)\b|x ?\d+ ?(u|un|unidades)?\b)/,
    variants: [
      // Real run of 2026-11-20: «Lavavajillas Midea Silver 6 Sets Mdwtf0602ms» and «… 6 Cub. Lvcm-6cd»
      // are 6-place units that fell to «estándar» (the count is also written «sets», «cub.» or
      // «personas»), and «Lavavajillas James Lv 10vn Inox 10 Cubiertos Compacto» is 10 places: a
      // declared count of 10 or more beats the word.
      {
        key: "compacto",
        label: "Compacto (hasta 9 servicios)",
        match:
          /^(?!.*(?<![\d.,])1\d ?(servicios|serv|cubiertos|cub|c|sets?)\b)(.*(?<!\d)[4-9] ?(servicios|serv|cubiertos|cub|c|sets?|personas)\b|.*\b(compacto|de mesada|de mesa|sobremesada|mini)\b)/,
        rank: 1,
      },
      { key: "estandar", label: "Estándar (10 a 16 servicios)", fallback: true, rank: 2 },
    ],
    regime: "modelo",
    usedOk: true,
  },
  {
    ...COMMON,
    key: "secarropas",
    label: "Secarropas",
    mlQueries: ["secarropas", "secarropas carga frontal"],
    include:
      /\b(secarropas?|seca ?ropas?|secadoras? (de )?ropa|secador(es)? de ropa)\b|^secadora\b.*\b\d+(?:[.,]\d)? ?kg\b/,
    // A title that is the product name and a sales pitch says neither the kind nor the size, so it can
    // only fall to «de tambor»: «Secarropa Oferta Imperdible Casa Imperio» (real run of 2026-11-20, the
    // cheapest drum dryer at the price of the same seller's bag dryer).
    titleExclude:
      /\b(lavarropas|lavadora|lavasecarropas?|torre|tender(es)?|de pelo|cabello|pelo|percha|perchero|cuerda|soga|broches?)\b|^(secarropas?|secaropas?|seca ?ropas?) (oferta|imperdible|promo\w*|liquidacion)\b/,
    variants: [
      // A hot-air bag on a frame costs a tenth of a drum dryer.
      {
        key: "bolsa",
        label: "Portátil de bolsa (aire caliente)",
        match:
          /\b(bolsa|portatil|portable|plegable|de pie|colgar|colgador|de viaje|prendas|bag-p|bag|calzado|\d{3,4} ?w|\d ?kw)\b/,
        rank: 1,
      },
      { key: "centrifugo", label: "Centrífugo", match: /\bcentrifug\w*\b/, rank: 2 },
      { key: "tambor", label: "De tambor (calor, condensación o bomba de calor)", fallback: true, rank: 3 },
    ],
    regime: "modelo",
    usedOk: true,
  },
  {
    ...COMMON,
    key: "aspiradora-robot",
    label: "Aspiradora robot",
    mlQueries: ["aspiradora robot"],
    include:
      /\b(robots? aspirador(a|es)?|aspiradoras? (y (trapeadora|fregadora) )?robots?|aspiradora\b.{0,40}\brobot|robot\b.{0,40}\baspira\w*|robot vacuum|roomba|trapeadora robot|robot trapeador\w*)\b/,
    // «Braava» is iRobot's mop-only robot: it does not vacuum («Trapeadora Robot Inteligente Irobot
    // Braava Jet 380T», real run of 2026-11-20).
    titleExclude:
      /\b(piscinas?|piletas?|limpiavidrios|vidrios|ventanas|cepillos?|mopas? de|pano|panos|bolsas?|kit|accesorios?|bateria para|para (roomba|robot|xiaomi)|cortacesped|de cocina|braava)\b/,
    variants: [
      // «limpieza en húmedo» is a mop («Aspiradora Robot Karcher Rcv5 Con Limpieza En Humedo», 2026-11-20).
      {
        key: "trapea",
        label: "Aspira y trapea",
        match: /\b(trapea\w*|trapeador\w*|fregadora|friega|mopa|mopea|combo|omni|2 en 1|4 en 1|wet|lavado|humed[oa])\b/,
        rank: 2,
      },
      { key: "aspira", label: "Sólo aspira", fallback: true, rank: 1 },
    ],
    regime: "modelo",
    usedOk: true,
  },
  {
    ...COMMON,
    key: "freidora-de-aire",
    label: "Freidora de aire",
    mlQueries: ["freidora de aire"],
    include: /\b(freidoras? (de aire|sin aceite)|air ?fryer|airfryer)\b/,
    // Paper liners, silicone baskets and frozen chips ("Papas Mccain Airfryer") name the appliance.
    titleExclude:
      /^(papel|papeles|liners?|canastos?|cestos?|bandejas?|rejillas?|accesorios?|set|kit|moldes?|parrilla)\b|\b(papel|silicona|liners?|canastos? para|bandejas? para|accesorios? para|para (freidora|airfryer|air fryer)|papas|congelad\w*|recetario)\b/,
    variants: [
      // «Horno freidora» only means big when no small size is declared: «Horno Freidora De Aire Sin
      // Aceite Digital 5 Lt Inox Kassel» (real run of 2026-11-20) is a 5-litre unit.
      {
        key: "grande",
        label: "Grande o doble canasto (8 L o más)",
        match: new RegExp(
          String.raw`${NOT_AFTER_DIGIT}(?:[89]|[1-2]\d)(?:[.,]\d{1,2})? ?${L}|\b(doble|dos|2) (canastos?|cestos?|cestas?|recipientes?|bandejas?)\b|\bdual\b|\b4 ?\+ ?4\b|^(?!.*${NOT_AFTER_DIGIT}[1-7](?:[.,]\d{1,2})? ?${L}).*\bhorno freidora\b`
        ),
        rank: 3,
      },
      {
        key: "chica",
        label: "Chica (hasta 4,5 L)",
        match: new RegExp(String.raw`${NOT_AFTER_DIGIT}(?:[1-3](?:[.,]\d{1,2})?|4(?:[.,][0-5])?) ?${L}`),
        rank: 1,
      },
      { key: "mediana", label: "Mediana (5 a 7,9 L)", fallback: true, rank: 2 },
    ],
    regime: "modelo",
    usedOk: true,
  },
  {
    ...COMMON,
    key: "cortadora-barba",
    label: "Cortadora de barba y pelo",
    mlQueries: ["cortadora de barba", "afeitadora electrica"],
    include:
      /\b(cortabarbas?|corta ?barbas?|recortadora|recortador|trimmer|afeitadora|rasuradora|shaver|multigroom\w*|oneblade|one blade|uniblade|cortapelos?|corta ?pelos?|cortadora de (pelo|cabello|barba)|cortadora|maquinas? (de |para )?(cortar|afeitar)|para cortar (pelo|cabello|barba)|recorta (pelo|barba)|maquinilla|clipper|patillera|barbera|grooming kit)\b/,
    // Nose-only trimmers are their own row; body groomers and women's epilators are other products.
    // «Ballscout» is a groin trimmer («Afeitadora Ballscout Silky Resistente Al Agua Kit Accesorios»,
    // real run of 2026-11-20).
    titleExclude: new RegExp(
      String.raw`\b(corporal|(?<!face (and )?)body|bg\d+\w*|depilad\w*|femenin\w*|mujer|bikini|lady|mascotas?|perros?|canin\w*|navaja|desechables?|gillette|ballscout)\b|^(cuchillas?|cabezal(es)?|aceite|peines?|cepillo|hojas)\b|\b(cuchillas?|cabezal(es)?) (de )?(repuesto|recambio)\b|^(?!.*\b(barba|cabello|pelo y|patill\w*|multi\w*|bigote)\b).*\b(nariz|nasal|nose|orejas?|oido|cejas)\b`
    ),
    variants: [
      // A trimmer word anywhere wins: "Afeitadora Beard Trimmer 3000" is a trimmer. So does the
      // «Vintage T9», a T-blade trimmer sold as «Afeitadora T9 Vintage Negro» or «Máquina De Afeitar
      // Y Afeitar Vintage T9 - Dragon» (real run of 2026-11-20: four of them led the «afeitadora» row).
      {
        key: "recortadora",
        label: "Recortadora o cortadora (barba y pelo)",
        match:
          /\b(trimmer|recortador\w*|cortabarba\w*|corta ?barba|multigroom\w*|oneblade|one blade|uniblade|patillera|clipper|cortadora|cortapelo\w*|corta ?pelo|cortar|grooming|barbera|beard|t9)\b/,
        fallback: true,
        rank: 1,
      },
      {
        key: "afeitadora",
        label: "Afeitadora (rotativa o de láminas)",
        match: /\b(afeitadora|rasuradora|shaver|maquinilla|afeitar)\b/,
        rank: 2,
      },
    ],
    regime: "modelo",
    usedOk: false,
  },
  {
    ...COMMON,
    key: "deshumidificador",
    label: "Deshumidificador",
    mlQueries: ["deshumidificador"],
    include: /\b(deshumidificador(es)?|deshumificador(es)?|deshumectador)\b/,
    // The thread means an ELECTRIC room dehumidifier. Real run of 2026-11-20: a drying box for hearing
    // aids («Deshumificador De Audífonos Auditivos», at the bottom of «de compresor»), desiccant hangers
    // («Deshumidificador Portátil Reutilizable Modelo Percha 3 + 1*») and a tub of salts sold by its
    // volume and nothing else («Deshumidificador De 500 Ml Para Ayudar A Reducir La Humedad», $149): a
    // millilitre count with no electric word (eléctrico, USB, silencioso, watts, volts) is a tub. A
    // Peltier box that says «1000 Ml Silencioso» or «Eléctrico 2500 Ml» stays.
    // And a title that places it in neither variant is not counted (the pesa-rusa rule): the two
    // cheapest «de compresor» of that run said no capacity and no mini sign («Deshumidificador
    // Eléctrico Apagado Automático» $5096, «Deshumidificadores Domésticos Remotos L, 50 M²» $5525),
    // between the dearest Peltier box ($5389) and the cheapest declared compressor ($5894).
    titleExclude: new RegExp(
      String.raw`\b(de auto|silica|quimico|pastillas?|absorbente|bolsas?|recambio|cloruro|audifonos?|auditiv\w*|percha\w*|reutilizable\w*)\b|^(?!.*\b(electric\w*|electronic\w*|usb|silencios\w*|\d+ ?w|\d+ ?v)\b).*\b\d{2,4} ?(ml|gr|gramos)\b|^(?!.*(?:${DESHUMIDIFICADOR_COMPRESOR.source}|${DESHUMIDIFICADOR_MINI.source}))`
    ),
    variants: [
      {
        key: "compresor",
        label: "De compresor (10 L/día o más)",
        match: DESHUMIDIFICADOR_COMPRESOR,
        fallback: true,
        rank: 2,
      },
      { key: "mini", label: "Mini o USB (menos de 3 L)", match: DESHUMIDIFICADOR_MINI, rank: 1 },
    ],
    regime: "modelo",
    usedOk: true,
  },
  {
    ...COMMON,
    key: "freezer",
    label: "Freezer",
    mlQueries: ["freezer horizontal"],
    include: /\b(freezers?|congeladores?)\b/,
    // Every label says «horizontal»: «Freezer Vertical Enxuta 168 Litros Eficiencia A Blanco» (real run
    // of 2026-11-20) is the other appliance.
    titleExclude:
      /\b(con (freezer|congelador)|aptos? (para )?(el )?freezer|para (el )?freezer|heladeras? con|camping|motorhome|conservadora|portatil|12v|24v|bateria|amd|intel|cpu|disipador|cooler|exhibidora?|helados|vitrina|botellero|cervecer\w*|bolsas?|moldes?|vertical(es)?)\b/,
    variants: [
      { key: "chico", label: "Horizontal, hasta 120 L", match: /(?<![\d.,])(9\d|1[01]\d|120) ?(l|lt|lts|litros)\b/, rank: 1 },
      // Up to 999 L: «Freezer Horizontal Enxuta Fhenx22710 708l Doble Puerta Blanco» (2026-11-20) sat
      // in «121 a 250 L».
      { key: "grande", label: "Horizontal, más de 250 L", match: /(?<![\d.,])(2[6-9]\d|[3-9]\d\d) ?(l|lt|lts|litros)\b/, rank: 3 },
      { key: "mediano", label: "Horizontal, 121 a 250 L", fallback: true, rank: 2 },
    ],
    regime: "modelo",
    usedOk: true,
  },
  {
    ...COMMON,
    key: "panificadora",
    label: "Panificadora",
    mlQueries: ["panificadora", "maquina de hacer pan"],
    include:
      /\b(panificador(a|as)?|panetera|panettera|maquinas? (para |de )?(hacer )?pan|fabrica de pan|panera enxuta|horno panificador)\b/,
    // A part or an accessory is named after the machine it fits, behind «para» or opening the title:
    // «Accesorio Medidor Antideslizante Para Panificadora» and «Cinta De Transmisión Para Panificadora
    // Sunbeam - 2 Piezas» were the two cheapest «panificadoras» of the real run of 2026-11-20 (the
    // machine itself writes «Máquina PARA HACER pan», which this does not touch). And «Babycakes
    // Multi-treat Panificadora 110v» is a cupcake and doughnut maker.
    titleExclude:
      /\b(premezcla|harina|levadura|pala amasadora|paletas? de repuesto|babycakes)\b|^(paletas?|bandejas?|cubetas?|recipientes?|libros?|recetario|accesorios?|cintas?|correas?|repuestos?|medidor(es)?|moldes?)\b|\bpara (panificadoras?|paneteras?|maquinas? (de |para )?(hacer )?pan)\b/,
    variants: [{ key: "estandar", label: "Hasta 1 kg de pan", fallback: true, rank: 1 }],
    regime: "modelo",
    usedOk: true,
  },
  {
    ...COMMON,
    key: "recortadora-nariz",
    label: "Recortadora de nariz",
    mlQueries: ["recortadora nariz"],
    include:
      /^(?=.*\b(nariz|nasal|nose)\b)(?=.*\b(recortador\w*|cortador\w*|corta|trimmer|afeitadora|rasuradora|maquina|depilador\w*)\b)/,
    // A groomer that also does beard and hair is the other row, also when the beard is one word («Set
    // de Máquinas GA.MA Race 649 con Cortapelo, Cortabarba y Trimmer de Nariz USB», 2026-11-20).
    titleExclude:
      /\b(barba|cortabarbas?|cabello|patillas?|multigroom|corporal|peluqueria|clipper)\b|^(cuchillas?|cabezal(es)?|peines?)\b|\b(cuchillas?|cabezal(es)?) (de )?(repuesto|recambio)\b/,
    variants: [{ key: "estandar", label: "Recortadora de nariz", fallback: true, rank: 1 }],
    regime: "commodity",
    usedOk: false,
  },
  {
    ...COMMON,
    key: "tuppers-vidrio",
    label: "Tuppers de vidrio",
    mlQueries: ["tupper vidrio hermetico"],
    include:
      /^(?=.*\bvidrio\b)(?=.*\b(tuppers?|tupperwares?|tapers?|viandas?|recipientes?|contenedor(es)?|potes?)\b)/,
    // Jars are another product: a "frasco", "bollón" or "tarro" with a screw lid stores flour, not lunch.
    // A pair is neither row («Tupper Tápers Hermético Vidrio 410ml 2uni Yaques Mayorista», real run of
    // 2026-11-20, sat in «Unidad» at the price of two; «Set» says 3 or more).
    titleExclude:
      /\b(frascos?|tarros?|bollon(es)?|galletero|vasos?|mason|botellas?|especiero|tapa rosca|rosca|cilindric\w*|masa madre|azucarera|fuente|budinera|asadera|freidora|air ?fryer|airfryer|panificadora)\b|\b2 ?(uni|unid|unidades)\b|\b2 (piezas|recipientes|tuppers|potes|contenedores|viandas)\b|\b(pack|set|kit|juego) (de )?(x ?)?2\b|(?<!\d ?)\bx ?2\b(?![.,]\d| ?(x|cm|mm))/,
    variants: [
      // A size written «14,5 X 10,5 X 5 Cm» is not «x10»: «Tupper Hermético De Vidrio 410ml - 14,5 X
      // 10,5 X 5 Cm» (2026-11-20) led the «Set» row. An «x» right after a number is a dimension.
      {
        key: "set",
        label: "Set (3 o más)",
        match:
          /\b(set|juego|kit|pack|setx ?\d+|[3-9] (piezas|unidades|recipientes|tuppers|potes|contenedores|viandas))\b|(?<!\d ?)\bx ?([3-9]|1\d)\b(?![.,]\d| ?(x|cm|mm))/,
        rank: 2,
      },
      { key: "unidad", label: "Unidad", fallback: true, rank: 1 },
    ],
    regime: "commodity",
    usedOk: false,
  },
  {
    ...COMMON,
    key: "almohada-viscoelastica",
    label: "Almohada viscoelástica",
    mlQueries: ["almohada viscoelastica"],
    include: /^(?=.*\balmohadas?\b)(?=.*\b(viscoelasti\w*|memory ?foam|memoria|nasa|gel ?flex|gelflex|theragel)\b)/,
    titleExclude:
      /\b(viaje|en u|rodillas?|piernas?|entrepierna|lumbar|infantil|kids|bebe|lactancia|auto|cojin|asiento|almohadon)\b/,
    variants: [
      {
        key: "par",
        label: "Par (2 almohadas)",
        match: /\b(pack|set|promo|juego|kit)\b.{0,12}\b(x ?)?2\b|\b2 (almohadas|unidades)\b|\bx ?2\b/,
        rank: 2,
      },
      { key: "unidad", label: "Una almohada", fallback: true, rank: 1 },
    ],
    regime: "modelo",
    usedOk: false,
  },
  {
    ...COMMON,
    key: "arrancador-bateria",
    label: "Arrancador de batería portátil",
    mlQueries: ["arrancador de bateria portatil"],
    include: /\b(arrancador(es)?|jump ?starter|partidor de baterias?|booster)\b/,
    titleExclude:
      /\b(motor de arranque|burro|solenoide|rele|bendix|pinon|automatico de|para motor|cables? puente|pinzas?)\b/,
    variants: [
      { key: "compresor", label: "Con compresor para inflar", match: /\b(compresor|comprensor|inflador)\b/, rank: 2 },
      { key: "solo", label: "Sólo arrancador", fallback: true, rank: 1 },
    ],
    regime: "commodity",
    usedOk: false,
  },
  {
    ...COMMON,
    key: "auriculares-inalambricos",
    label: "Auriculares inalámbricos",
    mlQueries: ["auriculares inalambricos"],
    include: /\b(auricular(es)?|audifonos?|audif\w*|headphones?|earbuds?|buds\d*|airpods)\b/,
    titleExclude:
      /\b(almohadillas?|estuche|case|gomitas?|puntas|tips|cargador|cable|para airpods|repuesto|soporte|gamer con cable|con cable|cableado)\b/,
    variants: [
      // «TWS», «true wireless» and «buds» are earbuds whatever else the title says: «Jbl Headphones Tws
      // Endurance Peak 4 White Blanco» (real run of 2026-11-20) sat under «de vincha».
      {
        key: "vincha",
        label: "De vincha (over-ear)",
        match:
          /^(?!.*\b(open[- ]?ear|tws|true wireless|earbuds?|buds)\b).*\b(vincha|diadema|over-?ear|on-?ear|wh-\w+|tune [5-7]\d0\w*|headphones)\b/,
        rank: 2,
      },
      // Open-ear sports sets («Olsen Open-Ear», «JBL Soundgear Clips … Headphones … Open Ear») have no
      // headband: they are read here, so the label says so instead of promising AirPods.
      { key: "inear", label: "Sin vincha (in-ear u open-ear)", fallback: true, rank: 1 },
    ],
    regime: "modelo",
    usedOk: false,
  },
  {
    ...COMMON,
    key: "bicicleta",
    label: "Bicicleta",
    mlQueries: ["bicicleta rodado 29", "bicicleta urbana"],
    include: /\b(bicicletas?|bicis?|mtb|mountain bike)\b/,
    // Electric bikes have their own directory (/bicicletas-electricas-uruguay).
    titleExclude:
      /\b(electric\w*|e-?bike|ebike|infantil|nin[oa]s?|rodado (1[0-6]|20)|r(1[0-6]|20)\b|estatica|spinning|fija|de equilibrio|triciclo|portabicicletas?|porta bici\w*|para bicicleta|casco|candado|inflador|cubierta|camara|luz|luces|asiento|pedales?|cuadro solo|solo cuadro|horquilla)\b/,
    variants: [
      // An explicit mountain word wins: «Bicicleta De Montaña Rodado 29 Plegable» is a mountain bike.
      // A basket is a city bike («Bicicleta Kova Jazz Rodado 24 C/ Canasto Y Timbre», 2026-11-20, fell
      // to «de montaña»).
      {
        key: "urbana",
        label: "Urbana o paseo",
        match: /^(?!.*\b(montana|mtb|mountain)\b).*\b(urbana|paseo|playera|city|hibrida|ruta|plegable|canast\w*)\b/,
        rank: 1,
      },
      { key: "montana", label: "De montaña", fallback: true, rank: 2 },
    ],
    regime: "commodity",
    usedOk: true,
  },
  {
    ...COMMON,
    key: "deshidratador",
    label: "Deshidratador de alimentos",
    mlQueries: ["deshidratador de alimentos"],
    include: /\b(deshidratador(a|as|es)?|desidratador(a)?)\b/,
    // A 3-litre "Deshidratador De Frutas Y Verduras, Antideslizante" is a salad spinner in
    // machine-translated Spanish; a real dehydrator says trays, levels, watts or "electric".
    titleExclude:
      /\b(hojas?|laminas?|mallas?|bolsas?|[1-5] ?(l|lt|lts|litros)|antideslizante|centrifug\w*|ensalad\w*|escurrid\w*)\b|^(?!.*\b(bandejas?|band|niveles|pisos|\d{2,4} ?w|electric\w*|electronico|digital|temporizador|timer|maquina|deshidratadora|automatic\w*|nutrichef|excalibur|zilan|ariete|steba|demet|ventus|magic mill)\b)/,
    variants: [
      {
        key: "grande",
        label: "Grande (8 bandejas o más)",
        match: /\b([89]|[1-3]\d) ?(bandejas|niveles|pisos|band)\b/,
        rank: 2,
      },
      { key: "hogar", label: "De hogar (hasta 7 bandejas)", fallback: true, rank: 1 },
    ],
    regime: "commodity",
    usedOk: true,
  },
  {
    ...COMMON,
    key: "espumador-de-leche",
    label: "Espumador de leche",
    mlQueries: ["espumador de leche"],
    include:
      /\b(espumador(a|es)?|batidor(es)? (espumador|de cafe|de leche|para cafe|para leche)|capuchinador|capuccinador|frother)\b/,
    // A hand-pumped plunger is neither an electric jug nor a battery whisk: «Espumador De Leche 250ml
    // Negro Latteo Bodum» (real run of 2026-11-20) sat under «jarra eléctrica» for its millilitres.
    titleExclude:
      /\b(cafeteras?|jarras? (para )?espumar|jarra espumadora|jarra de acero|pitcher|lechera|espatulas?|latteo|manual|embolo)\b/,
    variants: [
      // A jug that heats and froths versus the battery whisk.
      {
        key: "electrico",
        label: "Jarra eléctrica (calienta y espuma)",
        match: /\b(calentador|calienta|\d{2,3} ?ml|[3-9]\d\d ?w|cremio|nuvella|multifuncion|vintage|xi-cmm\w*|ca\d{4}\w*)\b/,
        rank: 2,
      },
      { key: "mano", label: "De mano (a pila o recargable)", fallback: true, rank: 1 },
    ],
    regime: "commodity",
    usedOk: false,
  },
  {
    ...COMMON,
    key: "frigobar",
    label: "Frigobar",
    mlQueries: ["frigobar"],
    include: /\b(frigobar|minibar|mini ?bar|mini nevera|friogobar|heladera chica|heladera compacta)\b/,
    // Real run of 2026-11-20: «Mini Bar De Madera Cava Rustica» (a cabinet, the cheapest «frigobar»)
    // and «Frigobar 12/24 Volts De 90 Litros» (a vehicle fridge; norm() reads the slash as a space).
    titleExclude:
      /\b(camping|motorhome|conservadora|portatil|12v|24v|12 24|(12|24) ?volts?|bateria|a gas|friogas|glp|cervecer\w*|vinos?|vinoteca|exhibidora?|freezer horizontal|reacondicionad\w*|amd|intel|madera|rustic\w*|cava|mueble)\b/,
    variants: [{ key: "estandar", label: "Hasta 120 L", fallback: true, rank: 1 }],
    regime: "modelo",
    usedOk: true,
  },
  {
    ...COMMON,
    key: "kindle",
    label: "Kindle",
    mlQueries: ["kindle"],
    include:
      /^(?=.*\bkindle\b)(?=.*\b(e-?readers?|e-?books?|lector|paperwhite|colorsoft|scribe|kids|basic|oasis|\d{1,3} ?gb|gen|generacion|\d{1,2}(va|ma|th|a)? gen)\b)/,
    titleExclude:
      /\b(fundas?|case|cover|estuche|protector\w*|page turner|ring|para (amazon )?kindle|lamina|film|vidrio|cargador|skin|skins|sticker|cobak|bhhb|omoton)\b/,
    variants: [
      { key: "premium", label: "Colorsoft, Scribe u Oasis", match: /\b(colorsoft|scribe|oasis)\b/, rank: 3 },
      { key: "paperwhite", label: "Paperwhite", match: /\bpaperwhite\b/, rank: 2 },
      { key: "basico", label: "Kindle básico (6 pulgadas)", fallback: true, rank: 1 },
    ],
    regime: "modelo",
    usedOk: true,
  },
  {
    ...COMMON,
    key: "lavasecarropas",
    label: "Lavasecarropas",
    mlQueries: ["lavasecarropas"],
    include:
      /\b(lavasecarropas?|lavaseca|lava ?seca ?rropas?|lavadoras? (y )?secadoras?|torres? de lavado( y secado)?|washtower)\b/,
    variants: [
      { key: "torre", label: "Torre de lavado y secado", match: /\b(torres?|washtower)\b/, rank: 2 },
      { key: "combinado", label: "Un solo equipo que lava y seca", fallback: true, rank: 1 },
    ],
    regime: "modelo",
    usedOk: true,
  },
  {
    ...COMMON,
    key: "monitor",
    label: "Monitor extra",
    mlQueries: ["monitor 24 pulgadas"],
    include: /^(?=.*\bmonitor(es)?\b)(?=.*(?<![\d.,])(2[2-5](?:[.,]\d)?) ?("|''|pulgadas?|pulg|p)?(?![\d.,]))/,
    titleExclude:
      /\b(brazo|base|bebe|presion|signos|cardiaco|multiparametrico|audio|estudio|parlantes de|camara|de vigilancia|tactil industrial|caja abierta|reacondicionad\w*)\b/,
    variants: [
      // A declared refresh rate under 120 Hz beats the word «gamer»: 14 of the 60 «gamer» monitors of
      // the real run of 2026-11-20 said 75 to 100 Hz («Monitor Gamer Gadnic con pantalla de 24" 75Hz y
      // resolución Full HD», «Monitor Gamer Shot Gaming Curvo 23.8" 100hZ»).
      {
        key: "gamer",
        label: "22 a 25 pulgadas, gamer (120 Hz o más)",
        match: /^(?!.*(?<![\d.,])([1-9]\d|1[01]\d) ?hz\b)(.*\b(1[2-9]\d|2[0-9]\d) ?hz\b|.*\bgam(er|ing)\b)/,
        rank: 2,
      },
      { key: "oficina", label: "22 a 25 pulgadas, para trabajar (hasta 100 Hz)", fallback: true, rank: 1 },
    ],
    regime: "modelo",
    usedOk: true,
  },
  {
    ...COMMON,
    key: "perfume-arabe",
    label: "Perfume árabe",
    mlQueries: ["perfume arabe"],
    include:
      /\b(arabes?|lattafa|laffata|lataffa|armaf|afnan|rasasi|french avenue|maison alhambra|al haramain|ajmal|swiss arabian|zimaya|fragrance world|paris corner|rayhaan|arabiyat|khamrah|badee al oud|bade.?e al oud|amber oud|opulent dubai|dunescape|club de nuit|odyssey|asad|yara|hawas|liquid brun|musamam)\b/,
    titleExclude:
      /\b(decants?|muestras?|desodorantes?|body mist|splash|crema|locion|vela|difusor|aceite|tester|miniatura|perfumero|atomizador|botella vacia|set|kit|estuche|coffret|pack)\b|\b([1-9]|[1-2]\d) ?ml\b/,
    variants: [
      { key: "chico", label: "Hasta 60 ml", match: /\b([3-6]\d) ?ml\b/, rank: 1 },
      { key: "grande", label: "150 ml o más", match: /\b(1[5-9]\d|[2-9]\d\d) ?ml\b/, rank: 3 },
      { key: "estandar", label: "80 a 120 ml", fallback: true, rank: 2 },
    ],
    regime: "modelo",
    usedOk: false,
  },
  {
    ...COMMON,
    key: "pesa-rusa",
    label: "Pesa rusa",
    mlQueries: ["pesa rusa"],
    include: /\b(pesas? rusas?|kettle ?bells?|kettlebel)\b/,
    // Without a declared weight the band mixes 4 kg and 24 kg. A dumbbell set that also names the
    // kettlebell is another product: «Kit De Pesas Set Mancuernas Ajustable 20kg Barra Rusa Kettlebell
    // Ejercicio Completo Color Negro», «4en1 Kit Ajustable Mancuernas 5.5kg Con Juego Peso Pesa Rusa
    // Verde» and «Mancuerna y Pesa Rusa 2 en 1 Ajustable 5kg …» (real run of 2026-11-20). An adjustable
    // KETTLEBELL («Pesa Rusa Ajustable Hasta 20 Kg») is still one.
    titleExclude:
      /\b(mango|accesorio|rack|organizador|soporte|mancuernas? ajustables?|(kit|set|juego) (de )?(pesas|mancuernas)|kit ajustable|mancuerna y pesa rusa)\b|^(?!.*(?<![\d.,])\d{1,2}(?:[.,]\d)? ?(kg|kgs|k|kilos?|lb|lbs|libras)\b)/,
    variants: [
      // Pounds too: «Kettlebell Macri de 15 Libras» (6.8 kg, 2026-11-20) fell to «10 a 14 kg».
      // 17 lb is under 8 kg and 35 lb is about 16 kg.
      {
        key: "liviana",
        label: "Hasta 8 kg",
        match: /(?<![\d.,])(0?[1-8])(?:[.,]\d)? ?(kg|kgs|k|kilos?)\b|(?<![\d.,])(\d|1[0-7])(?:[.,]\d)? ?(lb|lbs|libras)\b/,
        rank: 1,
      },
      {
        key: "pesada",
        label: "16 kg o más",
        match: /(?<![\d.,])(1[6-9]|[2-4]\d)(?:[.,]\d)? ?(kg|kgs|k|kilos?)\b|(?<![\d.,])(3[5-9]|[4-9]\d)(?:[.,]\d)? ?(lb|lbs|libras)\b/,
        rank: 3,
      },
      { key: "media", label: "10 a 14 kg", fallback: true, rank: 2 },
    ],
    regime: "commodity",
    usedOk: true,
  },
  {
    ...COMMON,
    key: "robot-de-cocina",
    label: "Robot de cocina",
    mlQueries: ["robot de cocina", "robot de cocina multifuncion"],
    include: /\b(robots? (de )?cocina|thermomix|cookit|monsieur cuisine|total ?chef|ichef|cuisine companion)\b/,
    // In Uruguay "robot de cocina" is ALSO the name of a stand mixer. The thread's robot cooks (soup,
    // rice pudding, jam), so a mixer, a processor or a bowl is rejected, and so is a title that never
    // says anything a cooking robot says (programs, temperature, recipes, litres).
    titleExclude: new RegExp(
      String.raw`\b(planetaria|batidora|amasadora|bowls?|procesador(a)?|multiprocesador(a)?|mums?\d\w*|mums\w*|accesorios? para|cuchilla|jarra de repuesto)\b|^(?!.*\b(programas?|recetas?|temperatura|coccion|vapor|wifi|wi-fi|smart|tactil|chef|totalchef|ichef|rk\d+|thermomix|cookit|cuisine|\d(?:[.,]\d{1,2})? ?${L.slice(0, -2)})\b)`
    ),
    variants: [{ key: "estandar", label: "Robot de cocina con cocción", fallback: true, rank: 1 }],
    regime: "modelo",
    usedOk: true,
  },
  {
    ...COMMON,
    key: "sarten-acero-inoxidable",
    label: "Sartén de acero inoxidable",
    mlQueries: ["sarten acero inoxidable"],
    include: /^(?=.*\b(sarten|sartenes|salteadora)\b)(?=.*\b(inox\w*|18 10)\b)/,
    // The point in the thread is the pan WITHOUT a coating: a "stainless" pan with a non-stick,
    // titanium or ceramic layer is the other product. So are a wok («Wok Sarten Acero Inoxidable 28cm
    // Trillium Con 2 Asas») and a carbon-steel pan whose COLOUR is «acero inoxidable» («Sartén Kankay
    // Carbonada Sartenes N20 color acero inoxidable de 1.5L»), both from the real run of 2026-11-20.
    titleExclude:
      /\b(antiadherente|ceramica|ceram|revest\w*|titanio|teflon|granito|piedra|juego|set|bateria|tapa de|mango de|wok|carbon\w*)\b/,
    variants: [
      {
        key: "chica",
        label: "Hasta 22 cm",
        match: /(?<![\d.,x])(1[4-9]|2[0-2]) ?(cm|cms)\b|\b(1[4-9]|2[0-2]) ?x ?\d/,
        rank: 1,
      },
      {
        key: "grande",
        label: "27 cm o más",
        match: /(?<![\d.,x])(2[7-9]|3\d) ?(cm|cms)\b|\b(2[7-9]|3\d) ?x ?\d/,
        rank: 3,
      },
      { key: "mediana", label: "24 a 26 cm", fallback: true, rank: 2 },
    ],
    regime: "modelo",
    usedOk: false,
  },
  {
    ...COMMON,
    key: "ventilador-industrial",
    label: "Ventilador industrial",
    mlQueries: ["ventilador industrial"],
    include: /\bventilador(es)?\b.*\b(industrial\w*|turbo)\b|\bturbo ?ventilador\b|\b(industrial|turbo)\b.*\bventilador/,
    // Without a declared diameter the band mixes 40 cm and 65 cm (the pesa-rusa rule): in the real run
    // of 2026-11-20 four of the six cheapest «46 a 59 cm» said no size at all, and «Ventilador De Pie
    // 55w Industrial 3 Velocidades 5 Aspas Ganga Shop» is the same fan another seller lists as «… 42
    // Cm». A bare 16, 18 or 20 is read as inches, as the «chico» rule below does.
    titleExclude:
      /\b(extractor|de techo|de pc|notebook|12v|24v|auto|cooler|soplador|pack|set|kit)\b|^aspas?\b|\baspas? de repuesto\b|\bx ?[2-9] (unidades|u)\b|\b[2-9] ventiladores\b|\bpack (de )?\d|^(?!.*((?<![\d.,])\d{2,3} ?(cm|cms)\b|(?<![\d.,])\d{2} ?("|''|pulgadas?|pulg)|\b1 metro\b|\bdiametro \d{2}\b|\b(16|18|20)\b(?! ?(w|v|kg))))/,
    variants: [
      {
        key: "grande",
        label: "60 cm o más",
        match:
          /(?<![\d.,])([6-9]\d|1\d\d) ?(cm|cms)\b|(?<![\d.,])(2[4-9]|3\d) ?("|''|pulgadas?|pulg)|\b1 metro\b|\bdiametro (2[4-9]|3\d)\b(?! ?cm)/,
        rank: 3,
      },
      {
        key: "chico",
        label: "Hasta 45 cm",
        match: /(?<![\d.,])([3-4]\d) ?(cm|cms)\b|(?<![\d.,])1[0-8] ?("|''|pulgadas?|pulg)|\b(18|16)\b(?! ?(w|v|kg))/,
        rank: 1,
      },
      { key: "mediano", label: "46 a 59 cm", fallback: true, rank: 2 },
    ],
    regime: "commodity",
    usedOk: true,
  },
];

export const PRODUCTOS_VIDA_BY_KEY = new Map(PRODUCTOS_VIDA_CATEGORIES.map((category) => [category.key, category]));
