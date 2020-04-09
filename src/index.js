const fs = require("fs");
const path = require("path");
const express = require("express");
const fileUpload = require("express-fileupload");
const extract = require("./extract");

async function main() {
  return new Promise((resolve, reject) => {
    let app = express();

    // constants
    const PORT = 8081;
    const TMP_PBF = "./extract.osm.pbf";

    // middleware
    app.use(fileUpload());

    // application state
    app.state = {};

    app.use("/static", express.static(path.join(__dirname, "../static")));
    app.use(
      "/static/images",
      express.static(path.join(__dirname, "../static/images"))
    );

    app.get("/", async (req, res) => {
      let template = (
        await fs.promises.readFile(
          path.join(__dirname, "../templates/index.html")
        )
      ).toString();
      res.send(template);
    });

    app.get("/counter", async (req, res) => {

      let counterValue = parseInt((
        await fs.promises.readFile(
            path.join(__dirname, "../ram/counter.txt")
        )
      ).toString());

      res.json({ counter: counterValue });
    });


    app.get("/overview", async (req, res) => {
      let template = (
        await fs.promises.readFile(
          path.join(__dirname, "../templates/overview.html")
        )
      ).toString();

      //console.log(fs.readFileSync(path.join(__dirname, '../graph.json')).toString())
      template = template
        .split("{{graph}}")
        .join(
          fs.readFileSync(path.join(__dirname, "../graph.json")).toString()
        );

      res.send(template);
    });

    app.post("/extract", async (req, res) => {
      if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).send("No pbf file was uploaded.");
      }

      let pbf = req.files.pbf;

      pbf.mv(TMP_PBF, async (err) => {
        if (err) {
          return res.status(500).send(err);
        }

        // extract pbf and build street database
        app.state.graph = await extract(TMP_PBF);

        await fs.unlink(TMP_PBF);

        res.status(200).send("Extract complete.");
      });
    });

    app.get("/*", async (req, res) => {
      let template = (
        await fs.promises.readFile(
          path.join(__dirname, "../templates/404.html")
        )
      ).toString();

      res.status(404).send(template);
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
