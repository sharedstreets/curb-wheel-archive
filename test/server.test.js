const test = require("tap").test;
const path = require("path");
const fs = require("fs");
const util = require("util");
const request = require("request");
const rimraf = require("rimraf");
const app = require("../src/server");

request.post = util.promisify(request.post);
request.get = util.promisify(request.get);

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



test("wheel", async (t) => {

  let server = await app();

  t.ok(server, "app server created")

  // testing counter -- this will fail if simulator or live wheel python code is running and overwrites test values

  // zero counter for testing
  let setWheel1 = await request
    .post({
      url: "http://localhost:8081/wheel",
      formData: {
        counter: 0,
      },
    })
    .catch((err) => {
      if (err) throw err;
    });
  t.equal(setWheel1.statusCode, 200, "returned a valid response code");


  let getWheel1 = await request
    .get({
      url: "http://localhost:8081/wheel"
    })
    .catch((err) => {
      if (err) throw err;
    });
  t.equal(JSON.parse(getWheel1.body).counter, 0, "wheel returned correct value");

  let getCounter1 = await request
    .get("http://localhost:8081/counter")
    .catch((err) => {
      if (err) throw err;
    });
  t.equal(getCounter1.statusCode, 200, "returned a valid response code");
  t.equal(JSON.parse(getCounter1.body).counter, 0, "returned the correct counter value");

  let getCounter1a = await request
    .get("http://localhost:8081/counter/full-count")
    .catch((err) => {
      if (err) throw err;
    });
  t.equal(getCounter1a.statusCode, 200, "returned a valid response code");
  t.equal(JSON.parse(getCounter1a.body).counter, 0, "returned the correct counter value");

  let setWheel2 = await request
    .post({
      url: "http://localhost:8081/wheel",
      formData: {
        counter: 10
      },
    })
    .catch((err) => {
      if (err) throw err;
    });

  let getWheel2 = await request
    .get({
      url: "http://localhost:8081/wheel"
    })
    .catch((err) => {
      if (err) throw err;
    });
  t.equal(JSON.parse(getWheel2.body).counter, 10, "wheel returned correct value");

  let getCounter2 = await request
    .get("http://localhost:8081/counter")
    .catch((err) => {
      if (err) throw err;
    });

  t.equal(JSON.parse(getCounter2.body).counter, 10, "returned the correct counter value");


  let puaseCounter3 = await request
    .post({
      url: "http://localhost:8081/counter/pause",
    })
    .catch((err) => {
      if (err) throw err;
    });
  
  let setWheel3 = await request
    .post({
      url: "http://localhost:8081/wheel",
      formData: {
        counter: 20
      },
    })
    .catch((err) => {
      if (err) throw err;
    });

  let getCounter3 = await request
    .get("http://localhost:8081/counter")
    .catch((err) => {
      if (err) throw err;
    });

  t.equal(JSON.parse(getCounter3.body).counter, 10, "returned the correct counter value");

  let resumeCounter4 = await request
    .post({
      url: "http://localhost:8081/counter/resume",
    })
    .catch((err) => {
      if (err) throw err;
    });

  let setWheel4 = await request
    .post({
      url: "http://localhost:8081/wheel",
      formData: {
        counter: 30
      },
    })
    .catch((err) => {
      if (err) throw err;
    });


  let getCounter4 = await request
    .get("http://localhost:8081/counter")
    .catch((err) => {
      if (err) throw err;
    });

  t.equal(JSON.parse(getCounter4.body).counter, 20, "returned the correct counter value");

  let getCounter4a = await request
    .get("http://localhost:8081/counter/full-count")
    .catch((err) => {
      if (err) throw err;
    });
  t.equal(getCounter4a.statusCode, 200, "returned a valid response code");
  t.equal(JSON.parse(getCounter4a.body).counter, 30, "returned the correct counter value");

  let resetCounter5 = await request
    .post({
      url: "http://localhost:8081/counter/reset",
    })
    .catch((err) => {
      if (err) throw err;
    });


  let getCounter5 = await request
    .get("http://localhost:8081/counter")
    .catch((err) => {
      if (err) throw err;
    });

  t.equal(JSON.parse(getCounter5.body).counter, 0, "returned the correct counter value");

  let setWheel5 = await request
    .post({
      url: "http://localhost:8081/wheel",
      formData: {
        counter: 40
      },
    })
    .catch((err) => {
      if (err) throw err;
    });

  let getCounter6 = await request
    .get("http://localhost:8081/counter")
    .catch((err) => {
      if (err) throw err;
    });

  t.equal(JSON.parse(getCounter6.body).counter, 10, "returned the correct counter value");

  let getCounter6a = await request
    .get("http://localhost:8081/counter/full-count")
    .catch((err) => {
      if (err) throw err;
    });

  t.equal(JSON.parse(getCounter6a.body).counter, 40, "returned the correct counter value");

  server.close();
  rimraf.sync(path.join(__dirname, "../static/images/survey"));



  t.ok("server closed gracefully");

  t.done();
});
