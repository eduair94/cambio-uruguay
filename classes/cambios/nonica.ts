import axios from "axios";
import { load } from "cheerio";
import { CambioObj } from "../../interfaces/Cambio";
import { Cambio } from "../cambio";

class Nonica extends Cambio {
  name = "Cambio El Trébol";
  bcu = "https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/InformacionInstitucion.aspx?nroinst=2373";
  website = "https://www.cambioeltrebol.com";
  favicon = "https://www.cambioeltrebol.com";
  conversions = {
    Dólar: { code: "USD", type: "" },
    Euro: { code: "EUR", type: "" },
    "Peso Argentino": { code: "ARS", type: "" },
    Real: { code: "BRL", type: "" },
  };

  async get_data(): Promise<CambioObj[]> {
    const web_data = await axios.get(this.website).then((res) => res.data);
    const $ = load(web_data);
    // Old Joomla table has a markup bug (EUR row reuses class "sale" on both
    // cells), so read by column POSITION (moneda, compra, venta), not by class.
    const result = $("table#cotizaciones tbody tr")
      .map((i: number, el) => {
        const tds = $(el).find("td");
        return {
          moneda: $(tds[1]).text().trim(),
          compra: $(tds[2]).text().trim(),
          venta: $(tds[3]).text().trim(),
        };
      })
      .get()
      .filter((el) => el.moneda && this.conversions[el.moneda]);
    return result
      .map((el) => {
        const { code, type } = this.conversions[el.moneda];
        return {
          code,
          type,
          name: el.moneda,
          buy: this.fix_money(el.compra),
          sell: this.fix_money(el.venta),
        };
      })
      .filter((el) => el.buy > 0 && el.sell > 0);
  }
}

export default Nonica;
