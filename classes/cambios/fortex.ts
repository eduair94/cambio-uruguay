import axios from "axios";
import { CambioObj } from "../../interfaces/Cambio";
import { Cambio } from "../cambio";

class CambioFortex extends Cambio {
  bcu =
    "https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/InformacionInstitucion.aspx?nroinst=2452";
  website = "https://www.fortex.com.uy";
  favicon = "https://www.fortex.com.uy";
  async get_data(): Promise<CambioObj[]> {
    const result = await axios
      .get("https://www.fortex.com.uy/api/ex")
      .then((res) => res.data);
    console.log(result);
    const conversions = result.conversions;
    let items = [];
    for (const code in conversions) {
      if (code !== "UYU") {
        items.push({
          code,
          type: "",
          name: "",
          buy: conversions[code].UYU,
          sell: result.visual_conversions.UYU[code],
        });
      }
    }
    console.log(items);
    return items;
  }
}

export default CambioFortex;
