/**
 * How the 62 INE 2011 barrios are written for people. The DBF truncates to 25 characters and drops
 * accents ("Pque. Batlle, V. Dolores", "Villa Garcia, Manga Rur."); the code is what identifies the
 * area, this is only its label.
 */
export const INE_DISPLAY_NAMES: Readonly<Record<string, string>> = Object.freeze({
  "1": "Ciudad Vieja", "2": "Centro", "3": "Barrio Sur", "4": "Cordón", "5": "Palermo", "6": "Parque Rodó",
  "7": "Punta Carretas", "8": "Pocitos", "9": "Buceo", "10": "Parque Batlle, Villa Dolores", "11": "Malvín",
  "12": "Malvín Norte", "13": "Punta Gorda", "14": "Carrasco", "15": "Carrasco Norte", "16": "Bañados de Carrasco",
  "17": "Maroñas, Parque Guaraní", "18": "Flor de Maroñas", "19": "Las Canteras", "20": "Punta de Rieles, Bella Italia",
  "21": "Jardines del Hipódromo", "22": "Ituzaingó", "23": "Unión", "24": "Villa Española", "25": "Mercado Modelo, Bolívar",
  "26": "Castro, Pérez Castellanos", "27": "Cerrito", "28": "Las Acacias", "29": "Aires Puros", "30": "Casavalle",
  "31": "Piedras Blancas", "32": "Manga, Toledo Chico", "33": "Paso de las Duranas", "34": "Peñarol, Lavalleja",
  "35": "Cerro", "36": "Casabó, Pajas Blancas", "37": "La Paloma, Tomkinson", "38": "La Teja", "39": "Prado, Nueva Savona",
  "40": "Capurro, Bella Vista", "41": "Aguada", "42": "Reducto", "43": "Atahualpa", "44": "Jacinto Vera", "45": "La Figurita",
  "46": "Larrañaga", "47": "La Blanqueada", "48": "Villa Muñoz, Retiro", "49": "La Comercial", "50": "Tres Cruces",
  "51": "Brazo Oriental", "52": "Sayago", "53": "Conciliación", "54": "Belvedere", "55": "Nuevo París",
  "56": "Tres Ombúes, Pueblo Victoria", "57": "Paso de la Arena", "58": "Colón Sureste, Abayubá",
  "59": "Colón Centro y Noroeste", "60": "Lezica, Melilla", "61": "Villa García, Manga Rural", "62": "Manga",
});

/** Case, accents and punctuation are not identity; words are. */
export const foldZoneName = (value: string): string =>
  value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
