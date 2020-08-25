const bleno = require('bleno');

//bleno.startAdvertising('myRPi', ['1803']);
bleno.on('stateChange', function(state) {
    console.log('on stateChange: ' + state);
    if (state === 'poweredOn') {
      bleno.startAdvertising('myRPi', ['1803']);
    } else {
     // bleno.stopAdvertising();
    }
});
