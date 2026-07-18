// Research-backed content for /alquilar-en-uruguay. Keep volatile prices out of
// this file: provider conditions and emergency contacts are linked to their
// primary source and stamped with the last verification date.

export const RENT_GUIDE_LAST_REVIEWED = '2026-07-18'

export interface RentalPortal {
  name: string
  url: string
  bestFor: string
  caution?: string
}

export const RENTAL_PORTALS: readonly RentalPortal[] = Object.freeze([
  {
    name: 'InfoCasas',
    url: 'https://www.infocasas.com.uy/alquiler',
    bestFor: 'Apartamentos y casas de inmobiliarias; buenos filtros y mapa.',
  },
  {
    name: 'Mercado Libre Inmuebles',
    url: 'https://inmuebles.mercadolibre.com.uy/alquiler',
    bestFor: 'Oferta amplia y alertas de publicaciones nuevas.',
  },
  {
    name: 'Gallito',
    url: 'https://www.gallito.com.uy/inmuebles/alquileres',
    bestFor: 'Avisos de inmobiliarias y algunos propietarios directos.',
  },
  {
    name: 'Facebook Marketplace y grupos barriales',
    url: 'https://www.facebook.com/marketplace/category/propertyrentals',
    bestFor: 'Habitaciones, pensiones, alquiler directo y búsquedas por barrio.',
    caution:
      'Es el canal con más riesgo: no entregues una seña antes de verificar persona e inmueble.',
  },
])

export interface GuaranteeOption {
  id: string
  name: string
  summary: string
  requirements: string
  cost: string
  timing: string
  tradeoff: string
  officialUrl: string
}

export const GUARANTEE_OPTIONS: readonly GuaranteeOption[] = Object.freeze([
  {
    id: 'anda',
    name: 'ANDA',
    summary: 'Garantía con cobro del alquiler y servicios a través de ANDA.',
    requirements:
      'Evalúa ingreso y antigüedad laboral. Si no alcanzan, ANDA indica que puede admitir garante o depósito según el caso.',
    cost: '3% mensual del alquiler garantizado para el inquilino.',
    timing: 'Conviene obtener el monto garantizado antes de buscar.',
    tradeoff: 'Muy aceptada, pero el monto disponible depende de la evaluación del hogar.',
    officialUrl: 'https://anda.com.uy/garantia-de-alquiler/inquilino/preguntas-frecuentes/',
  },
  {
    id: 'cgn-mvot',
    name: 'CGN / Fondo de Garantía del MVOT',
    summary: 'Respaldo estatal administrado con la Contaduría General de la Nación.',
    requirements:
      'El acceso depende del convenio o programa. El Fondo MVOT admite ingresos formales o acreditados entre 15 y 100 UR y exige al menos 3 meses de continuidad.',
    cost: '3% mensual del alquiler para inquilino y propietario; el Fondo MVOT agrega un depósito único del 24% del monto garantizado.',
    timing: 'Con documentación e inventario acordado, CGN informa firma en hasta 3 días hábiles.',
    tradeoff:
      'Costo previsible y respaldo estatal; hay topes, documentación y viviendas que no califican.',
    officialUrl:
      'https://www.gub.uy/ministerio-vivienda-ordenamiento-territorial/politicas-y-gestion/garantia-alquiler',
  },
  {
    id: 'seguro',
    name: 'Seguro de alquiler',
    summary: 'Una aseguradora analiza los ingresos y emite una póliza que protege al propietario.',
    requirements:
      'Varían por compañía. Porto permite componer ingresos de hasta 5 solicitantes y contempla dependientes, jubilados e independientes con documentación distinta.',
    cost: 'Se cotiza para cada alquiler y perfil; no uses un porcentaje genérico.',
    timing: 'Porto anuncia tramitación en el día si la documentación está completa.',
    tradeoff: 'Suele ser rápido y flexible; la prima se paga y renueva según la póliza.',
    officialUrl: 'https://www.portoseguro.com.uy/web/guest/modalidad-de-contratacion-alquiler',
  },
  {
    id: 'bhu',
    name: 'Depósito en BHU',
    summary: 'Inquilino y propietario acuerdan dinero inmovilizado en una cuenta en UI.',
    requirements: 'Acuerdo de ambas partes y apertura de la cuenta de garantía en BHU.',
    cost: 'Hasta 5 meses para vivienda, más un arancel de apertura de 5% sobre el depósito.',
    timing: 'Puede acordarse integrarlo hasta en 10 pagos.',
    tradeoff:
      'No exige evaluación de sueldo, pero inmoviliza capital y el retiro requiere autorización de la contraparte.',
    officialUrl:
      'https://www.bhu.com.uy/preguntas-frecuentes/garantia-de-alquiler/ya-tengo-una-cuenta',
  },
  {
    id: 'sin-garantia',
    name: 'Régimen sin garantía (Ley 19.889)',
    summary: 'Contrato especial de vivienda sin garantía de ninguna naturaleza.',
    requirements:
      'Debe ser escrito y expresar plazo, precio y que ambas partes aceptan expresamente este régimen.',
    cost: 'No hay costo de garantía; sí pueden existir comisión y demás costos de entrada.',
    timing: 'Depende de que el propietario lo ofrezca; no puede imponerse unilateralmente.',
    tradeoff:
      'Abre una puerta sin garantía, pero prevé plazos de desalojo más breves. Leé el contrato con especial cuidado.',
    officialUrl: 'https://www.impo.com.uy/bases/leyes/19889-2020/421',
  },
])

export interface UrgentResource {
  title: string
  action: string
  contact: string
  url: string
  scope: string
}

export const URGENT_HOUSING_RESOURCES: readonly UrgentResource[] = Object.freeze([
  {
    title: 'Red Calle 365 — MIDES',
    action:
      'Si hoy podés quedar a la intemperie en Montevideo, llamá o escribí para pedir atención y derivación.',
    contact: '0800 365 0 · WhatsApp 091 365 000',
    url: 'https://red365.mides.gub.uy/',
    scope: 'Montevideo',
  },
  {
    title: 'Emergencia en el interior',
    action:
      'El canal oficial para avisar o pedir atención por una persona a la intemperie en el interior es Emergencias.',
    contact: '911',
    url: 'https://www.gub.uy/ministerio-desarrollo-social/personas-en-calle',
    scope: 'Interior del país',
  },
  {
    title: 'Línea Azul — INAU',
    action:
      'Si hay niñas, niños o adolescentes sin un lugar seguro, contactá la línea de atención del INAU.',
    contact: '0800 5050 · *5050 desde celular',
    url: 'https://www.inau.gub.uy/',
    scope: 'Todo el país',
  },
])

export const VISIT_CHECKLIST = Object.freeze([
  'Probá canillas, cisterna, calefón, enchufes y llaves de luz; mirá el tablero eléctrico.',
  'Buscá humedad estructural, olor a encierro, pintura recién aplicada sobre manchas y filtraciones.',
  'Visitá de día y, si podés, volvé en hora pico para medir ruido, transporte y seguridad del recorrido.',
  'Pedí la última liquidación de gastos comunes y preguntá si hay derramas u obras extraordinarias.',
  'Confirmá qué queda en la vivienda y que cada desperfecto figure en el inventario con fotos.',
  'Verificá cobertura celular, fibra disponible, orientación, ventilación, cerraduras y presión de agua.',
])

export const CONTRACT_CHECKLIST = Object.freeze([
  'Identidad de propietario, administrador e inquilinos; pedí documentación que acredite quién puede arrendar.',
  'Dirección y padrón/unidad exactos, destino de vivienda y fecha real de entrega de llaves.',
  'Precio, moneda, vencimiento, medio de pago y comprobante que recibirás cada mes.',
  'Índice y frecuencia de reajuste; no firmes una fórmula que no puedas explicar con tus palabras.',
  'Plazo, renovación, preaviso y consecuencias de retirarte antes de tiempo.',
  'Quién paga gastos comunes ordinarios, tributos, saneamiento, OSE, UTE y reparaciones.',
  'Garantía elegida, inventario fechado y mecanismo para documentar daños preexistentes.',
  'Reglas sobre mascotas, convivencia, subarriendo, mejoras y acceso del propietario.',
])

export const RENT_RED_FLAGS = Object.freeze([
  'Piden seña, reserva o transferencia antes de visitar o verificar por videollamada y documentación.',
  'El supuesto dueño está en el exterior, no puede reunirse y promete enviar las llaves.',
  'El precio está muy por debajo de avisos comparables y presionan para pagar “hoy”.',
  'El nombre de la cuenta bancaria no coincide y no explican por escrito quién recibe el dinero.',
  'Las fotos aparecen en otros avisos, la dirección cambia o evitan mostrar el exterior y el número de puerta.',
  'No entregan contrato, recibo o datos verificables de la inmobiliaria/administración.',
])

export interface SearchPostInput {
  budget?: number | null
  zones?: string
  accommodation?: string
  moveDate?: string
  guarantee?: string
  household?: string
  contact?: string
}

export function buildRentalSearchPost(input: SearchPostInput): string {
  const budget = Number(input.budget)
  const lines = [
    'Busco alquiler en Uruguay',
    '',
    `• Presupuesto total: ${budget > 0 ? `$${Math.round(budget).toLocaleString('es-UY')} por mes` : 'a conversar'}${budget > 0 ? ' (incluidos gastos comunes)' : ''}`,
    `• Zonas: ${input.zones?.trim() || 'flexible'}`,
    `• Tipo: ${input.accommodation?.trim() || 'habitación, pensión o vivienda a evaluar'}`,
    `• Para entrar: ${input.moveDate?.trim() || 'lo antes posible'}`,
    `• Garantía/ingresos: ${input.guarantee?.trim() || 'a conversar; puedo acreditar mi situación por privado'}`,
    `• Somos: ${input.household?.trim() || '1 persona'}`,
    '',
    'Busco una opción seria. Puedo visitar; no envío seña antes de verificar el lugar y a quien alquila.',
  ]
  if (input.contact?.trim()) lines.push(`Contacto: ${input.contact.trim()}`)
  return lines.join('\n')
}

export interface RentSource {
  label: string
  url: string
  detail: string
}

export const RENT_GUIDE_SOURCES: readonly RentSource[] = Object.freeze([
  {
    label: 'MIDES — Red Calle 365',
    url: 'https://www.gub.uy/ministerio-desarrollo-social/comunicacion/comunicados/ministerio-desarrollo-social-renueva-telefonos-para-recibir-informacion',
    detail: 'Canales vigentes para personas a la intemperie, actualizados en abril de 2026.',
  },
  {
    label: 'MVOT — Fondo de Garantía de Alquiler',
    url: 'https://www.gub.uy/ministerio-vivienda-ordenamiento-territorial/politicas-y-gestion/garantia-alquiler',
    detail: 'Requisitos, topes, comisión y pasos del certificado.',
  },
  {
    label: 'MEF / CGN — derechos y obligaciones del inquilino',
    url: 'https://www.gub.uy/ministerio-economia-finanzas/garantia-de-alquileres/derechos-obligaciones-del-inquilino',
    detail: 'Inventario, servicios accesorios, reajustes y responsabilidades bajo SGA.',
  },
  {
    label: 'BHU — depósito en garantía de alquiler',
    url: 'https://www.bhu.com.uy/preguntas-frecuentes/garantia-de-alquiler/ya-tengo-una-cuenta',
    detail: 'Tope, pago en cuotas, arancel y retiro del depósito.',
  },
  {
    label: 'IMPO — Ley 19.889, régimen sin garantía',
    url: 'https://www.impo.com.uy/bases/leyes/19889-2020/421',
    detail: 'Condiciones que debe cumplir el contrato para entrar en el régimen.',
  },
  {
    label: 'Ministerio del Interior — prevención de estafas de alquiler',
    url: 'https://www.gub.uy/ministerio-interior/comunicacion/noticias/advertencia-poblacion-prevencion-estafas-alquileres-temporarios',
    detail: 'Verificación del anunciante, inmueble y medio de pago.',
  },
  {
    label: 'Defensa del Consumidor — arrendamientos',
    url: 'https://www.gub.uy/ministerio-economia-finanzas/defensa-del-consumidor',
    detail: 'Alcance de reclamos y responsabilidades por humedades estructurales.',
  },
  {
    label: 'Intendencia de Montevideo — asesoramiento jurídico gratuito',
    url: 'https://montevideo.gub.uy/tipo/area-tematica/convivencia/prestadores-de-servicios-juridicos-gratuitos',
    detail: 'Defensoría, consultorios y servicio especializado en vivienda.',
  },
  {
    label: 'ADIU — Honorarios inmobiliarios en alquileres',
    url: 'https://adiu.uy/articulo.aspx?id=271',
    detail:
      'La comisión de la inmobiliaria equivale a un mes de alquiler más IVA y se calcula sobre el alquiler, no sobre los gastos comunes.',
  },
  {
    label: 'MEF — Preguntas frecuentes sobre garantía de alquileres',
    url: 'https://www.gub.uy/ministerio-economia-finanzas/comunicacion/publicaciones/preguntas-frecuentes-sobre-garantia-alquileres',
    detail:
      'Costo del contrato y comisión (se aplica sobre el alquiler, no sobre servicios ni gastos comunes), reajuste cada 12 meses y responsabilidades por reparaciones.',
  },
  {
    label: 'DGI — Crédito fiscal por arrendamiento (IRPF)',
    url: 'https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/credito-fiscal-arrendamiento-inmuebles-irpf',
    detail:
      'El inquilino de vivienda permanente puede computar un crédito del 8% del alquiler pagado contra el IRPF (con contrato escrito de un año o más e identificando al arrendador); el excedente se imputa al IASS.',
  },
  {
    label: 'IMPO — Ley 14.219, arrendamientos (régimen común)',
    url: 'https://www.impo.com.uy/bases/decretos-ley/14219-1974',
    detail:
      'Plazo mínimo de vivienda de dos años, tope del depósito en garantía (cinco meses de alquiler para vivienda) y reajuste anual por el IPC.',
  },
  {
    label: 'Reddit r/uruguay — “Necesito un techo urgente”',
    url: 'https://www.reddit.com/r/uruguay/comments/1uuq7pd/necesito_un_techo_urgente/',
    detail: 'Caso que motivó la ruta urgente y el generador de aviso completo.',
  },
])

export function guaranteeById(id: string): GuaranteeOption | undefined {
  return GUARANTEE_OPTIONS.find(option => option.id === id)
}
