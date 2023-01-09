import { GoogleSpreadsheet, GoogleSpreadsheetRow } from "google-spreadsheet";
import { cambio_info } from "./classes/cambioInfo";
import { MongooseServer } from "./classes/database";
import * as credentials from "./sheet_key.json";

async function main() {
  await MongooseServer.startConnectionPromise();
  const document = new GoogleSpreadsheet("1yKfUC3EZbpiFD-6yJuoUewgjjzA2yv9zhy7a0G2zD30");
  await document.useServiceAccountAuth(credentials);
  await document.loadInfo();
  const sheet = document.sheetsByIndex[0];
  const rows: GoogleSpreadsheetRow[] = await sheet.getRows();
  for (let row of rows) {
    const id = row.ID;
    console.log("ID", id);
    const findSuc: any = await cambio_info.findSuc(id);
    if (findSuc) {
      const phone = findSuc.Telefono;
      const name = findSuc.Nombre;
      if (phone) row.Telefono = phone;
      if (name) row.Nombre = name;
      console.log("Row", row);
      await row.save();
    } else {
      console.log("No suc", id);
    }
  }
  console.log("FINISH");
}

main();
