// app/utils/asignacionFamiliar.ts
// Datos de /asignacion-familiar-uruguay: las dos asignaciones familiares que paga el BPS, cuánto
// paga cada una y por qué no se pueden cobrar las dos.
//
// POR QUÉ EXISTE: «asignación familiar» no aparecía en ninguna página del sitio, ni siquiera de
// pasada, y sin embargo es la prestación de BPS que más hogares toca. El problema de fondo es que
// hay DOS prestaciones distintas con el mismo nombre —la contributiva del Decreto Ley 15.084 y la
// del Plan de Equidad de la Ley 18.227—, que pagan montos muy distintos, con distinta frecuencia,
// y que son legalmente incompatibles entre sí. Quien busca «cuánto es la asignación familiar»
// encuentra un número sin saber cuál de las dos está mirando.
//
// EL DATO QUE NO ESTÁ ESCRITO EN NINGÚN LADO: el art. 4 de la Ley 18.227 no paga un monto fijo por
// hijo. Paga el monto base multiplicado por la cantidad de beneficiarios ELEVADA A 0,6, y recién
// después divide entre esa cantidad. El resultado es que lo que cobra el hogar crece con cada hijo,
// pero lo que cobra CADA hijo baja: con uno son $ 2.686,51 y con cinco son $ 1.411,24 cada uno.
// La escala de este archivo se deriva de esa fórmula, no se copia de una tabla.
//
// LO QUE DELIBERADAMENTE NO SE PUBLICA: ningún criterio numérico de «vulnerabilidad
// socioeconómica». El art. 2 de la Ley 18.227 dice que la determinación se hace «conforme a
// criterios estadísticos» —ingresos, vivienda, composición del hogar, situación sanitaria— y
// remite a la reglamentación; el índice concreto con el que BPS puntúa cada hogar no es un número
// publicado, y cualquier umbral que pusiéramos acá sería inventado. Tampoco se publica el monto
// exacto que BPS liquida a un hogar concreto: la escala de acá es la aritmética del art. 4 sobre
// el valor base publicado, y el redondeo de la liquidación es de BPS.
//
// FUENTES PRIMARIAS, verificadas el 2026-09-01 (ver ASIGNACION_FAMILIAR_SOURCES para la lista):
//   - BPS, «Asignación familiar» — montos y topes de ingresos del régimen contributivo, vigencia
//     1/2026, y las ramas de actividad que dan derecho.
//   - BPS, «Plan de equidad» — valores mensuales básicos 1/2026, condiciones y período de amparo.
//   - Ley 18.227 (22/12/2007), arts. 4, 5, 9, 10 y 11 — la fórmula del exponente 0,6, las edades
//     tope, la incompatibilidad con la opción a favor del Plan de Equidad, el ajuste por IPC sobre
//     valores de enero de 2008 y la inembargabilidad.

export interface AsignacionFamiliarSource {
  readonly label: string
  readonly url: string
}

/** Fecha en la que se contrastó todo lo de este archivo contra las fuentes oficiales. */
export const ASIGNACION_FAMILIAR_VERIFIED_AT = '2026-09-01'

/**
 * Mes de vigencia de los importes publicados por BPS que usa este archivo.
 *
 * Los dos regímenes se ajustan por IPC en las mismas oportunidades en que se ajustan las
 * remuneraciones de la Administración Central (Ley 18.227, art. 10), así que todo monto en pesos
 * de acá caduca: se muestra SIEMPRE junto a esta vigencia, nunca solo.
 */
export const ASIGNACION_FAMILIAR_VIGENCIA = '1/2026'

// ---------------------------------------------------------------------------
// Régimen contributivo — Decreto Ley 15.084
// ---------------------------------------------------------------------------

export interface FranjaContributiva {
  /** Tope de ingresos nominales del hogar, en pesos, para hogares de hasta dos beneficiarios. */
  readonly topeIngresos: number
  /** Lo que se cobra por mes y por beneficiario si el hogar entra en la franja. */
  readonly montoMensual: number
  readonly detail: string
}

/**
 * Las dos franjas del régimen contributivo, tal como las publica BPS con vigencia 1/2026.
 *
 * El monto es «por mes por beneficiario», pero la prestación se paga cada dos meses: el depósito
 * que llega es el de dos meses juntos. Es la confusión más común con esta prestación.
 */
export const FRANJAS_CONTRIBUTIVAS: readonly FranjaContributiva[] = Object.freeze([
  {
    topeIngresos: 50502,
    montoMensual: 1347,
    detail:
      'La franja alta. Si la suma de los ingresos del hogar no supera este tope, corresponde el monto mayor por cada beneficiario.',
  },
  {
    topeIngresos: 84688,
    montoMensual: 674,
    detail:
      'La franja baja: exactamente la mitad. Por encima de este tope no corresponde asignación familiar contributiva.',
  },
])

/**
 * Cuánto sube el tope de ingresos por cada beneficiario más allá del segundo.
 *
 * BPS lo publica en BPC además de en pesos, que es la única parte de todo esto expresada en una
 * unidad que no caduca: 1,2338 BPC.
 */
export const TOPE_INCREMENTO_POR_BENEFICIARIO_BPC = 1.2338

/** El mismo incremento en pesos, con la vigencia de {@link ASIGNACION_FAMILIAR_VIGENCIA}. */
export const TOPE_INCREMENTO_POR_BENEFICIARIO = 8468.8

/**
 * El tope de ingresos del hogar según cuántos beneficiarios tenga.
 *
 * Hasta dos beneficiarios rige el tope publicado tal cual. A partir del tercero, BPS suma
 * 1,2338 BPC por cada beneficiario adicional, y aclara que en ese caso el monto a percibir es el de
 * la segunda franja.
 *
 * Cantidades menores a uno o no numéricas se leen como uno: no existe el hogar con cero
 * beneficiarios en este cálculo.
 */
export function topeDeIngresos(topeBase: number, cantidadBeneficiarios: number): number {
  const cantidad = Number.isFinite(cantidadBeneficiarios)
    ? Math.max(1, Math.floor(cantidadBeneficiarios))
    : 1
  const adicionales = Math.max(0, cantidad - 2)
  return topeBase + adicionales * TOPE_INCREMENTO_POR_BENEFICIARIO
}

// ---------------------------------------------------------------------------
// Plan de Equidad — Ley 18.227
// ---------------------------------------------------------------------------

/**
 * Valor mensual básico por el primer beneficiario en gestación, menor de 5 años o escolar
 * (BPS, vigencia 1/2026). Es el «$ 700 de enero de 2008» del art. 4, literal A), ya ajustado.
 */
export const EQUIDAD_BASE = 2686.51

/**
 * Complemento mensual por el primer beneficiario que cursa nivel intermedio (BPS, vigencia 1/2026).
 * Es el «$ 300 de enero de 2008» del art. 4, literal B), ya ajustado.
 */
export const EQUIDAD_COMPLEMENTO_MEDIA = 1151.38

/**
 * Monto mensual fijo por beneficiario con discapacidad (BPS, vigencia 1/2026). Es el «$ 1.000 de
 * enero de 2008» del art. 4, literal C), ya ajustado. Fijo quiere decir que no entra en la escala
 * del exponente: no baja porque haya más hijos.
 */
export const EQUIDAD_DISCAPACIDAD = 3837.9

/** El exponente del art. 4 de la Ley 18.227. */
export const EQUIDAD_EXPONENTE = 0.6

/**
 * El factor de ajuste acumulado entre enero de 2008 y la vigencia publicada.
 *
 * No es un dato que BPS publique: sale de dividir cada valor vigente por su valor original del
 * art. 4, y da el MISMO número para los tres ($ 700, $ 300 y $ 1.000), que es la comprobación de
 * que la lectura de la fórmula es la correcta. El test lo verifica.
 */
export const EQUIDAD_VALORES_ORIGINALES = Object.freeze({
  base: 700,
  complementoMedia: 300,
  discapacidad: 1000,
})

/**
 * Lo que cobra el HOGAR por mes bajo el Plan de Equidad, por los beneficiarios sin discapacidad.
 *
 * Art. 4, literal A): «el resultado de multiplicar $ 700 por el número de beneficiarios
 * integrantes del hogar que no padecieren incapacidad elevado al exponente 0,6». Crece con cada
 * hijo, pero menos que proporcionalmente.
 */
export function equidadTotalHogar(cantidadBeneficiarios: number): number {
  const cantidad = Number.isFinite(cantidadBeneficiarios)
    ? Math.max(0, Math.floor(cantidadBeneficiarios))
    : 0
  if (cantidad === 0) return 0
  return EQUIDAD_BASE * Math.pow(cantidad, EQUIDAD_EXPONENTE)
}

/**
 * Lo que le toca a CADA beneficiario: el total del hogar dividido entre la cantidad, que es
 * literalmente lo que manda el art. 4 («y de dividir la cifra obtenida entre la cantidad de
 * aquéllos»).
 *
 * Equivale a la base por la cantidad elevada a −0,4: por eso baja a medida que el hogar crece.
 */
export function equidadPorBeneficiario(cantidadBeneficiarios: number): number {
  const cantidad = Number.isFinite(cantidadBeneficiarios)
    ? Math.max(0, Math.floor(cantidadBeneficiarios))
    : 0
  if (cantidad === 0) return 0
  return equidadTotalHogar(cantidad) / cantidad
}

export interface EquidadEscalon {
  readonly beneficiarios: number
  /** Pesos por mes que cobra cada beneficiario. */
  readonly porBeneficiario: number
  /** Pesos por mes que cobra el hogar en total. */
  readonly totalHogar: number
}

/**
 * La escala de uno a cinco beneficiarios, derivada de las funciones de arriba en vez de escrita a
 * mano: si el valor base cambia con el próximo ajuste, la tabla de la página cambia con él y no
 * queda una fila vieja contradiciendo a la fórmula.
 */
export const EQUIDAD_ESCALA: readonly EquidadEscalon[] = Object.freeze(
  [1, 2, 3, 4, 5].map(beneficiarios => ({
    beneficiarios,
    porBeneficiario: equidadPorBeneficiario(beneficiarios),
    totalHogar: equidadTotalHogar(beneficiarios),
  }))
)

// ---------------------------------------------------------------------------
// En qué se diferencian
// ---------------------------------------------------------------------------

export interface ComparacionFila {
  readonly key: 'norma' | 'quien' | 'frecuencia' | 'monto' | 'tope' | 'edad'
  readonly label: string
  readonly contributiva: string
  readonly equidad: string
}

export const COMPARACION: readonly ComparacionFila[] = Object.freeze([
  {
    key: 'norma',
    label: 'Qué la crea',
    contributiva: 'Decreto Ley 15.084 (28/11/1980), que BPS nombra como Ley 15.084.',
    equidad: 'Ley 18.227 (22/12/2007), el «Plan de Equidad».',
  },
  {
    key: 'quien',
    label: 'Quién la cobra',
    contributiva:
      'Hijos y menores a cargo de trabajadores del sector privado, jubilados y pensionistas de esas ramas, pequeños productores rurales de hasta 200 hectáreas, trabajadores a domicilio y personas en subsidios transitorios. Vale también estando en seguro de desempleo.',
    equidad:
      'Niños y adolescentes de hogares en situación de vulnerabilidad socioeconómica, y los internados en régimen de tiempo completo en el INAU o en instituciones con convenio. No pide vínculo laboral.',
  },
  {
    key: 'frecuencia',
    label: 'Cada cuánto se paga',
    contributiva: 'Cada dos meses. El monto se publica por mes, pero el depósito viene bimestral.',
    equidad: 'Todos los meses.',
  },
  {
    key: 'monto',
    label: 'Cuánto paga',
    contributiva: '$ 1.347 o $ 674 por mes por beneficiario, según el tope de ingresos del hogar.',
    equidad:
      '$ 2.686,51 por mes por el primer beneficiario, y menos por cabeza a medida que hay más hijos.',
  },
  {
    key: 'tope',
    label: 'Mira los ingresos',
    contributiva:
      'Sí, con topes nominales publicados: $ 50.502 y $ 84.688 para hogares de hasta dos beneficiarios.',
    equidad:
      'Sí, pero no con un tope publicado: el art. 2 manda evaluar el hogar «conforme a criterios estadísticos» —ingresos, vivienda, composición y situación sanitaria—.',
  },
  {
    key: 'edad',
    label: 'Hasta qué edad',
    contributiva:
      '14 años cursando primaria; 18 cursando secundaria o UTU. Con discapacidad y sin pensión por invalidez, de por vida; con pensión, hasta los 15.',
    equidad:
      '14 años cursando primaria —16 si no la completó por enfermedad o por vivir a más de 5 km del centro educativo—; 18 cursando secundaria. Con discapacidad y sin pensión, de por vida, pidiéndolo antes de los 18.',
  },
])

// ---------------------------------------------------------------------------
// Preguntas y fuentes
// ---------------------------------------------------------------------------

export interface AsignacionFamiliarFaq {
  readonly question: string
  readonly short: string
  readonly answer: string
}

export const ASIGNACION_FAMILIAR_FAQ: readonly AsignacionFamiliarFaq[] = [
  {
    question: '¿Cuánto es la asignación familiar en Uruguay?',
    short: 'Depende de cuál de las dos: $ 1.347, $ 674 o $ 2.686,51 por mes',
    answer:
      'Hay dos prestaciones distintas con el mismo nombre. La contributiva (Decreto Ley 15.084) paga, con vigencia 1/2026, $ 1.347 por mes por beneficiario si los ingresos del hogar no superan los $ 50.502, y $ 674 si no superan los $ 84.688; por encima de eso no corresponde. La del Plan de Equidad (Ley 18.227) paga $ 2.686,51 por mes por el primer beneficiario en gestación, menor de 5 años o escolar. Los dos regímenes se ajustan por IPC, así que todo monto vale con su fecha: los de acá son los publicados por BPS para 1/2026.',
  },
  {
    question: '¿Puedo cobrar las dos asignaciones familiares a la vez?',
    short: 'No, y podés optar por la del Plan de Equidad cuando quieras',
    answer:
      'No. El art. 9 de la Ley 18.227 declara la prestación del Plan de Equidad incompatible con la del Decreto Ley 15.084, con la de la Ley 17.474, con la asignación que genera ser funcionario público y con las que sirve el INAU. Pero el mismo artículo agrega algo que casi nunca se menciona: «se podrá optar en todo momento por el beneficio previsto en la presente ley», y el Plan de Equidad «tiene preferencia en caso de controversia». O sea que quien hoy cobra la contributiva puede pasarse, y como el Plan de Equidad paga por el primer hijo casi el doble que la franja más alta de la contributiva, para muchos hogares la opción no es neutra.',
  },
  {
    question: '¿Por qué me pagan menos por hijo cuando tengo más hijos?',
    short: 'Porque la ley eleva la cantidad al exponente 0,6 antes de dividir',
    answer:
      'Porque no es un monto fijo por hijo. El art. 4 de la Ley 18.227 manda multiplicar el monto base por la cantidad de beneficiarios elevada al exponente 0,6, y recién después dividir el resultado entre esa misma cantidad. El hogar cobra más con cada hijo, pero cada hijo cobra menos: con el valor base de 1/2026, un solo beneficiario cobra $ 2.686,51 y en un hogar de cinco cobra $ 1.411,24 cada uno, aunque el hogar pase de $ 2.686,51 a $ 7.056,19 en total. No es un error de liquidación: está escrito así en la ley.',
  },
  {
    question: '¿Cada cuánto se cobra la asignación familiar?',
    short: 'La contributiva es bimestral; la del Plan de Equidad, mensual',
    answer:
      'Depende del régimen. BPS define la asignación familiar contributiva como «una prestación económica bimestral»: los montos se publican por mes pero el depósito llega cada dos meses, y por eso mucha gente cree que le pagaron el doble de lo que corresponde. La del Plan de Equidad es «una prestación mensual en dinero» y se cobra todos los meses.',
  },
  {
    question: '¿Hasta qué edad se cobra?',
    short: 'Hasta los 14 en primaria y los 18 en secundaria',
    answer:
      'En los dos regímenes, hasta los 14 años mientras el beneficiario curse primaria y hasta los 18 si cursa secundaria en institutos estatales o privados habilitados, incluida UTU. En el Plan de Equidad la primaria se extiende hasta los 16 si no pudo completarse por enfermedad o por vivir en zona rural a más de 5 km del centro educativo más cercano. Con discapacidad, quien no percibe pensión por invalidez tiene derecho de por vida —en el Plan de Equidad hay que solicitarlo antes de cumplir 18, con certificado del Centro Martínez Visca—; quien sí percibe pensión cobra la asignación simple hasta los 15 en el régimen contributivo y hasta los 18 en el Plan de Equidad.',
  },
  {
    question: 'Tengo tres hijos. ¿Cambia el tope de ingresos?',
    short: 'Sí: sube 1,2338 BPC por cada hijo a partir del tercero',
    answer:
      'Sí. Los topes publicados ($ 50.502 y $ 84.688) son los de un hogar con hasta dos beneficiarios. BPS aclara que el tope se incrementa en 1,2338 BPC —$ 8.468,80 con vigencia 1/2026— por cada beneficiario adicional: con tres hijos el tope superior queda en $ 93.156,80, con cuatro en $ 101.625,60 y con cinco en $ 110.094,40. En esos casos el monto que corresponde es el de la segunda franja, $ 674 por mes por beneficiario.',
  },
  {
    question: '¿Me pueden embargar la asignación familiar?',
    short: 'No: la ley la declara inembargable',
    answer:
      'La del Plan de Equidad no. El art. 11 de la Ley 18.227 dice que la prestación «es inalienable e inembargable y toda venta o cesión que se hiciere de ella, cualquiera fuere su causa, será nula». Si tenés una deuda en cobranza y te aparece un descuento sobre esta partida, es un descuento que no debería existir.',
  },
  {
    question: '¿Desde cuándo me la pagan si la pido tarde?',
    short: 'Desde la fecha en que reservaste la agenda, no antes',
    answer:
      'En el Plan de Equidad, BPS aclara que la prestación se paga desde el momento en que se realiza la solicitud, con retroactividad solo hasta la fecha de reserva de agenda. O sea que el retroactivo se cuenta desde que pediste el día, no desde que nació el derecho: cuanto antes se reserve la agenda, menos se pierde.',
  },
]

export const ASIGNACION_FAMILIAR_SOURCES: readonly AsignacionFamiliarSource[] = [
  {
    label:
      'BPS — «Asignación familiar»: prestación bimestral, montos de $ 1.347 y $ 674 por mes por beneficiario con topes de ingresos de $ 50.502 y $ 84.688 (vigencia 1/2026), incremento de 1,2338 BPC del tope por beneficiario adicional, y las ramas de actividad que dan derecho',
    url: 'https://www.bps.gub.uy/5470/asignacion-familiar.html',
  },
  {
    label:
      'BPS — «Plan de equidad»: prestación mensual, valores básicos 1/2026 de $ 2.686,51, $ 1.151,38 de complemento por nivel intermedio y $ 3.837,90 por discapacidad, condiciones de educación y salud, período de amparo y retroactividad hasta la reserva de agenda',
    url: 'https://www.bps.gub.uy/3540/plan-de-equidad.html',
  },
  {
    label:
      'Ley 18.227 (22/12/2007), art. 4 — la fórmula: el monto base por la cantidad de beneficiarios elevada al exponente 0,6, dividido entre esa cantidad',
    url: 'https://www.impo.com.uy/bases/leyes/18227-2007',
  },
  {
    label:
      'Ley 18.227, art. 9 — incompatibilidad con el Decreto Ley 15.084, la Ley 17.474 y las asignaciones de funcionario público y del INAU, con la opción «en todo momento» por el Plan de Equidad y su preferencia en caso de controversia',
    url: 'https://www.impo.com.uy/bases/leyes/18227-2007',
  },
  {
    label:
      'Ley 18.227, arts. 5, 10 y 11 — edades tope de 14, 16 y 18 años, ajuste por IPC sobre valores constantes de enero de 2008, e inembargabilidad de la prestación',
    url: 'https://www.impo.com.uy/bases/leyes/18227-2007',
  },
]
