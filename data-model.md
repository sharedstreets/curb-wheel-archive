# Data model and hierarchy

## Input data hierarchy

- Area of interest
  - Deployment
    - Background map tiles
    - OpenStreetMap data
      - Graph
        - Geometries (a street, regardless of direction)
          - Linear references (a street, in one direction)
    - Configuration properties
      - Feature type
        - Geometry type
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

### Street geometries
A street is a segment of road, from one intersection to the next, which includes travel in both directions (where applicable). In the SharedStreets linear referencing system, this is referred to as a "geometry".

Each geometry has a corresponding, unique SharedStreets geometry ID which is determined when the graph is created.

### Street linear references
Each street geometry is made up of one or more linear references, which account for direction of travel. A one-way street has one reference. A two-way street has two references.

Each reference has:
- A corresponding, unique SharedStreets reference ID which is determined when the graph is created
- An expected length. The length of each reference is determined when the graph is created, based on the reference's geographic coordinates.

Because each street reference has directionality, we are able to refer to objects as being on the left or right side of the street, relative to direction of travel.

### Configuration properties
There are two other pieces of information needed to set up the deployment for the area of interest. These include:

- Feature types. Buttons will appear in the app to help categorize the type of features that are being surveyed. These are the "feature types". For example, a user may use categories like "parking zone", "curb paint", "fire hydrant", or "tree bed". Each feature type must have an associated geometry type, either points (named "point-along" since they are points along a linear reference) or lines (named "span-along" since they are spans along a linear reference). For example, a parking zone has a beginning point and an end point, and it is therefore of type "span-along". A fire hydrant is of type "point-along".
- The intersection offset length. Each street reference has a length, measured from the center of the start intersection to the center of the end intersection. When users roll the CurbWheel down the street, it will count upwards from zero, but they are not beginning from the center of the start intersection - there is an offset between the intersection and the beginning of the curb. We estimate this offset in order to calculate an "expected length" of the survey. When setting up a deployment, users are asked for an average number of lanes. This number is used to calculate an offset that will be applied (symmetrically) to the beginning and end of each street reference in order to determine the expected length. For example, a street reference may have a length of 100 metres. The user has given an offset of 4 travel lanes in each intersection. We estimate that each lane is roughly 3.048 metres (10 feet) wide. This means that we expect the wheel to start rolling when the user is 12.174 metres into the street reference, and to finish rolling when the user is 12.174 metres short of the end of the street reference. We factor in the offset to adjust the expected length to be 75.616 metres instead of 100 metres. Expected lengths are used to help keep track of relative progress when rolling along the street; they are estimates and need not be precise or accurate for every street reference.

## Survey data hierarchy (client-side)

- Survey
  - Features
    - Images


### Survey

A survey is made up of a list of features that were captured during one "curb walk" down the street, in a specific direction. In the app, when a user taps on a street on the map and selects which direction they are going, this begins the survey. When a user marks the street as complete and returns to the map view on the app, this ends the survey. A survey must contain a timestamp in epoch milliseconds, a SharedStreets reference ID, the side of street surveyed ("right" or "left"), a surveyed distance in meters, and a list of surveyed features.

#### Example

```json
{
  "created_at": 1588833685540,
  "shst_ref_id": "6mjqqv7YNsp4541DmrrRbV",
  "side_of_street": "right",
  "surveyed_distance": "441.6",
  "features": [
    "..."
  ]
}
```

### Feature

A feature is a set of information about an entity on the street, such as a "no parking" zone, a fire hydrant, a bus stop, or a driveway. A feature must contain a valid label and linear geometry. It may contain a list of associated images, including their url, and linear geometry properties.

#### Example

```json
{
  "label": "no parking",
  "geometry": {
    "type": "Span",
    "distances": [220.5, 405.7]
  },
  "images": [
    {
       "url": "https://i.imgur.com/Fl8HQpU.jpg",
       "geometry":{
         "type": "Position",
         "distance": 214.8
       }
    },
    {
       "url": "https://i.imgur.com/dNE2Hlh.jpg",
       "geometry":{
         "type": "Position",
         "distance": 311.4
       }
    },
    {
       "url": "https://i.imgur.com/Yhb2bJZ.jpg",
       "geometry":{
         "type": "Position",
         "distance": 405.7
       }
    }
  ]
}
```

### Geometry

There are two types of valid linear reference geometry in the CurbWheel data model, `Position` and `Span`. Geometries are similar to GeoJSON, but they represent linear offsets from the beginning of a [LineString](https://tools.ietf.org/html/rfc7946#section-3.1.4).

#### Position

A position is a fixed point along a LineString. It is described as a distance offset from the start of the LineString. `distance` must be a numeric type. The unit is meters.

##### Example

```json
{
  "type": "Position",
  "distance": 264.8
}
```

#### Span

A span is a subsection along a LineString. It is described as a pair of distance offsets from the start of the LineString. `distances` must contain exactly 2 elements. The unit is meters.

##### Example

```json
{
  "type": "Span",
  "distances": [264.8, 287.2]
}
```


## Data storage and export

Data is stored on the Raspberry Pi and may be exported from the CurbWheel in three formats:
- GeoJSON. This is a plain, flat data format which can be exported into GIS systems or manipulated in other ways. All properties are included. The coordinates for each point or linestring feature are taken from its adjusted location, in order to account for intersection offsets; this is the more accurate positioning along the street. Since all data are retained, users could refine or remove this adjustment if desired.
- CurbLR. This is a JSON file created according to the [CurbLR curb regulation data specification](https://github.com/sharedstreets/curblr), though most fields will be empty. The JSON file will contain only linestring GeoJSON features. Feature categories are included as CurbLR `activity` or `marker` properties.
- Asset data. This is a GeoJSON file with point and linestring features, created according to the [Open Curbs Asset Data Specification](https://www.coord.com/hubfs/Coord_November2019%20Files/PDF/8b1277_8e32c9463b3743b7833b9c1e82f0b558.pdf?hsLang=en). Feature categories are included as `asset type` properties.

We recommend processing the data using the Curb Digitizer, but have provided these data formats to allow multiple options for users who may want to pursue other paths.

## Data processing and final output

The Curb Digitizer can be used to process the features and associated images into both asset and regulation data, which can be exported into the [Open Curbs Asset Data Specification](https://www.coord.com/hubfs/Coord_November2019%20Files/PDF/8b1277_8e32c9463b3743b7833b9c1e82f0b558.pdf?hsLang=en) and [CurbLR](https://github.com/sharedstreets/curblr) regulation data specification formats.
