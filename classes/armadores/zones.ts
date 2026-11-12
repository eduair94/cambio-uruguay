// Las zonas del directorio de armadores. Agrupación EDITORIAL (no oficial) de los 62 barrios INE
// 2011 en las cinco zonas con que la gente busca en Montevideo, más el área metropolitana, porque
// un armador de Ciudad de la Costa o Las Piedras también trabaja en la ciudad.
//
// Espejo en app/utils/armadores.ts (`ARMADOR_ZONE_BARRIOS`); app/tests/unit/armadoresZonesParity
// compara las dos listas. Cada barrio INE está en exactamente una zona (tests/armadores/zones).
import { foldZoneName } from "../propertyzones/names";
import type { ArmadorZone, MontevideoZone } from "./types";

export const MONTEVIDEO_ZONES: readonly MontevideoZone[] = ["centro", "costa-este", "este", "norte", "oeste"];

/** Partes de las etiquetas INE (separadas por coma) más los alias que anuncian los portales. */
export const ZONE_BARRIOS: Readonly<Record<MontevideoZone, readonly string[]>> = Object.freeze({
  centro: [
    "Ciudad Vieja", "Centro", "Barrio Sur", "Cordón", "Palermo", "Parque Rodó", "Aguada", "Tres Cruces",
    "La Comercial", "Villa Muñoz", "Retiro", "La Figurita", "Jacinto Vera",
    "Goes",
  ],
  "costa-este": [
    "Punta Carretas", "Pocitos", "Buceo", "Parque Batlle", "Villa Dolores", "Malvín", "Malvín Norte",
    "Punta Gorda", "Carrasco", "Carrasco Norte",
    "Pocitos Nuevo", "Puerto Buceo", "Villa Biarritz",
  ],
  este: [
    "Bañados de Carrasco", "Maroñas", "Parque Guaraní", "Flor de Maroñas", "Las Canteras", "Punta de Rieles",
    "Bella Italia", "Jardines del Hipódromo", "Ituzaingó", "Unión", "Villa Española", "Mercado Modelo",
    "Bolívar", "Castro", "Pérez Castellanos", "Larrañaga", "La Blanqueada",
    "Cruz de Carrasco", "Curva de Maroñas",
  ],
  norte: [
    "Cerrito", "Las Acacias", "Aires Puros", "Casavalle", "Piedras Blancas", "Manga", "Toledo Chico",
    "Paso de las Duranas", "Peñarol", "Lavalleja", "Prado", "Nueva Savona", "Reducto", "Atahualpa",
    "Brazo Oriental", "Sayago", "Conciliación", "Colón Sureste", "Abayubá", "Colón Centro y Noroeste",
    "Lezica", "Melilla", "Villa García", "Manga Rural",
    "Colón", "Cerrito de la Victoria",
  ],
  oeste: [
    "Cerro", "Casabó", "Pajas Blancas", "La Paloma", "Tomkinson", "La Teja", "Capurro", "Bella Vista",
    "Belvedere", "Nuevo París", "Tres Ombúes", "Pueblo Victoria", "Paso de la Arena",
    "Paso Molino", "Santa Catalina", "Cerro Norte", "Villa del Cerro",
  ],
});

/** Localidades vecinas desde donde los armadores declaran ir a Montevideo. */
export const METRO_LOCALITIES: readonly string[] = [
  "Ciudad de la Costa", "Solymar", "Lomas de Solymar", "Médanos de Solymar", "Lagomar", "El Pinar",
  "Shangrilá", "Parque Miramar", "Barra de Carrasco", "San José de Carrasco", "Parque de Carrasco",
  "Parque Carrasco", "Colinas de Carrasco", "Paso Carrasco", "Paso de Carrasco", "Colonia Nicolich",
  "Las Piedras", "La Paz", "Progreso", "Pando", "Barros Blancos", "Joaquín Suárez", "Toledo",
  "Ciudad del Plata", "Delta del Tigre",
];

let index: Map<string, ArmadorZone> | null = null;
const zoneIndex = (): Map<string, ArmadorZone> => {
  if (index) return index;
  index = new Map();
  for (const zone of MONTEVIDEO_ZONES) for (const name of ZONE_BARRIOS[zone]) index.set(foldZoneName(name), zone);
  for (const name of METRO_LOCALITIES) if (!index.has(foldZoneName(name))) index.set(foldZoneName(name), "metropolitana");
  return index;
};

/** La zona de un barrio o localidad; null si no es Montevideo ni el área metropolitana. */
export function zoneOfBarrio(name: string): ArmadorZone | null {
  const key = foldZoneName(name || "");
  return key ? (zoneIndex().get(key) ?? null) : null;
}

/** La zona de una etiqueta INE compuesta ("Maroñas, Parque Guaraní") por su primera parte. */
export function zoneOfIneLabel(label: string): ArmadorZone | null {
  return zoneOfBarrio(String(label || "").split(", ")[0] ?? "");
}
