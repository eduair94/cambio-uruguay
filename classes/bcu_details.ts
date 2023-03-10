import axios from "axios";
import { load } from "cheerio";
import { Cambio } from "./cambio";
import { MongooseServer, Schema } from "./database";
import { origins } from "./origins";

class BCU_Details {
  private db: MongooseServer;
  constructor() {
    this.db = MongooseServer.getInstance(
      "bcu_data",
      new Schema({
        origin: { type: String, unique: true },
        name: { type: String },
        address: { type: String },
        phone: { type: String },
        website: { type: String },
        email: { type: String },
        social_reason: { type: String },
        departments: { type: Array },
      })
    );
  }
  updateOne(origin: string, json) {
    return this.db.updateOneAlt({ origin }, json);
  }
  async get_by_origin(origin: string): Promise<any> {
    const res = await this.db.findEntry({ origin });
    return res;
  }
  async sync_single(origins:any, origin:string, idx:number, total:number) {
    console.log(idx, total);
      try {
        const cambio: Cambio = new origins[origin](origin);
        const bcu = (cambio as any).bcu;
        if (bcu && bcu.includes("InformacionInstitucion")) {
          const html = await axios.get(bcu).then((res) => res.data);
          const $ = load(html);
          const name = $(".data #ctl00_ctl63_g_69ba7a44_6c44_4cfc_b1c0_7533ca184061_ctl00_lblNombreFantasia").text().trim();
          const address = $(".data #ctl00_ctl63_g_69ba7a44_6c44_4cfc_b1c0_7533ca184061_ctl00_lblDireccion").text().trim();
          const phone = $(".data #ctl00_ctl63_g_69ba7a44_6c44_4cfc_b1c0_7533ca184061_ctl00_lblTelefono").text().trim();
          const website = $(".data #ctl00_ctl63_g_69ba7a44_6c44_4cfc_b1c0_7533ca184061_ctl00_HplPaginaWeb").text().trim();

          const email = $(".data #ctl00_ctl63_g_69ba7a44_6c44_4cfc_b1c0_7533ca184061_ctl00_HplCorreoElectronico").text().trim();

          const social_reason = $("#ctl00_ctl63_g_69ba7a44_6c44_4cfc_b1c0_7533ca184061_ctl00_lblRazonSocial").text().trim();

          const departments = await cambio.getLocations();
          console.log(departments);

          const f = {
            name,
            address,
            phone,
            website,
            email,
            social_reason,
            departments,
            origin,
          };
          await this.db.getAnUpdateEntry({ origin }, f);
        }
        console.log("Updated", origin, idx);
      } catch (e) {
        console.error(e);
        console.log(origin, e.message);
      }
  }
  async sync_data() {
    let idx = 1;
    let total = Object.keys(origins).length;
    for (let origin in origins) {
      await this.sync_single(origins, origin, idx, total);
      idx++;
    }
    console.log("Finish");
  }
}

export default BCU_Details;
