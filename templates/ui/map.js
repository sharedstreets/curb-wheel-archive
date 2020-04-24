
mapboxgl.accessToken = 'pk.eyJ1IjoibW9yZ2FuaGVybG9ja2VyIiwiYSI6Ii1zLU4xOWMifQ.FubD68OEerk74AYCLduMZQ';

app.ui.map = new mapboxgl.Map({
	container: 'map',
	style: 'mapbox://styles/mapbox/light-v10'
});

app.ui.map
	.setZoom(20)
	.setCenter(app.state.street.geometry.coordinates[0])
	.on('load', ()=>{

		app.ui.map
			.addLayer({
				'id': 'edge', 
				'type':'line', 
				'source':{
					type: 'geojson', 
					data: app.state.street.geometry
				},
				'paint':{
					'line-offset':20
				}
			})
			.addLayer({
				'id': 'arrowhead', 
				'type':'symbol', 
				'source':{
					type: 'geojson', 
					data: app.state.street.geometry
				},
				'layout': {
					'text-field': '1 ➜',
					'text-line-height': 5,
					'symbol-placement': 'line',
					'symbol-spacing':50,
					'text-size':24,
					'text-allow-overlap': true,
					'text-ignore-placement': true
				}
			})
	})

app.ui.map.showCollisionBoxes = true