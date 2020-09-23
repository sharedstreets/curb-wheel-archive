
import Database from './database';
import app from './app';
import CurbWheelMap from './map';
import SharedStreets from './sharedstreets';
import bboxPoly from '@turf/bbox-polygon';

import mitt from 'mitt';
import Photo from './photo';

document.addEventListener('deviceready', onDeviceReady, false);


const emitter = mitt();

var currentDevice = null;
var pollCounter = null;
var counterValue = null;

function onDeviceReady() {
    const photo = new Photo();
    const shst = new SharedStreets();
    const map = new CurbWheelMap(app.state, emitter);

    const db = new Database();

    // setup counter value query
    app.io.getCounterValue = () => {
      return counterValue;
    };

    app.io.saveSurvey = async (surveyId, data) => {
        // await?
        db.insertSurvey(surveyId, data);
    };

    emitter.on("mapload", () => {
        app.ui.map = map;
        app.devMode.init();

        // scan ble
        scan();
    });

    emitter.on("fetchStreets", async (data)=> {
        const poly = bboxPoly(data.toArray().flat());
        const streets = await shst.getPolygon(poly);
        emitter.emit('setStreets', streets);
    });

    emitter.on("selectDirection", () => {
        app.ui.mode.set("selectDirection");

        // set up UI event handlers
        document.getElementById("switchSide").onclick = app.ui.map.switch.side;
        document.getElementById("switchDirection").onclick = app.ui.map.switch.direction;
        document.getElementById("startSurvey").onclick = app.survey.init;
    });

    function scan() {
        ble.scan([], 10, function addToList(device) {

            console.log('found ' + device.name + ': ' +  device.id);
            // todo select wheel id

            if (device.name == "counter") {
                connect(device.id);
            }
              

        }, ()=>{console.log('no devices found')});
    }


    function connect(macAddress) {
        currentDevice = macAddress;
        console.log('connecting to ' +  currentDevice);
        ble.connect(currentDevice, connectCallback, disconnectCallback);
    }

    function connectCallback() {
        pollCounter = setInterval(function(){
            readBleData();
        }, 1000);
    }

    function readBleData() {
        ble.read(currentDevice, '0ee1', 'ec0e', function(data){
            var dv = new DataView(data, 0);
            counterValue = dv.getUint32(0);
            console.log('counter value: ' + counterValue)
        });
    }

    function disconnectCallback() {
        clearInterval(pollCounter);
    }

}
