import * as sharedstreetsPbf from 'sharedstreets-pbf';

import * as turfHelpers from '@turf/helpers';
import bbox from "@turf/bbox";
import length from "@turf/length";
import destination from '@turf/destination';
import  RBush from 'rbush';

const SphericalMercator = require("@mapbox/sphericalmercator");
const sphericalMercator = new SphericalMercator({
    size: 256
});

// TODO build conditional isomorphic fetch for testing
//import fetch from 'cross-fetch';

const USE_LOCAL_CACHE = false; // need to figure out isomorphic implementation with cache?
const DEFAULT_ZLEVEL = 12;
const SHST_TILE_URL = 'https://tiles.sharedstreets.io/';

function checkStatus(res) {
    if (res.ok) { // res.status >= 200 && res.status < 300
        return res;
    } else {
        throw "file not found";
    }
}

async function getPbf(url) {

    var data = await fetch(url, {
        method: 'GET'
    });

    checkStatus(data);
    return new Uint8Array(await data.arrayBuffer());
}

function lonlatsToCoords(lonlats) {
  const coords = [];
  lonlats.reduce((lon, deg, index) => {
    if (index % 2 === 0) { return deg; } // Longitude
    coords.push([lon, deg]);
    return deg; // Latitude
  });
  return coords;
}

function bboxFromPolygon(polygon) {
	var bboxCoords = bbox(polygon)
	return {"minX": bboxCoords[0], "minY": bboxCoords[1], "maxX":bboxCoords[2], "maxY":bboxCoords[3]}
}


export function getReferenceLength(ref) {
    var refLength = 0;
    for(var locationRef of ref.locationReferences) {
        if(locationRef.distanceToNextRef)
        refLength = refLength = locationRef.distanceToNextRef
    }
    return refLength / 100;
}


function createGeometry(data) {

    var line = turfHelpers.lineString(lonlatsToCoords(data.lonlats));
    var feature = turfHelpers.feature(line.geometry, {id: data.id, forward: data.forwardReferenceId, backward: data.backReferenceId});
    return feature;
}

function getTileIdsForPolygon(polygon, buffer=0) {

    var polyBound = bbox(polygon)

    var nwPoint = destination(turfHelpers.point([polyBound[0],polyBound[1]]), buffer, 315, {'units':'meters'});
    var sePoint = destination(turfHelpers.point([polyBound[2],polyBound[3]]), buffer, 135, {'units':'meters'});
    let bounds = [nwPoint.geometry.coordinates[0], nwPoint.geometry.coordinates[1], sePoint.geometry.coordinates[0], sePoint.geometry.coordinates[1]];
    return getTileIdsForBounds(bounds, false);

}

function getTileIdsForPoint(point, buffer=0) {

    if(buffer > 0) {
        var nwPoint = destination(point, buffer, 315, {'units':'meters'});
        var sePoint = destination(point, buffer, 135, {'units':'meters'});
        let bounds = [nwPoint.geometry.coordinates[0], nwPoint.geometry.coordinates[1], sePoint.geometry.coordinates[0], sePoint.geometry.coordinates[1]];
        return getTileIdsForBounds(bounds, false);
    }
    else{
        let bounds = [point.geometry.coordinates[0], point.geometry.coordinates[1], point.geometry.coordinates[0], point.geometry.coordinates[1]];
        return getTileIdsForBounds(bounds, false);
    }
}


function getTileIdsForBounds(bounds, bufferEdge) {

    let tileRange = sphericalMercator.xyz(bounds, DEFAULT_ZLEVEL);
    let tileIds = [];

    // if buffer extend tile range to +/- 1
    let bufferSize = 0;
    if(bufferEdge)
        bufferSize = 1;

    for(var x = tileRange.minX - bufferSize; x <= tileRange.maxX + bufferSize; x++){
        for(var y = tileRange.minY -  bufferSize; y <= tileRange.maxY + bufferSize; y++){
            var tileId = DEFAULT_ZLEVEL + '-' + x + '-' + y;
            tileIds.push(tileId);
        }
    }

    return tileIds;
}

async function getTile(tilePath) {

    // TODO use generator/yield pattern + protobuf decodeDelimited

    var arrayBuffer;
    if(USE_LOCAL_CACHE) {
        // var tileFilePath = path.join(SHST_TILE_CACHE_DIR, tilePath.toPathString());
        // if(existsSync(tileFilePath)
        //   arrayBuffer = new Uint8Array(readFileSync(tileFilePath));
    }
    else {

        try {
            arrayBuffer = await getPbf(SHST_TILE_URL + tilePath.toPathString());
        } catch(e)  {
            // TODO: need to handle 404/403 errors correctly and return empty array but still throw exception on other issues
            return [];
        }

        if(USE_LOCAL_CACHE) {
            // mkdirSync(path.join(SHST_TILE_CACHE_DIR, tilePath.source), { recursive: true });
            // writeFileSync(tileFilePath, arrayBuffer);
        }
    }

    if(arrayBuffer) {

        if(tilePath.tileType === 'geometry') {
            var geometries = sharedstreetsPbf.geometry(arrayBuffer);
            return geometries;
        }
        else if(tilePath.tileType === 'intersection') {
            var intersections = sharedstreetsPbf.intersection(arrayBuffer);
            return intersections;
        }
        else if(tilePath.tileType === 'reference') {
            var references = sharedstreetsPbf.reference(arrayBuffer);
            return references;
        }
        else if(tilePath.tileType === 'metadata') {
            var metadata = sharedstreetsPbf.metadata(arrayBuffer);
            return metadata;
        }

    }
}

function getIdFromTilePath(tilePath) {
    var pathParts = tilePath.split("/");
    var fileParts = pathParts[pathParts.length-1].split(".");
    var tileId = fileParts[fileParts.length-4];
    return tileId;
}


function getTypeFromTilePath(tilePath) {
    var parts = tilePath.split(".");
    var type = parts[parts.length-3].toUpperCase();
    return type;
}


function getSourceFromTilePath(tilePath) {
    var pathParts = tilePath.split('/');
    var tileSource = pathParts[0] + '/' + pathParts[1];
    return tileSource;
}

function getHierarchyFromPath(tilePath) {
    var parts = tilePath.split(".");
    return parseInt(parts[parts.length-2])
}


class TilePathParams {
    constructor(params=null) {
        if(params)
            this.setParams(params);
    }

    setParams(params) {
        this.source = params.source;
        this.tileHierarchy = params.tileHierarchy;
    }
}

export class TilePath extends TilePathParams{

    constructor(path=null) {
        super();

        if(path) {
            this.tileId = getIdFromTilePath(path);
            this.tileType = getTypeFromTilePath(path);
            this.source = getSourceFromTilePath(path);
            this.tileHierarchy = getHierarchyFromPath(path);
        }
    }

    toPathString() {
        return this.source + '/' +  this.tileId + '.' + this.tileType + '.' + this.tileHierarchy + '.pbf'
    }
}

export class TilePathGroup extends TilePathParams  {
    constructor(paths=null){
        super();
        this.tileIds = [];
        this.tileTypes = [];

        if(paths) {
            for(var path of paths) {
                this.addPath(path);
            }
        }
    }

    *[Symbol.iterator]() {
        this.tileTypes.sort();
        this.tileIds.sort();

        for(var tileType of this.tileTypes) {
            for(var tileId of this.tileIds) {
                var tilePath = new TilePath();
                tilePath.setParams(this);
                tilePath.tileId = tileId;
                tilePath.tileType = tileType;

                yield tilePath;
            }
        }
    }

    addType(tileType) {
        var typeSet = new Set(this.tileTypes);
        typeSet.add(tileType);
        this.tileTypes = [...typeSet.values()];
    }

    addTileId(tileId) {
        var idSet = new Set(this.tileIds);
        idSet.add(tileId);
        this.tileIds = [...idSet.values()];
    }

    addPath(path) {
        if(this.source != undefined && this.source !== path.source)
            throw "Path source does not match group";
        else
            this.source = path.source;

        if(this.tileHierarchy != undefined && this.tileHierarchy !== path.tileHierarchy)
            throw "Path source does not match group";
        else
            this.tileHierarchy = path.tileHierarchy;

        this.addType(path.tileType);
        this.addTileId(path.tileId);
    }

    static fromPolygon(polygon, buffer, params) {

        var tilePathGroup = new TilePathGroup();
        tilePathGroup.setParams(params);
        tilePathGroup.tileIds = getTileIdsForPolygon(polygon);

        return tilePathGroup;
    }

    static fromPoint(point, buffer, params) {

        var tilePathGroup = new TilePathGroup();
        tilePathGroup.setParams(params);
        tilePathGroup.tileIds = getTileIdsForPoint(point, buffer);

        return tilePathGroup;
    }
}

class TileIndex {

    constructor() {

        this.tiles = new Set();
        this.objectIndex = new Map();
        this.featureIndex = new Map();
        this.metadataIndex = new Map();
        this.osmNodeIntersectionIndex = new Map();
        this.osmNodeIndex = new Map();
        this.osmWayIndex = new Map();
        this.binIndex = new Map();

        this.intersectionIndex = new RBush(9);
        this.geometryIndex = new RBush(9);
    }

    addTileType(tileType) {
        this.additionalTileTypes.push(tileType);
    }


    isIndexed(tilePath) {
        if(this.tiles.has(tilePath.toPathString()))
            return true;
        else
            return false;
    }

    async indexTilesByPathGroup(tilePathGroup) {

        for(var tilePath of tilePathGroup) {
            await this.indexTileByPath(tilePath);
        }

        return false;
    }

    async indexTileByPath(tilePath) {

        if(this.isIndexed(tilePath))
            return true;

        var data = await getTile(tilePath);

        if(tilePath.tileType === 'geometry') {
            var geometryFeatures = [];
            for(var geometry of data) {
                if(!this.objectIndex.has(geometry.id)) {
                    this.objectIndex.set(geometry.id, geometry);
                    var geometryFeature = createGeometry(geometry);
                    this.featureIndex.set(geometry.id, geometryFeature)
                    var bboxCoords = bboxFromPolygon(geometryFeature);
                    bboxCoords['id'] = geometry.id;
                    geometryFeatures.push(bboxCoords);
                }
            }
            this.geometryIndex.load(geometryFeatures);
        }
        else if(tilePath.tileType === 'intersection') {
            var intersectionFeatures = [];
            for(var intersection of data) {
                if(!this.objectIndex.has(intersection.id)) {
                    this.objectIndex.set(intersection.id, intersection);
                    var intesectionFeature = createIntersectionGeometry(intersection);
                    this.featureIndex.set(intersection.id, intesectionFeature);
                    this.osmNodeIntersectionIndex.set(intersection.nodeId, intersection);
                    var bboxCoords = bboxFromPolygon(intesectionFeature);
                    bboxCoords['id'] = intersection.id;
                    intersectionFeatures.push(bboxCoords);
                }
            }
            this.intersectionIndex.load(intersectionFeatures);
        }
        else if(tilePath.tileType === 'reference') {
            for(var reference of data) {
              this.objectIndex.set(reference.id, reference);
            }
        }
        else if(tilePath.tileType === 'metadata') {
            for(var metadata of data) {
                this.metadataIndex.set(metadata.geometryId, metadata);
                if(metadata.osmMetadata) {
                    for(var waySection of metadata.osmMetadata.waySections) {

                        if(!this.osmWayIndex.has("" + waySection.wayId))
                            this.osmWayIndex.set("" + waySection.wayId, [])

                        var ways = this.osmWayIndex.get("" + waySection.wayId);
                        ways.push(metadata);
                        this.osmWayIndex.set("" + waySection.wayId, ways);

                        for(var nodeId of waySection.nodeIds) {

                            if(!this.osmNodeIndex.has("" + nodeId))
                                this.osmNodeIndex.set("" + nodeId, []);

                            var nodes = this.osmNodeIndex.get("" + nodeId);
                            nodes.push(metadata);
                            this.osmNodeIndex.set("" + nodeId, nodes);
                        }
                    }
                }
            }
        }

        this.tiles.add(tilePath.toPathString());
    }

    async intersects(polygon, searchType, buffer, params) {

        var tilePaths = TilePathGroup.fromPolygon(polygon, buffer, params);

        if(searchType === 'geometry')
            tilePaths.addType('geometry');
        else if(searchType === 'intersection')
            tilePaths.addType('intersection');
        else
            throw "invalid search type must be GEOMETRY or INTERSECTION";

        if(this.additionalTileTypes && this.additionalTileTypes.length > 0) {
            for(var type of this.additionalTileTypes) {
                tilePaths.addType(type);
            }
        }

        await this.indexTilesByPathGroup(tilePaths);

        var data = turfHelpers.featureCollection([]);

        if(searchType === 'geometry'){
            var bboxCoords = bboxFromPolygon(polygon);
            var rbushMatches = this.geometryIndex.search(bboxCoords);
            for(var rbushMatch of rbushMatches) {
                var matchedGeom = this.featureIndex.get(rbushMatch.id);
                matchedGeom.properties.distance = length(matchedGeom, { units: "meters" });
                data.features.push(matchedGeom);
            }
        }
        else if(searchType === 'intersection') {
            var bboxCoords = bboxFromPolygon(polygon);
            var rbushMatches = this.intersectionIndex.search(bboxCoords);
            for(var rbushMatch of rbushMatches) {
                var matchedGeom = this.featureIndex.get(rbushMatch.id);
                data.features.push(matchedGeom);
            }
        }

        return data;
    }
}


class SharedStreets {

  constructor(types) {
      this.types = types
      this.index = new TileIndex();
  }

  getPolygon(polygon) {
    var params = new TilePathParams();
    params.source = 'osm/planet-181224';
    params.tileHierarchy = 6;
    return this.index.intersects(polygon, 'geometry', 0, params);
  }

  clear() {
    this.index = new TileIndex();
  }

}


export default SharedStreets
