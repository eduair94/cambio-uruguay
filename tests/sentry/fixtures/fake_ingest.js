// A stand-in for Sentry's ingest endpoint: appends every request (path + decoded body) to the file
// named in argv[2] as one JSON line, and prints the port it listens on.
const fs = require("fs");
const http = require("http");
const zlib = require("zlib");
const out = process.argv[2];
http
  .createServer((req, res) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c)).on("end", () => {
      let body = Buffer.concat(chunks);
      if (/gzip/.test(req.headers["content-encoding"] || "")) body = zlib.gunzipSync(body);
      fs.appendFileSync(out, JSON.stringify({ url: req.url, body: body.toString("utf8") }) + "\n");
      res.writeHead(200, { "content-type": "application/json" });
      res.end("{}");
    });
  })
  .listen(0, "127.0.0.1", function () {
    process.stdout.write(String(this.address().port) + "\n");
  });
