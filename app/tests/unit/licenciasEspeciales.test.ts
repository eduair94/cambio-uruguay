// Una página que dice cuántos días te da la ley no puede tener una cifra suelta.
//
// Todo lo que se afirma acá salió del texto vigente de la Ley 18.345 leído en impo.com.uy el
// 2026-09-03 (con las modificaciones de la Ley 18.458 ya incorporadas). Estos tests atan el
// contenido a esa lectura: si alguien cambia un número, tiene que cambiar también el test y volver
// a la norma.
import { describe, expect, it } from 'vitest'
import {
  DUELO_POR_PARENTESCO,
  LICENCIAS_ESPECIALES,
  LICENCIAS_FAQ,
  LICENCIAS_SOURCES,
  LICENCIAS_VERIFIED_AT,
  REGLAS_COMUNES,
} from '../../utils/licenciasEspeciales'

describe('licencia por duelo', () => {
  const dias = (parentesco: string) =>
    DUELO_POR_PARENTESCO.find(r => r.parentesco.toLowerCase().startsWith(parentesco))?.dias

  it('da 3 días hábiles a los ocho parentescos que nombra el artículo 7', () => {
    // "padre, madre, hijos, cónyuge, hijos adoptivos, padres adoptantes, concubinos y hermanos"
    for (const p of ['padre o madre', 'hijo o hija', 'cónyuge', 'concubino', 'hermano']) {
      expect(dias(p)).toBe(3)
    }
    expect(dias('hijo adoptivo')).toBe(3)
    expect(dias('padre o madre adoptante')).toBe(3)
  })

  it('NO da días por abuelo, tío, suegro ni cuñado — que es lo que la gente busca', () => {
    // El autocompletado uruguayo sugiere las cuatro. La respuesta honesta es que la ley no los
    // nombra, y omitir estas filas dejaría la página sin contestar lo que se pregunta.
    for (const p of ['abuelo', 'tío', 'suegro', 'cuñado']) {
      expect(dias(p)).toBe(0)
    }
  })

  it('cada fila sin días explica por qué, en vez de dejar un cero mudo', () => {
    for (const row of DUELO_POR_PARENTESCO.filter(r => r.dias === 0)) {
      expect(row.nota).toBeTruthy()
      expect(row.nota).toMatch(/no lo incluye/i)
    }
  })

  it('no inventa un parentesco con días distintos de 3 o 0', () => {
    for (const row of DUELO_POR_PARENTESCO) expect([0, 3]).toContain(row.dias)
  })
})

describe('las licencias especiales', () => {
  it('cita el artículo de cada una, y son artículos reales de la ley', () => {
    for (const lic of LICENCIAS_ESPECIALES) {
      expect(lic.articulo).toBeGreaterThanOrEqual(2)
      expect(lic.articulo).toBeLessThanOrEqual(12)
    }
  })

  it('trae las cinco que la ley concede además del duelo', () => {
    const slugs = LICENCIAS_ESPECIALES.map(l => l.slug)
    expect(slugs).toContain('duelo')
    expect(slugs).toContain('matrimonio')
    expect(slugs).toContain('estudio')
    expect(slugs).toContain('paternidad')
    expect(slugs).toContain('hijo-con-discapacidad')
    expect(slugs).toContain('familiar-a-cargo')
  })

  it('el matrimonio son 3 días y uno tiene que ser el del casamiento (art. 6)', () => {
    const m = LICENCIAS_ESPECIALES.find(l => l.slug === 'matrimonio')!
    expect(m.dias).toMatch(/3 días/)
    expect(m.detalle).toMatch(/día del casamiento/i)
    expect(m.articulo).toBe(6)
  })

  it('el estudio son 6, 9 o 12 según la carga horaria (art. 2) y pide antigüedad (art. 3)', () => {
    const e = LICENCIAS_ESPECIALES.find(l => l.slug === 'estudio')!
    expect(e.dias).toMatch(/6, 9 o 12/)
    expect(e.detalle).toMatch(/36 horas/)
    expect(e.detalle).toMatch(/48 horas/)
    expect(e.detalle).toMatch(/6 meses de antigüedad/)
  })

  it('la paternidad manda a su propia página en vez de repetir los días del BPS', () => {
    // La parte de esta ley son 3 días del empleador; el subsidio del BPS sale de otra norma y
    // tiene su propia página, que es la que se mantiene al día.
    const p = LICENCIAS_ESPECIALES.find(l => l.slug === 'paternidad')!
    expect(p.articulo).toBe(5)
    expect(p.verTambien?.to).toBe('/licencia-por-maternidad-y-paternidad-uruguay')
    expect(p.detalle).toMatch(/BPS/)
  })
})

describe('las reglas comunes', () => {
  it('dice las tres cosas que nadie sabe: no se descuentan, no se cobran, no generan vacacional', () => {
    const texto = REGLAS_COMUNES.map(r => r.regla).join(' ')
    expect(texto).toMatch(/no se descuentan de la licencia anual/i)
    expect(texto).toMatch(/irrenunciables/i)
    expect(texto).toMatch(
      /no genera salario vacacional|Ninguna de estas licencias genera salario vacacional/i
    )
  })

  it('aclara que es actividad privada', () => {
    expect(REGLAS_COMUNES.map(r => r.regla).join(' ')).toMatch(/actividad privada/i)
  })

  it('cada regla cita su artículo', () => {
    for (const r of REGLAS_COMUNES) expect(r.articulo).toBeGreaterThan(0)
  })
})

describe('fuentes y verificación', () => {
  it('cita el texto VIGENTE de IMPO, no el original', () => {
    // En IMPO `/bases/leyes/<n>` es el texto vigente y `/bases/leyes-originales/<n>` el de la
    // promulgación: citar el segundo es publicar una norma derogada.
    const urls = LICENCIAS_SOURCES.map(s => s.url).join(' ')
    expect(urls).toMatch(/impo\.com\.uy\/bases\/leyes\/18345-2008/)
    expect(urls).not.toMatch(/leyes-originales/)
  })

  it('todas las fuentes son enlaces reales a organismos', () => {
    for (const s of LICENCIAS_SOURCES) {
      expect(s.url).toMatch(/^https:\/\/(www\.)?(impo\.com\.uy|bps\.gub\.uy)/)
      expect(s.label.length).toBeGreaterThan(10)
    }
  })

  it('deja constancia de cuándo se leyó la norma', () => {
    expect(LICENCIAS_VERIFIED_AT).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('las preguntas frecuentes', () => {
  it('contestan las que sugiere el autocompletado, incluidas las negativas', () => {
    const preguntas = LICENCIAS_FAQ.map(f => f.question.toLowerCase()).join(' ')
    expect(preguntas).toMatch(/fallecimiento/)
    expect(preguntas).toMatch(/abuelo/)
    expect(preguntas).toMatch(/matrimonio/)
    expect(preguntas).toMatch(/estudio/)
  })

  it('ninguna respuesta queda vacía ni es una sola línea de relleno', () => {
    for (const f of LICENCIAS_FAQ) expect(f.answer.length).toBeGreaterThan(60)
  })
})
