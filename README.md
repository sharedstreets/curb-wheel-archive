# Status update, 10 Sept 2020
We've uncovered a bug in the testing image that's preventing data downloads from working. Because of this and other issues, we decided to overhaul the software to turn it into an iOS and Android-native app. This will make initial set-up and usage much easier, and let us solve the networking issues. We hope to have a test version of the app out in the next couple of weeks - stay tuned for more updates!

# SharedStreets CurbWheel

CurbWheel is an open source data collection tool that can be used to map a city's curb assets and regulations and create a standardized data ([CurbLR](https://www.curblr.org/)) feed. It combines the precision of a measuring wheel with the efficiency of a smartphone app.

CurbWheel is built from a standard digital measuring wheel used by surveyors, which is hardwired to a Raspberry Pi computing device. This lets the wheel connect to a smartphone or computer over Bluetooth in order transmit measurements to a curb surveying app. After completing street surveying with the wheel and the app, users can process the data in a digitizer web app, producing a CurbLR feed.

![](/images/wheel_app_digitizer.png)
*Initial prototype of the wheel, app, and digitizer*

## How it works

To map a street, a user opens the surveying app on his/her phone, where he/she will see a map of the surrounding streets. The user taps to select a block face to map and begins to roll the wheel down the sidewalk -- snapping photos along the way to capture curb cuts, parking signage, fire hydrants, and physical assets that communicate curb regulations.

The CurbWheel app keeps track of the block faces that were surveyed and processes all incoming measurement data; every asset that was marked in the app is geolocated and [linear referenced](https://medium.com/sharedstreets/how-the-sharedstreets-referencing-system-works-2097b0d61b52) to determine its position along the street. From this information, the CurbWheel creates a linear-referenced street segment ("regulatory geometry") for each regulation that was mapped, which is stored alongside the accompanying photographs. The field data creates the geometries and captures a rough categorization for the curb regulation (e.g. "parking zone").

Afterwards, back at the office, the user uploads the field data from the curb wheel accesses it through the "digitizer", a lightweight data entry interface. This lets the user completes the curb inventory data by adding essential details to each regulation (e.g. the zone is in effect from 9am-5pm, Monday to Friday).The digitizer enables the user to iterate through each curb segment mapped, view the associated photographs as a reference, and use this information to populate an attribute form for the curb segment. When this is finished, the user exports the curb inventory as a standardized [CurbLR](https://www.curblr.org/) feed. This feed can be viewed in GIS systems, shared directly with consumers, and/or added into an [interactive map](https://www.curblr.org/).

The curb wheel provides an efficient and accurate pathway for city governments or others looking to collect curb inventory data and share it in a standardized (CurbLR) format.

## Hardware and software set-up

See the [parts list](/PARTS.md) and [set up page](/SETUP.md) for instructions on how to build your own CurbWheel and load it with the necessary software. Reach out to [SharedStreets](mailto:info@sharedstreets.io) if you work for a government agency and you may need some help with this.

Once the wheel is ready, you will download an Android or iOS app onto your phone and then go forth and survey your streets.

## Instructions for mapping curbs

Instructions for how to use the app and the digitizer are [here](HOWTOMAP.md).

### Current software versions

- Raspberry Pi software is [here](https://curblr-www.s3.amazonaws.com/wheel/images/curbwheel_image_bleno_r1.img.gz). The code used to create this image lives [here](https://github.com/sharedstreets/curb-wheel-ble).
- Android and iOS app source code lives [here](https://github.com/sharedstreets/curb-wheel/tree/cordova-backend-switch).
- Digitizer source code lives [here](https://github.com/sharedstreets/curbwheel-digitizer).


------

## Acknowledgements

Thanks to Kuan Butts for suggesting the wheel + API idea. We were also inspired by [TreeKit](http://treekit.org/)'s approach to mapping street trees in NYC.
