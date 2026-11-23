// Cuentas de Instagram que aparecen en la web, por búsqueda con Gemini (google_search). La razón
// de existir: con Reddit y Uruguay Emprendedor la primera corrida de producción (23/11/2026) dejó 180
// candidatas y 13 publicadas, y el pedido es encontrar muchas más.
//
// Medido el 23/11/2026: una consulta por producto y lugar devuelve de 2 a 9 cuentas en el texto
// («ropa de segunda mano»: 9, «velas artesanales»: 2), en ~5 s. Las fuentes que cita casi nunca son
// perfiles de Instagram (redirigen a notas y directorios), así que las cuentas se toman del TEXTO de
// la respuesta. Puede inventar alguna: no importa, porque ninguna fuente publica sola — toda cuenta
// se lee en Instagram (una inventada contesta "no existe") y se clasifica.
//
// Gemini y no Claude: `classes/llm.ts` manda la búsqueda a Claude cuando ANTHROPIC_GROUNDED=1 (así
// está el VPS desde el 22/11) y cada búsqueda de Claude cuesta; acá rinde la cantidad, no la calidad
// de una cifra, y la cuota gratuita de Gemini alcanza.
import { askGrounded } from "../../gemini";
import { instagramLinksIn, mentionsIn } from "../handles";
import type { SourceRef } from "../types";

/** Lo que se busca: productos concretos (lo que la gente escribe), no los nombres de los rubros. */
export const WEB_PRODUCTS: readonly string[] = Object.freeze([
  "tortas por encargo", "alfajores artesanales", "budines y panificados", "viandas caseras", "comida vegana", "postres y mesas dulces",
  "galletitas decoradas", "chocolates artesanales", "mates personalizados", "bombillas y termos", "yerba y hierbas", "cerveza artesanal",
  "ropa de segunda mano", "ropa de mujer", "ropa de diseño uruguayo", "lencería", "mallas y bikinis", "ropa para hombre",
  "bijouterie", "joyas de plata", "carteras y bolsos de cuero", "tote bags personalizadas", "gorros y bufandas tejidas", "accesorios para el pelo",
  "cosmética natural", "jabones artesanales", "velas artesanales", "aromas y difusores", "skincare", "perfumes",
  "deco y hogar", "cerámica artesanal", "almohadones y textiles", "cuadros y láminas", "macramé", "muebles de pallets",
  "tarjetas y papelería", "agendas personalizadas", "stickers", "souvenirs y cotillón", "cajas de regalo", "regalos personalizados",
  "porcelana fría", "crochet y amigurumis", "bordados", "ilustraciones", "figuras pintadas a mano", "resina epoxi",
  "impresión 3D", "corte y grabado láser", "llaveros personalizados", "juguetes didácticos de madera", "ropa de bebé", "cumpleaños infantiles",
  "accesorios para mascotas", "comida natural para perros", "plantas y suculentas", "macetas", "terrarios", "huerta orgánica",
  "accesorios para celular", "juegos de mesa", "artículos de pesca", "ropa deportiva", "detailing de autos", "cuchillos artesanales",
  "fotografía de eventos", "decoración de eventos", "catering", "talleres de cerámica", "uñas y manicura", "tatuajes",
]);

export const WEB_PLACES: readonly string[] = Object.freeze([
  "Montevideo", "Uruguay", "Canelones", "Ciudad de la Costa", "Maldonado", "Punta del Este", "Las Piedras", "Salto", "Paysandú",
  "Colonia", "Rivera", "Tacuarembó", "Mercedes", "Florida", "Rocha", "San José", "Durazno", "Minas", "Melo", "Artigas", "Treinta y Tres",
  "Fray Bentos", "Trinidad", "Pando", "Atlántida", "Carrasco", "Pocitos", "Cordón", "Malvín", "Prado",
]);

/** Las cuentas que juntan a otras: ferias, mercados, tiendas colectivas, redes. Rinden por la bola de nieve. */
const CURATOR_TOPICS: readonly string[] = Object.freeze([
  "ferias de emprendedores", "ferias de diseño y mercados de pulgas", "tiendas que reúnen marcas locales", "redes y comunidades de emprendedores",
  "ferias de artesanos", "mercados de productores y ferias orgánicas",
]);

export interface WebQuery {
  kind: "producto" | "curadoras";
  text: string;
}

/**
 * La rotación completa: cada producto en cada lugar, intercalando una búsqueda de curadoras cada
 * cinco. Determinista: el cursor de la meta dice por dónde se va, y al terminar vuelve a empezar.
 * Los lugares van por fuera (primero todos los productos en Montevideo y en Uruguay), porque ahí
 * está la mayor parte.
 */
export function webQueries(): WebQuery[] {
  const out: WebQuery[] = [];
  let curator = 0;
  for (const place of WEB_PLACES) {
    for (const product of WEB_PRODUCTS) {
      out.push({ kind: "producto", text: `${product} en ${place}` });
      // Cada combinación de curadoras (tema × lugar) una sola vez: después sólo productos.
      if (out.length % 5 === 0 && curator < CURATOR_TOPICS.length * WEB_PLACES.length) {
        const topic = CURATOR_TOPICS[curator % CURATOR_TOPICS.length]!;
        const where = WEB_PLACES[Math.floor(curator / CURATOR_TOPICS.length) % WEB_PLACES.length]!;
        out.push({ kind: "curadoras", text: `${topic} en ${where}` });
        curator++;
      }
    }
  }
  return out;
}

export function webPrompt(query: WebQuery): string {
  const what =
    query.kind === "curadoras"
      ? `cuentas de Instagram de ${query.text}, Uruguay, que muestren o etiqueten a emprendimientos locales`
      : `cuentas de Instagram de emprendimientos uruguayos que vendan ${query.text}, Uruguay`;
  return [
    `Buscá en la web ${what}.`,
    "Devolvé sólo cuentas que existan y sean de Uruguay, una por línea, con el formato: @usuario — nombre.",
    "Si no encontrás ninguna, devolvé una línea vacía. No inventes cuentas.",
  ].join("\n");
}

/** Las cuentas que una respuesta nombra: enlaces a instagram.com y @menciones, una vez cada una. */
export function handlesFromReply(text: string, sourceUris: readonly string[]): string[] {
  const out: string[] = [];
  for (const handle of [...instagramLinksIn([text, ...sourceUris].join("\n")), ...mentionsIn(text)]) {
    if (!out.includes(handle)) out.push(handle);
  }
  return out.slice(0, 25);
}

export interface WebFind {
  handle: string;
  source: SourceRef;
}

export type Grounded = (prompt: string) => Promise<{ text: string; sourceUris: string[] } | null>;

/** Corre `count` consultas desde `cursor`. Devuelve las cuentas, el cursor nuevo y cuántas contestaron. */
export async function readWeb(cursor: number, count: number, day: string, ask: Grounded = askGrounded): Promise<{ finds: WebFind[]; cursor: number; asked: number; answered: number }> {
  const queries = webQueries();
  const finds: WebFind[] = [];
  let answered = 0;
  let at = cursor % queries.length;
  for (let i = 0; i < count; i++) {
    const query = queries[at]!;
    at = (at + 1) % queries.length;
    let reply: { text: string; sourceUris: string[] } | null = null;
    try {
      reply = await ask(webPrompt(query));
    } catch {
      reply = null;
    }
    if (!reply) continue;
    answered++;
    for (const handle of handlesFromReply(reply.text, reply.sourceUris)) {
      if (finds.some(find => find.handle === handle)) continue;
      finds.push({ handle, source: { kind: "web", day, label: query.text.slice(0, 120), text: `búsqueda: ${query.text}` } });
    }
  }
  return { finds, cursor: at, asked: count, answered };
}
