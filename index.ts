import server from "./classes/Express/ExpressSetup";
import { Request } from "express";
import moment from "moment-timezone";
import { cambio_info } from "./classes/cambioInfo";
import { MongooseServer } from "./classes/database";
import BCU_Details from "./classes/bcu_details";
import { origins } from "./classes/origins";

moment.tz.setDefault("America/Uruguay");

const main = async () => {
  await MongooseServer.startConnectionPromise();
  console.log("Start express");
  server.getJson("/", async (req: Request): Promise<any> => {
    let date = req.query.date as string;
    let dateM = null;
    if (date) {
      dateM = moment(date, "YYYY-MM-DD").toDate();
    }
    console.log("Date", dateM);
    const res = await cambio_info.get_data(dateM);
    console.log("Response", res);
    return res;
  });
  server.getJson("bcu", async (req: Request): Promise<any> => {
    const res = cambio_info.get_bcu();
    return res;
  });
  server.getJson("bcu/:origin", async (req: Request): Promise<any> => {
    const validOrigin = Object.keys(origins).includes(req.params.origin);
    if (!validOrigin) {
      throw new Error("Invalid origin");
    }
    const x = new BCU_Details();
    const origin = req.params.origin;
    const reply = await x.get_by_origin(origin);
    return reply;
  });
};

main();
