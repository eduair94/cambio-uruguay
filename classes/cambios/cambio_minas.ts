import axios from "axios";
import { load } from "cheerio";
import { CambioObj } from "../../interfaces/Cambio";
import { Cambio } from "../cambio";

class CambioMinas extends Cambio {
  name = "Cambio Minas";
  bcu = "https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/InformacionInstitucion.aspx?nroinst=2371";
  private conversions = {
    "1": {
      code: "USD",
      type: "",
    },
    "2": {
      code: "USD",
      type: "EBROU",
    },
    "3": {
      code: "ARS",
      type: "",
    },
    "4": {
      code: "BRL",
      type: "",
    },
    "5": {
      code: "EUR",
      type: "",
    },
  };
  website = "https://cambiominas.com.uy/";
  favicon = "https://cambiominas.com.uy/";
  async get_data(): Promise<CambioObj[]> {
    const web_data = await axios
      .get(this.website, {
        headers: {
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
          "accept-language": "es-ES,es;q=0.9",
          "cache-control": "no-cache",
          pragma: "no-cache",
          priority: "u=0, i",
          "sec-ch-ua": '"Google Chrome";v="137", "Chromium";v="137", "Not/A)Brand";v="24"',
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": '"Windows"',
          "sec-fetch-dest": "document",
          "sec-fetch-mode": "navigate",
          "sec-fetch-site": "none",
          "sec-fetch-user": "?1",
          "upgrade-insecure-requests": "1",
          "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
        },
        timeout: 10000,
      })
      .then((res) => res.data);

    console.log("Raw HTML snippet for debugging:");
    const $ = load(web_data);
    const debugSection = $(".vc_custom_1592014937560 .wpb_wrapper").html();
    console.log(debugSection?.substring(0, 500) + "...");

    const result = $(".vc_custom_1592014937560 .wpb_wrapper > div")
      .map((i: number, element) => {
        const compraText = $(element).find("h4").eq(0).text().trim();
        const ventaText = $(element).find("h4").eq(1).text().trim();
        console.log(`Currency ${i + 1}: compra="${compraText}", venta="${ventaText}"`);
        return {
          moneda: (i + 1).toString(),
          compra: this.fix_money(compraText),
          venta: this.fix_money(ventaText),
        };
      })
      .get()
      .filter((el) => el.compra);
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

export default CambioMinas;
