// La ficha técnica del aviso en la página: etiquetas, grupos y las tablas que dibuja
// /autos-usados-uruguay/<key>. Los datos vienen tal cual la ficha del aviso los declara
// (classes/autos/specs.ts): acá no se estima nada y no hay "≈".
import { CAR_TRANSMISSION_LABELS } from './cars'
import type {
  PublicCarDrivetrain,
  PublicCarEquipment,
  PublicCarListing,
  PublicCarSpecs,
  PublicCarSteering,
} from './carsPublic'

export const CAR_DRIVETRAINS: readonly PublicCarDrivetrain[] = [
  'delantera',
  'trasera',
  '4x4',
  '4x2',
  'integral',
]
export const CAR_DRIVETRAIN_LABELS: Record<PublicCarDrivetrain, string> = {
  delantera: 'Delantera',
  trasera: 'Trasera',
  '4x4': '4x4',
  '4x2': '4x2',
  integral: 'Integral',
}
export const CAR_STEERINGS: readonly PublicCarSteering[] = [
  'hidraulica',
  'electrica',
  'asistida',
  'mecanica',
]
export const CAR_STEERING_LABELS: Record<PublicCarSteering, string> = {
  hidraulica: 'Hidráulica',
  electrica: 'Eléctrica',
  asistida: 'Asistida',
  mecanica: 'Mecánica',
}

export interface CarEquipmentGroup {
  title: string
  keys: readonly PublicCarEquipment[]
}
/** Los grupos en que se muestra el equipamiento; el orden de las claves es el de publicación. */
export const CAR_EQUIPMENT_GROUPS: readonly CarEquipmentGroup[] = [
  {
    title: 'Seguridad',
    keys: [
      'abs',
      'control_estabilidad',
      'control_traccion',
      'airbag_conductor',
      'airbag_pasajero',
      'isofix',
      'alarma',
      'blindado',
      'camara_retroceso',
      'sensor_estacionamiento',
      'estacionamiento_automatico',
      'sensor_lluvia',
      'faros_antiniebla',
      'faros_automaticos',
      'tercera_luz_freno',
      'alarma_luces',
    ],
  },
  {
    title: 'Confort',
    keys: [
      'aire_acondicionado',
      'climatizador',
      'piloto_automatico',
      'computadora_abordo',
      'cristales_electricos',
      'cierre_centralizado',
      'cierre_automatico_vidrios',
      'apertura_remota_baul',
      'tapizado_cuero',
      'asientos_calefaccionados',
      'techo_solar',
      'porta_vasos',
    ],
  },
  {
    title: 'Audio y conectividad',
    keys: [
      'bluetooth',
      'apple_carplay',
      'android_auto',
      'usb',
      'entrada_auxiliar',
      'am_fm',
      'cd',
      'dvd',
      'mp3',
      'comando_volante',
    ],
  },
  {
    title: 'Exterior',
    keys: [
      'llantas_aleacion',
      'porta_equipaje',
      'defensa_delantera',
      'desempanador_trasero',
      'limpia_luneta',
      'rueda_auxilio',
    ],
  },
]
/** Todas las claves de equipamiento que la API puede servir, en orden. */
export const CAR_EQUIPMENT: readonly PublicCarEquipment[] = CAR_EQUIPMENT_GROUPS.flatMap(
  group => group.keys
)
export const CAR_EQUIPMENT_LABELS: Record<PublicCarEquipment, string> = {
  abs: 'Frenos ABS',
  control_estabilidad: 'Control de estabilidad',
  control_traccion: 'Control de tracción',
  airbag_conductor: 'Airbag del conductor',
  airbag_pasajero: 'Airbag del acompañante',
  isofix: 'ISOFIX',
  alarma: 'Alarma',
  blindado: 'Blindado',
  camara_retroceso: 'Cámara de retroceso',
  sensor_estacionamiento: 'Sensores de estacionamiento',
  estacionamiento_automatico: 'Estacionamiento automático',
  sensor_lluvia: 'Sensor de lluvia',
  faros_antiniebla: 'Faros antiniebla',
  faros_automaticos: 'Faros con regulación automática',
  tercera_luz_freno: 'Tercera luz de freno LED',
  alarma_luces: 'Aviso de luces encendidas',
  aire_acondicionado: 'Aire acondicionado',
  climatizador: 'Climatizador',
  piloto_automatico: 'Piloto automático',
  computadora_abordo: 'Computadora de a bordo',
  cristales_electricos: 'Vidrios eléctricos',
  cierre_centralizado: 'Cierre centralizado',
  cierre_automatico_vidrios: 'Cierre automático de vidrios',
  apertura_remota_baul: 'Apertura remota del baúl',
  tapizado_cuero: 'Tapizado de cuero',
  asientos_calefaccionados: 'Asientos calefaccionados',
  techo_solar: 'Techo solar',
  porta_vasos: 'Portavasos',
  bluetooth: 'Bluetooth',
  apple_carplay: 'Apple CarPlay',
  android_auto: 'Android Auto',
  usb: 'Entrada USB',
  entrada_auxiliar: 'Entrada auxiliar',
  am_fm: 'Radio AM/FM',
  cd: 'CD',
  dvd: 'DVD',
  mp3: 'MP3',
  comando_volante: 'Comandos de radio en el volante',
  llantas_aleacion: 'Llantas de aleación',
  porta_equipaje: 'Portaequipaje en el techo',
  defensa_delantera: 'Defensa delantera',
  desempanador_trasero: 'Desempañador trasero',
  limpia_luneta: 'Limpia y lavaluneta',
  rueda_auxilio: 'Soporte para rueda de auxilio',
}

const carNumber = new Intl.NumberFormat('es-UY', { maximumFractionDigits: 1 })
const millimetres = (value: number | null): string | null =>
  value === null ? null : `${carNumber.format(value)} mm`
const litres = (value: number | null): string | null =>
  value === null ? null : `${carNumber.format(value)} L`
const yesNo = (value: boolean | null): string | null =>
  value === null ? null : value ? 'Sí' : 'No'

export interface CarSpecRow {
  label: string
  value: string
}
const rows = (entries: Array<[string, string | null]>): CarSpecRow[] =>
  entries
    .filter((entry): entry is [string, string] => entry[1] !== null)
    .map(([label, value]) => ({ label, value }))

export interface CarSpecTables {
  mechanics: CarSpecRow[]
  dimensions: CarSpecRow[]
  deal: CarSpecRow[]
}

/**
 * Las tres tablas de la ficha técnica: motor y mecánica, medidas y capacidad, condiciones del
 * aviso. Cada una queda vacía cuando la ficha no trae nada de eso; sin ficha, las tres.
 */
export function carSpecTables(
  car: Pick<PublicCarListing, 'specs' | 'engine' | 'transmission' | 'doors'>
): CarSpecTables {
  const specs = car.specs
  if (!specs) return { mechanics: [], dimensions: [], deal: [] }
  // La caja ya está arriba en la ficha; acá sólo vale la pena cuando la hoja suma las marchas.
  const gearbox = specs.gears
    ? car.transmission
      ? `${CAR_TRANSMISSION_LABELS[car.transmission]}, ${specs.gears} marchas`
      : `${specs.gears} marchas`
    : null
  return {
    mechanics: rows([
      ['Motor', car.engine ?? null],
      ['Potencia', specs.powerHp ? `${specs.powerHp} hp` : null],
      ['Válvulas por cilindro', specs.valvesPerCylinder ? String(specs.valvesPerCylinder) : null],
      ['Caja', gearbox],
      ['Tracción', specs.drivetrain ? CAR_DRIVETRAIN_LABELS[specs.drivetrain] : null],
      ['Dirección', specs.steering ? CAR_STEERING_LABELS[specs.steering] : null],
      ['Tanque', litres(specs.fuelTankL)],
    ]),
    dimensions: rows([
      ['Largo', millimetres(specs.lengthMm)],
      ['Alto', millimetres(specs.heightMm)],
      ['Ancho', millimetres(specs.widthMm)],
      ['Distancia entre ejes', millimetres(specs.wheelbaseMm)],
      ['Plazas', specs.seats ? String(specs.seats) : null],
      ['Puertas', car.doors ? String(car.doors) : null],
      ['Baúl', litres(specs.trunkL)],
    ]),
    deal: rows([
      ['Único dueño', yesNo(specs.singleOwner)],
      ['Acepta permuta', yesNo(specs.acceptsTrade)],
      ['Precio negociable', yesNo(specs.negotiable)],
      ['Garantía mecánica', yesNo(specs.mechanicalWarranty)],
      ['Garantía de fábrica', yesNo(specs.factoryWarranty)],
    ]),
  }
}

export interface CarEquipmentView {
  title: string
  /** Lo que la ficha marca con Sí. */
  has: string[]
  /** Lo que la ficha marca con No. */
  lacks: string[]
}

/** El equipamiento por grupo, etiquetado; un grupo del que la ficha no dice nada no aparece. */
export function carEquipmentGroups(specs: PublicCarSpecs | null | undefined): CarEquipmentView[] {
  if (!specs) return []
  return CAR_EQUIPMENT_GROUPS.map(group => ({
    title: group.title,
    has: group.keys
      .filter(key => specs.equipment.includes(key))
      .map(key => CAR_EQUIPMENT_LABELS[key]),
    lacks: group.keys
      .filter(key => specs.missing.includes(key))
      .map(key => CAR_EQUIPMENT_LABELS[key]),
  })).filter(group => group.has.length > 0 || group.lacks.length > 0)
}

/** Hay algo que mostrar como ficha técnica: alguna tabla o algún grupo de equipamiento. */
export function carHasSpecSheet(
  car: Pick<PublicCarListing, 'specs' | 'engine' | 'transmission' | 'doors'>
): boolean {
  const tables = carSpecTables(car)
  return (
    tables.mechanics.length > 1 ||
    tables.dimensions.length > 1 ||
    tables.deal.length > 0 ||
    carEquipmentGroups(car.specs).length > 0
  )
}
