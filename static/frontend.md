# frontend.md

An overview of the frontend architecture.

## Modes

Broadly, the app breaks down the surveying task into a series of UI `modes`, each with its own interface:

- `selectStreet`: presents user with a map to choose a street to survey
- `selectDirection`: user chooses side of street to survey. reuses the map from `selectStreet`
- `rolling`: the main interface for measuring a curb, with options to add/remove curb regulations to take photos for them
- `addZone`: a menu for adding a new curb regulation ("zone" in the UI)

Visually, these slide left to right in the UI. The back arrow on the upper left generally takes the user back a mode.

## The map

`/static/map.js` holds much of the logic for instantiating the map, and wiring interactivity for the first two modes. The map is populated by two tilesets stored locally on the Pi: one for the basemap, and a second containing street geometry with associated metadata. The app pulls a street's attributes (name, length, forward and back refs) from this second tileset.

## Phone-wheel IO

While in the rolling mode, the phone interfaces with the wheel via an access point emitted by the Pi. There are three main kinds of messaging, as covered in `app.io`

- Roll progress: `app.io.wheelTick()` polls the Pi for the current distance the wheel has rolled. On app load, `app.init()` sets up a loop to fire this at regular intervals, to get the latest roll progress.
- Upload image: when the surveyor takes a picture, `app.io.uploadImage()` POSTs it to the server
- Upload survey: when a survey is complete, `app.io.uploadSurvey()` POSTs it to the server

## Rolling/surveying

In the `rolling` mode, the app keeps track of the current progress down the curb, and accepts new curb zones from the user. An unlimited number of curb zones can run simultaneously as the wheel progresses down the street, each with three available actions:

- Delete: remove the zone
- Take photo: opens the device camera app to take a picture of something relevant to the curb zone. 
- Complete: at the end of each zone, record the current wheel progress as its end. This zone won't grow any longer as the wheel keeps rolling.

All zones of the current survey are stored in `app.state.zones`, which will also be the payload when it comes time to upload the survey.

## DOM manipulation

To maximize customizability and mobile performance, the app primarily uses D3.js in a very hands-on fashion to build and manipulate interface elements. At its most complex, the rolling mode invokes `app.ui.updateZones()` , which ingests `app.state.zones` to determine which zones have been added, modified, and deleted, and [performs those actions]([https://alignedleft.com/tutorials/d3/binding-data](https://alignedleft.com/tutorials/d3/binding-data)) on their corresponding DOM elements. New elements are built via `app.ui.buildZoneEntry()`.