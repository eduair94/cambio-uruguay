// Plan D — CyberLunes/Black Friday: el calendario de ediciones, sólo con fuente. Puro: nada de
// Date.now() adentro, `today` siempre es un parámetro `YYYY-MM-DD` comparado como STRING en UTC —
// las mismas tres letras que usa todo el resto de esta feature (`classes/priceevents/analyze.ts`,
// `classes/pricewatch/record.ts`), así que "hoy" nunca depende de en qué huso corre el proceso.
//
// Se replica en `app/utils/priceEvents.ts` (Task 3), con un test de paridad que vive en el suite del
// APP (`app/tests/unit/priceEventsCalendarParity.test.ts`, que importa este archivo directamente) —
// un test de la raíz no puede importar un archivo de `app/` (rompió el deploy el 2026-09-17).
export interface PriceEvent {
  key: string;
  label: string;
  start: string | null;
  end: string | null;
  confirmed: boolean;
  source: string | null;
  note: string;
}

/**
 * Verificado el 16–17/9/2026 (ver `docs/superpowers/plans/2026-09-16-directorios-d-eventos.md`):
 * CyberLunes lo organiza la CEDU dos veces por año, junio y noviembre. La edición de noviembre de
 * 2026 TODAVÍA NO TIENE FECHA PUBLICADA — se muestra "a confirmar por la CEDU" hasta que un humano
 * cargue la fecha real con su fuente, una línea de este arreglo y de su espejo en `app/`. Nunca
 * inventar una fecha para completar esta lista.
 */
export const PRICE_EVENTS: readonly PriceEvent[] = [
  {
    key: "ciberlunes-2025-11",
    label: "CyberLunes noviembre 2025",
    start: "2025-11-03",
    end: "2025-11-05",
    confirmed: true,
    source:
      "https://cuti.org.uy/en/destacados/noviembre-comienza-con-una-nueva-edicion-de-ciberlunes-con-hasta-70-off/",
    note: "",
  },
  {
    key: "ciberlunes-2026-06",
    label: "CyberLunes junio 2026",
    start: "2026-06-01",
    end: "2026-06-03",
    confirmed: true,
    source: "https://www.sodimac.com.uy/sodimac-uy/content/Ciberlunes/",
    note: "",
  },
  {
    key: "ciberlunes-2026-11",
    label: "CyberLunes noviembre 2026",
    start: null,
    end: null,
    confirmed: false,
    source: "https://www.cedu.org.uy/ciberlunes/",
    note: "La CEDU todavía no publicó la fecha.",
  },
  {
    key: "black-friday-2026",
    label: "Black Friday 2026",
    start: "2026-11-27",
    end: "2026-11-30",
    confirmed: true,
    source: null,
    note: "Del viernes 27 al lunes 30 de noviembre (Cyber Monday de EE.UU.).",
  },
];

/**
 * Un evento sin fecha publicada (`start`/`end` null) no puede compararse contra `today` — así que en
 * su lugar activa esta ventana amplia (adivinada del patrón de ediciones anteriores de noviembre) el
 * tiempo suficiente para que el job horario de evento (`--event-only`) empiece a recalcular antes de
 * que la CEDU confirme la fecha real, en vez de quedarse dormido hasta que alguien la cargue a mano.
 */
const UNCONFIRMED_WINDOW_START = "2026-11-01";
const UNCONFIRMED_WINDOW_END = "2026-11-08";

interface ResolvedWindow {
  event: PriceEvent;
  start: string;
  end: string;
}

function windowOf(event: PriceEvent): ResolvedWindow {
  if (event.start !== null && event.end !== null) return { event, start: event.start, end: event.end };
  return { event, start: UNCONFIRMED_WINDOW_START, end: UNCONFIRMED_WINDOW_END };
}

/**
 * Resolución pura sobre una lista de eventos cualquiera — separada de {@link activeEvent} para poder
 * probar la regla de superposición ("si dos ventanas se solapan, gana la confirmada") con datos
 * sintéticos, sin depender de que el calendario real algún día tenga dos ediciones que se pisen.
 * `today`/`start`/`end` son strings `YYYY-MM-DD` comparados lexicográficamente — válido porque ese
 * formato ordena igual que la fecha real, y evita meter un huso horario en una comparación que no lo
 * necesita.
 */
export function resolveActiveEvent(events: readonly PriceEvent[], today: string): PriceEvent | null {
  const active = events.map(windowOf).filter((w) => w.start <= today && today <= w.end);
  if (!active.length) return null;
  return (active.find((w) => w.event.confirmed) ?? active[0]!).event;
}

/** Ediciones dentro de [start, end] inclusive; la de noviembre de 2026 (sin fecha) activa la ventana
 * amplia con `confirmed: false`. `null` si ningún evento cubre `today`. */
export function activeEvent(today: string): PriceEvent | null {
  return resolveActiveEvent(PRICE_EVENTS, today);
}
