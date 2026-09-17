// Vocabulary for "qué cuesta un monopatín o una bicicleta eléctrica en Uruguay".
//
// This is a SECOND consumer of the equipar catalog machinery (`classes/equipar/{classify,catalog}.ts`),
// injected via `registry` (see `BuildCatalogInput.registry` in `catalog.ts`), not a fork of it. The
// shape is `EquiparCategory` because that is what `buildEquiparCatalog`/`specsFor` already know how
// to turn into rows, bands and offers — `room: "movilidad"` exists on `EquiparRoom` precisely so this
// file can satisfy the type without lying about which room of a house a scooter lives in (see the
// comment on `EquiparRoom` in `classes/equipar/types.ts`). `classes/equipar/basket.ts` only ever
// iterates `EQUIPAR_CATEGORIES` — never an injected registry — so neither category here can reach the
// equipar basket or its budget regardless of tier/quantity below; those two fields are filled
// sensibly anyway because the type requires them, not because anything reads them.
//
// THE HARD CONSTRAINT THIS FILE IS WRITTEN AGAINST: `matchesCategory()` in `classes/equipar/classify.ts`
// tests `include` against the TITLE ONLY — `context` (a store's category/tag text) only ever gets to
// VETO a match (`NOT_A_PRODUCT`, `exclude`), never grant one. That is deliberate shared behaviour, and
// Task 2 does not touch it. Measured 2026-09-17 against the two new Shopify stores: `voltbike.uy` and
// `shop.loop-bikes.com` both publish their real e-bikes and e-scooters under bare brand/model titles
// ("SuperVolt", "Loop Cruiser", "Michael Blast Outsider Sport", "Monopatin Air") with NEITHER
// "bicicleta"/"monopatín" NOR "eléctrica"/"eléctrico" anywhere in the title — only Shopify's
// `product_type`/`tags` say so ("Bicicleta eléctrica", "Motopatín Eléctrico"), and those are read only
// as `context`. Loosening `include` to a bare "bicicleta"/"monopatin" does not rescue them (their
// titles carry no category word at all, so a looser regex still matches nothing of theirs) and it
// actively re-admits real risk elsewhere (Loop's own "Loop Craft Kids 24"", tagged `bicinormal`, is a
// manual kids bike). Since the spec requires rejecting a "monopatín"/bicicleta with no stated motor
// (see the exclusion list below and `tests/movilidad/registry.test.ts`), `include` stays STRICT —
// title must say "eléctrico"/"eléctrica" (or the recognised English synonyms) — and `voltbike`/
// `loopbikes` are registered in `classes/retail/stores.ts` for completeness but left OUT of
// `MOVILIDAD_STORE_KEYS` below, exactly as the brief's fallback allows: "si no [hay producto real],
// dejala afuera y decilo".
import type { EquiparCategory } from "../equipar/types";

/**
 * `"monopatin electrico"`/`"monopatines electricos"`, `"scooter electrico"`, `"patinete electrico"`
 * (the Spain/import-listing synonym — measured 2026-09-17 on MercadoLibre: "Patinete Eléctrico Adulto
 * 430 W…", "Gotrax Patinete Eléctrico A5…"), the English word order "electric scooter" (measured the
 * same day: "Xiaomi Electric Scooter 5 Pro Us Color Negro"), and `"e-scooter"`. Never a bare
 * "monopatín": that is precisely the "sin motor" case the spec says never to publish as this category
 * (a kick scooter, a skateboard, a kid's toy) — measured cost of keeping the qualifier required: a
 * seller who titles a real electric scooter with NEITHER "eléctrico" NOR "electric" anywhere ("Xiaomi
 * Scooter 6 Pro", "Monopatin A Bateria Sgk6…") is missed, and that is accepted on purpose rather than
 * loosen the gate that keeps "sin motor" out.
 */
const MONOPATIN_INCLUDE =
  /\b(monopatin(es)? electric[oa]s?|scooter(s)? electric[oa]s?|electric scooter(s)?|patinete(s)? electric[oa]s?|e-?scooter(s)?)\b/;

/**
 * What a monopatín-eléctrico LISTING never is, checked against title+context (so a Shopify tag of
 * "Repuesto"/"Accesorio" still vetoes a title that happened to name the compatible product). Beyond
 * the shared `NOT_A_PRODUCT` (repuesto, cable, rueda, juguete, …), this file adds what that list does
 * not cover and this domain measured today: loose batteries, chargers, helmets, tyres/inner tubes,
 * conversion-kit language, and — the one the controller called out by name — a moto electrifying the
 * word "eléctrico" without being a monopatín at all (Supermotos' "e-Yumbo" line, read in `docs
 * /superpowers/specs/2026-09-17-movilidad-electrica-design.md` and the research notes, sells under
 * "Moto Eléctrica", never "Monopatín"). Triciclos y cuatriciclos eléctricos son otro vehículo, no un
 * monopatín, y la Intendencia de San José ya los regula aparte (decreto 3278 vs. 3279).
 */
const MONOPATIN_EXCLUDE =
  /\b(bateria|baterias|cargador|cargadores|casco|cascos|cubierta|cubiertas|neumatico|neumaticos|camara( de aire)?|kit de conversion|convertir (tu|la) bicicleta|moto|motos|motoneta|ciclomotor|triciclo|triciclos|cuatriciclo|cuatriciclos|yumbo|homologad\w*|empadronable|con matricula|hoverboard|guante|guantes)\b/;

/** `"bicicleta electrica"`/`"bicicletas electricas"`, `"bici electrica"`, `"e-bike"`/`"ebike"`. Never
 * a bare "bicicleta": a normal pedal bike is not this category, and Loop's own catalogue tags a plain
 * kids' bike `bicinormal` right next to the electric ones. */
const BICICLETA_INCLUDE = /\b(bicicletas? electric[oa]s?|bici electric[oa]|e-?bike|ebike)\b/;

/** Same reasoning as {@link MONOPATIN_EXCLUDE}: loose batteries, chargers, helmets, tyres/tubes,
 * conversion kits (a motor kit bolted to a normal frame is not a factory e-bike), plus triciclos y
 * cuatriciclos, which are not bicycles either. `lubricante` earned its spot by measurement
 * (2026-09-17, `loopbikes`): "Lubricante de Cadena Zefal eBike 120ml" is chain oil, not a bike, and
 * it matches `BICICLETA_INCLUDE` on the bare word "eBike" printed on the bottle. */
const BICICLETA_EXCLUDE =
  /\b(bateria|baterias|cargador|cargadores|casco|cascos|cubierta|cubiertas|neumatico|neumaticos|camara( de aire)?|kit de conversion|motor de conversion|convertidor|convertir (tu|la) bicicleta|triciclo|triciclos|cuatriciclo|cuatriciclos|lubricante)\b/;

/** Explicit power/speed language, or an unambiguous off-road/dual-motor claim. Kept as `match` (a
 * plain regex over the title), not `numeric`, because `EquiparUnit` has no watts/km-per-hour unit and
 * this domain does not need one — a monopatín's title either says the number with its own unit right
 * there or it says nothing, and "nothing" correctly falls to `urbano`. */
const ALTO_RENDIMIENTO_MATCH =
  /\b([89]\d{2}|\d{4,5}) ?w(?:atts?)?\b|\b(4[5-9]|[5-9]\d) ?km\/?h\b|\btodo ?terreno\b|\bcross\b|\boff-?road\b|\bdoble motor\b|\bdual drive\b|\bfat ?tire\b/;

export const MOVILIDAD_CATEGORIES: EquiparCategory[] = [
  {
    key: "monopatin-electrico",
    label: "Monopatín eléctrico",
    room: "movilidad",
    tier: "B",
    regime: "modelo",
    reason:
      "No es una necesidad de la casa, es transporte: entra cuando el resto de la lista ya está resuelto.",
    usedOk: true,
    usedNote:
      "La batería es lo que se degrada; un monopatín usado sin fecha ni ciclos de carga declarados es una apuesta.",
    variants: [
      {
        key: "infantil",
        label: "Infantil",
        match: /\b(infantil|para (ninos?|ninas?|chicos))\b/,
        rank: 1,
      },
      { key: "urbano", label: "Urbano o estándar", fallback: true, rank: 2 },
      {
        key: "alto-rendimiento",
        label: "Alto rendimiento (potencia o velocidad declarada)",
        match: ALTO_RENDIMIENTO_MATCH,
        rank: 3,
      },
    ],
    include: MONOPATIN_INCLUDE,
    exclude: MONOPATIN_EXCLUDE,
    urlHint: /(monopatin|scooter-electric|e-scooter)/i,
    storeQueries: ["monopatin electrico", "monopatin", "scooter electrico"],
    mlQueries: [
      "monopatin electrico",
      "monopatin electrico adultos",
      "monopatin electrico xiaomi",
      "monopatin electrico ninebot",
      "scooter electrico",
      "monopatin electrico plegable",
    ],
    fbQueries: ["monopatin electrico"],
  },
  {
    key: "bicicleta-electrica",
    label: "Bicicleta eléctrica",
    room: "movilidad",
    tier: "B",
    regime: "commodity",
    reason:
      "Igual que el monopatín: transporte, no infraestructura de la casa. Entra cuando hay resto.",
    usedOk: true,
    usedNote: "Pedí la fecha y los ciclos de carga de la batería: es la pieza que decide si el precio es bueno.",
    variants: [
      { key: "plegable", label: "Plegable", match: /\bplegable\b/, rank: 1 },
      { key: "urbana", label: "Urbana o paseo", fallback: true, rank: 2 },
      { key: "montana", label: "Montaña", match: /\bmontana\b|\bmtb\b/, rank: 3 },
      { key: "carga", label: "De carga (cargo bike)", match: /\bde carga\b|\bcargo\b/, rank: 4 },
    ],
    include: BICICLETA_INCLUDE,
    exclude: BICICLETA_EXCLUDE,
    urlHint: /(bicicleta-electric|bici-electric|e-?bike)/i,
    storeQueries: ["bicicleta electrica", "bici electrica", "ebike"],
    mlQueries: [
      "bicicleta electrica",
      "bicicleta electrica plegable",
      "bicicleta electrica montana",
      "bicicleta electrica urbana",
      "e-bike",
      "bicicleta electrica carga",
    ],
    fbQueries: ["bicicleta electrica"],
  },
];

export const MOVILIDAD_BY_KEY = new Map(MOVILIDAD_CATEGORIES.map((category) => [category.key, category]));

/**
 * Stores `sync_movilidad.ts` (Task 3) will actually harvest. Deliberately narrower than every store
 * registered in `classes/retail/stores.ts` for this domain — see the file header and
 * `classes/retail/stores.ts` for what was measured and why `voltbike`/`loopbikes` are NOT here despite
 * being registered.
 *
 * Measured 2026-09-17 through the real `matchesCategory()` gate (`scripts/oneoff/movilidad_dry_run.ts`,
 * not a guess from the storefront's own category page): `delcar` (3 monopatines, 9 bicicletas, all
 * titled "… Eléctric[oa] …"), `superbikers` (2 monopatines), `covercompany` (already in the shared
 * registry for other consumers; a full scan of its ~1.750-product catalogue found 6 "Monopatin
 * electrico Xiaomi MI Electric Scooter 5/6 …" listings — no bicicletas eléctricas).
 */
export const MOVILIDAD_STORE_KEYS = ["delcar", "superbikers", "covercompany"] as const;
