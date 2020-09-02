import SharedStreets from './src/sharedstreets'

const test = require('ava');

var testPoly1 = {
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {},
      "geometry": {
        "type": "Polygon",
        "coordinates": [
          [
            [
              -82.33926773071289,
              35.82157139161192
            ],
            [
              -82.32360363006592,
              35.82157139161192
            ],
            [
              -82.32360363006592,
              35.83120974965769
            ],
            [
              -82.33926773071289,
              35.83120974965769
            ],
            [
              -82.33926773071289,
              35.82157139161192
            ]
          ]
        ]
      }
    }
  ]
};

test('foo', async (t) => {
  var shst = new SharedStreets();
  var data = await shst.getPolygon(testPoly1);
  console.log(data);
	t.pass();
});

test('bar', async t => {
	const bar = Promise.resolve('bar');
	t.is(await bar, 'bar');
});
