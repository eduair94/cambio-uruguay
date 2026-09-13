// Guías de trámites personales minadas de Reddit: ciudadanía legal (hilos 1uitt4o y 1syqvbd),
// cédula para argentinos por la vía Mercosur (1ouwdt1 y la cola de demanda), casamiento civil y
// testigos (1vc0k8a, 1k5nfk5) y cuánto guardar comprobantes (1l479oh). La guía del certificado de
// antecedentes judiciales se sacó antes de publicar: otra sesión publicó el mismo día la página
// /certificado-de-antecedentes-judiciales-uruguay (4dbf17e3) y las dos competían por la consulta. Todo verificado el 2026-09-13 contra IMPO (Constitución
// arts. 74 a 81; leyes 16.021, 18.250, 19.254, 18.091 y 19.791; Código Civil arts. 91, 112, 1216,
// 1222, 1462 y 1938; Código Tributario art. 38; decretos 501/978, 208/013 y 17/020; Manual de
// Ciudadanía de la Corte Electoral; tarifas del Diario Oficial), fichas de gub.uy y BPS. No
// publica plazo de prescripción para UTE, OSE ni Antel: no hay norma abierta.
import type { Guide } from './guides'

export const tramitesGuides: readonly Guide[] = [
  {
    slug: 'ciudadania-legal-uruguaya',
    title: '¿Cómo obtener la ciudadanía uruguaya? Requisitos y plazos',
    description:
      'La ciudadanía legal se pide en la Corte Electoral con 3 años de residencia habitual si tenés familia constituida o 5 si no; es gratis y casarte no te la da directo.',
    tag: 'CIUDADANÍA',
    updatedAt: '2026-09-13',
    sections: [
      {
        heading: '¿Ciudadanía natural, legal o nacionalidad? No son lo mismo',
        body: 'Antes de juntar un solo papel conviene saber en qué casillero estás, porque cada uno tiene su propio camino. La Constitución llama ciudadanos naturales a quienes nacieron en el territorio y también a los hijos de padre o madre orientales nacidos afuera, "por el hecho de avecinarse en el país e inscribirse en el Registro Cívico" (art. 74). La ciudadanía legal es otra cosa: la del artículo 75, pensada para extranjeros que se radican acá. Y la nacionalidad es una tercera categoría, que define la Ley 16.021: son nacionales los nacidos en el territorio y sus hijos, sea cual sea el lugar de nacimiento, y los nietos nacidos afuera son ciudadanos naturales. La ciudadanía legal no aparece en esa lista, y eso tiene consecuencias concretas. El artículo 81 de la Constitución dice que la nacionalidad no se pierde ni aun naturalizándose en otro país, mientras que "la ciudadanía legal se pierde por cualquier otra forma de naturalización ulterior".',
      },
      {
        heading: 'Si tu padre o tu madre nació en Uruguay, este no es tu trámite',
        body: 'Es la confusión más frecuente: alguien nacido en Brasil o en Argentina, con padre uruguayo, pregunta cómo hacerse uruguayo y le ofrecen el camino de la residencia. No lo necesita. Por el artículo 2 de la Ley 16.021 ya tiene la nacionalidad, y por el artículo 74 de la Constitución es ciudadano natural en cuanto se avecina en el país y se inscribe en el Registro Cívico. La misma ley dice qué cuenta como avecinarse: entre otros actos, permanecer más de tres meses, alquilar o comprar una vivienda para habitarla, tomar un empleo o cursar al menos dos meses en un centro de estudios, y la Corte Electoral tiene que constatar como mínimo dos (art. 5). Eso se acredita con el certificado de avecinamiento de la Corte Electoral. Su Manual de Ciudadanía pide tu partida de nacimiento, inscripta en el Registro de Estado Civil o la de tu país apostillada o visada, la de tu padre o madre uruguayo, un documento de los tres meses anteriores que pruebe el avecinamiento y la cédula de identidad, así que la cédula va primero. El certificado vale sólo para el período inscripcional en que se tramita, y con él te inscribís en el Registro Cívico.',
        links: [
          {
            label: 'Cuánto sale la cédula de identidad',
            to: '/cuanto-sale-la-cedula-de-identidad-uruguaya',
          },
          { label: 'Cuánto sale el pasaporte uruguayo', to: '/cuanto-sale-el-pasaporte-uruguayo' },
        ],
      },
      {
        heading: 'Tres años con familia, cinco sin ella: qué pide el artículo 75',
        body: 'El artículo 75 reconoce el derecho a la ciudadanía legal a los extranjeros "de buena conducta" que tengan "algún capital en giro o propiedad en el país" o profesen "alguna ciencia, arte o industria", con tres años de residencia habitual si tienen familia constituida en la República y cinco si no la tienen. Hay una tercera vía, la gracia especial de la Asamblea General por servicios notables o méritos relevantes, que es excepcional. La ficha de la Corte Electoral agrega las condiciones prácticas: acreditar que tenés 18 años, comprender y expresarte en español ("de no ser así no se dará curso al trámite") y que la residencia sea habitual. Esto último tiene una regla concreta que conviene leer dos veces: "Las salidas del país no pueden superar los 6 meses seguidos", y si las superan, el plazo de tres o cinco años "comenzará de cero" desde que volvés a entrar a Uruguay. Un semestre largo afuera te puede costar años de espera.',
      },
      {
        heading: 'Casarte con un uruguayo no te hace uruguayo',
        body: 'Uruguay no da la ciudadanía por matrimonio. Casarte con una persona uruguaya, o tener una unión concubinaria reconocida, hace dos cosas más modestas. La primera es que puede ayudarte a acreditar familia constituida, que es lo que baja el plazo del artículo 75 de cinco a tres años. Pero la libreta sola no alcanza: el Manual de Ciudadanía de la Corte Electoral dice que tiene familia constituida "quien tenga en la República cónyuge, concubino declarado judicialmente, hijos, padres o hermanos a su cargo", y que la prueba abarca el parentesco, que esos familiares residan en el país y "el hecho de encontrarse estos a cargo del solicitante". La definición no pide que el cónyuge sea uruguayo. La segunda es que te abre la residencia: el artículo 33 de la Ley 18.250 da la categoría de residentes permanentes a "los cónyuges, concubinos, padres y hermanos de uruguayos bastando que acrediten dicho vínculo". Ese paso no se saltea, porque la ficha de la carta pide el certificado de residencia de Migración. Lo que el casamiento no hace es bajar el plazo de residencia habitual por debajo de los tres años.',
        links: [
          { label: 'Residencia legal en Uruguay', to: '/mudarme-a-uruguay-residencia' },
          { label: 'Casarse por civil en Uruguay', to: '/guias/casarse-por-civil-uruguay' },
        ],
      },
      {
        heading: 'Qué se presenta y quiénes pueden ser tus testigos',
        body: 'La ficha de la Corte Electoral ordena la prueba en bloques. La nacionalidad y la edad se acreditan con la partida de nacimiento, inscripta en el Libro de Extranjeros del Registro Civil o del país de origen apostillada o visada, o con el pasaporte. El ingreso y la residencia, con el certificado de residencia y el de movimientos migratorios que expide la Dirección Nacional de Migración. Los medios de vida durante los tres o cinco años, con constancias del BPS como la historia laboral, el certificado de jubilación o la constancia de empresa unipersonal, o con certificados de cajas profesionales; estudiantes, religiosos y deportistas tienen constancias propias. El certificado de antecedentes judiciales no lo pedís vos: la Sección Ciudadanía Legal lo recaba directamente. Los testigos no van el primer día; se les fija una audiencia después. Tienen que ser mayores de 25 años, presentar credencial cívica y conocerte hace tres o cinco años según tu caso, y no pueden ser familiares, empleados o empleadores, militares, policías en actividad ni funcionarios electorales.',
        table: {
          headers: ['Qué hay que probar', 'Con qué', 'Quién lo expide'],
          rows: [
            [
              'Nacionalidad y edad',
              'Partida de nacimiento o pasaporte',
              'Registro Civil, o el país de origen con apostilla o visado',
            ],
            [
              'Ingreso y residencia habitual',
              'Certificado de residencia y de movimientos migratorios',
              'Dirección Nacional de Migración',
            ],
            [
              'Medios de vida por 3 o 5 años',
              'Historia laboral, jubilación o constancia de empresa unipersonal',
              'BPS o la caja profesional que corresponda',
            ],
            [
              'Buena conducta',
              'Certificado de antecedentes judiciales',
              'Lo recaba la propia Corte Electoral',
            ],
          ],
        },
      },
      {
        heading: 'Dónde se hace, cuánto cuesta y cuánto demora',
        body: 'En Montevideo se tramita en la Sección Ciudadanía Legal de la Corte Electoral, Ituzaingó 1467, planta baja, de lunes a viernes de 10:00 a 14:30. Se agenda por la web, y hay un dato que ahorra frustración: "Los cupos de la agenda web se liberan todos los lunes hábiles alrededor de la hora 10:00 am". En el interior se hace en las Oficinas Electorales Departamentales, casi todas sin agenda previa; en Canelones sólo atiende la oficina de la ciudad de Canelones, no las de Pando, Las Piedras o Ciudad de la Costa. El trámite no tiene costo, según la ficha actualizada el 27 de mayo de 2026: lo que sí pagás son los papeles que juntes por tu lado, como apostillas o traducciones. Lo que la ficha no publica es cuánto demora la resolución, y no lo vamos a inventar. El estado del expediente se consulta en la oficina electoral de tu departamento.',
      },
      {
        heading: 'Después de la carta: tres años para votar y lo que la puede hacer caer',
        body: 'La carta de ciudadanía no te da todos los derechos el mismo día. El artículo 75 establece que los derechos inherentes a la ciudadanía legal no pueden ejercerse hasta tres años después de otorgada la carta, y la ficha lo traduce en un paso concreto: a los tres años se presenta la carta para obtener la credencial cívica. Aun sin ciudadanía, el artículo 78 permite votar a extranjeros de buena conducta, con familia constituida, con capital, propiedad o profesión en el país y quince años de residencia habitual. La ciudadanía legal también se puede suspender: el artículo 80 incluye, sólo para ciudadanos legales, la falta superviniente de la buena conducta que exigió el 75. Y se pierde si después te naturalizás en otro país (art. 81). Un cambio reciente ayuda en los viajes: desde el 23 de abril de 2025 el pasaporte uruguayo rotula el campo como "Nacionalidad/Ciudadanía" y usa el código URY también para los ciudadanos legales.',
      },
    ],
    steps: [
      {
        name: 'Definí si tu vía es natural o legal',
        text: 'Si tu padre o tu madre nació en Uruguay, tu camino es el certificado de avecinamiento y la ciudadanía natural, no la carta de ciudadanía legal.',
      },
      {
        name: 'Regularizá la residencia ante Migración',
        text: 'La Corte Electoral pide los certificados de residencia y de movimientos migratorios para probar los tres o cinco años.',
      },
      {
        name: 'Cuidá las salidas del país',
        text: 'Ninguna salida puede superar los seis meses seguidos; si la supera, el plazo de residencia vuelve a cero desde tu reingreso.',
      },
      {
        name: 'Juntá la prueba de medios de vida',
        text: 'Pedí al BPS la historia laboral o la constancia que corresponda a tu actividad, que cubra los tres o cinco años que invocás.',
      },
      {
        name: 'Agendá en la Corte Electoral',
        text: 'En Montevideo los cupos web se liberan los lunes hábiles cerca de las 10:00; en el interior, casi todas las oficinas atienden sin agenda.',
      },
      {
        name: 'Presentá los testigos y esperá la carta',
        text: 'Los testigos van a una audiencia posterior con su credencial cívica; a los tres años de otorgada la carta tramitás tu credencial.',
      },
    ],
    faqs: [
      {
        q: '¿Cómo puedo convertirme en uruguayo?',
        a: 'Depende de tu origen. Si tu padre o tu madre nació en Uruguay, ya tenés la nacionalidad (Ley 16.021, art. 2) y te hacés ciudadano natural al avecinarte e inscribirte en el Registro Cívico. Si no, el camino es la ciudadanía legal del artículo 75 de la Constitución: residencia habitual de tres años con familia constituida o cinco sin ella, buena conducta y medios de vida, tramitada en la Corte Electoral.',
      },
      {
        q: 'Si me caso con un uruguayo, ¿me dan la ciudadanía?',
        a: 'No. Uruguay no otorga la ciudadanía por matrimonio. El casamiento puede servir para acreditar familia constituida, que baja el plazo de residencia habitual de cinco a tres años (art. 75 de la Constitución), si tu cónyuge reside en el país y está a tu cargo, como pide el Manual de Ciudadanía de la Corte Electoral. Además le da al cónyuge extranjero la categoría de residente permanente (art. 33 de la Ley 18.250).',
      },
      {
        q: '¿Cuánto sale la carta de ciudadanía?',
        a: 'Nada: la ficha del trámite en gub.uy dice que no tiene costo, en su versión actualizada el 27 de mayo de 2026. Pagás, en todo caso, los documentos que tengas que conseguir por tu cuenta, como apostillas, traducciones o certificados.',
      },
      {
        q: '¿La ciudadanía legal me da la nacionalidad uruguaya?',
        a: 'No según el texto vigente: la Ley 16.021 reconoce la nacionalidad a los nacidos en el territorio y a sus hijos, y la ciudadanía legal no está en esa lista. La diferencia se nota en el artículo 81 de la Constitución: la nacionalidad no se pierde al naturalizarse en otro país, pero la ciudadanía legal sí.',
      },
      {
        q: '¿Cuánto tiempo puedo estar fuera del país mientras junto los años?',
        a: 'La Corte Electoral admite salidas de hasta seis meses seguidos. Si una salida supera ese lapso, el plazo de tres o cinco años comienza de cero cuando volvés a entrar a Uruguay.',
      },
      {
        q: '¿Cuándo puedo votar?',
        a: 'Tres años después de otorgada la carta, cuando la presentás para obtener la credencial cívica (art. 75). Sin ciudadanía, el artículo 78 permite votar a extranjeros con quince años de residencia habitual que cumplan las demás condiciones que fija.',
      },
      {
        q: '¿Cuánto demora el trámite de ciudadanía legal?',
        a: 'La ficha oficial de la Corte Electoral no publica un plazo de resolución. Lo que sí está escrito son los plazos que lo rodean: tres o cinco años de residencia habitual antes de pedirla, y tres años después de la carta para ejercer los derechos.',
      },
    ],
    related: [
      { label: 'Residencia legal en Uruguay', to: '/mudarme-a-uruguay-residencia' },
      { label: 'Cédula uruguaya siendo argentino', to: '/guias/cedula-uruguaya-para-argentinos' },
      { label: 'Casarse por civil en Uruguay', to: '/guias/casarse-por-civil-uruguay' },
      { label: 'Cuánto sale el pasaporte uruguayo', to: '/cuanto-sale-el-pasaporte-uruguayo' },
    ],
    sources: [
      {
        label:
          'Constitución, arts. 74, 75, 78, 80 y 81 — ciudadanía natural de los hijos de orientales que se avecinan; ciudadanía legal con "tres años de residencia habitual" si hay familia constituida y "cinco años" si no; derechos que no se ejercen hasta tres años después de la carta; voto de extranjeros con quince años de residencia; suspensión por falta superviniente de buena conducta; y "La ciudadanía legal se pierde por cualquier otra forma de naturalización ulterior"',
        url: 'https://www.impo.com.uy/bases/constitucion/1967-1967',
        publisher: 'IMPO',
      },
      {
        label:
          'Ley 16.021, arts. 1 a 5 (texto vigente) — son nacionales los nacidos en el territorio y sus hijos "sea cual fuere el lugar de su nacimiento"; los nietos nacidos afuera son ciudadanos naturales (redacción de la Ley 19.362); qué actos cuentan como avecinamiento, entre ellos la permanencia superior a tres meses; y la Corte Electoral debe constatar "como mínimo, dos" de ellos',
        url: 'https://www.impo.com.uy/bases/leyes/16021-1989',
        publisher: 'IMPO',
      },
      {
        label:
          'Carta de ciudadanía (ciudadanía legal uruguaya) — requisitos, testigos mayores de 25 años, "Las salidas del país no pueden superar los 6 meses seguidos", cupos web los lunes hábiles, oficinas y "No tiene costo"; actualizada el 27/05/2026',
        url: 'https://www.gub.uy/tramites/carta-ciudadania-ciudadania-legal-uruguaya',
        publisher: 'Corte Electoral / gub.uy',
      },
      {
        label:
          'Ley 18.250, art. 33 (texto vigente) — son residentes permanentes "los cónyuges, concubinos, padres y hermanos de uruguayos bastando que acrediten dicho vínculo"',
        url: 'https://www.impo.com.uy/bases/leyes/18250-2008/33',
        publisher: 'IMPO',
      },
      {
        label:
          'Manual de Ciudadanía (Circular 11.376 de 2022) — el certificado de avecinamiento de hijos y nietos de orientales, "válido exclusivamente en el período inscripcional en el cual se tramitó", y sus documentos; tiene familia constituida "quien tenga en la República cónyuge, concubino declarado judicialmente, hijos, padres o hermanos a su cargo", con prueba de "el hecho de encontrarse estos a cargo del solicitante"',
        url: 'https://www.impo.com.uy/bases/circulares-corte-electoral/11376-2022?verOriginal=1',
        publisher: 'Corte Electoral / IMPO',
      },
      {
        label:
          'Ministerio del Interior — desde el 23 de abril de 2025 el pasaporte rotula "Nacionalidad/Ciudadanía" y usa el código URY tanto para ciudadanos naturales como legales',
        url: 'https://www.gub.uy/ministerio-interior/comunicacion/noticias/uruguay-actualiza-introduce-cambios-pasaporte-para-mejorar-movilidad',
        publisher: 'Ministerio del Interior',
      },
    ],
  },
  {
    slug: 'cedula-uruguaya-para-argentinos',
    title: 'Cédula uruguaya para argentinos: cómo sacarla y cuánto sale',
    description:
      'Si sos argentino o del Mercosur, te alcanza con acreditar la nacionalidad para la residencia permanente, y con el certificado en trámite ya sacás la cédula.',
    tag: 'MERCOSUR',
    updatedAt: '2026-09-13',
    sections: [
      {
        heading: 'No existe una cédula para argentinos: existe la residencia Mercosur',
        body: 'La cédula uruguaya de un extranjero es la consecuencia de un trámite migratorio, no un trámite en sí. Para un argentino ese trámite es liviano en requisitos por una razón legal: el artículo 33 de la Ley 18.250 da la categoría de residentes permanentes a "los nacionales de los Estados Partes del Mercosur y Estados Asociados que acrediten dicha nacionalidad". El artículo tiene esa forma desde la Ley 19.254 de 2014, y su texto vigente es el que le dio la Ley 20.075 en 2022. La ficha de Migración no pide demostrar un contrato de trabajo ni medios de vida: pide acreditar la nacionalidad y cumplir una base documental corta. Los países que entran por esta vía, según esa ficha, son Argentina, Brasil, Chile, Bolivia, Paraguay, Perú, Ecuador, Colombia, Venezuela, Surinam y Guyana. Esta guía cubre ese camino y la cédula que sale de él. Si no sos del Mercosur, o querés comparar con las otras residencias, la página de residencia legal del sitio las tiene todas.',
        links: [
          {
            label: 'Residencia legal en Uruguay: todas las vías',
            to: '/mudarme-a-uruguay-residencia',
          },
        ],
      },
      {
        heading: 'Qué papeles pide Migración',
        body: 'La ficha de la Residencia Legal Permanente Mercosur, actualizada el 12 de marzo de 2026, pide foto carné, documento de identidad vigente, el certificado de antecedentes penales "a nivel nacional del país de donde residió los últimos 5 años (por más de 6 meses)" y el certificado de vacunas vigente según el Decreto 136/2018. Todo va en original y vigente. Los documentos extranjeros se presentan apostillados o legalizados, salvo los de Brasil, y traducidos por traductor público uruguayo cuando corresponda; los documentos electrónicos que se puedan verificar no necesitan apostilla. Para menores se suman la partida de nacimiento y la autorización expresa de quienes ejercen la patria potestad. Hay un detalle de redacción que puede complicar a quien ya vive acá: el certificado de antecedentes se pide por el país donde residiste los últimos cinco años. Si esos años los pasaste en Uruguay, confirmá con Migración qué certificado te corresponde antes de la audiencia, porque la documentación faltante se recibe en una única instancia.',
      },
      {
        heading: 'Cuánto cuesta en 2026',
        body: 'El arancel de la residencia está en Unidades Indexadas, así que el importe en pesos cambia con la UI, y la ficha aclara además que el valor se reajusta cada semestre. Según la ficha de Migración actualizada el 12 de marzo de 2026, la residencia permanente Mercosur cuesta 557,30 UI; los nacionales de Paraguay y Brasil están exentos por reciprocidad, los argentinos no. Aparte se pagan 55,70 UI por el certificado migratorio que te pide la Dirección Nacional de Identificación Civil, y 225,60 UI por cada permiso de reingreso si salís del país mientras el trámite sigue abierto. La cédula por primera vez cuesta $456 desde el 1 de julio de 2026. Un último costo que no figura en ninguna tabla: si no comparecés a la audiencia en el horario agendado, perdés lo que pagaste.',
        table: {
          headers: ['Concepto', 'Importe', 'Vigencia'],
          rows: [
            [
              'Residencia permanente Mercosur',
              '557,30 UI (Brasil y Paraguay exentos)',
              'Ficha de Migración del 12/03/2026',
            ],
            [
              'Certificado migratorio para la DNIC',
              '55,70 UI',
              'Ficha de Migración del 12/03/2026',
            ],
            [
              'Permiso de reingreso durante el trámite',
              '225,60 UI por cada salida',
              'Ficha de Migración del 12/03/2026',
            ],
            ['Cédula de identidad por primera vez', '$456', 'Desde el 01/07/2026'],
          ],
        },
        links: [
          { label: 'Conversor de unidad indexada', to: '/herramientas/conversor-unidad-indexada' },
          { label: 'Cuánto sale la cédula', to: '/cuanto-sale-la-cedula-de-identidad-uruguaya' },
        ],
      },
      {
        heading: 'La cédula no espera a que salga la residencia',
        body: 'Es lo que más se pregunta cuando alguien llega sin documento uruguayo. No hace falta esperar la resolución: el Documento Nacional de Identidad por primera vez para personas nacidas en el exterior se tramita con el certificado de residencia en trámite que expide Migración. Además te piden el testimonio de tu partida de nacimiento inscripta en la sección extranjeros del Registro Civil; si todavía no está inscripta, la ficha admite expedir un documento provisorio con el certificado de residencia y la partida traducida y apostillada, o un certificado consular. Esa cédula es provisoria por norma: el artículo 15 del Decreto 501/978 dice que al extranjero con el trámite de Migración sin terminar se le expide "con carácter de provisoria", y el Decreto 208/013 fijó su vigencia inicial en dos años, "pudiendo renovarse hasta en dos oportunidades, por el plazo de un año cada una". Los mayores de 10 años la retiran a partir de 5 días hábiles, con un máximo de 90 días.',
      },
      {
        heading: '¿Cuánto tarda Migración en resolver?',
        body: 'La ficha del trámite no publica un plazo: dice que la solicitud y la documentación enviada será analizada por la Dirección Nacional de Migración, y nada más. La ley sí pone uno. El artículo 33 de la Ley 18.250, en su texto vigente, dice que "El Ministerio del Interior deberá expedirse sobre el otorgamiento de la residencia solicitada en un plazo no mayor a noventa días hábiles". Es la vara con la que se puede medir un expediente que se estira. Que la cédula provisoria dure dos años y se pueda renovar dos veces más tampoco es un detalle administrativo: el Decreto 208/013 explica en sus considerandos que amplió el plazo porque el anterior no alcanzaba para obtener la residencia permanente. Y una advertencia de la ficha de Migración que conviene tener presente desde el primer día: la cédula de residente en trámite no se renueva si no cumpliste con la totalidad de los requisitos, así que dejar papeles pendientes se paga cuando vence el documento.',
      },
      {
        heading: 'Viví años sin regularizar: ¿me pueden expulsar?',
        body: 'Es la pregunta que frena a mucha gente, y la ley la contesta mejor que los foros. Quedarse en el país después de vencido el plazo de permanencia autorizado es, efectivamente, una causal de expulsión: la enumera el literal C del artículo 51 de la Ley 18.250. Pero el artículo 52, con la redacción de la Ley 20.212, obliga a la Dirección Nacional de Migración, en ese caso, a intimarte antes a regularizar tu situación "en un plazo perentorio de sesenta días corridos", atendiendo a las circunstancias del caso, como el parentesco con un nacional y tus condiciones personales y sociales. El artículo 9 aclara que la irregularidad migratoria no te impide acceder a la justicia ni a los establecimientos de salud. Y para un argentino, la categoría de residente permanente sale de la nacionalidad, no de cuánto tiempo estuvo en regla. La ficha de la residencia Mercosur no menciona recargos por el tiempo irregular anterior. Cuanto antes empieces, antes tenés cédula.',
        links: [
          {
            label: 'Ciudadanía legal: requisitos y plazos',
            to: '/guias/ciudadania-legal-uruguaya',
          },
        ],
      },
    ],
    steps: [
      {
        name: 'Juntá la base documental',
        text: 'Documento vigente, foto carné, antecedentes penales del país donde viviste los últimos cinco años (por más de seis meses) y vacunas al día.',
      },
      {
        name: 'Iniciá el trámite en línea',
        text: 'Entrá con usuario gub.uy, completá el formulario, adjuntá los documentos en PDF y pagá por transferencia o red de cobranza.',
      },
      {
        name: 'Esperá el correo y agendá',
        text: 'Migración responde por mail con la aceptación o las observaciones; después agendás la audiencia presencial.',
      },
      {
        name: 'Presentate con los originales',
        text: 'En Mercedes 1004 (Montevideo) o en la oficina de Migración del interior que corresponda, con una tolerancia máxima de diez minutos.',
      },
      {
        name: 'Sacá la cédula en la DNIC',
        text: 'Con el certificado de residencia en trámite y tu partida inscripta en la sección extranjeros del Registro Civil, agendá el documento.',
      },
      {
        name: 'Completá antes de renovar',
        text: 'La cédula provisoria dura dos años y se renueva hasta dos veces por un año, pero no se renueva si quedaron requisitos sin cumplir.',
      },
    ],
    faqs: [
      {
        q: '¿Cómo saco la cédula uruguaya siendo argentino?',
        a: 'Primero iniciás la residencia permanente Mercosur ante la Dirección Nacional de Migración, que para los argentinos se basa en acreditar la nacionalidad (art. 33 de la Ley 18.250). Con el certificado de residencia en trámite y tu partida inscripta en el Registro Civil, sacás la cédula en la Dirección Nacional de Identificación Civil.',
      },
      {
        q: '¿Tengo que esperar a que me aprueben la residencia para tener cédula?',
        a: 'No. La ficha del Documento Nacional de Identidad para nacidos en el exterior acepta el certificado de residencia en trámite de Migración. La cédula sale como provisoria (art. 15 del Decreto 501/978) y dura dos años, renovable dos veces por un año (Decreto 208/013).',
      },
      {
        q: '¿Cuánto sale la residencia Mercosur para un argentino en 2026?',
        a: '557,30 UI según la ficha de Migración actualizada el 12 de marzo de 2026, más 55,70 UI del certificado migratorio para la cédula. Brasil y Paraguay están exentos; Argentina no. La cédula por primera vez cuesta $456 desde el 1 de julio de 2026.',
      },
      {
        q: 'Hace cinco años que vivo en Uruguay sin papeles, ¿me pueden deportar?',
        a: 'Quedarse con el plazo de permanencia vencido es causal de expulsión (art. 51 de la Ley 18.250), pero el artículo 52 obliga a Migración a intimarte primero a regularizar en sesenta días corridos, atendiendo a tus circunstancias. Como la ley te da la categoría de residente permanente por tu nacionalidad, el paso es iniciar el trámite.',
      },
      {
        q: '¿Cuánto tarda Migración en darme la residencia?',
        a: 'La ficha no publica un plazo. El artículo 33 de la Ley 18.250 obliga al Ministerio del Interior a expedirse "en un plazo no mayor a noventa días hábiles".',
      },
      {
        q: '¿Tengo que demostrar ingresos o un trabajo?',
        a: 'La ficha de la residencia permanente Mercosur no lo pide. Pide foto carné, documento vigente, antecedentes penales del país donde residiste los últimos cinco años (por más de seis meses) y certificado de vacunas vigente.',
      },
    ],
    related: [
      { label: 'Residencia legal en Uruguay', to: '/mudarme-a-uruguay-residencia' },
      { label: 'Cuánto sale la cédula', to: '/cuanto-sale-la-cedula-de-identidad-uruguaya' },
      { label: 'Ciudadanía legal uruguaya', to: '/guias/ciudadania-legal-uruguaya' },
      {
        label: 'Certificado de antecedentes judiciales',
        to: '/certificado-de-antecedentes-judiciales-uruguay',
      },
    ],
    sources: [
      {
        label:
          'Ley 18.250 (texto vigente) — art. 33: son residentes permanentes "los nacionales de los Estados Partes del Mercosur y Estados Asociados que acrediten dicha nacionalidad" y el Ministerio debe expedirse "en un plazo no mayor a noventa días hábiles"; art. 51 lit. C: permanecer vencido el plazo es causal de expulsión; art. 52: intimación previa a regularizar "en un plazo perentorio de sesenta días corridos"; art. 9: la irregularidad no impide el acceso a la justicia ni a la salud',
        url: 'https://www.impo.com.uy/bases/leyes/18250-2008',
        publisher: 'IMPO',
      },
      {
        label:
          'Ley 19.254 (2014) — modificó los artículos 27 y 33 de la Ley 18.250 sobre la residencia permanente de familiares de uruguayos y de nacionales del Mercosur y Estados Asociados',
        url: 'https://www.impo.com.uy/bases/leyes/19254-2014',
        publisher: 'IMPO',
      },
      {
        label:
          'Residencia Legal Permanente Mercosur — requisitos, 557,30 UI (Paraguay y Brasil exentos), 55,70 UI de certificado migratorio para la DNIC, 225,60 UI por permiso de reingreso, y "No se procederá a la renovación de la Cédula de identidad como residente en trámite, si no se ha cumplido con la totalidad de los requisitos"; actualizada el 12/03/2026',
        url: 'https://www.gub.uy/tramites/residencia-legal-permanente-mercosur',
        publisher: 'Dirección Nacional de Migración / gub.uy',
      },
      {
        label:
          'Documento Nacional de Identidad, primera vez, nacidos en el exterior con residencia en trámite — certificado de residencia de Migración, partida inscripta en la sección extranjeros, "456" pesos desde el 01/07/2026, retiro desde 5 días hábiles y con un máximo de 90 días',
        url: 'https://www.gub.uy/tramites/documento-nacional-identidad-primera-vez-personas-nacidas-exterior-residencia-tramite-legal-definitiva-definitiva-mercosur',
        publisher: 'DNIC / gub.uy',
      },
      {
        label:
          'Decreto 501/978, art. 15 — al extranjero que no terminó el trámite ante Migración la cédula "se le expedirá con carácter de provisoria"',
        url: 'https://www.impo.com.uy/bases/decretos/501-1978/15',
        publisher: 'IMPO',
      },
      {
        label:
          'Decreto 208/013, art. 1 — la cédula provisoria dura "dos años, pudiendo renovarse hasta en dos oportunidades, por el plazo de un año cada una"',
        url: 'https://www.impo.com.uy/bases/decretos/208-2013',
        publisher: 'IMPO',
      },
    ],
  },
  {
    slug: 'casarse-por-civil-uruguay',
    title: 'Casarse por civil en Uruguay: trámite, testigos y costo',
    description:
      'Casarse por civil cuesta $1.149 en la oficina y $35.130 a domicilio (ficha de mayo de 2026): dos etapas, cuatro testigos mayores de 18 y edictos en el Diario Oficial.',
    tag: 'REGISTRO CIVIL',
    updatedAt: '2026-09-13',
    sections: [
      {
        heading: 'Dónde se reserva: un trámite en dos etapas',
        body: 'El casamiento civil lo celebra un Oficial del Registro de Estado Civil, y la reserva no es un solo paso. En la primera etapa van la pareja y los cuatro testigos a comenzar el expediente, y en ese momento sólo se pagan los edictos que se publican en el Diario Oficial. En la segunda etapa se agenda otra visita, "como mínimo después de los 8 días hábiles contados desde la primera publicación del Edicto", se paga el resto y se fija ante el Oficial la fecha de la ceremonia. La inscripción se hace "como máximo dentro de los tres (3) meses previos a la fecha de celebrar el matrimonio", así que no sirve empezar con un año de anticipación. En Montevideo todo arranca por internet, con agenda en Sarandí 428 y la oficina asignada según la inicial del primer apellido. En el interior se va directo al Registro Civil del municipio o, en las localidades sin municipio, al de la capital departamental.',
      },
      {
        heading: 'Los testigos: cuántos, quiénes y qué les preguntan',
        body: 'Son cuatro, mayores de 18 años, y la ficha dice que pueden ser "parientes o amigos"; cada uno lleva su documento de identidad. Tienen que estar en la primera etapa y el día de la ceremonia. Lo que les toca es declarar, y la ficha dice qué: "El domicilio de los contrayentes, sean éstos uruguayos o extranjeros, se probará mediante la declaración de los testigos propuestos". Es todo lo que la ficha les atribuye, así que no hay nada que estudiar antes de ir, más allá de conocer los datos que van a declarar. La ficha resuelve también el problema clásico del testigo que falla el día del casamiento: "puede ser otro el testigo compareciente que se registrará en el mismo acto", sin reiniciar el trámite. Si querés más de cuatro, cada testigo adicional cuesta $1.436 según la ficha de mayo de 2026, sin importar el lugar donde se celebre el matrimonio.',
      },
      {
        heading: '¿Y si no tenés a quién llevar de testigo?',
        body: 'La ficha no prevé un casamiento civil sin testigos: los cuatro son requisito de la primera etapa y del acto. Lo que sí da es flexibilidad sobre quiénes pueden ser. No tienen que ser familiares, porque pueden ser "parientes o amigos", y lo único que la ficha les exige es la edad y el documento de identidad. Tampoco tienen que ser los mismos de principio a fin, porque el que no puede ir a la ceremonia se sustituye en el mismo acto. Hay, sí, un criterio que pesa en la elección: lo que los testigos declaran es el domicilio de los contrayentes, así que conviene que sean personas que efectivamente lo conozcan y puedan declararlo sin dudar. Si la pareja viene de afuera y no conoce a nadie en Uruguay, conseguir esos cuatro testigos es lo primero que hay que resolver, antes de agendar la primera etapa.',
      },
      {
        heading: 'Cuánto cuesta: oficina, domicilio y edictos',
        body: 'La ficha del Registro Civil, actualizada el 29 de mayo de 2026, publica el costo del trámite además de la publicación en el Diario Oficial: $1.149 si el matrimonio se celebra en la oficina, desglosado en $670 de expediente y certificado y $479 de libreta matrimonial, y $35.130 si se celebra a domicilio, con expediente, certificado y libreta incluidos. Cada testigo por encima de los cuatro cuesta $1.436, y una copia del expediente matrimonial, $153. Los edictos se pagan aparte en la primera etapa y la ficha no cifra ese importe; la tarifa que publica IMPO, que edita el Diario Oficial, es de $712 con IVA incluido para los edictos matrimoniales desde el 4 de febrero de 2026, y los de matrimonio in extremis se publican sin costo. Casarse a domicilio sale más de treinta veces lo que sale en la oficina.',
        table: {
          headers: ['Concepto', 'Importe', 'Fuente y vigencia'],
          rows: [
            [
              'Matrimonio en la oficina',
              '$1.149 ($670 expediente y certificado + $479 libreta)',
              'Registro Civil, ficha del 29/05/2026',
            ],
            [
              'Matrimonio a domicilio',
              '$35.130 (incluye expediente, certificado y libreta)',
              'Registro Civil, ficha del 29/05/2026',
            ],
            [
              'Testigo adicional, por encima de cuatro',
              '$1.436 cada uno',
              'Registro Civil, ficha del 29/05/2026',
            ],
            ['Copia del expediente matrimonial', '$153', 'Registro Civil, ficha del 29/05/2026'],
            [
              'Edictos matrimoniales en el Diario Oficial',
              '$712 con IVA (in extremis, sin costo)',
              'Tarifa de IMPO desde el 04/02/2026',
            ],
          ],
        },
      },
      {
        heading: 'Qué documentos llevar',
        body: 'La base es la misma para los dos: partida de nacimiento, documento de identidad, la agenda previa y los cuatro testigos. Si alguno está divorciado, se presenta el testimonio de la partida del matrimonio anterior con la constancia del divorcio; si el divorcio fue en el extranjero, la sentencia original legalizada o apostillada y traducida. Si es viudo o viuda, la partida de matrimonio y la de defunción. Si tienen hijos en común nacidos antes, sus partidas de nacimiento, con el reconocimiento de ambos. Para los extranjeros solteros y mayores de edad, la ficha menciona el documento de identidad y, si no hablan español, la presencia de un traductor público uruguayo; conviene confirmar en la oficina en qué forma te piden la partida de tu país. Hay además una regla que sólo alcanza a las mujeres: el artículo 112 del Código Civil no permite el nuevo casamiento hasta 301 días después de la viudez o el divorcio, salvo que hayan pasado noventa días y se presente un certificado médico que acredite que no hay embarazo.',
      },
      {
        heading: 'Edad mínima y quién no se puede casar',
        body: 'Desde la Ley 20.443, de diciembre de 2025, el primer impedimento del artículo 91 del Código Civil dice: "Ser cualquiera de los contrayentes menor de dieciocho años de edad o tener dieciséis años de edad y no contar, en este último caso, con previa autorización judicial". La ficha lo baja a tierra: los menores de 16 no pueden casarse, y entre los 16 y los 18 hace falta autorización judicial. El mismo artículo enumera los demás impedimentos dirimentes: la falta de consentimiento libre, un matrimonio anterior no disuelto, el parentesco en línea recta por consanguinidad o afinidad, el parentesco entre hermanos y la condena por el homicidio de un cónyuge respecto del sobreviviente. Para todo lo demás, la ficha dirige el trámite a personas mayores de 16 años, "no importando su sexo ni nacionalidad", y aclara que el matrimonio civil se puede celebrar en cualquier lugar del país, sin importar dónde residan los contrayentes.',
      },
      {
        heading: 'Antes de firmar: el régimen de bienes se decide antes',
        body: 'El día del Registro Civil también queda definido, aunque no lo hablen, cómo van a quedar sus bienes. El artículo 1938 del Código Civil permite que los esposos hagan convenciones especiales, las capitulaciones matrimoniales, pero "Antes de la celebración del matrimonio", y agrega que la ley rige la asociación conyugal en cuanto a los bienes "sólo a falta de convenciones especiales". Si no firman nada, quedan en el régimen legal, la sociedad conyugal. Si prefieren separación de bienes, hay que pactarla antes del casamiento, no después, porque ya casados el camino es otro y pasa por el juzgado. La forma la fija el artículo 1943: escritura pública cuando los bienes que aporta cualquiera de los dos pasan de 500 unidades reajustables o se constituyen derechos sobre inmuebles, y en los demás casos alcanza con un documento privado firmado por los dos y tres testigos. Y si uno de los dos es extranjero, conviene saber que el casamiento no le da la ciudadanía uruguaya: le sirve para la residencia y puede acortar el plazo de la ciudadanía legal, que tiene su propia guía con los requisitos.',
        links: [
          {
            label: 'Régimen patrimonial del matrimonio',
            to: '/guias/regimen-patrimonial-matrimonio-uruguay',
          },
          { label: 'Separación de bienes', to: '/guias/separacion-de-bienes-uruguay' },
          {
            label: 'Ciudadanía legal: requisitos y plazos',
            to: '/guias/ciudadania-legal-uruguaya',
          },
        ],
      },
    ],
    steps: [
      {
        name: 'Iniciá el trámite',
        text: 'En Montevideo, en línea y con la oficina que te toca por la inicial del primer apellido; en el interior, en el Registro Civil del municipio.',
      },
      {
        name: 'Primera etapa con los cuatro testigos',
        text: 'Van la pareja y los cuatro testigos mayores de 18 con documento; en esta etapa sólo se pagan los edictos del Diario Oficial.',
      },
      {
        name: 'Esperá la publicación del edicto',
        text: 'La segunda etapa se agenda como mínimo 8 días hábiles después de la primera publicación en el Diario Oficial.',
      },
      {
        name: 'Segunda etapa: pagá y fijá la fecha',
        text: 'Se abona el resto ($1.149 en la oficina o $35.130 a domicilio, según la ficha de mayo de 2026) y se fija la fecha ante el Oficial.',
      },
      {
        name: 'El día del casamiento',
        text: 'Van la pareja y los testigos; si uno no puede ir, lo reemplaza otro que se registra en el mismo acto.',
      },
    ],
    faqs: [
      {
        q: '¿Qué les preguntan a los testigos en el Registro Civil?',
        a: 'La ficha del trámite dice que el domicilio de los contrayentes, uruguayos o extranjeros, se prueba con la declaración de los testigos. No les atribuye otra prueba: tienen que ser mayores de 18 años y presentar su documento de identidad.',
      },
      {
        q: '¿Se puede casar por civil sin testigos?',
        a: 'No. La ficha exige cuatro testigos mayores de 18 años, que pueden ser parientes o amigos, en la primera etapa y en la ceremonia. Si alguno no puede ir el día del casamiento, se lo sustituye por otro en el mismo acto.',
      },
      {
        q: '¿Cuánto sale casarse por civil en 2026?',
        a: '$1.149 en la oficina y $35.130 a domicilio, según la ficha del Registro Civil actualizada el 29 de mayo de 2026, más la publicación de los edictos en el Diario Oficial, cuya tarifa en IMPO es de $712 con IVA desde el 4 de febrero de 2026.',
      },
      {
        q: '¿Con cuánta anticipación hay que reservar?',
        a: 'Como máximo tres meses antes de la fecha del casamiento, y la segunda etapa no puede agendarse antes de 8 días hábiles desde la primera publicación del edicto en el Diario Oficial.',
      },
      {
        q: '¿Pueden casarse extranjeros en Uruguay?',
        a: 'La ficha dirige el trámite a los mayores de 16 años, "no importando su sexo ni nacionalidad", y no enumera un requisito de residencia. A los extranjeros solteros y mayores les pide documento de identidad, y traductor público si no hablan español.',
      },
      {
        q: 'Si me caso con una persona uruguaya, ¿me dan la ciudadanía?',
        a: 'No. Uruguay no otorga la ciudadanía por matrimonio. El casamiento ayuda con la residencia y puede acortar el plazo de la ciudadanía legal, que se tramita aparte en la Corte Electoral.',
      },
    ],
    related: [
      {
        label: 'Régimen patrimonial del matrimonio',
        to: '/guias/regimen-patrimonial-matrimonio-uruguay',
      },
      { label: 'Separación de bienes', to: '/guias/separacion-de-bienes-uruguay' },
      { label: 'Ciudadanía legal uruguaya', to: '/guias/ciudadania-legal-uruguaya' },
      { label: 'Unión concubinaria', to: '/guias/union-concubinaria-uruguay' },
    ],
    sources: [
      {
        label:
          'Inscripción de matrimonio — dos etapas, cuatro testigos mayores de 18 "parientes o amigos", el domicilio de los contrayentes "se probará mediante la declaración de los testigos propuestos", segunda etapa "como mínimo después de los 8 días hábiles contados desde la primera publicación del Edicto", mayores de 16 "no importando su sexo ni nacionalidad", "Matrimonio total en la oficina. $ 1.149", "Matrimonio total a domicilio: $ 35.130" y $1.436 por testigo adicional; actualizada el 29/05/2026',
        url: 'https://www.gub.uy/tramites/inscripcion-matrimonio',
        publisher: 'Registro de Estado Civil / gub.uy',
      },
      {
        label:
          'Código Civil, art. 91 (redacción de la Ley 20.443 de 12/12/2025) — "Ser cualquiera de los contrayentes menor de dieciocho años de edad o tener dieciséis años de edad y no contar, en este último caso, con previa autorización judicial", y los demás impedimentos dirimentes',
        url: 'https://www.impo.com.uy/bases/codigo-civil/16603-1994/91',
        publisher: 'IMPO',
      },
      {
        label:
          'Código Civil, art. 112 — la mujer no puede volver a casarse hasta 301 días después de la viudez o la separación, salvo que hayan transcurrido noventa días y presente certificado médico de que no hay embarazo',
        url: 'https://www.impo.com.uy/bases/codigo-civil/16603-1994/112',
        publisher: 'IMPO',
      },
      {
        label:
          'Código Civil, art. 1938 — las capitulaciones se hacen "Antes de la celebración del matrimonio", y la ley rige los bienes "sólo a falta de convenciones especiales"',
        url: 'https://www.impo.com.uy/bases/codigo-civil/16603-1994/1938',
        publisher: 'IMPO',
      },
      {
        label:
          'Código Civil, art. 1943 — las convenciones matrimoniales "deben hacerse en escritura pública, so pena de nulidad", si los bienes aportados pasan de 500 unidades reajustables o se constituyen derechos sobre bienes raíces; si no, alcanza con escritura privada "firmada por las partes y tres testigos"',
        url: 'https://www.impo.com.uy/bases/codigo-civil/16603-1994/1943',
        publisher: 'IMPO',
      },
      {
        label:
          'Tarifas del Diario Oficial vigentes desde el 4 de febrero de 2026 — edictos matrimoniales $712 con IVA incluido; los de matrimonio in extremis se publican sin costo',
        url: 'https://www.impo.com.uy/tarifas-avisos-y-documentos/',
        publisher: 'IMPO',
      },
    ],
  },
  {
    slug: 'cuanto-tiempo-guardar-recibos-y-facturas-uruguay',
    title: '¿Cuánto tiempo guardar recibos y facturas en Uruguay?',
    description:
      'No hay un plazo único: la DGI tiene 5 años desde el fin del año civil, un reclamo laboral 1 año desde el cese, el alquiler 4 años y la regla general del Código Civil, 10.',
    tag: 'PRESCRIPCIÓN',
    updatedAt: '2026-09-13',
    sections: [
      {
        heading: '¿Hay una ley que diga cuánto hay que guardar?',
        body: 'Para una persona que no factura, no hay una regla general de conservación de comprobantes. Lo que existen son plazos de prescripción: el tiempo durante el cual alguien te puede reclamar un pago, o vos podés reclamar algo que te deben. El comprobante vale mientras ese reloj corre, porque es la prueba de que pagaste o de lo que te correspondía cobrar; pasado el plazo, deja de ser necesario para esa deuda. Por eso la respuesta útil no es un número único sino uno por tipo de papel, y cada uno sale de una norma distinta: el Código Tributario para los impuestos, la Ley 18.091 para lo laboral y el Código Civil para el alquiler y las deudas en general. La tabla resume cada caso. Hay una excepción que va al revés: los recibos de sueldo conviene guardarlos mucho más allá de cualquier plazo de reclamo, por la jubilación.',
        table: {
          headers: ['Papel', 'Cuánto guardarlo', 'Norma'],
          rows: [
            [
              'Comprobantes de impuestos de la DGI',
              '5 años desde el fin del año civil del hecho gravado; 10 si no declaraste estando obligado o hubo defraudación',
              'Código Tributario, art. 38',
            ],
            [
              'Recibos de sueldo, para reclamar',
              'La acción: 1 año desde el día siguiente al cese. Los créditos: 5 años desde que fueron exigibles',
              'Ley 18.091, arts. 1 y 2',
            ],
            [
              'Recibos de sueldo, para la jubilación',
              'Sin fecha de descarte: son prueba de años trabajados ante el BPS',
              'BPS',
            ],
            [
              'Recibos de alquiler',
              '4 años desde cada vencimiento, y el último siempre',
              'Código Civil, arts. 1222 y 1462',
            ],
            [
              'Constancias de cancelación de deudas',
              '10 años desde que la deuda fue exigible, salvo ley especial',
              'Código Civil, art. 1216',
            ],
            [
              'Facturas de UTE, OSE y Antel',
              'No publicamos un plazo: no encontramos una norma específica',
              'Ver la sección de servicios',
            ],
          ],
        },
      },
      {
        heading: 'Impuestos: cinco años, pero contados desde el 31 de diciembre',
        body: 'El artículo 38 del Código Tributario dice que el derecho al cobro de los tributos "prescribirá a los cinco años contados a partir de la terminación del año civil en que se produjo el hecho gravado". El detalle está en el punto de partida: no se cuentan cinco años desde que presentaste la declaración ni desde que pagaste, sino desde el cierre del año en que ocurrió lo que genera el impuesto. Los comprobantes del IRPF por lo que ganaste en 2021, por ejemplo, conviene tenerlos hasta que termine 2026. El mismo artículo estira el plazo a diez años cuando el contribuyente haya incurrido en defraudación o no cumpla con las obligaciones de inscribirse, de denunciar el hecho generador o de presentar las declaraciones. O sea que si estabas obligado a declarar y no lo hiciste, el reloj que te corre es el de diez. Esto vale para los papeles que respaldan lo que declaraste o lo que te retuvieron.',
        links: [
          { label: 'Declaración de IRPF', to: '/declaracion-de-irpf-uruguay' },
          {
            label: 'Prescripción de deudas con el Estado',
            to: '/prescripcion-de-deudas-con-el-estado-uruguay',
          },
        ],
      },
      {
        heading: 'Recibos de sueldo: el reloj del reclamo y el de la jubilación',
        body: 'Para reclamarle algo a un empleador corren dos plazos de la Ley 18.091 que conviene no mezclar. El artículo 1 dice que las acciones "prescriben al año, a partir del día siguiente a aquél en que haya cesado la relación laboral": es el tiempo que tenés para mover el reclamo después de irte. El artículo 2 dice que los créditos laborales "prescriben a los cinco años, contados desde la fecha en que pudieron ser exigibles": es cuánto para atrás podés reclamar. Con eso, los recibos de un trabajo que dejaste hace más de un año ya no te sirven para demandar, salvo que antes hayas cortado el plazo, por ejemplo pidiendo audiencia de conciliación en el Ministerio de Trabajo (art. 3). Pero no los tires. El BPS acepta los recibos de sueldo como prueba cuando tu historia laboral tiene huecos: para los períodos posteriores al 1º de abril de 1996 se adjuntan a la denuncia por diferencias de salario o actividades no declaradas, y esos huecos se pueden descubrir muchos años después. Para este papel en particular, la recomendación es guardarlo siempre, aunque sea escaneado.',
        links: [
          {
            label: 'Cómo entender tu recibo de sueldo',
            to: '/guias/entender-tu-recibo-de-sueldo-uruguay',
          },
          { label: 'Trabajo en negro: cómo comprobarlo', to: '/guias/trabajo-en-negro-uruguay' },
        ],
      },
      {
        heading: 'Alquiler: cuatro años, y el último recibo vale doble',
        body: 'El artículo 1222 del Código Civil fija en cuatro años la prescripción de "la obligación de pagar los atrasos" del precio de los arriendos, sea la finca rústica o urbana. El mismo artículo alcanza a los intereses de dinero prestado y a "todo lo que debe pagarse por años o plazos periódicos más cortos". Cada mes tiene su propio reloj, que corre desde que ese pago venció. Hay otra regla del Código que cambia qué papeles guardar: el artículo 1462 dice que, cuando el pago "deba hacerse en prestaciones parciales y en períodos determinados, el recibo o carta de pago correspondiente al último período hace presumir el pago de los anteriores, salvo la prueba en contrario". Traducido: si el mismo arrendador te reclama un mes viejo del alquiler, el recibo del último mes que le pagaste ya juega a tu favor, y quien reclama tiene que probar lo contrario, porque la presunción vale entre los mismos acreedor y deudor. Conviene igual conservar todos durante los cuatro años, y el comprobante del depósito de garantía hasta que lo recuperes. Los gastos comunes tienen una regla propia, que explica la página dedicada.',
        links: [
          { label: 'El depósito de alquiler', to: '/guias/deposito-de-alquiler-uruguay' },
          { label: 'Deuda de gastos comunes', to: '/deuda-de-gastos-comunes-uruguay' },
        ],
      },
      {
        heading: 'UTE, OSE y Antel: el plazo que no te vamos a inventar',
        body: 'Es la pregunta más común y la que peor se contesta en los foros. No encontramos una norma que fije, para las facturas de UTE, OSE o Antel, un plazo de prescripción propio y expreso, así que no publicamos uno. Las dos reglas generales del Código Civil que podrían entrar en juego dan números muy distintos, cuatro años para lo que se paga por plazos periódicos y diez para toda acción personal por deuda, y decidir cuál corresponde a una factura de un ente público es una discusión jurídica que no vamos a zanjar acá. Lo práctico es otra cosa. Guardá siempre el comprobante de la última factura paga de cada servicio, los convenios de pago que firmes y cualquier constancia de reclamo o de baja, que son los papeles que cortan una discusión. Si pagás por débito automático o desde la app del banco, el estado de cuenta ya funciona como comprobante, y cuesta poco bajarlo en PDF.',
        links: [
          { label: 'La factura de UTE', to: '/factura-de-ute-uruguay' },
          { label: 'La factura de OSE', to: '/factura-de-ose-uruguay' },
          { label: 'Qué pasa si no pago Antel', to: '/que-pasa-si-no-pago-antel' },
        ],
      },
      {
        heading: 'La regla general: diez años, no veinte',
        body: 'Si escuchaste que las deudas prescriben a los veinte años, ese número no es el vigente. Desde la Ley 19.889, de julio de 2020, el artículo 1216 del Código Civil dice: "Toda acción personal por deuda exigible se prescribe por diez años, sin perjuicio de lo que al respecto dispongan leyes especiales. El tiempo comenzará a correr desde que la deuda es exigible". Es la regla que se aplica cuando no hay otra más específica, y por eso marca el techo razonable para los papeles que prueban que cancelaste algo: la constancia de cancelación de un préstamo, el recibo de un pago a un particular, el acuerdo que cerró una deuda. Para esos, diez años desde que la deuda se hizo exigible. Y fijate siempre si hay una regla más específica: el mismo artículo aclara que cede ante las leyes especiales, como pasa con los impuestos y con lo laboral, y el propio Código fija plazos más cortos, como los cuatro años del alquiler en el artículo 1222.',
      },
      {
        heading: 'Cómo guardar sin llenarte la casa de papel',
        body: 'Para el uso cotidiano, una foto legible o el PDF descargado alcanza para saber y mostrar quién cobró, cuánto, por qué concepto y en qué fecha, que es lo que se discute cuando alguien reclama un pago. Armá una carpeta por año y, dentro, una por tipo de papel: así el descarte se vuelve mecánico. Cada enero podés sacar los recibos de alquiler que vencieron hace más de cuatro años y, con el cierre del año, los respaldos de impuestos cuyo plazo de cinco años terminó, siempre que hayas declarado cuando correspondía. Lo que no se descarta con el calendario son los recibos de sueldo, las constancias de cancelación de deudas, las escrituras y todo lo que tenga que ver con la jubilación o con una herencia. Y si algún comprobante está impreso en papel térmico, como muchos tickets, escanealo pronto: esa impresión se borra con el tiempo y el papel queda en blanco justo cuando lo necesitás.',
      },
    ],
    faqs: [
      {
        q: '¿Cuánto tiempo hay que conservar los comprobantes de pago en Uruguay?',
        a: 'No hay un plazo único: depende de qué prueba cada papel. Los respaldos de impuestos, cinco años desde el fin del año civil del hecho gravado (art. 38 del Código Tributario); los recibos de alquiler, cuatro años (art. 1222 del Código Civil); las constancias de cancelación de deudas, diez años (art. 1216); y los recibos de sueldo, siempre, por la jubilación.',
      },
      {
        q: '¿Cuánto tiempo tiene la DGI para reclamarme un impuesto?',
        a: 'Cinco años contados desde la terminación del año civil en que ocurrió el hecho gravado. Son diez si hubo defraudación o si no te inscribiste, no denunciaste el hecho generador o no presentaste las declaraciones a las que estabas obligado (art. 38 del Código Tributario).',
      },
      {
        q: '¿Cuánto tiempo guardo los recibos de sueldo?',
        a: 'Para reclamarle al empleador, la acción prescribe al año del cese y los créditos a los cinco años de exigibles (Ley 18.091). Pero el BPS los acepta como prueba si tu historia laboral tiene huecos, así que conviene guardarlos hasta jubilarte.',
      },
      {
        q: '¿Y los recibos del alquiler?',
        a: 'Cuatro años desde cada vencimiento, que es lo que tarda en prescribir el atraso del precio del arriendo (art. 1222 del Código Civil). Además, el recibo del último período hace presumir el pago de los anteriores, salvo prueba en contrario (art. 1462).',
      },
      {
        q: '¿Cuándo prescribe una factura de UTE, OSE o Antel?',
        a: 'No encontramos una norma que fije un plazo propio para esas facturas, así que no publicamos uno. Lo prudente es guardar la última factura paga de cada servicio y todo convenio de pago o constancia de reclamo.',
      },
      {
        q: '¿Las deudas prescriben a los 20 años?',
        a: 'No es la regla vigente. Desde la Ley 19.889 de 2020, el artículo 1216 del Código Civil fija diez años para toda acción personal por deuda exigible, salvo que una ley especial diga otra cosa.',
      },
    ],
    related: [
      {
        label: 'Prescripción de deudas con el Estado',
        to: '/prescripcion-de-deudas-con-el-estado-uruguay',
      },
      { label: 'Deuda de gastos comunes', to: '/deuda-de-gastos-comunes-uruguay' },
      { label: 'Me deben el sueldo', to: '/guias/me-deben-el-sueldo-uruguay' },
      { label: 'Declaración de IRPF', to: '/declaracion-de-irpf-uruguay' },
    ],
    sources: [
      {
        label:
          'Código Tributario, art. 38 — el cobro de los tributos "prescribirá a los cinco años contados a partir de la terminación del año civil en que se produjo el hecho gravado", y a los diez si hubo defraudación o no se cumplió con inscribirse, denunciar el hecho generador o presentar las declaraciones',
        url: 'https://www.impo.com.uy/bases/codigo-tributario/14306-1974/38',
        publisher: 'IMPO',
      },
      {
        label:
          'Ley 18.091, arts. 1 a 3 — las acciones laborales "prescriben al año, a partir del día siguiente a aquél en que haya cesado la relación laboral", los créditos "prescriben a los cinco años, contados desde la fecha en que pudieron ser exigibles", y la presentación ante el MTSS "solicitando audiencia de conciliación" interrumpe la prescripción',
        url: 'https://www.impo.com.uy/bases/leyes/18091-2007',
        publisher: 'IMPO',
      },
      {
        label:
          'Denuncias de trabajadores — para irregularidades en la historia laboral posteriores al 1º de abril de 1996 se adjuntan "recibos de sueldo, sentencia judicial, documentos públicos o privados" por "diferencias de salarios y actividades no declaradas"; última modificación el 11/09/2026',
        url: 'https://www.bps.gub.uy/11439/denuncias-de-trabajadores.html',
        publisher: 'BPS',
      },
      {
        label:
          'Código Civil, art. 1222 — "Se prescribe por cuatro años la obligación de pagar los atrasos" del precio de los arriendos, del interés de dinero prestado y de "todo lo que debe pagarse por años o plazos periódicos más cortos"',
        url: 'https://www.impo.com.uy/bases/codigo-civil/16603-1994/1222',
        publisher: 'IMPO',
      },
      {
        label:
          'Código Civil, art. 1462 — en los pagos por períodos determinados, "el recibo o carta de pago correspondiente al último período hace presumir el pago de los anteriores, salvo la prueba en contrario"',
        url: 'https://www.impo.com.uy/bases/codigo-civil/16603-1994/1462',
        publisher: 'IMPO',
      },
      {
        label:
          'Código Civil, art. 1216 (redacción de la Ley 19.889 de 2020) — "Toda acción personal por deuda exigible se prescribe por diez años, sin perjuicio de lo que al respecto dispongan leyes especiales"',
        url: 'https://www.impo.com.uy/bases/codigo-civil/16603-1994/1216',
        publisher: 'IMPO',
      },
    ],
  },
]
