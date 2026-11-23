// Las semillas: cuentas que el relevamiento del 23/11/2026 encontró a mano, cada una con de dónde
// salió. No se publican por estar acá: se leen y se clasifican como cualquier otra. Las curadoras
// (redes y tiendas de emprendedores) no van a la grilla: sus colaboraciones son las que traen
// cuentas nuevas.
import type { SourceRef } from "./types";

const THREAD = "https://www.reddit.com/r/uruguay/comments/1tj8cru/nos_compartimos_emprendimientos_interesantes/";
const THREAD_LABEL = "Nos compartimos emprendimientos interesantes?";

export interface Seed {
  handle: string;
  source: Omit<SourceRef, "day">;
}

export const SEEDS: readonly Seed[] = Object.freeze([
  // Tarjetas y objetos pop-up de papel, hechos en Montevideo: el ejemplo del pedido.
  { handle: "mondo.popup", source: { kind: "uruguay-emprendedor", url: "https://www.uruguayemprendedor.uy/emprendimiento/mondo-pop-up/", label: "Mondo Pop-up", departamentoHint: "montevideo" } },
  // Las cuentas que dejó el hilo de r/uruguay del 21/5/2026.
  { handle: "luperouy", source: { kind: "reddit", url: THREAD, label: THREAD_LABEL } },
  { handle: "alter.creaciones", source: { kind: "reddit", url: THREAD, label: THREAD_LABEL } },
  { handle: "gildedlayer", source: { kind: "reddit", url: THREAD, label: THREAD_LABEL } },
  { handle: "eclatinsumos_uy", source: { kind: "reddit", url: THREAD, label: THREAD_LABEL } },
  { handle: "bombshop.uy", source: { kind: "reddit", url: THREAD, label: THREAD_LABEL } },
  { handle: "rito__uy", source: { kind: "reddit", url: THREAD, label: THREAD_LABEL } },
  { handle: "vapo__herbs", source: { kind: "reddit", url: THREAD, label: THREAD_LABEL } },
  { handle: "capaacapa.uy", source: { kind: "reddit", url: "https://www.reddit.com/r/uruguay/comments/1y3j25a/emprendimiento/", label: "EMPRENDIMIENTO" } },
  { handle: "queimpresion3d.uy", source: { kind: "semilla", label: "Relevamiento propio", url: null } },
  // Curadoras: redes de emprendedores y tiendas de marcas uruguayas.
  { handle: "red_de_emprendedores.uy", source: { kind: "semilla", label: "Red de emprendedores", url: null } },
  { handle: "lacomarca.uy", source: { kind: "semilla", label: "Tienda de emprendimientos", url: null } },
  { handle: "clubemprendedoresuy", source: { kind: "semilla", label: "Comunidad de emprendedores", url: null } },
  { handle: "uruguayemprendedor", source: { kind: "semilla", label: "Uruguay Emprendedor", url: null } },
]);
