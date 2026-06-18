import type { AlertSpec } from "../store/app_client.js";

export function formatAlerts(alerts: Array<any>): string {
  if (!alerts.length) return "No tenés alertas. Creá una con /alerta USD compra 41";
  return alerts
    .map(
      (a) =>
        `• ${a.currency} ${a.kind === "bestBuy" ? "compra" : "venta"} ${a.op} ${a.target} ${a.active ? "🟢" : "⚪️"}`,
    )
    .join("\n");
}

export function formatFavorites(favs: Array<any>): string {
  if (!favs.length) return "No tenés favoritos guardados.";
  return favs.map((f) => `⭐ ${f.label || f.key}`).join("\n");
}

/** Parse `/alerta USD compra 41` → AlertSpec, or null. */
export function parseAlertCommand(args: string[]): AlertSpec | null {
  if (args.length < 3) return null;
  const currency = args[0]!.toUpperCase();
  const side = args[1]!.toLowerCase();
  const target = Number(args[2]);
  if (!["USD", "EUR", "BRL", "ARS"].includes(currency)) return null;
  if (!Number.isFinite(target)) return null;
  if (side.startsWith("compra")) return { currency, kind: "bestBuy", op: ">=", target };
  if (side.startsWith("venta")) return { currency, kind: "bestSell", op: "<=", target };
  return null;
}
