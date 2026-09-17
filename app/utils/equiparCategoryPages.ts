// Contenido y FAQ por categoría de /equipar-casa-uruguay/<categoria> (Task 8).
//
// `app/utils` es un namespace de auto-import PLANO: cada export lleva el prefijo `equipar`/`EQUIPAR_`
// para no chocar con otra página. Este archivo es el ESPEJO A MANO de `classes/equipar/registry.ts`
// (mismas claves, mismo orden, mismo `tier`/`room`/`label`) — los dos paquetes compilan bajo
// tsconfigs separados y no pueden compartir un módulo. `tests/equipar/app_mirror_parity.test.ts`
// (raíz) vigila que no se desincronicen. Cambiá los dos juntos.
//
// Lo que agrega este archivo sobre el registro (que sólo sabe scrapear y tildear necesidad) es
// copy editorial: título SEO, guía "qué mirar al comprar" (afirmaciones generales, sin cifras
// propias), aplicabilidad del Plan Redondo de UTE (verificado en ute.com.uy el 16/9/2026) y un
// generador de FAQ que arma las respuestas con los datos relevados de cada categoría.

import type { EquiparBand, EquiparItemDoc, EquiparOffer, EquiparRoom, EquiparTier } from './equipar'
import { equiparMoney } from './equipar'
import { UTE_IVA_RATE, UTE_TARIFFS } from './householdBills'
import { dateLocale } from './format'

export interface EquiparCategoryPage {
  key: string
  label: string
  plural: string
  h1: string
  description: string
  room: EquiparRoom
  tier: EquiparTier
  /**
   * Espejo de `usedOk`/`usedNote` en `classes/equipar/registry.ts`: es un juicio editorial de la
   * CATEGORÍA (¿tiene sentido comprarla usada?), no un dato de la corrida. El FAQ lee estos dos
   * campos siempre desde acá — nunca desde si la corrida de hoy trajo o no items — porque una
   * categoría sin datos hoy no es lo mismo que una categoría donde el usado no conviene.
   */
  usedOk: boolean
  usedNote: string | null
  /** "Qué mirar al comprar": afirmaciones generales verificables, sin cifras propias. */
  guide: readonly string[] | null
  /** Aplica / no aplica al Plan Redondo de UTE, con su condición. */
  planRedondo: string | null
  /** Sólo estufa/ventilador: W de ejemplo para el costo por hora. */
  wattsExample: number | null
}

/** Fuente y fecha de verificación de todo lo que dice `planRedondo` en este archivo. */
export const EQUIPAR_PLAN_REDONDO_SOURCE =
  'https://www.ute.com.uy/clientes/soluciones-para-el-hogar/planredondo'

/**
 * Ventana de compras del Plan Redondo y fecha en que se verificó en la fuente, ya escritas como las
 * lee la página (d/m/aaaa). Una sola copia: la usan el FAQ de abajo y la sección de
 * `pages/equipar-casa-uruguay/[categoria].vue`. Revisar después del 31/3/2027.
 */
export const EQUIPAR_PLAN_REDONDO_WINDOW = {
  from: '1/9/2026',
  to: '31/3/2027',
  verifiedAt: '16/9/2026',
} as const

/**
 * El orden de este array es el mismo que `classes/equipar/registry.ts::EQUIPAR_CATEGORIES`: la
 * prueba de paridad de la raíz compara claves, orden, `tier`, `room` y `label` uno a uno.
 */
export const EQUIPAR_CATEGORY_PAGES: readonly EquiparCategoryPage[] = [
  {
    key: 'heladera',
    label: 'Heladera',
    plural: 'heladeras',
    h1: 'Precio de heladeras en Uruguay',
    description:
      'Precios de heladeras nuevas y usadas en tiendas uruguayas y Mercado Libre: mediana por tamaño y qué revisar antes de comprar una.',
    room: 'cocina',
    tier: 'S',
    usedOk: true,
    usedNote:
      'Usada conviene, pero pedí verla enfriando: el compresor es lo que se muere y no se ve en la foto.',
    guide: [
      'Frío húmedo o frío seco (no frost): el no frost no junta hielo y suele costar más.',
      'Los litros del aviso son totales: incluyen el freezer.',
      'Mirá la etiqueta de eficiencia energética: en Uruguay es obligatoria para heladeras y la clase A es la que menos consume.',
      'Medí el hueco y dejá espacio atrás y arriba para que el motor ventile; el manual dice cuánto.',
      'Usada conviene sólo si la ves enfriando: el compresor es lo que falla y no se ve en una foto.',
    ],
    planRedondo: null,
    wattsExample: null,
  },
  {
    key: 'colchon',
    label: 'Colchón',
    plural: 'colchones',
    h1: 'Precio de colchones en Uruguay',
    description:
      'Precios de colchones en Uruguay por medida, con la mediana relevada y por qué comprar uno usado no es un buen ahorro acá.',
    room: 'dormitorio',
    tier: 'S',
    usedOk: false,
    usedNote:
      'Es la única compra de esta lista donde el usado no se recomienda: chinches, ácaros y un hundimiento que no se ve hasta que dormís encima.',
    guide: [
      'Espuma o resortes: en espuma mirá la densidad; en resortes, si son independientes (pocket) o de bloque.',
      'Medidas habituales: 1 plaza 80 u 88 × 190 cm, 2 plazas 140 × 190 cm, queen 160 × 200 cm, king 200 × 200 cm. Confirmá la de tu cama.',
      'No lo compres usado: es el único ítem de esta lista donde lo barato es el mal consejo.',
    ],
    planRedondo: null,
    wattsExample: null,
  },
  {
    key: 'lavarropas',
    label: 'Lavarropas',
    plural: 'lavarropas',
    h1: 'Precio de lavarropas en Uruguay',
    description:
      'Precios de lavarropas nuevos y usados en Uruguay, por tipo de carga, con la mediana relevada y qué mirar antes de elegir uno.',
    room: 'limpieza',
    tier: 'A',
    usedOk: true,
    usedNote:
      'Usado es común y sano; pedí verlo centrifugando, que es donde aparecen los rulemanes gastados.',
    guide: [
      'Carga frontal o superior: la frontal suele gastar menos agua; la superior no te obliga a agacharte.',
      'Los kilos son de ropa seca: para una o dos personas alcanza con 6 a 7 kg.',
      'Más revoluciones de centrifugado dejan la ropa más seca.',
      'Semiautomático o doble cuba no es lo mismo que automático: hay pasos que se hacen a mano, y por eso no entran en esta comparación.',
    ],
    planRedondo: 'Sólo el lavasecarropas entra ($ 2.500, IVA incluido). Un lavarropas común no.',
    wattsExample: null,
  },
  {
    key: 'cocina',
    label: 'Cocina o anafe',
    plural: 'cocinas y anafes',
    h1: 'Precio de cocinas y anafes en Uruguay',
    description:
      'Precios de cocinas y anafes en Uruguay, con la mediana relevada por tipo y qué diferencia una cocina a gas de una eléctrica.',
    room: 'cocina',
    tier: 'S',
    usedOk: true,
    usedNote:
      'El supergas de la garrafa de 13 kg tiene precio regulado y va aparte: no se compra con la cocina.',
    guide: [
      'Supergás (garrafa) o gas natural por cañería: la conexión es distinta, confirmala antes de comprar.',
      'Buscá termocupla: corta el gas si la llama se apaga.',
      'Las de inducción necesitan ollas que sirvan para inducción.',
    ],
    planRedondo:
      'Sólo las totalmente eléctricas: anafes de inducción o resistivos de 2 hornallas o más, y hornos eléctricos empotrables de 55 litros o más: $ 2.500 (IVA incluido). A gas no entra.',
    wattsExample: null,
  },
  {
    key: 'calefon',
    label: 'Calefón',
    plural: 'calefones',
    h1: 'Precio de calefones en Uruguay',
    description:
      'Precios de calefones en Uruguay por capacidad en litros, con la mediana relevada y el descuento de UTE para los más eficientes.',
    room: 'bano',
    tier: 'S',
    usedOk: true,
    usedNote: null,
    guide: [
      'Más personas, más litros: un calefón chico se queda sin agua caliente en la segunda ducha.',
      'La etiqueta de eficiencia energética es obligatoria: la clase A pierde menos calor.',
      'Cuba de acero, esmaltada o de cobre: cambia la duración en zonas de agua dura.',
      'Los calefones instantáneos a gas son otro producto y no están en esta comparación.',
    ],
    planRedondo:
      'Si es de 40 litros o más y clase A, UTE descuenta $ 2.500 (IVA incluido) en la factura; si es con bomba de calor, $ 5.000.',
    wattsExample: null,
  },
  {
    key: 'microondas',
    label: 'Microondas',
    plural: 'microondas',
    h1: 'Precio de microondas en Uruguay',
    description:
      'Precios de microondas en Uruguay por capacidad, con la mediana relevada y la diferencia entre uno con grill y uno sin grill.',
    room: 'cocina',
    tier: 'A',
    usedOk: true,
    usedNote: null,
    guide: [
      '20 litros alcanzan para calentar; para platos grandes, 25 a 30 litros.',
      'Con grill dora; sin grill sólo calienta.',
      'Digital o mecánico: el mecánico tiene menos que romperse.',
    ],
    planRedondo: 'Los microondas están excluidos del plan.',
    wattsExample: null,
  },
  {
    key: 'tv',
    label: 'Televisor',
    plural: 'televisores',
    h1: 'Precio de televisores en Uruguay',
    description:
      'Precios de televisores en Uruguay por tamaño de pantalla, con la mediana relevada y qué mirar antes de elegir el tuyo.',
    room: 'living',
    tier: 'B',
    usedOk: true,
    usedNote: null,
    guide: [
      'Las pulgadas se eligen por la distancia al sillón: a más distancia, más pantalla.',
      '4K empieza a notarse desde 43 o 50 pulgadas.',
      'Fijate el sistema (Google TV, webOS, Tizen u otro): define qué aplicaciones podés instalar.',
      'Garantía oficial o importado: el precio más bajo a veces es un equipo sin garantía en Uruguay.',
    ],
    planRedondo: null,
    wattsExample: null,
  },
  {
    key: 'aire-acondicionado',
    label: 'Aire acondicionado',
    plural: 'aires acondicionados',
    h1: 'Precio de aire acondicionado en Uruguay: 9.000, 12.000 y 18.000 BTU',
    description:
      'Precios de aires acondicionados en Uruguay por potencia en BTU, con la mediana relevada y si conviene uno frío/calor o portátil.',
    room: 'living',
    tier: 'B',
    usedOk: true,
    usedNote: 'Sumale la instalación: no es un electrodoméstico que se enchufa.',
    guide: [
      'Los BTU dependen del ambiente: tamaño, orientación, aislación y altura del techo. Pedile al instalador que lo calcule para tu cuarto.',
      'Inverter regula la potencia del compresor: cuesta más y consume menos si lo usás muchas horas.',
      'Frío/calor sirve de calefacción en invierno.',
      'El precio publicado casi nunca incluye la instalación (caños, soporte, mano de obra): preguntá antes de comparar.',
      'Un portátil no necesita instalación, pero enfría menos y hace más ruido que un split de los mismos BTU.',
    ],
    planRedondo:
      'Si es clase A en frío y en calor, UTE descuenta $ 2.500 (IVA incluido) en la factura.',
    wattsExample: null,
  },
  {
    key: 'ropero',
    label: 'Ropero o placard',
    plural: 'roperos y placares',
    h1: 'Precio de roperos y placares en Uruguay',
    description:
      'Precios de roperos y placares en Uruguay por cantidad de puertas, con la mediana relevada en tiendas y Mercado Libre.',
    room: 'dormitorio',
    tier: 'A',
    usedOk: true,
    usedNote: null,
    guide: null,
    planRedondo: null,
    wattsExample: null,
  },
  {
    key: 'mesa-sillas',
    label: 'Mesa con sillas',
    plural: 'juegos de mesa y sillas',
    h1: 'Precio de juego de mesa y sillas en Uruguay',
    description:
      'Precios de juegos de mesa con sillas en Uruguay, con la mediana relevada por cantidad de sillas para el comedor.',
    room: 'living',
    tier: 'A',
    usedOk: true,
    usedNote: null,
    guide: null,
    planRedondo: null,
    wattsExample: null,
  },
  {
    key: 'sofa',
    label: 'Sofá',
    plural: 'sofás',
    h1: 'Precio de sofás en Uruguay',
    description:
      'Precios de sofás en Uruguay por tamaño, con la mediana relevada en tiendas y Mercado Libre para amueblar el living.',
    room: 'living',
    tier: 'B',
    usedOk: true,
    usedNote: null,
    guide: null,
    planRedondo: null,
    wattsExample: null,
  },
  {
    key: 'olla',
    label: 'Olla',
    plural: 'ollas',
    h1: 'Precio de ollas en Uruguay',
    description:
      'Precios de ollas en Uruguay por tamaño, con la mediana relevada y por qué conviene priorizar pocas y buenas antes que muchas.',
    room: 'cocina',
    tier: 'S',
    usedOk: true,
    usedNote: null,
    guide: null,
    planRedondo: null,
    wattsExample: null,
  },
  {
    key: 'sarten',
    label: 'Sartén',
    plural: 'sartenes',
    h1: 'Precio de sartenes en Uruguay',
    description:
      'Precios de sartenes en Uruguay por tamaño, con la mediana relevada en tiendas y Mercado Libre para la cocina de todos los días.',
    room: 'cocina',
    tier: 'S',
    usedOk: true,
    usedNote: null,
    guide: null,
    planRedondo: null,
    wattsExample: null,
  },
  {
    key: 'cuchillo',
    label: 'Cuchillo de cocina',
    plural: 'cuchillos de cocina',
    h1: 'Precio de cuchillos de cocina en Uruguay',
    description:
      'Precios de cuchillos de cocina en Uruguay, con la mediana relevada y por qué uno bueno reemplaza a varios cuchillos malos.',
    room: 'cocina',
    tier: 'S',
    usedOk: false,
    usedNote: null,
    guide: null,
    planRedondo: null,
    wattsExample: null,
  },
  {
    key: 'cubiertos',
    label: 'Cubiertos',
    plural: 'juegos de cubiertos',
    h1: 'Precio de cubiertos en Uruguay',
    description:
      'Precios de juegos de cubiertos en Uruguay por cantidad de servicios, con la mediana relevada en tiendas y Mercado Libre.',
    room: 'cocina',
    tier: 'S',
    usedOk: true,
    usedNote: null,
    guide: null,
    planRedondo: null,
    wattsExample: null,
  },
  {
    key: 'vajilla',
    label: 'Platos',
    plural: 'juegos de platos',
    h1: 'Precio de platos en Uruguay',
    description:
      'Precios de juegos de platos en Uruguay por cantidad de servicios, con la mediana relevada en tiendas y Mercado Libre.',
    room: 'cocina',
    tier: 'S',
    usedOk: true,
    usedNote: null,
    guide: null,
    planRedondo: null,
    wattsExample: null,
  },
  {
    key: 'vasos',
    label: 'Vasos',
    plural: 'juegos de vasos',
    h1: 'Precio de vasos en Uruguay',
    description:
      'Precios de juegos de vasos en Uruguay por cantidad de piezas, con la mediana relevada en tiendas y Mercado Libre.',
    room: 'cocina',
    tier: 'S',
    usedOk: true,
    usedNote: null,
    guide: null,
    planRedondo: null,
    wattsExample: null,
  },
  {
    key: 'tabla-picar',
    label: 'Tabla de picar',
    plural: 'tablas de picar',
    h1: 'Precio de tablas de picar en Uruguay',
    description:
      'Precios de tablas de picar en Uruguay, con la mediana relevada y por qué conviene una de madera antes que una de vidrio.',
    room: 'cocina',
    tier: 'A',
    usedOk: false,
    usedNote: null,
    guide: null,
    planRedondo: null,
    wattsExample: null,
  },
  {
    key: 'escurridor',
    label: 'Escurridor de platos',
    plural: 'escurridores de platos',
    h1: 'Precio de escurridores de platos en Uruguay',
    description:
      'Precios de escurridores de platos en Uruguay, con la mediana relevada en tiendas y Mercado Libre para la pileta de la cocina.',
    room: 'cocina',
    tier: 'A',
    usedOk: true,
    usedNote: null,
    guide: null,
    planRedondo: null,
    wattsExample: null,
  },
  {
    key: 'pava',
    label: 'Pava o caldera',
    plural: 'pavas y calderas',
    h1: 'Precio de pavas y calderas en Uruguay',
    description:
      'Precios de pavas y calderas en Uruguay, con la mediana relevada entre la común y la eléctrica para tomar mate o té.',
    room: 'cocina',
    tier: 'B',
    usedOk: true,
    usedNote: null,
    guide: null,
    planRedondo: null,
    wattsExample: null,
  },
  {
    key: 'mixer',
    label: 'Mixer o licuadora',
    plural: 'mixers y licuadoras',
    h1: 'Precio de mixers y licuadoras en Uruguay',
    description:
      'Precios de mixers y licuadoras en Uruguay, con la mediana relevada entre el de mano y el de vaso para cocinar todos los días.',
    room: 'cocina',
    tier: 'B',
    usedOk: true,
    usedNote: null,
    guide: null,
    planRedondo: null,
    wattsExample: null,
  },
  {
    key: 'tostadora',
    label: 'Tostadora',
    plural: 'tostadoras',
    h1: 'Precio de tostadoras en Uruguay',
    description:
      'Precios de tostadoras en Uruguay, con la mediana relevada en tiendas y Mercado Libre para el desayuno de todos los días.',
    room: 'cocina',
    tier: 'C',
    usedOk: true,
    usedNote: null,
    guide: null,
    planRedondo: null,
    wattsExample: null,
  },
  {
    key: 'cafetera',
    label: 'Cafetera',
    plural: 'cafeteras',
    h1: 'Precio de cafeteras en Uruguay',
    description:
      'Precios de cafeteras en Uruguay, con la mediana relevada en tiendas y Mercado Libre para las de filtro más habituales.',
    room: 'cocina',
    tier: 'C',
    usedOk: true,
    usedNote: null,
    guide: null,
    planRedondo: null,
    wattsExample: null,
  },
  {
    key: 'horno-electrico',
    label: 'Horno eléctrico',
    plural: 'hornos eléctricos',
    h1: 'Precio de hornos eléctricos en Uruguay',
    description:
      'Precios de hornos eléctricos en Uruguay, con la mediana relevada y cuándo tiene sentido sumar uno a una cocina con anafe.',
    room: 'cocina',
    tier: 'C',
    usedOk: true,
    usedNote: null,
    guide: null,
    planRedondo:
      'Los hornos de mesa no entran: el plan pide hornos empotrables de 55 litros o más.',
    wattsExample: null,
  },
  {
    key: 'sabanas',
    label: 'Juego de sábanas',
    plural: 'juegos de sábanas',
    h1: 'Precio de juegos de sábanas en Uruguay',
    description:
      'Precios de juegos de sábanas en Uruguay por medida de cama, con la mediana relevada en tiendas y Mercado Libre.',
    room: 'dormitorio',
    tier: 'S',
    usedOk: false,
    usedNote: null,
    guide: null,
    planRedondo: null,
    wattsExample: null,
  },
  {
    key: 'almohada',
    label: 'Almohada',
    plural: 'almohadas',
    h1: 'Precio de almohadas en Uruguay',
    description:
      'Precios de almohadas en Uruguay, con la mediana relevada en tiendas y Mercado Libre para dormir mejor desde el primer día.',
    room: 'dormitorio',
    tier: 'A',
    usedOk: false,
    usedNote: null,
    guide: null,
    planRedondo: null,
    wattsExample: null,
  },
  {
    key: 'acolchado',
    label: 'Acolchado o frazada',
    plural: 'acolchados y frazadas',
    h1: 'Precio de acolchados y frazadas en Uruguay',
    description:
      'Precios de acolchados y frazadas en Uruguay por medida de cama, con la mediana relevada según llega el frío o el calor.',
    room: 'dormitorio',
    tier: 'A',
    usedOk: true,
    usedNote: null,
    guide: null,
    planRedondo: null,
    wattsExample: null,
  },
  {
    key: 'toallas',
    label: 'Toallas',
    plural: 'toallas',
    h1: 'Precio de toallas en Uruguay',
    description:
      'Precios de toallas y toallones en Uruguay, con la mediana relevada en tiendas y Mercado Libre para bañarse desde el día uno.',
    room: 'bano',
    tier: 'S',
    usedOk: false,
    usedNote: null,
    guide: null,
    planRedondo: null,
    wattsExample: null,
  },
  {
    key: 'cortina-bano',
    label: 'Cortina de baño',
    plural: 'cortinas de baño',
    h1: 'Precio de cortinas de baño en Uruguay',
    description:
      'Precios de cortinas de baño en Uruguay, con la mediana relevada para cuando la ducha no tiene mampara instalada.',
    room: 'bano',
    tier: 'B',
    usedOk: false,
    usedNote: null,
    guide: null,
    planRedondo: null,
    wattsExample: null,
  },
  {
    key: 'limpieza',
    label: 'Kit de limpieza',
    plural: 'kits de limpieza',
    h1: 'Precio del kit de limpieza para una casa en Uruguay',
    description:
      'Precios del kit de limpieza para una casa en Uruguay: balde, escoba y secador, con la mediana relevada en tiendas y Mercado Libre.',
    room: 'limpieza',
    tier: 'S',
    usedOk: false,
    usedNote: null,
    guide: null,
    planRedondo: null,
    wattsExample: null,
  },
  {
    key: 'tacho',
    label: 'Tacho de basura',
    plural: 'tachos de basura',
    h1: 'Precio de tachos de basura en Uruguay',
    description:
      'Precios de tachos de basura en Uruguay por tipo de tapa o pedal, con la mediana relevada en tiendas y Mercado Libre.',
    room: 'limpieza',
    tier: 'S',
    usedOk: false,
    usedNote: null,
    guide: null,
    planRedondo: null,
    wattsExample: null,
  },
  {
    key: 'plancha',
    label: 'Plancha',
    plural: 'planchas',
    h1: 'Precio de planchas en Uruguay',
    description:
      'Precios de planchas de ropa en Uruguay, con la mediana relevada en tiendas y Mercado Libre para quien plancha camisas seguido.',
    room: 'limpieza',
    tier: 'A',
    usedOk: true,
    usedNote: null,
    guide: null,
    planRedondo: null,
    wattsExample: null,
  },
  {
    key: 'ventilador',
    label: 'Ventilador',
    plural: 'ventiladores',
    h1: 'Precio de ventiladores en Uruguay',
    description:
      'Precios de ventiladores en Uruguay por tipo, con la mediana relevada y el costo por hora de tenerlo prendido en verano.',
    room: 'living',
    tier: 'A',
    usedOk: true,
    usedNote: null,
    guide: [
      'De pie, de techo o turbo: el de techo mueve más aire en toda la habitación.',
      'Un ventilador gasta muy poco: el costo por hora está abajo.',
    ],
    planRedondo: null,
    wattsExample: 60,
  },
  {
    key: 'estufa',
    label: 'Estufa o calefactor',
    plural: 'estufas y calefactores',
    h1: 'Precio de estufas y calefactores en Uruguay',
    description:
      'Precios de estufas y calefactores en Uruguay por tipo, con la mediana relevada y el costo por hora de tenerlos prendidos.',
    room: 'living',
    tier: 'A',
    usedOk: true,
    usedNote: null,
    guide: [
      'Caloventor, oleoeléctrica, panel o a gas: el caloventor calienta rápido y fuerte; la oleoeléctrica tarda pero es pareja y silenciosa.',
      'La potencia en W define el consumo: el costo por hora está abajo.',
    ],
    planRedondo: null,
    wattsExample: 2000,
  },
  {
    key: 'aspiradora',
    label: 'Aspiradora',
    plural: 'aspiradoras',
    h1: 'Precio de aspiradoras en Uruguay',
    description:
      'Precios de aspiradoras en Uruguay por tipo, con la mediana relevada en tiendas y Mercado Libre para completar la limpieza.',
    room: 'limpieza',
    tier: 'B',
    usedOk: true,
    usedNote: null,
    guide: [
      'Trineo, escoba inalámbrica o robot: la inalámbrica es cómoda para el día a día y tiene autonomía limitada.',
      'Con bolsa o ciclónica (sin bolsa): la ciclónica no requiere comprar bolsas.',
    ],
    planRedondo: null,
    wattsExample: null,
  },
  {
    key: 'secarropas',
    label: 'Secarropas',
    plural: 'secarropas',
    h1: 'Precio de secarropas en Uruguay',
    description:
      'Precios de secarropas en Uruguay, con la mediana relevada y por qué conviene sólo en invierno sin balcón para tender.',
    room: 'limpieza',
    tier: 'C',
    usedOk: true,
    usedNote: null,
    guide: [
      'Centrífugo sólo escurre; de tambor (a calor) seca.',
      'El centrífugo es más barato y casi no gasta luz; el de tambor consume bastante más.',
    ],
    planRedondo:
      'Sólo los de tambor: UTE descuenta $ 2.500 (IVA incluido). Los centrífugos no entran.',
    wattsExample: null,
  },
  {
    key: 'deshumidificador',
    label: 'Deshumidificador',
    plural: 'deshumidificadores',
    h1: 'Precio de deshumidificadores en Uruguay',
    description:
      'Precios de deshumidificadores en Uruguay, con la mediana relevada en tiendas y Mercado Libre para las casas que se humedecen de verdad.',
    room: 'living',
    tier: 'C',
    usedOk: true,
    usedNote: null,
    guide: null,
    planRedondo: null,
    wattsExample: null,
  },
  {
    key: 'impresora',
    label: 'Impresora',
    plural: 'impresoras',
    h1: 'Precio de impresoras en Uruguay',
    description:
      'Precios de impresoras multifunción en Uruguay, con la mediana relevada en tiendas y Mercado Libre para el trámite urgente.',
    room: 'living',
    tier: 'C',
    usedOk: true,
    usedNote: null,
    guide: null,
    planRedondo: null,
    wattsExample: null,
  },
]

const EQUIPAR_CATEGORY_PAGES_BY_KEY = new Map(EQUIPAR_CATEGORY_PAGES.map(page => [page.key, page]))

export function equiparCategoryPage(slug: string): EquiparCategoryPage | undefined {
  return EQUIPAR_CATEGORY_PAGES_BY_KEY.get(slug)
}

export function isEquiparCategorySlug(slug: string): boolean {
  return EQUIPAR_CATEGORY_PAGES_BY_KEY.has(slug)
}

/** `equiparMoney` con el espacio que usa el resto del sitio en precios sueltos ("$ 16.085"). */
const money = (value: number): string => equiparMoney(value).replace('$', '$ ')

/**
 * El precio por hora de tener algo prendido, para las dos categorías que declaran `wattsExample`
 * (estufa, ventilador). Usa el escalón 101-600 kWh de la Tarifa Residencial Simple —el que cubre el
 * consumo típico de un hogar chico— y el IVA vigente, los dos leídos de `householdBills.ts` para no
 * duplicar cifras que ya vive ahí.
 */
function uteSimpleMidBracketPrice(): number {
  const bracket = UTE_TARIFFS.find(tariff => tariff.id === 'simple')?.brackets?.find(
    b => b.upTo === 600
  )
  if (!bracket) throw new Error('UTE_TARIFFS: falta el escalón 101-600 kWh de la Tarifa Simple')
  return bracket.pricePerKwh
}

/** kWh × $/kWh del escalón 101–600 × (1 + IVA), redondeado a un decimal. */
export function equiparHourlyCostUyu(watts: number): number {
  const kwh = watts / 1000
  const price = uteSimpleMidBracketPrice()
  return Math.round(kwh * price * (1 + UTE_IVA_RATE) * 10) / 10
}

/**
 * Título dinámico de la página: si hay una mediana nueva para publicar, la mete en el título
 * (`h1corto: mediana $ N`); si no entra en 70 caracteres, cae a la forma corta sin "Precio de". Sin
 * ninguna banda nueva, devuelve el `h1` estático de la categoría (que para las 4 con caso especial
 * ya trae sus propias cifras fijas, como los BTU del aire acondicionado).
 *
 * El espejo no conoce qué variante es `fallback` en el registro (esa marca vive sólo del lado
 * backend), así que en su lugar usa la variante con más observaciones nuevas relevadas.
 */
export function equiparCategoryTitle(
  page: EquiparCategoryPage,
  items: readonly EquiparItemDoc[]
): string {
  const priced = items.filter(
    (item): item is EquiparItemDoc & { newBand: EquiparBand } =>
      item.category === page.key && item.newBand !== null
  )
  if (!priced.length) return page.h1

  const best = priced.reduce((a, b) => (b.newBand.n > a.newBand.n ? b : a))
  const median = money(best.newBand.median)
  const short = `Precio de ${page.plural} en Uruguay`
  const long = `${short}: mediana ${median}`
  if (long.length <= 70) return long

  const capitalPlural = page.plural.charAt(0).toUpperCase() + page.plural.slice(1)
  return `${capitalPlural} en Uruguay: mediana ${median}`
}

// ---------------------------------------------------------------------------
// FAQ
// ---------------------------------------------------------------------------

/** Género y número del sustantivo que manda en `label`, para concordar los textos de la categoría. */
export interface EquiparGrammar {
  gender: 'm' | 'f'
  plural: boolean
}

const EQUIPAR_GRAMMAR: Record<string, EquiparGrammar> = {
  heladera: { gender: 'f', plural: false },
  colchon: { gender: 'm', plural: false },
  lavarropas: { gender: 'm', plural: false },
  cocina: { gender: 'f', plural: false },
  calefon: { gender: 'm', plural: false },
  microondas: { gender: 'm', plural: false },
  tv: { gender: 'm', plural: false },
  'aire-acondicionado': { gender: 'm', plural: false },
  ropero: { gender: 'm', plural: false },
  'mesa-sillas': { gender: 'f', plural: false },
  sofa: { gender: 'm', plural: false },
  olla: { gender: 'f', plural: false },
  sarten: { gender: 'f', plural: false },
  cuchillo: { gender: 'm', plural: false },
  cubiertos: { gender: 'm', plural: true },
  vajilla: { gender: 'm', plural: true },
  vasos: { gender: 'm', plural: true },
  'tabla-picar': { gender: 'f', plural: false },
  escurridor: { gender: 'm', plural: false },
  pava: { gender: 'f', plural: false },
  mixer: { gender: 'm', plural: false },
  tostadora: { gender: 'f', plural: false },
  cafetera: { gender: 'f', plural: false },
  'horno-electrico': { gender: 'm', plural: false },
  sabanas: { gender: 'm', plural: false },
  almohada: { gender: 'f', plural: false },
  acolchado: { gender: 'm', plural: false },
  toallas: { gender: 'f', plural: true },
  'cortina-bano': { gender: 'f', plural: false },
  limpieza: { gender: 'm', plural: false },
  tacho: { gender: 'm', plural: false },
  plancha: { gender: 'f', plural: false },
  ventilador: { gender: 'm', plural: false },
  estufa: { gender: 'f', plural: false },
  aspiradora: { gender: 'f', plural: false },
  secarropas: { gender: 'm', plural: false },
  deshumidificador: { gender: 'm', plural: false },
  impresora: { gender: 'f', plural: false },
}

export const equiparGrammarFor = (key: string): EquiparGrammar =>
  EQUIPAR_GRAMMAR[key] ?? { gender: 'm', plural: false }

const indefiniteArticle = (g: EquiparGrammar): string =>
  g.plural ? (g.gender === 'f' ? 'unas' : 'unos') : g.gender === 'f' ? 'una' : 'un'

const definiteArticle = (g: EquiparGrammar): string =>
  g.plural ? (g.gender === 'f' ? 'las' : 'los') : g.gender === 'f' ? 'la' : 'el'

/** `agree('usad', g)` -> usado/usada/usados/usadas; `agree('barat', g)` -> barato/barata/... */
const agree = (root: string, g: EquiparGrammar): string =>
  g.plural ? `${root}${g.gender === 'f' ? 'as' : 'os'}` : `${root}${g.gender === 'f' ? 'a' : 'o'}`

const verbForm = (singular: string, plural: string, g: EquiparGrammar): string =>
  g.plural ? plural : singular

/** Pronombre de objeto directo para "comprar_lo/la/los/las_ usado/a/os/as". */
const objectPronoun = (g: EquiparGrammar): string =>
  g.plural ? (g.gender === 'f' ? 'las' : 'los') : g.gender === 'f' ? 'la' : 'lo'

/** `'2026-09-10T00:00:00.000Z'` -> `'10 de setiembre de 2026'` (grafía uruguaya, ver `dateLocale`). */
function formatFaqDate(iso: string | null): string | null {
  if (!iso) return null
  const time = Date.parse(iso)
  if (Number.isNaN(time)) return null
  return new Date(time).toLocaleDateString(dateLocale('es'), {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Montevideo',
  })
}

const dataScore = (item: EquiparItemDoc): number => (item.newBand?.n ?? 0) + (item.usedBand?.n ?? 0)

/** La variante con más observaciones (nuevas + usadas), para responder "¿dónde está más barato?". */
function pickRepresentativeItem(items: readonly EquiparItemDoc[]): EquiparItemDoc | null {
  if (!items.length) return null
  return [...items].sort((a, b) => dataScore(b) - dataScore(a))[0] ?? null
}

/** La oferta nueva más barata de un item. `item.offers` ya son "ofertas honestas" (ver `equipar.ts`). */
function cheapestNewOffer(item: EquiparItemDoc): EquiparOffer | null {
  const newOffers = item.offers.filter(offer => offer.condition === 'new')
  if (!newOffers.length) return null
  return [...newOffers].sort((a, b) => a.priceUyu - b.priceUyu)[0] ?? null
}

/**
 * Arma el FAQ de una categoría con los datos que trajo esa corrida: cuánto sale nuevo (por
 * variante, con n y fecha), si conviene usado (con la nota y el ahorro del registro), dónde está
 * más barato hoy, y —sólo si `planRedondo` no es null— si entra en el Plan Redondo de UTE.
 */
export function equiparCategoryFaq(
  page: EquiparCategoryPage,
  items: readonly EquiparItemDoc[],
  generatedAt: string | null
): Array<{ question: string; answer: string }> {
  const catItems = items.filter(item => item.category === page.key)
  const grammar = equiparGrammarFor(page.key)
  const labelLower = page.label.toLowerCase()
  const dateStr = formatFaqDate(generatedAt)
  const faq: Array<{ question: string; answer: string }> = []

  // ¿Cuánto sale?
  const withNewBand = catItems
    .filter((item): item is EquiparItemDoc & { newBand: EquiparBand } => item.newBand !== null)
    .sort((a, b) => b.newBand.n - a.newBand.n)
  let cuantoSaleAnswer: string
  if (!withNewBand.length) {
    cuantoSaleAnswer = `Todavía no relevamos suficientes precios nuevos de ${labelLower} en Uruguay como para publicar una mediana.`
  } else {
    const porVariante = withNewBand
      .map(
        item =>
          `${item.variantLabel}: ${money(item.newBand.median)} (${item.newBand.n} precios relevados)`
      )
      .join('; ')
    cuantoSaleAnswer = `Según lo relevado, la mediana nueva es ${porVariante}.`
    if (dateStr) cuantoSaleAnswer += ` Datos del ${dateStr}.`
  }
  faq.push({
    question: `¿Cuánto ${verbForm('sale', 'salen', grammar)} ${indefiniteArticle(grammar)} ${labelLower} en Uruguay?`,
    answer: cuantoSaleAnswer,
  })

  // ¿Conviene comprar usado? `usedOk`/`usedNote` son un juicio de la CATEGORÍA (`page`, espejo del
  // registro), no de la corrida: una categoría sin items todavía no es una categoría donde el usado
  // no convenga. Sólo la mediana/el ahorro salen de `items`, y si no hay banda usada la respuesta lo
  // dice en vez de callarlo.
  const usedBandItem = catItems.find(
    (item): item is EquiparItemDoc & { usedBand: EquiparBand } => item.usedBand !== null
  )
  const savingItem = catItems.find(item => typeof item.usedSavingPct === 'number')
  let usadoAnswer: string
  if (!page.usedOk) {
    usadoAnswer = page.usedNote
      ? `No: ${page.usedNote}`
      : `No: comprar${objectPronoun(grammar)} ${agree('usad', grammar)} no conviene.`
  } else {
    usadoAnswer = page.usedNote
      ? `Sí. ${page.usedNote}`
      : 'Sí, es una compra segura de segunda mano.'
    if (usedBandItem) {
      usadoAnswer += ` La mediana de las ofertas usadas relevadas es ${money(usedBandItem.usedBand.median)}.`
      if (savingItem && typeof savingItem.usedSavingPct === 'number') {
        usadoAnswer += ` Eso ahorra alrededor de ${Math.round(savingItem.usedSavingPct)} % frente al precio nuevo.`
      }
    } else {
      usadoAnswer +=
        ' Todavía no relevamos suficientes ofertas usadas como para publicar una mediana.'
    }
  }
  faq.push({
    question: `¿Conviene comprar ${indefiniteArticle(grammar)} ${labelLower} ${agree('usad', grammar)}?`,
    answer: usadoAnswer,
  })

  // ¿Dónde está más barato?
  const repItem = pickRepresentativeItem(catItems)
  const cheapest = repItem ? cheapestNewOffer(repItem) : null
  let dondeAnswer: string
  if (cheapest) {
    dondeAnswer = `En el último relevamiento, la oferta nueva más barata la tenía ${cheapest.seller} a ${money(
      cheapest.priceUyu
    )}. El precio cambia todos los días: es una referencia${dateStr ? ` del ${dateStr}` : ''}, no un precio fijo.`
  } else {
    dondeAnswer = `Todavía no relevamos suficientes ofertas nuevas de ${labelLower} como para decir dónde ${verbForm('está', 'están', grammar)} más ${agree('barat', grammar)}.`
  }
  faq.push({
    question: `¿Dónde ${verbForm('está', 'están', grammar)} ${definiteArticle(grammar)} ${labelLower} más ${agree('barat', grammar)}?`,
    answer: dondeAnswer,
  })

  // ¿Entra en el Plan Redondo de UTE?
  if (page.planRedondo) {
    faq.push({
      question: '¿Entra en el Plan Redondo de UTE?',
      answer: `${page.planRedondo} Rige para compras hechas entre el ${EQUIPAR_PLAN_REDONDO_WINDOW.from} y el ${EQUIPAR_PLAN_REDONDO_WINDOW.to}: el descuento se acredita en la factura de UTE, hasta 6 equipos por cliente, con potencia contratada de hasta 40 kW, registrando la factura electrónica, y el equipo tiene que quedar instalado en ese servicio (fuente: ${EQUIPAR_PLAN_REDONDO_SOURCE}, verificado el ${EQUIPAR_PLAN_REDONDO_WINDOW.verifiedAt}).`,
    })
  }

  return faq
}
