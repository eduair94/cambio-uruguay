// app/utils/rentGuide.ts
// Data for /alquilar-en-uruguay: portals to search, guarantee options compared,
// startup-cost breakdown, practical tips (from Reddit r/uruguay + trusted sources)
// and scam red-flags. PURE data + helpers (no Vue/Nuxt). Informational, not legal
// or financial advice; verify current terms with each provider.

export interface RentalPortal {
  name: string
  url: string
  note: string
}

export const RENTAL_PORTALS: readonly RentalPortal[] = Object.freeze([
  {
    name: 'InfoCasas',
    url: 'https://www.infocasas.com.uy/alquiler',
    note: 'El portal con más oferta de alquiler del país; buenos filtros por zona, precio y dormitorios.',
  },
  {
    name: 'Gallito',
    url: 'https://www.gallito.com.uy/inmuebles/alquileres',
    note: 'Clásico uruguayo de avisos; mucha oferta directa de propietarios e inmobiliarias.',
  },
  {
    name: 'Mercado Libre Inmuebles',
    url: 'https://inmuebles.mercadolibre.com.uy/alquiler',
    note: 'Amplio catálogo con fotos y ubicación en mapa.',
  },
  {
    name: 'Properati',
    url: 'https://www.properati.com.uy/s/alquiler',
    note: 'Buscador con mapa y estadísticas de precios por zona.',
  },
  {
    name: 'Grupos de Facebook y "alquiler sin garantía"',
    url: 'https://www.facebook.com/',
    note: 'Hay muchos grupos barriales de alquiler directo (sin comisión), pero es donde más estafas aparecen: extremá los cuidados.',
  },
])

export interface GuaranteeOption {
  id: string
  name: string
  howItWorks: string
  cost: string
  speed: string
  bestFor: string
  pros: string[]
  cons: string[]
}

export const GUARANTEE_OPTIONS: readonly GuaranteeOption[] = Object.freeze([
  {
    id: 'anda',
    name: 'Garantía ANDA',
    howItWorks:
      'Funciona por retención directa del sueldo: si no pagás, ANDA le paga al propietario y te lo descuenta. Requiere relación laboral formal y estable.',
    cost: 'Aprox. 3% mensual a cada parte; de las opciones más baratas a la larga.',
    speed: 'Trámite más lento y burocrático.',
    bestFor: 'Trabajadores con empleo formal y tiempo para el trámite.',
    pros: ['Costo bajo en el total del contrato', 'Muy aceptada por inmobiliarias'],
    cons: ['Necesitás trabajo formal estable', 'Trámite lento', 'Retención sobre el sueldo'],
  },
  {
    id: 'contaduria',
    name: 'Garantía de Contaduría (CGN)',
    howItWorks:
      'Garantía de alquiler de la Contaduría General de la Nación, también por retención; habitual para funcionarios públicos y otros dependientes.',
    cost: 'Bajo (esquema de retención similar a ANDA).',
    speed: 'Trámite lento/administrativo.',
    bestFor: 'Funcionarios públicos y dependientes con antigüedad.',
    pros: ['Costo bajo', 'Respaldo estatal'],
    cons: ['Requisitos de dependencia/antigüedad', 'Burocracia'],
  },
  {
    id: 'seguro-fianza',
    name: 'Seguro de fianza (Porto y otros)',
    howItWorks:
      'Una aseguradora te afianza: aprueba rápido y no te retiene el sueldo. Ideal si necesitás cerrar ya o sos independiente.',
    cost: 'Prima anual del orden del 80-90% de un mes de alquiler (muchas veces financiable en cuotas).',
    speed: 'Aprobación en ~24 horas.',
    bestFor: 'Freelance, monotributistas o quien necesita mudarse rápido.',
    pros: ['Rápido', 'No retiene el sueldo', 'Acepta perfiles independientes'],
    cons: ['Es el más caro por año', 'Se renueva (y se paga) cada año'],
  },
  {
    id: 'deposito',
    name: 'Depósito en garantía',
    howItWorks:
      'En vez de un fiador, depositás dinero como garantía (a veces además del depósito habitual). Se devuelve al final si dejás todo en orden.',
    cost: 'Suele pedirse 1 a 2 meses de alquiler inmovilizados.',
    speed: 'Inmediato si tenés el capital.',
    bestFor: 'Quien tiene ahorro disponible y no consigue fiador/garantía.',
    pros: ['Sin fiador ni trámite de terceros', 'Rápido'],
    cons: ['Inmoviliza mucho capital', 'Riesgo de discusión a la devolución'],
  },
  {
    id: 'sin-garantia',
    name: 'Alquiler sin garantía (Ley 19.889)',
    howItWorks:
      'Un régimen legal que permite alquilar sin garantía tradicional, con reglas propias (plazos y proceso de desalojo más ágil para el propietario). No todas las propiedades lo ofrecen.',
    cost: 'Sin costo de garantía, pero condiciones contractuales distintas.',
    speed: 'Depende del propietario que lo acepte.',
    bestFor: 'Quien no puede acceder a ninguna garantía tradicional.',
    pros: ['No necesitás fiador ni seguro', 'Acceso más fácil'],
    cons: ['Menos protección para el inquilino', 'Oferta limitada'],
  },
])

export interface StartupCostItem {
  label: string
  amount: string
}

export const STARTUP_COSTS: readonly StartupCostItem[] = Object.freeze([
  { label: 'Primer mes de alquiler', amount: '1 mes' },
  { label: 'Garantía (seguro o depósito)', amount: '~0,8 a 2 meses según la opción' },
  { label: 'Comisión inmobiliaria', amount: 'Habitual: 1 mes + IVA' },
  { label: 'Conexiones de UTE y OSE', amount: 'Variable' },
  { label: 'Muebles y electrodomésticos básicos', amount: 'USD 1.000–2.000 si arrancás de cero' },
])

export interface RentTip {
  tip: string
  /** Where the tip comes from (community experience vs. official/legal). */
  source: 'reddit' | 'oficial' | 'general'
}

export const RENT_TIPS: readonly RentTip[] = Object.freeze([
  {
    tip: 'No te mudes hasta tener juntado el costo de arranque (2 a 3 sueldos) más un fondo de un mes por las dudas. Empezar endeudado es la peor forma de independizarse.',
    source: 'reddit',
  },
  {
    tip: 'Sacá fotos y video del estado del apartamento el día que entrás y el día que salís. Es lo que te salva la discusión por el depósito al final.',
    source: 'reddit',
  },
  {
    tip: 'Que el alquiler no supere ~30% de tu ingreso. Por encima de eso, el resto del presupuesto (comida, transporte, ahorro) empieza a sufrir.',
    source: 'general',
  },
  {
    tip: 'Preguntá los gastos comunes ANTES de decidir: en un edificio con amenities pueden sumar $3.000 a $6.500 por mes aparte del alquiler.',
    source: 'reddit',
  },
  {
    tip: 'Compará las garantías por el costo TOTAL del contrato, no solo por la primera cuota. ANDA/Contaduría salen más baratas a la larga; el seguro te destraba rápido.',
    source: 'general',
  },
  {
    tip: 'Leé la letra chica del contrato: cada cuánto y por qué índice se reajusta (UI o IPC), el plazo, y quién paga gastos comunes y contribución inmobiliaria.',
    source: 'oficial',
  },
  {
    tip: 'Amueblado ahorra el arranque de muebles pero cuesta más por mes; sin amueblar es más barato mensual pero sumás la inversión inicial. Hacé la cuenta según cuánto pensás quedarte.',
    source: 'reddit',
  },
  {
    tip: 'Alejarte del Centro/costa o mirar el interior baja mucho el alquiler. Compartir apartamento lo baja a menos de la mitad. Probá esas variables en la calculadora de costo de vida.',
    source: 'general',
  },
  {
    tip: 'En temporada de poca demanda (otoño/invierno) hay más margen para negociar el precio o pedir que incluyan algún gasto.',
    source: 'reddit',
  },
])

export interface RedFlag {
  flag: string
}

export const RENT_RED_FLAGS: readonly RedFlag[] = Object.freeze([
  {
    flag: 'Te piden una seña o transferencia ANTES de ver el inmueble o firmar. Es la estafa más común: nunca pagues sin ver y sin contrato.',
  },
  {
    flag: 'El precio está muy por debajo del mercado para esa zona. Si es demasiado bueno para ser verdad, casi siempre lo es.',
  },
  {
    flag: '"El dueño está en el exterior y te manda las llaves por correo". Clásico de estafa; no existe.',
  },
  { flag: 'No te dejan visitar el apartamento o ponen mil excusas para no mostrarlo.' },
  {
    flag: 'Te presionan para decidir en el momento y transferir ya, sin tiempo de leer el contrato.',
  },
  { flag: 'Piden datos de tarjeta o pagos por fuera de la inmobiliaria/propietario verificable.' },
])

export function guaranteeById(id: string): GuaranteeOption | undefined {
  return GUARANTEE_OPTIONS.find(g => g.id === id)
}
