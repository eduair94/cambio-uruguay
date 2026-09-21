// Rental toolset (alquileres): 8 tools over the rental directory of cambio-uruguay.com.
// Descriptions are written for the model: units, valid values and when to use each.

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { safe } from "../output.js";
import { rankRentalsForHousehold } from "../rentals/household.js";
import { compareNeighborhoods, estimateFairRent, rentalMarketStats } from "../rentals/market.js";
import { findPropertyOpportunities } from "../rentals/opportunities.js";
import { getRental } from "../rentals/detail.js";
import { geocodeAddress, searchRentals } from "../rentals/search.js";
import { NEIGHBORHOOD_QUALITY, RENTAL_AMENITIES, RENTAL_GUARANTEES, RENTAL_SORTS, RENTAL_SOURCES, RENTAL_TYPES } from "../rentals/types.js";
import type { SiteApi } from "../site.js";

export const RENTAL_TOOLS = [
  "geocode_uy_address",
  "search_rentals",
  "rank_rentals_for_household",
  "get_rental",
  "rental_market_stats",
  "estimate_fair_rent",
  "compare_neighborhoods",
  "find_property_opportunities",
] as const;

const READ_ONLY = { readOnlyHint: true, openWorldHint: true } as const;
const department = z.string().max(40).describe('Departamento de Uruguay con tildes, p. ej. "Montevideo", "Canelones", "Maldonado", "Colonia".');
const money = (what: string) => z.number().positive().describe(what);

const near = z
  .object({
    address: z.string().max(180).optional().describe('Dirección, esquina, barrio o nombre de lugar en Uruguay: "Bulevar Artigas 1234", "18 de Julio y Ejido", "Montevideo Shopping".'),
    lat: z.number().min(-35.5).max(-30).optional(),
    lng: z.number().min(-58.6).max(-53).optional(),
    label: z.string().max(60).optional().describe('Nombre del punto, p. ej. "Trabajo".'),
    radiusKm: z.number().positive().max(30).optional().describe("Quedarse sólo con viviendas a esta distancia en línea recta (km). Sin radio, sólo ordena por cercanía."),
  })
  .describe("Buscar cerca de un punto: ordena por distancia y, con radiusKm, filtra. Sólo cuentan avisos con ubicación propia.");

export function registerRentals(server: McpServer, site: SiteApi): void {
  server.registerTool(
    "geocode_uy_address",
    {
      title: "Ubicar una dirección en Uruguay",
      description:
        "Convierte una dirección, esquina, barrio o nombre de lugar de Uruguay («Facultad de Ingeniería», «Tres Cruces», «Pocitos») en coordenadas con Google Maps. search_rentals y rank_rentals_for_household ya geocodifican solas si les pasás address: no hace falta llamar a esta antes.",
      inputSchema: {
        address: z.string().min(4).max(180).describe('Calle y número ("Av. Italia 2500"), esquina ("Rivera y Soca"), barrio o nombre del lugar ("Hospital de Clínicas").'),
        department: department.optional(),
      },
      annotations: READ_ONLY,
    },
    safe((input) => geocodeAddress(site, input))
  );

  server.registerTool(
    "search_rentals",
    {
      title: "Buscar alquileres en Uruguay",
      description:
        "Busca viviendas en alquiler en todo Uruguay (unión de Mercado Libre, InfoCasas, Inmuebles El País, Casasweb y Facebook Marketplace, ~57.000 propiedades, avisos vistos en los últimos 10 días). " +
        "Filtra por barrio, tipo, dormitorios, baños, m², precio (UYU o USD), TOTAL MENSUAL con gastos comunes, gastos comunes máximos, mascotas, garaje, amueblado, tipo de garantía (ANDA, Contaduría, seguro, depósito, BHU, propietario), comodidades, dueño directo, inmobiliaria, portal, texto libre, cercanía a un punto y calidad del barrio (pocas denuncias, pocos cortes de agua o reclamos). " +
        "Devuelve cada vivienda con alquiler, gastos comunes y total cuando el MISMO aviso los publica (~70 % no publica gastos comunes), link al aviso original, ficha en cambio-uruguay.com, la mediana de la búsqueda, los barrios con más oferta y un link para guardar la búsqueda o crear una alerta. Para rankear según ingresos y traslados de un hogar usá rank_rentals_for_household.",
      inputSchema: {
        department: department.optional(),
        neighborhoods: z.array(z.string().max(60)).max(20).optional().describe('Barrios como aparecen en los avisos: "Pocitos", "Cordón", "Punta Carretas", "Malvín"…'),
        types: z.array(z.enum(RENTAL_TYPES)).max(5).optional().describe('"vivienda" = apartamento+casa+habitación. Default: todos los tipos (incluye locales y oficinas), así que para vivir pasá ["vivienda"] o ["apartamento"].'),
        bedrooms: z.number().int().min(0).max(10).optional().describe("Dormitorios mínimos (0 = monoambiente). Con bedroomsExact=true, exactos."),
        bedroomsExact: z.boolean().optional(),
        bathrooms: z.number().int().min(1).max(20).optional().describe("Baños mínimos."),
        areaMin: z.number().positive().optional().describe("m² mínimos."),
        areaMax: z.number().positive().optional().describe("m² máximos."),
        listedCurrency: z.enum(["UYU", "USD"]).optional().describe("Sólo avisos publicados en esa moneda. NO cambia la moneda de los topes: priceMinUyu/priceMaxUyu son siempre pesos."),
        priceMinUyu: z.number().positive().optional().describe("Alquiler mínimo en PESOS (sin gastos comunes). Si la persona habla en dólares, convertí (1 USD ≈ 41 UYU, o usá convert)."),
        priceMaxUyu: z.number().positive().optional().describe("Alquiler máximo en PESOS (sin gastos comunes). Los avisos en dólares se comparan convertidos."),
        monthlyMaxUyu: money("Tope del TOTAL mensual en pesos (alquiler + gastos comunes). Excluye avisos que no publican gastos comunes.").optional(),
        expensesMaxUyu: z.number().min(0).optional().describe("Gastos comunes máximos en pesos. Excluye avisos que no los publican."),
        pets: z.boolean().optional().describe("Sólo avisos que aceptan mascotas explícitamente."),
        parking: z.boolean().optional().describe("Con garaje."),
        furnished: z.boolean().optional().describe("Amueblado."),
        guarantees: z.array(z.enum(RENTAL_GUARANTEES)).max(7).optional().describe("Garantías aceptadas (cualquiera de ellas): anda, contaduria (Contaduría General de la Nación), aseguradora (Porto, Sura, Mapfre…), propietaria (fiador propietario), deposito, bhu, aConvenir."),
        amenities: z.array(z.enum(RENTAL_AMENITIES)).max(11).optional().describe("Comodidades que debe tener (todas)."),
        ownerDirect: z.boolean().optional().describe("Sólo dueño directo (sin inmobiliaria)."),
        agency: z.string().max(80).optional().describe("Clave de una inmobiliaria."),
        source: z.enum(RENTAL_SOURCES).optional().describe("Un solo portal."),
        text: z.string().max(80).optional().describe('Texto libre en título y descripción, p. ej. "terraza", "patio".'),
        near: near.optional(),
        neighborhoodQuality: z.array(z.enum(NEIGHBORHOOD_QUALITY)).max(6).optional().describe("Barrios que están entre los mejores en: denuncias (menos delitos), agua (menos cortes), luz, saneamiento, limpieza, alumbrado."),
        hideReported: z.enum(["none", "any", "multiple"]).optional().describe('Avisos que la comunidad reportó como no disponibles. Default "multiple" (oculta con 2+ reportes).'),
        sort: z.enum(RENTAL_SORTS).optional().describe("recientes (default), precio, precio-desc, total (menor total mensual), precio-m2, metros. Con near se ordena por distancia."),
        page: z.number().int().min(1).max(200).optional(),
        perPage: z.number().int().min(1).max(24).optional().describe("Resultados a devolver (default 10)."),
      },
      annotations: READ_ONLY,
    },
    safe((input) => searchRentals(site, input))
  );

  const destination = z.object({
    label: z.string().max(40).describe('Nombre corto: "Trabajo", "Facultad", "Colegio de los chicos".'),
    kind: z.enum(["work", "study", "other"]).optional(),
    address: z.string().max(180).optional().describe("Dirección, esquina o nombre del lugar (\"Facultad de Ingeniería\", \"el Centro\"); se geocodifica sola. Alternativa: lat/lng."),
    lat: z.number().min(-35.5).max(-30).optional(),
    lng: z.number().min(-58.6).max(-53).optional(),
    daysPerWeek: z.number().int().min(0).max(7).optional().describe("Días por semana que va (default 5)."),
    mode: z.enum(["walking", "bicycling", "transit", "driving"]).optional().describe("Cómo va (default transit = ómnibus)."),
    maxKm: z.number().positive().max(300).optional().describe("Distancia máxima aceptable en línea recta. Default según modo: caminando 2, bici 6, ómnibus 8, auto 15 km."),
  });

  server.registerTool(
    "rank_rentals_for_household",
    {
      title: "Rankear alquileres para un hogar",
      description:
        "El buscador PERSONALIZADO: puntúa todas las viviendas vigentes (apartamentos y casas) para un hogar concreto. Cada persona puede tener ingreso, días de home office y hasta 4 destinos (trabajo, estudio) con días por semana y modo de traslado. " +
        "Combina presupuesto (alquiler + gastos comunes vs. ingreso y otros gastos) y distancias a los destinos según la prioridad (balanced, budget, commute). " +
        "Devuelve puntaje 0-100, total mensual, % del ingreso que se va en vivienda, lo que le queda al hogar, la distancia de cada persona a cada destino, motivos a favor y advertencias. " +
        "Pedile a la persona lo mínimo: presupuesto, dónde trabaja/estudia cada uno, dormitorios, mascotas. Los ingresos no se guardan. Límite del sitio: ~10 consultas por minuto; la primera puede tardar hasta un minuto.",
      inputSchema: {
        people: z
          .array(
            z.object({
              label: z.string().max(40).describe('"Ana", "Pareja", "Hijo"…'),
              incomeUyu: z.number().min(0).optional().describe("Ingreso mensual líquido en pesos (0 si no tiene)."),
              remoteDays: z.number().int().min(0).max(7).optional().describe("Días de home office por semana."),
              destinations: z.array(destination).max(4).optional(),
            })
          )
          .min(1)
          .max(8),
        housingBudgetUyu: money("Presupuesto mensual para vivienda en pesos (alquiler + gastos comunes)."),
        otherExpensesUyu: z.number().min(0).optional().describe("Otros gastos fijos mensuales del hogar en pesos."),
        savingsUyu: z.number().min(0).optional().describe("Ahorro mensual que quieren mantener."),
        transportUyu: z.number().min(0).optional().describe("Gasto mensual en transporte."),
        department: department.optional().describe("Departamento (default Montevideo)."),
        types: z.array(z.enum(["apartamento", "casa"])).max(2).optional(),
        minBedrooms: z.number().int().min(0).max(20).optional(),
        minArea: z.number().min(0).optional().describe("m² mínimos."),
        pets: z.boolean().optional().describe("Necesitan que acepte mascotas."),
        parking: z.boolean().optional(),
        furnished: z.boolean().optional(),
        preferredNeighborhoods: z.array(z.string().max(60)).max(20).optional().describe('Barrios preferidos ("Pocitos" o "Pocitos, Montevideo").'),
        excludedNeighborhoods: z.array(z.string().max(60)).max(20).optional().describe("Barrios a descartar."),
        onlyPreferred: z.boolean().optional().describe("true = sólo los barrios preferidos; false = los prefiere pero no descarta otros."),
        includeReported: z.boolean().optional().describe("Incluir avisos reportados como no disponibles (default no)."),
        includeOverBudget: z.boolean().optional().describe("Incluir los que se pasan del presupuesto (marcados)."),
        priority: z.enum(["balanced", "budget", "commute"]).optional().describe("Qué pesa más: equilibrado (default), precio o cercanía."),
        limit: z.number().int().min(1).max(24).optional().describe("Resultados a devolver (default 10)."),
      },
      annotations: READ_ONLY,
    },
    safe((input) => rankRentalsForHousehold(site, input))
  );

  server.registerTool(
    "get_rental",
    {
      title: "Ver un alquiler en detalle",
      description:
        "Ficha completa de una vivienda en alquiler: todos los avisos que la publican (precio por portal e inmobiliaria), descripción, comodidades, texto de la garantía, superficies, comparación con la mediana de viviendas parecidas del mismo barrio (y cuánto por encima o debajo está), viviendas similares y perfil del barrio (denuncias, cortes de agua, reclamos de saneamiento/limpieza/alumbrado). " +
        "Acepta la key que devuelven las otras tools o la URL https://cambio-uruguay.com/alquileres/<key>.",
      inputSchema: { key: z.string().min(3).max(600).describe("key de la vivienda o URL de su ficha.") },
      annotations: READ_ONLY,
    },
    safe((input) => getRental(site, input))
  );

  server.registerTool(
    "rental_market_stats",
    {
      title: "Cuánto cuesta alquilar",
      description:
        "Estadísticas del mercado de alquiler: mediana y rango típico (p25–p75) del alquiler, gastos comunes, total mensual y precio por m², por departamento, barrio, tipo y dormitorios, más los barrios más accesibles y más caros. Usalo para '¿cuánto sale alquilar 2 dormitorios en Pocitos?' o '¿dónde me alcanza con $30.000?'. Son precios pedidos, no firmados.",
      inputSchema: {
        department: department.optional(),
        neighborhood: z.string().max(60).optional().describe("Barrio (requiere department)."),
        type: z.enum(["apartamento", "casa"]).optional(),
        bedrooms: z.number().int().min(0).max(10).optional(),
        currency: z.enum(["UYU", "USD"]).optional().describe("Moneda de los avisos a analizar (default UYU: los avisos en pesos)."),
      },
      annotations: READ_ONLY,
    },
    safe((input) => rentalMarketStats(site, input))
  );

  server.registerTool(
    "estimate_fair_rent",
    {
      title: "Tasar un alquiler",
      description:
        "Estima el alquiler justo de una vivienda concreta (barrio, tipo, dormitorios, baños, m²) con avisos comparables de anunciantes distintos y, si se da askingPrice, ubica ese precio (percentil y % sobre/bajo la mediana). Sirve para '¿me están cobrando caro?' o para negociar. Casas: superficie construida.",
      inputSchema: {
        department,
        neighborhood: z.string().max(60),
        type: z.enum(["apartamento", "casa"]),
        bedrooms: z.number().int().min(0).max(10),
        bathrooms: z.number().int().min(1).max(10),
        areaM2: z.number().min(20).max(450).describe("Superficie en m²."),
        areaBasis: z.enum(["built", "total"]).optional().describe("built = construida (default), total = con balcones/terrazas."),
        currency: z.enum(["UYU", "USD"]).optional(),
        parkingSpaces: z.number().int().min(0).max(10).optional(),
        askingPrice: z.number().positive().optional().describe("Precio pedido a evaluar, en la moneda indicada."),
      },
      annotations: READ_ONLY,
    },
    safe((input) => estimateFairRent(site, input))
  );

  server.registerTool(
    "compare_neighborhoods",
    {
      title: "Comparar barrios",
      description:
        "Compara barrios lado a lado con datos públicos: alquiler mediano y total con gastos comunes, precio por m², delitos denunciados (Ministerio del Interior, por tipo), cortes de agua (OSE), reclamos de saneamiento/limpieza/alumbrado/calles (IM), servicios cercanos (supermercados, farmacias, salud, transporte, educación) y el puesto de cada barrio entre los 62 de Montevideo. " +
        "Pasá neighborhoods para comparar esos, o rankBy para listar los mejores (rent = más baratos, monthly = menor total, safety = menos denuncias, services = más servicios).",
      inputSchema: {
        neighborhoods: z.array(z.string().max(60)).max(10).optional(),
        department: department.optional(),
        type: z.enum(["apartamento", "casa"]).optional().describe("Precios de apartamentos (default) o casas."),
        bedrooms: z.enum(["any", "0", "1", "2", "3", "4plus"]).optional(),
        rankBy: z.enum(["rent", "monthly", "safety", "services"]).optional(),
        limit: z.number().int().min(1).max(20).optional(),
      },
      annotations: READ_ONLY,
    },
    safe((input) => compareNeighborhoods(site, input))
  );

  server.registerTool(
    "find_property_opportunities",
    {
      title: "Oportunidades inmobiliarias",
      description:
        "Viviendas pedidas por DEBAJO de avisos comparables (mismo barrio, tipo, dormitorios y superficie, varios anunciantes), con la brecha %, una brecha conservadora, cuántos comparables y anunciantes la sostienen, el nivel de evidencia y las cautelas. Alquiler compara alquiler + gastos comunes. Es una comparación de precios pedidos, no una tasación.",
      inputSchema: {
        operation: z.enum(["rent", "sale"]).optional().describe("rent = alquiler (default), sale = venta."),
        department: department.optional(),
        neighborhood: z.string().max(60).optional(),
        type: z.enum(["apartamento", "casa"]).optional(),
        bedrooms: z.number().int().min(0).max(8).optional().describe("Dormitorios exactos."),
        maxPrice: z.number().positive().optional().describe("Tope del precio comparado: pesos por mes en alquiler (alquiler + gastos comunes), dólares en venta."),
        confidence: z.enum(["supported", "limited"]).optional(),
        evidence: z.enum(["standard", "exploratory"]).optional(),
        signal: z.enum(["total_price", "price_per_m2"]).optional(),
        sort: z.enum(["evidence", "discount", "price", "recent"]).optional(),
        page: z.number().int().min(1).max(100).optional(),
        perPage: z.number().int().min(1).max(24).optional(),
      },
      annotations: READ_ONLY,
    },
    safe((input) => findPropertyOpportunities(site, input))
  );
}
