import mapboxgl from 'mapbox-gl'


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
	constructor() {
		this.bounds = [];
		this.init = this.init.bind(this);

		return this.init();
	}


	init() {
		mapboxgl.accessToken = 'pk.eyJ1IjoibWlrZXdpbGxpYW1zb24iLCJhIjoibzRCYUlGSSJ9.QGvlt6Opm5futGhE5i-1kw';
		const map = new mapboxgl.Map({
			container: 'map', // container id
			style: 'mapbox://styles/mapbox/streets-v8', //stylesheet location
		});
		map.fitBounds([bounds.slice(0,2), bounds.slice(2,4)])
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
						"line-width": 16,
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
						"text-font": ["Noto Sans Regular"],
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
				.addLayer({
					id: 'pois',
					minzoom:16,
					source: 'openmaptiles',
					'source-layer': 'poi',
					type: 'symbol',
					layout: {
						'text-field': '{name:latin}',
						"text-font": ["Noto Sans Regular"],
						'text-size': {
							stops: [[16,12], [22,30]]
						},
						'text-max-width':6
					},
					paint: {
						'text-color': 'steelblue'
					}
				})
				.on("click", "streets", (e) => {
					console.log(e.features)
					if (app.state.mode === "selectStreet") {
						var edge = e.features[0].geometry.coordinates;
						app.state.street = e.features[0].properties;

						app.ui.map.fitBounds(turf.bbox(e.features[0]), {
							padding: {
								top: 30,
								left: 30,
								right: 30,
								bottom: 30 + document.querySelector("#mapModal").offsetHeight,
							},
						});

						app.ui.map.getSource("arrows").setData({
							type: "FeatureCollection",
							features: [e.features[0]],
						});

						app.ui.mode.set("selectDirection");
					}
				})
				.on("moveend", (e) => {
					let zoom = app.ui.map.getZoom();

					if (zoom >= 14) {
						
						let viewport = map.getBounds();

						let url = "/query?";
						url += "minX=" + viewport._sw.lng;
						url += "&minY=" + viewport._sw.lat;
						url += "&maxX=" + viewport._ne.lng;
						url += "&maxY=" + viewport._ne.lat;

						fetch(url)
							.then((response) => {
								return response.json();
							})
							.then((streets) => {
								map.getSource("streets").setData(streets);
							});
					} else
						app.ui.map.getSource("streets").setData(constants.emptyGeojson);
				});
		});

		map.switch = {
			side: (state) => {
				state.streetSide = state.streetSide === "right" ? "left" : "right";

				map.setLayoutProperty("arrows", "text-offset", {
					base: 2,
					stops: constants.mapStyle.arrows.side[state.streetSide],
				});
			},

			direction: (state) => {
				state.rollDirection =
					state.rollDirection === "forward" ? "back" : "forward";

				map.setLayoutProperty(
					"arrows",
					"text-field",
					constants.mapStyle.arrows.direction[app.state.rollDirection]
				);
			},
		};


	}
}
export default CurbWheelMap;
