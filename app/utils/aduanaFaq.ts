// Central customs/import FAQ mined from recurring r/uruguay questions.
//
// Reddit is used only to discover the questions. Every answer below is grounded in a primary
// norm, an official procedure, or an explicitly labelled absence/ambiguity. This file is pure data
// so search, the page and tests share one source of truth.

export const ADUANA_FAQ_LAST_REVIEWED = '2026-07-26'

export type AduanaFaqCategoryId =
  | 'antes-de-comprar'
  | 'franquicia-impuestos'
  | 'correo-courier-plataformas'
  | 'productos-permisos'
  | 'retenidos-reclamos'
  | 'viajeros-mudanzas'
  | 'importacion-comercial'

export type AduanaFaqBasis = 'norma' | 'procedimiento' | 'zona-gris'

export interface AduanaFaqSource {
  label: string
  authority: string
  url: string
  kind: 'norma' | 'fuente-oficial' | 'operador'
}

export interface AduanaFaqRelated {
  label: string
  to: string
}

export interface AduanaFaq {
  id: string
  question: string
  shortAnswer: string
  answer: string
  category: AduanaFaqCategoryId
  sourceIds: readonly string[]
  basis: AduanaFaqBasis
  tags: readonly string[]
  related?: AduanaFaqRelated
}

export const ADUANA_FAQ_CATEGORIES: ReadonlyArray<{
  id: AduanaFaqCategoryId
  label: string
  description: string
  icon: string
}> = Object.freeze([
  {
    id: 'antes-de-comprar',
    label: 'Antes de comprar',
    description: 'Documento, titularidad, registros y uso personal.',
    icon: 'mdi-cart-check',
  },
  {
    id: 'franquicia-impuestos',
    label: 'Franquicia, montos e impuestos',
    description: 'US$ 800, tres envíos, IVA, 60% y valor de factura.',
    icon: 'mdi-receipt-text-check-outline',
  },
  {
    id: 'correo-courier-plataformas',
    label: 'Correo, courier y plataformas',
    description: 'Quién declara y qué cambia con Amazon, Temu, AliExpress o Tiendamia.',
    icon: 'mdi-truck-fast-outline',
  },
  {
    id: 'productos-permisos',
    label: 'Productos y permisos',
    description: 'MSP, MGAP, URSEC, IMESI y restricciones de transporte.',
    icon: 'mdi-shield-search-outline',
  },
  {
    id: 'retenidos-reclamos',
    label: 'Retenidos, demoras y reclamos',
    description: 'Cómo liberar, plazos, documentación, daños y cobros.',
    icon: 'mdi-package-variant-closed-alert',
  },
  {
    id: 'viajeros-mudanzas',
    label: 'Viajeros, extranjeros y mudanzas',
    description: 'Equipaje, residencia, efectos usados y retorno al país.',
    icon: 'mdi-bag-suitcase-outline',
  },
  {
    id: 'importacion-comercial',
    label: 'Importación comercial y DUA',
    description: 'Reventa, cantidades, despachante, RUT y régimen general.',
    icon: 'mdi-domain',
  },
])

export const ADUANA_FAQ_SOURCES: Readonly<Record<string, AduanaFaqSource>> = Object.freeze({
  'ley-20446-627': {
    label: 'Ley 20.446, art. 627 — régimen postal, 60% y mínimo',
    authority: 'IMPO',
    url: 'https://www.impo.com.uy/bases/leyes/20446-2025/627',
    kind: 'norma',
  },
  'ley-20446-628': {
    label: 'Ley 20.446, art. 628 — acuerdos comerciales y obsequios familiares',
    authority: 'IMPO',
    url: 'https://www.impo.com.uy/bases/leyes/20446-2025/628',
    kind: 'norma',
  },
  'ley-20446-631': {
    label: 'Ley 20.446, art. 631 — abandono no infraccional',
    authority: 'IMPO',
    url: 'https://www.impo.com.uy/bases/leyes/20446-2025/631',
    kind: 'norma',
  },
  'ley-20446-632': {
    label: 'Ley 20.446, art. 632 — declaración inexacta y sanciones',
    authority: 'IMPO',
    url: 'https://www.impo.com.uy/bases/leyes/20446-2025/632',
    kind: 'norma',
  },
  'ley-20446-633': {
    label: 'Ley 20.446, art. 633 — IMESI y mercadería restringida',
    authority: 'IMPO',
    url: 'https://www.impo.com.uy/bases/leyes/20446-2025/633',
    kind: 'norma',
  },
  'decreto-50-026': {
    label: 'Decreto 50/026 — régimen vigente desde mayo de 2026',
    authority: 'IMPO',
    url: 'https://www.impo.com.uy/bases/decretos/50-2026',
    kind: 'norma',
  },
  'dna-prestacion-unica': {
    label:
      'DNA — Régimen tributario con prestación única (60%): personas jurídicas o físicas, pago a través del operador postal (art. 8 Dec. 50/026)',
    authority: 'Dirección Nacional de Aduanas',
    url: 'https://www.aduanas.gub.uy/innovaportal/v/28222/1/innova.front/',
    kind: 'fuente-oficial',
  },
  'decreto-220-998': {
    label:
      'Decreto 220/998 — reglamentación del IVA: art. 132 (monotributo paga como no contribuyente al importar) y art. 116 lit. c (sin anticipo)',
    authority: 'IMPO',
    url: 'https://www.impo.com.uy/bases/decretos/220-1998',
    kind: 'norma',
  },
  'ursec-importacion': {
    label:
      'gub.uy / URSEC — certificado para ingresar equipos radioeléctricos: excepción para dispositivos que operen únicamente con Wifi4/5/6 y/o Bluetooth',
    authority: 'URSEC',
    url: 'https://www.gub.uy/tramites/certificado-habilitar-ingreso-pais-equipos-radioelectricos-bajo-regimen-importacion-empresa',
    kind: 'fuente-oficial',
  },
  'ursea-productos': {
    label:
      'URSEA — Reglamento de Seguridad de Productos Eléctricos de Baja Tensión: alcance y listado de los Anexos II, V y VI que requieren autorización previa',
    authority: 'URSEA',
    url: 'https://www.gub.uy/unidad-reguladora-servicios-energia-agua/productos-electricos',
    kind: 'fuente-oficial',
  },
  'gripper-baterias': {
    label: 'Gripper — no se transportan baterías de litio sueltas, sin el dispositivo',
    authority: 'Gripper',
    url: 'https://soporte.gripper.com.uy/articulos/envios-con-restricciones/64/puedo-enviar-baterias',
    kind: 'operador',
  },
  tifa: {
    label: 'Ley 18.761, art. 7 — acuerdo TIFA con Estados Unidos',
    authority: 'IMPO',
    url: 'https://www.impo.com.uy/bases/leyes-internacional/18761-2011',
    kind: 'norma',
  },
  'dna-franquicia': {
    label: 'Régimen de Franquicia vigente y empresas registradas',
    authority: 'Dirección Nacional de Aduanas',
    url: 'https://www.aduanas.gub.uy/innovaportal/v/28221/1/innova.front/',
    kind: 'fuente-oficial',
  },
  'mef-faq': {
    label: 'Guía oficial de preguntas frecuentes del nuevo régimen',
    authority: 'Ministerio de Economía y Finanzas',
    url: 'https://www.gub.uy/ministerio-economia-finanzas/comunicacion/noticias/guia-preguntas-frecuentes-sobre-regimen-envios-postales-franquicias',
    kind: 'fuente-oficial',
  },
  'rg-dna-09-2026': {
    label: 'RG DNA 09/2026 — registro de vendedores extranjeros',
    authority: 'Dirección Nacional de Aduanas',
    url: 'https://www.aduanas.gub.uy/innovaportal/file/28428/1/resolucion-9_2026.pdf',
    kind: 'norma',
  },
  'rg-dna-10-2026': {
    label: 'RG DNA 10/2026 — identidad del usuario de franquicias',
    authority: 'IMPO / Dirección Nacional de Aduanas',
    url: 'https://www.impo.com.uy/bases/resoluciones-generales-aduanas-nd/10-2026',
    kind: 'norma',
  },
  'comunicado-dna-11-2026': {
    label: 'Comunicado 11/2026 — datos y medios de pago del registro',
    authority: 'IMPO / Dirección Nacional de Aduanas',
    url: 'https://www.impo.com.uy/bases/comunicados-comercio-exterior-aduanas/11-2026',
    kind: 'fuente-oficial',
  },
  'rg-dna-21-2026': {
    label: 'RG DNA 21/2026 — exigibilidad desde el 1.º de octubre de 2026',
    authority: 'Dirección Nacional de Aduanas',
    url: 'https://www.aduanas.gub.uy/innovaportal/file/28613/1/rg-21-2026.pdf',
    kind: 'norma',
  },
  'mef-datos-franquicia': {
    label: 'Respuesta oficial sobre qué datos recibe y conserva Aduanas',
    authority: 'MEF / Dirección Nacional de Aduanas',
    url: 'https://www.gub.uy/ministerio-economia-finanzas/sites/ministerio-economia-finanzas/files/2026-07/Expediente-2026-5-1-0006449%20PI%20Salle%20Lorier%20referente%20a%20nuevo%20r%C3%A9gimen%20de%20env%C3%ADos%20postales%20internacionales.pdf',
    kind: 'fuente-oficial',
  },
  'rg-dna-11-2026': {
    label: 'RG DNA 11/2026 — procedimiento de encomiendas postales',
    authority: 'IMPO / Dirección Nacional de Aduanas',
    url: 'https://www.impo.com.uy/bases/resoluciones-generales-aduanas-nd/11-2026',
    kind: 'norma',
  },
  'correo-declarar': {
    label: 'Cómo declarar una compra u obsequio',
    authority: 'Correo Uruguayo',
    url: 'https://www.correo.com.uy/como-declarar-su-compra-u-obsequio',
    kind: 'operador',
  },
  'correo-faq': {
    label: 'Preguntas frecuentes sobre encomiendas internacionales',
    authority: 'Correo Uruguayo',
    url: 'https://www.correo.com.uy/sobre-encomiendas-internacionales',
    kind: 'operador',
  },
  'dna-productos': {
    label: 'Productos que requieren permisos o no pueden ingresar',
    authority: 'Dirección Nacional de Aduanas',
    url: 'https://www.aduanas.gub.uy/innovaportal/v/28229/1/innova.front/',
    kind: 'fuente-oficial',
  },
  'dna-prohibidos': {
    label: 'Mercadería excluida o gravada por IMESI',
    authority: 'Dirección Nacional de Aduanas',
    url: 'https://www.aduanas.gub.uy/innovaportal/v/25107/3/innova.front/que-mercaderia-no-puedo-traer-bajo-el-regimen-de-encomiendas-postales-internacionales.html',
    kind: 'fuente-oficial',
  },
  'rg-dna-14-2026': {
    label: 'RG DNA 14/2026 — procedimiento para EPI retenidos',
    authority: 'Dirección Nacional de Aduanas',
    url: 'https://www.aduanas.gub.uy/innovaportal/file/28482/1/rg-14-2026.pdf',
    kind: 'norma',
  },
  'comunicado-dna-21-2026': {
    label: 'Comunicado 21/2026 — despacho simplificado de retenidos disponible',
    authority: 'Dirección Nacional de Aduanas',
    url: 'https://www.aduanas.gub.uy/innovaportal/file/28551/1/comunicado-21_2026-del-despacho-simplificado-de-epi-retenidos.pdf',
    kind: 'fuente-oficial',
  },
  'dna-retenidos': {
    label: 'Envíos retenidos: agenda y documentación',
    authority: 'Dirección Nacional de Aduanas',
    url: 'https://www.aduanas.gub.uy/innovaportal/v/28225/1/innova.front/',
    kind: 'fuente-oficial',
  },
  'carou-141': {
    label: 'Código Aduanero, art. 141 — control de todos los envíos postales',
    authority: 'IMPO',
    url: 'https://www.impo.com.uy/bases/codigo-aduanero/19276-2014/141',
    kind: 'norma',
  },
  'carou-140': {
    label: 'Código Aduanero, art. 140 — definición de envío postal internacional',
    authority: 'IMPO',
    url: 'https://www.impo.com.uy/bases/codigo-aduanero/19276-2014/140',
    kind: 'norma',
  },
  'carou-15': {
    label: 'Código Aduanero, art. 15 — casos sin despachante preceptivo',
    authority: 'IMPO',
    url: 'https://www.impo.com.uy/bases/codigo-aduanero/19276-2014/15',
    kind: 'norma',
  },
  'carou-159': {
    label: 'Código Aduanero, art. 159 — sustitución de mercadería en garantía',
    authority: 'IMPO',
    url: 'https://www.impo.com.uy/bases/codigo-aduanero/19276-2014/159',
    kind: 'norma',
  },
  'decreto-98-015': {
    label: 'Decreto 98/015 — retorno, reparación y sustitución de mercadería',
    authority: 'IMPO',
    url: 'https://www.impo.com.uy/bases/decretos/98-2015',
    kind: 'norma',
  },
  'ursec-185-016': {
    label: 'Reglamento de reclamaciones e indemnizaciones postales',
    authority: 'IMPO / URSEC',
    url: 'https://www.impo.com.uy/bases/resoluciones-ursec-originales/185-2016',
    kind: 'norma',
  },
  'ley-19009': {
    label: 'Ley 19.009 — régimen de las actividades postales',
    authority: 'IMPO',
    url: 'https://www.impo.com.uy/bases/leyes/19009-2012',
    kind: 'norma',
  },
  'ley-17250': {
    label: 'Ley 17.250 — relaciones de consumo',
    authority: 'IMPO',
    url: 'https://www.impo.com.uy/bases/leyes/17250-2000',
    kind: 'norma',
  },
  'dna-regimen-general': {
    label: 'Importación en régimen general mediante DUA',
    authority: 'Dirección Nacional de Aduanas',
    url: 'https://www.aduanas.gub.uy/innovaportal/v/28223/1/innova.front/',
    kind: 'fuente-oficial',
  },
  'decreto-139-014': {
    label: 'Decreto 139/014 — equipaje de viajeros MERCOSUR',
    authority: 'IMPO',
    url: 'https://www.impo.com.uy/bases/decretos-internacional/139-2014/1',
    kind: 'norma',
  },
  'decreto-43-019': {
    label: 'Decreto 43/019 — franquicias de US$ 500 y US$ 300',
    authority: 'IMPO',
    url: 'https://www.impo.com.uy/bases/decretos/43-2019',
    kind: 'norma',
  },
  'carou-133': {
    label: 'Código Aduanero, art. 133 — equipaje acompañado y no acompañado',
    authority: 'IMPO',
    url: 'https://www.impo.com.uy/bases/codigo-aduanero/19276-2014/133',
    kind: 'norma',
  },
  'ley-18250-76': {
    label: 'Ley 18.250, art. 76 — mudanza de uruguayos que retornan',
    authority: 'IMPO',
    url: 'https://www.impo.com.uy/bases/leyes/18250-2008/76',
    kind: 'norma',
  },
  'mudanza-retorno': {
    label: 'Mudanza de uruguayos que retornan al país',
    authority: 'gub.uy',
    url: 'https://www.gub.uy/tramites/mudanza-uruguayos-retornan-pais-amparados-ley-18250',
    kind: 'fuente-oficial',
  },
  'amazon-global': {
    label: 'Import Fees Deposit y transportista designado',
    authority: 'Amazon',
    url: 'https://digprjsurvey.amazon.co.uk/csad/help/node/G9UHGT37MYD2EJPL',
    kind: 'operador',
  },
  'temu-uy': {
    label: 'Términos de uso para Uruguay, sección de importación',
    authority: 'Temu',
    url: 'https://www.temu.com/uy/terms-of-use.html',
    kind: 'operador',
  },
})

export const ADUANA_FAQS: readonly AduanaFaq[] = Object.freeze([
  {
    id: 'requisitos-franquicia',
    question: '¿Qué requisitos tengo que cumplir para usar la franquicia?',
    shortAnswer:
      'Ser persona física mayor de edad, tener documento uruguayo y comprar para uso personal.',
    answer:
      'La franquicia exige una persona física mayor de edad con documento de identidad uruguayo, un envío de uso personal y sin fines comerciales, hasta 20 kg, y que comprador, titular del medio de pago y destinatario coincidan. El cupo anual es de US$ 800 en hasta tres envíos.',
    category: 'antes-de-comprar',
    sourceIds: ['decreto-50-026', 'dna-franquicia'],
    basis: 'norma',
    tags: ['requisitos', 'cedula', 'documento', 'mayor edad', 'uso personal'],
    related: { label: 'Ver la guía de franquicia', to: '/franquicia-aduana-uruguay' },
  },
  {
    id: 'menor-de-edad',
    question: '¿Un menor de edad puede usar la franquicia?',
    shortAnswer: 'No: la franquicia está reservada a personas físicas mayores de edad.',
    answer:
      'El Decreto 50/026 exige mayoría de edad para la franquicia. Un menor puede aparecer como consignatario en otros trámites con su representante legal, pero eso no le crea un cupo de franquicia propio.',
    category: 'antes-de-comprar',
    sourceIds: ['decreto-50-026', 'rg-dna-14-2026'],
    basis: 'norma',
    tags: ['menor', 'edad', 'hijo', 'representante'],
  },
  {
    id: 'extranjero-sin-cedula',
    question: '¿Puedo usar la franquicia con pasaporte, DNI o CPF extranjero?',
    shortAnswer: 'No; sin documento uruguayo podés recibir envíos, pero no usar la franquicia.',
    answer:
      'La nacionalidad no es el problema: la condición es tener documento de identidad uruguayo. Con pasaporte u otro documento extranjero el operador puede identificarte para una importación que pague los tributos correspondientes, pero no aplicarte la franquicia personal.',
    category: 'antes-de-comprar',
    sourceIds: ['decreto-50-026', 'dna-franquicia'],
    basis: 'norma',
    tags: ['extranjero', 'pasaporte', 'dni', 'cpf', 'sin cedula'],
    related: {
      label: 'Ver importar a Uruguay siendo extranjero',
      to: '/importar-a-uruguay-siendo-extranjero',
    },
  },
  {
    id: 'titular-compra-pago-destinatario',
    question: '¿Deben coincidir comprador, tarjeta y destinatario?',
    shortAnswer:
      'Sí, para una compra por franquicia los tres titulares deben ser la misma persona.',
    answer:
      'El Decreto 50/026 exige que el titular del medio de pago coincida con el titular de la compra y con el destinatario. Usar la cédula de una persona, la tarjeta de otra y recibir a nombre de una tercera hace perder el beneficio.',
    category: 'antes-de-comprar',
    sourceIds: ['decreto-50-026', 'dna-franquicia'],
    basis: 'norma',
    tags: ['titular', 'tarjeta', 'destinatario', 'comprador', 'coincidir'],
  },
  {
    id: 'tarjeta-de-otra-persona',
    question: '¿Puedo comprar con la tarjeta de mi pareja, familiar o amigo?',
    shortAnswer: 'No si querés usar tu franquicia; el medio de pago debe estar a tu nombre.',
    answer:
      'Para aplicar la franquicia, la tarjeta o instrumento admitido tiene que pertenecer a quien compra y recibe. No hay una excepción por parentesco, convivencia ni autorización del titular.',
    category: 'antes-de-comprar',
    sourceIds: ['decreto-50-026'],
    basis: 'norma',
    tags: ['tarjeta pareja', 'tarjeta familiar', 'tarjeta amigo', 'prestar franquicia'],
  },
  {
    id: 'franquicia-ajena',
    question: '¿Puedo usar o regalarle mi franquicia a otra persona?',
    shortAnswer:
      'No se traslada el cupo: quien usa la franquicia debe comprar, pagar, recibir y usar el bien.',
    answer:
      'No alcanza con poner la cédula de un familiar. Para usar el cupo de otra persona, esa persona tendría que ser realmente la compradora, titular del medio de pago, destinataria y usuaria del envío. Prestar una identidad o repartir inventario entre cédulas contradice la titularidad y el uso personal exigidos por el Decreto 50/026.',
    category: 'antes-de-comprar',
    sourceIds: ['decreto-50-026'],
    basis: 'norma',
    tags: ['prestar franquicia', 'franquicia ajena', 'cedula familiar', 'transferir cupo'],
  },
  {
    id: 'varios-medios-de-pago',
    question: '¿Puedo registrar varias tarjetas o plataformas de pago?',
    shortAnswer: 'Sí, si todas están a tu nombre y mantenés el registro actualizado.',
    answer:
      'El formulario oficial permite agregar más de un medio de pago y marcarlos como inactivos cuando dejan de usarse. Registra banco o plataforma, sello, últimos cuatro dígitos, tipo y vencimiento de la tarjeta.',
    category: 'antes-de-comprar',
    sourceIds: ['comunicado-dna-11-2026'],
    basis: 'procedimiento',
    tags: ['varias tarjetas', 'banco', 'plataforma', 'registro'],
  },
  {
    id: 'paypal-prepaga-dinero-electronico',
    question: '¿Puedo pagar la franquicia con PayPal, Prex, MiDinero o una tarjeta prepaga?',
    shortAnswer:
      'Depende del instrumento y su emisor; una billetera o gift card no queda admitida solo por ser internacional.',
    answer:
      'El Decreto 50/026 admite tarjeta internacional de crédito o débito y dinero electrónico internacional emitido por una institución regulada por el BCU, siempre a nombre del comprador. El registro permite identificar banco o plataforma, pero eso no convierte automáticamente cualquier saldo de PayPal o tarjeta de tienda en medio habilitado. Verificá con el operador el instrumento exacto antes de pagar y conservá comprobante con titular, comercio y monto.',
    category: 'antes-de-comprar',
    sourceIds: ['decreto-50-026', 'comunicado-dna-11-2026'],
    basis: 'zona-gris',
    tags: ['paypal', 'prex', 'midinero', 'prepaga', 'dinero electronico', 'billetera'],
  },
  {
    id: 'registro-comprador-obligatorio',
    question: '¿El registro de identidad de franquicias ya es obligatorio?',
    shortAnswer:
      'Al 26 de julio de 2026 sigue siendo voluntario hasta que Aduanas comunique lo contrario.',
    answer:
      'La RG DNA 10/2026 creó el registro, pero dispuso una etapa voluntaria. Si te registrás, la información del envío debe ser consistente con tus datos; si no te registraste, hoy esa sola omisión no impide la liberación.',
    category: 'antes-de-comprar',
    sourceIds: ['rg-dna-10-2026', 'comunicado-dna-11-2026'],
    basis: 'norma',
    tags: ['identidad digital', 'registro comprador', 'obligatorio', 'lucia'],
  },
  {
    id: 'datos-tarjeta-aduana',
    question: '¿Qué datos de mi tarjeta guarda Aduanas? ¿Ve mis compras?',
    shortAnswer:
      'Registra datos identificatorios del medio de pago, no el historial transaccional de la tarjeta.',
    answer:
      'El registro pide banco o plataforma, sello, últimos cuatro dígitos, tipo y vencimiento. En su respuesta oficial de julio, la DNA informó que no recibe del emisor historial de compras, montos, fechas, comercios ni otros identificadores transaccionales; para validar remite titular y últimos cuatro dígitos. La DNA es responsable de la base y habilita derechos de acceso, rectificación, actualización y supresión por datospersonales@aduanas.gub.uy.',
    category: 'antes-de-comprar',
    sourceIds: ['comunicado-dna-11-2026', 'mef-datos-franquicia'],
    basis: 'procedimiento',
    tags: ['privacidad', 'secreto bancario', 'datos tarjeta', 'historial compras'],
  },
  {
    id: 'vendedor-registrado',
    question: '¿Cómo sé si el vendedor de Estados Unidos está registrado?',
    shortAnswer:
      'Aduanas ya publica la lista; hay que revisarla en su página oficial antes de comprar.',
    answer:
      'El requisito empieza a exigirse el 1.º de octubre de 2026, salvo nueva prórroga. Al 26 de julio la lista oficial incluye Xipron Inc (Tiendamía), United States Xpress Inc, Grinbox Corp, Netbox Corp, Miami box latinoamérica LLC y Eshop Miami INC. La lista puede cambiar: verificá siempre la página de Aduanas.',
    category: 'antes-de-comprar',
    sourceIds: ['rg-dna-09-2026', 'rg-dna-21-2026', 'dna-franquicia'],
    basis: 'procedimiento',
    tags: ['vendedor registrado', 'tiendamia', 'usx', 'grinbox', 'netbox', 'eshop miami'],
    related: {
      label: 'Ver la explicación del cambio de octubre',
      to: '/franquicia-aduana-uruguay',
    },
  },
  {
    id: 'registrar-vendedor-extranjero',
    question: '¿Puedo registrar yo a un vendedor o una empresa de Estados Unidos?',
    shortAnswer: 'No como comprador: el trámite corresponde a la propia empresa extranjera.',
    answer:
      'La RG DNA 09/2026 regula el registro de empresas residentes fiscales en Estados Unidos que venden mercadería hacia Uruguay. El comprador no puede inscribir a Amazon, eBay ni a un vendedor por su cuenta. Si la empresa quiere participar, debe seguir el procedimiento de la resolución ante Aduanas; como comprador, solo podés verificar la lista pública vigente.',
    category: 'antes-de-comprar',
    sourceIds: ['rg-dna-09-2026', 'dna-franquicia'],
    basis: 'norma',
    tags: ['registrar empresa usa', 'registrar vendedor', 'empresa extranjera', 'amazon', 'ebay'],
  },
  {
    id: 'origen-estados-unidos',
    question: '¿Alcanza con que el paquete pase por Miami para ser “de Estados Unidos”?',
    shortAnswer:
      'No; la procedencia se acredita con la factura del vendedor residente fiscal en EE.UU.',
    answer:
      'Aduanas define como procedente de Estados Unidos al envío embarcado por el vendedor residente fiscal allí, con destino a Uruguay, y exige acreditarlo con la factura. Reenviar por un casillero de Miami una compra hecha a un vendedor de otro país no cambia por sí solo la procedencia fiscal.',
    category: 'antes-de-comprar',
    sourceIds: ['dna-franquicia', 'rg-dna-09-2026'],
    basis: 'procedimiento',
    tags: ['origen usa', 'miami', 'casillero', 'residencia fiscal', 'factura'],
  },
  {
    id: 'cambiar-direccion-destinatario',
    question: '¿Qué pasa si cambio la dirección o el destinatario después de comprar?',
    shortAnswer:
      'Corregí la guía con el vendedor u operador antes de declarar; cambiar destinatario no es un detalle menor.',
    answer:
      'Un cambio de domicilio dentro de la misma titularidad puede gestionarse con el operador si todavía admite corregir la guía. Cambiar comprador o destinatario afecta los requisitos de identidad y medio de pago de la franquicia. Si el envío ya quedó retenido y hay que modificar la guía, no califica para el despacho simplificado de la RG 14/2026; pedí al operador el procedimiento aplicable y dejá constancia escrita.',
    category: 'antes-de-comprar',
    sourceIds: ['decreto-50-026', 'rg-dna-11-2026', 'rg-dna-14-2026'],
    basis: 'procedimiento',
    tags: ['cambiar direccion', 'cambiar destinatario', 'nombre guia', 'domicilio', 'mudanza'],
  },
  {
    id: 'uso-personal-cantidad',
    question: '¿Cuántas unidades iguales puedo traer sin que sea comercial?',
    shortAnswer:
      'No existe un número oficial; se evalúan cantidad, naturaleza, variedad y finalidad.',
    answer:
      'La norma exige uso personal y ausencia de fines comerciales, pero no dice “hasta dos” o “hasta tres” unidades. Varias unidades idénticas, embalaje de reventa o una frecuencia incompatible con consumo propio aumentan el riesgo, pero la decisión es caso a caso.',
    category: 'antes-de-comprar',
    sourceIds: ['decreto-50-026', 'dna-franquicia'],
    basis: 'zona-gris',
    tags: ['cantidad', 'unidades iguales', 'uso personal', 'comercial', 'reventa'],
  },
  {
    id: 'tope-800-tres-envios',
    question: '¿La franquicia es US$ 800 por envío o por año?',
    shortAnswer: 'Es US$ 800 acumulados por año civil, utilizables en hasta tres envíos.',
    answer:
      'No es un máximo de US$ 800 tres veces. Cada envío consume su valor y uno de los tres usos; la suma anual no puede superar US$ 800. El límite de peso sigue siendo 20 kg por envío.',
    category: 'franquicia-impuestos',
    sourceIds: ['decreto-50-026', 'dna-franquicia'],
    basis: 'norma',
    tags: ['800', 'tres envios', 'tope anual', 'cupo'],
    related: { label: 'Calcular el régimen de una compra', to: '/franquicia-aduana-uruguay' },
  },
  {
    id: 'varias-franquicias-mismo-mes',
    question: '¿Puedo usar dos o tres franquicias en el mismo mes?',
    shortAnswer:
      'Sí: el régimen vigente limita el año civil, no establece una espera mensual entre envíos.',
    answer:
      'Podés usar más de una franquicia en un mismo mes si todavía tenés envíos y monto disponibles. El límite es hasta tres envíos y US$ 800 acumulados en el año civil; cada guía debe cumplir por separado identidad, documentación, peso, uso personal y demás requisitos.',
    category: 'franquicia-impuestos',
    sourceIds: ['decreto-50-026', 'dna-franquicia'],
    basis: 'norma',
    tags: ['mismo mes', 'dos franquicias', 'tres compras', 'esperar', 'cupo anual'],
  },
  {
    id: 'pais-de-compra',
    question: '¿Cambia el régimen si compro en China, Japón, Europa, Argentina o Brasil?',
    shortAnswer:
      'Los topes postales son los mismos; lo que cambia principalmente es la exoneración de IVA de EE. UU.',
    answer:
      'La franquicia anual y la prestación única no dependen de comprar en un país determinado. La diferencia relevante es que hoy el acuerdo citado por Aduanas exonera de IVA, dentro de sus condiciones, ciertos envíos procedentes de Estados Unidos de hasta US$ 200. Una compra de China, Japón, Europa o la región puede usar franquicia, pero normalmente mantiene IVA y conserva los permisos u origen que correspondan.',
    category: 'franquicia-impuestos',
    sourceIds: ['decreto-50-026', 'tifa', 'dna-franquicia'],
    basis: 'norma',
    tags: ['china', 'japon', 'europa', 'argentina', 'brasil', 'pais origen', 'comprar afuera'],
  },
  {
    id: 'peso-maximo-20kg',
    question: '¿Qué pasa si el paquete pesa más de 20 kg?',
    shortAnswer: 'No entra en franquicia ni en prestación única; pasa al régimen general.',
    answer:
      'El máximo postal de ambos regímenes es 20 kg por envío. Si la guía supera ese peso, la página operativa de Aduanas indica régimen general mediante DUA y contratación de despachante. Dividir el paquete después de que llegó no es un derecho previsto: resolvelo con el vendedor o el operador antes del embarque.',
    category: 'franquicia-impuestos',
    sourceIds: ['decreto-50-026', 'dna-regimen-general'],
    basis: 'norma',
    tags: ['20 kg', 'peso', 'paquete pesado', 'tiendamia', 'dua'],
  },
  {
    id: 'tope-200',
    question: '¿Los US$ 200 son el tope de la franquicia?',
    shortAnswer: 'No; son el umbral de exoneración de IVA para envíos procedentes de EE.UU.',
    answer:
      'El tope de franquicia es US$ 800 acumulados. Los US$ 200 corresponden al acuerdo con Estados Unidos: dentro de la franquicia, un envío procedente de ese país puede quedar sin IVA hasta ese valor. Superarlo no activa automáticamente el 60%; primero significa que esa compra pierde la exoneración de IVA.',
    category: 'franquicia-impuestos',
    sourceIds: ['decreto-50-026', 'tifa', 'dna-franquicia'],
    basis: 'norma',
    tags: ['200', 'iva', 'estados unidos', 'tifa'],
  },
  {
    id: 'franquicia-paga-iva',
    question: '¿Usar franquicia significa que no pago ningún impuesto?',
    shortAnswer: 'No siempre: exonera aranceles, pero normalmente mantiene el IVA.',
    answer:
      'El régimen 2026 separa aranceles e IVA. La franquicia exonera aranceles; el IVA se mantiene salvo las excepciones oficiales, principalmente envíos de EE.UU. de hasta US$ 200 y obsequios familiares genuinos. La fuente oficial no permite reducir todos los casos a una única base de cálculo, así que el importe final del IVA debe confirmarse con el operador.',
    category: 'franquicia-impuestos',
    sourceIds: ['decreto-50-026', 'ley-20446-628', 'dna-franquicia'],
    basis: 'norma',
    tags: ['franquicia', 'iva', 'impuestos', 'aranceles'],
  },
  {
    id: 'prestacion-unica-60',
    question: '¿Cuándo se paga el 60% y cuál es el mínimo?',
    shortAnswer:
      'En el régimen de prestación única: 60% del valor, con mínimo de US$ 20 por envío.',
    answer:
      'Es el régimen alternativo para envíos que no usan franquicia y que siguen dentro de los límites postales de valor y peso. El pago mínimo es US$ 20, por lo que en compras de poco valor puede ser superior al 60% matemático.',
    category: 'franquicia-impuestos',
    sourceIds: ['ley-20446-627', 'decreto-50-026', 'mef-faq'],
    basis: 'norma',
    tags: ['60', 'prestacion unica', 'minimo 20', 'sin franquicia'],
  },
  {
    id: 'valor-factura',
    question: '¿Qué valor mira Aduanas: producto, factura o resumen de tarjeta?',
    shortAnswer:
      'El total de la factura original, con los conceptos que el vendedor haya agregado.',
    answer:
      'El Decreto 50/026 toma el total de la factura original de compra. El comprobante de pago sirve para respaldarla, pero no reemplaza una factura que describa correctamente mercadería, comprador, vendedor y cargos.',
    category: 'franquicia-impuestos',
    sourceIds: ['decreto-50-026', 'dna-franquicia'],
    basis: 'norma',
    tags: ['valor factura', 'resumen tarjeta', 'comprobante', 'precio'],
  },
  {
    id: 'flete-sales-tax-seguro',
    question: '¿El flete, sales tax o seguro cuentan para el límite?',
    shortAnswer: 'Cuentan cuando aparecen adicionados en la factura original del vendedor.',
    answer:
      'La regla mira el total facturado: precio más los conceptos agregados en esa factura, como sales tax, envío o seguro. Un cargo separado que luego factura el courier integra tu costo total, pero no es parte de la factura original de compra.',
    category: 'franquicia-impuestos',
    sourceIds: ['decreto-50-026', 'correo-faq'],
    basis: 'norma',
    tags: ['flete', 'sales tax', 'seguro', 'envio', 'factura'],
  },
  {
    id: 'cupon-descuento',
    question: '¿Un cupón de descuento baja el valor declarado?',
    shortAnswer: 'Sí, si es genuino y queda reflejado en la factura final.',
    answer:
      'Un descuento real reduce el precio facturado; guardá la factura o comprobante donde figure aplicado. Aduanas puede revisar valores artificialmente bajos, así que una captura del carrito sin factura final no ofrece el mismo respaldo.',
    category: 'franquicia-impuestos',
    sourceIds: ['decreto-50-026'],
    basis: 'norma',
    tags: ['cupon', 'descuento', 'precio lista', 'factura final'],
  },
  {
    id: 'gift-card',
    question: '¿Una gift card reduce el valor? ¿Sirve como medio de pago?',
    shortAnswer:
      'No reduce el precio; y una tarjeta de tienda puede no ser un medio admitido para franquicia.',
    answer:
      'La gift card paga parte del precio, pero la mercadería conserva el valor total de factura. Además, la franquicia enumera tarjeta internacional o dinero electrónico emitido por una institución regulada por el BCU; una gift card de comercio no encaja automáticamente. Confirmalo con el operador antes de comprar.',
    category: 'franquicia-impuestos',
    sourceIds: ['decreto-50-026'],
    basis: 'zona-gris',
    tags: ['gift card', 'tarjeta regalo', 'medio de pago', 'valor'],
  },
  {
    id: 'saldo-franquicia-no-alcanza',
    question: 'Si me quedan US$ 100 y el paquete vale US$ 150, ¿pago 60% solo por US$ 50?',
    shortAnswer:
      'No hay mecanismo publicado para partir un envío entre franquicia y prestación única.',
    answer:
      'La práctica y el diseño del régimen tratan cada envío bajo un solo régimen, pero ninguna disposición localizada dice expresamente cómo aplicar un saldo insuficiente. No atribuimos esta conclusión al art. 15 del Decreto 50/026: ese artículo regula incumplimientos, no el agotamiento normal del cupo.',
    category: 'franquicia-impuestos',
    sourceIds: ['decreto-50-026', 'ley-20446-627'],
    basis: 'zona-gris',
    tags: ['saldo', 'franquicia parcial', 'excedente', 'partir envio'],
  },
  {
    id: 'orden-dividida-paquetes',
    question: 'Si la tienda divide una orden en varios paquetes, ¿cuántas franquicias consume?',
    shortAnswer: 'Cada envío físico o guía puede requerir su propia declaración y consumir un uso.',
    answer:
      'Aduanas y los operadores trabajan por envío y guía, no por el número de orden del carrito. Revisá los trackings antes de elegir franquicia: una sola compra dividida puede transformarse en varias declaraciones.',
    category: 'franquicia-impuestos',
    sourceIds: ['decreto-50-026', 'rg-dna-11-2026', 'correo-faq'],
    basis: 'procedimiento',
    tags: ['orden dividida', 'varios paquetes', 'tracking', 'franquicias'],
  },
  {
    id: 'consolidar-compras',
    question: '¿Consolidar varias compras cuenta como un solo envío?',
    shortAnswer:
      'Puede contar como una guía, pero el valor total y todas las facturas siguen importando.',
    answer:
      'Si el courier emite una única guía y declaración, normalmente se tramita como un envío. El total consolidado debe caber en el régimen y, desde octubre, si hay facturas de varios emisores estadounidenses, la presencia de uno no registrado puede hacer perder la exoneración de IVA a todo el envío.',
    category: 'franquicia-impuestos',
    sourceIds: ['rg-dna-09-2026', 'rg-dna-11-2026'],
    basis: 'procedimiento',
    tags: ['consolidar', 'varias compras', 'una guia', 'facturas'],
  },
  {
    id: 'fecha-cupo-anual',
    question: '¿El cupo cuenta por fecha de compra, llegada o liberación?',
    shortAnswer: 'La referencia operativa es el desaduanamiento dentro del año civil.',
    answer:
      'El contador anual se aplica a los envíos desaduanados en el año civil. Una compra de diciembre liberada en enero puede computar en el año de la liberación; revisá el registro oficial de franquicias usadas antes de asumir el saldo.',
    category: 'franquicia-impuestos',
    sourceIds: ['decreto-50-026', 'dna-franquicia'],
    basis: 'procedimiento',
    tags: ['diciembre', 'enero', 'fecha', 'año civil', 'desaduanamiento'],
  },
  {
    id: 'cupo-no-usado',
    question: '¿El cupo que no uso pasa al año siguiente?',
    shortAnswer: 'No; es una franquicia por año civil y no se acumula.',
    answer:
      'Cada año tiene su propio límite de US$ 800 y tres envíos. La norma no prevé trasladar saldo ni envíos no usados al año siguiente.',
    category: 'franquicia-impuestos',
    sourceIds: ['decreto-50-026'],
    basis: 'norma',
    tags: ['cupo', 'saldo', 'año siguiente', 'acumular'],
  },
  {
    id: 'regalo-consume-cupo',
    question: '¿Un regalo familiar consume franquicia?',
    shortAnswer:
      'Sí: aunque pueda quedar exento de tributos, consume monto y uno de los tres envíos.',
    answer:
      'Debe ser un obsequio genuino entre personas físicas, en cantidades razonables y para uso personal. No requiere medio de pago, pero sí declaración de valor; declararle “regalo” a una compra comercial no la convierte en obsequio.',
    category: 'franquicia-impuestos',
    sourceIds: ['ley-20446-628', 'decreto-50-026', 'rg-dna-10-2026'],
    basis: 'norma',
    tags: ['regalo', 'obsequio familiar', 'cupo', 'declaracion valor'],
  },
  {
    id: 'libros-medicamentos-cupo',
    question: '¿Libros y medicamentos consumen los US$ 800?',
    shortAnswer:
      'No consumen el tope monetario; los medicamentos de uso personal requieren autorización del MSP.',
    answer:
      'El Decreto 50/026 exceptúa del tope de US$ 800 a libros y medicamentos de uso personal. Esa excepción no elimina controles sanitarios: el medicamento necesita la autorización correspondiente del MSP.',
    category: 'franquicia-impuestos',
    sourceIds: ['decreto-50-026', 'dna-productos'],
    basis: 'norma',
    tags: ['libros', 'medicamentos', 'cupo', 'msp'],
  },
  {
    id: 'mas-de-tres-envios',
    question: '¿Puedo seguir comprando después de usar las tres franquicias?',
    shortAnswer:
      'Sí, pero el siguiente envío no usa franquicia; puede ir por prestación única si cumple los límites.',
    answer:
      'Agotar la franquicia no prohíbe comprar. Para un envío de hasta US$ 800, 20 kg y sin mercadería excluida, la alternativa es la prestación única del 60% con mínimo de US$ 20.',
    category: 'franquicia-impuestos',
    sourceIds: ['ley-20446-627', 'decreto-50-026'],
    basis: 'norma',
    tags: ['cuarta compra', 'tres franquicias', 'seguir comprando', '60'],
  },
  {
    id: 'correo-vs-courier-regimen',
    question: '¿Correo común, EMS y courier tienen topes de franquicia distintos?',
    shortAnswer:
      'No desde el 1.º de mayo de 2026; el régimen abarca operadores públicos y privados.',
    answer:
      'Los viejos topes de US$ 50 para no exprés y US$ 200 para exprés fueron derogados. Hoy comparten el cupo anual de US$ 800 y tres envíos. Algunas páginas operativas todavía muestran el régimen anterior: ante una contradicción, prevalece el Decreto 50/026.',
    category: 'correo-courier-plataformas',
    sourceIds: ['decreto-50-026', 'mef-faq', 'correo-declarar'],
    basis: 'norma',
    tags: ['correo comun', 'ems', 'courier', '50', '200', 'topes viejos'],
  },
  {
    id: 'declarar-correo-uruguayo',
    question: '¿Cómo declaro un paquete que llega por Correo Uruguayo?',
    shortAnswer:
      'Registralo en Ahíva con tracking, factura o valor, datos del envío y régimen elegido.',
    answer:
      'La ruta operativa es la plataforma Ahíva del Correo. Conviene declarar antes del arribo y guardar la confirmación; si llega sin declarar puede quedar retenido y generar cargos administrativos.',
    category: 'correo-courier-plataformas',
    sourceIds: ['correo-declarar', 'rg-dna-11-2026'],
    basis: 'procedimiento',
    tags: ['correo uruguayo', 'ahiva', 'declarar', 'tracking'],
    related: {
      label: 'Ver el paso a paso de declaración',
      to: '/declarar-compra-exterior-uruguay',
    },
  },
  {
    id: 'tracking-no-reconocido',
    question: '¿Qué hago si Ahíva o el Correo no reconoce el tracking?',
    shortAnswer:
      'Confirmá primero el operador final y el código internacional; no todos los envíos se declaran en Correo.',
    answer:
      'Pedile al vendedor el tracking postal internacional y verificá quién hará la entrega en Uruguay. Si la guía pertenece a un courier privado, se declara en ese operador y no en Ahíva. Si corresponde al Correo y el código aún no aparece, guardá factura y capturas y consultá al Correo antes de inventar o alterar el número; no hay una regla verificada que obligue a que todo tracking internacional se actualice cada 24 horas.',
    category: 'correo-courier-plataformas',
    sourceIds: ['correo-declarar', 'correo-faq', 'ursec-185-016'],
    basis: 'procedimiento',
    tags: ['tracking invalido', 'ahiva no reconoce', 'correo', 'codigo seguimiento', 'ups'],
  },
  {
    id: 'declarar-courier',
    question: '¿Cómo declaro si uso un courier privado?',
    shortAnswer:
      'Cargás la información en el portal del courier; el operador transmite la declaración a Aduanas.',
    answer:
      'El operador postal presenta la información y paga los tributos como responsable por obligaciones de terceros. Vos seguís siendo responsable de aportar datos, factura, pago y permisos correctos.',
    category: 'correo-courier-plataformas',
    sourceIds: ['decreto-50-026', 'rg-dna-11-2026'],
    basis: 'procedimiento',
    tags: ['courier', 'declaracion', 'operador postal', 'portal'],
    related: { label: 'Comparar couriers', to: '/couriers-uruguay' },
  },
  {
    id: 'quien-declara',
    question: '¿Quién hace legalmente la declaración: yo o el operador?',
    shortAnswer:
      'El operador postal transmite y paga; el destinatario debe suministrar información veraz.',
    answer:
      'En el nuevo procedimiento el operador cumple la presentación ante la DNA y responde por obligaciones tributarias de terceros. Eso no libera al comprador de justificar valor, identidad, medio de pago, origen y naturaleza de la mercadería.',
    category: 'correo-courier-plataformas',
    sourceIds: ['decreto-50-026', 'rg-dna-11-2026'],
    basis: 'norma',
    tags: ['quien declara', 'operador', 'responsable', 'aduana'],
  },
  {
    id: 'cargos-courier-vs-tributos',
    question: '¿Los cargos de DHL, Correo o el courier son impuestos de Aduanas?',
    shortAnswer:
      'No necesariamente: pedí un desglose que separe tributos oficiales de servicios del operador.',
    answer:
      'El IVA o la prestación única son tributos liquidados para Aduanas. Desconsolidación, documentación, almacenaje, manejo, PARS o entrega pueden ser precios del operador. La sola mención de “aduana” no los convierte en impuestos. Exigí concepto, base, tarifa y comprobante por escrito; no localizamos una tarifa máxima general para esos servicios privados.',
    category: 'correo-courier-plataformas',
    sourceIds: ['decreto-50-026', 'ley-17250', 'dna-retenidos'],
    basis: 'zona-gris',
    tags: ['dhl', 'pars', 'cargo 40 dolares', 'correo cinco dolares', 'tarifa courier', 'impuesto'],
    related: {
      label: 'Ver cómo reclamar un cobro del operador',
      to: '/problemas-con-la-aduana-uruguay#problema-cobro-abusivo',
    },
  },
  {
    id: 'amazon-global',
    question: '¿Amazon Global evita la Aduana o la franquicia?',
    shortAnswer:
      'No; gestiona el despacho y puede cobrar un depósito, pero el envío sigue bajo control aduanero.',
    answer:
      'Cuando el checkout muestra Import Fees Deposit o Import Charges, Amazon designa un transportista y recauda una estimación. Confirmá qué incluye: la gestión no crea otra franquicia, no elimina los límites y no garantiza que Aduanas no pida documentos.',
    category: 'correo-courier-plataformas',
    sourceIds: ['amazon-global', 'decreto-50-026'],
    basis: 'procedimiento',
    tags: ['amazon global', 'import fees deposit', 'amazon', 'deposito'],
    related: {
      label: 'Ver cómo declarar compras gestionadas',
      to: '/declarar-compra-exterior-uruguay',
    },
  },
  {
    id: 'temu',
    question: '¿Temu paga todos los impuestos y hace el trámite por mí?',
    shortAnswer: 'Puede designar un agente y cobrar cargos, pero vos seguís siendo el importador.',
    answer:
      'Los términos para Uruguay permiten que Temu nombre un agente de carga. Revisá en el checkout qué conceptos cobra, usá datos consistentes y controlá si la orden se divide en varios envíos; la plataforma no elimina franquicia, permisos ni control de Aduanas.',
    category: 'correo-courier-plataformas',
    sourceIds: ['temu-uy', 'decreto-50-026'],
    basis: 'procedimiento',
    tags: ['temu', 'agente carga', 'impuestos incluidos', 'importador'],
  },
  {
    id: 'aliexpress-envio-gratis',
    question: '¿Qué pasa con el “envío gratis” de AliExpress?',
    shortAnswer: 'Suele llegar por correo no exprés y debe declararse igual.',
    answer:
      'El envío estándar normalmente termina en Correo Uruguayo. Guardá factura y tracking, registralo en Ahíva y no uses los topes viejos de US$ 50/US$ 200 que aún aparecen en algunas páginas: desde mayo rige el cupo anual unificado.',
    category: 'correo-courier-plataformas',
    sourceIds: ['correo-declarar', 'decreto-50-026', 'mef-faq'],
    basis: 'procedimiento',
    tags: ['aliexpress', 'envio gratis', 'correo no expres', 'china'],
    related: {
      label: 'Ver la guía de AliExpress',
      to: '/guias/importar-de-aliexpress-a-uruguay',
    },
  },
  {
    id: 'tiendamia',
    question: '¿Tiendamia tiene una franquicia distinta?',
    shortAnswer: 'No; es un operador/plataforma y usa el mismo régimen del destinatario.',
    answer:
      'Tiendamia puede integrar compra, flete, gestión y tributos, pero no crea un cupo adicional. Xipron Inc (Tiendamía) figura actualmente en el registro de vendedores; desde octubre igual conviene verificar la lista oficial vigente.',
    category: 'correo-courier-plataformas',
    sourceIds: ['dna-franquicia', 'rg-dna-09-2026'],
    basis: 'procedimiento',
    tags: ['tiendamia', 'xipron', 'franquicia', 'impuestos incluidos'],
  },
  {
    id: 'regalo-desde-familia',
    question: '¿Cómo se declara un regalo enviado por un familiar?',
    shortAnswer: 'Como obsequio familiar, con declaración de valor y sin inventar una compra.',
    answer:
      'Debe ser persona física a persona física, no comercial, en cantidades razonables y para uso personal. No se exige medio de pago cuando recibís únicamente obsequios, pero el envío consume cupo y cualquier producto controlado conserva sus permisos.',
    category: 'correo-courier-plataformas',
    sourceIds: ['ley-20446-628', 'decreto-50-026', 'comunicado-dna-11-2026'],
    basis: 'norma',
    tags: ['regalo familiar', 'obsequio', 'declaracion valor', 'sin factura'],
  },
  {
    id: 'objetos-propios-sin-factura',
    question: '¿Cómo recibo objetos personales usados si no hubo una compra ni tengo factura?',
    shortAnswer:
      'Declarás un valor respaldable; que el objeto ya sea tuyo no elimina automáticamente el régimen postal.',
    answer:
      'El Decreto 50/026 permite usar una declaración de valor cuando la naturaleza del bien o la forma de adquisición no generan factura. Aportá una descripción, prueba de propiedad o uso y un valor razonable. El envío igual puede consumir franquicia y quedar sujeto a control; si forma parte de una mudanza, equipaje no acompañado, reparación o retorno, verificá antes si corresponde ese régimen especial en vez del postal.',
    category: 'correo-courier-plataformas',
    sourceIds: ['decreto-50-026', 'carou-133', 'mudanza-retorno'],
    basis: 'procedimiento',
    tags: ['objetos personales', 'sin factura', 'cosas usadas', 'declaracion valor', 'enviarme'],
  },
  {
    id: 'producto-usado',
    question: '¿Un producto usado, reacondicionado o comprado en eBay tiene otra franquicia?',
    shortAnswer: 'No: se aplican los mismos topes, documentación, titularidad y controles.',
    answer:
      'Que el artículo sea usado o refurbished no crea una exoneración distinta. Declarás el valor real que surge de la factura o comprobante original y guardás el pago; el producto sigue sujeto a permisos, peso, uso personal y demás requisitos. Si no existe una factura comercial clara, consultá al operador antes de enviarlo.',
    category: 'productos-permisos',
    sourceIds: ['decreto-50-026', 'dna-franquicia'],
    basis: 'norma',
    tags: ['usado', 'refurbished', 'reacondicionado', 'ebay', 'celular usado'],
  },
  {
    id: 'productos-comunes',
    question: '¿Puedo traer vinilos, Blu-ray, figuras, ropa, repuestos o electrónica?',
    shortAnswer:
      'En principio sí si el producto exacto no está prohibido o controlado y cumple el régimen.',
    answer:
      'No existe una autorización genérica por nombre comercial. Para mercadería común revisá valor, peso, uso personal y documentación; después verificá materiales y funciones concretas. Un equipo con radiofrecuencia, un repuesto de arma, un cosmético o un artículo con batería puede activar permisos o restricciones que un vinilo, una prenda o una figura ordinaria no tienen. La lista oficial es orientativa y no taxativa.',
    category: 'productos-permisos',
    sourceIds: ['decreto-50-026', 'dna-productos'],
    basis: 'procedimiento',
    tags: ['vinilo', 'blu ray', 'figura', 'ropa', 'repuesto', 'electronica', 'coleccionable'],
  },
  {
    id: 'vehiculos',
    question: '¿Puedo importar un auto, moto o vehículo eléctrico por franquicia?',
    shortAnswer: 'No: los vehículos no entran en franquicia ni en prestación única.',
    answer:
      'Los vehículos están gravados por IMESI y quedan fuera de los dos regímenes postales simplificados. Una eventual importación debe analizarse por régimen general, incluyendo si ese vehículo concreto puede ingresar, tributos, certificados y despachante. No compres ni embarques un auto o una moto basándote en la calculadora postal.',
    category: 'productos-permisos',
    sourceIds: ['ley-20446-633', 'dna-prohibidos', 'dna-regimen-general'],
    basis: 'norma',
    tags: ['auto', 'moto', 'tesla', 'vehiculo electrico', 'imesi'],
  },
  {
    id: 'celular-router-drone',
    question: '¿Puedo traer celular, router, GPS, walkie-talkie o dron?',
    shortAnswer: 'Son equipos controlados por URSEC y puede corresponder certificado por VUCE.',
    answer:
      'Aduanas enumera teléfonos celulares, repetidores Wi‑Fi, GPS, equipos con control remoto, tablets con conexión celular y transmisores entre los productos controlados por URSEC. Verificá el modelo y obtené el certificado antes de pedir agenda si quedó retenido.',
    category: 'productos-permisos',
    sourceIds: ['dna-productos', 'ley-20446-633'],
    basis: 'procedimiento',
    tags: ['celular', 'router', 'gps', 'walkie talkie', 'drone', 'ursec', 'vuce'],
  },
  {
    id: 'medicamentos-suplementos',
    question: '¿Puedo importar medicamentos, vitaminas o suplementos?',
    shortAnswer:
      'Son mercaderías controladas por el MSP y requieren verificar autorización antes de comprar.',
    answer:
      'Aduanas incluye medicamentos, suplementos y vitaminas entre los productos sujetos a intervención del MSP. Que sean para uso personal o un regalo no elimina ese control; sin el certificado correspondiente el envío puede quedar retenido.',
    category: 'productos-permisos',
    sourceIds: ['dna-productos', 'decreto-50-026'],
    basis: 'procedimiento',
    tags: ['medicamentos', 'vitaminas', 'suplementos', 'msp'],
  },
  {
    id: 'cosmeticos-perfume',
    question: '¿Puedo traer cosméticos o perfume por courier?',
    shortAnswer:
      'Los cosméticos están controlados por MSP y la perfumería puede estar gravada por IMESI.',
    answer:
      'Aduanas remite cosméticos, higiene, cuidado personal y belleza al MSP. Su página de mercadería excluida también lista perfumería y artículos de tocador entre los gravados por IMESI, que quedan fuera del régimen postal simplificado. Consultá el producto exacto, no la categoría comercial genérica.',
    category: 'productos-permisos',
    sourceIds: ['dna-productos', 'dna-prohibidos', 'ley-20446-633'],
    basis: 'procedimiento',
    tags: ['cosmeticos', 'perfume', 'belleza', 'msp', 'imesi'],
  },
  {
    id: 'lentes-afeitadoras-higiene',
    question: '¿Puedo traer lentes, armazones, afeitadoras o artículos de higiene?',
    shortAnswer:
      'Hay controles sanitarios y algunos artículos de cosmetología o tocador pueden estar gravados por IMESI.',
    answer:
      'Aduanas incluye productos oftalmológicos, de higiene, cuidado personal y belleza entre los controlados por el MSP. Además, su listado de IMESI menciona cosméticos, perfumería, máquinas de afeitar y artículos de tocador para cosmetología. La clasificación depende del producto exacto: verificá modelo, composición y certificado con MSP/VUCE antes de comprar.',
    category: 'productos-permisos',
    sourceIds: ['dna-productos', 'dna-prohibidos', 'ley-20446-633'],
    basis: 'procedimiento',
    tags: ['lentes', 'armazones', 'afeitadora', 'cepillo electrico', 'higiene', 'oftalmologico'],
  },
  {
    id: 'neumaticos-repuestos-silla-infantil',
    question: '¿Puedo traer neumáticos, repuestos de auto o moto, o una silla infantil?',
    shortAnswer:
      'Son categorías con controles específicos; los repuestos de moto usados figuran como prohibidos.',
    answer:
      'Aduanas remite neumáticos y sistemas de retención infantil al MIEM. Su listado de mercadería excluida identifica además los repuestos de moto usados como prohibidos y los vehículos como gravados por IMESI. Un repuesto nuevo distinto no queda autorizado por descarte: verificá NCM, estado, certificación y régimen con el organismo o un despachante antes de embarcar.',
    category: 'productos-permisos',
    sourceIds: ['dna-productos', 'dna-prohibidos', 'dna-regimen-general'],
    basis: 'procedimiento',
    tags: [
      'neumaticos',
      'repuesto auto',
      'repuesto moto',
      'silla bebe',
      'retencion infantil',
      'miem',
    ],
  },
  {
    id: 'reparacion-garantia-sustitucion',
    question:
      '¿Un producto que vuelve de reparación o llega por garantía paga como una compra nueva?',
    shortAnswer:
      'No necesariamente, pero la exoneración no es automática: hay regímenes formales de retorno y sustitución.',
    answer:
      'El Código Aduanero permite autorizar la sustitución gratuita de una mercadería defectuosa por otra equivalente, y el Decreto 98/015 regula retorno, reparación y sustitución. Hay que acreditar la exportación o importación anterior, la garantía y la equivalencia, y tramitar el régimen que corresponda. No aceptes que el vendedor simplemente declare “US$ 0”: consultá a Aduanas o a un despachante antes de enviar el bien al exterior o recibir el reemplazo.',
    category: 'productos-permisos',
    sourceIds: ['carou-159', 'decreto-98-015', 'decreto-50-026'],
    basis: 'procedimiento',
    tags: ['reparacion', 'garantia', 'reemplazo', 'rma', 'producto fallado', 'valor cero'],
  },
  {
    id: 'alimentos-semillas-plantas',
    question: '¿Puedo traer alimentos, semillas, plantas o fertilizantes?',
    shortAnswer:
      'Requieren control del MGAP y, según el producto, también puede intervenir el MSP.',
    answer:
      'Aduanas indica obtener antes el certificado del organismo competente. El listado es no taxativo: verificá especie, origen, presentación y cantidad directamente con MGAP; no asumas que una semilla pequeña o un alimento envasado queda libre.',
    category: 'productos-permisos',
    sourceIds: ['dna-productos', 'ley-20446-633'],
    basis: 'procedimiento',
    tags: ['alimentos', 'semillas', 'plantas', 'fertilizantes', 'mgap'],
  },
  {
    id: 'baterias-power-bank',
    question: '¿Están prohibidas las baterías sueltas y power banks?',
    shortAnswer:
      'La restricción principal es de transporte aéreo; cada aerolínea y operador decide si los acepta.',
    answer:
      'Aduanas explica que las reglas IATA/ICAO restringen baterías de litio sueltas en aviones de pasajeros. Eso no equivale a una prohibición aduanera universal: confirmá con el vendedor y el operador antes de enviar.',
    category: 'productos-permisos',
    sourceIds: ['dna-productos'],
    basis: 'procedimiento',
    tags: ['baterias', 'litio', 'power bank', 'iata', 'avion'],
  },
  {
    id: 'armas-replicas-cuchillos',
    question: '¿Puedo traer armas, réplicas, miras o cuchillos?',
    shortAnswer:
      'Armas, municiones, miras y partes están controladas; para cuchillos no hay una regla única publicada.',
    answer:
      'Aduanas remite armas de fuego, municiones, miras, armas de aire comprimido, cargadores, partes y repuestos al Servicio de Material y Armamento. Su lista es orientativa, no taxativa. Para una espada, cuchillo o réplica concreta consultá por escrito al organismo y al operador antes de comprar.',
    category: 'productos-permisos',
    sourceIds: ['dna-productos'],
    basis: 'zona-gris',
    tags: ['armas', 'replicas', 'miras', 'cuchillos', 'espadas', 'airsoft'],
  },
  {
    id: 'juguetes-sexuales',
    question: '¿Los juguetes sexuales están prohibidos?',
    shortAnswer:
      'No localizamos una prohibición específica, pero la lista oficial no es exhaustiva.',
    answer:
      'La página vigente de productos controlados no los menciona. Eso no permite prometer que cualquier producto ingresará: Aduanas advierte que sus ejemplos no son taxativos y puede intervenir el MSP según material o finalidad. Pedí confirmación para el artículo exacto.',
    category: 'productos-permisos',
    sourceIds: ['dna-productos'],
    basis: 'zona-gris',
    tags: ['juguetes sexuales', 'sex toy', 'prohibido', 'msp'],
  },
  {
    id: 'laptop-gpu-consola',
    question: '¿Puedo traer una laptop, GPU, consola o componentes de PC?',
    shortAnswer:
      'No están excluidos por ser electrónica; importan valor, cantidad, radiofrecuencia y batería.',
    answer:
      'Una unidad para uso personal puede entrar por el régimen postal si cumple valor, peso y demás condiciones. Si el equipo transmite radiofrecuencia puede requerir URSEC; si contiene batería, el operador aplica sus reglas de transporte; varias unidades iguales pueden parecer comerciales.',
    category: 'productos-permisos',
    sourceIds: ['decreto-50-026', 'dna-productos'],
    basis: 'procedimiento',
    tags: ['laptop', 'gpu', 'consola', 'pc', 'electronica'],
  },
  {
    id: 'alcohol-tabaco-vape',
    question: '¿Puedo traer alcohol, tabaco o un vapeador?',
    shortAnswer:
      'Alcohol y tabaco están gravados por IMESI; los vapeadores figuran como prohibidos.',
    answer:
      'La mercadería gravada por IMESI queda fuera del régimen postal. La página oficial lista bebidas alcohólicas y tabacos entre esos productos, y vaporizadores o cigarrillos electrónicos entre la mercadería prohibida. No los compres pensando en franquicia o 60%.',
    category: 'productos-permisos',
    sourceIds: ['ley-20446-633', 'dna-prohibidos'],
    basis: 'procedimiento',
    tags: ['alcohol', 'tabaco', 'vape', 'vaporizador', 'imesi'],
  },
  {
    id: 'lista-productos-es-cerrada',
    question: 'Si un producto no aparece en la lista de Aduanas, ¿seguro que puede entrar?',
    shortAnswer: 'No; Aduanas dice expresamente que su lista es orientativa y no taxativa.',
    answer:
      'La ausencia de un producto no equivale a autorización. Verificá si intervienen MSP, MGAP, URSEC, Defensa, MIEM u otro organismo y pedí respuesta para el modelo o composición exactos.',
    category: 'productos-permisos',
    sourceIds: ['dna-productos'],
    basis: 'procedimiento',
    tags: ['lista', 'prohibido', 'permitido', 'no taxativa'],
  },
  {
    id: 'retencion-aleatoria',
    question: '¿Por qué retuvieron mi paquete si otros iguales pasaron?',
    shortAnswer:
      'Cualquier envío puede ser seleccionado para control; los criterios no son públicos.',
    answer:
      'El Código Aduanero somete todos los envíos postales a control y Aduanas informa que la retención puede ser selectiva o aleatoria. No existe una regla oficial del tipo “después de la tercera compra” o “por encima de tal monto te revisan”.',
    category: 'retenidos-reclamos',
    sourceIds: ['carou-141', 'dna-retenidos'],
    basis: 'norma',
    tags: ['retenido', 'aleatorio', 'control', 'por que a mi'],
    related: {
      label: 'Ver el plan completo para paquetes retenidos',
      to: '/problemas-con-la-aduana-uruguay#problema-retenido',
    },
  },
  {
    id: 'documentos-retenido',
    question: '¿Qué documentos llevo para liberar un paquete retenido?',
    shortAnswer: 'Identidad, guía, factura/orden, pago, medio usado y permisos que correspondan.',
    answer:
      'La vía presencial publicada pide cédula vigente, guía, factura y orden con valor y partes, comprobante de pago, instrumento usado, declaración de valor cuando corresponda y certificados de otros organismos. Si va un apoderado, lleva autorización y copia del documento del titular.',
    category: 'retenidos-reclamos',
    sourceIds: ['dna-retenidos', 'rg-dna-14-2026'],
    basis: 'procedimiento',
    tags: ['documentos', 'factura', 'tarjeta', 'guia', 'retenido'],
  },
  {
    id: 'estado-cuenta-tarjeta-retenido',
    question: '¿Aduanas puede pedirme la tarjeta o el estado de cuenta para liberar un envío?',
    shortAnswer:
      'Puede exigir respaldo del pago y del valor; llevá solo lo necesario para ese envío.',
    answer:
      'La guía oficial para retenidos pide comprobante de pago impreso y el instrumento utilizado, además de factura y orden. El Decreto 50/026 habilita a Aduanas a exigir la información y documentación necesaria. Eso no significa que el registro de franquicias reciba tu historial bancario: si te solicitan un estado de cuenta, pedí el motivo y ocultá movimientos ajenos cuando el trámite lo permita, dejando visibles titular, comercio, fecha y monto de esa compra.',
    category: 'retenidos-reclamos',
    sourceIds: ['decreto-50-026', 'dna-retenidos', 'mef-datos-franquicia'],
    basis: 'zona-gris',
    tags: ['estado de cuenta', 'resumen tarjeta', 'plastico', 'comprobante pago', 'privacidad'],
  },
  {
    id: 'despacho-simplificado-retenido',
    question: '¿Puedo liberar online un paquete retenido por courier?',
    shortAnswer:
      'No hay un formulario directo universal; el courier puede usar una vía simplificada en casos limitados.',
    answer:
      'Desde el 29 de mayo está operativo el despacho simplificado para operadores postales privados. Lo solicita el operador y solo procede si el control no exige modificar la guía, reliquidar ni investigar una posible sanción. Preguntale al courier si tu guía califica; si no, corresponde declaración previa o despacho presencial.',
    category: 'retenidos-reclamos',
    sourceIds: ['rg-dna-14-2026', 'comunicado-dna-21-2026'],
    basis: 'procedimiento',
    tags: ['liberar online', 'despacho simplificado', 'courier', 'retenido'],
  },
  {
    id: 'agenda-retenido',
    question: '¿Siempre tengo que ir personalmente a Aduanas?',
    shortAnswer:
      'No siempre: depende del operador y de cuál de las vías de la RG 14/2026 corresponda.',
    answer:
      'La resolución prevé despacho presencial, declaración previa y despacho simplificado del operador privado. Si se requiere presencia, agendá por el canal indicado para Correo o courier; no vayas sin confirmar administración, depósito, fecha y documentación.',
    category: 'retenidos-reclamos',
    sourceIds: ['rg-dna-14-2026', 'dna-retenidos'],
    basis: 'procedimiento',
    tags: ['agenda', 'presencial', 'correo', 'terminal cargas'],
  },
  {
    id: 'tarjeta-no-registrada',
    question: '¿Qué pasa si compré con una tarjeta que no registré?',
    shortAnswer:
      'Si ya estás registrado y el envío no coincide con tus datos, Aduanas puede no liberarlo.',
    answer:
      'La RG DNA 10/2026 exige consistencia para quienes optaron por registrarse. Actualizá o agregá tus medios de pago antes de comprar; el formulario permite varios y permite inactivar los anteriores.',
    category: 'retenidos-reclamos',
    sourceIds: ['rg-dna-10-2026', 'comunicado-dna-11-2026'],
    basis: 'norma',
    tags: ['tarjeta no registrada', 'inconsistencia', 'registro', 'retencion'],
  },
  {
    id: 'valor-procedencia-inexactos',
    question: '¿Qué sanción hay por declarar un valor u origen falso?',
    shortAnswer:
      'Puede aplicarse una multa del doble de los tributos omitidos y una prohibición por reiteración.',
    answer:
      'La Ley 20.446 prevé multa equivalente al doble de los tributos que debieron pagarse. Si se reitera dentro de doce meses, puede impedirse el uso del régimen durante los doce meses siguientes; antes del acto sancionatorio hay una vista de diez días hábiles.',
    category: 'retenidos-reclamos',
    sourceIds: ['ley-20446-632'],
    basis: 'norma',
    tags: ['subfacturar', 'valor falso', 'origen falso', 'multa', 'sancion'],
  },
  {
    id: 'discutir-valoracion',
    question: '¿Cómo discuto una valoración de Aduanas con la que no estoy de acuerdo?',
    shortAnswer:
      'Pedí el acto y fundamento por escrito; no hallamos un recurso simplificado general publicado.',
    answer:
      'La vista de diez días de la Ley 20.446 aplica cuando se abre el procedimiento sancionatorio por declaración inexacta, no a toda diferencia de valoración. Fuera de ese caso, pedí número de expediente, liquidación y fundamento y obtené asesoramiento; no dejamos un plazo inventado.',
    category: 'retenidos-reclamos',
    sourceIds: ['ley-20446-632', 'dna-retenidos'],
    basis: 'zona-gris',
    tags: ['valoracion', 'impugnar', 'recurso', 'vista', 'expediente'],
  },
  {
    id: 'plazos-abandono',
    question: '¿Cuánto tiempo tengo antes de que el paquete caiga en abandono?',
    shortAnswer:
      'Hay supuestos de 30 o 90 días desde el ingreso al país; no esperes a que venza el plazo.',
    answer:
      'La Ley 20.446 habilita abandono a los 30 días si hubo incumplimiento y no se pagaron tributos, o a los 90 días si la mercadería no fue retirada. Además, un talón generado por declaración previa vence a los 30 días.',
    category: 'retenidos-reclamos',
    sourceIds: ['ley-20446-631', 'rg-dna-14-2026'],
    basis: 'norma',
    tags: ['abandono', '30 dias', '90 dias', 'plazo', 'remate'],
  },
  {
    id: 'ya-en-abandono-remate',
    question: '¿Qué hago si Aduanas ya declaró el paquete en abandono o remate?',
    shortAnswer:
      'Pedí el acto y el expediente de inmediato; no asumas que todavía puede retirarse.',
    answer:
      'Una vez declarado el abandono, la situación ya no es la misma que una simple retención. Pedí por escrito la resolución, fecha, causal, expediente y estado de la mercadería. Si entendés que se computó mal el plazo o que ya habías cumplido, buscá asesoramiento aduanero con esos documentos; no publicamos una promesa de recuperación porque la norma no crea una reversión automática para todos los casos.',
    category: 'retenidos-reclamos',
    sourceIds: ['ley-20446-631'],
    basis: 'zona-gris',
    tags: ['abandono', 'remate', 'subasta', 'recuperar paquete', 'expediente'],
    related: {
      label: 'Ver el diagnóstico y generar un escrito',
      to: '/problemas-con-la-aduana-uruguay#problema-decomiso-subasta',
    },
  },
  {
    id: 'devolver-origen',
    question: '¿Puedo devolver a origen un producto restringido que no puedo liberar?',
    shortAnswer: 'Sí en el supuesto legal, a tu costo, antes del despacho y dentro de 30 días.',
    answer:
      'El Decreto 50/026 permite devolver mercadería gravada por IMESI o restringida sin autorización, siempre que todavía no se haya producido el despacho y no exista otro incumplimiento. El plazo es de 30 días y el costo es del interesado.',
    category: 'retenidos-reclamos',
    sourceIds: ['decreto-50-026', 'ley-20446-633'],
    basis: 'norma',
    tags: ['devolver origen', 'retorno', 'restringido', '30 dias'],
  },
  {
    id: 'almacenaje-courier',
    question: '¿Hay un máximo legal para almacenaje o “gestión” del courier?',
    shortAnswer:
      'No localizamos una tarifa máxima; son cargos contractuales que deben informarse claramente.',
    answer:
      'Pedí un desglose que separe tributos de Aduanas y precio del operador, y comparalo con la oferta o cotización original. Si aparece un cargo no informado o contradictorio, reclamá por escrito al courier y luego ante Defensa del Consumidor.',
    category: 'retenidos-reclamos',
    sourceIds: ['ley-17250', 'dna-retenidos'],
    basis: 'zona-gris',
    tags: ['almacenaje', 'gestion', 'courier', 'cargo', 'tarifa maxima'],
    related: {
      label: 'Usar el generador de reclamo',
      to: '/problemas-con-la-aduana-uruguay#problema-cobro-abusivo',
    },
  },
  {
    id: 'demora-tracking',
    question: 'Mi paquete no se mueve: ¿el tracking debe actualizarse cada 24 horas?',
    shortAnswer: 'No verificamos una regla de 24 horas para envíos internacionales.',
    answer:
      'Esa obligación aparece para encomiendas nacionales, no para el caso internacional. Reclamá formalmente al operador y exigí número de referencia; para reclamos internacionales el reglamento prevé respuesta preliminar en 15 días y resolución final en 90.',
    category: 'retenidos-reclamos',
    sourceIds: ['ursec-185-016', 'ley-19009'],
    basis: 'zona-gris',
    tags: ['demora', 'tracking', '24 horas', 'reclamo', 'courier'],
  },
  {
    id: 'paquete-roto-faltante',
    question: '¿Qué hago si el paquete llegó abierto, roto o incompleto?',
    shortAnswer: 'Dejá constancia al recibir y reclamá al operador dentro de 48 horas corridas.',
    answer:
      'No firmes conforme sin anotar el daño, fotografiá embalaje, peso, precinto y contenido, y exigí número de reclamo. El plazo del destinatario es de 48 horas desde la entrega; después puede operar una causal de exclusión.',
    category: 'retenidos-reclamos',
    sourceIds: ['ursec-185-016'],
    basis: 'norma',
    tags: ['roto', 'abierto', 'faltante', '48 horas', 'reclamo'],
    related: {
      label: 'Ver pasos e indemnización',
      to: '/problemas-con-la-aduana-uruguay#problema-roto-o-incompleto',
    },
  },
  {
    id: 'paquete-perdido-indemnizacion',
    question: 'Si el paquete se perdió, ¿quién cobra la indemnización postal?',
    shortAnswer:
      'Antes de la entrega el titular es el remitente; puede ceder sus derechos al destinatario.',
    answer:
      'En una compra online, normalmente el vendedor es el impositor y propietario postal hasta la entrega. Vos podés reclamar como destinatario, pero para cobrar la indemnización tasada puede hacer falta que el vendedor reclame o ceda sus derechos; la garantía del marketplace suele ser la vía práctica paralela.',
    category: 'retenidos-reclamos',
    sourceIds: ['ursec-185-016', 'ley-19009'],
    basis: 'norma',
    tags: ['perdido', 'indemnizacion', 'remitente', 'vendedor', 'cesion'],
  },
  {
    id: 'franquicia-viajero',
    question: '¿Cuánto puedo traer en la valija sin pagar?',
    shortAnswer: 'US$ 500 por vía aérea o marítima y US$ 300 por frontera terrestre.',
    answer:
      'Es una franquicia de equipaje distinta de la postal y puede usarse una vez por mes. Residentes y turistas tienen los mismos montos; los efectos personales compatibles con el viaje se analizan como equipaje, no como una compra postal.',
    category: 'viajeros-mudanzas',
    sourceIds: ['decreto-139-014', 'decreto-43-019'],
    basis: 'norma',
    tags: ['valija', 'viajero', '500', '300', 'aeropuerto', 'frontera'],
    related: {
      label: 'Calcular la franquicia de viajero',
      to: '/franquicia-viajero-uruguay',
    },
  },
  {
    id: 'excedente-viajero',
    question: '¿Qué pago si excedo la franquicia de equipaje?',
    shortAnswer:
      'El 50% sobre el valor que excede la franquicia, si la mercadería sigue calificando como equipaje.',
    answer:
      'Declarás el excedente con las facturas. Si por cantidad, naturaleza o variedad Aduanas entiende que hay finalidad comercial, deja de ser equipaje y pasa a otro régimen; no se resuelve simplemente pagando 50%.',
    category: 'viajeros-mudanzas',
    sourceIds: ['decreto-139-014', 'decreto-43-019'],
    basis: 'norma',
    tags: ['excedente', '50', 'equipaje', 'declarar'],
  },
  {
    id: 'telefono-laptop-usados-viaje',
    question: '¿Mi teléfono o laptop usados cuentan dentro de los US$ 500?',
    shortAnswer:
      'Pueden ser efectos personales, pero no existe una cantidad automática que blinde el caso.',
    answer:
      'El test es si los bienes son compatibles con uso o consumo personal y si su cantidad, naturaleza o variedad no hacen presumir fines comerciales. Un dispositivo en uso es distinto de varias unidades nuevas en caja; conservá prueba de uso o compra si el valor es alto.',
    category: 'viajeros-mudanzas',
    sourceIds: ['decreto-139-014'],
    basis: 'zona-gris',
    tags: ['telefono usado', 'laptop usada', 'efectos personales', 'valija'],
  },
  {
    id: 'varios-telefonos-viajero',
    question: '¿Puedo entrar con dos o tres teléfonos o computadoras?',
    shortAnswer:
      'No hay un número fijo; Aduanas evalúa si parecen efectos personales o mercadería comercial.',
    answer:
      'La norma usa cantidad, naturaleza y variedad, no una tabla por dispositivo. Explicá el uso de cada equipo y declaralo si corresponde; varias unidades nuevas, idénticas o embaladas para reventa elevan el riesgo de régimen general.',
    category: 'viajeros-mudanzas',
    sourceIds: ['decreto-139-014'],
    basis: 'zona-gris',
    tags: ['varios telefonos', 'varias laptops', 'uso personal', 'comercial'],
  },
  {
    id: 'herramientas-profesion-viajero',
    question: '¿Puedo traer cámara, herramientas o equipo de mi profesión?',
    shortAnswer:
      'Sí pueden integrar el equipaje; la norma contempla bienes relacionados con profesión o estudio.',
    answer:
      'Declarar que es para tu actividad no lo convierte automáticamente en importación comercial. La clave sigue siendo que parezca herramienta de trabajo propia y no inventario para vender, según cantidad, naturaleza y variedad.',
    category: 'viajeros-mudanzas',
    sourceIds: ['decreto-139-014'],
    basis: 'norma',
    tags: ['herramientas', 'camara', 'profesion', 'estudio', 'emprendimiento'],
  },
  {
    id: 'equipaje-no-acompanado',
    question: '¿Qué pasa si mando la PC o parte del equipaje por separado?',
    shortAnswer:
      'Es equipaje no acompañado, pero no verificamos que tenga la misma franquicia de US$ 500.',
    answer:
      'El Código Aduanero reconoce la categoría, pero las fuentes primarias revisadas no permiten afirmar qué monto aplica en ese caso. Consultá a Aduanas antes del envío y no uses automáticamente la calculadora de equipaje acompañado.',
    category: 'viajeros-mudanzas',
    sourceIds: ['carou-133'],
    basis: 'zona-gris',
    tags: ['equipaje no acompañado', 'pc aparte', 'enviar valija', 'mudanza parcial'],
  },
  {
    id: 'mudanza-uruguayo-retorna',
    question: '¿Qué puede traer un uruguayo que vuelve a vivir al país?',
    shortAnswer:
      'Con más de dos años afuera puede ingresar menaje, herramientas y un vehículo por la vía especial.',
    answer:
      'La Ley 18.250 prevé una franquicia por única vez para quien retorna a residir definitivamente: menaje, bienes vinculados a profesión u oficio y un vehículo propio con restricciones de transferencia. El trámite se prepara con el consulado; no es la franquicia postal.',
    category: 'viajeros-mudanzas',
    sourceIds: ['ley-18250-76', 'mudanza-retorno'],
    basis: 'norma',
    tags: ['mudanza', 'retorno', 'dos años', 'menaje', 'vehiculo'],
  },
  {
    id: 'turista-vs-residente',
    question: '¿Un turista extranjero tiene la misma franquicia de equipaje?',
    shortAnswer: 'Sí para equipaje; eso no le da la franquicia postal sin documento uruguayo.',
    answer:
      'La franquicia de viajero no distingue nacionalidad o residencia: US$ 500 aérea/marítima o US$ 300 terrestre. Es un régimen separado; recibir paquetes durante la estadía sigue las reglas postales y la franquicia postal exige documento uruguayo.',
    category: 'viajeros-mudanzas',
    sourceIds: ['decreto-139-014', 'decreto-43-019', 'decreto-50-026'],
    basis: 'norma',
    tags: ['turista', 'extranjero', 'residente', 'equipaje', 'franquicia postal'],
  },
  {
    id: 'reventa-no-franquicia',
    question: '¿Puedo usar la franquicia para traer productos y revenderlos?',
    shortAnswer:
      'No con franquicia; un envío comercial puede usar prestación única si cumple sus límites.',
    answer:
      'La franquicia exige uso personal. Un envío tratado como comercial puede quedar en la prestación única del 60% si no supera US$ 800, 20 kg ni contiene mercadería excluida; eso no reemplaza las obligaciones fiscales, permisos o formalización de una reventa habitual. Fraccionar inventario entre cédulas o declararlo como personal puede generar sanciones.',
    category: 'importacion-comercial',
    sourceIds: ['decreto-50-026', 'ley-20446-632'],
    basis: 'norma',
    tags: ['reventa', 'negocio', 'inventario', 'comercial', 'emprendimiento'],
    related: {
      label: 'Ver cómo se importa legalmente para revender',
      to: '/importar-para-revender-uruguay',
    },
  },
  {
    id: 'empresa-rut',
    question: '¿Puedo importar a nombre de una empresa o usando RUT?',
    shortAnswer:
      'Una empresa no usa franquicia personal; puede corresponder prestación única o régimen general.',
    answer:
      'El régimen de prestación única admite titulares personas físicas o jurídicas si el envío no supera US$ 800 ni 20 kg y cumple las demás condiciones. La franquicia, en cambio, es exclusiva de personas físicas mayores de edad con documento uruguayo. Para una empresa, pedí al operador o despachante el tratamiento, factura, permisos y obligaciones fiscales antes del embarque.',
    category: 'importacion-comercial',
    sourceIds: ['decreto-50-026', 'dna-regimen-general'],
    basis: 'norma',
    tags: ['rut', 'empresa', 'persona juridica', 'factura empresa', 'importador'],
  },
  {
    id: 'ncm-clasificacion',
    question: '¿Qué es el NCM y tengo que saberlo para importar?',
    shortAnswer:
      'Es la clasificación arancelaria del producto; en un DUA determina tributos y controles.',
    answer:
      'El código NCM identifica la mercadería por composición y función, no solo por el nombre de tienda. En una importación general la clasificación forma parte del DUA y conviene que la determine el despachante con ficha técnica, materiales y uso. Para un envío postal personal no inventes un código si el portal no lo exige: describí el producto con precisión y aportá la documentación al operador.',
    category: 'importacion-comercial',
    sourceIds: ['dna-regimen-general'],
    basis: 'procedimiento',
    tags: ['ncm', 'codigo arancelario', 'clasificacion', 'dua', 'tributos'],
  },
  {
    id: 'flete-no-postal',
    question: '¿Puedo usar la franquicia si traigo la mercadería por flete propio o como carga?',
    shortAnswer:
      'Solo si jurídicamente es un envío postal gestionado por operadores postales; la carga común va por otra vía.',
    answer:
      'El régimen se define por la intervención de operadores postales públicos o privados y por un peso unitario de hasta 20 kg. Contratar transporte terrestre, marítimo o aéreo por cuenta propia no convierte la carga en encomienda postal. Antes de embarcar, preguntá al transportista bajo qué régimen y documento ingresará; si es carga general, corresponde analizar DUA, despachante, tributos y permisos.',
    category: 'importacion-comercial',
    sourceIds: ['carou-140', 'decreto-50-026', 'dna-regimen-general'],
    basis: 'norma',
    tags: ['flete propio', 'carga', 'transporte terrestre', 'maritimo', 'aereo', 'no postal'],
  },
  {
    id: 'regimen-general-800-20kg',
    question: '¿Qué pasa si el envío supera US$ 800 o 20 kg?',
    shortAnswer: 'Queda fuera de franquicia y prestación única y pasa al régimen general.',
    answer:
      'Aduanas publica la vía de importación general mediante DUA para esos casos, y también para mercadería con IMESI o que no cumpla las condiciones postales. Pedí una cotización completa antes de comprar: tributos, permisos, depósito y honorarios pueden superar el valor del bien.',
    category: 'importacion-comercial',
    sourceIds: ['decreto-50-026', 'dna-regimen-general'],
    basis: 'procedimiento',
    tags: ['mas 800', 'mas 20 kg', 'regimen general', 'dua'],
    related: {
      label: 'Ver quién declara y cuándo hay DUA',
      to: '/declarar-compra-exterior-uruguay#importacion-general',
    },
  },
  {
    id: 'despachante-mas-800',
    question: '¿Necesito despachante para un envío de más de US$ 800?',
    shortAnswer:
      'En la práctica Aduanas lo exige, aunque las normas generales publicadas dicen que no sería preceptivo.',
    answer:
      'La página operativa de la DNA indica despachante para importación general por encima de US$ 800. Sin embargo, Ley 20.446 art. 627, Decreto 50/026 art. 17 y CAROU art. 15 contienen exenciones amplias para envíos postales no comerciales. No recomendamos ir sin despachante: mostramos el conflicto para que puedas pedir el fundamento.',
    category: 'importacion-comercial',
    sourceIds: ['dna-regimen-general', 'ley-20446-627', 'decreto-50-026', 'carou-15'],
    basis: 'zona-gris',
    tags: ['despachante', '800', 'contradiccion', 'regimen general'],
  },
  {
    id: 'dos-dua-por-ano',
    question: '¿Una persona física solo puede hacer dos DUA por año?',
    shortAnswer: 'Aduanas lo publica, pero no localizamos la norma que establece ese límite.',
    answer:
      'La página del régimen general afirma “hasta dos DUA por año” para personas físicas. La Orden del Día 69/2012 a la que remite no contiene ese cupo y tampoco apareció en las normas 2026 revisadas. Tratá el límite como práctica oficial vigente, no como artículo de ley identificado.',
    category: 'importacion-comercial',
    sourceIds: ['dna-regimen-general'],
    basis: 'zona-gris',
    tags: ['dos dua', 'persona fisica', 'importador esporadico', 'año'],
  },
  {
    id: 'importar-sin-empresa',
    question: '¿Puedo importar sin tener empresa o RUT?',
    shortAnswer:
      'Sí para envíos personales y algunos casos puntuales; una actividad habitual debe formalizarse.',
    answer:
      'La franquicia es personal; la prestación única puede cubrir un envío comercial dentro de sus límites. La DNA también admite DUA de personas físicas de forma limitada según su página. Si importás de manera recurrente o para abastecer un negocio, consultá despachante, DGI y VUCE antes de comprar.',
    category: 'importacion-comercial',
    sourceIds: ['decreto-50-026', 'dna-regimen-general'],
    basis: 'procedimiento',
    tags: ['sin empresa', 'sin rut', 'persona fisica', 'importar', 'negocio'],
  },
  {
    id: 'prestacion-unica-para-revender',
    question: '¿Puedo usar el régimen del 60% para traer mercadería que voy a revender?',
    shortAnswer: 'Sí: la prestación única admite personas jurídicas y no exige uso personal.',
    answer:
      'El Decreto 50/026 art. 2 abre la prestación única a "los titulares, sean personas físicas o jurídicas" y no le pone la condición de uso personal; la propia DNA publica que "se pueden amparar personas jurídicas o personas físicas de cualquier edad". La exigencia de uso personal y sin fines comerciales está en los arts. 3 y 4, que regulan la franquicia. Cumpliendo US$ 800 de factura, 20 kg y las exclusiones del art. 7, un envío para revender entra por esta vía sin DUA y sin despachante. Lo que no cambia es la obligación fiscal de vender formalmente.',
    category: 'importacion-comercial',
    sourceIds: ['decreto-50-026', 'dna-prestacion-unica', 'dna-franquicia'],
    basis: 'norma',
    tags: ['revender', 'reventa', 'ecommerce', '60 por ciento', 'persona juridica', 'emprender'],
    related: {
      label: 'Ver la guía completa de importar para revender',
      to: '/importar-para-revender-uruguay',
    },
  },
  {
    id: 'donde-se-paga-el-60',
    question: '¿Dónde y cómo se paga el 60%?',
    shortAnswer: 'Se lo pagás al operador postal; no hay trámite ante DGI ni ante la Aduana.',
    answer:
      'El Decreto 50/026 art. 8 designa a los operadores postales como responsables por el pago de obligaciones tributarias de terceros: el courier o el Correo liquida el 60% (mínimo US$ 20 por envío) sobre el total de la factura original y le paga a la Aduana. Ojo con un detalle que confunde: la página de la DNA llama "monotributo" a ese pago único, y no tiene ninguna relación con el monotributo de DGI/BPS.',
    category: 'importacion-comercial',
    sourceIds: ['decreto-50-026', 'dna-prestacion-unica', 'ley-20446-627'],
    basis: 'norma',
    tags: ['pagar 60', 'donde se paga', 'operador postal', 'courier cobra', 'monotributo aduana'],
    related: {
      label: 'Ver el paso a paso del pago',
      to: '/importar-para-revender-uruguay',
    },
  },
  {
    id: 'empresa-antes-de-importar',
    question: '¿Tengo que abrir la unipersonal antes de importar o después?',
    shortAnswer: 'Para importar por el 60% no hace falta; para vender de forma habitual sí.',
    answer:
      'Aduana no pide RUT para liberar un envío bajo la prestación única: el régimen admite titulares personas físicas o jurídicas. Lo que exige empresa es vender de forma habitual, y eso se resuelve ante DGI y BPS, no ante la Aduana. El segundo motivo aparece al escalar: la DNA publica que una persona física puede realizar hasta dos DUA por año, así que importar seguido por Régimen General se hace con empresa. Si elegís monotributo, tené presente que el Decreto 220/998 art. 132 te hace pagar el IVA de la importación como no contribuyente: queda como costo, no como crédito.',
    category: 'importacion-comercial',
    sourceIds: ['decreto-50-026', 'dna-prestacion-unica', 'dna-regimen-general', 'decreto-220-998'],
    basis: 'norma',
    tags: ['unipersonal', 'empresa', 'rut', 'monotributo', 'antes de importar', 'formalizar'],
    related: {
      label: 'Elegir qué empresa abrir',
      to: '/que-empresa-abrir-uruguay',
    },
  },
  {
    id: 'ursec-bluetooth-excepcion',
    question: '¿Unos auriculares Bluetooth necesitan homologación de URSEC?',
    shortAnswer: 'No: URSEC exceptúa a los dispositivos que sólo usan Wi-Fi 4/5/6 y/o Bluetooth.',
    answer:
      'URSEC interviene sobre el equipamiento emisor de radiofrecuencia, pero su propio trámite publica la excepción: "no es necesaria la intervención de URSEC para el ingreso al país de dispositivos que operen únicamente con las tecnologías Wifi4, Wifi5 y Wifi6 y/o Bluetooth". Un celular no queda amparado, porque además usa redes móviles: URSEC lista expresamente las terminales de telecomunicaciones móviles. Si el equipo suma otra tecnología, la excepción no lo cubre.',
    category: 'productos-permisos',
    sourceIds: ['ursec-importacion'],
    basis: 'procedimiento',
    tags: ['ursec', 'bluetooth', 'wifi', 'auriculares', 'homologacion', 'radiofrecuencia'],
  },
  {
    id: 'ursea-cargadores-adaptadores',
    question: '¿Un cargador de celular necesita autorización de URSEA?',
    shortAnswer:
      'No hay autorización previa para cargadores; los adaptadores de enchufe y zapatillas sí la requieren.',
    answer:
      'El Reglamento de Seguridad de Productos Eléctricos de Baja Tensión alcanza a los productos por encima de 50 V en corriente alterna, así que un cargador de pared queda dentro de su ámbito y URSEA puede exigirle al importador que demuestre el cumplimiento. Pero la lista de productos que necesitan autorización antes de comercializar (Anexos II, V y VI) es cerrada y no incluye cargadores ni fuentes de alimentación: sí incluye adaptadores, prolongadores, fichas y tomacorrientes, cables de instalación y otros. Guardá igual la ficha técnica y el certificado del fabricante.',
    category: 'productos-permisos',
    sourceIds: ['ursea-productos'],
    basis: 'procedimiento',
    tags: ['ursea', 'cargador', 'adaptador', 'zapatilla', 'productos electricos', 'baja tension'],
  },
  {
    id: 'power-bank-courier-comercial',
    question: '¿Puedo importar power banks por courier para revender?',
    shortAnswer: 'En la práctica no: los operadores no transportan baterías de litio sueltas.',
    answer:
      'No es un permiso que se saque, es una restricción de transporte. Un power bank es una batería de litio sin dispositivo asociado, y los operadores postales publican que no las transportan. Aunque el envío cumpla US$ 800 y 20 kg, la vía puerta a puerta se cae: quedan la carga con documentación de mercancía peligrosa (DUA y despachante) o comprar a un importador local. Confirmá la política de tu operador antes de pagarle al proveedor.',
    category: 'productos-permisos',
    sourceIds: ['gripper-baterias', 'dna-productos', 'decreto-50-026'],
    basis: 'procedimiento',
    tags: ['power bank', 'bateria litio', 'courier', 'revender', 'transporte', 'iata'],
    related: {
      label: 'Ver los trámites por tipo de accesorio',
      to: '/importar-para-revender-uruguay',
    },
  },
  {
    id: 'muestras-equipamiento-negocio',
    question: '¿Una muestra o herramienta para mi emprendimiento es “comercial”?',
    shortAnswer:
      'No necesariamente; importa si es para uso propio o para venta y cómo luce la operación.',
    answer:
      'Una herramienta de trabajo para uso propio puede seguir siendo personal; mercadería destinada a revender no. No hay una tabla automática por tipo de bien: documentá finalidad, cantidad y uso, y ante valor alto o repetición pedí criterio previo a un despachante o a Aduanas.',
    category: 'importacion-comercial',
    sourceIds: ['decreto-50-026', 'dna-regimen-general'],
    basis: 'zona-gris',
    tags: ['muestra', 'herramienta', 'emprendimiento', 'uso propio', 'comercial'],
  },
])

export function normalizeAduanaFaqText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
}

export function aduanaFaqHaystack(faq: AduanaFaq): string {
  return normalizeAduanaFaqText([faq.question, faq.shortAnswer, faq.answer, ...faq.tags].join(' '))
}

export function aduanaFaqSources(faq: AduanaFaq): AduanaFaqSource[] {
  return faq.sourceIds
    .map(id => ADUANA_FAQ_SOURCES[id])
    .filter((source): source is AduanaFaqSource => Boolean(source))
}

export function aduanaFaqGroups(faqs: readonly AduanaFaq[] = ADUANA_FAQS) {
  return ADUANA_FAQ_CATEGORIES.map(category => ({
    ...category,
    items: faqs.filter(faq => faq.category === category.id),
  })).filter(group => group.items.length > 0)
}
