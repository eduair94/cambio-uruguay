// Real MercadoLibre/store titles (captured 2026-09-16) used to pin down classes/phones/identify.ts.
// Every title here is verbatim from the task brief — do not "clean up" the spelling/punctuation,
// the whole point is that the identifier has to survive how these titles are actually written.
import type { PhoneCondition } from "../../../classes/phones/types";

export interface IdentifyFixture {
  title: string;
  key: string;
  esimOnly?: boolean;
  ramGb?: number | null;
}

export const IDENTIFY_FIXTURES: IdentifyFixture[] = [
  { title: "Apple iPhone 17 Pro (256 GB) - Azul profundo", key: "apple-iphone-17-pro-256gb", esimOnly: false },
  { title: "Apple iPhone 17 Pro (512 GB) - Azul profundo - Sólo eSIM", key: "apple-iphone-17-pro-512gb", esimOnly: true },
  { title: "Apple iPhone 17 Pro 256gb ( Solo Esim )silver Plateado", key: "apple-iphone-17-pro-256gb", esimOnly: true },
  { title: "Iphone 17 Pro Max 6,9'' 5g 12gb 256gb Triple Cam 48mp", key: "apple-iphone-17-pro-max-256gb", ramGb: 12 },
  { title: "Apple iPhone 17 Esim 256gb - Blanco Verde Musgo", key: "apple-iphone-17-256gb", esimOnly: true },
  { title: "Apple iPhone 16e (128 Gb) - Blanco", key: "apple-iphone-16e-128gb" },
  { title: "Apple iPhone 15 Plus (128 GB - 6 GB RAM) - Negro", key: "apple-iphone-15-plus-128gb", ramGb: 6 },
  { title: "Apple iPhone 14 Pro (256 GB) - Morado oscuro (Nuevo con caja abierta)", key: "apple-iphone-14-pro-256gb" },
  { title: "Apple Iphone 15 128 Gb Rosa - Excelente (Reacondicionado)", key: "apple-iphone-15-128gb" },
  {
    title: "celular-apple-iphone-12-128gb-4gb-black-cpo",
    key: "apple-iphone-12-128gb",
  },
  { title: "Cel Samsung Galaxy S26 6,3'' 5g 12gb 256gb - Tecnobox", key: "samsung-galaxy-s26-256gb" },
  { title: "Celular Samsung Galaxy S26 Plus 5g 12 Gb 512 Gb Azul", key: "samsung-galaxy-s26-plus-512gb" },
  { title: "Celular Samsung Galaxy S26 Ultra 512gb Violeta 5g Nnet", key: "samsung-galaxy-s26-ultra-512gb" },
  { title: "samsung galaxy s26 fe 5g 128gb pistachio", key: "samsung-galaxy-s26-fe-128gb" },
  { title: "Celular Samsung Galaxy A17 8/256gb Dual Sim", key: "samsung-galaxy-a17-256gb", ramGb: 8 },
  { title: "Celular Samsung Galaxy A36 5g 256gb Black", key: "samsung-galaxy-a36-256gb" },
  { title: "Celular Moto Edge 70 Fusion 8+256gb Azul Azul", key: "motorola-edge-70-fusion-256gb", ramGb: 8 },
  {
    title: "Motorola Edge 70 Pro 5g 512gb 12gb+12gb Ram + Regalo Dimm",
    key: "motorola-edge-70-pro-512gb",
    ramGb: 12,
  },
  { title: "Motorola G17 4gb + 8gb Ram 256gb 4g Fhd + Regalo Dimm", key: "motorola-moto-g17-256gb", ramGb: 4 },
  {
    title: "Motorola Moto G17 Power 4g, 256 Gb, 8gb De Ram Expandible 24gb",
    key: "motorola-moto-g17-power-256gb",
    ramGb: 8,
  },
  { title: "Moto G06 256 Dual SIM 256 GB verde 4 GB RAM", key: "motorola-moto-g06-256gb" },
  { title: "celular motorola razr 70 ultra 1tb", key: "motorola-razr-70-ultra-1tb" },
  { title: "Celular Xiaomi Redmi Note 15 Pro+ 5g 256gb 8gb Black", key: "xiaomi-redmi-note-15-pro-plus-256gb" },
  {
    title: "Celular Xiaomi Redmi Note 15 256gb 8gb Ram 2026 Azul",
    key: "xiaomi-redmi-note-15-256gb",
  },
  {
    title: "Celular Xiaomi Poco X8 Pro Max Dual Sim 5g 12 Gb RAM 512 Gb Negro",
    key: "xiaomi-poco-x8-pro-max-512gb",
  },
  {
    title: "Celular Xiaomi Poco M8 Pro 5g 8gb Ram 256gb Rom 6.83 Amoled Dual Sim Black",
    key: "xiaomi-poco-m8-pro-256gb",
  },
  {
    title: "Celular Xiaomi Redmi 15c 4g 256gb 8gb Ram +8gb Virtual Verde Menta",
    key: "xiaomi-redmi-15c-256gb",
    ramGb: 8,
  },
  { title: "Honor Magic 8 Lite 8gb Ram 256gb 108mpx 5g + Regalo Dimm", key: "honor-magic-8-lite-256gb" },
  { title: "Celular Honor Magic8 Lite 8gb+256gb Dual Sim Verde Bosque", key: "honor-magic-8-lite-256gb" },
  { title: "HONOR X7e / 4G 256GB 12GB (6+6) RAM / 7500mAh", key: "honor-x7e-256gb", ramGb: 6 },
  { title: "Honor X5c Plus 4gb + 4gb Ram 256gb 50mpx 90hz Dimm", key: "honor-x5c-plus-256gb" },

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
    key: "xiaomi-17-t-512gb",
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
    key: "honor-magic-8-lite-256gb",
  },
  {
    // "Moto G Max"/"Moto G Stylus" carry no model number at all (the US/LatAm naming, as opposed
    // to the numbered global one) — a gap the brief's own `g(\d{2})` regex can't reach.
    title: "Motorola Moto G Max 5g, 256 GB, 8GB Expande 24GB con Ram Boost, cámara de 200 MP, pantalla Extreme Amoled de 1,5K. Ip69 Sumergible",
    key: "motorola-moto-g-max-256gb",
  },
  {
    // Real storefronts drop "Galaxy" from the title entirely ("Samsung S26 Ultra…"); once the
    // brand is already known to be Samsung, a bare letter+number is unambiguous enough on its own.
    title: "Samsung S26 Ultra 5g 12gb 512gb Original Libre Dimm",
    key: "samsung-galaxy-s26-ultra-512gb",
    ramGb: 12,
  },
  {
    // Poco's own naming glues a trailing letter straight onto the digits ("M8s") with no space —
    // the same letter-onto-digit shape that broke "Moto G06" (see the brand-detection fix above),
    // just in the family regex instead of brand detection.
    title: "Celular Xiaomi Poco M8s 5g 8gb Ram 256gb Rom Dual Sim Fhd+ 6.9 Pulgadas Snapdragon 6s Gen 3 Black",
    key: "xiaomi-poco-m8s-256gb",
    ramGb: 8,
  },
  {
    // Seller dropped "Redmi" from the title ("Xiaomi Note 15 Pro…") and typoed it elsewhere
    // ("Redm Note" — missing the final "i"); both are the same Redmi Note line.
    title: "Xiaomi Redm Note 15 Pro 8gb Ram 256gb Rom 4g Lte 200mpx Gris Titanio",
    key: "xiaomi-redmi-note-15-pro-256gb",
    ramGb: 8,
  },
  {
    // Generic (non-brief) family fallback for Oppo/Realme/TCL/ZTE/Nokia/Infinix/Tecno: the title
    // repeats both the brand word and a bare category letter ("Oppo Oppo A A79") before the real
    // model code — the fallback must skip past both and land on "a79", not stop at the bare "a".
    title: "Oppo Oppo A A79 Dual SIM 256 GB violeta 8 GB RAM",
    key: "oppo-a79-256gb",
    ramGb: 8,
  },
];

/** Titles that must resolve to a specific PhoneCondition. Two-arg calls use "unknown" as the source. */
export const CONDITION_FIXTURES: Array<{ title: string; source: "new" | "refurbished" | "used" | "unknown"; expected: PhoneCondition }> = [
  { title: "Apple iPhone 14 Pro (256 GB) - Morado oscuro (Nuevo con caja abierta)", source: "unknown", expected: "open-box" },
  { title: "Apple Iphone 15 128 Gb Rosa - Excelente (Reacondicionado)", source: "unknown", expected: "refurbished" },
  { title: "celular-apple-iphone-12-128gb-4gb-black-cpo", source: "unknown", expected: "refurbished" },
  { title: "Celular Samsung Galaxy A56 5g Como Nuevo", source: "unknown", expected: "used" },
];

/** A56 with no storage figure at all: brand + family resolve, but identifyPhone must still be null. */
export const NO_STORAGE_TITLE = "Celular Samsung Galaxy A56 5g Como Nuevo";

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
];
