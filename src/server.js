const fs = require("fs");
const path = require("path");
const express = require("express");
const fileUpload = require("express-fileupload");
const bodyParser = require("body-parser");
const rimraf = require("rimraf");
const mkdirp = require("mkdirp");
const child_process = require("child_process");
const turf = require("@turf/turf");
const archiver = require("archiver");
const copydir = require("copy-dir");
const Graph = require("./graph");

async function main() {
  return new Promise(async (resolve, reject) => {
    let app = express();

    let ids = {
      feature: 0,
      image: 0,
    };

    app.use(fileUpload());

    app.use(bodyParser.json());
    app.use(
      bodyParser.urlencoded({
        extended: true,
      })
    );

    // constants
    const PORT = 8081;
    const PBF = path.join(__dirname, "../extract.osm.pbf");
    const GRAPH = path.join(__dirname, "../graph.json");
    const MBTILES = path.join(__dirname, "../extract.mbtiles");
    const IMAGES = path.join(__dirname, "../static/images/survey");
    const UNITS = { units: "meters" };

    // application state
    app.state = {};

    // debug
    app.state.graph = new Graph();

    if (fs.existsSync(GRAPH)) {
      console.log("Found graph.");
      await app.state.graph.load(GRAPH);
    } else {
      console.log("No graph found.");
    }

    // setup static file server
    app.use("/static", express.static(path.join(__dirname, "../static")));
    app.use(
      "/static/images",
      express.static(path.join(__dirname, "../static/images"))
    );
    mkdirp.sync(IMAGES);

    app.get("/", async (req, res) => {
      if (fs.existsSync(GRAPH)) {
        let template = (
          await fs.promises.readFile(
            path.join(__dirname, "../templates/index.html")
          )
        ).toString();

        template = template
          .split("{{bounds}}")
          .join(JSON.stringify(app.state.graph.bounds));

        res.send(template);
      } else {
        // HTTP Status - 412 Precondition Failed
        // https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/412
        res.status(412).redirect("/admin");
      }
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
        if (fs.existsSync(GRAPH)) {
          await fs.promises.unlink(GRAPH);
        }

        await app.state.graph.save(GRAPH);

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
      let ext = path.extname(req.files.image.name);
      let name = uuid() + ext;
      let imagePath = path.join(IMAGES, "/" + name);

      image.mv(imagePath, async (err) => {
        if (err) {
          return res.status(500).send(err);
        }

        res.status(200).send("/static/images/survey/" + name);
      });
    });

    app.post("/reset-surveys", async (req, res) => {
      app.state.graph.surveys = new Map();

      rimraf.sync(IMAGES);
      mkdirp.sync(IMAGES);

      await app.state.graph.save(GRAPH);

      res.status(200).redirect("/admin");
    });

    app.get("/export.zip", async (req, res) => {
      let spans = [];
      let positions = [];
      let images = [];
      let spanPoints = [];
      let spanAndPositionPoints = [];

      for (let [ref, surveys] of app.state.graph.surveys) {
        if (!app.state.graph.refs.has(ref)) {
          throw new Error("Surveyed street ref not found: ", ref);
        }

        let street = app.state.graph.streets[app.state.graph.refs.get(ref)];

        // flip geometry if survey is back ref
        if (ref === street.properties.back) {
          street.geometry.coordinates.reverse();
        }

        for (let survey of surveys) {
          let startOffset =
            (street.properties.distance - survey.surveyed_distance) / 2;
          let endOffset =
            street.properties.distance -
            (street.properties.distance - survey.surveyed_distance) / 2;

          if (street.properties.distance <= survey.surveyed_distance) {
            startOffset = 0;
            endOffset = street.properties.distance;
          }

          let centered = turf.lineString([
            turf.along(street, startOffset, UNITS).geometry.coordinates,
            turf.along(street, endOffset, UNITS).geometry.coordinates,
          ]);
          for (let feature of survey.features) {
            if (feature.geometry.type === "Span") {
              let line = turf.lineSliceAlong(
                centered,
                feature.geometry.distances[0],
                feature.geometry.distances[1],
                UNITS
              );

              let span = {
                type: "Feature",
                geometry: {
                  type: "LineString",
                  coordinates: line.geometry.coordinates,
                },
                properties: {
                  created_at: survey.created_at,
                  cwheelid: "", // todo: figure out where to find this
                  shst_ref_id: survey.shst_ref_id,
                  ref_side: survey.side_of_street,
                  ref_len: street.properties.distance,
                  srv_dist: survey.surveyed_distance,
                  srv_id: survey.id,
                  feat_id: feature.id,
                  label: feature.label,
                  dst_st: feature.geometry.distances[0],
                  dst_end: feature.geometry.distances[1],
                  images: JSON.stringify(feature.images),
                },
              };

              let start = turf.point(
                span.geometry.coordinates[0],
                span.properties
              );
              let end = turf.point(
                span.geometry.coordinates[span.geometry.coordinates.length - 1],
                span.properties
              );

              for (let image of feature.images) {
                let pt = turf.along(centered, image.geometry.distance, UNITS);

                pt.properties.url = image.url;

                images.push(pt);
              }

              spans.push(span);
              spanPoints.push(start);
              spanPoints.push(end);
              spanAndPositionPoints.push(start);
              spanAndPositionPoints.push(end);
            } else if (feature.geometry.type === "Position") {
              // todo: Positions are being incorrectly stored with span style distances array. Fix upstream.
              let point = turf.along(
                centered,
                feature.geometry.distances[0],
                UNITS
              );

              for (let image of feature.images) {
                let pt = turf.along(centered, image.distance, UNITS);

                pt.properties.url = image.url;

                images.push(pt);
              }

              positions.push(point);
              spanAndPositionPoints.push(point);
            } else {
              throw new Error("Unknown geometry type.");
            }
          }
        }
      }

      let exportDir = path.join(__dirname, "../export");
      let zipDir = path.join(__dirname, "../export.zip");

      try {
        rimraf.sync(exportDir);
        rimraf.sync(zipDir);
      } catch (e) {
        console.error(e);
      }
      mkdirp.sync(exportDir);

      await fs.promises.writeFile(
        path.join(exportDir, "spans.geojson"),
        JSON.stringify(turf.featureCollection(spans)),
        {
          name: "spans.geojson",
        }
      );
      await fs.promises.writeFile(
        path.join(exportDir, "positions.geojson"),
        JSON.stringify(turf.featureCollection(positions)),
        {
          name: "positions.geojson",
        }
      );
      await fs.promises.writeFile(
        path.join(exportDir, "spanPoints.geojson"),
        JSON.stringify(turf.featureCollection(spanPoints)),
        {
          name: "spanPoints.geojson",
        }
      );
      await fs.promises.writeFile(
        path.join(exportDir, "spanAndPositionPoints.geojson"),
        JSON.stringify(turf.featureCollection(spanAndPositionPoints)),
        {
          name: "spanAndPositionPoints.geojson",
        }
      );
      await fs.promises.writeFile(
        path.join(exportDir, "images.geojson"),
        JSON.stringify(turf.featureCollection(images)),
        {
          name: "images.geojson",
        }
      );

      copydir.sync(
        path.join(__dirname, "../static/images/survey"),
        path.join(exportDir, "./images")
      );

      var archive = archiver("zip", {
        zlib: { level: 9 }, // compression level
      });

      let output = fs.createWriteStream(zipDir);
      archive.directory(exportDir, false);

      output.on("close", function () {
        res.status(200).download(zipDir);
      });

      archive.pipe(output);

      archive.finalize();
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

      await app.state.graph.save(GRAPH);

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
      var wifiSettings = { mode: "ap", network: "", password: "" };

      try {
        wifiSettings = JSON.parse(
          fs.readFileSync(path.join(__dirname, "../config/wifi.json"))
        );
      } catch (e) {
        console.error(e);
      }
      // return wifiSettings
      res.status(200).send(wifiSettings);
    });

    app.post("/admin/wifi", async (req, res) => {
      const wifiSettings = JSON.stringify(req.body);

      // todo validate wifi

      //write wifiSettings to config file
      fs.writeFileSync(
        path.join(__dirname, "../config/wifi.json"),
        wifiSettings
      );

      var wpaConfTemplate = fs.readFileSync(
        path.join(__dirname, "../config/wpa_supplicant.conf.template"),
        "utf8"
      );

      var wpaConf = wpaConfTemplate
        .replace("[NAME OF WIFI NETWORK]", req.body.network)
        .replace("[WIFI NETWORK PASSWORD]", req.body.password);

      fs.writeFileSync(
        path.join(__dirname, "../config/wpa_supplicant.conf"),
        wpaConf
      );

      if (req.body.mode === "ap")
        child_process.execSync("sh switch-to-ap.sh", {
          cwd: "/home/pi/curb-wheel/",
        });
      else if (req.body.mode === "wifi")
        child_process.execSync("sh switch-to-wifi.sh", {
          cwd: "/home/pi/curb-wheel/",
        });
      // return wifiSettings
      res.status(200).send(wifiSettings);
    });

    app.get("/admin/version", async (req, res) => {
      const versionNumber = JSON.parse(
        fs.readFileSync(path.join(__dirname, "../package.json"))
      ).version;

      // return version number
      res.status(200).send({ version: versionNumber });
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
