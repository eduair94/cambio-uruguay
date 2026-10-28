// Los directorios y herramientas del sitio que contestan un pedido concreto, y cómo se reconoce el
// pedido en un hilo.
//
// POR QUÉ HAY REGLAS ADEMÁS DEL ÍNDICE RAG. El brazo léxico del índice (`rankWithVector(q, null)`)
// encuentra bien las guías —"franquicia", "aguinaldo", "clearing" son palabras que la guía repite—
// y mal los directorios: "busco apto en el Cordón hasta 25 lucas" no comparte casi ninguna palabra
// con /alquileres-uruguay, cuya página es una grilla de avisos con filtros. Los directorios son
// justamente lo que el dueño pidió que se sugiera, así que se reconocen por regla.
//
// LAS REGLAS PROPONEN, NO DECIDEN. Medido sobre los 3.064 hilos de los 30 días previos al
// 2026-10-28: una regla de "celular" engancha "me chorearon el celular" y una de "alquiler" engancha
// las quejas por lo caro que está alquilar. Por eso todo lo que matchea acá pasa por el juez
// (`judge.ts`), que es quien dice si esa página contesta lo que se pidió. Una regla amplia cuesta
// una línea del lote del juez; una regla demasiado angosta pierde el hilo para siempre.
//
// El texto llega ya normalizado por `strip` (minúsculas, sin tildes, un espacio). `describe` es lo
// que el juez lee de la página: tiene que ser verdad sobre la página, no un folleto.

export type Family =
  | "alquileres"
  | "viviendas"
  | "autos"
  | "motos"
  | "compras"
  | "movilidad"
  | "cambio"
  | "tarjetas"
  | "prestamos"
  | "inversiones"
  | "aduana"
  | "trabajo"
  | "impuestos"
  | "tramites"
  | "otros";

export interface Destination {
  path: string;
  title: string;
  family: Family;
  describe: string;
  patterns: readonly RegExp[];
}

const BUY = "(comprar|compra|comprarme|compro|busco|buscando|conseguir|recomiendan|recomendacion|recomendaciones|conviene|vale la pena)";

export const DESTINATIONS: readonly Destination[] = Object.freeze([
  // --- vivienda -------------------------------------------------------------------------------
  {
    path: "/alquileres-uruguay",
    title: "Alquileres en Uruguay",
    family: "alquileres",
    describe:
      "Directorio de alquileres de todo el país que junta Mercado Libre, InfoCasas, El País, Casasweb y Facebook, con filtros por barrio, precio, dormitorios, garantía y gastos comunes.",
    patterns: [
      /\b(busco|buscando|buscamos|necesito|conseguir|encontrar)\b.{0,40}\b(apto|apartamento|monoambiente|casa|alquiler|habitacion|pieza)\b/,
      /\b(portales?|paginas?|sitios?|apps?) (de|para) (alquiler|alquileres|alquilar)\b/,
      /\bdonde (busco|buscar|conseguir|encontrar)\b.{0,20}\b(alquiler|apto|apartamento)\b/,
      /\b(alquilar|alquiler)\b.{0,40}\b(pocitos|cordon|centro|malvin|buceo|parque rodo|punta carretas|prado|tres cruces|parque batlle|la blanqueada|carrasco|union|ciudad vieja|aguada|la comercial)\b/,
      /\b(looking for|rent)\b.{0,30}\b(apartment|flat|house)\b/,
    ],
  },
  {
    path: "/garantia-de-alquiler-uruguay",
    title: "Garantías de alquiler",
    family: "alquileres",
    describe:
      "Compara las garantías para alquilar en Uruguay (ANDA, Contaduría, seguros de fianza, depósito en BHU): costo, requisitos y qué pide cada una.",
    patterns: [
      /\bgarantia\b.{0,40}\b(alquiler|alquilar|anda|cgn|contaduria|porto|sura|mapfre|deposito|bhu)\b/,
      /\b(anda|contaduria general|cgn)\b.{0,30}\bgarantia\b/,
    ],
  },
  {
    path: "/alquiler-de-temporada-uruguay",
    title: "Alquiler de temporada",
    family: "alquileres",
    describe: "Guía del alquiler de temporada en la costa uruguaya: dónde buscar, precios de referencia, contrato y seña.",
    patterns: [
      /\b(alquiler|alquilar|casa|apto)\b.{0,40}\b(temporada|vacaciones|enero|febrero|verano)\b/,
      /\btemporada\b.{0,30}\b(punta del este|la paloma|piriapolis|costa|rocha|atlantida|la pedrera)\b/,
    ],
  },
  {
    path: "/primer-alquiler-uruguay",
    title: "Tu primer alquiler",
    family: "alquileres",
    describe: "Guía para alquilar por primera vez en Uruguay: presupuesto, garantía, contrato, qué revisar antes de firmar.",
    patterns: [/\b(primer|primera vez)\b.{0,30}\b(alquiler|alquilar|apto|apartamento)\b/, /\bindependizar(me|se|nos)?\b/],
  },
  {
    path: "/donde-vivir-uruguay",
    title: "Dónde vivir",
    family: "alquileres",
    describe: "Asesor de barrios: compara zonas de Montevideo por alquiler, transporte, servicios y cortes de luz y agua.",
    patterns: [
      /\b(que|cual|en que) (barrio|zona)\b.{0,40}\b(vivir|alquilar|mudarme|mudarnos|recomiendan|conviene)\b/,
      /\b(barrio|zona)\b.{0,40}\bpara vivir\b/,
    ],
  },
  {
    path: "/venta-viviendas-uruguay",
    title: "Viviendas en venta",
    family: "viviendas",
    describe: "Directorio de casas y apartamentos en venta (InfoCasas, Casasweb) con precio por metro cuadrado y filtros por zona.",
    patterns: [
      /\b(comprar|compra|comprarme|comprarnos)\b.{0,30}\b(apto|apartamento|casa|vivienda|terreno|propiedad|inmueble)\b/,
      /\bprecio (del|por) (m2|metro cuadrado)\b/,
    ],
  },
  {
    path: "/prestamo-hipotecario-uruguay",
    title: "Préstamo hipotecario",
    family: "viviendas",
    describe: "Préstamos hipotecarios en Uruguay: BHU, BROU y bancos privados, tasas en UI, ahorro previo y requisitos.",
    patterns: [/\b(hipotec\w*|ahorro previo|credito para vivienda)\b/, /\bprestamo para (comprar|vivienda|una casa|un apto)\b/, /\bbhu\b/],
  },
  {
    path: "/fletes-mudanzas-uruguay",
    title: "Fletes y mudanzas",
    family: "alquileres",
    describe: "Precios de fletes y mudanzas en Uruguay y qué preguntar antes de contratar.",
    patterns: [/\b(flete|fletes|mudanza|mudanzas)\b/],
  },
  // --- autos y motos --------------------------------------------------------------------------
  {
    path: "/autos-usados-uruguay",
    title: "Autos usados en Uruguay",
    family: "autos",
    describe:
      "Directorio de autos usados de Mercado Libre, Facebook y automotoras uruguayas, con filtros por modelo, año, kilómetros, carrocería y precio en dólares.",
    patterns: [
      new RegExp(`\\b${BUY}\\b.{0,40}\\b(auto|autos|coche|camioneta|suv|pickup|vehiculo)\\b`),
      /\b(auto|autos|camioneta) (usado|usados|usada|de segunda)\b/,
      /\bprimer auto\b/,
      /\b(buy|buying)\b.{0,30}\b(car|used car)\b/,
    ],
  },
  {
    path: "/que-auto-comprar-uruguay",
    title: "Qué auto comprar",
    family: "autos",
    describe:
      "Asesor de compra: qué auto conviene según presupuesto y uso, con costo de repuestos y depreciación medidos en el mercado uruguayo.",
    patterns: [
      /\b(que|cual|cuales) (auto|autos|coche|camioneta|suv|modelo)\b/,
      /\b(recomiendan|recomendacion|conviene)\b.{0,40}\b(auto|camioneta|suv)\b/,
      // Quien compra el primero es justo quien no sabe qué modelo mirar.
      /\bprimer auto\b/,
      /\b(onix|hb20|gol|corolla|yaris|sandero|kwid|tracker|t-cross|creta|fronx|byd|baojun|chery|geely|versa|kicks|duster)\b.{0,60}\b(vs|conviene|recomiendan|opiniones|vale la pena)\b/,
    ],
  },
  {
    path: "/cuanto-vale-mi-auto-uruguay",
    title: "Cuánto vale mi auto",
    family: "autos",
    describe: "Tasador: cuánto vale un auto usado según modelo, año y kilómetros, calculado con los avisos reales del mercado uruguayo.",
    patterns: [
      // "tasación" sola no: medido, engancha la tasación del banco en los hilos de hipotecario.
      /\b(cuanto (vale|sale|pido|pedir|puedo pedir)|tasacion|tasar|precio justo)\b.{0,40}\b(auto|coche|camioneta)\b/,
    ],
  },
  {
    path: "/vender-mi-auto-uruguay",
    title: "Vender mi auto",
    family: "autos",
    describe: "Guía para vender un auto en Uruguay: dónde publicarlo, papeles, transferencia y cómo no caer en estafas.",
    patterns: [/\b(vender|venta de) (mi|el|un) (auto|coche|camioneta|vehiculo)\b/, /\btransferencia (del|de) (auto|vehiculo)\b/],
  },
  {
    path: "/motos-usadas-uruguay",
    title: "Motos usadas",
    family: "motos",
    describe: "Directorio de motos usadas en Uruguay con precios por modelo, cilindrada y año.",
    patterns: [
      new RegExp(`\\b${BUY}\\b.{0,40}\\b(moto|motito|scooter|motoneta)\\b`),
      /\bmoto\b.{0,30}\b(usada|110|125|150|cilindrada|cc)\b/,
    ],
  },
  {
    path: "/seguro-obligatorio-de-auto-uruguay",
    title: "Seguro de auto",
    family: "autos",
    describe: "El seguro obligatorio (SOA) y los seguros de auto en Uruguay: qué cubre cada uno y cuánto cuesta.",
    patterns: [/\bseguro obligatorio\b/, /\bsoa\b/, /\bseguro\b.{0,20}\b(auto|moto|vehiculo)\b/],
  },
  {
    path: "/multas-de-transito-y-patente-uruguay",
    title: "Multas y patente",
    family: "autos",
    describe: "Cómo consultar y pagar multas de tránsito y patente (SUCIVE) y qué pasa si se deben.",
    patterns: [/\b(patente|sucive|multa de transito|multas de transito)\b/],
  },
  {
    path: "/libreta-de-conducir-uruguay",
    title: "Libreta de conducir",
    family: "autos",
    describe: "Cómo sacar o renovar la libreta de conducir en Uruguay: requisitos, costos y plazos por intendencia.",
    patterns: [/\blibreta de conducir\b/, /\bsacar (la )?libreta\b/],
  },
  // --- compras --------------------------------------------------------------------------------
  {
    path: "/celulares-uruguay",
    title: "Celulares en Uruguay",
    family: "compras",
    describe: "Precios de celulares en Uruguay por modelo y condición (nuevo, usado, reacondicionado) en Mercado Libre y tiendas uruguayas.",
    patterns: [
      new RegExp(`\\b${BUY}\\b.{0,40}\\b(celular|celulares|telefono|iphone|samsung|xiaomi|redmi|motorola|pixel)\\b`),
      /\b(celular|iphone|samsung|xiaomi|motorola)\b.{0,40}\b(precio|barato|donde comprar|vale la pena|conviene)\b/,
    ],
  },
  {
    path: "/sillas-escritorio-uruguay",
    title: "Sillas de escritorio",
    family: "compras",
    describe: "Precios de sillas de escritorio en Uruguay y la tier list de r/CharruaDevs.",
    patterns: [/\bsillas?\b.{0,30}\b(escritorio|oficina|gamer|ergonomica|trabajar|home office)\b/],
  },
  {
    path: "/equipar-casa-uruguay",
    title: "Equipar la casa",
    family: "compras",
    describe:
      "Cuánto sale equipar una vivienda en Uruguay: heladera, lavarropas, aire acondicionado, muebles y más, con rangos de precio nuevo y usado.",
    patterns: [
      /\b(comprar|compra|recomiendan|recomendacion|precio|cuanto (sale|cuesta|gastar)|donde (compro|comprar)|que marca)\b.{0,50}\b(heladera|lavarropas|secarropas|aire acondicionado|aires acondicionados|microondas|horno|cocina|calefon|termotanque|estufa|televisor|tele|smart tv|sofa|sillon|cama|placard|ropero|lavavajillas|aspiradora|freidora)\b/,
      /\b(equipar|amueblar)\b.{0,20}\b(casa|apto|apartamento)\b/,
      /\b(heladera|lavarropas|aire acondicionado|aires acondicionados)\b.{0,40}\b(recomiendan|vale la pena|conviene|que marca)\b/,
    ],
  },
  {
    path: "/cuanto-gastar-en-un-sommier-uruguay",
    title: "Cuánto gastar en un sommier",
    family: "compras",
    describe: "Guía para elegir colchón o sommier en Uruguay: rangos de precio, materiales y qué marcas se recomiendan.",
    patterns: [/\b(sommier|somier|colchon|colchones)\b/],
  },
  {
    path: "/tiendas-online-uruguay",
    title: "Tiendas online uruguayas",
    family: "compras",
    describe:
      "Perfil de las tiendas online uruguayas con señales fechadas: antigüedad del dominio, Trustpilot, Google Maps y menciones en Reddit. No da veredictos de confianza.",
    patterns: [
      /\b(es confiable|son confiables|es seguro comprar|alguien (compro|le compro)|experiencia (con|comprando))\b/,
      /\b(tienda|pagina|web) (online )?(confiable|trucha)\b/,
    ],
  },
  {
    path: "/precios-de-supermercado-uruguay",
    title: "Precios de supermercado",
    family: "compras",
    describe: "Precios oficiales del SIPC por supermercado y departamento: qué súper es más barato con una canasta comparable.",
    patterns: [
      /\b(supermercado|super)\b.{0,40}\b(barato|mas barato|precios|conviene|canasta)\b/,
      /\b(mas barato|precios)\b.{0,30}\b(tienda inglesa|disco|devoto|tata|ta-ta|el dorado|macro mercado|kinko)\b/,
    ],
  },
  {
    path: "/monopatines-electricos-uruguay",
    title: "Monopatines eléctricos",
    family: "movilidad",
    describe: "Precios de monopatines eléctricos en Uruguay y la normativa de cada departamento para circular.",
    patterns: [/\bmonopatin\w*\b/, /\bscooter electrico\b/],
  },
  {
    path: "/bicicletas-electricas-uruguay",
    title: "Bicicletas eléctricas",
    family: "movilidad",
    describe: "Precios de bicicletas eléctricas en Uruguay y qué dice la normativa departamental.",
    patterns: [/\bbici(cleta)?s? electricas?\b/, /\be-?bikes?\b/],
  },
  {
    path: "/precio-de-la-nafta-uruguay",
    title: "Precio de la nafta",
    family: "movilidad",
    describe: "Precio de la nafta y el gasoil de ANCAP con el histórico de ajustes.",
    patterns: [
      /\b(precio|sube|baja|cuanto)\b.{0,30}\b(nafta|gasoil|combustible)\b/,
      /\b(nafta|gasoil|combustible)\b.{0,30}\b(precio|sube|baja|aumento)\b/,
    ],
  },
  {
    path: "/conviene-auto-moto-o-omnibus-uruguay",
    title: "¿Auto, moto u ómnibus?",
    family: "movilidad",
    describe: "Comparador: si conviene auto, moto, bici u ómnibus según el trayecto, con costos reales y tiempos con los horarios de la IM.",
    patterns: [/\b(auto|moto)\b.{0,40}\b(omnibus|bondi|boleto)\b/, /\b(omnibus|bondi|boleto)\b.{0,40}\b(auto|moto)\b/],
  },
  // --- dólar, bancos y crédito ----------------------------------------------------------------
  {
    path: "/mejor-casa-de-cambio",
    title: "Mejor casa de cambio hoy",
    family: "cambio",
    describe: "Dónde conviene cambiar hoy: las cotizaciones en vivo de más de 40 casas de cambio y bancos uruguayos, ordenadas.",
    patterns: [
      /\b(donde|conviene|mejor)\b.{0,40}\b(cambiar|comprar|vender)\b.{0,30}\b(dolares|dolar|pesos|reales|euros|usd|divisas)\b/,
      /\bcasas? de cambio\b/,
      /\b(cotizacion|precio) del (dolar|euro|real)\b/,
    ],
  },
  {
    path: "/cotizaciones-de-la-region",
    title: "Cotizaciones de la región",
    family: "cambio",
    describe: "Los siete dólares argentinos, el real (PTAX y turismo), el guaraní y el peso chileno, con fuentes oficiales.",
    patterns: [
      /\b(pesos argentinos|dolar blue|dolar tarjeta|dolar mep|guaranies)\b/,
      /\b(viaje|viajo|viajar|voy)\b.{0,40}\b(buenos aires|argentina|paraguay|chile)\b.{0,60}\b(plata|pesos|dolares|efectivo|tarjeta|cambiar)\b/,
    ],
  },
  {
    path: "/llevar-dolares-o-reales-a-brasil",
    title: "¿Dólares o reales a Brasil?",
    family: "cambio",
    describe: "Qué conviene llevar a Brasil: dólares, reales, tarjeta o Pix, con las cotizaciones del día.",
    patterns: [/\b(brasil|florianopolis|floripa|buzios|porto alegre|rio de janeiro)\b.{0,60}\b(reales|dolares|plata|efectivo|tarjeta|cambiar|pix)\b/],
  },
  {
    path: "/tarjetas-de-credito-uruguay",
    title: "Tarjetas de crédito",
    family: "tarjetas",
    describe: "Comparativa de tarjetas de crédito uruguayas: costo anual, requisitos, beneficios y millas.",
    patterns: [
      /\b(mejor|que|cual|recomiendan|sacar|sacarme)\b.{0,30}\btarjetas? de credito\b/,
      /\btarjetas? de credito\b.{0,40}\b(conviene|recomiendan|beneficios|costo)\b/,
    ],
  },
  {
    path: "/descuentos-con-tarjeta-uruguay",
    title: "Descuentos con tarjeta",
    family: "tarjetas",
    describe: "Mapa de descuentos con tarjeta por comercio, banco y día de la semana.",
    patterns: [
      /\bdescuentos?\b.{0,40}\b(tarjeta|banco|itau|santander|brou|oca|scotia|bbva)\b/,
      /\b(que banco|que tarjeta)\b.{0,30}\b(descuento|descuentos|beneficio|beneficios)\b/,
    ],
  },
  {
    path: "/cuenta-remunerada-uruguay",
    title: "Cuentas remuneradas",
    family: "tarjetas",
    describe: "Qué cuentas remuneradas hay en Uruguay, cuánto pagan y quién administra la plata.",
    patterns: [/\bcuentas? remuneradas?\b/, /\b(donde|en que)\b.{0,30}\b(ahorrar|guardar|poner)\b.{0,20}\b(plata|ahorros|pesos)\b/],
  },
  {
    path: "/mejores-prestamos-uruguay",
    title: "Mejores préstamos",
    family: "prestamos",
    describe: "Comparador de préstamos uruguayos con la TEA real de cada uno y los topes de usura del BCU.",
    patterns: [
      /\b(prestamo|prestamos|credito personal)\b.{0,40}\b(conviene|recomiendan|tasa|tea|donde|mejor|barato)\b/,
      /\b(donde|quien)\b.{0,20}\b(pido|pedir|saco|sacar)\b.{0,20}\b(prestamo|credito)\b/,
    ],
  },
  {
    path: "/inversiones-uruguay",
    title: "Invertir desde Uruguay",
    family: "inversiones",
    describe: "Opciones para invertir desde Uruguay (plazo fijo, letras, bonos, fondos, brokers del exterior) con riesgos y costos.",
    patterns: [/\b(invertir|inversion|inversiones)\b.{0,40}\b(uruguay|donde|en que|recomiendan|conviene|ahorros)\b/, /\ben que invierto\b/],
  },
  // --- aduana ---------------------------------------------------------------------------------
  {
    path: "/couriers-uruguay",
    title: "Couriers y casilleros",
    family: "aduana",
    describe: "Comparador de couriers y casilleros para comprar en el exterior: tarifa por kilo, franquicia y plazos.",
    patterns: [
      /\b(courier|couriers|casillero|casilleros|gripper|tiendamia|miami box|punto mio|puntomio|aeropost|urubox|exur|eshopex)\b/,
      /\b(traer|comprar|pedir)\b.{0,30}\b(de|desde|en) (usa|estados unidos|eeuu|miami|amazon|china|ebay|aliexpress)\b/,
    ],
  },
  {
    path: "/franquicia-aduana-uruguay",
    title: "Franquicia de compras al exterior",
    family: "aduana",
    describe: "La franquicia de compras al exterior: el tope por compra, cuántas por año, cuándo se paga el 60 % y el IVA.",
    patterns: [/\bfranquicia\b/, /\b(aduana|impuesto|impuestos)\b.{0,40}\b(paquete|compra|envio|amazon|shein|temu|aliexpress)\b/],
  },
  {
    path: "/problemas-con-la-aduana-uruguay",
    title: "Problemas con la aduana",
    family: "aduana",
    describe: "Qué hacer si la aduana retiene un paquete o cobra de más: pasos, plazos y a quién reclamar.",
    patterns: [
      /\b(retuvieron|retenido|retuvo|retencion|frenaron)\b.{0,40}\b(paquete|aduana|envio|encomienda)\b/,
      /\baduana\b.{0,40}\b(retuvo|retuvieron|me cobra|me cobro|problema)\b/,
    ],
  },
  // --- trabajo e impuestos --------------------------------------------------------------------
  {
    path: "/herramientas/calculadora-sueldo-liquido",
    title: "Calculadora de sueldo líquido",
    family: "trabajo",
    describe: "Calcula el sueldo líquido desde el nominal con aportes jubilatorios, FONASA, FRL e IRPF de 2026.",
    patterns: [
      /\b(sueldo|salario)\b.{0,20}\b(liquido|nominal|en mano)\b/,
      /\b(cuanto|que) (me )?(descuentan|queda)\b.{0,30}\b(sueldo|salario|recibo)\b/,
    ],
  },
  {
    path: "/cuanto-me-tienen-que-pagar-uruguay",
    title: "Cuánto me tienen que pagar",
    family: "trabajo",
    describe: "Cuánto corresponde cobrar por ley según el sector: laudos de los Consejos de Salarios y salario mínimo.",
    patterns: [/\b(laudo|salario minimo|cuanto (me tienen|deberian|tendrian) que pagar|cuanto se paga|cuanto pagan)\b/],
  },
  {
    path: "/indemnizacion-por-despido-uruguay",
    title: "Indemnización por despido",
    family: "trabajo",
    describe: "Cómo se calcula el despido común en Uruguay, qué entra en la liquidación y plazos para reclamar.",
    patterns: [/\b(indemnizacion|me despidieron|me echaron|liquidacion final)\b/],
  },
  {
    path: "/contractor-en-uruguay",
    title: "Trabajar como contractor",
    family: "trabajo",
    describe: "Trabajar para el exterior desde Uruguay: cómo cobrar, facturar y qué impuestos se pagan.",
    patterns: [
      /\bcontractor\b/,
      /\b(cobrar|trabajar|laburar)\b.{0,30}\b(del exterior|para afuera|para el exterior|empresa extranjera|remoto para)\b/,
      /\b(deel|payoneer)\b/,
    ],
  },
  {
    path: "/facturar-en-monotributo-uruguay",
    title: "Facturar en monotributo",
    family: "impuestos",
    describe: "Monotributo en Uruguay: quién puede, topes de facturación, cuánto se paga y cómo facturar.",
    patterns: [/\bmonotributo\b/],
  },
  {
    path: "/que-empresa-abrir-uruguay",
    title: "Qué empresa abrir",
    family: "impuestos",
    describe: "Unipersonal, SAS o monotributo: qué tipo de empresa conviene abrir según ingresos y actividad.",
    patterns: [/\b(unipersonal|sas|literal e)\b.{0,40}\b(abrir|conviene|facturar|crear)\b/, /\babrir (una )?(empresa|sas|unipersonal)\b/],
  },
  {
    path: "/declaracion-de-irpf-uruguay",
    title: "Declaración de IRPF",
    family: "impuestos",
    describe: "La declaración jurada de IRPF: quién tiene que hacerla, cómo pedir la devolución y los plazos.",
    patterns: [/\birpf\b/, /\b(devolucion|declaracion jurada)\b.{0,30}\b(dgi|irpf|impuesto)\b/],
  },
  // --- trámites y otros -----------------------------------------------------------------------
  {
    path: "/mudarme-a-uruguay-residencia",
    title: "Mudarse a Uruguay",
    family: "tramites",
    describe: "Residencia legal en Uruguay para extranjeros: requisitos, cédula, plazos y costos.",
    patterns: [
      /\b(mudarme|mudarnos|emigrar|inmigrar) a uruguay\b/,
      /\b(residencia legal|residencia permanente|cedula uruguaya)\b/,
      /\b(move|moving|relocat\w*|immigrat\w*|residency)\b.{0,40}\buruguay\b/,
    ],
  },
  {
    path: "/cuanto-sale-el-pasaporte-uruguayo",
    title: "Pasaporte uruguayo",
    family: "tramites",
    describe: "Cuánto sale y cómo se saca el pasaporte uruguayo, con plazos y agenda.",
    patterns: [/\bpasaporte\b/],
  },
  {
    path: "/estafas-uruguay",
    title: "Estafas en Uruguay",
    family: "otros",
    describe: "Las estafas que circulan en Uruguay (mensajes, compras, alquileres falsos) y cómo reconocerlas.",
    patterns: [/\b(es (una )?estafa|me quieren estafar|intento de estafa|modalidad de estafa|sera estafa)\b/],
  },
  {
    path: "/defensa-al-consumidor-uruguay",
    title: "Defensa del Consumidor",
    family: "otros",
    describe: "Cómo reclamar ante Defensa del Consumidor: garantía legal, devoluciones, plazos y el formulario.",
    patterns: [/\bdefensa (al|del) consumidor\b/, /\b(garantia legal|derecho de retracto)\b/],
  },
]);

/** Los destinos cuya regla matchea el texto (ya pasado por `strip`), en el orden del registro. */
export function intentMatches(text: string): Destination[] {
  return DESTINATIONS.filter((d) => d.patterns.some((p) => p.test(text)));
}

const BY_PATH = new Map(DESTINATIONS.map((d) => [d.path, d] as const));

/** El destino del registro con esa ruta, si es uno. */
export function destinationOf(path: string): Destination | undefined {
  return BY_PATH.get(path);
}

/**
 * La familia de una ruta cualquiera del sitio, para el chip de la card y el filtro.
 *
 * Primero el registro; después palabras de la ruta, de la más específica a la más general (moto
 * antes que auto porque "conviene-auto-moto-o-omnibus" es movilidad, hipotecario antes que
 * préstamo porque es vivienda).
 */
const PATH_FAMILIES: ReadonlyArray<readonly [RegExp, Family]> = [
  [/omnibus|boleto|nafta|monopatin|bicicleta|transporte|peajes/, "movilidad"],
  [/moto/, "motos"],
  [/hipotec|venta-viviendas|catastral|contribucion-inmobiliaria|comprar-o-alquilar|cooperativas-de-vivienda|trasmisiones/, "viviendas"],
  [/alquil|inmobiliaria|garantia-de-alquiler|barrio|donde-vivir|desalojo|gastos-comunes|mudanza|cortes-de-luz/, "alquileres"],
  [/auto|vehicul|latin-ncap|patente|libreta|transito/, "autos"],
  [/aduana|courier|franquicia|importa|temu|shein|casillero|regalos-del-exterior|compra-exterior|paquete/, "aduana"],
  [/prestamo|deuda|clearing|usura|embargo|saldar|prescripcion|adelanto-de-efectivo/, "prestamos"],
  [/tarjeta|descuento|milla|bankos|beneficios|cuenta-remunerada|banco|mercado-pago|comisiones|cheques|efectivo|transferencia/, "tarjetas"],
  [/invers|letras|plazo-fijo|cripto|ahorro/, "inversiones"],
  [/irpf|iva|impuesto|dgi|monotributo|factur|fonasa|iass|empresa|credito-fiscal/, "impuestos"],
  [/sueldo|salario|aguinaldo|despido|trabajo|licencia|horas-extras|seguro-de-paro|jubil|bps|afap|contractor|renunciar|cuanto-me-tienen|mercado-it|pension|vacacional|asignacion/, "trabajo"],
  [/pasaporte|cedula|partida|certificado|apostillar|residencia|permiso|carne|tramite/, "tramites"],
  [/celular|silla|equipar|tienda|precio|supermercado|ciberlunes|black-friday|meal-prep|ropa|sommier|cambios-de-precio|apps/, "compras"],
  [/dolar|cambio|cotizacion|casa|sucursal|convertir|historico|region|euro|monedas|brasil|argentina|bcu|pizarra/, "cambio"],
];

export function familyOf(path: string): Family {
  const known = BY_PATH.get(path);
  if (known) return known.family;
  for (const [re, family] of PATH_FAMILIES) if (re.test(path)) return family;
  return "otros";
}
