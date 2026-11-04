// El asesor "¿Qué tamaño necesitás?" de /equipar-casa-uruguay/<categoria> para heladeras,
// lavarropas, televisores y aires.
//
// Corre en el navegador sobre el snapshot que deja `currency-equipar-specs` (sólo avisos con ficha
// del vendedor, classes/equipar/specs/snapshot.ts), porque los controles tienen que cambiar la
// respuesta en el acto. Sin puntaje oculto: el tamaño sale de una regla escrita en la página y las
// tres elecciones tienen nombre y su porqué.
//
// Las reglas son supuestos del sitio, publicados al lado de la respuesta:
//   * heladera: 130 L + 65 L por persona (dos personas ≈ 260 L, cuatro ≈ 390 L);
//   * lavarropas: 5 kg + 1 kg por persona, hasta 12 kg;
//   * televisor: entre la distancia / 5,5 y la distancia / 4 en pulgadas (con la distancia en cm), la
//     franja de 30° de campo visual que recomienda SMPTE para una imagen 4K o Full HD;
//   * aire: 115 frigorías por m², +15 % con sol fuerte y +10 % en un último piso; 1 frigoría =
//     3,968 BTU, y se sugiere el tamaño comercial siguiente (9.000, 12.000, 18.000, 24.000 BTU).
import {
  equiparFichaRangoValue,
  type EquiparFichaCategoria,
  type EquiparFichaValue,
} from './equiparFicha'

export const EQUIPAR_ASESOR_LITROS_BASE = 130
export const EQUIPAR_ASESOR_LITROS_PERSONA = 65
export const EQUIPAR_ASESOR_KILOS_BASE = 5
export const EQUIPAR_ASESOR_KILOS_TOPE = 12
export const EQUIPAR_ASESOR_TV_MIN = 5.5
export const EQUIPAR_ASESOR_TV_MAX = 4
export const EQUIPAR_ASESOR_FG_M2 = 115
export const EQUIPAR_ASESOR_SOL = 1.15
export const EQUIPAR_ASESOR_ULTIMO_PISO = 1.1
export const EQUIPAR_ASESOR_BTU_FG = 3.968
export const EQUIPAR_ASESOR_BTU_COMERCIALES = [9000, 12000, 18000, 24000, 30000, 36000] as const

/** Lo que el snapshot guarda de cada aviso con ficha. */
export interface EquiparAsesorCandidato {
  id: string
  title: string
  url: string
  image: string | null
  price: number
  currency: 'UYU' | 'USD'
  priceUyu: number
  condition: 'new' | 'used'
  source: 'store' | 'mercadolibre'
  sellerName: string
  brand: string
  values: Record<string, EquiparFichaValue>
}

export interface EquiparAsesorInput {
  personas: number
  /** Heladera: el ancho del hueco, en cm (null = sin límite). */
  anchoMax: number | null
  /** Heladera: exigir no frost. */
  noFrost: boolean
  /** Lavarropas: exigir que también seque. */
  lavaseca: boolean
  /** Lavarropas: '' = indistinto. */
  carga: '' | 'frontal' | 'superior'
  /** Televisor: distancia del sillón a la pantalla, en metros. */
  distancia: number
  /** Aire: superficie del ambiente, m². */
  m2: number
  sol: boolean
  ultimoPiso: boolean
  /** Aire: exigir frío y calor. */
  frioCalor: boolean
  presupuesto: number | null
  usados: boolean
}

export const EQUIPAR_ASESOR_DEFAULT: Readonly<EquiparAsesorInput> = Object.freeze({
  personas: 2,
  anchoMax: null,
  noFrost: false,
  lavaseca: false,
  carga: '',
  distancia: 2.5,
  m2: 20,
  sol: false,
  ultimoPiso: false,
  frioCalor: true,
  presupuesto: null,
  usados: false,
})

/** El requisito de tamaño: un mínimo (y en tv, un ideal máximo) sobre un campo de la ficha. */
export interface EquiparAsesorRequisito {
  field: 'capacidadL' | 'capacidadKg' | 'pulgadas' | 'btu'
  min: number
  /** Sólo televisor: más que esto ya es más pantalla de la que se aprovecha a esa distancia. */
  idealMax: number | null
  /** El tamaño en palabras: "325 L o más", "entre 45 y 62 pulgadas", "12.000 BTU (3.024 fg)". */
  label: string
  /** Aire: las frigorías que pide el ambiente (antes de redondear al tamaño comercial). */
  frigorias?: number
}

const fmt = (value: number) => value.toLocaleString('es-UY', { maximumFractionDigits: 0 })

export function equiparAsesorRequisito(
  categoria: EquiparFichaCategoria,
  input: EquiparAsesorInput
): EquiparAsesorRequisito {
  const personas = Math.max(1, Math.round(input.personas))
  switch (categoria) {
    case 'heladera': {
      const min = EQUIPAR_ASESOR_LITROS_BASE + EQUIPAR_ASESOR_LITROS_PERSONA * personas
      return { field: 'capacidadL', min, idealMax: null, label: `${fmt(min)} L o más` }
    }
    case 'lavarropas': {
      const min = Math.min(EQUIPAR_ASESOR_KILOS_TOPE, EQUIPAR_ASESOR_KILOS_BASE + personas)
      return { field: 'capacidadKg', min, idealMax: null, label: `${fmt(min)} kg o más` }
    }
    case 'tv': {
      const cm = Math.max(50, input.distancia * 100)
      const min = Math.round(cm / EQUIPAR_ASESOR_TV_MIN)
      const max = Math.round(cm / EQUIPAR_ASESOR_TV_MAX)
      return {
        field: 'pulgadas',
        min,
        idealMax: max,
        label: `entre ${fmt(min)} y ${fmt(max)} pulgadas`,
      }
    }
    case 'aire-acondicionado': {
      const fg =
        Math.max(1, input.m2) *
        EQUIPAR_ASESOR_FG_M2 *
        (input.sol ? EQUIPAR_ASESOR_SOL : 1) *
        (input.ultimoPiso ? EQUIPAR_ASESOR_ULTIMO_PISO : 1)
      const btu = fg * EQUIPAR_ASESOR_BTU_FG
      const comercial =
        EQUIPAR_ASESOR_BTU_COMERCIALES.find(size => size >= btu * 0.95) ??
        EQUIPAR_ASESOR_BTU_COMERCIALES.at(-1)!
      return {
        field: 'btu',
        // Un equipo "de 12.000" declara a veces 11.900: un 5 % de tolerancia.
        min: Math.round(comercial * 0.95),
        idealMax: null,
        label: `${fmt(comercial)} BTU (unas ${fmt(Math.round(fg))} frigorías)`,
        frigorias: Math.round(fg),
      }
    }
  }
}

export type EquiparAsesorPickKind = 'barato' | 'inverter' | 'rinde' | 'grande' | '4k' | 'eficiente'

export interface EquiparAsesorPick {
  kind: EquiparAsesorPickKind
  titulo: string
  candidato: EquiparAsesorCandidato
}

export interface EquiparAsesorResultado {
  requisito: EquiparAsesorRequisito
  cumplen: EquiparAsesorCandidato[]
  picks: EquiparAsesorPick[]
  /** Sobre cuántos avisos con ficha se buscó. */
  universo: number
  /** Cuántos no declaran el dato del tamaño y por eso no entran. */
  sinDato: number
}

const PICK_TITULOS: Record<EquiparAsesorPickKind, string> = {
  barato: 'La más barata que cumple',
  inverter: 'Inverter, la más barata',
  rinde: 'Más capacidad por tu plata',
  grande: 'La pantalla más grande que se aprovecha',
  '4k': '4K, la más barata',
  eficiente: 'Eficiencia A, la más barata',
}

const num = (value: EquiparFichaValue | undefined): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null

function cumple(
  categoria: EquiparFichaCategoria,
  c: EquiparAsesorCandidato,
  req: EquiparAsesorRequisito,
  input: EquiparAsesorInput
): boolean | null {
  const size = num(c.values[req.field])
  if (size === null) return null
  if (size < req.min) return false
  if (req.idealMax !== null && size > req.idealMax) return false
  if (input.presupuesto !== null && c.priceUyu > input.presupuesto) return false
  if (categoria === 'heladera') {
    if (input.noFrost && c.values.noFrost !== true) return false
    const ancho = num(c.values.anchoCm)
    if (input.anchoMax !== null && (ancho === null || ancho > input.anchoMax)) return false
  }
  if (categoria === 'lavarropas') {
    if (input.lavaseca && c.values.lavaseca !== true) return false
    if (input.carga && c.values.carga !== input.carga) return false
  }
  if (categoria === 'aire-acondicionado' && input.frioCalor && c.values.frioCalor !== true)
    return false
  return true
}

export function recomendarEquipar(
  categoria: EquiparFichaCategoria,
  candidatos: readonly EquiparAsesorCandidato[],
  input: EquiparAsesorInput
): EquiparAsesorResultado {
  const requisito = equiparAsesorRequisito(categoria, input)
  const universo = candidatos.filter(c => input.usados || c.condition === 'new')
  let sinDato = 0
  const cumplen: EquiparAsesorCandidato[] = []
  for (const c of universo) {
    const verdict = cumple(categoria, c, requisito, input)
    if (verdict === null) sinDato++
    else if (verdict) cumplen.push(c)
  }
  cumplen.sort((a, b) => a.priceUyu - b.priceUyu || a.id.localeCompare(b.id))

  const picks: EquiparAsesorPick[] = []
  const taken = new Set<string>()
  const pick = (kind: EquiparAsesorPickKind, c: EquiparAsesorCandidato | undefined) => {
    if (!c || taken.has(c.id)) return
    taken.add(c.id)
    picks.push({ kind, titulo: PICK_TITULOS[kind], candidato: c })
  }
  const rest = () => cumplen.filter(c => !taken.has(c.id))
  const cheapest = (rows: EquiparAsesorCandidato[]) => rows[0]
  const perUnit = (c: EquiparAsesorCandidato) => {
    const size = num(c.values[requisito.field])
    return size ? c.priceUyu / size : Number.POSITIVE_INFINITY
  }

  pick('barato', cumplen[0])
  if (categoria === 'tv') {
    pick(
      'grande',
      rest().sort(
        (a, b) =>
          (num(b.values.pulgadas) ?? 0) - (num(a.values.pulgadas) ?? 0) || a.priceUyu - b.priceUyu
      )[0]
    )
    pick('4k', cheapest(rest().filter(c => c.values.resolucion === '4k')))
  } else {
    pick('inverter', cheapest(rest().filter(c => c.values.inverter === true)))
    if (categoria === 'aire-acondicionado')
      pick(
        'eficiente',
        cheapest(
          rest().filter(
            c => c.values.eficiencia === 'A' || /^A\+/.test(String(c.values.eficiencia))
          )
        )
      )
    else pick('rinde', rest().sort((a, b) => perUnit(a) - perUnit(b))[0])
  }

  return { requisito, cumplen, picks, universo: universo.length, sinDato }
}

/** El porqué de una elección, en líneas cortas. */
export function equiparAsesorPorque(
  categoria: EquiparFichaCategoria,
  c: EquiparAsesorCandidato,
  requisito: EquiparAsesorRequisito
): string[] {
  const v = c.values
  const lines: string[] = []
  const n = (value: EquiparFichaValue) => (typeof value === 'number' ? fmt(value) : '')
  switch (categoria) {
    case 'heladera':
      if (num(v.capacidadL)) lines.push(`${n(v.capacidadL)} L (pedías ${fmt(requisito.min)} o más)`)
      if (v.noFrost === true) lines.push('No frost: no hay que descongelarla')
      if (num(v.anchoCm)) lines.push(`${n(v.anchoCm)} cm de ancho`)
      break
    case 'lavarropas':
      if (num(v.capacidadKg))
        lines.push(`${n(v.capacidadKg)} kg de lavado (pedías ${fmt(requisito.min)} o más)`)
      if (v.carga === 'frontal') lines.push('Carga frontal: lava con menos agua')
      if (v.carga === 'superior') lines.push('Carga superior: se carga sin agacharse')
      if (num(v.rpm)) lines.push(`Centrifuga a ${n(v.rpm)} rpm`)
      break
    case 'tv':
      if (num(v.pulgadas))
        lines.push(`${n(v.pulgadas)} pulgadas (${requisito.label} a tu distancia)`)
      if (typeof v.resolucion === 'string')
        lines.push(
          v.resolucion === '4k'
            ? '4K'
            : v.resolucion === 'fhd'
              ? 'Full HD'
              : v.resolucion.toUpperCase()
        )
      if (v.smart === true) lines.push('Smart TV')
      break
    case 'aire-acondicionado':
      if (num(v.btu))
        lines.push(`${n(Math.round(v.btu as number))} BTU para tu ambiente (${requisito.label})`)
      if (v.frioCalor === true) lines.push('Frío y calor')
      if (v.tipo === 'portatil')
        lines.push('Portátil: no necesita instalación, pero enfría menos que un split')
      break
  }
  if (v.inverter === true && categoria !== 'tv')
    lines.push('Inverter: gasta menos luz que uno común')
  if (typeof v.eficiencia === 'string') lines.push(`Eficiencia energética ${v.eficiencia}`)
  return lines
}

/** Los requisitos del asesor como filtros del directorio de la categoría. */
export function equiparAsesorQuery(
  categoria: EquiparFichaCategoria,
  input: EquiparAsesorInput,
  requisito: EquiparAsesorRequisito
): Record<string, string> {
  const query: Record<string, string> = {}
  const rasgos: string[] = []
  if (!input.usados) query.condicion = 'nuevo'
  if (input.presupuesto !== null) query.precioMax = String(input.presupuesto)
  // El tamaño que pide la regla, como tamaño libre: los tramos del panel no dicen "o más" (el que
  // contiene el mínimo mostraría lo que no alcanza y escondería lo que sobra).
  const key = categoria === 'tv' ? 'pulgadas' : 'capacidad'
  query[key] = equiparFichaRangoValue(categoria, key, requisito.min, requisito.idealMax)
  switch (categoria) {
    case 'heladera':
      if (input.noFrost) rasgos.push('no-frost')
      break
    case 'lavarropas':
      if (input.carga) query.carga = input.carga
      if (input.lavaseca) rasgos.push('lavaseca')
      break
    case 'aire-acondicionado':
      if (input.frioCalor) rasgos.push('frio-calor')
      break
  }
  if (rasgos.length) query.rasgos = rasgos.join(',')
  return query
}
