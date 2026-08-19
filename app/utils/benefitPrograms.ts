// app/utils/benefitPrograms.ts
// Programas de fidelidad y clubes de beneficios uruguayos: los que NO son del banco.
//
// POR QUÉ EXISTE Y POR QUÉ ES OTRA PÁGINA. El sitio ya cubre el descuento que da
// el EMISOR: el mapa de /descuentos-con-tarjeta-uruguay, el análisis por banco y
// el ranking de programas de puntos de las tarjetas. Lo que faltaba es el otro
// lado del mostrador: el programa del comercio —el supermercado, la farmacia, la
// estación de servicio, el diario, la telco—, que suma aunque pagues en efectivo
// y que casi nunca aparece en un comparador porque las bases están enterradas en
// un PDF o directamente no se publican.
//
// REGLA DE LA CASA: cada dato duro lleva de dónde salió. `calculado` es el único
// que producimos nosotros y siempre dice de qué dos datos oficiales se despeja.
// Cuando el programa no publica el valor del punto o cuántos puntos da cada peso,
// el retorno NO se estima: se deja vacío y se dice que no es calculable. Un "1,5 %
// aproximado" inventado es exactamente el número que la gente después usa para
// decidir dónde comprar.
//
// Módulo PURO (sin Vue/Nuxt) para que la página y el test compartan la fuente.
// Sin links de afiliado ni acuerdo comercial con ninguno de estos programas.

/** Fecha (YYYY-MM-DD) en que se verificaron los datos contra las fuentes. */
export const BENEFIT_PROGRAMS_LAST_REVIEWED = '2026-08-19'

export type BenefitCategory =
  | 'supermercados'
  | 'farmacias'
  | 'combustible'
  | 'delivery'
  | 'cultura'
  | 'telecomunicaciones'
  | 'prensa'

/**
 * De dónde sale cada dato.
 * - `oficial`: bases, reglamento o página del propio programa.
 * - `prensa`: nota periodística fechada.
 * - `tienda`: ficha de App Store / Google Play.
 * - `autodeclarado`: la empresa lo dice de sí misma sin base publicada.
 * - `calculado`: lo despejamos nosotros de dos datos oficiales, y se explica cuáles.
 */
export type ProgramSourceKind = 'oficial' | 'prensa' | 'tienda' | 'autodeclarado' | 'calculado'

export interface ProgramFact {
  label: string
  value: string
  source: ProgramSourceKind
}

/**
 * Cómo se paga el programa. La distinción importa: "gratis" y "gratis si ya pagás
 * otra cosa" no son lo mismo, y es justo donde el marketing borra la diferencia.
 */
export type ProgramCost =
  | { kind: 'gratis' }
  /** Cuota propia. El precio va con su fuente en `facts`. */
  | { kind: 'cuota'; detail: string }
  /** Sin costo propio, pero exige contratar o ser cliente de algo pago. */
  | { kind: 'atado'; detail: string }

export type ProgramChannel = 'app' | 'web' | 'tarjeta' | 'cedula' | 'ussd'

export interface BenefitProgram {
  /** kebab-case, único. */
  id: string
  name: string
  /** Quién lo opera. */
  operator: string
  category: BenefitCategory
  /** Qué resuelve, en una línea. */
  tagline: string
  cost: ProgramCost
  /** Cómo te asociás. */
  join: string
  /** Cómo se usa el beneficio en la caja. */
  how: string
  /** Dónde sirve (cadenas, locales, rubros). */
  worksAt: readonly string[]
  /**
   * Retorno efectivo en % del gasto, SOLO cuando las reglas publicadas dan las dos
   * mitades (cuántos puntos por peso y cuánto vale el punto). Si falta una, queda
   * sin definir y `returnNote` explica por qué.
   */
  returnPct?: number
  /** De qué datos sale el retorno, o por qué no se puede calcular. */
  returnNote: string
  /** Vencimiento de los puntos, tal como lo dicen las bases. */
  expiry?: string
  channels: readonly ProgramChannel[]
  siteUrl: string
  /** Bases y condiciones, si son públicas. */
  rulesUrl?: string
  androidUrl?: string
  iosUrl?: string
  facts: readonly ProgramFact[]
  /** Obligatorio: recomendar sin contras es publicidad, no información. */
  caveats: readonly string[]
  /** true solo si pudimos leer las reglas centrales en fuente primaria. */
  verified: boolean
}

export const BENEFIT_CATEGORIES: Readonly<Record<BenefitCategory, string>> = Object.freeze({
  supermercados: 'Supermercados y retail',
  farmacias: 'Farmacias',
  combustible: 'Combustible',
  delivery: 'Delivery y compras',
  cultura: 'Cultura y espectáculos',
  telecomunicaciones: 'Telecomunicaciones',
  prensa: 'Prensa',
})

export const BENEFIT_CATEGORY_ICONS: Readonly<Record<BenefitCategory, string>> = Object.freeze({
  supermercados: 'mdi-cart-outline',
  farmacias: 'mdi-medical-bag',
  combustible: 'mdi-gas-station-outline',
  delivery: 'mdi-moped-outline',
  cultura: 'mdi-drama-masks',
  telecomunicaciones: 'mdi-cellphone-wireless',
  prensa: 'mdi-newspaper-variant-outline',
})

export const CHANNEL_META: Readonly<Record<ProgramChannel, { label: string; icon: string }>> =
  Object.freeze({
    app: { label: 'App', icon: 'mdi-cellphone' },
    web: { label: 'Web', icon: 'mdi-web' },
    tarjeta: { label: 'Tarjeta física', icon: 'mdi-card-account-details-outline' },
    cedula: { label: 'Con la cédula', icon: 'mdi-badge-account-outline' },
    ussd: { label: 'Código USSD', icon: 'mdi-dialpad' },
  })

export const BENEFIT_PROGRAMS: readonly BenefitProgram[] = Object.freeze([
  {
    id: 'tienda-inglesa-puntos',
    name: 'Programa Puntos',
    operator: 'Tienda Inglesa',
    category: 'supermercados',
    tagline:
      'Acumulás con la cédula, sin tarjeta ni app, y cada punto vale un peso contra la caja de cualquier local de la cadena.',
    cost: { kind: 'gratis' },
    join: 'No hay que sacar tarjeta ni instalar nada: los puntos van atados al número de documento que decís en la caja.',
    how: 'Decís tu documento al pagar y los puntos se acreditan solos. Para canjear necesitás un mínimo de 150 puntos, y podés pagar toda la compra o una parte.',
    worksAt: ['Tienda Inglesa', 'Tienda Farma', "Barny's"],
    returnPct: 1.67,
    returnNote:
      'Calculado de las bases: 15 puntos cada $ 900 de compra y cada punto vale $ 1, o sea $ 15 de vuelta cada $ 900 = 1,67 %. Con débito o crédito Scotiabank ClubCard los puntos son dobles, lo que lleva el retorno a 3,33 %.',
    expiry:
      'Con documento uruguayo, 6 meses que se renuevan con cada compra; con documento extranjero, 24 meses sin renovación.',
    channels: ['cedula', 'app', 'web'],
    siteUrl: 'https://www.tiendainglesa.com.uy/',
    rulesUrl:
      'https://www.tiendainglesa.com.uy/supermercado/landing/bases-y-condiciones-programa-puntos/349',
    iosUrl: 'https://apps.apple.com/uy/app/tienda-inglesa/id603235187',
    facts: [
      {
        label: 'Cómo se gana',
        value: '15 puntos cada $ 900 de compra (el tramo no se prorratea)',
        source: 'oficial',
      },
      { label: 'Compra mínima', value: '$ 90 para generar 1 punto', source: 'oficial' },
      { label: 'Valor del punto', value: '1 punto = $ 1', source: 'oficial' },
      { label: 'Mínimo para canjear', value: '150 puntos', source: 'oficial' },
      {
        label: 'Retorno efectivo',
        value: '1,67 % del gasto; 3,33 % pagando con Scotiabank ClubCard',
        source: 'calculado',
      },
      {
        label: 'Qué no se puede canjear',
        value: 'Cigarrillos y servicios; el resto del surtido sí',
        source: 'oficial',
      },
    ],
    caveats: [
      'El tramo se cuenta entero y no se prorratea: una compra de $ 1.799 paga los mismos 15 puntos que una de $ 900, así que la mitad del gasto no rinde nada. Mirá el múltiplo de $ 900 antes de pasar por caja.',
      'Los puntos vencen a los 6 meses. Se renuevan comprando de nuevo, pero medio año sin ir y perdés todo el saldo.',
      'Con documento extranjero el plazo es de 24 meses y no se renueva: el turista acumula contra un reloj que no puede parar.',
      'El doble de puntos está atado a una tarjeta de un banco puntual (Scotiabank ClubCard); sin ella el retorno es la mitad.',
    ],
    verified: true,
  },
  {
    id: 'tata-plus',
    name: 'PLUS',
    operator: 'Grupo Ta-Ta (Ta-Ta, Multi Ahorro Hogar, BAS)',
    category: 'supermercados',
    tagline:
      'El programa de fidelidad con más socios del país: suma en supermercado, hogar y ropa con la misma cuenta.',
    cost: { kind: 'gratis' },
    join: 'El alta es automática al registrarte en el sitio; también se asocia en el local.',
    how: 'Los puntos se acumulan pagando en efectivo, débito, crédito, tickets electrónicos de alimentación o Tarjeta Uruguay Social, y se canjean por productos en los locales físicos.',
    worksAt: ['Ta-Ta', 'Multi Ahorro Hogar', 'BAS'],
    returnNote:
      'No calculable con lo publicado: el reglamento fija cuánto se gana (1 punto cada $ 100) pero no dice cuánto vale un punto en pesos. La empresa declaró a la prensa en 2023 que los puntos "equivalen a pesos"; con ese supuesto el retorno rondaría el 1 %, pero es un supuesto, no una regla publicada.',
    expiry: 'Tres meses consecutivos sin actividad y los puntos caducan.',
    channels: ['app', 'web', 'tarjeta'],
    siteUrl: 'https://www.tata.com.uy/',
    rulesUrl: 'https://www.tata.com.uy/lp/terminos-y-condiciones',
    androidUrl: 'https://play.google.com/store/apps/details?id=com.tatauy.android.vtex',
    iosUrl: 'https://apps.apple.com/uy/app/tata/id1569682505',
    facts: [
      { label: 'Cómo se gana', value: '1 punto por cada $ 100 en compras', source: 'oficial' },
      { label: 'Valor del punto', value: 'El reglamento no lo fija', source: 'oficial' },
      { label: 'Mínimo para canjear', value: '51 puntos', source: 'oficial' },
      {
        label: 'Medios que suman',
        value:
          'Efectivo, débito, crédito, tickets electrónicos de alimentación y Tarjeta Uruguay Social',
        source: 'oficial',
      },
      {
        label: 'Tamaño',
        value: '1.800.000 socios y 700.000 clientes activos (abril de 2023)',
        source: 'prensa',
      },
    ],
    caveats: [
      'Los puntos no se pueden canjear en el e-commerce: se ganan comprando online, pero solo se gastan en el local físico.',
      'La caducidad es agresiva: tres meses sin comprar y el saldo se va entero.',
      'El reglamento no publica el valor del punto en pesos, así que no podés comparar el programa contra otro antes de entrar: el canje te dice el precio recién cuando ya estás adentro.',
      'Pagar con un medio que no esté en la lista puede dejar esa parte de la compra sin puntos.',
    ],
    verified: true,
  },
  {
    id: 'tarjeta-mas',
    name: 'Tarjeta Más',
    operator: 'Grupo Disco (Disco, Devoto, Géant, Fresh Market)',
    category: 'supermercados',
    tagline:
      'La tarjeta de puntos de las cadenas del grupo, con canje por catálogo de regalos en vez de descuento en la caja.',
    cost: { kind: 'gratis' },
    join: 'Se solicita en el local o en el sitio de la cadena. Es gratuita y distinta de la tarjeta de crédito Hipermás, que la emite Santander.',
    how: 'Presentás la tarjeta al pagar y los puntos se acreditan; se canjean por artículos del catálogo de regalos, no como descuento directo sobre la compra.',
    worksAt: ['Disco', 'Devoto', 'Géant', 'Fresh Market'],
    returnNote:
      'No calculable: el grupo no publica en su web las bases con la relación puntos/pesos ni el valor del punto, y la tasa cambia según pagues o no con la tarjeta de crédito Hipermás. Sin esas dos cifras, cualquier porcentaje sería inventado.',
    channels: ['tarjeta', 'app', 'web'],
    siteUrl: 'https://www.disco.com.uy/',
    iosUrl: 'https://apps.apple.com/uy/app/devoto/id1468333775',
    facts: [
      {
        label: 'Cómo se gana',
        value: 'Puntos por compra; el grupo no publica la tasa en su web',
        source: 'oficial',
      },
      {
        label: 'Cómo se canjea',
        value: 'Catálogo de regalos, no descuento en caja',
        source: 'oficial',
      },
      {
        label: 'Puntos dobles',
        value:
          'La tarjeta de crédito Hipermás (Santander) acumula al doble en las cadenas del grupo',
        source: 'prensa',
      },
    ],
    caveats: [
      'El canje por catálogo es el formato menos transparente que hay: el precio en puntos lo fija el propio catálogo y puede cambiar sin que tengas contra qué compararlo en pesos.',
      'No encontramos las bases del programa publicadas en la web del grupo: entrás sin saber cuánto rinde. Pedilas en el local antes de darle valor.',
      'Los puntos dobles están atados a una tarjeta de crédito puntual: si la sacás solo por eso, mirá primero el costo anual de esa tarjeta.',
    ],
    verified: false,
  },
  {
    id: 'farmacard',
    name: 'Farmacard',
    operator: 'Farmashop',
    category: 'farmacias',
    tagline:
      'Farmapuntos que valen un peso cada uno, acumulables en la cadena de farmacias más grande del país.',
    cost: { kind: 'gratis' },
    join: 'Se pide en el local o desde la app de Farmashop.',
    how: 'Se acumulan farmapuntos en las compras, se consultan y se transfieren desde la app, y se usan como pago en el local.',
    worksAt: ['Farmashop', 'Puntoshop', 'OM by Farmashop'],
    returnNote:
      'No calculable: las bases fijan que 1 farmapunto vale $ 1, pero no publican cuántos farmapuntos deja cada peso gastado —la acumulación depende de promociones que define la empresa—, así que el retorno cambia de una compra a la otra.',
    channels: ['tarjeta', 'app', 'web'],
    siteUrl: 'https://www.farmashop.com.uy/',
    rulesUrl: 'https://tienda.farmashop.com.uy/bases-y-condiciones-programa-farmacard',
    androidUrl: 'https://play.google.com/store/apps/details?id=com.farmashop',
    iosUrl: 'https://apps.apple.com/uy/app/farmashop/id1207365817',
    facts: [
      { label: 'Valor del punto', value: '1 farmapunto = $ 1', source: 'oficial' },
      {
        label: 'Cómo se gana',
        value: 'Según promociones que define la empresa; la tasa no está publicada',
        source: 'oficial',
      },
      {
        label: 'Dónde suma',
        value: 'Farmashop, Puntoshop y OM by Farmashop',
        source: 'oficial',
      },
      {
        label: 'Desde la app',
        value: 'Consulta de saldo y transferencia de farmapuntos',
        source: 'oficial',
      },
    ],
    caveats: [
      'La acumulación depende de promociones y no de una tasa fija: dos compras iguales pueden rendir distinto y no hay forma de anticiparlo.',
      'El sitio de Farmashop bloquea la lectura automatizada, así que no pudimos verificar las bases completas nosotros mismos; pedí el reglamento en el local antes de contar con un saldo.',
      'Los medicamentos con receta y algunos rubros suelen quedar fuera de las promociones de acumulación: confirmá en la caja qué parte de la compra suma.',
    ],
    verified: false,
  },
  {
    id: 'ancapuntos',
    name: 'ANCAPuntos',
    operator: 'DUCSA (estaciones ANCAP)',
    category: 'combustible',
    tagline:
      'Puntos por cargar combustible que se canjean por cine, telepeaje, estacionamiento tarifado, datos de ANTEL o productos del catálogo.',
    cost: { kind: 'gratis' },
    join: 'Se saca la tarjeta ANCAPuntos en la estación o se usa la versión digital dentro de la app Estaciones ANCAP.',
    how: 'Sumás pagando el combustible desde la app, con tarjeta BROU ANCAP o escaneando el código QR del e-Ticket, y canjeás desde la misma app o desde el catálogo web.',
    worksAt: [
      'Estaciones ANCAP adheridas',
      'Catálogo ANCAPuntos',
      'Movie',
      'Life Cinemas',
      "McDonald's",
    ],
    returnNote:
      'No calculable: ni el sitio del programa ni las preguntas frecuentes de DUCSA publican cuántos puntos deja cada litro o cada peso, y el catálogo mezcla canjes totales con canjes mixtos (pesos + puntos).',
    channels: ['app', 'web', 'tarjeta'],
    siteUrl: 'https://www.ancapuntos.com.uy/',
    rulesUrl: 'https://ducsa.com.uy/AppEstacionesAncap/Preguntas-Frecuentes.htm',
    androidUrl: 'https://play.google.com/store/apps/details?id=uy.com.ducsa.app',
    iosUrl: 'https://apps.apple.com/uy/app/estaciones-ancap/id1451236796',
    facts: [
      {
        label: 'Cómo se gana',
        value: 'Pagando por la app, con tarjeta BROU ANCAP o escaneando el QR del e-Ticket',
        source: 'oficial',
      },
      {
        label: 'Qué se canjea',
        value:
          'Estacionamiento tarifado, telepeaje, datos, minutos y SMS de ANTEL, combos y Cajita Feliz de McDonald’s, entradas de cine en Movie y en Life Cinemas, y productos del catálogo',
        source: 'oficial',
      },
      {
        label: 'Canje mixto',
        value: 'El catálogo permite pagar una parte en pesos y otra en puntos',
        source: 'oficial',
      },
      {
        label: 'La app además',
        value: 'Paga el combustible desde el celular y pide garrafas de supergás',
        source: 'oficial',
      },
    ],
    caveats: [
      'La tasa de acumulación no está publicada: sabés qué podés canjear, no cuánto tenés que cargar para llegar.',
      'Los canjes más útiles (cine, telepeaje, datos) salen por la app; con la tarjeta física sola tenés menos opciones.',
      'Algunos productos suman solo por ciertas vías de pago, así que la misma compra puede rendir o no según cómo pagues.',
    ],
    verified: true,
  },
  {
    id: 'pedidosya-plus',
    name: 'PedidosYa Plus',
    operator: 'PedidosYa',
    category: 'delivery',
    tagline: 'Suscripción mensual que saca el costo de envío en los comercios adheridos.',
    cost: { kind: 'cuota', detail: '$ 349 por mes' },
    join: 'Se activa dentro de la app de PedidosYa y se cobra por mes al medio de pago cargado.',
    how: 'Con la suscripción activa, los pedidos a comercios marcados con el ícono Plus no pagan envío; en PedidosYa Market el envío gratis arranca desde $ 700 de compra.',
    worksAt: ['Restaurantes adheridos', 'PedidosYa Market', 'Farmacias y supermercados adheridos'],
    returnNote:
      'No es un programa de puntos: es una cuota contra el costo de envío. La propia empresa ubicó el punto de equilibrio en 6 o 7 pedidos por mes; por debajo de eso la suscripción cuesta más de lo que ahorra.',
    channels: ['app'],
    siteUrl: 'https://www.pedidosya.com.uy/',
    facts: [
      { label: 'Precio', value: '$ 349 por mes', source: 'prensa' },
      {
        label: 'Desde cuándo',
        value: 'Lanzado en Uruguay el 2 de junio de 2025',
        source: 'prensa',
      },
      { label: 'Envío gratis en Market', value: 'Desde $ 700 de compra', source: 'prensa' },
      {
        label: 'Punto de equilibrio',
        value: '6 o 7 pedidos por mes, según la propia empresa',
        source: 'prensa',
      },
    ],
    caveats: [
      'El envío gratis solo corre en los comercios adheridos: el local decide si entra o no, así que el restaurante que pedís siempre puede quedar afuera.',
      'Es una cuota que se cobra igual el mes que no pedís nada. Con cuatro pedidos mensuales, perdés plata.',
      'El precio y las condiciones los fija la plataforma y cambian sin aviso: confirmá el monto vigente dentro de la app antes de suscribirte.',
    ],
    verified: false,
  },
  {
    id: 'socio-espectacular',
    name: 'Socio Espectacular',
    operator: 'Socio Espectacular',
    category: 'cultura',
    tagline:
      'Cuota mensual con entrada libre a teatro y SODRE y 2x1 en los tres circuitos de cine del país.',
    cost: { kind: 'cuota', detail: 'Desde $ 500 por mes, con tres meses de mínimo' },
    join: 'Te asociás con la cédula y prepagás los tres primeros meses. Hay convenios (BPS, ANEP/UTU, cooperativas y gremios) que cambian el precio.',
    how: 'Retirás las entradas presentando la cédula en boletería, o las sacás por Tickantel con tu número de documento y un PIN.',
    worksAt: [
      'El Galpón',
      'Teatro Circular',
      'Comedia Nacional',
      'El Tinglado',
      'De la Gaviota',
      'SODRE',
      'Cine Universitario',
      'Life Cinemas',
      'Grupocine',
      'Movie',
    ],
    returnNote:
      'No es un programa de puntos: pagás una cuota y el retorno depende de cuánto salgas. Con dos entradas de teatro al mes suele pagarse sola; si solo querés el 2x1 de cine, mirá antes los beneficios sin costo de más abajo.',
    channels: ['cedula', 'web'],
    siteUrl: 'https://socioespectacular.com.uy/',
    rulesUrl: 'https://socioespectacular.com.uy/preguntas-frecuentes/',
    facts: [
      { label: 'Precio', value: 'Desde $ 500 por mes', source: 'oficial' },
      {
        label: 'Permanencia',
        value: 'Mínimo tres meses, que se prepagan al asociarse',
        source: 'oficial',
      },
      {
        label: 'Qué incluye',
        value:
          'Entrada libre a El Galpón, Circular, Comedia Nacional, El Tinglado, De la Gaviota, Filarmónica, SODRE y Cine Universitario; 2x1 en Life, Grupocine y Movie para el titular con un acompañante',
        source: 'oficial',
      },
      {
        label: 'Cupos',
        value: 'Cubierto el cupo de entradas libres del SODRE, el socio paga 50 %',
        source: 'oficial',
      },
      { label: 'Titularidad', value: 'El uso es personal e intransferible', source: 'oficial' },
      {
        label: 'Vía BPS (Abono Cultural)',
        value:
          'Jubilados y pensionistas del BPS con haberes de hasta 8 BPC pagan un año entero, no una cuota mensual: $ 1.580 al contado según Socio Espectacular (el BPS todavía publica $ 1.525), o en 6 o 12 cuotas descontadas del recibo',
        source: 'oficial',
      },
    ],
    caveats: [
      'La cuota "desde $ 500" es el piso: hay varios tipos de socio y el precio real depende del plan y de si entrás por un convenio.',
      'Los tres meses de permanencia se pagan por adelantado: no es una suscripción que cortás el primer mes.',
      'Las entradas libres van por cupo. Cuando se agota, el beneficio pasa a ser 50 % de descuento, no una entrada gratis.',
      'El 2x1 de cine también lo dan sin costo otros programas (clientes de Antel, medios de pago del BROU): si vas al cine y nada más, la cuota puede sobrar.',
      'Si cobrás del BPS, no pagues la cuota mensual sin preguntar por el Abono Cultural: es la misma tarjeta por un año a una fracción del precio. Dos fuentes oficiales publican montos distintos ($ 1.580 en Socio Espectacular, $ 1.525 en el BPS), y el trámite es presencial en Montevideo, así que confirmá el importe en la ventanilla.',
    ],
    verified: true,
  },
  {
    id: 'club-movistar',
    name: 'Club Movistar',
    operator: 'Movistar Uruguay',
    category: 'telecomunicaciones',
    tagline:
      'Puntos ("Movis") por lo que ya gastás en el celular, canjeables por datos, minutos y SMS.',
    cost: { kind: 'atado', detail: 'Sin cuota, pero hay que ser cliente Movistar' },
    join: 'Automático por usar el servicio; se consulta desde la app Mi Movistar, en la opción Club Movistar.',
    how: 'Los Movis se acreditan por el consumo facturado o recargado y se canjean dentro de la app por paquetes de internet, minutos y SMS, además de descuentos en comercios adheridos.',
    worksAt: ['Paquetes de datos, minutos y SMS de Movistar', 'Comercios adheridos al club'],
    returnNote:
      'No calculable en pesos: las bases dicen cuánto se gana (1 Movi cada $ 30 para personas físicas) pero los Movis se canjean por paquetes de servicio, no por dinero, y no hay equivalencia publicada.',
    expiry: 'Los Movis valen dos años desde que se generaron; después se cancelan.',
    channels: ['app', 'web'],
    siteUrl: 'https://club.movistar.com.uy/',
    rulesUrl: 'https://www.movistar.com.uy/atencion-al-cliente/preguntas-frecuentes/club-movistar',
    facts: [
      { label: 'Cómo se gana', value: '1 Movi cada $ 30 para personas físicas', source: 'oficial' },
      { label: 'Cuándo se acreditan', value: 'A partir del día 10 de cada mes', source: 'oficial' },
      { label: 'Vencimiento', value: 'Dos años desde que se generaron', source: 'oficial' },
      {
        label: 'Qué se canjea',
        value: 'Paquetes de internet, minutos y SMS, más beneficios en comercios',
        source: 'oficial',
      },
    ],
    caveats: [
      'El canje es hacia adentro: los Movis vuelven a Movistar en forma de datos o minutos, no salen como descuento en cualquier comercio.',
      'Sin equivalencia publicada en pesos no se puede comparar contra otro programa: el precio del paquete en Movis lo fija el catálogo vigente.',
      'Se pierde con el servicio: si te cambiás de compañía, los Movis acumulados no van a ningún lado.',
    ],
    verified: true,
  },
  {
    id: 'beneficios-antel',
    name: 'Beneficios Antel',
    operator: 'Antel',
    category: 'telecomunicaciones',
    tagline:
      'Descuentos y 2x1 —cine, espectáculos, gastronomía, tecnología— por ser cliente, sin cuota ni puntos.',
    cost: { kind: 'atado', detail: 'Sin cuota, pero hay que ser cliente Antel' },
    join: 'No hay que asociarse: alcanza con tener el servicio.',
    how: 'Pedís el código desde la app Mi Antel o marcando *789*1# y recibís un SMS con un código de 6 dígitos que presentás en la boletería o el local.',
    worksAt: [
      'Grupocine',
      'Life Cinemas',
      'Movie',
      'Cinemateca',
      'Cines del Este',
      'SODRE',
      'Gastronomía y tecnología adheridas',
    ],
    returnNote:
      'No es un programa de puntos: son descuentos directos por ser cliente. El 2x1 de cine, que en otros programas se paga con una cuota, acá viene sin costo adicional.',
    channels: ['app', 'ussd', 'web'],
    siteUrl: 'https://www.antel.com.uy/personas/promociones/beneficios',
    rulesUrl: 'https://www.antel.com.uy/personas/promociones/beneficios/descuentos/entretenimiento',
    facts: [
      {
        label: 'Cine',
        value:
          '2x1 en entradas 2D y 3D todos los días en Grupocine, Life Cinemas, Movie, Cinemateca y Cines del Este',
        source: 'oficial',
      },
      {
        label: 'Cómo se obtiene',
        value: 'App Mi Antel o *789*1#; llega un SMS con un código de 6 dígitos',
        source: 'oficial',
      },
      { label: 'Precio', value: 'Sin cuota: es un beneficio de cliente', source: 'oficial' },
      {
        label: 'Recargas',
        value: '25 % adicional en recargas digitales de más de $ 100',
        source: 'oficial',
      },
    ],
    caveats: [
      'El 2x1 vale en las salas listadas, no en todos los complejos de cada cadena.',
      'Hay que sacar el código antes de llegar a la boletería: sin el SMS no hay beneficio.',
      'En algunas cadenas el beneficio corre solo por web y en otras solo por boletería. Es la letra chica que más caro sale cuando ya estás en la fila.',
    ],
    verified: true,
  },
  {
    id: 'club-el-pais',
    name: 'Club El País',
    operator: 'Diario El País',
    category: 'prensa',
    tagline:
      'Más de 200 beneficios en gastronomía, tiendas y entretenimiento con la tarjeta que viene con la suscripción al diario.',
    cost: {
      kind: 'atado',
      detail: 'La tarjeta es gratis, pero exige una suscripción paga al diario',
    },
    join: 'Te suscribís (Full Digital o papel) y pedís la tarjeta; también se solicita por teléfono al 2900 4141.',
    how: 'En el comercio presentás la tarjeta física de socio junto con tu cédula. La suscripción se debita de la tarjeta de crédito o se paga en Abitab y RedPagos.',
    worksAt: [
      'Gastronomía',
      'Hoteles y turismo',
      'Vestimenta',
      'Entretenimiento',
      'Hogar',
      'Educación',
    ],
    returnNote:
      'No es un programa de puntos: el retorno depende de cuántos descuentos uses. La cuenta honesta incluye la suscripción al diario, que es lo que en los hechos pagás.',
    channels: ['tarjeta', 'web'],
    siteUrl: 'https://www.clubelpais.com.uy/',
    rulesUrl: 'https://www.clubelpais.com.uy/preguntas-frecuentes/',
    facts: [
      {
        label: 'Costo de la tarjeta',
        value: 'Sin costo: es un obsequio para suscriptores',
        source: 'oficial',
      },
      {
        label: 'Requisito',
        value: 'Suscripción vigente al diario (Full Digital o papel)',
        source: 'oficial',
      },
      {
        label: 'Permanencia',
        value: 'Mínimo tres meses para poder desvincularse',
        source: 'oficial',
      },
      {
        label: 'Cómo se usa',
        value: 'Presentando la tarjeta de socio y la cédula al ser atendido',
        source: 'oficial',
      },
      {
        label: 'Cobertura',
        value: 'Más de 200 beneficios en gastronomía, tiendas y entretenimiento',
        source: 'autodeclarado',
      },
    ],
    caveats: [
      '"Tarjeta gratis" no es "programa gratis": lo que pagás es la suscripción, y ese es el costo real del club.',
      'Hay permanencia mínima de tres meses antes de poder darte de baja.',
      'El beneficio exige tarjeta física más cédula en el mostrador: si te olvidás la tarjeta, no hay descuento.',
      'Club El País también figura como emisor en los mapas de descuentos con tarjeta, así que parte de estos beneficios los podés cruzar antes de salir.',
    ],
    verified: true,
  },
])

export interface BenefitSource {
  label: string
  url: string
  publisher: string
}

export const BENEFIT_SOURCES: readonly BenefitSource[] = Object.freeze([
  {
    label: 'Bases y condiciones del Programa Puntos',
    url: 'https://www.tiendainglesa.com.uy/supermercado/landing/bases-y-condiciones-programa-puntos/349',
    publisher: 'Tienda Inglesa',
  },
  {
    label: 'Términos y condiciones (programa PLUS)',
    url: 'https://www.tata.com.uy/lp/terminos-y-condiciones',
    publisher: 'Ta-Ta',
  },
  {
    label: 'El programa de fidelización de Ta-Ta ya tiene 1.800.000 socios (10/4/2023)',
    url: 'https://infonegocios.biz/plus/el-programa-de-fidelizacion-de-tata-sigue-sumando-gente-ya-tiene-1-800-000-socios',
    publisher: 'InfoNegocios',
  },
  {
    label: 'Bases y condiciones del programa Farmacard',
    url: 'https://tienda.farmashop.com.uy/bases-y-condiciones-programa-farmacard',
    publisher: 'Farmashop',
  },
  {
    label: 'Preguntas frecuentes de la app Estaciones ANCAP y de ANCAPuntos',
    url: 'https://ducsa.com.uy/AppEstacionesAncap/Preguntas-Frecuentes.htm',
    publisher: 'DUCSA',
  },
  { label: 'Catálogo ANCAPuntos', url: 'https://www.ancapuntos.com.uy/', publisher: 'DUCSA' },
  {
    label: 'Los detalles del nuevo modelo de suscripción de PedidosYa (3/6/2025)',
    url: 'https://www.elobservador.com.uy/cafe-y-negocios/el-delivery-entra-el-mundo-las-membresias-y-ahora-tambien-se-paga-mes-los-detalles-del-nuevo-modelo-suscripcion-pedidosya-n6002333',
    publisher: 'El Observador',
  },
  {
    label: 'Preguntas frecuentes de Socio Espectacular',
    url: 'https://socioespectacular.com.uy/preguntas-frecuentes/',
    publisher: 'Socio Espectacular',
  },
  {
    label: 'Abono Cultural BPS (convenio con Socio Espectacular)',
    url: 'https://socioespectacular.com.uy/convenios/abono-cultural-bps/',
    publisher: 'Socio Espectacular',
  },
  {
    label: 'Abono Cultural — Tarjeta Socio Espectacular',
    url: 'https://www.bps.gub.uy/21074/abono-cultural---tarjeta-socio-espectacular.html',
    publisher: 'BPS',
  },
  {
    label: 'Preguntas frecuentes de Club Movistar',
    url: 'https://www.movistar.com.uy/atencion-al-cliente/preguntas-frecuentes/club-movistar',
    publisher: 'Movistar',
  },
  {
    label: 'Descuentos en entretenimiento para clientes Antel',
    url: 'https://www.antel.com.uy/personas/promociones/beneficios/descuentos/entretenimiento',
    publisher: 'Antel',
  },
  {
    label: 'Preguntas frecuentes de Club El País',
    url: 'https://www.clubelpais.com.uy/preguntas-frecuentes/',
    publisher: 'Club El País',
  },
])

/** Programas de una categoría, en el orden del catálogo. */
export function programsByCategory(category: BenefitCategory): BenefitProgram[] {
  return BENEFIT_PROGRAMS.filter(p => p.category === category)
}

/** Categorías con al menos un programa, en el orden de {@link BENEFIT_CATEGORIES}. */
export function activeCategories(): BenefitCategory[] {
  const keys = Object.keys(BENEFIT_CATEGORIES) as BenefitCategory[]
  return keys.filter(k => programsByCategory(k).length > 0)
}

/**
 * Los únicos programas cuyo retorno se puede calcular con lo que publican, de mayor
 * a menor. Que la lista sea corta ES el hallazgo de la página.
 */
export function measurablePrograms(): BenefitProgram[] {
  return BENEFIT_PROGRAMS.filter(p => typeof p.returnPct === 'number').sort(
    (a, b) => (b.returnPct ?? 0) - (a.returnPct ?? 0)
  )
}

/** Programas que no publican lo suficiente para despejar un retorno. */
export function opaquePrograms(): BenefitProgram[] {
  return BENEFIT_PROGRAMS.filter(p => typeof p.returnPct !== 'number')
}

/** Los que no cuestan nada extra: ni cuota propia ni contratar otra cosa. */
export function freePrograms(): BenefitProgram[] {
  return BENEFIT_PROGRAMS.filter(p => p.cost.kind === 'gratis')
}

export function getBenefitProgram(id: string): BenefitProgram | undefined {
  return BENEFIT_PROGRAMS.find(p => p.id === id)
}

/**
 * Cuánto deja al año un programa medible sobre un gasto mensual dado, en pesos.
 * Devuelve null cuando el programa no publica lo necesario: la página muestra
 * "no calculable" en vez de un número inventado.
 */
export function yearlyReturn(program: BenefitProgram, monthlySpend: number): number | null {
  if (typeof program.returnPct !== 'number') return null
  if (!Number.isFinite(monthlySpend) || monthlySpend <= 0) return 0
  return (monthlySpend * 12 * program.returnPct) / 100
}
