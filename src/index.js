const fs = require("fs");
const express = require("express");
const fileUpload = require("express-fileupload");
const extract = require("./extract");

async function main() {
  return new Promise((resolve, reject) => {
    let app = express();

    // constants
    const PORT = 80;
    const TMP_PBF = "./extract.osm.pbf";

    // middleware
    app.use(fileUpload());

    // application state
    app.state = {};

    app.get("/", (req, res) => res.send("<h1>curb wheel</h1>"));
    app.post("/extract", async (req, res) => {
      if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).send("No pbf file was uploaded.");
      }

      let pbf = req.files.pbf;

      pbf.mv(TMP_PBF, async function (err) {
        if (err) {
          return res.status(500).send(err);
        }

        // extract pbf and build street database
        // app.state.graph = await extract()

        await fs.unlink(TMP_PBF);

        res.status(200).send("Extract complete.");
      });
    });

    let server = app.listen(PORT, () => {
      return resolve(server);
    });
  });
}

if (require.main === module) {
  // cli
  main();
} else {
  // lib
  module.exports = main;
}
