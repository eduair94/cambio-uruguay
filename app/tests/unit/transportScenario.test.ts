import { describe, expect, it } from 'vitest'
import {
  TRANSPORT_SCENARIO_LIMITS,
  TRANSPORT_SCENARIO_PRESETS,
  transportScenarioFromQuery,
  transportScenarioNormalize,
  transportScenarioToQuery,
} from '../../utils/transportScenario'
import { TRANSPORT_DEFAULT_SCENARIO } from '../../utils/transportModel'

// Lo que se prueba acá es que el escenario SOBREVIVA a la URL. No es un detalle de comodidad: la
// comparación sólo sirve si se puede compartir con los números puestos ("mirá, con MI trayecto el
// monopatín se paga en 9 meses"), y una calculadora que no se puede enlazar así no se enlaza nunca.
//
// El otro motivo es defensivo: la query string la escribe cualquiera. Un `km=abc`, un `d=99` o un
// `w=-5` tienen que dar un escenario usable, nunca un NaN que se propague hasta el veredicto.

describe('transportScenarioNormalize', () => {
  it('sin entrada devuelve el escenario por defecto', () => {
    expect(transportScenarioNormalize(null)).toEqual(TRANSPORT_DEFAULT_SCENARIO)
    expect(transportScenarioNormalize(undefined)).toEqual(TRANSPORT_DEFAULT_SCENARIO)
    expect(transportScenarioNormalize({})).toEqual(TRANSPORT_DEFAULT_SCENARIO)
  })

  it('acota fuera de rango en vez de rechazar en silencio', () => {
    // Acotar y seguir es lo correcto: el visitante ve 7 días y entiende el tope. Rechazar el campo
    // entero le dejaría la página con el default y sin ninguna explicación.
    const out = transportScenarioNormalize({ daysPerWeek: 99, distanceKm: 0.1, horizonMonths: 999 })
    expect(out.daysPerWeek).toBe(TRANSPORT_SCENARIO_LIMITS.daysPerWeek.max)
    expect(out.distanceKm).toBe(TRANSPORT_SCENARIO_LIMITS.distanceKm.min)
    expect(out.horizonMonths).toBe(TRANSPORT_SCENARIO_LIMITS.horizonMonths.max)
  })

  it('un campo a medio escribir no contamina el resto', () => {
    // Un input vacío de Vuetify llega como NaN, no como cero. Si pasara, el veredicto entero sería
    // NaN y la página mostraría guiones sin decir por qué.
    const out = transportScenarioNormalize({ distanceKm: Number.NaN, daysPerWeek: 4 })
    expect(out.distanceKm).toBe(TRANSPORT_DEFAULT_SCENARIO.distanceKm)
    expect(out.daysPerWeek).toBe(4)
  })

  it('el sueldo por hora se apaga con cero, no se acota a cero', () => {
    // `null` y `0` significan cosas distintas: `null` es "no traduzcas horas a plata" y un cero
    // haría que toda hora ganada valiera exactamente nada, que es afirmar algo que nadie dijo.
    expect(transportScenarioNormalize({ wageHourlyUyu: 0 }).wageHourlyUyu).toBeNull()
    expect(transportScenarioNormalize({ wageHourlyUyu: -40 }).wageHourlyUyu).toBeNull()
    expect(transportScenarioNormalize({ wageHourlyUyu: 450 }).wageHourlyUyu).toBe(450)
  })

  it('ignora un valor de enumeración que no existe', () => {
    const out = transportScenarioNormalize({
      financing: 'leasing' as never,
      condition: 'seminuevo' as never,
    })
    expect(out.financing).toBe(TRANSPORT_DEFAULT_SCENARIO.financing)
    expect(out.condition).toBe(TRANSPORT_DEFAULT_SCENARIO.condition)
  })
})

describe('el escenario viaja en la URL', () => {
  it('sólo lo que difiere del default ocupa lugar en la query', () => {
    // Un enlace con quince parámetros no se comparte. El default no necesita viajar.
    expect(transportScenarioToQuery(TRANSPORT_DEFAULT_SCENARIO)).toEqual({})
  })

  it('ida y vuelta: lo que sale de la query vuelve a entrar igual', () => {
    const scenario = transportScenarioNormalize({
      distanceKm: 12.5,
      daysPerWeek: 3,
      tripsPerDay: 4,
      horizonMonths: 48,
      financing: 'contado',
      financingMonths: 12,
      alreadyOwned: true,
      parkingPaid: true,
      parkingHoursPerTrip: 2,
      condition: 'nuevo',
      wageHourlyUyu: 600,
      includeDepreciation: false,
      includeTheftRisk: false,
      includeRain: false,
    })
    expect(transportScenarioFromQuery(transportScenarioToQuery(scenario))).toEqual(scenario)
  })

  it('un booleano apagado viaja, porque apagarlo es una decisión', () => {
    // `includeRain: false` no es el default, así que tiene que quedar en el enlace: quien lo comparte
    // apagó la lluvia a propósito y el que abre el enlace tiene que ver el mismo número.
    const scenario = transportScenarioNormalize({ includeRain: false })
    expect(transportScenarioToQuery(scenario)).toEqual({ llu: '0' })
    expect(transportScenarioFromQuery({ llu: '0' }).includeRain).toBe(false)
  })

  it('basura en la query da un escenario usable, no un NaN', () => {
    const out = transportScenarioFromQuery({ km: 'abc', d: '', h: [], w: 'mucho' })
    expect(out.distanceKm).toBe(TRANSPORT_DEFAULT_SCENARIO.distanceKm)
    expect(out.daysPerWeek).toBe(TRANSPORT_DEFAULT_SCENARIO.daysPerWeek)
    expect(out.horizonMonths).toBe(TRANSPORT_DEFAULT_SCENARIO.horizonMonths)
    expect(out.wageHourlyUyu).toBeNull()
    expect(Object.values(out).every(value => !Number.isNaN(value as number))).toBe(true)
  })

  it('un parámetro repetido toma el primero en vez de tirar', () => {
    // `?km=5&km=9` llega como arreglo desde Nitro y desde vue-router.
    expect(transportScenarioFromQuery({ km: ['5', '9'] }).distanceKm).toBe(5)
  })
})

describe('los presets', () => {
  it('tienen slug único y no repiten el mismo trayecto', () => {
    const slugs = TRANSPORT_SCENARIO_PRESETS.map(preset => preset.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
    const trips = TRANSPORT_SCENARIO_PRESETS.map(
      preset =>
        `${preset.scenario.distanceKm}/${preset.scenario.daysPerWeek}/${preset.scenario.tripsPerDay}`
    )
    expect(new Set(trips).size).toBe(trips.length)
  })

  it('cada preset produce un escenario válido al aplicarlo', () => {
    for (const preset of TRANSPORT_SCENARIO_PRESETS) {
      const scenario = transportScenarioNormalize({
        ...TRANSPORT_DEFAULT_SCENARIO,
        ...preset.scenario,
      })
      expect(scenario.distanceKm).toBeGreaterThanOrEqual(TRANSPORT_SCENARIO_LIMITS.distanceKm.min)
      expect(scenario.daysPerWeek).toBeGreaterThanOrEqual(1)
      expect(preset.label.length).toBeGreaterThan(5)
      expect(preset.description.length).toBeGreaterThan(10)
    }
  })
})
