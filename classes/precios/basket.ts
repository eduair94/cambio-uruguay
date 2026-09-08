// La canasta propia, y las tres reglas que impiden publicarla mal.
//
// 1. Se calcula SÓLO con observaciones reales. El comparador oficial rellena
//    los huecos con un promedio nacional y publica un total que parece
//    comparable: para "Nalga vacuna con hueso" muestra el mismo `$509.32 (*)`
//    en 722 locales cuando hay 28 observaciones. Por eso sus totales por local
//    se aplastan a 1,18× mientras los artículos sueltos se abren hasta 4,86×.
// 2. Un local con cobertura bajo el 70 % NO se rankea. Dice "muestra
//    insuficiente", que es lo honesto y lo que el oficial no dice. La regla
//    además limpia sola un sesgo de la fuente: la "cadena" más grande del
//    catálogo son 152 locales de Farmashop, y una farmacia nunca va a declarar
//    el 70 % de una canasta de alimentos.
// 3. La composición está pinneada y versionada. El índice se niega a publicar
//    una variación si cambió la versión o si se derrumbó la cobertura: una
//    canasta que se mueve sola no mide precios, mide la canasta.
import { BASKET_V1, BASKET_V1_PINNED_AT } from "./basket_v1";
import { rankable } from "./plausibility";
import type { PrecioScoredRow } from "./audit";

export interface BasketItem {
  articleId: number;
  qty: number;
  need: string;
}

export const BASKET_VERSION = 1;
export const BASKET_ITEMS = BASKET_V1;
export const BASKET_PINNED_AT = BASKET_V1_PINNED_AT;

export const MIN_COVERAGE = 0.7;
export const MIN_QUALIFIED_STORES = 5;
export const INDEX_MAX_COVERAGE_DROP = 0.2;

/**
 * Las necesidades canónicas de la canasta.
 *
 * `scripts/oneoff/precios_pin_basket.ts` elige, para cada una, el artículo con
 * MÁS OBSERVACIONES — no el más barato: elegir por precio movería la
 * composición todos los días y un índice cuya canasta se mueve sola no mide
 * precios. Más observaciones es lo que maximiza cuántos locales se pueden
 * comparar entre sí.
 *
 * Las cantidades son un SUPUESTO DECLARADO (consumo mensual aproximado de un
 * hogar de dos personas), no una medición. Por eso el costo sirve para comparar
 * locales entre sí —que es para lo que se usa— y no es la canasta del INE ni
 * pretende serlo.
 */
export const NEEDS: ReadonlyArray<{ need: string; pattern: RegExp; qty: number }> = Object.freeze([
  Object.freeze({ need: "aceite", pattern: /^Aceite de girasol/i, qty: 2 }),
  Object.freeze({ need: "arroz", pattern: /^Arroz [Bb]lanco/i, qty: 3 }),
  Object.freeze({ need: "azúcar", pattern: /^Azúcar blanco/i, qty: 2 }),
  Object.freeze({ need: "fideos", pattern: /^Fideos secos semolados/i, qty: 4 }),
  Object.freeze({ need: "harina", pattern: /^Harina trigo (?:común )?0000/i, qty: 2 }),
  Object.freeze({ need: "polenta", pattern: /^Harina de maíz/i, qty: 1 }),
  Object.freeze({ need: "huevos", pattern: /^Huevos colorados/i, qty: 2 }),
  Object.freeze({ need: "carne picada", pattern: /^Carne picada vacuna Hasta 20/i, qty: 2 }),
  Object.freeze({ need: "carne con hueso", pattern: /^Paleta  vacuna con  hueso/i, qty: 2 }),
  Object.freeze({ need: "pollo", pattern: /^Pollo entero fresco/i, qty: 2 }),
  Object.freeze({ need: "manteca", pattern: /^Manteca/i, qty: 1 }),
  Object.freeze({ need: "queso rallado", pattern: /^Queso rallado/i, qty: 1 }),
  Object.freeze({ need: "yogur", pattern: /^Yogur/i, qty: 4 }),
  Object.freeze({ need: "dulce de leche", pattern: /^Dulce de leche envasado/i, qty: 1 }),
  Object.freeze({ need: "yerba", pattern: /^Yerba mate común/i, qty: 2 }),
  Object.freeze({ need: "café", pattern: /^Café envasado/i, qty: 1 }),
  Object.freeze({ need: "té", pattern: /^Té negro en saquitos/i, qty: 1 }),
  Object.freeze({ need: "pan de molde", pattern: /^Pan de molde/i, qty: 2 }),
  Object.freeze({ need: "galletitas", pattern: /^Galletitas al agua/i, qty: 2 }),
  Object.freeze({ need: "pulpa de tomate", pattern: /^Pulpa de tomate/i, qty: 4 }),
  Object.freeze({ need: "arvejas", pattern: /^Arvejas en conserva/i, qty: 2 }),
  Object.freeze({ need: "sal", pattern: /^Sal fina yodada/i, qty: 1 }),
  Object.freeze({ need: "papa", pattern: /^Papa /i, qty: 4 }),
  Object.freeze({ need: "cebolla", pattern: /^Cebolla /i, qty: 2 }),
  Object.freeze({ need: "tomate", pattern: /^Tomate /i, qty: 3 }),
  Object.freeze({ need: "manzana", pattern: /^Manzana /i, qty: 3 }),
  Object.freeze({ need: "banana", pattern: /^Banana /i, qty: 3 }),
  Object.freeze({ need: "papel higiénico", pattern: /^Papel higiénico/i, qty: 2 }),
  Object.freeze({ need: "detergente", pattern: /^Detergente para vajilla/i, qty: 1 }),
  Object.freeze({ need: "jabón en polvo", pattern: /^Jabón en [Pp]olvo/i, qty: 1 }),
  Object.freeze({ need: "hipoclorito", pattern: /^Hipoclorito de sodio/i, qty: 2 }),
  Object.freeze({ need: "jabón de tocador", pattern: /^Jabón de [Tt]ocador/i, qty: 3 }),
  Object.freeze({ need: "pasta dental", pattern: /^Pasta dental/i, qty: 1 }),
  Object.freeze({ need: "shampoo", pattern: /^Shampoo/i, qty: 1 }),
]);

const BASKET_BY_ARTICLE = new Map(BASKET_ITEMS.map((item) => [item.articleId, item]));

/**
 * Las necesidades de la canasta que NO son comida.
 *
 * Existe porque la canasta se armó para comparar locales, y para eso conviene
 * incluir limpieza e higiene —son artículos con mucha cobertura y precio
 * comparable—. Pero cualquiera que use el total como gasto en alimentos estaría
 * sumando el shampoo, que es el artículo más caro de la lista.
 */
export const NON_FOOD_NEEDS: ReadonlySet<string> = new Set([
  "papel higiénico",
  "detergente",
  "jabón en polvo",
  "hipoclorito",
  "jabón de tocador",
  "pasta dental",
  "shampoo",
]);

export interface NationalBasketCost {
  /** Σ mediana nacional × cantidad, sólo alimentos. */
  food: number;
  /** Ídem, limpieza e higiene. */
  nonFood: number;
  total: number;
  /** Cuántos de los artículos de la canasta tenían mediana. */
  itemsPriced: number;
  /** Cuántos de los que tenían mediana son alimentos. */
  foodItems: number;
  /** Cuántos son limpieza e higiene. */
  nonFoodItems: number;
  items: number;
}

/**
 * Lo que cuesta la canasta a precios nacionales MEDIANOS.
 *
 * Es la única cifra absoluta que esta fuente puede dar sin imputar nada: la
 * mediana de cada artículo sale de observaciones reales de ese artículo, y no se
 * rellena ningún hueco (a diferencia del total por local, que baja cuando al
 * local le faltan artículos — ver `storeBasket`).
 *
 * NO es un presupuesto alimentario y no puede serlo: el catálogo del SIPC no
 * tiene leche fluida, ni pan fresco, ni legumbres, y las cantidades de acá son
 * las de un índice de precios, no las de un consumo real. Medido el 2026-09-08
 * da $7.731 de comida para un hogar de dos, o sea $3.865 por adulto — por debajo
 * de la propia línea de indigencia del INE ($6.628). Sirve para ver precios
 * concretos y verificables, no para presupuestar.
 */
export function nationalBasketCost(medians: Map<number, number>): NationalBasketCost {
  let food = 0;
  let nonFood = 0;
  let foodItems = 0;
  let nonFoodItems = 0;

  for (const item of BASKET_ITEMS) {
    const median = medians.get(item.articleId);
    if (!median || !Number.isFinite(median) || median <= 0) continue;
    const line = median * item.qty;
    if (NON_FOOD_NEEDS.has(item.need)) {
      nonFood += line;
      nonFoodItems++;
    } else {
      food += line;
      foodItems++;
    }
  }

  return {
    food,
    nonFood,
    total: food + nonFood,
    itemsPriced: foodItems + nonFoodItems,
    foodItems,
    nonFoodItems,
    items: BASKET_ITEMS.length,
  };
}

export interface StoreBasket {
  /** Lo que cuestan, en ESTE local, los artículos que ESTE local declara. */
  cost: number;
  /** Lo que costarían esos mismos artículos a la mediana nacional. */
  referenceCost: number;
  /**
   * `cost / referenceCost`. Es la ÚNICA cifra con la que se ordena, y la única
   * comparable entre locales. Ver la nota larga en `storeBasket`.
   */
  ratio: number | null;
  coverage: number;
  items: number;
  qualified: boolean;
}

/**
 * La canasta de un local: lo que cobra, cuánto de la canasta declara, y —lo
 * único que sirve para ordenar— cuánto cobra comparado con la mediana nacional
 * de LOS MISMOS artículos.
 *
 * POR QUÉ EL RATIO Y NO EL TOTAL. El total suma sólo lo que el local declara,
 * así que a un local le baja el total por FALTARLE artículos, no por ser
 * barato. Medido el 2026-09-07 sobre los 211 locales calificados: la
 * correlación entre cobertura y total crudo es **0,842**, y entre los diez más
 * baratos por total y los diez más baratos por canasta emparejada **coincide
 * uno solo**. Ordenar por el total publicaría nueve artefactos de cobertura
 * como si fueran los supermercados más baratos del país.
 *
 * Es el mismo pecado del comparador oficial —hacer comparable lo que no lo
 * es— cometido en la dirección contraria, y por eso la regla de cobertura sola
 * no alcanzaba: filtra las muestras chicas pero no empareja las que quedan.
 *
 * Y NO SE PUBLICA UN TOTAL COMPLETADO. Escalar el ratio a los 33 artículos
 * daría un número lindo y comparable, pero sería imputar los artículos que el
 * local no vende: exactamente lo que se le critica al `(*)` del SIPC. Se
 * publica el ratio, y el total sólo al lado de su cobertura.
 *
 * Sólo entran filas que pueden encabezar un ranking: una góndola vieja o una
 * fila marcada `suspect` no aporta ni precio ni cobertura.
 */
export function storeBasket(rows: PrecioScoredRow[], medians?: Map<number, number>): StoreBasket {
  const cheapest = new Map<number, number>();
  for (const row of rows) {
    const item = BASKET_BY_ARTICLE.get(row.articleId);
    if (!item || !rankable(row)) continue;
    const current = cheapest.get(row.articleId);
    if (current === undefined || row.price < current) cheapest.set(row.articleId, row.price);
  }

  let cost = 0;
  let referenceCost = 0;
  for (const [articleId, price] of cheapest) {
    const { qty } = BASKET_BY_ARTICLE.get(articleId) as BasketItem;
    cost += price * qty;
    const median = medians?.get(articleId);
    if (median && Number.isFinite(median) && median > 0) referenceCost += median * qty;
  }

  const coverage = BASKET_ITEMS.length ? cheapest.size / BASKET_ITEMS.length : 0;
  return {
    cost,
    referenceCost,
    ratio: referenceCost > 0 ? cost / referenceCost : null,
    coverage,
    items: cheapest.size,
    qualified: coverage >= MIN_COVERAGE,
  };
}

/**
 * Nivel de precios por ámbito (departamento o cadena): la mediana de los ratios
 * de sus locales calificados. Nunca la mediana de los totales, por lo que
 * explica `storeBasket`.
 */
export function groupBaskets(
  baskets: Array<{ scope: string; ratio: number | null; qualified: boolean }>
): Array<{ scope: string; median: number; stores: number; qualified: boolean; note: string }> {
  const byScope = new Map<string, number[]>();
  for (const basket of baskets) {
    if (!basket.qualified || basket.ratio === null || !Number.isFinite(basket.ratio)) continue;
    const list = byScope.get(basket.scope) || [];
    list.push(basket.ratio);
    byScope.set(basket.scope, list);
  }

  return [...byScope.entries()].map(([scope, ratios]) => {
    const sorted = ratios.sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const qualified = sorted.length >= MIN_QUALIFIED_STORES;
    return {
      scope,
      median,
      stores: sorted.length,
      qualified,
      note: qualified
        ? `${sorted.length} locales calificados`
        : `muestra insuficiente: ${sorted.length} locales calificados, se necesitan ${MIN_QUALIFIED_STORES}`,
    };
  });
}

/** Si el índice puede publicar una variación contra el día anterior. */
export function indexDecision(
  today: { version: number; qualifiedStores: number },
  previous: { version: number; qualifiedStores: number } | null
): { publish: boolean; reason: string } {
  if (!previous) return { publish: true, reason: "primer día: se publica el nivel, todavía no hay variación" };
  if (today.version !== previous.version) {
    return {
      publish: false,
      reason: `la versión de la canasta cambió (${previous.version} -> ${today.version}): la serie se corta a propósito`,
    };
  }
  if (previous.qualifiedStores > 0 && today.qualifiedStores < previous.qualifiedStores * (1 - INDEX_MAX_COVERAGE_DROP)) {
    return {
      publish: false,
      reason: `los locales calificados cayeron de ${previous.qualifiedStores} a ${today.qualifiedStores}: la variación mediría la cobertura, no los precios`,
    };
  }
  return { publish: true, reason: `${today.qualifiedStores} locales calificados` };
}
