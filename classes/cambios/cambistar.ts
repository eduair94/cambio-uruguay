import axios from "axios";
import { CambioObj } from "../../interfaces/Cambio";
import { Cambio } from "../cambio";

class Cambistar extends Cambio {
  name = "Cambistar";
  bcu = "https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/InformacionInstitucion.aspx?nroinst=2598";
  website = "https://www.investa.com.uy/";
  favicon = "https://www.investa.com.uy";
  conversions = {
    Dólar: { code: "USD", type: "" },
    Euro: { code: "EUR", type: "" },
    "Peso Argentino": { code: "ARS", type: "" },
    Real: { code: "BRL", type: "" },
  };

  async get_data(): Promise<CambioObj[]> {
    const res = await axios.get("https://investa.com.uy/cotizaciones.php").then((res) => res.data);
    const rows: { moneda: string; valores: string[] }[] = res?.tables?.[0] || [];
    return rows
      .filter((r) => this.conversions[r.moneda])
      .map((r) => {
        const { code, type } = this.conversions[r.moneda];
        return {
          code,
          type,
          name: r.moneda,
          buy: this.fix_money(r.valores[0]),
          sell: this.fix_money(r.valores[1]),
        };
      })
      .filter((el) => el.buy > 0 && el.sell > 0);
  }
}

export default Cambistar;
