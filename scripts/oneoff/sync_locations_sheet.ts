import { cambio_info } from "../../classes/cambioInfo";
import { MongooseServer } from "../../classes/database";
import { openSpreadsheet } from "../../classes/sheets";
import * as credentials from "../../sheet_key.json";

const main = async () => {
  await MongooseServer.startConnectionPromise();
  const info = await cambio_info.getAllMarkets();
  const document = openSpreadsheet("1yKfUC3EZbpiFD-6yJuoUewgjjzA2yv9zhy7a0G2zD30", credentials);
  await document.loadInfo();
  const sheet = document.sheetsByIndex[0];
  await sheet.setHeaderRow(["ID", "Local", "Departamento", "Localidad", "Dirección"]);
  await sheet.clearRows();
  const data = info.map((el) => {
    return {
      ID: el.id,
      Local: el.origin.toUpperCase(),
      Departamento: el.Departamento,
      Localidad: el.Localidad,
      Dirección: el.Direccion,
    };
  });
  const res = await sheet.addRows(data);
};

main();
