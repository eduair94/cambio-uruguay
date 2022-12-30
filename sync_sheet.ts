import { cambio_info } from "./classes/cambioInfo";
import { MongooseServer } from "./classes/database";
import * as credentials from "./sheet_key.json";
import {
  GoogleSpreadsheet,
  GoogleSpreadsheetWorksheet,
} from "google-spreadsheet";
import moment from "moment";

const main = async () => {
  await MongooseServer.startConnectionPromise();
  const info = await cambio_info.get_data();
  const document = new GoogleSpreadsheet(
    "1rnP2b0TT-cqDzP0nrJSU1BVCJx6eynJuuQx-ZIFuWCo"
  );
  await document.useServiceAccountAuth(credentials);
  await document.loadInfo();
  const sheet = document.sheetsByIndex[0];
  await sheet.setHeaderRow([
    "Local",
    "Moneda",
    "Compra",
    "Venta",
    "Tipo",
    "Fecha",
  ]);
  await sheet.clearRows();
  const data = info.map((el) => {
    return {
      Local: el.origin.toUpperCase(),
      Moneda: el.code,
      Compra: el.buy,
      Venta: el.sell,
      Tipo: el.type,
      Fecha: moment(el.date).format("DD/MM/YYYY"),
    };
  });
  const res = await sheet.addRows(data);
};

main();
