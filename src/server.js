const fs = require("fs");
const path = require("path");
const express = require("express");
const bodyParser  = require('body-parser');
const fileUpload = require("express-fileupload");
const rimraf = require("rimraf");
const mkdirp = require("mkdirp");
const Graph = require("./graph");

var counterOffsets = {};
var pausedCounters = {};

async function main() {
  return new Promise(async (resolve, reject) => {
    let app = express();

    app.use(bodyParser.urlencoded({
      extended: true
    }));

    // constants
    const PORT = 8081;
    const PBF = path.join(__dirname, "../extract.osm.pbf");
    const MBTILES = path.join(__dirname, "../extract.mbtiles");
    const IMAGES = path.join(__dirname, "../static/images/survey");

    // middleware
    app.use(fileUpload());
    app.use(express.json());

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
      res.send(template);
    });


    app.get("/wheel", async (req, res) => {

      let counterValue = parseInt(
        (
          await fs.promises.readFile(path.join(__dirname, "../ram/counter.txt"))
        ).toString()
      );

      res.json({ counter: counterValue, timestamp: Date.now()});
    });

    // post hook sets wheel internal value for testing
    app.post("/wheel", async (req, res) => {

      await fs.promises.writeFile(path.join(__dirname, "../ram/counter.txt"), req.body.counter + "");

      let counterValue = parseInt(
        (
          await fs.promises.readFile(path.join(__dirname, "../ram/counter.txt"))
        ).toString()
      );

      res.json({ counter: counterValue, timestamp: Date.now()});
    });

    app.get("/counter/:counterId?", async (req, res) => {

      let counterId = req.params.counterId ? req.params.counterId : 'default';

      let counterValue = parseInt(
        (
          await fs.promises.readFile(path.join(__dirname, "../ram/counter.txt"))
        ).toString()
      );

      var offsetCounterValue;

      // if paused return last measured value
      if(pausedCounters[counterId]) {
        offsetCounterValue = pausedCounters[counterId]; 
      }
      else {

        // if counterId undefined set counter to zero -- implicit start/reset
        if(counterOffsets[counterId] >= 0) {
          // reutrn counter offset from last start value
          offsetCounterValue = counterValue - counterOffsets[counterId];
        }
        else {
          offsetCounterValue = counterValue;
          counterOffsets[counterId] = counterValue;
          pausedCounters[counterId] = null; 
        }       
      }

      res.json({ counter: offsetCounterValue, timestamp: Date.now()});
    });

    app.post("/counter/:counterId?/pause", async (req, res) => {

      let counterId = req.params.counterId ? eq.params.counterId : 'default';

      let counterValue = parseInt(
        (
          await fs.promises.readFile(path.join(__dirname, "../ram/counter.txt"))
        ).toString()
      );

      // if counterId undefined set counter to zero -- implicit start/reset
      if(counterOffsets[counterId] == null || counterOffsets[counterId] == undefined) {
        counterOffsets[counterId] = counterValue;
      }

      // set paused value to current counter val
      pausedCounters[counterId] = counterValue;

      // reutrn paused value offset from last start value
      var offsetCounterValue = pausedCounters[counterId] - counterOffsets[counterId];

      res.json({ counter: offsetCounterValue, timestamp: Date.now()});

    });

    app.post("/counter/:counterId?/resume", async (req, res) => {

      let counterId = req.params.counterId ? eq.params.counterId : 'default';

      let counterValue = parseInt(
        (
          await fs.promises.readFile(path.join(__dirname, "../ram/counter.txt"))
        ).toString()
      );
      if(counterOffsets[counterId] >= 0 && pausedCounters[counterId] >= 0) {
        counterOffsets[counterId] = counterOffsets[counterId] + (counterValue - pausedCounters[counterId])
      } 
      else {
        counterOffsets[counterId] = counterValue;
      }

      pausedCounters[counterId] = null;

      // reutrn counter offset from last start value
      var offsetCounterValue = counterValue - counterOffsets[counterId];

      res.json({ counter: offsetCounterValue, timestamp: Date.now()});
    });

    app.post("/counter/:counterId?/reset", async (req, res) => {
      
      let counterId = req.params.counterId ? eq.params.counterId : 'default';

      let counterValue = parseInt(
        (
          await fs.promises.readFile(path.join(__dirname, "../ram/counter.txt"))
        ).toString()
      );

      counterOffsets[counterId] = counterValue;
      pausedCounters[counterId] = null;  
    
      // reutrn counter offset from last start value
      var offsetCounterValue = counterValue  - counterOffsets[counterId];

      res.json({ counter: offsetCounterValue, timestamp: Date.now()});
    });

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
