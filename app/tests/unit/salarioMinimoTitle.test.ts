import { describe, expect, it } from 'vitest'
import { SALARY_REFERENCE } from '../../utils/costOfLiving'
import { getGuide } from '../../utils/guides'

/**
 * La guía del salario mínimo lleva la cifra en el título, porque "sueldo minimo uruguay" busca un
 * número y el título sin número rindió 0 clics sobre 1.668 impresiones (GSC, 17/6–14/9/2026). Un
 * número en un título envejece: si el SMN cambia en el catálogo y el título no, esto rompe.
 */
describe('salario mínimo: el título publica el valor vigente del catálogo', () => {
  const guide = getGuide('salario-minimo-uruguay-cuanto-es')!
  const smn = SALARY_REFERENCE.minimoNacional.toLocaleString('es-UY')

  it('título y descripción nombran el mismo SMN que SALARY_REFERENCE', () => {
    expect(guide).toBeTruthy()
    expect(guide.title).toContain(`$ ${smn}`)
    expect(guide.description).toContain(`$ ${smn}`)
  })

  it('el cuerpo respalda la cifra del título', () => {
    const body = guide.sections.map(s => s.body).join(' ')
    expect(body.replace(/\s/g, '')).toContain(`$${smn}`)
  })

  it('el título entra en el SERP con la marca', () => {
    expect(`${guide.title} | Cambio Uruguay`.length).toBeLessThanOrEqual(60)
  })
})
