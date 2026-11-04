// La ficha técnica de heladeras, lavarropas, televisores y aires en el app: la forma pública, los
// filtros del directorio (/equipar-casa-uruguay/productos/<categoria>) y la franja de la tarjeta.
//
// La lee `currency-equipar-specs` de la ficha de Mercado Libre de cada aviso (classes/equipar/specs/):
// es lo que DECLARA el vendedor, no una medición. Los filtros son DATOS (una definición por
// categoría) y el resto del código es uno solo: normalizar la URL, armar el `$match`, contar cada
// opción y dibujar el chip salen de la misma tabla.
//
// `app/utils` es un espacio de auto-import plano: todo lleva el prefijo `equiparFicha`/`EQUIPAR_FICHA_`.

export const EQUIPAR_FICHA_CATEGORIAS = [
  'heladera',
  'lavarropas',
  'tv',
  'aire-acondicionado',
] as const
export type EquiparFichaCategoria = (typeof EQUIPAR_FICHA_CATEGORIAS)[number]

export const isEquiparFichaCategoria = (value: unknown): value is EquiparFichaCategoria =>
  typeof value === 'string' && (EQUIPAR_FICHA_CATEGORIAS as readonly string[]).includes(value)

export type EquiparFichaValue = number | boolean | string | null

export interface EquiparFichaPublic {
  values: Record<string, EquiparFichaValue>
  /** Algún dato salió de la ficha del vendedor (no sólo del título). */
  fromFicha: boolean
}

/** Las claves de cada categoría. Espejo de classes/equipar/specs/fields.ts (test de paridad). */
export const EQUIPAR_FICHA_KEYS: Readonly<Record<EquiparFichaCategoria, readonly string[]>> = {
  heladera: [
    'capacidadL',
    'freezerL',
    'noFrost',
    'inverter',
    'puertas',
    'eficiencia',
    'dispensador',
    'anchoCm',
    'altoCm',
    'wifi',
  ],
  lavarropas: [
    'capacidadKg',
    'carga',
    'lavaseca',
    'secadoKg',
    'rpm',
    'inverter',
    'eficiencia',
    'wifi',
  ],
  tv: ['pulgadas', 'resolucion', 'panel', 'smart', 'so', 'hdr', 'hz'],
  'aire-acondicionado': [
    'btu',
    'frigorias',
    'inverter',
    'frioCalor',
    'tipo',
    'eficiencia',
    'wifi',
    'ruidoDb',
  ],
}

/** Saneada: sólo las claves de la categoría, con un valor primitivo. */
export function equiparFichaPublic(raw: unknown, categoria: string): EquiparFichaPublic | null {
  if (!isEquiparFichaCategoria(categoria) || !raw || typeof raw !== 'object') return null
  const ficha = raw as { values?: Record<string, unknown>; from?: Record<string, unknown> }
  const values: Record<string, EquiparFichaValue> = {}
  let any = false
  for (const key of EQUIPAR_FICHA_KEYS[categoria]) {
    const value = ficha.values?.[key]
    const clean =
      (typeof value === 'number' && Number.isFinite(value)) || typeof value === 'boolean'
        ? value
        : typeof value === 'string' && value.length <= 24
          ? value
          : null
    values[key] = clean
    if (clean !== null) any = true
  }
  if (!any) return null
  const fromFicha = Object.values(ficha.from ?? {}).includes('ficha')
  return { values, fromFicha }
}

// ---------------------------------------------------------------------------------------------
// Filtros

type Cond = { $gt?: number; $gte?: number; $lt?: number; $lte?: number } | string | boolean

export interface EquiparFichaOpcion {
  slug: string
  label: string
  /** La condición sobre el valor del campo. */
  cond: Cond
  /** Rasgos: cada opción mira su propio campo. */
  field?: string
}

export interface EquiparFichaGrupo {
  /** El parámetro de la URL. */
  key: string
  label: string
  /** El campo que filtra (salvo en `rasgos`, donde cada opción trae el suyo). */
  field: string
  /** `rasgos`: varias a la vez, cada una exige su campo en `true`. */
  multi?: boolean
  opciones: readonly EquiparFichaOpcion[]
}

const rasgo = (slug: string, label: string, field: string): EquiparFichaOpcion => ({
  slug,
  label,
  cond: true,
  field,
})

export const EQUIPAR_FICHA_FILTROS: Readonly<
  Record<EquiparFichaCategoria, readonly EquiparFichaGrupo[]>
> = {
  heladera: [
    {
      key: 'capacidad',
      label: 'Capacidad',
      field: 'capacidadL',
      opciones: [
        { slug: 'hasta-250', label: 'Hasta 250 L', cond: { $lte: 250 } },
        { slug: '251-350', label: 'De 251 a 350 L', cond: { $gt: 250, $lte: 350 } },
        { slug: '351-450', label: 'De 351 a 450 L', cond: { $gt: 350, $lte: 450 } },
        { slug: 'mas-450', label: 'Más de 450 L', cond: { $gt: 450 } },
      ],
    },
    {
      key: 'rasgos',
      label: 'Características',
      field: '',
      multi: true,
      opciones: [
        rasgo('no-frost', 'No frost', 'noFrost'),
        rasgo('inverter', 'Inverter', 'inverter'),
        rasgo('dispensador', 'Dispensador de agua', 'dispensador'),
      ],
    },
  ],
  lavarropas: [
    {
      key: 'capacidad',
      label: 'Capacidad de lavado',
      field: 'capacidadKg',
      opciones: [
        { slug: 'hasta-7', label: 'Hasta 7 kg', cond: { $lte: 7 } },
        { slug: '8-9', label: '8 a 9 kg', cond: { $gt: 7, $lte: 9 } },
        { slug: '10-12', label: '10 a 12 kg', cond: { $gt: 9, $lte: 12 } },
        { slug: 'mas-12', label: 'Más de 12 kg', cond: { $gt: 12 } },
      ],
    },
    {
      key: 'carga',
      label: 'Carga',
      field: 'carga',
      opciones: [
        { slug: 'frontal', label: 'Frontal', cond: 'frontal' },
        { slug: 'superior', label: 'Superior', cond: 'superior' },
      ],
    },
    {
      key: 'rasgos',
      label: 'Características',
      field: '',
      multi: true,
      opciones: [
        rasgo('inverter', 'Inverter', 'inverter'),
        rasgo('lavaseca', 'Lavasecarropas', 'lavaseca'),
        rasgo('wifi', 'Wi-Fi', 'wifi'),
      ],
    },
  ],
  tv: [
    {
      key: 'pulgadas',
      label: 'Tamaño de pantalla',
      field: 'pulgadas',
      opciones: [
        { slug: 'hasta-32', label: 'Hasta 32″', cond: { $lte: 32 } },
        { slug: '40-43', label: '40 a 43″', cond: { $gt: 32, $lte: 45 } },
        { slug: '50-55', label: '50 a 55″', cond: { $gt: 45, $lte: 55 } },
        { slug: '58-65', label: '58 a 65″', cond: { $gt: 55, $lte: 65 } },
        { slug: 'mas-65', label: 'Más de 65″', cond: { $gt: 65 } },
      ],
    },
    {
      key: 'resolucion',
      label: 'Resolución',
      field: 'resolucion',
      opciones: [
        { slug: 'hd', label: 'HD', cond: 'hd' },
        { slug: 'fhd', label: 'Full HD', cond: 'fhd' },
        { slug: '4k', label: '4K', cond: '4k' },
        { slug: '8k', label: '8K', cond: '8k' },
      ],
    },
    {
      key: 'rasgos',
      label: 'Características',
      field: '',
      multi: true,
      opciones: [rasgo('smart', 'Smart TV', 'smart'), rasgo('hdr', 'HDR', 'hdr')],
    },
  ],
  'aire-acondicionado': [
    {
      key: 'capacidad',
      label: 'Capacidad',
      field: 'btu',
      opciones: [
        { slug: 'hasta-9000', label: 'Hasta 9.000 BTU', cond: { $lte: 9500 } },
        { slug: '12000', label: '12.000 BTU', cond: { $gt: 9500, $lte: 13500 } },
        { slug: '18000', label: '18.000 BTU', cond: { $gt: 13500, $lte: 19500 } },
        { slug: 'mas-18000', label: 'Más de 18.000 BTU', cond: { $gt: 19500 } },
      ],
    },
    {
      key: 'tipo',
      label: 'Tipo',
      field: 'tipo',
      opciones: [
        { slug: 'split', label: 'Split de pared', cond: 'split' },
        { slug: 'portatil', label: 'Portátil', cond: 'portatil' },
        { slug: 'ventana', label: 'De ventana', cond: 'ventana' },
        { slug: 'piso-techo', label: 'Piso techo', cond: 'piso-techo' },
      ],
    },
    {
      key: 'rasgos',
      label: 'Características',
      field: '',
      multi: true,
      opciones: [
        rasgo('inverter', 'Inverter', 'inverter'),
        rasgo('frio-calor', 'Frío y calor', 'frioCalor'),
        rasgo('wifi', 'Wi-Fi', 'wifi'),
      ],
    },
  ],
}

/** Lo que el lector eligió, por grupo: un slug (o '') o, en `rasgos`, una lista. */
export type EquiparFichaQuery = Record<string, string | string[]>

const first = (raw: unknown): string => {
  const value = Array.isArray(raw) ? raw[0] : raw
  return typeof value === 'string' ? value.trim() : ''
}

/** La consulta de ficha desde la URL: sólo los grupos y opciones de la categoría. */
export function equiparFichaNormalize(
  raw: Record<string, unknown>,
  categoria: string
): EquiparFichaQuery | undefined {
  if (!isEquiparFichaCategoria(categoria)) return undefined
  const query: EquiparFichaQuery = {}
  for (const grupo of EQUIPAR_FICHA_FILTROS[categoria]) {
    const value = first(raw[grupo.key])
    const slugs = grupo.opciones.map(opcion => opcion.slug)
    if (grupo.multi) {
      const picked = value.split(',').map(s => s.trim())
      query[grupo.key] = slugs.filter(slug => picked.includes(slug))
    } else {
      query[grupo.key] = slugs.includes(value) ? value : ''
    }
  }
  return query
}

export function equiparFichaParams(query: EquiparFichaQuery | undefined): Record<string, string> {
  const params: Record<string, string> = {}
  for (const [key, value] of Object.entries(query ?? {})) {
    if (Array.isArray(value) ? value.length : value)
      params[key] = Array.isArray(value) ? value.join(',') : value
  }
  return params
}

export const equiparFichaActive = (query: EquiparFichaQuery | undefined): boolean =>
  Object.keys(equiparFichaParams(query)).length > 0

const path = (field: string) => `ficha.values.${field}`

/**
 * La parte de ficha del `$match`. `ignore` lleva claves `eqficha.<grupo>` (para contar la faceta de
 * un grupo sin su propio filtro) o `eqficha.<grupo>.<slug>` (para sacar un rasgo con su chip).
 */
export function equiparFichaMatch(
  query: EquiparFichaQuery | undefined,
  categoria: string,
  ignore: ReadonlyArray<string> = []
): Record<string, unknown> {
  const match: Record<string, unknown> = {}
  if (!query || !isEquiparFichaCategoria(categoria)) return match
  for (const grupo of EQUIPAR_FICHA_FILTROS[categoria]) {
    if (ignore.includes(`eqficha.${grupo.key}`)) continue
    const value = query[grupo.key]
    if (grupo.multi && Array.isArray(value)) {
      for (const slug of value) {
        if (ignore.includes(`eqficha.${grupo.key}.${slug}`)) continue
        const opcion = grupo.opciones.find(o => o.slug === slug)
        if (opcion?.field) match[path(opcion.field)] = true
      }
    } else if (typeof value === 'string' && value) {
      const opcion = grupo.opciones.find(o => o.slug === value)
      if (opcion)
        match[path(grupo.field)] =
          typeof opcion.cond === 'object' ? { ...opcion.cond } : opcion.cond
    }
  }
  return match
}

/** La consulta sin las claves `eqficha.*` dadas (lo que saca un chip). */
export function equiparFichaWithout(
  query: EquiparFichaQuery,
  keys: ReadonlyArray<string>
): EquiparFichaQuery {
  if (keys.includes('eqficha')) {
    return Object.fromEntries(
      Object.entries(query).map(([key, value]) => [key, Array.isArray(value) ? [] : ''])
    )
  }
  const next: EquiparFichaQuery = { ...query }
  for (const raw of keys) {
    if (!raw.startsWith('eqficha.')) continue
    const [grupo, slug] = raw.slice('eqficha.'.length).split('.')
    if (!grupo || !(grupo in next)) continue
    const value = next[grupo]
    next[grupo] = Array.isArray(value) ? (slug ? value.filter(item => item !== slug) : []) : ''
  }
  return next
}

/** Un chip por filtro puesto, con la clave que lo saca. */
export function equiparFichaChips(
  query: EquiparFichaQuery | undefined,
  categoria: string
): Array<{ key: string; label: string; keys: string[] }> {
  if (!query || !isEquiparFichaCategoria(categoria)) return []
  const chips: Array<{ key: string; label: string; keys: string[] }> = []
  for (const grupo of EQUIPAR_FICHA_FILTROS[categoria]) {
    const value = query[grupo.key]
    if (Array.isArray(value)) {
      for (const slug of value) {
        const label = grupo.opciones.find(o => o.slug === slug)?.label
        if (label)
          chips.push({
            key: `eqficha.${grupo.key}.${slug}`,
            label,
            keys: [`eqficha.${grupo.key}.${slug}`],
          })
      }
    } else if (value) {
      const label = grupo.opciones.find(o => o.slug === value)?.label
      if (label)
        chips.push({
          key: `eqficha.${grupo.key}`,
          label: `${grupo.label}: ${label.toLowerCase()}`,
          keys: [`eqficha.${grupo.key}`],
        })
    }
  }
  return chips
}

/** Una faceta de ficha: el grupo con el conteo de cada opción. */
export interface EquiparFichaFaceta {
  key: string
  label: string
  multi: boolean
  opciones: Array<{ slug: string; name: string; count: number }>
}

export interface EquiparFichaFacetas {
  grupos: EquiparFichaFaceta[]
  /** De los avisos de la consulta, cuántos tienen ficha del vendedor. */
  conFicha: number
}

// ---------------------------------------------------------------------------------------------
// Franja de la tarjeta

const n = (value: number) => value.toLocaleString('es-UY', { maximumFractionDigits: 1 })

const EFICIENCIA_LABEL = (value: EquiparFichaValue) =>
  typeof value === 'string' ? `eficiencia ${value}` : null

const RESOLUCION_LABEL: Readonly<Record<string, string>> = {
  hd: 'HD',
  fhd: 'Full HD',
  '4k': '4K',
  '8k': '8K',
}
const SO_LABEL: Readonly<Record<string, string>> = {
  'google-tv': 'Google TV',
  'android-tv': 'Android TV',
  tizen: 'Tizen',
  webos: 'webOS',
  vidaa: 'VIDAA',
  roku: 'Roku',
  'fire-tv': 'Fire TV',
}
const PANEL_LABEL: Readonly<Record<string, string>> = {
  led: 'LED',
  qled: 'QLED',
  oled: 'OLED',
  miniled: 'Mini LED',
  nanocell: 'NanoCell',
}
const TIPO_AIRE_LABEL: Readonly<Record<string, string>> = {
  split: 'split',
  portatil: 'portátil',
  ventana: 'de ventana',
  'piso-techo': 'piso techo',
}

/** Lo principal (en negrita en la tarjeta) y lo que sigue, para cada categoría. */
export function equiparFichaStrip(
  ficha: EquiparFichaPublic,
  categoria: string
): {
  main: string[]
  extra: string[]
} {
  const v = ficha.values
  const main: string[] = []
  const extra: string[] = []
  const push = (list: string[], value: string | null | false) => {
    if (value) list.push(value)
  }
  switch (categoria) {
    case 'heladera':
      push(main, typeof v.capacidadL === 'number' && `${n(v.capacidadL)} L`)
      push(main, v.noFrost === true ? 'No frost' : v.noFrost === false ? 'Cíclica' : null)
      push(main, v.inverter === true && 'Inverter')
      push(main, EFICIENCIA_LABEL(v.eficiencia))
      push(extra, typeof v.freezerL === 'number' && `freezer ${n(v.freezerL)} L`)
      push(extra, typeof v.anchoCm === 'number' && `${n(v.anchoCm)} cm de ancho`)
      push(extra, typeof v.altoCm === 'number' && `${n(v.altoCm)} cm de alto`)
      push(extra, v.dispensador === true && 'dispensador de agua')
      break
    case 'lavarropas':
      push(main, typeof v.capacidadKg === 'number' && `${n(v.capacidadKg)} kg`)
      push(
        main,
        v.carga === 'frontal' ? 'Carga frontal' : v.carga === 'superior' ? 'Carga superior' : null
      )
      push(main, v.inverter === true && 'Inverter')
      push(
        main,
        v.lavaseca === true &&
          (typeof v.secadoKg === 'number' ? `Seca ${n(v.secadoKg)} kg` : 'Lavasecarropas')
      )
      push(extra, typeof v.rpm === 'number' && `${n(v.rpm)} rpm`)
      push(extra, EFICIENCIA_LABEL(v.eficiencia))
      push(extra, v.wifi === true && 'Wi-Fi')
      break
    case 'tv':
      push(main, typeof v.pulgadas === 'number' && `${n(v.pulgadas)}″`)
      push(main, typeof v.resolucion === 'string' && (RESOLUCION_LABEL[v.resolucion] ?? null))
      push(main, v.smart === true && 'Smart')
      push(main, typeof v.so === 'string' && (SO_LABEL[v.so] ?? null))
      push(extra, typeof v.panel === 'string' && (PANEL_LABEL[v.panel] ?? null))
      push(extra, v.hdr === true && 'HDR')
      push(extra, typeof v.hz === 'number' && `${n(v.hz)} Hz`)
      break
    case 'aire-acondicionado':
      push(main, typeof v.btu === 'number' && `${n(Math.round(v.btu))} BTU`)
      push(main, typeof v.frigorias === 'number' && `${n(Math.round(v.frigorias))} fg`)
      push(main, v.inverter === true ? 'Inverter' : v.inverter === false ? 'On/off' : null)
      push(main, v.frioCalor === true ? 'Frío/calor' : v.frioCalor === false ? 'Sólo frío' : null)
      push(extra, typeof v.tipo === 'string' && (TIPO_AIRE_LABEL[v.tipo] ?? null))
      push(extra, EFICIENCIA_LABEL(v.eficiencia))
      push(extra, typeof v.ruidoDb === 'number' && `${n(v.ruidoDb)} dB`)
      push(extra, v.wifi === true && 'Wi-Fi')
      break
  }
  return { main, extra }
}
