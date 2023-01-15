import axios from "axios";
import { Request } from "express";
import moment from "moment-timezone";
import BCU_Details from "./classes/bcu_details";
import { cambio_info } from "./classes/cambioInfo";
import { MongooseServer } from "./classes/database";
import server from "./classes/Express/ExpressSetup";
import { origins } from "./classes/origins";
import sentryInit from './sentry';

moment.tz.setDefault("America/Uruguay");
sentryInit();

const main = async () => {
  console.log("Start connection");
  await MongooseServer.startConnectionPromise();
  console.log("Start express");
  server.getJson("/", async (req: Request): Promise<any> => {
    let date = req.query.date as string;
    let dateM = null;
    if (date) {
      dateM = moment(date, "YYYY-MM-DD").toDate();
    }
    console.log("Date", dateM);
    const res = await cambio_info.get_data(dateM, req.query);
    return res;
  });
  server.getJson("distances", async (req: Request): Promise<any> => {
    const latitude = parseFloat(req.query.latitude as string);
    const longitude = parseFloat(req.query.longitude as string);
    const res = await cambio_info.get_distances(latitude, longitude);
    return res;
  });
  server.postJson("geocoding", async (req: Request): Promise<any> => {
    const address = req.body.address as string;
    const url = `https://nominatim.openstreetmap.org/search.php?q=${encodeURIComponent(address)}&polygon_geojson=1&format=jsonv2`;
    return axios
      .get(url)
      .then((res) => res.data.filter((el: any) => el.display_name.includes("Uruguay")))
      .catch((e) => {
        console.log(e);
        return [];
      });
  });
  server.getJson("bcu", async (req: Request): Promise<any> => {
    const res = cambio_info.get_bcu();
    return res;
  });
  server.getJson("localData", async (req: Request): Promise<any> => {
    const res = cambio_info.get_local_data();
    return res;
  });
  server.getJson("position_stack", async (req: Request): Promise<any> => {
    const api = "f2b2a4c548e317a2ed6b4a570fd42241";
    const query = req.query.query as string;
    const limit = req.query.limit as string;
    const [latitude, longitude] = query.split(",").map((x) => parseFloat(x));
    const url = `http://api.positionstack.com/v1/reverse?access_key=${api}&query=${latitude},${longitude}&limit=${limit}`;
    const res = await axios
      .get(url)
      .then((res) => res.data)
      .catch(() => null);
    console.log("Response", res);
    return res;
  });
  server.getJson("exchanges/:origin/:location?", async (req: Request): Promise<any> => {
    const validOrigin = Object.keys(origins).includes(req.params.origin);
    if (!validOrigin) {
      throw new Error("Invalid origin");
    }
    const latitude = parseFloat(req.query.latitude as string);
    const longitude = parseFloat(req.query.longitude as string);
    let res = await cambio_info.getExchanges(req.params.origin, req.params.location);
    if (latitude && longitude) {
      res = JSON.parse(JSON.stringify(res));
      // Add distance to entries if latitude and longitude are passed.
      console.log("Coords", latitude, longitude);
      for (let index = 0; index < res.length; index++) {
        const entry = res[index];
        console.log("Entry", entry.latitude, entry.longitude);
        if (entry.latitude && entry.longitude) {
          res[index].distance = cambio_info.getDistance({ latitude, longitude }, { latitude: entry.latitude, longitude: entry.longitude });
        } else {
          res[index].distance = 9999999;
        }
      }
    }
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
