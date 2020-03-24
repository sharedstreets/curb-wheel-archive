const fs = require("fs");
const level = require("level");
const cover = require("@mapbox/tile-cover");
const tilebelt = require("@mapbox/tilebelt");
const turf = require("@turf/turf");
const through2 = require("through2");
const parser = require("osm-pbf-parser");
const normalizer = require("@mapbox/graph-normalizer");

async function extract(pbf) {
  return new Promise((resolve, reject) => {
    let graph = {};
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
          }
          let properties = way.tags;
          properties.id = way.id;
          properties.refs = way.refs;
          let line = turf.lineString(coordinates, properties);
          return line;
        });

        ways = normalizer.splitWays(ways);
        ways = normalizer.mergeWays(ways);
        ways = normalizer.unidirectionalWays(ways);

        // TODO: assign sharedstreets refs here

        //fs.writeFileSync('./lines.json', JSON.stringify(turf.featureCollection(ways)))

        graph.ways = ways;

        return resolve(graph);
      });
  });
}

module.exports = extract;
