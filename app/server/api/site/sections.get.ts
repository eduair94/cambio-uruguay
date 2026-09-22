// El menú del sitio (secciones y páginas principales), para que un asistente sepa qué hay y dónde.
import { siteNavSections } from '../../utils/siteNavIndex'

export default defineEventHandler(event => {
  setResponseHeader(event, 'cache-control', 'public, max-age=3600, s-maxage=86400')
  return { sections: siteNavSections() }
})
