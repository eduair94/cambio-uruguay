// El aumento anual de las jubilaciones y pensiones del BPS: cómo se calcula, cuánto fue en 2025 y
// 2026, y qué se sabe hoy del de 2027.
//
// Catálogo puro (sin imports de Vue/Nuxt) que compone la guía `/guias/aumento-de-jubilaciones-uruguay`
// (`utils/guideVeranoAumentoJubilaciones.ts`), igual que `historiaLaboral.ts` compone la suya: las
// cifras, las fechas y las citas viven acá y la guía las redacta, así que no hay un segundo literal
// que pueda separarse del primero.
//
// POR QUÉ ESTA GUÍA. Cada enero la gente busca «aumento jubilaciones <año>», «cuánto aumentan las
// jubilaciones», «cuándo cobran los jubilados el aumento». El sitio tenía el 5,97 % de 2026 en
// `bpsFigures2026.ts`, usado como dato suelto por tres páginas, y ninguna contestaba la pregunta
// entera: de dónde sale el número, cuándo se conoce y en qué recibo aparece.
//
// LO QUE SE VERIFICÓ (2026-11-22) Y CONVIENE NO OLVIDAR:
//   - El índice que ajusta las pasividades NO es el IMS de los titulares sino el IMSN (Índice Medio
//     de Salarios Nominales, Ley 17.649): el INE publica los dos el mismo día y dan distinto. El
//     aumento de cada año es la variación del IMSN «acumulada en el año» anterior (enero a
//     diciembre). En 2026: IMSN de diciembre de 2025, acumulado 5,97 % = aumento 5,97 %. En 2025:
//     IMSN de diciembre de 2024, acumulado 6,13 % = aumento 6,13 %.
//   - El provisorio de enero es la variación de enero a noviembre (en 2026, 5,72 %, que es el IMSN
//     de noviembre de 2025 acumulado en el año). El BPS lo cobra en febrero, con la pasividad de
//     enero, y en marzo paga la diferencia retroactiva. El comentario de `retirementAge.ts`
//     («Se paga desde marzo con retroactividad a enero») es cierto del DEFINITIVO, no del aumento:
//     el provisorio ya estaba en el cobro de febrero.
//   - Ni la noticia del BPS del 30/1/2026 ni su página de montos citan un decreto o resolución que
//     fije el 5,97 %, y en IMPO no apareció ninguno. El BPS dijo en 2022 (comunicado del Directorio)
//     que los reajustes «corresponden al Poder Ejecutivo». Por eso no se le atribuye el aumento
//     general a una norma que no se pudo leer: es un HUECO declarado, no un olvido.
//   - La jubilación mínima no sigue al IMSN: está fijada en 3,05 BPC (Decreto 188/020) y los
//     aumentos de las mínimas van por decreto aparte (189/025, con la redacción de 183/026 y 213/026).
//
// CUANDO SALGA EL DATO DE 2027 se tocan SÓLO las constantes `AJUSTE_2027_*` de abajo: la prosa de la
// guía, el título, la descripción y las preguntas se componen con condicionales y cambian solas.
//
// Módulo PURO: sin imports de Vue/Nuxt, para que vitest lo cargue en node.

import {
  AJUSTE_PASIVIDADES_2026_PCT,
  BPS_FIGURES_2026_SOURCE_URL,
  JUBILACION_MINIMA_2026,
} from './bpsFigures2026'
import { BPC_2026 } from './irpfCasos'

/** Día en que se leyeron todas las fuentes de este archivo. */
export const AUMJUB_VERIFIED_AT = '2026-11-22'

// ---------------------------------------------------------------------------
// 2027: todavía no existe
// ---------------------------------------------------------------------------

/**
 * El aumento general DEFINITIVO de jubilaciones y pensiones del BPS para 2027, en porcentaje.
 *
 * `null` hasta que exista. Sale de la variación del IMSN de enero a diciembre de 2026 («acumulada en
 * el año» en el informe de diciembre del INE), que en 2025 y en 2026 se publicó el 31/1 y el 30/1.
 * Cargarlo SÓLO con el anuncio del BPS a la vista (en 2026 fue
 * https://www.bps.gub.uy/23862/ajuste-definitivo-de-jubilaciones-y-pensiones-para-2026.html, el
 * mismo día que el INE) y comprobar que coincide con el IMSN acumulado del informe de diciembre.
 */
export const AJUSTE_2027_PCT: number | null = null

/**
 * El aumento PROVISORIO de 2027 (IMSN de enero a noviembre de 2026), en porcentaje.
 *
 * `null` hasta que el BPS lo anuncie. El INE publica el IMSN de noviembre de 2026 el 30/12/2026
 * (calendario de actividades del INE, leído el 2026-11-22); en 2026 el provisorio fue el acumulado
 * de enero a noviembre del año anterior y se cobró en febrero.
 */
export const AJUSTE_2027_PROVISORIO_PCT: number | null = null

/**
 * La norma que fije el aumento de 2027, tal como se escribe en prosa («el Decreto N.º 12/027»).
 *
 * `null` también es una respuesta válida con el definitivo cargado: para 2026 el BPS no citó
 * ninguna, y la guía lo dice así en vez de inventarla.
 */
export const AJUSTE_2027_NORMA: string | null = null

/** Día (ISO) en que el BPS anunció el definitivo de 2027. */
export const AJUSTE_2027_FECHA: string | null = null

/** La página oficial del anuncio de 2027; entra sola a las fuentes de la guía. */
export const AJUSTE_2027_URL: string | null = null

/** Las cinco piezas de 2027 juntas: es lo que reciben las funciones que componen la prosa. */
export interface AumJub2027 {
  readonly pct: number | null
  readonly provisorioPct: number | null
  readonly norma: string | null
  readonly fecha: string | null
  readonly url: string | null
}

export const AUMJUB_2027: AumJub2027 = Object.freeze({
  pct: AJUSTE_2027_PCT,
  provisorioPct: AJUSTE_2027_PROVISORIO_PCT,
  norma: AJUSTE_2027_NORMA,
  fecha: AJUSTE_2027_FECHA,
  url: AJUSTE_2027_URL,
})

export type AumJubEstado = 'definitivo' | 'provisorio' | 'pendiente'

/** En qué punto está 2027: lo único que decide qué versión de la prosa se publica. */
export function aumJubEstado(state: AumJub2027 = AUMJUB_2027): AumJubEstado {
  if (state.pct !== null) return 'definitivo'
  if (state.provisorioPct !== null) return 'provisorio'
  return 'pendiente'
}

// ---------------------------------------------------------------------------
// 2026 y 2025: lo que ya pasó
// ---------------------------------------------------------------------------

/**
 * Provisorio de 2026, cobrado en febrero con la pasividad de enero.
 *
 * BPS, «Ajuste definitivo de jubilaciones y pensiones para 2026» (30/1/2026): «Durante febrero, los
 * jubilados y pensionistas cobrarán el ajuste provisorio de un 5,72 % correspondiente a enero». Es
 * el IMSN de noviembre de 2025 «acumulada en el año» (INE, publicado el 30/12/2025).
 */
export const AJUSTE_2026_PROVISORIO_PCT = 5.72

/** Día en que el BPS anunció el definitivo de 2026 (y el INE publicó el IMSN de diciembre de 2025). */
export const AJUSTE_2026_ANUNCIADO_EL = '2026-01-30'

/**
 * IPC de 2025 que el BPS usa para decir que el ajuste quedó por encima de la inflación.
 * Misma noticia del 30/1/2026: «el Índice de Precios del Consumo (IPC) anualizado en 2025 fue de
 * 3,65 %».
 */
export const AUMJUB_IPC_2025_PCT = 3.65

/**
 * Aumento general definitivo de 2025.
 *
 * La página «Montos y aumentos de pasividades» del BPS decía en 2025 «Aumento definitivo
 * correspondiente al año 2025 — Aumento general de pasividades: 6,13 %» (copia del 2025-07-10 en
 * http://web.archive.org/web/20250710010211/https://www.bps.gub.uy/6182/montos-y-aumentos-de-pasividades.html;
 * la página viva ya muestra 2026). Coincide con el IMSN de diciembre de 2024 acumulado en el año
 * (INE, publicado el 31/1/2025).
 */
export const AJUSTE_2025_PCT = 6.13

/**
 * El adelanto de julio de 2024, que sí quedó incluido en el aumento de 2025. Misma copia de 2025:
 * «El adelanto a cuenta del ajuste de enero 2025 del 3 % está incluido en el aumento general».
 */
export const AUMJUB_ADELANTO_2024_PCT = 3

/** Un año del esquema: el provisorio, el definitivo y cuándo publicó el INE cada dato. */
export interface AumJubAnio {
  readonly anio: number
  /** IMSN de enero a noviembre del año anterior, en porcentaje (INE, informe de noviembre). */
  readonly imsnEneroNoviembrePct: number
  /** IMSN de enero a diciembre del año anterior = aumento definitivo, en porcentaje. */
  readonly definitivoPct: number
  /** Día en que el INE publicó el informe de noviembre. */
  readonly inePublicoNoviembre: string
  /** Día en que el INE publicó el informe de diciembre. */
  readonly inePublicoDiciembre: string
}

/**
 * Los dos años verificados contra el INE. Los cuatro informes se leyeron el 2026-11-22 en
 * www5.ine.gub.uy (IMS noviembre/diciembre de 2024 y 2025, sección IMSN) y las fechas de publicación
 * en las fichas de gub.uy/instituto-nacional-estadistica/comunicacion/publicaciones.
 */
export const AUMJUB_HISTORIA: readonly AumJubAnio[] = Object.freeze([
  {
    anio: 2025,
    imsnEneroNoviembrePct: 5.93,
    definitivoPct: AJUSTE_2025_PCT,
    inePublicoNoviembre: '2024-12-30',
    inePublicoDiciembre: '2025-01-31',
  },
  {
    anio: 2026,
    imsnEneroNoviembrePct: AJUSTE_2026_PROVISORIO_PCT,
    definitivoPct: AJUSTE_PASIVIDADES_2026_PCT,
    inePublicoNoviembre: '2025-12-30',
    inePublicoDiciembre: AJUSTE_2026_ANUNCIADO_EL,
  },
])

/** Una fila del aumento reducido para quien se jubiló durante el año anterior. */
export interface AumJubProrrateo {
  /** Mes de cese o de configuración de causal, como lo escribe el BPS. */
  readonly mes: string
  readonly pct: number
}

/**
 * «Aumentos reducidos o prorrateados por fecha de cese o configuración de causal» del ajuste de
 * 2026, copiados de la página «Montos y aumentos de pasividades» del BPS (última actualización
 * 22/10/2026). El BPS la acompaña con el art. 27 de la Ley 16.713: el sueldo básico jubilatorio se
 * actualiza «hasta el mes inmediato anterior al inicio del servicio de la pasividad».
 */
export const AUMJUB_PRORRATEO_2026: readonly AumJubProrrateo[] = Object.freeze([
  { mes: 'enero de 2025', pct: 2.16 },
  { mes: 'febrero de 2025', pct: 1.97 },
  { mes: 'marzo de 2025', pct: 1.92 },
  { mes: 'abril de 2025', pct: 1.46 },
  { mes: 'mayo de 2025', pct: 1.39 },
  { mes: 'junio de 2025', pct: 1.38 },
  { mes: 'julio de 2025', pct: 0.98 },
  { mes: 'agosto de 2025', pct: 0.8 },
  { mes: 'setiembre de 2025', pct: 0.76 },
  { mes: 'octubre de 2025', pct: 0.61 },
  { mes: 'noviembre de 2025', pct: 0.23 },
  { mes: 'diciembre de 2025', pct: 0 },
])

// ---------------------------------------------------------------------------
// La referencia de hoy (no es una promesa)
// ---------------------------------------------------------------------------

/** El último informe del IMS publicado por el INE al día de `AUMJUB_VERIFIED_AT`. */
export interface AumJubReferencia {
  /** Mes de referencia, ISO `YYYY-MM`. */
  readonly mes: string
  /** IMSN, variación acumulada en el año (enero hasta `mes`). */
  readonly imsnAcumuladoPct: number
  /** IMSN, variación de los últimos 12 meses. */
  readonly imsnDoceMesesPct: number
  /** IMS (el de los titulares, sobre salario líquido), acumulado en el año. */
  readonly imsAcumuladoPct: number
  /** Día en que el INE lo publicó. */
  readonly publicadoEl: string
  readonly url: string
}

/**
 * INE, «Índice Medio de Salarios — Setiembre 2026» (versión IN-ECO-IMS-2026-M-09-v1.0, publicada el
 * 30/10/2026): IMSN mensual 0,15 %, acumulado en el año 5,36 %, últimos 12 meses 6,16 %; IMS
 * acumulado 5,24 %. Actualizarlo cuando salga el de octubre (30/11/2026) y el de noviembre
 * (30/12/2026): el test exige que no tenga más de 75 días mientras 2027 siga pendiente.
 */
export const AUMJUB_IMSN_REFERENCIA: AumJubReferencia = Object.freeze({
  mes: '2026-09',
  imsnAcumuladoPct: 5.36,
  imsnDoceMesesPct: 6.16,
  imsAcumuladoPct: 5.24,
  publicadoEl: '2026-10-30',
  url: 'https://www5.ine.gub.uy/documents/Estad%C3%ADsticasecon%C3%B3micas/HTML/IMS/2026/IMS%20Setiembre%202026.html',
})

/** Los próximos informes del IMS en el calendario del INE (leído el 2026-11-22). */
export interface AumJubProximo {
  /** Mes de referencia, ISO `YYYY-MM`. */
  readonly mes: string
  /** Día de difusión anunciado. */
  readonly fecha: string
}

export const AUMJUB_INE_PROXIMOS: readonly AumJubProximo[] = Object.freeze([
  { mes: '2026-10', fecha: '2026-11-30' },
  { mes: '2026-11', fecha: '2026-12-30' },
])

// ---------------------------------------------------------------------------
// La jubilación mínima: va por otro lado
// ---------------------------------------------------------------------------

/**
 * La jubilación mínima, en BPC. Decreto 188/020, art. 1: «la suma equivalente a 3,05 veces la Base
 * de Prestaciones y Contribuciones (BPC)», desde el 1.º de julio de 2020 (el art. 6 hace lo mismo
 * con la pensión de sobrevivencia mínima). 3,05 × $ 6.864 = $ 20.935, que es la cifra del BPS.
 */
export const AUMJUB_MINIMA_BPC = 3.05

/** Desde cuándo rige el mínimo en BPC (Decreto 188/020). */
export const AUMJUB_MINIMA_BPC_DESDE = '2020-07-01'

/**
 * El primer escalón del Decreto 189/025, art. 1 lit. a: 2 % adicional sobre el mínimo, retroactivo
 * al 1.º de julio de 2025, para quien no tiene otros ingresos (art. 2).
 */
export const AUMJUB_MINIMA_ADICIONAL_2025_PCT = 2

/**
 * El escalón en pesos en 2026. BPS, «Montos y aumentos de pasividades»: «Aumento diferencial y
 * adicional: $ 21.354», con la nota «Surge de aplicar el 2 % sobre el 3,05 BPC, que equivale a
 * 3,111 BPC».
 */
export const AUMJUB_MINIMA_DIFERENCIAL_2026 = 21354

/** El mismo escalón expresado en BPC, como lo escribe el BPS. */
export const AUMJUB_MINIMA_DIFERENCIAL_BPC = 3.111

/**
 * El segundo escalón, desde el 1.º de julio de 2026: Decreto 189/025 art. 1 lit. b (jubilaciones),
 * en la redacción del Decreto 183/026 (promulgado el 30/7/2026), y art. 5 lit. b (pensiones de
 * sobrevivencia), en la redacción del Decreto 213/026 (1/9/2026). El texto original preveía 1 %
 * (BPS, 25/7/2025: «un 1 % adicional en julio de 2026»); los dos decretos de 2026 lo llevaron a
 * 2,5 %. El BPS: «se cobra en agosto, con las pasividades correspondientes a julio».
 */
export const AUMJUB_MINIMA_ADICIONAL_2026_PCT = 2.5

/** Lo que preveía el Decreto 189/025 antes de las dos modificaciones de 2026. */
export const AUMJUB_MINIMA_ADICIONAL_2026_ORIGINAL_PCT = 1

/** Desde cuándo rige el segundo escalón. */
export const AUMJUB_MINIMA_ADICIONAL_2026_DESDE = '2026-07-01'

/**
 * El ingreso total al que llega quien cobra entre 3,05 y 3,1889 BPC sumando pasividad del BPS y
 * renta de AFAP. BPS, «Aumento diferencial y adicional para jubilaciones y pensiones mínimas»
 * (24/7/2026): «recibirán el aumento diferencial y adicional necesario para alcanzar un ingreso total
 * de $ 21.888,61». Es la cifra del BPS, no una cuenta nuestra.
 */
export const AUMJUB_MINIMA_TOPE_JULIO_2026 = 21888.61

/** El mismo tope en BPC, como lo escribe el BPS. */
export const AUMJUB_MINIMA_TOPE_JULIO_2026_BPC = 3.1889

// ---------------------------------------------------------------------------
// Formato
// ---------------------------------------------------------------------------

/**
 * Un porcentaje como lo escribe el BPS: coma decimal y espacio antes del signo.
 * `5.97` → `'5,97 %'`, `2.5` → `'2,5 %'`. Con `decimals` fija los decimales: `(0, 2)` → `'0,00 %'`.
 */
export function formatAumJubPct(value: number, decimals?: number): string {
  const digits =
    decimals === undefined
      ? { minimumFractionDigits: 0, maximumFractionDigits: 2 }
      : { minimumFractionDigits: decimals, maximumFractionDigits: decimals }
  return `${value.toLocaleString('es-UY', digits)} %`
}

/** Pesos con punto de miles, como en el resto de las guías: `20935` → `'$ 20.935'`. */
export function formatAumJubUyu(value: number, decimals = 0): string {
  return `$ ${value.toLocaleString('es-UY', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`
}

/** Un número de BPC con coma decimal: `3.111` → `'3,111'`. */
export function formatAumJubBpc(value: number): string {
  return value.toLocaleString('es-UY', { maximumFractionDigits: 4 })
}

const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'setiembre',
  'octubre',
  'noviembre',
  'diciembre',
]

/** `'2026-07-01'` → `'1.º de julio de 2026'` (setiembre, como se escribe en Uruguay). */
export function aumJubFecha(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number) as [number, number, number]
  return `${day === 1 ? '1.º' : day} de ${MESES[month - 1]} de ${year}`
}

/** `'2026-01-30'` → `'30/1/2026'`, como fecha el BPS sus noticias. */
export function aumJubFechaCorta(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number) as [number, number, number]
  return `${day}/${month}/${year}`
}

/** `'2026-09'` → `'setiembre de 2026'`. */
export function aumJubMes(isoMonth: string): string {
  const [year, month] = isoMonth.split('-').map(Number) as [number, number]
  return `${MESES[month - 1]} de ${year}`
}

/** `'2026-09'` → `'setiembre'`, sin el año. */
export function aumJubMesSolo(isoMonth: string): string {
  return MESES[Number(isoMonth.split('-')[1]) - 1] ?? ''
}

/** Cuántos meses le faltan al acumulado de `isoMonth` para cubrir el año entero. */
export function aumJubMesesQueFaltan(isoMonth: string): number {
  return 12 - Number(isoMonth.split('-')[1])
}

/**
 * Los doce meses que cubre la variación interanual de `isoMonth`, en prosa.
 * `'2026-09'` → `'de octubre de 2025 a setiembre de 2026'`.
 */
export function aumJubVentanaDoceMeses(isoMonth: string): string {
  const [year, month] = isoMonth.split('-').map(Number) as [number, number]
  const desdeMes = month === 12 ? 1 : month + 1
  const desdeAnio = month === 12 ? year : year - 1
  return `de ${MESES[desdeMes - 1]} de ${desdeAnio} a ${MESES[month - 1]} de ${year}`
}

/** Los puntos por encima de la inflación de 2025, como los cuenta el BPS (resta simple). */
export const AUMJUB_PUNTOS_SOBRE_IPC_2026 =
  Math.round((AJUSTE_PASIVIDADES_2026_PCT - AUMJUB_IPC_2025_PCT) * 100) / 100

// ---------------------------------------------------------------------------
// Preguntas y fuentes
// ---------------------------------------------------------------------------

export interface AumJubFaq {
  readonly question: string
  readonly answer: string
}

const pct = formatAumJubPct
const uyu = formatAumJubUyu

/** Las preguntas, compuestas según en qué punto está 2027. */
export function aumJubFaq(state: AumJub2027 = AUMJUB_2027): readonly AumJubFaq[] {
  const estado = aumJubEstado(state)
  const ref = AUMJUB_IMSN_REFERENCIA
  const anio2025 = AUMJUB_HISTORIA[0]!
  const anio2026 = AUMJUB_HISTORIA[1]!
  const proximoNoviembre = AUMJUB_INE_PROXIMOS.find(p => p.mes === '2026-11')

  const cuanto =
    estado === 'definitivo'
      ? `${pct(state.pct!)}. Es el aumento general de las jubilaciones y pensiones del BPS para 2027${state.norma ? `, fijado por ${state.norma}` : ''}, y sale de la variación del IMSN de enero a diciembre de 2026. En 2026 había sido ${pct(AJUSTE_PASIVIDADES_2026_PCT)}. La jubilación mínima se ajusta aparte, con la BPC.`
      : estado === 'provisorio'
        ? `Por ahora hay un aumento provisorio de ${pct(state.provisorioPct!)}, que es la variación del IMSN de enero a noviembre de 2026. El definitivo sale del dato de diciembre, que el INE publica a fin de enero. En 2026 el provisorio fue ${pct(AJUSTE_2026_PROVISORIO_PCT)} y el definitivo ${pct(AJUSTE_PASIVIDADES_2026_PCT)}.`
        : `Todavía no hay porcentaje. Se fija con la variación del IMSN de enero a diciembre de 2026, que el INE publica a fin de enero de 2027. Como referencia y no como promesa: a ${aumJubMes(ref.mes)} el IMSN acumulaba ${pct(ref.imsnAcumuladoPct)} en el año. En 2026 el aumento fue ${pct(AJUSTE_PASIVIDADES_2026_PCT)}.`

  const cuandoSeSabe =
    estado === 'definitivo'
      ? `Ya se sabe: ${pct(state.pct!)}${state.fecha ? `, anunciado el ${aumJubFecha(state.fecha)}` : ''}. Es el mismo calendario de los dos años anteriores, en los que el INE publicó el IMSN de diciembre el ${aumJubFecha(anio2025.inePublicoDiciembre)} y el ${aumJubFecha(anio2026.inePublicoDiciembre)}.`
      : `En dos pasos. ${proximoNoviembre ? `El INE publica el IMSN de noviembre de 2026 el ${aumJubFecha(proximoNoviembre.fecha)}, y con ese dato se arma el provisorio.` : 'Con el IMSN de noviembre se arma el provisorio.'} El de diciembre, que da el definitivo, todavía no tiene fecha en el calendario del INE: el de 2025 salió el ${aumJubFecha(anio2026.inePublicoDiciembre)} y el de 2024, el ${aumJubFecha(anio2025.inePublicoDiciembre)}. En 2026 el BPS anunció el definitivo ese mismo día.`

  return Object.freeze([
    { question: '¿Cuánto aumentan las jubilaciones en 2027?', answer: cuanto },
    { question: '¿Cuándo se sabe el aumento de las jubilaciones de 2027?', answer: cuandoSeSabe },
    {
      question: '¿Cuándo cobran los jubilados el aumento?',
      answer: `El aumento rige desde enero, pero el BPS paga vencido: la pasividad de enero se cobra en febrero. En 2026, según el BPS, en febrero se cobró con el provisorio de ${pct(AJUSTE_2026_PROVISORIO_PCT)} y en marzo llegó la diferencia hasta el definitivo de ${pct(AJUSTE_PASIVIDADES_2026_PCT)}, retroactiva a enero. La fecha exacta de cada mes depende de cómo y dónde cobrás.`,
    },
    {
      question: '¿Cuánto aumentaron las jubilaciones en 2026?',
      answer: `${pct(AJUSTE_PASIVIDADES_2026_PCT)} desde enero, en dos pasos: el provisorio de ${pct(AJUSTE_2026_PROVISORIO_PCT)} se cobró en febrero y la diferencia en marzo. Según el BPS quedó ${formatAumJubBpc(AUMJUB_PUNTOS_SOBRE_IPC_2026)} puntos por encima de la inflación de 2025, que fue de ${pct(AUMJUB_IPC_2025_PCT)}. En 2025 el aumento había sido ${pct(AJUSTE_2025_PCT)}.`,
    },
    {
      question: 'Me jubilé en 2025, ¿por qué me aumentaron menos?',
      answer: `Porque el BPS prorratea el aumento de enero según el mes de cese o de causal: ${pct(AUMJUB_PRORRATEO_2026[0]!.pct, 2)} para enero de 2025 y ${pct(AUMJUB_PRORRATEO_2026.at(-1)!.pct, 2)} para diciembre de 2025. Publica la tabla junto con la regla del artículo 27 de la Ley 16.713: el sueldo básico jubilatorio ya se actualiza por el Índice Medio de Salarios hasta el mes anterior a empezar a cobrar.`,
    },
    {
      question: '¿Cuánto es la jubilación mínima en 2026?',
      answer: `${uyu(JUBILACION_MINIMA_2026)} por mes, que son ${formatAumJubBpc(AUMJUB_MINIMA_BPC)} BPC con la BPC de ${uyu(BPC_2026)}. Quien no tiene otros ingresos tiene un escalón más: ${uyu(AUMJUB_MINIMA_DIFERENCIAL_2026)} (${formatAumJubBpc(AUMJUB_MINIMA_DIFERENCIAL_BPC)} BPC) y, desde el ${aumJubFecha(AUMJUB_MINIMA_ADICIONAL_2026_DESDE)}, un ${pct(AUMJUB_MINIMA_ADICIONAL_2026_PCT)} adicional que el BPS pagó en agosto y que lleva a ${uyu(AUMJUB_MINIMA_TOPE_JULIO_2026, 2)} a quien está entre ${formatAumJubBpc(AUMJUB_MINIMA_BPC)} y ${formatAumJubBpc(AUMJUB_MINIMA_TOPE_JULIO_2026_BPC)} BPC.`,
    },
    {
      question: '¿El aumento de julio de las mínimas se descuenta del de enero?',
      answer: `No. Desde 2025 el BPS presenta los aumentos de las mínimas como un refuerzo que se suma al ajuste general y no se descuenta. Antes no era así: el adelanto de ${pct(AUMJUB_ADELANTO_2024_PCT)} que cobraron las pasividades más bajas desde julio de 2024 quedó incluido en el aumento de ${pct(AJUSTE_2025_PCT)} de 2025.`,
    },
    {
      question: '¿Qué índice se usa para el aumento: el IMS o el IMSN?',
      answer: `El IMSN, Índice Medio de Salarios Nominales. Lo creó la Ley 17.649 para ajustar las pasividades y se calcula sobre el salario nominal, sin descontar aportes personales. El IMS de los titulares se calcula sobre el salario líquido y da otro número: a ${aumJubMes(ref.mes)} acumulaba ${pct(ref.imsAcumuladoPct)} en el año, contra ${pct(ref.imsnAcumuladoPct)} del IMSN.`,
    },
    {
      question: '¿Dónde veo cuánto me aumentó la jubilación?',
      answer:
        'En el recibo de cobro. Con Usuario personal BPS lo bajás en el servicio «Consultar recibos de cobros» o en la app BPS Personas, en «Recibo de cobro», y el BPS también lo manda al correo asociado a tu usuario. Comparalo con el recibo del mes anterior.',
    },
  ])
}

export const AUMJUB_FAQ: readonly AumJubFaq[] = aumJubFaq()

export interface AumJubSource {
  readonly label: string
  readonly url: string
  readonly publisher: 'BPS' | 'IMPO' | 'INE'
}

export const AUMJUB_SOURCES: readonly AumJubSource[] = Object.freeze([
  {
    label: `Ajuste definitivo de jubilaciones y pensiones para 2026 — ${pct(AJUSTE_PASIVIDADES_2026_PCT)}, provisorio de ${pct(AJUSTE_2026_PROVISORIO_PCT)} cobrado en febrero y diferencia en marzo, retroactiva a enero (${aumJubFechaCorta(AJUSTE_2026_ANUNCIADO_EL)})`,
    url: 'https://www.bps.gub.uy/23862/ajuste-definitivo-de-jubilaciones-y-pensiones-para-2026.html',
    publisher: 'BPS',
  },
  {
    label:
      'Montos y aumentos de pasividades — aumento general, aumentos prorrateados por fecha de cese, mínimos y máximos de 2026 (actualizado el 22/10/2026)',
    url: BPS_FIGURES_2026_SOURCE_URL,
    publisher: 'BPS',
  },
  {
    label: `Aumento diferencial y adicional para jubilaciones y pensiones mínimas — ${pct(AUMJUB_MINIMA_ADICIONAL_2026_PCT)} desde el ${aumJubFechaCorta(AUMJUB_MINIMA_ADICIONAL_2026_DESDE)}, cobrado en agosto (24/7/2026)`,
    url: 'https://www.bps.gub.uy/24396/aumento-diferencial-y-adicional-para-jubilaciones-y-pensiones-minimas.html',
    publisher: 'BPS',
  },
  {
    label:
      'Aumento de jubilaciones y pensiones mínimas — los aumentos de las mínimas no se descuentan del ajuste de enero (25/7/2025)',
    url: 'https://www.bps.gub.uy/23206/aumento-de-jubilaciones-y-pensiones-minimas.html',
    publisher: 'BPS',
  },
  {
    label:
      'Comunicado del Directorio — los reajustes de pasividades «corresponden al Poder Ejecutivo» y los aplican los servicios técnicos del BPS (9/2/2022)',
    url: 'https://www.bps.gub.uy/18932/comunicado-del-directorio.html',
    publisher: 'BPS',
  },
  {
    label: '¿Cómo puedo obtener mi recibo de cobro? — web, app BPS Personas, correo y en persona',
    url: 'https://www.bps.gub.uy/12728/puedo-consultar-mi-recibo-por-la-web.html',
    publisher: 'BPS',
  },
  {
    label:
      'Constitución, artículo 67 — los ajustes no pueden ser inferiores a la variación del Índice Medio de Salarios',
    url: 'https://www.impo.com.uy/bases/constitucion/1967-1967/67',
    publisher: 'IMPO',
  },
  {
    label: 'Ley 17.649 — el índice para el art. 67 se elabora con las retribuciones nominales',
    url: 'https://www.impo.com.uy/bases/leyes/17649-2003',
    publisher: 'IMPO',
  },
  {
    label: `Decreto 188/020 — jubilación y pensión de sobrevivencia mínimas en ${formatAumJubBpc(AUMJUB_MINIMA_BPC)} BPC desde el ${aumJubFechaCorta(AUMJUB_MINIMA_BPC_DESDE)}`,
    url: 'https://www.impo.com.uy/bases/decretos/188-2020',
    publisher: 'IMPO',
  },
  {
    label:
      'Decreto 189/025 — aumentos diferenciales de las jubilaciones y pensiones mínimas del BPS',
    url: 'https://www.impo.com.uy/bases/decretos/189-2025',
    publisher: 'IMPO',
  },
  {
    label: `Decreto 183/026 — lleva a ${pct(AUMJUB_MINIMA_ADICIONAL_2026_PCT)} el aumento de julio de 2026 de las jubilaciones mínimas`,
    url: 'https://www.impo.com.uy/bases/decretos/183-2026',
    publisher: 'IMPO',
  },
  {
    label: `Decreto 213/026 — lleva a ${pct(AUMJUB_MINIMA_ADICIONAL_2026_PCT)} el aumento de julio de 2026 de las pensiones de sobrevivencia mínimas`,
    url: 'https://www.impo.com.uy/bases/decretos/213-2026',
    publisher: 'IMPO',
  },
  {
    label: `Decreto 11/026 — BPC de ${uyu(BPC_2026)} desde el 1/1/2026`,
    url: 'https://www.impo.com.uy/bases/decretos/11-2026',
    publisher: 'IMPO',
  },
  {
    label: `Índice Medio de Salarios, diciembre de 2024 — IMSN ${pct(AJUSTE_2025_PCT)} en el año`,
    url: 'https://www5.ine.gub.uy/documents/Estad%C3%ADsticasecon%C3%B3micas/HTML/IMS/2024/IMS%20Diciembre%202024.html',
    publisher: 'INE',
  },
  {
    label: `Índice Medio de Salarios, noviembre de 2025 — IMSN ${pct(AJUSTE_2026_PROVISORIO_PCT)} de enero a noviembre`,
    url: 'https://www5.ine.gub.uy/documents/Estad%C3%ADsticasecon%C3%B3micas/HTML/IMS/2025/IMS%20Noviembre%202025.html',
    publisher: 'INE',
  },
  {
    label: `Índice Medio de Salarios, diciembre de 2025 — IMSN ${pct(AJUSTE_PASIVIDADES_2026_PCT)} en el año`,
    url: 'https://www5.ine.gub.uy/documents/Estad%C3%ADsticasecon%C3%B3micas/HTML/IMS/2025/IMS%20Diciembre%202025.html',
    publisher: 'INE',
  },
  {
    label: `Índice Medio de Salarios, ${aumJubMes(AUMJUB_IMSN_REFERENCIA.mes)} — IMSN ${pct(AUMJUB_IMSN_REFERENCIA.imsnAcumuladoPct)} en el año y ${pct(AUMJUB_IMSN_REFERENCIA.imsnDoceMesesPct)} en 12 meses (${aumJubFechaCorta(AUMJUB_IMSN_REFERENCIA.publicadoEl)})`,
    url: AUMJUB_IMSN_REFERENCIA.url,
    publisher: 'INE',
  },
  {
    label: 'Calendario de actividades — fechas de difusión de los próximos informes del IMS',
    url: 'https://www.gub.uy/instituto-nacional-estadistica/comunicacion/calendario-actividades',
    publisher: 'INE',
  },
])

/** Las fuentes de la guía: las fijas más el anuncio de 2027 cuando exista. */
export function aumJubSources(state: AumJub2027 = AUMJUB_2027): readonly AumJubSource[] {
  if (state.url === null) return AUMJUB_SOURCES
  const anuncio: AumJubSource = {
    label: `Aumento de jubilaciones y pensiones de 2027${state.pct !== null ? ` — ${pct(state.pct)}` : ''}${state.fecha ? ` (${aumJubFechaCorta(state.fecha)})` : ''}`,
    url: state.url,
    publisher: state.url.includes('impo.com.uy') ? 'IMPO' : 'BPS',
  }
  return Object.freeze([anuncio, ...AUMJUB_SOURCES])
}
