const test = require("tap").test;
const path = require("path");
const extract = require("../src/extract");

test("extract", async (t) => {
  const pbf = path.join(__dirname, "./fixtures/honolulu.osm.pbf");

  const graph = await extract(pbf);

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

  t.done();
});
