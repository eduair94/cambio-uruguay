import moment from "moment-timezone";
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
  async getMarkets(entry: any): Promise<any> {
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
    let distanceData = {};
    for (let suc of sucs) {
      const distance = this.getDistance({ latitude, longitude }, { latitude: suc.latitude, longitude: suc.longitude });
      if (distance && !isNaN(distance)) {
        if (suc.origin) {
          if (!origins[suc.origin]) {
            origins[suc.origin] = [];
          }
          distanceData[distance] = {
            latitude: suc.latitude,
            longitude: suc.longitude,
            map: suc.map,
          };
          origins[suc.origin].push(distance);
        }
      }
    }
    const res = {};
    for (let key in origins) {
      res[key] = Math.min(...origins[key]);
    }
    return { ...res, distanceData };
  }
  async get_entry(date: Date, origin: string, code?: string): Promise<CambioObj[]> {
    if (!date) {
      // Ensure default date is in Uruguay timezone for consistency
      date = moment.tz("America/Montevideo").startOf("day").toDate();
    }
    const toGet: any = { date, origin: origin.toLowerCase() };
    if (code) {
      toGet.code = code.toUpperCase();
    }
    console.log("toGet", toGet);
    const obj = await this.db.allEntries(toGet);
    if (obj.length === 1) {
      return obj[0] as any;
    }
    return obj as any;
  }

  async get_data(date?: Date, query?: any): Promise<CambioObj[]> {
    if (!date) {
      // Ensure default date is in Uruguay timezone for consistency
      date = moment.tz("America/Montevideo").startOf("day").toDate();
    }
    const obj = await this.db.allEntriesSort({ date }, { code: -1, sell: 1, buy: 1 });
    return obj as any;
  }
  async get_currency_evolution(origin: string, code: string, periodMonths: number = 6, type?: string): Promise<any> {
    // Calculate date range based on the period requested
    const endDate = moment.tz("America/Montevideo").startOf("day").toDate();
    const startDate = moment.tz("America/Montevideo").subtract(periodMonths, "months").startOf("day").toDate();

    console.log(`Getting currency evolution for ${origin}/${code}${type ? `/${type}` : ""} from ${startDate} to ${endDate}`);

    // Query the database for historical data within the date range
    const query: any = {
      origin: origin.toLowerCase(),
      code: code.toUpperCase(),
      date: {
        $gte: startDate,
        $lte: endDate,
      },
    };

    // Add type filter if specified
    if (type) {
      query.type = type.toUpperCase();
    }

    const historicalData: CambioObj[] = (await this.db.allEntriesSort(
      query,
      { date: 1 } // Sort by date ascending
    )) as CambioObj[];

    if (!historicalData || historicalData.length === 0) {
      throw new Error(`No historical data found for ${origin}/${code} in the last ${periodMonths} months`);
    }

    // Process the data to create evolution points
    const evolution = historicalData.map((entry) => ({
      date: entry.date,
      buy: entry.buy,
      sell: entry.sell,
      origin: entry.origin,
      code: entry.code,
      type: entry.type,
      name: entry.name,
    }));

    // Calculate some basic statistics
    const buyRates = historicalData.map((entry) => entry.buy).filter((rate) => rate > 0);
    const sellRates = historicalData.map((entry) => entry.sell).filter((rate) => rate > 0);

    const statistics = {
      totalDataPoints: historicalData.length,
      dateRange: {
        start: startDate,
        end: endDate,
        periodMonths,
      },
      buy:
        buyRates.length > 0
          ? {
              min: Math.min(...buyRates),
              max: Math.max(...buyRates),
              avg: buyRates.reduce((sum, rate) => sum + rate, 0) / buyRates.length,
              current: buyRates[buyRates.length - 1] || null,
              change: buyRates.length > 1 ? ((buyRates[buyRates.length - 1] - buyRates[0]) / buyRates[0]) * 100 : 0,
            }
          : null,
      sell:
        sellRates.length > 0
          ? {
              min: Math.min(...sellRates),
              max: Math.max(...sellRates),
              avg: sellRates.reduce((sum, rate) => sum + rate, 0) / sellRates.length,
              current: sellRates[sellRates.length - 1] || null,
              change: sellRates.length > 1 ? ((sellRates[sellRates.length - 1] - sellRates[0]) / sellRates[0]) * 100 : 0,
            }
          : null,
    };
    return {
      origin: origin.toLowerCase(),
      code: code.toUpperCase(),
      type: type?.toUpperCase() || null,
      statistics,
      evolution,
    };
  }
}

const cambio_info = new CambioInfo("");
export { cambio_info };
