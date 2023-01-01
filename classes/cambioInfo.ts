import moment from "moment";
import { CambioObj } from "../interfaces/Cambio";
import { Cambio } from "./cambio";
import { origins } from "./origins";

class CambioInfo extends Cambio {
  name: string;
  website: string;
  bcu: string;
  async delete_current_date() {
    console.log("Start");
    this.remove_date();
    console.log("End");
  }
  get_local_data() {
    const localData = {};
    for (let origin in origins) {
      try {
        const exchange: Cambio = new origins[origin](origin);
        localData[origin] = {
          name: exchange.name,
          website: exchange.website,
          maps: exchange.getMaps(),
          bcu: (exchange as any).bcu,
        };
      } catch (e) {
        console.error(e);
        console.log(origin, e.message);
      }
    }
    return localData;
  }
  get_bcu() {
    const data = {};
    for (let origin in origins) {
      try {
        const cambio: Cambio = new origins[origin](origin);
        data[origin] = (cambio as any).bcu;
      } catch (e) {
        console.error(e);
        console.log(origin, e.message);
      }
    }
    return data;
  }
  async get_data(date?: Date): Promise<CambioObj[]> {
    if (!date) {
      date = moment().startOf("day").toDate();
    }
    const obj = await this.db.allEntriesSort({ date }, { code: -1, sell: 1, buy: 1 });
    return obj as any;
  }
}

const cambio_info = new CambioInfo("");
export { cambio_info };
