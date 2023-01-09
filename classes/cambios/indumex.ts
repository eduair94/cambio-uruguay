import axios from "axios";
import moment from "moment";
import { CambioObj } from "../../interfaces/Cambio";
import { Cambio } from "../cambio";

class CambioIndumex extends Cambio {
  name = "Indumex";
  bcu = "https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/InformacionInstitucion.aspx?nroinst=2558";
  conversions = {
    "1": {
      code: "USD",
      type: "",
    },
    "2": {
      code: "ARS",
      type: "",
    },
    "4": {
      code: "BRL",
      type: "",
    },
    "62": {
      code: "EUR",
      type: "",
    },
  };
  website = "https://www.indumex.com";
  favicon = "https://www.indumex.com";
  async get_data(): Promise<CambioObj[]> {
    const date = moment().format("DDMMYYYY");
    const web_data = await axios.get("https://www.indumex.com/Umbraco/api/Pizarra/Cotizaciones?fecha=" + date).then((res) => res.data);
    const f = web_data.map((el) => {
      const { code, type } = this.conversions[el.Moneda];
      return {
        code,
        type,
        name: el.Moneda,
        buy: el.Compra,
        sell: el.Venta,
      };
    });
    return f;
  }
}

export default CambioIndumex;
