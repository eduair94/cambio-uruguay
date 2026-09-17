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
// tests `include` against the TITLE — `context` (a store's category/tag text) only ever gets to VETO a
// match (`NOT_A_PRODUCT`, `exclude`), never grant one. That is deliberate shared behaviour and this
// file does not touch it. Measured 2026-09-17 against the two new Shopify stores: `voltbike.uy` and
// `shop.loop-bikes.com` both publish their real e-bikes and e-scooters under bare brand/model titles
// ("SuperVolt", "Loop Cruiser", "Michael Blast Outsider Sport", "Monopatin Air") with NEITHER
// "bicicleta"/"monopatín" NOR "eléctrica"/"eléctrico" anywhere in the title — only Shopify's own
// `product_type` says so ("Bicicleta Eléctrica", "Motopatín Eléctrico"). Fix round 1 (controller
// ruling): rather than loosen `include` (which would also re-admit Loop's plain "Loop Craft Kids 24""
// kids bike, `product_type: "Bicicleta"`, no "eléctrica"), `RetailStore.productTypeInTitle` (opt-in,
// per store, see `classes/retail/types.ts` and `classes/retail/sources/shopify.ts`) makes the SHOPIFY
// ADAPTER prepend a non-empty `product_type` to the title before either the classifier or the page
// ever sees it — "SuperVolt" becomes "Bicicleta Eléctrica SuperVolt", and "Loop Craft Kids 24""
// becomes "Bicicleta Loop Craft Kids 24"" (still correctly rejected: its `product_type` says
// "Bicicleta", never "Bicicleta eléctrica"). The flag is on for `voltbike`/`loopbikes` only — see
// `classes/retail/stores.ts` — and it moves the false-positive risk from "manual bike" to "the
// merchant's own `product_type` says Accesorio/Repuesto", which is exactly why `MONOPATIN_EXCLUDE`/
// `BICICLETA_EXCLUDE` below both reject a bare "accesorio"/"accesorios": once composed, "Accesorio de
// bicicleta eléctrica Canasto Central…" (a basket, loopbikes) would otherwise read as a real bicycle.
import type { EquiparCategory } from "../equipar/types";

/**
 * `"monopatin electrico"`/`"monopatines electricos"`, `"motopatin electrico"` (voltbike's own name
 * for the same thing — its `product_type` says "Motopatín Eléctrico", composed onto the title by
 * `productTypeInTitle`), `"scooter electrico"`, `"patinete electrico"` (the Spain/import-listing
 * synonym — measured 2026-09-17 on MercadoLibre: "Patinete Eléctrico Adulto 430 W…", "Gotrax Patinete
 * Eléctrico A5…"), the English word order "electric scooter" (measured the same day: "Xiaomi Electric
 * Scooter 5 Pro Us Color Negro"), and `"e-scooter"`. Never a bare "monopatín"/"motopatín": that is
 * precisely the "sin motor" case the spec says never to publish as this category (a kick scooter, a
 * skateboard, a kid's toy) — measured cost of keeping the qualifier required: a seller who titles a
 * real electric scooter with NEITHER "eléctrico" NOR "electric" anywhere, and whose store does not say
 * so in `product_type` either ("Xiaomi Scooter 6 Pro", "Monopatin A Bateria Sgk6…", voltbike's own
 * "MONOPATN G2PRO" with blank `product_type`), is missed, and that is accepted on purpose rather than
 * loosen the gate that keeps "sin motor" out.
 */
const MONOPATIN_INCLUDE =
  /\b(mo[nt]opatin(es)? electric[oa]s?|scooter(s)? electric[oa]s?|electric scooter(s)?|patinete(s)? electric[oa]s?|e-?scooter(s)?)\b/;

/**
 * What a monopatín-eléctrico LISTING never is, checked against title+context (so a Shopify tag of
 * "Repuesto"/"Accesorio" still vetoes a title that happened to name the compatible product). Beyond
 * the shared `NOT_A_PRODUCT` (repuesto, cable, rueda, juguete, …), this file adds what that list does
 * not cover and this domain measured today: loose batteries, chargers, helmets, tyres/inner tubes,
 * conversion-kit language, a bare "accesorio(s)" (fix round 1: with `productTypeInTitle` composing
 * voltbike's `product_type: "Accesorio"` onto the title, "Accesorio Cargador 60V Motopatin" and
 * similar now REACH the include gate — mostly still fail it since they lack the electric qualifier
 * next to "motopatin", but this is the belt to that suspenders), and — the one the controller called
 * out by name — a moto electrifying the word "eléctrico" without being a monopatín at all (Supermotos'
 * "e-Yumbo" line, read in `docs/superpowers/specs/2026-09-17-movilidad-electrica-design.md` and the
 * research notes, sells under "Moto Eléctrica", never "Monopatín"). Triciclos y cuatriciclos eléctricos
 * son otro vehículo, no un monopatín, y la Intendencia de San José ya los regula aparte (decreto 3278
 * vs. 3279).
 */
const MONOPATIN_EXCLUDE =
  /\b(bateria|baterias|cargador|cargadores|casco|cascos|cubierta|cubiertas|neumatico|neumaticos|camara( de aire)?|kit de conversion|convertir (tu|la) bicicleta|accesorio|accesorios|moto|motos|motoneta|ciclomotor|triciclo|triciclos|cuatriciclo|cuatriciclos|yumbo|homologad\w*|empadronable|con matricula|hoverboard|guante|guantes)\b/;

/** `"bicicleta electrica"`/`"bicicletas electricas"`, `"bici electrica"`, `"e-bike"`/`"ebike"`. Never
 * a bare "bicicleta": a normal pedal bike is not this category, and Loop's own catalogue tags a plain
 * kids' bike `bicinormal` right next to the electric ones — `product_type: "Bicicleta"`, never
 * "Bicicleta eléctrica", so `productTypeInTitle` never turns it into one. */
const BICICLETA_INCLUDE = /\b(bicicletas? electric[oa]s?|bici electric[oa]|e-?bike|ebike)\b/;

/**
 * Same reasoning as {@link MONOPATIN_EXCLUDE}: loose batteries, chargers, helmets, tyres/tubes,
 * conversion kits (a motor kit bolted to a normal frame is not a factory e-bike), plus triciclos y
 * cuatriciclos, which are not bicycles either. `lubricante` earned its spot by measurement
 * (2026-09-17, `loopbikes`): "Lubricante de Cadena Zefal eBike 120ml" is chain oil, not a bike, and it
 * matches `BICICLETA_INCLUDE` on the bare word "eBike" printed on the bottle. `accesorio`/`accesorios`
 * earned theirs the same day, fix round 1: loopbikes tags dozens of REAL accessories (baskets,
 * mirrors, footrests, phone mounts, racks) `product_type: "Accesorio de bicicleta eléctrica"`, which
 * `productTypeInTitle` composes onto the title as "Accesorio de bicicleta eléctrica Canasto Central…"
 * — that phrase contains "bicicleta eléctrica" adjacent and would otherwise pass `include` outright.
 */
const BICICLETA_EXCLUDE =
  /\b(bateria|baterias|cargador|cargadores|casco|cascos|cubierta|cubiertas|neumatico|neumaticos|camara( de aire)?|kit de conversion|motor de conversion|convertidor|convertir (tu|la) bicicleta|accesorio|accesorios|triciclo|triciclos|cuatriciclo|cuatriciclos|lubricante)\b/;

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
 * Stores `sync_movilidad.ts` (Task 3) will actually harvest — every store registered in
 * `classes/retail/stores.ts` for this domain that measured at least one real accepted product through
 * the actual `matchesCategory()` gate (`scripts/oneoff/movilidad_dry_run.ts`, not a guess from the
 * storefront's own category page).
 *
 * Measured 2026-09-17: `delcar` (3 monopatines, 9 bicicletas, all titled "… Eléctric[oa] …"),
 * `superbikers` (2 monopatines), `covercompany` (already in the shared registry for other consumers; a
 * full scan of its ~1.750-product catalogue found 6 "Monopatin electrico Xiaomi MI Electric Scooter
 * 5/6 …" listings — no bicicletas eléctricas). Fix round 1, same day: `voltbike` and `loopbikes`
 * initially measured ZERO — their real inventory is titled by bare brand/model with the type only in
 * Shopify's `product_type` — and are now IN this list with `productTypeInTitle: true` set on both (see
 * `classes/retail/stores.ts`): `voltbike` re-measured at 6 accepted (5 bicicletas, 1 monopatín),
 * `loopbikes` at 12 (bicicletas only), with none of their many "Accesorio"/"Repuesto"/"Accesorio de
 * bicicleta eléctrica" listings slipping through.
 */
export const MOVILIDAD_STORE_KEYS = ["delcar", "superbikers", "covercompany", "voltbike", "loopbikes"] as const;
