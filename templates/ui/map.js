
mapboxgl.accessToken = 'pk.eyJ1IjoibW9yZ2FuaGVybG9ja2VyIiwiYSI6Ii1zLU4xOWMifQ.FubD68OEerk74AYCLduMZQ';

app.ui.map = new mapboxgl.Map({
	container: 'map',
	style: 'mapbox://styles/mapbox/light-v10'
});

app.ui.map
	.setZoom(16)
	.setCenter(app.state.street.geometry.coordinates[0])
	.on('load', () => {

		d3.json('honolulu.geojson', (e,r)=>{
			app.ui.map
				.addLayer({
					'id': 'edge', 
					'type':'line', 
					'source':{
						type: 'geojson', 
						data: r
					},
					'paint':{
						'line-width':10,
						'line-opacity':0.2
					}
				})
				.addLayer({
					'id': 'arrows', 
					'type':'symbol', 
					'source':{
						type: 'geojson', 
						data: {type:'FeatureCollection', features:[]}
					},
					'layout': {
						'text-keep-upright': false,
						'text-field': '{direction}  → ',
						'symbol-placement': 'line',
						'symbol-spacing':{
							stops:[[6,12],[22,50]]
						},
						'text-size':30,
						'text-allow-overlap': true,
						'text-ignore-placement': true
					},
					'paint':{
						'text-color':{
							property: 'direction',
							type: 'categorical',
							stops:[['A', 'orangered'], ['B', 'green']]
						},
					}
				})
				// .addLayer({
				// 	'id': 'labels', 
				// 	'type':'symbol', 
				// 	'source':'arrows',
				// 	'layout': {
				// 		'text-rotation-alignment': 'viewport',
				// 		'text-field': '{direction}',
				// 		'symbol-placement': 'line',
				// 		'text-size':24,
				// 		'text-allow-overlap': true,
				// 		'text-ignore-placement': true,
				// 		'text-offset':{
				// 			property: 'direction',
				// 			type: 'categorical',
				// 			stops:[['A', [0,2]], ['B', [0,-2]]]
				// 		}
				// 	},
				// 	'paint':{
				// 		'text-color':{
				// 			property: 'direction',
				// 			type: 'categorical',
				// 			stops:[['A', 'orangered'], ['B', 'green']]
				// 		},
				// 		'text-translate-anchor': 'map',
				// 	}

				// })
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
				.on('click', 'edge', (e)=>{

					var edge = e.features[0].geometry.coordinates;
					app.ui.map
						.fitBounds(edge, {padding:60})

					var forward = turf.lineOffset(turf.lineString(edge, {direction:'A'}), 3, {units: 'meters'});
					edge.reverse();
					var backward = turf.lineOffset(turf.lineString(edge, {direction:'B'}), 3, {units: 'meters'});
					console.log(forward, backward)
					app.ui.map.getSource('arrows')
						.setData({type:'FeatureCollection', features:[forward, backward]})
				})
		})

	})

// app.ui.map.showCollisionBoxes = true
// app.ui.map.showTileBoundaries = true