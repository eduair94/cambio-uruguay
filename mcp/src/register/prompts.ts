// Guided workflows. In clients like Claude Desktop they show up as commands; each
// one tells the model what to ask, which tools to chain and how to close.

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Toolset } from "../toolsets.js";

const user = (text: string) => ({ messages: [{ role: "user" as const, content: { type: "text" as const, text } }] });
const extra = (label: string, value?: string) => (value ? `\n\n${label}: ${value}` : "");

export const PROMPTS: Record<Exclude<Toolset, "cambio">, string[]> = {
  alquileres: ["buscar-alquiler", "evaluar-aviso-alquiler", "comparar-barrios"],
  autos: ["buscar-auto-usado", "evaluar-auto"],
  productos: ["equipar-casa"],
};

export function registerRentalPrompts(server: McpServer): void {
  server.registerPrompt(
    "buscar-alquiler",
    {
      title: "Buscar alquiler a medida",
      description: "Entrevista corta y búsqueda personalizada de alquiler en Uruguay, con ranking por presupuesto y traslados.",
      argsSchema: { necesidades: z.string().optional().describe("Lo que ya sabés: presupuesto, barrios, dormitorios, trabajo…") },
    },
    ({ necesidades }) =>
      user(
        "Ayudame a encontrar alquiler en Uruguay. Primero preguntame en UN solo mensaje sólo lo que falte de: presupuesto mensual y si incluye gastos comunes, ingresos del hogar, departamento y barrios (o si no importa), dormitorios, mascotas, garaje, garantía que tengo, y dónde trabaja/estudia cada persona, cuántos días va y cómo se mueve. " +
          "Después usá rank_rentals_for_household (si hay ingresos o destinos) o search_rentals, abrí las 3 mejores con get_rental y compará con rental_market_stats. " +
          "Terminá con: tabla corta (precio, total con gastos comunes, barrio, distancia, garantía), por qué cada una, alertas (gastos no publicados, reportes, precio alto vs. mercado), qué preguntar en la visita y el link para guardar la búsqueda." +
          extra("Lo que sé", necesidades)
      )
  );

  server.registerPrompt(
    "evaluar-aviso-alquiler",
    {
      title: "¿Está bien de precio este alquiler?",
      description: "Evalúa un aviso de alquiler: precio contra el mercado, total real, barrio y señales de alerta.",
      argsSchema: { aviso: z.string().describe("URL o key de la ficha en cambio-uruguay.com, o los datos del aviso (barrio, dormitorios, m², precio).") },
    },
    ({ aviso }) =>
      user(
        "Evaluá este aviso de alquiler. Si es una ficha de cambio-uruguay.com usá get_rental; si son datos sueltos usá estimate_fair_rent con el precio pedido. " +
          "Decime: si el precio está alto, normal o bajo frente a comparables (con números), el total mensual real con gastos comunes, cómo es el barrio (compare_neighborhoods), qué otros portales lo publican y a qué precio, y 5 preguntas o chequeos antes de firmar (garantía, gastos comunes, estado, contrato)." +
          extra("Aviso", aviso)
      )
  );

  server.registerPrompt(
    "comparar-barrios",
    {
      title: "Comparar barrios para vivir",
      description: "Compara barrios por precio de alquiler, seguridad (denuncias), servicios públicos y comercios cercanos.",
      argsSchema: {
        barrios: z.string().optional().describe('Barrios separados por coma, p. ej. "Pocitos, Cordón, Malvín".'),
        departamento: z.string().optional(),
      },
    },
    ({ barrios, departamento }) =>
      user(
        "Compará estos barrios para alquilar con compare_neighborhoods y rental_market_stats: alquiler mediano y total con gastos comunes, denuncias, cortes de agua y reclamos, y servicios cercanos. " +
          "Si no hay barrios, rankeá los más baratos y los con menos denuncias. Cerrá con una recomendación según lo que me importe y aclarando los límites de los datos." +
          extra("Barrios", barrios) +
          extra("Departamento", departamento)
      )
  );
}

export function registerCarPrompts(server: McpServer): void {
  server.registerPrompt(
    "buscar-auto-usado",
    {
      title: "Buscar auto usado a medida",
      description: "Entrevista corta y búsqueda de auto usado en Uruguay: presupuesto, uso, consumo, oportunidades y riesgos.",
      argsSchema: { necesidades: z.string().optional().describe("Presupuesto en US$, uso, tamaño, caja, combustible…") },
    },
    ({ necesidades }) =>
      user(
        "Ayudame a comprar un auto usado en Uruguay. Preguntame en UN mensaje sólo lo que falte: presupuesto en dólares, para qué lo uso (ciudad, ruta, familia, trabajo), caja, combustible o consumo, carrocería, departamento y si acepto particulares. " +
          "Después: car_market_report(section=budgets) para ver qué modelos entran, search_used_cars con noDeclaredRisk=true y mis filtros, find_car_opportunities, y car_model_prices de los 2-3 modelos finalistas. " +
          "Terminá con una lista corta (auto, año, km, precio, frente a su cohorte, consumo, link), por qué cada uno y una checklist antes de señar (deuda en SUCIVE, Registro de la Propiedad Mueble, revisión mecánica, título a nombre del vendedor)." +
          extra("Lo que sé", necesidades)
      )
  );

  server.registerPrompt(
    "evaluar-auto",
    {
      title: "¿Está bien de precio este auto?",
      description: "Evalúa un aviso de auto usado contra autos iguales, su depreciación y los riesgos declarados.",
      argsSchema: { aviso: z.string().describe("URL o key de la ficha, o marca, modelo, año, km y precio.") },
    },
    ({ aviso }) =>
      user(
        "Evaluá este auto usado. Con una ficha de cambio-uruguay.com usá get_car; con datos sueltos usá car_model_prices del modelo y año. Sumá car_market_report(section=depreciation) del modelo. " +
          "Decime si el precio está alto, normal o bajo frente a autos iguales (con números), qué riesgos declara el vendedor, cuánto pierde de valor por año y qué revisar antes de comprar." +
          extra("Aviso", aviso)
      )
  );
}

export function registerProductPrompts(server: McpServer): void {
  server.registerPrompt(
    "equipar-casa",
    {
      title: "Presupuesto para equipar la casa",
      description: "Cuánto sale equipar una vivienda, restando lo que ya tenés, con dónde comprar cada cosa.",
      argsSchema: {
        nivel: z.string().optional().describe("minima, decente o completa"),
        tengo: z.string().optional().describe("Lo que ya tenés, separado por comas."),
      },
    },
    ({ nivel, tengo }) =>
      user(
        "Armame el presupuesto para equipar mi casa con plan_home_setup (restando lo que ya tengo) y, para los 3 ítems más caros, buscá opciones con search_products (vertical hogar) indicando si conviene usado. " +
          "Si voy a comprar online en una tienda que no conozco, revisala con check_online_store. Cerrá con el total, el total si compro todo nuevo y por dónde empezar." +
          extra("Nivel", nivel) +
          extra("Ya tengo", tengo)
      )
  );
}
