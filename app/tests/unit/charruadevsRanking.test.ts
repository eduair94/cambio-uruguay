import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  ghostdditUserUrl,
  isRedditUsername,
  orientationOf,
  redditUserUrl,
} from '../../utils/charruadevs'

const page = readFileSync(join(__dirname, '../../pages/ranking-usuarios-charruadevs.vue'), 'utf8')
const table = readFileSync(join(__dirname, '../../components/mercadoIt/AuthorTable.vue'), 'utf8')
const search = readFileSync(join(__dirname, '../../server/api/charruadevs/search.get.ts'), 'utf8')

describe('enlaces al perfil', () => {
  it('sólo enlaza lo que puede ser un usuario de Reddit', () => {
    expect(isRedditUsername('Bitter-Customer-7457')).toBe(true)
    expect(isRedditUsername('gclaramunt')).toBe(true)
    expect(isRedditUsername('[deleted]')).toBe(false)
    expect(isRedditUsername('a')).toBe(false)
    expect(isRedditUsername('u/con barra')).toBe(false)
    expect(isRedditUsername('')).toBe(false)
    expect(isRedditUsername(undefined)).toBe(false)
  })

  it('arma las dos URLs del perfil', () => {
    expect(redditUserUrl('gclaramunt')).toBe('https://www.reddit.com/user/gclaramunt/')
    expect(ghostdditUserUrl('gclaramunt')).toBe('https://ghostddit.aeddit.com/user/gclaramunt')
  })

  it('los enlaces salientes no pasan autoridad ni abren con acceso al opener', () => {
    expect(table).toContain('rel="noopener nofollow"')
    expect(table.match(/rel="noopener nofollow"/g)?.length).toBe(2)
  })
})

describe('orientación de un autor', () => {
  it('pide diez puntos de diferencia para declarar una inclinación', () => {
    expect(orientationOf({ neg: 0.7, pos: 0.1 })).toBe('negative')
    expect(orientationOf({ neg: 0.1, pos: 0.7 })).toBe('positive')
    expect(orientationOf({ neg: 0.35, pos: 0.3 })).toBe('mixed')
    expect(orientationOf({ neg: 0.4, pos: 0.4 })).toBe('mixed')
  })
})

describe('la página del ranking', () => {
  // Es la única página del sitio que publica nombres de usuario. Si alguien le saca el noindex,
  // buscar un nombre propio en Google puede devolver "los más negativos del sub".
  it('se declara noindex', () => {
    expect(page).toMatch(/robots:\s*'noindex, nofollow'/)
  })

  it('dice cómo se ordena y cómo salir de la lista', () => {
    expect(page).toContain('media encogida')
    expect(page).toContain("localePath('/contacto')")
  })

  it('no inventa un ranking cuando el snapshot todavía no lo trae', () => {
    expect(page).toContain('snap.value?.authors ?? null')
    expect(page).toContain('v-else')
  })
})

describe('el buscador sigue sin devolver autores', () => {
  // El corpus ahora guarda `author`, y lo único que impide que salga texto por texto es que la
  // proyección del buscador sea una lista blanca.
  it('proyecta campos uno por uno y ninguno es el autor', () => {
    const projection = search.slice(
      search.indexOf('const projection'),
      search.indexOf('if (q.q) projection.ts')
    )
    expect(projection).not.toContain('author')
    expect(projection).toContain('_id: 0')
    expect(search).not.toMatch(/items:\s*SearchItem\[\][\s\S]{0,400}author/)
  })
})
