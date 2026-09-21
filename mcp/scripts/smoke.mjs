// Live smoke test: every site-backed handler against production (or SITE_BASE_URL).
// Not part of `npm test` (network). Run after `npm run build`: `npm run smoke`.

import { httpSiteApi } from "../dist/site.js";
import { geocodeAddress, searchRentals } from "../dist/rentals/search.js";
import { getRental } from "../dist/rentals/detail.js";
import { rankRentalsForHousehold } from "../dist/rentals/household.js";
import { compareNeighborhoods, estimateFairRent, rentalMarketStats } from "../dist/rentals/market.js";
import { findPropertyOpportunities } from "../dist/rentals/opportunities.js";
import { searchUsedCars } from "../dist/cars/search.js";
import { carDeclaredRisks, carMarketReport, carModelPrices, findCarOpportunities, getCar } from "../dist/cars/market.js";
import { listDirectories, searchProducts } from "../dist/products/search.js";
import { planHomeSetup } from "../dist/products/home.js";
import { checkOnlineStore } from "../dist/products/stores.js";
import { supermarketPrices } from "../dist/products/groceries.js";

const site = httpSiteApi(process.env.SITE_BASE_URL || undefined);
let failures = 0;
const results = {};

async function run(name, fn) {
  const t = Date.now();
  try {
    const out = await fn();
    results[name] = out;
    const first = out.text.split("\n").slice(0, 2).join(" | ");
    console.log(`OK   ${name} (${Date.now() - t} ms): ${first.slice(0, 180)}`);
  } catch (error) {
    failures++;
    console.log(`FAIL ${name} (${Date.now() - t} ms): ${error.message}`);
  }
}

await run("geocode_uy_address", () => geocodeAddress(site, { address: "18 de Julio 1234", department: "Montevideo" }));
await run("search_rentals", () => searchRentals(site, { department: "Montevideo", types: ["apartamento"], bedrooms: 2, priceMaxUyu: 35000, pets: true, perPage: 3 }));
await run("search_rentals near address", () => searchRentals(site, { department: "Montevideo", near: { address: "Avenida Rivera 2500", radiusKm: 2 }, types: ["vivienda"], perPage: 3 }));
await run("search_rentals near point", () => searchRentals(site, { near: { lat: -34.918, lng: -56.166, label: "Facultad de Ingeniería", radiusKm: 1.5 }, types: ["vivienda"], perPage: 3 }));
const firstKey = results.search_rentals?.data.items?.[0]?.key;
if (firstKey) await run("get_rental", () => getRental(site, { key: firstKey }));
await run("rank_rentals_for_household", () =>
  rankRentalsForHousehold(site, {
    people: [{ label: "Ana", incomeUyu: 90000, remoteDays: 2, destinations: [{ label: "Trabajo", address: "18 de Julio 1234", daysPerWeek: 3 }] }],
    housingBudgetUyu: 35000,
    minBedrooms: 1,
    limit: 3,
  })
);
await run("rental_market_stats", () => rentalMarketStats(site, { department: "Montevideo", type: "apartamento", bedrooms: 2 }));
await run("estimate_fair_rent", () =>
  estimateFairRent(site, { department: "Montevideo", neighborhood: "Pocitos", type: "apartamento", bedrooms: 2, bathrooms: 1, areaM2: 60, askingPrice: 38000 })
);
await run("compare_neighborhoods", () => compareNeighborhoods(site, { neighborhoods: ["Pocitos", "Cordón", "Malvín"] }));
await run("compare_neighborhoods safety", () => compareNeighborhoods(site, { department: "Montevideo", rankBy: "safety", limit: 5 }));
await run("find_property_opportunities", () => findPropertyOpportunities(site, { department: "Montevideo", perPage: 3 }));
await run("find_property_opportunities sale", () => findPropertyOpportunities(site, { operation: "sale", perPage: 3 }));
await run("search_used_cars", () => searchUsedCars(site, { brand: "Chevrolet", model: "Onix", priceMaxUsd: 16000, limit: 3 }));
const carKey = results.search_used_cars?.data.items?.[0]?.key;
if (carKey) await run("get_car", () => getCar(site, { key: carKey }));
await run("find_car_opportunities", () => findCarOpportunities(site, { limit: 3 }));
await run("car_model_prices", () => carModelPrices(site, { brand: "Volkswagen", model: "Gol", year: 2015 }));
await run("car_declared_risks", () => carDeclaredRisks(site, { category: "deuda", limit: 3 }));
await run("car_market_report budgets", () => carMarketReport(site, { budgetUsd: 9000 }));
await run("car_market_report depreciation", () => carMarketReport(site, { section: "depreciation", model: "Onix" }));
await run("list_directories", () => listDirectories(site));
await run("search_products", () => searchProducts(site, { text: "heladera", limit: 3 }));
await run("search_products phones", () => searchProducts(site, { vertical: "celulares", text: "iphone", limit: 3 }));
await run("plan_home_setup", () => planHomeSetup(site, { level: "minima", have: ["heladera", "colchón"] }));
await run("check_online_store", () => checkOnlineStore(site, { name: "temu" }));
await run("supermarket_prices", () => supermarketPrices(site, { text: "aceite", department: "Montevideo", limit: 3 }));

console.log(failures ? `\n${failures} failure(s)` : "\nall green");
process.exit(failures ? 1 : 0);
