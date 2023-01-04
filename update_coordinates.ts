import { GoogleSpreadsheet } from "google-spreadsheet";
import { MongooseServer } from "./classes/database";
import * as credentials from "./sheet_key.json";
import { cambio_info } from "./classes/cambioInfo";

async function main() {
  await MongooseServer.startConnectionPromise();
  const document = new GoogleSpreadsheet(
    "1yKfUC3EZbpiFD-6yJuoUewgjjzA2yv9zhy7a0G2zD30",
  );
  await document.useServiceAccountAuth(credentials);
  await document.loadInfo();
  const sheet = document.sheetsByIndex[0];
  const rows = await sheet.getRows();
  for (let row of rows) {
    const id = row.ID;
    let coordinates = row.Coordenadas;
    if (coordinates) {
      coordinates = coordinates.split(",").map((el) => parseFloat(el.trim()));
      const json = {
        latitude: coordinates[0],
        longitude: coordinates[1],
      };
      console.log(json, id, row.Local);
      await cambio_info.updateSuc(id, json);
    }
  }
  console.log("FINISH");
}

main();
