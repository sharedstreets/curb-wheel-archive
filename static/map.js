mapboxgl.accessToken =
	"pk.eyJ1IjoibW9yZ2FuaGVybG9ja2VyIiwiYSI6Ii1zLU4xOWMifQ.FubD68OEerk74AYCLduMZQ";

app.ui.map = new mapboxgl.Map({
	container: "map",
	style: "http://[::]:8080/styles/basic-preview/style.json",
	hash: true,
});

app.ui.map
	.fitBounds([bounds.slice(0,2), bounds.slice(2,4)])
	.on("load", () => {
		app.ui.map
			.addLayer({
				id: "streets",
				type: "line",
				source: {
					type: "geojson",
					data: app.constants.emptyGeojson,
				},
				paint: {
					"line-width": 10,
					"line-opacity": 0.2,
					"line-color": "steelblue",
				},
			})
			.addLayer({
				id: "arrows",
				type: "symbol",
				source: {
					type: "geojson",
					data: app.constants.emptyGeojson,
				},
				layout: {
					"text-keep-upright": false,
					"text-font": ["Noto Sans Regular"],
					"text-field": app.constants.mapStyle.arrows.direction.forward,
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
						stops: app.constants.mapStyle.arrows.side.right,
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
					data: app.constants.emptyGeojson,
				},
				paint: {
					"circle-color": "steelblue",
				},
			})
			.on("click", "streets", (e) => {
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
					let viewport = app.ui.map.getBounds();

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
							app.ui.map.getSource("streets").setData(streets);
						});
				} else
					app.ui.map.getSource("streets").setData(app.constants.emptyGeojson);
			});
	});

app.ui.map.switch = {
	side: () => {
		app.state.streetSide = app.state.streetSide === "right" ? "left" : "right";

		app.ui.map.setLayoutProperty("arrows", "text-offset", {
			base: 2,
			stops: app.constants.mapStyle.arrows.side[app.state.streetSide],
		});
	},

	direction: () => {
		app.state.rollDirection =
			app.state.rollDirection === "forward" ? "back" : "forward";

		app.ui.map.setLayoutProperty(
			"arrows",
			"text-field",
			app.constants.mapStyle.arrows.direction[app.state.rollDirection]
		);
	},
};
