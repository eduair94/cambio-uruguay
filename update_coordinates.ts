import { GoogleSpreadsheet } from "google-spreadsheet";
import { cambio_info } from "./classes/cambioInfo";
import { MongooseServer } from "./classes/database";
import * as credentials from "./sheet_key.json";

async function main() {
  await MongooseServer.startConnectionPromise();
  const document = new GoogleSpreadsheet("1yKfUC3EZbpiFD-6yJuoUewgjjzA2yv9zhy7a0G2zD30");
  await document.useServiceAccountAuth(credentials);
  await document.loadInfo();
  const sheet = document.sheetsByIndex[0];
  const rows = await sheet.getRows();
  for (let row of rows) {
    const id = row.ID;
    let coordinates = row.Coordenadas;
    const status = parseInt(row.Status);
    if (coordinates) {
      const findSuc: any = await cambio_info.findSuc(id);
      coordinates = coordinates.split(",").map((el) => parseFloat(el.trim()));
      const json = {
        Direccion: row["Dirección"],
        Departamento: row.Departamento,
        latitude: coordinates[0],
        longitude: coordinates[1],
        status: status,
      };
      console.log(json, id, row.Local);
      if (findSuc) {
        await cambio_info.updateSuc(id, json);
      } else {
        console.log("Create new suc", id, json);
        await cambio_info.createSuc(id, json);
      }
    } else if (status === 0) {
      const json = {
        status: 0,
      };
      await cambio_info.updateSuc(id, json);
    }
  }
  console.log("FINISH");
}

main();
