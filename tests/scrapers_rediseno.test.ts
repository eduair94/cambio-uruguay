// Los dos scrapers que quedaron MUDOS tras el rediseño de sus sitios, no rotos.
//
// Medido el 2026-09-04: /api/scraper-health marcaba cambilex y nonica como "silent" — corrían sin
// excepción y devolvían cero filas — mientras sus dos sitios publicaban precios normalmente. Un
// dominio caído grita (sicurezza: ENOTFOUND -> "error" con mensaje); un selector vencido no dice
// nada, porque `classes/cambio.ts` convierte el arreglo vacío en un `console.error` y un `return`.
//
// Los fixtures son recortes del HTML REAL de ese día. Incluyen a propósito las filas que NO hay que
// publicar, que es la mitad del trabajo de estos parsers.
import axios from "axios";
import { afterEach, describe, expect, it, vi } from "vitest";
import CambioCambilex from "../classes/cambios/cambilex";
import Nonica from "../classes/cambios/nonica";

type Scraper = { get_data: () => Promise<Array<Record<string, unknown>>> };
const build = (Klass: unknown, origin: string): Scraper =>
  new (Klass as new (o: string) => Scraper)(origin);

// Widget del plugin `cambilex-cotizaciones`. Dos cosas load-bearing:
//  - la etiqueta de moneda viene DESPUÉS de un <span> con la bandera, y con saltos de línea;
//  - el widget entero está duplicado (copia desktop + copia móvil), así que hay que deduplicar.
const cambilexRow = (moneda: string, compra: string, venta: string) => `
  <div class="cc-grid-widget-row">
    <span class="cc-grid-widget-moneda">
      <span class="cc-widget-selector-flag"><img src="flags/x.png" /></span>
      ${moneda}    </span>
    <span class="cc-grid-widget-num">${compra}</span>
    <span class="cc-grid-widget-num">${venta}</span>
  </div>`;

const CAMBILEX_WIDGET = [
  cambilexRow("Dólar", "39,05", "41,45"),
  cambilexRow("Peso arg.", "0,02", "0,035"),
  cambilexRow("Real", "7,20", "8,45"),
  cambilexRow("Euro", "44,95", "51,00"),
  // Finza es la APP de Cambilex, con mejor precio de los dos lados. No es la pizarra.
  cambilexRow("Dólar finza", "39,75", "40,55"),
].join("");

const CAMBILEX_HTML = `<html><body>
  <div class="cc-widget cc-grid-widget"><div class="cc-grid-widget-rows">${CAMBILEX_WIDGET}</div></div>
  <div class="cc-widget cc-grid-widget elementor-hidden-desktop"><div class="cc-grid-widget-rows">${CAMBILEX_WIDGET}</div></div>
</body></html>`;

// Tabla del widget "EA Advanced Data Table". El sufijo de la clase es el ID del widget y cambia si
// lo editan, así que el parser NO se ancla en él. Las paridades cruzadas y el oro son reales.
const TREBOL_HTML = `<html><body>
<table class="ea-advanced-data-table ea-advanced-data-table-447aa9db">
  <tbody>
    <tr><td></td><td>COMPRA</td><td>VENTA</td></tr>
    <tr><td>Dólar</td><td>39,10</td><td>41,30</td></tr>
    <tr><td>Euro</td><td>46,25</td><td>49,50</td></tr>
    <tr><td>Peso Argentino</td><td>0,02</td><td>0,034</td></tr>
    <tr><td>Real</td><td>7,50</td><td>8,40</td></tr>
    <tr><td>Dólares USA por Libra esterlina</td><td>1.275</td><td>1.375</td></tr>
    <tr><td>Pesos Argentinos por Dólar</td><td>1.670</td><td>1.300</td></tr>
    <tr><td>Reales por Dólar</td><td>5,20</td><td>4,90</td></tr>
    <tr><td>Monedas y Lingotes de Oro</td><td>CONSULTE</td><td>CONSULTE</td></tr>
  </tbody>
</table></body></html>`;

const serve = (html: string) => vi.spyOn(axios, "get").mockResolvedValue({ data: html } as never);

afterEach(() => vi.restoreAllMocks());

describe("cambilex tras el rediseño a WordPress", () => {
  it("lee el widget de divs, que reemplazó a la tabla", async () => {
    serve(CAMBILEX_HTML);
    const rows = await build(CambioCambilex, "cambilex").get_data();
    expect(rows.map((r) => r.code)).toEqual(["USD", "ARS", "BRL", "EUR"]);
    expect(rows[0]).toMatchObject({ code: "USD", type: "", buy: 39.05, sell: 41.45 });
  });

  // El widget viene DOS veces en el home. Sin deduplicar, cada moneda se publicaba dos veces.
  it("no publica dos veces la misma moneda por la copia móvil del widget", async () => {
    serve(CAMBILEX_HTML);
    const rows = await build(CambioCambilex, "cambilex").get_data();
    expect(rows).toHaveLength(new Set(rows.map((r) => r.code)).size);
  });

  // Publicarla con type "" la dejaría PRIMERA en "mejor venta" del sitio: 40,55 contra 41,45 del
  // mostrador. Es un precio de app, no de ventanilla.
  it("no publica el dólar de la app Finza como si fuera el del mostrador", async () => {
    serve(CAMBILEX_HTML);
    const rows = await build(CambioCambilex, "cambilex").get_data();
    const usd = rows.filter((r) => r.code === "USD");
    expect(usd).toHaveLength(1);
    expect(usd[0].sell).toBe(41.45);
  });

  // Lo que falló la vez pasada: markup nuevo -> cero filas -> "silent" durante semanas.
  it("LANZA si el widget no está, en vez de quedarse mudo", async () => {
    serve("<html><body><p>otro layout del plugin</p></body></html>");
    await expect(build(CambioCambilex, "cambilex").get_data()).rejects.toThrow(/cc-grid-widget-row/);
  });
});

describe("El Trébol (nonica) tras el rediseño a WordPress", () => {
  it("lee la tabla nueva, sin columna índice y sin id", async () => {
    serve(TREBOL_HTML);
    const rows = await build(Nonica, "nonica").get_data();
    expect(rows.map((r) => r.code)).toEqual(["USD", "EUR", "ARS", "BRL"]);
    expect(rows[0]).toMatchObject({ buy: 39.1, sell: 41.3 });
  });

  // "Pesos Argentinos por Dólar" 1.670/1.300 y "Reales por Dólar" 5,20/4,90 tienen compra > venta:
  // publicarlas dispararía rate_plausibility y un Telegram por día por una fila inventada.
  it("no publica las paridades cruzadas ni el oro", async () => {
    serve(TREBOL_HTML);
    const rows = await build(Nonica, "nonica").get_data();
    expect(rows).toHaveLength(4);
    for (const r of rows) expect(Number(r.buy)).toBeLessThan(Number(r.sell));
    expect(rows.some((r) => String(r.name).includes("por"))).toBe(false);
    expect(rows.some((r) => String(r.name).toLowerCase().includes("oro"))).toBe(false);
  });

  it("LANZA si la tabla no trae ninguna moneda, en vez de quedarse mudo", async () => {
    serve("<html><body><table><tr><td>hola</td></tr></table></body></html>");
    await expect(build(Nonica, "nonica").get_data()).rejects.toThrow(/ninguna fila de cotizaci/);
  });
});
