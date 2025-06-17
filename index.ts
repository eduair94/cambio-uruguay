import axios from "axios";
import { Request, Response } from "express";
import fs from "fs";
import moment from "moment-timezone";
import BCU_Details from "./classes/bcu_details";
import { cambio_info } from "./classes/cambioInfo";
import CambioFortex from "./classes/cambios/fortex";
import { MongooseServer } from "./classes/database";
import server from "./classes/Express/ExpressSetup";
import { origins } from "./classes/origins";
import sentryInit from "./sentry";

moment.tz.setDefault("America/Montevideo");
sentryInit();

const main = async () => {
  console.log("Start connection");
  await MongooseServer.startConnectionPromise();
  console.log("Start express");
  server.getJson("/", async (req: Request): Promise<any> => {
    let date = req.query.date as string;
    let dateM = null;
    if (date) {
      // Parse date explicitly in Uruguay timezone to ensure consistency
      dateM = moment.tz(date, "YYYY-MM-DD", "America/Montevideo").toDate();
    }
    console.log("Date", dateM);
    const res = await cambio_info.get_data(dateM, req.query);
    if (!res?.length) throw new Error("No results found");
    return res;
  });
  server.get("ping", async (req: Request, res: Response): Promise<any> => {
    let date = req.query.date as string;
    let dateM = null;
    if (date) {
      // Parse date explicitly in Uruguay timezone to ensure consistency
      dateM = moment.tz(date, "YYYY-MM-DD", "America/Montevideo").toDate();
    }
    console.log("Date", dateM);
    const result = await cambio_info.get_data(dateM, req.query);
    const expected = result.length > 0 && result.length >= 100;
    const fResponse = { expected: expected, total: result.length };
    if (expected) return res.json(fResponse);
    return res.json(fResponse).status(500);
  });

  server.get("health", async (req: Request, res: Response): Promise<any> => {
    try {
      const syncFilePath = "last_sync.txt";

      // Check if file exists and is not empty
      if (!fs.existsSync(syncFilePath)) {
        return res.status(200).json({ status: "ok", message: "No sync file found - assuming healthy" });
      }

      const syncData = fs.readFileSync(syncFilePath, "utf8").trim();
      if (!syncData) {
        return res.status(200).json({ status: "ok", message: "Sync file is empty - assuming healthy" });
      }

      // Parse the last sync time
      const lastSyncTime = new Date(syncData);
      const now = new Date();
      const diffMinutes = (now.getTime() - lastSyncTime.getTime()) / (1000 * 60);

      if (diffMinutes <= 10) {
        return res.status(200).json({
          status: "ok",
          message: "Sync is recent",
          lastSync: lastSyncTime.toISOString(),
          minutesAgo: Math.round(diffMinutes),
        });
      } else {
        return res.status(500).json({
          status: "error",
          message: "Sync is too old",
          lastSync: lastSyncTime.toISOString(),
          minutesAgo: Math.round(diffMinutes),
        });
      }
    } catch (error) {
      return res.status(500).json({
        status: "error",
        message: "Error checking sync status",
        error: error.message,
      });
    }
  });
  server.getJson("exchange/:type/:code?", async (req: Request): Promise<any> => {
    let date = req.query.date as string;
    let dateM = null;
    if (date) {
      // Parse date explicitly in Uruguay timezone to ensure consistency
      dateM = moment.tz(date, "YYYY-MM-DD", "America/Montevideo").toDate();
    }
    const origin = (req.params.type as string).toLowerCase();
    console.log("Date", dateM);
    const res = await cambio_info.get_entry(dateM, origin, req.params.code).catch((e) => {
      console.error(e);
      return {
        origin,
        code: req.params.code,
        error: "not found",
      };
    });
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
  server.getJson("fortex", async (req: Request): Promise<any> => {
    // Ensure date is in Uruguay timezone for consistency
    const date = moment.tz("America/Montevideo").startOf("day").toDate();
    const fortex = new CambioFortex();
    const res = await fortex.get_conversions(date);
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
  server.getJson("evolution/:origin/:code/:type?", async (req: Request): Promise<any> => {
    const origin = req.params.origin;
    const code = req.params.code;
    const type = req.params.type;

    // Validate origin parameter
    const validOrigin = Object.keys(origins).includes(origin);
    if (!validOrigin) {
      throw new Error(`Invalid origin: ${origin}. Valid origins are: ${Object.keys(origins).join(", ")}`);
    }

    // Validate currency code parameter (basic validation)
    if (!code) {
      throw new Error(`Invalid currency code: ${code}. Currency code should be 2-4 characters (e.g., USD, ARS, BRL, EUR)`);
    } // Validate type parameter if provided (currency subtype like BILLETE, CABLE, etc.)

    // Parse period parameter (default to 6 months)
    let periodMonths = 6;
    if (req.query.period) {
      const period = parseInt(req.query.period as string);
      if (isNaN(period) || period <= 0 || period > 60) {
        throw new Error("Period must be a number between 1 and 60 months");
      }
      periodMonths = period;
    }

    console.log(`Evolution request: ${origin}/${code}${type ? `/${type}` : ""} for ${periodMonths} months`);

    try {
      const evolutionData = await cambio_info.get_currency_evolution(origin, code, periodMonths, type?.toLowerCase());
      return evolutionData;
    } catch (error) {
      console.error("Evolution endpoint error:", error);
      throw error;
    }
  });
};

main();
