import { CambioObj } from "../../interfaces/Cambio";
import { Cambio } from "../cambio";

class CambioRomantico extends Cambio {
  name = "Cambio Romantico";
  bcu = "https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/InformacionInstitucion.aspx?nroinst=2474";
  website = "https://www.cambioromantico.com/";
  favicon = "https://www.cambioromantico.com/";

  async get_data(): Promise<CambioObj[]> {
    const today = new Date();
    const current_date = this.getCurrentDateObj(today);
    const data: any = await this.db.allEntries({ origin: "brou", date: current_date });
    if (data) {
      return JSON.parse(JSON.stringify(data))
        .map((el: CambioObj) => {
          return {
            code: el.code,
            type: el.type,
            name: "",
            buy: el.buy,
            sell: el.sell,
          };
        })
        .filter((el) => el.type !== "EBROU");
    } else {
      throw new Error("No exchange found");
    }
  }
}

export default CambioRomantico;
