const fs = require("fs");
const path = require("path");
const express = require("express");
const fileUpload = require("express-fileupload");
const Graph = require("./graph");

async function main() {
  return new Promise(async (resolve, reject) => {
    let app = express();

    // constants
    const PORT = 80;
    const TMP_PBF = "./extract.osm.pbf";

    // middleware
    app.use(fileUpload());

    // application state
    app.state = {};

    // debug
    app.state.graph = new Graph();
    await app.state.graph.load(path.join(__dirname, "../honolulu.json"));

    app.use("/static", express.static(path.join(__dirname, "../static")));
    app.use(
      "/static/images",
      express.static(path.join(__dirname, "../static/images"))
    );

    app.get("/", (req, res) => res.send("<h1>curb wheel</h1>"));

    app.get("/overview", async (req, res) => {
      let template = (
        await fs.promises.readFile(
          path.join(__dirname, "../templates/overview.html")
        )
      ).toString();

      template = template
        .split("{{bounds}}")
        .join(JSON.stringify(app.state.graph.bounds));

      res.send(template);
    });

    app.get("/query", async (req, res) => {
      let streets = await app.state.graph.query([
        +req.query.minX,
        +req.query.minY,
        +req.query.maxX,
        +req.query.maxY,
      ]);
      res.send({
        type: "FeatureCollection",
        features: streets,
      });
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
        app.state.graph = new Graph();
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
