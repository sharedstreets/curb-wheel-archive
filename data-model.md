# Data model and hierarchy

## Input data hierarchy

- Area of interest
  - Deployment
    - Background map tiles
    - OpenStreetMap data
      - Graph
        - Streets / Geometries
          - Directional edges / Linear references
    - Configuration properties
      - Feature properties
        - Categories
        - Geometry types
      - Intersection offset length

### Area of interest
The area of interest is the area that a person wants to survey with one or more CurbWheels.

### Deployment
When someone prepares to survey an area of interest, they will create a "deployment", which includes the files that need to be loaded onto each CurbWheel. The deployment files include:

- OpenStreetMap data for the area, in [PBF format](https://wiki.openstreetmap.org/wiki/PBF_Format). The PBF must contain street data (i.e. ways tagged in OpenStreetMap as `highway=*`). It may also contain other features from OpenStreetMap (e.g. building outlines); these are unnecessary and will be ignored, but they will not cause errors.
- Background map tiles, used for display purposes. These are in [MBTiles](https://docs.mapbox.com/help/glossary/mbtiles/) format.

These input data can be created through the [HOT Export Tool](https://export.hotosm.org/en/v3/) or other means.

Once the deployment is loaded, software on the Raspberry Pi will process the OpenStreetMap street data to create a graph network of streets which have associated [SharedStreets linear referencing](https://sharedstreets.io/how-the-sharedstreets-referencing-system-works/) properties (such as a reference ID and length).

When setting up a deployment, users will also be prompted to provide configuration properties, discussed below.

### Graph
The graph is a network of all the streets in the area of interest. Each street in the graph has associated [SharedStreets linear referencing](https://sharedstreets.io/how-the-sharedstreets-referencing-system-works/) properties (such as a reference ID and length). The graph is created by the software on the Raspberry Pi, using the OpenStreetMap data included in the deployment.

### Street / Geometry
A street is a segment of road, from one intersection to the next, which includes travel in both directions (where applicable). In the SharedStreets linear referencing system, this is referred to as a "geometry".

Each geometry has a corresponding, unique SharedStreets geometry ID which is determined when the graph is created.

### Directional edges / Linear reference
Each street geometry is made up of one or more linear references, which account for direction of travel. A one-way street has one reference. A two-way street has two references.

Each reference has:
- A corresponding, unique SharedStreets reference ID which is determined when the graph is created
- An expected length. The length of each reference is determined when the graph is created, based on the reference's geographic coordinates.

### Configuration properties
There are two other pieces of information needed to set up the deployment for the area of interest. These include:

- Feature properties. Buttons will appear in the app to help categorize the type of features that are being surveyed. These are the "feature categories". For example, a user may use categories like "parking zone", "curb paint", "fire hydrant", or "tree bed". Each feature category must have an associated geometry type, either point or linestring. For example, a parking zone has a beginning point and an end point, and it is therefore a linestring. A fire hydrant is a single point.
- The intersection offset length. Each street reference has a length, measured from the center of the start intersection to the center of the end intersection. When users roll the CurbWheel down the street, it will count upwards from zero, but they are not beginning from the center of the start intersection - there is an offset between the intersection and the beginning of the curb. We estimate this offset in order to calculate an "expected length" of the survey. When setting up a deployment, users are asked for an average number of lanes. This number is used to calculate an offset that will be applied (symmetrically) to the beginning and end of each street reference in order to determine the expected length. For example, a street reference may have a length of 100 metres. The user has given an offset of 4 travel lanes in each intersection. We estimate that each lane is roughly 3.048 metres (10 feet) wide. This means that we expect the wheel to start rolling when the user is 12.174 metres into the street reference, and to finish rolling when the user is 12.174 metres short of the end of the street reference. We factor in the offset to adjust the expected length to be 75.616 metres instead of 100 metres. Expected lengths are used to help keep track of relative progress when rolling along the street; they are estimates and need not be precise or accurate for every street reference.

## Survey data hierarchy

- Session
  - Surveys
    - Features (also have called these zones, or spans)
      - Images

### Session
A session begins when a CurbWheel user opens the app and begins to survey streets. The session ends when the app is closed. The session is a collection of surveys, each representing one "curb walk" down the street, in a specific direction.

Each session has:
- A session start time, when the first street reference was checked out to create a surveys
- A session end time, when the last street reference was checked in (the last survey was marked as complete)
- A CurbWheel ID, which is assigned when the CurbWheel is first built and set up
- A unique session ID, assigned when the app is launched (?)
- A collection of surveys (and associated info) that were captured during the session

### Survey
A survey is made up of a list of features that were captured during one "curb walk" down the street, in a specific direction. In the app, when a user taps on a street on the map and selects which direction they are going, this begins the survey. When a user marks the street as complete and returns to the map view on the app, this ends the survey.

Each survey has:
- A survey start time
- A survey end time
- A unique survey ID
- The associated session ID
- A linear reference ID
- An expected length (from the linear reference properties)
- An observed length (from the distance the wheel rolled)
- A collection of features that were captured during the survey

### Feature
A feature is a collection of information about an entity on the street, such as a "No parking" zone, a fire hydrant, a bus stop, or a driveway. A feature may be of type point or linestring. The feature categories and their associated geometry types are provided by the user when the deployment is being set up. Default feature categories and types may also be used.

Tapping the button to add a new feature to the survey triggers the creation of a new feature object. Tapping the button to complete the feature or the survey will closes the feature object.

Each feature has:
- A feature category (type / label ?)
- A unique feature ID
- The associated survey ID
- A linear reference ID
- *For linestring features*: A wheel start location and a wheel end location (in metres) where the feature was created and then closed
- *For point features*: A wheel location (in metres) where the feature was created
- An adjusted start location and adjusted end location (for linestring features) or an adjusted location (for point features). To account for intersection offsets, features are given adjusted locations. These are calculated by taking the observed length of the street and centering it at the midpoint of the expected length. All features captured in a survey are given an adjusted position based on this transformation. This estimates where the features are actually located along the street.
- Timestamp(s) for when the feature object was created and closed (if it's a linestring feature)
- A collection of images that were captured for the feature

### Image
When features are active, a user may add one of more photographs of the feature. Each image has:
- An image URL to link to where the image is stored locally
- A unique image ID
- The associated feature ID
- A wheel location (in meters) where the image was captured
- An adjusted location (in metres) where the image was captured (see Feature, above, for more information)
- A timestamp when the image was captured

## Data storage and export

Data is stored on the Raspberry Pi and may be exported from the CurbWheel in three formats:
- GeoJSON. This is a plain, flat data format which can be exported into GIS systems or manipulated in other ways. All properties are included. The coordinates for each point or linestring feature are taken from its adjusted location, in order to account for intersection offsets; this is the more accurate positioning along the street. Since all data are retained, users could refine or remove this adjustment if desired.
- CurbLR. This is a JSON file created according to the [CurbLR curb regulation data specification](https://github.com/sharedstreets/curblr), though most fields will be empty. The JSON file will contain only linestring GeoJSON features. Feature categories are included as CurbLR `activity` or `marker` properties.
- Asset data. This is a GeoJSON file with point and linestring features, created according to the [Open Curbs Asset Data Specification](https://www.coord.com/hubfs/Coord_November2019%20Files/PDF/8b1277_8e32c9463b3743b7833b9c1e82f0b558.pdf?hsLang=en). Feature categories are included as `asset type` properties.

We recommend processing the data using the Curb Digitizer, but have provided these data formats to allow multiple options for users who may want to pursue other paths.

## Data processing and final output

The Curb Digitizer can be used to process the features and associated images into both asset and regulation data, which can be exported into the [Open Curbs Asset Data Specification](https://www.coord.com/hubfs/Coord_November2019%20Files/PDF/8b1277_8e32c9463b3743b7833b9c1e82f0b558.pdf?hsLang=en) and [CurbLR](https://github.com/sharedstreets/curblr) regulation data specification formats.
