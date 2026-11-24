import type {
  ComputerPublicListing,
  ComputerPublicMeta,
  ComputerPublicPart,
} from '../../utils/computadorasPublic'

/** Lo que escribe `sync_computadoras.ts --dry-run --json=<archivo>`. */
export interface ComputerPreviewFile {
  meta: ComputerPublicMeta | null
  items: ComputerPublicListing[]
  parts: ComputerPublicPart[]
}

/**
 * La vista previa de dev de las tres rutas de computadoras: el JSON del dry-run del job en vez de
 * Mongo, porque el `.env` local apunta a la base de PRODUCCIÓN y una prueba local no tiene por qué
 * leerla (ni escribirla). Sólo con `import.meta.dev`: el build de producción saca la rama entera.
 *
 * Devuelve null si la variable no está puesta; un archivo roto tira, y la ruta lo trata como
 * cualquier falla de lectura.
 */
export async function readComputerPreview(): Promise<ComputerPreviewFile | null> {
  if (!import.meta.dev || !process.env.COMPUTADORAS_PREVIEW_FILE) return null
  const { readFile } = await import('node:fs/promises')
  const file = JSON.parse(
    await readFile(process.env.COMPUTADORAS_PREVIEW_FILE, 'utf8')
  ) as Partial<ComputerPreviewFile>
  return {
    meta: file?.meta ?? null,
    items: Array.isArray(file?.items) ? file.items : [],
    parts: Array.isArray(file?.parts) ? file.parts : [],
  }
}

/** El «hoy» de la vista previa: el día de la corrida, para ver la página como la vería alguien a
 * la hora en que el job escribió (si no, un archivo de hace una semana saldría vacío por la
 * ventana de frescura). */
export function computerPreviewToday(file: ComputerPreviewFile): string {
  const at = Date.parse(file.meta?.generatedAt ?? '')
  return new Date(Number.isFinite(at) ? at : Date.now()).toISOString().slice(0, 10)
}
