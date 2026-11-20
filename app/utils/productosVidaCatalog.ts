// La capa editorial de /productos-que-te-cambian-la-vida-uruguay: lo que dijo el hilo de r/uruguay
// «¿Qué producto les cambió la vida?», contado una vez y congelado acá. Los precios NO viven acá: los
// lee `currency-productos-vida` (classes/productosvida/registry.ts) de Mercado Libre y los sirve
// `GET /api/productos-vida`.
//
// `app/utils` es un namespace de auto-import PLANO: cada export lleva el prefijo `productosVida`/
// `PRODUCTOS_VIDA_`.
//
// Reglas del texto, vigiladas por `tests/unit/productosVidaCatalog.test.ts`:
// - Cómo se contó: una persona cuenta UNA vez por producto cuando dice que lo tiene o lo usa en una
//   respuesta a favor, o cuando lo nombra en su propia lista. Incluye a quien abrió el hilo, en el
//   post y en las respuestas donde dice que tiene uno. Un producto cuenta sólo si se lo nombra: una
//   lista que pide sartenes buenas sin decir el material no suma a la de acero inoxidable. No
//   cuentan las preguntas, los deseos (lo que alguien piensa comprar algún día), lo que a alguien no
//   le gusta, los productos para adultos ni el remedio sin evidencia. La misma regla, en una oración,
//   es `PRODUCTOS_VIDA_COUNT_RULE` (productosVida.ts), la que leen la página y la primera pregunta.
// - Ningún usuario de Reddit y ninguna cita textual: las razones van con nuestras palabras.
// - Ningún monto en pesos ni porcentaje sacado de un comentario: envejece y no se puede verificar.
//   Toda cifra que la página imprime sale de la lectura de Mercado Libre o de una fuente primaria.
// - `slug` es la clave del registro del backend (mismo orden; `productosVidaParity.test.ts`) y no
//   lleva dígitos: el escáner de secretos marca un campo llamado como la palabra inglesa para
//   «clave» con un valor con dígitos, y renombrarlo después no alcanza.
// - `searchQuery` es `mlQueries[0]` del registro y sólo arma la URL de búsqueda de Mercado Libre.
//   No tiene tildes, así que nunca se imprime: el texto del enlace sale de `phrase`.

/** El hilo, tal cual se leyó para armar la lista. */
export const PRODUCTOS_VIDA_THREAD = {
  url: 'https://www.reddit.com/r/uruguay/comments/1y09jec/que_producto_les_cambio_la_vida/',
  title: '¿Qué producto les cambió la vida?',
  subreddit: 'r/uruguay',
  postedOn: '2026-11-19',
  readOn: '2026-11-20',
  comments: 81,
} as const

export type ProductosVidaGroupId =
  | 'cocina'
  | 'ropa-y-limpieza'
  | 'dormir-y-clima'
  | 'cuidado-personal'
  | 'tecnologia'
  | 'deporte-y-auto'

export interface ProductosVidaGroup {
  id: ProductosVidaGroupId
  label: string
  icon: string
}

export const PRODUCTOS_VIDA_GROUPS: readonly ProductosVidaGroup[] = [
  { id: 'cocina', label: 'Cocina', icon: 'mdi-silverware-fork-knife' },
  { id: 'ropa-y-limpieza', label: 'Ropa y limpieza', icon: 'mdi-washing-machine' },
  { id: 'dormir-y-clima', label: 'Dormir y clima', icon: 'mdi-bed-outline' },
  { id: 'cuidado-personal', label: 'Cuidado personal', icon: 'mdi-face-man-outline' },
  { id: 'tecnologia', label: 'Tecnología', icon: 'mdi-monitor' },
  { id: 'deporte-y-auto', label: 'Deporte y auto', icon: 'mdi-bicycle' },
]

export interface ProductosVidaRelated {
  to: string
  label: string
}

export interface ProductosVidaProductEntry {
  /** Clave del registro del backend y ancla de la sección (`#slug`). */
  slug: string
  name: string
  /** El nombre con su artículo («el calientacama»): de acá salen el conteo, la bajada y la búsqueda. */
  phrase: string
  group: ProductosVidaGroupId
  /** Cuántas PERSONAS lo nombraron, con la regla de arriba. */
  mentions: number
  icon: string
  /** `mlQueries[0]` del registro; sólo para la URL de Mercado Libre. */
  searchQuery: string
  why: string
  lookFor: string
  /** Algo práctico que se dijo en el hilo, parafraseado. */
  threadNote?: string
  /** Un directorio propio que ya mide parte de ese mercado. */
  related?: ProductosVidaRelated
}

/** En el orden del hilo: más personas primero y, a igual cantidad, por nombre. */
export const PRODUCTOS_VIDA_PRODUCTS: readonly ProductosVidaProductEntry[] = [
  {
    slug: 'calientacama',
    name: 'Calientacama',
    phrase: 'el calientacama',
    group: 'dormir-y-clima',
    mentions: 4,
    icon: 'mdi-heat-wave',
    searchQuery: 'calientacama',
    why: 'Cuatro personas. Una usa el que va por encima de la cama, tipo frazada, con varios niveles y apagado programado, y dice que gasta mucho menos que un aire o una estufa; en la casa de quien abrió el hilo divide opiniones.',
    lookFor:
      'Si va bajo la sábana o por encima como una frazada: son dos productos con precios distintos. Mirá también el tamaño, si se apaga solo y si se regula cada lado por separado.',
  },
  {
    slug: 'lavavajillas',
    name: 'Lavavajillas',
    phrase: 'el lavavajillas',
    group: 'cocina',
    mentions: 4,
    icon: 'mdi-dishwasher',
    searchQuery: 'lavavajillas',
    why: 'Cuatro personas, y una dice que no hay vuelta atrás. Se carga sacándole a los platos lo grueso, sin enjuagarlos, y sale limpio y seco.',
    lookFor:
      'La cantidad de servicios: los de 6 u 8 van sobre la mesada; desde 9 van en el piso o bajo la mesada, y los de 12 o más piden un hueco de 60 cm. Fijate si tenés una salida de agua y un desagüe cerca de la pileta.',
    threadNote:
      'En el hilo recomendaron usar pastillas para lavavajillas, porque son las que dejan todo brillante, y quien abrió el hilo contó que conectar el suyo, de 6 servicios, sólo llevó sumarle a la pileta una canilla tipo lavarropas para la entrada de agua y un adaptador en el sifón para el desagüe.',
  },
  {
    slug: 'secarropas',
    name: 'Secarropas',
    phrase: 'el secarropas',
    group: 'ropa-y-limpieza',
    mentions: 4,
    icon: 'mdi-tumble-dryer',
    searchQuery: 'secarropas',
    why: 'Cuatro personas. El argumento más largo: en un apartamento hay poco lugar para tender, y con secarropas la ropa está seca y lista en unas horas; a quien abrió el hilo sólo le hizo falta en las semanas de lluvia.',
    lookFor:
      'Hay tres aparatos con el mismo nombre: el centrífugo, que sólo escurre; el portátil de bolsa con aire caliente, el más barato; y el de tambor, que seca de verdad y va al lado del lavarropas. En el de tambor, fijate si es de condensación o si necesita una salida de aire hacia afuera.',
    related: {
      to: '/equipar-casa-uruguay/secarropas',
      label: 'Secarropas, en Equipar una casa',
    },
  },
  {
    slug: 'aspiradora-robot',
    name: 'Aspiradora robot',
    phrase: 'la aspiradora robot',
    group: 'ropa-y-limpieza',
    mentions: 3,
    icon: 'mdi-robot-vacuum',
    searchQuery: 'aspiradora robot',
    why: 'Tres personas la tienen y una cuarta la quiere para cuando se mude a una casa más grande. Según quien abrió el hilo, la gracia es que la ponés a andar cuando no estás.',
    lookFor:
      'Si sólo aspira o también trapea, si vuelve sola a la base y si arma un mapa de la casa para no repetir zonas.',
    related: {
      to: '/equipar-casa-uruguay/aspiradora',
      label: 'Aspiradoras comunes, en Equipar una casa',
    },
  },
  {
    slug: 'freidora-de-aire',
    name: 'Freidora de aire',
    phrase: 'la freidora de aire',
    group: 'cocina',
    mentions: 3,
    icon: 'mdi-french-fries',
    searchQuery: 'freidora de aire',
    why: 'Tres personas la nombran sin explicarla. Una cuenta que la compró, como otros aparatos, esperando una oferta en Mercado Libre.',
    lookFor:
      'Los litros: una chica alcanza para una o dos personas y para una familia conviene una mediana o una de doble canasto. Mirá también si la canasta se saca entera para lavarla.',
    related: {
      to: '/equipar-casa-uruguay/horno-electrico',
      label: 'Hornos eléctricos, en Equipar una casa',
    },
  },
  {
    slug: 'cortadora-barba',
    name: 'Cortadora de barba y pelo',
    phrase: 'la cortadora de barba y pelo',
    group: 'cuidado-personal',
    mentions: 2,
    icon: 'mdi-razor-double-edge',
    searchQuery: 'cortadora de barba',
    why: 'Quien abrió el hilo nombra su cortadora de barba y pelo, y otra persona una afeitadora eléctrica con largo regulable.',
    lookFor:
      'Si es recortadora, que deja la barba corta y pareja, o afeitadora, que rasura al ras; si es recargable y qué peines o largos trae.',
  },
  {
    slug: 'deshumidificador',
    name: 'Deshumidificador',
    phrase: 'el deshumidificador',
    group: 'dormir-y-clima',
    mentions: 2,
    icon: 'mdi-water-percent',
    searchQuery: 'deshumidificador',
    why: 'Dos personas lo ponen en su lista, junto a otros aparatos, sin explicarlo.',
    lookFor:
      'Los litros por día que saca: los chicos por USB rinden poco y sirven para un placard, los de compresor son para una habitación. Mirá el tamaño del tanque y si se apaga solo cuando se llena.',
    related: {
      to: '/equipar-casa-uruguay/deshumidificador',
      label: 'Deshumidificadores, en Equipar una casa',
    },
  },
  {
    slug: 'freezer',
    name: 'Freezer',
    phrase: 'el freezer',
    group: 'cocina',
    mentions: 2,
    icon: 'mdi-snowflake',
    searchQuery: 'freezer horizontal',
    why: 'Una persona tiene un freezer en el patio además de la heladera y dice que el espacio extra siempre se usa. Quien abrió el hilo compró uno chico apenas se mudó porque el de la heladera no alcanzaba.',
    lookFor:
      'Los litros y si es horizontal, de pozo, o vertical, que ocupa menos piso. Algunos horizontales también funcionan como heladera: el aviso lo dice como doble función.',
  },
  {
    slug: 'panificadora',
    name: 'Panificadora',
    phrase: 'la panificadora',
    group: 'cocina',
    mentions: 2,
    icon: 'mdi-bread-slice-outline',
    searchQuery: 'panificadora',
    why: 'Quien abrió el hilo la tiene entre sus electrodomésticos, y otra persona dice que le cambió lo que gasta en pan y lo que come.',
    lookFor:
      'Cuántos kilos de pan hace por tanda, cuántos programas trae y si tiene dispensador para agregar semillas o frutos secos.',
  },
  {
    slug: 'recortadora-nariz',
    name: 'Recortadora de nariz',
    phrase: 'la recortadora de nariz',
    group: 'cuidado-personal',
    mentions: 2,
    icon: 'mdi-content-cut',
    searchQuery: 'recortadora nariz',
    why: 'Una persona la nombra por lo fresco que se respira después, y quien abrió el hilo contestó que su cortadora de barba la trae como accesorio.',
    lookFor:
      'Si es a pila o recargable, si se puede lavar bajo la canilla y si trae un cabezal para las cejas.',
  },
  {
    slug: 'tuppers-vidrio',
    name: 'Tuppers de vidrio',
    phrase: 'los tuppers de vidrio',
    group: 'cocina',
    mentions: 2,
    icon: 'mdi-inbox-multiple-outline',
    searchQuery: 'tupper vidrio hermetico',
    why: 'Tuppers de vidrio grueso: quien los nombra aclara que no es broma, y quien abrió el hilo los viene cambiando por vidrio de a poco desde el año pasado.',
    lookFor:
      'Que la tapa cierre hermética, si el vidrio va al microondas y al horno (la tapa de plástico, al horno no) y si se apilan.',
  },
  {
    slug: 'almohada-viscoelastica',
    name: 'Almohada viscoelástica',
    phrase: 'la almohada viscoelástica',
    group: 'dormir-y-clima',
    mentions: 1,
    icon: 'mdi-bed-outline',
    searchQuery: 'almohada viscoelastica',
    why: 'Una persona nombra su almohada de espuma con memoria; otra preguntó qué tiene de mejor que una común.',
    lookFor:
      'La altura, la firmeza y si la funda se saca para lavar. Las cervicales tienen forma de onda; las lisas se parecen más a una almohada común.',
    related: {
      to: '/equipar-casa-uruguay/almohada',
      label: 'Almohadas comunes, en Equipar una casa',
    },
  },
  {
    slug: 'arrancador-bateria',
    name: 'Arrancador de batería portátil',
    phrase: 'el arrancador de batería portátil',
    group: 'deporte-y-auto',
    mentions: 1,
    icon: 'mdi-car-battery',
    searchQuery: 'arrancador de bateria portatil',
    why: 'Una persona nombra el arrancador portátil para la batería del auto, que se carga por USB.',
    lookFor:
      'Que sirva para el motor de tu auto (nafta o diésel, y la cilindrada que indica el fabricante), si trae compresor para inflar y si carga el celular. Los amperes que dicen algunos títulos no siempre son creíbles.',
  },
  {
    slug: 'auriculares-inalambricos',
    name: 'Auriculares inalámbricos',
    phrase: 'los auriculares inalámbricos',
    group: 'tecnologia',
    mentions: 1,
    icon: 'mdi-headphones',
    searchQuery: 'auriculares inalambricos',
    why: 'Una persona los nombra, junto a la libreta de conducir.',
    lookFor:
      'Si son in-ear o de vincha, cuántas horas dura la batería y si tienen cancelación de ruido.',
  },
  {
    slug: 'bicicleta',
    name: 'Bicicleta',
    phrase: 'la bicicleta',
    group: 'deporte-y-auto',
    mentions: 1,
    icon: 'mdi-bicycle',
    searchQuery: 'bicicleta rodado 29',
    why: 'Quien abrió el hilo la nombra porque dejó de depender del transporte público.',
    lookFor: 'El rodado y el talle del cuadro según tu altura, y si es urbana o de montaña.',
    related: {
      to: '/bicicletas-electricas-uruguay',
      label: 'Bicicletas eléctricas, en nuestro directorio',
    },
  },
  {
    slug: 'deshidratador',
    name: 'Deshidratador de alimentos',
    phrase: 'el deshidratador de alimentos',
    group: 'cocina',
    mentions: 1,
    icon: 'mdi-food-apple-outline',
    searchQuery: 'deshidratador de alimentos',
    why: 'Una persona lo usa para secar fruta, que para ella es el mejor snack, y para hacer polvo de ajo y de cebolla, hierbas y charqui.',
    lookFor:
      'Cuántas bandejas tiene y si trae temporizador y control de temperatura. Ojo: varios avisos llamados deshidratador son centrifugadores de ensalada.',
  },
  {
    slug: 'espumador-de-leche',
    name: 'Espumador de leche',
    phrase: 'el espumador de leche',
    group: 'cocina',
    mentions: 1,
    icon: 'mdi-coffee-outline',
    searchQuery: 'espumador de leche',
    why: 'Una persona le dice batidor de café: le da espuma al café sin azúcar y sin necesidad de una cafetera.',
    lookFor:
      'El de mano, a pila o recargable, sólo bate; la jarra eléctrica también calienta la leche y cuesta varias veces más.',
  },
  {
    slug: 'frigobar',
    name: 'Frigobar',
    phrase: 'el frigobar',
    group: 'cocina',
    mentions: 1,
    icon: 'mdi-fridge-outline',
    searchQuery: 'frigobar',
    why: 'La misma persona del freezer tiene además una segunda heladera chica.',
    lookFor:
      'Los litros, si tiene un compartimiento congelador y el consumo. Los de camping o de 12 V son otro producto.',
    related: {
      to: '/equipar-casa-uruguay/heladera',
      label: 'Heladeras por tamaño, en Equipar una casa',
    },
  },
  {
    slug: 'kindle',
    name: 'Kindle',
    phrase: 'el Kindle',
    group: 'tecnologia',
    mentions: 1,
    icon: 'mdi-book-open-page-variant-outline',
    searchQuery: 'kindle',
    why: 'Una persona lo nombra en una lista de tres cosas; otra nombra los libros en general.',
    lookFor:
      'Si es el básico, el Paperwhite (más grande y resistente al agua) o uno de gama alta, y si trae publicidad en la pantalla de bloqueo.',
  },
  {
    slug: 'lavasecarropas',
    name: 'Lavasecarropas',
    phrase: 'el lavasecarropas',
    group: 'ropa-y-limpieza',
    mentions: 1,
    icon: 'mdi-washing-machine',
    searchQuery: 'lavasecarropas',
    why: 'Una de las personas del secarropas pasó de tener dos aparatos a uno que lava y seca, y destaca que no lleva una manguera hacia afuera.',
    lookFor:
      'Los kilos de lavado y los de secado, que casi siempre son menos, y si es de condensación.',
    related: {
      to: '/equipar-casa-uruguay/lavarropas',
      label: 'Lavarropas, en Equipar una casa',
    },
  },
  {
    slug: 'monitor',
    name: 'Monitor extra',
    phrase: 'el monitor extra',
    group: 'tecnologia',
    mentions: 1,
    icon: 'mdi-monitor',
    searchQuery: 'monitor 24 pulgadas',
    why: 'Una persona trabaja con tres pantallas: dos para el trabajo y una grande para tener algo de fondo y para ver películas.',
    lookFor:
      'El tamaño, la resolución y las entradas: que tenga la que tu computadora tiene libre, HDMI o DisplayPort. Para trabajar no hace falta uno de muchos hercios.',
  },
  {
    slug: 'perfume-arabe',
    name: 'Perfume árabe',
    phrase: 'el perfume árabe',
    group: 'cuidado-personal',
    mentions: 1,
    icon: 'mdi-spray-bottle',
    searchQuery: 'perfume arabe',
    why: 'Una persona nombra unos perfumes árabes, en una lista larga.',
    lookFor:
      'Que diga eau de parfum y los mililitros. Los decants y las muestras son frascos chicos de otro precio.',
  },
  {
    slug: 'pesa-rusa',
    name: 'Pesa rusa',
    phrase: 'la pesa rusa',
    group: 'deporte-y-auto',
    mentions: 1,
    icon: 'mdi-dumbbell',
    searchQuery: 'pesa rusa',
    why: 'Quien abrió el hilo la usa para entrenar los días que no va al gimnasio.',
    lookFor:
      'El peso según tu entrenamiento y el material: las de hierro ocupan menos lugar que las de PVC con relleno del mismo peso.',
  },
  {
    slug: 'robot-de-cocina',
    name: 'Robot de cocina',
    phrase: 'el robot de cocina',
    group: 'cocina',
    mentions: 1,
    icon: 'mdi-pot-steam',
    searchQuery: 'robot de cocina',
    why: 'Una persona lo usa para que cocine solo: carga los ingredientes, elige tiempo y temperatura, y le salen desde sopas y postres hasta masa de pan. Hablamos del robot que cocina, no de la batidora que también se vende como robot de cocina.',
    lookFor:
      'Que diga que cocina (temperatura, programas o recetas) y los litros del vaso, y si las recetas vienen en el aparato o en una app.',
  },
  {
    slug: 'sarten-acero-inoxidable',
    name: 'Sartén de acero inoxidable',
    phrase: 'la sartén de acero inoxidable',
    group: 'cocina',
    mentions: 1,
    icon: 'mdi-pan',
    searchQuery: 'sarten acero inoxidable',
    why: 'Una persona dice que ya no se imagina cocinando sin su sartén de acero inoxidable. Otra pide en su lista ollas y sartenes buenas, sin decir de qué material, así que no la contamos acá.',
    lookFor:
      'Que sea acero inoxidable sin revestimiento, el diámetro, si tiene fondo triple y si sirve para inducción, si tu cocina es de inducción.',
    related: {
      to: '/equipar-casa-uruguay/sarten',
      label: 'Sartenes de todo tipo, en Equipar una casa',
    },
  },
  {
    slug: 'ventilador-industrial',
    name: 'Ventilador industrial',
    phrase: 'el ventilador industrial',
    group: 'dormir-y-clima',
    mentions: 1,
    icon: 'mdi-fan',
    searchQuery: 'ventilador industrial',
    why: 'Una persona: un ventilador industrial de los grandes para el verano.',
    lookFor:
      'El diámetro de las aspas, que es lo que más cambia el precio, y si es de pie, de pared o de piso. Varios de 45 cm también se venden como industriales.',
    related: {
      to: '/equipar-casa-uruguay/ventilador',
      label: 'Ventiladores comunes, en Equipar una casa',
    },
  },
]

export const PRODUCTOS_VIDA_SLUGS: readonly string[] = PRODUCTOS_VIDA_PRODUCTS.map(p => p.slug)

const PRODUCTOS_VIDA_BY_SLUG = new Map(PRODUCTOS_VIDA_PRODUCTS.map(p => [p.slug, p]))

export function productosVidaEntry(slug: string): ProductosVidaProductEntry | undefined {
  return PRODUCTOS_VIDA_BY_SLUG.get(slug)
}

export function isProductosVidaSlug(slug: string): boolean {
  return PRODUCTOS_VIDA_BY_SLUG.has(slug)
}

export interface ProductosVidaNoPriceEntry {
  id: string
  label: string
  why: string
  related?: ProductosVidaRelated
}

/** Lo que se nombró y no lleva precio: no se compra en Mercado Libre o una banda lo mezclaría. */
export const PRODUCTOS_VIDA_NO_PRICE: readonly ProductosVidaNoPriceEntry[] = [
  {
    id: 'libreta-de-conducir',
    label: 'La libreta de conducir',
    why: 'Dos personas. Una aprendió a manejar de grande y dice que le hubiera gustado sacarla antes.',
    related: {
      to: '/libreta-de-conducir-uruguay',
      label: 'La libreta de conducir en Uruguay',
    },
  },
  {
    id: 'auto',
    label: 'El auto',
    why: 'Una persona: moverse cuando lo necesita, sin depender de horarios ni salir con mucha anticipación.',
    related: { to: '/autos-usados-uruguay', label: 'Autos usados, en nuestro directorio' },
  },
  {
    id: 'moto',
    label: 'La moto',
    why: 'Una persona, junto al aire acondicionado.',
    related: { to: '/motos-usadas-uruguay', label: 'Motos usadas, en nuestro directorio' },
  },
  {
    id: 'aire-acondicionado',
    label: 'El aire acondicionado',
    why: 'Una persona, junto a la moto.',
    related: {
      to: '/equipar-casa-uruguay/aire-acondicionado',
      label: 'Aires acondicionados por BTU, en Equipar una casa',
    },
  },
  {
    id: 'cama',
    label: 'Una cama más grande o un sommier nuevo',
    why: 'Una persona tiene una cama extra king de 2 × 2 m; otra junta plata para cambiar el colchón por un sommier, y quien abrió el hilo le contestó que el descanso va primero.',
    related: { to: '/cuanto-gastar-en-un-sommier-uruguay', label: 'Cuánto gastar en un sommier' },
  },
  {
    id: 'reloj-inteligente',
    label: 'El reloj inteligente',
    why: 'Quien abrió el hilo dice que además de medir el ejercicio le sirvió para dormir mejor. No le ponemos precio: muchos avisos de relojes, y la mayoría de los de Apple, nombran la correa en el título, y así no se pueden separar bien de los de correas sueltas.',
  },
  {
    id: 'automatizar-la-casa',
    label: 'Automatizar la casa',
    why: 'Quien abrió el hilo lo pone primero en su lista, sin decir con qué aparatos: es un proyecto, no un producto con un precio.',
  },
  {
    id: 'championes',
    label: 'Championes cómodos',
    why: 'Dos personas. Una banda de precio mezclaría talles, modelos y temporadas.',
  },
  {
    id: 'equipos-de-trabajo',
    label: 'La computadora y el celular de trabajo',
    why: 'A una persona le cambió la rutina gastar en equipos que dan lo que su trabajo pide.',
    related: { to: '/celulares-uruguay', label: 'Precios de celulares por modelo' },
  },
  {
    id: 'pc-gamer',
    label: 'La PC gamer',
    why: 'Una persona. Una banda mezclaría equipos de precios muy distintos.',
  },
  {
    id: 'simulador',
    label: 'El simulador de carreras',
    why: 'El entretenimiento principal de una persona, en lugar de mirar televisión: un armado de varias piezas, no un producto.',
  },
  {
    id: 'inteligencia-artificial',
    label: 'La inteligencia artificial',
    why: 'Dos personas; una dice que su trabajo cambió por completo.',
  },
  {
    id: 'anki',
    label: 'Anki',
    why: 'Una app para repasar con tarjetas de memoria.',
  },
  {
    id: 'libros',
    label: 'Los libros',
    why: 'Una persona, que dice que le aportaron más que casi cualquier otra cosa.',
  },
  {
    id: 'cosas-chicas',
    label: 'Cosas chicas para el día a día',
    why: 'Una persona nombra una crema para los pies, un sacacallos y un recipiente para la comida del perro.',
  },
  {
    id: 'plata',
    label: 'La plata',
    why: 'La respuesta en broma de siempre.',
  },
]

export const PRODUCTOS_VIDA_LEFT_OUT =
  'Dejamos afuera los productos para adultos y un remedio sin evidencia que también aparecieron en el hilo.'
