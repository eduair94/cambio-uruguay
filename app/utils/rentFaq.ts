// The comprehensive, categorised rental FAQ for /alquilar-en-uruguay.
//
// Single source of truth for every "how does renting in Uruguay work?" question,
// built from the doubts that actually recur on r/uruguay and r/montevideo and
// answered against PRIMARY sources (IMPO for laws, gub.uy for MEF/DGI/MVOT/ANV
// and Defensa del Consumidor, official pages for ANDA/Porto/BHU). Rendered as a
// grouped accordion and mapped into the page's FAQPage schema.
//
// PURE module (no Vue/Nuxt runtime) so it can be unit-tested in plain Node.
// Every fiscal/legal figure carries a source; provider terms are volatile, so
// re-check the links each review. Last reviewed: RENT_FAQ_LAST_REVIEWED.

export const RENT_FAQ_LAST_REVIEWED = '2026-07-18'

export type RentFaqCategoryId =
  | 'garantias'
  | 'deposito'
  | 'costos'
  | 'gastos-comunes'
  | 'precio'
  | 'reparaciones'
  | 'plazo'
  | 'contrato'
  | 'ingresos'
  | 'impuestos'
  | 'derechos'
  | 'situaciones'

export interface RentFaqCategory {
  id: RentFaqCategoryId
  title: string
  icon: string
}

/** Display order of the accordion groups. */
export const RENT_FAQ_CATEGORIES: readonly RentFaqCategory[] = Object.freeze([
  { id: 'garantias', title: 'Garantías', icon: 'mdi-shield-key-outline' },
  { id: 'deposito', title: 'Depósito en garantía', icon: 'mdi-cash-lock' },
  { id: 'costos', title: 'Comisión y servicios', icon: 'mdi-receipt-text-outline' },
  { id: 'gastos-comunes', title: 'Gastos comunes', icon: 'mdi-office-building-outline' },
  { id: 'precio', title: 'Precio y aumentos', icon: 'mdi-trending-up' },
  { id: 'reparaciones', title: 'Reparaciones y mantenimiento', icon: 'mdi-wrench-outline' },
  { id: 'plazo', title: 'Plazo, renovación y rescisión', icon: 'mdi-calendar-clock' },
  { id: 'contrato', title: 'Contrato y cláusulas', icon: 'mdi-file-document-outline' },
  { id: 'ingresos', title: 'Ingresos y sin recibo de sueldo', icon: 'mdi-cash-check' },
  { id: 'impuestos', title: 'Impuestos', icon: 'mdi-percent-outline' },
  { id: 'derechos', title: 'Derechos, desalojo y estafas', icon: 'mdi-scale-balance' },
  { id: 'situaciones', title: 'Situaciones especiales', icon: 'mdi-account-group-outline' },
])

export interface RentFaqEntry {
  q: string
  a: string
  cat: RentFaqCategoryId
  /** Primary source backing the answer, when there is a specific one. */
  sourceUrl?: string
}

// NOTE: entries are appended by category below. The gap topics mined from Reddit
// (servicios, mascotas, subalquiler, extranjeros, temporario, vivienda social,
// regatear, aumento retroactivo, cuotas, cláusulas abusivas, desalojo,
// renovación de garantía, sin recibo) are researched and merged in the same
// shape, each with its primary source.
export const RENT_FAQ: readonly RentFaqEntry[] = Object.freeze([
  // --- Garantías ---
  {
    cat: 'garantias',
    q: 'No tengo garantía, ¿igual puedo alquilar?',
    a: 'Sí existe un régimen legal sin garantía, pero el propietario debe ofrecerlo y el contrato escrito debe acogerse expresamente a la Ley 19.889. La oferta es más escasa y los plazos de desalojo son más breves. También podés evaluar seguro, sumar ingresos de otras personas cuando el proveedor lo admita o acordar un depósito en el BHU.',
    sourceUrl: 'https://www.impo.com.uy/bases/leyes/19889-2020/421',
  },
  {
    cat: 'garantias',
    q: '¿Puedo usar la garantía de otra persona?',
    a: 'Depende del proveedor. Porto permite componer ingresos de hasta cinco solicitantes y ANDA indica que puede evaluar un garante cuando el ingreso o la antigüedad no alcanzan. Esa persona asume una obligación real: no la agregues sin que entienda y acepte el contrato.',
  },
  {
    cat: 'garantias',
    q: '¿Una habitación o pensión usa las mismas garantías?',
    a: 'No necesariamente. La garantía estatal excluye habitaciones de pensiones e inquilinatos porque exige un área de uso exclusivo con cocina y baño. En pensiones se suelen pactar otras condiciones; pedí recibo, reglas y forma de salida por escrito.',
  },
  {
    cat: 'garantias',
    q: '¿Estoy en el clearing, puedo alquilar igual?',
    a: 'Sí. El seguro de alquiler te rechaza porque revisa tu historial (es excluyente), pero el depósito, el dueño directo, un garante y el régimen sin garantía no dependen de tu clearing, y la garantía estatal FGA lo tolera dentro de límites. Tenemos una guía dedicada a alquilar estando en el clearing.',
    sourceUrl: 'https://cambio-uruguay.com/alquilar-estando-en-clearing',
  },

  // --- Depósito ---
  {
    cat: 'deposito',
    q: '¿Cuánto depósito pueden pedirme?',
    a: 'Para vivienda, el depósito en garantía no puede superar los cinco meses de alquiler (Ley 14.219). El depósito formal en garantía acordado entre las partes se canaliza por el BHU, que informa que puede integrarse hasta en diez pagos si ambas partes lo acuerdan y cobra un arancel de apertura del 5% del depósito.',
    sourceUrl: 'https://bhu.com.uy/ahorro/garantia-de-alquiler',
  },
  {
    cat: 'deposito',
    q: '¿El depósito de garantía se devuelve al terminar el contrato?',
    a: 'Sí: el depósito es tuyo y funciona como respaldo, no como un pago al propietario. Al finalizar, se devuelve si entregás la vivienda en las condiciones pactadas y sin deudas. El propietario puede descontar alquileres o servicios impagos y los daños que excedan el desgaste normal por uso; las reparaciones que hacen a la habitabilidad (humedades, cañerías) son de su cargo. El plazo y la forma de devolución deben figurar en el contrato: leé esa cláusula antes de firmar y, si no te lo devuelven sin motivo, podés reclamar en Defensa del Consumidor.',
    sourceUrl:
      'https://www.gub.uy/ministerio-economia-finanzas/garantia-de-alquileres/derechos-obligaciones-del-inquilino',
  },

  // --- Comisión y servicios ---
  {
    cat: 'costos',
    q: '¿La comisión de la inmobiliaria se calcula sobre el alquiler o también sobre los gastos comunes?',
    a: 'Solo sobre el alquiler. La comisión de intermediación equivale a un mes de alquiler más IVA, en un único pago al firmar, y se calcula sobre el precio del alquiler, no sobre los gastos comunes. Por ejemplo, con un alquiler de $1.000 y gastos comunes de $500, la comisión se calcula sobre $1.000. Pedí siempre factura con el IVA discriminado.',
    sourceUrl: 'https://adiu.uy/articulo.aspx?id=271',
  },

  // --- Gastos comunes ---
  {
    cat: 'gastos-comunes',
    q: '¿Qué son los gastos comunes y quién los paga?',
    a: 'En un apartamento en propiedad horizontal, los gastos comunes ordinarios (limpieza, portería, ascensor, mantenimiento, saneamiento) los paga el inquilino como servicio accesorio, junto con UTE, OSE y tributos municipales. Los gastos extraordinarios y las obras estructurales del edificio corresponden al propietario. Pedí la última liquidación de gastos comunes antes de firmar para no llevarte sorpresas.',
    sourceUrl:
      'https://www.gub.uy/ministerio-economia-finanzas/garantia-de-alquileres/derechos-obligaciones-del-inquilino',
  },

  // --- Precio y aumentos ---
  {
    cat: 'precio',
    q: '¿Cada cuánto y con qué índice aumenta el alquiler?',
    a: 'El alquiler se reajusta cada 12 meses. En los contratos bajo la LUC (Ley 19.889), si no se pacta otra cosa, el ajuste anual es la variación del Índice de Precios al Consumo (IPC). Confirmá en el contrato el índice y la frecuencia antes de firmar y no aceptes una fórmula que no puedas explicar con tus palabras.',
    sourceUrl: 'https://www.impo.com.uy/bases/leyes/19889-2020/422',
  },

  // --- Reparaciones ---
  {
    cat: 'reparaciones',
    q: '¿Quién paga una humedad o una reparación?',
    a: 'Las reparaciones que hacen a la habitabilidad de la vivienda (humedades, roturas de cañerías) son de cargo del propietario. Las reparaciones locativas que surgen del uso corriente corren por cuenta del inquilino. Documentá el problema con fotos y notificalo por un canal que deje constancia; si no se resuelve, consultá en Defensa del Consumidor.',
    sourceUrl:
      'https://www.gub.uy/ministerio-economia-finanzas/garantia-de-alquileres/derechos-obligaciones-del-inquilino',
  },

  // --- Plazo, renovación y rescisión ---
  {
    cat: 'plazo',
    q: '¿Puedo alquilar por menos de un año?',
    a: 'En el régimen común (Ley 14.219) el plazo mínimo para vivienda es de dos años, así que no podés pactar menos bajo ese régimen. En el régimen sin garantía de la LUC (Ley 19.889) las partes pactan el plazo libremente, con prórroga automática si nadie avisa 30 días antes del vencimiento. Para estadías cortas están los alquileres temporarios (amueblados, por semanas o meses), que se rigen por sus propias condiciones y suelen ser más caros por mes.',
    sourceUrl: 'https://www.impo.com.uy/bases/decretos-ley/14219-1974',
  },
  {
    cat: 'plazo',
    q: '¿Puedo rescindir el contrato antes de tiempo?',
    a: 'Depende del régimen. En el régimen común (Ley 14.219), el inquilino puede rescindir después del primer año, avisando con 60 días de anticipación y pagando la indemnización que fije el contrato. En el régimen sin garantía de la LUC, el contrato suele poder terminarse con un preaviso menor, según lo pactado. Leé la cláusula de rescisión antes de firmar y avisá siempre por un medio que deje constancia.',
    sourceUrl: 'https://www.impo.com.uy/bases/leyes/19889-2020/422',
  },

  // --- Ingresos y sin recibo ---
  {
    cat: 'ingresos',
    q: 'Trabajo por mi cuenta, ¿cómo pruebo mis ingresos?',
    a: 'Si no tenés recibo de sueldo, la garantía o la inmobiliaria suele pedir un certificado de ingresos firmado por un contador público, acompañado de facturas, movimientos bancarios o tu situación en DGI y BPS. Como referencia, las garantías miran que el alquiler no supere cierto porcentaje de tu ingreso: por ejemplo, Porto asegura hasta el 30% del ingreso líquido y ANDA pide que el alquiler no pase el 40% del ingreso nominal.',
  },

  // --- Impuestos ---
  {
    cat: 'impuestos',
    q: '¿Puedo descontar el alquiler de mis impuestos (IRPF o IASS)?',
    a: 'Sí. Si generás IRPF por rentas de trabajo (o cobrás jubilación o pensión gravada por IASS) y alquilás tu vivienda permanente, podés computar un crédito fiscal del 8% del alquiler efectivamente pagado en el año. Requisitos: contrato escrito (aunque esté vencido) con plazo de un año o más, ser titular del contrato e identificar al arrendador con nombre y cédula o RUC. No hace falta que el contrato esté inscripto. Se reclama en la declaración jurada de IRPF (formularios 1102 o 1103); si el crédito supera tu IRPF y cobrás jubilación gravada, el excedente se imputa al IASS.',
    sourceUrl:
      'https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/credito-fiscal-arrendamiento-inmuebles-irpf',
  },

  // --- Derechos, desalojo y estafas ---
  {
    cat: 'derechos',
    q: '¿Qué hago si ya recibí una intimación o aviso de desalojo?',
    a: 'No ignores plazos ni confíes solo en redes. Contactá la Defensoría Pública, un consultorio jurídico gratuito o un abogado y llevá contrato, recibos, mensajes y la notificación completa. Defensa del Consumidor no interviene cuando la acción judicial ya comenzó.',
  },

  // --- Servicios (UTE/OSE/saneamiento/contribución) ---
  {
    cat: 'costos',
    q: 'Si alquilo una vivienda, ¿quién paga la luz (UTE), el agua (OSE), el saneamiento y los gastos comunes?',
    a: 'Los pagás vos, el inquilino. La ley de alquileres (art. 77 del Decreto-Ley 14.219) dice que el pago de los consumos, gastos comunes u otros servicios accesorios a la locación es de cargo del arrendatario. El MEF lo confirma: al inicio del contrato tenés que poner a tu nombre la energía eléctrica (UTE) y el agua (OSE), y abonar UTE, OSE, gastos comunes, impuestos municipales y la tarifa de saneamiento. Ojo: si no los pagás, el arrendador puede gestionar el pago y trasladártelo con un 10% de recargo.',
    sourceUrl: 'https://www.impo.com.uy/bases/decretos-ley/14219-1974',
  },
  {
    cat: 'costos',
    q: '¿La contribución inmobiliaria la pago yo como inquilino o la paga el dueño?',
    a: 'En principio la contribución inmobiliaria es un gravamen a cargo del propietario, no tuya. El art. 76 del Decreto-Ley 14.219 declara nula la cláusula que ponga a cargo del arrendatario el pago de gravámenes que las leyes y ordenanzas pongan a cargo del propietario. La excepción son los tributos cuyo presupuesto de hecho sea el uso u ocupación de la finca, que sí corresponden al inquilino. Confirmá siempre lo que diga tu contrato.',
    sourceUrl: 'https://www.impo.com.uy/bases/decretos-ley/14219-1974',
  },
  {
    cat: 'costos',
    q: '¿La conexión de internet la tengo que pagar yo o el propietario?',
    a: 'La ley de alquileres no menciona expresamente internet, así que no hay una norma que lo imponga a una parte u otra: se define en lo que pacten en el contrato. En la práctica, como es un servicio que vos contratás y ponés a tu nombre para tu propio uso, lo habitual es que lo pague el inquilino, del mismo modo que UTE y OSE. Revisá tu contrato porque puede establecer algo distinto.',
    sourceUrl: 'https://www.impo.com.uy/bases/decretos-ley/14219-1974',
  },

  // --- Mascotas ---
  {
    cat: 'situaciones',
    q: '¿El propietario puede ponerme una cláusula de "no mascotas"? ¿Es válida?',
    a: 'Sí, en un contrato de alquiler de vivienda el propietario puede incluir una cláusula que prohíba tener mascotas y, en principio, es válida. El régimen de arrendamientos (Decreto-Ley 14.219) no obliga a aceptar animales ni prohíbe ese tipo de cláusula, así que rige la libertad contractual: lo que firmás te obliga. Distinto es el caso de una prohibición impuesta por el reglamento del edificio. Consejo: negociá y dejá por escrito cualquier excepción antes de firmar.',
    sourceUrl: 'https://www.impo.com.uy/bases/decretos-ley/14219-1974',
  },
  {
    cat: 'situaciones',
    q: 'El reglamento de copropiedad prohíbe mascotas. ¿Vale? ¿Me pueden hacer sacar el perro?',
    a: 'Hoy, un reglamento de copropiedad puede prohibir mascotas y, al estar otorgado por escritura e inscripto en el Registro, obliga incluso a los sucesores y ocupantes (Ley 10.751 de Propiedad Horizontal). Si el reglamento lo prohíbe expresamente, la prohibición es en principio exigible. Dicho esto, hay una discusión jurídica fuerte: parte de la doctrina sostiene que prohibir mascotas por reglamento sería inválido, porque ciertos derechos solo pueden limitarse por ley de interés general. No es una postura zanjada, así que ante un conflicto conviene asesorarte con abogado o escribano.',
    sourceUrl: 'https://www.impo.com.uy/bases/leyes/10751-1946',
  },
  {
    cat: 'situaciones',
    q: '¿Ya hay una ley que "prohíbe prohibir" mascotas en los edificios (2026)?',
    a: 'Cuidado con eso: al día de hoy NO hay una ley nacional vigente que anule las prohibiciones de mascotas en edificios. Hubo un proyecto que Diputados aprobó (declaraba nulas las cláusulas que prohíban animales de compañía), pero quedó sin votarse en el Senado y caducó; se retomó la iniciativa sin sanción definitiva confirmada, y el propio proyecto preveía que NO sería retroactivo. Como no es ley vigente, tomalo como proyecto en trámite y verificá el estado actual antes de decidir.',
    sourceUrl:
      'https://www.montevideo.com.uy/Noticias/Diputados-aprobo-ley-que-prohibe-prohibir-tenencia-de-mascotas-en-edificios-uc885056',
  },

  // --- Subalquiler / compartir ---
  {
    cat: 'situaciones',
    q: '¿Puedo subalquilar el apartamento que alquilo o compartirlo con un roommate? ¿Necesito permiso del dueño?',
    a: 'Por regla general sí podés subarrendar, salvo que el contrato te lo prohíba expresamente. El artículo 1791 del Código Civil dice que el arrendatario puede subarrendar para el mismo objeto que arrendó y dentro de su plazo, siempre que no se le haya prohibido de forma expresa, y aclara que la cláusula de prohibición se interpreta estrictamente. Revisá tu contrato: si nada dice, en principio podés; si prohíbe subarrendar, necesitás el consentimiento del dueño. Compartir con un roommate mediante subalquiler parcial entra en esta lógica.',
    sourceUrl: 'https://www.impo.com.uy/bases/codigo-civil/16603-1994/1791',
  },
  {
    cat: 'situaciones',
    q: '¿Es lo mismo subarrendar que ceder el contrato a otra persona?',
    a: 'No, son cosas distintas. El artículo 1791 del Código Civil establece que el arrendatario NO tiene la facultad de ceder el arriendo (transferirle tu contrato entero a otro para que ocupe tu lugar), salvo que el propietario lo autorice. En cambio, subarrendar (alquilarle a un tercero una parte o el todo, manteniéndote vos como inquilino frente al dueño) sí está permitido salvo prohibición expresa. Además, si cobrás por el subarriendo más de lo que pagás, el arrendador puede subirte el alquiler o rescindir (art. 68 del Decreto-Ley 14.219).',
    sourceUrl: 'https://www.impo.com.uy/bases/codigo-civil/16603-1994/1791',
  },

  // --- Extranjeros ---
  {
    cat: 'situaciones',
    q: 'Soy extranjero recién llegado, sin historia crediticia ni ingresos locales. ¿Qué opciones tengo para alquilar?',
    a: 'Tu opción más accesible es el depósito de garantía en el BHU: depositás plata como garantía y el banco no te hace estudio de crédito ni revisa el clearing, así que tu falta de historia local no importa. El tope legal para vivienda es 5 meses de alquiler (Decreto-Ley 14.219, art. 38), aunque podés acordar menos. Otras salidas: adelantar meses, el Fondo de Garantía de Alquileres del Estado (exige ingreso líquido formal de 15 a 100 UR) o directamente un alquiler temporario/amueblado, donde en general alcanza con depósito.',
    sourceUrl: 'https://www.impo.com.uy/bases/decretos-ley/14219-1974/38',
  },
  {
    cat: 'situaciones',
    q: '¿Me piden cédula uruguaya para alquilar o sirve el pasaporte o DNI de mi país?',
    a: 'Para las garantías institucionales sí necesitás cédula uruguaya: ANDA pide cédula de identidad vigente y el FGA del Estado exige documento nacional de identidad. En la práctica, la mayoría de inmobiliarias y propietarios también piden la cédula uruguaya (que sacás al iniciar la residencia), y el pasaporte no siempre lo aceptan como sustituto. Donde el pasaporte sí suele alcanzar es en alquileres temporarios/amueblados o por plataformas. Que las inmobiliarias exijan cédula es práctica de mercado, no una obligación legal, así que puede variar.',
    sourceUrl: 'https://www.gub.uy/tramites/fga-garantia-alquiler',
  },

  // --- Temporario / AirBnb ---
  {
    cat: 'situaciones',
    q: '¿Qué diferencia legalmente a un alquiler temporario (amueblado, tipo Airbnb) de uno permanente?',
    a: 'La diferencia central es el PLAZO y la zona, no los muebles ni el precio. El Decreto-Ley 14.219 saca del régimen general a las viviendas alquiladas por temporada, y define el contrato por temporada como el arrendamiento en zonas turísticas cuyo plazo no supere los 120 días. El permanente de casa-habitación cae bajo la ley con plazos mínimos y protección al inquilino; el temporario tiene desalojo exprés. Los muebles y el precio por mes no están regulados: en el temporario se pactan libremente. "Amueblado" o "AirBnb" es una descripción comercial; lo que la ley mira es que sea zona turística y plazo corto.',
    sourceUrl: 'https://www.impo.com.uy/bases/decretos-ley/14219-1974',
  },
  {
    cat: 'situaciones',
    q: 'Si soy propietario y alquilo por Airbnb/Booking, ¿cómo tributo?',
    a: 'Si sos residente fiscal y simplemente cedés el inmueble (aunque amueblado) sin montar una estructura tipo hotel, la renta es rendimiento de capital inmobiliario (IRPF Categoría I): la DGI aplica el 12% sobre la renta neta computable, con anticipos/retenciones del 10,5% sobre los ingresos brutos. El arrendamiento está exonerado de IVA, pero si sumás servicios de hospedaje (limpieza durante la estadía, ropa de cama con recambio, desayuno), la actividad puede pasar a hospedaje gravado por IVA (10%) y tributar como IRAE. Desde 2025 la DGI le exige a las plataformas reportar las operaciones, así que la renta hay que declararla igual. Confirmá tu caso con un contador o la DGI.',
    sourceUrl:
      'https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/irpf-rendimientos-capital-inmobiliario-0',
  },

  // --- Vivienda social / programas del Estado ---
  {
    cat: 'situaciones',
    q: '¿Qué es el alquiler con opción a compra del MVOT/ANV y quién califica?',
    a: 'Es un programa que te deja comprar tu vivienda sin ahorro previo: pagás un alquiler que después se toma como el ahorro exigido para el préstamo. Para calificar tenés que tener entre 18 y 55 años, no ser propietario, no tener embargos ni categoría 5 en la central de riesgos del BCU, y tener a cargo un menor o persona con discapacidad. Los ingresos del núcleo no pueden superar 40 UR (1 integrante), 60 UR (2), 72 UR (3), 84 UR (4) o 96 UR (5). Te inscribís contactando al MVOT o en oficinas del interior con llamados abiertos; hay entrevista y sorteo.',
    sourceUrl:
      'https://www.gub.uy/ministerio-vivienda-ordenamiento-territorial/politicas-y-gestion/alquiler-opcion-compra',
  },
  {
    cat: 'situaciones',
    q: '¿Cómo funciona el Fondo de Garantía de Alquiler (FGA) del Estado y quién puede pedirlo?',
    a: 'El FGA lo gestiona la ANV junto al MVOT y la Contaduría General de la Nación: te dan un certificado de garantía con respaldo del Estado para alquilar sin conseguir un garante particular. El núcleo familiar tiene que tener un ingreso líquido formal de entre 15 y 100 UR, no ser propietario en el mismo departamento ni tener otra garantía del Estado. El alquiler máximo garantizado es de 18 UR (21 UR para viviendas promovidas). Se solicita en Montevideo y Canelones en oficinas del MVOT y en el resto del país en la ANV.',
    sourceUrl: 'https://www.anv.gub.uy/fondo-de-garantia-de-alquiler',
  },
  {
    cat: 'situaciones',
    q: '¿Y si no quiero alquilar sino acceder a vivienda propia: cooperativas de ayuda mutua o MEVIR?',
    a: 'Hay dos caminos según dónde vivas. Las cooperativas de vivienda de ayuda mutua (FUCVAM) son grupos de familias que construyen en conjunto aportando horas de trabajo; se registra la cooperativa en INACOOP y se tramita el préstamo ante DINAVI-MVOT. Para el medio rural está MEVIR, que exige 18 años o más con personas a cargo (o 21 sin), necesidad de vivienda comprobable, residencia o trabajo en la zona los últimos 3 años y disponibilidad para la ayuda mutua; te inscribís en los llamados públicos por localidad. Los topes de ingreso varían por llamado.',
    sourceUrl: 'https://www.gub.uy/mevir/vivienda-nueva',
  },

  // --- Regatear / precio de mercado ---
  {
    cat: 'precio',
    q: '¿Se puede regatear o negociar el precio del alquiler?',
    a: 'Sí, se puede. En Uruguay no hay un precio de alquiler fijado por el Estado: el monto lo pactan libremente las partes de común acuerdo (Decreto-Ley 14.219). El valor publicado es un punto de partida negociable, no una cifra cerrada. Tenés más margen con un dueño directo que con una inmobiliaria grande, porque el particular decide solo y suele tener más flexibilidad. No perdés nada en ofertar por debajo de lo pedido, sobre todo si la unidad lleva tiempo publicada.',
    sourceUrl: 'https://www.impo.com.uy/bases/decretos-ley/14219-1974',
  },
  {
    cat: 'precio',
    q: '¿Cómo sé si el precio que me piden es razonable para la zona?',
    a: 'Compará contra los datos del INE, que publica el promedio real de los contratos vigentes (Indicadores de Actividad Inmobiliaria). El alquiler promedio del país rondaba los $21.000 a comienzos de 2026. Por barrio de Montevideo hay diferencias grandes: los más caros son Carrasco, Punta Carretas, Malvín y Pocitos, y los más baratos zonas como Casavalle o Manga. Usá esos datos como referencia relativa (qué zona es cara vs. barata). Si te piden bastante por encima del promedio de la zona, tenés un buen argumento para negociar.',
    sourceUrl: 'https://www.gub.uy/instituto-nacional-estadistica/tematica/iai-alquileres',
  },

  // --- Aumento retroactivo / reajuste ---
  {
    cat: 'precio',
    q: 'Si estuve un tiempo sin que me aumentaran, ¿me pueden cobrar el aumento RETROACTIVO de golpe?',
    a: 'Depende del régimen y de si el reajuste era legal o pactado. En los contratos viejos del Decreto-Ley 14.219 (permiso de construcción anterior al 2/6/1968) el reajuste es de orden público y se devenga automáticamente cada 12 meses, así el propietario no lo haya aplicado, y las diferencias acumuladas se pueden reclamar (sujetas a la prescripción de las deudas de alquiler). Si el reajuste dependía de pactarse (régimen LUC o libre) y nunca se pactó ni comunicó, el arrendador no puede inventar un retroactivo por encima de lo acordado. Ante un reclamo grande, asesorate.',
    sourceUrl: 'https://www.impo.com.uy/bases/decretos-ley/14219-1974/15',
  },
  {
    cat: 'precio',
    q: 'Mi contrato está vencido pero sigo pagando. ¿Qué pasa con la prórroga y los aumentos?',
    a: 'Que el contrato esté vencido no borra los reajustes. En el régimen LUC (Ley 19.889) el contrato se prorroga automáticamente por igual plazo salvo que una parte avise con preaviso no menor a 30 días, y durante esa prórroga se sigue aplicando el ajuste pactado (o el IPC anual por defecto si el precio está en pesos). En el régimen del Decreto-Ley 14.219, durante la prórroga legal el precio se sigue actualizando anualmente. Aunque el papel esté vencido, mientras ocupás y pagás, el reajuste de tu régimen sigue corriendo cada 12 meses.',
    sourceUrl: 'https://www.impo.com.uy/bases/leyes/19889-2020/422',
  },

  // --- Pagar en cuotas / adelantos ---
  {
    cat: 'deposito',
    q: '¿El depósito en garantía lo puedo pagar en cuotas?',
    a: 'Sí. Si la garantía es del BHU, el monto se puede integrar hasta en 10 pagos, pero tenés que acordarlo con el arrendador; no es un derecho automático. Mientras lo pagás en cuotas, es el arrendador quien controla que vayas depositando, con los comprobantes. El BHU cobra un arancel del 5% del monto del depósito y la cuenta es en Unidades Indexadas. Para vivienda el tope es el equivalente a 5 meses de alquiler.',
    sourceUrl:
      'https://www.bhu.com.uy/preguntas-frecuentes/garantia-de-alquiler/quiero-abrir-una-cuenta',
  },
  {
    cat: 'deposito',
    q: '¿Me pueden exigir pagar varios meses de alquiler por adelantado?',
    a: 'No. El artículo 422 de la LUC (Ley 19.889) es tajante: en ningún caso el arrendador puede exigir el pago anticipado de más de una mensualidad de alquiler. Como máximo, un mes adelantado. Salvo que se pacte otra cosa, el alquiler se paga por mes vencido, dentro de los primeros diez días de cada mes. Ojo: ese tope de un mes se refiere al alquiler adelantado, no al depósito en garantía, que es una garantía aparte y puede equivaler a varios meses.',
    sourceUrl: 'https://www.impo.com.uy/bases/leyes/19889-2020/422',
  },

  // --- Cláusulas abusivas / contrato ---
  {
    cat: 'contrato',
    q: '¿La ley de alquileres es de orden público? ¿Puedo renunciar a sus protecciones si me lo ponen en el contrato?',
    a: 'Sí, es de orden público y no podés renunciar válidamente a sus protecciones. El art. 76 literal A del Decreto-Ley 14.219 declara expresamente nula la renuncia anticipada de los plazos, derechos y demás disposiciones de la ley. Aunque firmes una cláusula donde renunciás al plazo mínimo o a otros derechos, esa cláusula no vale y se tiene por no puesta. Distinto es el régimen de "arrendamiento sin garantía" de la LUC (2020), de contratación más libre, que el propio inquilino elige al acogerse a él.',
    sourceUrl: 'https://www.impo.com.uy/bases/decretos-ley/14219-1974/76',
  },
  {
    cat: 'contrato',
    q: '¿Pueden trasladarme gastos que le corresponden al dueño o fijar el alquiler en dólares?',
    a: 'No en ambos casos, según el art. 76 del Decreto-Ley 14.219, que enumera estipulaciones nulas. El literal B anula las cláusulas que te trasladen gravámenes que corresponden al propietario (salvo tributos que graven el uso de la finca). El literal E anula fijar el alquiler o su pago en moneda extranjera para vivienda. El artículo también anula prohibir la antena de TV y exigir aumentos o pagos adelantados una vez vencido el contrato. Si te metieron alguna de esas cláusulas, es nula aunque la hayas firmado.',
    sourceUrl: 'https://www.impo.com.uy/bases/decretos-ley/14219-1974/76',
  },
  {
    cat: 'contrato',
    q: 'Multas enormes, exonerar de responsabilidad al dueño, prohibirme reclamar: ¿son cláusulas abusivas?',
    a: 'Pueden serlo. La Ley 17.250 de Defensa del Consumidor considera abusiva toda cláusula que genere un desequilibrio claro e injustificado en tu perjuicio o viole la buena fe, y lista como abusivas las que exoneren o limiten la responsabilidad del proveedor, impliquen renuncia de tus derechos o le permitan modificar el contrato unilateralmente; la consecuencia es la nulidad de la cláusula. Salvedad: esa ley aplica a "relaciones de consumo" (cuando el arrendador o la inmobiliaria actúan profesionalmente). Si alquilás a un particular que arrienda su única propiedad, es discutido que haya relación de consumo, y conviene apoyarse también en el art. 76 de la 14.219.',
    sourceUrl: 'https://www.impo.com.uy/bases/leyes/17250-2000',
  },

  // --- Desalojo / echar al inquilino ---
  {
    cat: 'derechos',
    q: '¿El propietario puede echarme por su cuenta o necesita juicio?',
    a: 'Nunca te puede echar por su cuenta: el desalojo en Uruguay es siempre un proceso judicial y solo un juez puede ordenar el lanzamiento con la fuerza pública. Las causales típicas son falta de pago, vencimiento del contrato y mal uso o daños. Que el dueño cambie la cerradura, corte los servicios o te saque las cosas para forzarte a salir es ilegal y puede configurar delito, además de invalidar su pretensión. Si te pasa eso, no estás obligado a irte y podés denunciar.',
    sourceUrl: 'https://www.impo.com.uy/bases/decretos-ley/14219-1974',
  },
  {
    cat: 'derechos',
    q: 'En el régimen común (Ley 14.219), ¿qué plazos de desalojo hay por falta de pago y al vencer el contrato?',
    a: 'Por falta de pago (mal pagador): primero te intiman el pago con un plazo de 10 días hábiles; si no pagás, va a juicio y el juez concede un plazo de desalojo de 20 días, y recién después el lanzamiento. Si depositás lo adeudado más un 60% dentro del plazo para oponer excepciones, se desestima el desalojo, pero eso lo podés usar una sola vez. Si sos buen pagador y el contrato de casa-habitación vence, tenés derecho a un plazo de desalojo de hasta 1 año. Todo pasa por el juzgado.',
    sourceUrl: 'https://www.impo.com.uy/bases/decretos-ley/14219-1974',
  },
  {
    cat: 'derechos',
    q: '¿En el régimen sin garantía de la LUC el desalojo es más rápido?',
    a: 'Sí, bastante más rápido, pero igual es judicial: no te pueden echar por mano propia. Caés en mora cuando no pagás dentro de los 3 días hábiles siguientes a la intimación (que puede ir por telegrama colacionado), salvo mora automática pactada. El proceso tramita por vía monitoria y, una vez dictada la providencia de lanzamiento, el Alguacil lo ejecuta dentro de los 5 días hábiles de notificada. Este régimen solo aplica a contratos de casa-habitación pactados sin ningún tipo de garantía.',
    sourceUrl: 'https://www.impo.com.uy/bases/leyes/19889-2020/437',
  },

  // --- Renovación / costo de mantener la garantía ---
  {
    cat: 'garantias',
    q: 'Con la garantía de ANDA, ¿me cobran una prima anual o pago algo todos los meses?',
    a: 'Con ANDA no hay prima anual: pagás una comisión del 3% mensual (IVA incluido) sobre el monto del alquiler, y se cobra todos los meses mientras dure el contrato. No es un pago único ni anual, sino mes a mes junto con el alquiler. Como ANDA es una asociación, a ese 3% puede sumarse la cuota social si sos socio. Si renovás el contrato sin cambiar las condiciones, no te cobran un nuevo costo de trámite; solo si cambia el monto presentás el formulario con el valor actualizado.',
    sourceUrl: 'https://anda.com.uy/garantia-de-alquiler/propietario/preguntas-frecuentes/',
  },
  {
    cat: 'garantias',
    q: '¿Cuánto cuesta mantener la garantía por CGN o el seguro de Porto en el tiempo?',
    a: 'La garantía por Contaduría General de la Nación (CGN) no cobra por el trámite, pero una vez que arranca el descuento cobra un 3% del alquiler a cada parte (3% al propietario y 3% al inquilino), todos los meses mientras dure el contrato, y garantiza hasta el 40% del ingreso nominal. El seguro de fianza de Porto, en cambio, es una póliza anual de renovación automática: cada año se renueva la cobertura y se cobra la prima mientras siga el contrato. El monto de la prima de Porto no está publicado (se cotiza según el alquiler y el perfil): pedí la cotización formal.',
    sourceUrl: 'https://www.gub.uy/tramites/alquiler-contaduria-general-nacion',
  },

  // --- Sin recibo de sueldo ---
  {
    cat: 'ingresos',
    q: 'No tengo recibo de sueldo (independiente, changas, monotributista). ¿Con qué garantía puedo alquilar?',
    a: 'Podés alquilar igual: no hace falta recibo de sueldo, sino demostrar ingresos por otra vía. Con ANDA se acepta un Certificado de Ingresos emitido por escribano o contador público, más tus últimos aportes a BPS y DGI; el alquiler garantizado puede ser hasta el 40% de tu ingreso nominal, y si no te da podés sumar a familiares o amigos como cotitulares. Los jubilados entran con el comprobante de pasividad. Todo queda sujeto a aprobación crediticia. Y siempre está el depósito en garantía del BHU, que no evalúa ingresos ni historial.',
    sourceUrl: 'https://anda.com.uy/garantia-de-alquiler/inquilino/',
  },
  {
    cat: 'ingresos',
    q: '¿Existe un régimen legal para alquilar sin ninguna garantía?',
    a: 'Sí. El artículo 421 de la Ley 19.889 (LUC) creó un régimen de arrendamiento sin garantías: podés alquilar sin dar garante, depósito ni ninguna garantía a favor del propietario. Para que aplique tienen que cumplirse cinco condiciones a la vez: que sea casa-habitación, que no haya ninguna garantía, que el contrato sea por escrito, que incluya plazo y precio, y que ambas partes declaren expresamente su voluntad de regirse por esta ley. La contracara es un desalojo mucho más rápido si dejás de pagar, así que conviene entender ese riesgo antes de firmar.',
    sourceUrl: 'https://www.impo.com.uy/bases/leyes/19889-2020/421',
  },
])

/** Group the flat FAQ list into the ordered categories, dropping empty groups. */
export function rentFaqByCategory(): Array<{ category: RentFaqCategory; entries: RentFaqEntry[] }> {
  return RENT_FAQ_CATEGORIES.map(category => ({
    category,
    entries: RENT_FAQ.filter(e => e.cat === category.id),
  })).filter(g => g.entries.length > 0)
}
