const fs = require("fs");
const level = require("level");
const cover = require("@mapbox/tile-cover");
const tilebelt = require("@mapbox/tilebelt");
const turf = require("@turf/turf");
const through2 = require("through2");
const parser = require("osm-pbf-parser");
const shst = require("sharedstreets");
const normalizer = require("@mapbox/graph-normalizer");
const Flatbush = require("flatbush");

async function extract(pbf) {
  return new Promise((resolve, reject) => {
    let graph = {};
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

        for (let way of ways) {
          let right = shst.forwardReference(way).id;
          let left = shst.backReference(way).id;
        }

        graph.streets = ways;
        graph.center = [
          mapMetadata.totalX / mapMetadata.count,
          mapMetadata.totalY / mapMetadata.count,
        ];
        graph.bounds = [
          mapMetadata.minX,
          mapMetadata.minY,
          mapMetadata.maxX,
          mapMetadata.maxY,
        ];

        // build spatial index
        let index = new Flatbush(graph.streets.length);
        for (let street of graph.streets) {
          let bbox = turf.bbox(street);
          index.add(bbox[0], bbox[1], bbox[2], bbox[3]);
        }
        index.finish();
        graph.index = index;

        return resolve(graph);
      });
  });
}

module.exports = extract;
