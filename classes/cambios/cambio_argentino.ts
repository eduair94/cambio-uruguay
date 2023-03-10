import { CambioObj } from "../../interfaces/Cambio";
import { Cambio } from "../cambio";

class CambioArgentino extends Cambio {
  name = "Cambio Argentino";
  bcu = "https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/InformacionInstitucion.aspx?nroinst=2555";
  website = "http://www.cambioargentino.uy";
  favicon = "http://www.cambioargentino.uy";

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
      console.log("No exchange found argentino");
      throw new Error("No exchange found");
    }
  }
}

export default CambioArgentino;
