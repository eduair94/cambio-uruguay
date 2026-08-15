// Índice liviano de las fichas /importar/<categoria>.
//
// POR QUÉ EXISTE: `importCategories.ts` son ~300 kB de texto legal con fuentes, y sólo las dos
// páginas de /importar lo necesitan. El buscador del sitio y el sitemap sólo precisan saber que
// las páginas existen y cómo se llaman, así que leen esto y no arrastran el catálogo entero al
// bundle de búsqueda. `tests/unit/importCategories.test.ts` verifica que los dos no se desfasen.

export interface ImportCategoryIndexEntry {
  slug: string
  title: string
  navLabel: string
  description: string
  icon: string
  /** Ejemplos concretos, para el buscador ("kindle", "perfume", "yerba"). */
  keywords: string[]
}

export const IMPORT_CATEGORY_INDEX: readonly ImportCategoryIndexEntry[] = Object.freeze([
  {
    slug: 'libros',
    title: 'Importar libros a Uruguay: exención total y cómo declararlo',
    navLabel: 'Libros',
    description:
      'Los libros están exonerados de todo tributo nacional y quedan fuera del tope de US$ 800: pedile al operador que declare el envío como J/01 y no como franquicia.',
    icon: 'mdi-book-open-variant',
    keywords: [
      'Una novela comprada en Amazon',
      'Libros de texto y bibliografía para la facultad',
      'Revistas y folletos',
      'Catálogos de difusión de obras',
      'Material educativo: mapas, globos terráqueos, láminas escolares',
      'Reproducciones impresas de obras de arte',
    ],
  },
  {
    slug: 'celulares-y-radiofrecuencia',
    title: 'Importar un celular a Uruguay: IVA, certificado URSEC y cómo declararlo',
    navLabel: 'Celulares y radio',
    description:
      'Un celular paga 22% de IVA y necesita certificado previo de URSEC en VUCE ($204 a $239, hasta 2 días hábiles); lo que sólo usa Wi-Fi o Bluetooth está exceptuado.',
    icon: 'mdi-cellphone-wireless',
    keywords: [
      'Un celular comprado en Amazon o AliExpress',
      'Un router con módem celular (4G/5G)',
      'Un GPS de auto o de mano',
      'Un handy o walkie-talkie',
      'Una cámara de seguridad con chip celular',
      'Un dron que se comunica por radioenlace propietario',
    ],
  },
  {
    slug: 'electronica',
    title: 'Importar electrónica a Uruguay: impuestos y cómo declararlo',
    navLabel: 'Electrónica sin radio',
    description:
      'La electrónica paga 22% de IVA incluso con franquicia, con un mínimo de US$ 20 por envío, y no necesita certificado de URSEC si sólo usa Wi-Fi o Bluetooth.',
    icon: 'mdi-laptop',
    keywords: [
      'Notebook o laptop',
      'Monitor, teclado y mouse',
      'Disco SSD externo, memorias y componentes de PC',
      'Auriculares Bluetooth y parlantes portátiles',
      'Smartwatch y pulseras de actividad',
      'Consola de videojuegos y joysticks',
    ],
  },
  {
    slug: 'ropa-y-calzado',
    title: 'Importar ropa y calzado a Uruguay: impuestos y cómo declararlo',
    navLabel: 'Ropa y calzado',
    description:
      'La ropa y el calzado no tienen exención: pagan 22% de IVA y el IVA de un envío postal nunca baja de US$ 20, así que por debajo de US$ 90,91 el piso encarece todo.',
    icon: 'mdi-tshirt-crew',
    keywords: [
      'una campera o un buzo',
      'zapatillas y botas',
      'vaqueros, remeras y ropa interior',
      'una cartera, un bolso o una mochila',
      'un reloj de pulsera común y sus mallas',
      'bisutería y accesorios de pelo',
    ],
  },
  {
    slug: 'juguetes',
    title: 'Importar juguetes a Uruguay: impuestos, exenciones y cómo declararlo',
    navLabel: 'Juguetes y hobby',
    description:
      'Los juguetes pagan 22% de IVA aun usando la franquicia, y en el régimen postal el IVA no baja de US$ 20 por envío: debajo de US$ 90,91 ese piso es el costo real.',
    icon: 'mdi-toy-brick',
    keywords: [
      'Sets de bloques tipo Lego',
      'Muñecas y figuras de acción',
      'Juegos de mesa importados',
      'Autos y aviones a control remoto',
      'Consolas y videojuegos',
      'Puzzles, maquetas y modelismo',
    ],
  },
  {
    slug: 'medicamentos',
    title: 'Importar medicamentos a Uruguay: IVA, permiso del MSP y cómo declarar',
    navLabel: 'Medicamentos',
    description:
      'Los medicamentos pagan IVA al 10% con un mínimo de US$ 20 por envío, pero el MSP sólo habilita el ingreso por particulares en un caso: producto no registrado en el país.',
    icon: 'mdi-pill',
    keywords: [
      'una especialidad farmacéutica que acá no está registrada',
      'la medicación de un tratamiento que te manda un familiar del exterior',
      'un genérico comprado en una farmacia online porque acá sale más caro',
      'medicación crónica que se discontinuó en plaza',
      'un repelente corporal contra mosquitos registrado ante el MSP',
      'un remedio de venta libre comprado junto con otras cosas',
    ],
  },
  {
    slug: 'suplementos-y-vitaminas',
    title: 'Importar suplementos y vitaminas a Uruguay: impuestos y trámites',
    navLabel: 'Suplementos y vitaminas',
    description:
      'Los suplementos y vitaminas pagan 22% de IVA, con un piso de US$ 20 por envío, y el MSP no habilita el ingreso por particulares salvo excepción puntual.',
    icon: 'mdi-nutrition',
    keywords: [
      'Multivitamínico de iHerb o Amazon',
      'Vitamina D3, vitamina C, complejo B',
      'Magnesio, zinc, hierro',
      'Omega 3 / aceite de pescado',
      'Creatina y pre-entreno',
      'Proteína de suero (whey) y caseína',
    ],
  },
  {
    slug: 'productos-medicos-y-opticos',
    title: 'Importar productos médicos y ópticos a Uruguay: impuestos y trámites',
    navLabel: 'Médicos y ópticos',
    description:
      'Los anteojos graduados y lentes de contacto no pueden entrar a nombre de una persona física: sólo empresas habilitadas ante el MSP. El resto paga 22% de IVA, salvo implantes quirúrgicos y reactivos de diagnóstico, que van al 10%.',
    icon: 'mdi-medical-bag',
    keywords: [
      'tensiómetro digital de brazo',
      'glucómetro y tiras reactivas de glicemia',
      'oxímetro de pulso',
      'nebulizador o aspirador nasal',
      'termómetro clínico',
      'audífono o prótesis auditiva',
    ],
  },
  {
    slug: 'cosmeticos-y-perfumeria',
    title: 'Importar cosméticos a Uruguay: IVA, IMESI y cómo declararlo',
    navLabel: 'Cosméticos y perfumería',
    description:
      'El perfume y el maquillaje pagan IMESI y por eso quedan fuera del régimen postal; el champú, el jabón y el desodorante sí entran y pagan IVA 22%, con piso de US$ 20.',
    icon: 'mdi-lipstick',
    keywords: [
      'perfume, extracto o eau de parfum',
      'maquillaje: base, labial, sombras, máscara',
      'cremas faciales, sérums y contorno de ojos',
      'champú y acondicionador',
      'desodorante y antitranspirante',
      'protector solar',
    ],
  },
  {
    slug: 'alimentos',
    title: 'Importar alimentos a Uruguay: impuestos, exenciones y cómo declarar',
    navLabel: 'Alimentos',
    description:
      'Arroz, fideos, aceite, yerba y café pagan 10% de IVA, pero el mínimo de US$ 20 muerde por debajo de US$ 200, y el MGAP prohíbe por correo todo alimento de origen animal.',
    icon: 'mdi-food-apple',
    keywords: [
      'Yerba y café en grano',
      'Arroz, fideos y harinas',
      'Aceite de oliva y otros aceites comestibles',
      'Té y especias en envases chicos',
      'Snacks, chocolates y galletitas',
      'Gaseosas y bebidas sin alcohol',
    ],
  },
  {
    slug: 'plantas-semillas-y-fertilizantes',
    title: 'Importar plantas, semillas y fertilizantes a Uruguay: permisos e IVA',
    navLabel: 'Plantas y semillas',
    description:
      'El MGAP prohíbe ingresar semillas, plantas, fertilizantes y plaguicidas por correo o encomienda: no hay franja de uso personal y pagar el 60% no lo destraba.',
    icon: 'mdi-sprout',
    keywords: [
      'Semillas de hortalizas, flores o césped para siembra',
      'Plantines, esquejes y plantas vivas',
      'Bulbos y raíces para plantar',
      'Fertilizantes, enmiendas y bioestimulantes',
      'Plaguicidas y fungicidas de jardín',
      'Kits de huerta que vienen con sobrecitos de semillas',
    ],
  },
  {
    slug: 'bebidas-alcoholicas-y-tabaco',
    title: 'Importar alcohol y tabaco a Uruguay: impuestos y por qué no entran',
    navLabel: 'Alcohol y tabaco',
    description:
      'Bebidas alcohólicas y tabaco quedan fuera del régimen postal en todos los casos: el art. 633 de la Ley 20.446 excluye toda mercadería gravada por IMESI.',
    icon: 'mdi-glass-wine',
    keywords: [
      'Una botella de whisky o de vino comprada en una tienda del exterior',
      'Cigarros o puros',
      'Tabaco para armar o para pipa',
      'Cerveza artesanal importada',
      'Licores, bitters, vermut y aperitivos',
      'Un cartón de cigarrillos que te manda un familiar',
    ],
  },
  {
    slug: 'vehiculos-y-repuestos',
    title: 'Importar repuestos y vehículos a Uruguay: impuestos y cómo declararlo',
    navLabel: 'Vehículos y repuestos',
    description:
      'El vehículo y la moto no entran por correo: los excluye el IMESI. El repuesto sí, con IVA 22% y piso de US$ 20; la bicicleta a pedal no paga IMESI.',
    icon: 'mdi-car',
    keywords: [
      'Pastillas, discos y cilindros de freno',
      'Filtros de aceite, aire y combustible',
      'Sensores y módulos electrónicos (ECU, sonda lambda)',
      'Espejos, manijas, molduras y ópticas',
      'Kit de embrague y correa de distribución',
      'Casco, guantes y accesorios de moto',
    ],
  },
  {
    slug: 'armas-y-replicas',
    title: 'Importar armas, réplicas y airsoft a Uruguay: qué se puede y qué no',
    navLabel: 'Armas y réplicas',
    description:
      'Las armas no entran por encomienda postal y el permiso del SMA no tiene modalidad para persona física. Al airsoft no lo regula ninguna norma vigente: lo único publicado es un criterio administrativo de la Aduana.',
    icon: 'mdi-pistol',
    keywords: [
      'pistola de airsoft',
      'rifle o pistola de aire comprimido',
      'réplica de arma para colección o utilería',
      'mira térmica',
      'visor de visión nocturna',
      'mira telescópica común',
    ],
  },
  {
    slug: 'productos-prohibidos',
    title: 'Productos prohibidos: qué no podés importar a Uruguay por correo',
    navLabel: 'Prohibidos',
    description:
      'Qué no entra por correo: el vape está prohibido por decreto, las baterías de litio no, y la única lista enumerada de la DNA es de 2023 y cita norma derogada.',
    icon: 'mdi-cancel',
    keywords: [
      'vaporizadores y cigarrillos electrónicos',
      'productos de tabaco calentado',
      'accesorios y repuestos de vaporizador',
      'pirotecnia de estruendo',
      'armas',
      'miras térmicas o de visión nocturna',
    ],
  },
  {
    slug: 'otros-productos',
    title: 'Importar otros productos a Uruguay: impuestos y cómo declararlo',
    navLabel: 'Otros productos',
    description:
      'Casi todo cae en el 22% de IVA, pero el mínimo de US$ 20 por envío hace que una compra de US$ 15 pague lo mismo que una de US$ 90: cómo declarar y qué elegir.',
    icon: 'mdi-package-variant-closed',
    keywords: [
      'Herramientas de mano y sus repuestos',
      'Artículos deportivos: guantes, pelotas, bolsos',
      'Instrumentos musicales y accesorios (cuerdas, pedales, fundas)',
      'Muebles chicos y artículos para el hogar',
      'Relojes, bisutería y objetos de colección',
      'Repuestos y accesorios de bicicleta',
    ],
  },
])

/** Todos los slugs publicados, en orden editorial. */
export function importCategoryIndexSlugs(): string[] {
  return IMPORT_CATEGORY_INDEX.map(c => c.slug)
}
