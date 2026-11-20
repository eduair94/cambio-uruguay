// Etiquetas que sólo leen los lectores de pantalla (clase d-sr-only), para encabezados que en
// pantalla van vacíos a propósito. Los tres idiomas con mensajes propios; los demás reciben el
// español, como el resto del cuerpo que traduce utils/autoTranslate.ts.
const ACTIONS_HEADER: Record<string, string> = {
  es: 'Acciones',
  en: 'Actions',
  pt: 'Ações',
}

/** El nombre de la columna de botones («Ver histórico», «Ver casa») de una tabla de cotizaciones. */
export function actionsHeaderLabel(locale: string): string {
  return ACTIONS_HEADER[locale] ?? ACTIONS_HEADER.es!
}
