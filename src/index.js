const express = require("express");
const extract = require("./extract");

const app = express();
const port = 80;

// application state
let state = {};

async function main() {
  app.get("/", (req, res) => res.send("<h1>curb wheel</h1>"));
  app.post("/extract", async (req, res) => {
    // state.graph = await extract()
    res.send("ok");
  });

  app.listen(port, () => console.log("curbwheel server started"));
}

main();
