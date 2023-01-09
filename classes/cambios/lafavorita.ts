import axios from "axios";
import { load } from "cheerio";
import { CambioObj } from "../../interfaces/Cambio";
import { Cambio } from "../cambio";

class CambioLaFavorita extends Cambio {
  name = "Cambio La Favorita";
  bcu = "https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/InformacionInstitucion.aspx?nroinst=2581";
  conversions = {
    DOLAR: {
      code: "USD",
      type: "",
    },
    EURO: {
      code: "EUR",
      type: "",
    },
    "PESO ARGENTINO": {
      code: "ARS",
      type: "",
    },
    REAL: {
      code: "BRL",
      type: "",
    },
    "FRANCO SUIZO": {
      code: "CHF",
      type: "",
    },
    "LIBRA INGLESA": {
      code: "GBP",
      type: "",
    },
    "DOLAR CANADIENSE": {
      code: "CAD",
      type: "",
    },
    "DOLAR AUSTRALIANO": {
      code: "AUD",
      type: "",
    },
    "PESO CHILENO": {
      code: "CLP",
      type: "",
    },
    GUARANÍ: {
      code: "PYG",
      type: "",
    },
    "SOL PERUANO": {
      code: "PEN",
      type: "",
    },
    "PESO MEXICANO": {
      code: "MXP",
      type: "",
    },
    YENS: {
      code: "JPY",
      type: "",
    },
    "DOLAR INTERBANCARIO": {
      code: "USD",
      type: "INTERBANCARIO",
    },
    "DOLAR FONDO/CABLE": {
      code: "USD",
      type: "FONDO/CABLE",
    },
    "ORO ONZA": {
      code: "XAU",
      type: "",
    },
  };
  website = "http://www.lafavorita.com.uy/cotizaciones";
  favicon = "http://www.lafavorita.com.uy";
  async get_data(): Promise<CambioObj[]> {
    const web_data = await axios.get(this.website).then((res) => res.data);
    let items = [];
    const cotizacionesSel = ".course-block-cotizacion";
    const $ = load(web_data);
    const result = $(cotizacionesSel)
      .map((i: number, element) => ({
        moneda: $(element).find("h1").text().trim(),
        compra: this.fix_money($(element).find(".color-cotizacion").eq(0).text().trim()),
        venta: this.fix_money($(element).find(".color-cotizacion").eq(1).text().trim()),
      }))
      .get();
    const f = result
      .filter((el) => el.moneda)
      .map((el) => {
        const { code, type } = this.conversions[el.moneda];
        return {
          code,
          type,
          name: el.moneda,
          buy: el.compra,
          sell: el.venta,
        };
      });
    console.log(f);
    return f;
  }
}

export default CambioLaFavorita;
