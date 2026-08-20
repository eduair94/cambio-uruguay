// El texto de las páginas individuales de descuentos: una por emisor
// (/descuentos-con-tarjeta-uruguay/<banco>) y una por rubro (.../rubro/<rubro>).
//
// REGLA DURA: acá NO hay números. Ni una cifra de marcas, ni un porcentaje, ni una cantidad de
// locales. Todo lo cuantitativo lo pone la lectura viva del catálogo en la propia página, y el
// texto del descuento se cita tal cual lo publica el emisor. Un número escrito a mano en un
// archivo de copy queda viejo en la primera semana y convierte una página útil en una que miente
// con confianza — el mismo criterio con el que `bankosAnalysis.ts` se niega a promediar
// porcentajes que el catálogo nunca trajo.
//
// Lo que SÍ vive acá es lo que ninguna tabla puede decir: cómo lee sus descuentos cada emisor
// (Itaú escala por gama, BROU fija días, OCA concentra todo en el viernes), qué NO es lo que
// parece (Club El País no es una tarjeta bancaria) y a qué página del sitio sigue el lector.
//
// El `category` de cada rubro es la cadena EXACTA del catálogo de Bankos. Si Bankos la renombra,
// la página queda vacía y el test de cobertura lo grita; se arregla acá, no en la página.
//
// PURE (sin Vue, sin Nuxt) para que las páginas, el sitemap y los tests compartan una sola lista.

export interface BankosPageFaq {
  id: string
  question: string
  answer: string
}

export interface BankosRelatedLink {
  to: string
  label: string
}

export interface BankosBankPage {
  /** Slug en la URL, bajo /descuentos-con-tarjeta-uruguay/. */
  slug: string
  /** Id del emisor en el catálogo de Bankos (`BANKOS_BANKS`). */
  bankId: string
  /** H1. Escrito como lo buscaría alguien, no como un nombre de categoría. */
  h1: string
  /** <title>, sin el sufijo del sitio. */
  seoTitle: string
  seoDescription: string
  /** Párrafo bajo el H1: por qué esta página y no la web del banco. */
  intro: string
  /** Cómo lee sus descuentos este emisor. Es lo que diferencia una página de otra. */
  howItWorks: string
  /** La letra chica propia de este emisor. Sin cifras: condiciones, no montos. */
  watchOut: string
  keywords: readonly string[]
  faq: readonly BankosPageFaq[]
  related: readonly BankosRelatedLink[]
}

export interface BankosCategoryPage {
  /** Slug en la URL, bajo /descuentos-con-tarjeta-uruguay/rubro/. */
  slug: string
  /** Categoría EXACTA del catálogo de Bankos. */
  category: string
  /** Etiqueta corta: chips, breadcrumb, tablas. */
  label: string
  h1: string
  seoTitle: string
  seoDescription: string
  intro: string
  icon: string
  keywords: readonly string[]
  faq: readonly BankosPageFaq[]
  related: readonly BankosRelatedLink[]
}

/** Preguntas que valen igual en las diez páginas de emisor. Las propias se suman después. */
export const BANKOS_SHARED_FAQ: readonly BankosPageFaq[] = Object.freeze([
  {
    id: 'de-donde-salen',
    question: '¿De dónde salen estos descuentos?',
    answer:
      'De la app Bankos (bankos.uy), que releva los beneficios que publican los emisores uruguayos. Esta página los reordena por marca y por rubro, y muestra el texto del beneficio tal como lo publica el emisor. No estamos afiliados a Bankos ni a los bancos: ante cualquier diferencia manda la letra chica del emisor.',
  },
  {
    id: 'cada-cuanto',
    question: '¿Cada cuánto se actualiza?',
    answer:
      'La lectura se rehace cada vez que se abre la página, sobre datos que se refrescan a diario. La fecha de la última lectura aparece al pie. Si el proveedor está caído, se sirve el último relevamiento guardado en vez de mostrar la página vacía.',
  },
  {
    id: 'cuanto-ahorro',
    question: '¿Esta página dice cuánto voy a ahorrar?',
    answer:
      'No, y a propósito. El catálogo trae el texto del beneficio, no un número comparable: "hasta 30% Off" y "30% de descuento" no son lo mismo, y ningún promedio automático sabría distinguirlos. Acá se cuenta cobertura —cuántas marcas y locales— y se cita el texto del emisor sin tocarlo. El ahorro real depende de la tarjeta puntual, el día, el tope mensual y la campaña vigente.',
  },
  {
    id: 'tope',
    question: '¿Los descuentos tienen tope?',
    answer:
      'Casi siempre sí, y el catálogo no lo trae. Los emisores publican topes por cuenta y por mes que cambian con cada campaña, y algunos beneficios no son acumulables entre sí ni con promociones del comercio. Antes de contar con un descuento grande, confirmalo en la página oficial del emisor.',
  },
])

/**
 * Una página por emisor del catálogo, en el orden en que se listan.
 *
 * El slug NO es siempre el id de Bankos: `clubelpais` y `mercadopago` viajan pegados en el
 * catálogo y separados en la URL, porque la URL la lee una persona.
 */
export const BANKOS_BANK_PAGES: readonly BankosBankPage[] = Object.freeze([
  {
    slug: 'itau',
    bankId: 'itau',
    h1: 'Descuentos con tarjeta Itaú en Uruguay',
    seoTitle: 'Descuentos Itaú Uruguay: en qué comercios y con qué tarjeta',
    seoDescription:
      'Todos los comercios con descuento Itaú en Uruguay, ordenados por rubro y por cantidad de locales: qué dice el beneficio con crédito, con débito Volar y con las gamas Platinum, Infinite y Black.',
    intro:
      'Itaú publica sus beneficios repartidos entre la web, la app y las campañas del mes, y nadie entra a revisarlos antes de sentarse a comer. Acá están juntos, agrupados por lo único que importa cuando ya tenés la tarjeta en el bolsillo: en qué marca aplica, con cuál de tus tarjetas Itaú y en cuántos locales.',
    howItWorks:
      'Itaú escala el descuento por gama de tarjeta: la misma marca suele tener un porcentaje con las tarjetas de crédito comunes y otro mayor con Platinum, Infinite y Black. Por eso el mismo comercio aparece con dos cifras en un solo texto. El débito va por separado y es donde más se achica la red: no todas las marcas que aceptan el beneficio con crédito lo mantienen pagando con débito.',
    watchOut:
      'Que una marca figure con crédito no significa que figure con débito, y la gama alta no aplica en todas: fijate qué gamas nombra el texto del beneficio antes de contar con el porcentaje más alto. El descuento tampoco es acumulable con las promociones del comercio salvo que el emisor lo diga.',
    keywords: [
      'descuentos itau uruguay',
      'beneficios itau uruguay',
      'promociones itau uruguay',
      'descuentos tarjeta itau',
      'itau volar descuentos',
      'descuentos itau platinum',
      'donde tengo descuento con itau',
    ],
    faq: [
      {
        id: 'itau-gamas',
        question: '¿El descuento de Itaú es el mismo con cualquier tarjeta?',
        answer:
          'No. El texto de cada beneficio suele nombrar dos escalones: uno para las tarjetas de crédito Itaú en general y otro, mayor, para Platinum, Infinite y Black. En la tabla de esta página cada escalón aparece con las marcas donde aplica, así podés ver cuánto cambia realmente por gama.',
      },
      {
        id: 'itau-debito',
        question: '¿Sirve el descuento pagando con débito Itaú?',
        answer:
          'En parte de la red. Esta página separa las marcas donde el beneficio también aplica con tarjeta de débito Itaú de las que sólo lo dan con crédito; el conteo está arriba de la tabla y se recalcula con cada lectura.',
      },
    ],
    related: [
      { to: '/mejores-bancos-uruguay', label: 'Tier list de bancos: dónde está Itaú' },
      {
        to: '/adelanto-de-efectivo-tarjeta-de-credito',
        label: 'Adelanto de efectivo: lo que Itaú publica en la cartilla',
      },
      {
        to: '/sala-vip-aeropuerto-uruguay',
        label: 'Sala VIP del aeropuerto: qué cobra cada banco',
      },
    ],
  },
  {
    slug: 'brou',
    bankId: 'brou',
    h1: 'Descuentos con tarjeta BROU en Uruguay',
    seoTitle: 'Descuentos BROU: comercios, días y qué tarjeta usar',
    seoDescription:
      'Los comercios con descuento BROU en Uruguay, por rubro y por cantidad de locales: qué días aplica cada beneficio, qué dice el texto con crédito, con débito y con la Recompensa Mastercard.',
    intro:
      'El BROU es el emisor con más locales adheridos del mapa y también el que más ata sus descuentos a días concretos, así que la pregunta útil no es "¿tengo descuento?" sino "¿tengo descuento HOY?". Esta página junta las marcas, el texto exacto del beneficio y los días que ese texto declara.',
    howItWorks:
      'Buena parte de la red BROU se mueve por calendario: el beneficio base con crédito nombra sus días y el de débito nombra otros, distintos. Además convive con una segunda familia de descuentos, más alta, atada a las tarjetas de crédito BROU VISA y Recompensa Mastercard. En cines el beneficio no es un porcentaje sino un 2x1 en entradas, con crédito y con débito.',
    watchOut:
      'Los días los declara el texto del emisor, y no siempre coinciden entre crédito y débito para la misma marca: leé el renglón completo antes de ir. Los beneficios del portal de BROU que rotan por campaña pueden no estar en este relevamiento, que toma los descuentos con vigencia publicada.',
    keywords: [
      'descuentos brou',
      'beneficios brou',
      'descuentos banco republica',
      'brou recompensa descuentos',
      'descuentos brou hoy',
      'descuentos brou supermercados',
      'brou 2x1 cine',
    ],
    faq: [
      {
        id: 'brou-dias',
        question: '¿Qué días aplican los descuentos del BROU?',
        answer:
          'Los declara cada beneficio, y crédito y débito suelen tener días distintos para la misma marca. En esta página el día viaja pegado al texto del descuento, tal como lo publica el emisor, en vez de resumirse en una regla general que no vale para toda la red.',
      },
      {
        id: 'brou-tarjeta-joven',
        question: '¿La MI BROU Tarjeta Joven tiene los mismos descuentos?',
        answer:
          'El texto de varios beneficios de débito la nombra junto con las tarjetas de débito VISA y la Recompensa Mastercard. Cuando aparece nombrada, el descuento la incluye; cuando no, el beneficio es de las tarjetas que el texto sí menciona.',
      },
    ],
    related: [
      { to: '/mejores-bancos-uruguay', label: 'Tier list de bancos: dónde está el BROU' },
      { to: '/cuenta-remunerada-uruguay', label: 'Qué te paga la cuenta por dejar la plata ahí' },
      { to: '/pagar-cuentas-con-tarjeta', label: 'Pagar UTE, OSE y la patente con tarjeta' },
    ],
  },
  {
    slug: 'santander',
    bankId: 'santander',
    h1: 'Descuentos con tarjeta Santander en Uruguay',
    seoTitle: 'Descuentos Santander Uruguay: comercios, crédito y débito',
    seoDescription:
      'Comercios con descuento Santander en Uruguay por rubro y cantidad de locales: qué dice el beneficio con crédito, con débito y con las gamas Select, Platinum y Private Banking.',
    intro:
      'Santander es de los emisores que más parejo trata al crédito y al débito: buena parte de las marcas de la red publican beneficio para los dos. Esta página muestra marca por marca cuál de los dos aplica, con el texto tal cual lo publica el banco.',
    howItWorks:
      'El esquema tiene dos escalones: un porcentaje para las tarjetas Santander y otro mayor para las gamas Select, Platinum y Private Banking. A diferencia de otros emisores, el escalón alto aparece tanto en crédito como en débito según la marca, así que conviene mirar el renglón entero y no sólo la primera cifra.',
    watchOut:
      'El escalón alto sólo aplica en las marcas donde el texto lo nombra: en el resto, tener una Select no cambia el porcentaje. Y "Soy Santander" es un programa aparte, con sus propios centros de canje, que no se ve en este mapa.',
    keywords: [
      'descuentos santander uruguay',
      'beneficios santander uruguay',
      'promociones santander uruguay',
      'santander select descuentos',
      'descuentos santander debito',
      'donde tengo descuento con santander',
    ],
    faq: [
      {
        id: 'santander-select',
        question: '¿Qué agrega tener una Santander Select o Platinum?',
        answer:
          'En las marcas donde el texto del beneficio las nombra, el porcentaje sube respecto de la tarjeta común. En las que no las nombra, el descuento es el mismo. La tabla de esta página separa los dos escalones con las marcas de cada uno.',
      },
      {
        id: 'santander-soy',
        question: '¿Los puntos de Soy Santander se ven acá?',
        answer:
          'No. Este mapa muestra descuentos en comercios adheridos; Soy Santander es un programa de puntos con canje propio. Están explicados en el ranking de tarjetas de crédito del sitio.',
      },
    ],
    related: [
      { to: '/mejores-bancos-uruguay', label: 'Tier list de bancos: dónde está Santander' },
      { to: '/tarjetas-de-socio-uruguay', label: 'Tarjetas de socio: descuentos sin banco' },
      { to: '/cuenta-remunerada-uruguay', label: 'Qué rinde el saldo de la cuenta' },
    ],
  },
  {
    slug: 'scotiabank',
    bankId: 'scotiabank',
    h1: 'Descuentos con tarjeta Scotiabank en Uruguay',
    seoTitle: 'Descuentos Scotiabank Uruguay: comercios, crédito y débito',
    seoDescription:
      'Los comercios con descuento Scotiabank en Uruguay, por rubro y por locales: el texto del beneficio con crédito, con débito y con las gamas Premium, Platinum, Infinite y Gold.',
    intro:
      'Scotiabank es el emisor que más lejos lleva el beneficio con débito: en gran parte de su red el descuento no exige pagar con crédito. Acá están las marcas, el rubro de cada una y el texto exacto de lo que el banco publica.',
    howItWorks:
      'El esquema repite la lógica de gamas —una cifra para las tarjetas Scotiabank y otra mayor para Premium, Platinum, Infinite o Gold según el caso—, pero la novedad está en el débito: el escalón Premium también existe pagando con débito. En cines el beneficio se dispara y lo dan las tarjetas de débito Premium e Infinite.',
    watchOut:
      'Cada beneficio nombra sus gamas y no siempre son las mismas: "Platinum, Infinite y Gold" en una marca puede ser sólo "Premium" en otra. La Club Card de Tienda Inglesa la emite Scotiabank pero su programa de puntos es de la cadena y no se ve en este mapa.',
    keywords: [
      'descuentos scotiabank uruguay',
      'beneficios scotiabank uruguay',
      'promociones scotiabank uruguay',
      'descuentos scotiabank debito',
      'scotiabank premium beneficios',
      'descuentos scotiabank cine',
    ],
    faq: [
      {
        id: 'scotia-debito',
        question: '¿Los descuentos de Scotiabank sirven con débito?',
        answer:
          'En buena parte de la red, sí: el texto de muchos beneficios nombra explícitamente las tarjetas de débito, e incluso un escalón mayor con débito Premium. El conteo exacto de marcas con débito está arriba de la tabla y se recalcula en cada lectura.',
      },
      {
        id: 'scotia-clubcard',
        question: '¿La Club Card de Tienda Inglesa entra acá?',
        answer:
          'La Club Card la emite Scotiabank, así que los beneficios de tarjetas Scotiabank que nombra el texto la alcanzan cuando corresponde. Lo que no aparece en este mapa es el programa de Puntos de Tienda Inglesa, que es de la cadena y funciona aparte.',
      },
    ],
    related: [
      { to: '/mejores-bancos-uruguay', label: 'Tier list de bancos: dónde está Scotiabank' },
      { to: '/sala-vip-aeropuerto-uruguay', label: 'Sala VIP del aeropuerto: qué da cada tarjeta' },
      { to: '/apps-de-beneficios-uruguay', label: 'Programas de fidelidad que no son del banco' },
    ],
  },
  {
    slug: 'bbva',
    bankId: 'bbva',
    h1: 'Descuentos con tarjeta BBVA en Uruguay',
    seoTitle: 'Descuentos BBVA Uruguay: comercios, crédito y débito',
    seoDescription:
      'Comercios con descuento BBVA en Uruguay por rubro y cantidad de locales: el texto del beneficio con crédito, con débito y con las gamas Internacional, Oro, Platinum y Black.',
    intro:
      'BBVA es el emisor con los textos de beneficio más fragmentados del mapa: la misma promoción aparece redactada de varias formas distintas según la campaña que la publicó. Esta página los junta igual, agrupados por texto, para que se vea cuántas marcas hay detrás de cada variante.',
    howItWorks:
      'El esquema separa las tarjetas Internacional, Oro, Pymes y Corporativas de las gamas Platinum y Black, con un escalón mayor para las segundas. Ojo con una diferencia que cambia el cálculo: varios beneficios están redactados como "hasta" un porcentaje, que no es lo mismo que un porcentaje fijo — por eso esta página nunca promedia ni convierte esos textos en un número.',
    watchOut:
      'Un "hasta X%" es un techo, no el descuento garantizado. Y como el mismo beneficio convive en varias redacciones, dos marcas que parecen tener promociones distintas pueden estar en la misma campaña: lo que manda es el texto de la marca puntual.',
    keywords: [
      'descuentos bbva uruguay',
      'beneficios bbva uruguay',
      'promociones bbva uruguay',
      'descuentos bbva debito',
      'bbva platinum beneficios',
      'donde tengo descuento con bbva',
    ],
    faq: [
      {
        id: 'bbva-hasta',
        question: '¿Qué significa "hasta 30% Off" en un beneficio BBVA?',
        answer:
          'Que ese porcentaje es el máximo del beneficio, no el que se aplica siempre. Puede depender de la gama de la tarjeta, del día o del tope de la campaña. Esta página cita el texto tal cual justamente para que la palabra "hasta" no se pierda en el camino.',
      },
      {
        id: 'bbva-gamas',
        question: '¿Cambia el descuento según la tarjeta BBVA que tenga?',
        answer:
          'Sí. Los textos separan Internacional, Oro, Pymes y Corporativas de las gamas Platinum y Black, con un escalón mayor para estas últimas. La tabla de esta página muestra las marcas de cada escalón por separado.',
      },
    ],
    related: [
      { to: '/mejores-bancos-uruguay', label: 'Tier list de bancos: dónde está BBVA' },
      { to: '/tarjetas-de-debito-uruguay', label: 'Débito para comprar en dólares: el ranking' },
      { to: '/pagar-cuentas-con-tarjeta', label: 'Pagar cuentas con tarjeta: cuándo conviene' },
    ],
  },
  {
    slug: 'oca',
    bankId: 'oca',
    h1: 'Descuentos con tarjeta OCA en Uruguay',
    seoTitle: 'Descuentos OCA: comercios, el viernes y OCA Blue',
    seoDescription:
      'Los comercios con descuento OCA en Uruguay por rubro y por locales: qué dice el beneficio de los viernes con crédito, el extra por pagar con la app y el descuento de OCA Blue.',
    intro:
      'OCA construyó su red alrededor de un día. El grueso de sus beneficios se concentra en el viernes con tarjeta de crédito, y por fuera de ese día la red se ve muy distinta. Esta página muestra el texto completo de cada beneficio, con el día que declara.',
    howItWorks:
      'El beneficio estrella suma dos partes: el descuento de los viernes con las tarjetas de crédito OCA y un extra por pagar con la app de OCA, Apple Pay o Google Pay. OCA Blue —que es dinero electrónico, no una tarjeta de crédito— tiene su propio porcentaje, más bajo y sin día fijo, y aparece como beneficio de débito en la tabla.',
    watchOut:
      'El extra de la app tiene un tope propio, distinto del tope general, y se comparte entre todas las promociones activas de OCA App. Las cuotas sin recargo que suelen acompañar la promo no son parte del descuento y tienen su propia condición de red. El detalle de topes está en la ficha de OCA del ranking de tarjetas.',
    keywords: [
      'descuentos oca',
      'oca viernes descuentos',
      'beneficios oca uruguay',
      'oca blue descuentos',
      'descuentos oca app',
      'donde tengo descuento con oca',
    ],
    faq: [
      {
        id: 'oca-viernes',
        question: '¿Los descuentos de OCA son sólo los viernes?',
        answer:
          'La mayor parte de la red sí lo declara para el viernes con tarjeta de crédito, pero no toda: hay beneficios sin día fijo y otros con días propios. En esta página el día viaja dentro del texto del beneficio de cada marca, que es donde OCA lo publica.',
      },
      {
        id: 'oca-blue',
        question: '¿OCA Blue tiene los mismos descuentos que la tarjeta de crédito OCA?',
        answer:
          'No. OCA Blue es dinero electrónico y tiene su propio porcentaje, en general menor y sin el día fijo del beneficio de crédito. En la tabla aparece del lado del débito, separada del beneficio de la tarjeta de crédito.',
      },
    ],
    related: [
      { to: '/tarjetas-de-debito-uruguay', label: 'OCA Blue en el ranking de débito y prepagas' },
      { to: '/mejores-bancos-uruguay', label: 'Bancos y emisores: la tier list' },
      { to: '/apps-de-beneficios-uruguay', label: 'Apps de beneficios: qué devuelve cada una' },
    ],
  },
  {
    slug: 'anda',
    bankId: 'anda',
    h1: 'Descuentos con tarjeta ANDA en Uruguay',
    seoTitle: 'Descuentos ANDA: comercios adheridos y con qué tarjeta',
    seoDescription:
      'Los comercios con descuento ANDA en Uruguay, por rubro y por cantidad de locales: qué dice cada beneficio de la tarjeta de crédito ANDA y en qué rubros tiene la red más grande.',
    intro:
      'ANDA no es un banco: es la Asociación Nacional de Afiliados, una cooperativa, y su red de comercios adheridos está armada con otra lógica que la de los bancos. Es de las que más marcas distintas cubre del mapa, y buena parte de ellas no las tiene ningún emisor bancario.',
    howItWorks:
      'Los beneficios de ANDA se publican como un porcentaje directo con la tarjeta de crédito ANDA, sin escalones por gama de tarjeta. Lo que cambia entre marcas es el porcentaje, no la tarjeta: por eso en la tabla de esta página los tramos se leen como una escala de comercios, no como una escala de productos.',
    watchOut:
      'Los beneficios de ANDA se declaran con tarjeta de crédito ANDA; si tenés otra tarjeta del mismo emisor, confirmá que el texto la nombre. Y como buena parte de la red son comercios de barrio y no cadenas nacionales, el local que ves en el mapa puede ser el único de esa marca.',
    keywords: [
      'descuentos anda',
      'anda comercios adheridos',
      'beneficios anda uruguay',
      'tarjeta anda descuentos',
      'anda descuentos opticas',
      'donde tengo descuento con anda',
    ],
    faq: [
      {
        id: 'anda-que-es',
        question: '¿ANDA es un banco?',
        answer:
          'No. ANDA es la Asociación Nacional de Afiliados, una cooperativa que emite tarjeta de crédito propia y opera además otros servicios para sus afiliados. Por eso su red de descuentos se parece poco a la de los bancos: pesan mucho los comercios chicos y los rubros de servicios.',
      },
      {
        id: 'anda-debito',
        question: '¿Los descuentos de ANDA sirven con débito?',
        answer:
          'Los beneficios del mapa se publican con la tarjeta de crédito ANDA. Arriba de la tabla está el conteo de marcas con beneficio de débito para este emisor, recalculado en cada lectura: si aparece en cero, es que en este relevamiento no hay ninguno.',
      },
    ],
    related: [
      { to: '/tarjetas-de-credito-uruguay', label: 'La tarjeta ANDA en el ranking de crédito' },
      { to: '/tarjetas-de-socio-uruguay', label: 'Otras credenciales de socio con descuentos' },
      { to: '/prestamos-uruguay', label: 'Préstamos: qué cobra cada emisor' },
    ],
  },
  {
    slug: 'club-el-pais',
    bankId: 'clubelpais',
    h1: 'Descuentos con la tarjeta Club El País',
    seoTitle: 'Descuentos Club El País: comercios y días de la tarjeta',
    seoDescription:
      'Los comercios con descuento de la tarjeta Club El País en Uruguay, por rubro y por locales: qué días aplica cada beneficio y en qué se diferencia de una tarjeta bancaria.',
    intro:
      'La Club El País no es una tarjeta de crédito ni de débito: es una credencial de socio que se presenta en la caja. Eso cambia todo lo demás —no financia, no acumula puntos bancarios y el beneficio no depende de con qué pagues—, y por eso conviene mirarla al lado de las tarjetas del banco y no en su lugar.',
    howItWorks:
      'El beneficio se obtiene presentando la tarjeta, y buena parte de la red lo ata a días concretos de la semana. Como no es un medio de pago, en la tabla de esta página aparece del lado del débito por convención del catálogo, pero lo que estás leyendo es "presentando la tarjeta", no "pagando con".',
    watchOut:
      'Al no ser medio de pago, el descuento se suma o no a lo que ofrezca tu tarjeta bancaria según lo que acepte el comercio, y eso el catálogo no lo dice. Confirmá en la caja antes de contar con los dos beneficios juntos.',
    keywords: [
      'club el pais descuentos',
      'tarjeta club el pais beneficios',
      'club el pais comercios adheridos',
      'descuentos club el pais restaurantes',
      'club el pais dias de descuento',
    ],
    faq: [
      {
        id: 'clubelpais-tipo',
        question: '¿La tarjeta Club El País es una tarjeta de crédito?',
        answer:
          'No. Es una credencial de socio que se presenta en el comercio para acceder al descuento: no financia compras, no tiene línea de crédito y el beneficio no depende del medio de pago que uses.',
      },
      {
        id: 'clubelpais-acumular',
        question: '¿Puedo usar Club El País y el descuento de mi banco al mismo tiempo?',
        answer:
          'Depende del comercio y de las bases de cada promoción, y el catálogo no trae ese dato. Muchos beneficios no son acumulables entre sí. Preguntá en la caja antes de contar con los dos.',
      },
    ],
    related: [
      { to: '/tarjetas-de-socio-uruguay', label: 'Todas las tarjetas de socio con descuentos' },
      { to: '/apps-de-beneficios-uruguay', label: 'Apps y programas de beneficios' },
      { to: '/tarjetas-de-credito-uruguay', label: 'El ranking de tarjetas de crédito' },
    ],
  },
  {
    slug: 'mercado-pago',
    bankId: 'mercadopago',
    h1: 'Descuentos con Mercado Pago en Uruguay',
    seoTitle: 'Descuentos Mercado Pago Uruguay: comercios y dinero disponible',
    seoDescription:
      'Comercios con descuento pagando con Mercado Pago en Uruguay: qué dice cada beneficio, por qué exige dinero disponible en la cuenta y en qué rubros aparece.',
    intro:
      'Los beneficios de Mercado Pago en comercio físico son pocos en número pero pesados en locales: se concentran en cadenas grandes, así que la cuenta de comercios adheridos que ves acá no se parece a la cantidad de marcas. Esta página muestra las dos cifras por separado.',
    howItWorks:
      'El texto de los beneficios exige pagar con dinero disponible en Mercado Pago, no con una tarjeta cargada en la billetera: son cosas distintas y el descuento sólo aplica a la primera. Algunos beneficios además declaran días propios.',
    watchOut:
      'Pagar con QR de Mercado Pago usando una tarjeta de crédito no es "dinero disponible": si el texto lo pide, el descuento no aplica. Y el saldo de la cuenta no es lo mismo que el rendimiento del saldo, que es otro producto.',
    keywords: [
      'descuentos mercado pago uruguay',
      'mercado pago beneficios uruguay',
      'descuentos qr mercado pago',
      'mercado pago dinero disponible descuento',
      'promociones mercado pago uruguay',
    ],
    faq: [
      {
        id: 'mp-dinero-disponible',
        question: '¿Qué es "dinero disponible" en Mercado Pago?',
        answer:
          'Es el saldo que ya está en la cuenta de Mercado Pago, distinto de pagar con una tarjeta asociada a la billetera. Los beneficios que lo exigen no aplican si el pago sale de una tarjeta de crédito o débito cargada en la app.',
      },
      {
        id: 'mp-marcas-locales',
        question: '¿Por qué hay pocas marcas y muchos locales?',
        answer:
          'Porque los beneficios están concentrados en cadenas con muchas sucursales. Una sola marca puede aportar decenas de locales al mapa, así que la cobertura por marca y la cobertura por local cuentan historias distintas. Las dos están arriba de la tabla.',
      },
    ],
    related: [
      { to: '/tarjetas-de-debito-uruguay', label: 'Mercado Pago en el ranking de débito' },
      { to: '/cuenta-remunerada-uruguay', label: 'Qué rinde el saldo de una billetera' },
      { to: '/apps-economia-uruguay', label: 'Apps de dinero en Uruguay' },
    ],
  },
  {
    slug: 'prex',
    bankId: 'prex',
    h1: 'Descuentos con Prex en Uruguay',
    seoTitle: 'Descuentos Prex Uruguay: qué comercios y con qué condición',
    seoDescription:
      'Los comercios con descuento pagando con Prex en Uruguay: el texto de cada beneficio, las condiciones que declara y por qué la red es chica comparada con la de los bancos.',
    intro:
      'Prex es una prepaga y su red de descuentos en comercio físico es la más chica del mapa: en este relevamiento se cuenta con los dedos. Vale la página igual, porque la pregunta "¿Prex tiene descuentos?" se hace mucho y la respuesta honesta es corta y verificable.',
    howItWorks:
      'Los beneficios que aparecen están atados a condiciones puntuales —un código promocional, pagar sin contacto, recargar desde la app—, no a un porcentaje general de la tarjeta. Cada uno se lee entero o no se entiende.',
    watchOut:
      'El fuerte de Prex no es el descuento en comercio físico sino el costo de comprar en dólares, que es otra pregunta y está medida en el ranking de débito y prepagas. Si viniste buscando descuentos de todos los días, el mapa combinado con otra tarjeta te va a servir más.',
    keywords: [
      'descuentos prex uruguay',
      'prex beneficios',
      'prex promociones uruguay',
      'prex comercios adheridos',
      'descuentos con prex',
    ],
    faq: [
      {
        id: 'prex-pocos',
        question: '¿Prex tiene descuentos en comercios?',
        answer:
          'Muy pocos comparado con los bancos, y con condiciones propias en vez de un porcentaje general. Esta página lista los que trae el relevamiento vigente, con el texto exacto de cada uno.',
      },
      {
        id: 'prex-para-que',
        question: '¿Para qué conviene Prex entonces?',
        answer:
          'Su ventaja medida está del lado del costo de comprar en dólares, no del descuento en comercio local. Eso se compara en el ranking de tarjetas de débito y prepagas del sitio, con la comisión y el spread de cada una.',
      },
    ],
    related: [
      { to: '/tarjetas-de-debito-uruguay', label: 'Prex en el ranking de débito y prepagas' },
      { to: '/herramientas/calculadora-spread', label: 'Calculadora de spread' },
      { to: '/apps-economia-uruguay', label: 'Apps de dinero en Uruguay' },
    ],
  },
])

/**
 * Una página por rubro del catálogo.
 *
 * Falta "Otros" a propósito: es el cajón de sastre de Bankos —academias, colegios, servicios
 * sueltos— y una página titulada "Descuentos en Otros" no contesta ninguna búsqueda. Sus marcas
 * siguen apareciendo en las páginas de emisor, que es donde tienen sentido.
 */
export const BANKOS_CATEGORY_PAGES: readonly BankosCategoryPage[] = Object.freeze([
  {
    slug: 'restaurantes',
    category: 'Restaurantes',
    label: 'Restaurantes',
    h1: 'Descuentos en restaurantes en Uruguay con tarjeta',
    seoTitle: 'Descuentos en restaurantes Uruguay: qué banco conviene',
    seoDescription:
      'Qué tarjeta te da descuento en restaurantes en Uruguay: ranking de emisores por cantidad de locales adheridos y la lista de restaurantes con beneficio, con el texto de cada descuento.',
    intro:
      'Es el rubro más grande del mapa y el que más se decide en la vereda, treinta segundos antes de entrar. Acá está al revés de como lo publican los bancos: primero qué emisor cubre más restaurantes, después la lista de restaurantes con el beneficio de cada uno.',
    icon: 'mdi-silverware-fork-knife',
    keywords: [
      'descuentos en restaurantes uruguay',
      'descuentos gastronomia montevideo',
      'que tarjeta tiene descuento en restaurantes',
      'descuentos para comer afuera uruguay',
      'promociones restaurantes tarjeta',
    ],
    faq: [
      {
        id: 'resto-iva',
        question: '¿El descuento se suma a la rebaja de IVA en gastronomía?',
        answer:
          'Son cosas distintas: la rebaja de IVA en gastronomía la da la ley pagando con tarjeta o dinero electrónico, y el descuento lo da el emisor. Se aplican sobre el mismo ticket, pero el segundo depende del comercio y del día, y la primera no.',
      },
    ],
    related: [
      { to: '/tarjetas-de-credito-uruguay', label: 'Ranking de tarjetas de crédito' },
      { to: '/pagar-cuentas-con-tarjeta', label: 'Cuándo conviene pagar con tarjeta' },
    ],
  },
  {
    slug: 'supermercados',
    category: 'Mercados',
    label: 'Supermercados',
    h1: 'Descuentos en supermercados en Uruguay con tarjeta',
    seoTitle: 'Descuentos en supermercados Uruguay: qué tarjeta usar',
    seoDescription:
      'Qué tarjeta da descuento en supermercados en Uruguay: emisores ordenados por locales adheridos y la lista de cadenas con beneficio, con el texto y los días de cada descuento.',
    intro:
      'El supermercado es la compra que más se repite del mes, así que un punto de descuento acá vale más que diez en algo que comprás una vez al año. Esta página ordena los emisores por cuántas bocas de supermercado cubren y muestra qué dice el beneficio en cada cadena.',
    icon: 'mdi-cart-outline',
    keywords: [
      'descuentos supermercados uruguay',
      'descuentos tata',
      'descuentos tienda inglesa',
      'que tarjeta conviene para el super',
      'descuentos supermercado hoy uruguay',
    ],
    faq: [
      {
        id: 'super-dias',
        question: '¿Los descuentos en supermercados tienen día fijo?',
        answer:
          'Varios sí, y el día lo declara el propio beneficio. En la lista de esta página el día viaja dentro del texto del emisor, porque no hay una regla común: la misma cadena puede tener días distintos según con qué tarjeta pagues.',
      },
    ],
    related: [
      { to: '/herramientas/costo-de-vida', label: 'Cuánto cuesta vivir en Uruguay' },
      { to: '/tarjetas-de-credito-uruguay', label: 'Ranking de tarjetas de crédito' },
    ],
  },
  {
    slug: 'farmacias',
    category: 'Farmacias',
    label: 'Farmacias',
    h1: 'Descuentos en farmacias en Uruguay con tarjeta',
    seoTitle: 'Descuentos en farmacias Uruguay: qué tarjeta conviene',
    seoDescription:
      'Qué tarjeta da descuento en farmacias en Uruguay: emisores ordenados por locales adheridos y las cadenas con beneficio, con el texto de cada descuento y los días que declara.',
    intro:
      'La farmacia es el rubro donde el descuento se nota rápido porque el ticket es chico y frecuente. Acá están las cadenas adheridas ordenadas por cuántos locales tienen, y qué emisor cubre a cada una.',
    icon: 'mdi-medical-bag',
    keywords: [
      'descuentos en farmacias uruguay',
      'descuentos farmashop',
      'descuentos farmacia san roque',
      'que tarjeta tiene descuento en farmacias',
      'descuentos farmacia hoy uruguay',
    ],
    faq: [
      {
        id: 'farma-mutualista',
        question: '¿El descuento aplica en la farmacia de la mutualista?',
        answer:
          'Sólo si esa farmacia figura como comercio adherido del emisor; muchas farmacias de mutualista tienen su propio esquema de precios y no entran en estas promociones. La lista de esta página muestra exactamente qué marcas trae el relevamiento.',
      },
    ],
    related: [
      { to: '/herramientas/costo-de-vida', label: 'Cuánto cuesta vivir en Uruguay' },
      { to: '/tarjetas-de-debito-uruguay', label: 'Ranking de tarjetas de débito' },
    ],
  },
  {
    slug: 'combustible-y-vehiculos',
    category: 'Vehículos',
    label: 'Combustible y vehículos',
    h1: 'Descuentos en combustible y vehículos en Uruguay',
    seoTitle: 'Descuentos en nafta y combustible Uruguay: qué tarjeta',
    seoDescription:
      'Qué tarjeta da descuento en estaciones de servicio y rubro automotor en Uruguay: emisores por cantidad de estaciones adheridas y el texto de cada beneficio.',
    intro:
      'Es el rubro con menos marcas y más locales del mapa: unas pocas redes de estaciones concentran casi todo. Por eso acá la cuenta que importa no es cuántas marcas cubre tu tarjeta sino cuántas estaciones, que es lo que vas a tener cerca cuando se prenda la luz del tanque.',
    icon: 'mdi-gas-station',
    keywords: [
      'descuentos nafta uruguay',
      'descuentos combustible tarjeta uruguay',
      'descuentos ancap',
      'descuentos estaciones de servicio uruguay',
      'que tarjeta conviene para cargar nafta',
    ],
    faq: [
      {
        id: 'combustible-imesi',
        question: '¿Esto es lo mismo que la devolución de IMESI en la frontera?',
        answer:
          'No. La devolución de IMESI es un régimen fiscal para los departamentos de frontera, con su propio tope y sus propias condiciones de pago; el descuento de esta página lo pone el emisor de la tarjeta y aplica donde el comercio esté adherido.',
      },
    ],
    related: [
      { to: '/comprar-auto-con-deuda-uruguay', label: 'Comprar un auto con deuda' },
      { to: '/tarjetas-de-credito-uruguay', label: 'Ranking de tarjetas de crédito' },
    ],
  },
  {
    slug: 'moda',
    category: 'Moda',
    label: 'Moda e indumentaria',
    h1: 'Descuentos en ropa e indumentaria en Uruguay',
    seoTitle: 'Descuentos en ropa Uruguay: qué tarjeta y en qué marcas',
    seoDescription:
      'Qué tarjeta da descuento en indumentaria en Uruguay: emisores ordenados por locales adheridos y las marcas de ropa con beneficio, con el texto de cada descuento.',
    intro:
      'Moda es el rubro donde más se nota la diferencia entre emisores: las redes casi no se pisan, así que la marca que tenés a mano manda más que el porcentaje. Acá está quién cubre a cada una.',
    icon: 'mdi-tshirt-crew-outline',
    keywords: [
      'descuentos en ropa uruguay',
      'descuentos indumentaria montevideo',
      'que tarjeta tiene descuento en ropa',
      'promociones marcas de ropa uruguay',
    ],
    faq: [
      {
        id: 'moda-cuotas',
        question: '¿El descuento se puede combinar con cuotas sin recargo?',
        answer:
          'Depende de la promoción: varias excluyen expresamente la combinación con las cuotas de la campaña o con otras promociones del comercio. El catálogo no trae esa condición, así que hay que leerla en las bases del emisor antes de contar con las dos cosas.',
      },
    ],
    related: [
      { to: '/conviene-comprar-en-cuotas', label: '¿Conviene comprar en cuotas?' },
      { to: '/tarjetas-de-credito-uruguay', label: 'Ranking de tarjetas de crédito' },
    ],
  },
  {
    slug: 'hogar',
    category: 'Hogar',
    label: 'Hogar',
    h1: 'Descuentos en artículos para el hogar en Uruguay',
    seoTitle: 'Descuentos en hogar y muebles Uruguay: qué tarjeta usar',
    seoDescription:
      'Qué tarjeta da descuento en artículos para el hogar, muebles, pinturería y supergás en Uruguay: emisores por locales adheridos y el texto de cada beneficio.',
    intro:
      'Hogar mezcla dos compras muy distintas: la grande y planificada —muebles, colchones, pinturería— y la de todos los meses, como el supergás. En la primera el descuento cambia el precio de verdad; en la segunda cambia poco pero se repite. Las dos están en esta lista.',
    icon: 'mdi-sofa-outline',
    keywords: [
      'descuentos hogar uruguay',
      'descuentos muebles uruguay',
      'descuentos supergas uruguay',
      'descuentos pinturería uruguay',
      'que tarjeta tiene descuento en hogar',
    ],
    faq: [
      {
        id: 'hogar-grande',
        question: '¿Conviene esperar a la promoción para una compra grande?',
        answer:
          'Cuando el descuento tiene día fijo, sí: el mismo mueble con el beneficio del día correcto sale distinto. Lo que no conviene es asumir que el porcentaje se aplica entero sobre cualquier monto, porque casi todos los beneficios tienen tope mensual.',
      },
    ],
    related: [
      { to: '/conviene-comprar-en-cuotas', label: 'Cuotas vs contado' },
      { to: '/herramientas/costo-de-vida', label: 'Cuánto cuesta vivir en Uruguay' },
    ],
  },
  {
    slug: 'cafeterias',
    category: 'Cafeterías',
    label: 'Cafeterías',
    h1: 'Descuentos en cafeterías en Uruguay con tarjeta',
    seoTitle: 'Descuentos en cafeterías Uruguay: qué tarjeta conviene',
    seoDescription:
      'Qué tarjeta da descuento en cafeterías y panaderías en Uruguay: emisores por locales adheridos y la lista de cafés con beneficio, con el texto de cada descuento.',
    intro:
      'Es el gasto chico que más veces se repite en la semana, y el que más rápido devuelve un descuento del que ni te acordabas. Acá están las cafeterías adheridas y con qué tarjeta.',
    icon: 'mdi-coffee-outline',
    keywords: [
      'descuentos cafeterias uruguay',
      'descuentos starbucks uruguay',
      'descuentos panaderia montevideo',
      'que tarjeta tiene descuento en cafeterias',
    ],
    faq: [
      {
        id: 'cafe-monto',
        question: '¿Hay monto mínimo para el descuento en cafeterías?',
        answer:
          'El catálogo no trae ese dato, y varios emisores lo fijan por campaña. En tickets chicos también pesa el tope mensual del beneficio, que se consume igual. Confirmalo en la promoción vigente del emisor.',
      },
    ],
    related: [
      { to: '/tarjetas-de-debito-uruguay', label: 'Ranking de tarjetas de débito' },
      { to: '/apps-de-beneficios-uruguay', label: 'Apps de beneficios y fidelidad' },
    ],
  },
  {
    slug: 'opticas',
    category: 'Ópticas',
    label: 'Ópticas',
    h1: 'Descuentos en ópticas en Uruguay con tarjeta',
    seoTitle: 'Descuentos en ópticas Uruguay: qué tarjeta y en qué óptica',
    seoDescription:
      'Qué tarjeta da descuento en ópticas en Uruguay: emisores por locales adheridos y la lista de ópticas con beneficio, con el texto de cada descuento.',
    intro:
      'Los lentes son una compra puntual y cara, con porcentajes de descuento que suelen estar entre los más altos del mapa. Como la compra se puede planificar, acá conviene mirar primero qué óptica tenés cerca y después con qué tarjeta pagarla.',
    icon: 'mdi-glasses',
    keywords: [
      'descuentos en opticas uruguay',
      'descuentos lentes uruguay',
      'optica florida descuentos',
      'que tarjeta tiene descuento en opticas',
    ],
    faq: [
      {
        id: 'optica-cristales',
        question: '¿El descuento aplica a los cristales o sólo al armazón?',
        answer:
          'El catálogo no lo distingue: trae el beneficio de la marca, no el detalle por producto. Varias ópticas aplican condiciones distintas a armazón, cristales y lentes de contacto, así que conviene preguntarlo antes de encargar.',
      },
    ],
    related: [
      { to: '/tarjetas-de-credito-uruguay', label: 'Ranking de tarjetas de crédito' },
      { to: '/conviene-comprar-en-cuotas', label: 'Cuotas vs contado' },
    ],
  },
  {
    slug: 'deporte',
    category: 'Deporte',
    label: 'Deporte y gimnasios',
    h1: 'Descuentos en gimnasios y deporte en Uruguay',
    seoTitle: 'Descuentos en gimnasios Uruguay: qué tarjeta conviene',
    seoDescription:
      'Qué tarjeta da descuento en gimnasios, centros deportivos y tiendas de deporte en Uruguay: emisores por locales adheridos y el texto de cada beneficio.',
    intro:
      'Acá el descuento pega sobre una cuota mensual, así que se multiplica por doce sin que hagas nada. Vale la pena mirar la lista antes de firmar, no después.',
    icon: 'mdi-dumbbell',
    keywords: [
      'descuentos gimnasios uruguay',
      'descuentos deporte montevideo',
      'que tarjeta tiene descuento en gimnasios',
      'promociones gym uruguay tarjeta',
    ],
    faq: [
      {
        id: 'deporte-cuota',
        question: '¿El descuento se aplica todos los meses de la cuota?',
        answer:
          'Depende de la promoción y de cómo el gimnasio cobre: si el débito es automático puede quedar fuera del beneficio, que suele exigir el pago con la tarjeta en el comercio. Preguntalo antes de contratar.',
      },
    ],
    related: [
      { to: '/herramientas/costo-de-vida', label: 'Cuánto cuesta vivir en Uruguay' },
      { to: '/tarjetas-de-debito-uruguay', label: 'Ranking de tarjetas de débito' },
    ],
  },
  {
    slug: 'librerias-y-papelerias',
    category: 'Librerías y Papelerías',
    label: 'Librerías y papelerías',
    h1: 'Descuentos en librerías y papelerías en Uruguay',
    seoTitle: 'Descuentos en librerías Uruguay: qué tarjeta y dónde',
    seoDescription:
      'Qué tarjeta da descuento en librerías y papelerías en Uruguay: emisores por locales adheridos y la lista de librerías con beneficio, con el texto de cada descuento.',
    intro:
      'El rubro se despierta en marzo, con la lista de útiles, y ahí el descuento se aplica sobre una compra grande y de una sola vez. El resto del año pesa más la librería que tengas cerca.',
    icon: 'mdi-book-open-page-variant-outline',
    keywords: [
      'descuentos librerias uruguay',
      'descuentos utiles escolares uruguay',
      'descuentos mosca',
      'que tarjeta tiene descuento en libreria',
    ],
    faq: [
      {
        id: 'libreria-textos',
        question: '¿El descuento incluye los libros de texto?',
        answer:
          'El catálogo trae el beneficio de la marca, no el detalle por producto. Algunas librerías excluyen textos escolares o títulos importados de las promociones; conviene confirmarlo en la caja.',
      },
    ],
    related: [
      { to: '/herramientas/costo-de-vida', label: 'Cuánto cuesta vivir en Uruguay' },
      { to: '/tarjetas-de-credito-uruguay', label: 'Ranking de tarjetas de crédito' },
    ],
  },
  {
    slug: 'heladerias',
    category: 'Heladerías',
    label: 'Heladerías',
    h1: 'Descuentos en heladerías en Uruguay con tarjeta',
    seoTitle: 'Descuentos en heladerías Uruguay: qué tarjeta conviene',
    seoDescription:
      'Qué tarjeta da descuento en heladerías en Uruguay: emisores por locales adheridos y la lista de heladerías con beneficio, con el texto de cada descuento.',
    intro:
      'Pocas marcas y muchísimos locales: un par de cadenas ponen casi todas las bocas del rubro. Si tu tarjeta cubre a una de esas, el descuento te va a aparecer en cualquier barrio.',
    icon: 'mdi-ice-cream',
    keywords: [
      'descuentos heladerias uruguay',
      'descuentos grido',
      'descuentos freddo uruguay',
      'que tarjeta tiene descuento en heladerias',
    ],
    faq: [
      {
        id: 'helado-franquicia',
        question: '¿Todos los locales de la cadena tienen el descuento?',
        answer:
          'No siempre: en cadenas de franquicias cada local decide si adhiere. El mapa muestra los locales que el relevamiento trae adheridos, que pueden ser menos que los que la marca tiene abiertos.',
      },
    ],
    related: [
      { to: '/tarjetas-de-debito-uruguay', label: 'Ranking de tarjetas de débito' },
      { to: '/apps-de-beneficios-uruguay', label: 'Apps de beneficios y fidelidad' },
    ],
  },
  {
    slug: 'mascotas',
    category: 'Mascotas',
    label: 'Mascotas',
    h1: 'Descuentos en veterinarias y pet shops en Uruguay',
    seoTitle: 'Descuentos en veterinarias Uruguay: qué tarjeta usar',
    seoDescription:
      'Qué tarjeta da descuento en veterinarias, pet shops y alimento para mascotas en Uruguay: emisores por locales adheridos y el texto de cada beneficio.',
    intro:
      'El alimento se compra todos los meses y la veterinaria aparece sin aviso: son dos gastos distintos con el mismo rubro. Acá están los locales adheridos y con qué tarjeta.',
    icon: 'mdi-paw',
    keywords: [
      'descuentos veterinaria uruguay',
      'descuentos pet shop montevideo',
      'descuentos alimento para perros uruguay',
      'que tarjeta tiene descuento en mascotas',
    ],
    faq: [
      {
        id: 'mascotas-servicios',
        question: '¿El descuento incluye consultas y cirugías?',
        answer:
          'El catálogo trae el beneficio del comercio, no la separación entre productos y servicios veterinarios. Muchas clínicas aplican la promoción sólo a la tienda; conviene preguntarlo antes de la consulta.',
      },
    ],
    related: [
      { to: '/herramientas/costo-de-vida', label: 'Cuánto cuesta vivir en Uruguay' },
      { to: '/tarjetas-de-debito-uruguay', label: 'Ranking de tarjetas de débito' },
    ],
  },
  {
    slug: 'tecnologia',
    category: 'Tecnología',
    label: 'Tecnología',
    h1: 'Descuentos en tecnología y celulares en Uruguay',
    seoTitle: 'Descuentos en tecnología Uruguay: qué tarjeta y dónde',
    seoDescription:
      'Qué tarjeta da descuento en tecnología, celulares y computación en Uruguay: emisores por locales adheridos y la lista de tiendas con beneficio.',
    intro:
      'Es el rubro donde el ticket es más alto y donde el tope mensual del beneficio se come el descuento más rápido. Antes de contar con el porcentaje entero conviene mirar el tope de la promoción, que el catálogo no trae.',
    icon: 'mdi-cellphone',
    keywords: [
      'descuentos tecnologia uruguay',
      'descuentos celulares uruguay',
      'descuentos samsung uruguay',
      'que tarjeta tiene descuento en tecnologia',
    ],
    faq: [
      {
        id: 'tecno-tope',
        question: '¿Por qué el descuento en tecnología rinde menos de lo que parece?',
        answer:
          'Porque casi todos los beneficios tienen tope por cuenta y por mes. En una compra chica el porcentaje se aplica entero; en un celular, el tope se alcanza enseguida y el descuento efectivo termina siendo bastante menor que el anunciado.',
      },
    ],
    related: [
      { to: '/importar/electronica', label: 'Importar electrónica: cuánto sale con impuestos' },
      { to: '/conviene-comprar-en-cuotas', label: 'Cuotas vs contado' },
    ],
  },
  {
    slug: 'cines',
    category: 'Cines',
    label: 'Cines',
    h1: 'Descuentos en cines en Uruguay con tarjeta',
    seoTitle: 'Descuentos en cines Uruguay: 2x1 y qué tarjeta usar',
    seoDescription:
      'Qué tarjeta da descuento en cines en Uruguay: qué cadenas tienen 2x1 en entradas, qué emisores cubren cada complejo y el texto de cada beneficio.',
    intro:
      'Es el único rubro del mapa donde el beneficio muchas veces no es un porcentaje sino un 2x1 en entradas, que se compara distinto: vale por acompañante, no por peso gastado. Acá está qué da cada emisor en cada cadena.',
    icon: 'mdi-movie-open-outline',
    keywords: [
      'descuentos cine uruguay',
      '2x1 cine uruguay tarjeta',
      'descuentos grupocine',
      'descuentos life cinemas',
      'que tarjeta tiene 2x1 en el cine',
    ],
    faq: [
      {
        id: 'cine-2x1',
        question: '¿El 2x1 vale para cualquier función?',
        answer:
          'No necesariamente: las cadenas suelen excluir estrenos, formatos premium y días de precio promocional. El catálogo trae el beneficio, no las exclusiones; están en las bases del emisor y en la cartelera del cine.',
      },
    ],
    related: [
      { to: '/tarjetas-de-credito-uruguay', label: 'Ranking de tarjetas de crédito' },
      { to: '/apps-de-beneficios-uruguay', label: 'Apps de beneficios y fidelidad' },
    ],
  },
  {
    slug: 'jugueterias',
    category: 'Jugueterías',
    label: 'Jugueterías',
    h1: 'Descuentos en jugueterías en Uruguay con tarjeta',
    seoTitle: 'Descuentos en jugueterías Uruguay: qué tarjeta conviene',
    seoDescription:
      'Qué tarjeta da descuento en jugueterías y artículos para bebés en Uruguay: emisores por locales adheridos y la lista de comercios con beneficio.',
    intro:
      'Rubro chico y estacional: se busca en Reyes, en el Día del Niño y en cada cumpleaños. La lista es corta, así que conviene mirarla entera antes de salir a comprar.',
    icon: 'mdi-teddy-bear',
    keywords: [
      'descuentos jugueterias uruguay',
      'descuentos juguetes montevideo',
      'descuentos articulos para bebes uruguay',
      'que tarjeta tiene descuento en jugueterias',
    ],
    faq: [
      {
        id: 'juguete-fechas',
        question: '¿Los descuentos cambian en Reyes o el Día del Niño?',
        answer:
          'Suelen aparecer campañas puntuales en esas fechas que no son las mismas que el beneficio permanente del emisor. Esta página muestra lo que el relevamiento trae vigente; la campaña estacional hay que buscarla en la página del emisor.',
      },
    ],
    related: [
      { to: '/herramientas/costo-de-vida', label: 'Cuánto cuesta vivir en Uruguay' },
      { to: '/tarjetas-de-credito-uruguay', label: 'Ranking de tarjetas de crédito' },
    ],
  },
  {
    slug: 'viajes',
    category: 'Viajes',
    label: 'Viajes y hotelería',
    h1: 'Descuentos en hoteles y viajes en Uruguay',
    seoTitle: 'Descuentos en hoteles Uruguay: qué tarjeta y dónde',
    seoDescription:
      'Qué tarjeta da descuento en hoteles, agencias y transporte en Uruguay: emisores por comercios adheridos y el texto de cada beneficio.',
    intro:
      'Acá casi cada marca es un solo establecimiento —un hotel, una agencia, un servicio—, así que la lista se lee como un directorio y no como un ranking de cadenas. Si el destino está en la lista, el descuento se aplica sobre un gasto grande.',
    icon: 'mdi-bag-suitcase-outline',
    keywords: [
      'descuentos hoteles uruguay',
      'descuentos viajes tarjeta uruguay',
      'descuentos buquebus',
      'que tarjeta tiene descuento en hoteles',
    ],
    faq: [
      {
        id: 'viajes-reserva',
        question: '¿El descuento aplica reservando por internet?',
        answer:
          'Con frecuencia no: los beneficios de comercio adherido suelen exigir pagar en el establecimiento, no en un portal de reservas de terceros. Conviene confirmar el canal antes de reservar.',
      },
    ],
    related: [
      { to: '/tarjetas-de-credito-uruguay', label: 'Tarjetas con millas y beneficios de viaje' },
      { to: '/sala-vip-aeropuerto-uruguay', label: 'Sala VIP del aeropuerto: qué da cada tarjeta' },
    ],
  },
])

// ── Accesores ───────────────────────────────────────────────────────────────

export function bankPageSlugs(): string[] {
  return BANKOS_BANK_PAGES.map(p => p.slug)
}

export function getBankPage(slug: string): BankosBankPage | undefined {
  return BANKOS_BANK_PAGES.find(p => p.slug === slug)
}

/** La página de este emisor, buscada por su id de Bankos (para enlazar desde el mapa). */
export function bankPageForBankId(bankId: string): BankosBankPage | undefined {
  return BANKOS_BANK_PAGES.find(p => p.bankId === bankId)
}

export function categoryPageSlugs(): string[] {
  return BANKOS_CATEGORY_PAGES.map(p => p.slug)
}

export function getCategoryPage(slug: string): BankosCategoryPage | undefined {
  return BANKOS_CATEGORY_PAGES.find(p => p.slug === slug)
}

/** La página de este rubro, buscada por la cadena exacta del catálogo. */
export function categoryPageForCategory(category: string): BankosCategoryPage | undefined {
  return BANKOS_CATEGORY_PAGES.find(p => p.category === category)
}
