// Real MercadoLibre/store titles (captured 2026-09-16) used to pin down classes/phones/identify.ts.
// Every title here is verbatim from the task brief — do not "clean up" the spelling/punctuation,
// the whole point is that the identifier has to survive how these titles are actually written.
import type { PhoneCondition } from "../../../classes/phones/types";

export interface IdentifyFixture {
  title: string;
  id: string;
  esimOnly?: boolean;
  ramGb?: number | null;
}

export const IDENTIFY_FIXTURES: IdentifyFixture[] = [
  { title: "Apple iPhone 17 Pro (256 GB) - Azul profundo", id: "apple-iphone-17-pro-256gb", esimOnly: false },
  { title: "Apple iPhone 17 Pro (512 GB) - Azul profundo - Sólo eSIM", id: "apple-iphone-17-pro-512gb", esimOnly: true },
  { title: "Apple iPhone 17 Pro 256gb ( Solo Esim )silver Plateado", id: "apple-iphone-17-pro-256gb", esimOnly: true },
  { title: "Iphone 17 Pro Max 6,9'' 5g 12gb 256gb Triple Cam 48mp", id: "apple-iphone-17-pro-max-256gb", ramGb: 12 },
  { title: "Apple iPhone 17 Esim 256gb - Blanco Verde Musgo", id: "apple-iphone-17-256gb", esimOnly: true },
  { title: "Apple iPhone 16e (128 Gb) - Blanco", id: "apple-iphone-16e-128gb" },
  { title: "Apple iPhone 15 Plus (128 GB - 6 GB RAM) - Negro", id: "apple-iphone-15-plus-128gb", ramGb: 6 },
  { title: "Apple iPhone 14 Pro (256 GB) - Morado oscuro (Nuevo con caja abierta)", id: "apple-iphone-14-pro-256gb" },
  { title: "Apple Iphone 15 128 Gb Rosa - Excelente (Reacondicionado)", id: "apple-iphone-15-128gb" },
  {
    title: "celular-apple-iphone-12-128gb-4gb-black-cpo",
    id: "apple-iphone-12-128gb",
  },
  { title: "Cel Samsung Galaxy S26 6,3'' 5g 12gb 256gb - Tecnobox", id: "samsung-galaxy-s26-256gb" },
  { title: "Celular Samsung Galaxy S26 Plus 5g 12 Gb 512 Gb Azul", id: "samsung-galaxy-s26-plus-512gb" },
  { title: "Celular Samsung Galaxy S26 Ultra 512gb Violeta 5g Nnet", id: "samsung-galaxy-s26-ultra-512gb" },
  { title: "samsung galaxy s26 fe 5g 128gb pistachio", id: "samsung-galaxy-s26-fe-128gb" },
  { title: "Celular Samsung Galaxy A17 8/256gb Dual Sim", id: "samsung-galaxy-a17-256gb", ramGb: 8 },
  { title: "Celular Samsung Galaxy A36 5g 256gb Black", id: "samsung-galaxy-a36-256gb" },
  { title: "Celular Moto Edge 70 Fusion 8+256gb Azul Azul", id: "motorola-edge-70-fusion-256gb", ramGb: 8 },
  {
    title: "Motorola Edge 70 Pro 5g 512gb 12gb+12gb Ram + Regalo Dimm",
    id: "motorola-edge-70-pro-512gb",
    ramGb: 12,
  },
  { title: "Motorola G17 4gb + 8gb Ram 256gb 4g Fhd + Regalo Dimm", id: "motorola-moto-g17-256gb", ramGb: 4 },
  {
    title: "Motorola Moto G17 Power 4g, 256 Gb, 8gb De Ram Expandible 24gb",
    id: "motorola-moto-g17-power-256gb",
    ramGb: 8,
  },
  { title: "Moto G06 256 Dual SIM 256 GB verde 4 GB RAM", id: "motorola-moto-g06-256gb" },
  { title: "celular motorola razr 70 ultra 1tb", id: "motorola-razr-70-ultra-1tb" },
  { title: "Celular Xiaomi Redmi Note 15 Pro+ 5g 256gb 8gb Black", id: "xiaomi-redmi-note-15-pro-plus-256gb" },
  {
    title: "Celular Xiaomi Redmi Note 15 256gb 8gb Ram 2026 Azul",
    id: "xiaomi-redmi-note-15-256gb",
  },
  {
    title: "Celular Xiaomi Poco X8 Pro Max Dual Sim 5g 12 Gb RAM 512 Gb Negro",
    id: "xiaomi-poco-x8-pro-max-512gb",
  },
  {
    title: "Celular Xiaomi Poco M8 Pro 5g 8gb Ram 256gb Rom 6.83 Amoled Dual Sim Black",
    id: "xiaomi-poco-m8-pro-256gb",
  },
  {
    title: "Celular Xiaomi Redmi 15c 4g 256gb 8gb Ram +8gb Virtual Verde Menta",
    id: "xiaomi-redmi-15c-256gb",
    ramGb: 8,
  },
  { title: "Honor Magic 8 Lite 8gb Ram 256gb 108mpx 5g + Regalo Dimm", id: "honor-magic-8-lite-256gb" },
  { title: "Celular Honor Magic8 Lite 8gb+256gb Dual Sim Verde Bosque", id: "honor-magic-8-lite-256gb" },
  { title: "HONOR X7e / 4G 256GB 12GB (6+6) RAM / 7500mAh", id: "honor-x7e-256gb", ramGb: 6 },
  { title: "Honor X5c Plus 4gb + 4gb Ram 256gb 50mpx 90hz Dimm", id: "honor-x5c-plus-256gb" },

  // The rows below came from running the identifier over every real "ML | …" title in
  // docs/superpowers/plans/2026-09-16-celulares-titulos-muestra.txt (per the task brief) and
  // reading back every key it produced. Each one caught a real bug or a real gap; kept here so a
  // future change can't silently reintroduce them.
  {
    // Caught a double-prefix bug: parseXiaomi's bare-flagship branch baked "xiaomi-" into its own
    // family string, and identifyPhone ALSO prepends "${brand}-", producing
    // "xiaomi-xiaomi-17-t-512gb". None of the fixtures above exercise this branch (they only hit
    // the redmi/poco branches, which never had the brand baked in), so nothing else would have
    // caught it.
    title: "Xiaomi 17t 12 GB Ram 512 GB Rom 6.59 120 Hz Pantalla Cámara Triple Leica 6500 mAh Batería Azul",
    id: "xiaomi-17-t-512gb",
    ramGb: 12,
  },
  {
    // Caught a storage-extraction bug: the old "exclude both halves of a +-glued pair when the
    // second half is ram-tagged" rule fired on "256GB + 16GB RAM" — a plain "and" between two
    // separate, already-unit-labelled specs, not a RAM-boost combo — and threw out the real 256GB
    // storage figure entirely (identifyPhone returned null). Fixed by dropping that rule: every
    // genuine combo term is ≤24 and every storage value is ≥32, so the ranges never overlap and
    // the rule was never actually needed for its stated purpose.
    title: "Honor Magic 8 Lite Magia Legendaria / Resistencia Legendaria / Memoria 256GB + 16GB RAM (8+8) / Cámara 108 Mpx / NFC / Black",
    id: "honor-magic-8-lite-256gb",
  },
  {
    // "Moto G Max"/"Moto G Stylus" carry no model number at all (the US/LatAm naming, as opposed
    // to the numbered global one) — a gap the brief's own `g(\d{2})` regex can't reach.
    title: "Motorola Moto G Max 5g, 256 GB, 8GB Expande 24GB con Ram Boost, cámara de 200 MP, pantalla Extreme Amoled de 1,5K. Ip69 Sumergible",
    id: "motorola-moto-g-max-256gb",
  },
  {
    // Real storefronts drop "Galaxy" from the title entirely ("Samsung S26 Ultra…"); once the
    // brand is already known to be Samsung, a bare letter+number is unambiguous enough on its own.
    title: "Samsung S26 Ultra 5g 12gb 512gb Original Libre Dimm",
    id: "samsung-galaxy-s26-ultra-512gb",
    ramGb: 12,
  },
  {
    // Poco's own naming glues a trailing letter straight onto the digits ("M8s") with no space —
    // the same letter-onto-digit shape that broke "Moto G06" (see the brand-detection fix above),
    // just in the family regex instead of brand detection.
    title: "Celular Xiaomi Poco M8s 5g 8gb Ram 256gb Rom Dual Sim Fhd+ 6.9 Pulgadas Snapdragon 6s Gen 3 Black",
    id: "xiaomi-poco-m8s-256gb",
    ramGb: 8,
  },
  {
    // Seller dropped "Redmi" from the title ("Xiaomi Note 15 Pro…") and typoed it elsewhere
    // ("Redm Note" — missing the final "i"); both are the same Redmi Note line.
    title: "Xiaomi Redm Note 15 Pro 8gb Ram 256gb Rom 4g Lte 200mpx Gris Titanio",
    id: "xiaomi-redmi-note-15-pro-256gb",
    ramGb: 8,
  },
  {
    // Generic (non-brief) family fallback for Oppo/Realme/TCL/ZTE/Nokia/Infinix/Tecno: the title
    // repeats both the brand word and a bare category letter ("Oppo Oppo A A79") before the real
    // model code — the fallback must skip past both and land on "a79", not stop at the bare "a".
    title: "Oppo Oppo A A79 Dual SIM 256 GB violeta 8 GB RAM",
    id: "oppo-a79-256gb",
    ramGb: 8,
  },
  {
    // The exact real title that requires keeping the bare-number storage branch at all: "6gb+256"
    // has no unit on the "256" — it's storage only because it's glued through an explicit "+" to a
    // preceding unit-bearing number. Removing the branch outright (rather than narrowing it, see
    // the "64 mp" null fixture below) drops this real title to null.
    title: "Celular Honor X7e 6gb+256 Naranja",
    id: "honor-x7e-256gb",
    ramGb: 6,
  },

  // --- Fix round 1 (reviewer-caught): Honor's 3-digit branch had no "pro", several other
  // numbered-family parsers had gaps in the same "missing suffix" class, and the bare-number
  // storage branch was too permissive. Each row below is a real, distinct phone that would have
  // collapsed onto another one's key (or, for the last one, been assigned a camera-megapixel count
  // as if it were storage) before this round's fix.
  {
    // CRITICAL: the 3-digit branch only had (lite|e) — no "pro" — so "Honor 200" and
    // "Honor 200 Pro" (two different, real phones) produced the same key.
    title: "Honor 200 256gb 8gb Ram Negro",
    id: "honor-200-256gb",
    ramGb: 8,
  },
  { title: "Honor 200 Pro 256gb 12gb Ram Negro", id: "honor-200-pro-256gb", ramGb: 12 },
  { title: "Honor 400 Lite 256gb 8gb Ram Negro", id: "honor-400-lite-256gb", ramGb: 8 },
  {
    // Moto E line had no family rule at all (only Moto G/Edge/Razr existed) — every Moto E title
    // fell through to null regardless of brand/storage being perfectly readable.
    title: "Motorola Moto E22 4g 64gb 4gb Ram Negro",
    id: "motorola-moto-e22-64gb",
    ramGb: 4,
  },
  {
    // "E22i" is a real, cheaper regional variant of the E22 — must not collapse onto plain E22.
    title: "Motorola Moto E22i 4g 64gb 4gb Ram Negro",
    id: "motorola-moto-e22i-64gb",
    ramGb: 4,
  },
  { title: "Motorola Moto E15 4g 32gb 2gb Ram Azul", id: "motorola-moto-e15-32gb", ramGb: 2 },
  {
    // POCO's F line added "Ultra" (POCO F7 Ultra) above "Pro" — the suffix alternation only had
    // "pro max"/"pro" and would have dropped "Ultra" as unmatched trailing text.
    title: "Celular Xiaomi Poco F7 Ultra 5g 512gb 16gb Ram Negro",
    id: "xiaomi-poco-f7-ultra-512gb",
    ramGb: 16,
  },
  { title: "Celular Xiaomi Redmi A3 4g 64gb 3gb Ram Negro", id: "xiaomi-redmi-a3-64gb", ramGb: 3 },
  {
    // "A3x" is a real, cheaper Redmi A variant sold alongside the base A3 — the old `redmi a(\d)`
    // regex had no suffix group at all, so A3 and A3x collapsed onto the same key.
    title: "Celular Xiaomi Redmi A3x 4g 64gb 3gb Ram Negro",
    id: "xiaomi-redmi-a3x-64gb",
    ramGb: 3,
  },
  {
    // "+" is Redmi A's recurring upgraded-variant suffix across generations (A1+, A2+).
    title: "Celular Xiaomi Redmi A3 Plus 4g 64gb 3gb Ram Negro",
    id: "xiaomi-redmi-a3-plus-64gb",
    ramGb: 3,
  },
  {
    // Redmi Note's "S" refresh (9S/10S/12S are all real, distinct SKUs across generations) glues
    // straight onto the number — the note regex had no suffix slot for it at all.
    title: "Xiaomi Redmi Note 12S 5g 128gb 8gb Ram Negro",
    id: "xiaomi-redmi-note-12s-128gb",
    ramGb: 8,
  },

  // --- Fix round 2 (re-review, "close the class not the instances"): the sweep in round 1 added
  // three specific suffixes but left the underlying gap open — any numbered family exposed to a
  // real suffix its own grammar doesn't know about still silently collapsed onto the base model's
  // key. Round 2 adds a structural guard (hasUnconsumedVariantMarker, in parseFamily) that fails
  // closed whenever a match is immediately followed by an unconsumed variant word, plus the three
  // real suffixes the reviewer named so those phones are identified rather than just nulled.
  { title: "Honor 400 Smart 256gb 8gb Ram Negro", id: "honor-400-smart-256gb", ramGb: 8 },
  // Same number, no suffix — must NOT collapse onto "400 Smart" above.
  { title: "Honor 400 256gb 8gb Ram Negro", id: "honor-400-256gb", ramGb: 8 },
  {
    title: "Celular Xiaomi Redmi A3 Pro 4g 64gb 3gb Ram Negro",
    id: "xiaomi-redmi-a3-pro-64gb",
    ramGb: 3,
  },
  {
    // "E32s" is a real refreshed variant of the E32, letter glued straight onto the digits (same
    // shape as "E22i" above) — lower-cased in the label like every other glued model letter.
    title: "Motorola Moto E32s 4g 64gb 3gb Ram Negro",
    id: "motorola-moto-e32s-64gb",
    ramGb: 3,
  },
  {
    // Connectivity words are not variants and must never trip the guard: "5G" immediately after a
    // resolved Samsung family is the radio, not a model suffix the parser failed to consume.
    title: "Samsung Galaxy A56 5G 256gb 8gb Ram Negro",
    id: "samsung-galaxy-a56-256gb",
    ramGb: 8,
  },
  {
    // Same connectivity guard, on a family whose own match already ends in a real, consumed suffix
    // ("Pro") — "4G" right after it must still pass.
    title: "Xiaomi Redmi Note 13 Pro 4G 256gb 8gb Ram Negro",
    id: "xiaomi-redmi-note-13-pro-256gb",
    ramGb: 8,
  },

  // --- Fix round 3 (Task 2 controller ruling, celulares fix round 1): a real phone with a free
  // accessory thrown in is still a phone. A live ML dry run measured 9 of 13 rejected titles as
  // exactly this shape ("+ Funda De Regalo", "+ Magsafe Case…") — the accessory-word exclusion was
  // firing on the BONUS item, not on the product actually being sold. Of those 9, these 5 also
  // state a storage figure and so become fully identified once the bundle clause stops being read
  // as part of the product; the other 4 (no storage at all, or the accessory word sits BEFORE the
  // gift clause) stay unidentified/excluded — see NULL_IDENTITY_TITLES and NOT_PHONE_TITLES below,
  // "nothing invented" applies here exactly as everywhere else in this module.
  {
    title: "Apple iPhone 17 Pro Max (256 Gb) - Nuevos + Funda De Regalo",
    id: "apple-iphone-17-pro-max-256gb",
  },
  {
    title: "iPhone 16 Pro 128 Gb + Magsafe Case Y Magsafe Wallet",
    id: "apple-iphone-16-pro-128gb",
  },
  {
    // The accessory word ("Case") sits FIVE words after "plus" ("Wallter Y Magsafe Case") — the
    // lookahead has to scan the rest of the tail, not just the next word or two, or this stays null.
    title: "iPhone 15 Pro (512 Gb) + Magsafe Wallter Y Magsafe Case",
    id: "apple-iphone-15-pro-512gb",
  },
  {
    title: "Samsung Galaxy S26 Ultra 5g (256 Gb) - Nuevos + Funda",
    id: "samsung-galaxy-s26-ultra-256gb",
  },
  {
    title: "Samsung Galaxy S26 Ultra 5g (256 Gb) - Sellados + Funda",
    id: "samsung-galaxy-s26-ultra-256gb",
  },
  {
    // Regression guard: a "+"/"plus" INSIDE the model name itself ("Pro+") must never be mistaken
    // for a bundle separator — it is already fully consumed by parseXiaomi's own "pro plus" suffix,
    // so it sits before the tail this fix-round's lookahead scans, and is untouched by it.
    title: "Redmi Note 14 Pro+ 5G 512gb",
    id: "xiaomi-redmi-note-14-pro-plus-512gb",
  },

  // --- Fix round 4 (Task 2 controller ruling, celulares fix round 2): the "double +" collision.
  // A model whose OWN "+" is immediately followed by the BUNDLE's "+" — "Redmi Note 14 Pro+ + Funda
  // de regalo 512gb" glues to "...pro plus plus funda de regalo 512gb", two adjacent "plus" tokens —
  // used to null the whole identity: the family regex's "pro plus" suffix consumes the FIRST "plus"
  // (the model's real one), so `match.end` lands right before the SECOND, and
  // hasUnconsumedVariantMarker read that second "plus" as an unrecognised suffix of the model
  // itself, same as it would "Redmi Note 14 Pro+ Ultra". The fix narrows that veto: "plus" only
  // still nulls the match when nothing later in the title actually names a giveaway.
  {
    title: "Redmi Note 14 Pro+ + Funda de regalo 512gb",
    id: "xiaomi-redmi-note-14-pro-plus-512gb",
  },
  {
    // Same collision, storage stated BEFORE the bundle instead of after — already worked even
    // before this fix-round (no adjacent "plus plus" here, "512gb" sits between them), kept as a
    // fixture so a future change to the bundle logic cannot silently break this shape either.
    title: "Redmi Note 14 Pro+ 512gb + Funda de regalo",
    id: "xiaomi-redmi-note-14-pro-plus-512gb",
  },
  {
    // Same collision on Samsung's OWN "+"-suffix suffix group (galaxy (s|a|m) — (ultra|plus|fe|edge)).
    title: "Samsung Galaxy S25+ + Funda de regalo 256gb",
    id: "samsung-galaxy-s25-plus-256gb",
  },
  {
    title: "Samsung Galaxy S25+ 256gb + Funda de regalo",
    id: "samsung-galaxy-s25-plus-256gb",
  },

  // --- Fix round 5 (Task 2 controller ruling, celulares fix round 2, item 2): "bateria"/"pantalla"
  // are the two words in the whole accessory list that are also genuine phone SPECS. Both real
  // orderings ("Pantalla 6.7 …" and "… 6.59 120 Hz Pantalla …", figure after or before the word)
  // must still identify — hasAccessoryWord checks both directions for exactly this reason.
  {
    title: "Samsung Galaxy A56 5g 256gb 8gb Ram Pantalla 6.7 Pulgadas Amoled",
    id: "samsung-galaxy-a56-256gb",
  },
  {
    title: "Samsung Galaxy A56 5g 256gb 8gb Ram Bateria 5000mah Negro",
    id: "samsung-galaxy-a56-256gb",
  },

  // --- Fix round 6 (Task 2 controller ruling, celulares fix round 3).
  {
    // Item 1: bare "tapa" briefly excluded this — a REAL, ordinary condition phrase ("still has its
    // original seal/film"), not a back-cover part listing. Narrowed to "tapa trasera"/"tapa de
    // bateria" (mirrors "camara trasera": bare "camara" isn't excluded either).
    title: "Samsung Galaxy S25 Ultra 512gb Nuevo Sellado Con Tapa",
    id: "samsung-galaxy-s25-ultra-512gb",
  },
  {
    // Item 2 (controller ruling, ACCEPTED as a bundle): an accessory word after "plus" with NO
    // explicit gift word ("regalo"/"incluye"/"obsequio") still counts as a bundle, not a case
    // listing — see the DECIDED note on accessoryCheckText for the reasoning and the trade-off.
    title: "Samsung Galaxy S25 256gb + Funda Silicona",
    id: "samsung-galaxy-s25-256gb",
  },
];

/** Titles that must resolve to a specific PhoneCondition. Two-arg calls use "unknown" as the source. */
export const CONDITION_FIXTURES: Array<{ title: string; source: "new" | "refurbished" | "used" | "unknown"; expected: PhoneCondition }> = [
  { title: "Apple iPhone 14 Pro (256 GB) - Morado oscuro (Nuevo con caja abierta)", source: "unknown", expected: "open-box" },
  { title: "Apple Iphone 15 128 Gb Rosa - Excelente (Reacondicionado)", source: "unknown", expected: "refurbished" },
  { title: "celular-apple-iphone-12-128gb-4gb-black-cpo", source: "unknown", expected: "refurbished" },
  { title: "Celular Samsung Galaxy A56 5g Como Nuevo", source: "unknown", expected: "used" },
];

/**
 * Titles where brand detection succeeds but identifyPhone must still return null.
 * - A56: no storage figure anywhere in the title.
 * - "Redmi A5 … 64 mp": a real bug the reviewer caught — the bare-number storage branch (added for
 *   "6gb+256", see the X7e fixture above) also accepted "64" here purely because it sat right
 *   after a gb-labelled number, with no check on what followed. "64" is a camera megapixel count,
 *   not gigabytes, and there is no actual storage figure in this title at all.
 * - The last three (round 2): a made-up, plausible-looking variant word right after an otherwise
 *   valid family match, on three different brands' parsers — "Neo"/"Fusion"/"Smart Max" are none
 *   of them real for THAT particular family, but the point of hasUnconsumedVariantMarker is that it
 *   doesn't need to know that: it fails closed on ANY unconsumed marker from the shared list, real
 *   or not, because a parser has no way to distinguish "a real variant I don't know" from "not a
 *   real variant at all" — both look identical (an unconsumed word from the marker list).
 */
export const NULL_IDENTITY_TITLES = [
  "Celular Samsung Galaxy A56 5g Como Nuevo",
  "Xiaomi Redmi A5 8gb 64 mp Camara Azul",
  "Samsung Galaxy A56 Neo 256gb 8gb Ram Negro",
  "Motorola Moto G85 Fusion 256gb 8gb Ram Negro",
  "Honor 200 Smart Max 256gb 8gb Ram Negro",
  // Fix round 3: three of the nine real "+ Funda/Caja Abierta + Funda De Regalo" ML titles that
  // moved OFF the accessory-word exclusion still resolve to null — not a bug, "nothing invented":
  // none of the three states a storage figure anywhere, gift clause or not, so isPhoneTitle now
  // correctly says "this is a phone" while identifyPhone still correctly refuses to guess a size.
  "Apple iPhone 16 Pro  - Caja Abierta + Funda De Regalo",
  "iPhone 16 Pro Max  - Caja Abierta + Funda De Regalo",
  "Samsung Galaxy S26 Ultra - Caja Abierta + Funda De Regalo",
  // Fix round 4 regression guard: the narrowed "plus" veto in hasUnconsumedVariantMarker must still
  // fail closed on a GENUINE unknown suffix after the model's own "+" — "Ultra" names no giveaway
  // anywhere in the title, so this is not a bundle and must still null exactly like "Pro+ Ultra"
  // would without the "+ Funda de regalo" fixtures right above it.
  "Redmi Note 14 Pro+ Ultra 512gb",
];

/** Accessories, clones, unlisted brands and other non-phone-model titles: isPhoneTitle must be false. */
export const NOT_PHONE_TITLES: string[] = [
  "Celular B17 Pro Max 4gb 128gb Desbloqueo Facial Dual Sim",
  "Fuffi S26 Pro Curved-screen Smartphone 16+512gb,mobile Phone",
  "Celular Logic Z8l Con Tapita",
  "Celular Vortex Zg55 3/32gb",
  "Protector Prodigee Kickit iPhone 17 Pro Max",
  "Funda iPhone 17 Pro Magsafe",
  "Vidrio templado Samsung Galaxy A56",
  "Cargador Samsung 25W",
  "Galaxy Watch 8",
  "samsung galaxy tab s10 ultra 256 gb",
  "Galaxy Buds4 Pro",
  "Monopatín eléctrico Xiaomi Electric Scooter 5",
  "Aspiradora Xiaomi Mi Robot Vacuum",
  "Notebook Samsung Galaxy Book 4 512gb",
  "Control para iPhone Razer Kishi",
  "Apple iPad Air 256GB",
  "Motorola Moto Buds",
  // Fix round 3: the accessory-word exclusion only stops looking AFTER a bundle marker ("+ Funda de
  // regalo") that follows the phone's own identity — an accessory word BEFORE the identity, or
  // before the gift clause even starts, still excludes the title, same as always.
  "Funda iPhone 17 Pro",
  "Cargador para Samsung Galaxy A56",
  // The accessory word sits in the text BEFORE the "+" here ("Vidrio templado"), not after it — the
  // fix only ever drops text AFTER a bundle marker, never text that came before one.
  "Vidrio templado + Funda iPhone 16",
  // A real ML title (measured in the dry run) that looks like the other 8 gift-bundle titles above
  // but stays excluded: "Con Fundas De Regalo" puts the accessory word ("Fundas") BEFORE "De
  // Regalo" — the bundle marker this fix-round looks for — so it is still inside the checked
  // region and the title still fails the accessory-word test, correctly.
  "Iphone 17 Pro Max En Caja, Con Fundas De Regalo. 80 Mil.",

  // --- Fix round 5 (item 2): replacement-part listings. "Bateria"/"pantalla" standing alone (no
  // spec figure right next to them) name the PART being sold, not the phone; "flex", "placa",
  // "pin de carga", "housing" and "chasis" never double as a phone spec at all, so those are
  // unconditional. "tapa"/"camara" are narrower — see fix round 6 below — only the compound
  // "tapa trasera"/"tapa de bateria"/"camara trasera" phrases exclude, never the bare word. The
  // exact reported bug is first: a real battery listing that used to resolve to
  // samsung-galaxy-s24-ultra-128gb.
  "Bateria Original Samsung S24 Ultra 128gb Compatible + Instalacion",
  "Pantalla iPhone 15 Pro Oled Repuesto",
  "Flex De Carga Para iPhone 13",
  "Tapa Trasera Samsung Galaxy A56",
  "Placa Madre iPhone 12 128gb",
  "Camara Trasera Para Samsung Galaxy S23",
  "Pin De Carga iPhone 11",
  "Housing Completo iPhone 14 Pro",
  "Chasis iPhone 13 Pro Max",

  // --- Fix round 6 (item 1): "tapa trasera" again, the coordinator's own exact fixture — kept
  // alongside "Tapa Trasera Samsung Galaxy A56" above rather than replacing it, since the two cover
  // different brands' family parsers.
  "Tapa Trasera iPhone 15 Pro 256gb",
];
