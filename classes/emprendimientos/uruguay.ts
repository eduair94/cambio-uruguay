// ¿Esta cuenta es uruguaya? La pregunta que más cuidado necesita: Instagram mezcla cuentas de toda
// la región, y la cosecha de autocompletado de `currency-search-demand` ya mostró que "gl=uy" sin
// una marca local devuelve México, Venezuela y España (381 sugerencias, 83 uruguayas). Acá la regla
// es la misma: hace falta una marca uruguaya ESCRITA (en el nombre, la bio, el handle o un enlace),
// o una fuente que sea uruguaya por sí misma (Uruguay Emprendedor). La IA opina, pero no alcanza
// sola: ver `decide.ts`.
import { canonicalDepartment, DEPARTMENTS, flatten } from "../rentals/normalize";
import { neighborhoodFromText } from "../rentals/neighborhoods";
import { departamentoSlugOf } from "./taxonomy";

export interface UruguayEvidence {
  /** Marcas uruguayas encontradas, para el log y la ficha privada. */
  markers: string[];
  /** Marcas de otro país (Argentina sobre todo) encontradas. */
  foreign: string[];
  /** El departamento que el texto nombra (slug), si lo nombra sin ambigüedad. */
  departamento: string | null;
  /** El barrio o la localidad, si el texto lo nombra. */
  barrio: string | null;
}

// Ciudades y nombres que no están en el diccionario de barrios de alquileres y que una bio escribe
// solos: "📍 Punta del Este", "Pocitos" ya está en el diccionario.
const PLACES = [
  "uruguay", "uruguaya", "uruguayo", "uruguayas", "uruguayos", "montevideo", "mvd", "punta del este", "piriapolis",
  "ciudad de la costa", "las piedras", "la paz", "pando", "atlantida", "el pinar", "solymar", "lagomar",
  "colonia del sacramento", "carmelo", "nueva helvecia", "juan lacaze", "rosario", "mercedes", "fray bentos",
  "young", "dolores", "minas", "trinidad", "melo", "chuy", "la paloma", "punta del diablo", "castillos",
  "nueva palmira", "san carlos", "pan de azucar", "progreso", "sauce", "santa lucia", "libertad", "ciudad del plata",
  "rio branco", "bella union", "salto", "paysandu", "tacuarembo", "rivera", "artigas", "durazno", "canelones",
  "maldonado", "rocha", "florida", "flores", "soriano", "lavalleja", "treinta y tres", "cerro largo", "san jose",
  "colonia", "rio negro",
];
// Palabras que solas son demasiado comunes en otros países: valen sólo junto a otra marca.
const WEAK_PLACES = new Set(["florida", "flores", "colonia", "rosario", "mercedes", "dolores", "progreso", "libertad", "salto", "rivera", "artigas", "trinidad", "minas", "young", "sauce", "la paz", "san carlos", "santa lucia", "durazno", "canelones", "rocha", "san jose", "soriano"]);

const FOREIGN = [
  ["argentina", /\bargentin[ao]s?\b/],
  ["caba", /\bcaba\b/],
  ["buenos aires", /\bbuenos aires\b|\bbs\.? ?as\b/],
  ["gba", /\bgba\b|\bconurbano\b/],
  ["mexico", /\bmexico\b|\bcdmx\b/],
  ["chile", /\bchile\b|\bsantiago de chile\b/],
  ["paraguay", /\bparaguay\b|\basuncion\b/],
  ["españa", /\bespana\b|\bmadrid\b|\bbarcelona\b/],
  ["colombia", /\bcolombia\b|\bbogota\b|\bmedellin\b/],
  ["peru", /\bperu\b|\blima\b/],
  ["venezuela", /\bvenezuela\b|\bcaracas\b/],
  ["cordoba", /\bcordoba capital\b/],
  ["rosario ar", /\brosario,? santa fe\b/],
] as const;

const escape = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const PLACE_RES = PLACES.map(place => [place, new RegExp(`(?:^|[^a-z0-9])${escape(place)}(?:$|[^a-z0-9])`)] as const);

/** Texto para buscar marcas: sin tildes, minúsculas, los emojis de bandera conservados aparte. */
function fold(text: string): string {
  return flatten(String(text || "").replace(/[_.]/g, " "));
}

export function uruguayEvidence(input: { handle: string; fullName: string; biography: string; links: readonly string[] }): UruguayEvidence {
  const raw = `${input.fullName}\n${input.biography}`;
  const text = fold(`${input.handle} ${raw}`);
  const markers: string[] = [];
  const foreign: string[] = [];
  const add = (list: string[], value: string): void => {
    if (!list.includes(value)) list.push(value);
  };

  if (raw.includes("🇺🇾")) add(markers, "🇺🇾");
  if (/\+\s?598|\b0?9[1-9]\s?\d{3}\s?\d{3}\b|\b2\d{3}\s?\d{4}\b/.test(raw)) add(markers, "teléfono uruguayo");
  if (input.links.some(link => /\.uy(?:[/:?#]|$)/i.test(link))) add(markers, "dominio .uy");
  if (input.links.some(link => /wa\.me\/598|whatsapp\.com\/send\/?\?phone=598/i.test(link))) add(markers, "WhatsApp +598");
  if (/(?:^|[._])uy$|uruguay/i.test(input.handle)) add(markers, "handle .uy");
  if (/\$\s?u\b|\buyu\b|\bpesos uruguayos\b/i.test(raw)) add(markers, "pesos uruguayos");

  let weak = 0;
  for (const [place, re] of PLACE_RES) {
    if (!re.test(text)) continue;
    if (WEAK_PLACES.has(place)) weak++;
    else add(markers, place);
  }

  if (raw.includes("🇦🇷")) add(foreign, "🇦🇷");
  if (/\+\s?54\b|\+\s?52\b|\+\s?56\b|\+\s?595\b|\+\s?34\b/.test(raw)) add(foreign, "teléfono extranjero");
  if (input.links.some(link => /\.(?:ar|mx|cl|py|es|co|pe|ve)(?:[/:?#]|$)/i.test(link))) add(foreign, "dominio extranjero");
  for (const [label, re] of FOREIGN) if (re.test(text)) add(foreign, label);

  const place = neighborhoodFromText(raw, "");
  const departamento = departmentIn(text) ?? (place ? departamentoSlugOf(canonicalDepartment(place.department)) : null);
  if (place && !markers.length && weak === 0) add(markers, place.neighborhood);
  // Un lugar débil ("Colonia", "Florida") cuenta si hay otra marca o si son dos.
  if (weak >= 2 && !markers.length) add(markers, "dos localidades uruguayas");
  return {
    markers,
    foreign,
    departamento,
    barrio: place && place.neighborhood !== place.department ? place.neighborhood : null,
  };
}

/** El departamento que el texto nombra como tal ("📍 Maldonado"); null si nombra dos o ninguno. */
function departmentIn(folded: string): string | null {
  const found = new Set<string>();
  for (const name of DEPARTMENTS) {
    const key = flatten(name);
    // "Colonia", "Florida", "Flores", "Rivera", "Artigas", "Salto" son también palabras y apellidos:
    // cuentan si hay un 📍 o "envíos desde" cerca no, así que acá se aceptan sólo como palabra
    // entera; la decisión final sobre Uruguay la toman las marcas fuertes.
    if (new RegExp(`(?:^|[^a-z0-9])${escape(key)}(?:$|[^a-z0-9])`).test(folded)) found.add(name);
  }
  if (found.has("Montevideo") && found.size > 1) {
    // "Montevideo y Canelones": no hay un solo departamento.
    return null;
  }
  return found.size === 1 ? departamentoSlugOf([...found][0]!) : null;
}

/** true si la evidencia por texto alcanza para decir "uruguaya" sin preguntarle a nadie. */
export const textSaysUruguay = (evidence: UruguayEvidence): boolean => evidence.markers.length > 0 && (evidence.foreign.length === 0 || evidence.markers.length >= 2);
