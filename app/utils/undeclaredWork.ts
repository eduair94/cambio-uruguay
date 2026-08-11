// app/utils/undeclaredWork.ts
// Datos de /denunciar-trabajo-en-negro-uruguay: qué se puede hacer cuando el empleador no te
// declara, adónde va cada cosa y qué pide cada puerta.
//
// POR QUÉ EXISTE: la pregunta llega tal cual —«mi empleadora nos mantiene en negro a las
// educadoras, ¿hay algo que se podría hacer, contactar al ministerio de trabajo o algo?»— y el
// sitio no tenía una sola página que la contestara. Tenía el laudo (`wageCouncils.ts`), el seguro
// de paro (`unemploymentBenefit.ts`) y el ruteo de reclamos (`complaintRouting.ts`), todos
// escritos para quien SÍ está registrado.
//
// LA TESIS DE LA PÁGINA: no hay «una» denuncia. Hay TRES puertas que resuelven cosas distintas,
// no se reemplazan entre sí y tienen requisitos incompatibles:
//   1. MTSS / Inspección General del Trabajo → que la irregularidad PARE y se sancione. Anónima,
//      pero exige vínculo vigente e infracción en curso: se cierra el día que dejás de trabajar ahí.
//   2. BPS → que tus aportes EXISTAN (jubilación, prestaciones). No exige vínculo vigente y llega
//      hasta el 1/4/1996 hacia atrás.
//   3. Conciliación previa en el MTSS → juicio laboral → que te PAGUEN lo que te deben.
// Publicar «denunciá en el ministerio» a secas manda a mucha gente a la puerta equivocada: la
// propia página del MTSS enumera los casos en los que esa oficina NO recibe denuncias, y el
// primero es justamente el de quien ya fue desvinculado.
//
// EL DATO QUE NADIE SABE, y que ordena la sección de riesgos: el artículo 8 de la Ley 16.074 hace
// que el BSE te atienda y te indemnice AUNQUE tu patrón no te haya asegurado —o sea, estar en
// negro no te deja sin cobertura de accidente—, pero el mismo artículo manda calcular esa
// indemnización «tomando como base un salario mínimo nacional». Cubierta sí; a valor de SMN, no
// del sueldo real. Las dos mitades tienen que ir juntas o la frase miente en cualquiera de los
// dos sentidos.
//
// EL OTRO, del lado del trabajador: el artículo 88 de la Ley 16.713 se llama literalmente «derecho
// de iniciativa del trabajador» y permite SUPLIR al empleador en la declaración, individual o
// colectivamente. La denuncia ante BPS no es un favor que se pide: es un derecho con nombre.
//
// LO QUE NO SE PUBLICA ACÁ: importes de multas de BPS (su escala convive con la del artículo 281
// de la Ley 18.834 y con comunicados internos, y republicarla mal es peor que no publicarla),
// ninguna promesa sobre el resultado de una denuncia, y ningún «no te puede pasar nada»: no hay
// fuero general del denunciante y decir lo contrario expone a alguien. La única protección
// explícita contra la represalia que el ordenamiento da es la sindical (Ley 17.940, artículo 1).
//
// FUENTES PRIMARIAS, verificadas el 2026-08-11 (IMPO leído en /bases/leyes/ = texto VIGENTE, no en
// /bases/leyes-originales/):
//   - MTSS, «Denuncias y asesoramiento en la Inspección General del Trabajo»: requisitos, anonimato,
//     quiénes pueden denunciar, canales, y la lista de casos en que la oficina NO recibe denuncias.
//     https://www.gub.uy/ministerio-trabajo-seguridad-social/politicas-y-gestion/denuncias-laborales
//   - IMPO, Decreto 371/022, artículo 23: «Las denuncias serán anónimas», tramitación reservada, y
//     la excepción escrita e identificada para derechos fundamentales.
//     https://www.impo.com.uy/bases/decretos/371-2022/23
//   - IMPO, Ley 15.903, artículo 289 (texto vigente): amonestación / multa / clausura de la IGT,
//     multa de 1 a 150 jornales por cada trabajador comprendido, se duplica en reincidencia,
//     clausura de hasta 6 días con los sueldos igualmente a cargo de la empresa.
//     https://www.impo.com.uy/bases/leyes/15903-1987/289
//   - IMPO, Ley 16.713, artículo 87 (obligación del empleador de presentar la declaración, se
//     hayan hecho o no los aportes) y artículo 88 («Derecho de iniciativa del trabajador»: puede
//     suplir a su empleador, individual o colectivamente; y quien trabajó después del 1/4/1996 sin
//     figurar debe pedir su inclusión) y artículo 89 (la información está siempre disponible).
//     https://www.impo.com.uy/bases/leyes/16713-1995/87
//     https://www.impo.com.uy/bases/leyes/16713-1995/88
//     https://www.impo.com.uy/bases/leyes/16713-1995/89
//   - BPS, «Denuncias de trabajadores» (período posterior al 1/4/1996, documentación).
//     https://www.bps.gub.uy/11439/denuncias-de-trabajadores.html
//   - BPS, «Nueva vía para el ingreso de denuncias de trabajadores» (servicio en línea «Denunciar
//     diferencias de salarios y actividades no declaradas», usuario personal BPS).
//     https://www.bps.gub.uy/19111/nueva-via-para-el-ingreso-de-denuncias-de-trabajadores.html
//   - BPS, «Denuncias de terceras personas sobre presuntos incumplimientos» (formulario + copia de
//     documento del denunciante: no es la vía anónima).
//     https://www.bps.gub.uy/19608/denuncias-de-terceras-personas-sobre-presuntos-incumplimientos.html
//   - BPS, «Constancia de historia laboral nominada»: detalle de servicios y remuneraciones
//     registrados desde el 1/4/1996. Es el paso 0, el que convierte una sospecha en un dato.
//     https://www.bps.gub.uy/11438/constancia-de-historia-laboral-nominada.html
//   - IMPO, Ley 18.091, artículos 1, 2 y 3: prescripción al año desde el día siguiente al cese;
//     los créditos prescriben a los cinco años desde que pudieron ser exigibles; y la sola
//     presentación ante el MTSS pidiendo audiencia de conciliación INTERRUMPE la prescripción.
//     https://www.impo.com.uy/bases/leyes/18091-2007/1
//     https://www.impo.com.uy/bases/leyes/18091-2007/2
//     https://www.impo.com.uy/bases/leyes/18091-2007/3
//   - IMPO, Ley 18.572, artículo 3 (conciliación previa obligatoria antes del juicio laboral;
//     asistencia letrada salvo reclamos inferiores a 20 UR) y artículo 4 (la incomparecencia del
//     citado y la omisión de individualizar a un tercero son presunciones simples contrarias a su
//     interés en el proceso ulterior).
//     https://www.impo.com.uy/bases/leyes/18572-2009/3
//     https://www.impo.com.uy/bases/leyes/18572-2009/4
//   - MTSS, trámite «Audiencias de conciliación» (en línea por SAW con identidad digital, gratis).
//     https://www.gub.uy/tramites/audiencias-conciliacion
//   - IMPO, Ley 16.074, artículo 8 (el BSE asiste e indemniza con independencia de que el patrono
//     haya asegurado o no, y para dependientes de patronos no asegurados la indemnización se
//     calcula «tomando como base un salario mínimo nacional») y artículo 56 (multa del doble de
//     las primas omitidas la primera vez y del cuádruplo en las siguientes, mínimo 50 UR y 200 UR
//     en cada reincidencia, más la facultad de solicitar clausura).
//     https://www.impo.com.uy/bases/leyes/16074-1989/8
//     https://www.impo.com.uy/bases/leyes/16074-1989/56
//   - IMPO, Ley 17.940, artículo 1: es absolutamente nula cualquier discriminación tendiente a
//     menoscabar la libertad sindical. Es la única protección explícita contra la represalia.
//     https://www.impo.com.uy/bases/leyes/17940-2006/1
//   - IMPO, Ley 18.437, artículo 101 (texto VIGENTE, redacción dada por la Ley 19.889 artículo
//     179): autorizar, registrar, supervisar y sancionar a los centros de educación infantil
//     privados —«desde la observación hasta la clausura definitiva»— es cometido del INAU.
//     OJO, TRAMPA: el Decreto 268/014 (2014) sigue diciendo en su artículo 1 que autoriza la
//     Dirección de Educación del MEC, porque es anterior al cambio. Guiarse por el decreto manda
//     al lector al organismo equivocado. El propio MEC publicó el comunicado de transición: desde
//     el 1/1/2021 no emite más autorizaciones y sus informes van al INAU.
//     https://www.impo.com.uy/bases/leyes/18437-2008/101
//     https://www.gub.uy/ministerio-educacion-cultura/comunicado-transicion
//   - IMPO, Decreto 268/014, artículo 2 (vigencia de hasta dos años de la autorización) y artículo
//     6 (proporción mínima de personas adultas por edad de los niños).
//     https://www.impo.com.uy/bases/decretos/268-2014
//   - INAU, Registro Nacional de CPIP autorizados (dónde se verifica si el centro está autorizado).
//     La URL vieja del ítem 3168 redirige con un 301: se publica la definitiva.
//     https://www.inau.gub.uy/primera-infancia-centros-privados/registro-nacional-de-cpip-autorizados-por-inau
//   - BPS, «Trabajadores»: el listado de prestaciones (afiliación mutual, subsidio por enfermedad,
//     subsidio por maternidad y paternidad, asignación familiar, subsidio por desempleo, jubilación).
//     Los nombres van como los publica BPS.
//     https://www.bps.gub.uy/10274/trabajadores.html
//   - PIT-CNT, ficha del SINTEP (Sindicato Nacional de Trabajadores de la Enseñanza Privada).
//     Importa porque el Decreto 371/022 admite la denuncia de representantes de organizaciones y
//     porque la represalia sindical es nula.
//     OJO: sintep.org.uy responde 403 a cualquier lectura automatizada, así que la afirmación se
//     acota a lo que SÍ se pudo reabrir —que es el sindicato de rama de la enseñanza privada— y no
//     se publica el detalle de subgrupos que aparecía en resúmenes de buscador sin poder
//     contrastarlo en la fuente.
//     https://www.pitcnt.uy/sintep-sindicato-nacional-de-trabajadores-de-la-ensenanza-privada
//
// EL SEGURO DE PARO NO SE RE-DERIVA ACÁ: el requisito de 180 días en planilla sale de
// `unemploymentBenefit.ts`, que ya está auditado. Esta página sólo lo cita como consecuencia.

/** Fecha en que cada afirmación y cada canal de este módulo se contrastó con las fuentes de arriba. */
export const UNDECLARED_VERIFIED_AT = '2026-08-11'

export interface UndeclaredSource {
  label: string
  url: string
}

export const UNDECLARED_SOURCES: readonly UndeclaredSource[] = Object.freeze([
  {
    label:
      'MTSS — Denuncias y asesoramiento en la Inspección General del Trabajo (requisitos, canales y los casos que NO recibe)',
    url: 'https://www.gub.uy/ministerio-trabajo-seguridad-social/politicas-y-gestion/denuncias-laborales',
  },
  {
    label:
      'IMPO — Decreto 371/022, artículo 23 (las denuncias son anónimas y se tramitan reservadas)',
    url: 'https://www.impo.com.uy/bases/decretos/371-2022/23',
  },
  {
    label:
      'IMPO — Ley 15.903, artículo 289 (sanciones de la Inspección: amonestación, multa de 1 a 150 jornales por trabajador, clausura)',
    url: 'https://www.impo.com.uy/bases/leyes/15903-1987/289',
  },
  {
    label:
      'IMPO — Ley 16.713, artículo 87 (obligación del empleador de declarar, haya pagado o no)',
    url: 'https://www.impo.com.uy/bases/leyes/16713-1995/87',
  },
  {
    label:
      'IMPO — Ley 16.713, artículo 88 (derecho de iniciativa del trabajador: puede suplir al empleador, individual o colectivamente)',
    url: 'https://www.impo.com.uy/bases/leyes/16713-1995/88',
  },
  {
    label:
      'IMPO — Ley 16.713, artículo 89 (la historia laboral está siempre disponible para su titular)',
    url: 'https://www.impo.com.uy/bases/leyes/16713-1995/89',
  },
  {
    label:
      'BPS — Denuncias de trabajadores (irregularidades en la historia laboral desde el 1/4/1996)',
    url: 'https://www.bps.gub.uy/11439/denuncias-de-trabajadores.html',
  },
  {
    label:
      'BPS — Nueva vía para el ingreso de denuncias de trabajadores (servicio en línea con usuario personal)',
    url: 'https://www.bps.gub.uy/19111/nueva-via-para-el-ingreso-de-denuncias-de-trabajadores.html',
  },
  {
    label: 'BPS — Denuncias de terceras personas sobre presuntos incumplimientos',
    url: 'https://www.bps.gub.uy/19608/denuncias-de-terceras-personas-sobre-presuntos-incumplimientos.html',
  },
  {
    label:
      'BPS — Constancia de historia laboral nominada (servicios y remuneraciones desde el 1/4/1996)',
    url: 'https://www.bps.gub.uy/11438/constancia-de-historia-laboral-nominada.html',
  },
  {
    label: 'IMPO — Ley 18.091, artículo 1 (las acciones prescriben al año del cese)',
    url: 'https://www.impo.com.uy/bases/leyes/18091-2007/1',
  },
  {
    label: 'IMPO — Ley 18.091, artículo 2 (los créditos laborales prescriben a los cinco años)',
    url: 'https://www.impo.com.uy/bases/leyes/18091-2007/2',
  },
  {
    label:
      'IMPO — Ley 18.091, artículo 3 (pedir audiencia de conciliación en el MTSS interrumpe la prescripción)',
    url: 'https://www.impo.com.uy/bases/leyes/18091-2007/3',
  },
  {
    label:
      'IMPO — Ley 18.572, artículo 3 (conciliación previa obligatoria; abogado salvo reclamos menores a 20 UR)',
    url: 'https://www.impo.com.uy/bases/leyes/18572-2009/3',
  },
  {
    label:
      'IMPO — Ley 18.572, artículo 4 (no comparecer a la audiencia es presunción simple contraria a su interés)',
    url: 'https://www.impo.com.uy/bases/leyes/18572-2009/4',
  },
  {
    label: 'MTSS — Trámite «Audiencias de conciliación» (solicitud en línea por SAW, sin costo)',
    url: 'https://www.gub.uy/tramites/audiencias-conciliacion',
  },
  {
    label:
      'IMPO — Ley 16.074, artículo 8 (el BSE cubre aunque el patrono no haya asegurado, con la indemnización calculada sobre un salario mínimo nacional)',
    url: 'https://www.impo.com.uy/bases/leyes/16074-1989/8',
  },
  {
    label:
      'IMPO — Ley 16.074, artículo 56 (multa al patrono no asegurado: mínimo 50 UR, 200 UR en reincidencia)',
    url: 'https://www.impo.com.uy/bases/leyes/16074-1989/56',
  },
  {
    label: 'IMPO — Ley 17.940, artículo 1 (nulidad absoluta de la discriminación antisindical)',
    url: 'https://www.impo.com.uy/bases/leyes/17940-2006/1',
  },
  {
    label:
      'IMPO — Ley 18.437, artículo 101, texto vigente (el INAU autoriza, registra, supervisa y sanciona los centros de educación infantil privados)',
    url: 'https://www.impo.com.uy/bases/leyes/18437-2008/101',
  },
  {
    label: 'MEC — Comunicado de transición: desde el 1/1/2021 las autorizaciones las emite el INAU',
    url: 'https://www.gub.uy/ministerio-educacion-cultura/comunicado-transicion',
  },
  {
    label: 'IMPO — Decreto 268/014 (vigencia de la autorización y proporción de adultos por edad)',
    url: 'https://www.impo.com.uy/bases/decretos/268-2014',
  },
  {
    label: 'INAU — Registro Nacional de centros de primera infancia privados autorizados',
    url: 'https://www.inau.gub.uy/primera-infancia-centros-privados/registro-nacional-de-cpip-autorizados-por-inau',
  },
  {
    label: 'BPS — Trabajadores: las prestaciones que se liquidan sobre la actividad declarada',
    url: 'https://www.bps.gub.uy/10274/trabajadores.html',
  },
  {
    label: 'PIT-CNT — SINTEP, sindicato de la enseñanza privada',
    url: 'https://www.pitcnt.uy/sintep-sindicato-nacional-de-trabajadores-de-la-ensenanza-privada',
  },
])

/** La corrección de fondo: «en negro» no es un régimen distinto, es un incumplimiento. */
export const UNDECLARED_CORE_IDEA =
  'Estar en negro no te quita derechos: te quita la prueba y los aportes. El sueldo del laudo, el aguinaldo, la licencia, el salario vacacional y la indemnización por despido se deben igual, porque nacen de haber trabajado y no de figurar en una planilla. Lo que sí desaparece es todo lo que el BPS liquida a partir de la actividad declarada —jubilación, seguro de paro, subsidios— y la facilidad para probar cuánto cobrabas y desde cuándo. Por eso el orden importa: primero juntar prueba, después elegir la puerta.'

export interface UndeclaredDoorChannel {
  /** Qué es el canal (correo, oficina, servicio en línea). */
  label: string
  /** Dato de contacto o dirección, tal como lo publica el organismo. */
  value: string
  /** Enlace oficial, si el canal lo tiene. */
  url?: string
}

export interface UndeclaredDoor {
  n: number
  /** Ancla en la página. */
  id: string
  organism: string
  /** Qué resuelve esta puerta, en una línea. */
  goal: string
  detail: string
  /** Condiciones para que la denuncia sea recibida. */
  requirements: readonly string[]
  /** Lo que esta puerta NO hace: es la mitad que evita el viaje al organismo equivocado. */
  doesNot: string
  channels: readonly UndeclaredDoorChannel[]
  /** Norma o página oficial que respalda lo de arriba. */
  basis: string
}

export const UNDECLARED_DOORS: readonly UndeclaredDoor[] = Object.freeze([
  {
    n: 1,
    id: 'mtss',
    organism: 'MTSS — Inspección General del Trabajo',
    goal: 'Que la irregularidad pare mientras seguís trabajando ahí',
    detail:
      'Es la denuncia que dispara una inspección. Se puede hacer sin dar tu nombre: el Decreto 371/022 dice que las denuncias son anónimas y que se tramitan con carácter reservado dentro de la Inspección. Puede presentarla la trabajadora en actividad, un representante sindical o un tercero ajeno a la relación. Si la inspección constata la infracción, la escala del artículo 289 de la Ley 15.903 va de la amonestación —que mete a la empresa en el Registro de Infractores a las Normas Laborales— a una multa de entre 1 y 150 jornales por cada trabajador comprendido en la infracción, que se duplica si hay reincidencia, y hasta la clausura del establecimiento por un máximo de seis días, durante los cuales la empresa igual tiene que pagar los sueldos.',
    requirements: [
      'Vínculo laboral vigente: la oficina no recibe denuncias de quien ya renunció o fue despedido.',
      'Que la infracción esté ocurriendo al momento de denunciar.',
      'Aportar el RUT o los datos del probable empleador y la dirección exacta donde ocurren los incumplimientos.',
      'La denuncia por acoso, persecución sindical o discriminación es la excepción: va por escrito, con tu identidad y con las pruebas que tengas.',
    ],
    doesNot:
      'No te cobra la plata. La propia oficina aclara que no hace cálculos de liquidaciones por deudas laborales: eso es de la Dirección Nacional de Trabajo, y cobrar es de la conciliación y el juicio.',
    channels: [
      {
        label: 'Correo electrónico',
        value: 'asesoramientoydenuncias@mtss.gub.uy',
      },
      {
        label: 'Presencial en Montevideo',
        value:
          'Oficina de Asesoramiento y Denuncias, oficina 108, 1er piso, Juncal 1511. Lunes a viernes de 9:00 a 16:00.',
      },
      {
        label: 'Interior del país',
        value: 'Oficinas de Trabajo del Interior',
        url: 'https://www.gub.uy/ministerio-trabajo-seguridad-social/politicas-y-gestion/0800-7171-dependencias-del-interior',
      },
      {
        label: 'Si la infracción ya no está ocurriendo',
        value:
          'División Consultas de DINATRA, agendando al 0800 7171 o al 098 00 71 71, o por la consulta laboral web',
        url: 'https://www.gub.uy/ministerio-trabajo-seguridad-social/politicas-y-gestion/consultas-laborales-salariales-via-web',
      },
    ],
    basis:
      'Decreto 371/022 artículo 23 · Ley 15.903 artículo 289 · MTSS, «Denuncias y asesoramiento en la IGT»',
  },
  {
    n: 2,
    id: 'bps',
    organism: 'BPS',
    goal: 'Que los años trabajados existan en tu historia laboral',
    detail:
      'El artículo 87 de la Ley 16.713 pone la obligación de declarar del lado del empleador, y aclara que la declaración debe presentarse se hayan efectuado o no los aportes. El 88 se llama, literalmente, «derecho de iniciativa del trabajador»: si el empleador incumple, el trabajador dependiente —individual o colectivamente— puede suplirlo, y quien trabajó después del 1.º de abril de 1996 sin figurar en el registro debe solicitar su inclusión. O sea que denunciar acá no es pedir un favor: es ejercer un derecho con nombre propio. Sirve igual si te declaran menos de lo que cobrás, porque el mismo canal trata las diferencias de salarios.',
    requirements: [
      'El período denunciado tiene que ser posterior al 1.º de abril de 1996, que es desde cuándo existe el registro de historia laboral.',
      'Conviene adjuntar lo que tengas: recibos, comprobantes de pago, sentencias o cualquier documento que demuestre lo denunciado.',
      'Para el servicio en línea necesitás usuario personal BPS; también se puede hacer presencial en sucursales.',
      'No exige vínculo vigente: se puede denunciar habiendo dejado el trabajo.',
    ],
    doesNot:
      'No te paga el aguinaldo ni la licencia que te quedaron sin cobrar. Repara el registro y persigue el tributo; los créditos laborales se reclaman por la otra puerta.',
    channels: [
      {
        label: 'Servicio en línea',
        value:
          '«Denunciar diferencias de salarios y actividades no declaradas», con usuario personal BPS',
        url: 'https://www.bps.gub.uy/19111/nueva-via-para-el-ingreso-de-denuncias-de-trabajadores.html',
      },
      {
        label: 'Paso previo',
        value:
          'Constancia de historia laboral nominada: el detalle de lo registrado desde el 1/4/1996',
        url: 'https://www.bps.gub.uy/11438/constancia-de-historia-laboral-nominada.html',
      },
      {
        label: 'Si sos un tercero ajeno a la relación',
        value: 'Formulario de denuncias de terceros, que pide copia del documento del denunciante',
        url: 'https://www.bps.gub.uy/19608/denuncias-de-terceras-personas-sobre-presuntos-incumplimientos.html',
      },
    ],
    basis: 'Ley 16.713 artículos 87, 88 y 89 · BPS, «Denuncias de trabajadores»',
  },
  {
    n: 3,
    id: 'conciliacion',
    organism: 'MTSS — Conciliación previa, y después el juzgado',
    goal: 'Que te paguen lo que te deben',
    detail:
      'Antes de iniciar un juicio laboral hay que intentar la conciliación: la exige el artículo 3 de la Ley 18.572, ante el Centro de Negociación de Conflictos Individuales de Trabajo en Montevideo o ante la Oficina de Trabajo del interior que corresponda al domicilio del empleador o al lugar donde trabajaste. La solicitud se hace en línea por el sistema SAW con identidad digital y no tiene costo. Dos detalles que juegan a favor: pedir la audiencia interrumpe la prescripción —lo dice el artículo 3 de la Ley 18.091—, y si el empleador citado no comparece, esa incomparecencia es una presunción simple contraria a su interés en el juicio posterior (artículo 4 de la Ley 18.572).',
    requirements: [
      'Hay que detallar por escrito los hechos, los rubros reclamados y el monto de cada uno.',
      'Asistencia de abogado, salvo que el total reclamado sea inferior a 20 UR.',
      'La audiencia es presencial aunque la solicitud se haga por internet.',
      'Corren los plazos de prescripción: ver el reloj más abajo.',
    ],
    doesNot:
      'No repara por sí sola tu historia laboral en BPS ni sanciona a la empresa: eso es de las otras dos puertas. Y la conciliación no obliga a acordar, sólo a intentarlo.',
    channels: [
      {
        label: 'Trámite oficial',
        value: 'Audiencias de conciliación, MTSS',
        url: 'https://www.gub.uy/tramites/audiencias-conciliacion',
      },
      {
        label: 'Si ya te desvinculaste',
        value:
          'El reclamo se canaliza en el Centro de Asesoramiento del MTSS (Juncal 1511, planta baja) o en las Oficinas de Trabajo del Interior',
      },
    ],
    basis:
      'Ley 18.572 artículos 3 y 4 · Ley 18.091 artículo 3 · MTSS, trámite «Audiencias de conciliación»',
  },
])

export interface UndeclaredClockRule {
  label: string
  detail: string
  norm: string
}

/** El reloj. Es lo que decide si conviene moverse hoy o si ya no hay nada que hacer. */
export const UNDECLARED_CLOCK: readonly UndeclaredClockRule[] = Object.freeze([
  {
    label: 'Un año desde que te vas',
    detail:
      'Las acciones originadas en las relaciones de trabajo prescriben al año, contado a partir del día siguiente a aquel en que cesó la relación laboral. Mientras seguís trabajando ahí, ese año todavía no arrancó.',
    norm: 'Ley 18.091, artículo 1',
  },
  {
    label: 'Cinco años hacia atrás',
    detail:
      'Los créditos o prestaciones laborales prescriben a los cinco años contados desde la fecha en que pudieron ser exigibles. Es el otro filo del reloj: no se reclama lo de toda la vida, se reclama lo de los últimos cinco años.',
    norm: 'Ley 18.091, artículo 2',
  },
  {
    label: 'Presentarte en el MTSS frena el reloj',
    detail:
      'La sola presentación del trabajador o su representante ante el MTSS solicitando la audiencia de conciliación interrumpe la prescripción. Es gratis y se pide en línea: si el año se está por cumplir, ese es el movimiento.',
    norm: 'Ley 18.091, artículo 3',
  },
])

export interface UndeclaredConsequence {
  title: string
  detail: string
  /** Enlace interno del sitio que desarrolla el tema, si existe. */
  to?: string
}

/** Lo que se pierde mientras no hay aportes declarados. Nada de esto se recupera solo. */
export const UNDECLARED_LOSSES: readonly UndeclaredConsequence[] = Object.freeze([
  {
    title: 'Seguro de paro',
    detail:
      'Si te quedás sin trabajo, el subsidio por desempleo pide días registrados en planilla en los meses previos: en industria y comercio, 180 días en los últimos 12. Los meses en negro no se cuentan, así que se puede llegar al despido con años trabajados y sin derecho a un peso.',
    to: '/seguro-de-paro-uruguay',
  },
  {
    title: 'Jubilación',
    detail:
      'La jubilación se arma con lo que figura en el registro de historia laboral. Un año no declarado es un año que no existe cuando llegue el momento de computar servicios, y recuperarlo después exige probar lo que hoy tenés a mano.',
  },
  {
    title: 'Salud y subsidios del BPS',
    detail:
      'La afiliación mutual del seguro de salud, el subsidio por enfermedad, el subsidio por maternidad y paternidad y la asignación familiar son prestaciones que BPS tramita sobre la actividad que la empresa declara. Un período no declarado no aparece en ese expediente, así que lo prudente antes de necesitarlas es consultar el caso concreto en el propio BPS.',
  },
  {
    title: 'Accidente de trabajo: cubierta, pero a valor de salario mínimo',
    detail:
      'Acá hay una mitad buena y una mala, y las dos son del mismo artículo. El Banco de Seguros del Estado presta asistencia médica y paga las indemnizaciones a todos los trabajadores comprendidos «con independencia de que sus patronos hayan cumplido o no con la obligación de asegurarlos»: estar en negro no te deja sin cobertura. Pero el mismo artículo 8 de la Ley 16.074 manda que las indemnizaciones a siniestrados dependientes de patronos no asegurados se calculen «tomando como base un salario mínimo nacional», no tu sueldo real. Del otro lado, al empleador no asegurado el BSE puede multarlo con el doble de las primas omitidas la primera vez y el cuádruplo en las siguientes, con un mínimo de 50 UR y de 200 UR en cada reincidencia, y, tratándose de establecimientos industriales o comerciales, está facultado a solicitar su clausura (artículo 56 de la misma ley).',
  },
])

/** Lo que se sigue debiendo aunque no estés declarada. El sitio ya explica cada uno por separado. */
export const UNDECLARED_STILL_OWED: readonly UndeclaredConsequence[] = Object.freeze([
  {
    title: 'El mínimo de tu categoría',
    detail:
      'El laudo del Consejo de Salarios de tu rama fija un mínimo por categoría que suele ser bastante mayor que el Salario Mínimo Nacional, y es exigible estés o no en planilla.',
    to: '/cuanto-me-tienen-que-pagar-uruguay',
  },
  {
    title: 'Aguinaldo',
    detail: 'Se devenga por el trabajo cumplido y se paga en dos mitades al año.',
    to: '/guias/como-se-calcula-el-aguinaldo-uruguay',
  },
  {
    title: 'Licencia y salario vacacional',
    detail: 'La licencia anual y el salario vacacional se generan por el tiempo trabajado.',
    to: '/guias/licencia-y-salario-vacacional-uruguay',
  },
  {
    title: 'Despido y liquidación',
    detail:
      'La indemnización por despido y la liquidación final no dependen de figurar en planilla: dependen de que la relación laboral haya existido, y eso se prueba.',
    to: '/guias/despido-y-liquidacion-uruguay',
  },
])

/** Método, no derecho: cómo se arma la prueba de una relación que no está documentada. */
export const UNDECLARED_EVIDENCE: readonly string[] = Object.freeze([
  'Mensajes con quien te da órdenes: horarios, cambios de turno, pedidos de cubrir a una compañera, retos. Es lo que muestra la subordinación, que es el corazón de la relación laboral.',
  'Cualquier comprobante de pago: transferencias, capturas de la app del banco, sobres, anotaciones firmadas, recibos aunque estén incompletos.',
  'Fotos del cuadrante de turnos, de la planilla del local, de la lista de personal o del grupo de trabajo donde figurás.',
  'Testigos: compañeras en tu misma situación, proveedores, familias del lugar. Ir de a varias no es sólo más fuerte, además está previsto: el derecho de iniciativa ante BPS se ejerce individual o colectivamente.',
  'Rastro público: la web o las redes del lugar donde aparecés, credenciales, uniformes con tu nombre, correos con tu firma institucional.',
  'Guardá todo fuera del trabajo, en tu propio teléfono o correo, y con fecha. La prueba que queda en la computadora del local deja de estar disponible el día del conflicto.',
])

export interface UndeclaredFaq {
  question: string
  short: string
  answer: string
}

export const UNDECLARED_FAQ: readonly UndeclaredFaq[] = Object.freeze([
  {
    question: '¿Puedo denunciar sin que sepan que fui yo?',
    short: 'Sí en la Inspección del Trabajo, salvo que denuncies acoso o persecución sindical.',
    answer:
      'El artículo 23 del Decreto 371/022 es explícito: las denuncias serán anónimas y se procesan internamente en la Inspección General del Trabajo con carácter reservado. El MTSS lo repite en su página: para condiciones generales de trabajo —salario, recibos, licencias, aguinaldo— y para condiciones ambientales se garantiza el anonimato. La excepción es la del inciso cuarto del mismo artículo: cuando la denuncia refiere a violaciones de derechos fundamentales, como acoso sexual o laboral, libertad sindical o discriminación, tiene que ser escrita, con identificación de quien denuncia y acompañada de las pruebas que tenga. Para esos casos la Inspección igual ofrece un servicio de asesoramiento donde se preserva la identidad de quien consulta. Un detalle práctico del anonimato: en un lugar de pocas personas, una inspección que llega justo después de un planteo interno puede ser fácil de atribuir aunque tu nombre no figure. Eso no es un motivo para no denunciar, pero sí para pensar antes si conviene ir sola o con el sindicato.',
  },
  {
    question: 'Ya no trabajo ahí. ¿Sirve de algo denunciar?',
    short: 'Para la Inspección no, para BPS y para el reclamo de plata sí.',
    answer:
      'La Inspección General del Trabajo recibe denuncias siempre que exista un vínculo laboral vigente y que las infracciones estén ocurriendo al momento de denunciar; su propia página lista entre los casos que NO recibe el de quien fue desvinculado por renuncia o despido, y lo deriva al Centro de Asesoramiento del MTSS de Juncal 1511 o a las Oficinas de Trabajo del Interior. Las otras dos puertas siguen abiertas: la denuncia ante BPS por actividades no declaradas no exige vínculo vigente y alcanza períodos posteriores al 1/4/1996, y el reclamo de lo que te deben va por la conciliación previa. Ahí sí mirá el reloj: las acciones prescriben al año del día siguiente al cese.',
  },
  {
    question: '¿Me pueden echar por denunciar?',
    short: 'No hay un fuero general del denunciante; la protección explícita es la sindical.',
    answer:
      'Conviene ser honestos con esto. No existe en Uruguay una norma que declare nulo el despido de quien denuncia a su empleador ante el MTSS o el BPS, y publicar lo contrario expondría a quien confíe en eso. Lo que sí existe, con artículo, es la protección de la actividad sindical: la Ley 17.940 declara absolutamente nula cualquier discriminación tendiente a menoscabar la libertad sindical, tanto en el despido como en cualquier otro perjuicio por participar en actividades sindicales. Por eso, en la práctica, hacer el planteo a través del sindicato no es sólo una cuestión de fuerza colectiva: cambia el marco jurídico de la represalia. Y si igual te despiden, el despido no borra el reclamo: la indemnización se debe igual, lo que hay que probar es la relación laboral. Ahí es donde la prueba que juntaste antes decide el resultado.',
  },
  {
    question: 'Somos varias en la misma situación. ¿Conviene ir juntas?',
    short: 'Sí, y en la vía del BPS está previsto expresamente.',
    answer:
      'El artículo 88 de la Ley 16.713 habilita al trabajador dependiente a suplir a su empleador en la declaración «individual o colectivamente». Del lado del MTSS, el Decreto 371/022 dice que pueden denunciar tanto particulares afectados como representantes de organizaciones, y la página del ministerio lista expresamente a las personas trabajadoras en actividad, a los representantes sindicales y a terceros ajenos a la relación. En la enseñanza privada el sindicato de rama es el SINTEP, afiliado al PIT-CNT. Ir juntas también resuelve el problema práctico más grande de estos casos, que es la prueba: cada una es testigo de la situación de la otra.',
  },
  {
    question: 'Me pagan una parte en el recibo y otra por fuera. ¿Es lo mismo?',
    short: 'Para el BPS sí: se denuncia por el mismo canal, como diferencia de salarios.',
    answer:
      'El servicio en línea del BPS se llama «Denunciar diferencias de salarios y actividades no declaradas» justamente porque cubre los dos casos: al que no figura y al que figura por menos de lo que cobra. La consecuencia práctica del sueldo parcialmente declarado es que todo lo que se calcula sobre el nominal —seguro de paro, subsidio por enfermedad, licencia, aguinaldo, la jubilación futura— se liquida sobre la mitad declarada, no sobre lo que cobrás. Antes de denunciar, pedí la constancia de historia laboral nominada: ahí vas a ver exactamente qué remuneración declaró la empresa mes a mes, y eso convierte la sospecha en un dato con el que se puede reclamar.',
  },
  {
    question: '¿Me pueden multar a mí por haber trabajado en negro?',
    short: 'La obligación de declarar y la sanción están puestas del lado del empleador.',
    answer:
      'El artículo 87 de la Ley 16.713 pone la obligación de presentar la declaración en los sujetos pasivos de contribuciones especiales de seguridad social —las empresas— y aclara que hay que presentarla se hayan efectuado o no los aportes; la escala de multas de ese mismo artículo se aplica a quien incumple esa obligación, o sea al empleador, por cada afiliado comprendido en la infracción. Del lado del trabajador, la ley no crea una sanción: crea un derecho, el de iniciativa del artículo 88, para suplir al empleador y pedir la inclusión de los períodos que faltan. Y en el régimen de accidentes pasa lo mismo: el artículo 56 de la Ley 16.074 sanciona al patrono que no aseguró, no a quien trabajó sin estar asegurado.',
  },
  {
    question: '¿Necesito abogado y cuánto sale?',
    short: 'Para denunciar, no. Para conciliar por más de 20 UR, sí.',
    answer:
      'La denuncia ante la Inspección General del Trabajo no tiene requerimientos especiales ni costo: alcanza con aportar la información que la respalde, incluidos el RUT o los datos del empleador y la dirección exacta donde ocurren los incumplimientos. La denuncia ante BPS tampoco necesita abogado y se hace con usuario personal. La conciliación previa sí lo exige: el artículo 3 de la Ley 18.572 pide que la solicitud vaya asistida de abogado, y sólo exime a las reclamaciones por sumas inferiores a 20 UR, así que la excepción es para los montos chicos y no para los que llegan justo a ese tope. El trámite en sí no tiene costo. Si el problema es el honorario, el sindicato de rama y los consultorios jurídicos universitarios son las dos vías habituales de asistencia.',
  },
  {
    question: 'Trabajo en un jardín de primera infancia privado. ¿Hay algo más?',
    short: 'Sí: el centro necesita autorización del INAU, que también supervisa y sanciona.',
    answer:
      'Los centros de educación infantil privados no funcionan por libre. Según el texto vigente del artículo 101 de la Ley 18.437 —la redacción que le dio el artículo 179 de la Ley 19.889—, es cometido del INAU autorizar su funcionamiento, llevar el Registro Nacional de Centros de Educación Infantil Privados, supervisarlos y aplicar sanciones cuando no cumplen con la normativa, «desde la observación hasta la clausura definitiva del centro». Ojo con una trampa de fuentes: el Decreto 268/014, que sigue siendo la reglamentación, dice en su artículo 1 que autoriza la Dirección de Educación del MEC, porque es de 2014; el propio MEC publicó el comunicado de que desde el 1.º de enero de 2021 ya no emite esas autorizaciones y que sus informes de supervisión se remiten al INAU. Si buscás por el decreto vas a terminar en el organismo equivocado. Ese mismo decreto fija cosas que se controlan en la visita: la autorización dura hasta dos años y caduca si cambia el domicilio, el titular o la denominación social, y la plantilla tiene que respetar una proporción mínima de adultos por edad: una persona adulta cada tres niños menores de un año, cada cinco de un año, cada siete de dos años, cada quince de tres y cada veinte de cuatro y cinco; y en todas esas franjas salvo la de cuatro y cinco años el decreto exige además otra persona adulta presente en el centro aunque no esté a cargo de ellos. Dos advertencias antes de usar esta puerta. La primera: es una puerta sobre el centro y los niños, no sobre tu sueldo; no reemplaza al MTSS ni al BPS, los complementa. La segunda: puede terminar en una clausura, o sea en la desaparición de tu fuente de trabajo, así que es una decisión distinta de la de reclamar lo tuyo. En el registro del INAU podés verificar antes si el centro está autorizado.',
  },
  {
    question: '¿Por dónde empiezo si no quiero mover nada todavía?',
    short: 'Por la constancia de historia laboral: es gratis, es tuya y no avisa a nadie.',
    answer:
      'El artículo 89 de la Ley 16.713 obliga a que la información del registro esté en todo momento disponible para su titular en la web del BPS o a su solicitud. La constancia de historia laboral nominada te muestra los servicios y remuneraciones registrados desde el 1/4/1996: ahí vas a ver si la empresa te declaró, desde cuándo y por cuánto. Es un trámite que hacés vos con tu usuario, no notifica al empleador y te deja con un documento oficial en la mano. Con eso más las capturas y comprobantes que tengas guardados, cualquiera de las tres puertas se abre mucho mejor que con una sospecha.',
  },
])

/** Aviso obligatorio: esto orienta, no sustituye asesoramiento. */
export const UNDECLARED_DISCLAIMER =
  'Esta página explica los canales oficiales y cita la norma de cada afirmación. No es asesoramiento jurídico: cada caso depende de sus hechos y de la prueba disponible. La consulta laboral del MTSS es gratuita, y el sindicato de tu rama y los consultorios jurídicos universitarios asesoran sin costo.'
