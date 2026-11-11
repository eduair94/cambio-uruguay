// Paridad de la regla de "fuera de mercado" entre sus tres copias.
//
// El sitio decide qué precio puede coronar como "el mejor" con app/utils/marketOutlier.ts. El
// backend necesita la misma regla para el resumen que lee la IA (classes/market_outlier.ts) y el MCP
// para get_rates y best_house, que leen los bots (mcp/src/marketOutlier.ts). Son tres paquetes y tres
// builds, y ninguno importa de otro. El 2026-11-11 el sitio ya había dejado de coronar la pizarra
// quieta desde julio a 39,55, y el blog con IA, el newsletter y los bots la seguían publicando: es
// exactamente lo que pasa cuando una copia se queda atrás sin que falle nada.
//
// Las copias del app y del MCP se leen como texto y se transpilan acá (importarlas desde el backend
// es lo que no se puede hacer: otro tsconfig y otro sistema de módulos), y las tres se corren sobre
// los mismos mercados.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import * as backend from "../classes/market_outlier";

const ts = createRequire(resolve(__dirname, "parity.js"))("typescript");

type Rule = typeof backend;

function load(relative: string): Rule {
  const source = readFileSync(resolve(__dirname, "..", relative), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const module = { exports: {} as Rule };
  new Function("module", "exports", outputText)(module, module.exports);
  return module.exports;
}

const COPIES: Array<[string, Rule]> = [
  ["app/utils/marketOutlier.ts", load("app/utils/marketOutlier.ts")],
  ["mcp/src/marketOutlier.ts", load("mcp/src/marketOutlier.ts")],
];

/** A deterministic pseudo-random sequence, so a failure always reproduces. */
function lcg(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

const CENTERS: Record<string, number> = { USD: 40, EUR: 46, BRL: 7.5, ARS: 0.035, CHF: 50 };

/** A market of `size` boards around `center`, with stale, misparsed and missing prices mixed in. */
function market(code: string, size: number, random: () => number) {
  const center = CENTERS[code]!;
  return Array.from({ length: size }, () => {
    const roll = random();
    const buy = center * (0.93 + random() * 0.06);
    const sell = center * (1.0 + random() * 0.06);
    if (roll < 0.08) return { buy: buy * 0.9, sell: sell * 0.92 }; // a stale board
    if (roll < 0.12) return { buy: buy * 8, sell: sell / 8 }; // a misplaced comma
    if (roll < 0.15) return { buy: null, sell }; // one side missing
    if (roll < 0.17) return { buy: 0, sell }; // a zero
    return { buy, sell };
  });
}

describe("las tres copias de la regla de fuera de mercado", () => {
  it("las copias existen y traen la regla (guarda de vacuidad)", () => {
    for (const [name, copy] of COPIES) {
      expect(typeof copy.offMarketSide, name).toBe("function");
      expect(Object.keys(copy.OFF_MARKET_BANDS).length, name).toBeGreaterThan(0);
    }
  });

  it("tienen las mismas bandas, el mismo umbral y la misma muestra mínima", () => {
    for (const [name, copy] of COPIES) {
      expect(copy.OFF_MARKET_BANDS, name).toEqual(backend.OFF_MARKET_BANDS);
      expect(copy.OFF_MARKET_PCT, name).toBe(backend.OFF_MARKET_PCT);
      expect(copy.MIN_SAMPLE, name).toBe(backend.MIN_SAMPLE);
    }
  });

  it("descartan exactamente los mismos precios, en cada moneda y cada lado", () => {
    const random = lcg(20261111);
    let judged = 0;
    let flagged = 0;
    for (const code of Object.keys(CENTERS)) {
      for (const size of [5, 9, 10, 11, 25, 45]) {
        for (let round = 0; round < 8; round++) {
          const quotes = market(code, size, random);
          for (const side of ["buy", "sell"] as const) {
            const expected = quotes.map(backend.offMarketSide(quotes, code, side));
            for (const [name, copy] of COPIES) {
              expect(quotes.map(copy.offMarketSide(quotes, code, side)), `${name} ${code} ${side} ${size}`).toEqual(expected);
            }
            judged += expected.length;
            flagged += expected.filter(Boolean).length;
          }
        }
      }
    }
    // The generated markets must exercise both answers, or equality proves nothing.
    expect(flagged).toBeGreaterThan(50);
    expect(judged - flagged).toBeGreaterThan(1000);
  });
});
