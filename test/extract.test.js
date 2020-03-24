const test = require("tap").test;
const path = require("path");
const extract = require("../src/extract");

test("extract", async (t) => {
  const pbf = path.join(__dirname, "./fixtures/honolulu.osm.pbf");

  await extract(pbf);

  t.done();
});
