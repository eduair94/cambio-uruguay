/**
 * La guía de la Tasa de Política Monetaria del BCU.
 *
 * POR QUÉ ES UNA GUÍA Y NO UNA PÁGINA PROPIA. La TPM ya estaba en el sitio, pero SIEMPRE como
 * parámetro de otra cuenta: es la tasa por defecto de la calculadora de
 * `/cuenta-remunerada-uruguay`, el ancla con la que `/conviene-pagar-todo-con-credito-uruguay` mide
 * si vale financiarse, la referencia del fondo en `/cuanto-vale-una-milla-itau-uruguay` y el piso
 * con el que `utils/financingData.ts` descarta una LRM al 8,54 %. Cuatro archivos la usaban y
 * ninguno contestaba en cuánto está ni quién la mueve — el mismo caso que `utils/solidarityFund.ts`
 * dejó escrito para el Fondo de Solidaridad y que terminó mereciendo su propia URL.
 *
 * Nace como guía porque una página raíz nueva tiene que estar valuada en
 * `classes/revenueplan/value.ts` (`tests/unit/contenidoTramoParity.test.ts`), que vive en la raíz y
 * se despliega por separado, y su lista de deuda está exactamente en su tope: publicarla como
 * `pages/*.vue` obligaba a tocar la raíz o a subir un trinquete que sólo puede bajar. `/guias/*` ya
 * está en el tramo `contenido` —el que más rinde del sitio— y la ficha de guía trae tablas, FAQ con
 * `FAQPage` y bloque de fuentes, así que no se pierde nada del contenido.
 *
 * REGLA DE LAS CIFRAS. Todo sale de `utils/monetaryPolicyRate.ts`, que a su vez sale del comunicado
 * del COPOM con su URL. El cuerpo se arma con plantillas sobre esas constantes a propósito: el
 * 8/10/2026 el COPOM subió la TPM y tres páginas del sitio siguieron publicando 5,75 % durante casi
 * un mes porque cada una llevaba el número escrito a mano. Acá no hay número escrito a mano, y
 * `tests/unit/monetaryPolicyRate.test.ts` exige que el nivel vigente sea el mismo `TPM_PCT` del que
 * cuelgan esas calculadoras.
 */
import type { Guide } from './guides'
import {
  COPOM_DECISIONS_2026,
  DECISION_CONTEXT,
  LAST_DECISION,
  POLICY_RATE_REVIEWED,
  POLICY_RATE_SOURCES,
  RATE_CONFUSIONS,
  describeChange,
  movesIn2026,
} from './monetaryPolicyRate'

/** `6` → «6 %», `5.75` → «5,75 %». Coma decimal, que es como se escribe acá. */
const pct = (value: number) => `${value.toLocaleString('es-UY', { maximumFractionDigits: 2 })} %`

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
/** `2026-10-08` → «8 de octubre de 2026», sin pasar por Date (que corre el día por zona). */
function fecha(iso: string): string {
  const [year, month, day] = iso.split('-')
  return `${Number(day)} de ${MESES[Number(month) - 1]} de ${year}`
}
/** `2026-10-08` → «8/10/2026», para cuando la fecha va dentro de una frase apretada. */
function fechaCorta(iso: string): string {
  const [year, month, day] = iso.split('-')
  return `${Number(day)}/${Number(month)}/${year}`
}

const nivel = LAST_DECISION.levelPct
const nivelAnterior = COPOM_DECISIONS_2026[COPOM_DECISIONS_2026.length - 2]!.levelPct
const movimientos = movesIn2026()
const reuniones = COPOM_DECISIONS_2026.length

export const politicaMonetariaGuides: readonly Guide[] = Object.freeze([
  {
    slug: 'tasa-de-politica-monetaria-uruguay',
    title: `Tasa de política monetaria del BCU: ${pct(nivel)}`,
    description: `El ${fechaCorta(LAST_DECISION.date)} el COPOM la subió de ${pct(nivelAnterior)} a ${pct(nivel)} anual, por unanimidad, con el IPC en ${pct(DECISION_CONTEXT.ipcInteranualPct)} y la meta en ${pct(DECISION_CONTEXT.metaPct)}. Las ${reuniones} reuniones del año, una por una.`,
    tag: 'TASAS',
    updatedAt: POLICY_RATE_REVIEWED,
    sections: [
      {
        heading: 'En cuánto está hoy',
        body: `La Tasa de Política Monetaria (TPM) del Banco Central del Uruguay está en ${pct(nivel)} anual. El Comité de Política Monetaria (COPOM) la subió ${LAST_DECISION.changeBp} puntos básicos el ${fecha(LAST_DECISION.date)} —venía de ${pct(nivelAnterior)}— y la resolución fue por unanimidad. Es la tasa de referencia con la que el BCU conduce la política monetaria: no es lo que te cobra un banco por un préstamo ni lo que paga un plazo fijo, es el número alrededor del cual se acomodan los dos.`,
      },
      {
        heading: 'Por qué la subió si la inflación está dentro del rango',
        body: `El comunicado lo explica sin rodeos. El IPC llegó a ${pct(DECISION_CONTEXT.ipcInteranualPct)} interanual en ${DECISION_CONTEXT.ipcMes}, por encima de la meta de ${pct(DECISION_CONTEXT.metaPct)} en el Horizonte de Política Monetaria a ${DECISION_CONTEXT.horizonteAnios} años, aunque todavía dentro del rango de tolerancia, empujado por bienes importados, frutas, verduras y combustibles. El BCU aclara que la medida «no busca revertir el efecto directo de los aumentos temporales de energía y alimentos sobre los precios, sino actuar proactivamente para limitar su persistencia y evitar que se trasladen al resto de los precios y las expectativas». Y aclara algo que suena contradictorio y no lo es: incluso con la suba, la instancia de la política monetaria sigue siendo expansiva.`,
      },
      {
        heading: 'Qué inflación espera el mercado',
        body: `Las expectativas son el dato que el COPOM mira para saber si la inflación de hoy se va a volver la de mañana, y las publica en el mismo comunicado. Las tres encuestas quedaron en torno al objetivo, y el promedio de todas las encuestas del BCU dio ${pct(DECISION_CONTEXT.promedioEncuestasPct)}. Eso es lo que el Banco Central llama «anclaje»: que nadie esté planificando con una inflación muy distinta de la meta.`,
        table: {
          headers: ['Quién responde', 'Inflación esperada'],
          rows: DECISION_CONTEXT.expectativas.map(row => [row.quien, pct(row.pct)]),
        },
      },
      {
        heading: `Las ${reuniones} reuniones de 2026, una por una`,
        body: `El COPOM publica un comunicado también cuando no la toca, y eso es la mitad de la respuesta a «¿el mes que viene baja?»: de las ${reuniones} reuniones del año, ${movimientos} movieron la tasa y ${reuniones - movimientos} la dejaron donde estaba. La tasa arrancó 2026 bajando —cien puntos básicos en enero y setenta y cinco en marzo— y se quedó quieta cuatro reuniones seguidas antes de la suba de octubre.`,
        table: {
          headers: ['Reunión', 'Decisión', 'Quedó en'],
          rows: [...COPOM_DECISIONS_2026]
            .reverse()
            .map(row => [fecha(row.date), describeChange(row.changeBp), pct(row.levelPct)]),
        },
      },
      {
        heading: 'Cuatro tasas que no son ésta',
        body: `Quien busca «la tasa del Banco Central» muchas veces está buscando otra cosa, y la confusión sale caro en las dos direcciones. ${RATE_CONFUSIONS.map(row => `${row.conQue}: ${row.porQue}`).join(' ')}`,
        links: RATE_CONFUSIONS.map(row => ({ label: row.dondeLabel, to: row.donde })),
      },
      {
        heading: 'Lo que esta guía no dice',
        body: `Ninguna proyección de la próxima reunión. La TPM la decide un Directorio en una fecha, y cualquier número «esperado» que publicáramos sería nuestro y no del BCU; lo que sí se puede decir es qué dijo que va a mirar, que es que los shocks geopolíticos y climáticos no se trasladen al resto de los precios y a las expectativas. Tampoco un «desde cuándo» inventado para las reuniones que la mantienen: sólo se fecha la que la movió. Un comunicado que dice «continúe en ${pct(nivelAnterior)}» no prueba en qué día empezó ese nivel, y escribirlo igual sería darle una fecha de origen a un dato que no la trae.`,
      },
    ],
    faqs: [
      {
        q: '¿En cuánto está la tasa de política monetaria del BCU?',
        a: `En ${pct(nivel)} anual desde el ${fecha(LAST_DECISION.date)}, cuando el COPOM la subió ${LAST_DECISION.changeBp} puntos básicos desde ${pct(nivelAnterior)}, por unanimidad.`,
      },
      {
        q: '¿Qué es la Tasa de Política Monetaria?',
        a: 'Es la tasa de referencia que el Banco Central fija para conducir la política monetaria y orientar la inflación hacia su meta. No es un precio al público: es la señal con la que se acomodan las tasas en pesos del resto del sistema financiero.',
      },
      {
        q: '¿Cada cuánto se decide?',
        a: `La decide el Comité de Política Monetaria (COPOM) en reuniones con fecha, y publica un comunicado en cada una, también cuando no la mueve. En 2026 hubo ${reuniones} reuniones y ${movimientos} cambiaron la tasa.`,
      },
      {
        q: '¿Es la tasa que me va a cobrar el banco por un préstamo?',
        a: 'No. Lo que un préstamo puede cobrarte tiene su propio límite legal, el tope de usura que el BCU publica por separado y se mide en tasa efectiva anual. La TPM explica hacia dónde se mueven las tasas, no cuánto te cobran a vos.',
      },
      {
        q: '¿Va a bajar en la próxima reunión?',
        a: 'No lo publicamos, porque no lo sabemos: lo decide el Directorio del BCU en su próxima reunión, y el calendario lo publica el propio Banco Central. El comunicado de octubre sí dice qué está mirando.',
      },
      {
        q: '¿Por qué dice que la política sigue siendo expansiva si subió la tasa?',
        a: `Porque las dos cosas conviven: el comunicado define la suba como una acción preventiva para que los aumentos transitorios de energía y alimentos no se vuelvan persistentes, y aclara que con la TPM en ${pct(nivel)} la instancia de política monetaria se mantiene expansiva.`,
      },
    ],
    related: [
      { label: '¿Por qué el BCU quiere más pesos?', to: '/por-que-el-bcu-quiere-mas-pesos' },
      { label: 'Cuentas remuneradas en pesos', to: '/cuenta-remunerada-uruguay' },
      { label: 'Letras de Regulación Monetaria', to: '/letras-de-regulacion-monetaria-uruguay' },
      { label: 'Indicadores: UI, UR y BPC', to: '/indicadores' },
    ],
    sources: POLICY_RATE_SOURCES.map(source => ({
      label: source.label,
      url: source.url,
      publisher: source.publisher,
    })),
  },
])
