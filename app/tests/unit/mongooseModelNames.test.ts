import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

// Cada modelo se registra con `mongoose.models.X || mongoose.model('X', schema, 'coleccion')`: el
// primer término reusa el que ya registró el proceso (Nitro evalúa el módulo más de una vez). Si
// el nombre de la izquierda no es el de la derecha, el modelo pasa a ser OTRO en cuanto ése se
// registró antes. Pasó con movilidad (22/9 → 28/10/2026): `MovilidadListingModel` reusaba
// `mongoose.models.EquiparListing`, y en todo proceso que atendía primero un pedido de equipar
// `/api/movilidad/productos` leía `equiparlistings`: los directorios de monopatines y bicicletas
// quedaban en cero y la API servía aspiradoras. Depende del orden de los pedidos, así que ningún
// test de la ruta lo veía.
const MODELS_DIR = path.resolve(__dirname, '..', '..', 'server', 'models')
const REUSE =
  /mongoose\.models\.(\w+)(?:[^\w|?][^|?]*)?(?:\|\||\?\?)\s*mongoose\.model\s*(?:<[^>]*>)?\(\s*['"](\w+)['"]/g

function registrations() {
  const found: Array<{ file: string; reused: string; registered: string }> = []
  for (const file of fs.readdirSync(MODELS_DIR)) {
    if (!file.endsWith('.ts')) continue
    const source = fs.readFileSync(path.join(MODELS_DIR, file), 'utf8')
    for (const match of source.matchAll(REUSE)) {
      found.push({ file, reused: match[1]!, registered: match[2]! })
    }
  }
  return found
}

describe('modelos de mongoose del app', () => {
  it('cada uno reusa el modelo con su MISMO nombre, nunca el de otro', () => {
    const wrong = registrations()
      .filter(row => row.reused !== row.registered)
      .map(
        row => `${row.file}: mongoose.models.${row.reused} || mongoose.model('${row.registered}')`
      )
    expect(wrong).toEqual([])
  })

  it('la regla mira de verdad los modelos (no pasa por no encontrar ninguno)', () => {
    expect(registrations().length).toBeGreaterThan(50)
  })
})
