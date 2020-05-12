mapboxgl.accessToken =
  "pk.eyJ1IjoibW9yZ2FuaGVybG9ja2VyIiwiYSI6Ii1zLU4xOWMifQ.FubD68OEerk74AYCLduMZQ";

app.ui.map = new mapboxgl.Map({
	container: 'map',
	style: "http://10.3.141.1:8080/styles/basic-preview/style.json",
	hash: true
});

app.ui.map
	.fitBounds([bounds.slice(0,2), bounds.slice(2,4)])
	.on('load', () => {

			app.ui.map
				.addLayer({
					'id': 'streets', 
					'type':'line', 
					'source':{
						type: 'geojson', 
						data: app.constants.emptyGeojson
					},
					'paint':{
						'line-width': 10,
						'line-opacity':0.2,
						'line-color': 'steelblue'
					}
				})
				.addLayer({
					'id': 'arrows', 
					'type':'symbol', 
					'source':{
						type: 'geojson', 
						data: app.constants.emptyGeojson
					},
					'layout': {
						'text-keep-upright': false,
						"text-font" : ["Noto Sans Regular"],
						'text-field': '{direction} → ',
						'symbol-placement': 'line',
						'symbol-spacing':{
							stops:[[16,20],[22,80]]
						},
						'text-size':{
							'stops':[[16, 12], [22, 45]]
						},
						'text-allow-overlap': true,
						'text-ignore-placement': true
					},
					'paint':{
						'text-color':{
							property: 'direction',
							type: 'categorical',
							stops:[['A', 'orangered'], ['B', 'green']]
						}
					}
				})
				.addLayer({
					'id': 'curbs', 
					'type':'line', 
					'source':{
						type: 'geojson', 
						data: {type:'FeatureCollection', features:[]}
					},
					'paint':{
						'line-width': 3
					}					
				})
				.on('click', 'streets', (e)=>{

					if (app.state.mode = 'selectStreet'){

						var edge = e.features[0].geometry.coordinates;
						app.state.street = e.features[0].properties;
						app.ui.map
							.fitBounds(turf.bbox(e.features[0]), {padding:60})

						var forward = turf.lineOffset(turf.lineString(edge, {direction:'A', ref: e.features[0].properties.forward}), 10, {units: 'meters'});
						edge.reverse();
						var backward = turf.lineOffset(turf.lineString(edge, {direction:'B', ref: e.features[0].properties.back}), 10, {units: 'meters'});
						
						app.ui.map.getSource('arrows')
							.setData({type:'FeatureCollection', features:[forward, backward]})

						app.ui.mode.set('selectDirection')
					}

				})
				.on('click', 'arrows', (e)=>{

					if (app.state.mode = 'selectDirection'){

						var ref = e.features[0].properties.ref;

						app.ui.confirm(
							app.constants.prompts.beginSurvey, 
							()=>{
								app.state.street.ref = ref;
								app.state.street.distance = 122;
								app.state.currentRollDistance = 0;

								app.ui.mode.set('rolling');
								app.devMode.rolling= true;
							}
						)


					}

				})
				.on('moveend', e => {
					let zoom = app.ui.map.getZoom()

					if (zoom >= 14) {
						let viewport = app.ui.map.getBounds()

						let url = '/query?';
						url += 'minX=' + viewport._sw.lng
						url += '&minY=' + viewport._sw.lat
						url += '&maxX=' + viewport._ne.lng
						url += '&maxY=' + viewport._ne.lat

						fetch(url)
							.then((response) => {
								return response.json();
							})
							.then((streets) => {
								app.ui.map.getSource('streets').setData(streets);
							});
					} 
					
					else app.ui.map.getSource('streets').setData(app.constants.emptyGeojson);
					
				})

	})


// app.ui.map.showCollisionBoxes = true
// app.ui.map.showTileBoundaries = true
