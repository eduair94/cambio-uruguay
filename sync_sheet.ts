import {
  GoogleSpreadsheet
} from "google-spreadsheet";
import moment from "moment";
import { cambio_info } from "./classes/cambioInfo";
import { MongooseServer } from "./classes/database";
import sentryInit from "./sentry";
import * as credentials from "./sheet_key.json";

const main = async () => {
  sentryInit();
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
