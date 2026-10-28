// Rental toolset (alquileres): 8 tools over the rental directory of cambio-uruguay.com.
// Descriptions are written for the model: units, valid values and when to use each.
// Every client pays for these schemas on every session, so the long explanations live in
// the skill (skills/buscador-uruguay/references/alquileres.md), not here.

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
import { READ_ONLY } from "./annotations.js";

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

const department = z.string().max(40).describe('Departamento con tildes, p. ej. "Montevideo", "Maldonado".');
const neighborhood = () => z.string().max(60).describe('Barrio como en los avisos, p. ej. "Pocitos".');
const money = (what: string) => z.number().positive().describe(what);
// Factories, not shared instances: a schema reused inside one tool is emitted as a $ref,
// and not every client resolves one (Gemini function declarations did not).
const lat = () => z.number().min(-35.5).max(-30).describe("Latitud decimal, p. ej. -34.91.");
const lng = () => z.number().min(-58.6).max(-53).describe("Longitud decimal, p. ej. -56.16.");
const homeType = () => z.enum(["apartamento", "casa"]);
const page = (max: number) => z.number().int().min(1).max(max).describe("Página de resultados, desde 1.");
const perPage = (fallback = 10) => z.number().int().min(1).max(24).describe(`Resultados por página (default ${fallback}).`);

const near = z
  .object({
    address: z.string().max(180).optional().describe('Dirección, esquina o lugar: "18 de Julio y Ejido", "Montevideo Shopping".'),
    lat: lat().optional(),
    lng: lng().optional(),
    label: z.string().max(60).optional().describe('Nombre del punto, p. ej. "Trabajo".'),
    radiusKm: z.number().positive().max(30).optional().describe("Radio en km en línea recta. Sin radio sólo ordena."),
  })
  .describe("Ordena por distancia a un punto (address o lat/lng); con radiusKm además filtra. Sólo avisos con ubicación propia.");

export function registerRentals(server: McpServer, site: SiteApi): void {
  server.registerTool(
    "geocode_uy_address",
    {
      title: "Ubicar una dirección en Uruguay",
      description:
        "Convierte una dirección, esquina, barrio o lugar de Uruguay («Tres Cruces», «Facultad de Ingeniería») en coordenadas (Google Maps). search_rentals y rank_rentals_for_household geocodifican solas si les pasás address.",
      inputSchema: {
        address: z.string().min(4).max(180).describe('Calle y número ("Av. Italia 2500"), esquina ("Rivera y Soca") o lugar ("Hospital de Clínicas").'),
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
        "Busca viviendas en alquiler en todo Uruguay: Mercado Libre, InfoCasas, El País, Casasweb, alquileres.uy, Facebook y redes, avisos vistos en los últimos 10 días. " +
        "Devuelve alquiler, gastos comunes y total cuando el aviso los publica (~70 % no publica gastos comunes), link al aviso y a la ficha, la mediana de la búsqueda, los barrios con más oferta y un link para guardarla o crear una alerta. " +
        "Para rankear por ingresos y traslados de un hogar: rank_rentals_for_household.",
      inputSchema: {
        department: department.optional(),
        neighborhoods: z.array(z.string().max(60)).max(20).optional().describe('Barrios, p. ej. ["Pocitos", "Cordón"].'),
        types: z.array(z.enum(RENTAL_TYPES)).max(5).optional().describe('Default: todos, con locales y oficinas. Para vivir: ["vivienda"] (apartamento + casa + habitación).'),
        excludeNeighborhoods: z.array(z.string().max(60)).max(20).optional().describe('Barrios a excluir, p. ej. ["Centro"].'),
        excludeTypes: z.array(z.enum(RENTAL_TYPES)).max(5).optional().describe('Tipos a restar de types, p. ej. ["habitacion"].'),
        roomsAndResidences: z.enum(["hide", "only"]).optional().describe("Cuartos, residencias y pensiones: hide los saca, only deja sólo ésos."),
        excludeSources: z.array(z.enum(RENTAL_SOURCES)).max(RENTAL_SOURCES.length).optional().describe("Portales a ocultar; la vivienda sigue si otro portal la publica."),
        hidePerNightPrices: z.boolean().optional().describe("Ocultar avisos en USD muy baratos para su zona (casi siempre precio por noche). Si no, salen con ⚠."),
        excludeWords: z.array(z.string().min(2).max(40)).max(10).optional().describe('Palabras que el título no puede tener: ["temporario", "pension"].'),
        bedrooms: z.number().int().min(0).max(10).optional().describe("Dormitorios mínimos (0 = monoambiente)."),
        bedroomsExact: z.boolean().optional().describe("true = exactamente bedrooms."),
        bathrooms: z.number().int().min(1).max(20).optional().describe("Baños mínimos."),
        areaMin: z.number().positive().optional().describe("m² mínimos."),
        areaMax: z.number().positive().optional().describe("m² máximos."),
        listedCurrency: z.enum(["UYU", "USD"]).optional().describe("Sólo avisos publicados en esa moneda. Los topes siguen en pesos."),
        priceMinUyu: z.number().positive().optional().describe("Alquiler mínimo en PESOS, sin gastos comunes (1 USD ≈ 41 UYU, o usá convert)."),
        priceMaxUyu: z.number().positive().optional().describe("Alquiler máximo en PESOS, sin gastos comunes. Los avisos en USD se comparan convertidos."),
        monthlyMaxUyu: money("Tope del total mensual (alquiler + gastos comunes) en pesos. Excluye avisos sin gastos comunes.").optional(),
        expensesMaxUyu: z.number().min(0).optional().describe("Gastos comunes máximos en pesos. Excluye avisos sin ese dato."),
        pets: z.boolean().optional().describe("Sólo los que aceptan mascotas explícitamente."),
        parking: z.boolean().optional().describe("Con garaje."),
        furnished: z.boolean().optional().describe("true = amueblado o semi; false = sin muebles. Los que no aclaran quedan afuera."),
        term: z.enum(["anual", "invernal"]).optional().describe("invernal = sólo alquiler de invierno (marzo–diciembre, costa); anual = el resto, incluye los que no aclaran."),
        guarantees: z.array(z.enum(RENTAL_GUARANTEES)).max(7).optional().describe("Acepta alguna de estas garantías. contaduria = CGN, aseguradora = seguro de alquiler, propietaria = fiador."),
        amenities: z.array(z.enum(RENTAL_AMENITIES)).max(11).optional().describe("Comodidades requeridas (todas)."),
        ownerDirect: z.boolean().optional().describe("Sólo dueño directo, sin inmobiliaria."),
        agency: z.string().max(80).optional().describe("Inmobiliaria: el final de su URL /inmobiliarias-uruguay/<clave>."),
        source: z.enum(RENTAL_SOURCES).optional().describe("Sólo este portal."),
        text: z.string().max(80).optional().describe('Texto en título o descripción, p. ej. "terraza".'),
        near: near.optional(),
        neighborhoodQuality: z.array(z.enum(NEIGHBORHOOD_QUALITY)).max(6).optional().describe("Barrios entre los mejores en esos rubros (denuncias = menos delitos, agua = menos cortes)."),
        hideReported: z.enum(["none", "any", "multiple"]).optional().describe("Ocultar avisos reportados como no disponibles: any = con 1 reporte, multiple = con 2+ (default), none = mostrar."),
        postedWithinDays: z.number().int().min(1).max(90).optional().describe("Publicados (o vistos por primera vez) en los últimos N días; 7 = última semana."),
        priceDropped: z.boolean().optional().describe("Sólo los que bajaron el alquiler en los últimos 30 días; cada resultado dice cuánto y cuándo."),
        sort: z.enum(RENTAL_SORTS).optional().describe("Default recientes. total = menor total mensual, baja = mayor baja de precio. Con near, por distancia."),
        page: page(200).optional(),
        perPage: perPage().optional(),
      },
      annotations: READ_ONLY,
    },
    safe((input) => searchRentals(site, input))
  );

  const destination = z.object({
    label: z.string().max(40).describe('Nombre corto: "Trabajo", "Facultad".'),
    kind: z.enum(["work", "study", "other"]).optional().describe("Tipo de destino (default work)."),
    address: z.string().max(180).optional().describe('Dirección o lugar ("Facultad de Ingeniería"), o lat/lng.'),
    lat: lat().optional(),
    lng: lng().optional(),
    daysPerWeek: z.number().int().min(0).max(7).optional().describe("Días por semana que va (default 5)."),
    mode: z.enum(["walking", "bicycling", "transit", "driving"]).optional().describe("Cómo va (default transit = ómnibus)."),
    maxKm: z.number().positive().max(300).optional().describe("Km máximos en línea recta (default: a pie 2, bici 6, ómnibus 8, auto 15)."),
  });

  server.registerTool(
    "rank_rentals_for_household",
    {
      title: "Rankear alquileres para un hogar",
      description:
        "Buscador PERSONALIZADO: puntúa las viviendas vigentes para un hogar según presupuesto (alquiler + gastos comunes frente a ingresos y gastos) y distancia de cada persona a sus destinos. " +
        "Devuelve puntaje 0-100, % del ingreso, lo que le queda al hogar, distancias y advertencias. " +
        "Pedí lo mínimo: presupuesto, dónde va cada uno, dormitorios, mascotas. Los ingresos no se guardan. ~10 consultas por minuto; la primera tarda hasta un minuto.",
      inputSchema: {
        people: z
          .array(
            z.object({
              label: z.string().max(40).describe('"Ana", "Pareja", "Hijo"…'),
              incomeUyu: z.number().min(0).optional().describe("Ingreso mensual líquido en pesos (0 si no tiene)."),
              remoteDays: z.number().int().min(0).max(7).optional().describe("Días de home office por semana."),
              destinations: z.array(destination).max(4).optional().describe("Hasta 4 lugares a los que va."),
            })
          )
          .min(1)
          .max(8)
          .describe("Integrantes del hogar (1 a 8)."),
        housingBudgetUyu: money("Presupuesto mensual para vivienda en pesos (alquiler + gastos comunes)."),
        otherExpensesUyu: z.number().min(0).optional().describe("Otros gastos fijos mensuales en pesos."),
        savingsUyu: z.number().min(0).optional().describe("Ahorro mensual a mantener, en pesos."),
        transportUyu: z.number().min(0).optional().describe("Gasto mensual en transporte, en pesos."),
        department: department.optional().describe("Departamento (default Montevideo)."),
        types: z.array(homeType()).max(2).optional().describe("Default: los dos."),
        minBedrooms: z.number().int().min(0).max(20).optional().describe("Dormitorios mínimos."),
        minArea: z.number().min(0).optional().describe("m² mínimos."),
        pets: z.boolean().optional().describe("Tiene que aceptar mascotas."),
        parking: z.boolean().optional().describe("Con garaje."),
        furnished: z.boolean().optional().describe("true = amueblado; false = sin muebles."),
        preferredNeighborhoods: z.array(z.string().max(60)).max(20).optional().describe('Barrios preferidos ("Pocitos").'),
        excludedNeighborhoods: z.array(z.string().max(60)).max(20).optional().describe("Barrios a descartar."),
        onlyPreferred: z.boolean().optional().describe("true = sólo los barrios preferidos."),
        includeReported: z.boolean().optional().describe("Incluir avisos reportados como no disponibles."),
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
        "Ficha completa de una vivienda en alquiler: todos los avisos que la publican (precio por portal e inmobiliaria), descripción, comodidades, garantía, superficies, comparación con la mediana de viviendas parecidas del barrio, similares y perfil del barrio (denuncias, cortes de agua, reclamos).",
      inputSchema: { key: z.string().min(3).max(600).describe("key que devuelven las otras tools o URL https://cambio-uruguay.com/alquileres/<key>.") },
      annotations: READ_ONLY,
    },
    safe((input) => getRental(site, input))
  );

  server.registerTool(
    "rental_market_stats",
    {
      title: "Cuánto cuesta alquilar",
      description:
        "Mercado de alquiler: mediana y rango p25–p75 del alquiler, gastos comunes, total mensual y precio por m², por departamento, barrio, tipo y dormitorios, más los barrios más accesibles y más caros. Para '¿cuánto sale un 2 dormitorios en Pocitos?' o '¿dónde me alcanza con $30.000?'. Son precios pedidos.",
      inputSchema: {
        department: department.optional(),
        neighborhood: neighborhood().optional().describe("Barrio (requiere department)."),
        type: homeType().optional().describe("Default: los dos."),
        bedrooms: z.number().int().min(0).max(10).optional().describe("Dormitorios exactos (0 = monoambiente)."),
        currency: z.enum(["UYU", "USD"]).optional().describe("Moneda de los avisos a analizar (default UYU)."),
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
        "Estima el alquiler justo de una vivienda concreta con avisos comparables de anunciantes distintos y, si se da askingPrice, ubica ese precio (percentil y % sobre o bajo la mediana). Para '¿me están cobrando caro?' o para negociar.",
      inputSchema: {
        department,
        neighborhood: neighborhood(),
        type: homeType().describe("apartamento o casa."),
        bedrooms: z.number().int().min(0).max(10).describe("Dormitorios (0 = monoambiente)."),
        bathrooms: z.number().int().min(1).max(10).describe("Baños."),
        areaM2: z.number().min(20).max(450).describe("Superficie en m² (casas: construida)."),
        areaBasis: z.enum(["built", "total"]).optional().describe("built = construida (default), total = con balcones y terrazas."),
        currency: z.enum(["UYU", "USD"]).optional().describe("Moneda de la estimación y de askingPrice (default UYU)."),
        parkingSpaces: z.number().int().min(0).max(10).optional().describe("Lugares de garaje."),
        askingPrice: z.number().positive().optional().describe("Alquiler pedido a evaluar, en currency."),
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
        "Compara barrios con datos públicos: alquiler mediano y total, precio por m², delitos denunciados (Ministerio del Interior), cortes de agua (OSE), reclamos a la IM, servicios cercanos y el puesto de cada barrio entre los 62 de Montevideo. " +
        "Pasá neighborhoods para comparar esos, o rankBy para listar los mejores.",
      inputSchema: {
        neighborhoods: z.array(z.string().max(60)).max(10).optional().describe('Barrios a comparar, p. ej. ["Pocitos", "Malvín"].'),
        department: department.optional(),
        type: homeType().optional().describe("Precios de apartamentos (default) o casas."),
        bedrooms: z.enum(["any", "0", "1", "2", "3", "4plus"]).optional().describe("Dormitorios de los precios (default any)."),
        rankBy: z.enum(["rent", "monthly", "safety", "services"]).optional().describe("rent = más baratos (default), monthly = menor total, safety = menos denuncias, services = más servicios."),
        limit: z.number().int().min(1).max(20).optional().describe("Barrios a devolver al rankear (default 10)."),
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
        "Viviendas pedidas por DEBAJO de avisos comparables (mismo barrio, tipo, dormitorios y superficie, varios anunciantes), con la brecha %, una brecha conservadora, cuántos comparables la sostienen y las cautelas. Alquiler compara alquiler + gastos comunes. Compara precios pedidos, no es una tasación.",
      inputSchema: {
        operation: z.enum(["rent", "sale"]).optional().describe("rent = alquiler (default), sale = venta."),
        department: department.optional(),
        neighborhood: neighborhood().optional(),
        type: homeType().optional().describe("Default: los dos."),
        bedrooms: z.number().int().min(0).max(8).optional().describe("Dormitorios exactos."),
        maxPrice: z.number().positive().optional().describe("Tope: pesos por mes (alquiler + gastos comunes) en alquiler, dólares en venta."),
        confidence: z.enum(["supported", "limited"]).optional().describe("supported = más sólida, limited = con limitaciones."),
        evidence: z.enum(["standard", "exploratory"]).optional().describe("standard = comparación sustentada, exploratory = para explorar."),
        signal: z.enum(["total_price", "price_per_m2"]).optional().describe("Brecha por precio total o por precio del m²."),
        sort: z.enum(["evidence", "discount", "price", "recent"]).optional().describe("evidence = más sólidas primero, discount = mayor brecha."),
        page: page(100).optional(),
        perPage: perPage(8).optional(),
      },
      annotations: READ_ONLY,
    },
    safe((input) => findPropertyOpportunities(site, input))
  );
}
