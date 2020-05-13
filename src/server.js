const fs = require("fs");
const path = require("path");
const express = require("express");
const fileUpload = require("express-fileupload");
const bodyParser  = require('body-parser');
const rimraf = require("rimraf");
const mkdirp = require("mkdirp");
const child_process = require("child_process");
const Graph = require("./graph");

async function main() {
  return new Promise(async (resolve, reject) => {
    let app = express();

    app.use(fileUpload());

    // app.use(bodyParser.urlencoded({
    //   extended: true
    // }));

    // app.use(bodyParser.json());

    // constants
    const PORT = 8081;
    const PBF = path.join(__dirname, "../extract.osm.pbf");
    const MBTILES = path.join(__dirname, "../extract.mbtiles");
    const IMAGES = path.join(__dirname, "../static/images/survey");

    // application state
    app.state = {};

    // debug
    app.state.graph = new Graph();
    await app.state.graph.load(
      path.join(__dirname, "../test/fixtures/honolulu.json")
    );

    // setup static file server
    app.use("/static", express.static(path.join(__dirname, "../static")));
    app.use(
      "/static/images",
      express.static(path.join(__dirname, "../static/images"))
    );
    mkdirp.sync(IMAGES);

    app.get("/", async (req, res) => {
      let template = (
        await fs.promises.readFile(
          path.join(__dirname, "../templates/index.html")
        )
      ).toString();

      template = template
        .split("{{bounds}}")
        .join(JSON.stringify(app.state.graph.bounds));

      res.send(template);
    });

    app.get("/counter", async (req, res) => {
      let counterValue = parseInt(
        (
          await fs.promises.readFile(path.join(__dirname, "../ram/counter.txt"))
        ).toString()
      );

      res.json({ counter: counterValue });
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

    app.post("/pbf", async (req, res) => {
      if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).send("No pbf file was uploaded.");
      }

      let pbf = req.files.pbf;

      pbf.mv(PBF, async (err) => {
        if (err) {
          return res.status(500).send(err);
        }

        // extract pbf and build street database
        app.state.graph = new Graph();
        app.state.graph = await app.state.graph.extract(PBF);

        await fs.promises.unlink(PBF);

        res.status(200).send("Extract complete.");
      });
    });

    app.post("/mbtiles", async (req, res) => {
      if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).send("No mbtiles file was uploaded.");
      }

      let mbtiles = req.files.mbtiles;

      mbtiles.mv(MBTILES, async (err) => {
        if (err) {
          return res.status(500).send(err);
        }

        res.status(200).send("Tiles upload complete.");
      });
    });

    app.post("/photo", async (req, res) => {
      if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).send("No image file was uploaded.");
      }

      let image = req.files.image;
      let name = uuid() + ".jpg";
      let imagePath = path.join(IMAGES, "/" + name);

      image.mv(imagePath, async (err) => {
        if (err) {
          return res.status(500).send(err);
        }

        res.status(200).send("/static/images/survey/" + name);
      });
    });

    app.get("/surveys/:ref", async (req, res) => {
      let ref = req.params.ref;
      let surveys = app.state.graph.surveys.get(ref);
      if (!surveys) {
        surveys = [];
      }

      res.status(200).send(surveys);
    });

    app.post("/surveys/:ref", async (req, res) => {
      let ref = req.params.ref;
      let surveys = app.state.graph.surveys.get(ref);
      if (!surveys) {
        surveys = [];
      }

      surveys.push(req.body);
      app.state.graph.surveys.set(ref, surveys);

      res.status(200).send("Uploaded survey.");
    });

    app.get("/admin", async (req, res) => {
      let template = (
        await fs.promises.readFile(
          path.join(__dirname, "../templates/admin.html")
        )
      ).toString();
      res.send(template);
    });

    app.post("/admin/update", async (req, res) => {
      res.status(200).send(wifiSettings);
    });

    app.get("/admin/wifi", async (req, res) => {
      var wifiSettings = { mode: "ap", network : "", password : "" };

      try {
        wifiSettings = JSON.parse(
          fs.readFileSync(path.join(__dirname, "../config/wifi.json"))
        );
      }
      catch (e) {
        console.log(e)
      }
      // return wifiSettings
      res.status(200).send(wifiSettings);
    });

    app.post("/admin/wifi", async (req, res) => {
      const wifiSettings = JSON.stringify(req.body)

      // todo validate wifi

      //write wifiSettings to config file
      fs.writeFileSync(path.join(__dirname, "../config/wifi.json"), wifiSettings)

      var wpaConfTemplate = fs.readFileSync(path.join(__dirname, "../config/wpa_supplicant.conf.template"),  'utf8')

      var wpaConf = wpaConfTemplate.replace("[NAME OF WIFI NETWORK]", req.body.network)
                        .replace("[WIFI NETWORK PASSWORD]", req.body.password);

      fs.writeFileSync(path.join(__dirname, "../config/wpa_supplicant.conf"), wpaConf);

      if(req.body.mode === "ap")
        child_process.execSync("sh switch-to-ap.sh", {cwd:'/home/pi/curb-wheel/'});
      else if(req.body.mode === "wifi")
        child_process.execSync("sh switch-to-wifi.sh", {cwd:'/home/pi/curb-wheel/'})
      // return wifiSettings
      res.status(200).send(wifiSettings);
    });

    app.get("/admin/version", async (req, res) => {
      const versionNumber = JSON.parse(
        fs.readFileSync(path.join(__dirname, "../package.json"))
      ).version;

      // return version number
      res.status(200).send({version: versionNumber});
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
      console.log("listening on: 127.0.0.1:" + PORT);
      return resolve(server);
    });
  });
}

function uuid() {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
}

if (require.main === module) {
  // cli
  main();
} else {
  // lib
  module.exports = main;
}
