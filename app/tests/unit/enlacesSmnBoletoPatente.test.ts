import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// La auditoría de enlaces internos del 2026-11-20 encontró cero enlaces de contexto hacia la
// guía del salario mínimo, el precio del boleto y la guía de la patente del SUCIVE desde las
// páginas que hablan justamente de eso. La navegación del sitio no llega a las dos guías, y el
// enlace al boleto que sí estaba era el del menú, el mismo de todas las páginas. Este test
// vigila que los enlaces puestos dentro de la frase que trata cada tema no se pierdan.

const read = (rel: string) =>
  readFileSync(fileURLToPath(new URL(`../../${rel}`, import.meta.url)), 'utf8')
const template = (source: string) => source.slice(0, source.search(/<script\b/))

describe('enlaces de contexto: salario mínimo, boleto y patente', () => {
  it('vivir con el salario mínimo enlaza la guía del SMN y el precio del boleto', () => {
    const tpl = template(read('pages/vivir-con-el-salario-minimo-uruguay.vue'))
    expect(tpl).toContain("localePath('/guias/salario-minimo-uruguay-cuanto-es')")
    expect(tpl).toContain("localePath('/precio-del-boleto-montevideo')")
  })

  it('vender mi auto enlaza la guía de la patente desde el certificado del SUCIVE', () => {
    const tpl = template(read('pages/vender-mi-auto-uruguay.vue'))
    expect(tpl).toContain("localePath('/guias/pagar-patente-sucive-uruguay')")
  })

  it('las páginas de autos por presupuesto listan la patente entre lo que hay que revisar', () => {
    // La lista vive desde el 2026-11-22 en utils/carBuyerGuides.ts, compartida con la página de
    // modelo y la ficha del aviso: el tramo de presupuesto la dibuja con <CarsBuyerGuides>.
    const tpl = template(read('pages/autos-usados-uruguay/hasta-[monto]-dolares.vue'))
    expect(tpl).toContain('<CarsBuyerGuides')
    expect(read('utils/carBuyerGuides.ts')).toContain("to: '/guias/pagar-patente-sucive-uruguay'")
  })
})
