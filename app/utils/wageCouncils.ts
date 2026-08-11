// app/utils/wageCouncils.ts
// Datos de /cuanto-me-tienen-que-pagar-uruguay: cuál es el mínimo LEGAL de tu categoría y cómo
// encontrarlo, que no es el Salario Mínimo Nacional.
//
// POR QUÉ EXISTE: «cuánto se gana» es el cluster de demanda más grande de todo el corpus (261
// preguntas, 4.372 de engagement), con megahilos anuales de salarios de 456, 298 y 208
// comentarios. Pero esa pregunta, tal como se hace, no tiene respuesta publicable: son
// autorreportes de la comunidad, no un dato.
//
// EL GIRO QUE SÍ ES RESPONDIBLE: no «cuánto se gana en el mercado» sino «cuánto me TIENEN que
// pagar como mínimo». Eso sí es un dato duro, lo fija el Consejo de Salarios de tu grupo y es
// exigible. El sitio ya decía, en la guía del SMN, que «los laudos del grupo y subgrupo pueden
// establecer mínimos superiores» — y nunca decía cómo encontrar el tuyo.
//
// POR QUÉ NO PUBLICAMOS LAS TABLAS DE LAUDOS: son decenas de grupos por subgrupos por categorías,
// y cambian en cada ronda de negociación. Una tabla acá sería dato viejo garantizado. Publicamos
// el MÉTODO y los canales oficiales, que no caducan.
//
// LOS DOS AGREGADOS DEL 2026-08-10: el volcado de Reddit deja dos preguntas grandes que la página
// no cubría, y las dos se responden sin tocar un monto.
//   1. «¿Es ilegal hablar del sueldo?» es el cluster más grande después de «¿cuánto gana un X?», y
//      a diferencia de ése SÍ tiene respuesta: es un NEGATIVO. No hay norma. Es la misma forma de
//      respuesta que la guía de tolerancia ya publica sobre los «minutos de tolerancia», y hay que
//      publicarla explícitamente, porque el vacío legal se lee como prohibición si nadie lo dice.
//      LÍMITE DEL NEGATIVO: que no haya ley no quiere decir que no haya consecuencia. El propio
//      sitio ya enseña, en la guía de tolerancia, que el reglamento interno, el contrato y el
//      convenio SÍ crean obligaciones exigibles; y que el poder disciplinario del empleador
//      privado no está reglamentado por ley, sus límites los construyeron doctrina y
//      jurisprudencia. Acá no se cita como si fuera texto legal: se dice de dónde sale.
//   2. «¿Cuánto gana un cargo público?» es el complemento honesto de la tesis de arriba: en el
//      privado los números son autorreportes, pero para el Estado la fuente oficial EXISTE y es
//      obligatoria. Publicamos el CANAL, nunca un monto por cargo: un sueldo público caduca igual
//      que un laudo, y el recorte que este módulo ya se autoimpone vale igual acá.
//
// FUENTES, verificadas el 2026-08-10:
//   - MTSS, «Consejos de Salarios y Negociación Colectiva»
//     https://www.gub.uy/ministerio-trabajo-seguridad-social/tematica/consejos-salarios-negociacion-colectiva
//   - MTSS, «Grupos de Industria, Comercio y actividades en general» (el listado de grupos).
//     OJO: el listado va PAGINADO y son 20 grupos, no 10. ?page=0 trae del 1 al 10 y ?page=1 del
//     11 al 20 — ahí están hoteles y restoranes, transporte, salud, enseñanza, comercio minorista
//     de la alimentación y servicios profesionales, o sea media población activa. Copiar sólo la
//     primera página deja al lector típico convencido de que la página no le aplica. Los nombres
//     se transcriben como los publica el MTSS, sin parafrasear, porque el método que enseñamos es
//     buscar la rama por su nombre en ese listado.
//     https://www.gub.uy/ministerio-trabajo-seguridad-social/tematica/grupos-industria-comercio-actividades-general
//   - MTSS, «Consultas laborales y salariales vía web» (el servicio gratuito)
//     https://www.gub.uy/ministerio-trabajo-seguridad-social/politicas-y-gestion/consultas-laborales-salariales-via-web
//   - MTSS, «Denuncias y asesoramiento en la Inspección General del Trabajo» (requiere vínculo
//     vigente e infracción en curso; la de persecución sindical no es anónima)
//     https://www.gub.uy/ministerio-trabajo-seguridad-social/politicas-y-gestion/denuncias-laborales
//   - IMPO, Ley 17.940 art. 1 (nulidad de la discriminación antisindical)
//     https://www.impo.com.uy/bases/leyes/17940-2006/1
//   - IMPO, Ley 18.566 art. 4 (epígrafe «Deber de negociar de buena fe»: la reserva recae sobre la
//     información confidencial que las partes se entregan para negociar, no sobre lo que cobra el
//     trabajador). NO decir que es «la única» reserva del ordenamiento: es una afirmación
//     exhaustiva que ninguna fuente sostiene, y además tiene contraejemplo (Ley 18.331 art. 11).
//     https://www.impo.com.uy/bases/leyes/18566-2009/4
//   - IMPO, Ley 18.331 art. 11 (principio de reserva: quien accede a datos personales por su
//     situación laboral guarda estricto secreto profesional, y la obligación subsiste terminada la
//     relación). Es el contraejemplo: alcanza a quien liquida sueldos ajenos, no a tu propio sueldo.
//     https://www.impo.com.uy/bases/leyes/18331-2008/11
//   - IMPO, Ley 16.045 art. 2 (discriminación por sexo; incluye el criterio de remuneración)
//     https://www.impo.com.uy/bases/leyes/16045-1989/2
//   - IMPO, Ley 18.381 art. 5 (transparencia activa: estructura de remuneraciones)
//     https://www.impo.com.uy/bases/leyes/18381-2008/5
//   - IMPO, Ley 18.381 art. 15 (plazos del pedido de acceso)
//     https://www.impo.com.uy/bases/leyes/18381-2008/15
//   - IMPO, Decreto 232/010 art. 38 (qué se publica y con qué frecuencia)
//     https://www.impo.com.uy/bases/decretos/232-2010/38
//   - UAIP, «Reclamos por incumplimiento a la Ley 18.381»
//     https://www.gub.uy/unidad-acceso-informacion-publica/sobre-reclamos-por-incumplimiento-la-ley-ndeg-18381
//   - ONSC, «Registro de Vínculos con el Estado» (el atajo que NO existe: es para funcionarios
//     autorizados y no registra remuneraciones)
//     https://www.gub.uy/oficina-nacional-servicio-civil/tramites-y-servicios/servicios/registro-vinculos-estado
//   - Uruguay Concursa (el portal donde se inscribe Y donde se publica la retribución del cargo).
//     OJO METODOLÓGICO, porque acá ya se cometió el error inverso: el portal es una SPA Angular y
//     curl sobre /llamado/<id> devuelve un shell de 699 bytes. Eso prueba que el portal no hace
//     SSR, NO que el dato no esté. Renderizadas con navegador el 2026-08-10, las fichas traen
//     «Retribución» como campo estructurado dentro de «Información General», junto al tipo de
//     vínculo y la carga horaria: verificado en /llamado/853 (Nº 0040/2013, MGAP, importe «a
//     valores de enero de 2012») y en el llamado ABIERTO /llamado/42478 (Nº 0044/2026,
//     MEF-Dirección Nacional de Catastro, cierra el 07/09/2026, importe «a valores de Enero
//     2026»). El campo SIEMPRE viene con su fecha de valores, que es exactamente por lo que este
//     módulo no republica el importe. La misma ficha adjunta las bases en PDF («Bases», «Bases y
//     Perfil»), y puede indicar escalafón, grado y denominación del cargo —42478 los indica, 853
//     no—, que es lo que permite cruzarlo contra la escala publicada en transparencia. O sea: los
//     dos canales existen y la página tiene que nombrar los dos. Negar el campo de la ficha manda
//     al lector a rastrear un PDF ignorando el dato que tiene delante.
//     https://www.uruguayconcursa.gub.uy/
//   - FGN, convocatoria de ejemplo cuyas bases remiten la retribución a un anexo: «Ver documento
//     adjunto: Descripción de puesto de trabajo y remuneraciones (Anexo I)»
//     https://www.gub.uy/fiscalia-general-nacion/comunicacion/convocatorias/llamado-concurso-publico-abierto-oposicion-meritos-para-cargos-0
//   - MEF, «Remuneraciones de los Funcionarios» (ejemplo de escala publicada por escalafón y grado)
//     https://www.gub.uy/ministerio-economia-finanzas/institucional/transparencia-ain/remuneraciones-funcionarios
//   - Poder Judicial, «Estructura de remuneraciones»
//     https://www.poderjudicial.gub.uy/transparencia/estructura-de-remuneraciones

/** Fecha en que la estructura y los canales se contrastaron con el MTSS. */
export const WAGE_VERIFIED_AT = '2026-08-10'

export interface WageSource {
  label: string
  url: string
}

export const WAGE_SOURCES: readonly WageSource[] = Object.freeze([
  {
    label: 'MTSS — Consejos de Salarios y Negociación Colectiva',
    url: 'https://www.gub.uy/ministerio-trabajo-seguridad-social/tematica/consejos-salarios-negociacion-colectiva',
  },
  {
    label: 'MTSS — Grupos de Industria, Comercio y actividades en general',
    url: 'https://www.gub.uy/ministerio-trabajo-seguridad-social/tematica/grupos-industria-comercio-actividades-general',
  },
  {
    label: 'MTSS — Consultas laborales y salariales vía web (gratis)',
    url: 'https://www.gub.uy/ministerio-trabajo-seguridad-social/politicas-y-gestion/consultas-laborales-salariales-via-web',
  },
  {
    label: 'MTSS — Denuncias y asesoramiento en la Inspección General del Trabajo',
    url: 'https://www.gub.uy/ministerio-trabajo-seguridad-social/politicas-y-gestion/denuncias-laborales',
  },
  {
    label: 'IMPO — Ley 17.940, artículo 1 (nulidad de la discriminación antisindical)',
    url: 'https://www.impo.com.uy/bases/leyes/17940-2006/1',
  },
  {
    label: 'IMPO — Ley 18.566, artículo 4 (información y reserva en la negociación colectiva)',
    url: 'https://www.impo.com.uy/bases/leyes/18566-2009/4',
  },
  {
    label: 'IMPO — Ley 18.331, artículo 11 (principio de reserva sobre datos personales ajenos)',
    url: 'https://www.impo.com.uy/bases/leyes/18331-2008/11',
  },
  {
    label: 'IMPO — Ley 16.045, artículo 2 (discriminación por sexo, criterio de remuneración)',
    url: 'https://www.impo.com.uy/bases/leyes/16045-1989/2',
  },
  {
    label: 'IMPO — Ley 18.381, artículo 5 (transparencia activa: estructura de remuneraciones)',
    url: 'https://www.impo.com.uy/bases/leyes/18381-2008/5',
  },
  {
    label: 'IMPO — Ley 18.381, artículo 15 (plazos del pedido de acceso a la información)',
    url: 'https://www.impo.com.uy/bases/leyes/18381-2008/15',
  },
  {
    label: 'IMPO — Decreto 232/010, artículo 38 (qué debe publicar cada organismo, mes a mes)',
    url: 'https://www.impo.com.uy/bases/decretos/232-2010/38',
  },
  {
    label: 'UAIP — Reclamos por incumplimiento de la Ley 18.381',
    url: 'https://www.gub.uy/unidad-acceso-informacion-publica/sobre-reclamos-por-incumplimiento-la-ley-ndeg-18381',
  },
  {
    label: 'ONSC — Registro de Vínculos con el Estado (no es de consulta ciudadana)',
    url: 'https://www.gub.uy/oficina-nacional-servicio-civil/tramites-y-servicios/servicios/registro-vinculos-estado',
  },
  {
    label:
      'Uruguay Concursa — portal de llamados del Estado: la ficha de cada llamado publica la retribución en «Información General» y adjunta las bases',
    url: 'https://www.uruguayconcursa.gub.uy/',
  },
  {
    label:
      'FGN — llamado de ejemplo: las bases remiten la retribución al «Anexo I, Descripción de puesto de trabajo y remuneraciones»',
    url: 'https://www.gub.uy/fiscalia-general-nacion/comunicacion/convocatorias/llamado-concurso-publico-abierto-oposicion-meritos-para-cargos-0',
  },
  {
    label: 'MEF — Remuneraciones de los funcionarios (escala por escalafón y grado)',
    url: 'https://www.gub.uy/ministerio-economia-finanzas/institucional/transparencia-ain/remuneraciones-funcionarios',
  },
  {
    label: 'Poder Judicial — Estructura de remuneraciones',
    url: 'https://www.poderjudicial.gub.uy/transparencia/estructura-de-remuneraciones',
  },
])

/** La confusión de base, y el motivo por el que alguien cobra menos de lo que le corresponde. */
export const WAGE_SMN_IS_NOT_YOUR_MINIMUM =
  'El Salario Mínimo Nacional es un piso para todo el país, no tu mínimo. Si tu actividad está en un Consejo de Salarios —y la mayoría de la actividad privada lo está—, tu mínimo lo fija el laudo de tu grupo, subgrupo y categoría, y casi siempre es superior al SMN. Cobrar el SMN estando en un grupo con laudo más alto no es legal por el hecho de superar el mínimo nacional.'

/** Cómo se estructura la cosa. Sin esto, buscar el laudo propio es imposible. */
export interface WageLayer {
  n: number
  label: string
  detail: string
}

export const WAGE_LAYERS: readonly WageLayer[] = Object.freeze([
  {
    n: 1,
    label: 'Grupo',
    detail:
      'La rama de actividad de la EMPRESA, no tu tarea. Un contador que trabaja en un supermercado está en el grupo del comercio, no en uno de contadores.',
  },
  {
    n: 2,
    label: 'Subgrupo',
    detail:
      'Dentro del grupo, la especialidad. Es donde se separan realidades muy distintas que comparten rama.',
  },
  {
    n: 3,
    label: 'Categoría',
    detail:
      'Tu puesto dentro del subgrupo. Es la línea que finalmente fija tu mínimo, y la que más se discute: estar mal categorizado es cobrar menos de forma legalizada.',
  },
])

export interface WageIndustryGroup {
  /** Número oficial del grupo en el MTSS. NO es el índice del array: es dato, no posición. */
  n: number
  /** Nombre tal como lo publica el MTSS, sin parafrasear. */
  name: string
}

/**
 * Los 20 grupos que el MTSS lista bajo «Industria, Comercio y actividades en general».
 * El listado oficial va paginado de a 10, y publicar sólo la primera página fue un error grave:
 * dejaba afuera hoteles y restoranes, transporte, salud, enseñanza, comercio minorista de la
 * alimentación y servicios profesionales, y el disclaimer hacía creer al lector de esas ramas que
 * la página no le aplicaba.
 * NO es el total de Consejos de Salarios del país: hay otros ámbitos (rural, doméstico, sector
 * público) con su propia negociación. No publicamos un total porque no lo verificamos.
 * Los nombres van carácter por carácter como los publica el MTSS —incluidas sus mayúsculas—
 * porque el método que enseña la página es buscar la rama por su nombre en ese listado.
 */
export const WAGE_INDUSTRY_GROUPS: readonly WageIndustryGroup[] = Object.freeze([
  { n: 1, name: 'Procesamiento y conservación de alimentos, bebidas y tabaco' },
  { n: 2, name: 'Industria frigorífica' },
  { n: 3, name: 'Pesca' },
  { n: 4, name: 'Industria Textil' },
  { n: 5, name: 'Industrias del Cuero, Vestimenta y Calzado' },
  { n: 6, name: 'Industria de la madera, celulosa y papel' },
  { n: 7, name: 'Industria química, del medicamento, farmacéutica, de combustibles y anexos' },
  { n: 8, name: 'Industria de productos metálicos, maquinarias y equipo' },
  { n: 9, name: 'Industria de la construcción y actividades complementarias' },
  { n: 10, name: 'Comercio en general' },
  { n: 11, name: 'Comercio minorista de la alimentación' },
  { n: 12, name: 'Hoteles, restoranes y bares' },
  { n: 13, name: 'Transporte y almacenamiento' },
  { n: 14, name: 'Intermediación financiera, seguros y pensiones' },
  { n: 15, name: 'Servicios de salud y anexos' },
  { n: 16, name: 'Servicios de enseñanza' },
  { n: 17, name: 'Industria gráfica' },
  { n: 18, name: 'Servicios culturales, de esparcimiento y comunicaciones' },
  {
    n: 19,
    name: 'Servicios profesionales, técnicos, especializados y aquellos no incluidos en otros grupos',
  },
  { n: 20, name: 'Entidades gremiales, sociales y deportivas' },
])

export interface WageStep {
  n: number
  title: string
  detail: string
  /** Enlace oficial para ese paso, si aplica. */
  url?: string
}

/** El método para encontrar TU mínimo. Es lo que reemplaza a la tabla que no publicamos. */
export const WAGE_LOOKUP_STEPS: readonly WageStep[] = Object.freeze([
  {
    n: 1,
    title: 'Identificá el grupo por la actividad de la empresa',
    detail:
      'Mirá el listado de grupos del MTSS y ubicá la rama de tu empleador. Si la empresa hace varias cosas, manda la actividad principal.',
    url: 'https://www.gub.uy/ministerio-trabajo-seguridad-social/tematica/grupos-industria-comercio-actividades-general',
  },
  {
    n: 2,
    title: 'Buscá el último convenio o acta vigente de ese grupo',
    detail:
      'En la página del grupo están los convenios y actas. Interesa el último vigente, porque los mínimos se ajustan en cada ronda.',
  },
  {
    n: 3,
    title: 'Encontrá tu categoría en la tabla',
    detail:
      'El acta trae las categorías con su mínimo. Si no te reconocés en ninguna, ese es el problema a resolver primero: la categoría mal asignada es la forma más común de pagar de menos sin incumplir en apariencia.',
  },
  {
    n: 4,
    title: 'Si no lo encontrás, preguntale al MTSS: es gratis',
    detail:
      'El MTSS tiene un servicio de consulta laboral y salarial por web. Te informa el contenido del acuerdo de tu sector: mínimos, partidas, licencias especiales, beneficios y las fechas de los aumentos.',
    url: 'https://www.gub.uy/ministerio-trabajo-seguridad-social/politicas-y-gestion/consultas-laborales-salariales-via-web',
  },
])

/** Lo que el laudo fija además del mínimo, y que suele quedar sin reclamar. */
export const WAGE_BEYOND_MINIMUM: readonly string[] = Object.freeze([
  'Las categorías y qué tarea corresponde a cada una.',
  'Partidas y primas del sector: por antigüedad, presentismo, nocturnidad y otras propias de la rama.',
  'Licencias especiales por encima del régimen general.',
  'Beneficios del convenio, como tickets o partidas por alimentación.',
  'Las fechas de los aumentos y el porcentaje de cada ajuste.',
])

export interface WageFaq {
  question: string
  short: string
  answer: string
}

export const WAGE_FAQ: readonly WageFaq[] = Object.freeze([
  {
    question: '¿Cuánto tendría que estar ganando?',
    short: 'Como mínimo, lo que fije el laudo de tu grupo, subgrupo y categoría.',
    answer:
      'La pregunta «cuánto se gana» no tiene una respuesta oficial: los números que circulan en los hilos de salarios son autorreportes, útiles como referencia de mercado pero sin valor legal. La que sí tiene respuesta es «cuánto me tienen que pagar como mínimo», y esa la fija el Consejo de Salarios de tu rama. Es exigible, está publicada y se puede consultar gratis en el MTSS.',
  },
  {
    question: '¿El Salario Mínimo Nacional no es mi mínimo?',
    short: 'No. Es un piso nacional; tu mínimo suele ser más alto.',
    answer:
      'El SMN aplica como piso general, pero si tu actividad tiene Consejo de Salarios, el laudo de tu grupo fija un mínimo propio por categoría que casi siempre lo supera. Que te paguen por encima del SMN no significa que te estén pagando bien: hay que compararlo contra el laudo, no contra el mínimo nacional.',
  },
  {
    question: '¿Cómo sé en qué grupo estoy?',
    short: 'Por la actividad de la empresa, no por tu tarea.',
    answer:
      'El grupo lo determina la rama de actividad del empleador. Un administrativo en una fábrica de alimentos está en el grupo de esa industria, no en uno de administrativos. Si la empresa tiene varias actividades, pesa la principal. En el listado de grupos del MTSS se ubica la rama, y dentro está el subgrupo que corresponda.',
  },
  {
    question: 'Creo que estoy mal categorizado. ¿Importa?',
    short: 'Mucho: es la forma más común de pagar de menos sin aparentar incumplimiento.',
    answer:
      'La categoría es la línea que fija tu mínimo. Si hacés tareas de una categoría superior pero figurás en una inferior, el mínimo que te aplican es más bajo y todo lo demás se calcula sobre eso. Antes de discutir el monto conviene discutir la categoría, porque es la que arrastra el resto.',
  },
  {
    question: '¿Qué más me da el laudo además del mínimo?',
    short: 'Partidas, primas, licencias especiales y las fechas de los aumentos.',
    answer:
      'El acuerdo del sector suele fijar bastante más que un número: las categorías, primas por antigüedad o nocturnidad, licencias especiales por encima del régimen general, beneficios como partidas de alimentación, y el calendario de los ajustes. Es habitual que alguien cobre el mínimo correcto y no esté cobrando una prima que el convenio de su rama le da.',
  },
  // El vacío legal se lee como prohibición si nadie lo dice en voz alta: por eso la respuesta
  // arranca por el negativo. Pero el negativo tiene borde, y hay que decirlo en la misma
  // respuesta: que no haya ley no significa que no haya contrato. Todo lo que se afirma en modo
  // legal acá va con su artículo; lo que no tiene artículo se publica diciendo que no lo tiene.
  {
    question: '¿Es ilegal hablar del sueldo con un compañero? ¿Me pueden sancionar?',
    short: 'No hay norma que lo prohíba; si hay obligación, sale del contrato, no de la ley.',
    answer:
      'No existe en Uruguay ninguna norma que prohíba comentar tu sueldo con un compañero. Cuando la confidencialidad salarial existe, no viene de la ley: viene del contrato que firmaste, del reglamento interno de la empresa o del convenio colectivo de tu rama, que son las tres fuentes de las que salen este tipo de obligaciones. La reserva que la ley sí crea en esta materia es otra: el artículo 4 de la Ley 18.566, dentro del deber de negociar de buena fe, obliga a guardar reserva sobre la información confidencial que las partes se entregan para negociar, no sobre lo que vos cobrás. Caso distinto es el de quien accede a los sueldos ajenos por su puesto —liquidación, contaduría, recursos humanos—: ahí el artículo 11 de la Ley 18.331 obliga a guardar estricto secreto profesional sobre esos datos personales, y esa obligación subsiste aun terminada la relación. Es reserva sobre el dato de otro, nunca sobre el propio. Sobre la sanción no te podemos publicar un requisito con artículo, porque no lo hay: en el sector privado uruguayo el poder disciplinario del empleador no está reglamentado por ley, y los límites que se le reconocen —que la falta sea real, que la sanción sea proporcional, que probarla le toque al empleador— los construyeron la doctrina y la jurisprudencia, no un texto que puedas citar. Lo práctico, entonces: si te sancionan, pedí por escrito qué falta concreta se te imputa y en qué cláusula o norma se apoya. Si esa cláusula está efectivamente firmada, la discusión deja de ser «¿es legal hablar?» y pasa a ser si la sanción es proporcionada. Lo que ninguna cláusula puede hacer es tapar dos cosas. Si el reproche llega por actividad sindical —comparar recibos para controlar el laudo, por ejemplo—, la Ley 17.940 declara absolutamente nula cualquier discriminación tendiente a menoscabar la libertad sindical, y su artículo 1 alcanza tanto al despido como a perjudicar al trabajador de cualquier otra forma por participar en actividades sindicales; una cláusula de confidencialidad firmada no habilita a saltear eso. Y hay un motivo concreto para comparar: la Ley 16.045 prohíbe la discriminación entre sexos e incluye el criterio de remuneración (artículo 2), una diferencia que sin comparar no se detecta. Si igual te sancionan o te persiguen, la denuncia va a la Inspección General del Trabajo del MTSS, que pide dos cosas: vínculo laboral vigente y que la infracción esté ocurriendo. La de persecución sindical no es anónima: tenés que identificarte.',
  },
  // El complemento honesto del encabezado del módulo: para el Estado la fuente oficial existe.
  // Publicamos el canal y ningún monto, por lo mismo que no publicamos tablas de laudos.
  {
    question: '¿Cuánto gana un cargo público y dónde se consulta?',
    short: 'Acá sí hay fuente oficial: cada organismo está obligado a publicar sus remuneraciones.',
    answer:
      'Para el Estado sí hay dato oficial, y esa es la diferencia con el sector privado. La Ley 18.381 obliga a todo organismo público, sea o no estatal, a difundir de forma permanente la estructura de remuneraciones por categoría escalafonaria, las funciones de los cargos y el sistema de compensación (artículo 5). El Decreto 232/010 lo concreta: su artículo 38 manda publicar en el sitio web, actualizada mensualmente, la remuneración mensual nominal de todos los funcionarios (numeral 13) y las convocatorias a concursos de ingreso (numeral 12). Se busca en la sección de transparencia del propio organismo —del MEF al Poder Judicial, y también los entes autónomos, porque la obligación es de todos los sujetos obligados—, y lo que vas a encontrar es la escala por escalafón y grado, no una planilla con nombres. Para un cargo que se está llamando hay dos lugares donde mirar, y conviene mirar los dos. La ficha del llamado en Uruguay Concursa publica la retribución como un campo más de su «Información General», al lado del tipo de vínculo y la carga horaria: ahí está el importe nominal, siempre con la fecha de valores a la que corresponde, así que en un llamado de hace años ese número está a valores de entonces y no de hoy. Y esa misma ficha adjunta las bases en PDF, que es donde va el detalle: los organismos suelen remitir el desglose a un anexo —«Descripción de puesto de trabajo y remuneraciones»—, y cuando la convocatoria se publica además en el sitio del propio organismo, es habitual que ahí no aparezca el monto y sólo se remita a ese anexo. Si la ficha indica escalafón y grado, con esos dos datos podés cruzar el cargo contra la escala que el organismo publica en su sección de transparencia. Acá no publicamos montos por cargo por lo mismo que no publicamos laudos: se desactualizan. Dos advertencias. Si el organismo no publica, es reclamable ante la UAIP, y un pedido de acceso se contesta en 20 días hábiles, prorrogables por otros 20 sólo con razones fundadas, por escrito y si median circunstancias excepcionales (Ley 18.381, artículo 15): la prórroga no es de libre disposición del organismo, y esa es justamente la condición que te da argumento si te la usan de trámite. Y el Registro de Vínculos con el Estado de la ONSC no es el atajo: lo consultan funcionarios autorizados, no la ciudadanía, y no registra remuneraciones.',
  },
  {
    question: 'Me pagan menos del laudo. ¿Qué hago?',
    short: 'Primero confirmalo con el MTSS, que asesora gratis, y guardá tus recibos.',
    answer:
      'Antes de reclamar conviene tener el dato firme: consultá el laudo de tu grupo y categoría en el MTSS, que da asesoramiento laboral y salarial gratuito por web. Con eso confirmado y tus recibos de sueldo a mano, el incumplimiento es reclamable. El MTSS es también el organismo donde se plantea.',
  },
])
