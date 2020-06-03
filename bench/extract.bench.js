const path = require("path");
const Benchmark = require("benchmark");
const Graph = require("./src/graph")

function bench () {
  let suite = new Benchmark.Suite;

  // add tests
  suite.add('small', async () => {
    // small
    const pbf = path.join(__dirname, "./test/fixtures/honolulu.osm.pbf");

    let graph = new Graph();

    await graph.extract(pbf);
  })
  .add('medium', function() {
    // medium
    const pbf = path.join(__dirname, "./test/fixtures/honolulu.osm.pbf");

    let graph = new Graph();

    await graph.extract(pbf);
  })
  .add('large', function() {
    // large
    const pbf = path.join(__dirname, "./test/fixtures/honolulu.osm.pbf");

    let graph = new Graph();

    await graph.extract(pbf);
  })
  // add listeners
  .on('cycle', function(event) {
    console.log(String(event.target));
  })
  .on('complete', function(res) {
    console.log(result);
  })
  .run()
}

bench()
