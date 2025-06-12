import axios from "axios";
import moment from "moment-timezone";
import { CambioObj } from "../../interfaces/Cambio";
import { Cambio } from "../cambio";
import { MongooseServer, Schema } from "../database";

class CambioFortex extends Cambio {
  name = "Fortex";
  bcu = "https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/InformacionInstitucion.aspx?nroinst=2452";
  website = "https://www.fortex.com.uy";
  favicon = "https://www.fortex.com.uy";
  dbFortex: MongooseServer;

  constructor() {
    super();
    this.dbFortex = MongooseServer.getInstance(
      "fortex_conversions",
      new Schema(
        {
          date: { type: Date, required: true },
        },
        { strict: false }
      )
    );
  }

  async get_conversions(date: Date) {
    const response: any = await this.dbFortex.findEntry({ date });
    return response;
  }

  async get_data(): Promise<CambioObj[]> {
    const result = await axios.get("https://www.fortex.com.uy/api/ex").then((res) => res.data);
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
    const fortex_conversions = result.visual_conversions;
    // Ensure date is in Uruguay timezone for consistency
    const date = moment.tz("America/Montevideo").startOf("day").toDate();
    await this.dbFortex.getAnUpdateEntry({ date }, fortex_conversions);
    console.log(items);
    return items;
  }
}

export default CambioFortex;
