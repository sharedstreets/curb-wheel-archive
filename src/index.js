
import Database from './database';
import app from './app';
import CurbWheelMap from './map';
import SharedStreets from './sharedstreets';
import bboxPoly from '@turf/bbox-polygon';

import mitt from 'mitt';
import Photo from './photo';

document.addEventListener('deviceready', onDeviceReady, false);

const bleIndicator = document.querySelector(".ble-indicator");

const emitter = mitt();

var currentDevice = null;
var pollCounter = null;
var counterValue = null;

function bindClick(elementId, f) {
  // First we check if you support touch, otherwise it's click:
  let touchEvent = 'ontouchstart' in window ? 'touchstart' : 'click';
  // Then we bind via thát event. This way we only bind one event, instead of the two as below
  document.getElementById(elementId).addEventListener(touchEvent, f);
}

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

        if (navigator.geolocation){
            navigator.geolocation.getCurrentPosition(map.setMapLocation);
        }

        // scan ble
        scan();
    });

    emitter.on("fetchStreets", async (data)=> {
        const poly = bboxPoly(data.toArray().flat());
        const streets = await shst.getPolygon(poly);
        console.log(streets)
        emitter.emit('setStreets', streets);
    });

    emitter.on("selectDirection", () => {
        app.ui.mode.set("selectDirection");

        // set up UI event handlers
        bindClick("switchSide", app.ui.map.switch.side);
        bindClick("switchDirection", app.ui.map.switch.direction);
        bindClick("startSurvey", app.survey.init);
        bindClick("backButton", app.ui.back);
        bindClick("resetButton", app.survey.init);
        bindClick("validateButton", app.survey.validate);
        bindClick("addFeature", app.ui.addFeature);
    });

    function scan() {
        ble.scan([], 10, function addToList(device) {

            console.log('found ' + device.name + ': ' +  device.id);
            // todo select wheel id

            if (device.name == "curbwheel" || device.name == "counter" || device.name == "raspberrypi") {
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
        bleIndicator.src = 'img/bluetooth.svg'
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
        bleIndicator.src = 'img/bluetooth-grey.svg'
        clearInterval(pollCounter);
    }

}
