// Los rubros del directorio de /emprendimientos-de-instagram-uruguay. Es la lista que la IA tiene
// que usar (un rubro que no está acá se descarta) y la que dibuja el app: el espejo vive en
// `app/utils/emprendimientos.ts` y `app/tests/unit/emprendimientosTaxonomyParity.test.ts` exige las
// mismas claves en el mismo orden.
//
// Por qué estos y no los de un marketplace: salen de lo que venden las cuentas que vinieron en las
// semillas (hilo de r/uruguay del 21/5/2026, Uruguay Emprendedor, las colaboraciones de las cuentas
// curadoras) — tortas, mates, tote bags, porcelana fría, figuras pintadas, impresión 3D, detailing,
// ropa de segunda mano. "Impresión 3D y láser" va aparte porque es un rubro en sí mismo en Uruguay
// (souvenirs, deco, repuestos) y se perdería adentro de "regalos" o "arte".

export interface Rubro {
  slug: string;
  label: string;
  /** Lo que la IA lee para decidir: ejemplos concretos, no una definición. */
  hint: string;
}

export const RUBROS: readonly Rubro[] = Object.freeze([
  { slug: "comida", label: "Comida y dulces", hint: "tortas, pastelería, alfajores, panificados, viandas, comida casera, hamburguesas, budines" },
  { slug: "mate-y-bebidas", label: "Mate y bebidas", hint: "mates, bombillas, termos, yerba, vinos, cervezas, licores o cafés artesanales" },
  { slug: "ropa", label: "Ropa y moda", hint: "ropa nueva, ropa de segunda mano, lencería, mallas, ropa a medida" },
  { slug: "accesorios", label: "Accesorios y bijouterie", hint: "bijou, joyas, carteras, bolsos, tote bags, gorros, bufandas, lentes, relojes" },
  { slug: "belleza", label: "Belleza y cuidado personal", hint: "cosmética natural, jabones, sales, perfumes, skincare, maquillaje" },
  { slug: "hogar-y-deco", label: "Hogar y deco", hint: "velas, aromas, textiles, almohadones, cerámica utilitaria, cuadros deco, muebles chicos" },
  { slug: "regalos-y-papeleria", label: "Regalos y papelería", hint: "tarjetas, pop-up, agendas, stickers, souvenirs, cajas de regalo, cotillón, personalizados" },
  { slug: "arte-y-artesanias", label: "Arte y artesanías", hint: "ilustración, pintura, tejido, crochet, bordado, porcelana fría, macramé, figuras pintadas a mano" },
  { slug: "impresion-3d-y-laser", label: "Impresión 3D y láser", hint: "impresión 3D, grabado y corte láser, figuras impresas, llaveros, piezas a medida" },
  { slug: "ninos", label: "Niños y bebés", hint: "juguetes, didácticos, ropa de bebé, cumpleaños infantiles, porteo" },
  { slug: "mascotas", label: "Mascotas", hint: "accesorios para perros y gatos, comida natural, camas, collares, peluquería canina" },
  { slug: "plantas", label: "Plantas y jardín", hint: "plantas, suculentas, cactus, macetas, huerta, semillas, terrarios" },
  { slug: "tecnologia", label: "Tecnología y gaming", hint: "accesorios de celular, gaming, juegos de mesa, electrónica armada a mano, fundas" },
  { slug: "deporte", label: "Deporte y aire libre", hint: "ropa deportiva, equipamiento, camping, pesca, bicicletas, surf" },
  { slug: "autos-y-motos", label: "Autos y motos", hint: "detailing, limpieza, accesorios y repuestos para auto o moto" },
  { slug: "servicios", label: "Servicios y eventos", hint: "fotografía, diseño, decoración de eventos, catering, talleres y clases, arreglos" },
  { slug: "otros", label: "Otros", hint: "lo que no entra en ninguno de los anteriores" },
]);

export const RUBRO_SLUGS: readonly string[] = Object.freeze(RUBROS.map(rubro => rubro.slug));
const RUBRO_SET = new Set(RUBRO_SLUGS);
export const isRubro = (value: unknown): value is string => typeof value === "string" && RUBRO_SET.has(value);

/** Los 19 departamentos con su slug de URL (el app usa el mismo, `?depto=`). */
export const DEPARTAMENTOS: readonly { slug: string; label: string }[] = Object.freeze([
  { slug: "artigas", label: "Artigas" },
  { slug: "canelones", label: "Canelones" },
  { slug: "cerro-largo", label: "Cerro Largo" },
  { slug: "colonia", label: "Colonia" },
  { slug: "durazno", label: "Durazno" },
  { slug: "flores", label: "Flores" },
  { slug: "florida", label: "Florida" },
  { slug: "lavalleja", label: "Lavalleja" },
  { slug: "maldonado", label: "Maldonado" },
  { slug: "montevideo", label: "Montevideo" },
  { slug: "paysandu", label: "Paysandú" },
  { slug: "rio-negro", label: "Río Negro" },
  { slug: "rivera", label: "Rivera" },
  { slug: "rocha", label: "Rocha" },
  { slug: "salto", label: "Salto" },
  { slug: "san-jose", label: "San José" },
  { slug: "soriano", label: "Soriano" },
  { slug: "tacuarembo", label: "Tacuarembó" },
  { slug: "treinta-y-tres", label: "Treinta y Tres" },
]);

const DEPTO_BY_LABEL = new Map(DEPARTAMENTOS.map(d => [d.label, d.slug]));
const DEPTO_SET = new Set(DEPARTAMENTOS.map(d => d.slug));
export const isDepartamento = (value: unknown): value is string => typeof value === "string" && DEPTO_SET.has(value);
/** "Paysandú" (la grafía de classes/rentals/normalize.ts) → "paysandu". */
export const departamentoSlugOf = (label: string | null | undefined): string | null => (label ? (DEPTO_BY_LABEL.get(label) ?? null) : null);
