import { foldText } from "./parse";

/**
 * Which INE 2011 barrios of Montevideo an OSE notice NAMES. Only explicit mentions count:
 *
 * - one reviewed spelling list per barrio (INE parts expanded: "Pque." → "parque", "Pta." → "punta");
 * - a part shared by several barrios, or that is also a common street name ("Bolívar", "Lavalleja",
 *   "Retiro", "Victoria"), is left out; "Colón" alone spans two INE barrios and is never assigned;
 * - once a clause turns into a street description ("calles", "entre", "desde", "Av.", "Cno."…) the
 *   rest of that clause is streets, so "Av. Lezica" or "Cno. Carrasco" never become barrios;
 * - longer names win ("Malvín Norte" is not also "Malvín"; "Flor de Maroñas" is not "Maroñas").
 *
 * About a quarter of the notices only list streets and stay unassigned: the page counts them.
 */
export const OSE_MATCH_VERSION = 1;

const VARIANTS: Record<string, string[]> = {
  "1": ["ciudad vieja"], "2": ["centro"], "3": ["barrio sur"], "4": ["cordon"], "5": ["palermo"], "6": ["parque rodo"],
  "7": ["punta carretas"], "8": ["pocitos"], "9": ["buceo"], "10": ["parque batlle", "villa dolores"], "11": ["malvin"],
  "12": ["malvin norte"], "13": ["punta gorda"], "14": ["carrasco"], "15": ["carrasco norte"], "16": ["banados de carrasco"],
  "17": ["maronas", "parque guarani"], "18": ["flor de maronas"], "19": ["las canteras"],
  "20": ["punta de rieles", "punta rieles", "bella italia"], "21": ["jardines del hipodromo"], "22": ["ituzaingo"],
  "23": ["union"], "24": ["villa espanola"], "25": ["mercado modelo"], "26": ["castro"], "27": ["cerrito"],
  "28": ["las acacias"], "29": ["aires puros"], "30": ["casavalle"], "31": ["piedras blancas"], "32": ["toledo chico"],
  "33": ["paso de las duranas"], "34": ["penarol"], "35": ["cerro"], "36": ["casabo", "pajas blancas"],
  "37": ["la paloma", "tomkinson"], "38": ["la teja"], "39": ["prado", "nueva savona"], "40": ["capurro", "bella vista"],
  "41": ["aguada"], "42": ["reducto"], "43": ["atahualpa"], "44": ["jacinto vera"], "45": ["la figurita", "figurita"],
  "46": ["larranaga"], "47": ["la blanqueada"], "48": ["villa munoz"], "49": ["la comercial"], "50": ["tres cruces"],
  "51": ["brazo oriental"], "52": ["sayago"], "53": ["conciliacion"], "54": ["belvedere"], "55": ["nuevo paris"],
  "56": ["tres ombues", "pueblo victoria"], "57": ["paso de la arena"], "58": ["colon sureste", "abayuba"],
  "59": ["colon centro", "colon noroeste"], "60": ["lezica", "melilla"], "61": ["villa garcia", "manga rural"], "62": ["manga"],
};
const ENTRIES = Object.entries(VARIANTS)
  .flatMap(([code, names]) => names.map(name => ({ code, name })))
  .sort((a, b) => b.name.length - a.name.length);
const STREET_CONTEXT = /(?:^|[^a-z0-9])(?:calles?|entre|desde|hasta|frentistas?|delimitad[oa]s?|comprendid[oa]s?|esquina|esq|avd?a?|avenida|bvar|br|bulevar|cno|camino|rambla|ruta|pasaje|psje|gral|dr|ing)(?![a-z0-9])/;

/** INE codes (as strings) explicitly named in the notice's zone text, in code order. */
export function ineCodesInText(zoneText: string): string[] {
  const found = new Set<string>();
  for (const rawClause of zoneText.split(/[\n;|]+/)) {
    let clause = ` ${foldText(rawClause)} `;
    const street = STREET_CONTEXT.exec(clause);
    if (street) clause = clause.slice(0, street.index + 1);
    for (const { code, name } of ENTRIES) {
      const pattern = new RegExp(`(^|[^a-z0-9#])${name.replace(/ /g, " ")}(?=[^a-z0-9]|$)`, "g");
      clause = clause.replace(pattern, (whole, before: string) => {
        found.add(code);
        return before + "#".repeat(whole.length - before.length);
      });
    }
  }
  return [...found].sort((a, b) => Number(a) - Number(b));
}
