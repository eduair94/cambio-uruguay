// Used-car toolset (autos): 6 tools over the used-car directory of cambio-uruguay.com.

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { CAR_RISK_CATEGORIES, carDeclaredRisks, carMarketReport, carModelPrices, findCarOpportunities, getCar } from "../cars/market.js";
import { searchUsedCars } from "../cars/search.js";
import { safe } from "../output.js";
import type { SiteApi } from "../site.js";

export const CAR_TOOLS = ["search_used_cars", "find_car_opportunities", "get_car", "car_model_prices", "car_declared_risks", "car_market_report"] as const;

const READ_ONLY = { readOnlyHint: true, openWorldHint: true } as const;
const FUELS = ["nafta", "diesel", "electrico", "hibrido", "gnc"] as const;
const BODIES = ["sedan", "hatchback", "suv", "pickup", "rural", "furgon", "monovolumen", "coupe", "cabriolet"] as const;
const DEPARTMENTS = [
  "Artigas", "Canelones", "Cerro Largo", "Colonia", "Durazno", "Flores", "Florida", "Lavalleja", "Maldonado", "Montevideo",
  "Paysandú", "Río Negro", "Rivera", "Rocha", "Salto", "San José", "Soriano", "Tacuarembó", "Treinta y Tres",
] as const;

const subject = {
  priceMaxUsd: z.number().positive().max(1_000_000).optional().describe("Precio máximo en dólares."),
  yearMin: z.number().int().min(1950).max(2100).optional(),
  kmMax: z.number().int().positive().optional(),
  fuel: z.enum(FUELS).optional(),
  transmission: z.enum(["manual", "automatica"]).optional(),
  body: z.enum(BODIES).optional().describe("Carrocería: sedan, hatchback, suv, pickup, rural (familiar), furgon, monovolumen, coupe, cabriolet."),
  maxLitersPer100Km: z.number().positive().max(30).optional().describe("Consumo máximo (litros cada 100 km)."),
  department: z.enum(DEPARTMENTS).optional(),
  seller: z.enum(["dealer", "private"]).optional().describe("dealer = automotora, private = particular."),
};

export function registerCars(server: McpServer, site: SiteApi): void {
  server.registerTool(
    "search_used_cars",
    {
      title: "Buscar autos usados en Uruguay",
      description:
        "Busca autos usados en todo Uruguay (~19.000 avisos de Mercado Libre, Facebook Marketplace, Dueño Directo, Clasiautos, Julio, Shopping de Autos, Carper, Fidocar, Motorlider y Car One; un mismo auto en varias fuentes aparece una vez). " +
        "Filtra por marca y modelo (nombres comunes, se resuelven solos), año, km, precio en US$, consumo máximo L/100 km, combustible, caja, carrocería, puertas, color, departamento, automotora o particular, fuente, bajó de precio, sólo oportunidades, sin deuda ni choque declarados y publicados en los últimos N días. " +
        "Cada auto trae versión, motor, consumo, si es oportunidad frente a autos iguales, precio de la guía de ML, riesgos que el vendedor declara (con su frase) y links.",
      inputSchema: {
        text: z.string().max(80).optional().describe('Texto libre: "4x4", "full", "cuero".'),
        brand: z.string().max(40).optional().describe('Marca: "Volkswagen", "Chevrolet", "Toyota"…'),
        model: z.string().max(60).optional().describe('Modelo: "Gol", "Onix", "Hilux" (requiere brand).'),
        yearMin: subject.yearMin,
        yearMax: z.number().int().min(1950).max(2100).optional(),
        kmMax: subject.kmMax,
        priceMinUsd: z.number().positive().optional(),
        priceMaxUsd: subject.priceMaxUsd,
        maxLitersPer100Km: subject.maxLitersPer100Km,
        fuel: subject.fuel,
        transmission: subject.transmission,
        body: subject.body,
        doors: z.number().int().min(2).max(5).optional(),
        color: z.string().max(20).optional().describe("blanco, gris, plata, rojo, azul, negro, verde, celeste, beige, marron, dorado, bordo, naranja, amarillo, violeta."),
        department: subject.department,
        seller: subject.seller,
        source: z.string().max(30).optional().describe("mercadolibre, facebook, duenodirecto, clasiautos, julio, shoppingdeautos, carper, fidocar, motorlider, carone."),
        priceDrop: z.boolean().optional().describe("Sólo los que bajaron de precio."),
        onlyOpportunities: z.boolean().optional().describe("Sólo pedidos por debajo de autos iguales."),
        noDeclaredRisk: z.boolean().optional().describe("Excluir los que declaran deuda, choque, papeles, recupero, etc."),
        sinceDays: z.number().int().min(1).max(365).optional().describe("Publicados en los últimos N días."),
        sort: z.enum(["recent", "price_asc", "price_desc", "km_asc", "year_desc", "consumption_asc"]).optional(),
        page: z.number().int().min(1).max(500).optional(),
        limit: z.number().int().min(1).max(24).optional().describe("Resultados a devolver (default 10)."),
      },
      annotations: READ_ONLY,
    },
    safe((input) => searchUsedCars(site, input))
  );

  server.registerTool(
    "find_car_opportunities",
    {
      title: "Oportunidades de autos usados",
      description:
        "Autos pedidos por DEBAJO de su cohorte fija: mismo modelo, año, versión, motor y caja, con km dentro de max(20.000, 30 %). Cada oportunidad pasa por su ficha (activa, mismo precio, sin choque/recupero/deuda/chapa extranjera declarados). Trae brecha %, brecha conservadora, la muestra (n, vendedores, p25/mediana/p75) y comparables con link. tier strict = evidencia sólida; exploratory = para explorar.",
      inputSchema: {
        tier: z.enum(["strict", "exploratory"]).optional(),
        brand: z.string().max(40).optional(),
        ...subject,
        sort: z.enum(["gap", "price_asc", "year_desc", "km_asc", "consumption_asc"]).optional(),
        page: z.number().int().min(1).max(200).optional(),
        limit: z.number().int().min(1).max(20).optional(),
      },
      annotations: READ_ONLY,
    },
    safe((input) => findCarOpportunities(site, input))
  );

  server.registerTool(
    "get_car",
    {
      title: "Ver un auto en detalle",
      description:
        "Ficha de un aviso de auto usado: versión, motor, km, consumo, la cohorte de autos iguales (mediana y rango) y dónde queda este precio, la referencia de la guía de ML, los riesgos que declara el vendedor con su frase y autos parecidos. Acepta la key o la URL https://cambio-uruguay.com/autos-usados-uruguay/<key>.",
      inputSchema: { key: z.string().min(3).max(300) },
      annotations: READ_ONLY,
    },
    safe((input) => getCar(site, input))
  );

  server.registerTool(
    "car_model_prices",
    {
      title: "Precios de un modelo por año y versión",
      description:
        "Cuánto se pide por un modelo: mediana y rango por año y por versión (motor y caja), la guía de precios de Mercado Libre, las oportunidades del modelo y los más baratos (de un año si se indica). Para '¿cuánto vale un Onix 2019?' o '¿a cuánto vendo mi auto?'.",
      inputSchema: {
        brand: z.string().min(2).max(40),
        model: z.string().min(1).max(60),
        year: z.number().int().min(1950).max(2100).optional(),
      },
      annotations: READ_ONLY,
    },
    safe((input) => carModelPrices(site, input))
  );

  server.registerTool(
    "car_declared_risks",
    {
      title: "Autos con deuda, choque o papeles declarados",
      description:
        "Avisos cuyo vendedor DECLARA un riesgo (deuda, papeles, siniestro/choque, recupero, mecánica, chapa extranjera, uso intensivo como ex taxi) con su frase textual, la severidad y cuánto menos pide frente a los mismos autos que no declaran nada; más el resumen por categoría. Útil para entender el descuento de un auto con deuda o para descartar riesgos.",
      inputSchema: {
        category: z.enum(CAR_RISK_CATEGORIES).optional(),
        brand: z.string().max(40).optional(),
        onlyMeasured: z.boolean().optional().describe("Sólo los que tienen cohorte limpia para medir el descuento."),
        ...subject,
        page: z.number().int().min(1).max(200).optional(),
        limit: z.number().int().min(1).max(20).optional(),
      },
      annotations: READ_ONLY,
    },
    safe((input) => carDeclaredRisks(site, input))
  );

  server.registerTool(
    "car_market_report",
    {
      title: "Informe del mercado de autos usados",
      description:
        "Informe del mercado uruguayo de usados (oferta publicada, no ventas). Secciones: overview (tamaño, precio/año/km medianos, modelos con más oferta), budgets (qué modelos se consiguen con cada presupuesto: pasá budgetUsd), depreciation (cuánto pierde por año cada modelo: pasá model), negotiation (cuántos bajan el precio y cuánto), seller_gaps (automotora vs particular), valuation (cuánto restan los km y suma la caja automática), rotation.",
      inputSchema: {
        section: z.enum(["overview", "budgets", "depreciation", "negotiation", "seller_gaps", "valuation", "rotation"]).optional(),
        budgetUsd: z.number().positive().optional(),
        model: z.string().max(60).optional().describe('Modelo para depreciation, p. ej. "Onix" o "Chevrolet Prisma".'),
      },
      annotations: READ_ONLY,
    },
    safe((input) => carMarketReport(site, input))
  );
}
