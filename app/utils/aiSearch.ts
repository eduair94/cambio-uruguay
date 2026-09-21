// /buscar-con-ia: everything the page lists about connecting an AI assistant to the
// search MCP. The tool names mirror mcp/src/register/*.ts; tests/unit/aiSearch.test.ts
// checks this file against those sources so the page never lists a tool that does not exist.

export const MCP_ENDPOINT = 'https://mcp.cambio-uruguay.com/mcp'
export const SKILL_ZIP_PATH = '/descargas/buscador-uruguay-skill.zip'
export const SKILL_SOURCE_URL =
  'https://github.com/eduair94/cambio-uruguay/tree/main/mcp/skills/buscador-uruguay'

export interface AiToolset {
  id: 'alquileres' | 'autos' | 'productos' | 'cambio'
  title: string
  icon: string
  url: string
  summary: string
  tools: ReadonlyArray<{ name: string; what: string }>
}

export const AI_TOOLSETS: readonly AiToolset[] = Object.freeze([
  {
    id: 'alquileres',
    title: 'Alquileres',
    icon: 'mdi-home-search-outline',
    url: `${MCP_ENDPOINT}/alquileres`,
    summary:
      'Unas 57.000 viviendas de cinco portales, rankeadas para tu hogar: presupuesto, ingresos, dónde trabaja o estudia cada uno, mascotas, garantía y barrio.',
    tools: [
      {
        name: 'rank_rentals_for_household',
        what: 'ranking personalizado por presupuesto y traslados',
      },
      {
        name: 'search_rentals',
        what: 'todos los filtros del directorio, con total mensual y gastos comunes',
      },
      { name: 'get_rental', what: 'ficha: precio en cada portal, mercado y barrio' },
      { name: 'rental_market_stats', what: 'cuánto cuesta alquilar por barrio y dormitorios' },
      { name: 'estimate_fair_rent', what: '¿me están cobrando caro?' },
      {
        name: 'compare_neighborhoods',
        what: 'precio, denuncias, cortes de agua y servicios por barrio',
      },
      { name: 'find_property_opportunities', what: 'avisos pedidos por debajo de comparables' },
      { name: 'geocode_uy_address', what: 'ubicar una dirección o esquina' },
    ],
  },
  {
    id: 'autos',
    title: 'Autos usados',
    icon: 'mdi-car-search-outline',
    url: `${MCP_ENDPOINT}/autos`,
    summary:
      'Unos 19.000 autos de diez fuentes, comparados contra autos iguales (modelo, año, versión, motor y caja), con los riesgos que declara el vendedor.',
    tools: [
      {
        name: 'search_used_cars',
        what: 'marca, modelo, año, km, precio, consumo, caja, carrocería…',
      },
      { name: 'find_car_opportunities', what: 'autos pedidos por debajo de su cohorte' },
      { name: 'get_car', what: 'un aviso contra su cohorte y la guía de precios' },
      { name: 'car_model_prices', what: 'cuánto vale un modelo por año y versión' },
      {
        name: 'car_declared_risks',
        what: 'deuda, choque o papeles declarados, con la frase del vendedor',
      },
      {
        name: 'car_market_report',
        what: 'qué se compra con cada presupuesto y cuánto se deprecia',
      },
    ],
  },
  {
    id: 'productos',
    title: 'Productos y precios',
    icon: 'mdi-tag-search-outline',
    url: `${MCP_ENDPOINT}/productos`,
    summary:
      'Celulares, sillas, 38 categorías para equipar la casa, monopatines y bicicletas eléctricas, tiendas online y precios oficiales de supermercado.',
    tools: [
      { name: 'search_products', what: 'precio más bajo, banda nuevo/usado y dónde comprar' },
      { name: 'plan_home_setup', what: 'cuánto sale equipar la casa, restando lo que ya tenés' },
      { name: 'check_online_store', what: 'señales de una tienda online (nunca un veredicto)' },
      { name: 'supermarket_prices', what: 'precios SIPC y súper más baratos por departamento' },
      { name: 'list_directories', what: 'todos los directorios del sitio' },
    ],
  },
  {
    id: 'cambio',
    title: 'Cotizaciones',
    icon: 'mdi-currency-usd',
    url: `${MCP_ENDPOINT}/cambio`,
    summary:
      'Las cotizaciones de todas las casas de cambio, la mejor para comprar o vender y la historia.',
    tools: [
      { name: 'get_rates', what: 'compra y venta en todas las casas' },
      { name: 'best_house', what: 'la mejor casa para comprar o vender' },
      { name: 'convert', what: 'convertir montos al mejor precio' },
      { name: 'list_houses', what: 'casas de cambio y dónde están' },
      { name: 'get_evolution', what: 'historia de una casa y moneda' },
      { name: 'get_news', what: 'noticias del dólar y la economía' },
      { name: 'daily_summary', what: 'resumen del mercado con IA' },
    ],
  },
])

export interface AiConnector {
  id: string
  title: string
  icon: string
  steps: readonly string[]
  /** Text the person copies (a URL, a command or a config file). */
  snippet?: string
}

const JSON_CONFIG = JSON.stringify(
  { mcpServers: { 'cambio-uruguay': { url: MCP_ENDPOINT } } },
  null,
  2
)
const VSCODE_CONFIG = JSON.stringify(
  { servers: { 'cambio-uruguay': { type: 'http', url: MCP_ENDPOINT } } },
  null,
  2
)
const BRIDGE_CONFIG = JSON.stringify(
  {
    mcpServers: { 'cambio-uruguay': { command: 'npx', args: ['-y', 'mcp-remote', MCP_ENDPOINT] } },
  },
  null,
  2
)

export const AI_CONNECTORS: readonly AiConnector[] = Object.freeze([
  {
    id: 'claude',
    title: 'Claude (web, escritorio y celular)',
    icon: 'mdi-robot-happy-outline',
    steps: [
      'Abrí Configuración → Conectores.',
      'Elegí «Agregar conector personalizado» y pegá la dirección de abajo. No pide usuario ni clave.',
      'En un chat nuevo activá el conector desde el menú de herramientas y pedí lo que buscás.',
    ],
    snippet: MCP_ENDPOINT,
  },
  {
    id: 'chatgpt',
    title: 'ChatGPT',
    icon: 'mdi-chat-processing-outline',
    steps: [
      'En los planes que admiten conectores MCP: Configuración → Aplicaciones y conectores → Configuración avanzada → activá el modo desarrollador.',
      'Creá un conector nuevo con la dirección de abajo, sin autenticación.',
      'En el chat elegí el conector y pedí la búsqueda.',
    ],
    snippet: MCP_ENDPOINT,
  },
  {
    id: 'claude-code',
    title: 'Claude Code',
    icon: 'mdi-console',
    steps: ['Corré este comando una vez en la terminal:'],
    snippet: `claude mcp add --transport http cambio-uruguay ${MCP_ENDPOINT}`,
  },
  {
    id: 'cursor',
    title: 'Cursor, Windsurf y otros editores',
    icon: 'mdi-code-json',
    steps: ['Agregá el servidor en la configuración MCP (en Cursor: .cursor/mcp.json):'],
    snippet: JSON_CONFIG,
  },
  {
    id: 'vscode',
    title: 'VS Code (Copilot)',
    icon: 'mdi-microsoft-visual-studio-code',
    steps: ['Creá .vscode/mcp.json con:'],
    snippet: VSCODE_CONFIG,
  },
  {
    id: 'stdio',
    title: 'Clientes que sólo aceptan servidores locales',
    icon: 'mdi-laptop',
    steps: [
      'Usá el puente mcp-remote (necesita Node.js), por ejemplo en claude_desktop_config.json:',
    ],
    snippet: BRIDGE_CONFIG,
  },
])

export interface AiPromptExample {
  vertical: 'alquileres' | 'autos' | 'productos'
  text: string
}

export const AI_PROMPT_EXAMPLES: readonly AiPromptExample[] = Object.freeze([
  {
    vertical: 'alquileres',
    text: 'Somos una pareja con un perro. Yo trabajo en el Centro tres días por semana y ella estudia en la Facultad de Ingeniería. Ganamos $110.000 entre los dos y queremos gastar como mucho $35.000 en vivienda con gastos comunes. Buscanos apartamentos de 1 o 2 dormitorios y explicame los mejores.',
  },
  {
    vertical: 'alquileres',
    text: '¿Está caro este alquiler? 2 dormitorios, 60 m², Pocitos, piden $38.000 más $6.000 de gastos comunes.',
  },
  {
    vertical: 'alquileres',
    text: 'Compará Cordón, Parque Rodó y La Blanqueada para alquilar: precio, seguridad, cortes de agua y comercios cerca.',
  },
  {
    vertical: 'alquileres',
    text: 'Tengo garantía de ANDA y un gato. Mostrame alquileres de dueño directo en Canelones que acepten mascotas.',
  },
  {
    vertical: 'autos',
    text: 'Quiero un auto usado automático hasta US$ 14.000, que gaste poco, para ciudad. Sin deuda ni choques declarados. ¿Qué me recomendás?',
  },
  {
    vertical: 'autos',
    text: '¿Cuánto vale un Volkswagen Gol 2015 con 120.000 km? ¿Y cuánto pierde por año?',
  },
  {
    vertical: 'productos',
    text: 'Me mudo a un apartamento vacío y ya tengo cama y heladera. ¿Cuánto me sale equipar lo mínimo, comprando usado cuando convenga?',
  },
  {
    vertical: 'productos',
    text: '¿Dónde está más barato un iPhone 13 de 128 GB? ¿Y es confiable la tienda?',
  },
])
