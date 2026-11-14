// Los hechos verificados de `/guias/bien-de-familia-uruguay`, cada uno contra la norma que lo
// sostiene.
//
// POR QUÉ UN TEST Y NO SÓLO LA REVISIÓN DEL DÍA QUE SE ESCRIBIÓ: esta guía se apoya en dos
// números y en una fecha, y los tres son del tipo que una edición posterior afloja sin querer.
//
//   - El TOPE (4.500 UR la casa-habitación, 7.000 la finca rústica) es de 1984, y es el único que
//     está publicado: el art. 5 del Decreto-Ley 15.597 manda al Poder Ejecutivo actualizarlo todos
//     los años y no encontramos ningún decreto posterior. La guía publica ése CON su fecha y dice
//     que hay que confirmarlo; lo que no puede pasar es que alguien le saque la fecha y lo deje
//     como "el tope" a secas, ni que lo reemplace por una cifra en pesos que nadie fijó.
//   - La FECHA es el hecho que cambia la respuesta: el art. 9 protege de las deudas contraídas
//     "con posterioridad a su constitución", así que a quien ya le están ejecutando la casa esto
//     no le sirve. Es justo lo que se busca saber, y es lo primero que se pierde si la guía se
//     resume. El test exige que la limitación siga escrita y que la guía nunca prometa lo contrario.
//   - Las DOS FORMALIDADES del art. 8 (publicación por diez días e inscripción) son las que, si
//     faltan, dejan la constitución sin efecto frente a terceros. Una guía que las cuente como
//     trámite accesorio manda al lector a pagar un escribano por una protección que no existe.
import { describe, expect, it } from 'vitest'
import { getGuide } from '../../utils/guides'
import { guideHubs } from '../../utils/guideHubs'

const guide = getGuide('bien-de-familia-uruguay')
const prose = () =>
  [
    guide!.title,
    guide!.description,
    ...guide!.sections.flatMap(s => [s.heading, s.body]),
    ...(guide!.steps ?? []).flatMap(s => [s.name, s.text]),
    ...(guide!.faqs ?? []).flatMap(f => [f.q, f.a]),
  ].join('\n')

describe('la guía del bien de familia', () => {
  it('existe y vive en el tema de deudas y crédito', () => {
    expect(guide).toBeDefined()
    const hubs = guideHubs
      .filter(hub => hub.guideSlugs.includes('bien-de-familia-uruguay'))
      .map(hub => hub.slug)
    expect(hubs).toEqual(['deudas-y-credito-uruguay'])
  })

  it('publica el tope del único decreto que lo fija, y con su año', () => {
    const text = prose()
    expect(text).toContain('4.500')
    expect(text).toContain('7.000')
    expect(text).toContain('504/984')
    // El tope es anual y el decreto es de 1984: sin esa salvedad, la cifra se lee como la de hoy.
    expect(text).toMatch(/art\. 5/)
    expect(text).toMatch(/confirm[áa] el tope vigente/i)
  })

  it('dice que la protección corre desde la constitución y no hacia atrás', () => {
    const text = prose()
    expect(text).toMatch(/con posterioridad a su constituci[óo]n/i)
    expect(text).toMatch(/deudas contra[íi]das despu[ée]s de la constituci[óo]n/i)
    // La promesa que esta guía nunca puede hacer.
    expect(text).not.toMatch(/protege de (?:todas )?(?:tus |las )?deudas anteriores/i)
  })

  it('cuenta las dos formalidades sin las que no es oponible a terceros', () => {
    const text = prose()
    expect(text).toMatch(/diez d[íi]as/)
    expect(text).toMatch(/Registro de la Propiedad/)
    expect(text).toMatch(/no es oponible a terceros/)
  })

  it('cita las dos normas en las que se apoya cada número', () => {
    const urls = (guide!.sources ?? []).map(source => source.url)
    expect(urls).toContain('https://www.impo.com.uy/bases/decretos-ley/15597-1984')
    expect(urls).toContain('https://www.impo.com.uy/bases/decretos/504-1984/1')
  })

  it('no publica honorarios de escribano, que no tienen arancel oficial', () => {
    expect(prose()).toMatch(/no tienen arancel oficial publicado/)
  })
})
