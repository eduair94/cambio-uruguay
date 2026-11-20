import {
  LISTINGS_NOTE,
  OPEN_DATA_ATTRIBUTION,
  OPEN_DATA_ENDPOINTS,
  OPEN_DATA_LICENSE,
  OPEN_DATA_MCP,
  OPEN_DATA_PAGE,
  OPEN_DATA_SITE,
  openDataEnvelope,
} from '../../../utils/openData'
import { openDataHeaders } from '../../utils/openData'

/** El catálogo de la API de datos abiertos: qué rutas hay, qué licencia y cómo citarnos. */
export default defineEventHandler(event => {
  openDataHeaders(event, 86_400)
  return openDataEnvelope(
    {
      documentacion: OPEN_DATA_PAGE,
      openapi: `${OPEN_DATA_SITE}/api/datos/openapi.json`,
      mcp: OPEN_DATA_MCP,
      licencia: { ...OPEN_DATA_LICENSE, alcance: 'estadísticas de /api/datos/mercado/*' },
      avisos: LISTINGS_NOTE,
      comoCitar: { ...OPEN_DATA_ATTRIBUTION },
      rutas: OPEN_DATA_ENDPOINTS.map(endpoint => ({
        ruta: endpoint.ruta,
        titulo: endpoint.titulo,
        descripcion: endpoint.descripcion,
        licencia: endpoint.licencia ? OPEN_DATA_LICENSE.nombre : null,
        ejemplo: `${OPEN_DATA_SITE}${endpoint.ejemplo}`,
        parametros: endpoint.parametros,
      })),
    },
    { pagina: OPEN_DATA_PAGE }
  )
})
