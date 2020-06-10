const path = require("path");
const Graph = require("../src/graph");

async function cycle(fixture) {
  let start = Date.now();

  let graph = new Graph();
  await graph.extract(fixture);

  let stop = Date.now();
  return stop - start;
}

async function bench(fixture, description) {
  console.log(path.basename(fixture));
  console.log(description);
  console.log("---");

  let cycles = 10;
  let total = 0;
  for (let i = 0; i < cycles; i++) {
    let time = await cycle(fixture);
    console.log(i + 1, "/", cycles, ": ", time, "ms");
    total += time;
  }

  console.log("average: ", (total / cycles).toFixed(4) + " ms\n");
}

async function run() {
  await bench(
    path.join(__dirname, "../test/fixtures/oakland.osm.pbf"),
    "small neighborhood transport-only hot extract"
  );
  await bench(
    path.join(__dirname, "../test/fixtures/honolulu.osm.pbf"),
    "medium full city nextzen metro extract"
  );
  await bench(
    path.join(__dirname, "../test/fixtures/dc.osm.pbf"),
    "medium full city transport-only hot extract"
  );
  await bench(
    path.join(__dirname, "../test/fixtures/nyc.osm.pbf"),
    "large full city transport-only hot extract"
  );
}

run();
