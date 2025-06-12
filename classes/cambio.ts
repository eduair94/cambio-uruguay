import axios from "axios";
import { CheerioAPI, load } from "cheerio";
import getDistance from "geolib/es/getDistance";
import moment from "moment-timezone";
import { CambioObj } from "../interfaces/Cambio";
import { MongooseServer, Schema } from "./database";
moment.tz.setDefault("America/Montevideo");

abstract class Cambio {
  protected db_suc: MongooseServer;
  protected origin: string;
  protected maps?: string;
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
    if (this.maps) return this.maps;
    return "https://www.google.com.uy/maps/search/" + encodeURI(this.name.toLowerCase());
  }

  async getLocation(n1: string, n2: string) {
    const url = "https://www.bcu.gub.uy/_layouts/15/BCU.Registros/handler/RegistrosHandler.ashx?op=getsucursalbynroinstitucionandnrosucursal";
    const data = { KeyValuePairs: { NroInstitucion: n1, NroSucursal: n2 } };
    const headers = {
      "Content-Type": "application/json; charset=UTF-8",
    };
    const res = await axios.post(url, data, { headers }).then((res) => res.data);
    return res;
  }

  async updateSuc(id: string, json: any) {
    await this.db_suc.getAnUpdateEntryAlt({ id }, json);
  }

  async createSuc(id: string, json: any) {
    await this.db_suc.getAnUpdateEntryAlt({ id }, json);
  }

  async findSuc(id: string) {
    const res = await this.db_suc.findEntry({ id });
    return res;
  }

  getDistance(origin: { latitude: number; longitude: number }, end: { latitude: number; longitude: number }) {
    return getDistance(origin, end);
  }

  async getLocations($?: CheerioAPI, bcu?: string) {
    if (!bcu) {
      bcu = this.bcu;
    }
    if (!$) {
      const res = await axios.get(bcu).then((res) => res.data);
      $ = load(res);
    }
    const locations = $("#lstSucursales tr")
      .map((idx, el) => {
        return $(el).find("td span").eq(0).text();
      })
      .get();
    const intNumber = new URL(bcu).searchParams.get("nroinst");
    if (!intNumber) throw new Error("No institution number");
    let departments = [];
    console.log(this.origin, "Sucursales:", locations.length);
    for (let loc of locations) {
      const locInfo = await this.getLocation(intNumber, loc);
      const department = locInfo.sucursal.Departamento;
      const id = intNumber + "-" + loc;
      await this.db_suc.getAnUpdateEntryAlt({ id }, { origin: this.origin, ...locInfo.sucursal });
      if (department && !departments.includes(department)) {
        departments.push(department);
      }
    }
    return departments;
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
    this.db_suc = MongooseServer.getInstance(
      "bcu_suc",
      new Schema(
        {
          id: { type: String, unique: true },
          origin: { type: String },
        },
        { strict: false }
      )
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
    // Ensure the date is processed in Uruguay timezone for consistency
    return moment.tz(today, "America/Montevideo").startOf("day").toDate();
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

  fix_money = function (value: string, code = "", cambio = "") {
    let no_dots = value;
    if (code === "XAU") {
      if (cambio === "lafavorita") {
        no_dots = no_dots.replaceAll(",", "");
      } else {
        no_dots = no_dots.replaceAll(".", "");
      }
    }
    no_dots = no_dots.replaceAll(",", ".");
    const res = parseFloat(no_dots);
    if (isNaN(res)) return 0;
    return res;
  };
  async remove_date() {
    // Ensure the date is processed in Uruguay timezone for consistency
    const date = moment.tz("America/Montevideo").startOf("day").toDate();
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
    // Ensure date is in Uruguay timezone for consistency
    const date = moment.tz("America/Montevideo").startOf("day").toDate();
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
    console.log("Data", data, this.origin);
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
