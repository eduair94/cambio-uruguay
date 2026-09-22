// The barrio an advert NAMES, read from its own text.
//
// Why this exists: Facebook Marketplace publishes a rental with a city ("Montevideo, Uruguay")
// and no barrio, no address and no usable coordinate — measured 2026-09-22 over 3.067 Marketplace
// offers: 93 % had no barrio and 100 % no coordinate, while 46 % of their TITLES named a barrio
// or a town ("Alquiler de Apartamento en Buceo", "ALQUILER BUCEO", "Casa en alquiler ZONA
// BUCEO"). The item page does carry `location.latitude/longitude`, but it is not the property:
// the values step by exactly 0,010986° (a ~1 km grid) and four of four Montevideo samples landed
// 3–6 km from the corner the seller wrote in the description (Maroñas → Centro, Piedras Blancas
// → La Comercial), with `is_map_eligible: false` on every one. So the pin is never published and
// the title is the evidence.
//
// Precision over recall, like everything else in the directory: a wrong barrio puts a flat in the
// wrong filter and the wrong "Datos del barrio", an empty one only says "sin informar".
//   * whole words only, accents and case folded; the LONGEST name wins ("Pocitos Nuevo" over
//     "Pocitos", "Cerrito de la Victoria" over "Cerrito");
//   * a generic word that is also a street, a plaza or plain Spanish ("Centro", "Colón",
//     "Unión", "Manga", "Bolívar") counts only behind a locative cue ("en", "zona", "barrio");
//   * a name followed by "y <calle>" or "esq." is a street corner, not a barrio;
//   * a name that exists only in a department other than the card's is refused, not moved:
//     "Paso Carrasco" on a Montevideo card is a contradiction, and contradictions abstain;
//   * without a card department, only a locality unique to one department names it — every town
//     has a "Centro".
//
// The dictionary is the INE 2011 barrios (split on the comma of their composite labels) plus the
// names the OTHER portals advertise, measured 2026-09-22 over `rentallistings` (≥ 10 adverts per
// department, plus the towns Marketplace titles actually named). The zone assigner
// (`classes/propertyzones/assign.ts`) later maps the advertised name to an official area by exact
// name or by measured alias, so this module stores what the advert says, spelled one way.
import { INE_DISPLAY_NAMES } from "../propertyzones/names";
import { DEPARTMENTS, flatten } from "./normalize";

export interface NeighborhoodFromText {
  neighborhood: string;
  department: string;
}

/** INE label parts nobody advertises under that spelling. */
export const NOT_ADVERTISED_INE_NAMES: ReadonlySet<string> = new Set([
  "Colón Sureste",
  "Colón Centro y Noroeste",
  "Manga Rural",
]);

const MONTEVIDEO_ADVERTISED = [
  "Colón",
  "Pocitos Nuevo",
  "Puerto Buceo",
  "Goes",
  "Villa Biarritz",
  "Paso Molino",
  "Cerrito de la Victoria",
  "Barrio Parques",
  "Cruz de Carrasco",
] as const;

const ineNames = (): string[] => {
  const names: string[] = [];
  for (const label of Object.values(INE_DISPLAY_NAMES)) {
    for (const part of label.split(", ")) if (!NOT_ADVERTISED_INE_NAMES.has(part) && !names.includes(part)) names.push(part);
  }
  return names;
};

export const KNOWN_NEIGHBORHOODS: Readonly<Record<string, readonly string[]>> = Object.freeze({
  Montevideo: [...ineNames(), ...MONTEVIDEO_ADVERTISED],
  Canelones: [
    "Ciudad de la Costa", "Pando", "Barra de Carrasco", "El Pinar", "Pinar", "Las Piedras", "Parque Miramar",
    "Solymar", "Lomas de Solymar", "Médanos de Solymar", "Montes de Solymar", "Atlántida", "Atlántida Sur",
    "Estación Atlántida", "Lagomar", "La Tahona", "Altos de la Tahona", "Parque de Carrasco", "Parque Carrasco",
    "Paso de Carrasco", "Paso Carrasco", "Colinas de Carrasco", "Cumbres de Carrasco", "San José de Carrasco",
    "Salinas", "Barros Blancos", "Shangrilá", "Los Horneros", "Quinta Los Horneros", "La Paz", "Parque del Plata",
    "Neptunia", "Progreso", "San Luis", "Las Toscas", "Pinamar", "Marindia", "Haras del Lago", "Colonia Nicolich",
    "Empalme Nicolich", "Empalme Olmos", "Sauce", "Joaquín Suárez", "Santa Lucía", "Santa Rosa", "Toledo",
    "Villa Argentina", "Bello Horizonte", "Villa Aeroparque", "Costa Azul", "La Floresta", "La Tuna",
    "Cuchilla Alta", "Jaureguiberry", "Araminda", "Guazuvirá", "Tala", "San Ramón", "San Bautista", "Migues",
    "San Jacinto", "Juan Antonio Artigas", "Soca", "Los Cerrillos", "Juanicó", "Parque Roosevelt",
  ],
  Maldonado: [
    "Punta del Este", "Playa Mansa", "Playa Brava", "La Barra", "Península", "Roosevelt", "Punta Ballena",
    "Pinares", "Balneario Buenos Aires", "José Ignacio", "Manantiales", "Aidy Grill", "Piriápolis", "San Rafael",
    "Montoya", "El Quijote", "Cantegril", "Rincón del Indio", "San Carlos", "El Chorro", "La Pastora", "Solanas",
    "Lugano", "Portezuelo", "Sauce de Portezuelo", "Punta Piedras", "Chihuahua", "San Vicente", "Barrio Córdoba",
    "Playa Hermosa", "Playa Grande", "Playa Verde", "Tio Tom", "La Juanita", "Laguna Blanca", "Laguna del Sauce",
    "El Tesoro", "Pan de Azúcar", "Punta Colorada", "Punta Negra", "Aiguá", "Cerro Pelado", "Las Delicias",
    "La Capuera", "Ocean Park", "Solís", "Bella Vista", "Las Flores", "Gregorio Aznárez", "Pueblo Gaucho",
    "Villa Delia", "San Francisco", "Los Aromos", "Barrio Hipódromo", "Lausana", "La Sonrisa", "Maldonado Nuevo",
  ],
  Colonia: [
    "Carmelo", "Nueva Helvecia", "Colonia del Sacramento", "Rosario", "Tarariras", "Nueva Palmira", "Juan Lacaze",
    "Colonia Valdense", "Ombúes de Lavalle", "Florencio Sánchez", "Conchillas", "Real de San Carlos", "Riachuelo",
    "Santa Ana",
  ],
  Rocha: [
    "José Ignacio", "La Paloma", "La Pedrera", "Punta del Diablo", "Chuy", "Castillos", "Lascano", "Cabo Polonio",
    "Barra de Valizas", "Valizas", "Aguas Dulces", "La Aguada", "Costa Azul", "La Barra del Chuy",
  ],
  "San José": [
    "Ciudad del Plata", "Delta del Tigre", "Libertad", "Playa Pascual", "San José de Mayo", "Ecilda Paullier",
    "Rafael Perazza", "Kiyú", "Boca del Cufré", "Puntas de Valdez", "Ituzaingó",
  ],
  "Cerro Largo": ["Melo", "Río Branco", "Fraile Muerto", "Laguna Merín"],
  Soriano: ["Mercedes", "Dolores", "Cardona", "Villa Soriano"],
  Lavalleja: ["Minas", "José Pedro Varela", "Solís de Mataojo", "Villa Serrana", "José Batlle y Ordóñez"],
  Paysandú: ["Guichón", "Nuevo Paysandú", "San Félix", "Termas de Guaviyú"],
  Salto: ["Termas del Daymán", "Daymán", "Arapey", "Termas del Arapey"],
  Florida: ["Sarandí Grande", "Casupá", "Fray Marcos"],
  Durazno: ["Sarandí del Yí", "Villa del Carmen", "Cerro Chato"],
  Tacuarembó: ["Paso de los Toros", "San Gregorio de Polanco"],
  Rivera: ["Tranqueras", "Vichadero", "Minas de Corrales"],
  Artigas: ["Bella Unión"],
  "Río Negro": ["Fray Bentos", "Young", "Nuevo Berlín", "San Javier"],
  Flores: ["Trinidad"],
  "Treinta y Tres": ["Vergara", "Santa Clara de Olimar"],
});

/**
 * Names that are also a street, a plaza, a department or an ordinary word. Only a locative cue
 * right before them ("en Centro", "zona Colón", "barrio Manga") makes them a barrio.
 */
const CUE_ONLY: ReadonlySet<string> = new Set(
  ["Centro", "Colón", "Unión", "Manga", "Bolívar", "Castro", "Lavalleja", "Larrañaga", "Retiro", "Cerro", "Pinar",
    "Progreso", "Libertad", "Sauce", "Toledo", "Rosario", "Dolores", "Young", "Roosevelt", "Puerto"].map(flatten),
);
const LOCATIVE_CUES: ReadonlySet<string> = new Set(["en", "barrio", "bo", "zona", "de", "del", "el", "la", "al", "pleno", "ubicado", "ubicada"]);
/** The token before a name that says the name is a street, not an area. */
const STREET_CUES: ReadonlySet<string> = new Set([
  "av", "avda", "avenida", "calle", "esq", "esquina", "y", "e", "bvar", "blvd", "bulevar", "cno", "camino", "ruta",
  "km", "rambla", "pasaje", "entre", "plaza", "sobre", "frente", "cruce",
]);
/** The token after a name that turns it into a corner ("Roosevelt y Arostegui"). */
const CORNER_CUES: ReadonlySet<string> = new Set(["y", "e", "esq", "esquina", "casi", "entre"]);

const tokenize = (text: string): string[] => flatten(text).split(/[^a-z0-9]+/).filter(Boolean);

interface Entry {
  department: string;
  name: string;
  tokens: string[];
  key: string;
}

let entries: Entry[] | null = null;
const dictionary = (): Entry[] => {
  entries ||= Object.entries(KNOWN_NEIGHBORHOODS).flatMap(([department, names]) =>
    names.map((name) => ({ department, name, tokens: tokenize(name), key: flatten(name) })),
  );
  return entries;
};

const DEPARTMENT_KEYS: ReadonlySet<string> = new Set(DEPARTMENTS.map(flatten));

interface Match extends Entry {
  start: number;
  chars: number;
}

function matchesIn(tokens: string[], entry: Entry): Match | null {
  const width = entry.tokens.length;
  if (!width) return null;
  for (let start = 0; start + width <= tokens.length; start++) {
    let same = true;
    for (let i = 0; i < width && same; i++) same = tokens[start + i] === entry.tokens[i];
    if (!same) continue;
    const before = start > 0 ? tokens[start - 1]! : "";
    const after = start + width < tokens.length ? tokens[start + width]! : "";
    const afterNext = start + width + 1 < tokens.length;
    if (STREET_CUES.has(before)) continue;
    if (CORNER_CUES.has(after) && afterNext) continue;
    if (CUE_ONLY.has(entry.key) && !LOCATIVE_CUES.has(before)) continue;
    return { ...entry, start, chars: entry.key.length };
  }
  return null;
}

/**
 * The barrio (or town) the text names, with its department. `null` is "the advert does not say",
 * never a guess from the search anchor or from the nearest name.
 */
export function neighborhoodFromText(text: string, department: string): NeighborhoodFromText | null {
  const tokens = tokenize(text);
  if (!tokens.length) return null;
  const cardDepartment = department.trim();
  const cardKey = flatten(cardDepartment);
  const matches: Match[] = [];
  for (const entry of dictionary()) {
    // "Alquiler en Maldonado" on a Maldonado card names the department, not a barrio.
    if (DEPARTMENT_KEYS.has(entry.key)) continue;
    const match = matchesIn(tokens, entry);
    if (match) matches.push(match);
  }
  if (!matches.length) return null;

  if (cardKey) {
    const own = matches.filter((match) => flatten(match.department) === cardKey);
    const ownKeys = new Set(own.map((match) => match.key));
    // A name that exists ONLY elsewhere contradicts the card; contradictions abstain.
    if (matches.some((match) => !ownKeys.has(match.key))) return null;
    return pick(own, cardDepartment);
  }

  const departments = new Set(matches.map((match) => match.department));
  if (departments.size !== 1) return null;
  const best = pick(matches, [...departments][0]!);
  // Every town has a "Centro": a generic word can never place an advert in a department.
  if (!best || CUE_ONLY.has(flatten(best.neighborhood))) return null;
  return best;
}

function pick(matches: Match[], department: string): NeighborhoodFromText | null {
  if (!matches.length) return null;
  const best = [...matches].sort((a, b) => b.chars - a.chars || a.start - b.start)[0]!;
  return { neighborhood: best.name, department };
}
