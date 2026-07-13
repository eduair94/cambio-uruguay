// Content + helpers for the financial glossary (`pages/glosario/index.vue` and
// `pages/glosario/[termino].vue`).
//
// PURE module (no Vue/Nuxt runtime, relative imports only) so it can be
// unit-tested in plain Node via vitest and reused by the pages, the sitemap
// route and the route guard without duplicating the catalogue.
//
// Definitions are original Spanish copy written for the Uruguayan market. Each
// term is a real, self-contained explanation (not a one-liner) so the pages are
// substantive and avoid thin content.

/** Grouping used on the glossary hub. */
export type GlossaryCategory = 'cambio' | 'indicadores' | 'impuestos' | 'banca'

/** Human label per glossary category, in display order. */
export const GLOSSARY_CATEGORIES: Readonly<Record<GlossaryCategory, string>> = Object.freeze({
  cambio: 'Cambio y divisas',
  indicadores: 'Indicadores económicos',
  impuestos: 'Impuestos',
  banca: 'Banca y finanzas',
})

/** A single glossary entry, addressable at `/glosario/{slug}`. */
export interface GlossaryTerm {
  /** URL-safe identifier, unique across {@link glossary}. */
  slug: string
  /** Display name / H1 (e.g. `'Spread cambiario'`). */
  term: string
  /** Category for grouping on the hub. */
  category: GlossaryCategory
  /** Concise one-sentence definition: used for the meta description and snippet. */
  short: string
  /** Fuller explanation (one or two paragraphs of prose). */
  body: string
  /** Optional concrete Uruguayan example. */
  example?: string
  /** Related term slugs for internal linking. */
  related: string[]
}

/** The full glossary catalogue, alphabetical-ish within meaning groups. */
export const glossary: readonly GlossaryTerm[] = [
  // ---- Cambio y divisas ----
  {
    slug: 'cotizacion',
    term: 'Cotización',
    category: 'cambio',
    short:
      'La cotización es el precio al que se compra o se vende una moneda en un momento dado, expresado en otra moneda.',
    body: 'En el mercado cambiario uruguayo la cotización del dólar tiene siempre dos caras: el precio de compra (lo que la casa de cambio te paga por cada dólar) y el de venta (lo que te cobra por cada dólar). No existe una única cotización: cada casa de cambio fija la suya y se actualiza varias veces al día según la oferta y la demanda. Por eso comparar entre casas antes de operar puede representar una diferencia real de varios pesos por dólar.',
    example:
      'Si una casa muestra compra 39,80 y venta 41,20, te paga 39,80 pesos por dólar y te vende cada dólar a 41,20.',
    related: ['tipo-de-cambio', 'spread-cambiario', 'casa-de-cambio'],
  },
  {
    slug: 'tipo-de-cambio',
    term: 'Tipo de cambio',
    category: 'cambio',
    short:
      'El tipo de cambio es la relación de valor entre dos monedas: cuántas unidades de una se necesitan para comprar una unidad de la otra.',
    body: 'El tipo de cambio dólar/peso uruguayo indica cuántos pesos hacen falta para comprar un dólar. Cuando sube, el peso se deprecia (se necesitan más pesos por dólar); cuando baja, el peso se aprecia. En Uruguay el tipo de cambio flota: lo determina el mercado, con intervenciones puntuales del Banco Central. Es uno de los precios más observados de la economía porque afecta importaciones, exportaciones, turismo, ahorro y precios internos.',
    related: ['cotizacion', 'devaluacion', 'flotacion-cambiaria', 'bcu'],
  },
  {
    slug: 'spread-cambiario',
    term: 'Spread cambiario',
    category: 'cambio',
    short:
      'El spread es la diferencia entre el precio de compra y el de venta de una moneda; representa el margen de la casa de cambio.',
    body: 'El spread (o brecha de compra-venta) es la distancia entre lo que una casa de cambio paga por una divisa y lo que la cobra. Un spread chico suele indicar un mercado competitivo y líquido; uno grande, que la casa se queda con más en cada operación. Comparar el spread —y no solo el precio aislado— te dice rápidamente dónde conviene operar según vayas a comprar o a vender. Para una misma referencia de mercado, la casa con menor spread casi siempre te deja mejor parado.',
    example: 'Con compra 39,80 y venta 41,20, el spread es de 1,40 peso, alrededor del 3,5%.',
    related: ['cotizacion', 'brecha-cambiaria', 'casa-de-cambio'],
  },
  {
    slug: 'brecha-cambiaria',
    term: 'Brecha cambiaria',
    category: 'cambio',
    short:
      'La brecha cambiaria es la diferencia porcentual entre dos cotizaciones de una misma moneda, por ejemplo entre el dólar oficial y otro paralelo.',
    body: 'En economías con restricciones cambiarias suelen convivir varios precios para el dólar: uno oficial y otros paralelos. La brecha es la diferencia porcentual entre ellos y funciona como termómetro de las tensiones del mercado: cuanto mayor es la brecha, mayores las distorsiones. Uruguay tiene un mercado cambiario libre y unificado, por lo que no presenta brechas grandes como sí ocurre en países vecinos; aun así, el término aparece seguido al comparar el dólar local con el de Argentina.',
    related: ['spread-cambiario', 'dolar-blue', 'tipo-de-cambio'],
  },
  {
    slug: 'dolar-billete',
    term: 'Dólar billete',
    category: 'cambio',
    short:
      'El dólar billete es la cotización del dólar en efectivo: los billetes físicos que retirás o entregás en la casa de cambio.',
    body: 'Es la modalidad clásica para quien viaja o guarda efectivo. Como implica manejar, custodiar y trasladar dinero físico, el dólar billete suele tener un spread algo mayor que las operaciones electrónicas. Si tu plan es llevar dólares en mano, esta es la cotización que te aplica. Conviene revisar el estado de los billetes: algunas casas pagan menos por billetes deteriorados o de series antiguas.',
    related: ['dolar-transferencia', 'dolar-cable', 'dolar-ebrou'],
  },
  {
    slug: 'dolar-transferencia',
    term: 'Dólar transferencia',
    category: 'cambio',
    short:
      'El dólar transferencia es la cotización que aplica cuando los dólares se mueven electrónicamente entre cuentas, sin billetes de por medio.',
    body: 'La cotización transferencia aplica cuando los dólares se mueven de forma electrónica entre cuentas bancarias, sin billetes de por medio: acreditás o debitás dólares de una cuenta. Al no haber manejo de efectivo, suele ofrecer condiciones más afinadas que el dólar billete, porque la casa de cambio o el banco se ahorra los costos de seguridad y logística del dinero físico. Es la modalidad típica para quien opera montos medianos o altos y prefiere no trasladar efectivo. Conviene compararla entre casas igual que el billete, porque el precio de transferencia también varía de un lugar a otro.',
    example:
      'Si vendés dólares acreditados en tu caja de ahorro para recibir pesos, te aplica el precio de transferencia, no el de billete.',
    related: ['dolar-billete', 'dolar-cable', 'dolar-ebrou'],
  },
  {
    slug: 'dolar-cable',
    term: 'Dólar cable',
    category: 'cambio',
    short:
      'El dólar cable es la cotización de los dólares transferidos hacia o desde el exterior; aplica a operaciones internacionales.',
    body: 'La cotización cable corresponde a los dólares que se transfieren hacia o desde el exterior, es decir fondos que entran o salen del sistema financiero uruguayo hacia otro país. El nombre es histórico, de cuando las transferencias internacionales se cursaban "por cable". Por los costos y los tiempos de las operaciones transfronterizas, su precio puede diferir del dólar local (billete o transferencia). Es la cotización relevante cuando enviás dinero al exterior o recibís una transferencia de afuera, como una remesa o el pago de un cliente del extranjero. Antes de operar conviene mirar tanto el precio cable como las comisiones del banco, porque ambas cosas afectan cuántos pesos recibís o cuánto te cuesta enviar.',
    related: ['dolar-transferencia', 'remesa', 'transferencia-internacional'],
  },
  {
    slug: 'dolar-interbancario',
    term: 'Dólar interbancario',
    category: 'cambio',
    short:
      'El dólar interbancario es la cotización mayorista a la que operan los bancos entre sí; es una referencia de mercado, no un precio para el público.',
    body: 'El dólar interbancario es la cotización mayorista a la que los bancos compran y venden dólares entre sí en el mercado de cambios. Refleja hacia dónde se mueve el dólar en el corazón del mercado y por eso es un excelente termómetro de la tendencia, pero no es un precio al que una persona pueda comprar o vender: es exclusivo entre bancos. Para tus operaciones reales tenés que mirar el dólar billete, transferencia, cable o eBROU según el caso. Los comparadores y los medios muestran el interbancario solo como referencia de contexto. Por ejemplo, si el interbancario sube, es esperable que también suban los precios al público, aunque con un margen (spread) por encima.',
    related: ['tipo-de-cambio', 'dolar-billete', 'bcu'],
  },
  {
    slug: 'dolar-ebrou',
    term: 'Dólar eBROU',
    category: 'cambio',
    short:
      'El dólar eBROU es la cotización para operar dólares a través de la plataforma digital del Banco República (BROU).',
    body: 'El dólar eBROU es la cotización para operar dólares a través de eBROU, la plataforma digital del Banco República (BROU). Suele ofrecer condiciones competitivas para quienes tienen cuenta y operan en línea, evitando ir a una sucursal y hacer cola. Para usar esta modalidad normalmente necesitás una cuenta habilitada en el banco: es una condición de la operación, no un costo oculto. Es una opción cómoda para clientes del BROU que quieren comprar o vender sin moverse, dentro de los días hábiles del mercado. Como con cualquier otra cotización, conviene compararla: el eBROU no siempre es el mejor precio frente a las casas de cambio privadas, así que vale la pena mirar el comparador antes de operar.',
    related: ['dolar-transferencia', 'caja-de-ahorro', 'bcu'],
  },
  {
    slug: 'casa-de-cambio',
    term: 'Casa de cambio',
    category: 'cambio',
    short:
      'Una casa de cambio es una empresa autorizada por el Banco Central para comprar y vender moneda extranjera al público.',
    body: 'En Uruguay las casas de cambio están reguladas y supervisadas por el Banco Central del Uruguay. Cada una fija libremente sus cotizaciones, por lo que el mismo dólar puede tener precios distintos según dónde operes. Comparar entre las más de 40 casas que releva Cambio Uruguay es la forma más simple de encontrar el mejor precio para comprar o vender.',
    related: ['cotizacion', 'spread-cambiario', 'bcu'],
  },
  {
    slug: 'divisa',
    term: 'Divisa',
    category: 'cambio',
    short:
      'Una divisa es la moneda de otro país usada en transacciones internacionales, como el dólar, el euro o el real.',
    body: 'En el lenguaje cambiario "divisa" se refiere normalmente a saldos en moneda extranjera (no necesariamente billetes), mientras que "billete" alude al efectivo físico. Las principales divisas que se operan en Uruguay son el dólar estadounidense, el euro, el real brasileño y el peso argentino. El precio de cada una frente al peso uruguayo lo determina el mercado.',
    related: ['tipo-de-cambio', 'mercado-cambiario', 'dolar-billete'],
  },
  {
    slug: 'arbitraje',
    term: 'Arbitraje (cambiario)',
    category: 'cambio',
    short:
      'El arbitraje es el cálculo del valor de una moneda a partir de otra usando una tercera como puente, normalmente el dólar.',
    body: 'Cuando querés saber cuánto vale un euro en pesos uruguayos, en la práctica se suele "arbitrar": se toma el euro/dólar internacional y el dólar/peso local para obtener el euro/peso. Por eso el precio de monedas menos operadas se mueve junto con el dólar. El arbitraje también designa la operación de aprovechar diferencias de precio entre mercados para obtener una ganancia sin riesgo.',
    related: ['tipo-de-cambio', 'divisa', 'mercado-cambiario'],
  },
  {
    slug: 'dolar-blue',
    term: 'Dólar blue',
    category: 'cambio',
    short:
      'El dólar blue es el dólar paralelo o informal de Argentina, con un precio distinto al oficial por las restricciones cambiarias de ese país.',
    body: 'Es un término argentino que aparece seguido en Uruguay por la cercanía y el turismo. Surge porque Argentina tiene controles de cambio que limitan el acceso al dólar oficial, generando un mercado paralelo con su propia cotización. Uruguay no tiene un "blue" porque su mercado cambiario es libre y unificado: aquí el dólar tiene un único mercado formal con precios competitivos entre casas.',
    related: ['brecha-cambiaria', 'tipo-de-cambio', 'peso-argentino'],
  },
  {
    slug: 'peso-argentino',
    term: 'Peso argentino (ARS)',
    category: 'cambio',
    short:
      'El peso argentino es la moneda de Argentina; en Uruguay se cotiza sobre todo en zonas de frontera y de turismo.',
    body: 'El peso argentino (ARS) es muy volátil por la alta inflación e historia cambiaria del país vecino. En Uruguay su cotización suele tener un spread amplio y varía mucho entre casas de cambio, especialmente en localidades fronterizas. Si vas a viajar a Argentina o recibís pesos, conviene comparar y entender que su valor frente al peso uruguayo puede cambiar de forma marcada en poco tiempo.',
    related: ['divisa', 'dolar-blue', 'cotizacion'],
  },
  {
    slug: 'devaluacion',
    term: 'Devaluación',
    category: 'cambio',
    short:
      'La devaluación es la pérdida de valor de una moneda frente a otra: hacen falta más unidades locales para comprar una divisa.',
    body: 'Cuando el peso uruguayo se devalúa, el dólar sube medido en pesos. Una devaluación puede encarecer las importaciones y los viajes al exterior, pero favorecer a exportadores y al turismo receptivo. En un régimen de tipo de cambio flotante como el uruguayo, los movimientos del peso responden principalmente al mercado, no a una decisión administrativa puntual.',
    related: ['apreciacion', 'tipo-de-cambio', 'inflacion'],
  },
  {
    slug: 'apreciacion',
    term: 'Apreciación',
    category: 'cambio',
    short:
      'La apreciación es la ganancia de valor de una moneda frente a otra: se necesitan menos unidades locales para comprar una divisa.',
    body: 'Si el peso uruguayo se aprecia, el dólar baja medido en pesos: viajar o comprar afuera se abarata, pero los exportadores reciben menos pesos por lo que venden. La apreciación y la devaluación son las dos caras de los movimientos del tipo de cambio y forman parte normal de un mercado flotante.',
    related: ['devaluacion', 'tipo-de-cambio'],
  },
  {
    slug: 'flotacion-cambiaria',
    term: 'Flotación cambiaria',
    category: 'cambio',
    short:
      'La flotación cambiaria es el régimen en el que el precio de la moneda lo determina el mercado, con poca o nula intervención del Estado.',
    body: 'Uruguay opera bajo flotación administrada: el tipo de cambio lo fija la oferta y la demanda, pero el Banco Central puede intervenir comprando o vendiendo dólares para suavizar movimientos bruscos. Es lo opuesto a un tipo de cambio fijo, donde la autoridad ancla el precio. La flotación hace que la cotización se mueva todos los días hábiles.',
    related: ['tipo-de-cambio', 'bcu', 'devaluacion'],
  },
  {
    slug: 'mercado-cambiario',
    term: 'Mercado cambiario',
    category: 'cambio',
    short:
      'El mercado cambiario es el ámbito donde se compran y venden monedas extranjeras, formado por bancos, casas de cambio y operadores.',
    body: 'En Uruguay el mercado cambiario es libre: no hay restricciones para comprar o vender dólares y conviven bancos, casas de cambio y plataformas digitales. Las cotizaciones se mueven principalmente en días hábiles y en horario bancario, cuando hay más liquidez. Fuera de ese horario los precios suelen quedar "congelados" en la última referencia.',
    related: ['casa-de-cambio', 'tipo-de-cambio', 'liquidez'],
  },

  // ---- Indicadores económicos ----
  {
    slug: 'bcu',
    term: 'BCU (Banco Central del Uruguay)',
    category: 'indicadores',
    short:
      'El BCU es la autoridad monetaria de Uruguay: emite la moneda, regula bancos y casas de cambio y conduce la política monetaria.',
    body: 'El Banco Central del Uruguay publica cotizaciones de referencia, fija la tasa de política monetaria, supervisa al sistema financiero y vela por la estabilidad de precios. Muchos datos del mercado cambiario que ves en los comparadores tienen su origen, directa o indirectamente, en información del BCU. Es la institución clave para entender el dólar y la inflación en el país.',
    related: ['tasa-de-politica-monetaria', 'dgi', 'tipo-de-cambio'],
  },
  {
    slug: 'dgi',
    term: 'DGI (Dirección General Impositiva)',
    category: 'indicadores',
    short:
      'La DGI es el organismo que recauda y administra los impuestos nacionales en Uruguay, como el IVA, el IRPF y el IRAE.',
    body: 'La Dirección General Impositiva define cómo se liquidan y pagan los principales tributos del país. Cuando calculás IVA, IRPF o IRAE estás aplicando reglas que administra la DGI. Sus resoluciones y los valores anuales (como las franjas del IRPF en BPC) son la referencia oficial para cualquier estimación tributaria.',
    related: ['iva', 'irpf', 'irae', 'bpc'],
  },
  {
    slug: 'ipc',
    term: 'IPC (Índice de Precios al Consumo)',
    category: 'indicadores',
    short:
      'El IPC mide la variación promedio de los precios de una canasta de bienes y servicios; su suba es la inflación.',
    body: 'En Uruguay el IPC lo publica mensualmente el Instituto Nacional de Estadística (INE). Es la vara con la que se mide la inflación y se ajustan muchos valores de la economía, como la Unidad Indexada. Seguir el IPC ayuda a entender cuánto pierde poder de compra el peso y por qué muchos ahorristas miran al dólar como refugio.',
    related: ['inflacion', 'ui', 'unidad-reajustable'],
  },
  {
    slug: 'inflacion',
    term: 'Inflación',
    category: 'indicadores',
    short:
      'La inflación es el aumento sostenido y generalizado de los precios, que reduce el poder de compra del dinero con el tiempo.',
    body: 'Cuando hay inflación, la misma cantidad de pesos compra menos cosas a medida que pasa el tiempo. Se mide a través del IPC. La inflación explica por qué muchos uruguayos ahorran en dólares o en instrumentos ajustados por inflación: buscan que su dinero no pierda valor. Una inflación baja y estable es uno de los principales objetivos de la política monetaria del BCU.',
    related: ['ipc', 'ui', 'tasa-de-politica-monetaria'],
  },
  {
    slug: 'bpc',
    term: 'BPC (Base de Prestaciones y Contribuciones)',
    category: 'indicadores',
    short:
      'La BPC es una unidad de referencia que se actualiza cada año y se usa para expresar montos de impuestos, multas y prestaciones.',
    body: 'En lugar de fijar cifras en pesos que la inflación dejaría desactualizadas, muchas normas uruguayas se expresan en BPC. Por ejemplo, las franjas del IRPF se definen en múltiplos de BPC. El valor de la BPC lo fija el Poder Ejecutivo cada año, por lo que al hacer cálculos tributarios conviene usar el valor vigente del período.',
    related: ['irpf', 'unidad-reajustable', 'ui'],
  },
  {
    slug: 'ui',
    term: 'UI (Unidad Indexada)',
    category: 'indicadores',
    short:
      'La Unidad Indexada es una unidad de valor que se ajusta diariamente según la inflación (IPC), usada en alquileres, créditos y contratos.',
    body: 'La UI mantiene su poder de compra en el tiempo: su valor en pesos sube con la inflación. Por eso se usa en contratos de largo plazo —alquileres, préstamos hipotecarios, ahorro— para proteger el valor real frente a la suba de precios. El BCU publica el valor diario de la UI. Convertir UI a pesos es simplemente multiplicar la cantidad de UI por su valor del día.',
    related: ['unidad-reajustable', 'ipc', 'inflacion'],
  },
  {
    slug: 'unidad-reajustable',
    term: 'UR (Unidad Reajustable)',
    category: 'indicadores',
    short:
      'La Unidad Reajustable es una unidad de valor que se ajusta según la evolución de los salarios, usada en alquileres y préstamos.',
    body: 'A diferencia de la UI, que sigue a los precios (IPC), la UR sigue al Índice Medio de Salarios. Se usa habitualmente en contratos de alquiler y en préstamos del Banco Hipotecario. Su valor lo publica el organismo competente y se actualiza periódicamente. Entender si un contrato está en UI o en UR es clave porque ambas pueden evolucionar de forma distinta.',
    related: ['ui', 'ipc', 'bpc'],
  },
  {
    slug: 'tasa-de-politica-monetaria',
    term: 'Tasa de política monetaria (TPM)',
    category: 'indicadores',
    short:
      'La TPM es la tasa de interés de referencia que fija el Banco Central para orientar el costo del dinero y controlar la inflación.',
    body: 'Cuando el BCU sube la TPM, encarece el crédito y tiende a moderar el consumo y la inflación; cuando la baja, busca estimular la actividad. Esta tasa influye en los rendimientos de los plazos fijos en pesos y, de forma indirecta, en el tipo de cambio. Es una de las herramientas centrales de la política monetaria uruguaya.',
    related: ['bcu', 'inflacion', 'plazo-fijo'],
  },
  {
    slug: 'riesgo-pais',
    term: 'Riesgo país',
    category: 'indicadores',
    short:
      'El riesgo país mide la sobretasa que paga un país para endeudarse frente a un bono de referencia considerado seguro.',
    body: 'Se expresa en puntos básicos: cuanto más alto, más caro le resulta al país financiarse y mayor es la desconfianza percibida de los inversores. Uruguay suele tener un riesgo país bajo en la región gracias a su grado inversor y su estabilidad institucional, lo que abarata su crédito y aporta previsibilidad al tipo de cambio.',
    related: ['tipo-de-cambio', 'bcu'],
  },

  // ---- Impuestos ----
  {
    slug: 'iva',
    term: 'IVA (Impuesto al Valor Agregado)',
    category: 'impuestos',
    short:
      'El IVA es un impuesto al consumo que grava la venta de bienes y servicios; en Uruguay la tasa básica es 22% y la mínima 10%.',
    body: 'El IVA está incluido en la mayoría de los precios que pagás. La tasa básica del 22% es la general; la mínima del 10% aplica a ciertos bienes y servicios (por ejemplo, algunos alimentos y la salud). Para sacar el IVA de un precio con impuesto se divide entre 1,22 (o 1,10); para agregarlo, se multiplica. Es el principal impuesto al consumo del país.',
    example: 'Un producto de 1.000 pesos sin IVA cuesta 1.220 con IVA básico (22%).',
    related: ['imesi', 'irae', 'tasa-consular', 'dgi'],
  },
  {
    slug: 'irpf',
    term: 'IRPF (Impuesto a la Renta de las Personas Físicas)',
    category: 'impuestos',
    short:
      'El IRPF grava los ingresos de las personas; sobre las rentas del trabajo se aplica de forma progresiva por franjas expresadas en BPC.',
    body: 'El IRPF de las rentas del trabajo (lo que técnicamente se llama IRPF Categoría II) se calcula mes a mes sobre el sueldo nominal, aplicando tasas crecientes a medida que el ingreso sube de franja (esquema marginal). Cada franja se expresa en múltiplos de BPC y solo la porción que cae dentro de cada tramo paga la tasa de ese tramo. Existen deducciones (hijos, aportes, etc.) que reducen el impuesto. Las cifras se actualizan cada año. Las rentas de capital —plazo fijo, dividendos, alquileres, venta de acciones— pagan un IRPF distinto, el Categoría I, con sus propias tasas.',
    related: ['bpc', 'iass', 'irae', 'dgi', 'irpf-categoria-ii', 'irpf-categoria-i'],
  },
  {
    slug: 'imesi',
    term: 'IMESI (Impuesto Específico Interno)',
    category: 'impuestos',
    short:
      'El IMESI grava la primera enajenación de ciertos productos, como combustibles, tabaco, bebidas alcohólicas, cosméticos y vehículos.',
    body: 'Es un impuesto selectivo: en lugar de aplicarse a todo el consumo como el IVA, recae sobre bienes específicos, muchas veces con tasas altas. Por eso productos como el tabaco, el alcohol o los autos tienen una carga tributaria mayor. Al importar algunos de estos bienes, el IMESI se suma a la base sobre la que luego se calcula el IVA.',
    related: ['iva', 'irae', 'impuestos-importacion'],
  },
  {
    slug: 'irae',
    term: 'IRAE (Impuesto a las Rentas de las Actividades Económicas)',
    category: 'impuestos',
    short:
      'El IRAE grava las ganancias de las empresas y actividades económicas en Uruguay; la tasa general es del 25%.',
    body: 'Lo pagan empresas y, en ciertos casos, profesionales por las rentas que obtienen de su actividad. Se calcula sobre la ganancia neta (ingresos menos gastos deducibles). Es el equivalente empresarial del IRPF de las personas. Para quien importa con fines comerciales, el IRAE forma parte del costo fiscal total del negocio, junto al IVA y los aranceles.',
    related: ['iva', 'irpf', 'imesi', 'dgi'],
  },
  {
    slug: 'iass',
    term: 'IASS (Impuesto de Asistencia a la Seguridad Social)',
    category: 'impuestos',
    short:
      'El IASS grava las jubilaciones y pensiones que superan un mínimo: hasta 108 BPC anuales está exento, y por encima paga 6%, 24% o 30% según la franja.',
    body: 'Es el impuesto que pagan los pasivos (jubilados y pensionistas) sobre sus haberes, con una lógica de franjas parecida a la del IRPF (BPS, con BPC 2026 = $6.864). Las franjas se expresan en ingresos anuales: hasta 108 BPC está exento (lo que equivale a un mínimo no imponible mensualizado de 9 BPC); de 108 a 180 BPC se paga 6%; de 180 a 600 BPC, 24%; y por encima de 600 BPC, 30%. Cumple un rol de financiamiento de la seguridad social. Cuidado con las calculadoras que todavía circulan con las cifras viejas (mínimo de 96 BPC y primera franja del 10%): están desactualizadas.',
    related: ['irpf', 'irpf-categoria-ii', 'bpc', 'dgi'],
  },
  {
    slug: 'arancel-aduanero',
    term: 'Arancel aduanero (TGA)',
    category: 'impuestos',
    short:
      'El arancel es el impuesto que se paga al importar mercadería; en Uruguay se conoce como Tasa Global Arancelaria y varía según el producto y el origen.',
    body: 'La Tasa Global Arancelaria (TGA) depende del tipo de producto y de su origen. Los bienes producidos dentro del Mercosur suelen pagar 0% por la unión aduanera, mientras que los de fuera del bloque pagan tasas que pueden llegar a alrededor del 20%. El arancel se calcula sobre el valor CIF (mercadería + flete + seguro) y forma parte de la base sobre la que después se calcula el IVA de importación.',
    related: ['tasa-consular', 'iva', 'impuestos-importacion'],
  },
  {
    slug: 'tasa-consular',
    term: 'Tasa consular',
    category: 'impuestos',
    short:
      'La tasa consular es un tributo que se paga sobre el valor CIF de las importaciones, con algunas excepciones según el origen.',
    body: 'Se aplica sobre el valor CIF de la mercadería importada y se suma al arancel y al IVA dentro del costo total de nacionalizar un producto. Algunos orígenes y regímenes están exonerados o pagan tasas diferenciales. Junto con el arancel y el IVA, es uno de los componentes que hay que considerar al estimar cuánto saldrá traer algo del exterior por la vía formal.',
    related: ['arancel-aduanero', 'iva', 'impuestos-importacion'],
  },
  {
    slug: 'franquicia-courier',
    term: 'Franquicia courier (encomiendas)',
    category: 'impuestos',
    short:
      'La franquicia courier permite traer compras del exterior sin pagar impuestos hasta cierto monto y cantidad de envíos por año.',
    body: 'Desde mayo de 2026, Uruguay habilita una franquicia anual de hasta USD 800 por persona, utilizable hasta 3 veces al año, con un máximo de 20 kg por envío, para compras "puerta a puerta" sin fines comerciales. Los envíos que no califican para la franquicia tributan bajo el régimen simplificado, que aplica una tasa única del 60% sobre el valor declarado (con un mínimo). Es la vía habitual para las compras online del exterior.',
    related: ['impuestos-importacion', 'arancel-aduanero', 'iva'],
  },
  {
    slug: 'impuestos-importacion',
    term: 'Impuestos de importación',
    category: 'impuestos',
    short:
      'Son los tributos que se pagan al traer mercadería del exterior: arancel, tasa consular, IVA y, en algunos casos, IMESI.',
    body: 'Para las compras personales online se usa normalmente el régimen courier, con su franquicia anual y la tasa simplificada del 60% para lo que la supera. Para importaciones formales se aplica el régimen general: arancel sobre el CIF, tasa consular, IVA del 22% sobre la base resultante y, en bienes específicos, IMESI. Estimar bien estos costos evita sorpresas al recibir el paquete o nacionalizar la mercadería.',
    related: ['franquicia-courier', 'arancel-aduanero', 'tasa-consular', 'iva'],
  },

  // ---- Banca y finanzas ----
  {
    slug: 'plazo-fijo',
    term: 'Plazo fijo',
    category: 'banca',
    short:
      'Un plazo fijo es un depósito a un plazo y tasa pactados: dejás el dinero inmovilizado y al vencimiento recibís el capital más los intereses.',
    body: 'Es uno de los instrumentos de ahorro más usados por su simpleza y previsibilidad. En Uruguay podés constituir plazos fijos en pesos o en dólares; los de pesos suelen pagar más tasa para compensar la inflación. El rendimiento depende de la tasa, el plazo y de si los intereses se reinvierten (interés compuesto). Antes de elegir, conviene comparar la tasa efectiva entre bancos.',
    related: ['interes-compuesto', 'tasa-efectiva-anual', 'tasa-de-politica-monetaria'],
  },
  {
    slug: 'interes-compuesto',
    term: 'Interés compuesto',
    category: 'banca',
    short:
      'El interés compuesto es el que se calcula sobre el capital más los intereses ya acumulados, generando "interés sobre interés".',
    body: 'Es el motor del ahorro a largo plazo: al reinvertir los intereses, el capital crece de forma acelerada con el tiempo. Cuanto más seguido se capitaliza (mensual, trimestral, anual) y cuanto mayor es el plazo, más notorio es el efecto. Entender el interés compuesto ayuda a comparar plazos fijos y a dimensionar cuánto puede crecer un ahorro.',
    example:
      '1.000 USD al 5% anual durante 10 años se transforman en unos 1.629 USD por capitalización.',
    related: ['plazo-fijo', 'tasa-efectiva-anual', 'inflacion'],
  },
  {
    slug: 'tasa-efectiva-anual',
    term: 'Tasa Efectiva Anual (TEA)',
    category: 'banca',
    short:
      'La TEA expresa el rendimiento o costo real de un producto financiero en un año, considerando la capitalización de intereses.',
    body: 'A diferencia de la tasa nominal, la TEA incluye el efecto del interés compuesto, por lo que es la medida correcta para comparar plazos fijos, préstamos o tarjetas entre sí. Dos productos con la misma tasa nominal pueden tener TEA distintas si capitalizan con diferente frecuencia. Mirar siempre la TEA evita comparar peras con manzanas.',
    related: ['interes-compuesto', 'plazo-fijo'],
  },
  {
    slug: 'caja-de-ahorro',
    term: 'Caja de ahorro',
    category: 'banca',
    short:
      'Una caja de ahorro es una cuenta bancaria para guardar dinero y hacer operaciones cotidianas, con disponibilidad inmediata de los fondos.',
    body: 'A diferencia del plazo fijo, en la caja de ahorro el dinero queda disponible en todo momento, pero paga poco o ningún interés. En Uruguay es común tener cajas de ahorro en pesos y en dólares, lo que facilita operar el tipo de cambio por transferencia o por plataformas como eBROU. Es la cuenta base de la mayoría de los usuarios bancarios.',
    related: ['plazo-fijo', 'dolar-ebrou', 'liquidez'],
  },
  {
    slug: 'liquidez',
    term: 'Liquidez',
    category: 'banca',
    short:
      'La liquidez es la facilidad con la que un activo puede convertirse en dinero sin perder valor.',
    body: 'El efectivo es el activo más líquido; un inmueble, uno de los menos. En el mercado cambiario, mayor liquidez significa más operaciones y spreads más chicos, porque hay muchos compradores y vendedores. Por eso el dólar, la divisa más operada en Uruguay, suele tener mejores precios y menor brecha que monedas menos demandadas.',
    related: ['mercado-cambiario', 'spread-cambiario'],
  },
  {
    slug: 'remesa',
    term: 'Remesa',
    category: 'banca',
    short:
      'Una remesa es un envío de dinero de una persona a otra, normalmente entre países, por ejemplo de un familiar en el exterior.',
    body: 'Recibir o enviar remesas implica una conversión de moneda y costos asociados (comisiones, tipo de cambio aplicado). Para el destinatario, la cotización a la que se liquidan los dólares o euros recibidos impacta directamente en cuántos pesos termina recibiendo. Comparar dónde liquidar la remesa puede mejorar el monto final de forma sensible.',
    related: ['transferencia-internacional', 'dolar-cable', 'cotizacion'],
  },
  {
    slug: 'transferencia-internacional',
    term: 'Transferencia internacional (SWIFT)',
    category: 'banca',
    short:
      'Es el envío de dinero entre bancos de distintos países, habitualmente a través de la red SWIFT, con comisiones y plazos propios.',
    body: 'Las transferencias internacionales usan códigos como el SWIFT/BIC para identificar al banco destino. Suelen tener costos fijos y variables, y la conversión de moneda se hace al tipo de cambio del banco. Por su naturaleza transfronteriza, se vinculan con la cotización del dólar cable. Conviene consultar comisiones y el tipo de cambio antes de ordenarlas.',
    related: ['dolar-cable', 'remesa', 'liquidez'],
  },
  {
    slug: 'dolarizacion',
    term: 'Dolarización (del ahorro)',
    category: 'banca',
    short:
      'La dolarización es la tendencia a ahorrar, fijar precios o endeudarse en dólares en lugar de la moneda local.',
    body: 'Uruguay tiene una economía parcialmente dolarizada: muchos precios de inmuebles, autos y ahorros se expresan en dólares por la historia inflacionaria. Ahorrar en dólares protege frente a la pérdida de valor del peso, pero introduce riesgo cambiario si tus ingresos o gastos son en pesos. Entender este equilibrio ayuda a decidir en qué moneda conviene ahorrar.',
    related: ['inflacion', 'tipo-de-cambio', 'cobertura-cambiaria'],
  },
  {
    slug: 'cobertura-cambiaria',
    term: 'Cobertura cambiaria (hedge)',
    category: 'banca',
    short:
      'La cobertura cambiaria es una estrategia para protegerse de los movimientos del tipo de cambio y reducir el riesgo de pérdidas.',
    body: 'Quien tiene ingresos en una moneda y deudas o gastos en otra está expuesto al riesgo cambiario. La cobertura busca neutralizar ese riesgo, por ejemplo manteniendo ahorros en la misma moneda de los compromisos futuros, o usando instrumentos financieros. A nivel personal, la cobertura más simple es alinear la moneda de tus ahorros con la de tus gastos previstos.',
    related: ['dolarizacion', 'tipo-de-cambio', 'riesgo-pais'],
  },

  // ---- Más indicadores y mercados ----
  {
    slug: 'grado-inversor',
    term: 'Grado inversor',
    category: 'indicadores',
    short:
      'El grado inversor es la calificación que indica que un país o empresa tiene baja probabilidad de incumplir sus deudas.',
    body: 'Lo otorgan las calificadoras de riesgo internacionales. Tener grado inversor abarata el financiamiento de un país y atrae inversión, porque señala estabilidad y bajo riesgo de default. Uruguay mantiene el grado inversor, lo que se asocia a un riesgo país bajo en la región y aporta previsibilidad al tipo de cambio y a la economía.',
    related: ['riesgo-pais', 'tasa-de-interes', 'tipo-de-cambio'],
  },
  {
    slug: 'tasa-de-interes',
    term: 'Tasa de interés',
    category: 'indicadores',
    short:
      'La tasa de interés es el precio del dinero: cuánto se paga por pedir prestado o cuánto se gana por prestar/ahorrar, en un período.',
    body: 'Se expresa como porcentaje anual. Tasas altas encarecen el crédito y premian el ahorro; tasas bajas lo abaratan y estimulan el gasto. En Uruguay, el Banco Central influye en las tasas a través de la tasa de política monetaria, lo que se traslada a plazos fijos, préstamos y, de forma indirecta, al tipo de cambio.',
    related: ['tasa-de-politica-monetaria', 'plazo-fijo', 'interes-compuesto'],
  },
  {
    slug: 'base-monetaria',
    term: 'Base monetaria',
    category: 'indicadores',
    short:
      'La base monetaria es el dinero primario de una economía: billetes y monedas en circulación más los depósitos de los bancos en el Banco Central.',
    body: 'Es uno de los agregados que el Banco Central observa y regula para conducir la política monetaria. Una expansión fuerte de la base monetaria puede presionar la inflación y el tipo de cambio; una más controlada ayuda a mantener la estabilidad de precios. Es un concepto técnico que aparece al analizar decisiones del BCU.',
    related: ['tasa-de-politica-monetaria', 'inflacion', 'bcu'],
  },
  {
    slug: 'letras-regulacion-monetaria',
    term: 'Letras de Regulación Monetaria (LRM)',
    category: 'indicadores',
    short:
      'Las LRM son instrumentos de deuda de corto plazo que emite el Banco Central del Uruguay para regular la cantidad de dinero en la economía.',
    body: 'Al colocar LRM, el BCU retira pesos del mercado; al rescatarlas, los inyecta. Son una herramienta clave de la política monetaria y su tasa funciona como referencia para el resto de las tasas en pesos. Para el ahorrista, las tasas de las LRM ayudan a entender el rendimiento esperable de instrumentos en moneda local.',
    related: ['tasa-de-politica-monetaria', 'tasa-de-interes', 'bcu'],
  },
  {
    slug: 'encaje-bancario',
    term: 'Encaje bancario',
    category: 'banca',
    short:
      'El encaje es la porción de los depósitos que los bancos deben mantener inmovilizada como reserva, sin prestar.',
    body: 'Lo fija el Banco Central y es una herramienta de política monetaria y de estabilidad financiera: subir el encaje reduce el dinero que los bancos pueden prestar; bajarlo lo aumenta. Aunque es un concepto mayorista, afecta indirectamente el costo del crédito y la liquidez del sistema en el que operás.',
    related: ['liquidez', 'tasa-de-politica-monetaria', 'bcu'],
  },
  {
    slug: 'mercado-spot',
    term: 'Mercado spot (contado)',
    category: 'cambio',
    short:
      'El mercado spot es donde las divisas se compran y venden para entrega inmediata, al precio del momento.',
    body: 'Cuando comprás dólares hoy a la cotización de hoy, operás en el mercado spot o de contado. Es lo opuesto a las operaciones a término (forward), donde se pacta hoy un precio para entregar la divisa en el futuro. La gran mayoría de las operaciones de las personas en las casas de cambio son spot.',
    related: ['mercado-forward', 'mercado-cambiario', 'cotizacion'],
  },
  {
    slug: 'mercado-forward',
    term: 'Mercado forward (a término)',
    category: 'cambio',
    short:
      'El mercado forward es donde se pacta hoy el precio de una divisa para entregarla en una fecha futura.',
    body: 'Permite fijar por adelantado el tipo de cambio de una operación que ocurrirá más adelante, lo que sirve como cobertura frente a movimientos del dólar. Lo usan sobre todo empresas con compromisos futuros en moneda extranjera. Para el público general es menos habitual que el mercado spot, pero entender la diferencia ayuda a dimensionar el riesgo cambiario.',
    related: ['mercado-spot', 'cobertura-cambiaria', 'tipo-de-cambio'],
  },
  {
    slug: 'dolar-mep',
    term: 'Dólar MEP',
    category: 'cambio',
    short:
      'El dólar MEP es un tipo de cambio de Argentina que surge de comprar y vender títulos para hacerse de dólares de forma legal.',
    body: 'Es un término argentino que aparece al comparar el dólar entre ambos países. Surge por las restricciones cambiarias de Argentina, que llevan a operar dólares a través de bonos (Mercado Electrónico de Pagos). Uruguay, con su mercado libre y unificado, no necesita estos mecanismos: aquí el dólar se compra y vende directamente en casas de cambio y bancos.',
    related: ['dolar-blue', 'brecha-cambiaria', 'mercado-cambiario'],
  },
  {
    slug: 'oro',
    term: 'Oro',
    category: 'cambio',
    short:
      'El oro es un metal precioso que funciona como reserva de valor y activo de refugio; se cotiza por onza troy en dólares.',
    body: 'Además de su uso en joyería, el oro se opera como inversión y como refugio frente a la inflación y la incertidumbre. Su precio internacional se expresa en dólares por onza troy de oro puro (24 quilates) y, llevado a pesos uruguayos, depende tanto de esa cotización como del tipo de cambio del dólar. En Uruguay, el Banco República y algunas casas de cambio publican precios de compra y venta del oro.',
    example:
      'Si la onza troy cotiza a USD 2.300 y el dólar está a $40, una onza equivale a unos $92.000 antes del spread de la casa.',
    related: ['onza-troy', 'quilate', 'moneda-refugio'],
  },
  {
    slug: 'onza-troy',
    term: 'Onza troy',
    category: 'cambio',
    short:
      'La onza troy es la unidad de peso con que se cotizan los metales preciosos: equivale a 31,1035 gramos.',
    body: 'A diferencia de la onza común (que ronda los 28,35 gramos), la onza troy se usa exclusivamente para metales preciosos como el oro y la plata, y equivale a 31,1035 gramos. Cuando ves el precio del oro, casi siempre es el valor de una onza troy de oro puro. Para obtener el precio por gramo hay que dividir entre 31,1035, y para joyería ajustar además por los quilates.',
    related: ['oro', 'quilate'],
  },
  {
    slug: 'quilate',
    term: 'Quilate',
    category: 'cambio',
    short:
      'El quilate mide la pureza del oro sobre 24 partes: 24k es oro puro, 18k tiene 75% y 14k cerca de 58%.',
    body: 'En joyería, el quilate indica cuánto oro puro contiene una pieza sobre un total de 24 partes. El oro 24k es puro; el 18k tiene 18 de 24 partes de oro (75%); el 14k, 14 de 24 (alrededor del 58%). Cuanto menor es el quilataje, menos oro contiene y menor es su valor por gramo. Por eso, al vender una joya, el precio parte del valor del gramo de oro puro ajustado por su pureza.',
    related: ['oro', 'onza-troy'],
  },
  {
    slug: 'moneda-refugio',
    term: 'Moneda refugio',
    category: 'cambio',
    short:
      'Una moneda o activo refugio es aquel que los inversores buscan en momentos de incertidumbre por su estabilidad.',
    body: 'En épocas de crisis o alta volatilidad, el dinero tiende a moverse hacia activos considerados seguros, que conservan su valor mejor que otros. El dólar estadounidense, el franco suizo y el oro suelen cumplir ese rol. En Uruguay, esa búsqueda de refugio se ve sobre todo en la demanda de dólares, que aumenta cuando crece la incertidumbre regional.',
    related: ['oro', 'divisa', 'cobertura-cambiaria'],
  },
  {
    slug: 'indice-medio-de-salarios',
    term: 'Índice Medio de Salarios',
    category: 'indicadores',
    short:
      'El Índice Medio de Salarios (IMS) mide la evolución de los salarios y es la base del ajuste de la Unidad Reajustable.',
    body: 'El Instituto Nacional de Estadística (INE) calcula el Índice Medio de Salarios para seguir cómo evolucionan las remuneraciones en Uruguay. Es la referencia con la que se ajusta mensualmente la Unidad Reajustable (UR), muy usada en alquileres y préstamos del Banco Hipotecario. A diferencia del IPC, que mide precios, el IMS mide salarios, por eso la UR y la UI pueden moverse de forma distinta.',
    related: ['unidad-reajustable', 'ipc', 'inflacion'],
  },
  {
    slug: 'criptomoneda',
    term: 'Criptomoneda',
    category: 'cambio',
    short:
      'Una criptomoneda es un activo digital que funciona sobre una red descentralizada y no depende de un banco central.',
    body: 'Las criptomonedas, como el Bitcoin, son activos digitales que se emiten y transfieren a través de redes basadas en blockchain, sin un banco central que las respalde. Su precio puede ser muy volátil. En Uruguay su uso viene creciendo, sobre todo entre quienes ya conocen el ecosistema, aunque para comprar dólares de forma simple la mayoría sigue recurriendo a las casas de cambio.',
    related: ['stablecoin', 'usdt', 'divisa'],
  },
  {
    slug: 'stablecoin',
    term: 'Stablecoin',
    category: 'cambio',
    short:
      'Una stablecoin es una criptomoneda diseñada para mantener un valor estable, normalmente atado al dólar estadounidense.',
    body: 'A diferencia del Bitcoin, cuya cotización es muy volátil, una stablecoin busca valer siempre lo mismo, por lo general un dólar. Para lograrlo, su emisor declara mantener reservas que la respaldan. Se usa para ahorrar en una unidad estable dentro del mundo cripto y para mover fondos rápido. La más conocida es el USDT (Tether).',
    related: ['usdt', 'criptomoneda', 'dolar-billete'],
  },
  {
    slug: 'usdt',
    term: 'USDT (Tether)',
    category: 'cambio',
    short:
      'El USDT es la stablecoin más usada: una criptomoneda que busca mantener su valor en torno a un dólar estadounidense.',
    body: 'El USDT, emitido por Tether, es la stablecoin más operada del mundo. Cada USDT busca valer aproximadamente un dólar, respaldado —según su emisor— por reservas en dólares y activos equivalentes. Es la base del llamado "dólar cripto": comprar USDT como forma de tener dólares dentro del ecosistema. No es dinero de curso legal ni un depósito bancario, por lo que conviene entender sus riesgos antes de operar.',
    related: ['stablecoin', 'criptomoneda', 'dolar-billete'],
  },
  {
    slug: 'peso-uruguayo',
    term: 'Peso uruguayo',
    category: 'cambio',
    short:
      'El peso uruguayo (UYU) es la moneda oficial de Uruguay, emitida por el Banco Central del Uruguay.',
    body: 'El peso uruguayo es la moneda de curso legal de Uruguay; su código internacional es UYU y se representa con el símbolo $ (o $U). Lo emite el Banco Central del Uruguay (BCU) y se divide en 100 centésimos. El peso actual existe desde 1993, cuando reemplazó al "nuevo peso" quitándole tres ceros. Circulan billetes de 20, 50, 100, 200, 500, 1.000 y 2.000 pesos y monedas de 1, 2, 5, 10 y 50 pesos. Aunque el dólar se usa mucho para ahorrar y operar montos grandes, todos los precios, sueldos e impuestos se expresan en pesos.',
    example:
      'Un café puede costar $120 (ciento veinte pesos uruguayos); 1 dólar equivale a unos $40.',
    related: ['divisa', 'casa-de-cambio', 'dolar-billete'],
  },
  {
    slug: 'tax-free',
    term: 'Tax Free',
    category: 'impuestos',
    short:
      'El Tax Free es el sistema que permite a los turistas extranjeros recuperar parte del IVA pagado en la compra de bienes al salir del país.',
    body: 'El Tax Free es un régimen de devolución del IVA para turistas no residentes: al comprar bienes (no servicios como hoteles o restaurantes) y salir del país, el turista puede recuperar una parte del impuesto. En Uruguay se gestiona en los puntos de salida —Aeropuerto de Carrasco, Laguna del Sauce, puertos y pasos de frontera— y suele exigir un monto mínimo de compra por factura y presentar los comprobantes. No debe confundirse con la exoneración de IVA en hoteles ni con la reducción en gastronomía, que son beneficios distintos y se aplican al pagar con tarjeta del exterior.',
    related: ['iva', 'impuestos-importacion'],
  },
  {
    slug: 'declaracion-jurada-origen-de-fondos',
    term: 'Declaración jurada de origen de fondos',
    category: 'banca',
    short:
      'Es el documento en el que se declara de dónde provienen los fondos de una operación, exigido por las normas de prevención de lavado de activos.',
    body: 'La declaración jurada de origen (y destino) de fondos es un formulario que las casas de cambio, bancos y otras instituciones piden cuando una operación supera ciertos montos, en cumplimiento de las normas de prevención de lavado de activos del Banco Central del Uruguay. En el caso del cambio de divisas, suele solicitarse junto con el documento de identidad cuando la operación supera el orden de los USD 3.000 diarios. No implica sospecha sobre la persona: es un requisito legal que aplica por igual a todos para dar trazabilidad a las operaciones de mayor monto.',
    related: ['casa-de-cambio', 'bcu'],
  },

  // ---- Impuestos sobre inversiones (reforma 2026) ----
  {
    slug: 'irpf-categoria-i',
    term: 'IRPF Categoría I (rentas de capital)',
    category: 'impuestos',
    short:
      'El IRPF Categoría I es el impuesto que pagan los residentes uruguayos sobre sus rentas de capital: intereses, dividendos, alquileres y ganancias por la venta de bienes, con una tasa general del 12%.',
    body: 'Grava las rentas de capital mobiliario e inmobiliario y los incrementos patrimoniales (ganancias por venta) de las personas físicas residentes. La tasa general es 12% sobre la renta neta (Título 7, art. 37 lit. B), con excepciones puntuales: depósitos bancarios según moneda y plazo, dividendos de fuente uruguaya al 7%, y la deuda pública uruguaya, exenta. Desde el 1/1/2026 alcanza también a las rentas y ganancias de capital de fuente extranjera —una cuenta en un bróker del exterior, el alquiler de un inmueble afuera—, algo que antes no se gravaba.',
    example:
      'Un plazo fijo en pesos a más de 3 años paga apenas 0,5% de IRPF; uno en dólares al mismo plazo paga 7%.',
    related: ['irpf-categoria-ii', 'incremento-patrimonial', 'renta-de-fuente-extranjera', 'irnr'],
  },
  {
    slug: 'irpf-categoria-ii',
    term: 'IRPF Categoría II (rentas del trabajo)',
    category: 'impuestos',
    short:
      'El IRPF Categoría II es el impuesto sobre las rentas del trabajo (el sueldo): se calcula por franjas progresivas expresadas en BPC, con deducciones por hijos, aportes y otros gastos.',
    body: 'Es el IRPF que te retienen del sueldo cada mes: se aplica un esquema progresivo por franjas, de 0% a 36%, sobre el ingreso nominal, y después se descuenta un crédito por las deducciones admitidas (aportes jubilatorios, hijos a cargo, FONASA, entre otras). Se liquida en los Formularios 1102/1103. No incluye rentas de capital —plazo fijo, dividendos, alquileres, venta de acciones o una cuenta en un bróker del exterior—: esas pagan el IRPF Categoría I, un impuesto distinto con sus propias tasas.',
    related: ['irpf-categoria-i', 'bpc', 'iass'],
  },
  {
    slug: 'irnr',
    term: 'IRNR (Impuesto a la Renta de los No Residentes)',
    category: 'impuestos',
    short:
      'El IRNR es el impuesto que pagan las personas físicas no residentes sobre las rentas que obtienen en Uruguay; usa en general las mismas tasas que el IRPF Categoría I.',
    body: 'Lo pagan quienes no califican como residentes fiscales uruguayos por las rentas de fuente uruguaya que obtienen: depósitos, alquileres, dividendos, ganancias de capital. Usa la misma matriz de nueve tasas que el IRPF Categoría I para depósitos, 7% para dividendos y dividendos fictos, 12% para el resto, y la deuda pública uruguaya también está exenta. Una diferencia importante: las entidades radicadas en países o regímenes de baja o nula tributación (BONT) tributan al 25%, salvo que se trate de dividendos de una empresa contribuyente de IRAE.',
    related: ['irpf-categoria-i', 'residencia-fiscal', 'irae'],
  },
  {
    slug: 'incremento-patrimonial',
    term: 'Incremento patrimonial',
    category: 'impuestos',
    short:
      'Un incremento patrimonial es la ganancia de capital: la diferencia entre el precio de venta y el costo fiscal actualizado de un bien, que tributa IRPF.',
    body: 'La regla general es (precio de venta − costo fiscal actualizado por UI/IPC) × 12% (Título 7, arts. 29 y 32): eso es lo que pagás al vender con costo probado, sea un inmueble, acciones u otro bien. Existen bases fictas —15% o 20% del precio de venta, según el caso— pero son obligatorias solo cuando no hay costo probable, u opcionales en casos puntuales (inmuebles anteriores a julio de 2007, bienes previos a la Ley 18.083, o, desde 2026, bienes en el exterior). El ficto del 20% (2,4% efectivo) no es el régimen por defecto para vender valores: con el costo documentado se aplica la fórmula real al 12%. Además hay una exoneración para operaciones chicas: cada venta hasta 30.000 UI, y una suma anual de esas operaciones menores por debajo de 90.000 UI, queda exenta (Título 7, art. 38 lit. I).',
    related: ['irpf-categoria-i', 'step-up-2025', 'renta-de-fuente-extranjera'],
  },
  {
    slug: 'renta-de-fuente-extranjera',
    term: 'Renta de fuente extranjera',
    category: 'impuestos',
    short:
      'Desde el 1/1/2026, Uruguay grava con IRPF todos los rendimientos y las ganancias de capital que un residente obtiene en el exterior, no solo los intereses y dividendos.',
    body: 'Antes de la reforma (Ley 18.718, vigente 2011–2025) solo se gravaban los rendimientos de capital mobiliario del exterior —intereses y dividendos— al 12%; las ganancias de capital del exterior no pagaban nada. La Ley 20.446 (vigente desde el 1/1/2026, reglamentada por el Decreto 95/026 y la Resolución DGI 1517/2026) amplió el impuesto a todos los rendimientos de capital, incluido el alquiler de un inmueble en el exterior, y por primera vez alcanza también los incrementos patrimoniales del exterior (vender acciones, ETFs o bonos extranjeros). La tasa sigue siendo 12%.',
    example:
      'Un bróker uruguayo que además ejerce la custodia de esos activos puede retener un 8% reducido —una retención, no la tasa, y definitiva solo si vos optás por eso—. Si operás directo con un bróker del exterior, nadie retiene nada acá y corresponden anticipos semestrales al 12% o declaración jurada.',
    related: ['irpf-categoria-i', 'step-up-2025', 'residencia-fiscal'],
  },
  {
    slug: 'residencia-fiscal',
    term: 'Residencia fiscal',
    category: 'impuestos',
    short:
      'Sos residente fiscal en Uruguay si pasás más de 183 días al año en el país, o si acá está el centro de tus intereses económicos o vitales.',
    body: 'Basta con cumplir cualquiera de estas condiciones (Título 7, art. 2): estar más de 183 días en el año civil, o tener acá el núcleo principal de tus actividades o intereses económicos o vitales (por ejemplo, si tu cónyuge e hijos menores viven habitualmente en Uruguay, se presume que también sos residente). Para contar los días cuentan todas las presencias físicas efectivas, y las ausencias esporádicas de hasta 30 días corridos se siguen contando como presencia, salvo que tengas un certificado de residencia fiscal de otro país. Obtener solo rentas puras de capital no alcanza para configurar la residencia por actividades. También se puede acceder a la residencia fiscal invirtiendo, por ejemplo comprando un inmueble por UI 3.500.000 (desde el 1/7/2020) con al menos 60 días de presencia efectiva en el país.',
    related: ['irnr', 'irpf-categoria-i', 'renta-de-fuente-extranjera'],
  },
  {
    slug: 'step-up-2025',
    term: 'Step-up al 31/12/2025',
    category: 'impuestos',
    short:
      'Para activos financieros que cotizan en bolsas de reconocido prestigio adquiridos antes del 31/12/2025, el costo fiscal se actualiza a su cotización de esa fecha: toda la ganancia anterior a 2026 queda fuera del impuesto.',
    body: 'Es uno de los cambios menos conocidos de la reforma de rentas del exterior: para activos que coticen en bolsas de reconocido prestigio y que hayas adquirido antes del 31 de diciembre de 2025, el costo fiscal a efectos del IRPF pasa a ser su cotización a esa fecha (Título 7, art. 32 + Decreto 95/026 art. 18), no lo que pagaste originalmente. En la práctica, toda la apreciación que ganó ese activo antes de 2026 no paga impuesto: solo se grava la diferencia entre lo que cotizaba al 31/12/2025 y el precio al que lo vendas. Si el cálculo así da una pérdida, esa pérdida no se puede compensar con otras rentas. La condición —bolsas de reconocido prestigio, comprado antes del 31/12/2025— no es opcional: sin ella no corresponde el step-up.',
    related: ['renta-de-fuente-extranjera', 'incremento-patrimonial', 'irpf-categoria-i'],
  },
  {
    slug: 'crs',
    term: 'CRS (intercambio automático de información financiera)',
    category: 'impuestos',
    short:
      'El CRS es el estándar de intercambio automático de información financiera entre países: Uruguay lo aplica desde 2017 y recibe datos de las cuentas que sus residentes tienen en las jurisdicciones socias.',
    body: 'Uruguay aplica el Common Reporting Standard desde 2017 (Ley 19.484): informa y también recibe información de forma automática de las jurisdicciones socias. Alcanza cuentas de depósito, cuentas de custodia, participaciones de capital o de deuda, seguros con valor de rescate y rentas vitalicias. Un dato clave y muy malentendido: Estados Unidos no está en el CRS, y Uruguay no figura en la lista de acuerdos FATCA del Tesoro estadounidense; con EE.UU. existe un acuerdo de intercambio a requerimiento, caso por caso, no automático. Eso no significa que una cuenta en el exterior quede fuera del impuesto: desde 2026 las rentas y ganancias de capital del exterior pagan IRPF, y la obligación de declarar es tuya con independencia de lo que la DGI vea o deje de ver.',
    related: ['renta-de-fuente-extranjera', 'dgi', 'irpf-categoria-i'],
  },
  {
    slug: 'dividendo-ficto',
    term: 'Dividendo ficto',
    category: 'impuestos',
    short:
      'El dividendo ficto es la utilidad que la ley considera distribuida aunque la empresa no la haya repartido: paga el mismo 7% de IRPF que un dividendo real.',
    body: 'Está en el art. 19 del Título 7 y sigue vigente en 2026: aunque la empresa no distribuya, la ley puede considerar distribuida parte de la utilidad acumulada y hacerla tributar. La tasa es la misma que la de los dividendos y utilidades distribuidos por contribuyentes de IRAE: 7% (Título 7, art. 37 lit. B). Ese 7% es de fuente uruguaya: los dividendos de una empresa del exterior son renta de fuente extranjera y pagan 12%, no 7%. En el IRNR el tratamiento de los dividendos y de los dividendos fictos también es del 7%.',
    related: ['irpf-categoria-i', 'irae', 'irnr'],
  },
  {
    slug: 'ficto-20',
    term: 'Ficto del 20%',
    category: 'impuestos',
    short:
      'El ficto del 20% es una base imponible presunta para calcular un incremento patrimonial: se toma el 20% del precio de venta como ganancia, lo que deja un impuesto efectivo del 2,4% del precio.',
    body: 'Como el IRPF sobre incrementos patrimoniales es del 12%, aplicar la base ficta del 20% del precio de venta deja un impuesto equivalente al 2,4% del precio. No es el régimen por defecto de la venta de valores: la regla general es la real —precio de venta menos costo fiscal actualizado, por 12%— y el ficto del 20% es obligatorio solo cuando no podés probar el costo, y opcional en casos puntuales (bienes anteriores a la Ley 18.083 y, desde 2026, bienes en el exterior mediante una opción anual en la declaración jurada). Con el costo documentado, el ficto puede salirte más caro que la regla real. Para inmuebles no rurales anteriores al 1/7/2007 existe un ficto distinto, del 15% del precio (1,8% efectivo).',
    example:
      'Vendés acciones en $500.000 con un costo fiscal probado de $400.000: por la regla real pagás 12% de $100.000, o sea $12.000. Por el ficto del 20% pagarías 2,4% de $500.000, o sea $12.000 también; si tu costo fuera mayor, el ficto te saldría peor.',
    related: ['incremento-patrimonial', 'irpf-categoria-i', 'step-up-2025'],
  },
] as const

/** Look up a glossary term by slug. */
export function getTerm(slug: string): GlossaryTerm | undefined {
  return glossary.find(term => term.slug === slug)
}

/** Every glossary slug, in catalogue order. Used by the sitemap and route guard. */
export function glossarySlugs(): string[] {
  return glossary.map(term => term.slug)
}

/** Terms grouped by category, in {@link GLOSSARY_CATEGORIES} order. */
export function glossaryByCategory(): Array<{
  category: GlossaryCategory
  label: string
  items: GlossaryTerm[]
}> {
  return (Object.keys(GLOSSARY_CATEGORIES) as GlossaryCategory[]).map(category => ({
    category,
    label: GLOSSARY_CATEGORIES[category],
    items: glossary.filter(term => term.category === category),
  }))
}

/** Resolve related slugs to full terms (skipping any that don't exist). */
export function relatedTerms(term: GlossaryTerm): GlossaryTerm[] {
  return term.related.map(slug => getTerm(slug)).filter((t): t is GlossaryTerm => Boolean(t))
}
