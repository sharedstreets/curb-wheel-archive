## How to digitize the data into a CurbLR feed

The digitizer can be run locally or accessed through a hosted version. It will pull in the data you uploaded and display the curb segments on a map, alongside images that were captured.

<img src="images/digitizer1.png">

On the left are tables where you will enter the regulation information. The top table contains all the individual segments. The second contains the regulation information for a selected segment. The third contains timespan information for a selected segment.

To begin, select an individual segment and complete any relevant fields in the first table. Then move to the second table and enter in the relevant regulation info (e.g. “activity = no parking”). If that regulation has a timespan restriction, move to the third table and enter it there.

<img src="images/digitizer3.png">

Most cities have a handful of rules that repeat over and over again, so to make digitizing more efficient, you can give the regulation a name and make it a template. Once a regulation is templated, you can apply it to other curb spans using a dropdown, or by copying and pasting over multiple cells. You can do the same thing to create and apply timespan templates, as shown above.

More detailed instructions and tips are available [here](https://github.com/sharedstreets/curbwheel-digitizer/blob/master/usage.md).

When you’re finished, clicking “Export” will download the CurbLR JSON file as well as a GeoJSON of point features (such as photo locations and fire hydrants).

This testing version does not generate the metadata text for the CurbLR JSON, so you will need to add that to your data feed. Open the JSON in a text editor. It will begin with the text, ``{"type":"FeatureCollection",``  Right after that text (immediately after the comma), paste the manifest template text as seen in the image below (the pasted text is highlighted).

<img src="images/digitizer4.png">

Customize the fields to be correct for your particular agency, timezone, etc. Pay special attention to the `priorityHierarchy` field; this should be a ranked list of all your `priorityCategory` names, in order of highest precedence. Save the JSON file when you are finished. You can give the file a new name if you prefer.

Test for the sample manifest is contained below:

```JSON
"manifest": {
  "createdDate": "2020-05-12T11:40:45Z",
  "lastUpdatedDate": "2020-10-10T17:40:45Z",
  "priorityHierarchy": [
    "no standing",
    "construction",
    "temporary restriction",
    "restricted standing",
    "standing",
    "restricted loading",
    "loading",
    "no parking",
    "restricted parking",
    "paid parking",
    "free parking"
  ],
  "curblrVersion": "1.1.0",
  "timeZone": "America/Los_Angeles",
  "currency": "USD",
  "unitHeightLength": "feet",
  "unitWeight": "tons",
  "authority": {
    "name": "Your Transportation Agency Name",
    "url": "https://www.youragencyurl.gov",
    "phone": "+15551231234"
  }
}
```
