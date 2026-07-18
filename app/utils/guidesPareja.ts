// Couple & family money guides: how to manage money with the person you live
// with, plus the Uruguayan patrimonial-regime questions (sociedad conyugal vs
// separación de bienes, unión concubinaria, división de bienes en el divorcio).
// Same `Guide` shape as `guides.ts`, spread into it there. Rioplatense Spanish,
// adversarially fact-checked against the Código Civil / Ley 18.246 / escribanos.
import type { Guide } from './guides'

export const parejaGuides: readonly Guide[] = [
  {
    slug: 'regimen-patrimonial-matrimonio-uruguay',
    title:
      'Régimen patrimonial del matrimonio en Uruguay: sociedad conyugal o separación de bienes',
    description:
      'En Uruguay, al casarte rige la sociedad conyugal salvo que pactes capitulaciones: qué son los bienes propios, los gananciales y la separación de bienes.',
    tag: 'MATRIMONIO',
    updatedAt: '2026-07-18',
    sections: [
      {
        heading: 'El régimen que rige si no firmás nada',
        body: 'En Uruguay, si te casás sin firmar capitulaciones matrimoniales, queda aplicado automáticamente el régimen de sociedad conyugal, también llamado sociedad legal de bienes o régimen de gananciales. Es el que rige para la enorme mayoría de las parejas, justamente porque corre por defecto. Su idea central es simple: lo que cada uno traía sigue siendo suyo, pero lo que construyen juntos durante el matrimonio se considera de ambos por mitades. No hace falta ningún trámite para quedar bajo este régimen; te alcanza con casarte. Por eso conviene entender bien qué implica antes de dar el paso, porque estás eligiendo aunque no elijas.',
      },
      {
        heading: 'Bienes propios: lo que sigue siendo tuyo',
        body: 'Los bienes propios son, en principio, los que ya tenías antes de casarte y los que recibís durante el matrimonio por herencia, legado o donación. Esos no se reparten: quedan del cónyuge titular. Por ejemplo, el apartamento que compraste soltero o el campo que heredaste de tus padres son tuyos, aunque estés casado bajo sociedad conyugal. El detalle práctico es que conviene poder probar ese origen: escrituras, sucesiones, documentos de la donación. Si mañana hay que liquidar la sociedad y no podés demostrar que un bien era propio, la normativa presume que es ganancial. La prueba juega a favor de quien la tiene ordenada.',
      },
      {
        heading: 'Bienes gananciales: lo que construyen juntos',
        body: 'Los gananciales son los bienes adquiridos durante el matrimonio con el esfuerzo común: sueldos, ahorros generados en la pareja, la casa comprada estando casados, el auto, los muebles, las inversiones hechas en ese período. No importa a nombre de cuál de los dos figure la titularidad: si se adquirió durante el matrimonio y no cae en las excepciones de bien propio, se trata como ganancial y, al disolverse la sociedad, en principio se reparte por mitades. Esta es la lógica protectora del régimen: reconoce que el patrimonio de la pareja se arma entre ambos, incluso cuando uno aporta ingresos y el otro aporta de otras maneras.',
      },
      {
        heading: 'La alternativa: la separación de bienes',
        body: 'La sociedad conyugal no es obligatoria. Si preferís que cada uno mantenga su patrimonio separado, existe el régimen de separación de bienes, que se pacta mediante capitulaciones matrimoniales otorgadas ante escribano antes de casarte. Bajo ese régimen no se forman gananciales: lo que gana o compra cada uno queda de cada uno. Suele interesar a segundas parejas, a quienes tienen empresa o a quienes llegan al matrimonio con patrimonios muy distintos. Ya casados, si querés salir de la sociedad conyugal, el camino ya no son las capitulaciones sino la disolución de la sociedad, que se pide ante el juzgado con la asistencia de un abogado y en la que también interviene un escribano para inscribirla y repartir los bienes.',
      },
      {
        heading: 'Por qué conviene decidirlo con información',
        body: 'Elegir régimen no es desconfiar de la pareja: es ordenar de antemano algo que, si un día se complica, evita conflictos largos y caros. La mayoría no decide nada y queda en sociedad conyugal, que para muchas parejas está perfecto. Pero si tenés bienes previos importantes, una empresa, hijos de otra relación o aportes muy desiguales, vale la pena conversarlo antes de casarte. La decisión se toma de a dos y, para el régimen de separación, se formaliza ante escribano. Hablarlo temprano y con calma siempre sale mejor que descubrir las reglas recién cuando la relación está en crisis.',
      },
      {
        heading: 'Información general, no asesoramiento legal',
        body: 'Esta guía es información general con fines educativos y no constituye asesoramiento legal. El régimen patrimonial toca cuestiones sensibles y cada situación familiar tiene sus particularidades, por lo que conviene analizarla caso a caso. Antes de casarte o de definir bajo qué régimen de bienes querés quedar, consultá con un escribano de tu confianza, que es el profesional que otorga las capitulaciones matrimoniales. Si ya estás casado y querés cambiar tu situación patrimonial, el camino pasa por la disolución de la sociedad ante el juzgado, con un abogado y con la intervención de un escribano. Una consulta a tiempo te ahorra problemas después y te permite decidir con tranquilidad.',
      },
    ],
    related: [
      { label: 'Separación de bienes', to: '/guias/separacion-de-bienes-uruguay' },
      {
        label: 'División de bienes en el divorcio',
        to: '/guias/division-de-bienes-en-el-divorcio-uruguay',
      },
      { label: 'Hacer un testamento', to: '/guias/hacer-un-testamento-uruguay' },
    ],
  },
  {
    slug: 'separacion-de-bienes-uruguay',
    title: 'Separación de bienes en Uruguay: cómo funciona y cómo pactarla',
    description:
      'Qué es el régimen de separación de bienes en Uruguay, cómo pactarlo por capitulaciones ante escribano y cuándo conviene elegirlo.',
    tag: 'BIENES',
    updatedAt: '2026-07-18',
    sections: [
      {
        heading: 'Qué es la separación de bienes',
        body: 'La separación de bienes es un régimen patrimonial en el que no se forma sociedad conyugal: cada cónyuge conserva la propiedad, administración y disposición de sus propios bienes, tanto los que traía como los que adquiera durante el matrimonio. Lo que ganás, comprás o invertís queda a tu nombre y bajo tu control; lo mismo para tu pareja. No hay gananciales que repartir por mitades. Es, en esencia, lo tuyo tuyo y lo mío mío, con la claridad de que las cuentas patrimoniales de cada uno corren por separado. Es la principal alternativa al régimen de gananciales que rige por defecto en Uruguay.',
      },
      {
        heading: 'Cómo se pacta antes de casarte',
        body: 'La forma clásica de adoptar la separación de bienes es firmar capitulaciones matrimoniales antes de la celebración del matrimonio. Se otorgan por escritura pública ante escribano y se inscriben en el Registro Nacional de Actos Personales para que tengan efecto frente a terceros. En ese documento la pareja declara que se casa bajo separación de bienes en lugar del régimen ganancial. El escribano es quien redacta el acuerdo, verifica que esté todo en regla y lo inscribe. Es un trámite relativamente sencillo, pero hay que hacerlo antes de casarse: una vez celebrado el matrimonio, ya no se pueden otorgar ni modificar capitulaciones.',
      },
      {
        heading: 'Ya casados: la disolución judicial',
        body: '¿Y si ya te casaste bajo sociedad conyugal y ahora querés separación de bienes? En ese caso las capitulaciones ya no sirven, porque solo se otorgan antes del matrimonio. El camino es pedir la disolución de la sociedad conyugal ante el juzgado: cualquiera de los cónyuges, incluso en forma unilateral, puede solicitarla, y a partir de la sentencia rige entre ustedes la separación de bienes hacia el futuro. Este proceso lo tramita un abogado. Ojo: disuelve y liquida los gananciales acumulados hasta ese momento; de ahí en más, cada uno sigue su propio camino patrimonial de forma independiente.',
      },
      {
        heading: 'Cuándo suele convenir',
        body: 'La separación de bienes interesa especialmente en algunos escenarios: segundas parejas con hijos de relaciones anteriores que quieren mantener patrimonios claros; personas que tienen o van a abrir una empresa y prefieren que el riesgo del negocio no se mezcle con el patrimonio familiar; y parejas que llegan al matrimonio con activos muy desiguales o con deudas previas. También la eligen quienes simplemente valoran administrar lo suyo con autonomía. No es mejor ni peor que la sociedad conyugal: es una opción distinta que se ajusta mejor a ciertas realidades. La conversación honesta de a dos es lo que define cuál les sirve.',
      },
      {
        heading: 'Qué NO cambia con este régimen',
        body: 'Elegir separación de bienes cambia cómo se reparte el patrimonio, pero no borra los deberes propios del matrimonio. Siguen vigentes las obligaciones de asistencia recíproca y de contribuir a los gastos del hogar y a la crianza de los hijos según las posibilidades de cada uno. La separación de bienes no es una forma de desentenderse del otro ni de los hijos: la obligación alimentaria hacia los hijos, por ejemplo, no depende del régimen patrimonial. Tampoco te exime de responder por ciertas deudas contraídas en interés de la familia. Ordena el patrimonio, no las responsabilidades familiares, que se mantienen intactas.',
      },
      {
        heading: 'Información general, no asesoramiento legal',
        body: 'Esta guía es información general con fines educativos y no constituye asesoramiento legal. Cada pareja tiene una realidad patrimonial distinta y conviene analizarla en detalle. Para pactar separación de bienes antes de casarte, consultá con un escribano, que es quien otorga las capitulaciones matrimoniales e informa costos y efectos. Si ya estás casado y querés pasar a separación de bienes, consultá con un abogado, porque el camino es la disolución judicial de la sociedad conyugal. Decidir con asesoramiento profesional te da tranquilidad y evita errores que después son difíciles de corregir.',
      },
    ],
    related: [
      {
        label: 'Régimen patrimonial del matrimonio',
        to: '/guias/regimen-patrimonial-matrimonio-uruguay',
      },
      {
        label: 'Proteger tu patrimonio en pareja',
        to: '/guias/proteger-tu-patrimonio-en-pareja-uruguay',
      },
      { label: 'Costos de escrituración', to: '/guias/costos-de-escrituracion-uruguay' },
    ],
  },
  {
    slug: 'union-concubinaria-uruguay',
    title: 'Unión concubinaria en Uruguay: derechos y patrimonio',
    description:
      'La unión concubinaria de la Ley 18.246: convivencia de al menos cinco años, reconocimiento judicial y los derechos patrimoniales y de pensión que genera.',
    tag: 'CONCUBINATO',
    updatedAt: '2026-07-18',
    sections: [
      {
        heading: 'Qué es la unión concubinaria',
        body: 'La unión concubinaria está regulada por la Ley 18.246, vigente en Uruguay desde 2008. Reconoce que dos personas que conviven de forma estable, en una relación de tipo afectivo y sexual, exclusiva, singular y a la vista de todos, sin estar casadas entre sí, pueden generar derechos y obligaciones parecidos en varios aspectos a los del matrimonio. Aplica tanto a parejas del mismo sexo como de distinto sexo. La ley vino a dar amparo jurídico a una realidad muy común: mucha gente en Uruguay arma su vida en pareja sin pasar por el Registro Civil, y esa convivencia, cumplidos ciertos requisitos, tiene consecuencias legales.',
      },
      {
        heading: 'El requisito de convivencia',
        body: 'Para que la unión concubinaria genere los derechos y obligaciones de la ley se exige una convivencia ininterrumpida de no menos de cinco años, es decir, más que un vínculo pasajero: una relación estable y sostenida en el tiempo. Ese plazo de al menos cinco años es la clave. La convivencia tiene que ser exclusiva y singular, lo que descarta situaciones de vínculos paralelos. Cumplido el requisito temporal y las demás condiciones, la pareja está en posición de que su unión sea reconocida jurídicamente. Pero cumplir los cinco años, por sí solo, no dispara automáticamente todos los efectos patrimoniales: para eso hace falta el reconocimiento.',
      },
      {
        heading: 'El reconocimiento no es automático',
        body: 'Este es el punto que más confusión genera. Convivir muchos años no equivale a estar casado, ni crea por sí solo una sociedad de bienes entre la pareja. Para que la unión concubinaria despliegue sus efectos patrimoniales hace falta, en general, un reconocimiento judicial de la unión, que puede promoverse en vida por uno o ambos concubinos, o incluso después. A partir de ese reconocimiento inscripto la comunidad de bienes se vuelve efectiva frente a terceros. En otras palabras: la convivencia es el hecho, pero el reconocimiento es lo que le da forma legal. Para trámites de seguridad social, la prueba de la convivencia se hace ante el organismo correspondiente.',
      },
      {
        heading: 'Qué derechos genera',
        body: 'Reconocida la unión, la ley genera varios derechos. Nace una comunidad de bienes que se rige, en lo aplicable, por las normas de la sociedad conyugal, salvo que la pareja pacte otra forma de administración. Surgen deberes de asistencia recíproca y derecho a alimentos entre los concubinos en ciertos casos. En materia de seguridad social, el conviviente puede acceder a pensión ante el fallecimiento del otro, probando la convivencia ante el BPS. Y en materia sucesoria, el concubino sobreviviente puede tener derechos hereditarios que la normativa reconoce, comparables a los de un cónyuge. Son efectos importantes, pero atados al cumplimiento de los requisitos legales.',
      },
      {
        heading: 'En qué se diferencia del matrimonio',
        body: 'Aunque comparten muchos efectos, matrimonio y unión concubinaria no son lo mismo. El matrimonio nace de un acto formal y produce efectos desde el día de la boda; la unión concubinaria exige la convivencia previa de al menos cinco años y, para su plenitud patrimonial, el reconocimiento. En el matrimonio la sociedad conyugal corre desde la boda; en el concubinato la comunidad de bienes recién se vuelve plenamente efectiva con el reconocimiento, aunque la sentencia debe fijar la fecha de comienzo de la unión y la comunidad, en principio, comprende los bienes adquiridos a título oneroso durante su vigencia (un punto sobre el que hay discusión doctrinaria). Además, ciertos trámites y protecciones son más automáticos en el matrimonio. Por eso, quienes quieren certezas desde el inicio a veces optan por casarse o por documentar bien su situación.',
      },
      {
        heading: 'Información general, no asesoramiento legal',
        body: 'Esta guía es información general con fines educativos y no constituye asesoramiento legal. La unión concubinaria tiene requisitos y efectos que dependen de cada caso, y el reconocimiento suele necesitar un trámite judicial. Para saber si tu situación encuadra en la Ley 18.246 y cómo obtener el reconocimiento y los derechos que genera, incluida la pensión ante el BPS, consultá con un abogado. Para definir la forma de administrar los bienes, un escribano también puede asesorarte. Un profesional evalúa tu caso concreto y evita errores costosos, sobre todo si hay bienes o hijos de por medio.',
      },
    ],
    related: [
      {
        label: 'Régimen patrimonial del matrimonio',
        to: '/guias/regimen-patrimonial-matrimonio-uruguay',
      },
      {
        label: 'Legítima y herederos forzosos',
        to: '/guias/legitima-y-herederos-forzosos-uruguay',
      },
      { label: 'Jubilación y AFAP', to: '/guias/jubilacion-y-afap-como-funciona-uruguay' },
    ],
  },
  {
    slug: 'como-dividir-gastos-en-pareja-uruguay',
    title: 'Cómo dividir los gastos en pareja',
    description:
      'Métodos prácticos para dividir los gastos en pareja: 50/50, proporcional al ingreso o pozo común, con sus ventajas y cómo elegir sin conflictos.',
    tag: 'PAREJA',
    updatedAt: '2026-07-18',
    sections: [
      {
        heading: 'No existe una única forma correcta',
        body: 'Antes que nada: dividir los gastos del día a día en pareja, en los hechos, es más un acuerdo de convivencia que un tema legal. No hay una fórmula obligatoria ni una única correcta. Lo que funciona para una pareja puede ser un desastre para otra, y eso está perfecto. Las tres formas más usadas son partir todo por la mitad, aportar en proporción a lo que gana cada uno, o armar un pozo común para los gastos compartidos y que cada uno maneje lo suyo aparte. Lo importante no es cuál elijan, sino que sea conversado, transparente y revisable. Un buen sistema es el que los dos sienten justo. Una distinción a tener presente: cómo reparten los gastos corrientes es una cosa, y otra distinta es el régimen patrimonial de la pareja (el matrimonio o una unión concubinaria reconocida), que sí tiene efectos legales sobre los bienes. Esto es información general; para lo patrimonial conviene asesorarse con un escribano o abogado.',
      },
      {
        heading: 'Método 50 y 50',
        body: 'Consiste en dividir cada gasto compartido por la mitad: alquiler, supermercado, cuentas, salidas. Es simple, transparente y fácil de llevar. Funciona muy bien cuando los ingresos de ambos son parecidos, porque el esfuerzo relativo es similar. Su punto débil aparece cuando hay una brecha grande de ingresos: para quien gana bastante menos, la mitad puede representar casi todo su sueldo, mientras que para el otro es una fracción menor. Ahí el 50/50 que suena tan justo en el papel termina generando tensión. Si los sueldos están alineados, sin embargo, suele ser la opción más clara y sin discusiones.',
      },
      {
        heading: 'Método proporcional al ingreso',
        body: 'Acá cada uno aporta según lo que gana. Si uno trae el 60% de los ingresos del hogar y el otro el 40%, así se reparten los gastos compartidos. La idea es igualar el esfuerzo, no el monto: ambos quedan con una proporción parecida de su sueldo libre después de los gastos comunes. Es el método que muchas parejas sienten más justo cuando hay diferencias reales de ingresos. Requiere algo más de conversación y confianza, porque implica poner los números sobre la mesa. Un cálculo sencillo: sumen los dos ingresos, saquen qué porcentaje aporta cada uno, y apliquen ese porcentaje a los gastos comunes.',
      },
      {
        heading: 'Pozo común más gastos personales',
        body: 'Un esquema muy práctico: cada uno deposita una parte de su sueldo en un fondo común, por transferencia o en una cuenta compartida, destinado a los gastos del hogar, y el resto lo maneja libremente cada uno. El aporte al pozo puede ser 50/50 o proporcional. La gracia es que combina lo compartido con la autonomía: los gastos de la casa están cubiertos y ordenados, pero cada uno conserva su plata para sus cosas sin tener que rendir cuentas de cada café. Reduce fricciones porque separa claramente lo nuestro de lo mío, que es una de las principales fuentes de discusión.',
      },
      {
        heading: 'Cómo elegir y evitar conflictos',
        body: 'Para elegir, miren tres cosas: cuán parecidos son sus ingresos, cuánta autonomía quiere cada uno, y qué tan cómodos están compartiendo información financiera. Si ganan parecido y les gusta la simpleza, el 50/50 alcanza. Si hay brecha de ingresos, el proporcional suele sentirse más justo. Si valoran independencia, el pozo común más gastos personales es ideal. Pongan los números por escrito, definan quién paga qué, y revisen el acuerdo cada tanto o cuando cambie un sueldo. La regla de oro: hablarlo sin dramas antes de que un gasto se transforme en un reproche. El sistema se ajusta; el diálogo lo sostiene.',
      },
    ],
    related: [
      {
        label: '¿Cuenta conjunta o separada?',
        to: '/guias/cuenta-conjunta-o-separada-pareja-uruguay',
      },
      { label: 'Hablar de dinero en pareja', to: '/guias/hablar-de-dinero-en-pareja-uruguay' },
      { label: 'Armar un presupuesto', to: '/guias/armar-un-presupuesto-personal-uruguay' },
    ],
    steps: [
      {
        name: 'Listá los gastos compartidos',
        text: 'Anotá todo lo común: alquiler, cuentas, supermercado, transporte, salidas. Separá los fijos de los variables para tener el panorama completo antes de decidir.',
      },
      {
        name: 'Pongan los ingresos sobre la mesa',
        text: 'Compartan cuánto gana cada uno. Sin ese dato no se puede definir un reparto justo, sobre todo si eligen el método proporcional al ingreso.',
      },
      {
        name: 'Elijan el método',
        text: 'Decidan entre 50/50, proporcional al ingreso, o pozo común más gastos personales, según cuán parecidos sean sus sueldos y cuánta autonomía quieran.',
      },
      {
        name: 'Definan quién paga qué',
        text: 'Asignen cada gasto a una persona o a la cuenta común y acuerden cómo se transfiere lo que corresponde para saldar entre ustedes.',
      },
      {
        name: 'Revisen cada tanto',
        text: 'Cuando cambie un sueldo, se muden o aparezca un gasto grande, vuelvan a mirar el acuerdo y ajústenlo sin dramas.',
      },
    ],
  },
  {
    slug: 'cuenta-conjunta-o-separada-pareja-uruguay',
    title: '¿Cuenta conjunta o separada? Cómo organizar las finanzas de pareja',
    description:
      'Cuenta conjunta, separada o mixta: cómo organizar las finanzas de pareja en Uruguay, cómo funciona una cuenta conjunta y qué riesgos tiene.',
    tag: 'FINANZAS',
    updatedAt: '2026-07-18',
    sections: [
      {
        heading: 'Tres formas de organizar la plata',
        body: 'Cuando una pareja convive, tarde o temprano aparece la pregunta: ¿juntamos todo en una cuenta, mantenemos todo separado, o hacemos una mezcla? No hay respuesta única; depende de cuánto quieran compartir y cuánta autonomía valoren. Los tres modelos básicos son: todo junto, con una sola cuenta para ambos; todo separado, cada uno con lo suyo pasándose lo que corresponde; o mixto, una cuenta común para los gastos compartidos más las cuentas propias de cada uno. Cada modelo tiene ventajas y riesgos concretos, y ninguno es más maduro que otro. Lo que importa es que sea una decisión conversada y revisable.',
      },
      {
        heading: 'Todo junto',
        body: 'En este modelo, ambos ingresos entran a una cuenta común y de ahí sale todo. Su gran ventaja es la simpleza y la sensación de proyecto compartido: no hay tu plata y mi plata, hay nuestra plata. Funciona bien en parejas consolidadas, con mucha confianza y objetivos alineados. Sus contras: se pierde algo de privacidad y autonomía, cualquiera de los dos puede disponer de todo, y si la relación se complica, desenredar la cuenta puede ser incómodo. También exige acuerdos claros sobre gastos personales para evitar que cada compra se convierta en tema. Es cómodo, pero pide alto nivel de confianza y comunicación.',
      },
      {
        heading: 'Todo separado',
        body: 'Cada uno mantiene su cuenta y sus ingresos, y los gastos compartidos se reparten pasándose transferencias. Es el modelo que da máxima autonomía y privacidad, y el más simple de deshacer si la relación termina. Suele gustar a quienes recién empiezan a convivir, a segundas parejas o a quienes valoran mucho su independencia financiera. La contra es que puede volverse engorroso: hay que estar calculando quién puso qué, y a veces genera una contabilidad constante que cansa. También puede faltar la sensación de proyecto común si nunca hay nada compartido. Funciona mejor con un buen sistema para registrar y saldar los gastos comunes.',
      },
      {
        heading: 'El modelo mixto',
        body: 'Es el término medio y, para muchas parejas, el más equilibrado. Se usa una cuenta común solo para los gastos compartidos, como alquiler, supermercado, cuentas y ahorro conjunto, a la que cada uno aporta una cantidad acordada, y cada quien conserva su cuenta propia con el resto de su sueldo. Combina lo mejor de los otros dos: orden y proyecto compartido para lo común, más autonomía y privacidad para lo personal. Reduce discusiones porque separa claramente los dos mundos. Es un buen punto de partida para parejas que quieren compartir sin resignar del todo su independencia. El aporte puede ser 50/50 o proporcional al ingreso.',
      },
      {
        heading: 'Cómo funciona una cuenta conjunta y qué riesgos tiene',
        body: 'En Uruguay podés abrir una cuenta bancaria conjunta, habitualmente de forma indistinta (a la orden recíproca), donde cualquiera de los dos titulares puede operar con su sola firma. Es cómodo, pero implica riesgos que conviene conocer. Cualquiera puede retirar o gastar todo el saldo sin consultar al otro. Los fondos también pueden quedar expuestos si uno de los titulares tiene deudas o un embargo, porque el saldo suele presumirse de ambos (en principio por partes iguales) y el otro podría tener que acreditar su parte para protegerla. Ante un conflicto o una separación, el acceso compartido puede complicarse. Abrir esta cuenta no mezcla por sí sola el resto de tu patrimonio ni cambia el régimen de bienes de la pareja, pero el dinero de esa cuenta sí queda al alcance de los dos. Usala para lo compartido, con montos acordados. Esto es información general: para las implicancias legales, sucesorias o de embargo conviene consultar con un escribano o abogado.',
      },
      {
        heading: 'Qué modelo para qué pareja',
        body: 'Como guía general: si son una pareja consolidada, con años juntos y objetivos comunes, el modelo todo junto puede resultar natural. Si recién arrancan a convivir, son segunda pareja o valoran mucho su independencia, todo separado da tranquilidad. Y si quieren compartir sin perder autonomía, el mixto suele ser el mejor equilibrio y el que menos conflictos genera. No es una decisión para siempre: se puede empezar separado e ir juntando a medida que crece la confianza, o al revés. Lo esencial es hablarlo, dejar claros los aportes y revisar el esquema cuando cambien los ingresos o la etapa de la pareja.',
      },
    ],
    related: [
      {
        label: 'Cómo dividir los gastos en pareja',
        to: '/guias/como-dividir-gastos-en-pareja-uruguay',
      },
      { label: 'Abrir una cuenta bancaria', to: '/guias/abrir-una-cuenta-bancaria-uruguay' },
      { label: 'Mejores bancos de Uruguay', to: '/mejores-bancos-uruguay' },
    ],
  },
  {
    slug: 'hablar-de-dinero-en-pareja-uruguay',
    title: 'Cómo hablar de dinero en pareja y armar un presupuesto juntos',
    description:
      'Cómo hablar de dinero en pareja sin conflictos: transparencia, objetivos comunes, presupuesto compartido y cómo manejar estilos distintos.',
    tag: 'PAREJA',
    updatedAt: '2026-07-18',
    sections: [
      {
        heading: 'Por qué cuesta hablar de plata',
        body: 'En muchas parejas el dinero es el último tabú: se habla de todo menos de cuánto gana cada uno, qué deudas arrastra o qué miedos tiene con la plata. Detrás hay pudor, historias familiares y a veces vergüenza. Pero evitar el tema no lo desactiva: lo acumula, hasta que estalla en una discusión por una compra cualquiera que en realidad venía de algo más grande. Hablar de dinero de forma abierta y sin juzgar es una de las mejores inversiones en la relación. No se trata de controlar al otro, sino de estar en la misma página y tomar decisiones juntos con la información sobre la mesa.',
      },
      {
        heading: 'Transparencia sobre ingresos y deudas',
        body: 'El punto de partida es poner las cartas boca arriba: cuánto gana cada uno, qué gastos fijos tiene, y sobre todo qué deudas trae. Las deudas ocultas son una de las mayores fuentes de crisis, porque cuando aparecen rompen la confianza más que el monto en sí. No hace falta fusionar todo ni renunciar a la privacidad, pero sí compartir el panorama general para poder planificar. Elegí un momento tranquilo, sin reproches, y contá tu situación real. Si uno tiene deudas, encararlo como un problema del equipo y no como una culpa individual cambia por completo la conversación. La transparencia temprana evita sorpresas caras.',
      },
      {
        heading: 'Definir objetivos comunes',
        body: 'Hablar de plata es mucho más lindo cuando se orienta a metas y no solo a controlar gastos. ¿Quieren juntar para un viaje, para la seña de una casa, para tener un colchón de emergencia, para los hijos? Poner objetivos concretos, con monto y plazo, le da sentido al esfuerzo y alinea las decisiones del día a día. Cuando los dos saben para qué están ahorrando, resignar un gasto deja de ser un sacrificio impuesto y pasa a ser una elección compartida. Anoten las metas, priorícenlas y revisen el avance cada tanto. Un objetivo común es el mejor pegamento para las finanzas de la pareja.',
      },
      {
        heading: 'Armar un presupuesto compartido',
        body: 'Un presupuesto no es una jaula, es un mapa. Se trata de anotar cuánto entra, cuánto sale y en qué, para tomar decisiones con datos y no con la sensación de que no alcanza. Empiecen por registrar un par de meses de gastos reales, agrúpenlos en vivienda, comida, transporte, salidas y ahorro, y definan cuánto quieren destinar a cada rubro. No apunten a la perfección: un presupuesto simple que sí usan vale más que uno detallado que abandonan a la semana. Revísenlo juntos, ajústenlo cuando cambie un ingreso y celebren cuando logran una meta. La idea es que trabaje para ustedes, no al revés.',
      },
      {
        heading: 'Cuando uno ahorra y el otro gasta',
        body: 'Es de los choques más comunes: uno vive apretando el mango y el otro disfruta gastando. Ninguno de los dos está mal: son estilos, muchas veces heredados de cómo se vivió la plata en cada casa. La clave es no demonizar al otro. El ahorrador aporta seguridad y previsión; el gastador, disfrute y presente. Un buen acuerdo respeta las dos cosas: metas de ahorro claras y, a la vez, un margen de dinero personal que cada uno usa como quiera sin rendir cuentas. Cuando cada estilo tiene su espacio, dejan de pelear por quién tiene razón y empiezan a complementarse.',
      },
      {
        heading: 'Mantener la conversación viva',
        body: 'Hablar de dinero no es una charla única, es un hábito. Muchas parejas arman una pequeña reunión financiera periódica, por ejemplo una vez al mes: revisan cómo vino el presupuesto, cómo van las metas, qué gasto grande se viene y si hay que ajustar algo. No tiene que ser solemne; puede ser con un café y en veinte minutos. Lo importante es que sea regular y sin reproches, un espacio para decidir en equipo y no para pasar factura. Con el tiempo, tener el tema sobre la mesa deja de generar tensión y se vuelve parte natural de construir un proyecto juntos.',
      },
    ],
    related: [
      {
        label: 'Cómo dividir los gastos en pareja',
        to: '/guias/como-dividir-gastos-en-pareja-uruguay',
      },
      { label: 'Armar un presupuesto', to: '/guias/armar-un-presupuesto-personal-uruguay' },
      { label: 'Salud financiera', to: '/salud-financiera' },
    ],
  },
  {
    slug: 'division-de-bienes-en-el-divorcio-uruguay',
    title: 'División de bienes en un divorcio en Uruguay',
    description:
      'Cómo se dividen los bienes en un divorcio en Uruguay: los gananciales se reparten por mitades, los propios quedan de cada uno y la pensión a los hijos va aparte.',
    tag: 'DIVORCIO',
    updatedAt: '2026-07-18',
    sections: [
      {
        heading: 'Qué pasa con los bienes al divorciarse',
        body: 'Al divorciarse, si la pareja estaba bajo el régimen de sociedad conyugal, el que rige por defecto, se disuelve esa sociedad y hay que liquidarla: hacer el inventario de los bienes, definir cuáles son gananciales y cuáles propios, y repartir. La disolución puede pedirla cualquiera de los cónyuges, sin necesidad de expresar causa, e incluso decretarse por vía judicial durante el matrimonio. La liquidación puede hacerse de común acuerdo ante escribano, si hay entendimiento, o por vía judicial si no lo hay. La regla de fondo es sencilla de enunciar: los gananciales se reparten, en principio, por mitades, y los bienes propios quedan de cada uno. El detalle está en clasificar bien cada bien.',
      },
      {
        heading: 'Qué es ganancial y qué es propio',
        body: 'Son gananciales los bienes adquiridos durante el matrimonio con el esfuerzo común: la casa comprada estando casados, el auto, los ahorros e inversiones generados en ese período, sin importar a nombre de quién figuren. Son propios los que cada uno traía antes de casarse y los recibidos durante el matrimonio por herencia, legado o donación. Esos no se reparten: quedan del cónyuge titular. La distinción es la que decide qué entra al reparto y qué no. Por eso, cuando hay bienes de origen propio mezclados con la vida en común, poder probar ese origen con escrituras o sucesiones se vuelve determinante para no perder lo que era tuyo.',
      },
      {
        heading: 'La regla de las mitades, las deudas y la vivienda',
        body: 'Los gananciales se dividen en principio por mitades, pero antes de repartir hay que descontar las deudas de la sociedad. Si la casa tiene hipoteca, esa deuda también es de la sociedad: al vender, primero se cancela la hipoteca y el resto se reparte. Ojo con la prueba: la normativa vigente presume que lo que existe al disolverse es ganancial, salvo que se demuestre lo contrario, así que quien afirma que un bien es propio debe probarlo. La vivienda familiar suele ser el punto más sensible: se puede vender y repartir, o acordar que uno la ocupe, y si uno usa en exclusiva un bien común, el otro puede reclamar una compensación.',
      },
      {
        heading: 'La pensión alimenticia a los hijos',
        body: 'El reparto de bienes es una cosa; la obligación con los hijos, otra distinta e independiente del régimen patrimonial. Ambos padres deben seguir contribuyendo a la manutención de los hijos según sus posibilidades, y habitualmente se fija una pensión alimenticia a cargo del progenitor que no queda al cuidado diario. Esa pensión cubre alimentación, vivienda, salud, educación y demás necesidades, y puede acordarse entre las partes u homologarse y fijarse judicialmente. No desaparece porque el matrimonio se haya disuelto ni porque no hubiera gananciales para repartir: es un derecho de los hijos, no de los adultos, y se sostiene con independencia de cómo se dividió el patrimonio.',
      },
      {
        heading: 'Y si habían pactado separación de bienes',
        body: 'Si la pareja se había casado bajo separación de bienes, mediante capitulaciones otorgadas ante escribano antes del casamiento, el divorcio es mucho más simple en lo patrimonial: como nunca se formaron gananciales, no hay una masa común que liquidar. Cada uno se queda con lo suyo, porque durante todo el matrimonio los patrimonios corrieron por separado. Puede haber que aclarar la situación de algún bien comprado entre los dos en condominio, pero no hay reparto de gananciales por mitades. Esto muestra por qué algunas parejas eligen ese régimen de entrada: no por desconfianza, sino para que, si un día se separan, las cuentas ya estén claras. La obligación con los hijos, igual, sigue intacta.',
      },
      {
        heading: 'Información general, no asesoramiento legal',
        body: 'Esta guía es información general con fines educativos y no constituye asesoramiento legal. La liquidación de la sociedad conyugal y la fijación de la pensión alimenticia dependen de los bienes, las deudas y la situación de cada familia. Si vas a divorciarte, consultá con un abogado, que te representa en el divorcio y en los acuerdos sobre hijos y alimentos; para la liquidación y el reparto de bienes, un escribano interviene en las escrituras. Asesorarte a tiempo te ayuda a proteger tus derechos y a llegar a acuerdos más justos y ordenados.',
      },
    ],
    related: [
      {
        label: 'Régimen patrimonial del matrimonio',
        to: '/guias/regimen-patrimonial-matrimonio-uruguay',
      },
      { label: 'Separación de bienes', to: '/guias/separacion-de-bienes-uruguay' },
      { label: 'Cómo funciona una sucesión', to: '/guias/como-funciona-una-sucesion-uruguay' },
    ],
  },
  {
    slug: 'proteger-tu-patrimonio-en-pareja-uruguay',
    title: 'Cómo proteger tu patrimonio en pareja en Uruguay',
    description:
      'Herramientas legítimas para proteger tu patrimonio en pareja en Uruguay: capitulaciones, separación de bienes, testamento y documentar aportes.',
    tag: 'PATRIMONIO',
    updatedAt: '2026-07-18',
    sections: [
      {
        heading: 'Proteger no es esconder',
        body: 'Proteger tu patrimonio en pareja no significa desconfiar ni ocultar cosas al otro. Significa ordenar de antemano qué es de cada uno, qué es común y cómo quieren manejarlo, para evitar conflictos, malentendidos y juicios largos si algún día la relación se complica o si aparece un problema externo, como una deuda o una empresa que anda mal. Hecho a la luz y de común acuerdo, es un gesto de madurez y de cuidado mutuo, no de egoísmo. La clave es usar herramientas legítimas y transparentes, nunca maniobras para perjudicar a nadie. Ordenar hoy, con la relación sana, siempre es más fácil y más justo que improvisar en una crisis.',
      },
      {
        heading: 'Situaciones donde conviene ordenarse',
        body: 'Hay escenarios en los que ordenar el patrimonio se vuelve especialmente recomendable. Cuando los aportes son muy desiguales: uno pone la casa y el otro no, por ejemplo. Cuando llegás a la pareja con bienes previos importantes que querés preservar. Cuando hay hijos de otras relaciones y querés proteger su herencia. Y cuando uno de los dos tiene o va a abrir una empresa, porque conviene que el riesgo del negocio no se lleve puesto el patrimonio familiar. En todos esos casos, dejar las reglas claras desde el principio evita que un día se discuta qué era de quién. Cuanto más desigual o compleja la situación, más vale la pena preverlo.',
      },
      {
        heading: 'Capitulaciones y separación de bienes',
        body: 'La herramienta más directa es elegir el régimen patrimonial. Antes de casarte podés firmar capitulaciones matrimoniales ante escribano y optar por la separación de bienes, con lo que cada uno conserva lo suyo y no se forman gananciales; una vez celebrado el matrimonio, esas capitulaciones ya no se pueden modificar. Es lo habitual para empresarios, segundas parejas o patrimonios muy dispares. Si ya estás casado bajo sociedad conyugal, el camino para separar patrimonios es la disolución judicial de la sociedad, que tramita un abogado. Y si conviven sin casarse, tené presente que el concubinato no genera bienes comunes de forma automática: recién cuando la unión concubinaria se reconoce judicialmente, tras al menos cinco años de convivencia (Ley 18.246), nace una sociedad de bienes que se rige por reglas parecidas a las de la conyugal, así que también ahí conviene asesorarse.',
      },
      {
        heading: 'Testamento respetando la legítima',
        body: 'Si querés tener control sobre qué pasa con tus bienes el día de mañana, el testamento es una herramienta legítima, sobre todo en familias ensambladas o con hijos de distintas relaciones. Pero en Uruguay no podés disponer libremente de todo: la normativa protege a ciertos herederos forzosos, en general los hijos, con la llamada legítima, una porción que no podés quitarles. Sobre la parte de libre disposición sí podés decidir. Por eso el testamento se hace con asesoramiento, para que sea válido y respete esos límites. Bien usado, te permite ordenar tu sucesión, evitar peleas entre herederos y cuidar a quienes querés, sin pretender saltear derechos que la ley garantiza.',
      },
      {
        heading: 'Documentar aportes y aclarar bienes propios',
        body: 'Mucho se resuelve simplemente con orden y papeles. Si un bien es propio, porque lo tenías antes o lo recibiste por herencia o donación, guardá la escritura, la sucesión o la documentación de la donación: si mañana hay que liquidar, la normativa presume ganancial lo que no puedas probar como propio. Si aportás plata para una compra común, dejá constancia de cuánto pusiste. Si prestás dinero a la pareja o a su emprendimiento, documentalo. Nada de esto es desconfiar: es tener las cosas claras para que nadie tenga que reconstruir de memoria, en el peor momento, quién puso qué. La prueba ordenada es tu mejor protección.',
      },
      {
        heading: 'Información general, no asesoramiento legal',
        body: 'Esta guía es información general con fines educativos y no constituye asesoramiento legal. Proteger el patrimonio de forma correcta exige mirar tu caso concreto: régimen de bienes, hijos, empresa y herencia. Para capitulaciones, testamentos y escrituras, consultá con un escribano; para divorcios, reconocimiento de unión concubinaria o conflictos, con un abogado. Se trata de usar herramientas legales y transparentes, nunca de perjudicar a tu pareja ni a terceros. Un buen asesoramiento profesional te permite ordenar todo con tranquilidad y dentro de la ley, previniendo problemas antes de que aparezcan.',
      },
    ],
    related: [
      { label: 'Separación de bienes', to: '/guias/separacion-de-bienes-uruguay' },
      { label: 'Hacer un testamento', to: '/guias/hacer-un-testamento-uruguay' },
      {
        label: 'Legítima y herederos forzosos',
        to: '/guias/legitima-y-herederos-forzosos-uruguay',
      },
    ],
  },
]
