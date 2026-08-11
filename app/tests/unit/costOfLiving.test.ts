import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  estimateBudget,
  household,
  dwellingFor,
  realityChecks,
  VERDICT_META,
  SITUATION_LABELS,
  CITY_LABELS,
  CITY_PROSE,
  COST_MODEL,
  pct,
  basketExplainer,
  interiorRentSpread,
  interiorRentWeighted,
  officialLinesFor,
  regionalNotes,
  INTERIOR_FOOD_FACTOR,
  INE_HOUSEHOLD_INCOME,
  INE_HOUSEHOLD_LINES,
  INE_PER_CAPITA_LINES,
  INE_POVERTY_2025,
  INE_RENT_BY_DEPARTMENT,
  INE_RENT_CONTRACT_SHARE,
  INE_RENT_COUNTRY,
  INE_RENT_MALDONADO_LOCALITIES,
  MALDONADO_EXCEPTION,
  type BudgetInputs,
  type City,
} from '../../utils/costOfLiving'

const base: BudgetInputs = {
  netIncome: 40000,
  situation: 'solo',
  city: 'montevideo',
  housing: 'alquila',
  children: 0,
}

const here = dirname(fileURLToPath(import.meta.url))
const moduleSrc = readFileSync(join(here, '../../utils/costOfLiving.ts'), 'utf8')
const pageSrc = readFileSync(join(here, '../../pages/herramientas/costo-de-vida.vue'), 'utf8')

describe('household composition', () => {
  it('derives adults and children per situation', () => {
    expect(household({ ...base, situation: 'solo' })).toEqual({ adults: 1, children: 0 })
    expect(household({ ...base, situation: 'compartido' })).toEqual({ adults: 1, children: 0 })
    expect(household({ ...base, situation: 'pareja' })).toEqual({ adults: 2, children: 0 })
    expect(household({ ...base, situation: 'familia', children: 2 })).toEqual({
      adults: 2,
      children: 2,
    })
    // children ignored unless familia
    expect(household({ ...base, situation: 'solo', children: 3 })).toEqual({
      adults: 1,
      children: 0,
    })
  })

  it('maps a standard dwelling to each situation', () => {
    expect(dwellingFor('solo')).toBe('monoambiente')
    expect(dwellingFor('compartido')).toBe('habitacion_compartida')
    expect(dwellingFor('pareja')).toBe('1_dormitorio')
    expect(dwellingFor('familia')).toBe('2_dormitorios')
  })
})

describe('estimateBudget', () => {
  it('computes positive essentials with all six lines', () => {
    const r = estimateBudget(base)
    expect(r.essentials).toBeGreaterThan(0)
    expect(r.essentialLines).toHaveLength(6)
    expect(r.essentialLines.reduce((s, l) => s + l.amount, 0)).toBe(r.essentials)
  })

  it('marks noAlcanza with a deficit when income is below essentials', () => {
    const essentials = estimateBudget(base).essentials
    const r = estimateBudget({ ...base, netIncome: Math.round(essentials * 0.8) })
    expect(r.verdict).toBe('noAlcanza')
    expect(r.deficit).toBeGreaterThan(0)
    expect(r.savingsSuggested).toBe(0)
    expect(r.discretionary).toBeLessThan(0)
  })

  it('marks holgado with savings when income is well above essentials', () => {
    const essentials = estimateBudget(base).essentials
    const r = estimateBudget({ ...base, netIncome: Math.round(essentials * 2.2) })
    expect(r.verdict).toBe('holgado')
    expect(r.deficit).toBe(0)
    expect(r.savingsSuggested).toBeGreaterThan(0)
    expect(r.discretionary).toBeGreaterThan(0)
  })

  it('walks the verdict tiers as income rises', () => {
    const essentials = estimateBudget(base).essentials
    const tierAt = (mult: number) =>
      estimateBudget({ ...base, netIncome: Math.round(essentials * mult) }).verdict
    expect(tierAt(0.9)).toBe('noAlcanza')
    expect(tierAt(1.1)).toBe('ajustado')
    expect(tierAt(1.25)).toBe('justo')
    expect(tierAt(1.6)).toBe('comodo')
    expect(tierAt(2.0)).toBe('holgado')
  })

  it('interior is cheaper than Montevideo, sharing cheaper than living alone', () => {
    const mvd = estimateBudget({ ...base, situation: 'solo', city: 'montevideo' }).essentials
    const interior = estimateBudget({ ...base, situation: 'solo', city: 'interior' }).essentials
    const shared = estimateBudget({
      ...base,
      situation: 'compartido',
      city: 'montevideo',
    }).essentials
    expect(interior).toBeLessThan(mvd)
    expect(shared).toBeLessThan(mvd)
  })

  it('owning (no rent) lowers essentials vs renting', () => {
    const renting = estimateBudget({ ...base, housing: 'alquila' }).essentials
    const owning = estimateBudget({ ...base, housing: 'propia' }).essentials
    expect(owning).toBeLessThan(renting)
    // the difference is roughly the rent line
    const rentLine = estimateBudget({ ...base, housing: 'alquila' }).essentialLines.find(
      l => l.key === 'vivienda'
    )!
    expect(renting - owning).toBe(rentLine.amount)
  })

  it('clamps invalid income to zero', () => {
    const r = estimateBudget({ ...base, netIncome: -100 })
    expect(r.income).toBe(0)
    expect(r.verdict).toBe('noAlcanza')
  })

  it('exposes the maximum monthly savings (income − essentials)', () => {
    const r = estimateBudget({ ...base, netIncome: 90000 })
    expect(r.savingsMax).toBe(Math.round((90000 - r.essentials) / 100) * 100)
    expect(r.savingsMax).toBeGreaterThanOrEqual(r.savingsSuggested)
    // when it does not add up, you cannot save
    expect(estimateBudget({ ...base, netIncome: 1000 }).savingsMax).toBe(0)
  })
})

describe('lifestyle knobs (contemplating every case)', () => {
  it('transport mode changes the cost (walk < occasional < daily; auto is its own cost)', () => {
    const t = (transport: BudgetInputs['transport']) =>
      estimateBudget({ ...base, transport }).essentialLines.find(l => l.key === 'transporte')!
        .amount
    expect(t('a_pie_bici')).toBeLessThan(t('publico_ocasional'))
    expect(t('publico_ocasional')).toBeLessThan(t('publico_diario'))
    expect(t('auto')).toBeGreaterThan(t('publico_diario'))
  })

  it('Montevideo zone changes the rent (económica < intermedia < costa)', () => {
    const rent = (zone: BudgetInputs['zone']) =>
      estimateBudget({ ...base, zone }).essentialLines.find(l => l.key === 'vivienda')!.amount
    expect(rent('economico')).toBeLessThan(rent('intermedio'))
    expect(rent('intermedio')).toBeLessThan(rent('costa'))
  })

  it('lifestyle scales food + varios (austero cheaper than cómodo)', () => {
    const austero = estimateBudget({ ...base, lifestyle: 'austero' }).essentials
    const comodo = estimateBudget({ ...base, lifestyle: 'comodo' }).essentials
    expect(austero).toBeLessThan(comodo)
  })

  it('paying a private mutualista costs more than being on FONASA', () => {
    const fonasa = estimateBudget({ ...base, health: 'fonasa' }).essentials
    const particular = estimateBudget({ ...base, health: 'particular' }).essentials
    expect(particular).toBeGreaterThan(fonasa)
  })

  it('an austere sharer who walks in an economic zone can live on much less', () => {
    const lean = estimateBudget({
      ...base,
      situation: 'compartido',
      zone: 'economico',
      transport: 'a_pie_bici',
      lifestyle: 'austero',
    }).essentials
    const heavy = estimateBudget({
      ...base,
      situation: 'solo',
      zone: 'costa',
      transport: 'auto',
      lifestyle: 'comodo',
    }).essentials
    expect(lean).toBeLessThan(heavy * 0.6)
  })
})

describe('reality checks + metadata', () => {
  it('returns tips, including the deficit when it does not add up', () => {
    const essentials = estimateBudget(base).essentials
    const r = estimateBudget({ ...base, netIncome: Math.round(essentials * 0.8) })
    const tips = realityChecks(r, { ...base, netIncome: Math.round(essentials * 0.8) })
    expect(tips.length).toBeGreaterThan(0)
    expect(tips.some(t => t.toLowerCase().includes('faltan'))).toBe(true)
  })

  it('names the rent spread when it does not add up, in both regions', () => {
    const essentials = estimateBudget(base).essentials
    const tight = { ...base, netIncome: Math.round(essentials * 0.8) }
    const mvd = realityChecks(estimateBudget(tight), tight).join(' ')
    const int = { ...tight, city: 'interior' as City }
    const interior = realityChecks(estimateBudget(int), int).join(' ')
    // Montevideo: points at the cheapest department by name, with its INE figure.
    expect(mvd).toContain(interiorRentSpread().masBarato.departamento)
    // Interior: warns that the flat regional discount misses Maldonado.
    expect(interior).toContain('Maldonado')
  })

  it('has metadata for every verdict, situation and city', () => {
    for (const v of ['noAlcanza', 'ajustado', 'justo', 'comodo', 'holgado'] as const) {
      expect(VERDICT_META[v].label.trim()).not.toBe('')
      expect(VERDICT_META[v].message.trim().length).toBeGreaterThan(20)
    }
    for (const s of ['solo', 'compartido', 'pareja', 'familia'] as const) {
      expect(SITUATION_LABELS[s].trim()).not.toBe('')
    }
    for (const c of ['montevideo', 'interior'] as const) {
      expect(CITY_LABELS[c].trim()).not.toBe('')
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Datos oficiales del INE. Estos tests no verifican "la verdad" de los números
// (eso se hace leyendo el boletín) sino que sean internamente coherentes y que
// no se puedan mezclar dos cosas distintas: canasta ≠ presupuesto, per cápita ≠
// hogar, región ≠ departamento.
// ─────────────────────────────────────────────────────────────────────────────
describe('canastas oficiales del INE (CBA / CBT)', () => {
  it('cada CBT es su CBA más la canasta no alimentaria correspondiente', () => {
    for (const city of ['montevideo', 'interior'] as const) {
      const l = INE_PER_CAPITA_LINES[city]
      // El INE redondea cada canasta por separado: tolerancia de 1 peso.
      expect(Math.abs(l.cba + l.cbnaInquilinos - l.cbtInquilinos)).toBeLessThanOrEqual(1)
      expect(Math.abs(l.cba + l.cbnaNoInquilinos - l.cbtNoInquilinos)).toBeLessThanOrEqual(1)
    }
  })

  it('la línea del inquilino es más alta que la del no inquilino (la CBNA incluye alquiler)', () => {
    for (const city of ['montevideo', 'interior'] as const) {
      const l = INE_PER_CAPITA_LINES[city]
      expect(l.cbtInquilinos).toBeGreaterThan(l.cbtNoInquilinos)
      expect(l.cbnaInquilinos).toBeGreaterThan(l.cbnaNoInquilinos)
    }
  })

  it('Montevideo tiene canastas más caras que el interior en todas las líneas', () => {
    const m = INE_PER_CAPITA_LINES.montevideo
    const i = INE_PER_CAPITA_LINES.interior
    expect(m.cba).toBeGreaterThan(i.cba)
    expect(m.cbtInquilinos).toBeGreaterThan(i.cbtInquilinos)
    expect(m.cbtNoInquilinos).toBeGreaterThan(i.cbtNoInquilinos)
  })

  it('la línea del hogar NO es la per cápita multiplicada por los integrantes', () => {
    for (const city of ['montevideo', 'interior'] as const) {
      const hh = INE_HOUSEHOLD_LINES[city]
      const pc = INE_PER_CAPITA_LINES[city]
      expect(hh.inquilinos).toHaveLength(3)
      expect(hh.noInquilinos).toHaveLength(3)
      // economías de escala: 3 personas cuesta bastante menos que 3 × 1 persona
      expect(hh.inquilinos[2]!).toBeLessThan(pc.cbtInquilinos * 3)
      expect(hh.noInquilinos[2]!).toBeLessThan(pc.cbtNoInquilinos * 3)
      // pero crece con el tamaño del hogar
      expect(hh.inquilinos[0]!).toBeLessThan(hh.inquilinos[1]!)
      expect(hh.inquilinos[1]!).toBeLessThan(hh.inquilinos[2]!)
    }
  })

  it('officialLinesFor devuelve la línea de la tenencia elegida', () => {
    const alquila = officialLinesFor('montevideo', 'alquila')
    const propia = officialLinesFor('montevideo', 'propia')
    expect(alquila.cbt).toBe(INE_PER_CAPITA_LINES.montevideo.cbtInquilinos)
    expect(propia.cbt).toBe(INE_PER_CAPITA_LINES.montevideo.cbtNoInquilinos)
    expect(alquila.cba).toBe(propia.cba) // la comida no depende de si alquilás
    expect(alquila.tenencia).toBe('inquilinos')
    expect(propia.tenencia).toBe('no inquilinos')
    expect(alquila.period.trim()).not.toBe('')
  })

  it('basketExplainer publica las tres canastas con fecha y sin venderlas como presupuesto', () => {
    for (const city of ['montevideo', 'interior'] as const) {
      const b = basketExplainer(city)
      expect(b.items).toHaveLength(3)
      expect(b.intro).toContain(CITY_PROSE[city])
      // toda cifra mostrada viene formateada en pesos
      for (const item of b.items) expect(item.value.startsWith('$')).toBe(true)
      expect(b.caveats.length).toBeGreaterThanOrEqual(3)
      const all = (b.intro + b.caveats.join(' ')).toLowerCase()
      expect(all).toContain('per cápita')
      expect(all).toContain('pobreza')
    }
  })
})

describe('alquiler por departamento (INE IAI)', () => {
  it('tiene los 19 departamentos, sin repetidos y con ambos promedios', () => {
    expect(INE_RENT_BY_DEPARTMENT).toHaveLength(19)
    const names = INE_RENT_BY_DEPARTMENT.map(d => d.departamento)
    expect(new Set(names).size).toBe(19)
    expect(names).toContain('Montevideo')
    expect(names).toContain('Maldonado')
    for (const d of INE_RENT_BY_DEPARTMENT) {
      expect(d.vigentes).toBeGreaterThan(0)
      expect(d.nuevos).toBeGreaterThan(0)
    }
  })

  it('el promedio país queda dentro del rango departamental', () => {
    const vals = INE_RENT_BY_DEPARTMENT.map(d => d.vigentes)
    expect(INE_RENT_COUNTRY.vigentes).toBeGreaterThan(Math.min(...vals))
    expect(INE_RENT_COUNTRY.vigentes).toBeLessThan(Math.max(...vals))
    expect(INE_RENT_COUNTRY.coberturaMercado).toBeGreaterThan(0.5)
    expect(INE_RENT_COUNTRY.coberturaMercado).toBeLessThan(1)
  })

  it('interiorRentSpread excluye Montevideo y devuelve la mediana NO ponderada', () => {
    const s = interiorRentSpread()
    expect(s.montevideo.departamento).toBe('Montevideo')
    expect(s.ordenados).toHaveLength(18)
    expect(s.ordenados.some(d => d.departamento === 'Montevideo')).toBe(false)
    expect(s.masBarato.vigentes).toBeLessThan(s.masCaro.vigentes)
    // mediana de 18 valores = promedio de los dos del medio
    const vals = s.ordenados.map(d => d.vigentes)
    expect(s.medianaInterior).toBe((vals[8]! + vals[9]!) / 2)
    expect(s.ratio).toBeCloseTo(s.medianaInterior / s.montevideo.vigentes, 10)
  })

  it('Maldonado es la excepción: le gana a Montevideo en contratos nuevos', () => {
    const mal = INE_RENT_BY_DEPARTMENT.find(d => d.departamento === 'Maldonado')!
    const mvd = INE_RENT_BY_DEPARTMENT.find(d => d.departamento === 'Montevideo')!
    expect(mal.nuevos).toBeGreaterThan(mvd.nuevos)
    expect(interiorRentSpread().masCaro.departamento).toBe('Maldonado')
    const pde = INE_RENT_MALDONADO_LOCALITIES.find(l => l.localidad === 'Punta del Este')!
    expect(pde.vigentes).toBeGreaterThan(mvd.vigentes)
    // la brecha adentro del departamento es mayor que la brecha entre regiones
    const dentro = pde.vigentes / Math.min(...INE_RENT_MALDONADO_LOCALITIES.map(l => l.vigentes))
    expect(dentro).toBeGreaterThan(mvd.vigentes / interiorRentSpread().medianaInterior)
  })

  it('MALDONADO_EXCEPTION cita los valores del INE y la norma vigente', () => {
    const text = MALDONADO_EXCEPTION.paragraphs.join(' ')
    expect(MALDONADO_EXCEPTION.paragraphs.length).toBeGreaterThanOrEqual(3)
    expect(text).toContain('Punta del Este')
    expect(text).toContain('120 días')
    expect(text).toContain('26.790') // contratos nuevos de Maldonado, INE junio 2026
    // texto vigente de IMPO, no el original (que puede decir lo contrario)
    expect(MALDONADO_EXCEPTION.sourceUrl).toContain('impo.com.uy/bases/decretos-ley/14219-1974')
    expect(MALDONADO_EXCEPTION.sourceUrl).not.toContain('-originales')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// El descuento del interior. La versión anterior usaba la MEDIANA no ponderada
// de los 18 departamentos (0,70) y la publicaba como si fuera un dato del INE.
// Los dos errores se arreglan juntos: el factor pasa a ser el promedio ponderado
// por contratos que se despeja del boletín (0,825) y el texto dice que es
// cálculo propio. Estos tests fallan con la versión vieja.
// ─────────────────────────────────────────────────────────────────────────────
describe('descuento del interior: ponderado por contratos, no mediana de departamentos', () => {
  it('interiorRentWeighted despeja el promedio del interior de los agregados del INE', () => {
    const w = interiorRentWeighted()
    const mvd = INE_RENT_BY_DEPARTMENT.find(d => d.departamento === 'Montevideo')!
    expect(w.contratos).toBe(
      INE_RENT_COUNTRY.contratosVigentes - INE_RENT_COUNTRY.contratosVigentesMontevideo
    )
    expect(w.contratos).toBe(43703)
    expect(Math.round(w.promedio)).toBe(19339)
    expect(w.ratio).toBeCloseTo(0.825, 3)
    // control: volver a ponderar interior + Montevideo devuelve el total país publicado
    const paisReconstruido =
      (w.promedio * w.contratos + mvd.vigentes * INE_RENT_COUNTRY.contratosVigentesMontevideo) /
      INE_RENT_COUNTRY.contratosVigentes
    expect(Math.round(paisReconstruido)).toBe(INE_RENT_COUNTRY.vigentes)
    // la participación publicada de Montevideo coincide con la cantidad publicada
    expect(
      INE_RENT_COUNTRY.contratosVigentesMontevideo / INE_RENT_COUNTRY.contratosVigentes
    ).toBeCloseTo(INE_RENT_CONTRACT_SHARE.Montevideo!, 4)
  })

  it('el factor del modelo sigue al promedio ponderado y NO a la mediana departamental', () => {
    const w = interiorRentWeighted()
    const s = interiorRentSpread()
    expect(Math.abs(COST_MODEL.interiorRentFactor - w.ratio)).toBeLessThan(0.02)
    // la mediana no ponderada subestima por más de 10 puntos: no puede ser el factor
    expect(w.ratio - s.ratio).toBeGreaterThan(0.1)
    expect(Math.abs(COST_MODEL.interiorRentFactor - s.ratio)).toBeGreaterThan(0.1)
  })

  it('más de la mitad de los contratos del interior están en sus dos departamentos más caros', () => {
    const w = interiorRentWeighted()
    expect(w.concentracionCanelonesMaldonado).toBeGreaterThan(0.5)
    const mediana = interiorRentSpread().medianaInterior
    for (const nombre of ['Canelones', 'Maldonado']) {
      const d = INE_RENT_BY_DEPARTMENT.find(x => x.departamento === nombre)!
      expect(d.vigentes).toBeGreaterThan(mediana * 1.25)
    }
  })

  it('la nota del interior publica el promedio como cálculo propio, no como dato del INE', () => {
    const notes = regionalNotes('interior').join(' ')
    expect(notes).toContain('cálculo propio')
    expect(notes).toContain('19.339')
    expect(notes).toContain('no publica un promedio del interior')
    // la mediana puede seguir apareciendo, pero no como el descuento que se aplica
    expect(notes).not.toMatch(/aplica un alquiler \d+% menor[^.]*mediana/)
    expect(notes).not.toMatch(/mediana de los 18 departamentos[^.]*según el INE/)
  })
})

describe('la comida del interior sigue la canasta regional del INE', () => {
  it('INTERIOR_FOOD_FACTOR es la relación entre las dos CBA publicadas', () => {
    expect(INTERIOR_FOOD_FACTOR).toBeCloseTo(
      INE_PER_CAPITA_LINES.interior.cba / INE_PER_CAPITA_LINES.montevideo.cba,
      10
    )
    expect(INTERIOR_FOOD_FACTOR).toBeGreaterThan(0.8)
    expect(INTERIOR_FOOD_FACTOR).toBeLessThan(0.9)
  })

  it('la línea de alimentación baja en el interior en esa misma proporción', () => {
    const food = (city: City) =>
      estimateBudget({ ...base, city }).essentialLines.find(l => l.key === 'alimentacion')!.amount
    expect(food('interior')).toBeLessThan(food('montevideo'))
    expect(food('interior') / food('montevideo')).toBeCloseTo(INTERIOR_FOOD_FACTOR, 2)
  })

  it('la nota regional deja de decir que la comida queda igual "porque no hay dato"', () => {
    const notes = regionalNotes('interior').join(' ')
    expect(notes).not.toContain('Comida, servicios, transporte y salud quedan igual')
    expect(notes).not.toContain('no existe una canasta oficial por departamento')
    // reconoce que el INE sí publica canasta por región y la usa
    expect(notes).toContain('CBA per cápita')
    expect(notes).toContain('alimentación')
  })
})

describe('la excepción de Maldonado no explica el precio con la ley', () => {
  it('publica las 13 filas que el INE abre para Maldonado, sin recortar', () => {
    expect(INE_RENT_MALDONADO_LOCALITIES).toHaveLength(13)
    const nombres = INE_RENT_MALDONADO_LOCALITIES.map(l => l.localidad)
    expect(new Set(nombres).size).toBe(13)
    // Bella Vista es la tercera más cara: una selección de 5 la dejaba afuera
    const bellaVista = INE_RENT_MALDONADO_LOCALITIES.find(l => l.localidad === 'Bella Vista')!
    expect(bellaVista.vigentes).toBe(27619)
    const piriapolis = INE_RENT_MALDONADO_LOCALITIES.find(l => l.localidad === 'Piriápolis')!
    expect(bellaVista.vigentes).toBeGreaterThan(piriapolis.vigentes)
    // la lista va de mayor a menor, así que "las 5 primeras" ya no es una selección oculta
    const vals = INE_RENT_MALDONADO_LOCALITIES.map(l => l.vigentes)
    expect([...vals].sort((a, b) => b - a)).toEqual(vals)
  })

  it('la norma queda como dato y la tesis causal desaparece', () => {
    const text = MALDONADO_EXCEPTION.paragraphs.join(' ')
    // sigue estando la norma, con su redacción vigente
    expect(text).toContain('120 días')
    expect(text).toContain('14.219')
    expect(text).toContain('20.352')
    // pero ya no se presenta como la explicación del nivel de precios
    expect(text).not.toContain('Parte de la explicación es legal')
    expect(text).not.toContain('compite contra el mercado de temporada')
    // y avisa que esos contratos no están en el universo medido
    expect(text.toLowerCase()).toContain('no lo dice')
    expect(text).toMatch(/no (siquiera )?entran en estos promedios|ni siquiera entran/)
  })
})

describe('lo que la página ya no puede volver a afirmar', () => {
  it('no dice que el alquiler sea el ÚNICO precio que el Estado abre por departamento', () => {
    // MGAP-DIEA publica el precio de la tierra en USD/ha por departamento
    // (Compraventas 1er semestre 2025, cuadro 2), así que la exclusividad es falsa.
    expect(moduleSrc).not.toContain('ÚNICO dato de precios')
    expect(pageSrc).not.toContain('Lo único de precios que el Estado')
    expect(moduleSrc).not.toMatch(/only price the State publishes department by department\./)
  })

  it('no le pone dirección al desfasaje que el INE deja sin dirección', () => {
    expect(pageSrc).not.toContain('están por debajo de lo que se pide hoy')
    expect(pageSrc).not.toContain('son más altos que este promedio')
    // cita textual del boletín, sin agregarle para qué lado
    expect(INE_RENT_COUNTRY.advertenciaDesfasaje).toContain('podría estar desfasado')
    expect(pageSrc).toContain('rentCountry.advertenciaDesfasaje')
    // y el propio dato del INE contradice la dirección que se afirmaba
    expect(INE_RENT_COUNTRY.nuevos).toBeGreaterThan(INE_RENT_COUNTRY.vigentes)
  })

  it('no imprime dos signos de porcentaje sobre un dato del INE', () => {
    expect(pageSrc).not.toMatch(/pct\([^)]*\)\s*\}\}%/)
  })

  it('no confunde el factor del alquiler con el descuento', () => {
    expect(pageSrc).not.toContain('y ese es el descuento que aplica esta calculadora')
    expect(pageSrc).toContain('descuento del ${Math.round((1 - model.value.interiorRentFactor)')
    // el descuento que se anuncia y el factor que se aplica tienen que cerrar en 100
    const w = interiorRentWeighted()
    expect(Math.round((1 - COST_MODEL.interiorRentFactor) * 100) + Math.round(w.ratio * 100)).toBe(
      100
    )
  })
})

describe('contexto regional (lo que antes no llegaba a la UI)', () => {
  it('regionalNotes devuelve notas para las dos regiones', () => {
    for (const city of ['montevideo', 'interior'] as const) {
      const notes = regionalNotes(city)
      expect(notes.length).toBeGreaterThanOrEqual(3)
      for (const n of notes) expect(n.trim().length).toBeGreaterThan(40)
    }
  })

  it('la nota del interior avisa que es una región y no un departamento', () => {
    const notes = regionalNotes('interior').join(' ')
    expect(notes).toContain('Maldonado')
    expect(notes.toLowerCase()).toContain('departamento')
    expect(notes).toContain(interiorRentSpread().masBarato.departamento)
  })

  it('el ingreso de los hogares del INE es más alto en Montevideo y la mediana va por debajo de la media', () => {
    const i = INE_HOUSEHOLD_INCOME
    expect(i.medioHogar.montevideo).toBeGreaterThan(i.medioHogar.interior)
    expect(i.medianaHogar.montevideo).toBeGreaterThan(i.medianaHogar.interior)
    expect(i.medianaPerCapita.montevideo).toBeGreaterThan(i.medianaPerCapita.interior)
    // la media está empujada por los ingresos altos
    expect(i.medianaHogar.pais).toBeLessThan(i.medioHogar.pais)
    expect(i.period.trim()).not.toBe('')
  })

  it('los porcentajes salen con coma decimal, como se escriben acá', () => {
    expect(pct(INE_POVERTY_2025.personas.montevideo)).toBe('18,7%')
    expect(pct(INE_POVERTY_2025.indigenciaPersonas.pais)).toBe('1,7%')
    expect(CITY_PROSE.interior).toBe('el interior')
    expect(CITY_LABELS.interior).toBe('Interior')
  })

  it('la pobreza medida por el INE es mayor en Montevideo que en el interior', () => {
    const p = INE_POVERTY_2025
    expect(p.personas.montevideo).toBeGreaterThan(p.personas.interior)
    expect(p.hogares.montevideo).toBeGreaterThan(p.hogares.interior)
    expect(p.indigenciaPersonas.montevideo).toBeGreaterThan(p.indigenciaPersonas.interior)
    // Maldonado está entre los de MENOR pobreza y aun así es de los más caros
    expect(p.departamentosMasBajos).toContain('Maldonado')
    expect(interiorRentSpread().masCaro.departamento).toBe('Maldonado')
  })

  it('un hogar sobre la línea de pobreza puede seguir sin llegar a fin de mes', () => {
    // El punto de separar canasta y presupuesto: la CBT no es un estándar de vida.
    const line = officialLinesFor('montevideo', 'alquila')
    const soloSobreLaLinea = estimateBudget({ ...base, netIncome: line.cbt })
    expect(soloSobreLaLinea.verdict).toBe('noAlcanza')
  })
})
