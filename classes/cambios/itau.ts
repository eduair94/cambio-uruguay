import axios from "axios";
import moment from "moment";
import { CambioObj } from "../../interfaces/Cambio";
import { Cambio } from "../cambio";
import { load } from "cheerio";

class Itau extends Cambio {
  name = "Itau";
  bcu =
    "https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/InformacionInstitucion.aspx?nroinst=1113";
  conversions = {
    "US.D": {
      code: "USD",
      type: "",
    },
    ARGP: {
      code: "ARS",
      type: "",
    },
    CRUZ: {
      code: "BRL",
      type: "",
    },
    EUR: {
      code: "EUR",
      type: "",
    },
    URGI: {
      code: "UI",
      type: "",
    },
  };
  website = "https://www.itau.com.uy/";
  favicon = "https://www.itau.com.uy/";
  async get_data(): Promise<CambioObj[]> {
    const date = moment().format("DDMMYYYY");
    const web_data = await axios
      .get("https://www.itau.com.uy/inst/aci/cotiz.xml")
      .then((res) => res.data);
    const $ = load(web_data);
    const result = $("cotizacion")
      .map((i: number, element) => ({
        moneda: $(element).find("moneda").text().trim(),
        compra: this.fix_money($(element).find("compra").text().trim()),
        venta: this.fix_money($(element).find("venta").text().trim()),
      }))
      .get()
      .filter((el) => el.compra && el.moneda !== "LINK");
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

export default Itau;
