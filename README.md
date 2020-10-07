# Curb Wheel



## Development

Rasbian image with BLE [here](https://curblr-www.s3.amazonaws.com/wheel/images/curbwheel_image_bleno_r1.img.gz)

### Requirements

* Node.js
* npm
* Cordova ```npm install -g cordova```
* Platform specifics

    * Android

        * ```cordova add platform android```
        * Android Studio _or_ Android SDK, installing Android Studio will include Android SDK and is likely a more straightforward process
        * be sure to install Android SDK command line tools through android studio and accept the license agreement:
            * ![image](https://user-images.githubusercontent.com/8487728/95365792-d6adec00-088f-11eb-9987-2efc85be73df.png)


    * iOS

        * ```cordova add platform ios```
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

_Note: If you have a device connected to your computer via USB Cordova _should_ auto-detect it a deploy to the device, otherwise it will default to the Android emulator_

* Local Development - i.e. run on emulator or USB connected device

    * ```npm run local-android```

    If you have a device connected to your computer via USB Cordova _should_ auto-detect it a deploy to the device, otherwise it will default to the Android emulator

*  Build APK

    * ```npm run build-android```

    * The APK will be available in the project directory under ```./platforms/android/build/outputs/apk/debug/app-debug.apk```


#### iOS

__//TODO__

