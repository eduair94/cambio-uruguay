// El asesor "¿Cuál te conviene?" de /bicicletas-electricas-uruguay.
//
// El mismo esqueleto que el de monopatines (utils/monopatinAsesor.ts): corre en el navegador sobre el
// snapshot que deja currency-movilidad-specs (sólo avisos con ficha propia leída), sin puntaje oculto,
// con tres elecciones con nombre y su porqué. Cambian las reglas, porque una bici no es un monopatín:
//
//   * autonomía real = 60 % de la declarada (50 % con más de 90 kg): el fabricante la mide con la
//     asistencia más baja y pedaleando parejo; con la asistencia alta, que es como se sube una cuesta,
//     rinde bastante menos;
//   * la bici tiene que soportar el peso de la persona más 10 kg (mochila, canasto, candado);
//   * algunas subidas piden 350 W, muchas, 500 W: el pedal ayuda, pero con 250 W en una cuesta de
//     Montevideo se pedalea casi todo;
//   * "liviana" es 22 kg o menos, lo que se sube por una escalera entre dos pisos;
//   * si se pide acelerador, sólo entran las que declaran tenerlo: hay bicis que sólo asisten el pedaleo.
//
// Los supuestos son del sitio, no de una norma, y la página los publica al lado.
import type { MovilidadFichaQuery } from './monopatinFicha'
import type { MonopatinCandidato } from './monopatinAsesor'

export const BICICLETA_AUTONOMIA_REAL = 0.6
export const BICICLETA_AUTONOMIA_REAL_PESADO = 0.5
export const BICICLETA_PESADO_KG = 90
export const BICICLETA_MARGEN_CARGA_KG = 10
export const BICICLETA_POTENCIA_SUBIDAS = { algunas: 350, muchas: 500 } as const
export const BICICLETA_LIVIANA_KG = 22
/** El corte de asistencia de la norma europea de bicis de pedaleo asistido (EN 15194), una referencia. */
export const BICICLETA_CORTE_ASISTENCIA_KMH = 25

export type BicicletaTerreno = 'llano' | 'algunas' | 'muchas'

export interface BicicletaAsesorInput {
  /** Kilómetros por día, ida y vuelta. */
  kmDia: number
  pesoKg: number
  presupuesto: number | null
  terreno: BicicletaTerreno
  /** La sube por una escalera, al ómnibus o la guarda adentro: suma que sea liviana o plegable. */
  laSube: boolean
  /** Quiere acelerador de puño, no sólo pedaleo asistido. */
  acelerador: boolean
  usados: boolean
}

export const BICICLETA_ASESOR_DEFAULT: Readonly<BicicletaAsesorInput> = Object.freeze({
  kmDia: 15,
  pesoKg: 75,
  presupuesto: null,
  terreno: 'algunas',
  laSube: false,
  acelerador: false,
  usados: false,
})

/** El candidato es el mismo que el de monopatín: el snapshot tiene la misma forma en las dos. */
export type BicicletaCandidato = MonopatinCandidato

export interface BicicletaRequisitos {
  autonomiaDeclaradaMin: number
  factorReal: number
  cargaMin: number
  potenciaMin: number | null
  acelerador: boolean
}

export function bicicletaRequisitos(input: BicicletaAsesorInput): BicicletaRequisitos {
  const factorReal =
    input.pesoKg > BICICLETA_PESADO_KG ? BICICLETA_AUTONOMIA_REAL_PESADO : BICICLETA_AUTONOMIA_REAL
  return {
    autonomiaDeclaradaMin: Math.ceil(Math.max(1, input.kmDia) / factorReal),
    factorReal,
    cargaMin: Math.round(input.pesoKg + BICICLETA_MARGEN_CARGA_KG),
    potenciaMin: input.terreno === 'llano' ? null : BICICLETA_POTENCIA_SUBIDAS[input.terreno],
    acelerador: input.acelerador,
  }
}

export type BicicletaRequisito = 'autonomia' | 'carga' | 'potencia' | 'acelerador' | 'presupuesto'
export type BicicletaPickKind = 'barato' | 'autonomia' | 'liviana' | 'subidas'

export interface BicicletaPick {
  kind: BicicletaPickKind
  titulo: string
  candidato: BicicletaCandidato
  porque: string[]
}

export interface BicicletaAsesorResultado {
  requisitos: BicicletaRequisitos
  cumplen: BicicletaCandidato[]
  picks: BicicletaPick[]
  descartes: Record<BicicletaRequisito, number> & { sinDato: number }
  aflojar: BicicletaRequisito | null
  porRequisito: Record<BicicletaRequisito, number>
  universo: number
}

const PICK_TITULOS: Record<BicicletaPickKind, string> = {
  barato: 'La más barata que cumple',
  autonomia: 'Más kilómetros por tu plata',
  liviana: 'La más fácil de subir',
  subidas: 'Más potencia para subidas',
}

const REQUISITOS: readonly BicicletaRequisito[] = [
  'autonomia',
  'carga',
  'potencia',
  'acelerador',
  'presupuesto',
]

const n = (value: number) => value.toLocaleString('es-UY', { maximumFractionDigits: 1 })

type Verdict = 'ok' | 'falla' | 'sinDato'

function verdicts(
  candidato: BicicletaCandidato,
  requisitos: BicicletaRequisitos,
  presupuesto: number | null
): Record<BicicletaRequisito, Verdict> {
  const { rangeKm, maxLoadKg, motorW, throttle } = candidato.specs
  const atLeast = (value: number | null, min: number | null): Verdict =>
    min === null ? 'ok' : value === null ? 'sinDato' : value >= min ? 'ok' : 'falla'
  return {
    autonomia: atLeast(rangeKm, requisitos.autonomiaDeclaradaMin),
    carga: atLeast(maxLoadKg, requisitos.cargaMin),
    potencia: atLeast(motorW, requisitos.potenciaMin),
    acelerador: !requisitos.acelerador
      ? 'ok'
      : throttle === null || throttle === undefined
        ? 'sinDato'
        : throttle
          ? 'ok'
          : 'falla',
    presupuesto: presupuesto === null || candidato.priceUyu <= presupuesto ? 'ok' : 'falla',
  }
}

/** Liviana (22 kg o menos) o plegable: lo que decide si se sube a un apartamento o al ómnibus. */
const easyToCarry = (c: BicicletaCandidato): boolean =>
  Boolean(c.specs.foldable) ||
  (typeof c.specs.weightKg === 'number' && c.specs.weightKg <= BICICLETA_LIVIANA_KG)

function porque(
  candidato: BicicletaCandidato,
  input: BicicletaAsesorInput,
  requisitos: BicicletaRequisitos,
  kind: BicicletaPickKind
): string[] {
  const s = candidato.specs
  const lines: string[] = []
  if (s.rangeKm !== null) {
    lines.push(
      `Autonomía real estimada: ${n(Math.round(s.rangeKm * requisitos.factorReal))} km para tus ${n(input.kmDia)} km por día`
    )
  }
  if (s.maxLoadKg !== null)
    lines.push(`Soporta ${n(s.maxLoadKg)} kg (vos + ${BICICLETA_MARGEN_CARGA_KG} kg de carga)`)
  if (kind === 'autonomia' && s.rangeKm)
    lines.push(`$ ${n(Math.round(candidato.priceUyu / s.rangeKm))} por km de autonomía declarada`)
  if (s.motorW !== null)
    lines.push(`${n(s.motorW)} W${input.terreno === 'llano' ? '' : ' para tus subidas'}`)
  if (s.centralMotor)
    lines.push('Motor central: sube mejor que uno en la rueda con la misma potencia')
  if (s.wheelInches !== null) lines.push(`Rodado ${n(s.wheelInches)}`)
  if (s.weightKg !== null || s.foldable) {
    const parts: string[] = []
    if (s.weightKg !== null) parts.push(`pesa ${n(s.weightKg)} kg`)
    if (s.foldable) parts.push('es plegable')
    const text = parts.join(' y ')
    lines.push(
      easyToCarry(candidato) && input.laSube
        ? `${text.charAt(0).toUpperCase()}${text.slice(1)}: se sube a un apartamento o al ómnibus`
        : `${text.charAt(0).toUpperCase()}${text.slice(1)}`
    )
  }
  if (s.removableBattery) lines.push('La batería se saca para cargarla adentro')
  if (s.throttle) lines.push('Tiene acelerador, además del pedaleo asistido')
  if (s.gears !== null && s.gears > 1) lines.push(`${n(s.gears)} cambios`)
  if (s.maxSpeedKmh !== null && s.maxSpeedKmh > BICICLETA_CORTE_ASISTENCIA_KMH) {
    lines.push(
      `Declara ${n(s.maxSpeedKmh)} km/h: la norma europea de pedaleo asistido corta la ayuda a los ${BICICLETA_CORTE_ASISTENCIA_KMH} km/h`
    )
  }
  return lines
}

export function recomendarBicicletas(
  candidatos: readonly BicicletaCandidato[],
  input: BicicletaAsesorInput
): BicicletaAsesorResultado {
  const requisitos = bicicletaRequisitos(input)
  const universo = candidatos.filter(c => input.usados || c.condition === 'new')
  const evaluated = universo.map(candidato => ({
    candidato,
    v: verdicts(candidato, requisitos, input.presupuesto),
  }))

  const descartes = {
    autonomia: 0,
    carga: 0,
    potencia: 0,
    acelerador: 0,
    presupuesto: 0,
    sinDato: 0,
  }
  for (const { v } of evaluated) {
    if (REQUISITOS.some(req => v[req] === 'sinDato')) descartes.sinDato++
    for (const req of REQUISITOS) if (v[req] === 'falla') descartes[req]++
  }

  const passes = (v: Record<BicicletaRequisito, Verdict>, except?: BicicletaRequisito) =>
    REQUISITOS.every(req => req === except || v[req] === 'ok')

  const cumplen = evaluated
    .filter(({ v }) => passes(v))
    .map(({ candidato }) => candidato)
    .sort((a, b) => a.priceUyu - b.priceUyu || a.id.localeCompare(b.id))

  const porRequisito = Object.fromEntries(
    REQUISITOS.map(req => [req, evaluated.filter(({ v }) => v[req] === 'ok').length])
  ) as Record<BicicletaRequisito, number>

  let aflojar: BicicletaRequisito | null = null
  if (!cumplen.length && evaluated.length) {
    let best = 0
    for (const req of REQUISITOS) {
      const count = evaluated.filter(({ v }) => passes(v, req)).length
      if (count > best) {
        best = count
        aflojar = req
      }
    }
    if (!aflojar) {
      aflojar = REQUISITOS.reduce((worst, req) =>
        porRequisito[req] < porRequisito[worst] ? req : worst
      )
    }
  }

  const picks: BicicletaPick[] = []
  const taken = new Set<string>()
  const pick = (kind: BicicletaPickKind, candidato: BicicletaCandidato | undefined) => {
    if (!candidato || taken.has(candidato.id)) return
    taken.add(candidato.id)
    picks.push({
      kind,
      titulo: PICK_TITULOS[kind],
      candidato,
      porque: porque(candidato, input, requisitos, kind),
    })
  }
  const rest = () => cumplen.filter(c => !taken.has(c.id))
  const minBy = (rows: BicicletaCandidato[], value: (c: BicicletaCandidato) => number | null) =>
    rows
      .filter(c => value(c) !== null)
      .sort((a, b) => value(a)! - value(b)! || a.priceUyu - b.priceUyu)[0]

  pick('barato', cumplen[0])
  pick(
    'autonomia',
    minBy(rest(), c => (c.specs.rangeKm ? c.priceUyu / c.specs.rangeKm : null))
  )
  if (input.laSube || input.terreno === 'llano')
    // Plegable o liviana primero, y entre ellas la de menos peso declarado (sin peso, al final).
    pick(
      'liviana',
      minBy(
        rest().filter(easyToCarry),
        c => (c.specs.weightKg ?? 999) - (c.specs.foldable ? 0.5 : 0)
      )
    )
  else
    pick(
      'subidas',
      minBy(rest(), c => (c.specs.motorW === null ? null : -c.specs.motorW))
    )

  return { requisitos, cumplen, picks, descartes, aflojar, porRequisito, universo: universo.length }
}

/** Los requisitos del asesor como filtros del directorio, para "ver las que cumplen". */
export function bicicletaAsesorQueryFicha(
  requisitos: BicicletaRequisitos,
  input: BicicletaAsesorInput
): { ficha: MovilidadFichaQuery; precioMax: number | null; condicion: '' | 'nuevo' } {
  return {
    ficha: {
      autonomia: Math.min(200, requisitos.autonomiaDeclaradaMin),
      velocidad: '',
      potencia: '',
      potenciaMin: requisitos.potenciaMin,
      carga: Math.min(200, Math.max(30, requisitos.cargaMin)),
      peso: null,
      rueda: '',
      rodado: '',
      rasgos: requisitos.acelerador ? ['acelerador'] : [],
      soloFicha: true,
    },
    precioMax: input.presupuesto,
    condicion: input.usados ? '' : 'nuevo',
  }
}

/** Qué cambiar cuando ninguna cumple. */
export function bicicletaAsesorConsejo(
  req: BicicletaRequisito,
  input: BicicletaAsesorInput
): string {
  switch (req) {
    case 'autonomia':
      return 'Lo que más deja afuera es la autonomía: probá con menos kilómetros, o contá sólo la ida si podés cargarla en el destino.'
    case 'carga': {
      const salidas = [
        ...(input.usados ? [] : ['mirá también las usadas']),
        ...(input.presupuesto ? ['subí el presupuesto'] : []),
      ]
      return salidas.length
        ? `Lo que más deja afuera es el peso que soportan: ${salidas.join(' o ')}.`
        : 'Lo que más deja afuera es el peso que soportan: pocas bicis declaran soportar tanto.'
    }
    case 'potencia':
      return input.terreno === 'muchas'
        ? 'Lo que más deja afuera es la potencia: si las subidas no son tantas, probá con "Algunas".'
        : 'Lo que más deja afuera es la potencia: si el trayecto es casi llano, probá con "Ninguna".'
    case 'acelerador':
      return 'Lo que más deja afuera es el acelerador: pocas fichas dicen si lo tienen. Probá sin ese requisito y confirmalo en el aviso.'
    case 'presupuesto':
      return 'Lo que más deja afuera es el presupuesto: probá con el tramo siguiente.'
  }
}
