# Curb Wheel


This repository holds the source for the CurbWheel mobile application. To run application and collect data you will also need an Adirpro measuring wheel set up with a raspberry pi zero w with the curbwheel rasbian image installed. Available here:

Rasbian image with BLE [here](https://curblr-www.s3.amazonaws.com/wheel/images/curbwheel_image_bleno_r1.img.gz)

The source for the rasbian image is available at [https://github.com/sharedstreets/curb-wheel-ble](https://github.com/sharedstreets/curb-wheel-ble)

## Development

Prebuilt APKs and iOS releases will be distributed via the Google Play Store and Test Flight but if you wish to build the app locally you can follow the guide below.

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


2. Add each platform you wish to build. 
    * Android: ```sh cordova platform add android ```
    * iOS: ```sh cordova platform add ios ```

    a. check that you have the requirements for each platform ```cordova requirements```


### Building the app

#### Android

_Note: If you have a device connected to your computer via USB Cordova _should_ auto-detect it a deploy to the device, otherwise it will default to the Android emulator_

* Local Development

    * ```npm run local-android```

    If you have a device connected to your computer via USB Cordova _should_ auto-detect it a deploy to the device, otherwise it will default to the Android emulator

* Production Build

    * ```npm run build-android```

    * The APK will be available in the project directory under ``` ./platforms/android/build/outputs/apk/debug/app-debug.apk ```
    
    * If you already have a build and want to create a new one with updated code, run ```sh cordova clean ``` and then ``` npm run build-android ```. The clean command clears out the previous version to ensure that the updates are included.


#### iOS

__//TODO__

