// app/utils/carDebt.ts
// Datos y cuentas de /comprar-auto-con-deuda-uruguay: el auto barato de Marketplace que arrastra
// patente y multas, qué se hereda de esa deuda y qué se bloquea.
//
// POR QUÉ EXISTE SEPARADO DE /multas-de-transito-y-patente-uruguay: esa página es la del TITULAR
// —cómo se calcula la patente, cómo se descarga una multa, en qué plazos, cómo se prescribe—.
// Esta es la del COMPRADOR, que es otra decisión y otra intención de búsqueda: mirando una
// publicación con un precio sospechosamente bajo, ¿qué me pasa si lo compro? Todo lo que sea
// mecánica del tributo se enlaza a la otra página en vez de repetirse acá.
//
// LA PREGUNTA QUE ORIGINA LA PÁGINA (r/uruguay, 2026-08-18): «hay un montón de autos endeudados,
// de patente, con multas enormes, qué le pasa a estos vehículos, ¿se confiscan?». Y la
// repregunta que el hilo nunca contestó: «cuál es la consecuencia real de no pagar, aparte del
// número virtual enorme que deberías».
//
// LAS TRES COSAS QUE EL HILO DE REDDIT DISCUTÍA SIN FUENTE, Y QUE ACÁ SE RESUELVEN:
//   1. «¿Los radares te multan por deuda de patente?». Sí, y no es el radar de velocidad: la
//      Intendencia de Montevideo fiscaliza la deuda de patente con cámaras de reconocimiento de
//      matrícula desde el 1/2/2018. La habilitación normativa es el art. 10 del TOS (la multa) y
//      el art. 31 de la ley 19.824 (la notificación por captación de imágenes).
//   2. «En el peaje no te levantan la barrera». Es cierto, pero por OTRA deuda: la barrera se
//      retiene por deuda de PEAJE con la Corporación Vial, no por patente. Confundirlas hace que
//      alguien crea que puede pasar tranquilo debiendo patente, o al revés.
//   3. «¿Vas preso? ¿Te confiscan el auto?». No hay figura penal: es deuda tributaria. Lo que sí
//      existe es el retiro de placas con cinco o más ejercicios de deuda, con el vehículo al
//      depósito — que NO es confiscación, porque se recupera regularizando y pagando los gastos.
//
// LA ASIMETRÍA QUE DEFINE TODA LA PÁGINA: la deuda vive en la cuenta del VEHÍCULO (por eso el
// certificado se pide por matrícula y padrón, y por eso el art. 45 bloquea la transferencia),
// pero la multa por circular y el retiro de placas caen sobre EL QUE ESTÁ MANEJANDO. O sea: el
// comprador no asume la deuda vieja como obligación personal, pero se queda con un auto que no
// puede poner a su nombre y que lo expone a él a la sanción. Ese es el negocio real que se firma.
//
// LO QUE ESTA PÁGINA NO AFIRMA, A PROPÓSITO:
//   - Que el vendedor siga siendo responsable personal de la deuda después de vender. El TOS no
//     define el sujeto pasivo (lo hace el decreto de cada intendencia y la ley 18.456 sólo fija
//     dónde se empadrona), así que no hay fuente para afirmarlo ni para negarlo.
//   - Un precio en pesos del Certificado SUCIVE. El art. 54 dice «tres documentos» y el art. 9
//     publica el valor del documento en una tabla que en el PDF sale con las filas desalineadas.
//     Se publica el mecanismo; el importe exacto lo cotiza el propio trámite antes de cobrar.
//   - Que la deuda de patente vaya al Clearing. Ya está resuelto en trafficFines.ts: no consta
//     norma que lo establezca. No se repite acá como si fuera un hallazgo nuevo.
//
// POR QUÉ LAS TASAS LLEVAN EL AÑO PEGADO AL NOMBRE: el Texto Ordenado del SUCIVE 2026 arrastra
// las tasas con la etiqueta del año en que se calcularon y NO las reetiquetó — el recargo por
// mora dice «para el año 2025» y el interés de convenio dice «para el año 2024», los dos dentro
// del texto vigente para 2026. Publicar «1,05% mensual» a secas sería inventar una vigencia que
// el documento no da. La calculadora las usa como valor por defecto editable y la página dice de
// qué año son.
//
// FUENTES, verificadas el 2026-08-17:
//   - Texto Ordenado del SUCIVE 2026, aprobado en la 6ª Sesión Plenaria del Congreso de
//     Intendentes del 14/11/2025 (arts. 9, 10, 18, 23, 25, 29, 30, 45, 54, 55)
//     https://www.gub.uy/congreso-intendentes/comunicacion/publicaciones/texto-ordenado-del-sucive-2026
//     PDF: https://tramites.montevideo.gub.uy/sites/tramites.montevideo.gub.uy/files/tramites/documentos/TOS%202026_0.pdf
//   - IMPO, ley 18.860 (crea el SUCIVE; art. 1 remite al numeral 6º del art. 297 de la Constitución)
//     https://www.impo.com.uy/bases/leyes/18860-2011
//   - IMPO, ley 19.824 arts. 31, 32, 40 (notificación por imágenes; prescripción de multas;
//     retiro de placas por cinco o más ejercicios)
//     https://www.impo.com.uy/bases/leyes/19824-2019
//   - Congreso de Intendentes, funcionamiento del Certificado SUCIVE
//     https://www.gub.uy/congreso-intendentes/comunicacion/publicaciones/funcionamiento-del-certificado-sucive
//   - SUCIVE, certificado y consulta de deuda por matrícula y padrón
//     https://www.sucive.gub.uy/certificado_sucive — https://www.sucive.gub.uy/consulta_deuda
//   - El Observador, «La IM empezó a multar con cámaras a quienes circulan con deuda de patente»
//     https://www.elobservador.com.uy/nota/imm-empezo-a-multar-con-camaras-a-quienes-circulan-con-deuda-de-patente-de-rodados-20182119520
//   - Subrayado, «MTOP resolvió no levantar barrera a vehículos que acumulan deuda superior a
//     150 mil pesos en peajes»
//     https://www.subrayado.com.uy/mtop-resolvio-no-levantar-barrera-vehiculos-que-acumulan-deuda-superior-150-mil-pesos-peajes-n1010223
//   - Intendencia de Montevideo, prescripción de deuda de patente de rodados (trámite)
//     https://tramites.montevideo.gub.uy/tramites-y-tributos/solicitud/prescripcion-de-deuda-de-patente-de-rodados

/** Fecha en que normas, artículos y montos se contrastaron con su fuente. */
export const CAR_DEBT_VERIFIED_AT = '2026-08-17'

/** La página del titular. Todo lo que sea mecánica del tributo va para allá, no se duplica acá. */
export const CAR_DEBT_OWNER_PAGE = '/multas-de-transito-y-patente-uruguay'

export interface CarDebtSource {
  label: string
  url: string
}

export const CAR_DEBT_SOURCES: readonly CarDebtSource[] = Object.freeze([
  {
    label: 'Texto Ordenado del SUCIVE 2026 — Congreso de Intendentes',
    url: 'https://www.gub.uy/congreso-intendentes/comunicacion/publicaciones/texto-ordenado-del-sucive-2026',
  },
  {
    label: 'Texto Ordenado del SUCIVE 2026 (PDF servido por la Intendencia de Montevideo)',
    url: 'https://tramites.montevideo.gub.uy/sites/tramites.montevideo.gub.uy/files/tramites/documentos/TOS%202026_0.pdf',
  },
  {
    label: 'IMPO — Ley 18.860, creación del SUCIVE',
    url: 'https://www.impo.com.uy/bases/leyes/18860-2011',
  },
  {
    label: 'IMPO — Ley 19.824 (arts. 31, 32 y 40)',
    url: 'https://www.impo.com.uy/bases/leyes/19824-2019',
  },
  {
    label: 'Congreso de Intendentes — Funcionamiento del Certificado SUCIVE',
    url: 'https://www.gub.uy/congreso-intendentes/comunicacion/publicaciones/funcionamiento-del-certificado-sucive',
  },
  {
    label: 'SUCIVE — Certificado SUCIVE (solicitud en línea)',
    url: 'https://www.sucive.gub.uy/certificado_sucive',
  },
  {
    label: 'SUCIVE — Consulta de deuda por matrícula y padrón',
    url: 'https://www.sucive.gub.uy/consulta_deuda',
  },
  {
    label: 'El Observador — La IM empezó a multar con cámaras por deuda de patente',
    url: 'https://www.elobservador.com.uy/nota/imm-empezo-a-multar-con-camaras-a-quienes-circulan-con-deuda-de-patente-de-rodados-20182119520',
  },
  {
    label: 'Subrayado — El MTOP no levanta la barrera con deuda de peaje mayor a $ 150.000',
    url: 'https://www.subrayado.com.uy/mtop-resolvio-no-levantar-barrera-vehiculos-que-acumulan-deuda-superior-150-mil-pesos-peajes-n1010223',
  },
  {
    label: 'Intendencia de Montevideo — Prescripción de deuda de patente de rodados',
    url: 'https://tramites.montevideo.gub.uy/tramites-y-tributos/solicitud/prescripcion-de-deuda-de-patente-de-rodados',
  },
])

// ---------------------------------------------------------------------------
// La respuesta corta
// ---------------------------------------------------------------------------

export interface CarDebtVerdict {
  claim: string
  answer: string
  norm: string
}

/**
 * Las cuatro afirmaciones que hay que tener claras ANTES de señar. Van en el orden en que le
 * importan a alguien mirando una publicación, no en el orden en que las trae la norma.
 */
export const CAR_DEBT_VERDICTS: readonly CarDebtVerdict[] = Object.freeze([
  {
    claim: '¿La deuda pasa a ser mía si lo compro?',
    answer:
      'La deuda está asentada contra el vehículo, no contra vos: por eso el certificado se pide por matrícula y padrón y no por cédula. Pero eso no te salva, porque el efecto práctico es peor que heredarla: mientras la deuda exista no podés poner el auto a tu nombre. Comprás un auto que seguís usando con los papeles de otra persona.',
    norm: 'TOS SUCIVE 2026, arts. 45 y 54',
  },
  {
    claim: '¿No puedo transferirlo? ¿Y eso qué problema real me trae?',
    answer:
      'No podés transferir un vehículo que deba patente, multas, cuotas de convenio o montos por matrículas o DIV, y ni siquiera hace falta que la deuda esté vencida: alcanza con que exista. Sin transferencia no sos el titular registral, así que no podés reempadronarlo, ni hacer trámites, ni revenderlo, y para volver a venderlo vas a chocar con el mismo bloqueo que el que te lo vendió a vos.',
    norm: 'TOS SUCIVE 2026, art. 45',
  },
  {
    claim: '¿Se lo confiscan?',
    answer:
      'Confiscar, no. Con cinco o más ejercicios fiscales de deuda acumulados, los servicios inspectivos pueden retirarle las placas donde lo constaten, el vehículo queda inhabilitado para circular, se retira de la vía pública y va a depósito. Se recupera: lo saca quien esté inscripto en el registro vehicular departamental, con la situación tributaria regularizada y pagando la multa y los gastos del depósito. El problema es justamente ese: lo tiene que sacar el titular, y el titular no sos vos.',
    norm: 'Ley 19.824, art. 40 — TOS SUCIVE 2026, art. 55',
  },
  {
    claim: '¿Vas preso?',
    answer:
      'No. Es una deuda tributaria departamental y una infracción administrativa de tránsito: no hay figura penal por deberla. La consecuencia no es la cárcel, es que el número crece solo con mora y recargo diario mientras el auto queda trabado para todo trámite.',
    norm: 'TOS SUCIVE 2026, art. 30 (mora y recargo)',
  },
])

// ---------------------------------------------------------------------------
// La escalera de consecuencias
// ---------------------------------------------------------------------------

export interface DebtStage {
  /** Qué dispara esta etapa. */
  trigger: string
  title: string
  detail: string
  norm: string
}

/**
 * Ordenada por gravedad creciente, que además es el orden temporal en que las cosas pasan.
 * El salto que la gente no ve venir es el tercero: la multa por circular no la aplica un
 * inspector que te para, la aplica una cámara.
 */
export const CAR_DEBT_STAGES: readonly DebtStage[] = Object.freeze([
  {
    trigger: 'Desde el día 1 de atraso',
    title: 'Multa por mora y recargo diario',
    detail:
      'La multa por mora es del 5% si pagás dentro de los cinco días hábiles del vencimiento, 10% pasados esos cinco días y hasta los noventa corridos, y 20% después de los noventa. El propio artículo reduce esos porcentajes a la mitad para toda deuda que se extinga desde 2019. Encima corre un recargo mensual capitalizable diariamente, que es el que hace que el número crezca solo.',
    norm: 'TOS SUCIVE 2026, art. 30',
  },
  {
    trigger: 'Con cualquier deuda vieja sin saldar',
    title: 'No podés ni pagar la cuota corriente',
    detail:
      'Los conceptos vencidos más antiguos se pagan primero, así que la deuda vieja te bloquea el pago de la cuota nueva — y esa cuota nueva también se atrasa y también genera mora. Es el mecanismo por el que una deuda chica se vuelve una bola. Las multas y las cuotas de convenio son la excepción: siempre se pueden pagar.',
    norm: 'TOS SUCIVE 2026, art. 29',
  },
  {
    trigger: 'Con dos o más cuotas de patente vencidas',
    title: 'Multa del 25% de la patente anual, por cámara',
    detail:
      'Circular con la patente vencida en dos o más cuotas se sanciona con una multa equivalente al 25% de la patente anual del vehículo. Aplicada una, no puede volver a aplicarse por el mismo concepto durante un mes, y puede aplicarse hasta cuatro veces al año: cuatro por 25% es el 100% de la patente anual en multas, además de la patente que ya debías. La cobra el departamento donde te detectan, aunque el vehículo esté empadronado en otro.',
    norm: 'TOS SUCIVE 2026, art. 10',
  },
  {
    trigger: 'Si no pagás esa multa',
    title: 'Retiro de matrículas',
    detail:
      'El mismo artículo cierra diciendo que en caso de incumplimiento se procederá al retiro de sus matrículas. En el texto ordenado anterior esto estaba redactado como una facultad («se podrá proceder»); en el vigente es una orden.',
    norm: 'TOS SUCIVE 2026, art. 10',
  },
  {
    trigger: 'Cuando querés venderlo',
    title: 'Transferencia bloqueada',
    detail:
      'No puede transferirse un vehículo que deba patente, multas, cuotas de convenios interdepartamentales o montos por chapas matrículas o DIV, aunque no haya vencido el plazo para pagarlos. Este es el bloqueo que aparece recién al final, cuando ya no hay margen para negociar el precio.',
    norm: 'TOS SUCIVE 2026, art. 45',
  },
  {
    trigger: 'Con cinco o más ejercicios fiscales de deuda',
    title: 'Caducidad del permiso de circulación y depósito',
    detail:
      'Se establece la caducidad del permiso de circulación que implica poseer la placa, las intendencias retiran las placas y el vehículo queda inhabilitado hasta regularizar. Se retira de la vía pública y se deposita, y sólo lo saca del depósito quien esté inscripto en el registro vehicular departamental, con la situación tributaria regularizada y previo pago de la multa y los gastos. Si nadie lo retira se aplica la ley 18.791.',
    norm: 'Ley 19.824, art. 40 — TOS SUCIVE 2026, art. 55',
  },
])

// ---------------------------------------------------------------------------
// El Certificado SUCIVE: la revisión previa que sí sirve
// ---------------------------------------------------------------------------

/** Qué cubre el certificado. Es la lista del art. 54, que es más ancha de lo que se supone. */
export const CERTIFICADO_COVERS: readonly string[] = Object.freeze([
  'El estado del impuesto de patente en TODAS las intendencias respecto de ese vehículo, no sólo en la que está empadronado',
  'Toda la información fiscal de la historia del automotor: impuestos, tasas y precios, incluidas matrículas y libretas',
  'Las multas de tránsito y los servicios prestados a nivel de todos los gobiernos departamentales',
  'Las multas aplicadas por la Policía Nacional de Tránsito, que son otro carril distinto del departamental',
  'Los peajes, precios y tasas que se adeuden a la Corporación Vial del Uruguay por cualquier causa',
])

export interface CertificadoFact {
  label: string
  detail: string
}

export const CERTIFICADO_FACTS: readonly CertificadoFact[] = Object.freeze([
  {
    label: 'Lo puede pedir cualquiera',
    detail:
      'Se solicita en línea aportando el número de matrícula y padrón de la unidad, a pedido de parte interesada. No hace falta ser el titular: para eso sirve antes de comprar. Al vendedor sólo le pedís esos dos datos, que además figuran en la chapa y en la libreta.',
  },
  {
    label: 'Tiene carácter liberatorio',
    detail:
      'No es una consulta informativa cualquiera: el artículo le da carácter oficial y liberatorio, o sea que hace fe de lo que dice a la fecha de expedición. Es la diferencia entre esto y una captura de pantalla de la consulta rápida.',
  },
  {
    label: 'La vigencia es diaria',
    detail:
      'El certificado vale por el día. Un certificado de hace tres semanas no te sirve para firmar: pedilo cerca de la fecha en que vas a señar o a escriturar, no al empezar a mirar.',
  },
  {
    label: 'Cuesta tres documentos',
    detail:
      'El costo es de tres «documentos» de la tabla de costos del texto ordenado, que se actualiza cada año por IPC. No publicamos el importe en pesos porque la tabla del PDF vigente sale con las filas desalineadas y preferimos que lo veas cotizado en el propio trámite antes de pagar.',
  },
])

// ---------------------------------------------------------------------------
// Lo que la publicación no te dice
// ---------------------------------------------------------------------------

export interface ListingTrap {
  phrase: string
  reality: string
}

/**
 * Las frases de aviso que suenan a garantía y no lo son. Cada una tiene enfrente el motivo
 * concreto por el que el certificado la desmiente.
 */
export const LISTING_TRAPS: readonly ListingTrap[] = Object.freeze([
  {
    phrase: '«Papeles al día»',
    reality:
      'No es un documento, es una afirmación. Al día según quién y a qué fecha. El único papel que lo acredita con carácter liberatorio es el Certificado SUCIVE del día, pedido por vos.',
  },
  {
    phrase: '«Sólo debe la patente de este año»',
    reality:
      'La patente de este año es la parte barata. Lo que hay que mirar es cuántos ejercicios se acumulan, porque a los cinco cambia la categoría del problema: ahí ya no es plata, es retiro de placas y depósito.',
  },
  {
    phrase: '«Está sin multas»',
    reality:
      'Hay tres carriles distintos de multas y el vendedor probablemente conoce uno: las departamentales, las de la Policía Nacional de Tránsito y los peajes adeudados a la Corporación Vial. El certificado trae los tres.',
  },
  {
    phrase: '«Tiene un convenio, se paga en cuotas»',
    reality:
      'Un convenio vigente con cuotas pendientes bloquea la transferencia igual que la deuda suelta: el artículo 45 nombra expresamente las cuotas de convenios interdepartamentales. Y el convenio caduca con tres cuotas de atraso, y ahí revive la deuda original completa.',
  },
  {
    phrase: '«Está empadronado en el interior, paga menos»',
    reality:
      'El departamento no se elige por conveniencia y la deuda de otro departamento igual aparece: el certificado informa el estado de la patente en todas las intendencias, no sólo en la de empadronamiento.',
  },
  {
    phrase: '«Lo pasamos con un papelito y después lo transferís»',
    reality:
      'Ese «después» no llega mientras exista la deuda. Y mientras tanto el auto que manejás está a nombre de otro, con lo cual el que puede sacarlo del depósito si lo levantan es esa otra persona, no vos.',
  },
])

// ---------------------------------------------------------------------------
// El chequeo del hilo: qué se dice y qué dice la fuente
// ---------------------------------------------------------------------------

export type MythVerdict = 'cierto' | 'falso' | 'a-medias'

export interface CarDebtMyth {
  myth: string
  verdict: MythVerdict
  answer: string
  norm: string
}

/**
 * Las creencias que circulan sobre esto, con la fuente que las confirma o las desarma. La
 * primera es la que más discusión genera y la que tiene la respuesta más concreta.
 */
export const CAR_DEBT_MYTHS: readonly CarDebtMyth[] = Object.freeze([
  {
    myth: 'Las cámaras te multan por deber patente, no sólo por velocidad o semáforo.',
    verdict: 'cierto',
    answer:
      'En Montevideo la Intendencia fiscaliza la deuda de patente con cámaras de reconocimiento de matrícula desde el 1º de febrero de 2018. No son los radares de velocidad haciendo otra cosa: es un sistema de lectura de matrículas que detecta el vehículo con dos o más cuotas vencidas y dispara la notificación de la infracción. La norma que lo habilita es doble: el artículo 10 del texto ordenado crea la multa, y el artículo 31 de la ley 19.824 admite expresamente que el procedimiento se aplique cuando la autoridad tomó conocimiento «a través de los medios de captación y reproducción de imágenes que permitan la identificación del vehículo».',
    norm: 'TOS SUCIVE 2026, art. 10 — Ley 19.824, art. 31',
  },
  {
    myth: 'Si debés, en el peaje no te levantan la barrera.',
    verdict: 'a-medias',
    answer:
      'Existe, pero es por deuda de PEAJE, no de patente. La retención de barrera se aplica a quienes acumulan deuda de peaje con la Corporación Vial del Uruguay por encima de un umbral, que se bajó a $ 150.000: hay que parar en la cabina y pasar por la oficina comercial a regularizar. Deber patente no te traba el peaje; deber peaje sí, y además esa deuda aparece en el Certificado SUCIVE junto con todo lo demás.',
    norm: 'Corporación Vial del Uruguay / MTOP',
  },
  {
    myth: 'La deuda se cae sola a los cinco años.',
    verdict: 'falso',
    answer:
      'Dos errores en una frase. Primero, son dos relojes distintos: la multa de tránsito prescribe a los cinco años desde la infracción, pero el tributo de patente prescribe a los diez, contados desde la terminación del año civil en que se produjo el hecho gravado. Segundo, y más importante: no opera sola. El artículo 18 exige, sin excepciones, que la prescripción —tanto la de multas como la de deudas tributarias— haya sido autorizada por acto administrativo, o sea una resolución del intendente. Hay que pedirla y que te la concedan.',
    norm: 'TOS SUCIVE 2026, art. 18 — Ley 19.824, art. 32',
  },
  {
    myth: 'Si el auto no está a mi nombre, el problema es del otro.',
    verdict: 'falso',
    answer:
      'Está al revés. La deuda es del vehículo y traba al vehículo, así que el que se queda sin poder venderlo, sin poder reempadronarlo y sin poder sacarlo del depósito sos vos, que lo tenés. Y las sanciones de circulación caen sobre el que circula. Lo único que queda del lado del titular anterior es la firma que hace falta para cualquier trámite: dependés de una persona que ya cobró y se fue.',
    norm: 'TOS SUCIVE 2026, arts. 45 y 55',
  },
  {
    myth: 'Le hago un convenio y con eso ya lo puedo transferir.',
    verdict: 'falso',
    answer:
      'El convenio te ordena el pago, no destraba la venta: el artículo 45 incluye expresamente las cuotas de convenios interdepartamentales entre lo que impide transferir. Sirve para dejar de acumular sanciones mientras pagás, pero la transferencia recién se libera cuando no queda nada pendiente.',
    norm: 'TOS SUCIVE 2026, arts. 45 y 25',
  },
  {
    myth: 'Pagar una cuota vieja no me compromete en nada.',
    verdict: 'falso',
    answer:
      'En materia de multas, cualquier reconocimiento —expreso o tácito— interrumpe el plazo de prescripción: pagar una cuota o firmar un convenio sobre una deuda que podría estar prescrita la revive y el plazo empieza a contar de nuevo. Si estás mirando una deuda vieja con la prescripción en mente, asesorate antes de hacer cualquier gesto que implique reconocerla.',
    norm: 'Ley 19.824, art. 32',
  },
])

// ---------------------------------------------------------------------------
// Por qué se paga patente
// ---------------------------------------------------------------------------

export const PATENTE_WHY =
  'La patente de rodados no es una tasa por un servicio: es el impuesto a los vehículos de transporte que el numeral 6º del artículo 297 de la Constitución le asigna como recurso propio a los gobiernos departamentales. Por eso lo cobra la intendencia y no la DGI, por eso el importe lo vota el Congreso de Intendentes y no el Parlamento, y por eso el Código Tributario nacional no lo rige: su artículo 1 excluye a los gobiernos departamentales, y de ahí sale que la patente prescriba a los diez años y no a los cinco. Lo que la ley 18.860 agregó en 2011 fue el cobro unificado: el SUCIVE no le sacó la competencia a nadie, centralizó la gestión de cobro y creó un fondo que complementa lo que recauda cada departamento.'

// ---------------------------------------------------------------------------
// Constantes de cálculo (art. 30 mora, art. 25 convenios)
// ---------------------------------------------------------------------------

/**
 * Tasa diaria de recargo por mora, capitalizable diariamente. El texto ordenado vigente para 2026
 * la publica etiquetada «para el año 2025»: 1,05% mensual y 0,0348236% diaria equivalente. Se
 * expone con la etiqueta puesta en vez de reetiquetarla nosotros.
 */
export const MORA_RECARGO_DAILY_PCT = 0.0348236
export const MORA_RECARGO_MONTHLY_PCT = 1.05
export const MORA_RECARGO_RATE_LABEL_YEAR = 2025

/**
 * Interés mensual de los convenios, sobre saldos. Mismo caso: el texto vigente para 2026 lo trae
 * etiquetado «para el año 2024», 1,00% mensual y 0,0331733% diaria.
 */
export const CONVENIO_MONTHLY_PCT = 1.0
export const CONVENIO_RATE_LABEL_YEAR = 2024

/** Tope de cuotas del convenio por el saldo, una vez descontada la entrega inicial. */
export const CONVENIO_MAX_CUOTAS = 36

/** Cuotas de atraso que hacen caducar el convenio y reviven la deuda original. */
export const CONVENIO_CADUCIDAD_CUOTAS = 3

/** Multa por circular con la patente vencida en dos o más cuotas, sobre la patente anual. */
export const CIRCULAR_MULTA_PCT = 25

/** Veces al año que puede aplicarse esa multa. Cuatro por 25% = el 100% de la patente anual. */
export const CIRCULAR_MULTA_MAX_POR_ANIO = 4

/** Ejercicios fiscales acumulados a partir de los cuales se retiran las placas. */
export const RETIRO_PLACAS_EJERCICIOS = 5

/** Años de prescripción. Son dos relojes distintos y por eso son dos constantes. */
export const PRESCRIPCION_PATENTE_ANIOS = 10
export const PRESCRIPCION_MULTAS_ANIOS = 5

/**
 * Escalones de la multa por mora del art. 30, ya reducidos al 50% como manda el propio artículo
 * para toda deuda que se extinga desde 2019. El porcentaje nominal queda al lado porque es el que
 * figura en el texto y si no está, parece que la cuenta está mal.
 */
export interface MoraTierRate {
  /** Días desde el vencimiento a partir de los cuales aplica (inclusive). */
  fromDays: number
  /** Días hasta los que aplica, o null si es el último escalón. */
  toDays: number | null
  label: string
  nominalPct: number
  /** El que se aplica de verdad: la mitad del nominal. */
  effectivePct: number
}

export const MORA_TIERS: readonly MoraTierRate[] = Object.freeze([
  {
    fromDays: 0,
    toDays: 5,
    label: 'Hasta 5 días hábiles del vencimiento',
    nominalPct: 5,
    effectivePct: 2.5,
  },
  {
    fromDays: 6,
    toDays: 90,
    label: 'De ahí hasta los 90 días corridos',
    nominalPct: 10,
    effectivePct: 5,
  },
  {
    fromDays: 91,
    toDays: null,
    label: 'Pasados los 90 días corridos',
    nominalPct: 20,
    effectivePct: 10,
  },
])

/**
 * El escalón de mora que corresponde a `days` días de atraso.
 *
 * El `Number.isNaN` no es defensivo de más: `Math.floor(NaN)` es `NaN`, toda comparación con NaN
 * da false, el `find` no encuentra nada y el fallback caería en el escalón MÁS CARO. O sea que un
 * campo de texto vacío mostraría un 10% de multa. Se normaliza a 0 antes de comparar.
 */
export function moraTierFor(days: number): MoraTierRate {
  const d = Number.isFinite(days) ? Math.max(0, Math.floor(days)) : days > 0 ? Infinity : 0
  const tier = MORA_TIERS.find(t => d >= t.fromDays && (t.toDays === null || d <= t.toDays))
  // Sólo se llega acá con d === Infinity, que cae en el último escalón abierto igual.
  return tier ?? MORA_TIERS[MORA_TIERS.length - 1]!
}

// ---------------------------------------------------------------------------
// La cuenta
// ---------------------------------------------------------------------------

export interface CarDebtInput {
  /** Lo que pide el vendedor por el auto. */
  askingPrice: number
  /** Patente anual del vehículo, según la consulta del SUCIVE por matrícula y padrón. */
  patenteAnual: number
  /** Tributo de patente adeudado, sin mora ni recargo. */
  tributoAdeudado: number
  /** Días corridos de atraso promedio de esa deuda. */
  diasAtraso: number
  /** Multas de tránsito pendientes, a valor de hoy. */
  multasPendientes: number
  /** Cuántas multas por circular con la patente vencida ya tiene aplicadas. */
  multasPorCircular: number
}

export interface CarDebtBreakdown {
  /** Tributo puro, sin sanciones. */
  tributo: number
  /** Multa por mora del art. 30, ya con la reducción del 50%. */
  multaMora: number
  /** Recargo capitalizable diario acumulado sobre el tributo. */
  recargo: number
  /** El escalón de mora aplicado, para poder mostrarlo. */
  tier: MoraTierRate
  /** Multas de tránsito declaradas. */
  multasTransito: number
  /** Multas del art. 10 por circular con la patente vencida. */
  multasCirculacion: number
  /** Todo lo que hay que saldar para poder transferir. */
  deudaTotal: number
  /** Precio pedido más la deuda: lo que el auto te sale de verdad. */
  costoReal: number
  /** Cuánto de ese costo real es deuda, en porcentaje del total. */
  deudaShare: number
}

const round2 = (n: number): number => Math.round(n * 100) / 100

/** Un número finito y no negativo, o 0. Los inputs vienen de campos de texto. */
function safe(n: number): number {
  return Number.isFinite(n) && n > 0 ? n : 0
}

/**
 * El costo real del auto: precio pedido más todo lo que hay que saldar antes de poder ponerlo a
 * tu nombre.
 *
 * El recargo se compone día por día porque el artículo dice «capitalizable diariamente»: usar una
 * multiplicación simple subestima el número, que es justo el error que hace que la deuda parezca
 * manejable. La multa por mora, en cambio, es un porcentaje único sobre el tributo, no se compone.
 */
export function computeCarDebt(input: CarDebtInput): CarDebtBreakdown {
  const tributo = safe(input.tributoAdeudado)
  const dias = Math.floor(safe(input.diasAtraso))
  const tier = moraTierFor(dias)

  const multaMora = tributo * (tier.effectivePct / 100)
  const recargo = tributo * ((1 + MORA_RECARGO_DAILY_PCT / 100) ** dias - 1)

  const multasTransito = safe(input.multasPendientes)
  const circularCount = Math.min(
    Math.floor(safe(input.multasPorCircular)),
    CIRCULAR_MULTA_MAX_POR_ANIO
  )
  const multasCirculacion = safe(input.patenteAnual) * (CIRCULAR_MULTA_PCT / 100) * circularCount

  const deudaTotal = tributo + multaMora + recargo + multasTransito + multasCirculacion
  const costoReal = safe(input.askingPrice) + deudaTotal

  return {
    tributo: round2(tributo),
    multaMora: round2(multaMora),
    recargo: round2(recargo),
    tier,
    multasTransito: round2(multasTransito),
    multasCirculacion: round2(multasCirculacion),
    deudaTotal: round2(deudaTotal),
    costoReal: round2(costoReal),
    deudaShare: costoReal > 0 ? round2((deudaTotal / costoReal) * 100) : 0,
  }
}

export interface ConvenioPlan {
  cuotas: number
  /** Entrega inicial: el total dividido la cantidad de cuotas más una. */
  entregaInicial: number
  /** Saldo que se financia después de la entrega. */
  saldo: number
  /** Cuota mensual por sistema francés sobre el saldo. */
  cuotaMensual: number
  /** Suma de la entrega más todas las cuotas. */
  totalPagado: number
  /** Cuánto se paga de más contra saldar al contado. */
  costoFinanciero: number
}

/**
 * El convenio del art. 25: entrega inicial dentro de los tres días hábiles de firmar, que no
 * puede ser menor al total dividido la cantidad de cuotas más una, y el saldo en hasta 36 cuotas
 * mensuales con interés sobre saldos.
 *
 * La entrega inicial se calcula sobre el TOTAL, no sobre el saldo: el artículo dice «el total de
 * la deuda dividido la cantidad de cuotas más una». Con 36 cuotas eso es el total dividido 37,
 * no dividido 36 — y esa diferencia de una cuota es la que hace que la cuenta cierre.
 */
export function computeConvenio(
  deudaTotal: number,
  cuotas: number,
  monthlyPct: number = CONVENIO_MONTHLY_PCT
): ConvenioPlan {
  const total = safe(deudaTotal)
  const n = Math.min(Math.max(Math.floor(safe(cuotas)), 1), CONVENIO_MAX_CUOTAS)

  const entregaInicial = total / (n + 1)
  const saldo = total - entregaInicial

  const i = monthlyPct / 100
  // Sistema francés. Con interés cero degenera en el saldo repartido en partes iguales.
  const cuotaMensual = i === 0 ? saldo / n : (saldo * i) / (1 - (1 + i) ** -n)

  const totalPagado = entregaInicial + cuotaMensual * n

  return {
    cuotas: n,
    entregaInicial: round2(entregaInicial),
    saldo: round2(saldo),
    cuotaMensual: round2(cuotaMensual),
    totalPagado: round2(totalPagado),
    costoFinanciero: round2(totalPagado - total),
  }
}

// ---------------------------------------------------------------------------
// Antes de señar
// ---------------------------------------------------------------------------

export interface CheckStep {
  title: string
  detail: string
}

export const BEFORE_BUYING_STEPS: readonly CheckStep[] = Object.freeze([
  {
    title: 'Pedile matrícula y padrón, no fotos',
    detail:
      'Son los dos únicos datos que necesitás y están a la vista en la chapa y en la libreta. Un vendedor que no te los pasa te está diciendo algo. Con eso ya podés hacer la consulta rápida de deuda en el SUCIVE sin gastar un peso.',
  },
  {
    title: 'Hacé primero la consulta gratuita',
    detail:
      'La consulta de deuda del SUCIVE por matrícula y padrón es gratis y te da el orden de magnitud en un minuto. Si ahí ya aparece un número grande, te ahorraste el certificado y la visita.',
  },
  {
    title: 'Después sí, el Certificado SUCIVE',
    detail:
      'Cuando el auto te interesa en serio y antes de entregar plata, pedí el certificado: es el único documento con carácter liberatorio, cubre las multas de la Policía Nacional de Tránsito y los peajes que la consulta rápida no te muestra, y vale por el día.',
  },
  {
    title: 'Contá los ejercicios, no los pesos',
    detail:
      'Antes de negociar el precio fijate cuántos años de patente se acumulan. Debajo de cinco ejercicios el problema es plata y se negocia. En cinco o más el vehículo entra en el régimen de retiro de placas y depósito, y eso ya no se arregla con un descuento.',
  },
  {
    title: 'Que la deuda se salde ANTES de la firma, no después',
    detail:
      'La transferencia está bloqueada mientras exista deuda, así que la secuencia sana es: se salda, se libera el bloqueo, se transfiere, se paga el saldo del precio. Cualquier orden que te deje pagando primero y transfiriendo «cuando se pueda» te deja sin auto y sin plata a la vez.',
  },
  {
    title: 'Si igual lo comprás con deuda, dejalo escrito',
    detail:
      'Quién paga qué, con qué plazo, y qué pasa si la transferencia no sale. Sin eso, la única palanca que te queda contra alguien que ya cobró es un juicio civil por incumplimiento del contrato, que es exactamente lo que estabas tratando de evitar comprando barato.',
  },
])

// ---------------------------------------------------------------------------
// FAQ
// ---------------------------------------------------------------------------

export interface CarDebtFaq {
  question: string
  short: string
  answer: string
}

export const CAR_DEBT_FAQ: readonly CarDebtFaq[] = Object.freeze([
  {
    question: 'Compré un auto con deuda de patente. ¿La deuda ahora es mía?',
    short: 'No como obligación personal, pero te bloquea la transferencia igual.',
    answer:
      'La deuda está asentada contra el vehículo: el Certificado SUCIVE se pide por matrícula y padrón, y es el vehículo el que queda trabado. Lo que no encontramos es una norma que diga qué pasa con la responsabilidad personal del titular anterior después de la venta: el texto ordenado no define el sujeto pasivo del tributo —eso lo hace el decreto de cada intendencia— y la ley 18.456 sólo regula dónde se empadrona. Así que no afirmamos ni que el vendedor sigue debiendo ni que dejó de deber. Lo que sí es seguro y es lo que te afecta: hasta que esa deuda se salde no vas a poder poner el auto a tu nombre.',
  },
  {
    question: '¿Puedo circular igual mientras tanto?',
    short:
      'Podés, pero con dos cuotas vencidas se multa el 25% de la patente, hasta 4 veces al año.',
    answer:
      'Circular con la patente vencida en dos o más cuotas se sanciona con una multa equivalente al 25% de la patente anual del vehículo, aplicable hasta cuatro veces al año con un mes de separación entre una y otra. Cuatro por 25% da el 100% de la patente anual sumado a la patente que ya debías. Y en Montevideo esto no depende de que te pare un inspector: la Intendencia lo fiscaliza con cámaras de reconocimiento de matrícula desde febrero de 2018.',
  },
  {
    question: '¿Los radares de velocidad detectan la deuda de patente?',
    short: 'Es un sistema de cámaras distinto, pero sí: leen matrículas y detectan la deuda.',
    answer:
      'La duda es razonable porque un radar de velocidad está configurado para medir velocidad. Pero el control de deuda de patente no lo hace el radar: lo hace un sistema de cámaras de reconocimiento de matrícula que la Intendencia de Montevideo puso a funcionar el 1º de febrero de 2018, justamente para detectar vehículos con dos o más cuotas vencidas. La norma lo respalda por partida doble: el artículo 10 del texto ordenado crea la infracción, y el artículo 31 de la ley 19.824 prevé expresamente el caso en que la autoridad tomó conocimiento del hecho «a través de los medios de captación y reproducción de imágenes que permitan la identificación del vehículo».',
  },
  {
    question: '¿Es verdad que en el peaje no te levantan la barrera si debés?',
    short: 'Sí, pero por deuda de peaje, no de patente.',
    answer:
      'La medida existe y es de la Corporación Vial del Uruguay: quienes acumulan deuda de peaje por encima del umbral —que se bajó a $ 150.000— tienen que parar obligatoriamente en la cabina y pasar por la oficina comercial a regularizar antes de seguir. Pero es deuda de PEAJE. Deber patente no te traba el peaje. Lo que sí conviene saber es que esa deuda de peaje también figura en el Certificado SUCIVE, así que si estás por comprar un auto que anduvo mucho en ruta, ahí la vas a ver.',
  },
  {
    question: 'El auto que quiero comprar tiene deuda de hace ocho años. ¿Prescribió?',
    short: 'No: la patente prescribe a los diez y hay que pedirla con resolución del intendente.',
    answer:
      'A los ocho años no. El tributo de patente prescribe a los diez años contados desde la terminación del año civil en que se produjo el hecho gravado, no a los cinco: los cinco años son los de las multas de tránsito, que es otro reloj sobre el mismo vehículo. Y aunque los diez estuvieran cumplidos tampoco se cae sola: el artículo 18 exige sin excepciones un acto administrativo —resolución del intendente o de quien haga sus veces— que disponga la prescripción. En Montevideo es un trámite sin costo, con formulario firmado, cédula del titular y documentación que acredite la propiedad. Fijate en el detalle que arruina el plan: lo tiene que pedir quien acredite la propiedad, y si no pudiste transferir, ese no sos vos.',
  },
  {
    question: '¿Le puedo hacer un convenio y transferirlo mientras pago las cuotas?',
    short: 'No. Las cuotas de convenio pendientes bloquean la transferencia igual que la deuda.',
    answer:
      'El artículo 45 nombra expresamente las cuotas de convenios interdepartamentales entre lo que impide transferir, así que el convenio no destraba la venta. Sirve para otra cosa, que igual es valiosa: dejás de acumular sanciones y ordenás el pago en hasta 36 cuotas mensuales, con una entrega inicial que hay que pagar dentro de los tres días hábiles de firmar y que no puede ser menor al total dividido la cantidad de cuotas más una. Ojo con la caducidad: con tres cuotas de atraso el convenio se cae y revive la deuda original completa, y no podés firmar uno nuevo si en los últimos 360 días caducaron tres del mismo tipo en ese departamento.',
  },
  {
    question: '¿En qué momento pasa de ser un problema de plata a un problema serio?',
    short: 'A los cinco ejercicios fiscales acumulados: ahí se retiran las placas y va a depósito.',
    answer:
      'El corte está en cinco. Con cinco o más ejercicios fiscales de deuda acumulados caduca el permiso de circulación que implica poseer la placa, los servicios inspectivos de cualquier departamento donde se constate la infracción están facultados para retirar las matrículas, y el vehículo se retira de la vía pública y se deposita. Sólo lo saca del depósito quien esté inscripto en el registro vehicular departamental, con la situación tributaria regularizada y previo pago de la multa y de los gastos, que son de su cargo. Si nadie lo retira se aplica la ley 18.791. Por eso al mirar una publicación importa más contar años que mirar el total en pesos.',
  },
  {
    question: '¿Y si el auto queda a nombre del vendedor y me para tránsito?',
    short: 'La infracción de tránsito se aplica al conductor; el bloqueo del vehículo sigue igual.',
    answer:
      'Circular con un vehículo que está a nombre de otra persona no es en sí una infracción. Lo que cambia es quién puede hacer algo con el auto: los trámites, el reempadronamiento, la venta y el retiro del depósito los hace el titular registral, que no sos vos. Y la multa por circular con la patente vencida la vas a comer vos, que sos el que circula, sobre un tributo que no podés ni siquiera pagar del todo mientras haya deuda vieja porque los conceptos vencidos más antiguos se pagan primero.',
  },
  {
    question: '¿Por qué pagamos patente?',
    short: 'Es un recurso departamental que fija la Constitución, no un servicio que te presten.',
    answer: PATENTE_WHY,
  },
])
