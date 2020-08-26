
import Database from './database';


document.addEventListener('deviceready', onDeviceReady, false);


var currentDevice;

var poll; 

function onDeviceReady() {
    const db = new Database();

    idbKeyval.get('connection').then(function(connection){
        console.log(connection)
        if (connection) {
            currentDevice = connection;
            ble.connect(currentDevice, connectCallback, disconnectCallback);
        } else {
            scan();
        }

    })
    var bleData = document.querySelector('.js-ble-data');
    var connectionInfo = document.querySelector('.js-ble-connection-info');
    var deviceListElem = document.querySelector('.js-device-list');
    var deviceContainerElem = document.querySelector('.js-device-container');
    var disconnectBtn = document.querySelector('.js-disconnect-btn');

    disconnectBtn.addEventListener('click', function() {
        if (currentDevice) {
            ble.disconnect(currentDevice,disconnectCallback);
            deviceContainerElem.classList.remove('device-container--hidden');
        }
    });

    function scan(){
        ble.scan([], 10, function addToList(device) {
            var li = document.createElement('li');
            li.classList.add('btn');
            li.setAttribute('data-mac-add', device.id)
            li.innerText = 'Name: ' + device.name + ' ID: ' + device.id;
            li.addEventListener('click', onClick);
            deviceListElem.appendChild(li);
        }, ()=>{console.log('no devices found')});
    }




    function onClick(e) {
        var active = document.querySelector('.btn--active');
        if (active) {
            active.classList.remove('btn--active');
            if (active.getAttribute('data-mac-add') == e.target.getAttribute('data-mac-add')) {
                ble.disconnect(currentDevice,disconnectCallback)
                return
            }
        }
        e.target.classList.add('btn--active');
        if (currentDevice) {
            ble.disconnect(currentDevice, disconnectCallback);
        }
        currentDevice = e.target.getAttribute('data-mac-add')
        ble.connect(currentDevice, connectCallback, disconnectCallback);
        connectionInfo.innerText = 'connecting...\n'
    }

    function connectCallback() {
        deviceContainerElem.classList.add('device-container--hidden')
        connectionInfo.innerText = `connected to ${currentDevice}`;
        idbKeyval.set('connection', currentDevice);
        poll = setInterval(function(){ 
            readBleData();
        }, 1000);
    }

    function readBleData() {
        ble.read(currentDevice, '0ee1', 'ec0e', function(data){
            var dv = new DataView(data, 0);
            var counterValue = dv.getUint32(0);
            bleData.innerText = `${counterValue}\n`;
        });
    }

    function disconnectCallback() {
        clearInterval(poll);
        deviceContainerElem.classList.remove('device-container--hidden')
        connectionInfo.innerText += `disconnecting from ${currentDevice}`;
        var active = document.querySelector('.btn--active');
        if (active) {
            active.classList.remove('btn--active');
        }
        setTimeout(function() {
            connectionInfo.innerText = '';
        }, 1000)
        currentDevice = undefined;
        bleData.innerText = '';

    }
}


