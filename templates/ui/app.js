var app = {

	state: {
		street: {
			name: null,
			distance: 100
		},

		currentRollDistance: 0,
		zones: [],
		mode: 'rolling'
	},

	constants: {

		zoneTypes: [
			'Parking',
			'No Parking', 
			'Stopping',
			'No Stopping', 
			'Loading', 
			'Standing', 
			'No Standing', 
			'Travel Lane',
		],

		prompts: {
			exitSurvey: 'This abandons the current survey. Are you sure?',
			deleteZone: 'This will delete the zone. Are you sure?', 
			takePhoto: 'Set the wheel down so that it does not fall over. Feel free get in a good position to get the zone in the frame.',
			finishZone: "This marks the end of the zone. Once complete, you won't be able to make further changes to this regulation."
		},

		titles: {
			intro: 'Intro',
			map: 'Select a curb',
			rolling: ()=>{ return `Surveying ${app.state.street.name}`},
			addZone: 'Select zone type'
		},

		modes: ['map', 'rolling', 'addZone']
	},

	// functionality to add/delete/modify zones
	zone: {

		delete: function(d){

			var success = function(){
				app.state.zones = app.state.zones
					.filter(zone=>{
						return zone.startTime !== d.startTime
					})

				app.ui.updateZones();
			}

			app.ui.confirm(app.constants.prompts.deleteZone, success, null)

		},

		'take photo': function(d) {

			var success = function(){
				document.querySelector('#uploadImg').click()
			}

			app.ui.confirm(app.constants.prompts.takePhoto, success, null)
		
		},

		complete: function(d,i) {

			var success = function(){

				var startTimeToEnd = d.startTime;

				app.state.zones
					.forEach(d=>{
						if (d.startTime === startTimeToEnd) d.end = app.state.currentRollDistance
					})

				app.ui.updateZones();
			}

			app.ui.confirm(app.constants.prompts.finishZone, success, null)

		},

		add: function(zoneType){

			var newZone = {
				type: zoneType,
				start: app.state.currentRollDistance,
				startTime: Date.now()
			}

			app.state.zones.push(newZone);

		}
	},

	// functionality to update the UI, typically after zone changes and new rolling
	ui: {

		roll: function(){
			var current = app.state.currentRollDistance;
			d3.select('progress')
				.attr('value', current);

			//update progress bars that aren't complete yet
			d3.selectAll('.entry:not(.complete) .bar')
				.style('transform', (d)=>{
					//conditional start to account for main progress bar
					var startingMark = d ? d.start : 0;
					return `scaleX(${(current-startingMark)/app.state.street.distance})`
			});

			d3.selectAll('.entry:not(.complete) #zoneLength')
				.text(d=>`${(current-d.start).toFixed(1)} m long`)

			d3.select('#blockProgress')
				.text(app.state.currentRollDistance.toFixed(1))
		},

		progressBar: {

			build: function(parent){

				parent
					.append('div')
					.attr('class', 'progressBar')
					.append('div')
					.attr('class', 'bar')
					.style('margin-left', d=>`${100*d.start/app.state.street.distance}%`)
			}

		},

		buildZoneEntry: function(newZones){
			// name of zone
			newZones
				.append('span')
				.attr('class', 'zoneName')
				.text(d=>`${d.type} zone`);

			// ['check', 'camera', 'times']
			// .forEach(action=>{
			// 	newZones
			// 		.append('span')
			// 		.style('margin-left', '10px')
			// 		.attr('class', 'small quiet fr')
			// 		.on('mousedown', (d,i)=>{
			// 			var id = d.startTime; 
			// 			d3.selectAll('#zones .entry .columns')
			// 			.classed('hidden', (d, entryIndex)=>{return d.startTime !== id})
			// 		})
			// 		.append('span')
			// 		.attr('class', `icon fas fa-${action}`)
			// })

			newZones
				.append('span')
				.attr('class', 'fr onlyWhenRunning')
				.on('mousedown', (d,i)=>{
					var id = d.startTime; 
					d3.selectAll('#zones .entry')
					.classed('active', (d, entryIndex)=>{return d.startTime === id})
				})
				.append('span')
				.attr('class', 'icon fas fa-cog')


			app.ui.progressBar.build(newZones)

			var barCaption = newZones
				.append('div')
				.attr('class', 'quiet small mt5 mb30')

			barCaption
				.append('span')
				.attr('class', 'fl')
				.attr('id', 'zoneLength')
				.text(d=>`0 m long`)

			barCaption
				.append('span')
				.attr('class', 'fr')
				.text(d=>`From ${d.start.toFixed(0)}m-mark`)

			// build zone action buttons

			newZones
			var zoneActions = newZones
				.append('div')
				.attr('class', 'mt50 mb50 small onlyWhenRunning zoneActions blue');

			Object.keys(app.zone)
			.forEach(action=>{
				zoneActions
					.append('div')
					.attr('class', `col4 zoneAction`)
					.text(action)
					.on('mousedown', (d,i) => {
						d3.event.stopPropagation();
						app.zone[action](d,i)
					});
			})
		},

		updateZones: function(){

			var zones = d3.select('#zones')
				.selectAll('.entry')
				.data(app.state.zones, d=>d.startTime);

			//remove deleted zones
			zones
				.exit()
				.transition()
				.duration(200)
				.style('transform', 'translateY(-100%)')
				.style('opacity',0)
				.remove();

			zones
				.classed('complete', d=>d.end)

			// add new zones
			var newZones = zones
				.enter()
				.append('div')
				.attr('class', 'entry');


			app.ui.buildZoneEntry(newZones)
		},

		mode:  {
			set: function(mode) {

				app.ui.reset();
				d3.select('#modes')
					.style('transform', `translateX(-${app.constants.modes.indexOf(mode)*25}%)`);
				
				app.state.mode = mode;

				d3.select('#title')
					.text(app.constants.titles[mode])
			},


		},

		back: function() {

			var modeIndex = app.constants.modes.indexOf(app.state.mode)-1;
			var newMode = app.constants.modes[modeIndex];

			if (app.state.mode === 'rolling') {
				app.ui.confirm(app.constants.prompts.exitSurvey,app.ui.mode.set(newMode))
			}
			else app.ui.mode.set(newMode)
		},

		confirm: function(text, ok, cancel) {
			var confirmed = confirm(text);
			if (confirmed == true) ok()
			else if (cancel) cancel()
		},

		reset: function(){
			d3.select('.active').classed('active', false)
		}
	},

	init: function() {

		//populate street length
		d3.select('#curbLength')
			.text(Math.round(app.state.street.distance))

		d3.select('#curbEntry progress')
			.attr('max', app.state.street.distance)

		// build Add Zone modal
		d3.select('#addZone')
			.selectAll('.zoneType')
			.data(app.constants.zoneTypes)
			.enter()
			.append('div')
			.attr('class', 'zoneType')
			.text(d=>d)
			.on('mousedown',(d)=>{

				// add new zone to state, return to rolling mode, update ui
				app.zone.add(d);
				app.ui.updateZones();
				app.ui.mode.set('rolling');
			})

		app.ui.mode.set('rolling')
	}, 


	devMode: {

		init: function(){

			app.state.street = app.devMode.sampleStreet.properties;
			app.state.street.geometry = app.devMode.sampleStreet.geometry;
			app.init();
			this.dummyRolling();

		},

		sampleStreet: {
			"geometry": {
				"type": "LineString",
				"coordinates": [
					[
					-158.04033804684877,
					21.340108455253144
					],
					[
					-158.0394757166505,
					21.34072210086012
					]
				]
			},
			"type": "Feature",
			"properties": {
				"id": "12212304!1",
				"refs": "[110619114,110561346]",
				"highway": "residential",
				"name": "Hapua Street",
				"distance": 112.52,
				"forward": "578194fd94f8b5d1e4716e64bdf23589",
				"back": "cdb125fdef759ab8edb68c13f7a393c4"
			}
		},

		dummyRolling: function(){
			setInterval(()=>{
				app.state.currentRollDistance+=Math.random()/2
				app.ui.roll();
			}, 1000)
		},		
	}
}




app.devMode.init();





