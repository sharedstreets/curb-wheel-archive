import mapboxgl from 'mapbox-gl';
import bbox from '@turf/bbox';


const constants = {
	emptyGeojson: {
		type: "FeatureCollection",
		features: [],
	},
	mapStyle: {
		arrows: {
			direction: {
				forward: "> ",
				back: " <",
			},

			side: {
				right: [
					[16, [0, 1]],
					[22, [0, 10]],
				],
				left: [
					[16, [0, -1]],
					[22, [0, -10]],
				],
			},
		}
	}
}

class CurbWheelMap {
	constructor(state, emitter) {
		this.bounds = [[-130.321884,25.672164],[-67.699814,49.175195]];
		this.state = state;
		this.emitter = emitter;
		this.init = this.init.bind(this);
		this.setListeners = this.setListeners.bind(this);
		this.setMapLocation = this.setMapLocation.bind(this);

		this.map = this.init();
		this.setListeners()
		return this.map
	}

	setListeners() {
		this.emitter.on("setStreets", (streets)=> {
			this.map.getSource("streets").setData(streets);
		})
	}

	setMapLocation(position) {
        this.map.flyTo({
            center: [position.coords.longitude,position.coords.latitude],
						speed: 10,
            zoom: 16
        });
    }


	init() {
		mapboxgl.accessToken = 'pk.eyJ1IjoibWlrZXdpbGxpYW1zb24iLCJhIjoibzRCYUlGSSJ9.QGvlt6Opm5futGhE5i-1kw';
		const map = new mapboxgl.Map({
			container: 'map', // container id
			style: 'mapbox://styles/mapbox/streets-v8', //stylesheet location
		});
		map.setMapLocation = this.setMapLocation
		map.fitBounds(this.bounds)
			.on("load", () => {

				map.addLayer({
					id: "streets",
					type: "line",
					source: {
						type: "geojson",
						data: constants.emptyGeojson,
					},
					paint: {
						"line-width": 10,
						"line-opacity": 0.2,
						"line-color": "steelblue",
					},
				})
				.addLayer({
					id: "surveyedStreets",
					type: "line",
					filter:['in', 'forward', 'none'],
					source: 'streets',
					paint: {
						"line-width": 4,
						"line-color": "steelblue",
					},
					layout: {
						'line-cap': 'round'
					}
				})
				.addLayer({
					id: "arrows",
					type: "symbol",
					source: {
						type: "geojson",
						data: constants.emptyGeojson,
					},
					layout: {
						"text-keep-upright": false,
						"text-field": constants.mapStyle.arrows.direction.forward,
						"symbol-placement": "line",
						"symbol-spacing": {
							stops: [
								[16, 20],
								[22, 80],
							],
						},
						"text-size": {
							stops: [
								[16, 12],
								[22, 45],
							],
						},
						"text-allow-overlap": true,
						"text-ignore-placement": true,
						"text-offset": {
							base: 2,
							stops: constants.mapStyle.arrows.side.right,
						},
					},
					paint: {
						"text-color": "steelblue",
					},
				})
				.addLayer({
					id: "youarehere",
					type: "circle",
					source: {
						type: "geojson",
						data: constants.emptyGeojson,
					},
					paint: {
						"circle-color": "steelblue",
					},
				})
				.on("click", "streets", (e) => {
					if (this.state.mode === "selectStreet") {
						var edge = e.features[0].geometry.coordinates;
						this.state.street = e.features[0].properties;

						map.fitBounds(bbox(e.features[0]), {
							padding: {
								top: 30,
								left: 30,
								right: 30,
								bottom: 30 + document.querySelector("#mapModal").offsetHeight,
							},
						});

						map.getSource("arrows").setData({
							type: "FeatureCollection",
							features: [e.features[0]],
						});

						this.emitter.emit("selectDirection")

					}
				})
				.on("moveend", (e) => {
					let zoom = map.getZoom();

					if (zoom >= 14) {

						let viewport = map.getBounds();

						let url = "/query?";
						url += "minX=" + viewport._sw.lng;
						url += "&minY=" + viewport._sw.lat;
						url += "&maxX=" + viewport._ne.lng;
						url += "&maxY=" + viewport._ne.lat;

						this.emitter.emit('fetchStreets', viewport);
						/*
						fetch(url)
							.then((response) => {
								return response.json();
							})
							.then((streets) => {
								map.getSource("streets").setData(streets);
							});
						*/
					} else
						map.getSource("streets").setData(constants.emptyGeojson);
				});
				this.emitter.emit('mapload');
			});

		map.switch = {
			side: () => {
				this.state.streetSide = this.state.streetSide === "right" ? "left" : "right";

				map.setLayoutProperty("arrows", "text-offset", {
					base: 2,
					stops: constants.mapStyle.arrows.side[this.state.streetSide],
				});
			},

			direction: () => {
				this.state.rollDirection =
					this.state.rollDirection === "forward" ? "back" : "forward";

				map.setLayoutProperty(
					"arrows",
					"text-field",
					constants.mapStyle.arrows.direction[this.state.rollDirection]
				);
			},
		};

		return map;


	}
}
export default CurbWheelMap;
