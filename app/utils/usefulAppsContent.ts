// app/utils/usefulAppsContent.ts
// Los textos de /apps-utiles-uruguay que no son una tarjeta: el kit de imprescindibles, lo que la
// gente busca en las tiendas y NO es una app, los criterios, los consejos contra apps falsas y la
// FAQ. MÓDULO PURO. Cada afirmación sale de una ficha o de una página oficial abierta el
// USEFUL_APPS_VERIFIED_AT (utils/usefulAppsCatalog.ts).
import type { FaqItem } from './faqAnswers'
import type { UsefulAppCategoryId } from './usefulApps'

export interface UsefulAppsKitItem {
  id: string
  /** `todos`: lleva casilla y cuenta para el progreso. `caso`: depende de tu situación. */
  group: 'todos' | 'caso'
  title: string
  why: string
  /** 1–2 apps del catálogo; la primera es del Estado. Con dos, alcanza con una. */
  appIds: readonly string[]
  /** Condición, sólo para `caso` ("Si tenés auto o moto"). */
  when?: string
  /** Pestaña donde hay más opciones (la de tu mutualista está en Salud). */
  tab?: UsefulAppCategoryId
}

export const USEFUL_APPS_KIT: readonly UsefulAppsKitItem[] = Object.freeze([
  {
    id: 'estado',
    group: 'todos',
    title: 'La app del Estado',
    why: 'Te avisa antes de que venzan la cédula, el pasaporte y la libreta, y ahí ves tu historia clínica digital.',
    appIds: ['gub-uy'],
  },
  {
    id: 'bps',
    group: 'todos',
    title: 'Tu historia laboral',
    why: 'Tu historia laboral, los recibos de cobro, los certificados y el cambio de mutualista, sin ir al BPS.',
    appIds: ['bps-personas'],
  },
  {
    id: 'identidad',
    group: 'todos',
    title: 'Tu identidad digital',
    why: 'Con una de las dos entrás sin contraseña a la DGI y a gub.uy, ves tu historia clínica y firmás documentos.',
    appIds: ['tuid-antel', 'identidad-digital-abitab'],
  },
  {
    id: 'emergencias',
    group: 'todos',
    title: 'Emergencias',
    why: 'Reportás una emergencia al 9-1-1 con tu ubicación sin tener que hablar, y recibís las Alertas AMBER.',
    appIds: ['emergencia-911'],
  },
  {
    id: 'luz',
    group: 'todos',
    title: 'La luz',
    why: 'Avisás que te quedaste sin luz, mirás tus facturas y las pagás, y mandás la lectura del medidor.',
    appIds: ['ute'],
  },
  {
    id: 'salud',
    group: 'todos',
    title: 'Tu prestador de salud',
    why: 'ASSE tiene la suya, sólo para Android. Si sos de una mutualista, buscá la tuya en la pestaña Salud.',
    appIds: ['asse'],
    tab: 'salud',
  },
  {
    id: 'dgi',
    group: 'caso',
    when: 'Si declarás IRPF o esperás una devolución',
    title: 'Impuestos',
    why: 'Confirmás la declaración de IRPF y ves si te toca devolución, sin ir a la DGI.',
    appIds: ['dgi'],
  },
  {
    id: 'patente',
    group: 'caso',
    when: 'Si tenés auto o moto',
    title: 'Patente y multas',
    why: 'Consultás y pagás la patente, las multas y los convenios de tu vehículo, de cualquier departamento.',
    appIds: ['sucive'],
  },
  {
    id: 'peajes',
    group: 'caso',
    when: 'Si pasás peajes con TAG',
    title: 'Peajes',
    why: 'Ves en tiempo real tu saldo y tus pasadas por los peajes, y manejás tus vehículos y el TAG.',
    appIds: ['telepeaje'],
  },
  {
    id: 'omnibus',
    group: 'caso',
    when: 'Si te movés en ómnibus por Montevideo',
    title: 'El ómnibus',
    why: 'La app oficial de la Intendencia: cómo llegar y dónde viene tu ómnibus, en el mapa.',
    appIds: ['como-ir'],
  },
  {
    id: 'escuela',
    group: 'caso',
    when: 'Si tenés hijos en escuela pública',
    title: 'La escuela',
    why: 'Las faltas, las notas y quién es la maestra o el maestro de tu hijo.',
    appIds: ['guri-familia'],
  },
  {
    id: 'antel',
    group: 'caso',
    when: 'Si tenés celular, teléfono fijo o internet de Antel',
    title: 'Antel',
    why: 'El saldo, el consumo y las facturas de tus servicios de Antel.',
    appIds: ['mi-antel'],
  },
  {
    id: 'brou',
    group: 'caso',
    when: 'Si tenés cuenta en el BROU',
    title: 'El banco del Estado',
    why: 'Tus cuentas del BROU en el celular: saldos, transferencias y pago de cuentas.',
    appIds: ['ebrou'],
  },
])

/** La pestaña "Imprescindibles": las apps del kit, en su orden y sin repetir. */
export const USEFUL_APPS_ESSENTIAL_IDS: readonly string[] = Object.freeze([
  ...new Set(USEFUL_APPS_KIT.flatMap(item => [...item.appIds])),
])

/** Clave de `localStorage` de las casillas del kit (sin dígitos: gitleaks). */
export const USEFUL_APPS_KIT_STORAGE = 'cu_apps_kit'
export const USEFUL_APPS_KIT_MAX = 20

const KIT_TODOS: ReadonlySet<string> = new Set(
  USEFUL_APPS_KIT.filter(item => item.group === 'todos').map(item => item.id)
)

/** Lo guardado en el navegador puede ser cualquier cosa: sólo quedan ítems "para todos" reales. */
export function usefulAppsKitSanitize(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  const out: string[] = []
  for (const value of raw) {
    if (typeof value !== 'string' || !KIT_TODOS.has(value) || out.includes(value)) continue
    out.push(value)
    if (out.length >= USEFUL_APPS_KIT_MAX) break
  }
  return out
}

export interface UsefulAppsNotAppChannel {
  label: string
  value: string
  /** Enlace directo (https, `tel:` o `https://wa.me/...`). */
  url: string
}

export interface UsefulAppsNotApp {
  id: string
  name: string
  /** Lo que alguien quiere hacer cuando busca la app. */
  lookingFor: string
  /** Qué hacer en cambio, en una oración. */
  instead: string
  channels: readonly UsefulAppsNotAppChannel[]
  /** Página oficial donde se vieron los canales. */
  source: string
}

// Cada canal se vio en la página oficial que figura en `source` (abiertas el 30/9/2026). Los
// números de WhatsApp van en formato internacional (598 + el número sin el 0), que es lo que
// entiende wa.me. Orden: lo que más se busca primero.
export const USEFUL_APPS_NOT_APPS: readonly UsefulAppsNotApp[] = Object.freeze([
  {
    id: 'ose',
    name: 'OSE',
    lookingFor: 'Consultar la factura del agua o avisar una pérdida',
    instead:
      'OSE no tiene app: atiende por WhatsApp y por teléfono. Las apps llamadas «OSE» en las tiendas no son suyas.',
    channels: [
      { label: 'WhatsApp', value: '091 001 871', url: 'https://wa.me/59891001871' },
      { label: 'Teléfono', value: '0800 1871 (*1871 desde el celular)', url: 'tel:08001871' },
    ],
    source: 'https://www.ose.com.uy/',
  },
  {
    id: 'correo',
    name: 'Correo Uruguayo',
    lookingFor: 'Seguir un paquete o un envío',
    instead:
      'El Correo no tiene app: el seguimiento se hace gratis en su web, por WhatsApp o por teléfono.',
    channels: [
      {
        label: 'Seguimiento en la web',
        value: 'correo.com.uy',
        url: 'https://www.correo.com.uy/seguimientodeenvios',
      },
      { label: 'WhatsApp', value: '098 012 108', url: 'https://wa.me/59898012108' },
      { label: 'Teléfono', value: '0800 2108', url: 'tel:08002108' },
    ],
    source: 'https://www.correo.com.uy/seguimientodeenvios',
  },
  {
    id: 'recarga-stm',
    name: 'Recarga de la tarjeta STM',
    lookingFor: 'Recargar la tarjeta STM desde el celular',
    instead:
      'La recarga oficial es STM en línea, una web de la Intendencia: entrás con tu usuario gub.uy y activás la tarjeta una sola vez.',
    channels: [
      { label: 'STM en línea', value: 'stm.gub.uy', url: 'https://stm.gub.uy/app/mistm/cuenta/' },
    ],
    source: 'https://montevideo.gub.uy/stm-en-linea',
  },
  {
    id: 'id-uruguay',
    name: 'ID Uruguay',
    lookingFor: 'Crear o recuperar el usuario gub.uy',
    instead:
      'ID Uruguay es tu usuario de gub.uy y se maneja en la web; en el celular lo usás con la app gub.uy.',
    channels: [
      {
        label: 'Usuario gub.uy',
        value: 'mi.iduruguay.gub.uy',
        url: 'https://mi.iduruguay.gub.uy/',
      },
    ],
    source: 'https://mi.iduruguay.gub.uy/',
  },
  {
    id: 'toke',
    name: 'Toke',
    lookingFor: 'Pagar con QR en un comercio',
    instead:
      'Toke no se baja: es la red de pagos con QR que usás desde la app de tu banco o de tu billetera.',
    channels: [{ label: 'Qué es Toke', value: 'toke.uy', url: 'https://toke.uy/' }],
    source: 'https://toke.uy/',
  },
  {
    id: 'bhu',
    name: 'BHU',
    lookingFor: 'Pagar la cuota del préstamo del BHU',
    instead:
      'El BHU no tiene app: la cuota se paga en línea desde su web. La «Banco Hipotecario» de las tiendas es de Argentina.',
    channels: [{ label: 'Web del BHU', value: 'bhu.com.uy', url: 'https://www.bhu.com.uy/' }],
    source: 'https://www.bhu.com.uy/',
  },
])

export const USEFUL_APPS_CRITERIA: readonly string[] = Object.freeze([
  'Está hoy en Google Play o en el App Store de Uruguay: abrimos cada ficha.',
  'La publica la organización que presta el servicio. Si no, lo decimos arriba de todo y te mostramos la oficial.',
  'Le sirve a mucha gente que vive en Uruguay: quedan afuera las apps internas de funcionarios, los pilotos y las de nicho.',
  'Tiene mantenimiento: más de dos años sin una versión nueva la saca de la lista, salvo que sea la única oficial de su servicio, y entonces la tarjeta lo avisa.',
  'Nadie paga por aparecer ni hay enlaces de afiliados: cada botón lleva a la ficha oficial de la tienda.',
])

export const USEFUL_APPS_SAFETY: readonly string[] = Object.freeze([
  'Bajala desde el botón de la tarjeta o buscando el nombre exacto, y mirá el desarrollador: tiene que coincidir con el que ponemos en cada tarjeta.',
  'Desconfiá de las copias con nombres parecidos: en las tiendas hay apps llamadas «OSE» que no son de OSE y bancos de otros países con el nombre de uno de acá.',
  'Los bancos y los organismos no mandan apps por SMS, WhatsApp ni correo: instalá sólo desde Google Play o el App Store, nunca un archivo .apk.',
  'Todas las apps de este directorio se bajan gratis. Si una te pide pagar para instalarse, no es la oficial.',
  'Si ya instalaste una sospechosa y pusiste datos de tu banco, llamá al banco para bloquear el acceso y cambiá tus claves.',
])

/** Etiquetas de las guías propias que una tarjeta puede enlazar (`UsefulApp.guides`). */
export const USEFUL_APPS_GUIDE_LABELS: Readonly<Record<string, string>> = Object.freeze({
  '/factura-de-ute-uruguay': 'Cómo leer la factura de UTE',
  '/factura-de-ose-uruguay': 'Cómo leer la factura de OSE',
  '/que-pasa-si-no-pago-antel': 'Qué pasa si no pagás Antel',
  '/certificados-bps-uruguay': 'Certificados del BPS',
  '/fecha-de-cobro-bps-uruguay': 'Fechas de cobro del BPS',
  '/cuando-me-puedo-jubilar-uruguay': 'Cuándo te podés jubilar',
  '/suplemento-solidario-bps': 'Suplemento solidario del BPS',
  '/certificado-unico-dgi-uruguay': 'Certificado único de la DGI',
  '/declaracion-de-irpf-uruguay': 'Declaración de IRPF',
  '/devolucion-fonasa-uruguay': 'Devolución del FONASA',
  '/cuanto-sale-la-cedula-de-identidad-uruguaya': 'Cuánto sale la cédula',
  '/cuanto-sale-el-pasaporte-uruguayo': 'Cuánto sale el pasaporte',
  '/libreta-de-conducir-uruguay': 'Libreta de conducir',
  '/carne-de-salud-uruguay': 'Carné de salud',
  '/cambiar-de-mutualista-uruguay': 'Cambiar de mutualista',
  '/tickets-mutualistas-uruguay': 'Órdenes y tickets de las mutualistas',
  '/multas-de-transito-y-patente-uruguay': 'Multas de tránsito y patente',
  '/peajes-uruguay': 'Peajes: cuánto sale cada uno',
  '/precio-de-la-nafta-uruguay': 'Precio de la nafta',
  '/conviene-auto-moto-o-omnibus-uruguay': '¿Auto, moto u ómnibus?',
  '/mejores-bancos-uruguay': 'Los bancos, comparados',
  '/tarjetas-de-credito-uruguay': 'Tarjetas de crédito',
  '/tarjetas-de-debito-uruguay': 'Tarjetas de débito',
  '/descuentos-con-tarjeta-uruguay': 'Descuentos con tarjeta',
  '/descuento-de-iva-con-tarjeta-uruguay': 'Descuento de IVA con tarjeta',
  '/pagar-cuentas-con-tarjeta': 'Pagar cuentas con tarjeta',
  '/comisiones-mercado-pago-uruguay': 'Comisiones de Mercado Pago',
  '/cuenta-remunerada-uruguay': 'Cuentas que pagan interés',
  '/couriers-uruguay': 'Couriers: cuánto cobra cada uno',
  '/franquicia-aduana-uruguay': 'La franquicia de compras en el exterior',
  '/precios-de-supermercado-uruguay': 'Precios de supermercado',
  '/apps-economia-uruguay': 'Todas las apps de plata',
  '/apps-de-beneficios-uruguay': 'Apps y clubes de beneficios',
  '/estafas-uruguay': 'Estafas en Uruguay',
  '/clonacion-de-tarjetas-uruguay': 'Clonación de tarjetas',
  '/a-quien-le-reclamo-uruguay': 'A quién le reclamo',
  '/facturar-en-monotributo-uruguay': 'Facturar en monotributo',
})

export const USEFUL_APPS_FAQ: readonly FaqItem[] = Object.freeze([
  {
    id: 'apps-del-estado-que-tener',
    question: '¿Qué apps del Estado conviene tener en el celular?',
    answer:
      'Para casi todos: gub.uy (avisos antes de que venzan la cédula, el pasaporte y la libreta, y la historia clínica digital), BPS Personas (historia laboral, recibos y certificados), una identidad digital —TuID de Antel o Identidad Digital Abitab—, Emergencia 9-1-1 y UTE Clientes. Según tu caso suman la DGI, SUCIVE, Telepeaje, Cómo ir, GURI Familia, Mi Antel y la del BROU.',
  },
  {
    id: 'app-oficial-omnibus-montevideo',
    question: '¿Cuál es la app oficial del ómnibus en Montevideo?',
    answer:
      'Cómo ir, de la Intendencia de Montevideo: arma el viaje y muestra en el mapa dónde viene el ómnibus. La app «STM Montevideo», la más descargada, la hace un desarrollador independiente con los datos públicos del STM: sirve, pero no es de la Intendencia. La recarga oficial de la tarjeta STM es STM en línea, en la web de la Intendencia.',
  },
  {
    id: 'id-uruguay-app',
    question: '¿Hay una app de ID Uruguay?',
    answer:
      'No como app aparte: ID Uruguay es tu usuario de gub.uy y se gestiona en la web mi.iduruguay.gub.uy. En el celular lo usás con la app gub.uy. Para los trámites que piden más seguridad —la DGI o la historia clínica— hace falta una identidad digital: TuID de Antel o Identidad Digital Abitab.',
  },
  {
    id: 'como-saber-si-es-oficial',
    question: '¿Cómo sé si una app es la oficial?',
    answer:
      'Mirá quién la publica en la ficha de la tienda: en cada tarjeta ponemos el desarrollador tal cual figura en Google Play y en el App Store. A veces no es el nombre del organismo sino el de su área de sistemas: la Intendencia de Montevideo figura como «Montevideo DTI» en el App Store. Bajala desde el botón de la tarjeta, nunca desde un enlace que te llegó por mensaje.',
    link: { label: 'Estafas en Uruguay', to: '/estafas-uruguay' },
  },
  {
    id: 'apps-del-estado-son-gratis',
    question: '¿Las apps del Estado son gratis?',
    answer:
      'Sí: todas las apps de este directorio se bajan gratis, las del Estado y las privadas. Algunas sirven para pagar cosas —la factura de la luz, la patente, un pasaje—, pero instalarlas no cuesta nada.',
  },
  {
    id: 'ose-app',
    question: '¿OSE tiene app?',
    answer:
      'No. OSE no tiene app propia, y las que se llaman «OSE» en las tiendas no son de OSE. Para consultas y reclamos atiende por WhatsApp al 091 001 871 y por teléfono al 0800 1871 (*1871 desde el celular). La factura se paga como cualquier otra cuenta: en las redes de cobranza o desde la app de tu banco.',
    link: { label: 'Cómo leer la factura de OSE', to: '/factura-de-ose-uruguay' },
  },
  {
    id: 'actualizacion',
    question: '¿Cada cuánto se revisa este directorio?',
    answer:
      'La lista la revisamos a mano, ficha por ficha, y la fecha de la última revisión está en «Cómo elegimos». La nota, la cantidad de opiniones y la fecha de la última versión de cada app las leemos de Google Play y del App Store una vez por semana.',
  },
])
