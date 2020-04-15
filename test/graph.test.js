const test = require("tap").test;
const path = require("path");
const fs = require("fs");
const promisify = require("util").promisify;
const rimraf = require("rimraf");
const Graph = require("../src/graph");

const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);
const unlinkAsync = promisify(fs.unlink);

test("graph", async (t) => {
  const pbf = path.join(__dirname, "./fixtures/honolulu.osm.pbf");

  let graph = new Graph();

  await graph.extract(pbf);

  t.equal(graph.streets.length, 41238, "found correct number of streets");

  t.equal(
    JSON.stringify(graph.center),
    JSON.stringify([-157.92574368339038, 21.392388274836083]),
    "calculated center"
  );

  t.equal(
    JSON.stringify(graph.bounds),
    JSON.stringify([
      -158.27867790000002,
      21.2551476,
      -157.6497798,
      21.708617500000003,
    ]),
    "calculated bounds"
  );

  let results = await graph.query([
    -157.88078784942627,
    21.329380640899263,
    -157.87932872772217,
    21.330275097830327,
  ]);
  t.equal(results.length, 8, "built a spatial index");

  let file = path.join(__dirname, "./fixtures/graph.json");
  await graph.save(file);
  let raw = (await readFileAsync(file)).toString();
  let data = JSON.parse(raw);
  t.equal(data.streets.length, 41238, "save graph");
  delete data;
  delete raw;

  let copy = new Graph();
  t.false(copy.loaded, "copy not loaded");
  await copy.load(file);
  t.true(copy.loaded, "copy loaded");
  t.equal(copy.streets.length, graph.streets.length, "load graph - streets");
  t.equal(
    JSON.stringify(copy.bounds),
    JSON.stringify(graph.bounds),
    "load graph - bounds"
  );
  t.equal(
    JSON.stringify(copy.center),
    JSON.stringify(graph.center),
    "load graph - center"
  );
  let copyResults = await copy.query([
    -157.88078784942627,
    21.329380640899263,
    -157.87932872772217,
    21.330275097830327,
  ]);
  t.equal(
    JSON.stringify(copyResults),
    JSON.stringify(results),
    "load graph - spatial index"
  );

  await unlinkAsync(file);

  t.done();
});
