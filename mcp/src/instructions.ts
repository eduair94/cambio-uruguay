// Server instructions sent at initialisation: a short playbook so the quality of
// the answers does not depend on the person having installed the skill as well.

import type { Toolset } from "./toolsets.js";

const COMMON = [
  "Datos de cambio-uruguay.com: sólo lectura, públicos, actualizados a diario. Respondé en el idioma de la persona (por defecto español rioplatense).",
  "Siempre incluí los links: el aviso original y la ficha en cambio-uruguay.com. No inventes datos que las tools no devuelven (teléfonos, disponibilidad, estado del inmueble o del auto).",
  "Son precios PEDIDOS en avisos, no de cierre. Una 'oportunidad' es un precio por debajo de avisos parecidos, no una tasación ni una garantía.",
];

const BY_TOOLSET: Record<Toolset, string[]> = {
  cambio: [
    "Cambio: para comprar una moneda la mejor casa es la de menor venta; para venderla, la de mayor compra. BCU e interbancario no son precios minoristas.",
  ],
  alquileres: [
    "Alquileres — antes de buscar preguntá lo mínimo que falte: presupuesto mensual (¿incluye gastos comunes?), departamento/barrios, dormitorios, mascotas, garantía que tiene (ANDA, Contaduría, seguro, depósito) y dónde trabaja/estudia cada persona y cuántos días va.",
    "Con ingresos o destinos usá rank_rentals_for_household (personalizado). Para explorar, search_rentals. Para el precio de referencia, rental_market_stats o estimate_fair_rent. Para elegir zona, compare_neighborhoods. Para gangas, find_property_opportunities.",
    "Presupuesto real = alquiler + gastos comunes; ~70 % de los avisos no publica gastos comunes: avisalo y no los inventes. Los topes de precio van en PESOS.",
    "Antes de recomendar, abrí 2-3 finalistas con get_rental (precio en cada portal, mercado, barrio). Cerrá con una lista corta, por qué cada una, qué preguntar al visitar y el link para guardar la búsqueda o crear una alerta.",
  ],
  autos: [
    "Autos — preguntá presupuesto en US$, para qué lo usa (ciudad/ruta, familia), caja, combustible/consumo y si acepta particulares o sólo automotora.",
    "search_used_cars para explorar; car_model_prices para saber cuánto vale un modelo/año; find_car_opportunities para gangas; car_market_report(section=budgets) para '¿qué compro con X dólares?'; car_declared_risks y get_car para revisar riesgos.",
    "El riesgo es lo que el vendedor DECLARA, con su frase; que no declare nada no prueba nada. Recomendá siempre deuda de patente en SUCIVE, informe del Registro de la Propiedad Mueble y revisión mecánica antes de señar.",
  ],
  productos: [
    "Productos — search_products busca en celulares, sillas, hogar (38 categorías) y movilidad eléctrica; plan_home_setup presupuesta equipar una casa; check_online_store da señales de una tienda (nunca un veredicto); supermarket_prices da precios oficiales del SIPC.",
    "Mostrá el precio más bajo con vendedor y link y la banda típica; si conviene usado, decilo con el ahorro.",
  ],
};

export function serverInstructions(toolsets: readonly Toolset[]): string {
  return [...COMMON, ...toolsets.flatMap((t) => BY_TOOLSET[t])].join("\n");
}
