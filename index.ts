import server from "./classes/Express/ExpressSetup";
import { Request } from "express";
import moment from "moment-timezone";
import { cambio_info } from "./classes/cambioInfo";
import { MongooseServer } from "./classes/database";

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
};

main();
