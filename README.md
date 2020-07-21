# SharedStreets Curb Wheel

The curb wheel is an open source data collection tool that can be used to map a city's curb assets and regulations and create a standardized data ([CurbLR](https://www.curblr.org/)) feed. It combines the precision of a measuring wheel with the efficiency of a smartphone app.

The curb wheel is built from a standard digital measuring wheel used by surveyors, which is hardwired to a Raspberry Pi computing device. This turns the wheel into an access point that a user can connect to through their smartphone or computer in order to access a curb surveying app. After completing street surveying with the wheel and the app, users can process the data in a digitizer web app, producing a CurbLR feed.

![](/images/wheel_app_digitizer.png)
*Initial prototype of the wheel, app, and digitizer*

## How it works

To map a street, a user opens the surveying app on his/her phone, where he/she will see a map of the surrounding streets. The user taps to select a block face to map and begins to roll the wheel down the sidewalk -- snapping photos along the way to capture curb cuts, parking signage, fire hydrants, and physical assets that communicate curb regulations.

Behind the scenes, the Raspberry Pi on the wheel keeps track of the block faces that were surveyed and processes all incoming measurement data through an API; every asset that was marked in the app is geolocated and [linear referenced](https://medium.com/sharedstreets/how-the-sharedstreets-referencing-system-works-2097b0d61b52) to determine its position along the street. From this information, the curb wheel creates a linear-referenced street segment ("regulatory geometry") for each regulation that was mapped, which is stored alongside the accompanying photographs. The field data creates the geometries and captures a rough categorization for the curb regulation (e.g. "parking zone").

Afterwards, back at the office, the user downloads the field data from the curb wheel and completes the curb inventory data by adding essential details to each regulation (e.g. the zone is in effect from 9am-5pm, Monday to Friday). A lightweight data entry interface enables the user to iterate through each curb segment mapped, view the associated photographs as a reference, and use this information to populate an attribute form for the curb segment. When this is finished, the user exports the curb inventory as a standardized [CurbLR](https://www.curblr.org/) feed. This feed can be viewed in GIS systems, shared directly with consumers, and/or added into an [interactive map](https://www.curblr.org/).

The curb wheel provides an efficient and accurate pathway for city governments or others looking to collect curb inventory data and share it in a standardized (CurbLR) format.

## Hardware and software set-up

See the [parts list](/PARTS.md) and [set up page](/SETUP.md) for instructions on how to build your own curb wheel from hardware. Reach out to [SharedStreets](mailto:info@sharedstreets.io) if you work for a government agency and you may need some help with this.

After building the wheel, the next steps are to load the CurbWheel software onto the wheel, add your own local basemap data, and then go forth and survey your streets. The most up-to-date instructions for this are found in this [Google Slide deck](https://docs.google.com/presentation/d/17yf7CXPp_n2dldiCTWfH6H_lpq4mqzZ6kTNyTk-0-zw/edit#slide=id.g730b63e36f_0_0).

### Current software version

The latest release of the software is [version 8](https://curblr-www.s3.amazonaws.com/wheel/images/curbwheel_image_r8.img.gz). 

The Github `master` branch contains newer code with additional features, but they are not yet ready for prime time.

### Simulator

To make it easier to test the software during development, the code contains a simulator that can be run locally; it simulates the phone app and the digitizer and uses a slowly ticking counter to replicate the wheel's progress along the street. 

To use:

1. `sh setup-tileserver-simulator.sh`
2. `npm run simulator`


While running the simulator, the links are:
- Admin interface: http://127.0.0.1:8081/admin
- App interface: http://127.0.0.1:8081/
- Digitizer interface: http://127.0.0.1:8081/digitizer

### Creating a software image

It's possible to update the code on a CurbWheel via Github. But since many CurbWheel users aren't familiar with Terminal, we've been creating `.img` files that can be flashed onto the SD card using Etcher or similar software. 

Steps for creating a software image:
(*Note: This workflow assumes you have already flashed your Pi with a previous software image (e.g. r8). It's possible to also start from scratch with a new Pi, install Raspian, and then proceed with these instructions... but flashing with an image is faster, doesn't require peripherals, and takes care of network settings for you. We highly recommend setting up the Pi by flashing it with an image.*)

1. Pull new copy of git repo on your laptop / edit files locally so that you've got the code that you want to push to the Pi and make an image of.

2. Update github directory on wheel by running upgrade script on laptop. To do this, connect to wheel using CurbWheel-AP wifi network. Make sure you're in the Github curb wheel directory. Then, copy new directory from laptop oer to Pi via ssh (first time running will prompt for pi password) - do that through the following command, which handles the ssh connection and moves the code: `sh upgrade_wheel.sh`

3. The Pi now contains the software that you want to image for distribution. Flash image using `dd`. To do this, insert the SD card on mac and find drive (`diskutil list`). Next, `sudo dd if=/dev/disk2 | gzip > ~/Desktop/curbwheel_image_r8.img.gz` (or whatever the image should be named)

4. Copy image file to S3 bucket and set permissions to be publically accessible (for distribution). Update docs with new link.

------

## Acknowledgements

Thanks to Kuan Butts for suggesting the wheel + API idea. We were also inspired by [TreeKit](http://treekit.org/)'s approach to mapping street trees in NYC.
