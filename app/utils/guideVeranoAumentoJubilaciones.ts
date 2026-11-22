// 2026-11-22: aumento-de-jubilaciones-uruguay. Cada enero la gente busca «aumento jubilaciones
// 2027», «cuánto aumentan las jubilaciones», «cuándo cobran los jubilados el aumento», y el sitio no
// tenía una página que lo contestara entero: el 5,97 % de 2026 vivía en `bpsFigures2026.ts` como dato
// suelto de tres páginas. Verificado el 2026-11-22 contra el BPS (noticias 23862, 24396, 23206 y
// 18932, página de montos 6182 y la FAQ 12728 del recibo), IMPO (Constitución art. 67, Ley 17.649,
// Decretos 188/020, 189/025, 183/026, 213/026 y 11/026) y el INE (informes del IMS de noviembre y
// diciembre de 2024 y 2025, el de setiembre de 2026 y el calendario de actividades).
//
// La guía NO lleva ninguna cifra escrita a mano: todo sale de `utils/aumentoJubilaciones.ts` (y de
// `bpsFigures2026.ts`/`irpfCasos.ts` para lo que ya vivía ahí). Y está escrita en tres versiones
// —2027 pendiente, con provisorio, con definitivo— que se eligen solas según las constantes
// `AJUSTE_2027_*`: cuando salga el dato se cargan esas constantes y no se toca esta prosa.
import type { Guide, GuideSection } from './guides'
import {
  AJUSTE_2026_ANUNCIADO_EL,
  AJUSTE_2026_PROVISORIO_PCT,
  AUMJUB_2027,
  AUMJUB_HISTORIA,
  AUMJUB_IMSN_REFERENCIA,
  AUMJUB_INE_PROXIMOS,
  AUMJUB_MINIMA_ADICIONAL_2025_PCT,
  AUMJUB_MINIMA_ADICIONAL_2026_DESDE,
  AUMJUB_MINIMA_ADICIONAL_2026_ORIGINAL_PCT,
  AUMJUB_MINIMA_ADICIONAL_2026_PCT,
  AUMJUB_MINIMA_BPC,
  AUMJUB_MINIMA_BPC_DESDE,
  AUMJUB_MINIMA_DIFERENCIAL_2026,
  AUMJUB_MINIMA_DIFERENCIAL_BPC,
  AUMJUB_MINIMA_TOPE_JULIO_2026,
  AUMJUB_MINIMA_TOPE_JULIO_2026_BPC,
  AUMJUB_PRORRATEO_2026,
  AUMJUB_VERIFIED_AT,
  type AumJub2027,
  aumJubEstado,
  aumJubFaq,
  aumJubFecha,
  aumJubFechaCorta,
  aumJubMes,
  aumJubMesSolo,
  aumJubMesesQueFaltan,
  aumJubSources,
  aumJubVentanaDoceMeses,
  formatAumJubBpc,
  formatAumJubPct,
  formatAumJubUyu,
} from './aumentoJubilaciones'
import { AJUSTE_PASIVIDADES_2026_PCT, JUBILACION_MINIMA_2026 } from './bpsFigures2026'
import { BPC_2026 } from './irpfCasos'

export const AUMENTO_JUBILACIONES_SLUG = 'aumento-de-jubilaciones-uruguay'

const pct = formatAumJubPct
const uyu = formatAumJubUyu
const bpc = formatAumJubBpc

/** El `<title>` sin la marca: la página agrega « | Cambio Uruguay». Contesta en cada versión. */
export function aumentoJubilacionesTitle(state: AumJub2027 = AUMJUB_2027): string {
  switch (aumJubEstado(state)) {
    case 'definitivo':
      return `Aumento de jubilaciones 2027: ${pct(state.pct!)}`
    case 'provisorio':
      return `Jubilaciones 2027: ${pct(state.provisorioPct!)} provisorio`
    default:
      return 'Jubilaciones 2027: cuánto y cuándo aumentan'
  }
}

/** La descripción del snippet: arranca por la respuesta que hay en cada momento. */
export function aumentoJubilacionesDescription(state: AumJub2027 = AUMJUB_2027): string {
  const ref = AUMJUB_IMSN_REFERENCIA
  switch (aumJubEstado(state)) {
    case 'definitivo':
      return `Las jubilaciones y pensiones del BPS suben ${pct(state.pct!)} en 2027, la suba del IMSN de 2026. Cuándo se cobra, quién recibe menos y por qué la mínima va aparte.`
    case 'provisorio':
      return `Provisorio de ${pct(state.provisorioPct!)}: el IMSN de enero a noviembre de 2026. El definitivo llega a fin de enero; en 2026 la diferencia se pagó en marzo, retroactiva.`
    default:
      return `Todavía no hay cifra: el aumento de 2027 sale del IMSN de 2026, que el INE publica a fin de enero. A ${aumJubMesSolo(ref.mes)} iba ${pct(ref.imsnAcumuladoPct)}; en 2026 fue ${pct(AJUSTE_PASIVIDADES_2026_PCT)}.`
  }
}

function respuestaCorta(state: AumJub2027): GuideSection {
  const ref = AUMJUB_IMSN_REFERENCIA
  switch (aumJubEstado(state)) {
    case 'definitivo':
      return {
        heading: `2027: ${pct(state.pct!)}`,
        body: `El aumento general de las jubilaciones y pensiones del BPS para 2027 es de ${pct(state.pct!)}${state.norma ? `, fijado por ${state.norma}` : ''}${state.fecha ? ` y anunciado el ${aumJubFecha(state.fecha)}` : ''}. Es la variación del Índice Medio de Salarios Nominales (IMSN) de enero a diciembre de 2026, igual que el ${pct(AJUSTE_PASIVIDADES_2026_PCT)} de 2026 fue la del IMSN de 2025.${state.provisorioPct !== null ? ` El provisorio había sido ${pct(state.provisorioPct)}.` : ''} Si te jubilaste durante 2026 te toca menos, y la jubilación mínima va por otro lado: se mueve con la BPC y con decretos propios. Las dos cosas están más abajo.`,
      }
    case 'provisorio':
      return {
        heading: `2027: provisorio de ${pct(state.provisorioPct!)}, definitivo a fin de enero`,
        body: `El BPS aplica para 2027 un aumento provisorio de ${pct(state.provisorioPct!)}, que es la variación del Índice Medio de Salarios Nominales (IMSN) de enero a noviembre de 2026. El definitivo sale del dato de diciembre, que el INE publica a fin de enero. En 2026 el provisorio fue ${pct(AJUSTE_2026_PROVISORIO_PCT)}, el definitivo ${pct(AJUSTE_PASIVIDADES_2026_PCT)}, y la diferencia se pagó en marzo, retroactiva a enero.`,
      }
    default:
      return {
        heading: '2027: el porcentaje todavía no existe',
        body: `Al ${aumJubFecha(AUMJUB_VERIFIED_AT)}, el aumento de las jubilaciones y pensiones del BPS para 2027 no tiene número, y cualquier porcentaje «confirmado» que veas circular es una estimación. Lo que sí está definido es la cuenta: es la variación del Índice Medio de Salarios Nominales (IMSN) de enero a diciembre de 2026, y el INE publica el dato de diciembre a fin de enero. El último informe publicado es el de ${aumJubMes(ref.mes)}, y ahí el IMSN acumulaba ${pct(ref.imsnAcumuladoPct)} en el año. Si se repite el esquema de 2026, la pasividad de enero se cobra en febrero con un aumento provisorio y en marzo llega la diferencia, retroactiva a enero.`,
      }
  }
}

function comoSeCalcula(state: AumJub2027): GuideSection {
  const estado = aumJubEstado(state)
  const noviembre2026 = AUMJUB_INE_PROXIMOS.find(p => p.mes === '2026-11')
  const fila2027 = [
    '2027',
    state.provisorioPct !== null
      ? pct(state.provisorioPct, 2)
      : estado === 'definitivo'
        ? 'Sin dato cargado'
        : noviembre2026
          ? `Sale el ${aumJubFechaCorta(noviembre2026.fecha)}`
          : 'Sale a fin de diciembre',
    state.pct !== null ? pct(state.pct, 2) : 'Sale a fin de enero',
    state.fecha
      ? `Diciembre: ${aumJubFechaCorta(state.fecha)}`
      : noviembre2026
        ? `Noviembre: ${aumJubFechaCorta(noviembre2026.fecha)}; diciembre, sin fecha todavía`
        : 'Diciembre, sin fecha todavía',
  ]
  return {
    heading: 'Cómo se calcula: el IMSN del año anterior',
    body: `El artículo 67 de la Constitución, en el inciso que agregó el plebiscito de 1989, dice que los ajustes de las jubilaciones y pensiones «no podrán ser inferiores a la variación del Índice Medio de Salarios» y que se hacen en las mismas oportunidades en que se ajustan los sueldos de la Administración Central. La Ley 17.649 manda elaborar ese índice con las retribuciones nominales de los trabajadores, y por eso el INE publica uno propio para esto: el IMSN, Índice Medio de Salarios Nominales. El aumento es la variación del IMSN de enero a diciembre del año anterior, lo que el INE llama «acumulada en el año». Como el dato de diciembre sale a fin de enero, el BPS arranca con un provisorio, que es la variación de enero a noviembre, y después paga la diferencia. En 2025 y en 2026 el aumento definitivo fue exactamente el IMSN del año anterior, sin un decimal de más.`,
    table: {
      headers: [
        'Aumento de',
        'IMSN de enero a noviembre',
        'IMSN del año entero (el aumento)',
        'El INE publicó noviembre y diciembre',
      ],
      rows: [
        ...AUMJUB_HISTORIA.map(anio => [
          String(anio.anio),
          pct(anio.imsnEneroNoviembrePct, 2),
          pct(anio.definitivoPct, 2),
          `${aumJubFechaCorta(anio.inePublicoNoviembre)} y ${aumJubFechaCorta(anio.inePublicoDiciembre)}`,
        ]),
        fila2027,
      ],
    },
  }
}

/** La referencia de hoy. Sólo se publica mientras 2027 no tiene ningún porcentaje oficial. */
function queSeSabeHoy(): GuideSection {
  const ref = AUMJUB_IMSN_REFERENCIA
  const proximos = AUMJUB_INE_PROXIMOS.filter(p => p.mes > ref.mes)
  const agenda = proximos.length
    ? ` El INE anuncia ${proximos
        .map(
          p =>
            `el informe de ${aumJubMesSolo(p.mes)}${p.mes.endsWith('-11') ? ', que es el del provisorio,' : ''} para el ${aumJubFecha(p.fecha)}`
        )
        .join(' y ')}.`
    : ''
  return {
    heading: 'Qué se sabe hoy de 2027, como referencia',
    body: `El último informe del INE es el de ${aumJubMes(ref.mes)}, publicado el ${aumJubFecha(ref.publicadoEl)}: el IMSN acumulaba ${pct(ref.imsnAcumuladoPct)} en el año y ${pct(ref.imsnDoceMesesPct)} en los últimos doce meses. Ninguno de los dos es el aumento de 2027. Al acumulado le faltan ${aumJubMesesQueFaltan(ref.mes)} meses del año, y el de doce meses mide ${aumJubVentanaDoceMeses(ref.mes)}, así que incluye meses de 2025 que ya entraron en el aumento de 2026. El número que va a contar es el de enero a diciembre de 2026: tomá estos dos como una señal de por dónde viene la cuenta, no como una promesa.${agenda} Y ojo con los titulares: el mismo día el INE publica el IMS, que se calcula sobre el salario líquido y a ${aumJubMesSolo(ref.mes)} acumulaba ${pct(ref.imsAcumuladoPct)}; el que ajusta las pasividades es el IMSN, sobre el salario nominal sin descontar aportes personales.`,
  }
}

function cuandoSeCobra(state: AumJub2027): GuideSection {
  const cierre =
    aumJubEstado(state) === 'definitivo'
      ? 'Para 2027 mirá en tu recibo cuál de los dos cobros ya trae el porcentaje definitivo.'
      : 'Si se repite el esquema, en 2027 pasa lo mismo: provisorio en el cobro de febrero y diferencia en el de marzo.'
  return {
    heading: 'Cuándo se cobra: en febrero, y la diferencia en marzo',
    body: `El aumento rige desde enero, pero el BPS paga vencido: la pasividad de un mes se cobra al mes siguiente, como el aumento de julio de las mínimas, que el BPS pagó «en agosto, con las pasividades correspondientes a julio». Por eso el primer recibo con aumento es el que cobrás en febrero. En 2026 la secuencia fue ésta, según el BPS: en febrero se cobró la pasividad de enero con el provisorio de ${pct(AJUSTE_2026_PROVISORIO_PCT)}, y en marzo llegó el definitivo de ${pct(AJUSTE_PASIVIDADES_2026_PCT)} con la diferencia de enero, retroactiva. ${cierre} El día exacto depende de cómo y dónde cobrás, y se consulta con tu cédula.`,
    links: [{ label: 'Fecha de cobro del BPS', to: '/fecha-de-cobro-bps-uruguay' }],
  }
}

function prorrateo(state: AumJub2027): GuideSection {
  const primero = AUMJUB_PRORRATEO_2026[0]!
  const ultimo = AUMJUB_PRORRATEO_2026.at(-1)!
  const tabla2027 =
    aumJubEstado(state) === 'definitivo'
      ? 'si te jubilaste en 2026, buscá tu mes en la tabla nueva de esa misma página.'
      : 'la que corresponde a quien se jubiló en 2026 todavía no está publicada.'
  return {
    heading: 'Si te jubilaste durante el año, el aumento es menor',
    body: `El aumento entero es para quien ya cobraba antes de que empezara el año que se mide. A quien se jubiló durante 2025, el BPS le aplicó en enero de 2026 un aumento reducido según el mes de cese o de configuración de causal: de ${pct(primero.pct, 2)} si fue en ${primero.mes} a ${pct(ultimo.pct, 2)} si fue en ${ultimo.mes}. El BPS publica la tabla junto con la regla del artículo 27 de la Ley 16.713: el sueldo básico jubilatorio se actualiza por el Índice Medio de Salarios hasta el mes anterior a empezar a cobrar la pasividad. En 2025 y en 2026 la tabla salió en la página de montos del BPS junto con el ajuste; ${tabla2027}`,
    table: {
      headers: ['Mes de cese o causal', 'Aumento en enero de 2026'],
      rows: AUMJUB_PRORRATEO_2026.map(row => [row.mes, pct(row.pct, 2)]),
    },
    links: [{ label: 'Cuándo me puedo jubilar', to: '/cuando-me-puedo-jubilar-uruguay' }],
  }
}

function minima(): GuideSection {
  return {
    heading: 'La jubilación mínima va por otro lado',
    body: `La mínima no se mueve con el IMSN sino con la BPC. Desde el ${aumJubFecha(AUMJUB_MINIMA_BPC_DESDE)} equivale a ${bpc(AUMJUB_MINIMA_BPC)} BPC (Decreto 188/020), así que en 2026, con la BPC en ${uyu(BPC_2026)} (Decreto 11/026), es de ${uyu(JUBILACION_MINIMA_2026)} por mes; el BPS la paga a quien cumple sus condiciones, entre ellas vivir en el país. Arriba de ese piso hay un escalón para quien no tiene otros ingresos, que fija el Decreto 189/025: un ${pct(AUMJUB_MINIMA_ADICIONAL_2025_PCT)} desde julio de 2025 —en 2026 el BPS lo publica como ${uyu(AUMJUB_MINIMA_DIFERENCIAL_2026)}, que son ${bpc(AUMJUB_MINIMA_DIFERENCIAL_BPC)} BPC— y otro desde el ${aumJubFecha(AUMJUB_MINIMA_ADICIONAL_2026_DESDE)}. Ese segundo escalón estaba previsto en ${pct(AUMJUB_MINIMA_ADICIONAL_2026_ORIGINAL_PCT)} y los Decretos 183/026, para las jubilaciones, y 213/026, para las pensiones de sobrevivencia, lo llevaron a ${pct(AUMJUB_MINIMA_ADICIONAL_2026_PCT)}. Se cobró en agosto y, según el BPS, lleva a ${uyu(AUMJUB_MINIMA_TOPE_JULIO_2026, 2)} a quien, sumando su pasividad y su renta de AFAP, cobra entre ${bpc(AUMJUB_MINIMA_BPC)} y ${bpc(AUMJUB_MINIMA_TOPE_JULIO_2026_BPC)} BPC. Desde 2025 estos aumentos no se descuentan del ajuste de enero: se suman. Para 2027 el Decreto 189/025 no prevé otro escalón, y la mínima depende del decreto que fije la BPC de ese año. La canasta de fin de año tampoco es parte del ajuste: tiene su propio decreto cada año.`,
    links: [
      { label: 'Cuánto vale la BPC', to: '/indicadores/bpc' },
      { label: 'Canasta de fin de año del BPS', to: '/guias/canasta-fin-de-ano-bps-uruguay' },
      { label: 'Suplemento solidario', to: '/suplemento-solidario-bps' },
    ],
  }
}

function recibo(): GuideSection {
  return {
    heading: 'Dónde ver cuánto te aumentó',
    body: 'El aumento se ve en el recibo de cobro, y la forma más simple de leerlo es poner lado a lado el que cobraste en enero, que es la pasividad de diciembre, y el que cobrás en febrero. Con Usuario personal BPS lo bajás en el servicio «Consultar recibos de cobros»: elegís el rango de fechas y «Ver recibo» lo descarga en PDF. También está en la app BPS Personas, en «Recibo de cobro», y el BPS lo manda solo al correo asociado a tu usuario, aunque los primeros envíos a veces caen en correo no deseado. Por la web se bajan los recibos pagados de hasta cuatro años atrás. Sin usuario, en Montevideo se pide en el Edificio Sede del BPS, Colonia 1851, planta baja, y en el interior en la oficina del BPS más cercana.',
  }
}

function loQueNoPublica(state: AumJub2027): GuideSection {
  return {
    heading: 'Lo que esta guía no publica',
    body: `Ni la noticia del BPS sobre el ajuste de 2026 ni su página de montos citan un decreto o una resolución que fije el ${pct(AJUSTE_PASIVIDADES_2026_PCT)}, y en IMPO no encontramos uno; el Directorio del BPS dijo en 2022 que los reajustes de pasividades «corresponden al Poder Ejecutivo» y que los aplican sus servicios técnicos. Por eso no le atribuimos el aumento general a una norma que no pudimos leer: publicamos el porcentaje del BPS, que coincide con el IMSN del INE.${aumJubEstado(state) === 'definitivo' ? '' : ' Tampoco estimamos el número de 2027 antes de que exista.'} Esta guía es del BPS: si cobrás de otra caja (la Militar, la Policial, la Bancaria, la de Profesionales o la Notarial), mirá lo que publica la tuya. Las fuentes se leyeron el ${aumJubFecha(AUMJUB_VERIFIED_AT)} y están enlazadas abajo.`,
  }
}

/**
 * La guía entera para un estado de 2027. Existe como función para que el test pueda armar las tres
 * versiones —pendiente, provisorio, definitivo— y medir cada una contra los presupuestos del SERP.
 */
export function buildAumentoJubilacionesGuide(state: AumJub2027 = AUMJUB_2027): Guide {
  const estado = aumJubEstado(state)
  const sections: GuideSection[] = [
    respuestaCorta(state),
    comoSeCalcula(state),
    ...(estado === 'pendiente' ? [queSeSabeHoy()] : []),
    cuandoSeCobra(state),
    prorrateo(state),
    minima(),
    recibo(),
    loQueNoPublica(state),
  ]
  return {
    slug: AUMENTO_JUBILACIONES_SLUG,
    title: aumentoJubilacionesTitle(state),
    description: aumentoJubilacionesDescription(state),
    tag: 'JUBILADOS',
    updatedAt: '2026-11-22',
    sections,
    steps: [
      estado === 'definitivo'
        ? {
            name: 'Anotá el porcentaje de 2027',
            text: `Es ${pct(state.pct!)} sobre tu pasividad, salvo que te hayas jubilado durante 2026.`,
          }
        : {
            name: 'Esperá el dato de fin de enero',
            text: `El INE publica el IMSN de diciembre a fin de enero y el BPS anunció el definitivo de 2026 ese mismo día, el ${aumJubFechaCorta(AJUSTE_2026_ANUNCIADO_EL)}.`,
          },
      {
        name: 'Mirá el recibo de febrero',
        text: 'Es el de la pasividad de enero, el primero con aumento; en 2026 trajo el provisorio.',
      },
      {
        name: 'Mirá el recibo de marzo',
        text: 'En 2026 trajo el definitivo y la diferencia de enero, retroactiva.',
      },
      {
        name: 'Si te jubilaste el año anterior, buscá tu mes',
        text: 'El aumento es menor y depende del mes de cese o de causal; el BPS publica la tabla en su página de montos.',
      },
      {
        name: 'Si algo no cierra, consultá al BPS',
        text: 'Al *1997 desde un celular o al 0800 1997 desde un fijo, de lunes a viernes de 08:00 a 18:00 h.',
      },
    ],
    faqs: aumJubFaq(state).map(item => ({ q: item.question, a: item.answer })),
    related: [
      { label: 'Fecha de cobro del BPS', to: '/fecha-de-cobro-bps-uruguay' },
      { label: 'Cuándo me puedo jubilar', to: '/cuando-me-puedo-jubilar-uruguay' },
      { label: 'Suplemento solidario', to: '/suplemento-solidario-bps' },
      { label: 'Pensión a la vejez', to: '/pension-a-la-vejez-uruguay' },
      { label: 'Préstamos para jubilados', to: '/prestamos-para-jubilados-uruguay' },
      { label: 'Canasta de fin de año del BPS', to: '/guias/canasta-fin-de-ano-bps-uruguay' },
      { label: 'Valor de la BPC', to: '/indicadores/bpc' },
    ],
    sources: aumJubSources(state).map(source => ({
      label: source.label,
      url: source.url,
      publisher: source.publisher,
    })),
  }
}

export const aumentoJubilacionesGuide: Guide = buildAumentoJubilacionesGuide()
