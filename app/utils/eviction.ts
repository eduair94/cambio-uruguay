// app/utils/eviction.ts
// Los plazos del desalojo de una vivienda alquilada en Uruguay, artículo por artículo.
//
// POR QUÉ EXISTE. El sitio ya tiene la familia de alquiler entera —el directorio, la garantía, el
// clearing, los gastos comunes, el primer alquiler— y la pregunta que llega cuando alguien recibe
// una intimación («¿en cuánto tiempo me pueden sacar?») estaba contestada en DOS renglones de un
// acordeón de `utils/rentFaq.ts`, dentro de `/alquilar-en-uruguay`. Quien busca «desalojo por falta
// de pago» no abre una guía de cómo alquilar.
//
// LO QUE ESTA PÁGINA CONTESTA Y NO ESTABA EN NINGUNA PARTE: que en Uruguay hay DOS regímenes con
// plazos distintos, y que cuál te rige no lo decide la gravedad de la deuda sino lo que dice tu
// contrato. El régimen sin garantía de la LUC (Ley 19.889, art. 421) exige CINCO condiciones a la
// vez, y una de ellas es que las dos partes hayan declarado expresamente en el contrato que se
// someten a esa ley; si falta cualquiera, rige el Decreto-Ley 14.219 o el Código Civil. O sea que
// el plazo se decide al firmar, no al dejar de pagar.
//
// LA TRAMPA DEL 14.219, que es la razón por la que las dos mitades de esa ley se citan mal todo el
// tiempo: su artículo 102 EXCLUYE de la ley a los contratos sobre fincas construidas después del 2
// de junio de 1968 —o sea casi todo lo que hoy se alquila— «con excepción de las contenidas en el
// Capítulo VII y Sección I del Capítulo VIII». El Capítulo VIII, Sección 1 (arts. 43 a 62) es
// justamente el PROCEDIMIENTO. Así que de esa ley sobrevive el procedimiento con sus plazos, y no
// sobreviven las prórrogas y los plazos de un año del Capítulo VI, que son los que más se citan.
//
// LO QUE DELIBERADAMENTE NO SE PUBLICA: cuánto DURA un desalojo. La ley fija los plazos de cada
// paso, no el tiempo que el juzgado se toma entre uno y otro, y sumar los plazos daría un número
// que ningún expediente cumple. Los plazos van de a uno, con su artículo, y la página dice que la
// suma no es una predicción. Es la misma decisión que `utils/salaryGarnishment.ts` toma con los
// montos en pesos.
//
// FUENTES PRIMARIAS, cotejadas contra el texto vigente en impo.com.uy el 2026-10-08 (lista
// completa en EVICTION_SOURCES). Ojo con una redacción vieja que circula mucho: el artículo 51 del
// 14.219 pedía originalmente el 60 % y desde la Ley 15.799 de 30/12/1985, art. 17, pide el 40 %.
//
// MÓDULO PURO (sin Vue/Nuxt) para que vitest-node lo cargue con imports relativos.

/** Fecha en la que se cotejó todo este archivo contra el texto oficial en impo.com.uy. */
export const EVICTION_VERIFIED_AT = '2026-10-08'

export interface EvictionSource {
  readonly label: string
  readonly url: string
}

export type EvictionRegimeId = 'comun' | 'sinGarantia'

/** Un paso del proceso, con el plazo que la ley le pone y el artículo que lo pone. */
export interface EvictionStep {
  readonly id: string
  /** Qué pasa en este paso. */
  readonly label: string
  /** El plazo tal como se lee, ya en palabras: la ley mezcla días corridos y hábiles a propósito. */
  readonly deadline: string
  /** Días del plazo, para los tests y para ordenar; `null` cuando la ley no fija ninguno. */
  readonly days: number | null
  /** `true` si el plazo se cuenta en días hábiles. */
  readonly businessDays: boolean
  /** El detalle que cambia la respuesta, no un resumen del label. */
  readonly detail: string
  /** El artículo exacto, citable. */
  readonly article: string
  readonly url: string
}

export interface EvictionRegime {
  readonly id: EvictionRegimeId
  readonly name: string
  readonly law: string
  /** A quién le rige, en una línea. */
  readonly appliesTo: string
  readonly steps: readonly EvictionStep[]
}

// ---------------------------------------------------------------------------
// Régimen sin garantía: Ley 19.889 (LUC), artículos 421 y 437 a 444
// ---------------------------------------------------------------------------

/**
 * Las cinco condiciones del artículo 421, que tienen que cumplirse TODAS a la vez. El artículo lo
 * dice al final sin dejar lugar: si falta alguna, el arrendamiento se rige por el Decreto-Ley
 * 14.219 «o por el Código Civil, según el caso».
 */
export const NO_GUARANTEE_REQUIREMENTS: readonly string[] = Object.freeze([
  'Que el destino del inmueble sea casa habitación.',
  'Que el arrendador no reciba garantía de ninguna naturaleza.',
  'Que el contrato se extienda por escrito.',
  'Que el contrato consigne expresamente el plazo y el precio del arriendo.',
  'Que las dos partes hagan constar expresamente en el contrato su voluntad de someterse a esta ley.',
])

const LUC = 'https://www.impo.com.uy/bases/leyes/19889-2020'
const DL14219 = 'https://www.impo.com.uy/bases/decretos-ley/14219-1974'

const NO_GUARANTEE_STEPS: readonly EvictionStep[] = Object.freeze([
  {
    id: 'mora',
    label: 'Intimación y mora',
    deadline: '3 días hábiles',
    days: 3,
    businessDays: true,
    detail:
      'Vencido el plazo pactado sin pagar, el arrendador intima el pago —puede ser por telegrama colacionado— y la mora se configura si no pagás dentro de los tres días hábiles contados desde el día hábil siguiente al de la intimación, salvo que el contrato haya pactado mora automática. Los tributos y costos de la primera intimación son del arrendador; los de las siguientes, tuyos, y no pueden pasar del 20 % de lo reclamado.',
    article: 'Ley 19.889, art. 437',
    url: `${LUC}/437`,
  },
  {
    id: 'monitorio',
    label: 'Demanda de desalojo',
    deadline: 'sin plazo legal',
    days: null,
    businessDays: false,
    detail:
      'En mora, el arrendador queda habilitado a iniciar el desalojo por mal pagador, que tramita por un proceso de estructura monitoria. La ley no le pone plazo a este paso: puede iniciarlo al día siguiente o meses después.',
    article: 'Ley 19.889, art. 438',
    url: `${LUC}/438`,
  },
  {
    id: 'desalojo',
    label: 'Plazo para desocupar',
    deadline: '6 días hábiles',
    days: 6,
    businessDays: true,
    detail:
      'Antes de decretar nada, la sede verifica que el contrato reúna los cinco requisitos del artículo 421. Comprobados, el juez decreta el desalojo con plazo de seis días hábiles contados desde el día siguiente al de la notificación de la sentencia al arrendatario.',
    article: 'Ley 19.889, art. 439',
    url: `${LUC}/439`,
  },
  {
    id: 'excepciones',
    label: 'Plazo para oponer excepciones',
    deadline: '6 días hábiles',
    days: 6,
    businessDays: true,
    detail:
      'En el mismo decreto que dispone el desalojo se te cita de excepciones por seis días hábiles, y sólo podés oponer tres cosas: las excepciones del artículo 133 del Código General del Proceso, que el contrato no cumple los requisitos del artículo 421, y el pago. El pago parcial no se admite, y la excepción de pago sin prueba documental se rechaza sin sustanciar.',
    article: 'Ley 19.889, art. 440',
    url: `${LUC}/440`,
  },
  {
    id: 'traslado',
    label: 'Traslado al arrendador',
    deadline: '6 días hábiles',
    days: 6,
    businessDays: true,
    detail:
      'De las excepciones se da traslado al arrendador por seis días hábiles y después se sigue el procedimiento de los artículos 353 y siguientes del Código General del Proceso. Sólo es apelable la sentencia definitiva que acoge o rechaza las excepciones; contra las demás providencias cabe nada más que reposición.',
    article: 'Ley 19.889, art. 441',
    url: `${LUC}/441`,
  },
  {
    id: 'lanzamiento',
    label: 'Lanzamiento',
    deadline: '5 días hábiles',
    days: 5,
    businessDays: true,
    detail:
      'Firme el desalojo y vencido su plazo, el arrendador puede pedir el lanzamiento en cualquier momento, y lo hace efectivo el Alguacil dentro de los cinco días hábiles contados desde que se te notifica la providencia que lo dispone.',
    article: 'Ley 19.889, art. 442',
    url: `${LUC}/442`,
  },
  {
    id: 'prorroga',
    label: 'Prórroga del lanzamiento',
    deadline: '5 días hábiles, una sola vez',
    days: 5,
    businessDays: true,
    detail:
      'Se pide una sola vez, con dos días hábiles de anticipación al día fijado, y el juez la concede sólo si justificás fehacientemente una causa de fuerza mayor. No puede pasar de cinco días hábiles. La providencia que dispone el lanzamiento, y la que concede o rechaza la prórroga, no admiten recurso alguno.',
    article: 'Ley 19.889, arts. 443 y 444',
    url: `${LUC}/443`,
  },
])

// ---------------------------------------------------------------------------
// Régimen común: Decreto-Ley 14.219, Capítulo VIII, Sección 1 (arts. 43 a 62)
// ---------------------------------------------------------------------------

const COMMON_STEPS: readonly EvictionStep[] = Object.freeze([
  {
    id: 'mora',
    label: 'Intimación y mora',
    deadline: '10 días hábiles',
    days: 10,
    businessDays: true,
    detail:
      'Queda incurso en mora el arrendatario que no paga dentro de los diez días hábiles inmediatos siguientes a la intimación. Y la intimación tiene su propia espera: no puede hacerse sino diez días después de aquel en que el pago debió efectuarse.',
    article: 'Decreto-Ley 14.219, art. 55',
    url: `${DL14219}/55`,
  },
  {
    id: 'costos',
    label: 'Costo de la intimación',
    deadline: '20 % de lo intimado',
    days: null,
    businessDays: false,
    detail:
      'Los tributos y costos de la primera intimación de pago son de cargo del arrendador; los de las siguientes, de quien fue intimado, haya caído o no en mora. Cuando te corresponden a vos, los pagás depositando un 20 % de la suma intimada.',
    article: 'Decreto-Ley 14.219, art. 56',
    url: `${DL14219}/56`,
  },
  {
    id: 'desalojo',
    label: 'Plazo para desocupar',
    deadline: '20 días',
    days: 20,
    businessDays: false,
    detail:
      'En el desalojo por mora en el pago de los arrendamientos el juez concede un plazo de veinte días y te cita de excepciones en la forma del artículo anterior. Si no se oponen excepciones el juicio queda terminado sin otro trámite, y los plazos se cuentan desde el día siguiente a la intimación respectiva.',
    article: 'Decreto-Ley 14.219, art. 48',
    url: `${DL14219}/48`,
  },
  {
    id: 'excepciones',
    label: 'Plazo para oponer excepciones',
    deadline: '10 días hábiles',
    days: 10,
    businessDays: true,
    detail:
      'Con la intimación de desalojo, en la que se indica el plazo, se cita al demandado de excepciones para que las oponga dentro del plazo de diez días hábiles y perentorios. En todos los casos se coloca además una cédula en lugar visible intimando a declarar si hay subarrendatarios.',
    article: 'Decreto-Ley 14.219, art. 47',
    url: `${DL14219}/47`,
  },
  {
    id: 'clausura',
    label: 'Cerrar el juicio pagando',
    deadline: 'lo adeudado + 40 %, una sola vez',
    days: null,
    businessDays: false,
    detail:
      'El juicio de desalojo contra malos pagadores queda clausurado si dentro del plazo para oponer excepciones consignás la suma adeudada más el 40 % de esa suma por intereses, tributos y costos devengados. El arrendatario o subarrendatario se beneficia una sola vez con la clausura. Cuidado con la cifra: el 60 % que circula es la redacción original de 1974, sustituida por la Ley 15.799 de 30/12/1985, art. 17.',
    article: 'Decreto-Ley 14.219, art. 51',
    url: `${DL14219}/51`,
  },
  {
    id: 'reforma',
    label: 'Estirar el plazo pagando',
    deadline: 'lo adeudado + 20 %, una sola vez',
    days: null,
    businessDays: false,
    detail:
      'Procede la reforma de los plazos de la intimación si, dentro del término acordado, consignás los arrendamientos devengados más un 20 % como única indemnización por intereses y gastos; el juzgado amplía entonces el plazo hasta completar el que corresponda al buen pagador. Se decreta una sola vez en cada caso. Y para recurrir la sentencia de primera instancia hay que acreditar que consignaste los alquileres en el Banco de la República, mes a mes.',
    article: 'Decreto-Ley 14.219, art. 52',
    url: `${DL14219}/52`,
  },
  {
    id: 'lanzamiento',
    label: 'Lanzamiento',
    deadline: '15 días hábiles antes, 60 de prórroga',
    days: 15,
    businessDays: true,
    detail:
      'Pasados los plazos del desalojo se lanza al ocupante a su costo, a petición de parte. Dos límites en el mismo artículo: el lanzamiento no puede hacerse efectivo hasta transcurridos quince días hábiles desde el siguiente a la notificación del demandado, y el juez puede aplazarlo hasta por sesenta días en casos de enfermedad o fuerza mayor justificada. El decreto de lanzamiento no admite recurso alguno.',
    article: 'Decreto-Ley 14.219, art. 62',
    url: `${DL14219}/62`,
  },
])

export const EVICTION_REGIMES: readonly EvictionRegime[] = Object.freeze([
  {
    id: 'sinGarantia',
    name: 'Arrendamiento sin garantía',
    law: 'Ley 19.889 (LUC), arts. 421 y 437 a 444',
    appliesTo:
      'Sólo si el contrato cumple a la vez las cinco condiciones del artículo 421, entre ellas que las dos partes declaren por escrito que se someten a esta ley.',
    steps: NO_GUARANTEE_STEPS,
  },
  {
    id: 'comun',
    name: 'Régimen común',
    law: 'Decreto-Ley 14.219, Capítulo VIII, Sección 1 (arts. 43 a 62)',
    appliesTo:
      'Todo lo demás. El procedimiento rige incluso para las fincas que el artículo 102 excluye del resto de la ley, y se aplica igual a los inquilinos malos pagadores.',
    steps: COMMON_STEPS,
  },
])

/** El régimen por id, para que la página no indexe el arreglo a mano. */
export function evictionRegime(id: EvictionRegimeId): EvictionRegime {
  const regime = EVICTION_REGIMES.find(r => r.id === id)
  if (!regime) throw new Error(`régimen de desalojo desconocido: ${id}`)
  return regime
}

/** El paso de un régimen por id. `undefined` cuando ese régimen no tiene ese paso. */
export function evictionStep(regime: EvictionRegimeId, step: string): EvictionStep | undefined {
  return evictionRegime(regime).steps.find(s => s.id === step)
}

/**
 * La fecha a partir de la cual el artículo 102 deja al contrato fuera del resto del 14.219: las
 * fincas construidas DESPUÉS de este día quedan sólo con el Capítulo VII (garantías) y la Sección I
 * del Capítulo VIII (el procedimiento de esta página).
 */
export const DL14219_SCOPE_CUTOFF = '1968-06-02'

/**
 * Los plazos de desalojo de las causales excepcionales del artículo 24, que son los que se citan
 * como «el año del buen pagador». Van aparte de los pasos porque NO son el desalojo por falta de
 * pago y porque viven en el Capítulo VI, que es justamente el que el artículo 102 deja afuera para
 * las fincas construidas después del 2 de junio de 1968.
 */
export const EXCEPTIONAL_CAUSE_TERMS: readonly {
  readonly label: string
  readonly deadline: string
  readonly article: string
}[] = Object.freeze([
  {
    label:
      'Causales excepcionales del artículo 24 (salvo el numeral 2.º) y numerales 1.º y 5.º del artículo 26',
    deadline: 'un año',
    article: 'Decreto-Ley 14.219, art. 32',
  },
  {
    label: 'Fincas ruinosas (artículo 26, numeral 5.º)',
    deadline: 'lo fija el juez, sin pasar de 180 días',
    article: 'Decreto-Ley 14.219, art. 32',
  },
])

export interface EvictionFaqEntry {
  readonly question: string
  readonly short: string
  readonly answer: string
}

export const EVICTION_FAQ: readonly EvictionFaqEntry[] = Object.freeze([
  {
    question: '¿El propietario puede cambiar la cerradura y sacarme las cosas?',
    short: 'No: el lanzamiento lo ejecuta el Alguacil, por orden de un juez.',
    answer:
      'No. En los dos regímenes el desalojo es un proceso judicial y el lanzamiento lo hace efectivo el Alguacil con una providencia que lo dispone (Ley 19.889, art. 442; Decreto-Ley 14.219, art. 62). Nada de lo que firmaste habilita al propietario a desocupar por su cuenta.',
  },
  {
    question: '¿Cómo sé cuál de los dos regímenes me rige?',
    short: 'Lo decide tu contrato, no la deuda.',
    answer:
      'Lo decide el contrato. El régimen sin garantía de la Ley 19.889 exige las cinco condiciones del artículo 421 a la vez, y una es que las dos partes hayan hecho constar expresamente en el contrato su voluntad de someterse a esa ley. Si falta cualquiera de las cinco, el arrendamiento se rige por el Decreto-Ley 14.219 o por el Código Civil, según el caso.',
  },
  {
    question: '¿Puedo frenar el desalojo pagando lo que debo?',
    short: 'En el régimen común sí, con un recargo del 40 % y una sola vez.',
    answer:
      'En el régimen común, el juicio queda clausurado si dentro del plazo para oponer excepciones consignás la suma adeudada más el 40 % de esa suma por intereses, tributos y costos (Decreto-Ley 14.219, art. 51, en la redacción de la Ley 15.799, art. 17). El beneficio se usa una sola vez. Mucho material todavía publica el 60 %, que es la redacción original de 1974. En el régimen sin garantía de la LUC no existe esta clausura: lo más parecido es la excepción de pago del artículo 440, que no admite pago parcial y se rechaza sin sustanciar si no la acompañás con prueba documental.',
  },
  {
    question: '¿Cuánto tarda un desalojo en total?',
    short: 'La ley fija los plazos de cada paso, no la duración.',
    answer:
      'No hay una respuesta honesta en días. La ley le pone plazo a cada paso —la mora, el plazo para desocupar, las excepciones, el lanzamiento— pero no al tiempo que el juzgado se toma entre uno y otro, y el paso de iniciar la demanda no tiene plazo legal ninguno. Sumar los plazos da un número que ningún expediente cumple, así que acá van de a uno con su artículo.',
  },
  {
    question: '¿Es cierto que como buen pagador tengo un año para irme?',
    short: 'Ese año es de otras causales, y para fincas anteriores a junio de 1968.',
    answer:
      'El plazo de un año del artículo 32 del Decreto-Ley 14.219 es para las causales excepcionales del artículo 24 y los numerales 1.º y 5.º del artículo 26, no para el desalojo por falta de pago. Y vive en el Capítulo VI de la ley, que es uno de los que el artículo 102 deja afuera: los contratos sobre fincas construidas después del 2 de junio de 1968 quedan excluidos de la ley salvo el Capítulo VII y la Sección I del Capítulo VIII, que es el procedimiento. O sea que en un apartamento moderno ese año no se invoca.',
  },
  {
    question: 'Me llegó una intimación de pago. ¿Ya estoy en mora?',
    short: 'Todavía no: la mora se configura al vencer el plazo de la intimación.',
    answer:
      'No. En el régimen común quedás incurso en mora si no pagás dentro de los diez días hábiles siguientes a la intimación, y esa intimación no puede hacerse sino diez días después del día en que el pago debió efectuarse (Decreto-Ley 14.219, art. 55). En el régimen sin garantía el plazo es de tres días hábiles desde el día hábil siguiente al de la intimación, salvo que el contrato haya pactado mora automática (Ley 19.889, art. 437).',
  },
  {
    question: '¿Qué puedo contestar en el juicio?',
    short: 'En la LUC, sólo tres cosas, y el pago parcial no cuenta.',
    answer:
      'En el régimen sin garantía podés oponer exclusivamente las excepciones del artículo 133 del Código General del Proceso, la falta de cumplimiento de los requisitos del artículo 421 y la excepción de pago; el pago parcial no se admite y el tribunal rechaza sin sustanciar toda excepción sin prueba suficiente o con finalidad dilatoria (Ley 19.889, art. 440). En el régimen común el plazo para oponer excepciones es de diez días hábiles y perentorios (Decreto-Ley 14.219, art. 47).',
  },
])

export const EVICTION_SOURCES: readonly EvictionSource[] = Object.freeze([
  {
    label:
      'Ley 19.889 (LUC), art. 421 — las cinco condiciones del arrendamiento sin garantía, y qué rige si falta alguna',
    url: `${LUC}/421`,
  },
  {
    label:
      'Ley 19.889, art. 437 — intimación y mora: tres días hábiles, y el tope del 20 % de costos',
    url: `${LUC}/437`,
  },
  {
    label:
      'Ley 19.889, arts. 438 a 441 — proceso monitorio, plazo de seis días hábiles y excepciones admisibles',
    url: `${LUC}/439`,
  },
  {
    label:
      'Ley 19.889, arts. 442 a 444 — lanzamiento por el Alguacil, prórroga por fuerza mayor e irrecurribilidad',
    url: `${LUC}/442`,
  },
  {
    label: 'Decreto-Ley 14.219, art. 48 — plazo de veinte días en el desalojo por mora en el pago',
    url: `${DL14219}/48`,
  },
  {
    label:
      'Decreto-Ley 14.219, art. 51 — clausura del juicio con lo adeudado más el 40 %, una sola vez (redacción dada por la Ley 15.799, art. 17)',
    url: `${DL14219}/51`,
  },
  {
    label:
      'Ley 15.799, art. 17 — la norma que sustituyó el 60 % original del artículo 51 por el 40 %',
    url: 'https://www.impo.com.uy/bases/leyes/15799-1985/17',
  },
  {
    label:
      'Decreto-Ley 14.219, art. 55 — mora: diez días hábiles, y la espera previa de la intimación',
    url: `${DL14219}/55`,
  },
  {
    label:
      'Decreto-Ley 14.219, art. 62 — lanzamiento: quince días hábiles de espera y hasta sesenta de aplazamiento',
    url: `${DL14219}/62`,
  },
  {
    label:
      'Decreto-Ley 14.219, art. 102 — alcance: las fincas construidas después del 2 de junio de 1968 quedan fuera de la ley salvo el Capítulo VII y la Sección I del Capítulo VIII',
    url: `${DL14219}/102`,
  },
])
