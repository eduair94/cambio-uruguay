// El post diario de LinkedIn: un feed RSS (`/feeds/linkedin.xml`) que IFTTT lee cada hora y
// publica en el perfil personal del dueño del sitio (applet "RSS Feed → LinkedIn: Share an update").
// La guía de armado del applet está en `docs/app/LINKEDIN_FEED.md`.
//
// POR QUÉ LOS TEXTOS ESTÁN ESCRITOS A MANO Y NO LOS GENERA UN MODELO: el pedido fue "que no suene
// a IA", y lo que delata a un texto generado no es una palabra suelta sino el patrón entero (la
// pregunta retórica de apertura, la raya, los tres adjetivos, el emoji, la moraleja final). Un
// banco fijo, revisado una vez, no deriva; un modelo llamado todos los días, sí. El test de este
// archivo vigila las marcas más obvias para que un post agregado después no las traiga de vuelta.
//
// REGLA PARA AGREGAR UN POST (la misma de `bots/src/format/promos.ts`): cada afirmación tiene que
// ser algo que la página enlazada realmente dice, y estable — sin montos, porcentajes ni fechas que
// envejecen. Esto sale bajo el nombre de una persona, a sus contactos, y LinkedIn no deja corregir
// sin que se note: un número viejo es un número público equivocado. Preferir el mecanismo ("la
// prescripción hay que oponerla") a la magnitud. La única cifra viva es la del post del dólar de
// los lunes, que se calcula en el momento con las mismas guardas que la portada.

export const LINKEDIN_SITE = 'https://cambio-uruguay.com'

/** Primer día de la rotación: `LINKEDIN_POSTS[0]` sale este día. */
export const LINKEDIN_EPOCH = '2026-11-13'

/** Hora de Montevideo desde la que el post del día aparece en el feed. IFTTT gratis lo lee cada hora. */
export const LINKEDIN_POST_HOUR = 9

export interface LinkedinPost {
  /** Identificador estable, sólo para tests y logs. */
  id: string
  /** Ruta del sitio, sin prefijo de idioma ni barra final. Tiene que existir. */
  path: string
  /** Párrafos separados por una línea en blanco. Sin la URL: se agrega al renderizar. */
  text: string
}

// El orden alterna familias (dinero, trabajo, vivienda, deudas, compras, cosas que medí armando el
// sitio) para que dos días seguidos no hablen de lo mismo.
export const LINKEDIN_POSTS: readonly LinkedinPost[] = Object.freeze([
  {
    id: 'cuotas-sin-interes',
    path: '/conviene-comprar-en-cuotas',
    text: 'Doce cuotas sin interés casi nunca salen gratis.\n\nHay dos costos que no aparecen en la vidriera. El seguro sobre saldo deudor, que te cobran todos los meses sobre lo que falta pagar. Y la rebaja de IVA que tenés pagando con débito, que en cuotas con la tarjeta de crédito no aparece.\n\nHice la cuenta completa, con una calculadora para que pruebes con tu compra:',
  },
  {
    id: 'contractor',
    path: '/contractor-en-uruguay',
    text: 'Si te ofrecen pasar a facturar como contractor, no compares tu nominal contra lo que vas a facturar.\n\nEn relación de dependencia cobrás trece sueldos al año con el aguinaldo, más la licencia paga y el salario vacacional. Facturando lo mismo que tu nominal ya arrancás abajo, y eso antes de pagar tus aportes y pensar en tu jubilación.\n\nArmé la cuenta para ver cuánto tendrías que facturar para quedar igual:',
  },
  {
    id: 'deuda-prescripta',
    path: '/guias/cuando-prescribe-una-deuda-uruguay',
    text: 'Una deuda vieja no se borra sola por el paso del tiempo.\n\nLa prescripción hay que oponerla: si te reclaman y no decís nada, no se aplica sola. Y hay una trampa muy común: pagar una cuota de esa deuda, aunque sea chica, reinicia el reloj.\n\nSi te llamó un estudio por algo de hace años, leé esto antes de pagar:',
  },
  {
    id: 'garantia-o-deposito',
    path: '/guias/garantias-de-alquiler-uruguay',
    text: 'Cuando buscás alquiler, garantía y depósito parecen lo mismo. No lo son.\n\nLa garantía la emite un tercero, como ANDA, la CGN o una aseguradora, que cobra por asumir el riesgo. El depósito es plata tuya que queda inmovilizada y que te tienen que devolver.\n\nEsa diferencia cambia cuánto ponés al entrar y qué recuperás al irte:',
  },
  {
    id: 'horas-extra',
    path: '/guias/horas-extra-en-uruguay',
    text: 'Las horas extra se pagan aunque nadie las haya autorizado por escrito.\n\nAlcanza con que la empresa supiera que te quedabas y lo tolerara. El "yo no te pedí que te quedes" no te saca el derecho a cobrarlas.\n\nCómo se calculan y cuándo corresponden:',
  },
  {
    id: 'dolares-con-debito',
    path: '/tarjetas-de-debito-uruguay',
    text: 'Pagar en dólares con débito o con una prepaga no cuesta lo mismo en todas las tarjetas uruguayas.\n\nCambia el recargo que pone cada emisor y cambia el tipo de cambio que aplica. Por la misma compra en una tienda del exterior, la diferencia entre una tarjeta y otra es plata.\n\nHice un ranking con calculadora para ver cuál te conviene según lo que gastás afuera:',
  },
  {
    id: 'transferencia-equivocada',
    path: '/guias/transferencia-a-cuenta-equivocada-uruguay',
    text: 'Te equivocaste en un número y le transferiste a otra persona. El banco no te devuelve la plata por su cuenta.\n\nLo que hace es pedirle al que la recibió que autorice la devolución. Si esa persona no autoriza, el camino que queda es judicial.\n\nQué podés hacer y en qué orden:',
  },
  {
    id: 'pizarras-quietas',
    path: '/',
    text: 'Comparando casas de cambio encontré algo que no esperaba: pizarras que muestran el mismo precio durante semanas.\n\nEl dólar se mueve y ese número no. Con el tiempo queda en un extremo, y si ordenás por "más barato" termina arriba de todo, aunque sea un precio que nadie actualizó.\n\nAhora el sitio marca cada pizarra que lleva días sin moverse. Si comparás antes de ir a cambiar, fijate en esa marca:',
  },
  {
    id: 'deuda-vendida',
    path: '/guias/me-compraron-la-deuda-uruguay',
    text: 'Te llega una carta de una empresa que nunca escuchaste nombrar diciendo que ahora tu deuda es de ellos.\n\nVender una deuda no necesita tu permiso. Pero te lo tienen que notificar, con el título que lo prueba, y hasta que eso pase el pago válido sigue siendo al acreedor original.\n\nCómo verificar a quién le debés de verdad:',
  },
  {
    id: 'comisiones-transferencia',
    path: '/comisiones-de-transferencia-uruguay',
    text: 'Pasar plata de un banco a otro en Uruguay a veces es gratis y a veces no. Depende del par de bancos y de la moneda.\n\nJunté el tarifario de cada banco y fintech, con la fila textual de donde sale cada comisión, para no depender de lo que te diga alguien en una sucursal.\n\nAntes de mover plata entre cuentas:',
  },
  {
    id: 'base-del-despido',
    path: '/guias/despido-y-liquidacion-uruguay',
    text: 'La indemnización por despido no se calcula sobre el nominal a secas.\n\nEntran todas las partidas salariales que cobrás de forma habitual, promediadas. Mucha gente firma la liquidación sin revisar si esas partidas están incluidas.\n\nCómo armar la cuenta antes de firmar:',
  },
  {
    id: 'impuesto-temu',
    path: '/guias/impuesto-temu-uruguay',
    text: 'El impuesto a las compras en Temu no lo cobra Temu.\n\nLo liquida el correo o el courier cuando el paquete llega a Uruguay, y lo retienen hasta que pagás el IVA. Por eso el total que viste en la app no siempre es lo que terminás pagando.\n\nCómo funciona y cuándo aplica:',
  },
  {
    id: 'mercado-it',
    path: '/mercado-it-uruguay',
    text: 'Junté todo lo que se escribió en r/CharruaDevs sobre el futuro de la profesión desde 2022: más de cien mil posts y comentarios.\n\nLos clasifiqué uno por uno con un modelo de lenguaje y armé la curva mes a mes. Las opiniones negativas pasaron de ser minoría a ser la gran mayoría. Tiene buscador por tema y por sentimiento.\n\nSi trabajás en software en Uruguay, capaz te interesa:',
  },
  {
    id: 'clearing-alquiler',
    path: '/alquilar-estando-en-clearing',
    text: 'Estar en el Clearing no te deja afuera de todas las garantías de alquiler.\n\nHay una ley que le prohíbe a los organismos públicos negarte el servicio por figurar en una base de datos comercial. No todas las opciones sirven igual, pero salida hay.\n\nCuál te sirve según tu caso:',
  },
  {
    id: 'aliexpress',
    path: '/guias/importar-de-aliexpress-a-uruguay',
    text: 'AliExpress te parte el carrito en varios paquetes, y eso importa más de lo que parece.\n\nCada número de seguimiento es una declaración aparte, con su propio mínimo. Lo que pensabas como una sola compra, para la Aduana pueden ser tres.\n\nCómo funciona:',
  },
  {
    id: 'cobrar-en-dolares',
    path: '/cobrar-en-dolares-gastar-en-pesos',
    text: 'Si cobrás en dólares y gastás en pesos, hay tres formas de hacer la vuelta y no cuestan lo mismo.\n\nLas comparé paso a paso. Un detalle que casi todos calculan mal: la rebaja de IVA por pagar con débito es menor que los dos puntos que se repiten, porque esos dos puntos se descuentan sobre el precio sin IVA.\n\nLa cuenta, para que la hagas con los números de tu propio resumen:',
  },
  {
    id: 'deposito-alquiler',
    path: '/guias/deposito-de-alquiler-uruguay',
    text: 'El depósito del alquiler es tuyo. Al irte sólo te pueden descontar deudas y daños que vayan más allá del desgaste normal.\n\nLo que se gasta por el uso no se cobra. Y en esa discusión lo que te defiende es el inventario que firmaste al entrar, mejor si tiene fotos.\n\nSi estás por mudarte, esto conviene hacerlo el primer día:',
  },
  {
    id: 'sueldo-liquido',
    path: '/herramientas/calculadora-sueldo-liquido',
    text: 'Cuando te ofrecen un sueldo en Uruguay te dicen el nominal. Lo que te llega a la cuenta es otra cosa.\n\nBPS, FONASA, IRPF y, si te toca, el Fondo de Solidaridad, cada uno con su regla. Hice una calculadora que muestra cada descuento por separado en lugar de tirarte un número final.\n\nSirve para negociar sabiendo cuánto vas a cobrar:',
  },
  {
    id: 'paro-arreglado',
    path: '/guias/pedir-que-me-despidan-uruguay',
    text: 'Pedirle a la empresa que te despida para poder cobrar el seguro de paro puede salir mal.\n\nEl seguro exige que la desocupación sea forzosa. Si el despido fue un acuerdo y eso queda a la vista, podés quedarte sin el subsidio.\n\nLo que conviene saber antes de proponerlo:',
  },
  {
    id: 'tarjetas-credito',
    path: '/tarjetas-de-credito-uruguay',
    text: 'Comparé los programas de puntos y beneficios de las tarjetas de crédito uruguayas con un puntaje ponderado.\n\nDejé cada criterio y cada número a la vista. Si no estás de acuerdo con cuánto pesa algo, ves exactamente de dónde sale el resultado y sacás tu propia conclusión.\n\nEl ranking:',
  },
  {
    id: 'comision-inmobiliaria',
    path: '/guias/comision-inmobiliaria-uruguay',
    text: 'No hay ninguna ley que fije la comisión inmobiliaria en Uruguay.\n\nEl porcentaje que todo el mundo repite sale de un arancel privado. Es una referencia, no una obligación, y se negocia.\n\nLo que conviene saber antes de firmar:',
  },
  {
    id: 'bancos-tier',
    path: '/mejores-bancos-uruguay',
    text: 'Armé una tier list de bancos y fintech uruguayas mirando la app, las comisiones, la atención y lo que te cobran por cosas que hacés todos los días.\n\nLos tiers salen de un puntaje, no de una opinión, y el puntaje está a la vista.\n\nCapaz te cambia la idea sobre tu banco, o capaz te la confirma:',
  },
  {
    id: 'feriados-pagos',
    path: '/guias/feriados-en-uruguay-como-se-pagan',
    text: 'No todos los feriados se pagan doble en Uruguay. Son cinco.\n\nCarnaval y Semana de Turismo son feriados comunes: si trabajás esos días, cobrás lo mismo que cualquier otro día.\n\nCuáles son los cinco y cómo se pagan:',
  },
  {
    id: 'renuncia',
    path: '/renunciar-al-trabajo-uruguay',
    text: 'Si renunciás, la empresa no te puede tener esperando la liquidación todo lo que quiera.\n\nTiene un plazo corto para pagarte la licencia que no gozaste, el salario vacacional y el aguinaldo que te toca. Si se pasa, corre un recargo.\n\nQué te tienen que pagar y en qué plazo:',
  },
  {
    id: 'autos-baratos',
    path: '/oportunidades-autos-usados-uruguay',
    text: 'Armando una lista de autos usados baratos aprendí que "más barato que el promedio" casi nunca quiere decir ganga.\n\nCasi siempre es otra versión, otro motor o una caja distinta. Si comparás sólo por modelo y año, aparecen montones de oportunidades que no existen.\n\nPor eso la lista compara cada auto contra el mismo modelo, año, versión, motor y caja, con los comparables a la vista:',
  },
  {
    id: 'cuenta-vaciada',
    path: '/estafas-uruguay',
    text: 'Si te vacían la cuenta, la pregunta que importa es quién tiene que probar qué.\n\nEn Uruguay la carga de la prueba no está donde la mayoría cree. Y con las billeteras virtuales estás menos protegido que con una tarjeta.\n\nQué hacer y a quién reclamarle:',
  },
  {
    id: 'monotributo',
    path: '/facturar-en-monotributo-uruguay',
    text: 'Si sos monotributista, no estás obligado a emitir factura electrónica.\n\nSi alguien te dijo que sí, es muy probable que te esté vendiendo un servicio que no necesitás.\n\nCómo funciona la facturación en el monotributo:',
  },
  {
    id: 'comprar-o-alquilar',
    path: '/comprar-o-alquilar-uruguay',
    text: '"Pagar alquiler es tirar la plata" es una frase que deja afuera varios costos de comprar.\n\nLa cuota no es lo único que pagás cuando comprás una vivienda. Puse todos los costos en una calculadora para que compares las dos opciones con tus propios números.\n\nComprar o alquilar:',
  },
  {
    id: 'api-cotizaciones',
    path: '/empresas',
    text: 'Si estás armando algo que necesita el tipo de cambio en Uruguay, no hace falta que scrapees casas de cambio.\n\nLas cotizaciones de más de 40 casas, actualizadas cada 5 minutos, con historial intradía y de la región, están disponibles por API. La clave es gratis y se saca en un minuto.\n\nDocumentación y planes:',
  },
  {
    id: 'itp-catastro',
    path: '/guias/costos-de-escrituracion-uruguay',
    text: 'El ITP de una compraventa no se calcula sobre el precio que pagaste.\n\nSe calcula sobre el valor real de Catastro, y lo pagan comprador y vendedor, cada uno su parte. Es uno de los costos que más sorprende cuando llega el momento de escriturar.\n\nTodos los costos de escriturar, en una lista:',
  },
  {
    id: 'tope-usura',
    path: '/ley-de-usura-uruguay',
    text: 'El tope de usura en Uruguay no es un número fijo.\n\nEs un recargo sobre la tasa media que publica el BCU, y el BCU la vuelve a publicar todos los meses. Así que el tope también se mueve, y cambia según el tipo de crédito y la moneda.\n\nLa tabla vigente, con su fecha:',
  },
  {
    id: 'fonasa-sin-trabajo',
    path: '/guias/me-quede-sin-trabajo-mutualista-fonasa-uruguay',
    text: 'Te quedaste sin trabajo. La mutualista por FONASA no se corta ese mismo día.\n\nLa cobertura llega hasta fin de mes, y tus hijos la conservan un año.\n\nQué pasa con tu cobertura en cada caso:',
  },
  {
    id: 'paquete-trancado',
    path: '/problemas-con-la-aduana-uruguay',
    text: 'Tu paquete está trancado y el seguimiento dice algo que no entendés.\n\nEscribí una guía por síntoma: qué quiere decir cada estado, a quién le toca resolverlo y qué trámite existe de verdad para cada caso, así no perdés días reclamando en el lugar equivocado.\n\nPor si te pasa:',
  },
  {
    id: 'fiador-solidario',
    path: '/guias/ser-garante-o-codeudor-riesgos-uruguay',
    text: 'Antes de firmar como garante de alguien, fijate si el contrato dice "fiador solidario".\n\nSer solidario es renunciar a que primero le cobren al deudor. Si no paga, te pueden reclamar el total directamente a vos.\n\nQué estás firmando en cada caso:',
  },
  {
    id: 'nafta',
    path: '/precio-de-la-nafta-uruguay',
    text: 'El precio de la nafta en Uruguay cambia una vez por mes, el primer día.\n\nArmé una página con los precios vigentes de ANCAP, cuánto cambiaron contra el mes anterior y el histórico mes a mes, para no tener que salir a buscar el comunicado cada vez:',
  },
  {
    id: 'moneda-tiendas',
    path: '/equipar-casa-uruguay',
    text: 'Comparando precios de tiendas online uruguayas encontré una que le decía a los buscadores que sus productos estaban en pesos, cuando en su propia vidriera muchos estaban en dólares.\n\nSi te quedás con ese dato, una heladera de mil dólares aparece a mil pesos. Ahora cada precio se compara contra lo que la tienda muestra en pantalla, y si no coincide se descarta.\n\nCuánto sale equipar una casa, con precios revisados:',
  },
  {
    id: 'salario-vacacional',
    path: '/salario-vacacional-uruguay',
    text: 'El salario vacacional se cobra antes de salir de licencia, no después.\n\nEs el jornal líquido por cada día de licencia, no lleva aportes al BPS y el IRPF va aparte. Si te lo pagan con el sueldo del mes siguiente, te lo están pagando tarde.\n\nSimulador con tus días según la antigüedad:',
  },
  {
    id: 'irpf-declaracion',
    path: '/declaracion-de-irpf-uruguay',
    text: 'La mayoría de los que trabajan en relación de dependencia no tiene que presentar declaración jurada de IRPF.\n\nSi te toca, o si te conviene presentarla igual, depende de tus ingresos del año y de lo que te retuvieron. Si da negativo es una devolución, y si da a pagar se puede hacer en cuotas.\n\nCómo saber en qué caso estás:',
  },
  {
    id: 'ia-datos',
    path: '/buscar-con-ia',
    text: 'Conecté los datos del sitio a Claude y a ChatGPT.\n\nLe podés pedir un alquiler según tu presupuesto y el viaje al trabajo, autos usados que piden menos que otros iguales, o que te compare barrios, y te contesta con los avisos y precios reales. Es gratis.\n\nCómo conectarlo:',
  },
  {
    id: 'laudo',
    path: '/cuanto-me-tienen-que-pagar-uruguay',
    text: 'Tu sueldo mínimo no es el Salario Mínimo Nacional.\n\nEs el laudo de tu grupo, subgrupo y categoría, el que fijan los Consejos de Salarios, y es exigible. Si no sabés cuál es el tuyo, se puede consultar gratis.\n\nCómo ubicarlo:',
  },
  {
    id: 'cambio-fin-de-semana',
    path: '/casas-de-cambio-abiertas-fin-de-semana',
    text: 'Necesitás cambiar plata un sábado o un domingo. Hay más lugares abiertos de los que parece.\n\nJunté todos los mostradores de casas de cambio y bancos que abren el fin de semana, con dirección y horario, según lo que cada uno declara ante el BCU:',
  },
  {
    id: 'deuda-antes-de-invertir',
    path: '/plan-de-vida-uruguay',
    text: 'Antes de pensar en invertir, mirá si tenés deuda de consumo.\n\nCancelar una tarjeta o un préstamo caro casi siempre rinde más que cualquier colocación que consigas. Armé un orden para cada peso que entra, con la tasa pública del BCU de cada paso:',
  },
  {
    id: 'cuenta-remunerada',
    path: '/cuenta-remunerada-uruguay',
    text: 'Las cuentas que te pagan "rendimiento diario" por el saldo no te están pagando interés.\n\nLo que hacen es invertir tu saldo en un fondo. No funciona como un depósito: el rendimiento no está garantizado y el riesgo es otro.\n\nQué rinde cada una y qué riesgo tiene:',
  },
  {
    id: 'autos-declarados',
    path: '/autos-chocados-y-con-deuda-uruguay',
    text: 'Junté los avisos de autos usados donde el propio vendedor dice que el auto tiene deuda, choque, recupero de seguro o papeles pendientes.\n\nCada uno con su frase textual y cuánto menos piden que los mismos autos que no declaran nada. Sirve para tener una idea de cuánto pesa cada problema en el precio:',
  },
  {
    id: 'auto-u-omnibus',
    path: '/conviene-auto-moto-o-omnibus-uruguay',
    text: 'Comprar un auto usado para dejar el ómnibus parece una cuenta fácil. Casi nunca lo es.\n\nHay que sumar seguro, patente, nafta y mantenimiento. Hice un comparador por trayecto: elegís de dónde a dónde vas y ves cuánto te sale por mes en ómnibus, moto, bici eléctrica o auto:',
  },
  {
    id: 'banco-o-casa',
    path: '/banco-o-casa-de-cambio-uruguay',
    text: 'Para comprar dólares, ¿conviene el banco o una casa de cambio? La respuesta cambia, así que la calculo todos los días.\n\nComparo la venta mediana de los bancos contra la de las casas de cambio y muestro cuánto es la diferencia sobre mil dólares, con el precio de hoy:',
  },
  {
    id: 'brasil',
    path: '/llevar-dolares-o-reales-a-brasil',
    text: 'Si vas a Brasil, la pregunta de siempre: ¿llevo reales o dólares?\n\nDepende de dos precios del mismo día: lo que te cobra una casa uruguaya por el real y lo que te paga un câmbio brasileño por tu dólar. Puse las dos puntas lado a lado, con el recargo turismo medido contra la cotización oficial de Brasil:',
  },
])

/**
 * Posts atados a una fecha del año (`MM-DD`), que ganan sobre la rotación y sobre el lunes del
 * dólar. Sin fechas exactas en el texto: la página enlazada es la que dice el plazo de este año.
 */
export const LINKEDIN_SEASONAL: Readonly<Record<string, LinkedinPost>> = Object.freeze({
  '06-20': {
    id: 'aguinaldo-junio',
    path: '/cuando-se-cobra-el-aguinaldo-uruguay',
    text: 'El aguinaldo de junio tiene fecha límite, y si la empresa se atrasa corre un recargo.\n\nJunté cuándo te lo tienen que pagar, qué pasa si se atrasan y quién lo paga si estás cobrando del BPS:',
  },
  '12-12': {
    id: 'aguinaldo-diciembre',
    path: '/cuando-se-cobra-el-aguinaldo-uruguay',
    text: 'El aguinaldo de diciembre tiene fecha límite, y si la empresa se atrasa corre un recargo.\n\nJunté cuándo te lo tienen que pagar, qué pasa si se atrasan y quién lo paga si estás cobrando del BPS:',
  },
})

// ---- el lunes del dólar ------------------------------------------------------------------------

/** Una fila de `GET {apiBase}/`. */
export interface LinkedinRateRow {
  origin: string
  code: string
  type?: string | null
  buy: number
  sell: number
  date?: string
}

export interface UsdSnapshot {
  /** Venta más baja: donde sale más barato comprar dólares. */
  cheapestSell: number
  cheapestNames: string[]
  /** Compra más alta: donde mejor te pagan si vendés dólares. */
  bestBuy: number
  bestBuyNames: string[]
  brouSell: number | null
  sampleSize: number
}

/** Con menos casas que esto, "la más barata" no describe al mercado. */
export const USD_MIN_SAMPLE = 10
/** Una fila con fecha más vieja que esto no es "esta mañana". */
export const USD_MAX_AGE_DAYS = 4

/**
 * Resume el dólar de mostrador para el post del lunes, o `null` si no hay con qué afirmar nada.
 *
 * `frozenKeys` son las claves `origin|code|type` de `GET /frozen-quotes`. Excluirlas no es un
 * detalle: una pizarra quieta deriva al extremo de la distribución y, ordenada por "más barata",
 * encabeza (medido el 12/11/2026: una casa con la venta del dólar quieta hacía 120 días quedaba
 * primera por más de un peso). Quien llama tiene que pasar `null` si no pudo leer ese reporte, y
 * entonces no hay post en vivo: sin la guarda, mejor no afirmar.
 */
export function summarizeUsd(
  rows: readonly LinkedinRateRow[],
  names: Readonly<Record<string, { name?: string } | undefined>>,
  frozenKeys: ReadonlySet<string> | null,
  now: Date
): UsdSnapshot | null {
  if (!frozenKeys) return null
  const minTime = now.getTime() - USD_MAX_AGE_DAYS * 86_400_000
  const usable = rows.filter(r => {
    if (r.code !== 'USD' || r.origin === 'bcu' || r.type) return false
    if (!(r.buy > 0) || !(r.sell > 0) || r.buy >= r.sell) return false
    if (frozenKeys.has(`${r.origin}|USD|`)) return false
    if (r.date) {
      const t = Date.parse(r.date)
      if (Number.isFinite(t) && t < minTime) return false
    }
    return true
  })
  if (usable.length < USD_MIN_SAMPLE) return null

  // Sin nombre en `/localData`, la clave cruda (`cambio_fenix`) se lee como un error: se arma
  // "Cambio Fenix".
  const nameOf = (origin: string) =>
    names[origin]?.name?.trim() ||
    origin.replace(/_/g, ' ').replace(/(^|\s)\p{Ll}/gu, c => c.toUpperCase())
  const cheapestSell = Math.min(...usable.map(r => r.sell))
  const bestBuy = Math.max(...usable.map(r => r.buy))
  // Comprar en un lado más barato de lo que te pagan en otro sería arbitraje gratis: es un dato
  // roto, no una oportunidad.
  if (bestBuy >= cheapestSell) return null

  const brou = usable.find(r => r.origin === 'brou')
  const brouSell = brou ? brou.sell : null
  // Una "más barata" a más de 10 % del BROU es una coma corrida que pasó la auditoría.
  if (brouSell !== null && (cheapestSell < brouSell * 0.9 || cheapestSell > brouSell)) return null

  const namesAt = (pick: (r: LinkedinRateRow) => boolean) =>
    [...new Set(usable.filter(pick).map(r => nameOf(r.origin)))].sort((a, b) =>
      a.localeCompare(b, 'es')
    )

  return {
    cheapestSell,
    cheapestNames: namesAt(r => r.sell === cheapestSell),
    bestBuy,
    bestBuyNames: namesAt(r => r.buy === bestBuy),
    brouSell,
    sampleSize: usable.length,
  }
}

/** `40.93` → `40,93`. */
export function formatRate(n: number): string {
  return n.toFixed(2).replace('.', ',')
}

/** `770` → `770`, `1050` → `1.050`. */
export function formatPesos(n: number): string {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

/** `["A"]` → `A`; `["A","B"]` → `A y B`; tres o más → `A, B y otras`. */
export function joinNames(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? ''
  if (names.length === 2) return `${names[0]} y ${names[1]}`
  return `${names[0]}, ${names[1]} y otras`
}

/** Bajo esta diferencia (en pesos, sobre US$ 1.000) comparar contra el BROU no dice nada. */
export const USD_MIN_GAP_PESOS = 100

/** El post del lunes. Tres redacciones que rotan por semana para que no se lea siempre igual. */
export function dollarPost(s: UsdSnapshot, weekIndex: number): LinkedinPost {
  const sell = formatRate(s.cheapestSell)
  const where = joinNames(s.cheapestNames)
  const buy = formatRate(s.bestBuy)
  const buyWhere = joinNames(s.bestBuyNames)
  const gap = s.brouSell === null ? 0 : (s.brouSell - s.cheapestSell) * 1000

  let text: string
  if (s.brouSell === null || gap < USD_MIN_GAP_PESOS) {
    text = `El dólar arrancó la semana en $ ${sell} en el lugar más barato para comprar: ${where}.\n\nY si lo que necesitás es venderlos, el que mejor pagaba era ${buyWhere}, a $ ${buy}.\n\nLas cotizaciones de más de 40 casas, actualizadas cada pocos minutos:`
  } else {
    const brou = formatRate(s.brouSell)
    const diff = formatPesos(gap)
    const variants = [
      `Si esta semana tenés que comprar dólares, mirá antes dónde.\n\nEsta mañana la venta más baja era $ ${sell}, en ${where}. El BROU vendía a $ ${brou}.\n\nEn mil dólares son $ ${diff} de diferencia. Las cotizaciones de más de 40 casas, actualizadas cada pocos minutos:`,
      `El dólar arrancó la semana en $ ${sell} en el lugar más barato para comprar: ${where}.\n\nEn el BROU estaba a $ ${brou}, o sea $ ${diff} más por cada mil dólares.\n\nY si lo que necesitás es venderlos, el que mejor pagaba era ${buyWhere}, a $ ${buy}. Todas las casas, ordenadas:`,
      `Lunes de mañana, el dólar en Uruguay.\n\nPara comprar, lo más barato era $ ${sell} en ${where}.\nPara vender, lo que mejor pagaba era $ ${buy} en ${buyWhere}.\nEn el BROU, $ ${brou}.\n\nEntre el BROU y lo más barato hay $ ${diff} sobre mil dólares. Comparo todas acá:`,
    ]
    text = variants[((weekIndex % variants.length) + variants.length) % variants.length]!
  }
  return { id: 'dolar-lunes', path: '/', text }
}

// ---- qué post corresponde a qué día ------------------------------------------------------------

const MVD_PARTS = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Montevideo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  hourCycle: 'h23',
})

function addDays(date: string, days: number): string {
  const t = Date.parse(`${date}T12:00:00Z`) + days * 86_400_000
  return new Date(t).toISOString().slice(0, 10)
}

/**
 * El día cuyo post está vigente en `now`: el de hoy desde las 9 de Montevideo, el de ayer antes.
 * Así IFTTT ve un ítem nuevo una vez por día, a una hora en la que la gente mira LinkedIn.
 */
export function linkedinPostDate(now: Date): string {
  const parts = Object.fromEntries(MVD_PARTS.formatToParts(now).map(p => [p.type, p.value]))
  const today = `${parts.year}-${parts.month}-${parts.day}`
  return Number(parts.hour) < LINKEDIN_POST_HOUR ? addDays(today, -1) : today
}

export function daysSinceEpoch(date: string): number {
  return Math.round(
    (Date.parse(`${date}T12:00:00Z`) - Date.parse(`${LINKEDIN_EPOCH}T12:00:00Z`)) / 86_400_000
  )
}

export function isMonday(date: string): boolean {
  return new Date(`${date}T12:00:00Z`).getUTCDay() === 1
}

/** El lunes sólo pide datos en vivo si ese día no lo ocupa un post de temporada. */
export function wantsUsd(date: string): boolean {
  return isMonday(date) && !LINKEDIN_SEASONAL[date.slice(5)]
}

/**
 * El post de `date`. Temporada > lunes del dólar > rotación. Si el lunes no hay datos confiables,
 * sale el post de la rotación que le tocaba a ese día: nunca un post con números inventados.
 */
export function pickLinkedinPost(date: string, usd: UsdSnapshot | null): LinkedinPost {
  const seasonal = LINKEDIN_SEASONAL[date.slice(5)]
  if (seasonal) return seasonal
  const n = daysSinceEpoch(date)
  if (usd && isMonday(date)) return dollarPost(usd, Math.floor(n / 7))
  const len = LINKEDIN_POSTS.length
  return LINKEDIN_POSTS[((n % len) + len) % len]!
}

// ---- el feed -----------------------------------------------------------------------------------

export function linkedinUrl(path: string): string {
  return path === '/' ? `${LINKEDIN_SITE}/` : `${LINKEDIN_SITE}${path}`
}

/** La OG image que el sitio ya genera para cada ruta (`/__og-image__/image/<ruta>/og.png`). */
export function linkedinImageUrl(path: string): string {
  return `${LINKEDIN_SITE}/__og-image__/image${path === '/' ? '' : path}/og.png`
}

/** El texto final que se publica: el post y la URL al pie, en su propia línea. */
export function linkedinMessage(post: LinkedinPost): string {
  const text = post.text.trim()
  return `${text}${text.endsWith(':') ? '\n' : '\n\n'}${linkedinUrl(post.path)}`
}

const escapeXml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const cdata = (s: string) => `<![CDATA[${s.split(']]>').join(']]]]><![CDATA[>')}]]>`

/**
 * RSS 2.0 con UN solo ítem: el post vigente. IFTTT dispara por cada `guid` nuevo, y el `guid` es
 * la fecha, así que una edición posterior del texto nunca se vuelve a publicar.
 */
export function renderLinkedinFeed(date: string, post: LinkedinPost, now: Date): string {
  const url = linkedinUrl(post.path)
  const image = linkedinImageUrl(post.path)
  const title = post.text.trim().split('\n')[0]!.slice(0, 140)
  const pubDate = new Date(`${date}T${String(LINKEDIN_POST_HOUR + 3).padStart(2, '0')}:00:00Z`)
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">',
    '<channel>',
    '<title>Cambio Uruguay: un post por día</title>',
    `<link>${LINKEDIN_SITE}/</link>`,
    `<atom:link href="${LINKEDIN_SITE}/feeds/linkedin.xml" rel="self" type="application/rss+xml"/>`,
    '<description>El post diario de LinkedIn de cambio-uruguay.com.</description>',
    '<language>es-UY</language>',
    `<lastBuildDate>${now.toUTCString()}</lastBuildDate>`,
    '<ttl>60</ttl>',
    '<item>',
    `<title>${escapeXml(title)}</title>`,
    `<link>${escapeXml(url)}</link>`,
    `<guid isPermaLink="false">cambio-uruguay-linkedin-${date}</guid>`,
    `<pubDate>${pubDate.toUTCString()}</pubDate>`,
    `<description>${cdata(linkedinMessage(post))}</description>`,
    `<enclosure url="${escapeXml(image)}" type="image/png" length="0"/>`,
    `<media:content url="${escapeXml(image)}" medium="image" type="image/png"/>`,
    '</item>',
    '</channel>',
    '</rss>',
    '',
  ].join('\n')
}
