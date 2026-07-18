// Reddit-mined educational guides: 50 answers to the economy/finance/legal
// questions Uruguayans actually ask (alquiler, herencias, crédito, sueldo,
// inversión, jubilación...). Same `Guide` shape as the core catalogue in
// `guides.ts`, spread into it there. Bodies are plain Spanish prose (rioplatense),
// mechanism-first and conservative on volatile figures, adversarially fact-checked
// against DGI / BPS / BCU / escribanos before publishing.
import type { Guide } from './guides'

export const redditGuides: readonly Guide[] = [
  {
    slug: 'como-rescindir-contrato-alquiler-uruguay',
    title: 'Cómo rescindir un contrato de alquiler en Uruguay',
    description:
      'Cómo terminar un alquiler antes de tiempo en Uruguay: preaviso, multas, cómo notificar en forma válida y recuperar el depósito o liberar la garantía.',
    tag: 'ALQUILER',
    updatedAt: '2026-07-18',
    sections: [
      {
        heading: 'Primero mirá qué tipo de contrato tenés',
        body: 'No todos los alquileres se rescinden igual. Un contrato de vivienda con plazo (lo habitual, dos años) en principio obliga a las dos partes hasta el vencimiento, pero eso no significa que quedes atrapado: además de las causas que fije el contrato, la normativa uruguaya suele reconocerle al inquilino un derecho a rescindir de forma anticipada una vez cumplido cierto tiempo, cumpliendo el preaviso y la indemnización que correspondan. Un contrato sin plazo o vencido que sigue de hecho es más flexible: se puede terminar avisando con antelación. También cambia si el contrato se firmó bajo el régimen común (Decreto-Ley de alquileres) o bajo el de arrendamiento sin garantía de la LUC, que tiene plazos y preavisos propios. Antes de hacer nada, releé tu contrato entero: ahí figura el plazo, el preaviso pactado y la penalidad. Esa cláusula rige en todo lo que no contradiga la ley, que en materia de alquileres es de orden público y protege al inquilino.',
      },
      {
        heading: 'El preaviso: cuánto tiempo antes avisar',
        body: 'La mayoría de los contratos de vivienda incluyen una cláusula que te deja salir antes, casi siempre después de cumplir cierto tiempo (habitualmente los primeros seis meses o el primer año) y avisando con anticipación. Ese preaviso suele ser de unos 60 días en el régimen común, mientras que en el arrendamiento sin garantía de la LUC lo habitual es un preaviso de unos 30 días; en algunos contratos se pacta otro plazo. Verificá el que corresponde a tu contrato y a tu régimen. El punto clave es que el aviso empieza a contar recién cuando el propietario lo recibe de forma fehaciente, no cuando vos lo decidís. Si te vas antes de cumplir el mínimo pactado o sin respetar el preaviso, casi siempre hay una penalidad. Revisá la fecha exacta de tu cláusula para no pagar de más.',
      },
      {
        heading: 'Multas y penalidades: qué es legítimo cobrar',
        body: 'La penalidad por salir antes debe surgir del contrato o de la normativa aplicable; si no está pactada, el propietario no puede inventar cualquier monto. Lo más común es que se pacte una indemnización de uno o dos meses de alquiler. Ojo con las cláusulas que pretenden cobrarte todos los meses que faltan hasta el vencimiento: cuando la ley reconoce el derecho a rescindir, la indemnización suele estar acotada, así que un reclamo por el total del plazo puede ser abusivo. Una cosa es la penalidad por rescisión y otra son deudas reales que sí debés (alquiler impago, gastos comunes, servicios, daños). El propietario no puede retenerte por cosas ya cubiertas ni cobrar dos veces lo mismo. Si la penalidad te parece abusiva o no figura en el contrato, conviene consultar con un abogado o con una liga de defensa del inquilino antes de firmar cualquier acuerdo.',
      },
      {
        heading: 'Cómo notificar para que valga',
        body: 'Un WhatsApp o un mail no alcanzan como prueba si después hay discusión. La forma segura y estándar en Uruguay es el telegrama colacionado con aviso de retorno, que enviás por el correo y deja constancia de qué dijiste y cuándo lo recibió la otra parte. Otra opción más formal es una notificación por escribano mediante acta notarial. Guardá siempre el comprobante: es lo que fija la fecha desde la cual corre el preaviso. Redactá el texto en forma clara indicando que rescindís, desde qué fecha y que ofrecés coordinar la entrega de la vivienda y las llaves. Ese papel te protege si el propietario luego alega que nunca le avisaste.',
      },
      {
        heading: 'Recuperar el depósito y cerrar bien',
        body: 'Al entregar la vivienda, el propietario puede descontar del depósito o de las garantías lo que le corresponda legítimamente: alquileres o gastos comunes impagos, servicios pendientes y daños que excedan el desgaste normal por el uso. No puede quedarse con el depósito por el simple hecho de que te vas antes si eso ya lo cubre la penalidad pactada. Conviene entregar la casa limpia, hacer un acta o inventario de salida con fotos, y pedir por escrito la constancia de que no quedan deudas. Si tu contrato es bajo el arrendamiento sin garantía de la LUC no hay garantía que liberar, pero si usaste garantía de ANDA o de la Contaduría General de la Nación (CGN), avisá también a esa institución para liberar la garantía; en el caso de la CGN suele haber un trámite específico de rescisión.',
      },
      {
        heading: 'Esto es información general, no asesoramiento',
        body: 'Cada contrato y cada situación son distintos, y la aplicación concreta depende del régimen del contrato y de las cláusulas que firmaste. Esta guía te orienta, pero no reemplaza el consejo de un profesional ni la lectura de la normativa vigente y de los trámites oficiales (por ejemplo, en gub.uy). Si hay conflicto, dinero importante en juego o el propietario reclama sumas altas, consultá con un abogado o con una liga o asociación de inquilinos antes de firmar acuerdos o pagar penalidades. Para los aspectos formales de la notificación, un escribano puede darte certeza. Y guardá siempre copia de tu contrato, de los recibos y de toda comunicación fehaciente.',
      },
    ],
    related: [
      { label: 'Guía para alquilar', to: '/alquilar-en-uruguay' },
      { label: 'Derechos del inquilino', to: '/guias/derechos-del-inquilino-uruguay' },
      { label: 'El depósito de alquiler', to: '/guias/deposito-de-alquiler-uruguay' },
    ],
    steps: [
      {
        name: 'Releé tu contrato',
        text: 'Ubicá la cláusula de rescisión anticipada y fijate también qué te habilita la ley según tu régimen: desde cuándo podés irte, con cuánto preaviso y qué penalidad corresponde. Eso define todo lo demás.',
      },
      {
        name: 'Calculá fechas y costo',
        text: 'Fijate si ya cumpliste el mínimo para salir sin penalidad y contá los días de preaviso. Estimá cuánto te tocaría pagar si te vas antes y verificá que la penalidad no exceda lo que la ley permite.',
      },
      {
        name: 'Notificá en forma fehaciente',
        text: 'Enviá un telegrama colacionado con aviso de retorno (o notificación por escribano) diciendo que rescindís y desde qué fecha. Guardá el comprobante.',
      },
      {
        name: 'Coordiná la entrega',
        text: 'Acordá día para devolver la vivienda y las llaves. Dejá la casa en condiciones y hacé un acta de salida con fotos del estado.',
      },
      {
        name: 'Cerrá cuentas y liberá garantías',
        text: 'Pagá servicios y común pendientes, pedí constancia escrita de que no quedan deudas y avisá a ANDA o a la Contaduría (CGN) para liberar la garantía si la usaste.',
      },
    ],
  },
  {
    slug: 'garantias-de-alquiler-uruguay',
    title: 'Garantías de alquiler en Uruguay: cuál te conviene',
    description:
      'Comparación de las garantías de alquiler en Uruguay: Contaduría, ANDA, propietario, seguro de fianza y depósito, con costos y trade-offs.',
    tag: 'GARANTÍAS',
    updatedAt: '2026-07-18',
    sections: [
      {
        heading: 'Qué es una garantía y por qué te la piden',
        body: 'Cuando alquilás, el propietario quiere seguridad de que va a cobrar aunque vos dejes de pagar. La garantía es justamente eso: un tercero o un mecanismo que responde por vos si no cumplís. En Uruguay conviven varias opciones, y cuál te conviene depende de si tenés ingresos formales y con qué antigüedad, de si sos funcionario público o pasivo, de si tenés una propiedad para ofrecer y de cuánto podés adelantar. No todas cuestan lo mismo ni te dan la misma flexibilidad. Entender las diferencias te ahorra plata y te evita quedar atado a la única opción que te ofrezca la inmobiliaria.',
      },
      {
        heading: 'Garantía de la Contaduría General de la Nación',
        body: 'La garantía de alquileres de la Contaduría General de la Nación, a través de su Servicio de Garantía de Alquileres (SGA), suele ser de las opciones más económicas y confiables para el propietario, porque el alquiler se retiene directamente del sueldo o de la pasividad. Un punto importante: no es solo para funcionarios públicos. También pueden usarla los jubilados y pensionistas y los empleados de empresas privadas cuya empresa esté inscripta en el registro del SGA, en todos los casos con cierta antigüedad y con topes según tu ingreso disponible. Si calificás, suele quedar entre las alternativas más baratas. Conviene consultar directamente en la Contaduría General de la Nación los requisitos, los costos y el tope vigentes.',
      },
      {
        heading: 'Garantía de ANDA',
        body: 'ANDA ofrece garantía de alquileres a sus asociados, tanto trabajadores privados como públicos, según ingresos y antigüedad. Es una de las vías más usadas por quien no tiene una propiedad para ofrecer ni entra en la Contaduría. Implica asociarse a ANDA y pagar un costo por el servicio de garantía, además de cumplir requisitos de ingreso demostrable. La ventaja es que le da tranquilidad al propietario y te abre puertas en inmobiliarias que exigen garantía formal. La contra es el costo mensual o anual y los trámites. Conviene comparar ese costo con el de un seguro de fianza antes de decidir.',
      },
      {
        heading: 'Garantía de propietario y depósito',
        body: 'La garantía de propietario es cuando alguien que tiene un inmueble en Uruguay lo ofrece como respaldo de tu contrato. No cuesta plata directa, pero necesitás a alguien dispuesto a asumir ese riesgo, y muchas veces la inmobiliaria pide que la propiedad esté libre de deudas. Otra alternativa es el depósito: entregás una suma de dinero que queda en garantía y se devuelve al final si no hay deudas ni daños. El depósito no siempre alcanza como única garantía y te inmoviliza capital, pero evita pagos mensuales a un tercero. Es útil si tenés el dinero disponible y el propietario lo acepta.',
      },
      {
        heading: 'Seguro de fianza',
        body: 'El seguro de fianza de alquiler lo emiten aseguradoras como el Banco de Seguros del Estado y compañías privadas del mercado. Vos pagás una prima y la aseguradora garantiza al propietario el pago si dejás de cumplir; si la aseguradora paga, después te lo reclama a vos. La ventaja es que no necesitás garante propietario ni ser funcionario público, y el trámite suele ser rápido. La contra es que es un gasto que no recuperás, como cualquier seguro. Los costos y coberturas varían entre compañías, así que pedí varias cotizaciones y leé qué cubre exactamente (solo alquiler, o también gastos comunes y daños).',
      },
      {
        heading: 'Cuál te conviene y una aclaración',
        body: 'En general: si tenés ingresos formales con cierta antigüedad, mirá primero la Contaduría, que admite a funcionarios públicos, pasivos y también a empleados de empresas privadas cuya empresa esté registrada, porque suele ser lo más barato; si no calificás o tu empresa no está en el registro, compará ANDA contra un seguro de fianza según costo y requisitos; si tenés capital ocioso o un garante propietario, esas vías te ahorran pagos mensuales. Pensá también en la flexibilidad para renovar o mudarte. Esta guía es información general, no reemplaza el asesoramiento de un profesional, y los costos y condiciones cambian con el tiempo y entre instituciones. Antes de contratar, pedí las condiciones vigentes a cada entidad (Contaduría, ANDA, la aseguradora) y consultá con la inmobiliaria cuáles acepta el propietario.',
      },
    ],
    related: [
      { label: 'Guía para alquilar', to: '/alquilar-en-uruguay' },
      { label: 'Alquilar sin garantía', to: '/guias/alquilar-sin-garantia-uruguay' },
      { label: 'El depósito de alquiler', to: '/guias/deposito-de-alquiler-uruguay' },
    ],
  },
  {
    slug: 'deposito-de-alquiler-uruguay',
    title: 'El depósito de alquiler en Uruguay: cómo funciona y cómo recuperarlo',
    description:
      'Qué es el depósito de alquiler en Uruguay, cuánto suele ser, para qué puede usarlo el propietario y cómo reclamar su devolución.',
    tag: 'DEPÓSITO',
    updatedAt: '2026-07-18',
    sections: [
      {
        heading: 'Qué es el depósito y qué no es',
        body: 'El depósito es una suma de dinero que entregás al inicio del alquiler como respaldo frente a posibles deudas o daños. Es tuyo: no es un pago a fondo perdido ni un mes de alquiler adelantado. Queda retenido durante el contrato y te lo tienen que devolver al final si no dejaste deudas ni daños que superen el desgaste normal. Ojo con no confundirlo: el depósito en garantía es distinto de la garantía de alquileres (Contaduría General de la Nación, ANDA, seguro de fianza) y también de los depósitos que a veces piden UTE u OSE para habilitar servicios. Cada uno tiene su propia lógica y su propia devolución.',
      },
      {
        heading: 'Cuánto suele ser',
        body: 'En el mercado uruguayo el depósito equivale con frecuencia a uno o más meses de alquiler, según lo que se pacte y el tipo de garantía que uses. La normativa vigente fija un tope máximo para el depósito en garantía de vivienda, del orden de varios meses de alquiler, así que conviene verificar el límite actual en el Banco Hipotecario del Uruguay (BHU) o con un profesional; dentro de ese margen no hay un monto único fijo y el número sale del acuerdo entre las partes y figura en el contrato. Cuando el depósito funciona como garantía principal, el efectivo suele constituirse en el BHU en Unidades Indexadas, según prevé la normativa. Antes de firmar, dejá claro por escrito cuánto entregás, en qué concepto y bajo qué condiciones se devuelve. Que quede documentado es lo que te va a permitir reclamarlo después sin discusiones sobre si existió o cuánto fue.',
      },
      {
        heading: 'Para qué puede usarlo el propietario',
        body: 'El propietario puede descontar del depósito lo que legítimamente le debas al terminar el contrato: alquileres o gastos comunes impagos, servicios pendientes a tu nombre y daños en la vivienda que excedan el desgaste normal del uso. Eso último es clave: paredes marcadas por el paso del tiempo, pintura gastada o cosas propias del uso razonable no son daños que puedas pagar vos. Sí lo son roturas, faltantes o deterioros claros. Lo que el propietario no puede hacer es quedarse con el depósito porque sí, ni usarlo para financiar mejoras que le suman valor a su propiedad más allá de reparar lo que rompiste.',
      },
      {
        heading: 'El inventario de entrada y salida',
        body: 'Tu mejor defensa es documentar el estado de la vivienda al entrar y al salir. Al mudarte, hacé un inventario con fotos y, si podés, un acta firmada por las dos partes que describa el estado de pisos, paredes, artefactos, aberturas y cualquier detalle. Al irte, repetí el registro. Con esa comparación es difícil que te imputen daños que ya existían o que son desgaste normal. Sin inventario, quedás expuesto a la palabra del propietario. Guardá todo con fecha. Este simple hábito es lo que más discusiones evita a la hora de recuperar tu plata.',
      },
      {
        heading: 'Cómo reclamar la devolución',
        body: 'Al finalizar, entregá la vivienda limpia y las llaves, y pedí por escrito la constancia de que no quedan deudas. El depósito debería devolverse una vez verificado que está todo en orden y saldados los servicios. Si el propietario se demora o retiene sin justificación, reclamá primero por escrito de forma fehaciente (telegrama colacionado), detallando el monto y el concepto. Si aun así no lo devuelve, tené presente que en Uruguay los conflictos de arrendamiento suelen exigir una instancia de conciliación o mediación previa (Centro de Mediación del Poder Judicial) antes de la vía judicial ante el Juzgado de Paz competente por la ubicación del inmueble. Un abogado puede ayudarte a encauzar el reclamo. Tener el contrato, el comprobante del depósito y los inventarios convierte tu reclamo en algo sólido y demostrable.',
      },
      {
        heading: 'Información general, no asesoramiento',
        body: 'Esta guía te explica cómo funciona en general el depósito, pero cada contrato define sus propias condiciones y el resultado depende de lo que hayas firmado y documentado, además de la normativa vigente. No sustituye el consejo de un profesional. Si el monto retenido es importante o hay desacuerdo sobre daños, consultá con un abogado antes de resignar tu plata, y recordá que los arrendamientos se tramitan ante el Juzgado de Paz y que suele exigirse una instancia de mediación previa ante el Poder Judicial. Guardá siempre copia del contrato, el recibo del depósito y los inventarios: son la base de cualquier reclamo.',
      },
    ],
    related: [
      { label: 'Guía para alquilar', to: '/alquilar-en-uruguay' },
      { label: 'Garantías de alquiler', to: '/guias/garantias-de-alquiler-uruguay' },
      { label: 'Rescindir el contrato', to: '/guias/como-rescindir-contrato-alquiler-uruguay' },
    ],
    steps: [
      {
        name: 'Documentá al entrar',
        text: 'Hacé un inventario con fotos fechadas del estado de la vivienda y, si podés, un acta firmada por las dos partes.',
      },
      {
        name: 'Guardá el comprobante',
        text: 'Que el contrato o un recibo digan cuánto entregaste, en qué concepto y bajo qué condiciones se devuelve el depósito.',
      },
      {
        name: 'Entregá y registrá la salida',
        text: 'Devolvé la vivienda limpia y las llaves, y repetí el inventario con fotos para probar el estado en que la dejás.',
      },
      {
        name: 'Pedí la constancia sin deudas',
        text: 'Solicitá por escrito que no quedan alquileres, común ni servicios pendientes, y coordiná la devolución del depósito.',
      },
      {
        name: 'Reclamá si no te lo devuelven',
        text: 'Enviá un reclamo fehaciente por telegrama colacionado; si persiste, pasá por la mediación previa y la vía judicial ante el Juzgado de Paz, idealmente con asesoramiento de un abogado.',
      },
    ],
  },
  {
    slug: 'alquilar-sin-garantia-uruguay',
    title: 'Cómo alquilar sin garantía en Uruguay',
    description:
      'Opciones reales para alquilar sin garante propietario en Uruguay: seguro de fianza, régimen sin garantía de la LUC, adelanto de meses, ANDA y la garantía estatal.',
    tag: 'SIN GARANTÍA',
    updatedAt: '2026-07-18',
    sections: [
      {
        heading: 'El problema del garante propietario',
        body: 'La garantía tradicional en Uruguay es que alguien con un inmueble responda por vos. El problema es que mucha gente no tiene a quién pedírselo, y esa traba deja a personas solventes sin poder alquilar. La buena noticia es que hoy existen varias alternativas legítimas para alquilar sin garante propietario. Cada una tiene un costo y un trade-off distinto: algunas te salen dinero, otras te piden adelantar meses y otras cambian las reglas del contrato. Conocerlas te da margen para negociar y no quedar rehén de la única condición que te ponga la inmobiliaria.',
      },
      {
        heading: 'Seguro de fianza',
        body: 'Es la vía más directa para muchos. Una aseguradora, como el Banco de Seguros del Estado o compañías privadas, garantiza al propietario a cambio de que vos pagues una prima. No necesitás garante ni ser funcionario público. Si la aseguradora termina pagando por vos, después te lo reclama, así que no es un cheque en blanco: es un seguro real. El costo depende del alquiler y de la cobertura, y hay diferencias entre compañías, por lo que conviene pedir varias cotizaciones. La contra es que la prima no la recuperás. La ventaja es rapidez y que le da al propietario una garantía formal y sólida.',
      },
      {
        heading: 'El régimen de arrendamiento sin garantía de la LUC',
        body: 'La Ley de Urgente Consideración creó un régimen específico de arrendamiento sin garantía para vivienda. Requiere un contrato escrito donde las dos partes declaren expresamente que se amparan a este régimen, que el destino sea casa habitación y que haya plazo y precio pactados. A cambio de no exigir garantía, la ley le da al propietario un proceso de desalojo más rápido si dejás de pagar. Para vos, la ventaja es entrar sin garante; la contraparte es que el margen ante un atraso es mucho más corto que en el régimen común. Si vas por esta vía, cumplí los pagos con rigor y entendé bien esos plazos antes de firmar.',
      },
      {
        heading: 'Adelanto de meses y depósito',
        body: 'Otra salida práctica es ofrecer adelantar varios meses de alquiler o dejar un depósito mayor como respaldo. A muchos propietarios les alcanza con eso, sobre todo entre particulares y sin inmobiliaria de por medio. La ventaja es que no pagás una prima a fondo perdido: es plata tuya que en buena parte se aplica a alquiler o se devuelve. La contra es evidente: necesitás capital disponible de entrada, y eso inmoviliza dinero. Si tenés ahorros y encontrás un propietario flexible, suele ser la opción más económica a la larga. Dejá siempre por escrito cuánto adelantás y a qué se imputa cada peso.',
      },
      {
        heading: 'ANDA y otras garantías institucionales',
        body: 'Si no tenés garante ni querés pagar un seguro, ANDA ofrece garantía de alquileres a sus asociados según ingresos y antigüedad, y funciona como respaldo formal ante el propietario. Requiere asociarse y pagar un costo, pero te habilita en inmobiliarias que exigen garantía institucional. Otra vía es la garantía estatal a través de la Contaduría General de la Nación: la pueden usar funcionarios públicos, pasivos del Estado y también empleados de empresas privadas inscriptas en el registro del servicio, y suele ser una opción muy accesible. Como los costos de ANDA y de la Contaduría cambian y son parecidos, compará las condiciones vigentes de cada una antes de decidir. La idea es que casi siempre hay una vía institucional que te sirve, según tu situación laboral.',
      },
      {
        heading: 'Cómo elegir y una aclaración',
        body: 'Sin capital para adelantar, lo más accesible suele ser un seguro de fianza, ANDA o la garantía de la Contaduría si calificás; con ahorros, el adelanto de meses te evita gastos a fondo perdido; el régimen sin garantía de la LUC te abre la puerta pero exige puntualidad absoluta. Pensá en tu flujo de dinero y en tu estabilidad de ingresos. Esta guía es información general; los costos, requisitos y condiciones cambian con el tiempo y entre entidades. Antes de firmar, pedí las condiciones vigentes a la aseguradora, a ANDA o a la Contaduría, y si vas por el régimen de la LUC, consultá a un escribano o abogado para entender bien qué estás firmando.',
      },
    ],
    related: [
      { label: 'Guía para alquilar', to: '/alquilar-en-uruguay' },
      { label: 'Garantías de alquiler', to: '/guias/garantias-de-alquiler-uruguay' },
      { label: 'Qué revisar antes de firmar', to: '/guias/que-revisar-antes-de-firmar-alquiler' },
    ],
    steps: [
      {
        name: 'Definí con qué contás',
        text: 'Mirá si tenés capital para adelantar meses, si sos funcionario público o pasivo del Estado, o si preferís pagar una prima. Eso descarta o habilita cada opción.',
      },
      {
        name: 'Pedí cotizaciones de fianza',
        text: 'Consultá al Banco de Seguros del Estado y a compañías privadas el costo y la cobertura del seguro de fianza para tu alquiler.',
      },
      {
        name: 'Compará ANDA y la garantía estatal',
        text: 'Evaluá la garantía de ANDA según tus ingresos y antigüedad y, si calificás, la garantía de la Contaduría General de la Nación; compará las condiciones y costos vigentes de cada una.',
      },
      {
        name: 'Evaluá el régimen de la LUC',
        text: 'Si el propietario ofrece contrato sin garantía bajo la LUC, entendé los plazos de desalojo más cortos antes de aceptar; consultá a un escribano.',
      },
      {
        name: 'Dejá todo por escrito',
        text: 'Cualquiera sea la vía, que el contrato indique la garantía elegida, los montos adelantados y a qué se imputa cada pago.',
      },
    ],
  },
  {
    slug: 'derechos-del-inquilino-uruguay',
    title: 'Derechos del inquilino en Uruguay',
    description:
      'Derechos del inquilino en Uruguay: topes al aumento de renta, reparaciones, privacidad, causas de desalojo y qué no puede exigirte el propietario.',
    tag: 'DERECHOS',
    updatedAt: '2026-07-18',
    sections: [
      {
        heading: 'El aumento de la renta y su índice',
        body: 'El alquiler de vivienda no se ajusta cuando el propietario quiere ni por el monto que se le ocurra. En Uruguay el reajuste se hace, por regla, una vez al año en la fecha aniversario del contrato, y siguiendo un índice objetivo pactado en el propio contrato: habitualmente el Índice de Precios al Consumo o algún coeficiente de reajuste de alquileres que publica el Instituto Nacional de Estadística. En el mercado libre el índice lo fijan las partes, e incluso puede pactarse en dólares o en otra unidad. Lo que manda es lo que figura en tu contrato. El propietario debe comunicarte el nuevo valor con antelación, según lo acordado. Un aumento fuera de fecha, sin aviso o por encima del índice pactado no es exigible. Verificá el coeficiente vigente en el INE.',
      },
      {
        heading: 'Reparaciones: quién paga qué',
        body: 'Como regla, las reparaciones importantes y estructurales corren por cuenta del propietario, porque hacen a que la vivienda siga siendo habitable: filtraciones graves, problemas del techo, instalaciones esenciales, humedades de fondo. El inquilino se hace cargo del mantenimiento menor y de los daños que provoque por mal uso. La lógica es simple: el propietario debe entregar y mantener una vivienda en condiciones de ser vivida, y vos debés cuidarla y no romperla. Cuando surge un problema estructural, avisá por escrito de forma fehaciente y dale plazo razonable para resolver. Documentar el reclamo es clave, porque descontar del alquiler no es algo que puedas hacer por tu cuenta y sin más: conviene encauzarlo por la vía correspondiente para que no se lea como falta de pago.',
      },
      {
        heading: 'Tu derecho a la privacidad',
        body: 'Mientras dure el contrato y pagues, la vivienda es tu hogar y el propietario no puede entrar cuando se le antoje. No tiene derecho a presentarse sin aviso, revisar la casa a su gusto ni ingresar sin tu consentimiento. Si necesita inspeccionar algo o mostrar la propiedad hacia el fin del contrato, debe coordinar con vos con anticipación razonable. Tampoco puede cambiar la cerradura, cortarte servicios ni sacarte cosas para presionarte: eso es ilegal, aunque le debas plata. El propietario recupera la posesión únicamente por las vías legales, nunca por mano propia.',
      },
      {
        heading: 'Desalojo: causas y proceso',
        body: 'El propietario no puede echarte por su cuenta: el desalojo es un proceso judicial con causa y plazos. Las causas típicas son la falta de pago, el vencimiento del plazo o el mal uso del inmueble. Los plazos dependen del régimen del contrato: en el común son más largos, mientras que en el régimen sin garantía de la LUC son marcadamente más cortos, tanto por vencimiento como por falta de pago. En todos los casos hay intimación y una resolución judicial antes de cualquier lanzamiento. Si te llega una intimación, no la ignores: consultá de inmediato con un abogado, porque los plazos corren y actuar a tiempo puede cambiar el resultado.',
      },
      {
        heading: 'Qué NO puede exigirte el propietario',
        body: 'No puede cobrarte aumentos por fuera del índice y la fecha pactados, ni pedirte dinero por conceptos no previstos en el contrato. No puede quedarse con el depósito sin justificar deudas o daños reales. No puede obligarte a pagar reparaciones estructurales que le corresponden, ni cobrarte por el desgaste normal de la vivienda. No puede cortarte servicios, cambiar la cerradura ni entrar sin permiso para presionarte. Tampoco puede cargarte impuestos que son suyos, como el IRPF sobre el alquiler que percibe, que lo paga el propietario ante la DGI. Si algo de esto pasa, dejá constancia por escrito.',
      },
      {
        heading: 'Información general, no asesoramiento',
        body: 'Los derechos concretos dependen del régimen de tu contrato y de sus cláusulas, así que esta guía es orientativa y no reemplaza el consejo profesional. Si enfrentás un desalojo, un aumento abusivo o un conflicto serio, consultá cuanto antes con un abogado o con una liga o asociación de inquilinos, que suelen dar asesoramiento accesible. Para índices y coeficientes de reajuste, la fuente oficial es el Instituto Nacional de Estadística. Guardá tu contrato, los recibos y toda comunicación fehaciente: son la base para hacer valer tus derechos.',
      },
    ],
    related: [
      { label: 'Guía para alquilar', to: '/alquilar-en-uruguay' },
      { label: 'Rescindir el contrato', to: '/guias/como-rescindir-contrato-alquiler-uruguay' },
      { label: 'Qué revisar antes de firmar', to: '/guias/que-revisar-antes-de-firmar-alquiler' },
    ],
  },
  {
    slug: 'que-revisar-antes-de-firmar-alquiler',
    title: 'Qué revisar antes de firmar un contrato de alquiler',
    description:
      'Checklist antes de firmar un alquiler en Uruguay: cláusulas clave, estado del inmueble, gastos comunes, reajuste, plazo, garantía y quién paga qué.',
    tag: 'CHECKLIST',
    updatedAt: '2026-07-18',
    sections: [
      {
        heading: 'Leé el contrato entero antes de firmar',
        body: 'Parece obvio, pero mucha gente firma sin leer y después reclama por algo que aceptó. El contrato es la ley entre vos y el propietario: manda por encima de lo que te dijeron de palabra. Prestá atención al plazo, al índice y la fecha de reajuste, a la penalidad por rescisión anticipada, al tipo de garantía y a quién paga cada gasto. Si algo no está claro o te prometieron algo que no figura, exigí que se escriba. Y si el contrato invoca el régimen de arrendamiento sin garantía de la LUC, entendé que eso implica plazos de desalojo más cortos. Nunca firmes lo que no entendés.',
      },
      {
        heading: 'El estado real del inmueble',
        body: 'Antes de firmar, recorré la vivienda con calma y probá lo que puedas: canillas, presión de agua, calefón, estufas, enchufes, aberturas, cerraduras, humedades y filtraciones. Fijate el estado de pisos, paredes y artefactos. Todo lo que esté deteriorado al entrar debe quedar registrado en un inventario con fotos fechadas y, si es posible, en un acta firmada por las dos partes. Ese registro es tu escudo: sin él, al irte te pueden imputar daños que ya existían. Revisar el inmueble también te dice qué reparaciones estructurales pendientes deberías exigir que el propietario resuelva antes o durante el contrato.',
      },
      {
        heading: 'Gastos comunes y servicios: quién paga qué',
        body: 'Dejá clarísimo por escrito quién paga los gastos comunes en un edificio, y si el monto que te dicen incluye o no reservas y gastos extraordinarios. Las mejoras estructurales del edificio suelen ser cargo del propietario, no del inquilino. Confirmá también cómo quedan UTE, OSE, gas, internet y la contribución inmobiliaria o municipal. Como regla general, los consumos que hacés vos los pagás vos, mientras que los impuestos de la propiedad y el IRPF sobre el alquiler son del propietario. Un contrato que mezcla todo sin detallar es una fuente segura de conflictos. Pedí que cada concepto quede especificado con nombre y responsable.',
      },
      {
        heading: 'Plazo, reajuste y salida',
        body: 'Confirmá el plazo del contrato y desde cuándo podés rescindir sin penalidad, con cuánto preaviso y qué indemnización se pacta si te vas antes. Revisá el índice de reajuste que se pacta —habitualmente el IPC del INE, la Unidad Indexada (UI) o la Unidad Reajustable (UR)—, la periodicidad (por regla, anual en el aniversario) y el aviso previo del nuevo valor. Estos tres puntos definen cuánto vas a pagar en el tiempo y qué flexibilidad tenés para irte. Un preaviso muy largo o una penalidad muy alta pueden atarte a un lugar que quizás quieras dejar. Negociá estas cláusulas antes de firmar, no después: después ya no se cambian.',
      },
      {
        heading: 'Garantía y depósito',
        body: 'Verificá qué garantía acepta el propietario (Contaduría, ANDA, seguro de fianza, garantía de propietario o depósito) y elegí la que menos te cueste según tu situación. Si dejás depósito, que el contrato diga cuánto es, en qué concepto y bajo qué condiciones se devuelve. Chequeá que el propietario o su representante estén habilitados para alquilar el inmueble y que no haya un tercero con derechos sobre la propiedad. Confirmá también con quién firmás: si es una inmobiliaria, quién administra y a quién le pagás. Estos detalles evitan sorpresas y te aseguran que estás firmando con quien corresponde.',
      },
      {
        heading: 'Información general, no asesoramiento',
        body: 'Esta guía es un checklist orientativo; cada contrato es distinto y conviene revisarlo con cabeza fría. No sustituye el consejo de un profesional. Si el alquiler es de monto importante, si el contrato tiene cláusulas que no entendés o si te ofrecen el régimen sin garantía de la LUC, consultá con un escribano o abogado antes de firmar: es una inversión chica frente a un problema grande. Guardá copia firmada del contrato, del inventario de entrada y de todos los recibos desde el primer día.',
      },
    ],
    related: [
      { label: 'Guía para alquilar', to: '/alquilar-en-uruguay' },
      { label: 'Garantías de alquiler', to: '/guias/garantias-de-alquiler-uruguay' },
      { label: 'Derechos del inquilino', to: '/guias/derechos-del-inquilino-uruguay' },
    ],
    steps: [
      {
        name: 'Verificá con quién firmás',
        text: 'Confirmá que el propietario o la inmobiliaria estén habilitados para alquilar el inmueble y a quién le vas a pagar cada mes.',
      },
      {
        name: 'Inspeccioná y documentá',
        text: 'Recorré la vivienda, probá servicios y artefactos, y registrá el estado en un inventario con fotos fechadas antes de firmar.',
      },
      {
        name: 'Revisá las cláusulas clave',
        text: 'Chequeá plazo, preaviso, penalidad de rescisión, índice y fecha de reajuste, y si el contrato invoca el régimen sin garantía de la LUC.',
      },
      {
        name: 'Aclará gastos y garantía',
        text: 'Que quede por escrito quién paga común, servicios e impuestos, qué garantía se usa y las condiciones del depósito.',
      },
      {
        name: 'Consultá si hay dudas',
        text: 'Ante cláusulas confusas o montos altos, pedí revisión a un escribano o abogado antes de firmar, no después.',
      },
    ],
  },
  {
    slug: 'alquiler-temporario-uruguay',
    title: 'Alquiler temporario y Airbnb en Uruguay: lo que hay que saber',
    description:
      'Alquiler temporario y Airbnb en Uruguay: diferencias con el alquiler permanente, obligaciones tributarias ante DGI y riesgos para anfitrión e inquilino.',
    tag: 'TEMPORARIO',
    updatedAt: '2026-07-18',
    sections: [
      {
        heading: 'En qué se diferencia del alquiler de vivienda',
        body: 'El alquiler temporario, típico de la temporada o de plataformas como Airbnb, es jurídicamente distinto del alquiler de vivienda permanente. No es tu hogar estable: es una estadía corta, con fines de turismo o transitorios, por días o semanas. Por eso no se rige por el régimen protector del inquilino de vivienda (plazos largos, topes de reajuste, procesos de desalojo especiales), sino por lo que las partes pacten para esa estadía puntual. Esta diferencia importa mucho: como huésped no tenés la misma protección que un inquilino de vivienda, y como anfitrión no podés usar el temporario para esquivar los derechos de quien en realidad vive ahí de forma permanente.',
      },
      {
        heading: 'Obligaciones tributarias del anfitrión',
        body: 'Si alquilás, incluso por temporada, generás renta y eso tributa. En general el propietario paga IRPF sobre el arrendamiento como rendimiento de capital inmobiliario: la tasa suele estar en el entorno del 12% sobre el ingreso computable, con anticipos mensuales del orden del 10,5% cuando no hay agente de retención. Son valores que conviene chequear vigentes en la DGI, porque dependen de tu caso. El arrendamiento de inmuebles, en general, no lleva IVA, y en lugar de factura con IVA se emiten recibos de arrendamiento. Pero el alquiler temporario con servicios de tipo hotelero o de corta estadía puede tener un tratamiento tributario distinto y más complejo. Verificá tu situación puntual en la DGI, porque cambia según el destino, la duración y los servicios que prestes.',
      },
      {
        heading: 'Registro y reglas locales',
        body: 'Más allá de los impuestos nacionales, el alquiler temporario puede estar sujeto a exigencias departamentales y a reglas del edificio donde esté la propiedad. Algunas intendencias, sobre todo en zonas turísticas, tienen registros o requisitos para el alquiler de corta estadía, y muchos reglamentos de copropiedad restringen o prohíben directamente el uso tipo Airbnb. Antes de publicar tu propiedad, revisá el reglamento del edificio y consultá en tu intendencia si hay que registrarse o cumplir alguna condición. Ignorar esto puede derivar en multas o en conflictos con los vecinos y la administración del edificio, además del riesgo tributario.',
      },
      {
        heading: 'Riesgos para el anfitrión',
        body: 'Como anfitrión, tus riesgos van más allá de los impuestos. Está el desgaste y los posibles daños a la propiedad, la responsabilidad si un huésped se accidenta, los conflictos con vecinos por ruido o movimiento, y la posibilidad de que alguien se quede más de lo pactado. Si prestás la vivienda a largo plazo bajo apariencia de temporario para evitar las protecciones del inquilino, además podés terminar en un problema legal si se prueba que en los hechos era vivienda permanente. Conviene tener contrato escrito de cada estadía, reglas claras, un seguro adecuado y cumplir en regla con la DGI y con las normas locales.',
      },
      {
        heading: 'Riesgos para el huésped o inquilino',
        body: 'Del lado de quien alquila temporario, la protección es menor que en un alquiler de vivienda. No tenés la estabilidad ni las garantías del régimen de inquilinos: la relación se rige por lo pactado para esa estadía corta. Por eso importa reservar por canales serios, tener por escrito precio, fechas, qué incluye y la política de cancelación, y desconfiar de pedidos de pago total por fuera de la plataforma o sin comprobante. Verificá que la publicación sea real antes de transferir dinero, porque las estafas con alquileres temporarios inexistentes son frecuentes, sobre todo en temporada. Si algo suena demasiado barato o te apuran, frená y confirmá.',
      },
      {
        heading: 'Información general, no asesoramiento',
        body: 'El tratamiento tributario y legal del alquiler temporario depende de detalles concretos: destino, duración, servicios prestados, departamento y reglamento del edificio. Esta guía es información general y no reemplaza el consejo profesional. Antes de operar como anfitrión, consultá con un contador para tu situación ante la DGI y revisá las reglas de tu intendencia y de tu edificio. Para contratos y responsabilidades, un abogado o escribano puede orientarte. La fuente oficial en materia impositiva es la DGI, y conviene chequear ahí las tasas y condiciones vigentes antes de decidir.',
      },
    ],
    related: [
      { label: 'Guía para alquilar', to: '/alquilar-en-uruguay' },
      { label: 'Cómo funciona el IRPF', to: '/guias/como-funciona-el-irpf-uruguay' },
      { label: 'Derechos del inquilino', to: '/guias/derechos-del-inquilino-uruguay' },
    ],
  },
  {
    slug: 'comprar-primera-vivienda-uruguay',
    title: 'Comprar tu primera vivienda en Uruguay: guía paso a paso',
    description:
      'Guía paso a paso para comprar tu primera casa en Uruguay: ahorro previo, reserva, promesa, escribano y escritura, y dónde se va la plata.',
    tag: 'COMPRA',
    updatedAt: '2026-07-18',
    sections: [
      {
        heading: 'El precio no es el gasto total',
        body: 'El error más común es presupuestar solo el precio de la propiedad. En Uruguay, además del valor de compra tenés que sumar los honorarios del escribano (que suelen rondar el 3% del valor como cifra de referencia, a los que se agregan el aporte a la Caja Notarial y el IVA; los aranceles no son obligatorios y varían, así que confirmá el número con tu escribano), el ITP a cargo del comprador (una tasa del 2% que fija la DGI y que se calcula sobre el valor real de Catastro, no sobre el precio pactado; verificá la tasa vigente), más aportes, montepío notarial y certificados. Si comprás con crédito, agregá los costos del banco: tasación, gastos de otorgamiento y a veces seguros. Como referencia práctica, conviene reservar aproximadamente entre un 5% y un 8% adicional al precio para cubrir todos estos gastos. Presupuestar de menos es la causa número uno de operaciones que se caen sobre la firma.',
      },
      {
        heading: 'El ahorro previo y la capacidad de pago',
        body: 'Antes de mirar propiedades, definí cuánto podés poner de tu bolsillo y cuánto necesitás financiar. Los bancos y el BHU rara vez prestan el 100%: según el caso suelen financiar hasta un 80% o 90% del valor (en algunos programas puede ser mayor), así que necesitás un pozo inicial. Además, la cuota del crédito no debería superar aproximadamente el 25% al 30% de tu ingreso familiar neto, que es el orden de tope que suelen exigir, aunque varía según el banco y el programa (el BHU maneja topes de ese estilo y hasta algo más en ciertos casos), así que confirmá las condiciones vigentes. Tené en cuenta que la mayoría de los créditos de vivienda se otorgan en Unidades Indexadas (UI), atadas a la inflación, por lo que la cuota en pesos sube todos los años aunque en UI sea estable.',
      },
      {
        heading: 'Elegir y verificar antes de comprometerte',
        body: 'Cuando encontrás algo que te gusta, no te apures con la emoción. Pedí el número de padrón y verificá con un escribano que el título esté limpio, que no haya deudas de contribución inmobiliaria, tributos domiciliarios ni gastos comunes atrasados, y que quien vende sea realmente el titular. Revisá el estado edilicio, humedades, instalación eléctrica y sanitaria, y si el inmueble está regularizado ante la intendencia (planos aprobados, sin construcciones no declaradas). En propiedad horizontal, pedí el reglamento de copropiedad y el estado de deudas del edificio. Esta etapa de estudio de título la coordina el escribano y es lo que te protege.',
      },
      {
        heading: 'Reserva, seña y promesa de compraventa',
        body: 'El circuito habitual es: primero una reserva (una suma pequeña para sacar la propiedad del mercado mientras se estudia el título), después la promesa o boleto de compraventa con la seña, y finalmente la escritura. La promesa es el contrato serio que fija precio, plazos y condiciones, y conviene inscribirla en el Registro para quedar protegido frente a terceros. Nunca entregues una seña importante sin una promesa firmada ante escribano: pagar plata contra un simple recibo, sin contrato ni estudio de título, es donde más gente se quema. La seña compromete a ambas partes.',
      },
      {
        heading: 'Escritura, mudanza y después',
        body: 'El día de la escritura, el escribano lee y firma la compraventa, se paga el saldo del precio y los impuestos, y con esa firma pasás a ser propietario. El escribano inscribe la escritura en el Registro de la Propiedad, paso que consolida tu titularidad y te protege frente a terceros. Guardá copia de todo. Después de la mudanza, poné los servicios a tu nombre (UTE, OSE, gas), avisá a la intendencia el cambio de titularidad para la contribución, y si vivís en propiedad horizontal, registrate ante la administración del edificio. Recién cuando la inscripción registral está completa podés dormir tranquilo.',
      },
      {
        heading: 'Esto es orientación general',
        body: 'Esta guía explica cómo funciona el proceso y no sustituye asesoramiento profesional. La compraventa de inmuebles en Uruguay pasa obligatoriamente por escribano público, y él es quien estudia el título, calcula impuestos y te protege legalmente. Para los números exactos de tu caso (ITP, honorarios, aportes) consultá directamente al escribano y a la DGI, y para las condiciones de crédito, al BHU o al banco. Los valores de referencia cambian todos los años; verificá siempre las cifras vigentes con la fuente oficial antes de firmar.',
      },
    ],
    related: [
      { label: 'Crédito hipotecario', to: '/guias/credito-hipotecario-uruguay' },
      { label: 'Costos de escrituración', to: '/guias/costos-de-escrituracion-uruguay' },
      { label: 'Cómo funciona el BHU', to: '/guias/bhu-como-funciona' },
    ],
  },
  {
    slug: 'credito-hipotecario-uruguay',
    title: 'Cómo funciona el crédito hipotecario en Uruguay',
    description:
      'Cómo funciona el crédito hipotecario en Uruguay: BHU vs bancos, la moneda del préstamo y su riesgo, requisitos, relación cuota-ingreso y plazos.',
    tag: 'HIPOTECA',
    updatedAt: '2026-07-18',
    sections: [
      {
        heading: 'Qué es y quién presta',
        body: 'Un crédito hipotecario financia la compra de una vivienda dejando la propia vivienda como garantía: si no pagás, el acreedor puede ejecutar la hipoteca. En Uruguay los principales oferentes son el BHU (Banco Hipotecario del Uruguay), el BROU y los bancos privados. El BHU está especializado en vivienda y suele tener líneas pensadas para primera vivienda y sectores de ingresos medios; los bancos ofrecen productos hipotecarios más flexibles en moneda y plazo. Conviene comparar más de una opción, porque cambian tasa, moneda, plazo máximo y el porcentaje del valor que financian.',
      },
      {
        heading: 'La moneda del crédito es lo más importante',
        body: 'En Uruguay el crédito de vivienda suele otorgarse en Unidades Indexadas (UI), que se ajustan por inflación (IPC). La cuota en UI es fija, pero medida en pesos se reajusta con la inflación, así que en pesos crece con el tiempo. También existen préstamos en Unidades Reajustables (UR), atadas a la evolución de los salarios, o directamente en dólares o pesos. La regla de oro: ganás y pensás en la moneda de tu sueldo. Endeudarte en dólares cobrando en pesos te expone a que, si sube el dólar, la cuota se dispare respecto a tu ingreso. UI y UR reparten ese riesgo distinto; entendé cuál asumís.',
      },
      {
        heading: 'Requisitos de ingreso y capacidad de pago',
        body: 'El banco o el BHU evalúa que puedas pagar. El criterio central es la relación cuota-ingreso: la cuota no debería superar en torno al 25% al 35% de tu ingreso familiar neto mensual, según la institución, la moneda del crédito y si el pago se descuenta de la nómina; verificá el tope vigente con cada banco o con el BHU. Piden antigüedad laboral demostrable (los dependientes suelen necesitar uno o dos años; los independientes, actividad probada con DGI al día). Podés sumar ingresos del cónyuge o de codeudores para calificar. También revisan tus antecedentes crediticios en la Central de Riesgos del BCU y, en la práctica, en el Clearing de Informes, que es privado y distinto.',
      },
      {
        heading: 'Plazo, tasa y cuánto financian',
        body: 'El plazo de un hipotecario suele ir hasta 20, 25 o 30 años. A mayor plazo, cuota mensual más baja pero muchísimo más interés total pagado a lo largo de la vida del préstamo. La tasa se expresa como tasa efectiva anual (TEA) sobre la unidad del crédito (por ejemplo, un porcentaje anual en UI). Además, casi nunca te prestan el 100%: es habitual financiar hasta el 80% o 90% del valor, por lo que necesitás ahorro previo para la diferencia. Pedí siempre la TEA y una tabla de amortización para comparar en serio.',
      },
      {
        heading: 'Costos y seguros que se suman',
        body: 'El crédito trae gastos más allá de la cuota. Suele haber costo de tasación del inmueble, gastos de otorgamiento y estudio, y seguros obligatorios: seguro de vida sobre el saldo deudor (si el deudor fallece, cancela la deuda) y seguro del inmueble contra incendio y ciertos siniestros. Estos seguros van dentro o encima de la cuota y conviene incluirlos al comparar el costo real. También pagás los gastos de la escritura de compraventa y de la hipoteca, que se firman ante escribano. Pedí el detalle completo por escrito antes de firmar.',
      },
      {
        heading: 'Esto es orientación general',
        body: 'Esta guía explica el mecanismo, no es asesoramiento financiero personalizado. Las tasas, los topes de cuota-ingreso, los montos máximos y las líneas disponibles cambian y dependen de tu perfil: verificá las condiciones vigentes directamente con el BHU, el BROU o el banco privado, y consultá la Central de Riesgos del BCU para conocer tu situación crediticia. Antes de comprometerte a un plazo largo, hacé el cálculo del costo total y evaluá con un contador o asesor si la cuota es sostenible ante subas de inflación o del dólar.',
      },
    ],
    related: [
      { label: 'Cómo funciona el BHU', to: '/guias/bhu-como-funciona' },
      { label: 'Comprar tu primera vivienda', to: '/guias/comprar-primera-vivienda-uruguay' },
      { label: 'Conversor de Unidad Indexada', to: '/herramientas/conversor-unidad-indexada' },
    ],
  },
  {
    slug: 'costos-de-escrituracion-uruguay',
    title: 'Costos de escrituración al comprar una casa en Uruguay',
    description:
      'Todos los gastos de escriturar una casa en Uruguay más allá del precio: honorarios de escribano, ITP, aportes, montepío y certificados, y cómo estimar el total.',
    tag: 'COSTOS',
    updatedAt: '2026-07-18',
    sections: [
      {
        heading: 'Por qué el precio no alcanza',
        body: 'Escriturar una vivienda en Uruguay tiene un paquete de gastos que se suman al precio de compra y que hay que tener juntados el día de la firma. Los principales son los honorarios del escribano, el Impuesto a las Transmisiones Patrimoniales (ITP), los aportes y montepío notarial, y una serie de certificados y trámites registrales. Como referencia práctica y orientativa, el comprador suele destinar del orden de un 5% a un 8% del precio a estos gastos, aunque el porcentaje varía bastante según el valor real de la propiedad, el escribano y si comprás financiado. Verificá el desglose vigente pidiéndole al escribano una liquidación por escrito: estimarlo mal es lo que hace que muchas operaciones se traben sobre la fecha.',
      },
      {
        heading: 'Honorarios del escribano',
        body: 'En Uruguay la compraventa la hace un escribano público, que estudia el título, redacta la escritura, retiene y paga los impuestos e inscribe la operación en el Registro. Sus honorarios son habitualmente cercanos al 3%, calculado sobre el mayor valor entre el precio y el valor real actualizado del bien, más IVA y el aporte a la Caja Notarial. El arancel es referencial y puede negociarse. Normalmente el comprador designa y paga a su escribano. Si comprás con crédito, muchas veces el banco o el BHU exige su propio escribano para la hipoteca, lo que puede sumar un honorario adicional por esa escritura. Pedí presupuesto por escrito antes de avanzar, discriminando honorario, IVA e impuestos.',
      },
      {
        heading: 'El ITP: comprador y vendedor',
        body: 'El Impuesto a las Transmisiones Patrimoniales grava la transferencia del inmueble. Según la DGI, se aplica un 2% al comprador y un 2% al vendedor, calculado no sobre el precio de venta sino sobre el valor real que fija la Dirección Nacional de Catastro para esa propiedad, valor que se actualiza por el Índice de Precios al Consumo (IPC). Es decir, cada parte paga su 2%. El escribano actúa como agente de retención: cobra el ITP en la escritura y lo vuelca a la DGI. Como se calcula sobre el valor catastral, que suele ser menor al de mercado, conviene pedir la cédula catastral para estimar el monto con anticipación.',
      },
      {
        heading: 'Aportes, montepío y certificados',
        body: 'Además del honorario y el ITP hay costos menores pero que suman. El montepío es el aporte a la Caja Notarial, que se liquida en función del honorario notarial y, por lo tanto, escala con la operación. Hay que gestionar y pagar diversos certificados y trámites: información registral (que confirma titularidad y ausencia de embargos o hipotecas), certificados de estar al día con tributos, aportes de BPS cuando corresponde y, en propiedad horizontal, la constancia de deudas de gastos comunes. Cada certificado tiene un pequeño costo. El escribano los solicita como parte del estudio de título, y el detalle final aparece en su liquidación de gastos.',
      },
      {
        heading: 'Cómo estimar tu total',
        body: 'Para hacerte una idea antes de firmar, pedí al escribano una liquidación estimada que discrimine: honorarios más IVA y aporte a la Caja Notarial, ITP del comprador sobre el valor catastral, montepío y certificados. Sumá aparte, si comprás financiado, los gastos del crédito y de la escritura de hipoteca. Trabajá con el valor real de Catastro para el ITP, no con el precio de venta, porque suelen diferir. Tené la plata de los gastos disponible y líquida para el día de la escritura, separada del dinero del precio. Un buen escribano te da este desglose sin problema.',
      },
      {
        heading: 'Esto es orientación general',
        body: 'Los porcentajes de honorarios, los valores catastrales y los costos de certificados cambian, y cada operación es distinta. Esta guía describe qué gastos existen y cómo se calculan, pero los números exactos de tu caso los da el escribano público, que es quien liquida y paga estos tributos. Para el ITP y su base imponible, la fuente oficial es la DGI; para los aportes, el BPS y la Caja Notarial. Verificá siempre las cifras vigentes antes de comprometerte y no firmes sin una liquidación de gastos detallada por escrito.',
      },
    ],
    related: [
      { label: 'Comprar tu primera vivienda', to: '/guias/comprar-primera-vivienda-uruguay' },
      { label: 'Promesa de compraventa', to: '/guias/promesa-de-compraventa-uruguay' },
      { label: 'Cómo funciona el BHU', to: '/guias/bhu-como-funciona' },
    ],
  },
  {
    slug: 'bhu-como-funciona',
    title: 'El BHU: cómo funciona y para qué sirve',
    description:
      'Qué es el Banco Hipotecario del Uruguay, sus planes de ahorro previo y líneas de crédito para vivienda, la diferencia con la ANV y para quién conviene.',
    tag: 'VIVIENDA',
    updatedAt: '2026-07-18',
    sections: [
      {
        heading: 'Qué es el BHU',
        body: 'El BHU, Banco Hipotecario del Uruguay, es un banco estatal especializado en el financiamiento de la vivienda. A diferencia de un banco comercial que ofrece muchos productos, el BHU está enfocado en ayudar a la gente a comprar, construir o refaccionar su casa, principalmente a través de créditos hipotecarios y de planes de ahorro previo. Históricamente cumplió un rol central en el acceso a la vivienda en Uruguay. Hoy sus créditos suelen otorgarse en Unidades Indexadas (UI), atadas a la inflación, o en pesos. Tené en cuenta que muchos créditos más antiguos están en Unidades Reajustables (UR), que en vez de ajustar por inflación se ajustan por el índice medio de salarios, así que conviene mirar bien en qué unidad queda tu préstamo. Sus condiciones están pensadas para hogares de ingresos medios y para quienes compran su primera vivienda.',
      },
      {
        heading: 'El ahorro previo: Yo Ahorro',
        body: 'Una de las herramientas típicas del BHU es el ahorro previo, con planes como Yo Ahorro. La lógica es simple: ahorrás de forma sistemática durante un período para formar el pozo inicial que necesitás, y ese comportamiento de ahorro te habilita y te da mejores condiciones al momento de pedir el crédito. Es una manera ordenada de juntar la parte que el crédito no financia, porque el banco rara vez presta el 100% del valor. Si estás pensando en comprar en algunos años, empezar un plan de ahorro previo temprano te posiciona mejor para calificar cuando llegue el momento.',
      },
      {
        heading: 'Las líneas de crédito para vivienda',
        body: 'El BHU ofrece créditos para comprar vivienda nueva o usada, y también para construir o refaccionar. Como en cualquier hipotecario, evalúan tu capacidad de pago con la relación cuota-ingreso: según los criterios del BHU, la cuota suele ubicarse en el entorno del 25% al 30% del ingreso líquido disponible, pero verificá el porcentaje vigente directamente en el banco. También pesan tu antigüedad laboral y tus antecedentes crediticios. Financian un porcentaje del valor, no la totalidad, así que necesitás ahorro previo. Al estar el crédito en UI, la cuota en pesos sube con la inflación aunque en UI sea fija. Los montos, tasas y topes varían, por lo que hay que confirmarlos con el banco.',
      },
      {
        heading: 'BHU y ANV: no son lo mismo',
        body: 'Es común confundir el BHU con la ANV. La Agencia Nacional de Vivienda (ANV) es un organismo distinto: administra carteras de créditos, ejecuta programas de vivienda del Ministerio de Vivienda (MVOT, que es el organismo rector de la política habitacional) y brinda servicios vinculados, mientras que el BHU es el banco que otorga los créditos y capta el ahorro. En la práctica trabajan de forma complementaria dentro del sistema público de vivienda. Para vos como comprador, lo relevante es que el crédito hipotecario y los planes de ahorro los tramitás con el BHU, y que ciertos programas o gestiones específicas pueden pasar por la ANV. Ante la duda, consultá cuál corresponde a tu trámite.',
      },
      {
        heading: 'Para quién conviene',
        body: 'El BHU suele ser una buena opción para quien compra su primera vivienda, tiene ingresos medios y busca condiciones estables pensadas para vivienda, más que para quien necesita un producto financiero flexible o comprar en dólares. Su fuerte es el crédito en UI de largo plazo y el ahorro previo. Aun así, no lo tomes como única alternativa: compará contra el BROU y los bancos privados en tasa, moneda, plazo y porcentaje financiado, porque según tu perfil e ingreso otra institución puede resultarte mejor. Pedí en cada una una simulación con la cuota y el costo total.',
      },
      {
        heading: 'Esto es orientación general',
        body: 'Esta guía explica el rol del BHU de forma general y no sustituye la información oficial. Las líneas de crédito, planes de ahorro, tasas, montos y requisitos cambian con el tiempo: consultá las condiciones vigentes directamente en el BHU y, para trámites de programas de vivienda, en la ANV o el Ministerio de Vivienda (MVOT). Antes de decidirte por una institución, compará opciones y evaluá con un asesor si la cuota es sostenible en el largo plazo, considerando que en UI la cuota en pesos crece con la inflación año a año.',
      },
    ],
    related: [
      { label: 'Crédito hipotecario', to: '/guias/credito-hipotecario-uruguay' },
      { label: 'Comprar tu primera vivienda', to: '/guias/comprar-primera-vivienda-uruguay' },
      { label: 'Mejores bancos de Uruguay', to: '/mejores-bancos-uruguay' },
    ],
  },
  {
    slug: 'comprar-un-terreno-uruguay',
    title: 'Comprar un terreno en Uruguay: qué verificar',
    description:
      'Qué verificar antes de comprar un terreno en Uruguay: padrón, plano de mensura, servidumbres, servicios, zonificación, deudas de contribución y título.',
    tag: 'TERRENO',
    updatedAt: '2026-07-18',
    sections: [
      {
        heading: 'Empezá por el padrón y el título',
        body: 'Todo terreno en Uruguay tiene un número de padrón, que es su identificación catastral asignada por la Dirección Nacional de Catastro y que también se usa para identificarlo en el registro. Con ese padrón, un escribano hace el estudio de título para confirmar quién es realmente el propietario y que la cadena de propietarios anteriores esté en regla, sin vicios que puedan hacer caer tu compra años después. También verifica que no pesen sobre el inmueble hipotecas, embargos, promesas inscriptas u otros gravámenes. Comprar un terreno sin este estudio es de los errores más caros que se pueden cometer, porque un problema de título puede dejarte sin la propiedad y sin la plata.',
      },
      {
        heading: 'El plano de mensura y la superficie real',
        body: 'El plano de mensura, hecho por un agrimensor, define con precisión los límites, la superficie real y la ubicación exacta del terreno. Es fundamental porque lo que figura en el aviso o lo que te muestran en el lugar puede no coincidir con lo inscripto. La mensura confirma que el terreno que comprás es el que creés, con los metros que creés, y detecta si hay diferencias con lo declarado o invasiones con predios vecinos. En terrenos sin plano actualizado, conviene encargar o exigir una mensura antes de comprar. Es la herramienta técnica que evita comprar menos metros de los pagados.',
      },
      {
        heading: 'Servidumbres, servicios y accesos',
        body: 'Verificá si el terreno tiene servidumbres: por ejemplo, una servidumbre de paso que obligue a dejar pasar a un vecino, o de conducción de servicios, que limitan lo que podés hacer. Confirmá qué servicios llegan efectivamente al predio: agua de OSE, energía de UTE, saneamiento (que según la zona puede depender de OSE o de la intendencia), y si no llegan, cuánto costaría conectarlos, porque puede ser una fortuna. Revisá el acceso real al terreno: que exista una calle o camino formal y no una entrada de hecho que mañana te puedan cerrar. Estos detalles cambian por completo el valor y la usabilidad del terreno, y muchos no se ven a simple vista.',
      },
      {
        heading: 'Zonificación y qué podés construir',
        body: 'No en todo terreno podés construir lo que quieras. Cada intendencia tiene normas de ordenamiento territorial que definen la zonificación: si el suelo es urbano, suburbano o rural, qué usos se permiten, retiros, altura máxima y factores de ocupación. Un terreno rural puede tener restricciones para levantar una vivienda o para subdividir. Antes de comprar, consultá en la intendencia la situación del padrón y qué se puede hacer ahí. Comprar pensando en un proyecto que la normativa no permite es un error frecuente. Confirmá también si el terreno está en zona inundable o con otras limitaciones ambientales.',
      },
      {
        heading: 'Deudas de contribución y tributos',
        body: 'Las deudas por contribución inmobiliaria y otros tributos suelen seguir al inmueble, no solo al dueño anterior. Por eso hay que verificar que el terreno esté al día con la contribución de la intendencia y con cualquier tributo departamental o nacional que corresponda. El escribano pide los certificados que confirman la situación tributaria y se asegura de que no arrastres deudas ajenas. Reclamar después es engorroso, así que la regla es que el vendedor entregue el inmueble libre de deudas y eso quede documentado en la escritura. Pedí el detalle antes de firmar la promesa, no sobre la fecha de escritura.',
      },
      {
        heading: 'Esto es orientación general',
        body: 'Comprar un terreno tiene más trampas técnicas y jurídicas que comprar una casa terminada, y esta guía es solo orientación general. La compra pasa por escribano público, que hace el estudio de título, y conviene además un agrimensor para la mensura. Para la zonificación y las deudas de contribución, la fuente es la intendencia del departamento; para los servicios, OSE, UTE y la intendencia según corresponda. Verificá cada punto con la fuente oficial y con los profesionales correspondientes antes de comprometer plata, porque los problemas de un terreno rara vez se ven a simple vista.',
      },
    ],
    related: [
      { label: 'Comprar tu primera vivienda', to: '/guias/comprar-primera-vivienda-uruguay' },
      { label: 'Costos de escrituración', to: '/guias/costos-de-escrituracion-uruguay' },
      { label: 'Promesa de compraventa', to: '/guias/promesa-de-compraventa-uruguay' },
    ],
    steps: [
      {
        name: 'Conseguí el padrón',
        text: 'Pedí el número de padrón del terreno; es su identificación catastral (Catastro), la llave que se usa también en el registro para verificar todo lo demás.',
      },
      {
        name: 'Encargá el estudio de título',
        text: 'Un escribano confirma que el vendedor sea el titular y que no haya hipotecas, embargos ni vicios en la cadena de propiedad.',
      },
      {
        name: 'Revisá la mensura',
        text: 'Con un agrimensor, verificá límites, superficie real y que no haya diferencias o invasiones con los predios vecinos.',
      },
      {
        name: 'Consultá la intendencia',
        text: 'Averiguá la zonificación, qué podés construir, retiros y si hay restricciones ambientales o de inundación en ese padrón.',
      },
      {
        name: 'Chequeá servicios y deudas',
        text: 'Confirmá acceso, agua de OSE, energía de UTE y saneamiento, y que el terreno esté al día de contribución y tributos.',
      },
      {
        name: 'Firmá con todo verificado',
        text: 'Recién con título limpio, mensura y sin deudas, avanzá con la promesa y la escritura ante escribano.',
      },
    ],
  },
  {
    slug: 'promesa-de-compraventa-uruguay',
    title: 'Promesa de compraventa y seña en Uruguay',
    description:
      'Qué son la promesa de compraventa, la reserva y la seña en Uruguay, qué te protegen, por qué inscribirla y los riesgos de pagar seña sin promesa.',
    tag: 'PROMESA',
    updatedAt: '2026-07-18',
    sections: [
      {
        heading: 'Qué es la promesa o compromiso',
        body: 'La promesa de compraventa, también llamada compromiso de compraventa, es el contrato por el cual comprador y vendedor se comprometen: uno a vender y el otro a comprar, en las condiciones que se pactan. No es todavía la escritura que te hace dueño, pero es el acuerdo serio que fija el precio, la forma y los plazos de pago, la fecha de escritura, quién paga qué gastos y qué pasa si alguna parte se echa atrás. Es la etapa donde de verdad se cierra el negocio; la escritura posterior lo formaliza y transfiere la propiedad. Por eso conviene que la promesa la redacte y controle un escribano.',
      },
      {
        heading: 'La seña: qué es y qué compromete',
        body: 'La seña o arras es una suma que el comprador entrega como señal de que va en serio y a cuenta del precio. Su función es comprometer a ambas partes: si el comprador se arrepiente sin causa, suele perder la seña; si el vendedor se echa atrás, suele tener que devolverla, muchas veces duplicada, según lo pactado. Por eso lo que dice el contrato sobre la seña es clave: definí por escrito cuánto es, a cuenta de qué va y qué pasa exactamente si cae la operación. Una seña bien pactada te protege; una mal redactada te deja expuesto.',
      },
      {
        heading: 'Reserva, seña y promesa: no confundir',
        body: 'Son tres cosas distintas del mismo circuito. La reserva, que en la práctica uruguaya suele instrumentarse en un boleto de reserva, es una suma menor para sacar la propiedad del mercado mientras se estudia el título; suele ser previa y de menor compromiso. La seña se entrega dentro de la operación y ya compromete fuerte a las partes. La promesa es el contrato completo. El orden habitual y prudente es: reservás, el escribano estudia el título, y recién con el título limpio firmás la promesa. Apurar una seña grande antes del estudio de título invierte el orden lógico y te pone la plata en riesgo sin haber verificado nada.',
      },
      {
        heading: 'El riesgo de pagar seña sin promesa',
        body: 'El error más peligroso es entregar una seña importante contra un simple recibo, sin promesa firmada ante escribano y sin haber estudiado el título. Si aparece un problema (que el vendedor no sea el único titular, que haya un embargo o una hipoteca, que la propiedad tenga deudas), recuperar tu plata puede volverse un juicio largo. Sin un contrato claro que diga qué pasa si la operación no se concreta, quedás en una posición débil. La regla práctica: la plata seria se entrega dentro de una promesa bien redactada, con el título ya estudiado, no antes y no por fuera.',
      },
      {
        heading: 'Inscribir la promesa te protege',
        body: 'En Uruguay la promesa de compraventa puede inscribirse en el Registro de la Propiedad, y hacerlo te da una protección importante frente a terceros. Inscripta, tu promesa queda anotada sobre ese inmueble, de modo que si el vendedor intentara venderlo a otro o si aparecieran embargos posteriores, tu derecho como promitente comprador queda resguardado y priorizado. Es una capa de seguridad que muchos compradores desconocen. Coordiná con tu escribano la inscripción cuando la promesa lo justifique, sobre todo si entre la promesa y la escritura pasará tiempo o si pagás en cuotas antes de escriturar.',
      },
      {
        heading: 'Esto es orientación general',
        body: 'Esta guía explica cómo funcionan la promesa y la seña, pero no es asesoramiento legal para tu caso concreto. La redacción de la promesa, las condiciones de la seña, el estudio de título y la inscripción registral deben hacerse con un escribano público, que es el profesional que te protege en la operación. No firmes ni entregues plata sin que un escribano revise el contrato y el título. Para las particularidades legales, consultá a un escribano o abogado; cada operación tiene detalles que conviene atender antes de comprometerte.',
      },
    ],
    related: [
      { label: 'Comprar tu primera vivienda', to: '/guias/comprar-primera-vivienda-uruguay' },
      { label: 'Costos de escrituración', to: '/guias/costos-de-escrituracion-uruguay' },
      { label: 'Comprar un terreno', to: '/guias/comprar-un-terreno-uruguay' },
    ],
  },
  {
    slug: 'como-funciona-una-sucesion-uruguay',
    title: 'Cómo funciona una sucesión en Uruguay',
    description:
      'Qué es una sucesión en Uruguay, cómo es el proceso paso a paso, quién interviene (abogado y escribano), costos aproximados y cuánto demora.',
    tag: 'SUCESIÓN',
    updatedAt: '2026-07-18',
    sections: [
      {
        heading: 'Qué es una sucesión y por qué hace falta',
        body: 'Cuando alguien fallece, sus bienes, derechos y también sus deudas no pasan solos a los herederos: hay que hacer un trámite que ordene y transfiera legalmente ese patrimonio. Eso es la sucesión. Es indispensable sobre todo cuando hay inmuebles, vehículos empadronados, cuentas bancarias, participaciones en empresas o saldos que un banco no libera sin resolución judicial. Sin sucesión, los herederos pueden usar de hecho algunas cosas, pero no pueden vender, escriturar, ni disponer con seguridad jurídica. En Uruguay la sucesión tramita ante el Poder Judicial, con intervención de abogado, y el escribano interviene después para la parte notarial de la transferencia de bienes.',
      },
      {
        heading: 'Con testamento o sin testamento',
        body: 'Hay dos caminos. Si la persona dejó testamento válido, se abre la sucesión testamentaria y se respeta lo que dispuso, siempre dentro de los límites de la legítima que la ley reserva a los herederos forzosos. Si no dejó testamento, se abre la sucesión intestada o ab intestato, y la ley define quién hereda y en qué orden: primero los descendientes (hijos y, por representación, nietos); a falta de ellos, los ascendientes (padres, abuelos); y recién cuando no hay descendientes ni ascendientes heredan los colaterales, como hermanos o sobrinos, hasta el cuarto grado. El cónyuge tiene un lugar propio: no forma un orden aparte al final, sino que concurre con los descendientes y con los ascendientes a través de la porción conyugal (además de su mitad de gananciales cuando hubo sociedad conyugal), y hereda antes que los colaterales si no quedan descendientes ni ascendientes. La mayoría de las sucesiones en Uruguay son intestadas. En ambos casos el proceso judicial es parecido; cambia quién resulta declarado heredero.',
      },
      {
        heading: 'Los pasos del proceso',
        body: 'El trámite arranca con la apertura judicial, presentando la partida de defunción y acreditando el vínculo de los herederos con partidas de nacimiento o matrimonio. El paso central es la declaratoria de herederos, la resolución en la que el juez reconoce quiénes son los herederos. En paralelo o después se hace el inventario y avalúo de los bienes que deja el fallecido (el acervo). Finalmente viene la adjudicación o partición: cómo se reparten concretamente los bienes entre los herederos. Recién con esos pasos cumplidos el escribano puede inscribir los inmuebles a nombre de los herederos y estos pueden vender o disponer con título saneado.',
      },
      {
        heading: 'Quién interviene: abogado y escribano',
        body: 'Son dos profesionales con roles distintos. El abogado lleva el juicio sucesorio: redacta y firma los escritos, patrocina a los herederos ante el juzgado y consigue la declaratoria. El escribano interviene en la parte notarial y registral: certificados, inscripción de la transferencia de inmuebles en el Registro, y la escritura cuando después se vende. Muchos estudios ofrecen el paquete completo. Es importante que todos los herederos estén de acuerdo con quién los representa, porque si hay conflicto entre ellos el trámite se complica, se encarece y se alarga. Si hay menores o incapaces entre los herederos, además puede intervenir la Defensoría y el proceso tiene controles adicionales.',
      },
      {
        heading: 'Costos y tiempos aproximados',
        body: 'No hay un precio único. El costo depende del valor y la cantidad de bienes, de si hay o no inmuebles, del número de herederos y de si existe conflicto. Se pagan honorarios de abogado y de escribano, tasas y timbres judiciales, costos de partidas y certificados, y cuando hay inmuebles el ITP por la transmisión. Conviene tener claro un punto: en Uruguay no existe un impuesto a la herencia ni un impuesto sucesorio general; lo que se paga por los inmuebles heredados es el ITP, cuyos herederos y legatarios son los responsables (ver la guía sobre impuestos a la herencia). Los honorarios suelen calcularse como un porcentaje del valor del acervo, con topes de referencia de los colegios profesionales. En tiempo, una sucesión sencilla y sin conflicto puede resolverse en varios meses; si hay muchos herederos, bienes complejos o disputas, puede llevar más de un año. Conviene pedir presupuesto por escrito antes de empezar.',
      },
      {
        heading: 'Esto es información general',
        body: 'Esta guía explica cómo funciona una sucesión a grandes rasgos, pero cada caso tiene detalles que cambian el resultado: régimen de bienes del matrimonio, existencia de deudas, herederos en el exterior, empresas o bienes en el extranjero. No es asesoramiento profesional. Antes de iniciar el trámite o tomar decisiones sobre bienes heredados, consultá con un abogado y un escribano de tu confianza, y verificá tasas e impuestos vigentes ante el Poder Judicial y la DGI. Una consulta inicial suele evitar errores caros más adelante.',
      },
    ],
    related: [
      { label: '¿Las deudas se heredan?', to: '/guias/las-deudas-se-heredan-uruguay' },
      { label: 'Hacer un testamento', to: '/guias/hacer-un-testamento-uruguay' },
      { label: '¿Hay impuesto a la herencia?', to: '/guias/hay-impuesto-a-la-herencia-uruguay' },
    ],
    steps: [
      {
        name: 'Reunir la documentación',
        text: 'Conseguí la partida de defunción y las partidas que acreditan el vínculo (nacimiento, matrimonio) de cada heredero, además de la documentación de los bienes: padrones de inmuebles, libreta de vehículos, datos de cuentas bancarias.',
      },
      {
        name: 'Contratar abogado y abrir la sucesión',
        text: 'El abogado presenta el escrito de apertura ante el juzgado competente e inicia el juicio sucesorio en nombre de los herederos.',
      },
      {
        name: 'Obtener la declaratoria de herederos',
        text: 'El juez dicta la resolución que reconoce oficialmente quiénes son los herederos. Es la pieza central del trámite.',
      },
      {
        name: 'Inventario y avalúo',
        text: 'Se listan y valúan los bienes que integran el acervo sucesorio para saber qué se reparte.',
      },
      {
        name: 'Adjudicación e inscripción',
        text: 'Se define cómo se reparten los bienes y el escribano inscribe la transmisión de los inmuebles en el Registro, pagando el ITP correspondiente.',
      },
    ],
  },
  {
    slug: 'las-deudas-se-heredan-uruguay',
    title: '¿Las deudas se heredan en Uruguay?',
    description:
      '¿Se heredan las deudas en Uruguay? Cómo funciona el activo y el pasivo, la aceptación con beneficio de inventario y cuándo conviene repudiar la herencia.',
    tag: 'HERENCIA',
    updatedAt: '2026-07-18',
    sections: [
      {
        heading: 'La respuesta corta: se hereda el patrimonio, no solo lo bueno',
        body: 'En Uruguay no se hereda solo lo que suma. Al aceptar una herencia se recibe el patrimonio del fallecido como un todo: el activo (inmuebles, dinero, vehículos, ahorros) y también el pasivo (deudas, garantías, obligaciones pendientes). Por eso la pregunta correcta no es solo cuánto dejó, sino qué debía. Si las deudas son mayores que los bienes, aceptar sin precauciones puede significar hacerse cargo de un saldo negativo. La buena noticia es que la ley da mecanismos para protegerse: podés aceptar con beneficio de inventario o directamente repudiar la herencia. Nadie está obligado a aceptar una herencia.',
      },
      {
        heading: 'Aceptación pura y simple vs. con beneficio de inventario',
        body: 'Aceptar pura y simplemente significa recibir la herencia sin limitar tu responsabilidad: si las deudas superan a los bienes, en principio podés terminar respondiendo con tu propio patrimonio por lo que faltó. Aceptar con beneficio de inventario es la protección clave: primero se hace un inventario de los bienes y las deudas, y el heredero responde por las deudas del fallecido solo hasta donde alcanzan los bienes heredados, no más allá. Es decir, en el peor caso te quedás sin recibir nada, pero no ponés plata de tu bolsillo. Cuando hay dudas sobre la solvencia del fallecido, el beneficio de inventario es casi siempre la opción prudente. Un dato importante: si entre los herederos hay un menor de edad, la aceptación con beneficio de inventario es obligatoria, justamente para que el menor nunca responda con sus bienes por deudas hereditarias.',
      },
      {
        heading: 'Repudiar la herencia: decir que no',
        body: 'Si está claro que las deudas superan largamente a los bienes, o simplemente no querés involucrarte, podés repudiar, o sea renunciar a la herencia. El que repudia se considera como si nunca hubiera sido heredero: no recibe bienes, pero tampoco responde por las deudas del fallecido. Ojo con un efecto importante: en Uruguay, si repudiás, tu parte no desaparece. Según el caso, puede acrecer a los otros herederos o, si tenés descendientes, ellos pueden quedar en tu lugar por derecho de representación y ser llamados directamente a la herencia del fallecido, con su activo y su pasivo. Es decir, repudiar no siempre saca a tus hijos de la ecuación. Por eso conviene coordinar en familia y con asesoramiento, para no trasladar el problema sin querer a la generación siguiente.',
      },
      {
        heading: 'Cómo protegerse en la práctica',
        body: 'Antes de aceptar, conviene averiguar la situación real del fallecido. Revisá si tenía créditos bancarios, deudas con proveedores, garantías firmadas o inmuebles hipotecados. En el sistema financiero, la Central de Riesgos del BCU y, por separado, el Clearing de Informes privado pueden dar señales del endeudamiento (recordá que no son lo mismo). Verificá deudas con la intendencia por contribución inmobiliaria y patente, y con organismos como DGI y BPS si tenía empresa. Si el panorama no está claro, no aceptes a las apuradas: pedí que la aceptación sea con beneficio de inventario. Ese solo paso limita tu riesgo a lo que efectivamente haya de bienes.',
      },
      {
        heading: 'Un caso frecuente: la casa hipotecada o con seguro',
        body: 'Muchas familias descubren que el bien más grande, la casa, tiene una hipoteca o un préstamo asociado. Ahí importa el detalle: algunos créditos de vivienda, por ejemplo ciertos préstamos de BHU o bancarios, incluyen un seguro de saldo deudor que cancela la deuda si el titular fallece. Si existe ese seguro, la deuda puede extinguirse y la casa pasar libre a los herederos. Si no existe, la deuda continúa y hay que atenderla para conservar el inmueble. No lo asumas en un sentido ni en el otro: pedí al banco o al BHU el estado del crédito y si había cobertura por fallecimiento antes de tomar cualquier decisión.',
      },
      {
        heading: 'Esto es información general',
        body: 'Cada herencia es distinta y las decisiones sobre aceptar, aceptar con beneficio de inventario o repudiar tienen consecuencias legales serias y a veces irreversibles. Esta guía es información general, no asesoramiento profesional. Antes de firmar nada o de dejar pasar plazos, consultá con un abogado o escribano que revise el caso concreto y el estado de deudas del fallecido. Para verificar situación financiera podés apoyarte en la Central de Riesgos del BCU y en el Clearing de Informes, y para deudas tributarias en la DGI, el BPS y tu intendencia.',
      },
    ],
    related: [
      { label: 'Cómo funciona una sucesión', to: '/guias/como-funciona-una-sucesion-uruguay' },
      { label: 'Saldar deudas', to: '/saldar-deudas-uruguay' },
      {
        label: 'Legítima y herederos forzosos',
        to: '/guias/legitima-y-herederos-forzosos-uruguay',
      },
    ],
  },
  {
    slug: 'hacer-un-testamento-uruguay',
    title: 'Cómo hacer un testamento en Uruguay',
    description:
      'Cómo hacer un testamento en Uruguay: tipos abierto y cerrado, qué podés y qué no podés disponer por la legítima, rol del escribano, costos y cómo revocarlo.',
    tag: 'TESTAMENTO',
    updatedAt: '2026-07-18',
    sections: [
      {
        heading: 'Para qué sirve un testamento',
        body: 'El testamento es el documento por el que decidís, en vida, qué pasa con tus bienes después de tu muerte. En Uruguay no tenés libertad total: la ley reserva una porción llamada legítima para ciertos herederos forzosos, que son los hijos y demás descendientes y, a falta de estos, los ascendientes. Además, el cónyuge sobreviviente tiene un derecho propio y distinto de la legítima, la porción conyugal. Sobre esas partes no podés disponer libremente. Pero sí podés decidir sobre la porción disponible, ordenar cómo repartir para evitar conflictos entre herederos, dejar un legado a alguien puntual, reconocer hijos, designar quién administre, o favorecer a uno de tus herederos dejándole, además de su legítima, esa porción de libre disposición. Un buen testamento no evita la sucesión, pero la ordena y reduce peleas.',
      },
      {
        heading: 'Tipos: abierto y cerrado',
        body: 'El testamento solemne más común es el abierto, otorgado ante escribano: expresás tu voluntad, el escribano la redacta en escritura pública y queda registrada. Su contenido no es secreto para el escribano, y ese registro da mucha seguridad de que aparecerá cuando se necesite. El testamento cerrado es aquel cuyo contenido va dentro de un sobre que se entrega ante escribano sin que se conozca lo escrito adentro; sirve cuando querés máxima confidencialidad, pero es menos habitual y tiene más formalidades. Para la mayoría de las personas, el testamento abierto ante escribano es la opción práctica: claro, registrado y difícil de impugnar por vicios de forma.',
      },
      {
        heading: 'Qué podés y qué no podés disponer',
        body: 'Este es el punto que más sorprende. Si tenés hijos, la mayor parte de tu patrimonio ya está reservada como legítima para ellos y no podés dársela a un tercero ni excluirlos por capricho. Cuanto más hijos, mayor es la porción reservada y menor la porción disponible. Solo sobre esa porción disponible tenés libertad plena: podés dejarla a quien quieras, incluso a alguien ajeno a la familia. Y podés usar esa porción para favorecer a uno de tus herederos forzosos por encima de los demás, dejándosela además de su legítima, dentro de lo que la ley permite. Desheredar a un heredero forzoso solo procede por causas graves y taxativas previstas en la ley, no por voluntad.',
      },
      {
        heading: 'Rol del escribano y costos',
        body: 'El escribano es clave: asesora sobre qué es legalmente posible, redacta el testamento con la forma correcta y lo hace registrar, de modo que se encuentre cuando fallezcas. Esto evita que el documento sea nulo por errores de forma, algo bastante común en testamentos caseros. El costo es un honorario notarial que depende de la complejidad y del estudio; suele ser una suma acotada comparada con lo que cuesta después una sucesión conflictiva. No existe un arancel único obligatorio, así que conviene pedir presupuesto. Frente al riesgo de una disputa familiar larga y cara, hacer un testamento bien hecho suele ser una inversión razonable.',
      },
      {
        heading: 'Cuándo conviene y cómo se modifica o revoca',
        body: 'Conviene testar sobre todo si tenés familia ensamblada, hijos de distintas parejas, un bien que querés que quede a alguien puntual, un socio, una pareja no casada, o simplemente si querés evitar que tus herederos peleen. El testamento es esencialmente revocable: podés cambiarlo o dejarlo sin efecto cuando quieras mientras estés con capacidad. Normalmente un testamento posterior revoca al anterior en lo que sea incompatible, y también podés revocarlo expresamente ante escribano. Por eso conviene revisarlo tras cambios importantes de vida: casamiento, divorcio, nacimiento de hijos, compra o venta de bienes grandes. Un testamento viejo que no refleja tu situación actual puede generar más problemas que soluciones.',
      },
      {
        heading: 'Esto es información general',
        body: 'Las reglas sobre legítima, mejora del heredero, porción conyugal y desheredación tienen matices que dependen de tu situación familiar y patrimonial concreta. Esta guía es información general y no reemplaza el asesoramiento de un profesional. Para hacer un testamento válido y que realmente logre lo que querés, consultá con un escribano, que además lo registrará. Si tu caso involucra empresas, bienes en el exterior o conflictos familiares previsibles, sumá también la mirada de un abogado.',
      },
    ],
    related: [
      {
        label: 'Legítima y herederos forzosos',
        to: '/guias/legitima-y-herederos-forzosos-uruguay',
      },
      { label: 'Cómo funciona una sucesión', to: '/guias/como-funciona-una-sucesion-uruguay' },
      { label: '¿Hay impuesto a la herencia?', to: '/guias/hay-impuesto-a-la-herencia-uruguay' },
    ],
    steps: [
      {
        name: 'Ordenar tu patrimonio y tu voluntad',
        text: 'Listá tus bienes y pensá qué querés que pase con cada uno y con quién, teniendo presente que la legítima de tus herederos forzosos no es de libre disposición.',
      },
      {
        name: 'Consultar a un escribano',
        text: 'El escribano te dice qué es legalmente posible en tu caso y qué parte podés disponer libremente.',
      },
      {
        name: 'Otorgar el testamento',
        text: 'Se redacta y firma el testamento (habitualmente abierto, ante escribano) con las formalidades legales.',
      },
      {
        name: 'Registro y guarda',
        text: 'El escribano hace registrar el testamento para que aparezca cuando se necesite y quede resguardado.',
      },
      {
        name: 'Revisar tras cambios de vida',
        text: 'Actualizá o revocá el testamento si te casás, te divorciás, nacen hijos o cambia tu patrimonio de forma importante.',
      },
    ],
  },
  {
    slug: 'legitima-y-herederos-forzosos-uruguay',
    title: 'Legítima y herederos forzosos en Uruguay',
    description:
      'Qué es la legítima en Uruguay, quiénes son los herederos forzosos (hijos, ascendientes, cónyuge), la porción disponible y por qué no podés desheredar libremente.',
    tag: 'LEGÍTIMA',
    updatedAt: '2026-07-18',
    sections: [
      {
        heading: 'Qué es la legítima',
        body: 'La legítima es la parte del patrimonio que la ley uruguaya reserva obligatoriamente a ciertos herederos, llamados forzosos, y de la que el fallecido no puede disponer libremente ni en vida ni por testamento. Es un límite a la voluntad de la persona: por más que quieras dejarle todo a un solo hijo, a tu pareja o a un tercero, la ley protege una porción para quienes tienen derecho a ella. La idea de fondo es proteger a la familia más cercana. Por eso entender la legítima es clave antes de hacer un testamento, de repartir bienes en vida o de calcular qué te corresponde en una herencia.',
      },
      {
        heading: 'Quiénes son los herederos forzosos',
        body: 'Los herederos forzosos en Uruguay son, en primer lugar, los descendientes: hijos y, por representación, nietos si el hijo falleció antes. En segundo lugar, a falta de descendientes, los ascendientes: padres y, si no viven, abuelos. Y está el cónyuge, protegido a través de la figura de la porción conyugal. No todos concurren a la vez ni con el mismo peso: los descendientes desplazan a los ascendientes, y la situación del cónyuge cambia según con quién concurra. Por eso, quién es forzoso y cuánto le toca depende de la composición concreta de la familia al momento del fallecimiento.',
      },
      {
        heading: 'Cuánto se reserva: la legítima según cuántos hijos hay',
        body: 'La porción reservada crece con la cantidad de descendientes. Como referencia general del régimen uruguayo: con un solo hijo o descendiente, la legítima es la mitad del patrimonio; con dos, dos tercios; con tres o más, tres cuartos. Ese bloque se reparte por igual entre los legitimarios que concurren. Si no hay descendientes pero sí ascendientes, la legítima de estos es la mitad de la herencia. Cuanto mayor es la legítima, menor es lo que la persona puede repartir con total libertad. Estas proporciones son estructurales del sistema, pero conviene confirmarlas para tu caso con un escribano, porque la presencia del cónyuge y otras situaciones las ajustan.',
      },
      {
        heading: 'La porción disponible y cómo favorecer a un heredero',
        body: 'Lo que queda después de reservar la legítima es la porción disponible: esa parte sí podés dejarla a quien quieras, incluso a alguien ajeno a la familia, mediante testamento o donaciones. Es tu margen de libertad. A diferencia de otros países como Chile, en Uruguay no existe una porción de mejora separada de la disponible (la llamada cuarta de mejoras): si querés favorecer a uno o algunos de tus herederos forzosos por encima del reparto igualitario, la vía es asignarles parte de la porción disponible, sin tocar la legítima que les corresponde a los demás. Sirve, por ejemplo, para reconocer a un hijo que cuidó a los padres o que trabajó en el negocio familiar. Usar bien la porción disponible es lo que hace valioso a un testamento pensado.',
      },
      {
        heading: 'Por qué no podés desheredar libremente',
        body: 'Una confusión común es creer que uno puede sacar a un hijo o a un heredero forzoso de la herencia por voluntad, por estar enojado o distanciado. No es así. La desheredación de un heredero forzoso solo procede por causas graves y taxativamente previstas en la ley, y debe hacerse por testamento invocando la causa; no basta con el deseo de excluir. Tampoco sirve repartir todo en vida para dejar sin nada a un legitimario: existen mecanismos, como la colación y la reducción de donaciones, que permiten recomponer la legítima afectada. Por eso, cualquier plan que dependa de excluir a un forzoso debería revisarse con un profesional antes de intentarlo.',
      },
      {
        heading: 'Esto es información general',
        body: 'El cálculo concreto de la legítima, la porción disponible, la porción conyugal y la procedencia de una mejora o desheredación depende de la familia concreta y de la normativa vigente, con matices que no caben en una guía. Esto es información general y no asesoramiento profesional. Antes de testar, repartir bienes en vida o reclamar lo que te corresponde en una herencia, consultá con un escribano o un abogado especializado en sucesiones, que revise tu caso puntual.',
      },
    ],
    related: [
      { label: 'Hacer un testamento', to: '/guias/hacer-un-testamento-uruguay' },
      { label: 'Cómo funciona una sucesión', to: '/guias/como-funciona-una-sucesion-uruguay' },
      { label: '¿Las deudas se heredan?', to: '/guias/las-deudas-se-heredan-uruguay' },
    ],
  },
  {
    slug: 'hay-impuesto-a-la-herencia-uruguay',
    title: '¿Hay impuesto a la herencia en Uruguay?',
    description:
      '¿Existe impuesto a la herencia en Uruguay? No hay impuesto sucesorio, pero sí costos reales de la sucesión y el ITP al transmitir inmuebles por causa de muerte.',
    tag: 'IMPUESTOS',
    updatedAt: '2026-07-18',
    sections: [
      {
        heading: 'El mito: no existe impuesto a la herencia en Uruguay',
        body: 'Se escucha seguido la pregunta de cuánto se paga de impuesto a la herencia, muchas veces por comparación con otros países donde heredar un patrimonio grande implica un tributo específico y alto. En Uruguay eso no existe: no hay un impuesto sucesorio o a la herencia que grave el hecho de heredar como tal. Recibir bienes por herencia no genera, por sí mismo, un impuesto calculado sobre el valor heredado. Ahora bien, que no haya impuesto a la herencia no significa que heredar sea gratis. La sucesión tiene costos reales y, cuando hay inmuebles, aparece un impuesto puntual sobre la transmisión que conviene conocer para no llevarse sorpresas.',
      },
      {
        heading: 'Lo que sí se paga: los costos de la sucesión',
        body: 'Para transferir legalmente los bienes del fallecido a los herederos hay que hacer el trámite sucesorio, y ese trámite cuesta. Los principales rubros son los honorarios del abogado que lleva el juicio sucesorio, los honorarios del escribano por la parte notarial y registral, las tasas y timbres judiciales, y los costos de partidas, certificados e inscripciones. Estos honorarios suelen calcularse como un porcentaje del valor de los bienes, con montos de referencia de los colegios profesionales. No son un impuesto al Estado por heredar, sino el costo de ordenar y formalizar la transmisión. Por eso conviene pedir presupuesto antes de empezar y comparar.',
      },
      {
        heading: 'El ITP: el impuesto que sí aparece con inmuebles',
        body: 'Cuando en la herencia hay inmuebles, entra en juego el ITP, el Impuesto a las Transmisiones Patrimoniales que cobra la DGI. Este impuesto grava la transmisión de la propiedad, incluida la que ocurre por causa de muerte. No es un impuesto a heredar en general, sino específicamente a la transferencia de bienes inmuebles. Se calcula sobre el valor real del inmueble fijado por la Dirección Nacional de Catastro, no sobre el precio que vos le pongas. Como referencia general del régimen, la tasa aplicable a los herederos en línea recta ascendente o descendente es menor que la que se aplica a otros herederos. Verificá siempre la tasa y el valor vigentes ante la DGI.',
      },
      {
        heading: 'Plazos y cómo evitar recargos',
        body: 'El ITP por transmisión por causa de muerte tiene un plazo para pagarse contado desde el fallecimiento del causante (en general, alrededor de un año, pero confirmá el plazo vigente ante la DGI); pasado ese plazo, se aplican multas y recargos por mora que encarecen todo. Es un error frecuente demorar años la sucesión pensando que no urge: además de trabar cualquier venta, el retraso puede sumar recargos sobre el ITP y complicar el cálculo. También hay que tener presente que, mientras la sucesión no se resuelve, los inmuebles siguen generando obligaciones como la contribución inmobiliaria de la intendencia. La recomendación práctica es no dejar la sucesión dormida: iniciarla en tiempo suele salir más barato que regularizar tarde.',
      },
      {
        heading: 'Cuando después se vende el bien heredado',
        body: 'Otra confusión es mezclar el costo de heredar con el de vender lo heredado. Son momentos distintos. Al heredar un inmueble pagás el ITP de la transmisión por causa de muerte. Si más adelante vendés ese inmueble, esa venta es otra operación, con su propio ITP de compraventa y, eventualmente, con impuesto a la renta sobre la ganancia de la enajenación (IRPF por incremento patrimonial si sos residente, o IRNR si no lo sos) según el caso. Por eso conviene planificar: a veces conviene regularizar bien la sucesión antes de vender, para tener título saneado y evitar recargos acumulados. Un escribano puede estimarte de antemano el total de costos de heredar y, si corresponde, de vender, para que no haya sorpresas en la escritura.',
      },
      {
        heading: 'Esto es información general',
        body: 'Las tasas del ITP, los valores de Catastro, los plazos y los honorarios profesionales cambian y dependen de cada caso. Esta guía aclara el concepto general de que en Uruguay no hay impuesto a la herencia, pero no reemplaza el asesoramiento profesional ni los valores oficiales. Para conocer el ITP y los plazos vigentes, consultá la DGI; para los costos totales de tu sucesión, consultá con un escribano y un abogado. Verificá siempre las cifras actuales en las fuentes oficiales antes de tomar decisiones.',
      },
    ],
    related: [
      { label: 'Cómo funciona una sucesión', to: '/guias/como-funciona-una-sucesion-uruguay' },
      { label: 'Costos de escrituración', to: '/guias/costos-de-escrituracion-uruguay' },
      { label: 'Hacer un testamento', to: '/guias/hacer-un-testamento-uruguay' },
    ],
  },
  {
    slug: 'comprar-auto-0km-o-usado-uruguay',
    title: 'Comprar auto 0km o usado en Uruguay: cómo decidir',
    description:
      '0km o usado en Uruguay: cómo pesan depreciación, financiación, garantía y los costos ocultos del usado para decidir bien.',
    tag: 'COMPRA',
    updatedAt: '2026-07-18',
    sections: [
      {
        heading: 'La depreciación es el costo que nadie factura',
        body: 'Un 0km pierde una parte importante de su valor en los primeros años, y la caída suele ser más fuerte al principio: apenas lo patentás ya vale menos que lo que pagaste. Esa pérdida no aparece en ninguna boleta, pero es real: es plata que se evapora aunque el auto ande perfecto. Comprar un usado de pocos años deja que otro se haya comido ese golpe inicial. Por eso, si tu prioridad es cuidar el dinero, un usado bien elegido casi siempre rinde más por peso gastado que un 0km, sobre todo si pensás cambiarlo en pocos años.',
      },
      {
        heading: 'Qué te da de verdad el 0km',
        body: 'El 0km ofrece garantía de fábrica, service oficial, historial cero y financiación de la propia marca o del banco, muchas veces con tasas promocionales. Sabés exactamente qué manejaste desde el kilómetro uno. También suele traer tecnología de seguridad más nueva. La contra es el precio y la depreciación. Tiene sentido si vas a tener el auto muchos años, si valorás la tranquilidad de la garantía, o si necesitás algo específico que en el mercado de usados no aparece en buen estado. No es tirar la plata: es pagar por certeza y por años de uso sin sorpresas.',
      },
      {
        heading: 'Los costos ocultos del usado',
        body: 'Un usado barato puede salir caro. Antes de pagar, verificá que no arrastre deudas: patente atrasada, multas y, sobre todo, que no tenga una prenda vigente inscripta, porque si el auto está prendado el acreedor puede reclamarlo aunque vos lo hayas comprado de buena fe. Revisá la titularidad real, que el número de motor y chasis coincidan con la documentación, y pagá una revisación mecánica independiente antes de cerrar. Un mecánico de confianza que no sea del vendedor puede detectar un choque mal reparado, tren delantero gastado o motor cansado que te costarían más que el descuento.',
      },
      {
        heading: 'Financiación: comparar el costo total, no la cuota',
        body: 'Tanto para 0km como para usado te van a ofrecer crédito. El error clásico es mirar solo el valor de la cuota. Fijate siempre en la Tasa Efectiva Anual, en los gastos de otorgamiento y en el seguro que suele ser obligatorio mientras dure el préstamo. En Uruguay podés financiar por banco, por la financiera de la marca, o por cooperativas y entidades como ANDA; cada una tiene condiciones distintas. Un 0km con tasa subsidiada por la marca puede terminar más barato en el total que un usado financiado a tasa alta. Sumá todo el costo del crédito y recién ahí compará.',
      },
      {
        heading: 'Cuándo conviene cada uno',
        body: 'Conviene el usado si querés minimizar la pérdida por depreciación, si vas a cambiar de auto en pocos años, o si tu presupuesto es ajustado y podés pagar una buena revisación mecánica. Conviene el 0km si vas a conservarlo mucho tiempo, valorás la garantía y el service oficial, conseguís una financiación con tasa realmente baja de la marca, o necesitás seguridad y confiabilidad máximas. En el medio hay una opción muy uruguaya: un usado joven, de pocos años y con historial claro, que combina buena parte de la tranquilidad del 0km sin el golpe fuerte de depreciación.',
      },
      {
        heading: 'Antes de firmar, consultá',
        body: 'Esta es una guía general y no reemplaza el consejo de un profesional. Para verificar deudas, prenda y titularidad conviene apoyarse en un escribano o gestor, y para revisar el estado real del vehículo, en un mecánico de confianza independiente del vendedor. Las condiciones de crédito y seguros las regula el Banco Central del Uruguay, y la información de morosidad podés cruzarla entre la Central de Riesgos del BCU y el Clearing de Informes privado. Ante cualquier duda sobre la documentación del auto, pará la operación y pedí asesoramiento antes de pagar.',
      },
    ],
    related: [
      { label: 'Crédito prendario', to: '/guias/credito-prendario-auto-uruguay' },
      { label: 'Cuánto cuesta tener un auto', to: '/guias/costos-de-tener-auto-uruguay' },
      { label: 'Cómo transferir un auto', to: '/guias/transferir-un-auto-uruguay' },
    ],
  },
  {
    slug: 'credito-prendario-auto-uruguay',
    title: 'Cómo funciona el crédito prendario para el auto en Uruguay',
    description:
      'Crédito prendario para el auto en Uruguay: qué es la prenda, el costo real con seguro y gastos, y qué pasa si dejás de pagar.',
    tag: 'PRENDARIO',
    updatedAt: '2026-07-18',
    sections: [
      {
        heading: 'Qué es un crédito prendario',
        body: 'Un crédito prendario es un préstamo en el que el propio auto queda como garantía. Se constituye una prenda que se inscribe en el registro correspondiente, de modo que el vehículo responde por la deuda: seguís usándolo y manejándolo, pero no podés venderlo libremente hasta cancelar el préstamo, y si dejás de pagar el acreedor tiene derecho a ejecutarlo. Como el banco o la financiera tiene esa garantía, suele ofrecer tasas más bajas que un préstamo al consumo sin respaldo. A cambio, el auto queda comprometido durante toda la vida del crédito.',
      },
      {
        heading: 'El costo real: mirá más que la cuota',
        body: 'El número que importa no es la cuota mensual sino el costo total. Fijate en la Tasa Efectiva Anual, que ya incluye intereses y suele reflejar mejor lo que pagás que la tasa nominal. Sumá los gastos de otorgamiento, la inscripción de la prenda y los honorarios de escribano si corresponden. Casi siempre te van a exigir un seguro del vehículo mientras dure el préstamo, cuyo costo corre por tu cuenta y a veces se financia dentro de la misma cuota. Pedí que te muestren el total a pagar en pesos o en unidades indexadas al final del crédito, no solo la cuota.',
      },
      {
        heading: 'Tasa fija, UI y el peso del seguro',
        body: 'En Uruguay muchos créditos se pactan en pesos a tasa fija, y otros en Unidades Indexadas (UI), que se ajustan con la inflación: con UI la cuota en pesos sube con el tiempo aunque la tasa parezca baja. Entender en qué moneda o unidad está tu préstamo es clave para no llevarte sorpresas. Ojo con el seguro que exige el prestamista: no es el SOA (el único seguro obligatorio por ley, que cubre daños a terceros y no al auto), sino una cobertura del vehículo, casi siempre todo riesgo y con los derechos a favor del banco, que te piden como condición del préstamo. Ese seguro no es un detalle, puede sumar bastante al costo mensual. Antes de firmar, pedí el detalle de qué parte de la cuota es capital, qué parte interés y qué parte seguro, para saber realmente cuánto te cuesta el dinero prestado.',
      },
      {
        heading: 'Qué pasa si dejás de pagar',
        body: 'Si entrás en mora, primero te aplican intereses de mora y recargos, y quedás registrado como deudor: esa información puede aparecer tanto en la Central de Riesgos del Banco Central como en el Clearing de Informes privado, dos bases distintas que afectan tu acceso futuro al crédito. Si la mora se sostiene, el acreedor puede ejecutar la prenda y hacer rematar el auto para cobrarse. Y ojo: si lo que se obtiene en el remate no alcanza a cubrir la deuda, podés seguir debiendo el saldo. Perder el auto no siempre borra la deuda completa.',
      },
      {
        heading: 'Comparar con ahorrar y esperar',
        body: 'Antes de tomar el crédito, hacé la cuenta de la alternativa: cuánto tardarías en juntar la plata ahorrando esa misma cuota, y cuánto interés total te ahorrarías comprando de contado o con un adelanto más grande. Un adelanto mayor baja el monto financiado y por lo tanto el interés total. Si podés esperar unos meses y ahorrar, muchas veces terminás pagando bastante menos por el mismo auto. Podés estimar todo esto con la calculadora de préstamos de Cambio Uruguay, cargando monto, plazo y tasa para ver el costo total y comparar contra ahorrar, antes de comprometerte.',
      },
      {
        heading: 'Información general, no asesoría',
        body: 'Esto es información general y no constituye asesoramiento financiero ni legal. Las tasas, la usura y la publicidad del crédito están reguladas en el marco de la Ley de Usura: el Banco Central del Uruguay publica las tasas medias de referencia que determinan los topes máximos permitidos, así que si algo te parece caro, verificá el valor vigente en el sitio del BCU. Antes de firmar una prenda conviene leer bien el contrato y, si tenés dudas sobre la garantía o los gastos de inscripción, consultar con un escribano o un asesor de confianza. Compará ofertas de más de un banco o financiera, porque para el mismo auto las condiciones cambian mucho entre entidades.',
      },
    ],
    related: [
      { label: 'Calculadora de préstamo', to: '/herramientas/calculadora-prestamo' },
      { label: 'Préstamos en Uruguay', to: '/prestamos-uruguay' },
      { label: 'Comprar auto 0km o usado', to: '/guias/comprar-auto-0km-o-usado-uruguay' },
    ],
    steps: [
      {
        name: 'Definí monto y adelanto',
        text: 'Calculá cuánto necesitás financiar realmente. Cuanto mayor sea el adelanto, menos capital financiás y menos interés total pagás.',
      },
      {
        name: 'Pedí varias ofertas',
        text: 'Solicitá cotizaciones a bancos, financieras y cooperativas como ANDA. Pedí siempre la Tasa Efectiva Anual y el costo total, no solo la cuota.',
      },
      {
        name: 'Sumá seguro y gastos',
        text: 'Agregá al cálculo el seguro del vehículo que exige el prestamista (por lo general todo riesgo), los gastos de otorgamiento y la inscripción de la prenda para conocer el costo real.',
      },
      {
        name: 'Compará con ahorrar',
        text: 'Usá la calculadora de préstamos para ver cuánto interés total pagarías y contrastalo con juntar la plata ahorrando esa misma cuota.',
      },
      {
        name: 'Leé el contrato antes de firmar',
        text: 'Verificá moneda o unidad, tasa, comisiones y las condiciones de mora. Si algo no está claro, consultá con un escribano o asesor antes de firmar.',
      },
    ],
  },
  {
    slug: 'costos-de-tener-auto-uruguay',
    title: 'Cuánto cuesta tener un auto en Uruguay',
    description:
      'Cuánto cuesta tener un auto en Uruguay: patente, SOA, seguro, combustible, service, cubiertas y la depreciación real.',
    tag: 'COSTOS',
    updatedAt: '2026-07-18',
    sections: [
      {
        heading: 'El costo total va mucho más allá del precio',
        body: 'El precio de compra es solo el comienzo. Tener un auto en Uruguay implica gastos fijos que pagás lo uses o no, y gastos variables que dependen de cuánto manejes. Entre los fijos están la patente, el seguro obligatorio, el seguro voluntario y la depreciación; entre los variables, combustible, mantenimiento, cubiertas y estacionamiento. Sumar todo esto durante un año suele dar una cifra que sorprende, muchas veces bastante mayor que la cuota de un crédito. Pensar el costo total de propiedad, y no solo la compra, evita ajustarte de más y llevarte sorpresas cada mes.',
      },
      {
        heading: 'Patente y SOA: lo que sí o sí pagás',
        body: 'La patente de rodados es un tributo anual que depende del valor de aforo del vehículo, es decir de su modelo y año. En Uruguay el cobro está unificado a través del SUCIVE, con una escala de aforo común, así que para un mismo vehículo la patente es pareja entre departamentos y la deuda te sigue aunque cambies de intendencia; de todos modos, cada intendencia puede aplicar sus propias bonificaciones o convenios de pago. Aparte, todo auto debe tener el Seguro Obligatorio de Automóviles, el SOA, que cubre lesiones a personas en un accidente pero no los daños materiales. Son dos costos ineludibles: sin patente al día y sin SOA vigente no podés circular en regla ni transferir el vehículo.',
      },
      {
        heading: 'Seguro voluntario: no es obligatorio pero conviene',
        body: 'El SOA cubre daños a personas, pero no protege tu auto ni cubre daños materiales a terceros, que pueden ser carísimos. Por eso casi todos suman un seguro voluntario, que va desde una cobertura básica de responsabilidad civil hasta el todo riesgo. El costo depende del valor del auto, tu edad, el uso y la cobertura elegida. No es un gasto menor, pero un solo choque contra un auto caro puede costarte mucho más que años de póliza. Compará coberturas y franquicias entre varias aseguradoras antes de decidir, porque para el mismo vehículo los precios varían bastante.',
      },
      {
        heading: 'Combustible, service y cubiertas',
        body: 'El combustible suele ser el mayor gasto variable, y en Uruguay los precios los fija el Poder Ejecutivo mes a mes, tomando como referencia el Precio de Paridad de Importación que calcula la URSEA, por lo que cambian con frecuencia; conviene verificar el valor vigente antes de hacer cuentas. Cuánto gastes depende de los kilómetros y del rendimiento del auto. Sumale el mantenimiento: cambios de aceite y filtros, service programado, frenos y correa según el modelo. Las cubiertas se gastan y hay que reemplazarlas cada cierta cantidad de kilómetros, y no son baratas. También entran batería, alineación y arreglos imprevistos. Guardá un fondo mensual para mantenimiento, porque estos gastos no avisan y llegan siempre juntos.',
      },
      {
        heading: 'Estacionamiento y la depreciación silenciosa',
        body: 'Si vivís o trabajás en zonas con estacionamiento tarifado, sumá ese costo diario, más cocheras o garaje si los necesitás. Pero el gasto más invisible es la depreciación: cada año tu auto vale menos, y esa pérdida de valor es plata real aunque nunca la pagues en una boleta. Un auto que compraste y vendés años después por menos te costó esa diferencia, además de todo lo anterior. Al calcular cuánto te cuesta tener el auto, incluí la depreciación estimada: es la única forma de ver el costo verdadero y de comparar honestamente con alternativas como el transporte o alquilar cuando lo necesitás.',
      },
      {
        heading: 'Hacé tu propia cuenta',
        body: 'Esta es una guía general y de carácter informativo; los montos exactos cambian según tu vehículo, tu departamento y el año, así que verificá los valores vigentes en las fuentes oficiales: el SUCIVE para la patente, tu aseguradora para el SOA y el seguro voluntario, y la URSEA o ANCAP para el precio actual del combustible. Si tenés dudas puntuales, consultá con un profesional o directamente con el organismo correspondiente. Armá una planilla con todos los rubros anuales, dividilos por doce y vas a tener el costo mensual real de tu auto. Con ese número en la mano podés decidir con datos si el auto que tenés o querés comprar entra cómodo en tu presupuesto.',
      },
    ],
    related: [
      { label: 'Comprar auto 0km o usado', to: '/guias/comprar-auto-0km-o-usado-uruguay' },
      { label: 'Qué seguros conviene tener', to: '/guias/que-seguros-conviene-tener-uruguay' },
      { label: 'Armar un presupuesto', to: '/guias/armar-un-presupuesto-personal-uruguay' },
    ],
  },
  {
    slug: 'transferir-un-auto-uruguay',
    title: 'Cómo transferir un auto en Uruguay',
    description:
      'Cómo transferir un auto en Uruguay: verificar titularidad y deudas, certificados, intendencia, firmas y cómo evitar estafas.',
    tag: 'TRÁMITE',
    updatedAt: '2026-07-18',
    sections: [
      {
        heading: 'Antes de comprar: verificá titularidad y deudas',
        body: 'El paso más importante es anterior a pagar. Confirmá que quien vende es el titular real del vehículo y que los datos de la documentación coinciden con el auto: número de motor, número de chasis y matrícula. Verificá que no arrastre deudas de patente ni multas, y muy especialmente que no tenga una prenda vigente inscripta, porque si el auto está prendado el acreedor puede reclamarlo aunque vos ya lo hayas pagado. La deuda de patente sigue al vehículo a través del SUCIVE, así que si comprás un auto con patente atrasada, esa deuda pasa a ser tu problema.',
      },
      {
        heading: 'Los certificados que necesitás',
        body: 'Para transferir hace falta reunir la documentación que acredite que el auto está en regla. Eso incluye comprobar que la patente esté paga y sin deuda, que no haya multas pendientes, y la libreta de propiedad del vehículo. El trámite de cambio de titular se hace ante la intendencia del departamento donde está empadronado el auto, que lleva el registro departamental de vehículos. Cada intendencia puede pedir requisitos algo distintos, así que conviene consultar de antemano en la intendencia correspondiente qué certificados y formularios exige, para juntar todo antes de coordinar la firma y no tener que volver.',
      },
      {
        heading: 'La firma y el rol del escribano',
        body: 'La compraventa se documenta por escrito y, para dar seguridad a la operación, lo habitual es que las firmas de comprador y vendedor sean certificadas por un escribano, que además puede controlar la documentación y verificar que no haya prenda ni deudas antes de que pagues. No es un gasto de más: es la persona que te protege de comprar un problema. Con ese documento firmado se presenta el cambio de titular ante la intendencia. Coordinar que el pago y la firma ocurran en el mismo momento, con la papelería controlada, es la mejor forma de que nadie quede expuesto.',
      },
      {
        heading: 'El cambio de titular en la intendencia',
        body: 'Con la compraventa firmada y los certificados en regla, se hace efectivo el cambio de titular en el registro de la intendencia, y el auto queda a nombre del comprador. Recién ahí la transferencia está completa a efectos de patente, multas y responsabilidad. Para el vendedor esto es crucial: mientras el auto figure a tu nombre podés seguir recibiendo multas o reclamos por ese vehículo. Por eso no alcanza con entregar el auto y cobrar; hay que completar formalmente la transferencia. Guardá copia de toda la documentación del trámite, tanto si vendés como si comprás.',
      },
      {
        heading: 'Cómo evitar estafas',
        body: 'Las estafas más comunes son autos con prenda oculta, deudas de patente disimuladas, documentación adulterada o un vendedor que no es el verdadero titular. Desconfiá de precios demasiado buenos y de la presión para cerrar rápido sin dejarte verificar nada. Nunca pagues antes de controlar la documentación y de que un escribano confirme que el auto está libre de deudas y prendas. Evitá pagos en efectivo sin recibo y sin testigos. Si algo no cierra, si faltan papeles o si el vendedor esquiva la revisación o la certificación de firmas, frená la operación: es preferible perder la compra que perder la plata.',
      },
      {
        heading: 'Información general, no asesoría',
        body: 'Esta guía es orientativa y no reemplaza el asesoramiento profesional. Los requisitos concretos varían según la intendencia del departamento donde esté empadronado el auto, así que consultá siempre la información oficial de esa intendencia y del SUCIVE para deudas de patente. Para verificar prenda, titularidad y certificar firmas, apoyate en un escribano, que es quien te da seguridad jurídica en la operación. A diferencia de los inmuebles, la transferencia de un auto no paga el impuesto a las transmisiones patrimoniales, que la DGI aplica a los bienes inmuebles y no a los vehículos; de todos modos conviene hacer bien el trámite para que ni comprador ni vendedor queden con problemas después.',
      },
    ],
    related: [
      { label: 'Comprar auto 0km o usado', to: '/guias/comprar-auto-0km-o-usado-uruguay' },
      { label: 'Cuánto cuesta tener un auto', to: '/guias/costos-de-tener-auto-uruguay' },
      { label: 'Estafas en Uruguay', to: '/estafas-uruguay' },
    ],
    steps: [
      {
        name: 'Verificá el auto y al vendedor',
        text: 'Confirmá que el vendedor es el titular real y que motor, chasis y matrícula coinciden con la documentación del vehículo.',
      },
      {
        name: 'Controlá deudas y prenda',
        text: 'Revisá que no haya patente atrasada, multas ni una prenda vigente inscripta. La deuda de patente sigue al auto vía SUCIVE.',
      },
      {
        name: 'Reuní los certificados',
        text: 'Juntá la libreta de propiedad y los comprobantes de patente al día y libre de multas que exija la intendencia correspondiente.',
      },
      {
        name: 'Firmá con escribano',
        text: 'Documentá la compraventa y certificá las firmas ante un escribano, que controla la papelería y verifica que el auto esté libre de deudas.',
      },
      {
        name: 'Hacé el cambio de titular',
        text: 'Presentá la documentación en el registro de la intendencia para que el auto quede efectivamente a nombre del comprador.',
      },
      {
        name: 'Guardá todo',
        text: 'Conservá copia de la compraventa y del trámite. El vendedor debe asegurarse de que la transferencia quede completa para no recibir multas.',
      },
    ],
  },
  {
    slug: 'prestamo-a-sola-firma-uruguay',
    title: 'El préstamo a sola firma en Uruguay: cuándo conviene y cuándo no',
    description:
      'Cómo funcionan los préstamos a sola firma en Uruguay, por qué son caros, cómo leer la tasa efectiva y el costo total, y cuándo tienen sentido.',
    tag: 'PRÉSTAMOS',
    updatedAt: '2026-07-18',
    sections: [
      {
        heading: 'Qué es un préstamo a sola firma',
        body: 'Es un crédito de consumo que te dan sin garantía real ni garante: alcanza con tu firma y tu identificación. Lo ofrecen bancos como el BROU, financieras y administradoras de crédito como ANDA, cooperativas y algunas fintech. Como la institución no tiene un bien que ejecutar si no pagás, todo el riesgo lo cubre con la tasa: por eso suelen ser bastante más caros que un préstamo hipotecario o prendario. La contracara es la comodidad: el trámite es rápido, muchas veces se resuelve el mismo día y el dinero se acredita enseguida. Esa facilidad es justamente lo que conviene mirar con cuidado antes de firmar.',
      },
      {
        heading: 'Por qué son tan caros',
        body: 'El precio de un crédito no es solo la tasa de interés. Al no haber garantía, la institución cobra una tasa más alta para compensar los casos en que la gente no paga. A eso se suman gastos administrativos, seguros de vida sobre saldo deudor y a veces comisiones por otorgamiento. Todo eso, junto, es lo que terminás pagando de más sobre el dinero que te prestan. Por eso una cuota que parece cómoda puede esconder un costo total muy alto: si el plazo es largo, pagás muchos meses de interés y el préstamo puede terminar costándote bastante más que lo que pediste. La clave es mirar el costo total, no la cuota suelta.',
      },
      {
        heading: 'Leer la tasa efectiva y el costo total antes de firmar',
        body: 'La TNA (tasa nominal anual) es engañosa porque no refleja cómo se acumulan los intereses. La TEA (tasa efectiva anual) muestra mejor el costo anual del dinero y, por la normativa de usura, en Uruguay debe expresarse incluyendo intereses y cargos. Pero el número que de verdad importa es el costo total del crédito: lo que acá se mide con la tasa de interés implícita (también llamada tasa interna de retorno), que junta la tasa más comisiones, seguros y gastos, o sea todo lo que pagás. Dos préstamos con la misma TNA pueden tener un costo total muy distinto según los cargos. Pedí siempre que te muestren esa tasa por escrito y el total a pagar en pesos al final. La normativa del BCU obliga a informar estos datos antes de firmar, así que exigilos y compará préstamos por su costo total, nunca por la cuota.',
      },
      {
        heading: 'La trampa de refinanciar',
        body: 'Cuando la cuota se vuelve difícil, muchas instituciones ofrecen refinanciar: te dan un préstamo nuevo, más grande, para cancelar el viejo y bajar la cuota. El alivio es inmediato, pero casi siempre alargás el plazo y sumás intereses nuevos sobre intereses viejos. Podés terminar debiendo más y por más tiempo, atado a la misma institución. La refinanciación no borra la deuda: la estira y muchas veces la encarece. Solo tiene sentido si conseguís una tasa claramente más baja y un plazo que no se dispare. Antes de aceptar, pedí el costo total del crédito nuevo (la tasa implícita y el total a pagar) y compará ese total con el que ya tenías.',
      },
      {
        heading: 'Cuándo tiene sentido pedirlo',
        body: 'Un préstamo a sola firma puede ser razonable para un gasto puntual e impostergable que no podés cubrir de otra forma, cuando la cuota entra cómoda en tu presupuesto y el plazo es corto. También sirve para consolidar deudas más caras, como el rotativo de una tarjeta, si la tasa nueva es más baja. Lo que casi nunca conviene es usarlo para gastos de consumo que se repiten, para pagar otras cuotas o para tapar un agujero que se va a volver a abrir el mes que viene. Si estás pidiendo prestado para llegar a fin de mes de forma habitual, el problema es el presupuesto, no el crédito, y más deuda lo agranda.',
      },
      {
        heading: 'Herramientas y aviso final',
        body: 'Antes de firmar, hacé el número: usá una calculadora de préstamo para ver cuánto pagás en total y compará el costo total entre instituciones. Si ya estás con atrasos o figurás en el clearing, informate primero sobre cómo regularizar antes de tomar deuda nueva, porque un préstamo caro para pagar otro suele empeorar las cosas. Esta guía es información general para orientarte, no asesoramiento financiero personalizado. Ante dudas concretas sobre tu caso, consultá directamente con la institución, con un asesor de confianza y revisá las tasas y los topes de usura que publica el BCU.',
      },
    ],
    related: [
      { label: 'Calculadora de préstamo', to: '/herramientas/calculadora-prestamo' },
      { label: 'Préstamos en Uruguay', to: '/prestamos-uruguay' },
      { label: 'Entender TEA, TNA y CFT', to: '/guias/entender-tea-tna-y-cft' },
    ],
  },
  {
    slug: 'entender-tea-tna-y-cft',
    title: 'TEA, TNA y CFT: cómo entender el costo real de un crédito',
    description:
      'Qué son la TNA, la TEA y el costo financiero total, por qué la cuota chica engaña y cómo comparar créditos por su costo real en Uruguay.',
    tag: 'TASAS',
    updatedAt: '2026-07-18',
    sections: [
      {
        heading: 'TNA: la tasa nominal que no cuenta todo',
        body: 'La TNA (tasa nominal anual) es la tasa que las instituciones ponen más grande en la publicidad, pero es la que menos te dice. Es nominal porque no considera cada cuánto se cobran o capitalizan los intereses. Un préstamo con TNA del 40 por ciento pero con intereses que se acumulan mes a mes termina costando más que ese 40 por ciento anual. La TNA sirve para el cálculo interno, no para saber cuánto pagás de verdad. Si un vendedor solo te menciona la TNA y la cuota, todavía no tenés la información que importa. Pedí siempre los otros números: la TEA y, sobre todo, el costo total del crédito.',
      },
      {
        heading: 'TEA: el costo real anual del dinero',
        body: 'La TEA (tasa efectiva anual) toma en cuenta cómo se capitalizan los intereses a lo largo del año, así que refleja el costo real anual de la plata que te prestan. Siempre es igual o mayor que la TNA. En Uruguay las tasas fijas se informan justamente en términos efectivos anuales, así que la TEA es un número que vas a ver. Comparar dos préstamos por la TEA es mucho más honesto que compararlos por la TNA, porque pone a ambos en la misma base anual efectiva. Es el número que te deja ver si una tasa es realmente más barata que otra. Aun así, la TEA todavía no incluye comisiones ni seguros, que pueden pesar bastante. Por eso es un buen dato, pero no es el definitivo para decidir.',
      },
      {
        heading: 'El costo total: el número que de verdad importa',
        body: 'El costo financiero total es la mirada más completa: junta la tasa de interés más todos los cargos que pagás, como comisiones de otorgamiento, gastos administrativos y seguros de vida sobre saldo deudor. En Uruguay ese costo total se refleja en lo que la normativa llama tasa de interés implícita o tasa interna de retorno (TIR), que es la tasa que el BCU usa para medir si hay usura. Es lo más cercano a lo que realmente te sale el crédito, expresado como porcentaje anual. Dos préstamos pueden tener la misma TEA pero un costo total muy distinto si uno carga más comisiones. Por eso, para comparar en serio, mirá ese costo total y pedí también el monto total a pagar en pesos al final del plazo. Las instituciones están obligadas a informarte de antemano la tasa, los cargos, los gastos, las comisiones y los seguros del crédito: si te esquivan esos datos, es una señal de alarma.',
      },
      {
        heading: 'Por qué la cuota chica engaña',
        body: 'El truco comercial más común es venderte la cuota, no el préstamo. Una cuota baja casi siempre significa un plazo largo, y un plazo largo significa muchos más meses pagando intereses. Podés terminar pagando el doble de lo que pediste sin darte cuenta, porque cada mes que estirás el crédito suma costo. La cuota mide si podés pagar mes a mes; el costo total y el monto final a pagar miden cuánto te cuesta el préstamo entero. Son cosas distintas. Antes de firmar, preguntá siempre cuánto vas a haber pagado en total al terminar, y compará ese total con lo que recibís hoy.',
      },
      {
        heading: 'Usura y topes que publica el BCU',
        body: 'En Uruguay la usura está regulada: la normativa vigente prohíbe cobrar por encima de ciertos topes. El BCU publica periódicamente las tasas medias del mercado, y a partir de ellas se fijan los máximos legales que una institución puede cobrar según el tipo y el monto del crédito. Para medir si hay usura se mira la tasa implícita, que incluye intereses más comisiones, gastos y seguros. Si te ofrecen un crédito con un costo que supera esos topes, puede haber usura, algo que la ley sanciona. No hace falta que te sepas los porcentajes de memoria: alcanza con saber que existe un tope y que el BCU es la fuente oficial. Ante una tasa que te parece abusiva, consultá los datos que publica el BCU.',
      },
      {
        heading: 'Cómo comparar bien y aviso final',
        body: 'Para elegir entre dos créditos, pedí a cada institución la misma información por escrito: la TEA, el costo financiero total (la tasa implícita) y el monto total a pagar en pesos para el mismo monto y plazo. Compará por el costo total y por ese monto final, nunca por la cuota. Desconfiá de quien solo te muestra la cuota o te apura a firmar. Esta guía es información general para que entiendas los conceptos, no asesoramiento financiero sobre tu caso puntual. Para dudas específicas, consultá con la institución financiera y revisá las tasas medias y los topes de usura que publica oficialmente el BCU, que es el organismo que regula el sistema financiero uruguayo.',
      },
    ],
    related: [
      { label: 'Calculadora de préstamo', to: '/herramientas/calculadora-prestamo' },
      { label: 'Préstamos a sola firma', to: '/guias/prestamo-a-sola-firma-uruguay' },
      { label: 'Refinanciar deudas', to: '/guias/refinanciar-deudas-uruguay' },
    ],
  },
  {
    slug: 'refinanciar-deudas-uruguay',
    title: 'Refinanciar o unificar deudas en Uruguay: ¿conviene?',
    description:
      'Qué significa refinanciar o unificar deudas en Uruguay, cuándo baja el costo, cuándo solo lo esconde y qué señales de alarma mirar.',
    tag: 'DEUDA',
    updatedAt: '2026-07-18',
    sections: [
      {
        heading: 'Qué es refinanciar y unificar',
        body: 'Refinanciar es cambiar las condiciones de una deuda: tomás un crédito nuevo para cancelar el que ya tenés, normalmente con otra cuota y otro plazo. Unificar o consolidar es juntar varias deudas en una sola, para pagar una única cuota en lugar de varias. Las dos cosas prometen lo mismo: aliviar la cuota mensual y ordenar el bolsillo. Y pueden ser útiles. Pero también pueden ser una trampa si el alivio de hoy se paga con mucho más costo mañana. La pregunta correcta no es si la cuota baja, sino cuánto vas a terminar pagando en total. Ese es el dato que revela si la operación te conviene o no.',
      },
      {
        heading: 'Cuándo sí baja el costo',
        body: 'Refinanciar tiene sentido cuando conseguís una tasa realmente más baja que la que estás pagando. El caso más claro es cambiar deuda cara, como el rotativo de una tarjeta o un crédito de financiera, por un préstamo con una tasa efectiva anual (TEA) más baja, por ejemplo de un banco como el BROU o de una cooperativa. Si además mantenés un plazo parecido, pagás menos intereses y salís antes. También ayuda a ordenarte: una sola cuota, una sola fecha, menos riesgo de olvidarte un pago. La clave es comparar la TEA y el total a pagar de la deuda vieja contra la nueva. Recordá que la TEA que te informan ya debe incluir intereses, gastos, comisiones y seguros, así que sirve para comparar de verdad. Si el total baja de forma clara, la refinanciación te está ayudando.',
      },
      {
        heading: 'Cuándo solo esconde el problema',
        body: 'La refinanciación esconde el problema cuando baja la cuota estirando el plazo sin bajar la tasa. Pagás menos por mes, pero durante muchos más meses, y el total termina siendo mayor. Es especialmente peligroso cuando refinanciás una y otra vez con la misma institución: cada vez debés un poco más y nunca bajás el capital. También es mala señal cuando la nueva operación suma comisiones y seguros que engordan la TEA. En esos casos no estás resolviendo la deuda, la estás pateando para adelante y encareciéndola. El alivio inmediato de una cuota más chica puede costarte caro si no mirás el número final.',
      },
      {
        heading: 'Señales de alarma',
        body: 'Prestá atención a estas señales antes de aceptar. Que solo te hablen de la cuota nueva y nunca de la TEA ni del total a pagar. Que el plazo se alargue mucho para lograr esa cuota. Que la tasa nueva sea igual o más alta que la vieja. Que te ofrezcan refinanciar apenas te atrasás un mes, como solución automática. Que la operación incluya comisiones altas o seguros que no te explican. Y una muy importante: que estés refinanciando para pagar otras cuotas, no un gasto puntual. Si refinanciás de forma repetida solo para llegar a fin de mes, el problema es de flujo, y más deuda no lo arregla.',
      },
      {
        heading: 'Alternativas antes de refinanciar',
        body: 'Antes de tomar deuda nueva, mirá otras salidas. Negociar directamente con el acreedor un plan de pagos o una quita suele ser más barato que refinanciar. Ordenar el presupuesto y recortar gastos libera plata para atacar la deuda más cara primero. Si tenés varias deudas chicas, pagar primero la de mayor tasa reduce el costo total más rápido. Y si la situación te supera, buscar orientación antes de firmar algo nuevo evita empeorarla. Refinanciar es una herramienta más, no la única ni siempre la mejor. Conviene compararla con estas opciones y elegir la que te deje pagando menos en total, no solo menos por mes.',
      },
      {
        heading: 'Cómo decidir y aviso final',
        body: 'Para decidir, poné los números lado a lado: TEA y total a pagar de lo que tenés hoy contra lo que te ofrecen. Si el total nuevo es claramente menor, y el plazo no se dispara, refinanciar te conviene. Si la cuota baja pero el total sube, te están vendiendo alivio, no ahorro. Si querés profundizar en cómo negociar o salir de deudas paso a paso, revisá esa guía específica del sitio. Esto es información general, no asesoramiento sobre tu situación particular. Para casos complejos, consultá con la institución financiera, con un asesor de confianza y revisá las tasas informadas y los topes de usura que publica el BCU en su portal del usuario financiero.',
      },
    ],
    related: [
      { label: 'Saldar deudas', to: '/saldar-deudas-uruguay' },
      { label: 'Salir del Clearing', to: '/salir-del-clearing' },
      { label: 'Entender TEA, TNA y CFT', to: '/guias/entender-tea-tna-y-cft' },
    ],
  },
  {
    slug: 'mejorar-historial-crediticio-uruguay',
    title: 'Cómo mejorar tu historial crediticio en Uruguay',
    description:
      'Diferencia entre el Clearing de Informes y la Central de Riesgos del BCU, cómo salir del clearing y hábitos para reconstruir tu perfil.',
    tag: 'HISTORIAL',
    updatedAt: '2026-07-18',
    sections: [
      {
        heading: 'Clearing de Informes no es lo mismo que Central de Riesgos',
        body: 'En Uruguay se confunden dos cosas distintas. El Clearing de Informes es una base de datos privada, operada por una empresa comercial, que reúne información crediticia de muchas fuentes: bancos, financieras, comercios, servicios y otros. Cuando la gente dice que está en el clearing, se refiere a esto. La Central de Riesgos, en cambio, es del BCU y solo incluye a las instituciones que el BCU regula, como bancos, financieras, cooperativas de ahorro y crédito y administradoras de crédito; ahí figura tu situación y una calificación según cómo venís pagando. Son registros diferentes, con dueños y alcances distintos. Entender cuál te está afectando es el primer paso para poder mejorar tu historial.',
      },
      {
        heading: 'Qué mira cada uno y por qué importa',
        body: 'La Central de Riesgos del BCU clasifica a los deudores del sistema financiero regulado según su comportamiento de pago, y esa calificación la ven los bancos cuando evaluás un crédito. Un mal registro ahí te cierra puertas en el sistema formal. El Clearing privado tiene un alcance más amplio, porque suma incumplimientos con comercios y servicios que no están en el BCU, y lo consultan también empresas para decidir si te venden en cuotas o te dan un plan. Por eso podés estar limpio en uno y con problemas en el otro. Conviene saber en cuál figurás y por qué, porque cada uno se corrige por su lado.',
      },
      {
        heading: 'Cuánto tiempo queda registrada una deuda',
        body: 'La información crediticia negativa no queda para siempre. Según la normativa uruguaya de protección de datos personales, los datos sobre incumplimientos tienen un plazo máximo de permanencia, que en general ronda los cinco años, aunque el plazo exacto puede variar según se trate de una deuda impaga o de una ya cancelada; conviene verificar el plazo vigente ante la unidad de control de datos personales o ante quien administra cada registro. Además, una vez que cancelás la deuda, el registro debe actualizarse para reflejar que pagaste: dejar de figurar como impaga no siempre significa desaparecer de inmediato, porque el dato suele quedar un tiempo marcado como cancelado o saldado antes de borrarse. No te fijes solo en el número de años, porque puede variar según el caso: lo importante es saber que existe un límite y que pagar activa la actualización. Si una deuda vieja o ya cancelada sigue figurando fuera de plazo o como impaga, tenés derecho a reclamar su corrección o eliminación ante quien administra el registro.',
      },
      {
        heading: 'Cómo salir del clearing',
        body: 'No hay un truco para borrar una deuda real: la forma genuina de salir del clearing es regularizar lo que debés. El camino es ubicar exactamente qué deuda te tiene registrado, con qué acreedor y por cuánto, acordar el pago o un plan, cumplirlo y luego verificar que el registro se haya actualizado. Muchas veces el problema no es que no pagaste, sino que pagaste y nadie actualizó el dato, o que la deuda ya está prescripta o fuera de plazo. En esos casos podés reclamar formalmente la corrección. Desconfiá de quien te promete borrarte del clearing por un pago rápido: eso no existe como servicio legítimo.',
      },
      {
        heading: 'Hábitos que reconstruyen tu perfil',
        body: 'Un buen historial se construye con constancia, no de un día para el otro. Pagá siempre en fecha, aunque sea el mínimo indispensable, porque el atraso es lo que más te ensucia. Evitá usar todo el cupo de tus tarjetas: mantener un uso moderado juega a favor. No pidas varios créditos al mismo tiempo, porque las consultas seguidas dan mala señal. Si estás reconstruyendo, un crédito chico bien pagado o una tarjeta usada con prudencia ayudan a mostrar comportamiento sano. Y sobre todo, no tomes deuda nueva para tapar deuda vieja. Con el tiempo, un patrón de pagos puntuales pesa más que un mal antecedente que va quedando atrás.',
      },
      {
        heading: 'Tus derechos y aviso final',
        body: 'Tenés derecho a saber qué datos tuyos figuran en estos registros y a pedir su corrección si son erróneos, están desactualizados o vencidos. La Central de Riesgos la administra el BCU; el Clearing lo opera una empresa privada, y ambos deben permitirte consultar tu información. Si detectás un error, el reclamo se hace ante quien administra cada base. Esta guía es información general y no reemplaza asesoramiento profesional sobre tu caso puntual. Para consultar tu situación en el sistema financiero regulado, dirigite al BCU; para el registro privado, a la empresa que lo administra; y ante un conflicto, podés recurrir al órgano de control de datos personales.',
      },
    ],
    related: [
      { label: 'Salir del Clearing', to: '/salir-del-clearing' },
      { label: 'Saldar deudas', to: '/saldar-deudas-uruguay' },
      { label: 'Ser garante o codeudor', to: '/guias/ser-garante-o-codeudor-riesgos-uruguay' },
    ],
    steps: [
      {
        name: 'Averiguá dónde y por qué figurás',
        text: 'Consultá tu situación en la Central de Riesgos del BCU y en el Clearing de Informes privado. Identificá qué deuda te tiene registrado, con qué acreedor, por cuánto y desde cuándo.',
      },
      {
        name: 'Verificá que la deuda sea válida y vigente',
        text: 'Chequeá que no esté prescripta, ya pagada o fuera del plazo máximo de permanencia. Si ya la pagaste o está vencida, tenés motivo para reclamar la corrección en lugar de pagar de nuevo.',
      },
      {
        name: 'Contactá al acreedor y acordá un pago',
        text: 'Negociá directamente con quien te registró: pago total, quita o plan de cuotas que puedas cumplir. Pedí todo por escrito y guardá comprobantes de cada pago.',
      },
      {
        name: 'Cumplí el acuerdo y pedí constancia',
        text: 'Pagá según lo pactado y solicitá al acreedor una constancia de cancelación o de estar al día. Ese documento es tu respaldo si el registro no se actualiza.',
      },
      {
        name: 'Verificá la actualización del registro',
        text: 'Semanas después, volvé a consultar tu situación y confirmá que el dato figure como cancelado o al día. Si sigue apareciendo como impago fuera de plazo, reclamá formalmente su corrección.',
      },
    ],
  },
  {
    slug: 'ser-garante-o-codeudor-riesgos-uruguay',
    title: 'Ser garante o codeudor en Uruguay: los riesgos',
    description:
      'Qué asumís al firmar como garante, fiador o codeudor en Uruguay, cómo te afecta si el titular no paga y cómo protegerte.',
    tag: 'GARANTÍA',
    updatedAt: '2026-07-18',
    sections: [
      {
        heading: 'Garante, fiador y codeudor: no son lo mismo',
        body: 'Cuando alguien te pide firmar por su deuda, conviene saber en qué rol lo hacés, porque no es igual. El garante o fiador se compromete a responder si el deudor principal no paga. El codeudor, en cambio, es deudor desde el primer día, en el mismo nivel que el titular: la deuda es tan tuya como suya. Y hay un detalle clave: si firmás como fiador solidario, renunciás a exigir que primero le cobren al deudor principal, así que el acreedor puede reclamarte directamente a vos. En la práctica, en Uruguay es muy común que las garantías se firmen como solidarias, lo que te deja tan expuesto como al propio titular.',
      },
      {
        heading: 'Qué asumís realmente al firmar',
        body: 'Firmar como garante o codeudor no es un gesto simbólico ni un favor sin consecuencias: es asumir una obligación real de pago. Si el titular deja de pagar, el acreedor puede reclamarte a vos el total de la deuda, con sus intereses y gastos. Podés terminar pagando algo que no disfrutaste, por un monto que puede crecer con recargos. Además, mientras la garantía esté vigente, esa deuda potencial puede pesar cuando vos mismo quieras pedir un crédito, porque figura como un compromiso tuyo. En los hechos, tu firma vale como si el préstamo fuera tuyo. Por eso nunca conviene firmar por compromiso, apuro o vergüenza a decir que no.',
      },
      {
        heading: 'Cómo te afecta si el titular no paga',
        body: 'Si el deudor principal se atrasa o directamente no paga, las consecuencias caen sobre vos. El acreedor puede exigirte el pago, y si sos fiador solidario o codeudor, sin necesidad de perseguir antes al titular. Podés ir a parar al Clearing de Informes y a la Central de Riesgos del BCU por una deuda ajena, lo que te complica para tus propios créditos, alquileres o compras en cuotas. En casos extremos, la deuda puede terminar en un juicio y en la ejecución de tus bienes o el embargo de parte de tu sueldo, dentro de los límites que fija la ley. Todo esto por algo que firmaste para ayudar a otro. Es el escenario que hay que tener claro antes, no después.',
      },
      {
        heading: 'Cómo protegerte antes de firmar',
        body: 'Si igual vas a firmar, tomá recaudos. Leé el contrato completo y fijate en qué rol quedás: fiador simple, fiador solidario o codeudor. Preguntá por el monto total garantizado, el plazo y si tu responsabilidad tiene un tope o cubre todo lo que el deudor llegue a deber, incluidos recargos. Evaluá honestamente si podrías pagar esa deuda vos, porque esa es la posibilidad real que estás aceptando. Firmá solo por personas y montos que conozcas y en los que confíes de verdad. Pedí copia de todo lo que firmás. Y si algo no te cierra o no lo entendés, no firmes: una vez que firmaste, salir es mucho más difícil.',
      },
      {
        heading: 'Cómo salir de una garantía',
        body: 'Salir de una garantía ya firmada no es automático ni depende solo de tu voluntad. Mientras la deuda esté viva, seguís obligado. Las vías reales son que la deuda se cancele por completo, que el acreedor acepte liberarte, o que se sustituya tu garantía por otra que el acreedor apruebe. Nada de esto ocurre porque vos te arrepientas: hace falta el acuerdo del acreedor y, muchas veces, del propio deudor. Por eso conviene revisar el contrato para ver si prevé alguna forma de liberación o vencimiento. Si te ves atrapado en una garantía y no encontrás salida, buscá asesoramiento legal para analizar tu situación concreta antes de asumir un pago que no te corresponde.',
      },
      {
        heading: 'Aviso final',
        body: 'Ser garante o codeudor es una decisión con peso legal y económico real, no un simple favor. Esta guía es información general para que entiendas los riesgos, no asesoramiento jurídico sobre tu caso. Los contratos de garantía tienen matices importantes según cómo estén redactados, y las consecuencias pueden ser serias. Antes de firmar, o si ya firmaste y estás en problemas, consultá con un abogado o escribano de confianza que revise el documento específico. Para entender cómo una deuda impaga puede afectar tu registro, podés ver también la guía sobre historial crediticio del sitio. La regla más sana sigue siendo simple: no firmes por lo que no podrías pagar vos.',
      },
    ],
    related: [
      { label: 'Préstamos a sola firma', to: '/guias/prestamo-a-sola-firma-uruguay' },
      {
        label: 'Mejorar tu historial crediticio',
        to: '/guias/mejorar-historial-crediticio-uruguay',
      },
      { label: 'Garantías de alquiler', to: '/guias/garantias-de-alquiler-uruguay' },
    ],
  },
  {
    slug: 'salir-de-deudas-de-tarjeta-uruguay',
    title: 'Cómo salir de las deudas de tarjeta de crédito',
    description:
      'Por qué el pago mínimo es una trampa, cómo aplicar bola de nieve o avalancha y cómo negociar con el emisor para salir de la tarjeta.',
    tag: 'TARJETA',
    updatedAt: '2026-07-18',
    sections: [
      {
        heading: 'Por qué el pago mínimo es una trampa',
        body: 'La tarjeta de crédito te ofrece pagar solo un mínimo cada mes, y ahí está la trampa. Todo lo que no pagás queda financiado a la tasa del rotativo, que es de las más caras del mercado. Al mes siguiente pagás intereses sobre ese saldo, y si volvés a pagar el mínimo, los intereses se siguen acumulando sobre lo que queda. Podés estar pagando puntualmente todos los meses y ver que la deuda casi no baja, o incluso que sube si seguís consumiendo. El pago mínimo no está diseñado para que salgas de la deuda, sino para que sigas pagando intereses el mayor tiempo posible. Salir empieza por dejar de pagar solo el mínimo.',
      },
      {
        heading: 'Entender el interés rotativo',
        body: 'El rotativo es el crédito que se activa cuando no pagás el total de tu resumen. La parte que dejás sin pagar se convierte en un préstamo caro, con una tasa muy alta, y sobre esa base se calculan los intereses del mes siguiente. Como esos intereses se suman al saldo, terminás pagando intereses sobre intereses. Por eso una deuda de tarjeta puede crecer sola aunque no compres nada nuevo. Lo primero, entonces, es dejar de usar la tarjeta para consumo mientras tengas saldo, así frenás que la bola crezca. Y lo segundo es atacar el saldo con pagos por encima del mínimo, porque cada peso extra reduce la base sobre la que te cobran.',
      },
      {
        heading: 'Método bola de nieve',
        body: 'El método bola de nieve ordena tus deudas de menor a mayor monto y las ataca en ese orden. Pagás el mínimo en todas para no atrasarte, y volcás todo el dinero extra que puedas a la deuda más chica hasta liquidarla. Cuando la eliminás, sumás lo que pagabas en ella a la siguiente deuda, y así se va agrandando el pago como una bola de nieve. Su ventaja es psicológica: liquidar deudas enteras rápido te motiva y te muestra que avanzás. No es el método matemáticamente más barato, pero para mucha gente es el que mejor se sostiene en el tiempo, y sostenerlo es justamente lo que hace la diferencia.',
      },
      {
        heading: 'Método avalancha',
        body: 'El método avalancha ordena las deudas por tasa de interés, de la más cara a la más barata. Pagás el mínimo en todas y volcás el dinero extra a la deuda con la TEA más alta, que suele ser el rotativo de la tarjeta. Cuando la terminás, pasás a la siguiente más cara. Es el método que menos intereses te hace pagar en total, porque ataca primero lo que más te cuesta. La contra es que la deuda más cara no siempre es la más chica, así que podés tardar más en ver la primera victoria. Si te motiva el ahorro y podés sostener el plan sin desanimarte, la avalancha es la opción más eficiente en plata.',
      },
      {
        heading: 'Negociar con el emisor',
        body: 'Si el saldo te supera, hablá con el emisor de la tarjeta antes de caer en atraso. Muchas veces aceptan pasar la deuda del rotativo a un préstamo en cuotas con una tasa bastante más baja, o acordar un plan de pagos. Eso puede bajarte el costo de forma real, siempre que compares la TEA nueva con la que venís pagando. Lo que conviene evitar es refinanciar en condiciones caras que solo estiran la deuda: si la tasa no baja de verdad, no te ayuda. Llegar a un acuerdo antes de atrasarte también protege tu historial. Pedí siempre las condiciones por escrito, con el total a pagar, y no aceptes la primera oferta sin comparar.',
      },
      {
        heading: 'Sostener el cambio y aviso final',
        body: 'Salir de la tarjeta no es solo pagar: es cambiar el hábito que te trajo hasta acá. Mientras estés saldando, usá débito o efectivo, armá un presupuesto que deje margen para el pago extra y evitá tomar deuda nueva para cubrir la vieja. Una vez libre, la tarjeta puede seguir siendo útil si la pagás siempre en su totalidad y nunca entrás al rotativo. Esta guía es información general, no asesoramiento sobre tu situación particular. Si la deuda te desborda, buscá orientación y revisá las tasas y topes que publica el BCU. Para negociar o unificar deudas, mirá también las guías del sitio sobre saldar y refinanciar deudas.',
      },
    ],
    related: [
      { label: 'Tarjetas de crédito', to: '/tarjetas-de-credito-uruguay' },
      { label: 'Saldar deudas', to: '/saldar-deudas-uruguay' },
      { label: 'Entender TEA, TNA y CFT', to: '/guias/entender-tea-tna-y-cft' },
    ],
    steps: [
      {
        name: 'Frená la deuda y hacé la lista',
        text: 'Dejá de usar la tarjeta para consumo nuevo y anotá todas tus deudas con su saldo y su tasa efectiva anual (TEA). Sin ese mapa claro no podés elegir estrategia.',
      },
      {
        name: 'Elegí bola de nieve o avalancha',
        text: 'Si necesitás motivación rápida, ordená de menor a mayor saldo (bola de nieve). Si querés pagar menos intereses, ordená de mayor a menor tasa (avalancha).',
      },
      {
        name: 'Pagá el mínimo en todas y volcá el extra a una',
        text: 'Cubrí el mínimo de cada deuda para no atrasarte y destiná todo el dinero disponible a la deuda objetivo hasta liquidarla por completo.',
      },
      {
        name: 'Reasigná al terminar cada deuda',
        text: 'Cuando saldás una, sumá lo que pagabas en ella al pago de la siguiente. El monto que atacás crece a cada paso y acelera el proceso.',
      },
      {
        name: 'Negociá si el rotativo te supera',
        text: 'Si el saldo de tarjeta es demasiado caro, pedí al emisor pasarlo a un préstamo en cuotas de menor TEA. Compará el total a pagar antes de aceptar.',
      },
    ],
  },
  {
    slug: 'entender-tu-recibo-de-sueldo-uruguay',
    title: 'Cómo entender tu recibo de sueldo en Uruguay',
    description:
      'Qué es el nominal y el líquido, qué te descuentan (BPS, FONASA, FRL, IRPF) y por qué, para que entiendas tu recibo de sueldo en Uruguay.',
    tag: 'SUELDO',
    updatedAt: '2026-07-18',
    sections: [
      {
        heading: 'Nominal, líquido y por qué no coinciden',
        body: 'El nominal es el sueldo bruto acordado, la cifra que suele figurar en el contrato o en el aviso de trabajo. El líquido es lo que efectivamente te cae en la cuenta después de los descuentos obligatorios. La diferencia no es un invento del empleador: son aportes a la seguridad social y, si corresponde, retención de IRPF, que la empresa está obligada a descontarte y volcar al BPS y a la DGI en tu nombre. Por eso una parte de tu sueldo nunca la ves como efectivo, pero igual es tuya en el sentido de que financia tu jubilación y tu cobertura de salud. Entender esta distinción es el primer paso para leer cualquier recibo.',
      },
      {
        heading: 'Los aportes personales al BPS',
        body: 'Sobre tu nominal se descuentan tres aportes personales que van al BPS. El aporte jubilatorio (en general un 15% del nominal) financia tu futura pasividad y define la historia laboral que después mira el BPS. El aporte al FONASA financia tu mutualista o ASSE: su porcentaje varía según cuánto ganás y si tenés cónyuge o hijos a cargo, moviéndose aproximadamente entre un 3% y un 8%. El aporte al Fondo de Reconversión Laboral (FRL) es chico, del orden del 0,1%, y financia programas de capacitación y reconversión laboral que administra el INEFOP. Estos aportes se calculan sobre el nominal, no sobre el líquido, y aparecen desglosados en tu recibo.',
      },
      {
        heading: 'El IRPF retenido',
        body: 'El IRPF es el impuesto a la renta de las personas físicas y grava el trabajo por encima de un mínimo no imponible. Si tu sueldo supera ese piso, el empleador te retiene una parte cada mes y la adelanta a la DGI. Es un impuesto progresivo por franjas: solo la porción de ingreso que cae en cada tramo paga la tasa de ese tramo, así que nunca todo tu sueldo tributa a la tasa más alta. Lo que te retienen mes a mes es un anticipo estimado; al año siguiente se ajusta con la liquidación anual y puede haber devolución o complemento. Verás la línea de IRPF solo si estás por encima del piso.',
      },
      {
        heading: 'Las partidas: aguinaldo, salario vacacional, horas extra',
        body: 'Además del sueldo del mes, el recibo puede incluir partidas. El aguinaldo (sueldo anual complementario) se cobra en dos medios, alrededor de junio y de diciembre. El salario vacacional es una suma extra para disfrutar la licencia y se paga antes de que la tomes. También pueden figurar horas extra, nocturnidad, presentismo, comisiones o viáticos. Algunas de estas partidas aportan a BPS y pagan IRPF igual que el sueldo; otras, como ciertos viáticos, pueden tener tratamiento distinto. Conviene mirar cada línea: no es lo mismo un ingreso gravado que uno que no lo es, y eso explica variaciones de un mes a otro.',
      },
      {
        heading: 'Por qué te descuentan tanto y cómo verificarlo',
        body: 'La sensación de que el descuento es enorme suele venir de sumar todo junto: entre aportes personales y, si aplica, IRPF, la diferencia entre nominal y líquido puede ser considerable. Pero cada peso descontado tiene un destino identificable y verificable. Podés cruzar tu recibo con tu historia laboral y tus aportes ingresando a tu cuenta personal del BPS, y con tu situación de IRPF en la web de la DGI. Si algún descuento no cierra, o si aparece un aporte que no reconocés, es motivo para preguntarle a la empresa o consultarlo. Un recibo prolijo detalla nominal, cada aporte, la retención y el líquido final.',
      },
      {
        heading: 'Dónde seguir y una aclaración',
        body: 'Esta es una guía general para leer tu recibo, no asesoramiento contable ni legal para tu caso concreto. El mínimo no imponible y las franjas del IRPF se expresan en BPC y se actualizan cada año cuando cambia el valor de la BPC; las tasas de aporte a la seguridad social se fijan por ley. Para cifras exactas conviene mirar las fuentes oficiales: el BPS para aportes y seguridad social, y la DGI para el IRPF. Si tenés una duda puntual sobre tu liquidación o creés que hay un error, un contador o el propio BPS pueden revisar tu historia laboral. Para estimar tu líquido a partir del nominal, podés usar la calculadora de sueldo del sitio como orientación.',
      },
    ],
    related: [
      { label: 'Calculadora de sueldo líquido', to: '/herramientas/calculadora-sueldo-liquido' },
      { label: 'Cómo funciona el IRPF', to: '/guias/como-funciona-el-irpf-uruguay' },
      { label: 'Cómo se calcula el aguinaldo', to: '/guias/como-se-calcula-el-aguinaldo-uruguay' },
    ],
    steps: [
      {
        name: 'Identificá el nominal',
        text: 'Ubicá en el recibo el sueldo nominal del mes y sumale las partidas gravadas (horas extra, comisiones). Esa es la base sobre la que se calculan los aportes.',
      },
      {
        name: 'Revisá los aportes personales',
        text: 'Chequeá las líneas de aporte jubilatorio (aprox. 15%), FONASA (variable según ingreso y familia) y FRL (aprox. 0,1%). Deben calcularse sobre el nominal.',
      },
      {
        name: 'Mirá la retención de IRPF',
        text: 'Si tu sueldo supera el mínimo no imponible, verás una línea de IRPF. Recordá que es un anticipo que se ajusta en la liquidación anual.',
      },
      {
        name: 'Confirmá el líquido',
        text: 'El líquido es el nominal más partidas, menos aportes y menos IRPF. Verificá que ese número coincida con lo que te depositaron.',
      },
      {
        name: 'Cruzá con las fuentes oficiales',
        text: 'Entrá a tu cuenta del BPS para ver tus aportes e historia laboral, y a la DGI para tu situación de IRPF. Ante dudas, consultá a la empresa o a un contador.',
      },
    ],
  },
  {
    slug: 'como-se-calcula-el-aguinaldo-uruguay',
    title: 'Cómo se calcula el aguinaldo en Uruguay',
    description:
      'Qué es el aguinaldo (sueldo anual complementario), cómo se calcula por proporción de lo ganado y cuándo se cobra en Uruguay: junio y diciembre.',
    tag: 'AGUINALDO',
    updatedAt: '2026-07-18',
    sections: [
      {
        heading: 'Qué es el aguinaldo',
        body: 'El aguinaldo, cuyo nombre técnico es sueldo anual complementario, es un derecho de todo trabajador de la actividad privada y equivale, a grandes rasgos, a un sueldo extra repartido en el año. La idea es simple: por cada peso que ganás a lo largo del período, se te acumula una fracción que se te paga aparte. No es un premio ni algo que la empresa decide dar por buena voluntad: es obligatorio. A diferencia de un bono discrecional, el aguinaldo está establecido por la normativa laboral y se calcula sobre lo efectivamente ganado, así que cuanto más trabajaste y cobraste en el período, mayor es el aguinaldo que te corresponde.',
      },
      {
        heading: 'Cómo se calcula',
        body: 'El cálculo es proporcional a lo que ganaste. En términos generales, el aguinaldo de un período equivale a la doceava parte del total de las remuneraciones nominales que cobraste en ese lapso; dicho de otra forma, sumás todo lo nominal ganado en el semestre y lo dividís entre doce. Por eso no todos cobran lo mismo: entran al cálculo el sueldo, las horas extra, comisiones y otras partidas salariales del período. Si no trabajaste el semestre completo, cobrás la parte proporcional al tiempo efectivamente trabajado. Esta lógica de proporción es la que hace que quien ingresó a mitad de año igual reciba su aguinaldo, aunque más chico.',
      },
      {
        heading: 'Cuándo se cobra: los dos medios aguinaldos',
        body: 'El aguinaldo se paga en dos veces al año, en dos medios. Uno se abona alrededor de junio y el otro cerca de fin de año, en diciembre, antes de las fiestas. Cada pago corresponde a un semestre distinto de remuneraciones, y en los dos casos se trata de meses ya trabajados: el de junio cubre aproximadamente el semestre que va de diciembre a mayo, y el de diciembre el semestre de junio a noviembre. Por eso, si empezaste a trabajar en agosto, tu primer aguinaldo llegará en diciembre y será proporcional a los meses trabajados desde tu ingreso. Los plazos exactos de pago están fijados por la normativa, y en la práctica las empresas los liquidan en esas ventanas de junio y diciembre.',
      },
      {
        heading: 'Aportes e impuestos sobre el aguinaldo',
        body: 'El aguinaldo no es plata libre de descuentos. Es materia gravada: sobre él se calculan los aportes personales al BPS igual que sobre el sueldo, y también computa a los efectos del IRPF. Esto sorprende a mucha gente que espera cobrar el aguinaldo entero y ve que el líquido es menor al medio sueldo teórico. La contracara es positiva: como aporta al BPS, el aguinaldo también suma a tu historia laboral y a tu futura jubilación. Al liquidarse en meses donde también cobrás sueldo, la retención de IRPF de ese mes puede subir, algo que después se acomoda en el ajuste anual del impuesto.',
      },
      {
        heading: 'Aguinaldo al terminar el vínculo',
        body: 'Si dejás la empresa antes de que llegue la fecha del pago, no perdés el aguinaldo acumulado. En la liquidación final se te debe abonar la parte proporcional al tiempo trabajado desde el último medio aguinaldo cobrado hasta el día que te vas. Esto vale tanto si renunciás como si te despiden. Es una de las partidas que más se olvida revisar al cerrar un trabajo, junto con la licencia no gozada y el salario vacacional. Si el monto que te liquidan no refleja los meses que trabajaste en el semestre en curso, conviene reclamarlo o consultarlo antes de firmar conforme.',
      },
      {
        heading: 'Dónde verificar y una aclaración',
        body: 'Esta guía explica el mecanismo general del aguinaldo; no reemplaza el asesoramiento de un contador ni la consulta a fuentes oficiales para tu caso. El BPS y el Ministerio de Trabajo publican los criterios y plazos vigentes, y son la referencia ante cualquier diferencia con tu empleador. Si sospechás que el cálculo está mal o que no te pagaron un medio aguinaldo que corresponde, podés plantearlo en el Ministerio de Trabajo o con un asesor laboral. Para estimar cuánto debería darte tu aguinaldo según lo que ganaste en el semestre, podés apoyarte en la calculadora de aguinaldo del sitio.',
      },
    ],
    related: [
      { label: 'Calculadora de aguinaldo', to: '/herramientas/calculadora-aguinaldo' },
      {
        label: 'Licencia y salario vacacional',
        to: '/guias/licencia-y-salario-vacacional-uruguay',
      },
      { label: 'Entender tu recibo de sueldo', to: '/guias/entender-tu-recibo-de-sueldo-uruguay' },
    ],
  },
  {
    slug: 'licencia-y-salario-vacacional-uruguay',
    title: 'Licencia y salario vacacional en Uruguay',
    description:
      'Cuántos días de licencia te corresponden según antigüedad, qué es el salario vacacional, cómo se calcula y cuándo se paga en Uruguay.',
    tag: 'LICENCIA',
    updatedAt: '2026-07-18',
    sections: [
      {
        heading: 'Cuántos días de licencia te corresponden',
        body: 'Todo trabajador de la actividad privada tiene derecho a licencia anual paga. La base es de veinte días de descanso al año una vez cumplido el primer año de trabajo. A eso se le suma antigüedad: a partir de cierta cantidad de años en la misma empresa, se genera un día adicional de licencia cada cierto tramo de años trabajados, de modo que quien lleva mucho tiempo en un lugar acumula más días. Al contarlos, ojo con un detalle: no se computan los domingos ni los feriados pagos, pero los sábados sí se cuentan, así que en días corridos el descanso te dura un poco más que la cifra de días de licencia. Es un derecho irrenunciable: no se puede canjear por dinero para seguir trabajando, salvo situaciones especiales previstas por la normativa.',
      },
      {
        heading: 'Cómo se genera la licencia',
        body: 'La licencia no aparece de golpe: se va generando a lo largo del año en proporción al tiempo trabajado. Un año completo de trabajo genera el paquete completo de días; medio año, aproximadamente la mitad. Por eso, si entraste hace pocos meses, ya venís acumulando licencia aunque todavía no llegues al total. Esta lógica de generación proporcional es la que después permite calcular la licencia no gozada cuando alguien deja la empresa antes de tomarse todos sus días. La licencia se genera trabajando, y ciertos períodos, como algunas licencias especiales, pueden computar o no según lo que establezca la normativa vigente.',
      },
      {
        heading: 'Qué es el salario vacacional',
        body: 'El salario vacacional es una suma extra que se paga para el mejor goce de la licencia; en criollo, plata adicional para que puedas disfrutar tus vacaciones sin resentir tu presupuesto. Es distinto del sueldo que igual seguís cobrando durante la licencia: mientras estás de vacaciones percibís tu jornal de licencia y, además, este complemento aparte. Equivale, en términos generales, al cien por ciento del jornal líquido correspondiente a los días de licencia. La palabra clave es líquido: se calcula sobre el jornal ya descontados los aportes a la seguridad social, no sobre el nominal, lo que lo diferencia de otras partidas del recibo.',
      },
      {
        heading: 'Cómo se calcula y cuándo se paga',
        body: 'Para un trabajador mensual, una forma sencilla de aproximarlo es tomar el sueldo líquido, dividirlo entre treinta para obtener el jornal líquido diario y multiplicarlo por los días de licencia que vas a tomar. Para un jornalero, se multiplica el jornal líquido por los días de licencia que correspondan. El salario vacacional debe abonarse antes de que empieces la licencia, no después: la idea es que salgas de vacaciones con esa plata en mano. Se paga en proporción a los días que efectivamente tomás, así que si fraccionás la licencia, el complemento también se fracciona según los días de cada tramo.',
      },
      {
        heading: 'Licencia y salario vacacional al irte de la empresa',
        body: 'Si terminás el vínculo con días de licencia sin tomar, no los perdés: en la liquidación final la empresa debe pagarte la licencia no gozada y el salario vacacional proporcional generados y no disfrutados. Esto vale tanto en renuncia como en despido. Es una de las partidas donde más conviene revisar los números, porque depende de cuánto trabajaste en el año en curso y de los días que quedaron pendientes. Si el cálculo que te presentan no contempla la licencia que generaste desde el último período, o el salario vacacional correspondiente, es razonable pedir el detalle antes de dar por cerrada la liquidación.',
      },
      {
        heading: 'Dónde verificar y una aclaración',
        body: 'Esta es información general y no sustituye una consulta profesional para tu situación concreta. Los días exactos por antigüedad, el cómputo de ciertos períodos y las particularidades de cada sector están regulados por la normativa laboral y pueden tener matices por convenio colectivo. El Ministerio de Trabajo y Seguridad Social publica los criterios oficiales y es la referencia ante diferencias con tu empleador. Si dudás de cómo te liquidaron la licencia o el salario vacacional, podés consultar en el Ministerio de Trabajo o con un asesor laboral. Un contador o el propio recibo detallado te ayudan a chequear que los días y montos estén bien.',
      },
    ],
    related: [
      { label: 'Cómo se calcula el aguinaldo', to: '/guias/como-se-calcula-el-aguinaldo-uruguay' },
      { label: 'Despido y liquidación', to: '/guias/despido-y-liquidacion-uruguay' },
      { label: 'Entender tu recibo de sueldo', to: '/guias/entender-tu-recibo-de-sueldo-uruguay' },
    ],
  },
  {
    slug: 'despido-y-liquidacion-uruguay',
    title: 'Despido y liquidación en Uruguay: qué te corresponde',
    description:
      'Qué te corresponde al ser despedido en Uruguay: indemnización por despido, tope, preaviso y qué incluye la liquidación final (licencia, aguinaldo, salario vacacional).',
    tag: 'DESPIDO',
    updatedAt: '2026-07-18',
    sections: [
      {
        heading: 'La indemnización por despido',
        body: 'Cuando te despiden sin que haya una causa grave, tenés derecho a una indemnización por despido. Para los trabajadores mensuales, la regla general es de un mes de sueldo por cada año trabajado, computándose también la fracción de año: cualquier fracción, por chica que sea, suele generar derecho a una mensualidad completa aunque no llegues a completar otro año entero. Esa indemnización tiene un tope: no puede superar el equivalente a seis mensualidades, por más años que lleves en la empresa. Para los jornaleros existe un régimen propio, calculado en jornales según los días trabajados, con su propio tope. La indemnización compensa la pérdida del empleo y es distinta del resto de partidas que se te adeudan por el trabajo ya realizado, que se pagan igual.',
      },
      {
        heading: 'Mensuales, jornaleros y el tope',
        body: 'La distinción entre mensual y jornalero cambia el cálculo. El mensual cobra por mes y su indemnización se mide en mensualidades, con tope de seis. El jornalero cobra por día trabajado y su indemnización se mide en jornales, en función de cuántas jornadas acumuló, también con un tope máximo de jornales. En ambos casos la lógica es la misma: proteger al trabajador frente a la pérdida del empleo, pero con un límite para no volver el despido impagable. Si tu forma de contratación no es clara, o combinás modalidades, conviene revisar tus recibos, porque de ahí depende bajo qué régimen te corresponde calcular la indemnización.',
      },
      {
        heading: 'El preaviso',
        body: 'A diferencia de otros países, en el régimen común uruguayo el empleador no está obligado por ley general a darte un preaviso antes de despedirte: puede comunicar la decisión y esa misma indemnización cubre la situación. Sin embargo, sí puede existir obligación de preaviso cuando lo establece el contrato individual, el laudo del Consejo de Salarios de tu sector o un convenio colectivo. Por eso vale la pena mirar qué dice el convenio de tu rama: algunos sectores fijan avisos o condiciones adicionales. Si tu caso está amparado por un convenio con preaviso y no se respetó, eso puede dar lugar a un reclamo aparte de la indemnización común.',
      },
      {
        heading: 'Qué incluye la liquidación final',
        body: 'La indemnización no es lo único que te deben al salir. La liquidación final incluye además todo lo ya generado y no cobrado: los días trabajados del mes en curso, la licencia no gozada, el salario vacacional proporcional y el aguinaldo proporcional al tiempo trabajado desde el último medio aguinaldo. Estas partidas te corresponden siempre, incluso si renunciás en lugar de que te despidan, porque son fruto de trabajo ya hecho. Un dato relevante: la indemnización por despido, en su monto legal, está exenta de impuestos y aportes, mientras que otras partidas de la liquidación pueden estar gravadas. Conviene pedir el detalle desglosado para verificar que estén todas y bien calculadas.',
      },
      {
        heading: 'Despido con causa y casos especiales',
        body: 'Si el despido se funda en notoria mala conducta del trabajador, el empleador puede sostener que no corresponde indemnización; pero debe poder probar esa causa grave, no alcanza con afirmarla. Además existen situaciones de protección especial, como el despido de una trabajadora embarazada o casos que la jurisprudencia considera abusivos, donde puede corresponder una indemnización mayor a la común. Estos escenarios son terreno de análisis jurídico fino y muchas veces se dirimen ante la Justicia laboral. Si te despiden alegando una causa que considerás injusta, o sospechás un despido especial, es el momento de asesorarte antes de firmar conformidad con la liquidación.',
      },
      {
        heading: 'Dónde reclamar y una aclaración',
        body: 'Esta guía es información general y no constituye asesoramiento legal para tu caso. Los montos, topes y plazos de pago están fijados por la normativa laboral vigente y pueden variar según tu sector y convenio. El Ministerio de Trabajo y Seguridad Social es la vía para consultas y para instancias de conciliación, y un abogado laboralista puede evaluar si la liquidación que te ofrecen es correcta o si tenés derecho a reclamar más. No firmes conforme apurado: una vez cobrada y firmada la liquidación, reabrir el reclamo es más difícil. Ante la duda, pedí el detalle por escrito y hacelo revisar antes.',
      },
    ],
    related: [
      {
        label: 'Licencia y salario vacacional',
        to: '/guias/licencia-y-salario-vacacional-uruguay',
      },
      { label: 'Entender tu recibo de sueldo', to: '/guias/entender-tu-recibo-de-sueldo-uruguay' },
      { label: 'Cómo se calcula el aguinaldo', to: '/guias/como-se-calcula-el-aguinaldo-uruguay' },
    ],
  },
  {
    slug: 'como-funciona-el-irpf-uruguay',
    title: 'Cómo funciona el IRPF en Uruguay',
    description:
      'Cómo funciona el IRPF en Uruguay: impuesto progresivo por franjas, mínimo no imponible, deducciones por hijos y alquiler, y el ajuste anual con devolución.',
    tag: 'IRPF',
    updatedAt: '2026-07-18',
    sections: [
      {
        heading: 'Un impuesto progresivo por franjas',
        body: 'El IRPF grava los ingresos de las personas físicas, y en el caso del trabajo lo hace de forma progresiva por franjas. Esto es clave para no asustarse: tu ingreso se divide en tramos y cada tramo paga su propia tasa, que va subiendo. La primera franja no paga, y solo la porción de sueldo que entra en cada tramo superior tributa a la tasa de ese tramo. Por eso jamás pagás la tasa más alta sobre todo tu sueldo, sino apenas sobre la parte que supera el límite del tramo anterior. Subir de franja solo encarece la porción nueva del ingreso, no todo el sueldo. Hay un matiz local que conviene tener presente: como las deducciones se calculan con su propia escala y a un factor que baja al cruzar cierto nivel de ingreso, en algunos umbrales puntuales ganar un poco más puede mover el resultado más de lo esperado, así que si estás justo en el borde conviene simular tu caso.',
      },
      {
        heading: 'El mínimo no imponible',
        body: 'El IRPF tiene un piso: por debajo de cierto nivel de ingreso mensual no pagás nada. Ese mínimo no imponible se expresa en BPC, la Base de Prestaciones y Contribuciones, que se actualiza cada año. En términos redondos, recién por encima del entorno de siete BPC de ingreso mensual empieza a aparecer retención. Como la BPC cambia todos los años, el monto exacto en pesos también cambia, así que conviene mirar el valor vigente en la DGI en lugar de fijar una cifra de memoria. Que estés por debajo del piso no te exime de otras obligaciones, pero sí implica que no se te retiene IRPF en el recibo.',
      },
      {
        heading: 'Las deducciones',
        body: 'El IRPF permite deducciones que reducen el impuesto, pero no funcionan restando peso a peso: se suman ciertos conceptos y sobre ese total se aplica una escala propia, y el resultado se descuenta del impuesto calculado sobre tus ingresos. Entre los conceptos deducibles están los aportes personales al BPS y al FONASA, y un monto fijo por cada hijo o menor a cargo (mayor en caso de discapacidad). Aparte de eso, si sos inquilino podés computar un crédito por parte del alquiler de tu vivienda permanente, siempre que identifiques al arrendador ante la DGI. También pueden computar ciertos aportes a AFAP y a cajas profesionales. Declarar bien las deducciones a las que tenés derecho puede bajar sensiblemente lo que pagás o generar una devolución.',
      },
      {
        heading: 'Retención mensual y ajuste anual',
        body: 'Lo que te retienen mes a mes es un anticipo estimado a partir de tu sueldo de ese mes. Pero el IRPF es, en el fondo, un impuesto anual. Por eso, terminado el año, se hace un ajuste que compara lo que efectivamente te retuvieron con lo que realmente correspondía según tu ingreso y deducciones de todo el año. De ese cruce puede surgir una devolución, si te retuvieron de más, o un complemento a pagar, si te retuvieron de menos. Situaciones como cambiar de trabajo, tener más de un empleo o variar mucho tus ingresos suelen generar diferencias, que es exactamente lo que el ajuste anual viene a corregir.',
      },
      {
        heading: 'La declaración jurada y la devolución',
        body: 'Cada año, en las fechas que fija la DGI, corresponde el proceso de liquidación anual del IRPF. Muchos trabajadores con un solo empleo quedan bien liquidados por el sistema, pero presentar la declaración jurada suele convenir para reclamar deducciones que no se cargaron mes a mes, como hijos o alquiler, y así recuperar plata. Si tenés dos trabajos, o combinás trabajo dependiente con honorarios, la declaración deja de ser opcional en la práctica, porque cada empleador retuvo sin ver el ingreso total. La devolución, cuando corresponde, la deposita la DGI. Revisar la declaración con tiempo evita tanto perder devoluciones como llevarte la sorpresa de un complemento.',
      },
      {
        heading: 'Dónde verificar y una aclaración',
        body: 'Esta guía explica el mecanismo del IRPF; no es asesoramiento tributario para tu situación concreta. Las franjas, tasas, el mínimo no imponible y los topes de deducción se expresan en BPC y se actualizan cada año, por lo que la referencia siempre es la DGI, que publica las escalas vigentes y los instructivos de la declaración. Si tenés varias fuentes de ingreso, deducciones complejas o dudas sobre la devolución, un contador puede optimizar tu liquidación y evitar errores. Para estimar cuánto IRPF te corresponde según tu sueldo y tus deducciones, podés usar la calculadora de IRPF del sitio como orientación antes de la declaración.',
      },
    ],
    related: [
      { label: 'Calculadora de IRPF', to: '/herramientas/calculadora-irpf' },
      { label: 'Entender tu recibo de sueldo', to: '/guias/entender-tu-recibo-de-sueldo-uruguay' },
      { label: 'Trabajar para el exterior', to: '/guias/trabajar-para-el-exterior-desde-uruguay' },
    ],
  },
  {
    slug: 'trabajar-para-el-exterior-desde-uruguay',
    title: 'Trabajar para el exterior desde Uruguay: cómo facturar y tributar',
    description:
      'Cómo facturar y tributar si trabajás freelance para clientes del exterior desde Uruguay: unipersonal, IVA tasa cero por exportación de servicios, IRAE y aportes BPS.',
    tag: 'EXTERIOR',
    updatedAt: '2026-07-18',
    sections: [
      {
        heading: 'Formalizarte: por qué necesitás una empresa',
        body: 'Si trabajás por tu cuenta para clientes de afuera, en algún momento vas a necesitar facturarles, y para eso hace falta estar formalizado ante la DGI y el BPS. Cobrar a una cuenta personal sin factura funciona hasta que el cliente pide comprobante, el banco pregunta por el origen de los fondos o querés acceder a crédito o a cobertura de salud propia. Formalizarte también te da historia laboral y aportes jubilatorios. La vía más común para un freelance es abrir una empresa unipersonal, donde vos sos el titular. Es un trámite relativamente accesible y te habilita a emitir facturas, incluidas las de exportación de servicios, que son las que vas a usar con el exterior.',
      },
      {
        heading: 'Unipersonal, Literal E y monotributo',
        body: 'No todos los regímenes sirven para lo mismo. El monotributo es un régimen pensado para actividades de muy pequeña escala y venta a consumidores finales, y en general no es el camino para exportar servicios al exterior. La empresa unipersonal sí te permite emitir facturas de exportación con IVA a tasa cero. Dentro de las unipersonales, quienes facturan montos bajos pueden quedar comprendidos como pequeña empresa (el llamado Literal E), que paga un IVA mínimo fijo y está exonerada de IRAE. Un punto a tener en cuenta: en Literal E no recuperás el IVA de tus compras como sí ocurre en el régimen general, así que si ese recupero te importa, conviene analizar la unipersonal por el régimen común. Si facturás montos altos y de forma sostenida, o querés separar tu patrimonio personal del de la actividad, algunos evalúan una SRL, más cara de constituir y mantener. La elección correcta depende de cuánto facturás y de tu situación.',
      },
      {
        heading: 'El IVA y la exportación de servicios',
        body: 'Acá está la mejor noticia para el freelance uruguayo: la exportación de servicios tributa IVA a tasa cero. Es decir, cuando facturás a un cliente del exterior, no le agregás el IVA de la tasa básica (hoy 22%, confirmá el valor vigente ante la DGI); tu factura de exportación sale sin ese recargo. Además, esa tasa cero no es lo mismo que estar exento: al estar gravado a tasa cero, si liquidás IVA por el régimen general podés recuperar el IVA de tus compras vinculadas a la actividad, siempre que tengas las facturas a nombre de tu empresa. Ojo: en el régimen de pequeña empresa (Literal E) pagás un IVA mínimo fijo y no recuperás ese IVA. Por eso, si estás en el régimen general, conviene pedir factura cada vez que comprás algo para trabajar. Que una prestación califique como exportación de servicios tiene requisitos, así que vale confirmarlo para tu caso concreto.',
      },
      {
        heading: 'El impuesto a la renta: IRAE',
        body: 'Como empresa, la renta de tu actividad tributa IRAE, el impuesto a la renta empresarial, y no IRPF de trabajo dependiente. El IRAE grava la ganancia neta, es decir, ingresos menos gastos admitidos. Existe la posibilidad, para empresas chicas, de liquidar por un régimen ficto que estima la renta como un porcentaje de la facturación, lo que simplifica las cuentas frente a llevar contabilidad completa. Las pequeñas empresas comprendidas como Literal E están directamente exoneradas de IRAE y pagan solo el IVA mínimo. Cuál te conviene depende de tu nivel de gastos reales: con muchos gastos deducibles a veces conviene el régimen real, y con pocos, el ficto. Un contador es clave para elegir bien desde el arranque.',
      },
      {
        heading: 'Los aportes al BPS',
        body: 'Formalizarte implica aportar al BPS como titular de empresa, y esto tiene una cara buena y una a tener en cuenta. La buena: generás historia laboral, jubilación y podés acceder a cobertura de salud. La otra: los aportes patronales y personales de un titular de unipersonal muchas veces se calculan sobre bases fictas y son un costo fijo mensual que existe aunque un mes factures poco. Por eso conviene proyectar ese costo antes de dejar un empleo en relación de dependencia. Si venís de un trabajo dependiente y sumás la actividad por tu cuenta, hay que ver cómo se combinan los aportes. El BPS es la fuente para conocer las bases y montos vigentes.',
      },
      {
        heading: 'Dónde asesorarte y una aclaración',
        body: 'Esta es una guía general con fines informativos y no reemplaza el asesoramiento de un contador, que en este tema es prácticamente indispensable. La exportación de servicios tiene particularidades reales: facturas de exportación, recuperación del IVA de compras, tipos de cambio para las declaraciones y la elección del régimen de IRAE, que un freelance promedio no maneja y donde un error puede costar caro. La DGI regula la facturación y los impuestos, y el BPS los aportes; ambas son las fuentes oficiales y conviene verificar en ellas los valores y requisitos vigentes. Para orientarte sobre qué figura te conviene abrir según cuánto facturás, podés revisar la guía de qué empresa abrir del sitio antes de sentarte con tu contador.',
      },
    ],
    related: [
      { label: 'Qué empresa abrir', to: '/que-empresa-abrir-uruguay' },
      { label: 'Cómo funciona el IRPF', to: '/guias/como-funciona-el-irpf-uruguay' },
      { label: 'Cómo empezar a invertir', to: '/guias/como-empezar-a-invertir-uruguay' },
    ],
    steps: [
      {
        name: 'Definí el régimen que te conviene',
        text: 'Estimá cuánto vas a facturar por mes y con un contador elegí entre pequeña empresa (Literal E), unipersonal por el régimen común o, si el volumen lo justifica, una SRL.',
      },
      {
        name: 'Abrí la empresa ante DGI y BPS',
        text: 'Inscribí la empresa unipersonal, obtené tu RUT y quedá registrado como aportante en el BPS. Esto te habilita a facturar legalmente.',
      },
      {
        name: 'Habilitá la facturación de exportación',
        text: 'Sumate al régimen de facturación electrónica y adoptá los comprobantes de e-factura de exportación, que salen con IVA a tasa cero para el cliente del exterior.',
      },
      {
        name: 'Guardá las facturas de tus compras',
        text: 'Pedí factura a nombre de tu empresa por todo gasto de la actividad: en el régimen general, al exportar a tasa cero podés recuperar ese IVA y deducir gastos en el IRAE (en Literal E, en cambio, pagás IVA mínimo y no corresponde ese recupero).',
      },
      {
        name: 'Cumplí las obligaciones periódicas',
        text: 'Pagá los aportes mensuales al BPS y presentá las declaraciones de impuestos en fecha. Apoyate en un contador para las liquidaciones y los tipos de cambio.',
      },
    ],
  },
  {
    slug: 'como-empezar-a-invertir-uruguay',
    title: 'Cómo empezar a invertir en Uruguay desde cero',
    description:
      'Guía para empezar a invertir en Uruguay desde cero: primero saldar deudas caras y armar el fondo de emergencia, después elegir instrumentos según tu horizonte y riesgo.',
    tag: 'INVERSIÓN',
    updatedAt: '2026-07-18',
    sections: [
      {
        heading: 'Antes de invertir: ordená lo urgente',
        body: 'Invertir no es el primer paso, es uno de los últimos. Si tenés deuda cara (saldo de tarjeta, un préstamo al consumo con TEA alta o estás en el Clearing), ningún instrumento seguro te va a rendir más que lo que te cuesta esa deuda. Cancelar una tarjeta que cobra tasas muy por encima de la inflación es la mejor inversión disponible, sin riesgo. Recién cuando no tenés deudas caras y armaste un colchón líquido tiene sentido pensar en poner plata a trabajar. Ahorrar y invertir son cosas distintas: primero se ahorra con constancia, después se decide dónde poner ese ahorro.',
      },
      {
        heading: 'Definí tu horizonte y tu tolerancia al riesgo',
        body: 'La pregunta clave no es cuánto rinde algo, sino cuándo vas a necesitar esa plata. Si la vas a usar en menos de dos o tres años, la prioridad es no perder capital: plazo fijo, fondos conservadores o deuda de corto plazo. Si es plata a diez o veinte años, podés tolerar altibajos a cambio de un rendimiento esperado mayor. El riesgo no es abstracto: es la probabilidad real de ver tu inversión valer menos justo cuando la necesitás. Sé honesto con vos mismo sobre cuánto podés aguantar una caída sin vender por pánico, que es el error más caro.',
      },
      {
        heading: 'Instrumentos accesibles en Uruguay',
        body: 'Desde lo más conservador a lo más volátil: el plazo fijo bancario (en pesos, en UI o en dólares), con garantía de la COPAB hasta ciertos topes que varían según la moneda y conviene confirmar en la propia COPAB; los bonos y letras del Estado uruguayo (renta fija); los fondos de inversión que ofrecen bancos y administradoras locales, que diversifican por vos; y las acciones y ETFs del exterior, a las que se accede por brokers locales o internacionales. Cada escalón suma rendimiento esperado y también riesgo. No hace falta empezar por lo más complejo: un plazo fijo en UI o un fondo conservador son puntos de partida razonables.',
      },
      {
        heading: 'Diversificar y automatizar',
        body: 'No pongas todo en un solo instrumento ni en una sola moneda. Uruguay es una economía bimonetaria: repartir entre pesos, UI y dólares te protege de que una sola variable te arruine el año. Diversificar no maximiza la ganancia, reduce la probabilidad de un golpe grande. Lo que más rinde a largo plazo no es acertar el momento perfecto, sino la constancia: apartar un monto fijo todos los meses, aunque sea chico, y no tocarlo. Automatizá el ahorro apenas cobrás, antes de gastar, para que invertir sea un hábito y no una decisión que se pospone.',
      },
      {
        heading: 'Educación antes que especulación',
        body: 'Si no entendés cómo gana plata un instrumento, no lo compres. La mayoría de las pérdidas grandes de principiantes no vienen de mala suerte sino de meterse en algo que no comprendían, atraídos por una promesa de rendimiento alto. Desconfiá de cualquiera que te garantice ganancias fijas y elevadas: en finanzas, un rendimiento esperado más alto casi siempre viene de la mano de más riesgo, y no existe la ganancia grande, garantizada y sin riesgo. Empezá simple, leé, entendé los costos y las comisiones, y crecé en complejidad a medida que aprendés. La paciencia y el conocimiento rinden más que cualquier atajo.',
      },
      {
        heading: 'Esto es información general',
        body: 'Esta guía es educativa y no constituye asesoramiento financiero personalizado. Tu situación concreta (ingresos, deudas, cargas de familia, objetivos) define qué te conviene. Para decisiones importantes conviene consultar con un asesor financiero, un contador o directamente con tu banco, y verificar en el Banco Central del Uruguay (BCU) que cualquier intermediario esté autorizado. La información de rendimientos y garantías cambia, así que confirmá los datos vigentes en las fuentes oficiales antes de comprometer tu dinero.',
      },
    ],
    related: [
      { label: 'Dónde invertir en Uruguay', to: '/inversiones-uruguay' },
      { label: 'Fondo de emergencia', to: '/guias/fondo-de-emergencia-como-armarlo-uruguay' },
      { label: 'Interés compuesto', to: '/guias/interes-compuesto-explicado-uruguay' },
    ],
    steps: [
      {
        name: 'Saldá la deuda cara',
        text: 'Antes de invertir un peso, cancelá saldos de tarjeta y préstamos con tasas altas: ningún instrumento seguro le gana a esa deuda.',
      },
      {
        name: 'Armá el fondo de emergencia',
        text: 'Juntá entre tres y seis meses de tus gastos en algo líquido y seguro. Es tu red antes de asumir cualquier riesgo.',
      },
      {
        name: 'Definí horizonte y riesgo',
        text: 'Decidí cuándo vas a necesitar la plata y cuánta caída podés tolerar sin vender por miedo.',
      },
      {
        name: 'Elegí instrumentos simples',
        text: 'Empezá por plazo fijo en UI, fondos conservadores o deuda del Estado. Sumá complejidad recién cuando entiendas.',
      },
      {
        name: 'Automatizá y diversificá',
        text: 'Apartá un monto fijo cada mes apenas cobrás, repartido entre monedas e instrumentos. La constancia le gana al timing.',
      },
    ],
  },
  {
    slug: 'fondo-de-emergencia-como-armarlo-uruguay',
    title: 'Fondo de emergencia: cómo armarlo en Uruguay',
    description:
      'Cómo armar tu fondo de emergencia en Uruguay: cuánto juntar, en qué moneda e instrumento guardarlo, cómo construirlo sin ingresos altos y cuándo usarlo.',
    tag: 'AHORRO',
    updatedAt: '2026-07-18',
    sections: [
      {
        heading: 'Qué es y por qué es lo primero',
        body: 'El fondo de emergencia es plata reservada para imprevistos reales: perder el trabajo, un gasto de salud que la mutualista no cubre, arreglar la heladera o el auto. No es para vacaciones ni para una oportunidad de inversión. Su función es que un golpe inesperado no te obligue a endeudarte con tarjeta ni a vender inversiones en mal momento. Por eso se arma antes de invertir: es la base que te permite tomar riesgo con el resto sin miedo. Sin este colchón, cualquier plan de inversión es frágil, porque el primer imprevisto lo desarma.',
      },
      {
        heading: 'Cuánto juntar',
        body: 'La regla habitual es entre tres y seis meses de tus gastos fijos, no de tus ingresos. Contá lo que gastás realmente por mes: alquiler o cuota, comida, UTE, OSE, Antel, transporte, mutualista, cuotas escolares. Si tenés trabajo estable en relación de dependencia, tres meses puede alcanzar. Si sos monotributista, freelance o tenés ingresos variables, apuntá a seis o más, porque tu piso de ingresos es menos predecible. No busques el número perfecto: es mejor tener dos meses guardados hoy que seguir esperando a poder juntar seis de una.',
      },
      {
        heading: 'Dónde guardarlo: líquido y seguro',
        body: 'El fondo de emergencia prioriza disponibilidad y seguridad, no rendimiento. Tiene que estar donde puedas sacarlo en horas o pocos días, sin riesgo de que valga menos justo cuando lo necesitás. Sirven una caja de ahorro, un plazo fijo corto y renovable, o un fondo de inversión muy conservador de rescate rápido. Tené en cuenta que los depósitos bancarios, como la caja de ahorro y el plazo fijo, cuentan con la garantía de COPAB dentro de ciertos límites por persona y por institución, mientras que un fondo de inversión no tiene esa cobertura; verificá los montos cubiertos vigentes en COPAB. No lo pongas en acciones, cripto ni nada volátil: una emergencia suele coincidir con momentos malos del mercado, y ahí no querés estar forzado a vender en pérdida.',
      },
      {
        heading: 'En qué moneda',
        body: 'Depende de en qué moneda gastás. Si tus gastos son en pesos, tener el fondo en pesos evita el riesgo de que el dólar se mueva en contra justo cuando necesitás la plata. Muchos optan por repartir: una parte en pesos para lo inmediato y otra en dólares o UI como reserva de valor de más largo plazo. La UI ajusta por inflación, así que protege el poder de compra sin la volatilidad del dólar. Lo importante es no jugar a adivinar la cotización con tu red de seguridad: el fondo de emergencia no es el lugar para especular.',
      },
      {
        heading: 'Cómo construirlo sin ingresos altos',
        body: 'No hace falta un sueldo grande, hace falta constancia. Apartá un monto fijo apenas cobrás, antes de gastar, aunque sea chico: lo que no ves, no lo gastás. Sumá los extras que aparecen, como el aguinaldo (el sueldo anual complementario que se cobra en dos partes, alrededor de junio y diciembre) o una devolución de IRPF, en vez de gastarlos enteros. Revisá tu presupuesto para encontrar fugas: suscripciones que no usás, comisiones bancarias evitables. El fondo se arma de a poco; lo que importa es empezar y no frenar, no la velocidad.',
      },
      {
        heading: 'Cuándo usarlo y cómo reponerlo',
        body: 'Usalo solo para lo que es: una emergencia genuina e imprevista, no un gasto que podías planificar. Si tenés que echar mano, no te sientas mal: para eso estaba, y evitaste endeudarte. La regla es reponerlo apenas puedas, volviendo a apartar hasta llegar de nuevo al objetivo, antes de retomar otras inversiones. Recordá que esto es información general y no asesoramiento financiero: tu situación personal define el tamaño y la forma ideal de tu fondo. Ante dudas serias sobre tu economía, conviene hablar con un asesor o contador.',
      },
    ],
    related: [
      { label: 'Armar un presupuesto', to: '/guias/armar-un-presupuesto-personal-uruguay' },
      { label: 'Costo de vida', to: '/herramientas/costo-de-vida' },
      { label: '¿Conviene un plazo fijo?', to: '/guias/plazo-fijo-en-uruguay-conviene' },
    ],
    steps: [
      {
        name: 'Calculá tus gastos mensuales',
        text: 'Sumá tus gastos fijos reales de un mes: vivienda, comida, servicios, transporte, mutualista, cuotas.',
      },
      {
        name: 'Fijá la meta',
        text: 'Multiplicá por tres si tu ingreso es estable, por seis o más si es variable. Ese es tu objetivo.',
      },
      {
        name: 'Elegí dónde guardarlo',
        text: 'Caja de ahorro, plazo fijo corto o fondo conservador. Líquido y seguro, nunca volátil.',
      },
      {
        name: 'Automatizá el aporte',
        text: 'Apartá un monto fijo apenas cobrás, antes de gastar. Sumá aguinaldos y extras.',
      },
      {
        name: 'Reponelo tras usarlo',
        text: 'Si echaste mano, volvé a completarlo antes de retomar otras inversiones.',
      },
    ],
  },
  {
    slug: 'plazo-fijo-en-uruguay-conviene',
    title: '¿Conviene un plazo fijo en Uruguay?',
    description:
      'Plazo fijo en Uruguay: cómo funciona, pesos vs UI vs dólares, tasa real frente a la inflación, impuestos, garantía de COPAB y liquidez para decidir si te conviene.',
    tag: 'PLAZO FIJO',
    updatedAt: '2026-07-18',
    sections: [
      {
        heading: 'Cómo funciona un plazo fijo',
        body: 'Un plazo fijo es un depósito en el que le prestás plata al banco por un plazo pactado a cambio de una tasa de interés conocida de antemano. Al vencimiento recuperás el capital más los intereses. Es de los instrumentos más simples y previsibles: sabés cuánto vas a cobrar y cuándo. A cambio de esa certeza, el rendimiento suele ser modesto y la plata queda inmovilizada hasta el vencimiento; retirarla antes puede implicar perder intereses o no estar permitido. Es una herramienta de conservación de capital, no de crecimiento agresivo.',
      },
      {
        heading: 'Pesos vs UI vs dólares',
        body: 'En pesos, la tasa nominal suele ser la más alta, pero tenés que descontarle la inflación para saber lo que ganás de verdad. En UI (unidad indexada, que ajusta por inflación), el capital acompaña la suba de precios y encima te pagan una tasa por encima: protege tu poder de compra. En dólares, las tasas son bajas y ganás si el dólar sube frente al peso, pero perdés poder de compra si tus gastos son en pesos y el dólar queda quieto. No hay una opción siempre ganadora: depende de en qué moneda vas a gastar esa plata.',
      },
      {
        heading: 'Tasa real frente a la inflación',
        body: 'El error más común es mirar la tasa nominal y creer que eso es lo que ganás. Lo que importa es la tasa real: la nominal menos la inflación del período. Si un plazo fijo en pesos paga una tasa nominal pero la inflación se la come casi entera, tu ganancia real es mínima o incluso negativa en poder de compra. Por eso la UI es interesante para el ahorrista conservador uruguayo: al indexarse a la inflación, te ayuda a no perder poder adquisitivo, y la tasa que paga encima es tu ganancia real. Tené presente que los intereses de un plazo fijo suelen estar gravados por IRPF (rentas del capital), que el banco te retiene, así que tu rendimiento neto es algo menor a la tasa publicada; confirmá la retención vigente con tu banco o en DGI. Compará siempre contra la inflación, no en el vacío.',
      },
      {
        heading: 'La garantía de COPAB',
        body: 'Los depósitos en bancos uruguayos cuentan con el respaldo del Fondo de Garantía de Depósitos que administra COPAB. La cobertura es por persona y por institución, y tiene topes: según COPAB, actualmente alcanza hasta el equivalente a UI 250.000 para depósitos en moneda nacional y hasta USD 10.000 para depósitos en moneda extranjera, incluyendo capital e intereses. No pagás prima por esta garantía. Si tu depósito supera esos límites, conviene repartirlo entre instituciones. Verificá los montos vigentes directamente en COPAB, ya que pueden actualizarse.',
      },
      {
        heading: 'Liquidez: la contracara',
        body: 'El plazo fijo inmoviliza tu plata hasta el vencimiento. Esa es su principal desventaja frente a una caja de ahorro. Por eso no es el mejor lugar para todo tu fondo de emergencia si necesitás disponibilidad inmediata, aunque un plazo fijo corto y renovable puede servir para una parte. Una estrategia común es escalonar vencimientos: dividir el monto en varios plazos fijos que vencen en fechas distintas, para tener liquidez periódica sin romper todo de golpe. Elegí el plazo según cuándo creés que vas a necesitar esa plata, no según la tasa más alta.',
      },
      {
        heading: '¿Entonces conviene?',
        body: 'El plazo fijo conviene como pieza conservadora de una cartera: para preservar capital, para plata que vas a usar en el corto plazo o para quien no tolera volatilidad. No es un instrumento para hacer crecer el patrimonio a largo plazo, porque su rendimiento real suele ser bajo. Para plazos largos, otros instrumentos suelen rendir más. Esto es información general y no asesoramiento: compará tasas entre bancos, mirá la tasa real contra la inflación, tené presente los impuestos y confirmá condiciones y garantías vigentes en fuentes oficiales (BCU, COPAB, DGI) o con un profesional antes de decidir. Podés usar un conversor de UI y una calculadora de plazo fijo para simular tu caso.',
      },
    ],
    related: [
      { label: 'Calculadora de plazo fijo', to: '/herramientas/calculadora-plazo-fijo' },
      { label: 'Conversor de Unidad Indexada', to: '/herramientas/conversor-unidad-indexada' },
      { label: 'Bonos y renta fija', to: '/guias/bonos-y-renta-fija-uruguay' },
    ],
  },
  {
    slug: 'invertir-en-la-bolsa-de-usa-desde-uruguay',
    title: 'Cómo invertir en la bolsa de USA desde Uruguay',
    description:
      'Cómo invertir en la bolsa de Estados Unidos desde Uruguay: brokers locales e internacionales, ETFs vs acciones, costos y la tributación de IRPF sobre rentas del exterior.',
    tag: 'BOLSA',
    updatedAt: '2026-07-18',
    sections: [
      {
        heading: 'Cómo acceder desde Uruguay',
        body: 'Hay dos caminos. Uno es a través de corredores de bolsa y bancos locales, que operan mercados del exterior por vos: la ventaja es soporte en español, respaldo local y que el intermediario esté regulado por el BCU; la desventaja suele ser mínimos más altos y comisiones mayores. El otro es abrir una cuenta directamente en un broker internacional que acepte residentes uruguayos: mínimos bajos y costos reducidos, pero toda la gestión, el idioma y el papeleo quedan de tu lado. Cualquiera sea el camino, verificá la reputación y regulación del intermediario antes de transferir plata.',
      },
      {
        heading: 'ETFs vs acciones individuales',
        body: 'Comprar una acción es apostar a una sola empresa: si le va bien ganás, pero concentrás mucho riesgo en un solo nombre. Un ETF es un fondo que cotiza en bolsa y agrupa cientos o miles de empresas en una sola compra; por ejemplo, un ETF que replica un índice amplio te da un pedacito de todo el mercado de una vez. Para la mayoría de los que empiezan, un ETF diversificado de bajo costo es más sensato que elegir acciones sueltas, porque reduce el riesgo específico y no depende de que aciertes qué empresa va a ganar. Diversificación instantánea por poco costo.',
      },
      {
        heading: 'Costos y mínimos que hay que mirar',
        body: 'Los costos erosionan el rendimiento y muchos son fáciles de pasar por alto. Fijate en: la comisión por operación (comprar y vender), la comisión anual del ETF o fondo, los costos de transferir dinero desde y hacia Uruguay, el spread de cambio si convertís pesos a dólares, y los mínimos de apertura o de operación. Sumadas, estas comisiones pueden hacer la diferencia entre ganar y empatar, sobre todo con montos chicos. Compará estructuras de costos entre intermediarios antes de elegir, y evitá operar de más: cada compra y venta paga peaje.',
      },
      {
        heading: 'Impuestos en Uruguay: qué cambió en 2026',
        body: 'Desde el 1 de enero de 2026, por un cambio en la normativa vigente (la Ley de Presupuesto), se amplió lo que grava el IRPF sobre las rentas del exterior de los residentes fiscales. Ojo con una confusión frecuente: los rendimientos de capital del exterior (intereses y dividendos) ya venían tributando IRPF desde hace más de una década, no son la novedad. Lo que se agregó ahora es que también quedan gravados los incrementos patrimoniales, es decir la ganancia al vender acciones o ETFs en el exterior. La tasa general para estas rentas ronda el 12%, pero confirmá el valor y las condiciones vigentes en la DGI porque el régimen sigue reglamentándose. Si en el exterior ya te retuvieron un impuesto por esas rentas, en general podés acreditar lo pagado afuera contra el IRPF uruguayo, sin superar el impuesto que corresponde acá. La normativa también prevé, para inversiones custodiadas por intermediarios uruguayos, casos con una tasa reducida y regímenes opcionales. Es un tema en evolución.',
      },
      {
        heading: 'Declarar bien: no es opcional',
        body: 'Invertir afuera no te exime de declarar acá. Con el régimen actual, quien es residente fiscal uruguayo y obtiene rentas de capital del exterior debe considerarlas en su IRPF. Guardá los comprobantes de compra, venta, dividendos y de cualquier impuesto retenido en el exterior: los vas a necesitar para liquidar y para reclamar el crédito fiscal. Las reglas de fuente, tasas y créditos tienen matices que conviene revisar con un contador, sobre todo el primer año bajo el régimen nuevo. No declarar puede salir mucho más caro que el impuesto mismo.',
      },
      {
        heading: 'Esto es información general',
        body: 'Esta guía explica mecanismos, no reemplaza asesoramiento profesional. La tributación de inversiones del exterior es un área que se amplió en 2026 y sigue reglamentándose, con detalles que dependen de tu situación. Antes de invertir montos relevantes, consultá con un contador para tu caso concreto y confirmá las tasas y condiciones vigentes en la DGI. Para el intermediario, verificá su autorización en el BCU. Y recordá el principio básico: no compres nada que no entiendas, por más que la rentabilidad histórica parezca tentadora.',
      },
    ],
    related: [
      { label: 'Dónde invertir en Uruguay', to: '/inversiones-uruguay' },
      { label: 'Impuestos a las inversiones', to: '/impuestos-inversiones-uruguay' },
      { label: 'Cómo empezar a invertir', to: '/guias/como-empezar-a-invertir-uruguay' },
    ],
    steps: [
      {
        name: 'Elegí el intermediario',
        text: 'Corredor o banco local (más soporte y regulación BCU) o broker internacional (menos costos). Verificá su reputación y su autorización.',
      },
      {
        name: 'Abrí y fondeá la cuenta',
        text: 'Completá el alta, convertí pesos a dólares mirando el spread y transferí. Anotá cada costo.',
      },
      {
        name: 'Empezá con un ETF amplio',
        text: 'Un ETF diversificado de bajo costo da menos riesgo que acciones sueltas para quien recién arranca.',
      },
      {
        name: 'Guardá todos los comprobantes',
        text: 'Compras, ventas, dividendos e impuestos retenidos afuera: los necesitás para el IRPF y el crédito fiscal.',
      },
      {
        name: 'Liquidá el IRPF y consultá un contador',
        text: 'Desde 2026 los incrementos patrimoniales del exterior también tributan IRPF (tasa general en torno al 12%; confirmala en la DGI). Revisá tu situación con un profesional el primer año.',
      },
    ],
  },
  {
    slug: 'bonos-y-renta-fija-uruguay',
    title: 'Bonos y renta fija en Uruguay: guía básica',
    description:
      'Guía básica de bonos y renta fija en Uruguay: qué es, deuda soberana uruguaya, letras de regulación monetaria, riesgo y rendimiento, y en qué se diferencia del plazo fijo.',
    tag: 'RENTA FIJA',
    updatedAt: '2026-07-18',
    sections: [
      {
        heading: 'Qué es la renta fija',
        body: 'En la renta fija le prestás plata a un emisor (el Estado, una empresa o el Banco Central) y este se compromete a devolverte el capital en una fecha y a pagarte intereses en el camino. Se llama fija porque las condiciones (plazo, tasa o forma de cálculo) se conocen al emitir. No significa que no tenga riesgo: si el emisor no paga, perdés; y si vendés el bono antes del vencimiento, su precio puede haber subido o bajado. Pero comparada con las acciones, la renta fija es más previsible, y por eso es la columna conservadora de muchas carteras.',
      },
      {
        heading: 'La deuda soberana uruguaya',
        body: 'El Estado uruguayo se financia emitiendo bonos y notas del Tesoro, en pesos, en UI y en dólares. Al comprarlos, le prestás al país y cobrás intereses periódicos. Uruguay tiene calificación de grado inversor, lo que refleja una percepción de riesgo relativamente baja en la región, aunque ningún soberano está exento de riesgo. Los títulos en UI son atractivos para el ahorrista local porque ajustan por inflación y suman una tasa real. Los plazos van de cortos a muy largos: elegí según cuándo necesitás la plata, porque vender antes te expone a las variaciones de precio del mercado.',
      },
      {
        heading: 'Las Letras de Regulación Monetaria',
        body: 'Las Letras de Regulación Monetaria (LRM) las emite el Banco Central del Uruguay como herramienta de política monetaria, y son deuda de corto plazo, principalmente en pesos aunque también las hay en unidades indexadas. Para el inversor funcionan como un instrumento conservador y líquido, con vencimientos relativamente cortos (desde unos pocos meses hasta un par de años) y bajo riesgo de crédito por ser del BCU. Suelen usarse para estacionar pesos por períodos cortos obteniendo una tasa. No siempre es fácil para un pequeño ahorrista comprarlas directamente; muchas veces se accede a este tipo de deuda a través de fondos de inversión que las incluyen en su cartera.',
      },
      {
        heading: 'Riesgo y rendimiento',
        body: 'En renta fija hay tres riesgos principales. El de crédito: que el emisor no pague (bajísimo en un soberano con grado inversor, mayor en bonos de empresas). El de tasa: si las tasas de mercado suben, el precio de tu bono baja, y eso te afecta si vendés antes del vencimiento. Y el de moneda: un bono en dólares te expone al tipo de cambio si tus gastos son en pesos. En general, más rendimiento ofrecido implica más riesgo asumido; un bono que paga mucho más que la deuda soberana está compensando un riesgo mayor. No hay rendimiento alto sin contraparte.',
      },
      {
        heading: 'En qué se diferencia del plazo fijo',
        body: 'Ambos son conservadores, pero no iguales. El plazo fijo es un contrato con tu banco o cooperativa de intermediación financiera, con garantía de COPAB dentro de límites, y si esperás al vencimiento cobrás lo pactado sin sorpresas; su desventaja es la baja liquidez y que romperlo antes cuesta. El bono cotiza en el mercado: podés venderlo antes del vencimiento, pero a precio de mercado, que fluctúa. El bono ofrece más variedad de plazos, monedas y emisores, y potencialmente más rendimiento, a cambio de esa variación de precio y de que no tiene la garantía de depósitos. Se complementan bien dentro de una cartera.',
      },
      {
        heading: 'Cómo se accede y advertencia final',
        body: 'Se accede a la renta fija a través de corredores de bolsa y bancos autorizados, o de forma diversificada mediante fondos de inversión de renta fija, que compran muchos títulos por vos y bajan el mínimo de entrada. Verificá siempre que el intermediario esté autorizado por el BCU. Esta guía es información general con fines educativos, no asesoramiento de inversión ni legal ni tributario: los rendimientos, calificaciones, condiciones y tratamientos impositivos cambian, y tu decisión debe considerar tu situación y horizonte. Para montos importantes, consultá con un asesor financiero o un corredor de bolsa autorizado y confirmá los datos vigentes en fuentes oficiales como el BCU.',
      },
    ],
    related: [
      { label: 'Dónde invertir en Uruguay', to: '/inversiones-uruguay' },
      { label: '¿Conviene un plazo fijo?', to: '/guias/plazo-fijo-en-uruguay-conviene' },
      {
        label: 'Invertir en la bolsa de USA',
        to: '/guias/invertir-en-la-bolsa-de-usa-desde-uruguay',
      },
    ],
  },
  {
    slug: 'conviene-ahorrar-en-dolares-uruguay',
    title: '¿Conviene ahorrar en dólares en Uruguay?',
    description:
      '¿Conviene ahorrar en dólares en Uruguay? Economía bimonetaria, cuándo tiene sentido dolarizar, el riesgo de mirar solo el dólar, diversificar y dónde comprar mejor.',
    tag: 'DÓLARES',
    updatedAt: '2026-07-18',
    sections: [
      {
        heading: 'Uruguay es bimonetario',
        body: 'En Uruguay conviven el peso y el dólar en la vida cotidiana: los sueldos y los gastos diarios suelen ser en pesos, pero los inmuebles, los autos y muchos ahorros se piensan en dólares. Esta convivencia es cultural e histórica, marcada por episodios de inflación y crisis que erosionaron la confianza en la moneda local. Entender esto es clave: no se trata de elegir una moneda para siempre, sino de saber en qué moneda tenés tus ingresos, tus gastos y tus metas, y equilibrar en consecuencia. Ahorrar solo en dólares por costumbre, sin pensarlo, puede ser tan riesgoso como no dolarizar nada.',
      },
      {
        heading: 'Cuándo tiene sentido dolarizar',
        body: 'Tiene lógica ahorrar en dólares cuando tu objetivo está en dólares: comprar un inmueble, un auto, viajar al exterior o financiar estudios afuera. En esos casos, mantener el ahorro en la misma moneda de la meta elimina el riesgo de que el tipo de cambio te corra el objetivo. También sirve como reserva de valor de largo plazo para quien quiere reducir su exposición a la inflación en pesos. En cambio, si vas a gastar esa plata en pesos y en el corto plazo, dolarizar te agrega un riesgo de cambio que puede jugar en contra.',
      },
      {
        heading: 'El riesgo de mirar solo el dólar',
        body: 'Muchos uruguayos miran únicamente la cotización del dólar y creen que si sube, ganaron. Pero lo que importa es tu poder de compra. El dólar puede subir menos que la inflación, o quedarse quieto mientras los precios en pesos suben: ahí, tener todo en dólares te hizo perder poder adquisitivo en términos reales. Además, los dólares billete bajo el colchón no rinden nada y pierden valor por la inflación estadounidense. Fijarse solo en el número del tipo de cambio, sin pensar en qué vas a comprar con esa plata, es una de las trampas mentales más comunes del ahorrista local.',
      },
      {
        heading: 'Diversificar entre monedas',
        body: 'La respuesta rara vez es todo en dólares o todo en pesos, sino repartir. Una cartera sensata para muchos uruguayos combina pesos para los gastos y metas de corto plazo en moneda local, UI para preservar el poder de compra en pesos a mediano y largo plazo, y dólares para objetivos en esa moneda y como reserva. La UI merece atención especial: al ajustar por inflación, protege tu poder de compra en pesos sin exponerte a la volatilidad del tipo de cambio. Diversificar monedas no busca adivinar cuál va a rendir más, sino evitar que un solo movimiento (una devaluación o una inflación alta) te golpee de lleno.',
      },
      {
        heading: 'Dónde comprar los dólares',
        body: 'Si decidís dolarizar, el precio importa: la brecha entre lo que pagás al comprar y lo que recibirías al vender (el spread) varía bastante entre casas de cambio y bancos. Comparar cotizaciones antes de operar puede ahorrarte una diferencia real, sobre todo en montos grandes. Fijate en la cotización de venta (a la que el cambio te vende dólares) y desconfiá de diferencias enormes o de operaciones informales, que suman riesgo de seguridad y de billetes falsos. Comparar entre varias casas de cambio y bancos autorizados, en lugar de ir siempre a la primera, es un hábito que rinde.',
      },
      {
        heading: 'Y una vez que tenés los dólares',
        body: 'Dólares quietos en una caja de seguridad o bajo el colchón pierden valor por la inflación de Estados Unidos. Si vas a mantener ahorros en dólares por un tiempo, considerá que rindan algo: un plazo fijo en dólares (con garantía de COPAB hasta el límite vigente para depósitos en moneda extranjera, que conviene verificar en COPAB) o instrumentos conservadores en esa moneda. Recordá que esto es información general y no asesoramiento: cuánto dolarizar depende de tus ingresos, gastos y metas. Para decisiones grandes conviene un asesor financiero, y para operar, elegí siempre casas de cambio y bancos autorizados por el BCU. Podés comparar cotizaciones antes de comprar.',
      },
    ],
    related: [
      { label: 'Casas de cambio', to: '/casas-de-cambio' },
      { label: 'Comparar cotizaciones', to: '/comparar' },
      { label: '¿Conviene un plazo fijo?', to: '/guias/plazo-fijo-en-uruguay-conviene' },
    ],
  },
  {
    slug: 'interes-compuesto-explicado-uruguay',
    title: 'Interés compuesto: el concepto que cambia tus finanzas',
    description:
      'Interés compuesto explicado con ejemplos uruguayos: por qué el tiempo importa más que el monto, cómo juega a favor en el ahorro y en contra en la tarjeta, y la regla del 72.',
    tag: 'CONCEPTO',
    updatedAt: '2026-07-18',
    sections: [
      {
        heading: 'Qué es el interés compuesto',
        body: 'El interés simple gana siempre sobre el capital inicial. El interés compuesto gana también sobre los intereses ya acumulados: los intereses generan intereses. La diferencia parece menor al principio, pero con el tiempo se vuelve enorme, porque el crecimiento se acelera solo. Es la lógica de una bola de nieve que rueda cuesta abajo: cuanto más rueda, más nieve junta, y más rápido crece. Este mecanismo es el motor silencioso de casi todo en finanzas, tanto de la riqueza que se construye ahorrando como de las deudas que se descontrolan. Entenderlo cambia cómo mirás tu plata.',
      },
      {
        heading: 'Por qué el tiempo importa más que el monto',
        body: 'La variable más poderosa del interés compuesto no es cuánta plata ponés, sino cuánto tiempo la dejás crecer. Los años finales de un período largo generan mucho más que los primeros, porque la base sobre la que se calcula ya es grande. Por eso quien empieza a ahorrar joven con montos chicos suele terminar mejor que quien empieza tarde con montos mayores: el tiempo hace el trabajo pesado. La conclusión práctica es contundente: el mejor momento para empezar a ahorrar e invertir fue hace años, y el segundo mejor momento es hoy. Postergar cuesta más de lo que parece.',
      },
      {
        heading: 'Un ejemplo para verlo',
        body: 'Imaginá que apartás un monto fijo por mes y lo invertís a una tasa real razonable. En los primeros años, tu saldo se parece bastante a la suma de lo que aportaste: el interés todavía es chico. Pero a medida que pasan los años, una porción cada vez mayor de tu saldo proviene de intereses sobre intereses, no de nuevos aportes. En horizontes largos, buena parte del resultado final puede venir del crecimiento compuesto y no de lo que pusiste de tu bolsillo. Lo importante no es el número exacto, que depende de la tasa, sino entender la forma: la curva se empina con el tiempo.',
      },
      {
        heading: 'A favor: el ahorro',
        body: 'Cuando ahorrás e invertís, el interés compuesto trabaja para vos. Cada peso que aportás y no tocás sigue generando rendimiento año tras año, y esos rendimientos se suman al capital y generan más. Reinvertir en lugar de retirar las ganancias es lo que enciende el efecto: si sacás los intereses cada año, volvés al interés simple y perdés el motor. Por eso la constancia y la paciencia rinden tanto: aportar de forma sostenida y dejar que el tiempo actúe suele superar a cualquier intento de acertar el momento perfecto del mercado. El compuesto premia a quien no interrumpe el proceso.',
      },
      {
        heading: 'En contra: la deuda de tarjeta',
        body: 'El mismo mecanismo que te enriquece ahorrando te empobrece si debés. En una tarjeta de crédito o un préstamo caro, los intereses no pagados se suman al saldo y empiezan a generar más intereses: la deuda crece sobre sí misma. Pagar solo el mínimo es la trampa clásica, porque casi todo se va en intereses y el capital casi no baja, alargando la deuda por años. Acá el interés compuesto es tu enemigo. Por eso cancelar deuda cara rinde tanto: es como obtener, garantizado, el rendimiento de esa tasa. Frenar el compuesto en tu contra suele ser más urgente que activarlo a tu favor.',
      },
      {
        heading: 'La regla del 72',
        body: 'La regla del 72 es un atajo mental para estimar en cuánto tiempo se duplica una inversión con interés compuesto: dividí 72 entre la tasa anual. A una tasa del 6% anual, tu plata tarda aproximadamente 72 dividido 6, unos 12 años, en duplicarse. A una tasa del 9%, cerca de 8 años. Sirve igual para la deuda: a una tasa alta de tarjeta, tu deuda se puede duplicar en pocos años si no la pagás. No es exacta, pero es una brújula rápida y potente. Esto es información general y educativa; para decisiones concretas, considerá tu situación y consultá fuentes o asesores confiables.',
      },
    ],
    related: [
      { label: 'Cómo empezar a invertir', to: '/guias/como-empezar-a-invertir-uruguay' },
      { label: 'Calculadora de plazo fijo', to: '/herramientas/calculadora-plazo-fijo' },
      { label: 'Planificar tu retiro', to: '/guias/planificar-tu-retiro-uruguay' },
    ],
  },
  {
    slug: 'errores-y-estafas-al-invertir-uruguay',
    title: 'Errores comunes y estafas al invertir en Uruguay',
    description:
      'Errores comunes y estafas al invertir en Uruguay: rendimiento garantizado, esquemas Ponzi, cripto fraudulento, brokers no regulados y cómo verificar en el BCU.',
    tag: 'ESTAFAS',
    updatedAt: '2026-07-18',
    sections: [
      {
        heading: 'La promesa de rendimiento garantizado',
        body: 'La regla más útil para no caer: en finanzas, rendimiento alto y garantizado no existe. Todo rendimiento por encima de lo que paga la deuda más segura implica asumir riesgo, sin excepción. Cuando alguien te ofrece ganancias fijas, altas y sin riesgo, no descubrió un secreto: te está por estafar o no entiende lo que vende. Cuanto más redonda, urgente y libre de riesgo suene la promesa, más desconfiá. Los estafadores explotan el deseo de ganar mucho rápido y la presión de no quedarse afuera. La primera defensa es interna: si suena demasiado bueno para ser verdad, lo es.',
      },
      {
        heading: 'Esquemas Ponzi y pirámides',
        body: 'Un esquema Ponzi paga a los inversores viejos con la plata de los nuevos, no con ganancias reales. Mientras entra gente, parece funcionar y hasta paga puntualmente, lo que genera confianza y atrae a más; cuando el flujo de nuevos se frena, todo colapsa y la mayoría pierde. Las pirámides son parecidas: ganás sobre todo reclutando gente, no vendiendo algo real. Señales de alarma: rendimientos sospechosamente estables mes a mez, presión para que sumes conocidos, comisiones por traer nuevos, y explicaciones vagas sobre de dónde sale la ganancia. Si el negocio depende de que entre más gente, es insostenible por diseño.',
      },
      {
        heading: 'El cuento de la cripto fraudulenta',
        body: "La tecnología cripto puede ser legítima, pero es el terreno preferido de los estafadores porque es difícil de revertir y suena sofisticada. Estafas comunes: falsos exchanges o apps que te dejan 'ver' ganancias pero no retirar, 'asesores' que te contactan por redes o apps de citas (el llamado 'pig butchering'), tokens inventados que se desploman apenas comprás, y falsas oportunidades de 'minería' o 'staking' con retornos imposibles. Desde 2024 Uruguay tiene una ley de activos virtuales (la 20.345) que obliga a los proveedores de esos servicios a registrarse ante el BCU, pero muchas plataformas internacionales operan sin registro local: fijate si están autorizadas acá y recordá que nadie serio te va a escribir por privado para hacerte rico. Si no entendés exactamente qué estás comprando y cómo se genera el valor, no inviertas.",
      },
      {
        heading: 'Brokers y plataformas no reguladas',
        body: 'Muchas estafas operan a través de plataformas de inversión que parecen profesionales, con web pulida y app propia, pero no están autorizadas para operar en Uruguay ni en ningún lado serio. Te dejan depositar fácil y hasta ver ganancias, pero cuando querés retirar aparecen trabas, comisiones sorpresa o el sitio directamente desaparece. Antes de poner un peso, verificá que el intermediario esté autorizado. Desconfiá de plataformas sin domicilio claro, sin regulación identificable, que solo aceptan transferencias a cuentas personales o cripto, y que presionan para que deposites más para poder retirar. Esa última es una señal casi infalible de fraude.',
      },
      {
        heading: 'Cómo verificar y no ser el próximo',
        body: 'El Banco Central del Uruguay (BCU) regula el sistema financiero y publica registros de entidades autorizadas y, a veces, advertencias sobre firmas no habilitadas. Antes de invertir, chequeá que la institución figure como autorizada por el BCU; si no aparece o no lo podés confirmar, tratala como riesgo. Buscá el nombre de la plataforma junto con palabras como estafa o fraude, mirá si tiene historia real, y desconfiá de reseñas todas perfectas y recientes. Nunca decidas apurado ni presionado: la urgencia es una herramienta del estafador. Un intermediario legítimo entiende que quieras verificar y tomarte tu tiempo.',
      },
      {
        heading: 'Si ya caíste y cierre',
        body: 'Si sospechás que fuiste víctima, actuá rápido: dejá de enviar más plata (los estafadores suelen pedir un pago extra para liberar el retiro, que nunca llega), reuní todas las pruebas (mensajes, comprobantes, direcciones de billeteras) y hacé la denuncia policial correspondiente. Podés informar el caso al BCU si involucra una entidad financiera. No sientas vergüenza: estas estafas están diseñadas por profesionales para engañar a gente inteligente. Esta guía es información general y educativa, no asesoramiento legal ni financiero; ante un caso concreto, consultá con un abogado y verificá cualquier inversión en las fuentes oficiales del BCU antes de comprometer tu dinero.',
      },
    ],
    related: [
      { label: 'Estafas en Uruguay', to: '/estafas-uruguay' },
      { label: 'Dónde invertir en Uruguay', to: '/inversiones-uruguay' },
      { label: 'Cómo empezar a invertir', to: '/guias/como-empezar-a-invertir-uruguay' },
    ],
    steps: [
      {
        name: 'Sospechá de lo garantizado',
        text: 'Rendimiento alto y sin riesgo no existe. Si suena demasiado bueno, es una estafa.',
      },
      {
        name: 'Verificá en el BCU',
        text: 'Confirmá que el intermediario esté autorizado por el Banco Central. Si no aparece, no inviertas. Recordá que el BCU nunca recomienda inversiones concretas.',
      },
      {
        name: 'Buscá la reputación',
        text: 'Googleá el nombre con las palabras estafa y fraude. Desconfiá de reseñas perfectas y de plataformas sin domicilio claro.',
      },
      {
        name: 'No te dejes apurar',
        text: 'La presión y la urgencia son herramientas del estafador. Un intermediario serio te deja verificar con calma.',
      },
      {
        name: 'Si caíste, frená y denunciá',
        text: 'No pagues el retiro que te piden, juntá pruebas, hacé la denuncia policial e informá al BCU.',
      },
    ],
  },
  {
    slug: 'armar-un-presupuesto-personal-uruguay',
    title: 'Cómo armar un presupuesto personal en Uruguay',
    description:
      'Guía práctica para armar un presupuesto personal en Uruguay: método 50/30/20 adaptado, registrar gastos y ajustar a los precios reales.',
    tag: 'PRESUPUESTO',
    updatedAt: '2026-07-18',
    sections: [
      {
        heading: 'Por qué un presupuesto ordena tu plata',
        body: 'Un presupuesto no es privarte de todo: es saber a dónde va tu dinero antes de que se te escape. La idea es sencilla. Anotás cuánto entra por mes (sueldo líquido, changas, alquileres) y cuánto sale, y comparás. Cuando el gasto le gana al ingreso, aparece la deuda cara: tarjeta, adelantos, clearing. Cuando sobra un poco todos los meses, aparece el ahorro. En Uruguay, donde los precios de supermercado, combustible y servicios se mueven seguido, tener el número claro te deja reaccionar rápido en vez de enterarte tarde cuando ya no llegás a fin de mes.',
      },
      {
        heading: 'El método 50/30/20 adaptado a la realidad de acá',
        body: 'Una regla conocida reparte el ingreso líquido en tres partes: alrededor de 50% para necesidades (alquiler, comida, UTE, OSE, transporte, mutualista), 30% para gustos (salidas, delivery, streaming) y 20% para ahorro y para bajar deudas. Es una guía, no una ley. Con los alquileres y la canasta de Montevideo, mucha gente arranca más cerca de 60/25/15 y está bien: lo importante es que las tres categorías existan y que el ahorro no sea siempre cero. Si estás endeudado, esa franja del 20% va primero a cancelar lo más caro antes que a invertir.',
      },
      {
        heading: 'Registrar los gastos: lo que no medís, no lo controlás',
        body: 'Durante uno o dos meses anotá todo, hasta el café y el ómnibus. No hace falta una app cara: sirve una planilla, una libreta o el resumen del débito, que hoy con la ley de inclusión financiera refleja casi todo tu consumo. Vas a descubrir los gastos hormiga (esos chicos y repetidos que sumados asustan) y las suscripciones que ni usás. Categorizá: vivienda, alimentación, transporte, salud, deudas, ocio. Con dos o tres meses de datos reales tu presupuesto deja de ser un deseo y pasa a basarse en cómo gastás de verdad.',
      },
      {
        heading: 'Ajustar a los precios uruguayos y a la inflación',
        body: 'Un presupuesto uruguayo tiene que convivir con la inflación y con gastos estacionales. En diciembre y junio entra el aguinaldo (aproximadamente medio sueldo cada vez, ya que es una porción de lo que ganaste en el semestre), pero también caen los gastos de fin de año, las vacaciones y, si tenés hijos, los útiles y la matrícula de marzo. Metelos como fondos que vas separando de a poco durante el año, no como sorpresas. Ojo también con lo que está en dólares o en unidades que se ajustan solas: la UI (unidad indexada) sigue la inflación medida por el IPC, mientras que la UR (unidad reajustable) sigue el Índice Medio de Salarios. Por eso un alquiler en UR o una cuota en UI se mueve con una base distinta a la de tu sueldo puntual, y conviene proyectarlo, no asumir que queda fijo.',
      },
      {
        heading: 'Herramientas para hacerlo sin complicarte',
        body: 'No necesitás software profesional. Una planilla con tres columnas (ingreso, gasto fijo, gasto variable) alcanza para empezar. En Cambio Uruguay tenés una calculadora de presupuesto y otra de costo de vida pensadas para acá, que te ayudan a estimar cuánto se te va según tu situación y ciudad, y a comparar con tu ingreso. La regla de oro es revisar el presupuesto una vez por mes, no armarlo una vez y olvidarlo. Cinco minutos mensuales para acomodar categorías valen más que la planilla más sofisticada abandonada en marzo. Esta guía es información general y no reemplaza el asesoramiento de un contador ni las fuentes oficiales: ante dudas concretas sobre aportes, impuestos, alquileres o deudas consultá con un profesional o en el organismo que corresponda (BPS, DGI o BCU).',
      },
    ],
    related: [
      { label: 'Costo de vida', to: '/herramientas/costo-de-vida' },
      { label: 'Fondo de emergencia', to: '/guias/fondo-de-emergencia-como-armarlo-uruguay' },
      { label: 'Salud financiera', to: '/salud-financiera' },
    ],
    steps: [
      {
        name: 'Calculá tu ingreso líquido real',
        text: 'Sumá lo que efectivamente entra por mes ya con los descuentos hechos (BPS, FONASA, IRPF). Usá el líquido que cobrás, no el nominal, y prorrateá el aguinaldo aparte.',
      },
      {
        name: 'Registrá un mes completo de gastos',
        text: 'Anotá cada salida, por chica que sea, y agrupala por categoría: vivienda, comida, transporte, salud, deudas y ocio.',
      },
      {
        name: 'Repartí según 50/30/20 y ajustá',
        text: 'Compará tus categorías reales con las metas de necesidades, gustos y ahorro, y corregí lo que esté desbalanceado empezando por las deudas caras.',
      },
      {
        name: 'Separá fondos para gastos estacionales',
        text: 'Guardá de a poco para marzo (útiles, matrículas), vacaciones y cualquier cuota en UI o en UR o en dólares que sabés que se ajusta.',
      },
      {
        name: 'Revisá el presupuesto cada mes',
        text: 'Dedicá cinco minutos mensuales a comparar lo planeado con lo real y a reacomodar. El presupuesto vivo funciona; el que se arma una vez, no.',
      },
    ],
  },
  {
    slug: 'que-seguros-conviene-tener-uruguay',
    title: 'Qué seguros conviene tener en Uruguay',
    description:
      'Qué seguros conviene tener en Uruguay y en qué orden: salud, vehículo, hogar y vida, según tu riesgo real y sin sobreasegurarte.',
    tag: 'SEGUROS',
    updatedAt: '2026-07-18',
    sections: [
      {
        heading: 'Primero priorizá por riesgo, no por miedo',
        body: 'Un seguro sirve para trasladar a otro un golpe que vos solo no podrías absorber. Por eso conviene ordenarlos por el tamaño del daño posible, no por la probabilidad. Lo que te fundiría (una enfermedad grave, un choque con lesionados, perder la vivienda) va primero; lo que podrías pagar de tu bolsillo (un celular, un electrodoméstico) casi nunca justifica una póliza. La pregunta útil no es si algo puede pasar, sino qué pasaría con tus finanzas si pasara. Con esa lógica, para la mayoría de las familias uruguayas el orden razonable es salud, después vehículo, después hogar y, si hay quien dependa de tu ingreso, vida.',
      },
      {
        heading: 'Salud: la mutualista y el FONASA',
        body: 'La cobertura de salud es la base. La mayoría accede a una mutualista o a ASSE a través del FONASA, el fondo al que aportás por planilla y que te habilita a elegir prestador. Si trabajás formalmente, ya estás cubierto por ese aporte; conviene entender qué incluye tu prestador, los tickets y órdenes, y si te sirve un seguro parcial privado o de emergencia móvil. Antes de contratar coberturas extra, revisá qué ya tenés por FONASA: mucha gente paga de más por prestaciones que su mutualista ya cubre.',
      },
      {
        heading: 'Vehículo: el SOA es obligatorio, terceros es lo sensato',
        body: 'Si tenés auto o moto, el SOA (Seguro Obligatorio de Automotores) es exigido por ley y cubre lesiones a las personas víctimas de un siniestro, pero no los daños materiales ni tu propio vehículo. Es un piso, no una protección completa. Por eso conviene sumar al menos una cobertura de responsabilidad civil hacia terceros, que te salva de tener que pagar de tu bolsillo el auto o la casa que dañes. El seguro contra todo riesgo tiene sentido en vehículos nuevos o de valor alto; en un auto viejo, muchas veces no compensa la prima.',
      },
      {
        heading: 'Hogar: barato para el daño que evita',
        body: 'El seguro de hogar suele ser de los más baratos en relación con lo que protege, sobre todo si sos propietario. Cubre incendio, daños por agua, fenómenos climáticos y, según la póliza, robo de contenido y responsabilidad civil frente a vecinos. Si alquilás, revisá qué exige el contrato y qué cubre el propietario, para no pagar dos veces lo mismo. Fijate bien en dos cosas: la suma asegurada (que alcance para reconstruir o reponer de verdad) y las exclusiones, que son la letra chica donde el seguro dice qué no paga.',
      },
      {
        heading: 'Vida: solo si alguien depende de tu ingreso',
        body: 'El seguro de vida no es para vos: es para quienes quedarían sin tu ingreso si faltaras. Tiene sentido claro si tenés hijos menores o una pareja que depende de lo que aportás y que quedaría descubierta. Ojo con una confusión frecuente: en Uruguay el crédito hipotecario (del BHU o de los bancos) ya suele incluir un seguro de vida sobre saldo deudor obligatorio, que cancela la deuda con el banco si el titular fallece, así que esa cuenta normalmente ya está cubierta y no hace falta duplicarla. Lo que un seguro de vida sí resuelve es sostener el nivel de vida de tu familia y otras deudas que no tengan su propia cobertura. Si vivís solo y sin dependientes ni deudas heredables, probablemente no lo necesites todavía. Distinguí el seguro temporal (paga si fallecés dentro de un plazo, más barato y directo) de los productos que mezclan ahorro e inversión, que suelen ser más caros y menos transparentes.',
      },
      {
        heading: 'Cómo comparar y no sobreasegurarte',
        body: 'Compará pólizas mirando cobertura, deducibles (lo que pagás vos antes de que entre el seguro), exclusiones y suma asegurada, no solo el precio de la prima. El Banco de Seguros del Estado y las aseguradoras privadas compiten; pedí varias cotizaciones por el mismo riesgo. Evitá duplicar coberturas que ya tenés por FONASA, por la tarjeta o por otra póliza, y no asegures cosas que podrías reponer sin drama. Esta es información general para orientarte; para decidir una cobertura concreta consultá con un corredor de seguros matriculado o directamente con la aseguradora, verificá que esté habilitada ante la Superintendencia de Servicios Financieros del BCU, y leé las condiciones antes de firmar.',
      },
    ],
    related: [
      { label: 'Cuánto cuesta tener un auto', to: '/guias/costos-de-tener-auto-uruguay' },
      { label: 'Salud financiera', to: '/salud-financiera' },
      { label: 'Planificar tu retiro', to: '/guias/planificar-tu-retiro-uruguay' },
    ],
  },
  {
    slug: 'jubilacion-y-afap-como-funciona-uruguay',
    title: 'Jubilación y AFAP en Uruguay: cómo funciona',
    description:
      'Cómo funciona la jubilación en Uruguay: el sistema mixto BPS más AFAP, qué es una AFAP y qué cambió con la reforma de 2023.',
    tag: 'JUBILACIÓN',
    updatedAt: '2026-07-18',
    sections: [
      {
        heading: 'Un sistema mixto: BPS y AFAP a la vez',
        body: 'En Uruguay el sistema jubilatorio es mixto: una parte de tu aporte va al BPS y otra a una AFAP. El BPS funciona por solidaridad intergeneracional, es decir, los que trabajan hoy financian a los que ya están jubilados; tu jubilación de esa parte depende de tus años aportados y de tu sueldo, no de una cuenta a tu nombre. La parte de la AFAP es distinta: es ahorro individual, plata que se acumula en una cuenta tuya y se invierte para pagarte una renta al retirarte. Las dos partes conviven y suman en tu jubilación final.',
      },
      {
        heading: 'Qué es una AFAP',
        body: 'AFAP significa Administradora de Fondos de Ahorro Previsional. Es una empresa regulada y supervisada por el Banco Central que administra tu ahorro jubilatorio individual: recibe parte de tus aportes, los invierte y te cobra una comisión por hacerlo. En Uruguay hay varias, incluida República AFAP, ligada al Estado, y otras privadas. Vos elegís cuál, y podés cambiarte según las reglas vigentes. Al momento de retirarte, ese fondo acumulado se transforma, en general a través de una aseguradora, en una renta vitalicia que se suma a lo que te paga el BPS.',
      },
      {
        heading: 'La reforma de 2023 y la edad de retiro',
        body: 'La reforma de la seguridad social (Ley 20.130, de 2023) creó un régimen común y subió gradualmente la edad de retiro hacia los 65 años. No aplica igual a todos: se implementa por generaciones según el año de nacimiento. En términos generales, quienes nacieron antes de 1973 mantienen las reglas previas, y a partir de ahí la edad sube de a poco por cohorte hasta llegar a 65 años para los nacidos desde 1977. Hay excepciones por carreras largas o tareas de alto esfuerzo físico. Como la transición es compleja, conviene consultar tu caso puntual con el BPS.',
      },
      {
        heading: 'Qué mirar de tu AFAP',
        body: 'Aunque el aporte es obligatorio, no todas las AFAP rinden ni cobran igual. Mirá tres cosas. La comisión de administración, que es lo que te descuentan y erosiona tu ahorro año a año. La rentabilidad histórica del fondo, entendiendo que rendimientos pasados no garantizan futuros. Y el subfondo en el que estás: el sistema suele mover tu dinero de un fondo con inversiones algo más expuestas al riesgo cuando sos joven a uno más conservador cerca del retiro, para proteger lo acumulado. Tené en cuenta que, en Uruguay, buena parte de lo que administran las AFAP está colocado en títulos del Estado, incluso en el subfondo más agresivo. Revisá tus estados de cuenta y no asumas que la AFAP que te asignaron por defecto es la que más te conviene.',
      },
      {
        heading: 'Información general, dónde confirmar tu caso',
        body: 'Esto es orientación general, no asesoramiento previsional. La jubilación depende de tu historia laboral concreta, de la caja que te corresponda (BPS u otras, como la Caja de Profesionales o la Notarial) y de la transición de la reforma. Para números reales de tu situación, consultá directamente al BPS, que ofrece cálculos de tu historia laboral, y a tu AFAP para el estado de tu cuenta individual. Si tu caso es complejo, un contador o un abogado laboralista pueden ayudarte a proyectar cuándo y con cuánto te conviene retirarte.',
      },
    ],
    related: [
      { label: 'Planificar tu retiro', to: '/guias/planificar-tu-retiro-uruguay' },
      { label: 'Entender tu recibo de sueldo', to: '/guias/entender-tu-recibo-de-sueldo-uruguay' },
      { label: 'Cómo empezar a invertir', to: '/guias/como-empezar-a-invertir-uruguay' },
    ],
  },
  {
    slug: 'planificar-tu-retiro-uruguay',
    title: 'Cómo planificar tu retiro en Uruguay',
    description:
      'Cómo planificar tu retiro en Uruguay: por qué la jubilación estatal puede no alcanzar y cómo empezar a ahorrar de forma complementaria.',
    tag: 'RETIRO',
    updatedAt: '2026-07-18',
    sections: [
      {
        heading: 'Por qué la jubilación puede no alcanzarte',
        body: 'La jubilación que vas a cobrar suele ser menor que tu último sueldo: a eso se le llama tasa de reemplazo, y casi nunca es del cien por ciento. Si tu nivel de vida está calibrado a lo que ganás hoy, es probable que al retirarte tengas que recortar. Además, con la reforma de 2023 la edad mínima de retiro está subiendo de forma gradual desde los 60 hacia un máximo de 65 años, según el año en que naciste, así que conviene chequear con el BPS qué edad te aplica a vos. Planificar el retiro es, básicamente, achicar esa brecha con anticipación: cuanto antes empieces, menos esfuerzo mensual necesitás. Dejarlo para los cincuenta y pico obliga a ahorrar mucho más en menos tiempo.',
      },
      {
        heading: 'Ahorro voluntario complementario',
        body: 'Tu aporte obligatorio a BPS y AFAP es un piso, no un techo. Podés sumar ahorro voluntario para el retiro por varios caminos: aportes adicionales dentro del régimen previsional cuando corresponda, y sobre todo tu propio ahorro e inversión por fuera. La lógica es armar una segunda fuente de ingresos para cuando dejes de trabajar: instrumentos de renta fija, fondos, o inversiones acordes a tu tolerancia al riesgo. Lo importante es que sea dinero destinado específicamente al largo plazo, separado del ahorro de emergencia y de los gastos corrientes, para no tentarte a usarlo antes.',
      },
      {
        heading: 'El interés compuesto premia al que empieza temprano',
        body: 'El arma más poderosa del que planifica su retiro no es ganar mucho, es el tiempo. El interés compuesto hace que los rendimientos generen a su vez más rendimientos, y ese efecto se dispara en horizontes largos. Aportar una cantidad modesta desde los veinticinco puede superar a aportar el doble desde los cuarenta y cinco, simplemente porque el dinero trabajó más años. La conclusión práctica es simple: aunque sea poco, empezá ya. La constancia mensual durante décadas vence casi siempre al aporte grande pero tardío, y te saca la presión de tener que arriesgar de más al final.',
      },
      {
        heading: 'Estimar cuánto vas a necesitar',
        body: 'Para ponerle número, arrancá por tu gasto mensual actual y pensá cómo cambiaría en el retiro: algunos gastos bajan (transporte al trabajo, hijos independizados) y otros suben (salud). Estimá cuántos años de retiro querés financiar y restá lo que proyectás recibir de jubilación; la diferencia es lo que tenés que cubrir con ahorro propio. No busques precisión de decimales: es un ejercicio para dimensionar y ajustar cada tanto. Trabajá en términos reales, descontando la inflación, y recordá que en Uruguay conviene mirar la UI para instrumentos que siguen la inflación y no confundir rendimiento nominal con poder de compra.',
      },
      {
        heading: 'Información general y próximos pasos',
        body: 'Esta es una guía educativa, no asesoramiento financiero personalizado. Para conocer tu jubilación estimada y la edad de retiro que te corresponde consultá al BPS y a tu AFAP, y para el tramo de ahorro e inversión que armes por tu cuenta considerá hablar con un asesor o contador, sobre todo por el tratamiento impositivo. En Cambio Uruguay tenés contenido sobre cómo funcionan las AFAP y sobre opciones para invertir en Uruguay que te sirven para dar los primeros pasos. Lo esencial: definí tu meta, automatizá un aporte mensual y revisá el plan una vez por año.',
      },
    ],
    related: [
      { label: 'Jubilación y AFAP', to: '/guias/jubilacion-y-afap-como-funciona-uruguay' },
      { label: 'Interés compuesto', to: '/guias/interes-compuesto-explicado-uruguay' },
      { label: 'Cómo empezar a invertir', to: '/guias/como-empezar-a-invertir-uruguay' },
    ],
    steps: [
      {
        name: 'Estimá tu gasto en el retiro',
        text: 'Partí de tu gasto mensual actual y ajustalo: restá lo que dejarás de gastar y sumá lo que subirá, sobre todo salud.',
      },
      {
        name: 'Proyectá tu jubilación',
        text: 'Consultá al BPS y a tu AFAP para estimar cuánto cobrarías y a qué edad podés retirarte, y calculá la brecha contra el gasto que querés mantener.',
      },
      {
        name: 'Definí un aporte mensual',
        text: 'Fijá una cantidad realista que puedas separar todos los meses para el largo plazo, aunque sea modesta al principio.',
      },
      {
        name: 'Automatizá y separá el dinero',
        text: 'Poné ese ahorro en una cuenta o instrumento distinto del gasto corriente, para que no se mezcle ni se gaste.',
      },
      {
        name: 'Revisá el plan una vez por año',
        text: 'Ajustá el aporte según tu ingreso, la inflación y los cambios de tu vida, y confirmá que seguís rumbo a tu meta.',
      },
    ],
  },
  {
    slug: 'abrir-una-cuenta-bancaria-uruguay',
    title: 'Cómo abrir una cuenta bancaria en Uruguay',
    description:
      'Cómo abrir una cuenta bancaria en Uruguay: requisitos, cuenta en pesos y dólares, cuenta gratuita por ley y qué comisiones mirar.',
    tag: 'CUENTA',
    updatedAt: '2026-07-18',
    sections: [
      {
        heading: 'Qué necesitás para abrir la cuenta',
        body: 'Para abrir una cuenta en un banco uruguayo suelen pedirte tu documento de identidad, un comprobante de domicilio reciente (una factura de UTE, OSE o similar) y datos sobre tu actividad y origen de fondos: si sos empleado, jubilado, monotributista o profesional. Este último punto es por las normas de prevención de lavado de activos, no es un capricho: el banco tiene que saber a qué te dedicás. Los extranjeros pueden necesitar documentación adicional. Con esos papeles el trámite es relativamente ágil, y varios bancos y fintech permiten iniciarlo o completarlo en forma digital desde el celular.',
      },
      {
        heading: 'Cuenta en pesos y cuenta en dólares',
        body: 'En Uruguay es común manejar dos monedas. La cuenta en pesos la usás para el día a día: sueldo, débito, pagos, servicios. La cuenta en dólares sirve para ahorrar o para gastos en esa moneda, algo habitual acá por costumbre y por cobertura frente a la inflación del peso. Muchos bancos te abren ambas bajo el mismo titular. Tené presente que convertir entre monedas tiene un costo por la diferencia entre la cotización de compra y de venta, y que las comisiones y mínimos pueden variar según la moneda de la cuenta.',
      },
      {
        heading: 'La cuenta gratuita de la ley de inclusión financiera',
        body: 'La ley de inclusión financiera (Ley 19.210) impulsó que exista una cuenta básica gratuita y, para quienes cobran sueldo o jubilación por esa vía, una cuenta con prestaciones sin costo: sin cargo por apertura ni mantenimiento, sin exigencia de saldo mínimo, con una cantidad de operaciones y retiros mensuales incluidos y tarjeta de débito. Si te dicen que abrir una cuenta para cobrar el sueldo tiene costo mensual, preguntá específicamente por la cuenta gratuita a la que tenés derecho. No todas las cuentas son gratis, pero esta modalidad existe por ley y muchos usuarios pagan comisiones que podrían evitar.',
      },
      {
        heading: 'Las comisiones que conviene mirar',
        body: 'El precio real de una cuenta no está en la publicidad sino en la letra de las comisiones. Fijate en el costo de mantenimiento mensual, en los cargos por operaciones que exceden las incluidas, en el retiro por cajero de otra red, en la emisión y renovación de tarjetas, y en los costos de transferencias, sobre todo a otros bancos. Pedí la grilla de tarifas antes de firmar y compará entre entidades. Dos cuentas que parecen iguales pueden costarte muy distinto según cuántas operaciones hagas por mes y de qué tipo.',
      },
      {
        heading: 'Banco tradicional o fintech: en qué se diferencian',
        body: 'El BROU y los bancos privados ofrecen la estructura más completa: sucursales, crédito, cuentas en dólares, atención presencial. Las fintech y billeteras suelen ganar en comodidad digital, apertura rápida y a veces menos comisiones, pero no siempre son bancos ni ofrecen todos los servicios ni la misma protección. Un dato clave: los depósitos en bancos están alcanzados por la garantía de la COPAB hasta ciertos límites, algo que no necesariamente cubre a una billetera. Para elegir, cruzá qué uso le vas a dar con la protección y el costo. En Cambio Uruguay tenés una comparativa de los mejores bancos que te ayuda a decidir. Esta guía es informativa y general y no sustituye el asesoramiento profesional: confirmá las condiciones vigentes con cada banco y con fuentes oficiales como el Banco Central del Uruguay antes de decidir.',
      },
    ],
    related: [
      { label: 'Mejores bancos de Uruguay', to: '/mejores-bancos-uruguay' },
      { label: 'Billeteras digitales', to: '/guias/billeteras-digitales-uruguay-como-funcionan' },
      { label: 'Entender tu recibo de sueldo', to: '/guias/entender-tu-recibo-de-sueldo-uruguay' },
    ],
  },
  {
    slug: 'billeteras-digitales-uruguay-como-funcionan',
    title: 'Billeteras digitales en Uruguay: cómo funcionan y cuál elegir',
    description:
      'Cómo funcionan las billeteras digitales en Uruguay (Prex, Mi Dinero y otras), en qué se diferencian de un banco y cuál elegir según tu uso.',
    tag: 'BILLETERAS',
    updatedAt: '2026-07-18',
    sections: [
      {
        heading: 'Qué es una billetera digital',
        body: 'Una billetera digital es una app que te deja guardar dinero, pagar, transferir y en general operar con una tarjeta prepaga asociada, sin pasar por una cuenta bancaria tradicional. En Uruguay las más conocidas son Prex y Mi Dinero, entre otras. Cargás saldo, y con ese saldo pagás en comercios, hacés giros a otras personas o comprás online. La gracia es la simplicidad: apertura rápida desde el celular, sin las exigencias de un banco. Son emisores de dinero electrónico, una figura regulada por el Banco Central, distinta de un banco aunque a veces se parezcan en la práctica.',
      },
      {
        heading: 'En qué se diferencian de un banco',
        body: 'La diferencia clave es que una billetera de dinero electrónico no es un banco: por normativa no puede tomar depósitos para prestarlos ni pagar intereses por tu saldo. Vos cargás plata y esa plata queda disponible para gastar, no invertida por la entidad. Por eso el dinero electrónico está sujeto a reglas específicas del Banco Central que buscan resguardarlo, exigiendo que la empresa mantenga esos fondos separados y respaldados en las cuentas o instrumentos que prevé la normativa vigente. La contracara: el saldo en billetera no está cubierto directamente por la garantía de depósitos de la COPAB, como sí lo está un depósito bancario. Conviene saberlo antes de dejar sumas grandes.',
      },
      {
        heading: 'Recargas, giros y tarjetas prepagas',
        body: 'Cargás la billetera por transferencia desde tu banco, en redes de cobranza, o recibiendo un giro o tu sueldo si tu empleador lo permite. Con el saldo pagás con la app o con la tarjeta prepaga física o virtual, que funciona como una tarjeta común en comercios y compras online, incluso en el exterior según la billetera. Los giros entre usuarios suelen ser inmediatos y baratos o gratuitos, lo que las hace cómodas para dividir gastos o mandar plata a familiares. Revisá siempre los límites de carga y de saldo, y qué operaciones tienen costo, porque varían entre proveedores.',
      },
      {
        heading: 'Seguridad y protección de tu dinero',
        body: 'Elegí billeteras autorizadas por el Banco Central y desconfiá de apps que prometen rendimientos o que no aclaran quién las respalda. Activá todas las protecciones que ofrezca: clave, biométrico, notificaciones de cada movimiento. Nunca compartas tu clave, el código que llega por SMS ni el token, ni siquiera con alguien que dice ser del soporte. Recordá el punto anterior: el saldo en billetera está regulado, pero no está cubierto directamente por la garantía de depósitos de la COPAB como un depósito bancario, así que no la uses como caja fuerte de tus ahorros. Para gastos y giros del día a día son ideales; para guardar sumas importantes a largo plazo, pensá en un banco.',
      },
      {
        heading: 'Para qué conviene cada una',
        body: 'Las billeteras brillan en lo cotidiano: pagar, dividir cuentas, mandar giros, comprar online sin exponer tu tarjeta bancaria, y para quienes todavía no tienen o no quieren cuenta en un banco. Son un gran primer paso hacia la vida financiera digital. No reemplazan a un banco cuando necesitás crédito, cuentas en dólares con respaldo, o guardar ahorros con la garantía de la COPAB. Muchos uruguayos usan las dos cosas: el banco para el sueldo y el ahorro, la billetera para el gasto diario y los giros. En Cambio Uruguay tenés una guía de apps de economía que compara las opciones disponibles. Esta nota es información general y puede cambiar: confirmá condiciones, límites y costos con cada proveedor y con la normativa vigente del Banco Central antes de decidir.',
      },
    ],
    related: [
      { label: 'Apps de economía', to: '/apps-economia-uruguay' },
      { label: 'Abrir una cuenta bancaria', to: '/guias/abrir-una-cuenta-bancaria-uruguay' },
      { label: 'Mejores bancos de Uruguay', to: '/mejores-bancos-uruguay' },
    ],
  },
  {
    slug: 'como-evitar-estafas-financieras-uruguay',
    title: 'Cómo evitar estafas financieras en Uruguay',
    description:
      'Cómo evitar estafas financieras en Uruguay: phishing, smishing, falsos préstamos, cómo verificar entidades ante el BCU y qué hacer si caíste.',
    tag: 'ESTAFAS',
    updatedAt: '2026-07-18',
    sections: [
      {
        heading: 'Cómo operan las estafas más comunes',
        body: 'Casi todas las estafas financieras buscan lo mismo: que vos, con tus propias manos, les entregues tus claves o tu plata. El phishing llega por mail imitando a tu banco; el smishing, por SMS o WhatsApp con un link urgente; el cuento del tío digital es alguien que se hace pasar por un funcionario, un familiar en apuros o soporte técnico. El común denominador es la urgencia y el miedo: te apuran para que no pienses. Si un mensaje te presiona a actuar ya, a hacer clic o a pasar un código para evitar un problema, ese apuro es la señal de alarma número uno.',
      },
      {
        heading: 'Falsos préstamos y ofertas demasiado buenas',
        body: 'Otra trampa frecuente es el préstamo trucho: te ofrecen crédito fácil, sin importar el clearing, y antes de darte nada te piden un pago por adelantado como gastos, seguro o gestión. Ningún prestador serio te cobra por adelantado para otorgarte un préstamo; eso es estafa. Lo mismo con inversiones que prometen rendimientos altos garantizados y sin riesgo, o con criptomonedas y esquemas donde ganás por sumar gente. En finanzas, retorno alto sin riesgo no existe. Si la oferta parece demasiado buena para ser cierta, casi siempre lo es, y el apuro por que decidas ya confirma la sospecha.',
      },
      {
        heading: 'Verificar la entidad ante el BCU',
        body: 'Antes de darle plata o datos a una supuesta institución financiera, verificá que exista y esté habilitada. El Banco Central del Uruguay lleva registros de las entidades autorizadas a operar (bancos, financieras, emisores de dinero electrónico, casas de cambio) y publica advertencias sobre entidades no autorizadas. Si una empresa que ofrece invertir o prestar no figura entre las supervisadas, es una enorme señal de alerta. Desconfiá también de quien insiste en que le transfieras a una cuenta personal, te apura, o no te da documentación clara. Chequear en la fuente oficial toma cinco minutos y te puede ahorrar un disgusto grande.',
      },
      {
        heading: 'Tus claves y tokens no se comparten nunca',
        body: 'Grabate esta regla sin excepciones: tu contraseña, tu PIN, el código que llega por SMS y el token de tu app no se le dan a nadie, jamás, ni siquiera a alguien que llama diciendo ser de tu banco, de la policía o del soporte. Ninguna institución legítima te va a pedir esos datos por teléfono, mail o mensaje, porque no los necesita. Tampoco entres a tu banco desde links que te mandan: escribí vos la dirección o usá la app oficial. Activá el doble factor de autenticación y las notificaciones de movimientos para enterarte al instante de cualquier operación.',
      },
      {
        heading: 'Qué hacer si caíste y dónde denunciar',
        body: 'Si diste tus datos o hiciste una transferencia, actuá rápido: cada minuto cuenta. Contactá de inmediato a tu banco o billetera para intentar frenar o revertir la operación y bloquear tarjetas y accesos, cambiá todas las claves comprometidas y hacé la denuncia policial. Guardá todas las pruebas: capturas, mensajes, comprobantes. Tené en cuenta que en Uruguay la recuperación del dinero no está garantizada, y que en muchos fraudes donde el titular entregó sus claves la responsabilidad es discutida, así que no cuentes con un reintegro automático. Esta es información general y no sustituye asesoramiento profesional; en Cambio Uruguay tenés una guía específica sobre estafas, y para reclamos formales podés recurrir a la Justicia y a los canales oficiales del BCU.',
      },
    ],
    related: [
      { label: 'Estafas en Uruguay', to: '/estafas-uruguay' },
      {
        label: 'Errores y estafas al invertir',
        to: '/guias/errores-y-estafas-al-invertir-uruguay',
      },
      {
        label: 'Mejorar tu historial crediticio',
        to: '/guias/mejorar-historial-crediticio-uruguay',
      },
    ],
    steps: [
      {
        name: 'Frená la operación y avisá al banco',
        text: 'Contactá ya a tu banco o billetera para intentar revertir el movimiento y bloquear tarjetas, accesos y saldos.',
      },
      {
        name: 'Cambiá todas las claves comprometidas',
        text: 'Actualizá contraseñas de home banking, mail y apps, y activá el doble factor de autenticación donde puedas.',
      },
      {
        name: 'Guardá todas las pruebas',
        text: 'Sacá capturas de los mensajes, mails, links y comprobantes de las transferencias antes de que desaparezcan.',
      },
      {
        name: 'Hacé la denuncia policial',
        text: 'Radicá la denuncia formal aportando toda la evidencia; es necesaria para cualquier reclamo posterior.',
      },
      {
        name: 'Reportá y buscá asesoramiento',
        text: 'Informá a tu entidad por escrito y, si el monto lo amerita, consultá los canales del BCU y asesorate legalmente.',
      },
    ],
  },
  {
    slug: 'educacion-financiera-para-jovenes-uruguay',
    title: 'Educación financiera para jóvenes en Uruguay: por dónde empezar',
    description:
      'Educación financiera para jóvenes en Uruguay: presupuesto, ahorro, evitar deuda mala y primeros pasos para invertir, con recursos gratuitos.',
    tag: 'JÓVENES',
    updatedAt: '2026-07-18',
    sections: [
      {
        heading: 'Lo que la escuela no te enseñó sobre la plata',
        body: 'Salís del liceo sabiendo resolver ecuaciones pero nadie te explicó cómo armar un presupuesto, qué es el clearing o por qué una cuota en muchos pagos puede terminar costando el doble. La educación financiera no es para volverte rico ni para especular: es para no cometer errores caros al principio, cuando menos margen tenés. La buena noticia es que las bases son pocas y sencillas, y aprenderlas temprano vale oro por el tiempo que tenés por delante. Empezá por lo simple y en orden: primero ordenar y ahorrar, mucho después invertir. Educación antes que especulación, siempre.',
      },
      {
        heading: 'Presupuesto y ahorro: los cimientos',
        body: 'Todo arranca por saber cuánto entra y cuánto sale. Anotá tus ingresos y gastos un par de meses y vas a ver a dónde se te va la plata, casi siempre en gastos chicos y repetidos. La meta es que todos los meses quede algo, aunque sea poco, y que ese algo tenga destino: un fondo de emergencia equivalente a varios meses de tus gastos básicos, para que un imprevisto no te empuje a endeudarte. Págate a vos primero: apenas cobrás, separá el ahorro antes de gastar el resto. Automatizarlo funciona mejor que confiar en la fuerza de voluntad a fin de mes.',
      },
      {
        heading: 'Evitar la deuda mala y cuidar tu historial',
        body: 'No toda deuda es mala, pero la deuda de consumo cara sí lo es: financiar salidas, ropa o el celular en muchas cuotas, o entrar en el saldo de la tarjeta, te hace pagar intereses altísimos por cosas que ya consumiste. Distinguí la deuda que construye (estudiar, una herramienta de trabajo) de la que solo adelanta un gusto. Y cuidá tu historial: en Uruguay conviven el Clearing de Informes, un registro privado gestionado por una empresa (no por el Estado) que anota incumplimientos, y la Central de Riesgos Crediticios del Banco Central, que es otra cosa: la base pública donde quedan registrados los deudores del sistema financiero regulado con su categoría de riesgo. No son lo mismo, pero quedar mal registrado en cualquiera de las dos te cierra puertas para créditos futuros, incluso el hipotecario.',
      },
      {
        heading: 'Primeros pasos para invertir, con los pies en la tierra',
        body: 'Invertir recién tiene sentido cuando ya tenés tus gastos bajo control, sin deudas caras y con un fondo de emergencia. Antes de eso, invertir es construir sobre arena. Cuando llegue el momento, empezá entendiendo lo básico: qué es el riesgo, por qué a mayor rendimiento prometido mayor riesgo, y por qué el interés compuesto premia al que empieza temprano y sostiene en el tiempo. Desconfiá de lo que promete ganancias rápidas y seguras; eso no existe y suele ser estafa. En Uruguay hay instrumentos accesibles en pesos, en UI y en dólares; informate bien antes de poner un peso y nunca inviertas algo que no entendés.',
      },
      {
        heading: 'Recursos gratuitos y sin fines de lucro',
        body: 'No hace falta pagar cursos caros para aprender. El Banco Central del Uruguay ofrece programas y materiales de educación financiera gratuitos, y el BPS informa sobre aportes y previsión. Muchas bibliotecas, la propia UdelaR y organizaciones civiles publican contenido serio y sin costo. Desconfiá de gurús que cobran fortunas por fórmulas mágicas para hacerte rico: los que de verdad saben te enseñan a pensar, no te venden atajos. En Cambio Uruguay tenés calculadoras y guías pensadas para el país que podés usar gratis. Esta es información general y educativa; para decisiones importantes, buscá fuentes oficiales o un profesional matriculado.',
      },
    ],
    related: [
      { label: 'Armar un presupuesto', to: '/guias/armar-un-presupuesto-personal-uruguay' },
      { label: 'Cómo empezar a invertir', to: '/guias/como-empezar-a-invertir-uruguay' },
      { label: 'Salud financiera', to: '/salud-financiera' },
    ],
  },
]
