import axios from "axios";
import axiosRetry from "axios-retry";
import BCU_Details from "./classes/bcu_details";
import { MongooseServer } from "./classes/database";
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";
axiosRetry(axios, {
  retries: 3, // number of retries
  retryDelay: (retryCount) => {
    console.log(`retry attempt: ${retryCount}`);
    return retryCount * 2000; // time interval between retries
  },
  retryCondition: (error) => {
    // if retry condition is not specified, by default idempotent requests are retried
    return error.response.status === 503 || error.response.status === 502;
  },
});
const main = async () => {
  await MongooseServer.startConnectionPromise();
  const x = new BCU_Details();
  x.sync_data();
};

main();
