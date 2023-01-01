import axios from "axios";
import { load } from "cheerio";
import moment from "moment-timezone";
import { CambioObj } from "../interfaces/Cambio";
import { MongooseServer, Schema } from "./database";
moment.tz.setDefault("America/Uruguay");

abstract class Cambio {
  protected origin: string;
  protected bcu: string;
  abstract website: string;
  abstract name: string;
  protected favicon: string;
  protected db: MongooseServer;

  protected async get_web_data() {
    console.log("GET WEB DATA", this.favicon);
    const web_data = await axios.get(this.favicon).then((res) => res.data);
    const $ = load(web_data);
    return {
      origin: this.origin,
      title: $("title").eq(0).text().trim(),
      favicon: $("link[rel='apple-touch-icon']").attr("href"),
    };
  }

  getMaps() {
    return "https://www.google.com.uy/maps/search/" + encodeURI(this.name.toLowerCase());
  }

  constructor(origin?: string) {
    this.origin = origin;
    this.db = MongooseServer.getInstance(
      "cambio-uy",
      new Schema({
        bcu: { type: String },
        origin: { type: String },
        code: { type: String },
        type: { type: String },
        name: { type: String },
        buy: { type: Number },
        sell: { type: Number },
        date: { type: Date },
      })
    );
  }

  async obtener_datos(): Promise<CambioObj[]> {
    const today = new Date();
    const current_date = this.getCurrentDateObj(today);
    const db: any = await this.db.findEntry({
      origin: this.origin,
      date: current_date,
    });
    return db;
  }

  getCurrentDateObj(today: Date) {
    return moment(today).startOf("day").toDate();
  }

  async obtener_all_datos_historico(date: Date): Promise<CambioObj[]> {
    const current_date = this.getCurrentDateObj(date);
    const db: any = await this.db.allEntries({
      origin: this.origin,
      date: current_date,
    });
    return db;
  }

  async obtener_datos_historico(date: Date): Promise<CambioObj[]> {
    const current_date = this.getCurrentDateObj(date);
    const db: any = await this.db.findEntry({
      origin: this.origin,
      date: current_date,
    });
    return db;
  }

  fix_money = function (value: string) {
    const no_dots = value.replaceAll(",", ".");
    const res = parseFloat(no_dots);
    if (isNaN(res)) return 0;
    return res;
  };

  async remove_date() {
    const date = moment().startOf("day").toDate();
    const res = await this.db.deleteMany({ date });
    return res;
  }

  async remove_bcu() {
    console.log("REMOVE BCU");
    const res = await this.db.updateMany({}, { $unset: { bcu: "" } });
    console.log("Response", res);
    return res;
  }

  async save(data: CambioObj): Promise<CambioObj> {
    const date = moment().startOf("day").toDate();
    const obj = {
      origin: this.origin,
      date: date,
      code: data.code,
      type: data.type,
      name: data.name,
      buy: data.buy,
      sell: data.sell,
    } as CambioObj;
    if (obj.buy === 0 && obj.sell === 0) {
      console.log(obj);
      process.exit(1);
    }
    console.log("Data", obj);
    const db: any = await this.db.getAnUpdateEntry(
      {
        origin: this.origin,
        date: date,
        code: data.code,
        type: data.type,
      },
      data
    );
    return db;
  }

  async clearDB() {
    await this.db.deleteAll();
  }

  async sync_favicon() {
    const data = await this.get_web_data();
    console.log("Data", data);
  }

  async sync_data() {
    const data = await this.get_data();
    if (data.length === 0) {
      console.error("Empty", this.origin);
      return;
    }
    for (let obj of data) {
      await this.save(obj);
    }
  }

  abstract get_data(): Promise<CambioObj[]>;
}

export { Cambio };
