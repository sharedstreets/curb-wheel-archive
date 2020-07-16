# SharedStreets Curb Wheel

The curb wheel is an open source data collection tool that can be used to map a city's curb assets and regulations and create a standardized data ([CurbLR](https://www.curblr.org/)) feed. It combines the precision of a measuring wheel with the efficiency of a smartphone app.

The curb wheel is built from a standard digital measuring wheel used by surveyors, which is hardwired to a Raspberry Pi computing device. This turns the wheel into an access point that a user can connect to through their smartphone or computer in order to access a curb surveying app. After completing street surveying with the wheel and the app, users can process the data in a digitizer web app, producing a CurbLR feed.

See the [parts list](/PARTS.md) and [set up page](/SETUP.md) for instructions on how to build your own curb wheel.

![](/images/wheel_app_digitizer.png)
*Initial prototype of the wheel, app, and digitizer*

## How it works

To map a street, a user opens the surveying app on his/her phone, where he/she will see a map of the surrounding streets. The user taps to select a block face to map and begins to roll the wheel down the sidewalk -- snapping photos along the way to capture curb cuts, parking signage, fire hydrants, and physical assets that communicate curb regulations.

Behind the scenes, the Raspberry Pi on the wheel keeps track of the block faces that were surveyed and processes all incoming measurement data through an API; every asset that was marked in the app is geolocated and [linear referenced](https://medium.com/sharedstreets/how-the-sharedstreets-referencing-system-works-2097b0d61b52) to determine its position along the street. From this information, the curb wheel creates a linear-referenced street segment ("regulatory geometry") for each regulation that was mapped, which is stored alongside the accompanying photographs. The field data creates the geometries and captures a rough categorization for the curb regulation (e.g. "parking zone").

Afterwards, back at the office, the user downloads the field data from the curb wheel and completes the curb inventory data by adding essential details to each regulation (e.g. the zone is in effect from 9am-5pm, Monday to Friday). A lightweight data entry interface enables the user to iterate through each curb segment mapped, view the associated photographs as a reference, and use this information to populate an attribute form for the curb segment. When this is finished, the user exports the curb inventory as a standardized [CurbLR](https://www.curblr.org/) feed. This feed can be viewed in GIS systems, shared directly with consumers, and/or added into an [interactive map](https://www.curblr.org/).

The curb wheel provides an efficient and accurate pathway for city governments or others looking to collect curb inventory data and share it in a standardized (CurbLR) format.

------

## Acknowledgements

Thanks to Kuan Butts for suggesting the wheel + API idea. We were also inspired by [TreeKit](http://treekit.org/)'s approach to mapping street trees in NYC.
