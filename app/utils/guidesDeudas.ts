// Deudas privadas: prescripción, cancelación anticipada, cesión de créditos y saldo a favor en la
// tarjeta. Demanda sacada de Reddit: 1w9g0qq (deuda de garantía de alquiler que "no prescribe"),
// 1st1p9d (cancelar un préstamo de app), 1nijnia, 16s6wv1, 1ozz4q8 y 1wc6gin (deudas vendidas a
// estudios) y 1wa5nur y 1s5i0rq (pagar la tarjeta antes del cierre). Verificado el 2026-09-13 en
// IMPO (CC arts. 1189, 1191, 1216, 1217, 1222, 1234-1236, 1757-1761; C. Comercio arts. 1018,
// 1019, 1026; leyes 17.250 art. 15, 18.331 arts. 14 y 22, 18.574 art. 15, 19.889 art. 467, 20.061 art. 1), en la Recopilación del
// BCU (arts. 327, 350, 350.1, 371, 373, 378, 379), en las preguntas frecuentes de Defensa del
// Consumidor (no hay obligación legal de aceptar la cancelación anticipada) y en los documentos
// publicados por BROU, OCA, Itaú y PreXtamo. El Clearing es privado (Ley 18.331), no del BCU.
import type { Guide } from './guides'

const RNRCSF_URL =
  'https://www.bcu.gub.uy/Acerca-de-BCU/Normativa/Documents/Reordenamiento%20de%20la%20Recopilaci%C3%B3n/Sistema%20Financiero/RNRCSF.pdf'
const UDC_FAQ_URL =
  'https://www.gub.uy/ministerio-economia-finanzas/politicas-y-gestion/preguntas-frecuentes-unidad-defensa-del-consumidor'
const PREXTAMO_TYC_URL = 'https://assets.paigo.uy/prextamo/docs/TyC-PreXtamo.pdf'

export const deudasGuides: readonly Guide[] = [
  {
    slug: 'cuando-prescribe-una-deuda-uruguay',
    title: '¿Cuándo prescribe una deuda privada en Uruguay?',
    description:
      'Tarjeta, préstamo o garantía de alquiler: la acción personal prescribe a los diez años, el vale a los cuatro, y nada opera solo. Qué corta el plazo y qué no.',
    tag: 'PRESCRIPCIÓN',
    updatedAt: '2026-09-13',
    sections: [
      {
        heading: '¿Cuántos años tienen para cobrarte?',
        body: 'La regla general está en el artículo 1216 del Código Civil: "Toda acción personal por deuda exigible se prescribe por diez años", y el tiempo "comenzará a correr desde que la deuda es exigible". Para las obligaciones comerciales, el artículo 1018 del Código de Comercio dice lo mismo: diez años. Las dos redacciones son de la Ley 19.889 de 2020, y por eso hoy casi no importa si tu préstamo se considera civil o comercial: el número coincide. Lo que sí importa es la fecha de arranque. No es el día en que sacaste el préstamo ni el día en que te fuiste del apartamento, sino el día en que la deuda se volvió exigible: el vencimiento de la cuota impaga o, si tu contrato prevé la caducidad de los plazos, el día en que todo el saldo se hizo exigible. Hay un segundo plazo que se confunde con este. El artículo 1217 dice que "el derecho de ejecutar por acción personal se prescribe por cinco años". Pasados esos cinco años el acreedor pierde la vía ejecutiva, que es el juicio rápido, pero no la acción ordinaria, que sigue viva hasta los diez.',
      },
      {
        heading: 'Por qué una misma deuda puede tener más de un reloj',
        body: 'Una deuda de tarjeta o de financiera rara vez es un solo papel: suele haber un contrato y, además, un vale firmado por vos, y cada documento tiene su propio plazo. El artículo 1019 del Código de Comercio fija cuatro años para "las acciones provenientes de vales, conformes o pagarés contra el librador, si la deuda no ha sido reconocida por documento separado", contados desde el vencimiento. El mismo artículo pone cuatro años para "los intereses del dinero prestado, y en general cada pago vencido en términos anuales o a plazos periódicos más cortos", y el artículo 1222 del Código Civil repite la idea para los atrasos de intereses y de todo lo que se paga por plazos periódicos. Traducido: puede pasar que el capital todavía se pueda reclamar y que los intereses atrasados más viejos ya no. Lo que la letra de la ley no resuelve sola es si las cuotas de un préstamo cuentan como "pagos periódicos" con plazo de cuatro años o si todo el saldo queda bajo los diez años de la acción personal. Esa pregunta la termina respondiendo un juez con tu contrato en la mano, y no vamos a contestarla por vos.',
      },
      {
        heading: 'Los plazos, uno al lado del otro',
        body: 'La tabla junta los plazos que aparecen en las deudas de todos los días. Leela con dos advertencias. La primera: cada plazo corre desde una fecha distinta, y la fecha manda tanto como el número. La segunda: la última fila no es una prescripción, es el tiempo que tu dato puede figurar en una base de antecedentes crediticios, y se cuenta desde que el acreedor te incorporó, no desde que la deuda venció. Por eso es tan común que alguien salga del Clearing y siga debiendo, o que la deuda ya no se pueda cobrar en juicio y el registro todavía esté ahí. Son dos relojes que no se tocan: uno mide el derecho del acreedor a que un juez te condene, el otro cuánto tiempo puede una empresa mostrar tu atraso a quien consulte.',
        table: {
          headers: ['Qué se reclama', 'Plazo', 'Norma'],
          rows: [
            [
              'Acción personal por una deuda exigible',
              '10 años desde que la deuda es exigible',
              'Código Civil, art. 1216',
            ],
            ['Obligaciones comerciales', '10 años', 'Código de Comercio, art. 1018'],
            [
              'Vía ejecutiva (juicio rápido) de la acción personal',
              '5 años desde que la deuda es exigible',
              'Código Civil, art. 1217',
            ],
            [
              'Vales, conformes o pagarés contra el librador, sin reconocimiento por documento separado',
              '4 años desde el vencimiento',
              'Código de Comercio, art. 1019 num. 1',
            ],
            [
              'Intereses del dinero prestado y pagos a plazos periódicos',
              '4 años',
              'Código de Comercio, art. 1019 num. 4; Código Civil, art. 1222',
            ],
            [
              'Registro de una deuda impaga en una base como el Clearing (no es prescripción)',
              '5 años desde que se incorpora, renovable por única vez por otros 5',
              'Ley 18.331, art. 22',
            ],
          ],
        },
      },
      {
        heading: 'La garantía de alquiler: ANDA, CGN y aseguradoras',
        body: 'Cuando dejás de pagar un alquiler con garantía, la garantía le paga al propietario y después te reclama a vos lo que pagó. Esa deuda ya no es con el dueño del apartamento: es con la entidad de garantía, y se rige por lo que firmaste con ella, que puede incluir un contrato y un vale. Por eso no encontramos un plazo especial para "las deudas de ANDA": se aplican las mismas reglas de la tabla, contadas desde que ese reintegro se volvió exigible. Dos cosas explican por qué tanta gente siente que esa deuda no prescribe nunca. La primera es que estas garantías suelen cobrar por retención sobre el sueldo o la jubilación, un mecanismo aparte que se activa cuando volvés a tener un ingreso formal y que tiene su propio régimen y sus propios topes. La segunda es que el saldo crece con los intereses de mora, y cualquier plan de pago que firmes sobre ese saldo es un reconocimiento de la deuda que reinicia el plazo. Si la garantía era de la Contaduría General de la Nación, el acreedor es un organismo del Estado: no des por aplicable lo que explicamos para los impuestos y la patente, que es otro régimen.',
        links: [
          { label: 'Retención y embargo del sueldo', to: '/embargo-de-sueldo-uruguay' },
          {
            label: 'Garantías de alquiler: cuál te conviene',
            to: '/guias/garantias-de-alquiler-uruguay',
          },
          {
            label: 'Prescripción de deudas con el Estado',
            to: '/prescripcion-de-deudas-con-el-estado-uruguay',
          },
        ],
      },
      {
        heading: 'No opera sola: la prescripción hay que oponerla',
        body: 'El error más caro es creer que el día del aniversario la deuda desaparece. El artículo 1191 del Código Civil es claro: la prescripción "puede oponerse en cualquier estado de la causa, hasta que se halle en situación de dictarse sentencia", pero "los Jueces no pueden suplir de oficio la excepción que resulta de la prescripción". O sea que el acreedor puede seguir reclamando, puede demandarte y, si vos no la alegás en el juicio, el juez no la va a aplicar por su cuenta. La prescripción no te prohíbe deber: le quita al acreedor la posibilidad de que un juez te condene, si vos la oponés a tiempo y el plazo efectivamente se cumplió. Y el artículo 1189 agrega la trampa del otro lado: no se puede renunciar de antemano a la prescripción, pero sí a la que ya se consumó, y la renuncia puede ser tácita. El propio Código pone como ejemplo al que debe dinero y paga intereses. Pagar algo sobre una deuda que ya había prescripto puede costarte, justamente, la defensa que tenías.',
        links: [
          {
            label: 'Abogado gratis: qué puerta te corresponde',
            to: '/guias/abogado-gratis-uruguay',
          },
        ],
      },
      {
        heading: 'Qué corta el reloj y qué no',
        body: 'Interrumpir la prescripción significa que el plazo vuelve a empezar de cero. En el Código Civil hay tres causas que te importan. La primera depende de vos: el artículo 1234 dice que se interrumpe "cuando el deudor reconoce expresa o tácitamente la obligación", y desde ese día corre una prescripción nueva; pagar una cuota, firmar un convenio o aceptar por escrito el saldo son formas de reconocer. Las otras dos pasan por un juzgado: el emplazamiento judicial notificado al deudor (artículo 1235) y la citación a conciliación, siempre que dentro de los treinta días posteriores a la audiencia sin acuerdo venga la demanda con su emplazamiento (artículo 1236). En lo comercial, el artículo 1026 del Código de Comercio enumera el reconocimiento del deudor, el emplazamiento judicial, la intimación judicial y la pretensión concursal del deudor. En ninguna de esas listas aparecen el llamado, el WhatsApp o la carta de un estudio de cobranza. Eso no quiere decir que haya que ignorarlos: quiere decir que lo que puede reiniciar el plazo depende mucho más de lo que vos respondas que de lo que ellos manden.',
        links: [
          { label: 'Te llama un estudio de cobranza', to: '/guias/estudio-de-cobranza-uruguay' },
        ],
      },
      {
        heading: 'El Clearing tiene su propio reloj',
        body: 'El artículo 22 de la Ley 18.331 regula cuánto tiempo puede figurar una deuda en una base de datos comercial como el Clearing. Los datos sobre obligaciones comerciales de personas físicas "sólo podrán estar registrados por un plazo de cinco años", contados desde que se incorporan. Si la deuda sigue impaga, el acreedor puede pedir "por única vez, su nuevo registro por otros cinco años", y tiene que hacerlo en los treinta días anteriores al vencimiento. Cuando la obligación se cancela, sigue registrada con la mención de que se pagó por un máximo de cinco años, que no se renuevan. De ahí sale el "diez años" que se repite en los foros: es el techo del registro de una deuda impaga, no la prescripción. Que tu nombre deje de aparecer no extingue la deuda, y que la deuda haya prescripto no borra el registro por sí sola. Si pagás, el acreedor tiene cinco días hábiles para comunicarlo y la base, tres días hábiles para actualizarlo.',
        links: [{ label: 'Cómo salir del Clearing', to: '/salir-del-clearing' }],
      },
    ],
    steps: [
      {
        name: 'No reconozcas nada todavía',
        text: 'Ni pagos simbólicos ni convenios ni aceptar el saldo por escrito: cualquiera de esos gestos puede reiniciar el plazo o renunciar a una prescripción ya cumplida.',
      },
      {
        name: 'Pedí el detalle por escrito',
        text: 'Quién es el acreedor hoy, qué documento respalda la deuda, cuándo venció la primera cuota impaga y cómo se compone el saldo.',
      },
      {
        name: 'Contá desde la fecha correcta',
        text: 'El plazo corre desde que la deuda fue exigible y se reinicia con cada reconocimiento tuyo o con una demanda que te hayan notificado.',
      },
      {
        name: 'Si te demandan, oponela en el juicio',
        text: 'El juez no la aplica de oficio: hay que alegarla antes de que el caso quede para sentencia, con la asistencia de un abogado.',
      },
      {
        name: 'Revisá el registro por separado',
        text: 'Pedí tu informe en la base de datos y controlá las fechas: el registro caduca por su propio plazo, que no es el de la prescripción.',
      },
    ],
    faqs: [
      {
        q: '¿Las deudas de ANDA por garantía de alquiler prescriben?',
        a: 'Sí: no encontramos ninguna norma que les dé un plazo propio, así que se aplican los plazos generales, como la acción personal de diez años (art. 1216 del Código Civil) o los cuatro años del vale si el reclamo se basa en ese documento (art. 1019 del Código de Comercio), contados en principio desde que el reintegro fue exigible. Pero no operan solas, y cualquier convenio o pago que hagas reconoce la deuda y reinicia el plazo.',
      },
      {
        q: '¿Cuándo prescribe una deuda de tarjeta de crédito en Uruguay?',
        a: 'La acción personal o comercial por el saldo prescribe a los diez años desde que la deuda es exigible (art. 1216 del Código Civil y art. 1018 del Código de Comercio). Si te reclaman con el vale que firmaste, ese plazo es de cuatro años desde el vencimiento (art. 1019), y los intereses atrasados también tienen cuatro años. En todos los casos hay que oponer la prescripción en el juicio.',
      },
      {
        q: 'Me dijeron que las deudas prescriben a los cinco años, ¿es así?',
        a: 'No como regla general. Cinco años es lo que puede figurar una deuda impaga en el Clearing antes de su única renovación (Ley 18.331, art. 22) y el plazo de la vía ejecutiva (art. 1217 del Código Civil). La acción personal por una deuda exigible prescribe a los diez años.',
      },
      {
        q: 'Si pago una cuota de una deuda vieja, ¿empieza todo de nuevo?',
        a: 'Sí. Reconocer la obligación, expresa o tácitamente, interrumpe la prescripción y desde ese día corre un plazo nuevo (art. 1234 del Código Civil). Y si la deuda ya había prescripto, pagar intereses es una renuncia tácita a esa prescripción (art. 1189).',
      },
      {
        q: 'Si la deuda ya prescribió, ¿me pueden seguir reclamando?',
        a: 'Pueden reclamarte e incluso demandarte: la prescripción no borra la deuda de un día para el otro, te da una defensa. Si la oponés en el juicio antes de que quede para sentencia y el plazo se cumplió, el juez no puede condenarte por esa deuda; si no la oponés, no la aplica por su cuenta (art. 1191 del Código Civil).',
      },
      {
        q: 'Salí del Clearing, ¿eso quiere decir que la deuda prescribió?',
        a: 'No. El registro en el Clearing tiene su propio plazo, que se cuenta desde que la deuda se incorpora a la base (Ley 18.331, art. 22), mientras que la prescripción corre desde que la deuda fue exigible y hay que oponerla. Uno puede cumplirse sin el otro.',
      },
      {
        q: 'Mi deuda es de antes de 2020, ¿no eran veinte años?',
        a: 'Hasta la Ley 19.889 de 2020, la acción personal del Código Civil prescribía a los veinte años. El artículo 467 de esa ley dispone que las prescripciones que ya estaban corriendo se determinan por el plazo nuevo de diez, con un margen: las que el acortamiento daba por cumplidas antes de tiempo se consumaron recién al terminar dos años desde que la ley pasó a regir, lapso que la Ley 20.061 estiró cuarenta y ocho meses más sólo para las deudas con el Ministerio de Vivienda, el BHU y la ANV. A septiembre de 2026 los dos márgenes ya terminaron, así que una deuda anterior a 2020 también se cuenta con los diez años.',
      },
    ],
    related: [
      {
        label: 'Prescripción de deudas con el Estado',
        to: '/prescripcion-de-deudas-con-el-estado-uruguay',
      },
      { label: 'Salir del Clearing', to: '/salir-del-clearing' },
      { label: 'Te llama un estudio de cobranza', to: '/guias/estudio-de-cobranza-uruguay' },
      { label: 'Saldar y negociar deudas', to: '/saldar-deudas-uruguay' },
    ],
    sources: [
      {
        label:
          'Código Civil, arts. 1216, 1217 y 1222 — "Toda acción personal por deuda exigible se prescribe por diez años", contados "desde que la deuda es exigible", y "el derecho de ejecutar por acción personal se prescribe por cinco años" (los dos con la redacción de la Ley 19.889; el texto original del 1216 decía veinte años); cuatro años para "los atrasos" de interés de dinero prestado y de todo lo que se paga por plazos periódicos',
        url: 'https://www.impo.com.uy/bases/codigo-civil/16603-1994/1216',
        publisher: 'IMPO',
      },
      {
        label:
          'Código de Comercio, arts. 1018, 1019 y 1026 — diez años para las obligaciones comerciales; cuatro años para "las acciones provenientes de vales, conformes o pagarés contra el librador" y para los intereses y pagos periódicos; la prescripción mercantil se interrumpe por reconocimiento, emplazamiento judicial, intimación judicial o pretensión concursal',
        url: 'https://www.impo.com.uy/bases/codigo-comercio/817-1865/1019',
        publisher: 'IMPO',
      },
      {
        label:
          'Código Civil, arts. 1189, 1191 y 1234 a 1236 — se puede renunciar a la prescripción ya consumada, también tácitamente (el que debe dinero y paga intereses); "los Jueces no pueden suplir de oficio la excepción que resulta de la prescripción"; y se interrumpe "cuando el deudor reconoce expresa o tácitamente la obligación", por el emplazamiento judicial notificado y por la citación a conciliación seguida de demanda dentro de treinta días',
        url: 'https://www.impo.com.uy/bases/codigo-civil/16603-1994/1191',
        publisher: 'IMPO',
      },
      {
        label:
          'Ley 18.331, art. 22 — las deudas de personas físicas "sólo podrán estar registrados por un plazo de cinco años", con una única renovación por otros cinco; las canceladas quedan hasta cinco años con esa mención; cinco días hábiles para comunicar el pago y tres para actualizar',
        url: 'https://www.impo.com.uy/bases/leyes/18331-2008/22',
        publisher: 'IMPO',
      },
      {
        label:
          'Ley 19.889, art. 467 (disposición transitoria) — "Las prescripciones empezadas a la fecha en que esta ley sea obligatoria se determinarán conforme a las disposiciones de ésta"; las que por la reducción de plazos se consumaran antes de dos años "se consumarán recién al finalizar dicho lapso"',
        url: 'https://www.impo.com.uy/bases/leyes/19889-2020/467',
        publisher: 'IMPO',
      },
      {
        label:
          'Ley 20.061, art. 1 — prorroga "por el término de cuarenta y ocho meses" el plazo del inciso segundo del art. 467 de la Ley 19.889, sólo para las acciones del Ministerio de Vivienda, el Banco Hipotecario y la Agencia Nacional de Vivienda',
        url: 'https://www.impo.com.uy/bases/leyes/20061-2022/1',
        publisher: 'IMPO',
      },
    ],
  },
  {
    slug: 'cancelar-prestamo-antes-de-tiempo-uruguay',
    title: '¿Puedo cancelar un préstamo antes de tiempo en Uruguay?',
    description:
      'No hay derecho general a cancelar antes: lo define tu contrato, salvo el hipotecario para vivienda. Qué intereses te descuentan y qué comisiones publican las entidades.',
    tag: 'CANCELACIÓN',
    updatedAt: '2026-09-13',
    sections: [
      {
        heading: '¿Te pueden obligar a seguir pagando cuotas?',
        body: 'La respuesta corta sorprende: sí, pueden. La Unidad Defensa del Consumidor del Ministerio de Economía lo contesta sin vueltas en sus preguntas frecuentes: "No existe obligación por parte del acreedor de aceptar la cancelación anticipada", y sugiere plantearlo ante la institución. La Ley 17.250 de relaciones de consumo obliga a informar antes de contratar el precio de contado, el monto financiado, la cantidad y periodicidad de los pagos, la tasa efectiva anual cuando presta un intermediario financiero y los adicionales por mora, pero no le da al consumidor un derecho general a pagar todo antes. La ley de usura, por su parte, pone topes a la tasa, que es otra cosa. Entonces, para un préstamo de consumo o una compra en cuotas, si podés cancelar antes y cuánto te cuesta se contesta en tu contrato. En la práctica muchas entidades lo permiten y publican sus condiciones; las que encontramos están en la tabla de más abajo. La excepción que sí está escrita en la ley es la del préstamo hipotecario para vivienda, que tiene su propia sección.',
        links: [{ label: 'Ley de usura en Uruguay', to: '/ley-de-usura-uruguay' }],
      },
      {
        heading: '¿Si cancelo antes pago menos o pago lo mismo?',
        body: 'Depende de si el contrato te descuenta los intereses que todavía no vencieron, y esa es la confusión más repetida. En un préstamo de cuota fija, el interés de cada mes se calcula sobre el capital que seguís debiendo, así que las primeras cuotas son sobre todo interés y las últimas, sobre todo capital. Si al cancelar te cobran sólo el capital pendiente más una comisión, ahorrás los intereses de las cuotas que faltaban menos esa comisión. Si en cambio te cobran la suma de las cuotas restantes tal como figuran en el vale, no ahorrás nada. Los términos publicados de PreXtamo, por ejemplo, dicen que si cancelás "en forma anticipada y total" tu único préstamo vigente, "será bonificado con el 100% de los intereses a vencer". Para verlo con tus números, si el prestamista es una institución supervisada por el Banco Central, el documento de adeudo tiene que mostrar el capital, la tasa efectiva anual, los cargos, la suma total a pagar y cada cuota con su vencimiento: con eso y la calculadora de préstamos podés estimar cuánto interés queda en las cuotas que te faltan.',
        links: [{ label: 'Calculadora de préstamos', to: '/herramientas/calculadora-prestamo' }],
      },
      {
        heading: 'Qué publican las entidades sobre cancelar antes',
        body: 'La tabla reúne condiciones publicadas por los propios prestamistas y la regla legal del hipotecario, según lo que estaba en línea al 13 de septiembre de 2026. No es un ranking: sirve para ver que las formas de cobrar la cancelación son muy distintas. Una comisión expresada como porcentaje del capital que queda pesa más cuanto antes canceles, porque el capital pendiente es mayor; una bonificación de los intereses a vencer, en cambio, te devuelve más cuanto antes canceles, porque es cuando más intereses faltan. Por eso dos préstamos con la misma tasa pueden terminar costando distinto si pensás adelantar pagos. Si tu entidad no está en la tabla, pedile la condición por escrito antes de firmar: el Banco Central exige que las instituciones supervisadas te informen de antemano todos los intereses, cargos y comisiones del producto, con su concepto, su monto y su periodicidad.',
        table: {
          headers: ['Caso', 'Qué se publica', 'Fuente'],
          rows: [
            [
              'Préstamos al consumo del BROU (tarifa a septiembre de 2026)',
              'Comisión sobre el saldo de capital adeudado: 5 % en pesos, 2 % en unidades indexadas y 2,5 % en dólares; no se cuenta el capital vencido ni el que vence antes de 30 días',
              'Página de cancelación anticipada del BROU',
            ],
            [
              'PreXtamo (préstamo de Floder S.A. por la app de Prex)',
              'Bonifica el 100 % de los intereses a vencer si cancelás en forma anticipada y total tu único préstamo; con dos o más, hay que cancelarlos todos juntos',
              'Términos y condiciones de PreXtamo',
            ],
            [
              'Hipotecario para vivienda, cualquier acreedor',
              'Pasados cinco años del otorgamiento, cancelación total o parcial pagando intereses devengados, costos administrativos de hasta 1 % del saldo y costos financieros por reinversión',
              'Ley 18.574, art. 15',
            ],
          ],
        },
      },
      {
        heading: 'La excepción que está en la ley: el hipotecario para vivienda',
        body: 'El artículo 15 de la Ley 18.574 es la única regla general de cancelación anticipada para personas que encontramos. Dice que "todo deudor de un préstamo hipotecario con destino a vivienda" puede cancelar en forma anticipada, total o parcialmente, lo que debe de capital, siempre que hayan pasado por lo menos cinco años desde el otorgamiento. Junto con el capital paga los intereses devengados hasta ese momento, más los costos administrativos y financieros que la cancelación le genera al acreedor. Los administrativos no pueden superar el 1 % del saldo de capital adeudado, y los financieros, que compensan la pérdida de reinversión, se calculan con las tasas medias para préstamos de vivienda que publica el Banco Central en la moneda del préstamo. El artículo termina con una frase que vale la pena subrayar: "La facultad concedida al deudor en este artículo es irrenunciable". Una cláusula de tu contrato que diga lo contrario no te quita ese derecho. Antes de los cinco años, en cambio, vuelve a mandar lo que hayas firmado.',
        links: [
          {
            label: 'Cómo funciona el crédito hipotecario',
            to: '/guias/credito-hipotecario-uruguay',
          },
        ],
      },
      {
        heading: 'Compras en cuotas con tarjeta: ¿se pueden adelantar?',
        body: 'Una compra en cuotas con tarjeta de crédito no es un préstamo aparte, pero la pregunta es la misma: si podés pagar todo antes y qué pasa con el interés. Para tarjetas, el Banco Central obliga a que el contrato diga "si se admite el pago por anticipado y, en caso afirmativo, de sus condiciones", además de cómo se imputan los pagos parciales. O sea que la respuesta no hay que adivinarla ni preguntarla por teléfono: es una cláusula que tu contrato tiene que tener, y la podés pedir por escrito. Si la compra fue sin recargo, adelantar cuotas no te ahorra intereses, porque no los había. Si la compra tenía interés, mirá en esa cláusula si adelantar reduce el interés de las cuotas que faltan o si sólo cambia el momento en que las pagás. Y antes de elegir cuotas la próxima vez, conviene comparar contra el precio de contado: la mejor cancelación anticipada es no haber financiado lo que podías pagar.',
        links: [{ label: '¿Conviene comprar en cuotas?', to: '/conviene-comprar-en-cuotas' }],
      },
      {
        heading: 'Cancelé: ¿me dan otro préstamo enseguida?',
        body: 'Esa duda aparece mucho con los préstamos de las apps, y no la contesta ninguna norma que hayamos encontrado: darte o no un préstamo nuevo es una decisión de crédito de la entidad, que mira tu historial y sus propias políticas. Lo que sí puede estar escrito es cuánto te cuesta volver a pedir. Los términos de PreXtamo, por ejemplo, dicen que "no se cobrarán nuevamente gastos fijos de concesión hasta transcurridos 60 días de la concesión del crédito anterior", y exigen que, si tenés dos o más préstamos en paralelo y querés cancelar antes, los canceles todos juntos. Si cancelar te conviene por los intereses, la posibilidad de pedir otro después no debería decidir por vos: sacar un préstamo para tenerlo disponible por las dudas es pagar intereses por plata que no usás. Y si lo que buscás es ordenar varias deudas en una sola, eso es refinanciar, que tiene su propia cuenta.',
        links: [
          { label: 'Refinanciar o unificar deudas', to: '/guias/refinanciar-deudas-uruguay' },
        ],
      },
    ],
    steps: [
      {
        name: 'Buscá la cláusula de cancelación',
        text: 'Leé en el contrato o en la cartilla si se admite cancelar antes, si es total o también parcial, y si hay comisión o bonificación de intereses.',
      },
      {
        name: 'Pedí el saldo de cancelación a una fecha',
        text: 'Por escrito y desglosado en capital, intereses que se descuentan, comisión y cualquier otro cargo, para compararlo con la suma de las cuotas que te faltan.',
      },
      {
        name: 'Hacé la cuenta antes de pagar',
        text: 'Si lo que te cobran se parece a la suma de las cuotas restantes, cancelar no te ahorra intereses y sólo te conviene si querés liberarte de la deuda.',
      },
      {
        name: 'Pagá y pedí el vale o la carta de pago',
        text: 'Las instituciones supervisadas deben entregarte bajo recibo el título que firmaste o una carta de pago, y ponerlo a tu disposición en un máximo de diez días.',
      },
      {
        name: 'Si no te responden, reclamá',
        text: 'Presentá el reclamo en la institución, que tiene hasta quince días corridos para contestar (prorrogables una vez), y si la respuesta no te conforma, andá al Banco Central.',
      },
    ],
    faqs: [
      {
        q: 'Si cancelo el préstamo antes, ¿pago menos o pago lo mismo?',
        a: 'Depende del contrato. Si te cobran sólo el capital pendiente, más una eventual comisión, ahorrás los intereses de las cuotas que faltaban; si te cobran la suma de las cuotas restantes, no ahorrás nada. Los términos de PreXtamo publicados a septiembre de 2026, por ejemplo, bonifican el 100 % de los intereses a vencer si cancelás en forma total tu único préstamo.',
      },
      {
        q: '¿Me pueden cobrar una multa por cancelar antes?',
        a: 'Sí, si está pactada: la Unidad Defensa del Consumidor aclara que el acreedor no está obligado a aceptar la cancelación anticipada, así que las condiciones las fija el contrato. El BROU, por ejemplo, publica para sus préstamos al consumo una comisión del 5 % sobre el saldo de capital en pesos, del 2 % en unidades indexadas y del 2,5 % en dólares (tarifa vigente a septiembre de 2026).',
      },
      {
        q: '¿Puedo cancelar un préstamo hipotecario antes de tiempo?',
        a: 'Sí, una vez que pasaron cinco años desde el otorgamiento: el artículo 15 de la Ley 18.574 lo permite, total o parcialmente, pagando los intereses devengados, costos administrativos de hasta el 1 % del saldo de capital y costos financieros. Es un derecho irrenunciable.',
      },
      {
        q: 'Si cancelo un préstamo de Prex, ¿puedo sacar otro enseguida?',
        a: 'Eso lo decide la entidad según tu perfil; no encontramos ninguna norma que la obligue a darte otro. Sus términos sí dicen que no vuelven a cobrar gastos fijos de concesión hasta pasados 60 días de la concesión anterior, y que si tenés varios préstamos en paralelo hay que cancelarlos todos juntos.',
      },
      {
        q: '¿Puedo adelantar las cuotas de una compra con tarjeta?',
        a: 'Depende del contrato de tu tarjeta, que por norma del Banco Central tiene que indicar si se admite el pago por anticipado y en qué condiciones. Si la compra era sin recargo, adelantar no te ahorra intereses.',
      },
    ],
    related: [
      { label: 'Mejores préstamos de Uruguay', to: '/mejores-prestamos-uruguay' },
      { label: 'Calculadora de préstamos', to: '/herramientas/calculadora-prestamo' },
      { label: 'Ley de usura', to: '/ley-de-usura-uruguay' },
      { label: 'TEA, TNA y CFT', to: '/guias/entender-tea-tna-y-cft' },
    ],
    sources: [
      {
        label:
          'Preguntas frecuentes de la Unidad Defensa del Consumidor — "No existe obligación por parte del acreedor de aceptar la cancelación anticipada"',
        url: UDC_FAQ_URL,
        publisher: 'Unidad Defensa del Consumidor / MEF',
      },
      {
        label:
          'Ley 17.250, art. 15 — antes de contratar hay que informar precio de contado, monto del crédito, cantidad y periodicidad de los pagos, la tasa de interés efectiva anual (intermediarios financieros) y los adicionales por mora',
        url: 'https://www.impo.com.uy/bases/leyes/17250-2000/15',
        publisher: 'IMPO',
      },
      {
        label:
          'Ley 18.574, art. 15 — "Todo deudor de un préstamo hipotecario con destino a vivienda" puede cancelar anticipadamente pasados cinco años del otorgamiento; costos administrativos de hasta 1 % del saldo; "La facultad concedida al deudor en este artículo es irrenunciable"',
        url: 'https://www.impo.com.uy/bases/leyes/18574-2009/15',
        publisher: 'IMPO',
      },
      {
        label:
          'Recopilación de Normas de Regulación y Control del Sistema Financiero — art. 350 (información previa de todos los intereses, cargos y comisiones), art. 371 (contenido del documento de adeudo), art. 373 (entrega del título o carta de pago, a disposición en un máximo de 10 días), art. 327 (respuesta a reclamos en 15 días corridos) y art. 378 lit. h (el contrato de tarjeta indica "si se admite el pago por anticipado")',
        url: RNRCSF_URL,
        publisher: 'Banco Central del Uruguay',
      },
      {
        label:
          'Comisión por cancelación anticipada de los préstamos al consumo: 2,50 % en dólares, 2,00 % en unidades indexadas y 5,00 % en pesos sobre el saldo de capital adeudado, excluido el capital vencido o que vence antes de 30 días (consultado el 13/9/2026)',
        url: 'https://www.brou.com.uy/personas/prestamos/cancelacion-anticipada',
        publisher: 'BROU',
      },
      {
        label:
          'Términos y condiciones de PreXtamo — al cancelar "en forma anticipada y total" se bonifica "el 100% de los intereses a vencer"; con varios préstamos, cancelación total y conjunta; sin nuevos gastos fijos de concesión dentro de 60 días',
        url: PREXTAMO_TYC_URL,
        publisher: 'Prex / Floder S.A.',
      },
    ],
  },
  {
    slug: 'me-compraron-la-deuda-uruguay',
    title: 'Me compraron la deuda: ¿a quién le pago en Uruguay?',
    description:
      'Si el banco o la financiera vendió tu deuda: no necesitan tu permiso, pero sí notificarte. Qué puede cobrarte el comprador y qué pasa con la prescripción y el Clearing.',
    tag: 'CESIÓN',
    updatedAt: '2026-09-13',
    sections: [
      {
        heading: '¿Te la vendieron o te la mandaron a cobrar?',
        body: 'Detrás del mismo mensaje de un estudio jurídico puede haber dos situaciones distintas, y la Unidad Defensa del Consumidor las separa así: el acreedor original puede entregar la deuda a otra empresa para que gestione la cobranza, "pero también puede vender la misma a otro acreedor (cartera cedida)". En el primer caso el acreedor sigue siendo el banco o la financiera, y el estudio actúa en su nombre. En el segundo, el crédito cambió de dueño: eso, en el Código Civil, se llama cesión de créditos. La diferencia define a quién le pagás, quién puede firmarte que la deuda quedó saldada y a quién le reclamás si algo sale mal. Por eso la primera pregunta, antes de discutir montos, es siempre la misma: si gestionan por cuenta del acreedor o si compraron el crédito. Y la respuesta la querés por escrito, con el nombre de la empresa que hoy es la acreedora.',
        links: [
          { label: 'Te llama un estudio de cobranza', to: '/guias/estudio-de-cobranza-uruguay' },
        ],
      },
      {
        heading: '¿Necesitaban tu permiso para venderla?',
        body: 'No. La cesión es un contrato entre el acreedor que vende y el que compra, y el Código Civil no pide tu consentimiento para que exista. Lo que regula es desde cuándo te afecta. El artículo 1758 dice que "la cesión de un crédito es ineficaz en cuanto al deudor, mientras no se le notifique y la consienta o renueve su obligación en favor del cesionario", y aclara que cualquiera de esas diligencias te vincula con el nuevo acreedor y te impide pagarle lícitamente a otro. Hasta que eso pase, un pago al acreedor original sigue siendo válido. Hay además un detalle que conviene revisar en lo que firmaste: algunos contratos traen tu consentimiento por adelantado. Los términos de PreXtamo, por ejemplo, dicen que el prestatario "desde ya acepta expresamente la cesión" que el prestamista pueda hacer, y que alcanza con comunicársela a su correo electrónico. Si tu contrato tiene una cláusula así, la notificación puede ser mucho más simple que la que el Código prevé por defecto.',
      },
      {
        heading: 'La notificación, y los tres días que casi nadie mira',
        body: 'Cuando no hay una cláusula especial, el artículo 1757 del Código Civil dice cómo se notifica: "con exhibición del título, que llevará anotado el traspaso del derecho con la designación del cesionario y bajo la firma del cedente". Es decir, el documento de la deuda con la constancia de a quién se transfirió, firmada por quien la vendió. Un mensaje que diga "compramos su deuda" sin nada de eso no es lo mismo. Una vez notificado, corre un plazo corto: el artículo 1759 establece que si no querés reconocer al cesionario como acreedor y pensás oponer una excepción que no resulte de la misma naturaleza del crédito, tenés que hacer conocer tu negativa "dentro de tres días" contados desde la notificación; pasados esos tres días, se supone que consentiste la cesión. La consecuencia práctica es simple: si recibís una notificación formal y tenés algo que discutir, contestá por escrito enseguida y guardá la constancia de que lo hiciste.',
      },
      {
        heading: '¿El que compró puede cobrarte más que el banco?',
        body: 'El comprador no adquiere una deuda nueva: adquiere la misma, con sus condiciones y sus defensas. El artículo 1760 del Código Civil dice que podés oponerle al cesionario "todas las excepciones que habría podido oponer al cedente, aun las meramente personales", salvo que hayas consentido la cesión. Ojo con las cláusulas de aceptación anticipada como la de PreXtamo, que se presentan como tu consentimiento expreso: antes de dar por hecho que conservás todas tus defensas, releé esa cláusula. Si pagaste cuotas, si hay un error de cálculo o si la deuda ya prescribió, eso viaja con el crédito. Y el artículo 1761 agrega que la cesión "comprende sus accesorios, como las fianzas, prendas, hipotecas o privilegios": si alguien salió de garante, el comprador también puede reclamarle a esa persona. Que el monto sea mucho mayor que lo que pediste suele explicarse por otra cosa: Defensa del Consumidor recuerda que los intereses moratorios son capitalizables, y que por eso los saldos pueden distanciarse mucho del monto original. Las ofertas de pagar la mitad al contado son una negociación sobre ese saldo, no un regalo; si aceptás una, que diga por escrito que cancela la totalidad de la deuda.',
        links: [{ label: 'Ley de usura: topes de interés', to: '/ley-de-usura-uruguay' }],
      },
      {
        heading: 'La venta no reinicia la prescripción, pero tus respuestas sí pueden',
        body: 'Como la cesión transfiere el mismo crédito, el plazo de prescripción que venía corriendo desde que la deuda se volvió exigible sigue corriendo: la venta en sí no lo pone en cero. Lo que puede reiniciarlo es lo mismo que con el acreedor original: que vos reconozcas la deuda, por ejemplo firmando un convenio o pagando una cuota, o que te notifiquen una demanda. Por eso conviene desconfiar de un plan de pagos cómodo sobre una deuda muy vieja: además de lo que cuesta, puede ser el gesto que reinicia el reloj. Antes de aceptar cualquier cosa, sacá la cuenta de cuándo venció la primera cuota impaga y fijate si en el medio hubo algún reconocimiento tuyo o alguna demanda notificada. La guía sobre cuándo prescribe una deuda privada tiene los plazos con su artículo al lado y la lista de lo que corta el reloj, que es la misma para el banco que para quien le compró el crédito.',
        links: [
          {
            label: 'Cuándo prescribe una deuda privada',
            to: '/guias/cuando-prescribe-una-deuda-uruguay',
          },
        ],
      },
      {
        heading: 'Por qué la deuda puede desaparecer del BCU y seguir en el Clearing',
        body: 'Es una de las sorpresas más comunes: consultás la Central de Riesgos del Banco Central y la deuda ya no está, o figura por un monto mínimo, pero el reclamo sigue. La explicación está en quién informa a cada base. A la Central de Riesgos le envían información mensualmente las instituciones de intermediación financiera, las empresas administradoras de crédito y las empresas de servicios financieros; un comprador de carteras que no sea una de ellas no reporta ahí. El Clearing, en cambio, es una base privada regulada por la Ley 18.331, que registra lo que le informa el acreedor. Para saber qué dice de vos tenés derecho de acceso: la ley lo hace gratuito a intervalos de seis meses y obliga a entregar la información dentro de los cinco días hábiles. Y cuando pagues, el acreedor tiene cinco días hábiles para comunicar la cancelación y la base, tres días hábiles para actualizarla; el registro queda, con la mención de que se pagó, hasta cinco años.',
        links: [{ label: 'Cómo salir del Clearing', to: '/salir-del-clearing' }],
      },
    ],
    steps: [
      {
        name: 'Confirmá con el acreedor original',
        text: 'Escribile al banco o a la financiera y preguntá si vendió el crédito, a quién y en qué fecha, o si lo tiene en gestión de cobranza.',
      },
      {
        name: 'Pedí la constancia de la cesión',
        text: 'Solicitá la notificación con el documento de la deuda y el traspaso firmado por quien la vendió, o la cláusula de tu contrato que prevé otra forma de aviso.',
      },
      {
        name: 'Pedí el saldo desglosado',
        text: 'Capital, intereses compensatorios, intereses de mora, cargos y pagos imputados, con sus fechas, para compararlo con lo que ya pagaste.',
      },
      {
        name: 'Revisá tus informes',
        text: 'Pedí tu informe en la base de datos privada y consultá la Central de Riesgos del Banco Central para ver quién figura como acreedor y por cuánto.',
      },
      {
        name: 'Pagá sólo contra un acuerdo escrito',
        text: 'El acuerdo tiene que decir que el pago cancela toda la deuda; pagá a la cuenta de la empresa acreedora y guardá el recibo y la carta de pago.',
      },
    ],
    faqs: [
      {
        q: 'Me escribió un estudio diciendo que compró mi deuda del banco, ¿es legal?',
        a: 'Vender créditos está previsto en el Código Civil, que regula la cesión y no exige el consentimiento del deudor. Lo que sí exige es que la cesión se te notifique o que la aceptes para que tenga efecto frente a vos (art. 1758), así que pedí la constancia antes de pagar.',
      },
      {
        q: '¿Le pago al banco o a la empresa que compró la deuda?',
        a: 'Hasta que te notifican la cesión o la aceptás, pagarle al acreedor original es válido; después, tenés que pagarle al nuevo acreedor (art. 1758 del Código Civil). Confirmá con el banco si vendió el crédito y a quién antes de transferir.',
      },
      {
        q: '¿Pueden cobrarme más de lo que le debía al banco?',
        a: 'El comprador recibe el mismo crédito, con las mismas condiciones, y salvo que hayas consentido la cesión podés oponerle las mismas defensas que tenías contra el banco (art. 1760 del Código Civil). El saldo puede haber crecido por intereses moratorios, que son capitalizables, pero no por el hecho de la venta.',
      },
      {
        q: 'Si le pago a la empresa que compró mi deuda, ¿salgo del Clearing?',
        a: 'El registro no se borra en el acto: pasa a figurar como cancelado, con esa mención, por un máximo de cinco años (Ley 18.331, art. 22). El acreedor tiene cinco días hábiles para comunicar el pago y la base, tres para actualizarlo.',
      },
      {
        q: '¿La venta de la deuda reinicia la prescripción?',
        a: 'No: el crédito es el mismo y el plazo sigue corriendo desde que la deuda fue exigible. Lo que sí lo reinicia es que reconozcas la deuda ante el comprador, por ejemplo firmando un convenio o pagando una cuota, o que te notifiquen una demanda.',
      },
    ],
    related: [
      { label: 'Te llama un estudio de cobranza', to: '/guias/estudio-de-cobranza-uruguay' },
      { label: 'Saldar y negociar deudas', to: '/saldar-deudas-uruguay' },
      { label: 'Cuándo prescribe una deuda', to: '/guias/cuando-prescribe-una-deuda-uruguay' },
      {
        label: 'Cómo evitar estafas financieras',
        to: '/guias/como-evitar-estafas-financieras-uruguay',
      },
    ],
    sources: [
      {
        label:
          'Código Civil, arts. 1757 y 1758 — la notificación se hace "con exhibición del título, que llevará anotado el traspaso del derecho con la designación del cesionario y bajo la firma del cedente"; la cesión "es ineficaz en cuanto al deudor, mientras no se le notifique y la consienta"',
        url: 'https://www.impo.com.uy/bases/codigo-civil/16603-1994/1757',
        publisher: 'IMPO',
      },
      {
        label:
          'Código Civil, arts. 1759 a 1761 — tres días desde la notificación para hacer conocer la negativa; el deudor puede oponer al cesionario "todas las excepciones que habría podido oponer al cedente"; la cesión "comprende sus accesorios, como las fianzas"',
        url: 'https://www.impo.com.uy/bases/codigo-civil/16603-1994/1760',
        publisher: 'IMPO',
      },
      {
        label:
          'Preguntas frecuentes de la Unidad Defensa del Consumidor — gestión de cobranza o venta a otro acreedor ("cartera cedida"), el Clearing como base privada regulada por la Ley 18.331 e intereses moratorios capitalizables',
        url: UDC_FAQ_URL,
        publisher: 'Unidad Defensa del Consumidor / MEF',
      },
      {
        label:
          'Ley 18.331, arts. 14 y 22 — acceso gratuito "a intervalos de seis meses" con respuesta en cinco días hábiles; la deuda cancelada queda registrada hasta cinco años con esa mención; cinco días hábiles para comunicar el pago y tres para actualizar',
        url: 'https://www.impo.com.uy/bases/leyes/18331-2008',
        publisher: 'IMPO',
      },
      {
        label:
          'Ayuda de la consulta a la Central de Riesgos — informan mensualmente las instituciones de intermediación financiera, las empresas administradoras de crédito y las empresas de servicios financieros',
        url: 'https://consultadeuda.bcu.gub.uy/consultadeuda/ayuda.html',
        publisher: 'Banco Central del Uruguay',
      },
      {
        label:
          'Términos y condiciones de PreXtamo, cláusula de cesión de crédito — el prestatario "desde ya acepta expresamente la cesión" y basta con comunicársela a su correo electrónico',
        url: PREXTAMO_TYC_URL,
        publisher: 'Prex / Floder S.A.',
      },
    ],
  },
  {
    slug: 'saldo-a-favor-tarjeta-de-credito-uruguay',
    title: 'Saldo a favor en la tarjeta de crédito: cómo funciona',
    description:
      'Si pagás la tarjeta antes del cierre o de más, queda a favor y se descuenta al cierre. Qué pasa con el disponible, el seguro, el débito automático y la devolución.',
    tag: 'TARJETA',
    updatedAt: '2026-09-13',
    sections: [
      {
        heading: 'Pagué antes del cierre y la plata quedó a favor: ¿se pierde?',
        body: 'No se pierde. Antes del cierre todavía no existe el estado de cuenta que querías pagar, así que el pago entra como un crédito a tu favor y se compensa cuando el emisor cierra el período. Por eso ves los consumos por un lado y el pago por otro, sin descontarse, hasta esa fecha. En OCA, por ejemplo, las fechas de cierre posibles son el 3, el 11, el 18 o el 26, y el estado de cuenta está disponible 48 horas después del cierre en Mi Cuenta y en la app; recién ahí aparece la resta. El contrato de OCA, además, autoriza a compensar la deuda del titular "con otros saldos acreedores que él mantenga con OCA". Si pagaste más de lo que debías, la diferencia queda para los consumos siguientes. Lo que conviene revisar en ese primer estado de cuenta es que el pago figure con su fecha y su monto: el Banco Central exige que el estado de cuenta indique el monto y la fecha del último pago realizado cuando hay saldos pendientes.',
      },
      {
        heading: 'La regla está en tu contrato, y el Banco Central obliga a escribirla',
        body: 'Cómo se aplica un pago que no coincide con el total no queda a criterio de quien te atiende. La Recopilación de normas del Banco Central exige que el contrato de tarjeta estipule "la forma de imputación de los pagos parciales" y "la indicación de si se admite el pago por anticipado y, en caso afirmativo, de sus condiciones". Si tenés dudas sobre qué va a pasar con un pago adelantado, la respuesta tiene que estar ahí. Un ejemplo de por qué vale la pena leerla: el contrato de OCA prevé que, si tenés deudas en pesos y en dólares y pagás sólo en una moneda, OCA puede imputar parte del pago al pago mínimo de la moneda que no pagaste, y esa imputación se entiende aceptada si no te oponés dentro de diez días. Para quien carga pesos antes de un viaje pensando en los gastos en dólares, ese detalle cambia la cuenta. La misma norma del Banco Central obliga a que el estado de cuenta muestre el límite disponible y el monto del pago contado, así que ahí podés controlar el resultado.',
      },
      {
        heading: '¿Pagar antes sube el disponible?',
        body: 'El límite de crédito pactado no cambia por pagar antes: lo que se mueve es el disponible, que es la parte del límite que todavía no usaste. El BROU lo explica en su asistencia: desde eBROU podés hacer pagos totales, mínimos o parciales "e incluso adelantar pagos", que "liberan disponible contado en el momento y permiten seguir realizando compras en caso de que hayas alcanzado el límite de compra contado". Esa es la utilidad real de adelantar un pago: si estás cerca del tope, recuperás margen sin esperar al cierre. Otra cosa distinta es si un saldo a favor te permite gastar por encima del límite, por ejemplo cargando plata antes de una compra grande o de un viaje. Eso no lo encontramos publicado como regla general: depende de cada emisor, y conviene preguntarlo por escrito antes de contar con ello, porque descubrirlo con una compra rechazada en el exterior es la peor forma de enterarse.',
        links: [{ label: 'Tarjetas de crédito en Uruguay', to: '/tarjetas-de-credito-uruguay' }],
      },
      {
        heading: 'La trampa del débito automático',
        body: 'Si tenés la tarjeta adherida a débito automático, un pago manual en el momento equivocado no te ahorra nada: te deja plata a favor. El BROU lo advierte con todas las letras: "En caso de realizar pagos posteriores al cierre y anteriores al vencimiento, estos ingresaran en la cuenta/tarjeta pero no se descontarán del monto del débito automático". Es decir, el débito se ejecuta por lo que marcó el estado de cuenta al cierre, y lo que pagaste a mano en el medio queda como saldo a favor para el período siguiente. No perdés la plata, pero la tenés inmovilizada un mes, y si la necesitabas para otra cosa el problema es de liquidez. Si querés pagar a mano, la ventana que evita el doble pago es antes del cierre, para que el pago entre en la cuenta de ese estado. Y si ya te pasó, el saldo debería aparecer restando en el próximo estado de cuenta; si no aparece, reclamalo por escrito.',
      },
      {
        heading: '¿Pagar antes del cierre te ahorra el seguro sobre saldo?',
        body: 'Es la pregunta de fondo de mucha gente que adelanta pagos, y la respuesta depende de sobre qué saldo se calcula el seguro de vida de tu tarjeta. El Banco Central obliga a las instituciones a informar "cómo se calculará el monto del seguro a pagar" y, cuando la prima es mensual, si el porcentaje "se aplicará a la totalidad de lo adeudado, incluidos los créditos a vencer". En la cartilla de tarjetas de Itaú vigente a septiembre de 2026, por ejemplo, el monto asegurado es el saldo contado del estado de cuenta más las cuotas a vencer o futuras, calculado al procesar el cierre, y la prima es del 3 por mil. Con una base así, si tenés compras en cuotas pendientes, al cierre sigue habiendo saldo asegurado aunque hayas pagado todo lo del mes, y el seguro se cobra igual. Con esa misma fórmula, en cambio, un cierre sin saldo y sin cuotas daría una base de cero. Cada emisor tiene su fórmula: buscala en la cartilla antes de organizar tus pagos alrededor del seguro.',
      },
      {
        heading: '¿El saldo a favor rinde o cuesta algo?',
        body: 'En el contrato de OCA y en la cartilla de Itaú que revisamos no aparece ni un rendimiento por tener saldo a favor ni un cargo por mantenerlo. O sea que, en el mejor de los casos, esa plata vale lo mismo que el día que la cargaste, y en pesos la inflación la va achicando mientras espera. Tampoco te ahorra intereses: si pagás el total del estado de cuenta antes del vencimiento no hay intereses de financiación que ahorrar, y el estado de cuenta tiene que mostrarte el monto del pago contado, que es el que cancela toda la deuda. Por eso el saldo a favor tiene sentido como herramienta puntual y no como lugar para guardar plata: para recuperar disponible cuando estás cerca del límite, para no depender de un vencimiento mientras viajás o para cubrir de antemano una compra grande. Si la plata va a estar quieta varios meses, rinde más en una cuenta que pague algo.',
        links: [{ label: 'Cuentas remuneradas en Uruguay', to: '/cuenta-remunerada-uruguay' }],
      },
      {
        heading: 'Cómo pedir que te devuelvan el saldo a favor',
        body: 'Si el saldo a favor es grande o no pensás volver a usar la tarjeta, podés pedir que te lo devuelvan. No encontramos una norma del Banco Central que fije un plazo específico para devolver un saldo a favor de tarjeta, así que el camino es el del contrato y, si hace falta, el del reclamo. Pedilo por escrito, indicando el monto, la fecha del pago que lo generó y la cuenta en la que querés recibirlo, y guardá la constancia. Si la institución no lo resuelve en el momento, el procedimiento de reclamos que exige el Banco Central le da hasta quince días corridos para responder, prorrogables por única vez por otros quince con aviso fundado, y si la respuesta no te conforma podés acudir a la Superintendencia de Servicios Financieros. Si además vas a dar de baja la tarjeta, el contrato tiene que decir cómo te devuelven el cargo anual o cualquier otro concepto cobrado por adelantado por los meses no usados: pedí que esa devolución y la del saldo a favor se liquiden juntas.',
        links: [
          { label: 'A quién le reclamo según el problema', to: '/a-quien-le-reclamo-uruguay' },
        ],
      },
    ],
    faqs: [
      {
        q: 'Si cargo saldo en OCA antes del cierre, ¿se descuenta después?',
        a: 'Sí: el pago queda a tu favor y se compensa con los consumos cuando cierra el período, y el estado de cuenta de OCA está disponible 48 horas después del cierre. Si pagaste más de lo que debías, la diferencia queda para los consumos siguientes.',
      },
      {
        q: 'Pagué la tarjeta dos veces, ¿pierdo la plata?',
        a: 'No. El pago de más queda como saldo a favor y se aplica al próximo estado de cuenta, o podés pedir por escrito que te lo devuelvan. Si la institución no lo resuelve, tiene hasta quince días corridos para responder un reclamo formal.',
      },
      {
        q: '¿Pagar antes del cierre evita el seguro de saldo deudor?',
        a: 'Depende de cómo calcula el seguro tu emisor. En Itaú, por ejemplo, la base es el saldo contado más las cuotas a vencer al cierre, así que con compras en cuotas pendientes el seguro se cobra aunque hayas adelantado el pago del mes.',
      },
      {
        q: '¿Si pago antes puedo volver a usar el crédito?',
        a: 'En el BROU sí: publica que los pagos adelantados desde eBROU liberan disponible contado en el momento. En otros emisores, y para gastar por encima del límite con un saldo a favor, preguntá antes: depende de cada uno.',
      },
      {
        q: 'Tengo débito automático y pagué a mano, ¿me van a debitar igual?',
        a: 'Puede pasar. El BROU advierte que los pagos hechos después del cierre y antes del vencimiento no se descuentan del monto del débito automático: se debita lo del estado de cuenta y lo que pagaste queda a favor para el mes siguiente.',
      },
    ],
    related: [
      { label: 'Tarjetas de crédito en Uruguay', to: '/tarjetas-de-credito-uruguay' },
      { label: 'Salir de las deudas de tarjeta', to: '/guias/salir-de-deudas-de-tarjeta-uruguay' },
      {
        label: 'Débito o crédito: cuándo usar cada una',
        to: '/guias/tarjeta-debito-vs-credito-uruguay',
      },
    ],
    sources: [
      {
        label:
          'Recopilación de Normas del BCU — art. 378 (el contrato de tarjeta estipula "la forma de imputación de los pagos parciales", "si se admite el pago por anticipado" y, si cancelás la tarjeta, cómo se devuelve lo cobrado por adelantado), art. 379 (el estado de cuenta muestra el límite disponible, el pago contado y el último pago), art. 350.1 (cómo se calcula el seguro de saldo deudor) y art. 327 (respuesta a reclamos en 15 días corridos)',
        url: RNRCSF_URL,
        publisher: 'Banco Central del Uruguay',
      },
      {
        label:
          'Asistencia BROU, "¿Cómo pagar el estado de cuenta de Tarjetas de Crédito?" — los pagos adelantados "liberan disponible contado en el momento"',
        url: 'https://asistencia.brou.com.uy/preguntas',
        publisher: 'BROU',
      },
      {
        label:
          'Asistencia BROU, débito automático — los pagos posteriores al cierre y anteriores al vencimiento "no se descontarán del monto del débito automático"',
        url: 'https://www.asistencia.brou.com.uy/preguntas/categoria/debito-automatico',
        publisher: 'BROU',
      },
      {
        label:
          'Condiciones generales de la tarjeta OCA (protocolizadas en mayo de 2026) — compensación de la deuda "con otros saldos acreedores" e imputación de un pago en una sola moneda al mínimo de la otra, aceptada si no hay oposición en 10 días',
        url: 'https://www.oca.com.uy/download/contratoOCA.pdf',
        publisher: 'OCA',
      },
      {
        label:
          'Preguntas frecuentes de la tarjeta OCA — fechas de cierre 3, 11, 18 o 26 y estado de cuenta disponible 48 horas después del cierre',
        url: 'https://oca.uy/tarjeta-de-credito/preguntas-frecuentes.html',
        publisher: 'OCA',
      },
      {
        label:
          'Cartilla de tarjetas de crédito de Itaú — el seguro de vida cubre el saldo contado más las cuotas a vencer al cierre, con una prima del 3 por mil (consultada el 13/9/2026)',
        url: 'https://www.itau.com.uy/inst/aci/docs/Cartilla_tarjetas_de_credito.pdf',
        publisher: 'Itaú',
      },
    ],
  },
]
