// La advertencia de Vuetify que costaba un megabyte de logs por día.
//
// Vuetify 4 avisa por consola en CADA render que `dense` está deprecado en VRow, con el stack de
// componentes completo. `RelatedPages` vive en el layout, o sea en todas las páginas, así que la
// advertencia salía una vez por render. Medido en el VPS sobre el log de un día entero
// (2026-09-02): 47.095 líneas y ~1 MB de stderr, casi todas esta advertencia — y adentro de ese
// ruido había ocho errores de verdad que nadie podía ver.
//
// Este test cuida SÓLO los componentes que están en el layout, que son los que multiplican por
// página. Las 65 apariciones restantes viven en páginas sueltas y cambiarlas todas de una es un
// riesgo visual en 37 archivos por una ganancia de logs mucho menor.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const APP = join(__dirname, '..', '..')

/** Los componentes que el layout monta en todas las páginas. */
const EN_EL_LAYOUT = ['RelatedPages.vue']

const layout = readFileSync(join(APP, 'layouts', 'default.vue'), 'utf8')

describe('nada del layout usa props deprecadas de Vuetify', () => {
  it('los componentes de la lista siguen estando en el layout (guarda de vacuidad)', () => {
    for (const nombre of EN_EL_LAYOUT) {
      expect(layout, `${nombre} ya no se monta en el layout`).toContain(nombre.replace('.vue', ''))
    }
  })

  it.each(EN_EL_LAYOUT)('%s no usa `dense` en una VRow', nombre => {
    const src = readFileSync(join(APP, 'components', nombre), 'utf8')
    // `density="..."` es lo correcto; `dense` suelto como atributo es lo que avisa.
    const filas = src.match(/<VRow[^>]*>/g) ?? []
    for (const fila of filas) {
      expect(fila, `VRow con prop deprecada: ${fila}`).not.toMatch(/\sdense([\s>=])/)
    }
  })

  it('el propio layout tampoco la usa', () => {
    const filas = layout.match(/<VRow[^>]*>|<v-row[^>]*>/g) ?? []
    for (const fila of filas) {
      expect(fila, `VRow con prop deprecada en el layout: ${fila}`).not.toMatch(/\sdense([\s>=])/)
    }
  })
})
