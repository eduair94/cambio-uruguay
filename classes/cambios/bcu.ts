import axios from "axios";
import { load } from "cheerio";
import { CambioObj } from "../../interfaces/Cambio";
import { fetchCurrentCotizaciones } from "../bcu_soap";
import { Cambio } from "../cambio";
class CambioBCU extends Cambio {
  name = "Banco Central del Uruguay";
  website = "https://www.bcu.gub.uy/Estadisticas-e-Indicadores/Paginas/Cotizaciones.aspx";

  bcu = "https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/casas_cambio.aspx";
  favicon = "https://www.bcu.gub.uy";

  get_type(moneda: string) {
    return "";
  }

  conversions = {
    "DLS. USA BILLETE": {
      code: "USD",
      type: "BILLETE",
    },
    "DLS. USA CABLE": {
      code: "USD",
      type: "CABLE",
    },
    "DLS.PROMED.FONDO": {
      code: "USD",
      type: "PROMED.FONDO",
    },
    "PESO ARG.BILLETE": {
      code: "ARS",
      type: "BILLETE",
    },
    "REAL BILLETE": {
      code: "BRL",
      type: "BILLETE",
    },
    "UNIDAD INDEXADA": {
      code: "UI",
      type: "",
    },
    "UNIDAD PREVISIONAL": {
      code: "UP",
      type: "",
    },
    "UNIDAD REAJUSTAB": {
      code: "UR",
      type: "",
    },
  };

  async get_data(): Promise<CambioObj[]> {
    // SOAP is the primary source: it's a stable API, immune to the HTML redesigns
    // that have silently broken the scrape before. Fall back to the HTML page only
    // if SOAP fails or returns nothing.
    try {
      const quotes = await fetchCurrentCotizaciones();
      if (quotes.length > 0) {
        return quotes.map((q) => ({
          code: q.code,
          type: q.type,
          name: q.name,
          buy: q.buy,
          sell: q.sell,
        }));
      }
    } catch (e) {
      console.error("BCU SOAP failed, falling back to HTML scrape:", (e as Error).message);
    }
    return this.get_data_html();
  }

  async get_data_html(): Promise<CambioObj[]> {
    const web_data = await axios.get(this.website).then((res) => res.data);
    const $ = load(web_data);
    // 2025 redesign: rows live in tbody[id*='lstCotizaciones'] with class-based cells
    // (td.Moneda / td.Fecha / td.Venta / td.Compra / td.Arbitraje). Select by the
    // presence of td.Moneda so it survives container/id changes.
    const result = $("tr")
      .filter((i: number, el) => $(el).find("td.Moneda").length > 0)
      .map((i: number, element) => ({
        moneda: $(element).find("td.Moneda").text().trim(),
        fecha: $(element).find("td.Fecha").text().trim(),
        venta: this.fix_money($(element).find("td.Venta").text().trim()),
        compra: this.fix_money($(element).find("td.Compra").text().trim()),
      }))
      .get()
      .filter((el) => this.conversions[el.moneda]);
    const f = result.map((el) => {
      const { code, type } = this.conversions[el.moneda];
      return {
        code,
        type,
        name: el.moneda,
        buy: el.compra,
        sell: el.venta,
      };
    });
    return f;
  }
}

export default CambioBCU;
