const test = require("tap").test;
const path = require("path");
const app = require("../src/index");

test("server", async (t) => {
  let server = await app();

  t.ok(server, "app server created");
  server.close();
  t.pass("server closed gracefully");

  t.done();
});
