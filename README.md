# Curb Wheel



## Development

Rasbian image with BLE [here](https://curblr-www.s3.amazonaws.com/wheel/images/curbwheel_image_bleno_r1.img.gz)

### Requirements

* Node.js
* npm
* Cordova ```npm install -g cordova```
* Platform specifics

    * Android

        * Android Studio _or_ Android SDK, installing Android Studio will include Android SDK and is likely a more straightforward process

    * iOS

        * OS X operating system
        * XCode 
            * ```xcode-select --install ```
        * ```npm install -g ios-deploy```


### Installation


1. Clone this repo ```git clone https://github.com/sharedstreets/curb-wheel```

    a. Checkout ```cordova``` branch ```git checkout cordova```

2. check that you have the requirements for each platform ```cordova requirements```


### Building the app

#### Android

* ```cordova build android```

If you have a device connected to your computer via USB Cordova _should_ auto-detect it a deploy to the device, otherwise it will default to the Android emulator


#### iOS

__//TODO__

