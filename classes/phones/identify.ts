// Turning a listing title (MercadoLibre or a Uruguayan storefront) into a phone identity: brand,
// family (model line) and storage. This module never fetches anything and never guesses past what
// the title actually says — recall is sacrificed for precision on purpose (see task brief): a
// title we can't confidently parse returns null instead of a half-right guess, because everything
// downstream (catalogue merge, price comparison) keys off `identity.key`.
import type { PhoneBrand, PhoneCondition, PhoneIdentity } from "./types";

// ---------------------------------------------------------------------------------------------
// Normalisation
// ---------------------------------------------------------------------------------------------

/**
 * Lower case, accent-free, "+" spelled out as " plus " (so "S26+" and "Redmi Note 15 Pro+" line up
 * with the space-separated suffixes every other family uses), everything else that isn't a letter
 * or digit collapsed to a single space. This is the shared surface every regex below matches
 * against — Uruguayan titles spell the same phone "Redmi Note 15 Pro+", "REDMI NOTE 15 PRO +" and
 * "redmi-note-15-pro-plus" (a slug built from a store URL) and a case/accent-sensitive match would
 * silently miss two of those three.
 */
export function phoneNorm(title: string): string {
  return title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\+/g, " plus ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * "128 GB" and "128GB" are the same fact spelled two ways. Gluing the unit onto the number right
 * after normalising means every regex and every word-array check below only has to handle ONE
 * shape ("128gb"), instead of every storage/RAM rule needing its own optional-space variant.
 */
function glueUnits(norm: string): string {
  return norm.replace(/(\d{1,4})\s+(gb|tb)\b/g, "$1$2");
}

// ---------------------------------------------------------------------------------------------
// Brand + accessory/clone/tablet/watch exclusion
// ---------------------------------------------------------------------------------------------

const BRAND_LABELS: Record<PhoneBrand, string> = {
  apple: "Apple",
  samsung: "Samsung",
  motorola: "Motorola",
  xiaomi: "Xiaomi",
  honor: "Honor",
  oppo: "Oppo",
  realme: "Realme",
  tcl: "TCL",
  zte: "ZTE",
  nokia: "Nokia",
  infinix: "Infinix",
  tecno: "Tecno",
};

// Order matters only in the sense that the first brand whose tokens appear wins; in practice a
// title only ever carries tokens for one brand, so collisions are not a real-world concern.
const BRAND_RULES: Array<{ brand: PhoneBrand; test: RegExp }> = [
  { brand: "apple", test: /\b(iphone|apple)\b/ },
  { brand: "samsung", test: /\b(samsung|galaxy)\b/ },
  // "moto" alone is checked as a whole word rather than "moto g"/"moto e"/"moto edge" with a
  // trailing \b: real titles glue the model straight onto the letter ("Moto G06", "Moto E22"),
  // and a digit right after "g" is not a word boundary, so the brief's literal three-token form
  // would miss exactly the titles it exists to catch.
  { brand: "motorola", test: /\b(motorola|moto|razr)\b|\bedge\s?\d{2}\b/ },
  { brand: "xiaomi", test: /\b(xiaomi|redmi|poco)\b/ },
  { brand: "honor", test: /\bhonor\b/ },
  { brand: "oppo", test: /\boppo\b/ },
  { brand: "realme", test: /\brealme\b/ },
  { brand: "tcl", test: /\btcl\b/ },
  { brand: "zte", test: /\bzte\b/ },
  { brand: "nokia", test: /\bnokia\b/ },
  { brand: "infinix", test: /\binfinix\b/ },
  { brand: "tecno", test: /\btecno\b/ },
];

// Accessories/clones/tablets/wearables that happen to mention a phone brand ("Funda iPhone 17
// Pro", "Galaxy Watch 8", "Apple iPad Air"). Checked BEFORE brand detection matters less than
// checked at all: a title that matches this is never a phone listing regardless of which brand
// word it also contains. Most entries tolerate a trailing "s" (plural); "tab" and "book" are kept
// as their own exact-word group so they don't casually swallow unrelated words.
const ACCESSORY_PLURAL_TOLERANT = [
  "funda",
  "case",
  "protector",
  "vidrio",
  "templado",
  "film",
  "lamina",
  "cargador",
  "cable",
  "adaptador",
  "soporte",
  "auricular(?:es)?",
  "buds\\d*",
  "watch",
  "reloj",
  "smartwatch",
  "banda",
  "band",
  "tablet",
  "ipad",
  "notebook",
  "monopatin",
  "scooter",
  "aspiradora",
  "robot",
  "repuesto",
  "display",
  "pantalla de repuesto",
  "modulo",
  "bateria para",
  "carcasa",
  "estuche",
  "correa",
  "airpods",
  "router",
  "parlante",
  "power ?bank",
  "kit",
  "skin",
  "control",
  "joystick",
  "lente",
  "camara para",
  "camara trasera",
  "holder",
  "popsocket",
  "tv",
  "stick",
  // Repair-part words with no legitimate use naming a PHONE's own spec — nobody advertises a
  // handset by saying it comes with a "flex", a "housing" or a "chasis". "placa" (board) is the
  // same class: no real listing says a working phone "tiene placa", only a repair one selling the
  // board itself. Checked and kept bare on purpose — none of these four collides with an ordinary
  // condition/spec phrase the way "tapa" below did. "bateria"/"pantalla" are NOT here: those two
  // really are used both ways ("Batería 5000mah" is a spec, "Bateria Original Samsung S24…" is the
  // product being sold) and get their own position-sensitive check in {@link hasAccessoryWord}
  // instead.
  "flex",
  "placa",
  "housing",
  "chasis",
  "pin de carga",
  // Bare "tapa" is NOT safe the way the four above are: "Samsung Galaxy S25 Ultra 512gb Nuevo
  // Sellado Con Tapa" is a real, ordinary condition phrase — "con tapa" means the phone still has
  // its original protective film/seal, not that a back-cover PART is being sold. Only the
  // compound phrases a real back-cover/battery-door listing actually uses are excluded, mirroring
  // "camara trasera" above (bare "camara" is not excluded either, for the same reason).
  "tapa trasera",
  "tapa de bateria",
];
const ACCESSORY_EXACT_WORDS = ["tab", "book"];
const ACCESSORY_RE = new RegExp(
  `\\b(?:${ACCESSORY_PLURAL_TOLERANT.join("|")})s?\\b|\\b(?:${ACCESSORY_EXACT_WORDS.join("|")})\\b`,
);

// "bateria"/"pantalla" (accents already stripped by phoneNorm) are the two words in this whole
// exclusion list that are used BOTH ways in real titles: "Batería 5000mah"/"Pantalla 6.7 Pulgadas"
// AND "6500 mAh Batería Azul"/"6.59 120 Hz Pantalla…" (the figure can sit on EITHER side — both
// orders are real, see the fixtures) are ordinary phone SPECS, while "Bateria Original Samsung S24
// Ultra… + Instalacion" and "Pantalla iPhone 15 Pro Oled Repuesto" are REPLACEMENT-PART listings —
// same word, opposite meaning. Every other word in ACCESSORY_PLURAL_TOLERANT names something that
// is NEVER a phone's own spec ("flex", "housing"), so only these two need a second signal.
//
// The two directions are deliberately asymmetric, not just mirrored:
//   - FORWARD only counts a figure sitting RIGHT NEXT to the word ("bateria 5000mah", "pantalla de
//     6.7"). A part listing's own words right after ("Bateria Original SAMSUNG S24 Ultra…") contain
//     a digit too — the model number — just not immediately: there is always a brand/"original"/
//     "compatible" word first. Widening this to "any digit in the next few words" would read every
//     "Bateria … S24 …" listing as a spec because S24 is nearby, exactly the bug this exists to fix.
//   - BACKWARD tolerates a wider window ("6.59 120 Hz Pantalla", "6500 mAh Batería Azul": the unit
//     word sits directly before, the number itself one more word back). Real part listings put the
//     word FIRST ("Bateria Original…", "Pantalla iPhone 15…"), never after the brand/model, so there
//     is normally nothing at all before it — a preceding model number is not a realistic listing
//     shape the way a following one is, so the wider window does not reopen the S24 case.
const AMBIGUOUS_PART_WORDS = new Set(["bateria", "pantalla"]);
const SPEC_FOLLOWS_RE = /^(?:de\s+)?\d/;
const SPEC_PRECEDES_RE = /\d/;

/**
 * The single accessory/part check every exclusion path in this module goes through — replaces a
 * bare `ACCESSORY_RE.test(text)` wherever that used to be the whole check, so "bateria"/"pantalla"
 * get their position-sensitive treatment everywhere an accessory word matters (the main exclusion
 * in {@link isPhoneTitle}, and the bundle-marker lookahead in {@link accessoryCheckText} and
 * {@link hasUnconsumedVariantMarker}), not just in one of them.
 */
function hasAccessoryWord(text: string): boolean {
  if (ACCESSORY_RE.test(text)) return true;
  const words = text.trim().split(/\s+/).filter(Boolean);
  for (let i = 0; i < words.length; i++) {
    if (!AMBIGUOUS_PART_WORDS.has(words[i]!)) continue;
    const after = words.slice(i + 1, i + 3).join(" ");
    const before = words.slice(Math.max(0, i - 3), i).join(" ");
    if (SPEC_FOLLOWS_RE.test(after) || SPEC_PRECEDES_RE.test(before)) continue;
    return true;
  }
  return false;
}

function detectBrand(glued: string): PhoneBrand | null {
  for (const rule of BRAND_RULES) {
    if (rule.test.test(glued)) return rule.brand;
  }
  return null;
}

// ---------------------------------------------------------------------------------------------
// Bundled extras ("+ Funda de regalo", "+ Magsafe Case", "incluye cargador") — a real phone with a
// free accessory thrown in is still a phone. Real ML titles do this constantly ("iPhone 17 Pro Max
// (256 Gb) - Nuevos + Funda De Regalo" is a genuine, fully-specified phone listing, not a case
// listing), and blocking every title that so much as MENTIONS an accessory word anywhere punished
// exactly the sellers who described their bonus item — 9 of 13 real titles rejected in one ML dry
// run were phones like this. So the accessory exclusion only ever looks at the title BEFORE a
// bundle marker, never after it.
// ---------------------------------------------------------------------------------------------

/** Nouns that name a freebie without themselves being one of the accessory-product words above. */
const GIFT_WORD_RE = /\b(?:regalo|obsequio)\b/;

/**
 * Phrases that open a bundle clause on their own, no "+"/"plus" needed at all ("... incluye
 * funda", "... con regalo cargador"). "de regalo"/"con regalo" are the two spellings real listings
 * use interchangeably for "thrown in as a gift".
 */
const BUNDLE_CLAUSE_RE = /\b(?:con regalo|de regalo|incluye|obsequio)\b/;

/**
 * What to run {@link ACCESSORY_RE} against: `glued` unchanged, unless a BUNDLE marker sits after
 * `familyEnd` (the end of the already-located phone identity), in which case only the text before
 * that marker — the actual product being priced — counts.
 *
 * `familyEnd` is null whenever no family grammar matched at all (an unparseable title, or one
 * `hasUnconsumedVariantMarker` already rejected): with no known identity boundary there is nothing
 * safe to truncate, so the accessory check falls back to the WHOLE title, exactly as before this
 * bundle handling existed.
 *
 * Two things must NOT be mistaken for a bundle marker, and both are handled by only ever searching
 * `glued.slice(familyEnd)` — text that already sits at or after the end of the phone's own name:
 *   - A "+" INSIDE the model name itself ("Redmi Note 14 Pro+", "Galaxy S25+"): `phoneNorm` turns
 *     "+" into the word "plus" before any of this runs, and the family parsers for Xiaomi/Samsung
 *     already consume that "plus" as part of their own suffix group ("pro plus", "...(ultra|plus|
 *     fe|edge)"), so it sits BEFORE `familyEnd`, never in the tail this function scans.
 *   - A "+" inside a spec combo ("8gb+256gb", "12gb+12gb Ram"): also normalises to a bare "plus"
 *     between two number tokens. A standalone "plus" only counts as a bundle when an accessory
 *     word or "regalo"/"obsequio" turns up SOMEWHERE later in the tail — "8gb plus 256gb azul"
 *     never finds one, so the spec combo is left alone and `extractStorageGb`/`extractRamGb`
 *     (further down) still see the full, untruncated title exactly as before this existed.
 *
 * DECIDED (controller ruling): an accessory word after "plus" counts as a bundle even with NO
 * explicit gift word ("regalo"/"obsequio"/"incluye") anywhere — "Samsung Galaxy S25 256gb + Funda
 * Silicona" is read as a phone bundled with a case, not a case listing, on purpose. A storage figure
 * ALREADY found before the "+" is itself strong evidence this is a phone listing (a case/funda
 * listing has no reason to state a phone's storage capacity), and real bundles routinely drop the
 * word "regalo" entirely ("Samsung Galaxy S26 Ultra 5g (256 Gb) - Nuevos + Funda", measured in a
 * live ML dry run). The trade-off this accepts: a genuine funda-only listing that happens to name a
 * phone AND its storage right before a "+ [accessory]" would also slip through — but that shape does
 * not occur in observed listings, and if one ever does, the catalogue's own price guard (Task 3) is
 * the backstop: a funda's price does not belong anywhere near a phone's price band for that model,
 * so it gets caught there, not here.
 */
function accessoryCheckText(glued: string, familyEnd: number | null): string {
  if (familyEnd === null) return glued;
  const head = glued.slice(0, familyEnd);
  const tailWords = glued
    .slice(familyEnd)
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  for (let i = 0; i < tailWords.length; i++) {
    if (tailWords[i] !== "plus") continue;
    // The rest of the tail, unbounded — not just the next word or two. Real titles bundle several
    // items after one "+" ("+ Magsafe Wallter Y Magsafe Case": the accessory word is five words
    // after "plus", past "Wallter" and "Y"), and once ANY accessory/gift word turns up anywhere
    // after this "plus" the whole rest of the title is bundle text, whichever word tripped it.
    const rest = tailWords.slice(i + 1).join(" ");
    if (hasAccessoryWord(rest) || GIFT_WORD_RE.test(rest)) {
      return `${head} ${tailWords.slice(0, i).join(" ")}`.trim();
    }
  }

  const tailJoined = tailWords.join(" ");
  const clause = BUNDLE_CLAUSE_RE.exec(tailJoined);
  if (clause) return `${head} ${tailJoined.slice(0, clause.index)}`.trim();

  return glued;
}

export function isPhoneTitle(title: string): boolean {
  const glued = glueUnits(phoneNorm(title));
  const brand = detectBrand(glued);
  if (!brand) return false;
  const familyMatch = parseFamily(brand, glued);
  const checkText = accessoryCheckText(glued, familyMatch?.end ?? null);
  return !hasAccessoryWord(checkText);
}

// ---------------------------------------------------------------------------------------------
// Family parsing — one function per brand, each returning the matched span so storage/RAM
// extraction can blank it out (a model number like the "17" in "iPhone 17" must never leak into
// the storage/RAM scan, or "iPhone 17 256GB" would misread "17" as a RAM candidate glued to the
// "256gb" that follows it).
// ---------------------------------------------------------------------------------------------

interface FamilyMatch {
  family: string;
  familyLabel: string;
  start: number;
  end: number;
}

function titleCaseWord(word: string): string {
  return word.length ? word[0]!.toUpperCase() + word.slice(1) : word;
}

function parseApple(glued: string): FamilyMatch | null {
  const numbered = /\biphone\s+(\d{1,2})(e)?(?:\s+(plus|pro max|pro|mini|air))?\b/.exec(glued);
  if (numbered) {
    const [full, num, eSuffix, tail] = numbered;
    const base = `${num}${eSuffix ?? ""}`;
    const family = tail ? `iphone-${base}-${tail.replace(/\s+/g, "-")}` : `iphone-${base}`;
    const tailLabel: Record<string, string> = {
      plus: "Plus",
      "pro max": "Pro Max",
      pro: "Pro",
      mini: "Mini",
      air: "Air",
    };
    const familyLabel = tail ? `iPhone ${base} ${tailLabel[tail]}` : `iPhone ${base}`;
    return { family, familyLabel, start: numbered.index, end: numbered.index + full.length };
  }
  const special = /\biphone\s+(air|duo)\b/.exec(glued);
  if (special) {
    const [full, word] = special;
    return {
      family: `iphone-${word}`,
      familyLabel: `iPhone ${titleCaseWord(word!)}`,
      start: special.index,
      end: special.index + full.length,
    };
  }
  return null;
}

const SAMSUNG_LETTER_SLUG: Record<string, string> = { s: "s", a: "a", m: "m", "z flip": "z-flip", "z fold": "z-fold" };
const SAMSUNG_LETTER_LABEL: Record<string, string> = { s: "S", a: "A", m: "M", "z flip": "Z Flip", "z fold": "Z Fold" };
const SAMSUNG_SUFFIX_LABEL: Record<string, string> = { ultra: "Ultra", plus: "Plus", fe: "FE", edge: "Edge" };

function parseSamsung(glued: string): FamilyMatch | null {
  const withGalaxy = /\bgalaxy\s+(s|a|m|z flip|z fold)\s?(\d{1,2})(?:\s?(ultra|plus|fe|edge))?\b/.exec(glued);
  // Several real ML titles drop "Galaxy" entirely ("Samsung S26 Plus…", "Samsung A17 8gb Ram…") —
  // once the brand itself is already known to be Samsung, a bare letter+number is unambiguous
  // enough (s/a/m only; z-fold/z-flip need the word "galaxy" to disambiguate from stray letters).
  const m = withGalaxy ?? /\b(s|a|m)(\d{2,3})(?:\s?(ultra|plus|fe|edge))?\b/.exec(glued);
  if (!m) return null;
  const [full, letter, num, suffix] = m;
  const letterSlug = SAMSUNG_LETTER_SLUG[letter!]!;
  const base = `galaxy-${letterSlug}${num}`;
  const family = suffix ? `${base}-${suffix}` : base;
  const label = `Galaxy ${SAMSUNG_LETTER_LABEL[letter!]}${num}${suffix ? ` ${SAMSUNG_SUFFIX_LABEL[suffix]}` : ""}`;
  return { family, familyLabel: label, start: m.index, end: m.index + full.length };
}

const MOTO_G_SUFFIX_LABEL: Record<string, string> = { power: "Power", stylus: "Stylus", play: "Play" };
const EDGE_SUFFIX_LABEL: Record<string, string> = { fusion: "Fusion", pro: "Pro", ultra: "Ultra", neo: "Neo" };
const RAZR_SUFFIX_LABEL: Record<string, string> = { ultra: "Ultra", plus: "Plus" };

function parseMotorola(glued: string): FamilyMatch | null {
  const razrFold = /\brazr\s+fold\b/.exec(glued);
  if (razrFold) {
    return { family: "razr-fold", familyLabel: "Razr Fold", start: razrFold.index, end: razrFold.index + razrFold[0].length };
  }
  const razr = /\brazr\s+(\d{2})(?:\s+(ultra|plus))?\b/.exec(glued);
  if (razr) {
    const [full, num, suffix] = razr;
    return {
      family: suffix ? `razr-${num}-${suffix}` : `razr-${num}`,
      familyLabel: `Razr ${num}${suffix ? ` ${RAZR_SUFFIX_LABEL[suffix]}` : ""}`,
      start: razr.index,
      end: razr.index + full.length,
    };
  }
  const edge = /\bedge\s+(\d{2})(?:\s+(fusion|pro|ultra|neo))?\b/.exec(glued);
  if (edge) {
    const [full, num, suffix] = edge;
    return {
      family: suffix ? `edge-${num}-${suffix}` : `edge-${num}`,
      familyLabel: `Edge ${num}${suffix ? ` ${EDGE_SUFFIX_LABEL[suffix]}` : ""}`,
      start: edge.index,
      end: edge.index + full.length,
    };
  }
  const motoG = /\b(?:moto )?g(\d{2})(?:\s+(power|stylus|play))?\b/.exec(glued);
  if (motoG) {
    const [full, num, suffix] = motoG;
    return {
      family: suffix ? `moto-g${num}-${suffix}` : `moto-g${num}`,
      familyLabel: `Moto G${num}${suffix ? ` ${MOTO_G_SUFFIX_LABEL[suffix]}` : ""}`,
      start: motoG.index,
      end: motoG.index + full.length,
    };
  }
  // A handful of G-series names carry no number at all ("Moto G Max", "Moto G Stylus") — the
  // regional US/LatAm naming instead of the numbered global one. Real ML titles use both.
  const bareG = /\bg\s+(max|stylus|power|play)\b/.exec(glued);
  if (bareG) {
    const [full, suffix] = bareG;
    return {
      family: `moto-g-${suffix}`,
      familyLabel: `Moto G ${titleCaseWord(suffix!)}`,
      start: bareG.index,
      end: bareG.index + full.length,
    };
  }
  // Motorola's other budget line, alongside G: E13/E14/E15/E22/E32… "moto" is required here (unlike
  // the bare "g\d{2}" above) because a lone letter "e" is far more likely to appear by coincidence
  // once storage/spec words are in play. "E22i" is a real, cheaper regional variant of the E22, and
  // "E32s" a real refreshed one — both glue the letter directly onto the number, no space, and both
  // stay lower-case in the label (same convention as "iPhone 16e"/"Honor X7e").
  const motoE = /\bmoto\s?e(\d{1,2})(i|s)?(?:\s+(plus|power))?\b/.exec(glued);
  if (motoE) {
    const [full, num, letterSuffix, suffix] = motoE;
    const base = `${num}${letterSuffix ?? ""}`;
    return {
      family: suffix ? `moto-e${base}-${suffix}` : `moto-e${base}`,
      familyLabel: `Moto E${base}${suffix ? ` ${titleCaseWord(suffix)}` : ""}`,
      start: motoE.index,
      end: motoE.index + full.length,
    };
  }
  return null;
}

function parseXiaomi(glued: string): FamilyMatch | null {
  // The "redmi "/"redm " prefix is optional: several real titles just say "Xiaomi Note 15…" (the
  // seller dropped "Redmi"), and "Xiaomi Redm Note 15…" is a plain typo (missing the final "i") —
  // both are the same Redmi Note line, and the brand word "xiaomi" is already confirmed by then.
  // "s" is glued straight onto the number, no space (Redmi Note 9S/10S/12S are all real,
  // multi-generation devices distinct from the base number) — checked before the "pro"/"pro plus"
  // group, which stays space-separated.
  const note = /\b(?:redmi\s+|redm\s+)?note\s+(\d{2})(s)?(?:\s+(pro plus|pro))?\b/.exec(glued);
  if (note) {
    const [full, num, sSuffix, suffix] = note;
    const base = `${num}${sSuffix ?? ""}`;
    // Label capitalises the S ("Redmi Note 12S", the real convention across 9S/10S/12S); the slug
    // stays lower-case like every other family key.
    const labelBase = `${num}${sSuffix ? "S" : ""}`;
    // "Pro+" is Redmi Note's own convention (ML titles literally print it that way); every other
    // brand spells the plus suffix out as the word "Plus".
    const label =
      suffix === "pro plus" ? `Redmi Note ${labelBase} Pro+` : suffix === "pro" ? `Redmi Note ${labelBase} Pro` : `Redmi Note ${labelBase}`;
    const family = suffix ? `redmi-note-${base}-${suffix.replace(/\s+/g, "-")}` : `redmi-note-${base}`;
    return { family, familyLabel: label, start: note.index, end: note.index + full.length };
  }
  // "poco c85"/"poco x7 pro" — the brief's own regex only allows a single digit, but real
  // storefronts sell two-digit Poco models (C85, C71, M8s…), so this is widened to \d{1,2}, plus
  // an optional trailing letter glued straight onto the digits ("M8s") the brief didn't cover.
  // "ultra" (POCO F7 Ultra, a step above Pro on the F line) sits alongside "pro max"/"pro".
  const poco = /\bpoco\s+([xmcf])(\d{1,2})([a-z])?(?:\s+(pro max|pro|ultra))?\b/.exec(glued);
  if (poco) {
    const [full, letter, num, trailingLetter, suffix] = poco;
    const base = `${letter}${num}${trailingLetter ?? ""}`;
    const suffixSlug = suffix ? `-${suffix.replace(/\s+/g, "-")}` : "";
    const suffixLabel = suffix ? ` ${suffix === "pro max" ? "Pro Max" : suffix === "ultra" ? "Ultra" : "Pro"}` : "";
    return {
      family: `poco-${base}${suffixSlug}`,
      familyLabel: `Poco ${base.toUpperCase().replace(/^([XMCF]\d+)([A-Z])$/, (_m, d, l) => `${d}${l.toLowerCase()}`)}${suffixLabel}`,
      start: poco.index,
      end: poco.index + full.length,
    };
  }
  // Redmi A: a bare number alone collapsed "Redmi A3", "Redmi A3+"/"Redmi A3x" and "Redmi A3 Pro"
  // onto one key — the "+"-upgraded and "x"-cheaper variants are real, recurring Redmi A naming
  // (A1+/A2+; A3x), and "Pro" is a real distinct SKU too; none of the three was captured before.
  const redmiA = /\bredmi a(\d)(x)?(?:\s+(plus|pro))?\b/.exec(glued);
  if (redmiA) {
    const [full, num, xSuffix, wordSuffix] = redmiA;
    const base = `${num}${xSuffix ?? ""}`;
    return {
      family: wordSuffix ? `redmi-a${base}-${wordSuffix}` : `redmi-a${base}`,
      familyLabel: `Redmi A${base}${wordSuffix ? ` ${titleCaseWord(wordSuffix)}` : ""}`,
      start: redmiA.index,
      end: redmiA.index + full.length,
    };
  }
  const redmi = /\bredmi\s+(\d{2})(c)?\b/.exec(glued);
  if (redmi) {
    const [full, num, c] = redmi;
    return {
      family: `redmi-${num}${c ?? ""}`,
      familyLabel: `Redmi ${num}${c ?? ""}`,
      start: redmi.index,
      end: redmi.index + full.length,
    };
  }
  // "17t" is glued (no space) in real titles — same letter-onto-digit shape as "moto g06"/"m8s"
  // above, so the connector before the suffix has to tolerate zero spaces too.
  const flagship = /\bxiaomi\s+(\d{2})(?:\s?(ultra|t pro|pro|t))?\b/.exec(glued);
  if (flagship) {
    const [full, num, suffix] = flagship;
    // No "xiaomi-" prefix here: identifyPhone already prepends the brand ("${brand}-${family}"),
    // so baking it into `family` too produced "xiaomi-xiaomi-17-t" — caught only by running this
    // against the real "Xiaomi 17T…" ML title, not by the required fixtures (none exercise this
    // bare-flagship branch). "T" glues onto the number like a real model name ("17T"); the other
    // suffixes read as separate words ("17 Ultra").
    const familyLabelByBase: Record<string, string> = { ultra: `${num} Ultra`, pro: `${num} Pro`, "t pro": `${num}T Pro`, t: `${num}T` };
    return {
      family: suffix ? `${num}-${suffix.replace(/\s+/g, "-")}` : num!,
      familyLabel: suffix ? familyLabelByBase[suffix]! : num!,
      start: flagship.index,
      end: flagship.index + full.length,
    };
  }
  return null;
}

function parseHonor(glued: string): FamilyMatch | null {
  const magic = /\bmagic\s?(\d)(?:\s+(lite|pro))?\b/.exec(glued);
  if (magic) {
    const [full, num, suffix] = magic;
    return {
      family: suffix ? `magic-${num}-${suffix}` : `magic-${num}`,
      familyLabel: `Magic ${num}${suffix ? ` ${titleCaseWord(suffix)}` : ""}`,
      start: magic.index,
      end: magic.index + full.length,
    };
  }
  const play = /\bplay\s?(\d{1,2})\b/.exec(glued);
  if (play) {
    const [full, num] = play;
    return { family: `play-${num}`, familyLabel: `Play ${num}`, start: play.index, end: play.index + full.length };
  }
  const xModel = /\bx(\d)([a-z])?(?:\s+(plus))?\b/.exec(glued);
  if (xModel) {
    const [full, num, letter, plus] = xModel;
    const base = `x${num}${letter ?? ""}`;
    // "X7e", not "X7E": the trailing model letter stays lower-case, same convention as "iPhone 16e".
    const label = `X${num}${letter ?? ""}`;
    return {
      family: plus ? `${base}-plus` : base,
      familyLabel: `${label}${plus ? " Plus" : ""}`,
      start: xModel.index,
      end: xModel.index + full.length,
    };
  }
  // "600e"/"600 e": some titles glue the trailing letter straight onto the number (store URL
  // slugs do this consistently), others space it out — both spellings appear in real data.
  // "pro" was missing here (only lite/e), so "Honor 200 Pro" and plain "Honor 200" collapsed onto
  // the same key — real, different phones (mirrors the "magic" branch above, which already has it).
  // "smart" (Honor 400 Smart, a real distinct SKU) is the same class of gap.
  const threeDigit = /\b(\d{3})(?:\s?(pro|smart|lite|e))?\b/.exec(glued);
  if (threeDigit) {
    const [full, num, suffix] = threeDigit;
    return {
      family: suffix ? `${num}-${suffix}` : num!,
      familyLabel: `${num}${suffix ? ` ${titleCaseWord(suffix)}` : ""}`,
      start: threeDigit.index,
      end: threeDigit.index + full.length,
    };
  }
  return null;
}

// Brands with no explicit family grammar in the brief: fall back to "brand word + the model token
// right after it", stopping before storage/RAM numbers or filler words. Best-effort by design —
// none of these appear in the required fixtures, only in the wider exploration sample.
const GENERIC_STOPWORDS = new Set([
  "dual",
  "sim",
  "4g",
  "5g",
  "nfc",
  "ram",
  "rom",
  "negro",
  "blanco",
  "azul",
  "verde",
  "gris",
  "rosa",
  "violeta",
  "dorado",
  "plateado",
  "celular",
  "smartphone",
  "telefono",
  "movil",
]);

function parseGeneric(brand: PhoneBrand, glued: string): FamilyMatch | null {
  // Skip a repeated brand word ("Oppo Oppo A79") and short bare-letter filler ("Oppo A A79" — the
  // seller's own category letter, printed again right before the real code) before capturing the
  // model. The model itself is required to carry a digit: every real code in this generic tier
  // does (A79, T110…), and requiring one keeps a bare storage token like "256gb" from being
  // mistaken for the model when a title has no separate model word at all.
  const re = new RegExp(
    `\\b${brand}\\b(?:\\s+${brand}\\b)*(?:\\s+[a-z]{1,2}\\b)*\\s+([a-z]*\\d[a-z0-9]*)((?:\\s+(?:pro|plus|ultra|lite|max|neo))*)`,
  );
  const m = re.exec(glued);
  if (!m) return null;
  const [full, model, extra] = m;
  if (!model || GENERIC_STOPWORDS.has(model) || /(?:gb|tb)$/.test(model)) return null;
  const words = [model, ...(extra ?? "").trim().split(/\s+/).filter(Boolean)];
  return {
    family: words.join("-"),
    familyLabel: words.map(titleCaseWord).join(" "),
    start: m.index,
    end: m.index + full.length,
  };
}

// Variant markers a family parser's own grammar doesn't know about. "Honor 400 Smart" vs plain
// "Honor 400", "Redmi A3 Pro" vs plain "Redmi A3", "Moto G85 Fusion" (not a real Motorola line, but
// the parser has no way to know that) — every numbered family is exposed to a real suffix its own
// regex never anticipated, and the fix isn't "add one more suffix per bug report", it's structural:
// if the token immediately after a family match is one of these words and the parser did NOT
// already consume it as part of its own match (a suffix a parser DOES know about, like Honor's own
// "pro", ends up fully inside `match.end` and never reaches this check), the title names a variant
// this identifier can't yet tell apart from the base model. Returning the base model's key anyway
// would be worse than returning nothing: a missed listing only costs recall, but a merged pair —
// two different real phones publishing the same key — corrupts the price comparison itself.
// Connectivity/radio words (5G, 4G, LTE, NFC, Dual, Sim) are deliberately absent: those describe
// the network, not the model, and must never block an otherwise-good match. This runs once, here,
// in the single shared path every brand's parser returns through — not duplicated per parser.
const VARIANT_MARKER_RE = /^(pro|plus|max|ultra|lite|mini|smart|neo|prime|power|play|fusion|edge|fe|s|x|t|e|i|c|g)$/;

function hasUnconsumedVariantMarker(glued: string, match: FamilyMatch): boolean {
  // A residual single letter glued straight onto a consumed digit ("e32S" if the "s" alternative
  // weren't handled) surfaces here exactly like a separate word would ("400 Smart") — both are just
  // "the next run of letters/digits after where the match ended", whether or not there was a space.
  const next = /^\s*([a-z0-9]+)/.exec(glued.slice(match.end));
  if (next === null || !VARIANT_MARKER_RE.test(next[1]!)) return false;
  // "plus" is the one marker that is ALSO how phoneNorm spells a bundle separator ("+"). A model
  // whose own "+" is immediately followed by a SECOND, bundled "+" — "Redmi Note 14 Pro+ + Funda de
  // regalo 512gb" glues to "...pro plus plus funda de regalo 512gb" — would otherwise read that
  // second "plus" as an unrecognised suffix of the model itself and null the whole identity, when it
  // is actually the start of "+ Funda de regalo": a gift, not a variant. Only "plus" gets this
  // exception (every other marker here really does name an unknown VARIANT of the model, and must
  // keep failing closed); and only when something later in the title actually NAMES a giveaway —
  // "Redmi Note 14 Pro+ Ultra" (a genuine, unknown suffix) must still null, so this checks for a real
  // accessory/gift signal, not just the bare word "plus".
  if (next[1] === "plus") {
    const rest = glued
      .slice(match.end)
      .trim()
      .split(/\s+/)
      .slice(1) // drop the "plus" itself — checking IT against hasAccessoryWord would be checking "plus"
      .join(" ");
    if (hasAccessoryWord(rest) || GIFT_WORD_RE.test(rest) || BUNDLE_CLAUSE_RE.test(rest)) return false;
  }
  return true;
}

function parseFamily(brand: PhoneBrand, glued: string): FamilyMatch | null {
  const match = ((): FamilyMatch | null => {
    switch (brand) {
      case "apple":
        return parseApple(glued);
      case "samsung":
        return parseSamsung(glued);
      case "motorola":
        return parseMotorola(glued);
      case "xiaomi":
        return parseXiaomi(glued);
      case "honor":
        return parseHonor(glued);
      default:
        return parseGeneric(brand, glued);
    }
  })();
  if (match && hasUnconsumedVariantMarker(glued, match)) return null;
  return match;
}

// ---------------------------------------------------------------------------------------------
// Storage + RAM extraction
// ---------------------------------------------------------------------------------------------

const STORAGE_SET = new Set([32, 64, 128, 256, 512, 1024, 2048]);
const RAM_WORD_RE = /^ram$/;
// "virtual"/"expand able"/"boost" mark the number next to them as the fake extended figure some
// listings advertise (e.g. "8gb de Ram Expandible 24gb") — never real RAM, never storage.
const VIRTUAL_WORD_RE = /^(virtual|expand\w*|boost)$/;

interface NumWord {
  wordIndex: number;
  value: number;
  unit: "gb" | "tb" | null;
}

function collectNumWords(words: string[]): NumWord[] {
  const out: NumWord[] = [];
  words.forEach((word, wordIndex) => {
    const m = /^(\d{1,4})(gb|tb)?$/.exec(word);
    if (m) out.push({ wordIndex, value: Number(m[1]), unit: (m[2] as "gb" | "tb" | undefined) ?? null });
  });
  return out;
}

function toGb(n: NumWord): number {
  return n.unit === "tb" ? n.value * 1024 : n.value;
}

// Deliberately forward-only ("Ngb Ram", "Ngb de Ram"): titles routinely sandwich "ram" between
// two DIFFERENT numbers ("8gb Ram 256gb" — RAM then storage back to back), and a backward check
// ("is the previous word literally ram?") would also flag the storage figure that just happens to
// follow the real RAM figure, excluding real storage from the whole title.
function isRamAssociated(words: string[], idx: number): boolean {
  const next = words[idx + 1];
  const next2 = words[idx + 2];
  if (next && RAM_WORD_RE.test(next)) return true;
  if (next === "de" && next2 && RAM_WORD_RE.test(next2)) return true;
  return false;
}

// Backward-only ("N Expandible", "N Expandible A M"): "8gb de Ram Expandible 24gb" tags the 24
// (the word sits right in front of it, with an optional filler like "a"/"de" in between) — it must
// NOT also taint whatever number came before it. "4GB Expande 12GB" (a real title in the sample)
// reads the other way round grammatically ("4GB that expands to 12GB"), so a forward check would
// wrongly blank out the genuine 4GB RAM figure; forward-tainting is not worth that trade.
function isVirtualTainted(words: string[], idx: number): boolean {
  const prev = words[idx - 1];
  const prev2 = words[idx - 2];
  if (prev && VIRTUAL_WORD_RE.test(prev)) return true;
  if ((prev === "a" || prev === "de" || prev === "para") && prev2 && VIRTUAL_WORD_RE.test(prev2)) return true;
  return false;
}

/** Is `b` glued directly onto `a` — either bare adjacency ("8 256gb") or through "plus" ("8gb+256gb" → "8gb plus 256gb")? */
function isGluedPair(words: string[], a: NumWord, b: NumWord): "direct" | "plus" | null {
  if (b.wordIndex === a.wordIndex + 1) return "direct";
  if (words[a.wordIndex + 1] === "plus" && b.wordIndex === a.wordIndex + 2) return "plus";
  return null;
}

/**
 * RAM = the smallest value ≤24 that is either written next to the word "ram", or is the first
 * term of a glued pair such as "8/256gb", "12gb 256gb" or "4gb+8gb" — a bare/first number sitting
 * right in front of the storage figure is Uruguayan-listing shorthand for RAM, with or without the
 * word itself. Both signals feed the same minimum because a title can (and does) carry both a
 * misleading "total" RAM+boost figure and the real one in the same sentence — see
 * "4gb + 8gb Ram 256gb" in the fixtures, where 8 is boost and 4 is real.
 */
function extractRamGb(words: string[], numWords: NumWord[]): number | null {
  const candidates: number[] = [];
  for (const n of numWords) {
    if (n.value > 24 || n.unit === "tb") continue;
    if (isVirtualTainted(words, n.wordIndex)) continue;
    if (isRamAssociated(words, n.wordIndex)) candidates.push(n.value);
  }
  for (let k = 0; k < numWords.length - 1; k++) {
    const a = numWords[k]!;
    const b = numWords[k + 1]!;
    if (!isGluedPair(words, a, b)) continue;
    const bQualifies = b.unit !== null || STORAGE_SET.has(toGb(b));
    if (!bQualifies) continue;
    if (a.value <= 24 && !isVirtualTainted(words, a.wordIndex)) candidates.push(a.value);
  }
  return candidates.length ? Math.min(...candidates) : null;
}

// A bare number right after it is never storage: "8gb 64 MP" (RAM, then a camera's megapixel
// count) is not "8gb 64" with an implied unit — it just happens to share the storage-set value 64
// with the real storage size {32,64,128,...}. Every spec class that writes a bare number in real
// titles goes here so the bare-number storage branch below can't mistake one for gigabytes.
const NON_STORAGE_FOLLOWER_RE = /^(mp|mpx|mah|hz|w|pulgadas|pulg)$/;

/**
 * Storage = the largest value that is actually a real storage size (32/64/…/2048 after TB→GB),
 * excluding anything tagged as RAM/virtual/boost by itself. A "N+N ram" combo never needs its own
 * exclusion rule here: every real storage size is ≥32, but a genuine RAM combo (the "12" in
 * "12gb+12gb Ram") is always ≤24 by definition — the two ranges never overlap, so nothing in
 * STORAGE_SET can ever legitimately be one of the combo's own terms. (An earlier version excluded
 * a storage candidate whenever it was "+"-glued to a ram-tagged number — that broke titles like
 * "Memoria 256GB + 16GB RAM", where the "+" is an ordinary "and" joining two separate specs, not a
 * combo, and 256 is real storage that must not be thrown out because 16 happens to sit next to it.)
 *
 * The bare-number branch (a storage value written with no "gb"/"tb" of its own, like the "256" in
 * "6gb+256") is intentionally narrow: it only fires when the number is glued through an explicit
 * "+" to a preceding unit-bearing number ("Celular Honor X7e 6gb+256 Naranja" needs exactly this —
 * removing the branch outright drops that real title to null). Plain adjacency ("8gb 64 mp") is
 * NOT accepted here — two numbers sitting next to each other with nothing joining them is far more
 * often two unrelated specs (RAM, then a camera/battery/screen figure) than an implied unit, as
 * "8gb 64 mp Camara" demonstrates. The follower veto is a second, independent guard for the one
 * case that survives the "+"-only restriction.
 */
function extractStorageGb(words: string[], numWords: NumWord[]): number | null {
  const candidates: number[] = [];
  for (let i = 0; i < numWords.length; i++) {
    const n = numWords[i]!;
    const gbValue = toGb(n);
    if (!STORAGE_SET.has(gbValue)) continue;
    if (n.unit === null) {
      const prev = numWords[i - 1];
      if (!prev || !prev.unit || isGluedPair(words, prev, n) !== "plus") continue;
      const follower = words[n.wordIndex + 1];
      if (follower && NON_STORAGE_FOLLOWER_RE.test(follower)) continue;
    }
    if (isRamAssociated(words, n.wordIndex) || isVirtualTainted(words, n.wordIndex)) continue;
    candidates.push(gbValue);
  }
  return candidates.length ? Math.max(...candidates) : null;
}

// ---------------------------------------------------------------------------------------------
// eSIM + condition
// ---------------------------------------------------------------------------------------------

function detectEsimOnly(glued: string): boolean {
  if (/\b(solo|solamente)\s*esim\b/.test(glued)) return true;
  if (/\besim\b/.test(glued) && !/\bdual\s*sim\b/.test(glued) && !/\bsim\s*fisica\b/.test(glued)) return true;
  return false;
}

export function phoneConditionFromTitle(
  title: string,
  sourceCondition: "new" | "refurbished" | "used" | "unknown",
): PhoneCondition {
  const n = phoneNorm(title);
  if (/\bcaja abierta\b/.test(n)) return "open-box";
  if (/\b(reacondicionado|refurbished|outlet|cpo)\b/.test(n)) return "refurbished";
  if (/\b(usado|como nuevo|segunda mano)\b/.test(n)) return "used";
  return sourceCondition === "unknown" ? "new" : sourceCondition;
}

// ---------------------------------------------------------------------------------------------
// Identity assembly
// ---------------------------------------------------------------------------------------------

function storageSlug(gb: number): string {
  return gb % 1024 === 0 ? `${gb / 1024}tb` : `${gb}gb`;
}

function storageLabel(gb: number): string {
  return gb % 1024 === 0 ? `${gb / 1024} TB` : `${gb} GB`;
}

export function identifyPhone(title: string, attributes?: Record<string, string>): PhoneIdentity | null {
  if (!isPhoneTitle(title)) return null;
  const glued = glueUnits(phoneNorm(title));
  const brand = detectBrand(glued);
  if (!brand) return null;

  const familyMatch = parseFamily(brand, glued);
  if (!familyMatch) return null;

  // Blank out the family's own match span before scanning for storage/RAM, so a model number
  // (the "17" in "iphone 17", the "26" in "galaxy s26"…) never gets mistaken for a RAM figure
  // glued to whatever storage number follows it.
  const residual = `${glued.slice(0, familyMatch.start)} ${glued.slice(familyMatch.end)}`;
  const extra = attributes ? phoneNorm(Object.values(attributes).join(" ")) : "";
  const scanWords = `${residual} ${extra}`.trim().split(/\s+/).filter(Boolean);
  const numWords = collectNumWords(scanWords);

  const storageGb = extractStorageGb(scanWords, numWords);
  if (storageGb === null) return null;
  const ramGb = extractRamGb(scanWords, numWords);
  const esimOnly = detectEsimOnly(glued);

  const brandLabel = BRAND_LABELS[brand];
  const key = `${brand}-${familyMatch.family}-${storageSlug(storageGb)}`;
  const name = `${brandLabel} ${familyMatch.familyLabel} ${storageLabel(storageGb)}`;

  return {
    brand,
    brandLabel,
    family: familyMatch.family,
    familyLabel: familyMatch.familyLabel,
    storageGb,
    ramGb,
    esimOnly,
    key,
    name,
  };
}
