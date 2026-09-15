// Quién cobra un giro del exterior, y con qué evidencia.
//
// "Me mandan plata de afuera, ¿dónde la retiro?" es una pregunta de MARCA y de
// mostrador: no se contesta con el dólar de hoy sino con el nombre de la casa y
// su dirección. El dato ya estaba en el sitio y no estaba publicado: la
// investigación de `casasDirectory.ts` (fechada en `CASAS_LAST_RESEARCHED`)
// leyó la web propia de cada casa y anotó, casa por casa, si declara operar
// como agente de una red internacional. Estaba enterrado dentro de listas de
// `services`/`strengths` de un directorio que se lee por reputación y precio,
// donde nadie que busca "dónde cobro un giro" lo iba a encontrar.
//
// Este módulo NO investiga nada nuevo: sólo clasifica lo que el catálogo ya
// afirma. Por eso cada fila lleva `quote` — la línea TEXTUAL del catálogo — y
// `source`, una URL que ya figura entre las fuentes de esa misma casa. El test
// verifica las dos cosas contra `CASAS_REPUTATION`, así que una edición del
// catálogo que cambie o borre la afirmación pone la CI en rojo en vez de dejar
// esta página afirmando algo que su propia fuente ya no dice.
//
// Tres decisiones que definen qué se puede publicar acá:
//
//  1. **No se publica ninguna comisión, tipo de cambio ni tope.** Los precios de
//     un giro los fija la red (Western Union, MoneyGram) por corredor y por
//     momento, y no hay fuente propia que los sostenga. Una página que los
//     inventara sería exactamente el error que este sitio no comete. La página
//     contesta DÓNDE, que es lo verificable, y lo dice.
//  2. **"No declara" es un dato, no un hueco.** Siete casas dicen en su propia
//     web que no hacen giros internacionales. Publicarlo ahorra el viaje, y es
//     información que ningún agregador da porque no vende nada.
//  3. **Una afirmación archivada no es una afirmación vigente.** Cambio
//     Argentino ofrecía Western Union según una captura de 2023 de un sitio que
//     ya no está en línea. Eso va en su propio grupo, nunca junto a los agentes
//     vigentes: la diferencia entre "lo hace" y "lo hacía" es el viaje perdido.
//
// PURO (sin imports de Vue/Nuxt, imports relativos) para que vitest lo cargue en
// Node y la ruta del sitemap pueda importarlo.

import { CASAS_REPUTATION, CASAS_LAST_RESEARCHED, type CasaReputation } from './casasDirectory'

/** La red internacional que la casa nombra. `null` = declara giros sin nombrar red. */
export type RemittanceNetwork = 'western-union' | 'moneygram'

/**
 * Qué dice la casa sobre cobrar/enviar plata desde el exterior.
 *
 * - `agente`: nombra la red internacional de la que es agente.
 * - `internacional`: declara giros o remesas internacionales sin nombrar la red.
 * - `no-declara`: su propia web dice que no ofrece este servicio.
 * - `archivado`: lo ofrecía según una captura, sin sitio vigente que lo confirme.
 */
export type RemittanceVerdict = 'agente' | 'internacional' | 'no-declara' | 'archivado'

export interface RemittanceClaim {
  /** Código de origen, el mismo que usa `/casa/:origin`. */
  code: string
  verdict: RemittanceVerdict
  network: RemittanceNetwork | null
  /** Línea TEXTUAL del catálogo que sostiene el veredicto. */
  quote: string
  /** URL entre las fuentes de esa casa en el catálogo. */
  source: string
}

/**
 * Las afirmaciones, transcritas del catálogo.
 *
 * El orden acá no importa: `remittanceGroups()` ordena por nombre. Lo que
 * importa es que cada `quote` sea copia literal y cada `source` esté entre las
 * fuentes de esa casa, que es lo que el test comprueba.
 */
export const REMITTANCE_CLAIMS: readonly RemittanceClaim[] = Object.freeze([
  {
    code: 'aeromar',
    verdict: 'agente',
    network: 'western-union',
    quote: 'Agente Western Union: giros internacionales de envío y recepción',
    source: 'https://aeromar.com.uy/transferencias.php',
  },
  {
    code: 'cambial',
    verdict: 'agente',
    network: 'western-union',
    quote: 'Agente de Western Union además del cambio de divisas',
    source: 'https://cambialcasadecambios.com.uy/',
  },
  {
    code: 'cambio18',
    verdict: 'agente',
    network: 'western-union',
    quote: 'Servicios complementarios: oro, cofres fort, Western Union y Redpagos',
    source: 'https://www.cambio18.com/',
  },
  {
    code: 'cambio_aguerrebere',
    verdict: 'agente',
    network: 'western-union',
    quote: 'Servicios complementarios: Western Union, Red Pagos y cofres de seguridad en Colonia',
    source: 'https://cambioaguerrebere.com/',
  },
  {
    code: 'cambio_maiorano',
    verdict: 'agente',
    network: 'western-union',
    quote: 'transferencias internacionales vía Western Union',
    source: 'https://cambiomaiorano.com/servicios/',
  },
  {
    code: 'cambio_misiones',
    verdict: 'agente',
    network: 'western-union',
    quote: 'Agente Western Union más servicios de cobranza (Red Pagos) y entradas',
    source: 'https://www.cambiomisiones.com.uy/servicios.php',
  },
  {
    code: 'cambio_obelisco',
    verdict: 'agente',
    network: 'western-union',
    quote:
      'Multiservicio en un solo local céntrico: Western Union, RedPagos, giros, cajeros BROU, lotería',
    source: 'https://cambioobelisco.com.uy/',
  },
  {
    code: 'cambio_openn',
    verdict: 'agente',
    network: 'western-union',
    quote:
      'Servicios múltiples en un solo local: Western Union, Redpagos, Abitab, Mi Dinero y pagos',
    source: 'https://cambioopenn.com.uy/servicios/',
  },
  {
    code: 'cambio_pernas',
    verdict: 'agente',
    network: 'western-union',
    quote: 'Transferencias internacionales Western Union',
    source: 'https://cambiopernas.com.uy/servicios.php',
  },
  {
    code: 'cambio_romantico',
    verdict: 'agente',
    network: 'western-union',
    quote: 'Giros internacionales como agente Western Union',
    source: 'https://web.archive.org/web/20250417214800/http://cambioromantico.com/',
  },
  {
    code: 'cambio_young',
    verdict: 'agente',
    network: 'western-union',
    quote:
      'Servicios diversificados: Western Union, Redpagos, giros, depósitos bancarios, entradas y recargas',
    source: 'https://youngencambio.com/servicios/',
  },
  {
    code: 'gales',
    verdict: 'agente',
    network: 'western-union',
    quote: 'Agente autorizado de Western Union desde 1993 con 200+ subagentes en todo el país',
    source: 'https://www.gales.com.uy/',
  },
  {
    code: 'indumex',
    verdict: 'agente',
    network: 'western-union',
    quote:
      'Portafolio amplio: Western Union, transferencias internacionales, tarjeta prepaga, cobranzas y pago de sueldos',
    source: 'https://www.indumex.com/productos',
  },
  {
    code: 'la_favorita',
    verdict: 'agente',
    network: 'western-union',
    quote: 'Servicios amplios: Western Union, giros Abitab, oro y depósitos bancarios',
    source: 'https://lafavorita.com.uy/',
  },
  {
    code: 'tradelix',
    verdict: 'agente',
    network: 'western-union',
    quote: 'Servicios complementarios: Western Union, giros y Redpagos en el mismo local',
    source: 'https://tradelix.com.uy/servicios/',
  },
  {
    // La única mención de MoneyGram del catálogo, y viene de una reseña, no de la
    // web de la casa. Se cita con el hedge incluido para que el lector vea de
    // dónde sale: en `services` Matriz declara "giros y transferencias
    // internacionales", pero la RED sólo la nombra quien dejó la reseña.
    code: 'matriz',
    verdict: 'agente',
    network: 'moneygram',
    quote: "Agente MoneyGram (reseña: 'únicos con Money Gram y los domingos está abierto')",
    source:
      'https://www.smartservices.uy/institucion-financiera/montevideo/cambio-matriz-montevideo_226133.php',
  },
  {
    code: 'baluma_cambio',
    verdict: 'internacional',
    network: null,
    quote: 'giros y transferencias nacionales e internacionales',
    source:
      'https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/InformacionInstitucion.aspx?nroinst=2451',
  },
  {
    code: 'cambistar',
    verdict: 'internacional',
    network: null,
    quote: 'giros y transferencias nacionales e internacionales (Giros More)',
    source: 'https://www.investa.com.uy/',
  },
  {
    code: 'cambio_ingles',
    verdict: 'internacional',
    network: null,
    quote:
      'Servicios adicionales: cobranzas, remesas internacionales, entradas a eventos y retiros/depósitos bancarios',
    source: 'https://www.cambioingles.com.uy/',
  },
  {
    code: 'cambio_rynder',
    verdict: 'internacional',
    network: null,
    quote:
      'Servicios complementarios: RedPagos, giros internacionales, metales preciosos, tickets RED UTS/Tickantel, mini ATM',
    source: 'https://rynder.com.uy/',
  },
  {
    code: 'cambio_varzy',
    verdict: 'internacional',
    network: null,
    quote: 'giros y transferencias nacionales e internacionales',
    source: 'https://www.cambiovarzy.com/',
  },
  {
    code: 'eurodracma',
    verdict: 'internacional',
    network: null,
    quote: 'transferencias/giros al exterior',
    source: 'https://eurodracma.com/servicios/',
  },
  {
    code: 'varlix',
    verdict: 'internacional',
    network: null,
    quote: 'Remesas y giros nacionales e internacionales',
    source: 'https://www.varlix.com.uy/nosotros',
  },
  {
    code: 'cambio_3',
    verdict: 'no-declara',
    network: null,
    quote: 'Sin reserva/pedido online, app móvil, delivery ni Western Union/MoneyGram según su web',
    source: 'https://cambio3.com.uy/empresa.php',
  },
  {
    code: 'cambio_minas',
    verdict: 'no-declara',
    network: null,
    quote:
      'Sin transferencias internacionales, Western Union, MoneyGram, delivery ni app propia según su web',
    source: 'https://cambiominas.com.uy/servicios/',
  },
  {
    code: 'cambio_oriental',
    verdict: 'no-declara',
    network: null,
    quote:
      'Sin app, delivery, reserva/pedido online ni giros internacionales (Western Union/MoneyGram) según su web',
    source: 'https://www.cambiooriental.com/servicios.html',
  },
  {
    code: 'cambio_pando',
    verdict: 'no-declara',
    network: null,
    quote: 'No ofrece Western Union ni MoneyGram según su web',
    source: 'https://www.cambiopando.com.uy/servicios/',
  },
  {
    code: 'cambio_principal',
    verdict: 'no-declara',
    network: null,
    quote:
      'Sin servicios digitales: no ofrece reserva/pedido online, delivery, app ni transferencias internacionales (Western Union/MoneyGram no mencionados)',
    source: 'https://cambioprincipal.com.uy/',
  },
  {
    code: 'cambio_regul',
    verdict: 'no-declara',
    network: null,
    quote:
      'Web propia muy básica: sin reserva online, delivery, app ni transferencias internacionales',
    source: 'https://cambioregulsa.com/',
  },
  {
    code: 'suizo',
    verdict: 'no-declara',
    network: null,
    quote: 'No ofrece Western Union, MoneyGram ni sucursales en aeropuerto',
    source: 'https://www.cambiosuizo.com.uy/',
  },
  {
    code: 'cambio_argentino',
    verdict: 'archivado',
    network: 'western-union',
    quote: 'Ofrecía giros Western Union además del cambio de divisas (sitio archivado 2023)',
    source: 'https://web.archive.org/web/20230331160251/http://cambioargentino.uy/western.html',
  },
] as const)

/** La fecha en que se investigó todo esto. Se publica en la página. */
export const REMITTANCE_RESEARCHED_ON = CASAS_LAST_RESEARCHED

/** Una afirmación con el nombre de la casa ya resuelto contra el catálogo. */
export interface RemittanceEntry extends RemittanceClaim {
  name: string
  /** Ruta al hub de la casa. Todos los códigos son orígenes vivos de `/localData`. */
  path: string
}

const byCode = new Map<string, CasaReputation>(CASAS_REPUTATION.map(casa => [casa.code, casa]))

/** Nombre de la casa según el catálogo; el código como último recurso. */
export function casaName(code: string): string {
  return byCode.get(code)?.name ?? code
}

/**
 * Las afirmaciones de un veredicto, ordenadas por nombre.
 *
 * Alfabético y no "las mejores primero" a propósito: acá no hay un ranking que
 * publicar. Sin comisiones no se puede decir cuál conviene, y ordenar por
 * reputación insinuaría que la estrella de Google dice algo sobre el giro.
 */
export function remittanceEntries(verdict: RemittanceVerdict): RemittanceEntry[] {
  return REMITTANCE_CLAIMS.filter(claim => claim.verdict === verdict)
    .map(claim => ({ ...claim, name: casaName(claim.code), path: `/casa/${claim.code}` }))
    .sort((a, b) => a.name.localeCompare(b.name, 'es'))
}

export interface RemittanceCounts {
  /** Casas que nombran la red internacional de la que son agentes. */
  agents: number
  westernUnion: number
  moneyGram: number
  /** Declaran giros internacionales sin nombrar la red. */
  international: number
  /** Su propia web dice que no los hace. */
  declines: number
  /** Sólo con evidencia archivada. */
  archived: number
  /** Casas del catálogo sin ninguna afirmación en un sentido ni en el otro. */
  silent: number
  /** Total de casas investigadas en el catálogo. */
  researched: number
}

/**
 * Los números que van en el título y la descripción.
 *
 * Se cuentan, no se escriben: una descripción con una cifra corre ~1,4 % de CTR
 * contra 0,03-0,2 % de una genérica desde la misma posición, y la única manera
 * de que la cifra no envejezca mal es que salga de la lista.
 */
export function remittanceCounts(): RemittanceCounts {
  const of = (verdict: RemittanceVerdict) =>
    REMITTANCE_CLAIMS.filter(claim => claim.verdict === verdict).length
  const agents = of('agente')
  return {
    agents,
    westernUnion: REMITTANCE_CLAIMS.filter(
      c => c.verdict === 'agente' && c.network === 'western-union'
    ).length,
    moneyGram: REMITTANCE_CLAIMS.filter(c => c.verdict === 'agente' && c.network === 'moneygram')
      .length,
    international: of('internacional'),
    declines: of('no-declara'),
    archived: of('archivado'),
    silent: CASAS_REPUTATION.length - REMITTANCE_CLAIMS.length,
    researched: CASAS_REPUTATION.length,
  }
}
