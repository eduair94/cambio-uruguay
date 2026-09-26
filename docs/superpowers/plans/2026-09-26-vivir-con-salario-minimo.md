# Vivir con el salario mínimo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Página `/vivir-con-el-salario-minimo-uruguay` que busca en qué arreglos el líquido del salario mínimo cubre un mes austero y lista los avisos vigentes del directorio que entran.

**Architecture:** Una cuenta pura (`app/utils/minimumWage.ts`) calcula el techo de vivienda por forma y región con palancas explícitas; un util de servidor arma, una vez por cosecha, las filas de casas/aptos (catálogo de `/api/rentals/budget`) y habitaciones (consulta propia) con guarda de plausibilidad por cohorte; `GET /api/rentals/salario-minimo` filtra en memoria y responde; la página SSR lo muestra.

**Tech Stack:** Nuxt 4 / Vuetify 4 / Nitro (`defineCachedEventHandler`), mongoose, vitest.

**Spec:** `docs/superpowers/specs/2026-09-26-vivir-con-salario-minimo-design.md`

## Global Constraints

- Ninguna cifra nueva sin fuente: todo sale de `lowWage.ts`, `costOfLiving.ts`, `payroll.ts`, `aguinaldo.ts`, `salarioVacacional.ts`, `stateSupport.ts`, `rentalGuarantee.ts`, `housingAdvisorFigures.ts`. Única excepción declarada: el desglose de `COST_MODEL.utilitiesBase` (UTE 2.000, OSE 1.100, internet 1.650, celular 600), atado por test.
- Precios de avisos: ≤ $ 25.000, vigentes (`RENTAL_STALE_DAYS`), en UYU; habitaciones ≥ $ 3.000 y sin estadía corta.
- Guarda de plausibilidad: fuera bajo 0,3 × mediana de la cohorte (n ≥ 8), cohortes departamento×tipo×dormitorios(0,1,2,3+) → departamento×tipo → tipo nacional.
- El texto propio de los avisos se usa para las marcas y se descarta antes de responder.
- Copy en español rioplatense (vos), sin nombrar empresas en los ejemplos.
- `app/` se verifica en su propio worktree (`C:\Users\airau\Documents\GitHub\cu-salario-minimo`), nunca en el root compartido.
- Repo público: ninguna cifra de ingresos del sitio en nada versionado.

## Review Focus

1. Aviso de casa/apto con gastos comunes desconocidos → "cierra si los gastos comunes no pasan de $ X", nunca "cierra" a secas (test en Task 1).
2. Habitación que dice "baño compartido" o "cocina compartida" → NO es pieza compartida (test en Task 2).
3. Aviso a $ 3.500 de un 3 dormitorios en Maldonado → excluido por la guarda; Manga $ 10.500 1 dormitorio y Carmelo casa $ 6.500 → adentro (test en Task 2).
4. Query con valores basura (`forma=x`, `page=-3`, `caminar=si`) → defaults, sin error (test en Task 1).
5. Departamento elegido que no es Montevideo con forma `solo-montevideo` → 0 avisos y la tarjeta lo dice, sin romper (test en Task 2).

---

### Task 1: La cuenta pura

**Files:**
- Create: `app/utils/minimumWage.ts`
- Modify: `app/utils/rentalGuarantee.ts` (FGA Jóvenes: 40 % y 30 UR para grupos; export `FGA_JOVENES_MAX_INCOME_SHARE`)
- Test: `app/tests/unit/minimumWage.test.ts`

**Interfaces:**
- Produces:
  - `type Region = 'montevideo' | 'interior'`, `regionDe(department: string): Region`
  - `type FormaId = 'pieza' | 'solo-interior' | 'dos-sueldos' | 'solo-montevideo'`, `type TipoVivienda = 'habitacion' | 'casa' | 'apartamento'`, `FORMAS: readonly Forma[]`, `formaPorId(id)`
  - `interface Palancas { caminar; asse; aguinaldo; vacacional; sinInternet: boolean }`, `PALANCAS_TODAS`, `PALANCAS_NINGUNA`
  - `LIQUIDO_SMN`, `AGUINALDO_MENSUAL`, `VACACIONAL_MENSUAL`, `SERVICIOS_DESGLOSE`
  - `planDelMes(forma: FormaId, region: Region, palancas: Palancas): PlanDelMes`
  - `evaluarAviso(plan: PlanDelMes, aviso: AvisoParaEvaluar): Evaluacion`
  - `puertasDeEntrada(forma: FormaId, aviso: { tipo: TipoVivienda; alquiler: number; pension: boolean }, joven: boolean): PuertaId[]`
  - `normalizeMinimumWageQuery(input): MinimumWageQuery`, `minimumWageQueryToParams(q): Record<string, string>`
  - types `MinimumWageListing`, `MinimumWageItem`, `FormaResumen`, `MinimumWageResponse`

- [ ] **Step 1: Write the failing test** — `app/tests/unit/minimumWage.test.ts`

```ts
import { describe, expect, it } from 'vitest'
import {
  AGUINALDO_MENSUAL,
  FORMAS,
  LIQUIDO_SMN,
  PALANCAS_NINGUNA,
  PALANCAS_TODAS,
  SERVICIOS_DESGLOSE,
  VACACIONAL_MENSUAL,
  evaluarAviso,
  minimumWageQueryToParams,
  normalizeMinimumWageQuery,
  planDelMes,
  puertasDeEntrada,
  regionDe,
} from '../../utils/minimumWage'
import { COST_MODEL } from '../../utils/costOfLiving'
import { SMN_VIGENTE, TRANSPORTE_MES } from '../../utils/lowWage'
import { computePayroll } from '../../utils/payroll'
import { UR } from '../../utils/stateSupport'

describe('ingresos del salario mínimo', () => {
  it('parte del líquido del SMN vigente', () => {
    expect(LIQUIDO_SMN).toBe(computePayroll({ nominal: SMN_VIGENTE }).liquido)
    expect(LIQUIDO_SMN).toBeGreaterThan(20000)
    expect(LIQUIDO_SMN).toBeLessThan(21000)
  })
  it('el aguinaldo prorrateado es un doceavo del líquido de un sueldo', () => {
    expect(AGUINALDO_MENSUAL).toBeCloseTo(LIQUIDO_SMN / 12, 0)
  })
  it('el salario vacacional prorrateado son 20 jornales líquidos por año', () => {
    expect(VACACIONAL_MENSUAL).toBeCloseTo(((LIQUIDO_SMN / 30) * 20) / 12, -1)
  })
})

describe('desglose de servicios', () => {
  it('no pasa del total que usa el modelo del sitio', () => {
    const suma = Object.values(SERVICIOS_DESGLOSE).reduce((a, b) => a + b, 0)
    expect(suma).toBeLessThanOrEqual(COST_MODEL.utilitiesBase)
  })
})

describe('planDelMes', () => {
  it('pieza en Montevideo sin palancas: el techo es el líquido menos los gastos personales', () => {
    const plan = planDelMes('pieza', 'montevideo', PALANCAS_NINGUNA)
    const gastos =
      COST_MODEL.foodPerAdult * COST_MODEL.lifestyleFood.austero +
      SERVICIOS_DESGLOSE.celular +
      TRANSPORTE_MES +
      COST_MODEL.healthPerPerson +
      COST_MODEL.miscPerPerson * COST_MODEL.lifestyleMisc.austero
    expect(plan.ingreso).toBe(LIQUIDO_SMN)
    expect(plan.gasto).toBe(Math.round(gastos))
    expect(plan.techoPieza).toBe(LIQUIDO_SMN - Math.round(gastos))
    expect(plan.techoPieza).toBeLessThan(6000)
  })
  it('las palancas suben el techo exactamente lo que valen', () => {
    const sin = planDelMes('pieza', 'montevideo', PALANCAS_NINGUNA)
    const con = planDelMes('pieza', 'montevideo', PALANCAS_TODAS)
    const esperado =
      TRANSPORTE_MES -
      COST_MODEL.aPieBiciMonthly +
      COST_MODEL.healthPerPerson +
      AGUINALDO_MENSUAL +
      VACACIONAL_MENSUAL
    expect(con.techoPieza - sin.techoPieza).toBe(Math.round(esperado))
    expect(con.techoPieza).toBeGreaterThan(9000)
  })
  it('una casa paga además UTE y OSE, e internet sólo si no se renuncia', () => {
    const conInternet = planDelMes('solo-interior', 'interior', {
      ...PALANCAS_TODAS,
      sinInternet: false,
    })
    const sinInternet = planDelMes('solo-interior', 'interior', PALANCAS_TODAS)
    expect(sinInternet.servicio).toBe(SERVICIOS_DESGLOSE.ute + SERVICIOS_DESGLOSE.ose)
    expect(conInternet.servicio - sinInternet.servicio).toBe(SERVICIOS_DESGLOSE.internet)
    expect(sinInternet.techoVivienda).toBe(sinInternet.techoPieza - sinInternet.servicio)
  })
  it('el interior come y viaja más barato que Montevideo', () => {
    const mvd = planDelMes('solo-montevideo', 'montevideo', PALANCAS_NINGUNA)
    const int = planDelMes('solo-interior', 'interior', PALANCAS_NINGUNA)
    expect(int.gasto).toBeLessThan(mvd.gasto)
  })
  it('dos sueldos: el doble de ingreso y de gastos personales, servicios ×1,15', () => {
    const uno = planDelMes('solo-montevideo', 'montevideo', PALANCAS_TODAS)
    const dos = planDelMes('dos-sueldos', 'montevideo', PALANCAS_TODAS)
    expect(dos.ingreso).toBe(uno.ingreso * 2)
    expect(dos.gasto).toBe(uno.gasto * 2)
    expect(dos.servicio).toBe(
      Math.round(SERVICIOS_DESGLOSE.ute * 1.15) + Math.round(SERVICIOS_DESGLOSE.ose * 1.15)
    )
  })
})

describe('evaluarAviso', () => {
  const plan = planDelMes('solo-interior', 'interior', PALANCAS_TODAS)
  it('cierra cuando alquiler más gastos comunes conocidos entran en el techo', () => {
    const e = evaluarAviso(plan, {
      tipo: 'casa',
      alquiler: plan.techoVivienda - 1000,
      gastosComunes: 0,
      serviciosIncluidos: false,
    })
    expect(e).toEqual({ veredicto: 'cierra', costo: plan.techoVivienda - 1000, sobra: 1000, falta: null })
  })
  it('con gastos comunes desconocidos nunca dice "cierra" a secas', () => {
    const e = evaluarAviso(plan, {
      tipo: 'apartamento',
      alquiler: plan.techoVivienda - 700,
      gastosComunes: null,
      serviciosIncluidos: false,
    })
    expect(e.veredicto).toBe('cierra-si')
    expect(e.falta).toBe('gastos-comunes')
    expect(e.sobra).toBe(700)
  })
  it('no cierra si el alquiler solo ya pasa el techo', () => {
    const e = evaluarAviso(plan, {
      tipo: 'apartamento',
      alquiler: plan.techoVivienda + 1,
      gastosComunes: null,
      serviciosIncluidos: false,
    })
    expect(e.veredicto).toBe('no-cierra')
  })
  it('una pieza con servicios incluidos cierra; sin ese dato, cierra si', () => {
    const pieza = planDelMes('pieza', 'montevideo', PALANCAS_TODAS)
    const base = { tipo: 'habitacion' as const, alquiler: 8000, gastosComunes: null }
    expect(evaluarAviso(pieza, { ...base, serviciosIncluidos: true }).veredicto).toBe('cierra')
    const si = evaluarAviso(pieza, { ...base, serviciosIncluidos: false })
    expect(si.veredicto).toBe('cierra-si')
    expect(si.falta).toBe('servicios')
    expect(si.sobra).toBe(pieza.techoPieza - 8000)
  })
})

describe('puertasDeEntrada', () => {
  const tope40 = Math.floor(0.4 * SMN_VIGENTE)
  it('una pensión es hospedaje; otra pieza no tiene puerta publicada', () => {
    expect(puertasDeEntrada('pieza', { tipo: 'habitacion', alquiler: 9000, pension: true }, false)).toEqual(['hospedaje'])
    expect(puertasDeEntrada('pieza', { tipo: 'habitacion', alquiler: 9000, pension: false }, false)).toEqual([])
  })
  it('ANDA hasta el 40 % del nominal, y el régimen sin garantía siempre', () => {
    expect(puertasDeEntrada('solo-interior', { tipo: 'casa', alquiler: tope40, pension: false }, false)).toEqual(['anda', 'sin-garantia'])
    expect(puertasDeEntrada('solo-interior', { tipo: 'casa', alquiler: tope40 + 2, pension: false }, false)).toEqual(['sin-garantia'])
  })
  it('un solo mínimo no llega al FGA; dos sí', () => {
    const alquiler = 15000
    expect(puertasDeEntrada('solo-montevideo', { tipo: 'apartamento', alquiler, pension: false }, false)).not.toContain('fga')
    expect(puertasDeEntrada('dos-sueldos', { tipo: 'apartamento', alquiler, pension: false }, false)).toContain('fga')
    expect(2 * LIQUIDO_SMN).toBeGreaterThanOrEqual(15 * UR.valor)
  })
  it('FGA Jóvenes sólo si es joven, solo, y hasta el 40 % del líquido', () => {
    const tope = Math.floor(0.4 * LIQUIDO_SMN)
    const aviso = { tipo: 'apartamento' as const, alquiler: tope, pension: false }
    expect(puertasDeEntrada('solo-montevideo', aviso, true)).toContain('fga-jovenes')
    expect(puertasDeEntrada('solo-montevideo', aviso, false)).not.toContain('fga-jovenes')
    expect(puertasDeEntrada('solo-montevideo', { ...aviso, alquiler: tope + 2 }, true)).not.toContain('fga-jovenes')
    expect(puertasDeEntrada('dos-sueldos', aviso, true)).not.toContain('fga-jovenes')
  })
})

describe('query', () => {
  it('defaults: pieza, todas las palancas, página 1', () => {
    const q = normalizeMinimumWageQuery({})
    expect(q).toEqual({ forma: 'pieza', departamento: '', palancas: PALANCAS_TODAS, joven: false, page: 1 })
    expect(minimumWageQueryToParams(q)).toEqual({})
  })
  it('valores basura caen a los defaults', () => {
    const q = normalizeMinimumWageQuery({ forma: 'x', page: '-3', caminar: 'si', departamento: 42 })
    expect(q.forma).toBe('pieza')
    expect(q.page).toBe(1)
    expect(q.palancas.caminar).toBe(true)
    expect(q.departamento).toBe('')
  })
  it('ida y vuelta por la URL', () => {
    const q = normalizeMinimumWageQuery({
      forma: 'dos-sueldos',
      departamento: 'Salto',
      caminar: '0',
      asse: '0',
      joven: '1',
      page: '3',
    })
    expect(normalizeMinimumWageQuery(minimumWageQueryToParams(q))).toEqual(q)
  })
})

describe('formas y regiones', () => {
  it('las cuatro formas existen en orden de presentación', () => {
    expect(FORMAS.map(f => f.id)).toEqual(['pieza', 'solo-interior', 'dos-sueldos', 'solo-montevideo'])
  })
  it('regionDe ignora tildes y mayúsculas', () => {
    expect(regionDe('MONTEVIDEO')).toBe('montevideo')
    expect(regionDe('Paysandú')).toBe('interior')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && npx vitest run tests/unit/minimumWage.test.ts`
Expected: FAIL — "Failed to resolve import ../../utils/minimumWage".

- [ ] **Step 3: Write minimal implementation** — `app/utils/minimumWage.ts`

```ts
// /vivir-con-el-salario-minimo-uruguay: la cuenta que busca la forma de que el salario mínimo
// alcance, y la forma de la consulta que la cruza con los avisos vigentes del directorio.
//
// POR QUÉ EXISTE: /vivir-con-25000-pesos-uruguay contesta «¿alcanza?» con promedios del INE y
// concluye que solo, alquilando al promedio, no. Esta cuenta contesta la otra pregunta —¿de qué
// forma sí?— y la contesta con los avisos de hoy, no con un promedio.
//
// NO DECLARA CIFRAS: el salario, la comida, el boleto, los copagos, el aguinaldo, el salario
// vacacional, la UR y los topes de las garantías salen de los módulos que ya los mantienen con
// fuente y fecha. La única excepción es SERVICIOS_DESGLOSE, que es el desglose que el propio
// COST_MODEL.utilitiesBase escribe en su comentario, y un test lo ata a ese total.
//
// PURO: sin Vue ni Nuxt, para que lo usen la página, el endpoint y vitest.

import { COST_MODEL, INTERIOR_FOOD_FACTOR } from './costOfLiving'
import { SMN_VIGENTE, TRANSPORTE_MES } from './lowWage'
import { computePayroll } from './payroll'
import { aguinaldoFromCashSalaries } from './aguinaldo'
import { LICENCIA_BASE_DIAS, simularSalarioVacacional } from './salarioVacacional'
import { FGA, UR } from './stateSupport'
import { FGA_JOVENES_MAX_INCOME_SHARE, GUARANTEE_OPTIONS } from './rentalGuarantee'
import { HOUSING_GUARANTEE_CAPS } from './housingAdvisorFigures'
import type { RentalSource } from './rentals'

export const MINIMUM_WAGE_PATH = '/vivir-con-el-salario-minimo-uruguay'

export type Region = 'montevideo' | 'interior'
export type TipoVivienda = 'habitacion' | 'casa' | 'apartamento'
export type FormaId = 'pieza' | 'solo-interior' | 'dos-sueldos' | 'solo-montevideo'

const fold = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036F]/g, '')
    .toLocaleLowerCase('es')
    .trim()

export const regionDe = (department: string): Region =>
  fold(department) === 'montevideo' ? 'montevideo' : 'interior'

export const mismoDepartamento = (a: string, b: string): boolean => fold(a) === fold(b)

export interface Forma {
  id: FormaId
  titulo: string
  /** Quién vive así, en una línea. */
  quien: string
  tipos: readonly TipoVivienda[]
  regiones: readonly Region[]
  /** Personas del hogar; cada una cobra el mínimo. */
  personas: 1 | 2
}

/** En el orden en que la página las presenta: de la más barata de sostener a la más cara. */
export const FORMAS: readonly Forma[] = Object.freeze([
  {
    id: 'pieza',
    titulo: 'Una pieza',
    quien: 'Una habitación en una pensión, una residencia o un apartamento compartido.',
    tipos: ['habitacion'],
    regiones: ['montevideo', 'interior'],
    personas: 1,
  },
  {
    id: 'solo-interior',
    titulo: 'Solo, en el interior',
    quien: 'Una casa o un apartamento a tu nombre, fuera de Montevideo.',
    tipos: ['casa', 'apartamento'],
    regiones: ['interior'],
    personas: 1,
  },
  {
    id: 'dos-sueldos',
    titulo: 'Entre dos sueldos mínimos',
    quien: 'Una casa o un apartamento para dos personas que cobran el mínimo: pareja, amigos o hermanos.',
    tipos: ['casa', 'apartamento'],
    regiones: ['montevideo', 'interior'],
    personas: 2,
  },
  {
    id: 'solo-montevideo',
    titulo: 'Solo, en Montevideo',
    quien: 'Una casa o un apartamento a tu nombre en Montevideo.',
    tipos: ['casa', 'apartamento'],
    regiones: ['montevideo'],
    personas: 1,
  },
] as Forma[])

export function formaPorId(id: FormaId): Forma {
  return FORMAS.find(forma => forma.id === id) ?? FORMAS[0]!
}

// ─── Ingresos ────────────────────────────────────────────────────────────────

/** Líquido de un mes de salario mínimo: aportes e IRPF de `computePayroll`. */
export const LIQUIDO_SMN = computePayroll({ nominal: SMN_VIGENTE }).liquido

/**
 * El aguinaldo es la doceava parte de lo cobrado en el año (Ley 12.840): con el mínimo todo el año,
 * un sueldo nominal por año. Paga los mismos aportes, así que su líquido es el de un mes, y
 * prorrateado es un doceavo por mes. Se cobra en junio y en diciembre: sólo vale si se aparta.
 */
export const AGUINALDO_MENSUAL = Math.round(
  computePayroll({ nominal: aguinaldoFromCashSalaries(SMN_VIGENTE * 12) }).liquido / 12
)

/**
 * El salario vacacional mínimo (Ley 16.101): 20 jornales líquidos por año de licencia, sin aportes.
 * Recién se cobra con la licencia generada: el primer año de trabajo no lo trae.
 */
export const VACACIONAL_MENSUAL = Math.round(
  simularSalarioVacacional({ sueldoNominal: SMN_VIGENTE, diasDeLicencia: LICENCIA_BASE_DIAS })
    .neto / 12
)

// ─── Gastos ──────────────────────────────────────────────────────────────────

/**
 * El desglose que el comentario de COST_MODEL.utilitiesBase declara para su total de $ 8.500: lo
 * que no está acá es la parte de gastos comunes, que en esta cuenta sale de cada aviso.
 */
export const SERVICIOS_DESGLOSE = Object.freeze({ ute: 2000, ose: 1100, internet: 1650, celular: 600 })

/** Dos personas gastan un 15 % más que una en luz y agua (mismo factor que /vivir-con-25000). */
export const SERVICIOS_DOS_PERSONAS = 1.15

export interface Palancas {
  /** Ir a trabajar a pie o en bici en vez de ómnibus. */
  caminar: boolean
  /** Atenderse en ASSE por FONASA: sin órdenes ni tickets. */
  asse: boolean
  /** Apartar cada mes la doceava parte del aguinaldo. */
  aguinaldo: boolean
  /** Apartar cada mes la doceava parte del salario vacacional. */
  vacacional: boolean
  /** Arreglarse con los datos del celular, sin internet en la casa. */
  sinInternet: boolean
}

export const PALANCAS_TODAS: Palancas = Object.freeze({
  caminar: true,
  asse: true,
  aguinaldo: true,
  vacacional: true,
  sinInternet: true,
})
export const PALANCAS_NINGUNA: Palancas = Object.freeze({
  caminar: false,
  asse: false,
  aguinaldo: false,
  vacacional: false,
  sinInternet: false,
})
export const PALANCA_IDS = Object.keys(PALANCAS_TODAS) as (keyof Palancas)[]

export interface Linea {
  id: string
  label: string
  monto: number
}

export interface PlanDelMes {
  forma: FormaId
  region: Region
  personas: 1 | 2
  ingresos: Linea[]
  ingreso: number
  /** Gastos de las personas: comida, celular, transporte, salud y varios. */
  gastos: Linea[]
  gasto: number
  /** Servicios de una casa o un apartamento propio: luz, agua e internet si se paga. */
  servicios: Linea[]
  servicio: number
  /** Lo máximo que puede costar una pieza (su alquiler). */
  techoPieza: number
  /** Lo máximo que pueden costar alquiler más gastos comunes de una casa o un apartamento. */
  techoVivienda: number
}

const suma = (lineas: Linea[]) => lineas.reduce((total, linea) => total + linea.monto, 0)

export function planDelMes(formaId: FormaId, region: Region, palancas: Palancas): PlanDelMes {
  const forma = formaPorId(formaId)
  const n = forma.personas
  const interior = region === 'interior'
  const porPersona = (monto: number) => Math.round(monto) * n

  const ingresos: Linea[] = [{ id: 'liquido', label: 'Sueldo líquido', monto: LIQUIDO_SMN * n }]
  if (palancas.aguinaldo)
    ingresos.push({ id: 'aguinaldo', label: 'Aguinaldo, apartado por mes', monto: AGUINALDO_MENSUAL * n })
  if (palancas.vacacional)
    ingresos.push({
      id: 'vacacional',
      label: 'Salario vacacional, apartado por mes',
      monto: VACACIONAL_MENSUAL * n,
    })

  const gastos: Linea[] = [
    {
      id: 'comida',
      label: 'Comida (perfil austero)',
      monto: porPersona(
        COST_MODEL.foodPerAdult * COST_MODEL.lifestyleFood.austero * (interior ? INTERIOR_FOOD_FACTOR : 1)
      ),
    },
    { id: 'celular', label: 'Celular', monto: porPersona(SERVICIOS_DESGLOSE.celular) },
    {
      id: 'transporte',
      label: palancas.caminar ? 'A pie o en bici' : 'Ómnibus al trabajo',
      monto: porPersona(
        palancas.caminar
          ? COST_MODEL.aPieBiciMonthly
          : TRANSPORTE_MES * (interior ? COST_MODEL.interiorTransportFactor : 1)
      ),
    },
    {
      id: 'salud',
      label: palancas.asse ? 'Salud en ASSE (sin tickets)' : 'Órdenes y tickets',
      monto: porPersona(palancas.asse ? 0 : COST_MODEL.healthPerPerson),
    },
    {
      id: 'varios',
      label: 'Ropa, higiene y varios',
      monto: porPersona(COST_MODEL.miscPerPerson * COST_MODEL.lifestyleMisc.austero),
    },
  ]

  const factor = n === 2 ? SERVICIOS_DOS_PERSONAS : 1
  const servicios: Linea[] = [
    { id: 'ute', label: 'Luz (UTE)', monto: Math.round(SERVICIOS_DESGLOSE.ute * factor) },
    { id: 'ose', label: 'Agua (OSE)', monto: Math.round(SERVICIOS_DESGLOSE.ose * factor) },
  ]
  if (!palancas.sinInternet)
    servicios.push({ id: 'internet', label: 'Internet en la casa', monto: SERVICIOS_DESGLOSE.internet })

  const ingreso = suma(ingresos)
  const gasto = suma(gastos)
  const servicio = suma(servicios)
  return {
    forma: forma.id,
    region,
    personas: n,
    ingresos,
    ingreso,
    gastos,
    gasto,
    servicios,
    servicio,
    techoPieza: ingreso - gasto,
    techoVivienda: ingreso - gasto - servicio,
  }
}

// ─── Un aviso contra la cuenta ───────────────────────────────────────────────

export type Veredicto = 'cierra' | 'cierra-si' | 'no-cierra'
export type Falta = 'gastos-comunes' | 'servicios'

export interface AvisoParaEvaluar {
  tipo: TipoVivienda
  alquiler: number
  /** null = el aviso no publica sus gastos comunes con evidencia propia. */
  gastosComunes: number | null
  /** Sólo para piezas: el propio aviso dice que luz, agua o wifi van incluidos. */
  serviciosIncluidos: boolean
}

export interface Evaluacion {
  veredicto: Veredicto
  /** Lo que se sabe que cuesta por mes: alquiler más gastos comunes conocidos. */
  costo: number
  /** Techo menos costo. En `cierra-si`, lo máximo que puede costar lo que falta saber. */
  sobra: number
  falta: Falta | null
}

export function evaluarAviso(plan: PlanDelMes, aviso: AvisoParaEvaluar): Evaluacion {
  const pieza = aviso.tipo === 'habitacion'
  const techo = pieza ? plan.techoPieza : plan.techoVivienda
  const gastosComunes = pieza ? 0 : aviso.gastosComunes
  const costo = Math.round(aviso.alquiler + (gastosComunes ?? 0))
  const sobra = techo - costo
  const falta: Falta | null = pieza
    ? aviso.serviciosIncluidos
      ? null
      : 'servicios'
    : gastosComunes === null
      ? 'gastos-comunes'
      : null
  if (sobra < 0) return { veredicto: 'no-cierra', costo, sobra, falta }
  return { veredicto: falta ? 'cierra-si' : 'cierra', costo, sobra, falta }
}

// ─── Cómo entrar ─────────────────────────────────────────────────────────────

export type PuertaId = 'hospedaje' | 'anda' | 'fga' | 'fga-jovenes' | 'sin-garantia'

const topeUr = (id: string): number =>
  GUARANTEE_OPTIONS.find(option => option.id === id)?.maxRentUr ?? 0

/**
 * Qué garantías publican una regla que este hogar cumple para ESTE alquiler. No es una
 * aprobación: es la cuenta de los requisitos escritos. El régimen sin garantía (Ley 19.889) va
 * siempre porque es legal para cualquier alquiler, pero depende de que el dueño lo acepte.
 */
export function puertasDeEntrada(
  formaId: FormaId,
  aviso: { tipo: TipoVivienda; alquiler: number; pension: boolean },
  joven: boolean
): PuertaId[] {
  if (aviso.tipo === 'habitacion') return aviso.pension ? ['hospedaje'] : []
  const n = formaPorId(formaId).personas
  const nominal = SMN_VIGENTE * n
  const liquido = LIQUIDO_SMN * n
  const puertas: PuertaId[] = []
  if (aviso.alquiler <= HOUSING_GUARANTEE_CAPS.anda * nominal) puertas.push('anda')
  if (liquido >= FGA.ingresoMinUR * UR.valor && aviso.alquiler <= topeUr('fga') * UR.valor)
    puertas.push('fga')
  if (
    joven &&
    n === 1 &&
    aviso.alquiler <= Math.min(topeUr('fga-jovenes') * UR.valor, FGA_JOVENES_MAX_INCOME_SHARE * liquido)
  )
    puertas.push('fga-jovenes')
  puertas.push('sin-garantia')
  return puertas
}

// ─── La consulta ─────────────────────────────────────────────────────────────

export interface MinimumWageQuery {
  forma: FormaId
  departamento: string
  palancas: Palancas
  /** Tiene entre 18 y 29 años: sólo cambia qué garantías se muestran. */
  joven: boolean
  page: number
}

const PALANCA_PARAM: Record<keyof Palancas, string> = {
  caminar: 'caminar',
  asse: 'asse',
  aguinaldo: 'aguinaldo',
  vacacional: 'vacacional',
  sinInternet: 'sininternet',
}

const flag = (value: unknown, fallback: boolean): boolean =>
  value === '1' || value === 1 || value === true
    ? true
    : value === '0' || value === 0 || value === false
      ? false
      : fallback

export function normalizeMinimumWageQuery(input: Record<string, unknown> = {}): MinimumWageQuery {
  const forma = FORMAS.find(item => item.id === input.forma)?.id ?? 'pieza'
  const departamento =
    typeof input.departamento === 'string' ? input.departamento.trim().slice(0, 60) : ''
  const page = Number(input.page)
  const palancas = Object.fromEntries(
    PALANCA_IDS.map(id => [id, flag(input[PALANCA_PARAM[id]], PALANCAS_TODAS[id])])
  ) as unknown as Palancas
  return {
    forma,
    departamento,
    palancas,
    joven: flag(input.joven, false),
    page: Number.isInteger(page) && page > 0 ? Math.min(page, 500) : 1,
  }
}

export function minimumWageQueryToParams(query: MinimumWageQuery): Record<string, string> {
  const params: Record<string, string> = {}
  if (query.forma !== 'pieza') params.forma = query.forma
  if (query.departamento) params.departamento = query.departamento
  for (const id of PALANCA_IDS)
    if (query.palancas[id] !== PALANCAS_TODAS[id]) params[PALANCA_PARAM[id]] = query.palancas[id] ? '1' : '0'
  if (query.joven) params.joven = '1'
  if (query.page > 1) params.page = String(query.page)
  return params
}

// ─── Lo que devuelve /api/rentals/salario-minimo ─────────────────────────────

export type Restriccion = 'mujeres' | 'hombres' | 'estudiantes'

export interface MinimumWageListing {
  key: string
  title: string
  tipo: TipoVivienda
  department: string
  neighborhood: string
  bedrooms: number | null
  area: number | null
  alquiler: number
  gastosComunes: number | null
  source: RentalSource
  image: string | null
  lastSeen: string
  serviciosIncluidos: boolean
  piezaCompartida: boolean
  pension: boolean
  restriccion: Restriccion | null
}

export interface MinimumWageItem extends MinimumWageListing {
  evaluacion: Evaluacion
  puertas: PuertaId[]
}

export interface FormaResumen {
  id: FormaId
  /** Avisos que cierran con todo el dato a la vista. */
  cierran: number
  /** Avisos que cierran si lo que falta saber no pasa de lo que sobra. */
  condicionados: number
  /** El costo más bajo entre los que cierran o cierran si. */
  desde: number | null
  porDepartamento: { department: string; count: number }[]
  /** Lo mismo sin ninguna palanca: cuánto movieron las decisiones. */
  sinPalancas: number
}

export interface MinimumWageResponse {
  generatedAt: string
  /** Fecha de la foto semanal contra la que se midió la plausibilidad; null si no estaba. */
  analysisAt: string | null
  query: MinimumWageQuery
  /** La cuenta de la forma elegida, una por región que abarca. */
  planes: PlanDelMes[]
  formas: FormaResumen[]
  items: MinimumWageItem[]
  total: number
  page: number
  pages: number
  /** Avisos que no se muestran porque su precio no puede ser el de esa vivienda. */
  excluidosPorPrecio: number
  departamentos: string[]
}
```

- [ ] **Step 4: Add the FGA Jóvenes rule** — in `app/utils/rentalGuarantee.ts`, after `export const RENTAL_GUARANTEE_VERIFIED_AT`:

```ts
/**
 * FGA Jóvenes: «El monto máximo para alquilar es de 22,5 UR y no puede superar el 40 % de el/los
 * ingresos» (ANV, leído el 2026-09-26). Sin mínimo individual; en grupos, 30 UR colectivas.
 */
export const FGA_JOVENES_MAX_INCOME_SHARE = 0.4
```

and in the `fga-jovenes` option's `requirements`, after the income line:

```ts
      'El alquiler no puede superar las 22,5 UR ni el 40 % de los ingresos.',
      'En grupos (hasta 5 personas), el ingreso colectivo mínimo es de 30 UR.',
```

- [ ] **Step 5: Run tests** — `cd app && npx vitest run tests/unit/minimumWage.test.ts tests/unit/rentalGuarantee*.test.ts` → PASS (fix any guarantee test that pins the requirement count).

- [ ] **Step 6: Commit**

```bash
git add app/utils/minimumWage.ts app/utils/rentalGuarantee.ts app/tests/unit/minimumWage.test.ts
git commit -m "feat(salario-minimo): la cuenta que busca la forma de que el mínimo alcance"
```

### Task 2: Las filas del directorio y la consulta

**Files:**
- Create: `app/server/utils/minimumWageRentals.ts`
- Test: `app/tests/unit/minimumWageRentals.test.ts`

**Interfaces:**
- Consumes: todo lo de Task 1; `loadRentalBudgetCatalogue`, `selectRentalBudgetOffer` (`server/utils/rentalBudget.ts`); `loadRentalAnalysisCatalogue` (`server/utils/rentalAnalysis.ts`); `loadRentalAvailabilityIndex` (`server/utils/rentalAvailability.ts`); `rentalPeriodEvidence` (`utils/rentalEligibility.ts`); `rentalAvailabilityAdvertId`, `rentalAvailabilityHidden` (`utils/rentalAvailability.ts`).
- Produces:
  - `roomTextFlags(title: string, description: string): { serviciosIncluidos; piezaCompartida; pension: boolean; restriccion: Restriccion | null }`
  - `cohortMedians(rows: CohortInput[]): Map<string, number>`, `plausibleRent(row: CohortInput, medians): boolean`
  - `rowsFromBudgetProperties(properties: RentalPublicProperty[], usdUyu: number): MinimumWageRow[]`
  - `rowsFromRoomProperties(properties: RoomRawProperty[]): MinimumWageRow[]`
  - `buildMinimumWageDataset(input: { generatedAt; analysisAt; budget: MinimumWageRow[]; rooms: MinimumWageRow[]; analysisListings: CohortInput[] | null }): MinimumWageDataset`
  - `queryMinimumWage(dataset: MinimumWageDataset, input: Record<string, unknown>, hidden: (advertId: string) => boolean): MinimumWageResponse`
  - `loadMinimumWage(input: Record<string, unknown>): Promise<MinimumWageResponse>`

- [ ] **Step 1: Write the failing test** — `app/tests/unit/minimumWageRentals.test.ts`

```ts
import { describe, expect, it } from 'vitest'
import {
  buildMinimumWageDataset,
  cohortMedians,
  plausibleRent,
  queryMinimumWage,
  roomTextFlags,
  rowsFromBudgetProperties,
  rowsFromRoomProperties,
  type MinimumWageRow,
} from '../../server/utils/minimumWageRentals'
import { PALANCAS_TODAS, planDelMes } from '../../utils/minimumWage'

const row = (changes: Partial<MinimumWageRow> = {}): MinimumWageRow => ({
  key: 'k1',
  title: 'Aviso',
  tipo: 'habitacion',
  department: 'Montevideo',
  neighborhood: 'Centro',
  bedrooms: null,
  area: null,
  alquiler: 8000,
  gastosComunes: null,
  source: 'facebook',
  image: null,
  lastSeen: '2026-09-26',
  serviciosIncluidos: true,
  piezaCompartida: false,
  pension: true,
  restriccion: null,
  advertId: 'rent:facebook:1',
  ...changes,
})

describe('roomTextFlags', () => {
  it('lee servicios incluidos en sus formas frecuentes', () => {
    expect(roomTextFlags('Alquilo habitaciónes con luz agua y wifi incluidos', '').serviciosIncluidos).toBe(true)
    expect(roomTextFlags('Residencia', 'Todo incluido en el precio.').serviciosIncluidos).toBe(true)
    expect(roomTextFlags('Pieza', 'con gastos incluidos, a sr mayor solo').serviciosIncluidos).toBe(true)
    expect(roomTextFlags('Pieza', 'Luz y wifi en el precio').serviciosIncluidos).toBe(true)
    expect(roomTextFlags('Pieza', 'Servicios no incluidos.').serviciosIncluidos).toBe(false)
    expect(roomTextFlags('Pieza', 'No incluye luz ni agua').serviciosIncluidos).toBe(false)
  })
  it('baño o cocina compartida no es pieza compartida', () => {
    expect(roomTextFlags('Habitación individual', 'baño compartido, cocina compartida').piezaCompartida).toBe(false)
    expect(roomTextFlags('Alquilo Habitaciones Compartidas A Media Cuadra De 18 De Julio', '').piezaCompartida).toBe(true)
    expect(roomTextFlags('Residencia', 'camas en habitación de 4, cuchetas').piezaCompartida).toBe(true)
  })
  it('pensión o residencia en el título', () => {
    expect(roomTextFlags('Residencia Estudiantil Femenina', '').pension).toBe(true)
    expect(roomTextFlags('Habitación en alquiler en pensión centro', '').pension).toBe(true)
    expect(roomTextFlags('Alquiler habitación en apto compartido', '').pension).toBe(false)
    expect(roomTextFlags('Alquiler+de+habitación+', '').pension).toBe(false)
  })
  it('restricciones: sólo lo que el aviso dice, y "chicos y chicas" no restringe', () => {
    expect(roomTextFlags('Residencia Estudiantil Femenina', '').restriccion).toBe('mujeres')
    expect(roomTextFlags('Habitación en alquiler ( para hombre )', '').restriccion).toBe('hombres')
    expect(roomTextFlags('Residencia Masculina A Dos Cuadras De 18', '').restriccion).toBe('hombres')
    expect(roomTextFlags('Residencia Estudiantil En El Centro', '').restriccion).toBe('estudiantes')
    expect(roomTextFlags('Residencia', 'para chicos y chicas del interior').restriccion).toBe(null)
    expect(roomTextFlags('Alquilo habitación', 'zona centro').restriccion).toBe(null)
  })
})

describe('plausibilidad por cohorte', () => {
  const cohort = (department: string, type: string, bedrooms: number | null, prices: number[]) =>
    prices.map(price => ({ department, type, bedrooms, price }))
  const medians = cohortMedians([
    ...cohort('Maldonado', 'apartamento', 3, [40000, 40000, 38000, 45000, 41000, 39000, 50000, 36000]),
    ...cohort('Montevideo', 'apartamento', 1, [27500, 27500, 26000, 29000, 30000, 25000, 27000, 28000]),
    ...cohort('Colonia', 'casa', 1, [14200, 14200, 13000, 15000, 16000, 12000, 14000, 14500]),
  ])
  it('saca el 3 dormitorios de Maldonado a $ 3.500 y deja los baratos reales', () => {
    expect(plausibleRent({ department: 'Maldonado', type: 'apartamento', bedrooms: 3, price: 3500 }, medians)).toBe(false)
    expect(plausibleRent({ department: 'Montevideo', type: 'apartamento', bedrooms: 1, price: 10500 }, medians)).toBe(true)
    expect(plausibleRent({ department: 'Colonia', type: 'casa', bedrooms: 1, price: 6500 }, medians)).toBe(true)
  })
  it('cae a departamento×tipo y a tipo nacional; sin cohorte, se abstiene y deja pasar', () => {
    expect(plausibleRent({ department: 'Maldonado', type: 'apartamento', bedrooms: 2, price: 3500 }, medians)).toBe(false)
    expect(plausibleRent({ department: 'Rocha', type: 'apartamento', bedrooms: 1, price: 3500 }, medians)).toBe(false)
    expect(plausibleRent({ department: 'Rocha', type: 'habitacion', bedrooms: null, price: 3500 }, medians)).toBe(true)
  })
  it('una cohorte de menos de 8 no decide', () => {
    const chica = cohortMedians(cohort('Flores', 'casa', 1, [20000, 20000, 20000]))
    expect(plausibleRent({ department: 'Flores', type: 'casa', bedrooms: 1, price: 3000 }, chica)).toBe(true)
  })
})

describe('filas', () => {
  it('casas y apartamentos: la oferta más barata, con sus gastos comunes propios', () => {
    const rows = rowsFromBudgetProperties(
      [
        {
          key: 'p1',
          title: 'Casa',
          propertyType: 'casa',
          department: 'Colonia',
          neighborhood: 'Carmelo',
          bedrooms: 1,
          area: 40,
          lastSeen: '2026-09-26',
          offers: [
            { source: 'infocasas', listingId: '9', title: 'Casa en Carmelo', price: 7000, priceUyu: 7000, currency: 'UYU', commonExpenses: null, commonExpensesCurrency: null, image: null, lastSeen: '2026-09-26' },
            { source: 'elpais', listingId: '8', title: 'Casa en Carmelo', price: 6500, priceUyu: 6500, currency: 'UYU', commonExpenses: 0, commonExpensesCurrency: 'UYU', image: 'x.jpg', lastSeen: '2026-09-26' },
          ],
        },
      ] as never,
      41.5
    )
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ key: 'p1', tipo: 'casa', alquiler: 6500, gastosComunes: 0, source: 'elpais', advertId: 'rent:elpais:8', pension: false })
  })
  it('habitaciones: descarta dólares, menos de $ 3.000 y estadías cortas; marca desde el texto propio', () => {
    const base = { key: 'h1', title: 'Pieza', propertyType: 'habitacion', department: 'Montevideo', neighborhood: 'Cordón', bedrooms: null, area: null, lastSeen: '2026-09-26' }
    const offer = (changes: Record<string, unknown>) => ({ source: 'mercadolibre', listingId: 'MLU1', title: 'Residencia Estudiantil Femenina', price: 9000, priceUyu: 9000, currency: 'UYU', commonExpenses: null, commonExpensesCurrency: null, image: null, lastSeen: '2026-09-26', details: { description: 'luz, agua y wifi incluidos' }, ...changes })
    const rows = rowsFromRoomProperties([
      { ...base, offers: [offer({})] },
      { ...base, key: 'h2', offers: [offer({ currency: 'USD', price: 300 })] },
      { ...base, key: 'h3', offers: [offer({ price: 2500, priceUyu: 2500 })] },
      { ...base, key: 'h4', offers: [offer({ title: 'Habitación por día', details: { description: '$ 900 por noche' } })] },
    ] as never)
    expect(rows.map(r => r.key)).toEqual(['h1'])
    expect(rows[0]).toMatchObject({ serviciosIncluidos: true, pension: true, restriccion: 'mujeres', alquiler: 9000 })
    expect(JSON.stringify(rows[0])).not.toContain('incluidos')
  })
})

describe('queryMinimumWage', () => {
  const pieza = planDelMes('pieza', 'montevideo', PALANCAS_TODAS)
  const dataset = buildMinimumWageDataset({
    generatedAt: '2026-09-26T00:00:00Z',
    analysisAt: '2026-09-19T00:00:00Z',
    budget: [
      row({ key: 'c1', tipo: 'casa', department: 'Colonia', alquiler: 6500, gastosComunes: 0, pension: false, advertId: 'rent:elpais:8', bedrooms: 1 }),
      row({ key: 'c2', tipo: 'apartamento', department: 'Maldonado', alquiler: 3500, pension: false, advertId: 'rent:infocasas:2', bedrooms: 3 }),
      row({ key: 'c3', tipo: 'apartamento', department: 'Montevideo', alquiler: 24000, pension: false, advertId: 'rent:infocasas:3', bedrooms: 1 }),
    ],
    rooms: [
      row({ key: 'r1', alquiler: 7500 }),
      row({ key: 'r2', alquiler: pieza.techoPieza + 1, advertId: 'rent:facebook:2' }),
      row({ key: 'r3', alquiler: 9000, serviciosIncluidos: false, advertId: 'rent:facebook:3' }),
    ],
    analysisListings: [
      ...Array.from({ length: 8 }, () => ({ department: 'Maldonado', type: 'apartamento', bedrooms: 3, price: 40000 })),
      ...Array.from({ length: 8 }, () => ({ department: 'Colonia', type: 'casa', bedrooms: 1, price: 14200 })),
    ],
  })
  const none = () => false

  it('excluye por precio imposible y lo cuenta', () => {
    expect(dataset.excluidosPorPrecio).toBe(1)
    expect(dataset.rows.map(r => r.key)).not.toContain('c2')
  })
  it('pieza: las que entran, primero las que cierran sin dato faltante', () => {
    const response = queryMinimumWage(dataset, {}, none)
    expect(response.items.map(i => i.key)).toEqual(['r1', 'r3'])
    expect(response.items[1]!.evaluacion.veredicto).toBe('cierra-si')
    expect(response.items[0]!.puertas).toEqual(['hospedaje'])
    const resumen = response.formas.find(f => f.id === 'pieza')!
    expect(resumen).toMatchObject({ cierran: 1, condicionados: 1, desde: 7500 })
    expect(resumen.sinPalancas).toBe(0)
    expect(response.planes.map(p => p.region)).toEqual(['montevideo', 'interior'])
  })
  it('solo en el interior encuentra la casa de Colonia; solo en Montevideo, ninguna', () => {
    const interior = queryMinimumWage(dataset, { forma: 'solo-interior' }, none)
    expect(interior.items.map(i => i.key)).toEqual(['c1'])
    expect(interior.planes.map(p => p.region)).toEqual(['interior'])
    expect(interior.formas.find(f => f.id === 'solo-montevideo')!.cierran).toBe(0)
  })
  it('un departamento que no corresponde a la forma da cero sin romper', () => {
    const response = queryMinimumWage(dataset, { forma: 'solo-montevideo', departamento: 'Salto' }, none)
    expect(response.total).toBe(0)
    expect(response.items).toEqual([])
  })
  it('un aviso reportado como no disponible no se muestra', () => {
    const response = queryMinimumWage(dataset, {}, id => id === 'rent:facebook:1')
    expect(response.items.map(i => i.key)).toEqual(['r3'])
  })
  it('lista los departamentos con avisos de los tipos de la forma', () => {
    expect(queryMinimumWage(dataset, { forma: 'dos-sueldos' }, none).departamentos).toEqual(['Colonia', 'Montevideo'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails** — `cd app && npx vitest run tests/unit/minimumWageRentals.test.ts` → FAIL (module not found).

- [ ] **Step 3: Write the implementation** — `app/server/utils/minimumWageRentals.ts`

```ts
// Las filas de /vivir-con-el-salario-minimo-uruguay: casas, apartamentos y habitaciones vigentes
// del directorio, normalizadas UNA vez por cosecha y filtradas en memoria por pedido.
//
// Casas y apartamentos salen del catálogo de /api/rentals/budget tal cual (elegibilidad propia,
// gastos comunes sólo con evidencia propia). Las habitaciones, que ese catálogo no incluye, salen
// de una consulta propia. Del texto de cada pieza se leen cuatro marcas y el texto se descarta.
//
// LA GUARDA DE PLAUSIBILIDAD existe porque el filtro de elegibilidad deja pasar precios que no
// pueden ser el de esa vivienda: el 26/9/2026 había apartamentos de lujo de 3 dormitorios en
// Playa Mansa publicados a "$ 3.500" (0,09 de la mediana de su cohorte). Los baratos de verdad
// medidos ese día daban 0,38 (Manga, 1 dormitorio) y 0,46 (Carmelo, casa): el umbral es 0,3.

import type { PipelineStage } from 'mongoose'
import {
  RENTAL_COLLATION,
  RENTAL_STALE_DAYS,
  rentalPublicStages,
  type RentalOffer,
  type RentalPublicProperty,
} from '../../utils/rentals'
import { rentalPeriodEvidence } from '../../utils/rentalEligibility'
import {
  rentalAvailabilityAdvertId,
  rentalAvailabilityHidden,
} from '../../utils/rentalAvailability'
import {
  FORMAS,
  PALANCAS_NINGUNA,
  evaluarAviso,
  mismoDepartamento,
  normalizeMinimumWageQuery,
  planDelMes,
  puertasDeEntrada,
  regionDe,
  type Forma,
  type FormaResumen,
  type MinimumWageItem,
  type MinimumWageListing,
  type MinimumWageResponse,
  type Palancas,
  type PlanDelMes,
  type Region,
  type Restriccion,
  type TipoVivienda,
} from '../../utils/minimumWage'
import { RentalListingModel } from '../models/RentalListing'
import { RentalMetaModel } from '../models/RentalMeta'
import { connectDb } from './db'
import { loadRentalAnalysisCatalogue } from './rentalAnalysis'
import { loadRentalAvailabilityIndex } from './rentalAvailability'
import { loadRentalBudgetCatalogue, selectRentalBudgetOffer } from './rentalBudget'
import { rentalPublicPropertyProjection } from './rentalDetail'

export const MAX_PRICE = 25_000
export const MIN_ROOM_PRICE = 3_000
export const PLAUSIBLE_MIN_RATIO = 0.3
export const COHORT_MIN_N = 8
const MAX_ROOMS = 5_000
const PER_PAGE = 24

export interface MinimumWageRow extends MinimumWageListing {
  /** Id de disponibilidad de la oferta elegida: los reportes de la comunidad la esconden. */
  advertId: string
}

export interface MinimumWageDataset {
  generatedAt: string
  analysisAt: string | null
  rows: MinimumWageRow[]
  excluidosPorPrecio: number
}

// ─── Marcas del texto propio ─────────────────────────────────────────────────

const fold = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036F]/g, '')
    .toLowerCase()
    .replace(/\+/g, ' ')
    .replace(/\s+/g, ' ')

const INCLUIDOS =
  /\b(?:servicios|luz|agua|wifi|internet|gastos|ute|ose)\b[^.\n]{0,40}?\bincluid[oa]s?\b|\btodo incluido\b|\bincluye (?:la )?(?:luz|agua|wifi|internet|servicios|gastos)\b|\b(?:luz|agua|wifi)\b[^.\n]{0,30}?\ben el precio\b/g
const NO_INCLUIDOS = /\bno (?:estan |van |son )?incluid[oa]s?\b|\bno incluye\b/

const COMPARTIDA =
  /\b(?:habitacion(?:es)?|piezas?|cuartos?|dormitorios?) compartid[oa]s?\b|\bcamas? en (?:habitacion|pieza|cuarto|dormitorio)\b|\bcuchetas?\b|\bliteras?\b|\bindividuales? y compartid[oa]s?\b/
const PENSION = /\b(?:pension|residencia|alojamiento|hostel|hogar estudiantil)\b/
const MIXTO = /\b(?:chicos y chicas|chicas y chicos|hombres y mujeres|mujeres y hombres|mixt[ao]s?)\b/
const MUJERES =
  /\b(?:femenin[ao]s?|(?:solo |solamente |exclusivo )?(?:para |a )(?:mujeres|chicas|senoritas|damas|una mujer|mujer sola|senora sola))\b/
const HOMBRES =
  /\b(?:masculin[ao]s?|(?:solo |solamente |exclusivo )?(?:para |a )(?:hombres?|varones|caballeros|sr|senor)(?: solo)?|hombre solo)\b/
const ESTUDIANTES = /\b(?:estudiantil|estudiantes|universitari[ao]s)\b/

export function roomTextFlags(
  title: string,
  description: string
): { serviciosIncluidos: boolean; piezaCompartida: boolean; pension: boolean; restriccion: Restriccion | null } {
  const heading = fold(title)
  const text = `${heading}\n${fold(description).slice(0, 20_000)}`
  let serviciosIncluidos = false
  for (const match of text.matchAll(INCLUIDOS)) {
    const around = text.slice(Math.max(0, (match.index ?? 0) - 25), (match.index ?? 0) + match[0].length + 5)
    if (!NO_INCLUIDOS.test(around)) serviciosIncluidos = true
  }
  const mixto = MIXTO.test(text)
  const restriccion: Restriccion | null =
    !mixto && MUJERES.test(text)
      ? 'mujeres'
      : !mixto && HOMBRES.test(text)
        ? 'hombres'
        : ESTUDIANTES.test(heading)
          ? 'estudiantes'
          : null
  return {
    serviciosIncluidos,
    piezaCompartida: COMPARTIDA.test(text),
    pension: PENSION.test(heading),
    restriccion,
  }
}

// ─── Plausibilidad ───────────────────────────────────────────────────────────

export interface CohortInput {
  department: string
  type: string
  bedrooms: number | null
  price: number
}

const bucket = (bedrooms: number | null) =>
  bedrooms === null || !Number.isFinite(bedrooms) ? null : bedrooms >= 3 ? '3' : String(Math.max(0, Math.floor(bedrooms)))

function cohortKeys(row: Omit<CohortInput, 'price'>): string[] {
  const department = fold(row.department).trim()
  const b = bucket(row.bedrooms)
  return [
    ...(b === null ? [] : [`${department}|${row.type}|${b}`]),
    `${department}|${row.type}`,
    `*|${row.type}`,
  ]
}

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2
}

export function cohortMedians(rows: CohortInput[]): Map<string, number> {
  const groups = new Map<string, number[]>()
  for (const row of rows) {
    if (!(Number.isFinite(row.price) && row.price > 0)) continue
    for (const key of cohortKeys(row)) {
      const list = groups.get(key)
      if (list) list.push(row.price)
      else groups.set(key, [row.price])
    }
  }
  const medians = new Map<string, number>()
  for (const [key, values] of groups) if (values.length >= COHORT_MIN_N) medians.set(key, median(values))
  return medians
}

/** La primera cohorte con muestra decide; sin ninguna, se abstiene y el aviso queda. */
export function plausibleRent(row: CohortInput, medians: Map<string, number>): boolean {
  for (const key of cohortKeys(row)) {
    const value = medians.get(key)
    if (value !== undefined) return row.price >= PLAUSIBLE_MIN_RATIO * value
  }
  return true
}

// ─── Filas ───────────────────────────────────────────────────────────────────

export function rowsFromBudgetProperties(
  properties: RentalPublicProperty[],
  usdUyu: number
): MinimumWageRow[] {
  const rows: MinimumWageRow[] = []
  for (const property of properties) {
    if (property.propertyType !== 'casa' && property.propertyType !== 'apartamento') continue
    const selected = selectRentalBudgetOffer(property.offers, 'rent', usdUyu)
    if (!selected || selected.budget.rentUyu > MAX_PRICE) continue
    const advertId = rentalAvailabilityAdvertId(selected.offer.source, selected.offer.listingId)
    if (!advertId) continue
    rows.push({
      key: property.key,
      title: selected.offer.title || property.title,
      tipo: property.propertyType,
      department: property.department || '',
      neighborhood: property.neighborhood || '',
      bedrooms: property.bedrooms ?? null,
      area: property.area ?? null,
      alquiler: Math.round(selected.budget.rentUyu),
      gastosComunes:
        selected.budget.expensesUyu === null ? null : Math.round(selected.budget.expensesUyu),
      source: selected.offer.source,
      image: selected.offer.image ?? null,
      lastSeen: selected.offer.lastSeen,
      serviciosIncluidos: false,
      piezaCompartida: false,
      pension: false,
      restriccion: null,
      advertId,
    })
  }
  return rows
}

type RoomRawOffer = RentalOffer & {
  identity?: { version?: number; description?: string }
  details?: { description?: string }
}
export type RoomRawProperty = RentalPublicProperty & { offers: RoomRawOffer[] }

export function rowsFromRoomProperties(properties: RoomRawProperty[]): MinimumWageRow[] {
  const rows: MinimumWageRow[] = []
  for (const property of properties) {
    const candidates = (property.offers || [])
      .map(offer => ({
        offer,
        description: (offer.identity?.version === 1 && offer.identity.description) || offer.details?.description || '',
      }))
      .filter(
        ({ offer, description }) =>
          offer.currency === 'UYU' &&
          Number.isFinite(offer.priceUyu) &&
          offer.priceUyu >= MIN_ROOM_PRICE &&
          offer.priceUyu <= MAX_PRICE &&
          rentalAvailabilityAdvertId(offer.source, offer.listingId) !== null &&
          !rentalPeriodEvidence(offer.title, description).shortTerm
      )
      .sort((a, b) => a.offer.priceUyu - b.offer.priceUyu)
    const chosen = candidates[0]
    if (!chosen) continue
    const flags = roomTextFlags(chosen.offer.title || property.title, chosen.description)
    rows.push({
      key: property.key,
      title: chosen.offer.title || property.title,
      tipo: 'habitacion',
      department: property.department || '',
      neighborhood: property.neighborhood || '',
      bedrooms: null,
      area: property.area ?? null,
      alquiler: Math.round(chosen.offer.priceUyu),
      gastosComunes: null,
      source: chosen.offer.source,
      image: chosen.offer.image ?? null,
      lastSeen: chosen.offer.lastSeen,
      ...flags,
      advertId: rentalAvailabilityAdvertId(chosen.offer.source, chosen.offer.listingId)!,
    })
  }
  return rows
}

export function buildMinimumWageDataset(input: {
  generatedAt: string
  analysisAt: string | null
  budget: MinimumWageRow[]
  rooms: MinimumWageRow[]
  /** Casas y apartamentos de la foto semanal; null si no estaba: la cohorte sale de las propias filas. */
  analysisListings: CohortInput[] | null
}): MinimumWageDataset {
  const asCohort = (row: MinimumWageRow): CohortInput => ({
    department: row.department,
    type: row.tipo,
    bedrooms: row.bedrooms,
    price: row.alquiler,
  })
  const medians = cohortMedians([
    ...(input.analysisListings ?? input.budget.map(asCohort)),
    ...input.rooms.map(asCohort),
  ])
  const all = [...input.budget, ...input.rooms]
  const rows = all.filter(row => plausibleRent(asCohort(row), medians))
  return {
    generatedAt: input.generatedAt,
    analysisAt: input.analysisAt,
    rows,
    excluidosPorPrecio: all.length - rows.length,
  }
}

// ─── La consulta ─────────────────────────────────────────────────────────────

const VEREDICTO_ORDEN = { cierra: 0, 'cierra-si': 1, 'no-cierra': 2 } as const

function enForma(row: MinimumWageRow, forma: Forma, departamento: string): boolean {
  return (
    (forma.tipos as readonly TipoVivienda[]).includes(row.tipo) &&
    (forma.regiones as readonly Region[]).includes(regionDe(row.department)) &&
    (!departamento || mismoDepartamento(row.department, departamento))
  )
}

function planes(forma: Forma, palancas: Palancas): Map<Region, PlanDelMes> {
  return new Map(forma.regiones.map(region => [region, planDelMes(forma.id, region, palancas)]))
}

export function queryMinimumWage(
  dataset: MinimumWageDataset,
  input: Record<string, unknown>,
  hidden: (advertId: string) => boolean
): MinimumWageResponse {
  const query = normalizeMinimumWageQuery(input)
  const visible = dataset.rows.filter(row => !hidden(row.advertId))
  let selectedItems: MinimumWageItem[] = []

  const formas: FormaResumen[] = FORMAS.map(forma => {
    const con = planes(forma, query.palancas)
    const sin = planes(forma, PALANCAS_NINGUNA)
    const items: MinimumWageItem[] = []
    let sinPalancas = 0
    for (const row of visible) {
      if (!enForma(row, forma, query.departamento)) continue
      const region = regionDe(row.department)
      const evaluacion = evaluarAviso(con.get(region)!, row)
      if (evaluarAviso(sin.get(region)!, row).veredicto !== 'no-cierra') sinPalancas++
      if (evaluacion.veredicto === 'no-cierra') continue
      const { advertId: _advertId, ...listing } = row
      items.push({
        ...listing,
        evaluacion,
        puertas: puertasDeEntrada(forma.id, row, query.joven),
      })
    }
    items.sort(
      (a, b) =>
        VEREDICTO_ORDEN[a.evaluacion.veredicto] - VEREDICTO_ORDEN[b.evaluacion.veredicto] ||
        a.evaluacion.costo - b.evaluacion.costo ||
        a.key.localeCompare(b.key)
    )
    if (forma.id === query.forma) selectedItems = items
    const counts = new Map<string, number>()
    for (const item of items) counts.set(item.department, (counts.get(item.department) ?? 0) + 1)
    return {
      id: forma.id,
      cierran: items.filter(item => item.evaluacion.veredicto === 'cierra').length,
      condicionados: items.filter(item => item.evaluacion.veredicto === 'cierra-si').length,
      desde: items.length ? Math.min(...items.map(item => item.evaluacion.costo)) : null,
      porDepartamento: [...counts]
        .map(([department, count]) => ({ department, count }))
        .sort((a, b) => b.count - a.count || a.department.localeCompare(b.department, 'es'))
        .slice(0, 5),
      sinPalancas,
    }
  })

  const forma = FORMAS.find(item => item.id === query.forma)!
  const pages = Math.ceil(selectedItems.length / PER_PAGE)
  const page = Math.min(query.page, Math.max(1, pages))
  const departamentos = [
    ...new Set(
      visible
        .filter(row => enForma(row, forma, ''))
        .map(row => row.department)
        .filter(Boolean)
    ),
  ].sort((a, b) => a.localeCompare(b, 'es'))

  return {
    generatedAt: dataset.generatedAt,
    analysisAt: dataset.analysisAt,
    query: { ...query, page },
    planes: [...planes(forma, query.palancas).values()],
    formas,
    items: selectedItems.slice((page - 1) * PER_PAGE, page * PER_PAGE),
    total: selectedItems.length,
    page,
    pages,
    excluidosPorPrecio: dataset.excluidosPorPrecio,
    departamentos,
  }
}

// ─── Carga ───────────────────────────────────────────────────────────────────

async function loadRooms(): Promise<MinimumWageRow[]> {
  const raw = await RentalListingModel.aggregate<RoomRawProperty>([
    ...rentalPublicStages({ propertyType: 'habitacion', priceUyu: { $lte: MAX_PRICE } }, RENTAL_STALE_DAYS),
    { $limit: MAX_ROOMS + 1 },
    {
      $project: {
        ...rentalPublicPropertyProjection,
        'offers.identity.version': 1,
        'offers.identity.description': 1,
        'offers.details.description': 1,
      },
    },
  ] as PipelineStage[])
    .option({ maxTimeMS: 15_000 })
    .collation(RENTAL_COLLATION)
  if (raw.length > MAX_ROOMS) throw new Error('Room universe exceeds safe read budget')
  return rowsFromRoomProperties(raw)
}

let memo: { signature: string; until: number; value: MinimumWageDataset } | null = null
let loading: { signature: string; promise: Promise<MinimumWageDataset> } | null = null

export async function loadMinimumWageDataset(): Promise<MinimumWageDataset> {
  await connectDb()
  const meta = await RentalMetaModel.findOne({ key: 'uy-rentals' })
    .select({ generatedAt: 1, _id: 0 })
    .maxTimeMS(10_000)
    .lean()
  if (!meta?.generatedAt) throw new Error('Rental source metadata unavailable')
  const harvest = String(meta.generatedAt)
  if (memo && memo.signature === harvest && memo.until > Date.now()) return memo.value
  if (loading?.signature === harvest) return loading.promise
  const promise = (async () => {
    const [catalogue, rooms, analysis] = await Promise.all([
      loadRentalBudgetCatalogue(),
      loadRooms(),
      loadRentalAnalysisCatalogue().catch(() => null),
    ])
    const value = buildMinimumWageDataset({
      generatedAt: catalogue.generatedAt,
      analysisAt: analysis?.generatedAt ?? null,
      budget: rowsFromBudgetProperties(catalogue.properties, catalogue.usdUyu),
      rooms,
      analysisListings: analysis
        ? analysis.listings
            .filter(listing => listing.currency === 'UYU')
            .map(listing => ({
              department: listing.department,
              type: listing.type,
              bedrooms: listing.bedrooms,
              price: listing.price,
            }))
        : null,
    })
    memo = { signature: harvest, until: Date.now() + 30 * 60_000, value }
    return value
  })()
  loading = { signature: harvest, promise }
  try {
    return await promise
  } finally {
    if (loading?.promise === promise) loading = null
  }
}

export async function loadMinimumWage(input: Record<string, unknown>): Promise<MinimumWageResponse> {
  const [dataset, availability] = await Promise.all([
    loadMinimumWageDataset(),
    loadRentalAvailabilityIndex(),
  ])
  return queryMinimumWage(dataset, input, advertId =>
    rentalAvailabilityHidden(availability.byAdvertId.get(advertId), 'hide_multiple')
  )
}
```

- [ ] **Step 4: Run tests** — `cd app && npx vitest run tests/unit/minimumWageRentals.test.ts tests/unit/minimumWage.test.ts` → PASS. If a regex case fails, adjust the regex, never the test's intent.

- [ ] **Step 5: Commit**

```bash
git add app/server/utils/minimumWageRentals.ts app/tests/unit/minimumWageRentals.test.ts
git commit -m "feat(salario-minimo): las filas del directorio contra la cuenta, con guarda de plausibilidad"
```

### Task 3: El endpoint

**Files:**
- Create: `app/server/api/rentals/salario-minimo.get.ts`

**Interfaces:**
- Consumes: `loadMinimumWage`, `normalizeMinimumWageQuery`, `minimumWageQueryToParams`.
- Produces: `GET /api/rentals/salario-minimo` → `MinimumWageResponse`.

- [ ] **Step 1: Write the handler**

```ts
import { createError, defineEventHandler, getQuery, setResponseHeader } from 'h3'
import { loadMinimumWage } from '../../utils/minimumWageRentals'
import {
  minimumWageQueryToParams,
  normalizeMinimumWageQuery,
  type MinimumWageResponse,
} from '../../../utils/minimumWage'

/**
 * Las formas de vivir con el salario mínimo contra los avisos vigentes. Las filas se arman una vez
 * por cosecha (`loadMinimumWageDataset`); acá sólo se filtra en memoria, y la respuesta se guarda
 * diez minutos por consulta normalizada: hay pocas combinaciones y el SSR de la página pide siempre
 * la misma.
 */
const cached = defineCachedEventHandler(
  async (event): Promise<MinimumWageResponse> =>
    loadMinimumWage(getQuery(event) as Record<string, unknown>),
  {
    name: 'rentals-minimum-wage-v1',
    getKey: event =>
      JSON.stringify(
        minimumWageQueryToParams(normalizeMinimumWageQuery(getQuery(event) as Record<string, unknown>))
      ),
    maxAge: 600,
    staleMaxAge: 3600,
    swr: true,
    shouldBypassCache: () => process.env.NODE_ENV === 'development',
  }
)

export default defineEventHandler(async (event): Promise<MinimumWageResponse> => {
  try {
    const response = await cached(event)
    setResponseHeader(event, 'cache-control', 'public, max-age=60, s-maxage=300')
    return response as MinimumWageResponse
  } catch (error) {
    setResponseHeader(event, 'cache-control', 'no-store')
    throw createError({
      statusCode: 503,
      statusMessage: 'Minimum wage rentals are temporarily unavailable',
      cause: error,
    })
  }
})
```

- [ ] **Step 2: Lint** — `cd app && npx eslint server/api/rentals/salario-minimo.get.ts server/utils/minimumWageRentals.ts utils/minimumWage.ts` → no errors.

- [ ] **Step 3: Commit**

```bash
git add app/server/api/rentals/salario-minimo.get.ts
git commit -m "feat(salario-minimo): GET /api/rentals/salario-minimo"
```

### Task 4: Textos, fuentes y preguntas

**Files:**
- Create: `app/utils/minimumWageCopy.ts`
- Test: extend `app/tests/unit/minimumWage.test.ts`

**Interfaces:**
- Consumes: Task 1 constants; `LOWWAGE_SOURCES`, `AGUINALDO_SOURCES`, `SALARIO_VACACIONAL_SOURCES`, `GUARANTEE_OPTIONS`.
- Produces: `PALANCAS_INFO: Record<keyof Palancas, { titulo; detalle; valor: (region: Region) => number; fuente: { label; url } }>`, `PUERTAS_INFO: Record<PuertaId, { titulo; regla; url }>`, `MINIMUM_WAGE_FAQ: FaqItem[]`, `MINIMUM_WAGE_SOURCES: { label; url }[]`, `ASSE_SOURCE`.

- [ ] **Step 1: Test additions**

```ts
import { MINIMUM_WAGE_FAQ, MINIMUM_WAGE_SOURCES, PALANCAS_INFO, PUERTAS_INFO } from '../../utils/minimumWageCopy'

describe('copy', () => {
  it('cada palanca tiene fuente https y un valor positivo', () => {
    for (const info of Object.values(PALANCAS_INFO)) {
      expect(info.fuente.url).toMatch(/^https:\/\//)
      expect(info.valor('montevideo')).toBeGreaterThan(0)
    }
  })
  it('cada puerta tiene su fuente', () => {
    for (const info of Object.values(PUERTAS_INFO)) expect(info.url).toMatch(/^(https:\/\/|\/)/)
  })
  it('las fuentes son https y no se repiten', () => {
    const urls = MINIMUM_WAGE_SOURCES.map(s => s.url)
    expect(new Set(urls).size).toBe(urls.length)
    for (const url of urls) expect(url).toMatch(/^https:\/\//)
  })
  it('las preguntas no llevan cifras sin fuente: el líquido sale de la cuenta', () => {
    const texto = MINIMUM_WAGE_FAQ.map(f => f.answer).join(' ')
    expect(texto).toContain(LIQUIDO_SMN.toLocaleString('es-UY'))
  })
})
```

- [ ] **Step 2: Implement** — `app/utils/minimumWageCopy.ts` with the copy in rioplatense Spanish; values computed from Task 1 (`LIQUIDO_SMN`, `AGUINALDO_MENSUAL`, `VACACIONAL_MENSUAL`, `planDelMes('pieza','montevideo', …)`), URLs copied from the source modules (ASSE: `https://www.gub.uy/tramites/afiliacion-asse`; FGA Jóvenes: `https://www.anv.gub.uy/fondo-de-garantia-de-alquiler-para-jovenes`). FAQ answers use `formatPesos()` = `$ ${n.toLocaleString('es-UY')}`.

- [ ] **Step 3: Run tests → PASS. Commit** `feat(salario-minimo): textos, fuentes y preguntas`.

### Task 5: La página y su lugar en el sitio

**Files:**
- Create: `app/pages/vivir-con-el-salario-minimo-uruguay.vue`
- Modify: `app/utils/siteNav.ts` (entrada después de `/vivir-con-25000-pesos-uruguay`), `app/i18n/locales/json/{es,en,pt}.json` (`nav.vivirSalarioMinimo`), `app/utils/relatedPages.ts` (grupo `budget`), `app/utils/directorios.ts` (análisis de `alquileres`), `app/pages/vivir-con-25000-pesos-uruguay.vue` (enlace a la página nueva), `docs/seo/experiments.json` (fila), `docs/app/VIVIR_SALARIO_MINIMO.md` (nuevo).

- [ ] **Step 1: Page** — estructura (ver spec §4): breadcrumbs; header con respuesta corta (SSR); grilla de 4 tarjetas de forma (botón que cambia `state.forma`); sección "La cuenta del mes" con `VSwitch` por palanca (handler que toma el valor emitido: `v => setPalanca(id, v === true)`), `VSelect` de departamento, `VCheckbox` joven, y la tabla de `data.planes`; lista de avisos con `VPagination`; secciones "Qué hace cada decisión", "Cómo entrar", "Lo que esta cuenta no tiene", `FaqSection`, fuentes, `AssistantCta topic="hogar"`. Estado en un `reactive` inicializado desde `route.query`, URL con `usePreciosQuerySync`, datos con `useAsyncData('minimum-wage', …, { watch: [paramsKey] })`. `useSeoMeta` con `robots` noindex si hay query, `defineOgImageComponent('Cambio', …)`, JSON-LD WebPage + FAQPage + BreadcrumbList.
- [ ] **Step 2: Site wiring** — siteNav entry:

```ts
      {
        // Las formas en que el líquido del mínimo cubre un mes austero, con los avisos de hoy.
        // Ver docs/app/VIVIR_SALARIO_MINIMO.md.
        to: '/vivir-con-el-salario-minimo-uruguay',
        labelKey: 'nav.vivirSalarioMinimo',
        icon: 'mdi-home-heart',
        priority: 0.8,
        changefreq: 'daily',
        fresh: true,
        keywords: [
          'vivir con el salario minimo uruguay',
          'se puede vivir con el sueldo minimo',
          'alquiler con sueldo minimo',
          'pension barata montevideo',
          'habitacion en alquiler barata',
          'alquilar con 20000 pesos',
          'garantia de alquiler sueldo minimo',
          'como llegar a fin de mes con el minimo',
        ],
      },
```

  i18n: es `"vivirSalarioMinimo": "Vivir con el salario mínimo"`, en `"Living on the minimum wage"`, pt `"Viver com o salário mínimo"`. relatedPages `budget`: add `'/vivir-con-el-salario-minimo-uruguay'` after `/alquileres-uruguay`. directorios alquileres `analisis`: add after `/donde-vivir-uruguay`. experiments.json row `vivir-con-el-salario-minimo` (shippedOn = deploy day, routes = the page, queries = 3 target queries).
- [ ] **Step 3: Run** `cd app && npx vitest run tests/unit` (whole unit suite, ~10 min) and `npx eslint pages/vivir-con-el-salario-minimo-uruguay.vue utils/minimumWage*.ts server/utils/minimumWageRentals.ts` → green.
- [ ] **Step 4: Dev measurement** — `npm run dev` in the worktree app with `NUXT_MONGO_URI` pointing nowhere + Playwright proxy of `/api/rentals/salario-minimo` is impossible (endpoint new): instead run the dataset against production data through a one-off script that fetches `/api/rentals/budget` pages and `/api/rentals?type=habitacion` to validate counts, and render the page in dev with a mocked API response built from that data. Check: 360 px width no horizontal scroll, switches don't jump scroll, SSR has the answer text.
- [ ] **Step 5: Commit** `feat(salario-minimo): /vivir-con-el-salario-minimo-uruguay`.

### Task 6: Integrate and deploy

- [ ] Rebase on `origin/main`, merge into `main` (fast-forward from the worktree via `git push origin HEAD:main` after rebase), watch `CI / Deploy` with `gh run watch`, then measure `https://cambio-uruguay.com/vivir-con-el-salario-minimo-uruguay` and `/api/rentals/salario-minimo` in production: counts per forma, a page of items, no Punta del Este $ 3.500.
- [ ] Update memory index with the page's findings.
