// La LÍNEA de una notebook (MacBook Air, ThinkPad, IdeaPad…), el modelo que la sigue y, en los Mac,
// el año del título.
//
// Por qué existe: la mitad de los títulos de notebook no dice el procesador (492 de 1.108 el
// 23/11/2026), pero el 70 % dice la línea, y en los Mac la línea + el año o el chip ordena el precio
// casi sin ruido (Air 2015 US$ 250 → 2017 US$ 358 → M1 US$ 799 → M2 US$ 1.049). Una línea SIN
// procesador ni año no es una cohorte («IdeaPad 3» va de US$ 119 a US$ 1.100): la línea se publica
// como dato y como filtro, y sólo compara precios acompañada del chip, del año (Mac) o de la familia
// del procesador.
//
// Todo corre sobre `norm()`.

export interface NotebookLine {
  line: string;
  lineLabel: string;
  model: string | null;
  modelYear: number | null;
  brand: string;
}

interface LineRule {
  line: string;
  label: string;
  brand: string;
  pattern: RegExp;
  /** Sólo con la marca escrita en el título («Lenovo T480», «Asus X515»). */
  needs?: RegExp;
}

/** «t490» → «T490», «pro 5» → «PRO 5»; una palabra sola («strix») va con mayúscula inicial. */
const up = (value: string | undefined): string | null => {
  if (!value) return null;
  const clean = value.replace(/\s+/g, " ").trim();
  return /^[a-z]{4,}$/.test(clean) ? clean[0]!.toUpperCase() + clean.slice(1) : clean.toUpperCase();
};

// El orden importa: lo más específico primero («macbook air» antes que «macbook»).
const RULES: readonly LineRule[] = [
  { line: "macbook-air", label: "MacBook Air", brand: "Apple", pattern: /ma?c\s*k?\s*book\s*air/ },
  { line: "macbook-pro", label: "MacBook Pro", brand: "Apple", pattern: /ma?c\s*k?\s*book\s*pro/ },
  { line: "macbook", label: "MacBook", brand: "Apple", pattern: /ma?c\s*k?\s*book/ },
  { line: "thinkpad", label: "ThinkPad", brand: "Lenovo", pattern: /thinkpad\s*(x1\s*carbon|x1|[a-z]\d{2,3}[a-z]?)?/ },
  { line: "thinkpad", label: "ThinkPad", brand: "Lenovo", pattern: /(?<![a-z0-9])([tx]\d{3}s?|e[45][89]\d|l[34][89]\d)(?![a-z0-9])/, needs: /\blenovo\b/ },
  { line: "thinkbook", label: "ThinkBook", brand: "Lenovo", pattern: /thinkbook\s*(\d{2})?/ },
  { line: "ideapad", label: "IdeaPad", brand: "Lenovo", pattern: /ideapad\s*(?:slim\s*|gaming\s*|flex\s*)?([a-z]?\d{1,3}[a-z]?)?(?![0-9])/ },
  { line: "legion", label: "Legion", brand: "Lenovo", pattern: /legion\s*(pro\s*\d|slim\s*\d|\d)?/ },
  { line: "loq", label: "LOQ", brand: "Lenovo", pattern: /(?<![a-z])loq(?![a-z])/ },
  { line: "yoga", label: "Yoga", brand: "Lenovo", pattern: /\byoga\b/ },
  { line: "latitude", label: "Latitude", brand: "Dell", pattern: /latitude\s*(e?\d{4})?/ },
  { line: "inspiron", label: "Inspiron", brand: "Dell", pattern: /inspiron\s*(?:1[3-7]\s+)?(\d{4})?/ },
  { line: "vostro", label: "Vostro", brand: "Dell", pattern: /vostro\s*(\d{4})?/ },
  { line: "xps", label: "XPS", brand: "Dell", pattern: /\bxps\s*(\d{2})?/ },
  { line: "alienware", label: "Alienware", brand: "Dell", pattern: /alienware\s*([mx]\d{2})?/ },
  { line: "elitebook", label: "EliteBook", brand: "HP", pattern: /elitebook\s*(\d{3,4}(?:\s*g\d{1,2})?)?/ },
  { line: "probook", label: "ProBook", brand: "HP", pattern: /probook\s*(\d{3}(?:\s*g\d{1,2})?)?/ },
  { line: "zbook", label: "ZBook", brand: "HP", pattern: /zbook/ },
  { line: "pavilion", label: "Pavilion", brand: "HP", pattern: /pavil+ion/ },
  { line: "victus", label: "Victus", brand: "HP", pattern: /\bvictus\b/ },
  { line: "omen", label: "Omen", brand: "HP", pattern: /\bomen\b/ },
  { line: "envy", label: "Envy", brand: "HP", pattern: /\benvy\b/ },
  { line: "hp-stream", label: "HP Stream", brand: "HP", pattern: /\bstream\b/, needs: /\bhp\b/ },
  { line: "vivobook", label: "VivoBook", brand: "Asus", pattern: /vivobook\s*(?:go\s*|pro\s*|s\s*)?(\d{2}|[a-z]\d{3,4}[a-z]{0,2})?/ },
  { line: "vivobook", label: "VivoBook", brand: "Asus", pattern: /(?<![a-z0-9])(x\d{3}[a-z]{0,2}|e[45]10[a-z]{0,2})(?![a-z0-9])/, needs: /\basus\b/ },
  { line: "zenbook", label: "ZenBook", brand: "Asus", pattern: /zenbook/ },
  { line: "tuf", label: "TUF Gaming", brand: "Asus", pattern: /\btuf\b(?:\s*gaming)?\s*([af]\d{2}|fx\d{3}[a-z]{0,2})?/ },
  { line: "rog", label: "ROG", brand: "Asus", pattern: /\brog\b\s*(strix|zephyrus|flow)?/ },
  { line: "aspire", label: "Aspire", brand: "Acer", pattern: /aspire\s*(\d(?![0-9])|e\d)?/ },
  { line: "nitro", label: "Nitro", brand: "Acer", pattern: /\bnitro\s*(5|v\b|16|17)?/, needs: /\b(acer|nitro\s*(?:5|v\b|16|17|an\d))/ },
  { line: "predator", label: "Predator", brand: "Acer", pattern: /\bpredator\b/ },
  { line: "swift", label: "Swift", brand: "Acer", pattern: /\bswift\b/, needs: /\bacer\b/ },
  { line: "katana", label: "Katana", brand: "MSI", pattern: /\bkatana\b/ },
  { line: "msi-thin", label: "MSI Thin", brand: "MSI", pattern: /thin\s*gf\d{2}|\bgf63\b/ },
  { line: "cyborg", label: "Cyborg", brand: "MSI", pattern: /\bcyborg\b/ },
  { line: "msi-modern", label: "MSI Modern", brand: "MSI", pattern: /\bmodern\b/, needs: /\bmsi\b/ },
  { line: "galaxy-book", label: "Galaxy Book", brand: "Samsung", pattern: /galaxy\s*book/ },
  { line: "matebook", label: "MateBook", brand: "Huawei", pattern: /matebook/ },
  { line: "surface", label: "Surface", brand: "Microsoft", pattern: /\bsurface\b/ },
  { line: "satellite", label: "Satellite", brand: "Toshiba", pattern: /satel+ite/ },
  { line: "chromebook", label: "Chromebook", brand: "", pattern: /chromebook/ },
];

/** El año de un Mac: el que dice el título («2017», «Mid 2012»). Entre 2008 y el año que viene. */
function macYear(text: string): number | null {
  for (const match of text.matchAll(/(?<![0-9.,a-z])(20(?:0[89]|1\d|2\d))(?![0-9a-z]|\s*(?:gb|mb|mhz|x\s))/g)) {
    const year = Number(match[1]);
    if (year >= 2008 && year <= new Date().getUTCFullYear() + 1) return year;
  }
  return null;
}

/** La línea que nombra el título (normalizado) de una notebook, o null. */
export function readNotebookLine(text: string): NotebookLine | null {
  for (const rule of RULES) {
    if (rule.needs && !rule.needs.test(text)) continue;
    const match = rule.pattern.exec(text);
    if (!match) continue;
    const apple = rule.brand === "Apple";
    return {
      line: rule.line,
      lineLabel: rule.label,
      model: apple ? null : up(match[1]),
      modelYear: apple ? macYear(text) : null,
      brand: rule.brand,
    };
  }
  return null;
}
