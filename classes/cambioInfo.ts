import moment from "moment";
import { CambioObj } from "../interfaces/Cambio";
import BCU_Details from "./bcu_details";
import { Cambio } from "./cambio";
import { origins } from "./origins";

class CambioInfo extends Cambio {
  name: string;
  website: string;
  bcu: string;
  private localData: any;
  async delete_current_date() {
    console.log("Start");
    this.remove_date();
    console.log("End");
  }
  async getAllMarkets(): Promise<any> {
    return this.db_suc.allEntries({});
  }
  async getMarkets(entry:any): Promise<any> {
    return this.db_suc.allEntries(entry);
  }
  async get_local_data() {
    if (!this.localData) {
      const localData = {};
      const bcu_details = new BCU_Details();
      for (let origin in origins) {
        try {
          const exchange: Cambio = new origins[origin](origin);
          const data = await bcu_details.get_by_origin(origin);
          localData[origin] = {
            name: exchange.name,
            website: exchange.website,
            maps: exchange.getMaps(),
            bcu: (exchange as any).bcu,
            departments: data && data.departments ? data.departments : [],
          };
        } catch (e) {
          console.error(e);
          console.log(origin, e.message);
        }
      }
      this.localData = localData;
    }
    console.log("/GET LocalData");
    return this.localData;
  }
  async getExchanges(origin: string, location: string) {
    let res: any = [];
    if (location === "TODOS" || !location) {
      res = await this.db_suc.allEntries({ origin, status: { $ne: 0 } });
    } else {
      res = await this.db_suc.allEntries({
        origin,
        Departamento: location,
        status: { $ne: 0 },
      });
    }
    return res;
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
  async get_distances(latitude: number, longitude: number) {
    const sucs = await this.db_suc.allEntries({
      latitude: { $exists: true },
      status: { $ne: 0 },
    });
    let origins = {};
    for (let suc of sucs) {
      const distance = this.getDistance(
        { latitude, longitude },
        { latitude: suc.latitude, longitude: suc.longitude },
      );
      if (distance && !isNaN(distance)) {
        if (suc.origin) {
          if (!origins[suc.origin]) {
            origins[suc.origin] = [];
          }
          origins[suc.origin].push(distance);
        }
      }
    }
    const res = {};
    for (let key in origins) {
      res[key] = Math.min(...origins[key]);
    }
    return res;
  }
  async get_data(date?: Date, query?: any): Promise<CambioObj[]> {
    if (!date) {
      date = moment().startOf("day").toDate();
    }
    const obj = await this.db.allEntriesSort(
      { date },
      { code: -1, sell: 1, buy: 1 },
    );
    return obj as any;
  }
}

const cambio_info = new CambioInfo("");
export { cambio_info };
