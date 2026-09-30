import { cambio_info } from "../../classes/cambioInfo";
import { MongooseServer } from "../../classes/database";
import { openSpreadsheet } from "../../classes/sheets";
import * as credentials from "../../sheet_key.json";

async function main() {
  await MongooseServer.startConnectionPromise();
  const document = openSpreadsheet("1yKfUC3EZbpiFD-6yJuoUewgjjzA2yv9zhy7a0G2zD30", credentials);
  await document.loadInfo();
  const sheet = document.sheetsByIndex[0];
  const rows = await sheet.getRows();
  let idx = 1;
  for (let row of rows) {
    console.log("Pos", idx, rows.length);
    const id = row.get("ID");
    let coordinates = row.get("Coordenadas");
    const status = parseInt(row.get("Status"));
    if (coordinates) {
      const findSuc: any = await cambio_info.findSuc(id);
      coordinates = coordinates.split(",").map((el) => parseFloat(el.trim()));
      let json: any = {
        Direccion: row.get("Dirección"),
        Departamento: row.get("Departamento"),
        Localidad: row.get("Localidad"),
        latitude: coordinates[0],
        longitude: coordinates[1],
        status: status,
      };
      if (row.get("Nombre")) {
        json.Nombre = row.get("Nombre");
      }
      if (row.get("Telefono")) {
        json.Telefono = row.get("Telefono");
      }
      if (!findSuc.NroSucursal) {
        json.NroSucursal = id.split(/-(.*)/s)[1];
      }
      if (row.get("Mapa")) {
        json.map = row.get("Mapa");
      }
      if (findSuc) {
        await cambio_info.updateSuc(id, json);
      } else {
        json.origin = row.get("Local").toLowerCase();
        console.log("Create new suc", id, json);
        await cambio_info.createSuc(id, json);
      }
    } else if (status === 0) {
      const json = {
        status: 0,
      };
      await cambio_info.updateSuc(id, json);
    }
    idx++;
  }
  console.log("FINISH");
}

main();
