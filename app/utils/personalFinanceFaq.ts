// app/utils/personalFinanceFaq.ts
// Catalogue of frequently-asked personal-economy questions from Uruguayans (mined
// from Reddit r/uruguay and similar) with reusable, honest, Uruguay-specific
// answers. PURE data + helpers (no Vue/Nuxt) so the page, search and tests share
// one source of truth. Powers /preguntas-economia-personal.
// Informational, not financial advice.

export type FaqCategory =
  | 'presupuesto'
  | 'ahorro_inversion'
  | 'deudas'
  | 'vivienda_alquiler'
  | 'sueldos_trabajo'
  | 'independizarse'
  | 'pareja_familia'
  | 'impuestos_tramites'
  | 'jubilacion'
  | 'general'

export type HowCommon = 'muy_comun' | 'comun' | 'ocasional'

export interface PersonalFaq {
  /** kebab-case unique id. */
  id: string
  question: string
  /** One-sentence TL;DR. */
  shortAnswer: string
  /** 2–5 sentence practical answer. */
  answer: string
  category: FaqCategory
  tags?: string[]
  howCommon?: HowCommon
}

export const FAQ_CATEGORIES: Readonly<Record<FaqCategory, string>> = Object.freeze({
  independizarse: 'Independizarse',
  vivienda_alquiler: 'Vivienda y alquiler',
  presupuesto: 'Presupuesto',
  ahorro_inversion: 'Ahorro e inversión',
  deudas: 'Deudas',
  sueldos_trabajo: 'Sueldos y trabajo',
  pareja_familia: 'Pareja y familia',
  impuestos_tramites: 'Impuestos y trámites',
  jubilacion: 'Jubilación',
  general: 'General',
})

export const FAQ_CATEGORY_ICONS: Readonly<Record<FaqCategory, string>> = Object.freeze({
  independizarse: 'mdi-home-account',
  vivienda_alquiler: 'mdi-home-city-outline',
  presupuesto: 'mdi-clipboard-list-outline',
  ahorro_inversion: 'mdi-piggy-bank-outline',
  deudas: 'mdi-scale-balance',
  sueldos_trabajo: 'mdi-briefcase-outline',
  pareja_familia: 'mdi-account-multiple-outline',
  impuestos_tramites: 'mdi-file-document-outline',
  jubilacion: 'mdi-account-clock-outline',
  general: 'mdi-help-circle-outline',
})

// Populated after research (Reddit FAQ mining + verify).
export const PERSONAL_FAQS: readonly PersonalFaq[] = Object.freeze([
  {
    id: 'cuanto-sueldo-para-vivir-solo',
    question: '¿Cuánto sueldo necesito para vivir solo en Montevideo?',
    shortAnswer:
      'Realista: entre $45.000 y $70.000 líquidos por mes según barrio y estilo de vida.',
    answer:
      'Para un monoambiente o 1 dormitorio en barrios accesibles (Cordón, Centro, La Blanqueada, Cerro) la cuenta cierra en torno a $43.000-$51.000/mes: alquiler $18.000-$24.000, comida ~$20.000, UTE/OSE/internet ~$6.000 y STM ~$2.800. En Pocitos o Punta Carretas subís a $60.000-$70.000. Con el salario mínimo 2026 ($25.383) es inviable vivir solo; un ingreso líquido de $50.000+ es lo mínimo cómodo, y compartir apartamento baja mucho el número. Antes de mudarte sumá el costo de arranque (garantía + primer mes + comisión + depósitos de UTE/OSE), que suele ser 2 a 3 sueldos juntos.',
    category: 'independizarse',
    tags: ['independizarse', 'alquiler', 'costo de vida', 'Montevideo', 'sueldo'],
    howCommon: 'muy_comun',
  },
  {
    id: 'cuanto-cuesta-independizarse-arranque',
    question: '¿Cuánta plata junto necesito para irme a vivir solo (costo de arranque)?',
    shortAnswer:
      'Presupuestá entre 2 y 3,5 meses de alquiler solo para arrancar, más el colchón del primer mes.',
    answer:
      'El golpe inicial no es el alquiler mensual sino todo lo que se paga junto al firmar: primer mes de alquiler, la garantía (ANDA/Porto ~80-90% de un mes o un depósito), la comisión inmobiliaria (habitualmente 1 mes + IVA), y las conexiones de UTE y OSE. Sumá muebles y electrodomésticos básicos, que fácil son otros USD 1.000-2.000 si arrancás de cero. Regla sana: no te mudes hasta tener juntado el arranque más un fondo de un mes de gastos por las dudas. Comprar usado (ferias, Marketplace, MercadoLibre) para el primer amoblado te ahorra muchísimo.',
    category: 'independizarse',
    tags: ['independizarse', 'garantía', 'mudanza', 'ahorro', 'muebles'],
    howCommon: 'muy_comun',
  },
  {
    id: 'garantia-alquiler-cual-conviene',
    question: '¿Qué garantía de alquiler me conviene: ANDA, Contaduría o Porto/seguro?',
    shortAnswer:
      'ANDA/Contaduría son más baratas pero lentas y por retención de sueldo; los seguros (Porto) son rápidos pero cuestan casi un mes de alquiler.',
    answer:
      'ANDA y Contaduría (CGN) funcionan por retención directa del sueldo y cobran alrededor de 3% mensual a cada parte; son las más económicas pero exigen relación laboral estable y el trámite es lento y burocrático. Los seguros de fianza como Porto aprueban en ~24 horas y no te retienen el sueldo, pero cobran una prima anual del orden del 80-90% de un mes de alquiler (muchas veces financiable en cuotas). Si tenés trabajo formal y tiempo, ANDA/CGN sale más barata a la larga; si necesitás cerrar rápido o sos monotributista/freelance, el seguro te destraba. Compará siempre el costo total del contrato, no solo la cuota del primer mes.',
    category: 'vivienda_alquiler',
    tags: ['garantía', 'alquiler', 'ANDA', 'Porto', 'Contaduría'],
    howCommon: 'muy_comun',
  },
  {
    id: 'deposito-alquiler-cuanto',
    question: '¿El depósito del alquiler cuánto es y me lo devuelven?',
    shortAnswer:
      'Suele ser 1 mes de alquiler y debe devolverse al final si dejás el apartamento sin daños ni deudas.',
    answer:
      'En Uruguay el depósito de garantía habitual es un mes de alquiler y sirve para cubrir daños o deudas de servicios al terminar el contrato. Te lo tienen que devolver al desocupar si dejás todo en orden y sin adeudos de UTE/OSE; conviene sacar fotos y estado del inmueble al entrar y al salir. Ojo: el depósito es distinto de la garantía (fiador/ANDA/seguro), y a veces se piden ambos. Dejá todo por escrito en el contrato para evitar líos a la devolución.',
    category: 'vivienda_alquiler',
    tags: ['depósito', 'alquiler', 'contrato', 'garantía'],
    howCommon: 'comun',
  },
  {
    id: 'ahorrar-pesos-o-dolares',
    question: '¿Conviene ahorrar en pesos o en dólares en Uruguay?',
    shortAnswer:
      'Depende del plazo: gastos futuros en pesos → ahorrá en pesos/UI que rinden más; ahorro de largo plazo o metas en USD → dólares.',
    answer:
      'Con la inflación uruguaya baja (~4-6%), un plazo fijo en pesos en BROU rinde 8-9% y en UI le ganás a la inflación, mientras el dólar quieto o un depósito en USD apenas rinde 1-2%. Si tu meta es en pesos (alquiler, gastos, un auto usado nacional) ahorrar en pesos/UI suele ser mejor por la tasa. Si tu meta es en dólares (viaje, casa, resguardo de largo plazo) o querés dormir tranquilo ante un salto del tipo de cambio, tiene sentido dolarizar parte. Lo más sensato es diversificar: no tener el 100% en una sola moneda y elegir según cuándo y en qué moneda vas a gastar esa plata.',
    category: 'ahorro_inversion',
    tags: ['ahorro', 'dólares', 'pesos', 'UI', 'plazo fijo'],
    howCommon: 'muy_comun',
  },
  {
    id: 'donde-guardar-los-dolares',
    question: '¿Dónde guardo los dólares, en el banco o en el colchón?',
    shortAnswer:
      'En Uruguay el dólar es libre; mejor una caja de ahorro en USD o instrumentos de bajo riesgo que dejarlos parados en efectivo.',
    answer:
      "A diferencia de Argentina no hay 'dólar blue': el tipo de cambio es único y libre, así que podés comprar y vender en bancos y casas de cambio sin restricciones. Los depósitos bancarios están cubiertos por el Fondo de Garantía (COPAB) hasta un tope por persona y banco, lo que da respaldo al ahorrista chico. Dólares parados pierden por inflación de EEUU; si no los vas a usar pronto, un plazo fijo en USD, letras del BCU o un fondo money market rinden algo sin mucho riesgo. Para efectivo que querés a mano, una caja de seguridad o cuenta en USD es más seguro que tenerlo en casa.",
    category: 'ahorro_inversion',
    tags: ['dólares', 'banco', 'BROU', 'seguridad', 'COPAB'],
    howCommon: 'comun',
  },
  {
    id: 'invertir-con-poca-plata',
    question: '¿En qué puedo invertir si tengo poca plata?',
    shortAnswer:
      'Arrancá con un fondo de emergencia en plazo fijo/UI o money market, y sumá Letras del BCU u ON vía corredor cuando juntes algo más.',
    answer:
      "Con poco capital lo primero no es 'invertir' sino tener un fondo de emergencia líquido (3-6 meses de gastos) en un plazo fijo o fondo money market en pesos/UI. Para dar el paso a inversión, las Letras de Regulación Monetaria del BCU (rinden ~7-9% en pesos, plazos de 30 a 360 días) y las Obligaciones Negociables de empresas locales se compran a través de un corredor de bolsa (Nobilis, Balanz, Gastón Bengochea, etc.). Para invertir afuera en acciones/ETFs, muchos usan brokers internacionales tipo Interactive Brokers, con montos de entrada bajos. Regla de oro: entendé el instrumento y su riesgo antes de poner un peso, y desconfiá de cualquier 'rendimiento asegurado' alto.",
    category: 'ahorro_inversion',
    tags: ['inversión', 'corredor de bolsa', 'letras', 'ETF', 'Balanz'],
    howCommon: 'muy_comun',
  },
  {
    id: 'fondo-de-emergencia',
    question: "¿Cuánto debería tener ahorrado 'por las dudas'?",
    shortAnswer:
      'Un fondo de emergencia de 3 a 6 meses de tus gastos básicos, líquido y accesible.',
    answer:
      'El fondo de emergencia cubre imprevistos (quedarte sin trabajo, una reparación, un tema de salud) sin tener que endeudarte. La meta clásica es 3 a 6 meses de gastos esenciales; si recién arrancás, poné como primer objetivo juntar el equivalente a un mes y después seguí sumando. Guardalo en algo líquido y de bajo riesgo (plazo fijo corto, money market en pesos/UI), no en acciones ni en algo que no puedas rescatar rápido. Este fondo va antes que cualquier inversión de riesgo.',
    category: 'presupuesto',
    tags: ['fondo de emergencia', 'ahorro', 'presupuesto', 'liquidez'],
    howCommon: 'comun',
  },
  {
    id: 'regla-presupuesto-50-30-20',
    question: '¿Cómo organizo mi sueldo para que me rinda?',
    shortAnswer:
      'Probá la regla 50/30/20: 50% necesidades, 30% gustos, 20% ahorro/deudas, adaptada a tu realidad.',
    answer:
      'Un punto de partida simple es el 50/30/20 sobre tu líquido: 50% a necesidades (alquiler, comida, transporte, servicios), 30% a gustos y 20% a ahorro o pagar deudas. En Montevideo, con alquileres altos, muchos arrancan más cerca de 60/20/20 y está bien: lo importante es que el ahorro sea una categoría fija, no lo que sobra. Automatizá: apenas cobrás, separá el ahorro a otra cuenta antes de gastar. Llevar registro un par de meses (una app o una planilla) te muestra a dónde se va la plata y casi siempre aparecen fugas evitables.',
    category: 'presupuesto',
    tags: ['presupuesto', '50/30/20', 'ahorro', 'finanzas personales'],
    howCommon: 'muy_comun',
  },
  {
    id: 'salir-del-clearing',
    question: '¿Cómo salgo del Clearing de Informes?',
    shortAnswer:
      'Pagando o negociando la deuda (una vez cancelada queda registrada hasta 5 años más; en la práctica Equifax la muestra ~3) o esperando el plazo legal (5 años impaga, renovable una vez).',
    answer:
      "El Clearing (Equifax) muestra tus deudas: las impagas quedan 5 años desde su incorporación (renovable por otros 5 si siguen sin pagarse) y, una vez canceladas, quedan registradas como 'canceladas' hasta 5 años más (en la práctica Equifax las muestra unos 3). Podés pedir tu informe gratis una vez cada 6 meses en Equifax o en el BCU para ver exactamente qué debés y a quién. Contactá al acreedor y negociá: en deudas viejas es común lograr quitas del 30-60%, y exigí certificado de cancelación y que informen la baja a la base de datos. Si hay un dato erróneo, por Ley 18.331 tienen que corregirlo en pocos días; desconfiá de quien te promete 'borrarte del Clearing' pagando: eso no existe, solo se sale pagando o por el paso del tiempo.",
    category: 'deudas',
    tags: ['Clearing', 'deudas', 'Equifax', 'BCU', 'negociación'],
    howCommon: 'muy_comun',
  },
  {
    id: 'como-salir-de-deudas',
    question: 'Estoy lleno de deudas y cuotas, ¿por dónde empiezo?',
    shortAnswer:
      'Listá todas las deudas con su tasa, frená deuda nueva, y atacá primero la más cara (tarjeta/financieras).',
    answer:
      "Primero hacé la foto completa: cada deuda, su saldo y su tasa de interés real; las tarjetas de crédito y financieras suelen tener las tasas más altas y son las que primero hay que matar. Dos métodos que funcionan: 'avalancha' (pagás primero la de mayor tasa, ahorra más plata) o 'bola de nieve' (la más chica primero, motiva). Mientras tanto frená la deuda nueva y, si tenés varias caras, evaluá consolidar en un préstamo de menor tasa (BROU/banco) para bajar el costo total. Si la cosa se te fue de las manos, negociá refinanciación con cada acreedor antes de caer en mora: casi siempre prefieren cobrar algo a mandarte al Clearing.",
    category: 'deudas',
    tags: ['deudas', 'tarjeta de crédito', 'refinanciación', 'intereses'],
    howCommon: 'muy_comun',
  },
  {
    id: 'comprar-en-cuotas-sin-recargo',
    question: '¿Conviene comprar en cuotas sin recargo o pagar contado?',
    shortAnswer:
      'Si son cuotas realmente sin recargo y tenés la plata, cuotas + ahorrar/invertir el resto suele ganarle al contado.',
    answer:
      "Cuando las cuotas son de verdad sin recargo (mismo precio que contado), pagar financiado y dejar tu plata rindiendo en un plazo fijo/money market te deja mejor parado, porque la inflación te licúa las cuotas fijas. La trampa es el 'descuento por pago contado': si pagando de una te hacen una rebaja, muchas veces conviene el contado. Cuidado también con las cuotas CON recargo o con la financiación de la tarjeta: ahí la tasa suele ser altísima y te comen vivo. Regla práctica: cuotas sin recargo solo si podés pagarlas sin ahogarte, y jamás financies gastos corrientes (súper, salidas) a interés.",
    category: 'deudas',
    tags: ['cuotas', 'tarjeta de crédito', 'contado', 'inflación', 'consumo'],
    howCommon: 'comun',
  },
  {
    id: 'cuanto-es-buen-sueldo',
    question: '¿Cuánto es un buen sueldo en Uruguay hoy?',
    shortAnswer:
      'El salario medio nominal ronda $70.000-$80.000; un líquido de $80.000-$100.000+ ya se considera cómodo para una persona.',
    answer:
      "Hablar de sueldos en Uruguay tiene truco: el nominal no es lo que cobrás. Del nominal te descuentan ~15% de aporte jubilatorio (BPS), FONASA (3% a 8% según familia e ingresos), FRL y, si pasás el mínimo no imponible (7 BPC = $48.048/mes en 2026), IRPF. El líquido suele quedar en 75-85% del nominal. Con un salario medio nominal de $70.000-$80.000, un ingreso líquido de $80.000-$100.000 o más ya te permite vivir solo cómodo y ahorrar; lo que es 'bueno' depende mucho del rubro, la experiencia y si es en pesos o dólares (tech y algunos servicios pagan en USD y cambian la ecuación).",
    category: 'sueldos_trabajo',
    tags: ['sueldo', 'salario líquido', 'IRPF', 'BPS', 'mercado laboral'],
    howCommon: 'muy_comun',
  },
  {
    id: 'nominal-vs-liquido',
    question: '¿Por qué mi sueldo líquido es mucho menor que el nominal?',
    shortAnswer:
      'Porque del nominal se descuentan BPS (15%), FONASA (3-8%), FRL y, si superás 7 BPC, IRPF.',
    answer:
      "El sueldo nominal es el 'de arriba'; el líquido (lo que te cae a la cuenta) sale de restarle los aportes personales. Los fijos son el 15% jubilatorio a BPS y el FONASA (3%, 4,5%, 6% u 8% según si tenés cónyuge/hijos a cargo e ingresos), más un pequeño FRL. Si tu base supera el mínimo no imponible de IRPF (7 BPC = $48.048/mes en 2026) se suma ese impuesto por franjas progresivas. Por eso el líquido suele quedar entre 75% y 85% del nominal; para no llevarte sorpresas, usá una calculadora de salario líquido antes de aceptar una oferta y preguntá siempre si el número que te dicen es nominal o líquido.",
    category: 'sueldos_trabajo',
    tags: ['salario líquido', 'nominal', 'BPS', 'FONASA', 'IRPF'],
    howCommon: 'muy_comun',
  },
  {
    id: 'aguinaldo-cuando-cuanto',
    question: '¿El aguinaldo cuánto es y cuándo se cobra?',
    shortAnswer:
      'Es un sueldo extra anual pagado en dos partes (junio y diciembre); equivale a lo cobrado en el semestre dividido 12.',
    answer:
      'El aguinaldo (sueldo anual complementario) es la doceava parte de todo lo que ganaste en el período. Se paga en dos cuotas: la primera en junio (por lo cobrado de diciembre a mayo) y la segunda en diciembre (por junio a noviembre). Se calcula sumando las partidas remuneratorias del semestre y dividiendo entre 12, así que si trabajaste todo el período te cae aproximadamente medio sueldo por vez. Es un buen momento para destinarlo a ahorro, cancelar deuda cara o el fondo de emergencia en vez de licuarlo en gastos.',
    category: 'sueldos_trabajo',
    tags: ['aguinaldo', 'SAC', 'BPS', 'ahorro'],
    howCommon: 'comun',
  },
  {
    id: 'salario-vacacional-licencia',
    question: '¿Qué es el salario vacacional y cuántos días de licencia me tocan?',
    shortAnswer:
      '20 días de licencia al año (más por antigüedad) y un salario vacacional del 100% del jornal líquido de esos días, pagado antes de salir.',
    answer:
      'Por cada año calendario trabajado te corresponden 20 días continuos de licencia, que aumentan un día cada 4 años a partir del quinto año en la empresa. El salario vacacional es una prima extra equivalente al 100% del jornal líquido de los días de licencia (Ley 16.101) y por decreto debe pagarse ANTES de que empieces las vacaciones. Se calcula tomando tu líquido, dividiéndolo entre 30 y multiplicándolo por los días que te tomás. La licencia generada un año se goza al año siguiente; si te desvinculás, te la deben pagar sin gozar.',
    category: 'sueldos_trabajo',
    tags: ['salario vacacional', 'licencia', 'vacaciones', 'derechos laborales'],
    howCommon: 'comun',
  },
  {
    id: 'monotributo-vs-unipersonal',
    question: 'Voy a facturar como freelance, ¿monotributo o empresa unipersonal?',
    shortAnswer:
      'Si facturás poco y vendés a consumidores, el monotributo es más barato y simple; si superás el tope o necesitás dar IVA, unipersonal Literal E.',
    answer:
      'El monotributo (BPS) es un pago único mensual que junta aportes jubilatorios e impuestos: ronda ~$3.900/mes sin cobertura de salud y ~$6.500 con FONASA, sin contador ni declaraciones de IVA. Tiene un tope de facturación anual (~$1.175.537 en 2026) y está pensado para actividades chicas y venta a consumidor final; si lo superás dos años seguidos tenés que pasar a unipersonal. La empresa unipersonal (Literal E) te permite facturar más y dar crédito fiscal de IVA a clientes empresa, pero cuesta más en aportes y conviene un contador. Para muchos freelancers que arrancan, el monotributo es el punto de entrada ideal por lo barato y simple.',
    category: 'impuestos_tramites',
    tags: ['monotributo', 'freelance', 'unipersonal', 'BPS', 'DGI'],
    howCommon: 'muy_comun',
  },
  {
    id: 'como-facturar-freelance',
    question: '¿Cómo empiezo a facturar legal como freelance/independiente?',
    shortAnswer:
      'Inscribite en BPS y DGI (monotributo o unipersonal), sacá certificado y emití e-tickets/e-facturas por cada trabajo.',
    answer:
      'Para trabajar por tu cuenta tenés que darte de alta en BPS y DGI; el trámite de monotributo se puede iniciar online y a veces queda pronto el mismo día, sin costo de apertura. Una vez inscripto emitís comprobante (e-ticket a consumidor final, e-factura a empresas) por cada venta, lo que además te ayuda a controlar que no te pases del tope. Guardá tus comprobantes y pagá la cuota mensual en fecha para no acumular multas y recargos. Si vas a facturarle a empresas que piden crédito de IVA o esperás crecer, evaluá desde el arranque la unipersonal con un contador.',
    category: 'impuestos_tramites',
    tags: ['freelance', 'facturación', 'monotributo', 'DGI', 'e-factura'],
    howCommon: 'comun',
  },
  {
    id: 'banco-no-me-deja-cobrar-del-exterior',
    question:
      '¿Por qué mi banco no me deja recibir la plata que gano afuera (gaming, streaming, freelance)?',
    shortAnswer:
      'No es una prohibición ni una rareza uruguaya: es control de lavado de activos por ingresos sin factura; formalizate o usá una fintech mientras tanto.',
    answer:
      'Es un reclamo que se repite en Reddit: consultás en un banco cómo cobrar ingresos del exterior (gaming, streaming, clientes freelance) y te encontrás con evasivas o hasta con un gerente que te sugiere abrir la cuenta en otro país. No hay ninguna ley uruguaya que te lo impida: los bancos están obligados por la Circular N.º 2.311 del BCU (2018, Recopilación de Normas de Prevención de Lavado de Activos) a justificar el origen de los fondos de cada cliente, y una cuenta personal que empieza a recibir transferencias recurrentes desde afuera sin factura de por medio activa esos controles. BROU, al ser el banco estatal más grande, suele ser el más estricto en este punto. La salida real es formalizarte como monotributista o empresa unipersonal para facturar esos ingresos, así la transferencia queda justificada, o mientras tanto recibirla por una fintech armada para esto como Takenos y pasarla a pesos de a poco. Antes de resignarte a un solo banco, compará: hay entidades privadas que puntúan bastante mejor que BROU en operativa con el exterior. Más detalle y pasos concretos en la guía "Trabajar para el exterior desde Uruguay" del sitio.',
    category: 'impuestos_tramites',
    tags: [
      'exterior',
      'gaming',
      'streaming',
      'freelance',
      'BROU',
      'lavado de activos',
      'transferencia internacional',
      'origen de fondos',
    ],
    howCommon: 'comun',
  },
  {
    id: 'irpf-como-funciona',
    question: '¿Cómo funciona el IRPF y por qué a veces me devuelven?',
    shortAnswer:
      'Es progresivo por franjas; no pagás si tu base es menor a 7 BPC/mes, y la declaración anual con deducciones suele generar devolución.',
    answer:
      'El IRPF de trabajo se cobra por franjas: solo pagás la tasa de cada tramo sobre la parte del ingreso que cae en ese tramo, no una tasa única sobre todo. Si tu base imponible mensual es menor al mínimo no imponible (7 BPC = $48.048 en 2026) no pagás. A lo largo del año te retienen mes a mes, pero podés deducir aportes, hijos a cargo (20 BPC anuales por hijo, ~$137.280), alquiler y cuota hipotecaria, entre otros. Por eso muchos, al hacer la declaración jurada, tienen crédito a favor y les terminan devolviendo; hacer la DJ casi siempre conviene. Ojo con un dato que circula mal: la campaña anual de declaraciones juradas es una ventana única (en 2026, del 29 de junio al 31 de agosto), no hay escalonamiento por el último dígito de la cédula. Ese escalonamiento por dígito existe, pero es para las obligaciones mensuales, no para la declaración anual.',
    category: 'impuestos_tramites',
    tags: ['IRPF', 'impuestos', 'deducciones', 'devolución', 'BPC'],
    howCommon: 'comun',
  },
  {
    id: 'comprar-o-alquilar',
    question: '¿Me conviene comprar o seguir alquilando?',
    shortAnswer:
      'Depende de estabilidad y ahorro previo: con crédito del BHU en UI la cuota puede parecerse al alquiler, pero comprar tiene costos y ata al largo plazo.',
    answer:
      "Alquilando pagás cada mes plata que no recuperás; comprando, con el crédito hipotecario del BHU en UI (hasta 90% del valor con el plan 'Yo Ahorro', plazos de hasta 25 años y tasas reales desde ~3,75%), la cuota a veces se parece al alquiler y al final la propiedad es tuya. El punto es que la cuota está en UI, ajusta por inflación, y sumás gastos de comprar (aporte inicial, escrituración, contribución inmobiliaria, mantenimiento). Comprar conviene si tenés ingreso estable, pensás quedarte varios años y ya juntaste el ahorro inicial (USD 10.000-20.000 según financiación). Si tu situación laboral o de ciudad es incierta, alquilar y ahorrar/invertir la diferencia puede ser más inteligente.",
    category: 'vivienda_alquiler',
    tags: ['comprar', 'alquilar', 'BHU', 'hipotecario', 'UI'],
    howCommon: 'muy_comun',
  },
  {
    id: 'credito-hipotecario-primer-paso',
    question: 'Quiero comprar mi primera vivienda, ¿por dónde arranco?',
    shortAnswer:
      "Junta el ahorro inicial (10-20% con BHU 'Yo Ahorro'), revisá tu capacidad de pago y compará BHU, BROU y bancos privados.",
    answer:
      "El primer paso es el ahorro inicial: el BHU financia hasta 80% (o 90% con el plan 'Yo Ahorro'), así que para una propiedad de USD 100.000 necesitás juntar entre USD 10.000 y 20.000. Después mirá tu capacidad de pago: la cuota no debería superar cómodamente el 25-30% de tu ingreso líquido, y como está en UI ajusta por inflación con el tiempo. Compará el BHU (tasas bajas en UI, plazos largos, ideal para primera vivienda) con BROU y bancos privados, que a veces dan en dólares o con otros beneficios. Pedí precalificación antes de enamorarte de una propiedad, así sabés hasta cuánto podés estirar.",
    category: 'vivienda_alquiler',
    tags: ['hipotecario', 'BHU', 'primera vivienda', 'ahorro', 'Yo Ahorro'],
    howCommon: 'comun',
  },
  {
    id: 'finanzas-en-pareja',
    question: '¿Cómo organizamos la plata en pareja, cuenta junta o separada?',
    shortAnswer:
      'No hay una única forma; el modelo más usado es proporcional a ingresos con una cuenta común para gastos compartidos y algo propio para cada uno.',
    answer:
      "Lo que mejor funciona no es 50/50 a ciegas sino aportar a los gastos comunes en proporción a lo que gana cada uno, sobre todo si hay diferencia de sueldos. Un esquema práctico es tres 'bolsillos': una cuenta común para lo compartido (alquiler, súper, servicios) y una cuenta propia para cada uno con libertad de gasto. Lo más importante no es el modelo sino hablar del tema seguido y con transparencia: metas, deudas que trae cada uno, cuánto ahorran juntos. Definan de antemano cómo manejan las deudas previas y los gastos grandes para evitar que la plata se convierta en el motivo de las peleas.",
    category: 'pareja_familia',
    tags: ['pareja', 'cuentas', 'gastos compartidos', 'presupuesto'],
    howCommon: 'comun',
  },
  {
    id: 'afap-cual-conviene',
    question: '¿Qué AFAP me conviene elegir?',
    shortAnswer:
      'Todas invierten parecido; fijate sobre todo en la comisión sobre el aporte y en la rentabilidad histórica, que República suele liderar en tamaño.',
    answer:
      "En Uruguay hay 4 AFAP (República, Itaú, Sura e Integración) y compiten en comisión y rentabilidad. Como los fondos tienen topes regulatorios parecidos, la variable más controlable es la comisión que te cobran sobre el aporte: a igual rentabilidad, menor comisión te deja más. Mirá también el 'subfondo' según tu edad (los jóvenes van al de acumulación, más de renta variable; cerca del retiro se pasa al de retiro, más conservador). No es una decisión de vida o muerte porque podés cambiarte, pero revisar comisión y rentabilidad neta cada tanto vale la pena.",
    category: 'jubilacion',
    tags: ['AFAP', 'jubilación', 'comisión', 'rentabilidad', 'BPS'],
    howCommon: 'comun',
  },
  {
    id: 'como-se-calcula-jubilacion',
    question: '¿Cómo se calcula mi jubilación y a qué edad me puedo jubilar?',
    shortAnswer:
      'Sistema mixto BPS + AFAP; la edad mínima va subiendo hacia los 65 y el cálculo usa tus mejores 20 años de sueldo más lo acumulado en la AFAP.',
    answer:
      'El sistema es mixto (Ley 20.130): parte de tu jubilación la paga BPS y parte sale de la renta de lo que acumulaste en tu AFAP. El haber se calcula sobre el promedio de tus mejores 20 años de remuneración, más lo capitalizado en la cuenta individual. Con la reforma la edad mínima de retiro sube gradualmente hacia los 65 años, con causales especiales que se están discutiendo en 2026 (por ejemplo, retiro anticipado para trabajadores de menores ingresos). Paso concreto hoy: pedí tu historia laboral en BPS para ver cuántos años de aporte tenés reconocidos y proyectar cuánto te falta; los años sin aportar te bajan la jubilación.',
    category: 'jubilacion',
    tags: ['jubilación', 'BPS', 'AFAP', 'edad de retiro', 'reforma'],
    howCommon: 'ocasional',
  },
  {
    id: 'conviene-aporte-voluntario-jubilacion',
    question: '¿Sirve ahorrar por mi cuenta para la jubilación además de la AFAP?',
    shortAnswer:
      'Sí; la jubilación estatal suele ser bastante menor que tu sueldo, así que un ahorro propio de largo plazo es muy recomendable.',
    answer:
      'La tasa de reemplazo (jubilación respecto del último sueldo) suele ser bastante menor a lo que la gente espera, sobre todo para quienes ganaban bien, así que depender solo de BPS+AFAP puede significar un bajón fuerte de ingresos al retirarte. Un ahorro propio de largo plazo (inversión diversificada en pesos/UI y dólares, o incluso una propiedad para renta) complementa y te da margen. La clave es el tiempo: empezar joven, aunque sea con poco, hace que el interés compuesto trabaje a tu favor durante décadas. Tratalo como un gasto fijo mensual más, automatizado, y no lo toques salvo emergencia real.',
    category: 'jubilacion',
    tags: ['jubilación', 'ahorro de largo plazo', 'inversión', 'interés compuesto'],
    howCommon: 'ocasional',
  },
  {
    id: 'como-empezar-a-ahorrar-sueldo-bajo',
    question: 'Gano poco, ¿igual puedo ahorrar algo?',
    shortAnswer:
      'Sí: pagate primero a vos con un monto chico y fijo apenas cobrás, y atacá primero las fugas y las deudas caras.',
    answer:
      'Ahorrar no es cuestión de cuánto ganás sino de sistema: apenas cobrás separá un monto fijo (aunque sea $1.000-$2.000) a otra cuenta antes de gastar, así el ahorro no queda a merced de lo que sobre. En paralelo, revisá gastos hormiga y suscripciones que no usás, y si tenés deuda de tarjeta o financiera cara, cancelarla rinde más que cualquier ahorro. Aprovechá los ingresos extra (aguinaldo, salario vacacional, devolución de IRPF) para dar saltos: en vez de licuarlos, mandalos al fondo de emergencia. Lo importante es la constancia; montos chicos sostenidos ganan a un ahorro grande que nunca arranca.',
    category: 'presupuesto',
    tags: ['ahorro', 'sueldo bajo', 'hábitos', 'fondo de emergencia'],
    howCommon: 'muy_comun',
  },
  {
    id: 'conviene-cuenta-sueldo-o-fintech',
    question: '¿Me conviene cobrar en el banco, en Prex/Mi Dinero o dónde?',
    shortAnswer:
      'Podés elegir libremente dónde cobrar; compará costos, cajeros, beneficios y descuentos de IVA antes de decidir.',
    answer:
      'Por la ley de inclusión financiera cobrás el sueldo en una cuenta a tu elección: bancos (BROU, Itaú, Santander, BBVA, Scotia) o instrumentos de dinero electrónico (Prex, Mi Dinero, entre otros), y podés cambiarte cuando quieras. Fijate en costos de mantenimiento, red y disponibilidad de cajeros, si te dan tarjeta de crédito, y en los beneficios y descuentos (muchas dan reintegros o promos). Los pagos con tarjeta de débito/instrumentos electrónicos tienen rebaja de IVA en varios rubros, lo cual suma. No te cases con una: tener una cuenta principal y una segunda como respaldo o para aprovechar descuentos es una jugada común y barata.',
    category: 'general',
    tags: ['cuenta sueldo', 'inclusión financiera', 'Prex', 'banco', 'IVA'],
    howCommon: 'comun',
  },
  {
    id: 'cuidado-con-estafas-inversion',
    question: 'Me ofrecen una inversión que paga muchísimo, ¿es confiable?',
    shortAnswer:
      "Casi seguro no: rendimientos altos 'garantizados', cripto milagrosa o esquemas de referidos suelen ser estafas.",
    answer:
      "Regla base: si promete rendimientos altos, rápidos y 'sin riesgo', es mentira; el riesgo y el retorno van siempre de la mano. Desconfiá de esquemas que dependen de que sumes referidos (piramidales), de 'traders' de redes que muestran autos y relojes, y de plataformas cripto que garantizan ganancias. Antes de poner un peso, verificá que el intermediario esté registrado y regulado por el BCU y buscá la letra chica. Ante la duda, no inviertas: perder tiempo mirando es gratis, perder tus ahorros no; ninguna oportunidad real se cae por preguntar o por tardar unos días en decidir.",
    category: 'general',
    tags: ['estafas', 'inversión', 'cripto', 'BCU', 'educación financiera'],
    howCommon: 'comun',
  },
  {
    id: 'pago-impuestos-broker-exterior',
    question: '¿Pago impuestos por mi cuenta en eToro / Interactive Brokers?',
    shortAnswer:
      'Sí: desde 2026 tributás 12% de IRPF por los rendimientos y las ganancias de esa cuenta, y como el bróker no retiene nada acá, te corresponden anticipos semestrales o declaración jurada.',
    answer:
      'Desde el 1° de enero de 2026 (Ley 20.446), Uruguay grava con IRPF Categoría I al 12% todos los rendimientos (intereses, dividendos) y también las ganancias de capital (vender acciones, ETFs, bonos) que obtenés en una cuenta en el exterior, algo que antes no pasaba con las ganancias de capital. Como Interactive Brokers, eToro o cualquier bróker del exterior no son agentes de retención uruguayos, nadie te descuenta el impuesto automáticamente: te corresponden anticipos semestrales al 12% o presentar una declaración jurada. Un dato valioso: para los activos que ya tenías antes del 31/12/2025 y cotizan en bolsas de reconocido prestigio, el costo fiscal se "actualiza" a su cotización de esa fecha, así que toda la ganancia acumulada antes de 2026 queda fuera del impuesto (el step-up). Podés descontar el impuesto que ya pagaste en el exterior sobre esa misma renta, hasta el tope del IRPF que te corresponde.',
    category: 'ahorro_inversion',
    tags: [
      'IRPF',
      'bróker exterior',
      'Interactive Brokers',
      'eToro',
      'inversiones',
      'rentas de fuente extranjera',
    ],
    howCommon: 'comun',
  },
  {
    id: 'pago-impuestos-cripto',
    question: '¿La cripto paga impuestos en Uruguay?',
    shortAnswer:
      'No está resuelto: no hay una norma tributaria específica para las criptomonedas, así que no hay una tasa clara ni sobre las ganancias ni sobre si se consideran renta local o del exterior.',
    answer:
      'No existe una norma que diga cómo tributan las criptomonedas en Uruguay. La única posición conocida de la DGI es una consulta de 2021 (Consulta N.º 6.419) que las trataría como un bien mueble incorporal, pero no es una ley ni una resolución general, y no accedimos a su texto primario. La Ley 20.345 de activos virtuales tampoco cambió esto: regula a los proveedores de servicios (exchanges) y su supervisión por el BCU, no la tributación. Ni el Decreto 95/026 ni la Resolución DGI 1517/2026 de la reforma de 2026 mencionan la cripto, así que ni siquiera está definido si una ganancia en cripto se considera renta local o de fuente extranjera. Por eso no publicamos un porcentaje: si operás con cripto de forma relevante, consultá a un contador.',
    category: 'ahorro_inversion',
    tags: ['cripto', 'impuestos', 'IRPF', 'DGI', 'no resuelto'],
    howCommon: 'comun',
  },
  {
    id: 'me-retiene-el-banco-irpf',
    question: '¿El banco me retiene el IRPF solo?',
    shortAnswer:
      'Sí, si tu plata está en un banco uruguayo: retiene automáticamente y podés dejar esa retención como definitiva. Si operás con un bróker del exterior, no te retiene nadie.',
    answer:
      'En Uruguay, los bancos y demás sujetos pasivos de IRAE retienen automáticamente el IRPF sobre las rentas de capital que generás con ellos —los intereses de un plazo fijo, por ejemplo— y podés optar por dejar esa retención como definitiva, lo que te libera de presentar declaración jurada por esa renta. Los alquileres los retiene la administradora de propiedades al 10,5% del bruto (ojo: eso es la retención, no la tasa real, que es 12% sobre la renta neta). La diferencia grande está en las cuentas en brókers del exterior: ahí no hay agente de retención uruguayo, así que nadie te descuenta nada automáticamente y te corresponden anticipos semestrales al 12% o declaración jurada.',
    category: 'impuestos_tramites',
    tags: ['IRPF', 'retención', 'banco', 'DGI', 'bróker exterior'],
    howCommon: 'comun',
  },
  {
    id: 'tengo-dolares-subio-el-dolar-pago',
    question: 'Tengo dólares y subió el dólar, ¿pago IRPF?',
    shortAnswer:
      'No: la diferencia de cambio por tener dólares (o cualquier moneda extranjera) está expresamente exenta de IRPF.',
    answer:
      'No. La ley exonera expresamente la diferencia de cambio que genera la sola tenencia de moneda extranjera (Título 7, art. 38 lit. G y H): si tenés dólares guardados y el tipo de cambio sube, esa "ganancia" en pesos no es una renta gravada. Es una de las respuestas que más se confunden, porque suena parecido a una ganancia de capital, pero la ley la trata distinto. Ojo que esto es distinto de vender un bien (una acción, un inmueble) cobrado en dólares: ahí sí puede haber un incremento patrimonial gravado, pero no por el simple hecho de que el dólar haya subido mientras tenías el billete o el depósito.',
    category: 'ahorro_inversion',
    tags: ['IRPF', 'dólares', 'tipo de cambio', 'exención'],
    howCommon: 'muy_comun',
  },
  {
    id: 'tengo-que-declarar-si-ya-me-retuvieron',
    question: '¿Tengo que hacer la declaración si ya me retuvieron?',
    shortAnswer:
      'No, si podés optar por dejar la retención como definitiva; sí, si tenés rentas sin agente de retención (como un bróker del exterior) o preferís liquidar por lo real.',
    answer:
      'Si un agente uruguayo (banco, administradora de propiedades, etc.) ya te retuvo el IRPF, en general podés optar por darle carácter definitivo a esa retención y quedar liberado de presentar la declaración jurada (Formulario 1101) por esa renta. Pero hay casos en los que sí tenés que declarar: cuando tenés rentas sin agente de retención, como una cuenta en un bróker del exterior (ahí corresponden anticipos semestrales y, salvo que los hagas definitivos, declaración jurada), o cuando te conviene liquidar por lo real —por ejemplo, si tu alquiler tiene más gastos deducibles que el 12,5% que asume la retención del 10,5%, presentar la declaración te puede devolver plata. La campaña anual (ejercicio del año anterior) va del 29 de junio al 31 de agosto, sin escalonamiento por cédula.',
    category: 'impuestos_tramites',
    tags: ['IRPF', 'declaración jurada', 'Formulario 1101', 'retención'],
    howCommon: 'ocasional',
  },
  {
    id: 'herede-plata-pago-impuestos',
    question: 'Heredé, ¿pago impuestos?',
    shortAnswer:
      'No: en Uruguay no hay impuesto a las herencias, y la transferencia por sucesión no genera IRPF.',
    answer:
      'No. Uruguay no tiene impuesto sucesorio, y la ley del IRPF establece expresamente que la transferencia de bienes por el modo sucesión no se considera una alteración patrimonial gravada (Título 7, art. 27 lit. B). Es otra de las respuestas que sorprenden, porque mucha gente asume que sí hay que pagar algo. Ojo: esto cubre la herencia en sí; si más adelante vendés lo que heredaste (un inmueble, acciones), esa venta sí puede generar un incremento patrimonial gravado, calculado sobre el costo fiscal que corresponda al bien heredado.',
    category: 'impuestos_tramites',
    tags: ['herencia', 'IRPF', 'impuesto sucesorio', 'exención'],
    howCommon: 'comun',
  },
])

/** FAQs grouped by category, in {@link FAQ_CATEGORIES} order, dropping empty groups. */
export function faqsByCategory(faqs: readonly PersonalFaq[] = PERSONAL_FAQS): Array<{
  category: FaqCategory
  label: string
  icon: string
  items: PersonalFaq[]
}> {
  return (Object.keys(FAQ_CATEGORIES) as FaqCategory[])
    .map(category => ({
      category,
      label: FAQ_CATEGORIES[category],
      icon: FAQ_CATEGORY_ICONS[category],
      items: faqs.filter(f => f.category === category),
    }))
    .filter(g => g.items.length > 0)
}

export function getFaq(id: string): PersonalFaq | undefined {
  return PERSONAL_FAQS.find(f => f.id === id)
}

/** Accent-insensitive lowercase haystack for the on-page search box. */
export function faqHaystack(f: PersonalFaq): string {
  return `${f.question} ${f.shortAnswer} ${f.answer} ${(f.tags || []).join(' ')}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
}
