// Dos filas del libro de cambios que miden la MISMA página dentro de la misma ventana.
//
// POR QUÉ ESTE TEST. `AGENTS.md` lo dice con todas las letras —«dos filas de
// `docs/seo/experiments.json` sobre las mismas rutas arruinan la medición de las dos»— y lo escribe
// como escarmiento: entre el 21 y el 24/9/2026 la corrida diaria abrió tres PRs sobre las mismas
// descripciones porque ninguno se había mergeado. La disciplina que lo evita está escrita a mano en
// cuatro archivos de test (`temaHuerfanas`, `enlacesDeContexto`, `seoDescriptionBudget` y el
// presupuesto de migas de `seoContract`), que reservan una ruta mientras su ventana esté abierta y
// anotan a cuántas páginas les toca esperar y hasta cuándo. Lo que no existía era el trinquete, y
// la reserva es exactamente el tipo de regla que se cumple mientras alguien se acuerda: medida hoy
// sobre el archivo, **ya había 30 pares contaminados** y nada se había puesto rojo nunca.
//
// POR QUÉ CONTAMINA, Y POR QUÉ A LAS DOS FILAS. La ventana posterior de una fila son los 28 días
// archivados DESPUÉS de su `shippedOn` (`startExperiments`). Si una segunda fila toca el mismo
// sujeto `k` días más tarde, con `k` entre 0 y 28:
//
//   - la ventana POSTERIOR de la primera contiene el segundo cambio, así que su veredicto mide los
//     dos juntos y no puede atribuirle nada a ninguno;
//   - y la ventana ANTERIOR de la segunda (los 28 días previos a SU fecha) queda partida entre
//     días con el primer cambio y días sin él, o sea que su punto de partida tampoco es un estado.
//
// Pasados los 28 días no hay solape: la ventana posterior de la primera ya cerró y los días previos
// de la segunda son el régimen que dejó el primer cambio, que es justo el punto de partida
// correcto. De ahí que la condición sea `|Δfecha| ≤ EXPERIMENT_WINDOW_DAYS` y no una comparación
// con hoy: el solape sólo depende de las dos fechas declaradas y del sujeto, así que este test
// dictamina igual hoy que en un año.
//
// QUÉ HACER SI CI FALLA ACÁ. No bajar el número: el daño no se arregla a posteriori, una ventana
// contaminada ya se midió sucia. Hay tres salidas y las tres son antes de publicar:
//
//   1. esperar a que cierre la ventana de la fila que ya está abierta (`shippedOn` + 28 días), que
//      es lo que la reserva de los otros cuatro archivos viene haciendo a mano;
//   2. publicar el cambio SIN fila nueva, dentro de la que ya está abierta, aceptando que el
//      veredicto va a juzgar los dos cambios juntos — correcto cuando son el mismo cambio en dos
//      mitades (una tanda de títulos y sus descripciones, que es como se declararon las siete
//      tandas de octubre);
//   3. elegir otra página, que es lo que hace la corrida diaria cuando encuentra la cola reservada.
//
// Si el solape es DELIBERADO, la fila va a la lista de abajo con el motivo escrito al lado. Esa es
// la parte que el trinquete no puede decidir y la única razón por la que la lista es una lista y no
// un cero.
//
// LO QUE NO PUEDE VER. Una fila que simplemente no declara la ruta que tocó: ahí no hay solape que
// detectar porque no hay sujeto declarado, y el síntoma es el que ya cuida
// `experiments_routes.test.ts` («sin datos» para siempre). Y un cambio de plantilla que mueve una
// página que otra fila mide sin que ninguna de las dos lo diga — sin control no hay forma de verlo,
// que es la misma razón por la que `REVENUE_PLAN.md` prohíbe declarar un cambio que toca todo el
// sitio.
import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { EXPERIMENT_WINDOW_DAYS, parseSpecs, routeMatches } from "../../classes/revenueplan/experiments";
import type { ExperimentSpec } from "../../classes/revenueplan/types";

const EXPERIMENTS = path.join(__dirname, "..", "..", "docs", "seo", "experiments.json");

/**
 * Un segmento que ninguna página del sitio puede tener, para fabricar la URL testigo de una
 * familia. `/historico/*` no coincide con ninguna ruta concreta por sí sola: lo que hay que
 * preguntarse es si existe una URL que caiga en las dos filas, y para una familia esa URL es
 * «cualquier cosa debajo del prefijo».
 */
const INEXISTENTE = "zzz-no-existe";

/**
 * Las URLs testigo de una ruta declarada: la propia ruta y, si declara una familia, una URL
 * cualquiera de abajo.
 *
 * El solape se decide pasando estas URLs por `routeMatches`, que es el MISMO matcher que usa el
 * job, y no reimplementando su regla acá. Es deliberado: una copia de «termina en `/` o en `*`»
 * puede separarse del original sin que nada avise, y entonces el trinquete diría que no hay solape
 * justamente cuando el job sí mide las dos filas sobre la misma URL. El último test de este archivo
 * es el que impide que el testigo mienta.
 */
function testigos(route: string): string[] {
  const r = route.trim();
  if (r.endsWith("*")) return [r.slice(0, -1), `${r.slice(0, -1)}${INEXISTENTE}`];
  if (r.endsWith("/") && r.length > 1) return [r.slice(0, -1), `${r}${INEXISTENTE}`];
  return [r];
}

const consultas = (spec: ExperimentSpec) =>
  (spec.queries || []).map((q) => q.trim().toLowerCase()).filter(Boolean);

/** Lo que las dos filas miden en común: URLs que caen en las dos, y consultas declaradas por las dos. */
function sujetoCompartido(a: ExperimentSpec, b: ExperimentSpec): string[] {
  const candidatas = [...a.routes, ...b.routes].flatMap(testigos);
  const rutas = candidatas.filter((url) => routeMatches(a.routes, url) && routeMatches(b.routes, url));
  // Las consultas son la otra mitad del sujeto, y no es un adorno: el único solape que las rutas no
  // ven es un par de consultas (`indicadores-ur-ui-valor-vivo` y `ur-glosario-cede-el-valor` miden
  // las dos «unidad reajustable» a seis días de distancia, con rutas distintas a propósito porque
  // el segundo cambio movía esa consulta de una página a la otra).
  const deA = new Set(consultas(a));
  const compartidas = consultas(b)
    .filter((q) => deA.has(q))
    .map((q) => `«${q}»`);
  return [...new Set([...rutas, ...compartidas])].sort();
}

const diasEntre = (a: string, b: string) =>
  Math.abs(Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86400000;

/** Los pares que se pisan, rotulados `primera -> segunda` por fecha de publicación. */
function solapes(specs: ExperimentSpec[]): Array<{ par: string; sujeto: string[] }> {
  const out: Array<{ par: string; sujeto: string[] }> = [];
  for (let i = 0; i < specs.length; i++) {
    for (let j = i + 1; j < specs.length; j++) {
      const a = specs[i]!;
      const b = specs[j]!;
      if (diasEntre(a.shippedOn, b.shippedOn) > EXPERIMENT_WINDOW_DAYS) continue;
      const sujeto = sujetoCompartido(a, b);
      if (!sujeto.length) continue;
      // Con la misma fecha el desempate es por `id`, para que el rótulo no dependa del orden del
      // archivo: dos filas del mismo día se contaminan en los dos sentidos.
      const [primera, segunda] =
        `${a.shippedOn}${a.id}` <= `${b.shippedOn}${b.id}` ? [a, b] : [b, a];
      out.push({ par: `${primera.id} -> ${segunda.id}`, sujeto });
    }
  }
  return out.sort((x, y) => x.par.localeCompare(y.par));
}

/**
 * Los solapes que YA se midieron sucios. **SÓLO PUEDE BAJAR.**
 *
 * No es deuda que se arregle: los veredictos de estas treinta parejas ya se calcularon sobre
 * ventanas mezcladas y no hay forma de recalcularlos limpios (el archivo de Search Console tiene lo
 * que pasó, no lo que habría pasado). La lista es el registro de lo que no se puede atribuir, y
 * existe para que el test pueda estar en verde hoy y rojo mañana: una fila nueva que pise una
 * ventana abierta no entra acá, se corrige antes de publicarse.
 *
 * Medidos el 2026-10-15 sobre las 90 filas del archivo. Tres patrones, y ninguno es casualidad:
 *
 *  - **Una tanda ancha pisa a una fila puntual, o al revés.** Las tandas de descripciones de
 *    septiembre declaran diez o doce rutas de una vez, y nueve de ellas se cruzan con la fila propia
 *    de una de esas páginas publicada en la misma quincena (`/salir-del-clearing`,
 *    `/franquicia-aduana-uruguay`, `/salario-vacacional-uruguay`, las dos de movilidad…).
 *  - **Un racimo entero entrando a su tema.** `bps-jubilacion-en-su-tema` declara las once páginas
 *    del BPS el 27/9 y seis de ellas llevaban fila propia de la semana anterior: es el solape más
 *    repetido del archivo y el que mejor muestra el mecanismo, porque entrar a un tema es
 *    justamente un cambio pensado para mover tráfico.
 *  - **Tres filas sobre UNA página.** `/declaracion-de-irpf-uruguay` tiene tres
 *    (`irpf-anios-anteriores` el 14/9, `irpf-tres-casos-con-numero` el 23/9 y el racimo del BPS el
 *    27/9), que es el caso que `AGENTS.md` cuenta como escarmiento llevado al extremo: ninguno de
 *    los tres veredictos dice nada sobre su propio cambio.
 */
const SOLAPES_YA_MEDIDOS = [
  "bcu-historico-referencia -> historico-ultimos-cambios",
  "bps-jubilacion-en-su-tema -> certificado-unico-dgi",
  "certificados-bps -> bps-jubilacion-en-su-tema",
  "descripciones-del-tramo-contenido -> franquicias-consulta-y-renovacion",
  "descripciones-del-tramo-contenido -> salario-vacacional-simulador-y-escala",
  "descripciones-del-tramo-contenido -> tarjetas-y-pagos-entran-a-su-tema",
  "descripciones-del-tramo-contenido-por-tramo -> guias-mas-leidas-en-la-portada",
  "descripciones-que-empiezan-por-la-respuesta -> guias-mas-leidas-en-la-portada",
  "descripciones-que-empiezan-por-la-respuesta-2 -> tarjetas-y-pagos-entran-a-su-tema",
  "descripciones-que-empiezan-por-la-respuesta-3 -> tarjetas-y-pagos-entran-a-su-tema",
  "descripciones-que-no-pierden-el-dato -> bps-jubilacion-en-su-tema",
  "descripciones-que-no-pierden-el-dato -> clearing-que-pasa-y-categorias-bcu",
  "descripciones-que-no-pierden-el-dato -> movilidad-directorio-visual",
  "descripciones-que-no-pierden-el-dato -> tarjetas-y-pagos-entran-a-su-tema",
  "devolucion-fonasa-anio-y-cpe-julio-2026 -> bps-jubilacion-en-su-tema",
  "fecha-de-cobro-bps -> bps-jubilacion-en-su-tema",
  "guia-aguinaldo-casos-especiales -> guias-sin-indexar-reciben-enlaces",
  "indicadores-ur-ui-valor-vivo -> ur-glosario-cede-el-valor",
  "irpf-anios-anteriores -> bps-jubilacion-en-su-tema",
  "irpf-anios-anteriores -> irpf-tres-casos-con-numero",
  "irpf-tres-casos-con-numero -> bps-jubilacion-en-su-tema",
  "motos-usadas-directorio -> descripciones-del-tramo-dato-vivo",
  "prestamo-sin-recibo-de-sueldo -> prestamo-solo-con-cedula-y-topes",
  "reconocer-anos-trabajados-bps -> bps-jubilacion-en-su-tema",
  "snippet-entero-de-las-guias-respuesta-primero-3 -> guias-sin-indexar-reciben-enlaces",
  "snippet-entero-de-las-guias-respuesta-primero-4 -> guias-sin-indexar-reciben-enlaces",
  "tarjetas-2026-refresh -> guias-mas-leidas-en-la-portada",
  "titulos-de-las-guias-respuesta-primero-3 -> guias-sin-indexar-reciben-enlaces",
  "titulos-de-las-guias-respuesta-primero-4 -> guias-sin-indexar-reciben-enlaces",
  "titulos-que-responden -> descripciones-del-tramo-contenido-por-tramo",
];

/** El trinquete. Sólo puede bajar: subirlo es publicar una ventana que ya nace contaminada. */
const SOLAPES_MAXIMOS = 30;

describe("ninguna fila nueva pisa la ventana de otra", () => {
  const { specs, problems } = parseSpecs(JSON.parse(fs.readFileSync(EXPERIMENTS, "utf8")));

  it("hay filas para verificar", () => {
    expect(problems).toEqual([]);
    expect(specs.length).toBeGreaterThan(0);
  });

  it("los solapes son exactamente los declarados", () => {
    const encontrados = solapes(specs);
    const detalle = encontrados.map((s) => `${s.par}  (${s.sujeto.join(", ")})`).join("\n");
    expect(
      encontrados.map((s) => s.par),
      detalle
    ).toEqual([...SOLAPES_YA_MEDIDOS].sort());
  });

  it(`los solapes no pasan de ${SOLAPES_MAXIMOS}, y sólo pueden bajar`, () => {
    expect(SOLAPES_YA_MEDIDOS.length).toBeLessThanOrEqual(SOLAPES_MAXIMOS);
  });

  // Una fila renombrada o borrada dejaría su par acá y el conteo seguiría "verde" contra una
  // medición que ya no existe, igual que las listas de `temaHuerfanas.test.ts`.
  it("la lista no nombra una fila que no existe", () => {
    const ids = new Set(specs.map((s) => s.id));
    for (const par of SOLAPES_YA_MEDIDOS)
      for (const id of par.split(" -> ")) expect(ids.has(id), `${par}: ${id}`).toBe(true);
  });

  it("ningún par está declarado dos veces", () => {
    expect(new Set(SOLAPES_YA_MEDIDOS).size).toBe(SOLAPES_YA_MEDIDOS.length);
  });
});

describe("el detector de solapes funciona", () => {
  // Sin estos casos el test de arriba pasaría aunque `sujetoCompartido` devolviera siempre `[]`.
  const fila = (id: string, shippedOn: string, routes: string[], queries?: string[]): ExperimentSpec => ({
    id,
    shippedOn,
    routes,
    queries,
    hypothesis: "",
  });

  it("dos filas sobre la misma ruta dentro de la ventana se pisan", () => {
    const pares = solapes([fila("a", "2026-01-01", ["/x"]), fila("b", "2026-01-20", ["/x"])]);
    expect(pares.map((p) => p.par)).toEqual(["a -> b"]);
    expect(pares[0]!.sujeto).toEqual(["/x"]);
  });

  it("pasada la ventana no hay solape", () => {
    // 29 días: la ventana posterior de la primera ya cerró el día 28.
    expect(solapes([fila("a", "2026-01-01", ["/x"]), fila("b", "2026-01-30", ["/x"])])).toEqual([]);
  });

  it("dos rutas distintas no se pisan aunque sean del mismo día", () => {
    expect(solapes([fila("a", "2026-01-01", ["/x"]), fila("b", "2026-01-01", ["/y"])])).toEqual([]);
  });

  it("una familia se pisa con una página de abajo", () => {
    const pares = solapes([fila("a", "2026-01-01", ["/x/*"]), fila("b", "2026-01-10", ["/x/uno"])]);
    expect(pares.map((p) => p.par)).toEqual(["a -> b"]);
    expect(pares[0]!.sujeto).toEqual(["/x/uno"]);
  });

  it("una familia se pisa con otra familia que la contiene", () => {
    expect(solapes([fila("a", "2026-01-01", ["/x/"]), fila("b", "2026-01-10", ["/x/y/"])])).toHaveLength(1);
  });

  it("los espejos /en y /pt no se pisan con la ruta en español", () => {
    // El matcher compara el path entero, así que `/en/historico/*` y `/historico/*` son dos
    // conjuntos de URLs distintos. Una fila que mide los espejos (`historico-espejos-en-pt-meta`)
    // no contamina a la que mide el original.
    expect(solapes([fila("a", "2026-01-01", ["/historico/*"]), fila("b", "2026-01-10", ["/en/historico/*"])])).toEqual(
      []
    );
  });

  it("dos filas sobre la misma consulta se pisan aunque las rutas no se toquen", () => {
    const pares = solapes([
      fila("a", "2026-01-01", ["/x"], ["Unidad Reajustable"]),
      fila("b", "2026-01-10", ["/y"], ["unidad reajustable"]),
    ]);
    expect(pares.map((p) => p.par)).toEqual(["a -> b"]);
    expect(pares[0]!.sujeto).toEqual(["«unidad reajustable»"]);
  });

  it("el rótulo pone primero a la fila que se publicó antes", () => {
    expect(solapes([fila("z", "2026-01-01", ["/x"]), fila("a", "2026-01-10", ["/x"])])[0]!.par).toBe("z -> a");
  });
});
