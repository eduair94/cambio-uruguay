// El asesor "¿Cuál te conviene?" de /monopatines-electricos-uruguay.
//
// Corre en el navegador sobre el snapshot que deja currency-movilidad-specs (sólo avisos con ficha
// propia leída), porque el lector mueve controles y espera que la respuesta cambie en el acto — el
// mismo criterio que el comparador de transporte. No hay puntaje oculto: los requisitos son reglas
// escritas en la página, y las tres elecciones tienen nombre ("la más barata que cumple", "más
// autonomía por peso", "la más liviana" o "más potencia para subidas") y su porqué.
//
// Los supuestos son del sitio, no de una norma, y la página los publica al lado:
//   * autonomía real = 65 % de la declarada (55 % con más de 90 kg): los fabricantes la miden en
//     llano, con unos 75 kg y a velocidad baja;
//   * el monopatín tiene que soportar el peso de la persona más 10 kg de mochila;
//   * algunas subidas piden 350 W, muchas, 500 W;
//   * "liviano" es 15 kg o menos, lo que se sube por una escalera.
import type { MonopatinSpecsPublic, MovilidadFichaQuery } from './monopatinFicha'

export const MONOPATIN_AUTONOMIA_REAL = 0.65
export const MONOPATIN_AUTONOMIA_REAL_PESADO = 0.55
export const MONOPATIN_PESADO_KG = 90
export const MONOPATIN_MARGEN_CARGA_KG = 10
export const MONOPATIN_POTENCIA_SUBIDAS = { algunas: 350, muchas: 500 } as const
export const MONOPATIN_LIVIANO_KG = 15
/** El tope de Montevideo (Decreto 37.330) y San José (Decreto 3279). */
export const MONOPATIN_TOPE_VELOCIDAD_KMH = 25

export type MonopatinTerreno = 'llano' | 'algunas' | 'muchas'

export interface AsesorInput {
  /** Kilómetros por día, ida y vuelta. */
  kmDia: number
  pesoKg: number
  presupuesto: number | null
  terreno: MonopatinTerreno
  /** Lo va a cargar: escaleras, ómnibus, oficina. */
  loCarga: boolean
  usados: boolean
}

export const MONOPATIN_ASESOR_DEFAULT: Readonly<AsesorInput> = Object.freeze({
  kmDia: 10,
  pesoKg: 75,
  presupuesto: null,
  terreno: 'algunas',
  loCarga: false,
  usados: false,
})

/** Lo que el snapshot guarda de cada aviso con ficha (classes/movilidad/specs/snapshot.ts). */
export interface MonopatinCandidato {
  id: string
  title: string
  url: string
  image: string | null
  price: number
  currency: 'UYU' | 'USD'
  priceUyu: number
  condition: 'new' | 'used'
  source: 'store' | 'mercadolibre' | 'facebook'
  sellerName: string
  brand: string
  variant: string
  specs: Omit<MonopatinSpecsPublic, 'fromFicha'>
}

export interface AsesorRequisitos {
  autonomiaDeclaradaMin: number
  factorReal: number
  cargaMin: number
  potenciaMin: number | null
  /** Blando: sólo decide la elección "la más liviana". */
  pesoMax: number | null
}

export function asesorRequisitos(input: AsesorInput): AsesorRequisitos {
  const factorReal =
    input.pesoKg > MONOPATIN_PESADO_KG ? MONOPATIN_AUTONOMIA_REAL_PESADO : MONOPATIN_AUTONOMIA_REAL
  return {
    autonomiaDeclaradaMin: Math.ceil(Math.max(1, input.kmDia) / factorReal),
    factorReal,
    cargaMin: Math.round(input.pesoKg + MONOPATIN_MARGEN_CARGA_KG),
    potenciaMin: input.terreno === 'llano' ? null : MONOPATIN_POTENCIA_SUBIDAS[input.terreno],
    pesoMax: input.loCarga ? MONOPATIN_LIVIANO_KG : null,
  }
}

export type AsesorRequisito = 'autonomia' | 'carga' | 'potencia' | 'presupuesto'
export type AsesorPickKind = 'barato' | 'autonomia' | 'liviano' | 'subidas'

export interface AsesorPick {
  kind: AsesorPickKind
  titulo: string
  candidato: MonopatinCandidato
  porque: string[]
}

export interface AsesorResultado {
  requisitos: AsesorRequisitos
  /** Los que cumplen todo, del más barato al más caro. */
  cumplen: MonopatinCandidato[]
  picks: AsesorPick[]
  /** Cuántos tienen el dato y no llegan, por requisito; `sinDato`, cuántos no declaran alguno. */
  descartes: Record<AsesorRequisito, number> & { sinDato: number }
  /** Si nadie cumple: el requisito que, sacado, deja pasar a más. */
  aflojar: AsesorRequisito | null
  /** Sobre cuántos avisos se buscó (nuevos, o nuevos y usados). */
  universo: number
}

const PICK_TITULOS: Record<AsesorPickKind, string> = {
  barato: 'La más barata que cumple',
  autonomia: 'Más autonomía por peso',
  liviano: 'La más liviana',
  subidas: 'Más potencia para subidas',
}

const n = (value: number) => value.toLocaleString('es-UY', { maximumFractionDigits: 1 })

type Verdict = 'ok' | 'falla' | 'sinDato'

function verdicts(
  candidato: MonopatinCandidato,
  requisitos: AsesorRequisitos,
  presupuesto: number | null
): Record<AsesorRequisito, Verdict> {
  const { rangeKm, maxLoadKg, motorW } = candidato.specs
  const atLeast = (value: number | null, min: number | null): Verdict =>
    min === null ? 'ok' : value === null ? 'sinDato' : value >= min ? 'ok' : 'falla'
  return {
    autonomia: atLeast(rangeKm, requisitos.autonomiaDeclaradaMin),
    carga: atLeast(maxLoadKg, requisitos.cargaMin),
    potencia: atLeast(motorW, requisitos.potenciaMin),
    presupuesto: presupuesto === null || candidato.priceUyu <= presupuesto ? 'ok' : 'falla',
  }
}

const REQUISITOS: readonly AsesorRequisito[] = ['autonomia', 'carga', 'potencia', 'presupuesto']

function porque(
  candidato: MonopatinCandidato,
  input: AsesorInput,
  requisitos: AsesorRequisitos,
  kind: AsesorPickKind
): string[] {
  const s = candidato.specs
  const lines: string[] = []
  if (s.rangeKm !== null) {
    lines.push(
      `Autonomía real estimada: ${n(Math.round(s.rangeKm * requisitos.factorReal))} km para tus ${n(input.kmDia)} km por día`
    )
  }
  if (s.maxLoadKg !== null)
    lines.push(`Soporta ${n(s.maxLoadKg)} kg (vos + ${MONOPATIN_MARGEN_CARGA_KG} kg de mochila)`)
  if (kind === 'autonomia' && s.rangeKm)
    lines.push(`$ ${n(Math.round(candidato.priceUyu / s.rangeKm))} por km de autonomía declarada`)
  if (s.motorW !== null)
    lines.push(`${n(s.motorW)} W${input.terreno === 'llano' ? '' : ' para tus subidas'}`)
  if (s.weightKg !== null) {
    lines.push(
      s.weightKg <= MONOPATIN_LIVIANO_KG
        ? `Pesa ${n(s.weightKg)} kg: se sube a una escalera o al ómnibus`
        : `Pesa ${n(s.weightKg)} kg`
    )
  }
  if (s.chargeHours !== null) lines.push(`Carga completa en ${n(s.chargeHours)} h`)
  if (s.maxSpeedKmh !== null && s.maxSpeedKmh > MONOPATIN_TOPE_VELOCIDAD_KMH) {
    lines.push(
      `Declara ${n(s.maxSpeedKmh)} km/h: en Montevideo y San José se circula hasta ${MONOPATIN_TOPE_VELOCIDAD_KMH} km/h`
    )
  }
  return lines
}

export function recomendarMonopatines(
  candidatos: readonly MonopatinCandidato[],
  input: AsesorInput
): AsesorResultado {
  const requisitos = asesorRequisitos(input)
  const universo = candidatos.filter(c => input.usados || c.condition === 'new')
  const evaluated = universo.map(candidato => ({
    candidato,
    v: verdicts(candidato, requisitos, input.presupuesto),
  }))

  const descartes = { autonomia: 0, carga: 0, potencia: 0, presupuesto: 0, sinDato: 0 }
  for (const { v } of evaluated) {
    if (REQUISITOS.some(req => v[req] === 'sinDato')) descartes.sinDato++
    for (const req of REQUISITOS) if (v[req] === 'falla') descartes[req]++
  }

  const passes = (v: Record<AsesorRequisito, Verdict>, except?: AsesorRequisito) =>
    REQUISITOS.every(req => req === except || v[req] === 'ok')

  const cumplen = evaluated
    .filter(({ v }) => passes(v))
    .map(({ candidato }) => candidato)
    .sort((a, b) => a.priceUyu - b.priceUyu || a.id.localeCompare(b.id))

  let aflojar: AsesorRequisito | null = null
  if (!cumplen.length && evaluated.length) {
    let best = 0
    for (const req of REQUISITOS) {
      const count = evaluated.filter(({ v }) => passes(v, req)).length
      if (count > best) {
        best = count
        aflojar = req
      }
    }
  }

  const picks: AsesorPick[] = []
  const taken = new Set<string>()
  const pick = (kind: AsesorPickKind, candidato: MonopatinCandidato | undefined) => {
    if (!candidato || taken.has(candidato.id)) return
    taken.add(candidato.id)
    picks.push({ kind, titulo: PICK_TITULOS[kind], candidato, porque: porque(candidato, input, requisitos, kind) })
  }
  const rest = () => cumplen.filter(c => !taken.has(c.id))
  const minBy = (rows: MonopatinCandidato[], value: (c: MonopatinCandidato) => number | null) =>
    rows
      .filter(c => value(c) !== null)
      .sort((a, b) => value(a)! - value(b)! || a.priceUyu - b.priceUyu)[0]

  pick('barato', cumplen[0])
  pick('autonomia', minBy(rest(), c => (c.specs.rangeKm ? c.priceUyu / c.specs.rangeKm : null)))
  if (input.loCarga || input.terreno === 'llano') pick('liviano', minBy(rest(), c => c.specs.weightKg))
  else pick('subidas', minBy(rest(), c => (c.specs.motorW === null ? null : -c.specs.motorW)))

  return { requisitos, cumplen, picks, descartes, aflojar, universo: universo.length }
}

/** Los requisitos del asesor como filtros del directorio, para "ver los que cumplen". */
export function asesorQueryFicha(
  requisitos: AsesorRequisitos,
  input: AsesorInput
): { ficha: MovilidadFichaQuery; precioMax: number | null; condicion: '' | 'nuevo' } {
  return {
    ficha: {
      autonomia: Math.min(150, requisitos.autonomiaDeclaradaMin),
      velocidad: '',
      potencia: '',
      potenciaMin: requisitos.potenciaMin,
      carga: Math.min(200, Math.max(30, requisitos.cargaMin)),
      peso: null,
      rueda: '',
      rasgos: [],
      soloFicha: true,
    },
    precioMax: input.presupuesto,
    condicion: input.usados ? '' : 'nuevo',
  }
}
