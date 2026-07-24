import { describe, expect, it } from "vitest";
import { parseDolarAhoraUsdRate } from "../classes/cambios/dolarahora";

const CARDS_HTML = `
  <div class="grid">
    <div class="card">
      <a href="https://www.scotiabank.com.uy">ScotiaBank</a>
      <span>Compra</span><span>$</span><span>39,07</span>
      <span>Venta</span><span>$</span><span>41,27</span>
      <div>Último cambio Compra $39,07 Venta $41,27</div>
    </div>
    <div class="card">
      <a href="https://www.bbva.com.uy">BBVA</a>
      <span>Compra</span><span>$</span><span>38</span>
      <span>Venta</span><span>$</span><span>42</span>
    </div>
  </div>
`;

describe("DolarAhora card parser", () => {
  it("extracts Scotiabank online USD independently from the other cards", () => {
    expect(parseDolarAhoraUsdRate(CARDS_HTML, "scotia")).toEqual({
      code: "USD",
      type: "TRANSFERENCIA",
      name: "Dólar online",
      buy: 39.07,
      sell: 41.27,
    });
  });

  it("extracts BBVA online USD independently from the other cards", () => {
    expect(parseDolarAhoraUsdRate(CARDS_HTML, "bbva")).toEqual({
      code: "USD",
      type: "TRANSFERENCIA",
      name: "Dólar online",
      buy: 38,
      sell: 42,
    });
  });

  it("rejects missing cards and invalid spreads", () => {
    expect(parseDolarAhoraUsdRate("", "bbva")).toBeNull();
    expect(
      parseDolarAhoraUsdRate(
        `<div class="card"><a href="https://www.bbva.com.uy">BBVA</a>
         <span>Compra $42</span><span>Venta $41</span></div>`,
        "bbva"
      )
    ).toBeNull();
  });
});
