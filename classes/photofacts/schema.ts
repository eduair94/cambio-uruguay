// Qué se le pregunta al modelo sobre las fotos de un aviso de vivienda, y cómo se lee lo que contesta.
//
// Las reglas que importan, y por qué:
//  - Cada comodidad se contesta con EL ÍNDICE DE LA FOTO que la muestra, o null. Así lo "visto en las
//    fotos" siempre trae su prueba, que es la condición para publicarlo algún día, y un hecho que sólo
//    sostiene un render no cuenta (InfoCasas le vende a sus anunciantes amueblar ambientes de forma
//    virtual; en el piloto los cuatro modelos dijeron "amueblado" sobre renders).
//  - No hay "no tiene" para las comodidades: que no se vea un parrillero no prueba que no exista (el
//    piloto: 5 de 5 parrilleros declarados no estaban en las primeras seis fotos). Es la misma regla
//    `true | null` de `petsAllowed` (classes/rentals/types.ts).
//  - El mobiliario sí admite "no" (ambientes vacíos), pero sólo con una foto de interior real que lo
//    muestre, y se abstiene entero si el aviso trae algún render.
//  - La pregunta nunca lleva la descripción del aviso: "visto en las fotos" tiene que ser independiente
//    de lo que el aviso dice, o no agrega nada.
//  - Nunca se le pide texto de la foto: ni matrículas, ni teléfonos, ni nombres.

export const PHOTO_FACTS_SCHEMA_VERSION = 1;

export const PHOTO_KINDS = [
  "living",
  "comedor",
  "cocina",
  "bano",
  "dormitorio",
  "balcon_terraza",
  "patio_jardin",
  "parrillero",
  "piscina",
  "garaje",
  "fachada_exterior",
  "vista",
  "plano",
  "amenities_edificio",
  "otro",
  "logo_o_vacia",
] as const;
export type PhotoKind = (typeof PHOTO_KINDS)[number];

export const INTERIOR_KINDS: ReadonlySet<PhotoKind> = new Set(["living", "comedor", "cocina", "bano", "dormitorio"]);
/** Lo que nunca puede ser la portada ni sostener un hecho. */
const NOT_EVIDENCE: ReadonlySet<PhotoKind> = new Set(["plano", "logo_o_vacia"]);
const NOT_COVER: ReadonlySet<PhotoKind> = new Set(["plano", "logo_o_vacia", "vista"]);

export const AMENITY_KEYS = ["balconyTerrace", "patioGarden", "barbecue", "pool", "acUnit", "integratedKitchen"] as const;
export type AmenityKey = (typeof AMENITY_KEYS)[number];

export type FurnitureValue = "si" | "no" | "no_se";

export interface PhotoVerdict {
  /** Posición de la foto entre las que se mandaron (0 = la primera). */
  index: number;
  kind: PhotoKind;
  render: boolean;
  watermark: boolean;
  collage: boolean;
}

export interface PhotoFacts {
  furniture: FurnitureValue;
  /** La foto de interior que sostiene `furniture`; null cuando es "no_se". */
  furniturePhoto: number | null;
  /** Para cada comodidad, la foto donde se ve; null = no se ve (nunca "no tiene"). */
  seen: Record<AmenityKey, number | null>;
}

export interface NormalizedPhotoFacts {
  photos: PhotoVerdict[];
  facts: PhotoFacts;
  cover: number | null;
  note: string;
}

const photoIndex = { type: "integer", nullable: true } as const;

export const PHOTO_FACTS_JSON_SCHEMA = {
  type: "object",
  properties: {
    photos: {
      type: "array",
      items: {
        type: "object",
        properties: {
          i: { type: "integer" },
          kind: { type: "string", enum: [...PHOTO_KINDS] },
          render: { type: "boolean" },
          watermark: { type: "boolean" },
          collage: { type: "boolean" },
        },
        required: ["i", "kind", "render", "watermark", "collage"],
      },
    },
    furniture: { type: "string", enum: ["si", "no", "no_se"] },
    furniturePhoto: photoIndex,
    balconyTerrace: photoIndex,
    patioGarden: photoIndex,
    barbecue: photoIndex,
    pool: photoIndex,
    acUnit: photoIndex,
    integratedKitchen: photoIndex,
    cover: photoIndex,
    note: { type: "string" },
  },
  required: [
    "photos",
    "furniture",
    "furniturePhoto",
    "balconyTerrace",
    "patioGarden",
    "barbecue",
    "pool",
    "acUnit",
    "integratedKitchen",
    "cover",
    "note",
  ],
} as const;

/**
 * Fijo a propósito: va cacheado (classes/anthropic.ts, `cacheSystem`) y cualquier byte que cambie
 * invalida la caché. Lo que varía por aviso va en `photoFactsPrompt`.
 */
export const PHOTO_FACTS_SYSTEM = [
  "Mirás SOLO las fotos de un aviso inmobiliario de Uruguay (alquiler o venta) y contestás en JSON.",
  "Las fotos llegan en orden y se numeran desde 0: la primera es la 0, la segunda la 1, y así.",
  "",
  "Regla de oro: contestá únicamente lo que se ve con claridad. Si una foto no alcanza, no adivines.",
  "No evalúes el estado, la calidad, la limpieza ni posibles defectos de la vivienda. No transcribas",
  "matrículas, teléfonos, nombres, direcciones ni ningún otro texto que aparezca en las fotos.",
  "",
  "1. 'photos': una entrada por foto, con su número 'i' y:",
  "   - 'kind': qué muestra. living, comedor, cocina, bano (baño), dormitorio, balcon_terraza,",
  "     patio_jardin, parrillero, piscina, garaje, fachada_exterior (la casa o el edificio desde afuera),",
  "     vista (lo que se ve por una ventana o desde el balcón, sin el ambiente), plano (un plano o croquis),",
  "     amenities_edificio (gimnasio, salón, lobby u otra área común), otro, logo_o_vacia (un logo, un",
  "     cartel, una imagen vacía o sin contenido de la vivienda).",
  "   - 'render': true si es una imagen generada por computadora, un render 3D o un ambiente amueblado",
  "     virtualmente; false si es una foto real.",
  "   - 'watermark': true si tiene un logo, una marca de agua o texto sobreimpreso (por ejemplo un",
  "     teléfono o el nombre de una inmobiliaria). No transcribas ese texto.",
  "   - 'collage': true si son varias fotos pegadas en una sola imagen.",
  "",
  "2. Comodidades: para cada una, el número de UNA foto real (no render) donde se ve claramente; si no se",
  "   ve en ninguna foto, null. Que no se vea no significa que no exista: en ese caso es null, nunca otra cosa.",
  "   - 'balconyTerrace': un balcón o una terraza de la vivienda.",
  "   - 'patioGarden': un patio o un jardín de la vivienda.",
  "   - 'barbecue': un parrillero o una barbacoa, de la vivienda o del edificio.",
  "   - 'pool': una piscina, de la vivienda o del edificio.",
  "   - 'acUnit': un equipo de aire acondicionado (un split en la pared o un equipo de ventana).",
  "   - 'integratedKitchen': la cocina abierta al living o al comedor, sin pared que los separe.",
  "",
  "3. Mobiliario: 'furniture' es 'si' si las fotos de interior reales muestran la vivienda amueblada para",
  "   vivir (sofá, cama, mesa, sillas), 'no' si muestran los ambientes vacíos, y 'no_se' si no hay fotos de",
  "   interior reales, si son renders o si no queda claro. 'furniturePhoto' es el número de la foto de",
  "   interior que lo muestra, o null cuando es 'no_se'.",
  "",
  "4. 'cover': el número de la foto que mejor muestra la vivienda para usarla de portada: nítida, de un",
  "   ambiente o de la fachada. Nunca un plano, un logo, una vista sola ni un render. null si no hay ninguna.",
  "",
  "5. 'note': una oración neutral en español, de 25 palabras como máximo, que describa qué muestran las",
  "   fotos en conjunto (por ejemplo, qué ambientes aparecen). Sin juicios ni defectos.",
].join("\n");

export function photoFactsPrompt(subject: { vertical: "alquiler" | "venta"; propertyType: string; photoCount: number }): string {
  const what = subject.propertyType && subject.propertyType !== "otro" ? subject.propertyType : "vivienda";
  return (
    `Aviso de ${subject.vertical === "venta" ? "venta" : "alquiler"} de ${what} en Uruguay. ` +
    `Van ${subject.photoCount} fotos, numeradas de 0 a ${subject.photoCount - 1}. Contestá según las reglas.`
  );
}

const isObject = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);

/**
 * Lo que contestó el modelo, en la forma que se guarda. Todo índice fuera de rango se descarta, un
 * hecho que sólo sostiene un render, un plano o un logo no cuenta, y la portada nunca es un plano,
 * un logo, una vista ni un render. `null` si la respuesta no es un objeto.
 */
export function normalizePhotoFacts(raw: unknown, photoCount: number): NormalizedPhotoFacts | null {
  if (!isObject(raw)) return null;
  const byIndex = new Map<number, PhotoVerdict>();
  for (const item of Array.isArray(raw.photos) ? raw.photos : []) {
    if (!isObject(item)) continue;
    const index = item.i;
    if (typeof index !== "number" || !Number.isInteger(index) || index < 0 || index >= photoCount || byIndex.has(index)) continue;
    const kind = (PHOTO_KINDS as readonly string[]).includes(String(item.kind)) ? (item.kind as PhotoKind) : "otro";
    byIndex.set(index, { index, kind, render: item.render === true, watermark: item.watermark === true, collage: item.collage === true });
  }
  const photos = [...byIndex.values()].sort((a, b) => a.index - b.index);
  const evidence = (value: unknown, accept: (photo: PhotoVerdict) => boolean): number | null => {
    if (typeof value !== "number" || !Number.isInteger(value)) return null;
    const photo = byIndex.get(value);
    return photo && !photo.render && !NOT_EVIDENCE.has(photo.kind) && accept(photo) ? value : null;
  };
  const seen = Object.fromEntries(AMENITY_KEYS.map(key => [key, evidence(raw[key], () => true)])) as Record<AmenityKey, number | null>;

  const anyRender = photos.some(photo => photo.render);
  const claimed = raw.furniture === "si" || raw.furniture === "no" ? (raw.furniture as FurnitureValue) : "no_se";
  const furniturePhoto = claimed === "no_se" || anyRender ? null : evidence(raw.furniturePhoto, photo => INTERIOR_KINDS.has(photo.kind));
  const furniture: FurnitureValue = furniturePhoto === null ? "no_se" : claimed;

  const coverPhoto = typeof raw.cover === "number" ? byIndex.get(raw.cover) : undefined;
  const cover = coverPhoto && !coverPhoto.render && !NOT_COVER.has(coverPhoto.kind) ? coverPhoto.index : null;
  const note = String(raw.note ?? "").replace(/\s+/g, " ").trim().slice(0, 200);
  return { photos, facts: { furniture, furniturePhoto, seen }, cover, note };
}
