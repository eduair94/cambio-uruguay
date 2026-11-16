// Un navegador manejado por un programa no es una visita.
//
// Medido el 16/11/2026: 388 de las 1.190 sesiones "directas" de Uruguay en 28 días duraron cero
// segundos y repetían la misma firma de dispositivo sobre la misma URL. Eran las auditorías del
// propio sitio (Playwright contra producción, con User-Agent `cu-seo-audit` y
// `cambio-uruguay-audit`) contándose como lectores, y son parte de por qué el canal directo
// "rebotaba" 46 %. Fuera de Uruguay, el 73 % de las sesiones de la propiedad era tráfico
// automatizado de terceros.
//
// `navigator.webdriver` es la señal estándar: lo pone en `true` el navegador cuando lo maneja
// WebDriver, Playwright o Puppeteer, y un lector nunca lo tiene. Un programa que se esfuerza por
// esconderse lo apaga, así que esto no es un filtro de bots: saca de la medición a quien no se
// esconde, que incluye a todas nuestras herramientas.
//
// LA TRAMPA QUE DEJA: una auditoría con Playwright ya no ve salir ningún hit de Analytics, y eso
// se lee igual que "GA está roto". Para medir la medición, la prueba pone
// `localStorage.cu_measure_automation = '1'` antes de cargar (o en un `addInitScript`).
//
// PURE: el plugin le pasa lo que leyó del navegador.

/** localStorage: esta sesión automatizada SÍ quiere ver salir los hits (para probar la medición). */
export const MEASURE_AUTOMATION_KEY = 'cu_measure_automation'

const OWN_AUTOMATION = /HeadlessChrome|cu-seo-audit|cambio-uruguay-audit/i

export function isAutomatedClient(
  client: { webdriver?: boolean; userAgent?: string } | null | undefined,
  optedIn = false
): boolean {
  if (!client || optedIn) return false
  return client.webdriver === true || OWN_AUTOMATION.test(client.userAgent || '')
}
