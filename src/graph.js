const fs = require("fs");
const promisify = require("util").promisify;
const level = require("level");
const cover = require("@mapbox/tile-cover");
const tilebelt = require("@mapbox/tilebelt");
const turf = require("@turf/turf");
const through2 = require("through2");
const parser = require("osm-pbf-parser");
const shst = require("sharedstreets");
const normalizer = require("@mapbox/graph-normalizer");
const RBush = require("rbush");

const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);

function Graph() {
  this.streets = [];
  this.refs = new Map();
  this.bounds = [-Infinity, -Infinity, Infinity, Infinity];
  this.center = [0, 0];
  this.index = {};
  this.surveys = new Map();
  this.loaded = false;
}

Graph.prototype.query = async function (bbox) {
  return this.index
    .search({
      minX: bbox[0],
      minY: bbox[1],
      maxX: bbox[2],
      maxY: bbox[3],
    })
    .map((k) => {
      return this.streets[k.id];
    });
};

Graph.prototype.save = async function (file) {
  let copy = {};
  copy.streets = this.streets;
  copy.refs = {};
  for (const [key, value] of this.refs) {
    copy.refs[key] = value;
  }
  copy.bounds = this.bounds;
  copy.center = this.center;
  copy.index = this.index.toJSON();
  copy.surveys = {};
  for (const [key, value] of this.surveys) {
    copy.surveys[key] = value;
  }

  await writeFileAsync(file, JSON.stringify(copy));
};

Graph.prototype.load = async function (file) {
  let raw = (await readFileAsync(file)).toString();
  let data = JSON.parse(raw);
  this.streets = data.streets;
  this.refs = new Map();
  for (const key of Object.keys(data.refs)) {
    this.refs.set(key, data.refs[key]);
  }
  this.bounds = data.bounds;
  this.center = data.center;
  this.index = new RBush().fromJSON(data.index);
  this.surveys = new Map();
  for (const key of Object.keys(data.surveys)) {
    this.surveys.set(key, data.surveys[key]);
  }
  this.loaded = true;
};

Graph.prototype.extract = async function (pbf) {
  return new Promise((resolve, reject) => {
    let mapMetadata = {
      totalX: 0,
      totalY: 0,
      count: 0,
      minX: Infinity,
      minY: Infinity,
      maxX: -Infinity,
      maxY: -Infinity,
    };
    let ways = [];
    let nodes = new Map();

    const parse = parser();

    fs.createReadStream(pbf)
      .pipe(parse)
      .pipe(
        through2.obj((items, enc, next) => {
          for (let item of items) {
            if (item.type === "node") {
              nodes.set(item.id, item);
            } else if (
              item.type === "way" &&
              item.tags.highway &&
              item.refs.length >= 2
            ) {
              ways.push(item);
            }
          }
          next();
        })
      )
      .on("finish", () => {
        ways = ways.map((way) => {
          let coordinates = [];
          for (let ref of way.refs) {
            const node = nodes.get(ref);
            coordinates.push([node.lon, node.lat]);

            mapMetadata.totalX += node.lon;
            mapMetadata.totalY += node.lat;
            mapMetadata.count++;
            if (node.lon < mapMetadata.minX) mapMetadata.minX = node.lon;
            if (node.lat < mapMetadata.minY) mapMetadata.minY = node.lat;
            if (node.lon > mapMetadata.maxX) mapMetadata.maxX = node.lon;
            if (node.lat > mapMetadata.maxY) mapMetadata.maxY = node.lat;
          }
          let properties = way.tags;
          properties.id = way.id;
          properties.refs = way.refs;
          let line = turf.lineString(coordinates, properties);

          return line;
        });

        ways = normalizer.splitWays(ways);
        ways = normalizer.mergeWays(ways);

        this.refs = new Map();
        let i = 0;
        for (let way of ways) {
          way.properties.forward = shst.forwardReference(way).id;
          way.properties.back = shst.backReference(way).id;
          way.properties.distance = turf.length(way, { units: "meters" });

          this.refs.set(way.properties.forward, i);
          this.refs.set(way.properties.back, i);
          i++;
        }

        this.streets = ways;
        this.center = [
          mapMetadata.totalX / mapMetadata.count,
          mapMetadata.totalY / mapMetadata.count,
        ];
        this.bounds = [
          mapMetadata.minX,
          mapMetadata.minY,
          mapMetadata.maxX,
          mapMetadata.maxY,
        ];

        // build spatial index
        let index = new RBush();
        let k = 0;
        for (let street of this.streets) {
          let bbox = turf.bbox(street);
          index.insert({
            minX: bbox[0],
            minY: bbox[1],
            maxX: bbox[2],
            maxY: bbox[3],
            id: k,
          });
          k++;
        }
        this.index = index;
        this.surveys = new Map();

        return resolve(this);
      });
  });
};

module.exports = Graph;
