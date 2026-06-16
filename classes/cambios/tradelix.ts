import axios from "axios";
import { load } from "cheerio";
import { CambioObj } from "../../interfaces/Cambio";
import { Cambio } from "../cambio";

class Tradelix extends Cambio {
  name = "Tradelix";
  bcu = "https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/InformacionInstitucion.aspx?nroinst=2496";
  private conversions = {
    usd: {
      code: "USD",
      type: "",
    },
    ars: {
      code: "ARS",
      type: "",
    },
    brl: {
      code: "BRL",
      type: "",
    },
    eur: {
      code: "EUR",
      type: "",
    },
  };
  website = "https://www.tradelix.com.uy/";
  favicon = "https://www.tradelix.com.uy/";
  async get_data(): Promise<CambioObj[]> {
    const web_data = await axios.get(this.website).then((res) => res.data);
    const $ = load(web_data);
    // Layout: .container .row > 3 .col (currencies | COMPRA | VENTA),
    // each with .value cells aligned by row index. Money cells are "$NN.NN".
    const cols = $(".container .row .col");
    const names = cols
      .eq(0)
      .find(".value .currency-name, .value .currency-name-eur")
      .map((i: number, el) => $(el).text().trim().toLowerCase())
      .get();
    const parseCol = (idx: number) =>
      cols
        .eq(idx)
        .find(".value")
        .map((i: number, el) => this.fix_money($(el).text().replace(/[^0-9.,]/g, "").trim()))
        .get();
    const compras = parseCol(1);
    const ventas = parseCol(2);
    const result = names
      .map((moneda, i) => ({ moneda, compra: compras[i], venta: ventas[i] }))
      .filter((el) => el.compra && this.conversions[el.moneda]);
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

export default Tradelix;
