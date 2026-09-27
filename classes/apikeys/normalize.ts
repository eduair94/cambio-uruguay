// Cómo se anota un pedido en el medidor de uso: qué ruta y qué programa. Puro.
//
// El campo del hash de Redis es `<cliente>|<ruta>` y se parte por el ÚLTIMO `|`, así que ninguna
// de las dos mitades puede traer uno: se reemplaza. Un 404 se anota como una sola fila porque los
// escáneres que piden `/.env` o `/wp-admin` abrirían una fila por intento; un 429 también, para
// que el uso de un cliente no se confunda con lo que se le negó.
const MAX_ROUTE = 60;
const MAX_UA = 120;

export function meterRoute(path: string, status: number): string {
  if (status === 404) return "(no-encontrada)";
  if (status === 429) return "(limitada)";
  const clean = String(path || "/").split("?")[0];
  const segments = clean
    .split("/")
    .filter(Boolean)
    .slice(0, 2)
    .map((segment) => {
      let value = segment;
      try {
        value = decodeURIComponent(segment);
      } catch {
        // Un `%` suelto no es un error del cliente que valga la pena anotar: queda como vino.
      }
      return value.toLowerCase().replace(/\d+/g, "0").replace(/[|\s]/g, "_");
    });
  return `/${segments.join("/")}`.slice(0, MAX_ROUTE);
}

export function meterUserAgent(ua: string | string[] | undefined): string {
  const raw = Array.isArray(ua) ? ua[0] : ua;
  const clean = String(raw ?? "")
    .replace(/[|\r\n]/g, " ")
    .trim();
  return clean ? clean.slice(0, MAX_UA) : "(sin user-agent)";
}
