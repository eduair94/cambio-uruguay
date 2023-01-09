import axios from "axios";
import { load } from "cheerio";
import { CambioObj } from "../../interfaces/Cambio";
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
    const web_data = await axios.get(this.website).then((res) => res.data);
    const $ = load(web_data);
    const result = $(".contGrid .resultado tr")
      .map((i: number, element) => ({
        moneda: $(element).find("td:nth-of-type(1)").text().trim(),
        fecha: $(element).find("td:nth-of-type(2)").text().trim(),
        venta: this.fix_money($(element).find("td:nth-of-type(3)").text().trim()),
        compra: this.fix_money($(element).find("td:nth-of-type(4)").text().trim()),
        arbitraje: this.fix_money($(element).find("td:nth-of-type(5)").text().trim()),
      }))
      .get();
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
