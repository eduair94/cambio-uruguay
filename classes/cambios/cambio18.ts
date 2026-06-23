import axios from "axios";
import { CambioObj } from "../../interfaces/Cambio";
import { Cambio } from "../cambio";

// Cambio 18 runs on Wix (Thunderbolt). The visible rate table is rendered
// CLIENT-SIDE, so a cheerio parse of the markup finds nothing AND the Wix-hashed
// class names rotate on every deploy — that combination made the old selector
// (`table.mtQJtX ...`) silently return 0 rows.
//
// The rates ARE present in the static HTML though: Wix inlines its data-binding
// dataset in a `<script id="wix-warmup-data">` JSON blob. We parse that and pull
// every row carrying `title` / `compra` / `venta`, which is resilient to the
// CSS-hash churn.
class Cambio18 extends Cambio {
  name = "Cambio 18";
  bcu = "https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/InformacionInstitucion.aspx?nroinst=2576";
  website = "https://www.cambio18.com/cotizaciones";
  favicon = "https://www.cambio18.com";

  // Tolerant currency matcher: works across plural/variant labels ("DÓLAR",
  // "Dólar Americano", "ARGENTINO", "PESO ARGENTINO"...) with accent stripping.
  private toCode(title: string): { code: string; type: string } | null {
    const n = title
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toUpperCase();
    if (n.includes("DOLAR") || n.includes("USD")) return { code: "USD", type: "" };
    if (n.includes("EUR")) return { code: "EUR", type: "" };
    if (n.includes("REAL") || n.includes("BRL")) return { code: "BRL", type: "" };
    if (n.includes("ARGENT") || n.includes("ARS")) return { code: "ARS", type: "" };
    return null;
  }

  async get_data(): Promise<CambioObj[]> {
    const web_data = await axios
      .get(this.website, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept-Language": "es-UY,es;q=0.9",
        },
      })
      .then((res) => res.data);

    const m = String(web_data).match(
      /<script[^>]*id=["']wix-warmup-data["'][^>]*>([\s\S]*?)<\/script>/
    );
    if (!m) return [];

    let parsed: any;
    try {
      parsed = JSON.parse(m[1]);
    } catch {
      return [];
    }

    // Walk the warmup tree collecting every object shaped like a rate row.
    const rows: any[] = [];
    const seen = new Set<string>();
    const walk = (o: any) => {
      if (!o || typeof o !== "object") return;
      if (Array.isArray(o)) {
        o.forEach(walk);
        return;
      }
      if (typeof o.title === "string" && "compra" in o && "venta" in o) {
        const key = o.title + "|" + o.compra + "|" + o.venta;
        if (!seen.has(key)) {
          seen.add(key);
          rows.push(o);
        }
      }
      for (const k of Object.keys(o)) walk(o[k]);
    };
    walk(parsed);

    const result: CambioObj[] = [];
    for (const row of rows) {
      const match = this.toCode(row.title);
      if (!match) continue;
      const buy = this.fix_money(String(row.compra));
      const sell = this.fix_money(String(row.venta));
      if (!buy && !sell) continue;
      result.push({
        code: match.code,
        type: match.type,
        name: row.title,
        buy,
        sell,
      });
    }
    return result;
  }
}

export default Cambio18;
