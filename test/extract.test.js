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

  t.equal(
    graph.index
      .search(
        -157.88078784942627,
        21.329380640899263,
        -157.87932872772217,
        21.330275097830327
      )
      .map((k) => {
        return graph.streets[k];
      }).length,
    8,
    "built a spatial index"
  );

  // debug spatial search
  /*
  const turf = require("@turf/turf");
  console.log(
    JSON.stringify(
      turf.featureCollection(
        [
          turf.bboxPolygon([
            -157.88078784942627,
            21.329380640899263,
            -157.87932872772217,
            21.330275097830327,
          ]),
        ].concat(
          graph.index
            .search(
              -157.88078784942627,
              21.329380640899263,
              -157.87932872772217,
              21.330275097830327
            )
            .map((k) => {
              return graph.streets[k];
            })
        )
      )
    )
  );
  */

  t.done();
});
