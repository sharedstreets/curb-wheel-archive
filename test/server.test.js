const test = require("tap").test;
const path = require("path");
const fs = require("fs");
const util = require("util");
const request = require("request");
const rimraf = require("rimraf");
const app = require("../src/server");

request.post = util.promisify(request.post);

test("server", async (t) => {
  let server = await app();

  t.ok(server, "app server created");

  let pbf = fs.createReadStream(
    path.join(__dirname, "./fixtures/honolulu.osm.pbf")
  );

  let res = await request
    .post({
      url: "http://localhost:8081/pbf",
      formData: {
        pbf: pbf,
      },
    })
    .catch((err) => {
      if (err) throw err;
    });

  t.equal(res.statusCode, 200, "returned a valid response code");

  let image1 = fs.createReadStream(
    path.join(__dirname, "./fixtures/sign-1.jpg")
  );
  let image2 = fs.createReadStream(
    path.join(__dirname, "./fixtures/sign-2.jpg")
  );
  let image3 = fs.createReadStream(
    path.join(__dirname, "./fixtures/sign-3.jpg")
  );
  let image4 = fs.createReadStream(
    path.join(__dirname, "./fixtures/sign-4.jpg")
  );

  let upload1 = await request
    .post({
      url: "http://localhost:8081/photo",
      formData: {
        image: image1,
      },
    })
    .catch((err) => {
      if (err) throw err;
    });
  let upload2 = await request
    .post({
      url: "http://localhost:8081/photo",
      formData: {
        image: image2,
      },
    })
    .catch((err) => {
      if (err) throw err;
    });
  let upload3 = await request
    .post({
      url: "http://localhost:8081/photo",
      formData: {
        image: image3,
      },
    })
    .catch((err) => {
      if (err) throw err;
    });
  let upload4 = await request
    .post({
      url: "http://localhost:8081/photo",
      formData: {
        image: image4,
      },
    })
    .catch((err) => {
      if (err) throw err;
    });

  t.equal(upload1.statusCode, 200, "upload 1 returned valid status code 200");
  t.equal(upload2.statusCode, 200, "upload 2 returned valid status code 200");
  t.equal(upload3.statusCode, 200, "upload 3 returned valid status code 200");
  t.equal(upload4.statusCode, 200, "upload 4 returned valid status code 200");

  server.close();
  rimraf.sync(path.join(__dirname, "../static/images/survey"));

  t.ok("server closed gracefully");

  t.done();
});
