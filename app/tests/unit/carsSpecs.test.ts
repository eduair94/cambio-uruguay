import { describe, expect, it } from 'vitest'
import {
  CAR_EQUIPMENT,
  CAR_EQUIPMENT_GROUPS,
  CAR_EQUIPMENT_LABELS,
  carEquipmentGroups,
  carHasSpecSheet,
  carSpecTables,
} from '../../utils/carsSpecs'
import type { PublicCarSpecs } from '../../utils/carsPublic'

const specs = (overrides: Partial<PublicCarSpecs> = {}): PublicCarSpecs => ({
  readAt: '2026-09-22T12:00:00.000Z',
  powerHp: 190,
  valvesPerCylinder: 4,
  gears: 6,
  drivetrain: '4x4',
  steering: 'electrica',
  fuelTankL: 58,
  trunkL: null,
  lengthMm: 4530,
  heightMm: 1655,
  widthMm: 1656,
  wheelbaseMm: 2465,
  seats: 5,
  equipment: ['abs', 'camara_retroceso', 'bluetooth', 'llantas_aleacion'],
  missing: ['piloto_automatico'],
  singleOwner: true,
  acceptsTrade: null,
  negotiable: null,
  mechanicalWarranty: null,
  factoryWarranty: null,
  ...overrides,
})

describe('carSpecTables', () => {
  it('lays the CR-V sheet out in three tables, formatted the Uruguayan way', () => {
    const tables = carSpecTables({
      specs: specs(),
      engine: '1.5',
      transmission: 'automatica',
      doors: 5,
    })
    expect(tables.mechanics).toEqual([
      { label: 'Motor', value: '1.5' },
      { label: 'Potencia', value: '190 hp' },
      { label: 'Válvulas por cilindro', value: '4' },
      { label: 'Caja', value: 'Automática, 6 marchas' },
      { label: 'Tracción', value: '4x4' },
      { label: 'Dirección', value: 'Eléctrica' },
      { label: 'Tanque', value: '58 L' },
    ])
    expect(tables.dimensions).toEqual([
      { label: 'Largo', value: '4.530 mm' },
      { label: 'Alto', value: '1.655 mm' },
      { label: 'Ancho', value: '1.656 mm' },
      { label: 'Distancia entre ejes', value: '2.465 mm' },
      { label: 'Plazas', value: '5' },
      { label: 'Puertas', value: '5' },
    ])
    expect(tables.deal).toEqual([{ label: 'Único dueño', value: 'Sí' }])
  })

  it('leaves out every row the sheet does not state, and the gearbox without a gear count', () => {
    const tables = carSpecTables({
      specs: specs({
        powerHp: null,
        valvesPerCylinder: null,
        gears: null,
        drivetrain: null,
        steering: null,
        fuelTankL: null,
        lengthMm: null,
        heightMm: null,
        widthMm: null,
        wheelbaseMm: null,
        seats: null,
        singleOwner: null,
        acceptsTrade: false,
        mechanicalWarranty: true,
        trunkL: 985,
      }),
      engine: null,
      transmission: 'manual',
      doors: null,
    })
    expect(tables.mechanics).toEqual([])
    expect(tables.dimensions).toEqual([{ label: 'Baúl', value: '985 L' }])
    expect(tables.deal).toEqual([
      { label: 'Acepta permuta', value: 'No' },
      { label: 'Garantía mecánica', value: 'Sí' },
    ])
  })

  it('is empty without a sheet', () => {
    expect(carSpecTables({ specs: null, engine: '1.5', transmission: 'manual', doors: 5 })).toEqual(
      {
        mechanics: [],
        dimensions: [],
        deal: [],
      }
    )
    expect(carHasSpecSheet({ specs: null, engine: '1.5', transmission: 'manual', doors: 5 })).toBe(
      false
    )
    expect(carHasSpecSheet({ specs: specs(), engine: null, transmission: null, doors: null })).toBe(
      true
    )
  })
})

describe('carEquipmentGroups', () => {
  it('groups what the sheet says, labelled, and drops groups it says nothing about', () => {
    expect(carEquipmentGroups(specs())).toEqual([
      { title: 'Seguridad', has: ['Frenos ABS', 'Cámara de retroceso'], lacks: [] },
      { title: 'Confort', has: [], lacks: ['Piloto automático'] },
      { title: 'Audio y conectividad', has: ['Bluetooth'], lacks: [] },
      { title: 'Exterior', has: ['Llantas de aleación'], lacks: [] },
    ])
    expect(carEquipmentGroups(specs({ equipment: [], missing: [] }))).toEqual([])
    expect(carEquipmentGroups(null)).toEqual([])
  })

  it('labels every key once and only once', () => {
    expect(new Set(CAR_EQUIPMENT).size).toBe(CAR_EQUIPMENT.length)
    for (const key of CAR_EQUIPMENT) expect(CAR_EQUIPMENT_LABELS[key]).toBeTruthy()
    expect(Object.keys(CAR_EQUIPMENT_LABELS).sort()).toEqual([...CAR_EQUIPMENT].sort())
    expect(CAR_EQUIPMENT_GROUPS.map(group => group.keys.length).reduce((a, b) => a + b)).toBe(
      CAR_EQUIPMENT.length
    )
  })
})
