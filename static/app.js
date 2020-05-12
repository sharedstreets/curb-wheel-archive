var app = {
  
	state: {
		street: {
			distance: 10
		},
		systemRollDistance:0,
		currentRollDistance: 0,
		zones: [],
		mode: 'selectStreet'
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
			beginSurvey: "Head toward the starting edge of the curb. When you're ready, press OK to start surveying",
			exitSurvey: 'This abandons the current survey. Are you sure?',
			deleteZone: 'This will delete the zone. Are you sure?', 
			takePhoto: 'Set the wheel down so that it does not fall over. Feel free get in a good position to get the zone in the frame.',
			finishZone: "This marks the end of the zone. Once complete, you won't be able to make further changes to this regulation."
		},

		modes: {
			selectStreet: {
				view:0,
				title: 'Select a street',
				set: ()=>{

					//conditional on whether the map has instantiated
					if (app.ui.map) {
					app.ui.map.getSource('arrows')
						.setData(app.constants.emptyGeojson);
					}
				}
			},

			selectDirection: {
				view:0,
				title: 'Select curb side'
			},

			rolling: {
				view:1,

				set: ()=>{
					app.ui.updateZones()
				},
				
				title: ()=>{ 
					return `Surveying ${app.state.street.name}`
				},

				back: ()=>{

					var success = ()=>{
						app.state.zones = [];
						app.ui.mode.set('selectStreet');					
					}

					app.ui.confirm(
						app.constants.prompts.exitSurvey, 
						success
					)

					return true
				}
			},
			addZone: {
				view: 2,
				title: 'Select zone type'
			}
		},

		emptyGeojson: {type:'FeatureCollection', features:[]}
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

		// fires on roll signal from Pi. Updates all active progress bars and status texts
		roll: function(){

			var current = app.state.currentRollDistance - app.state.systemRollDistance;
			console.log(current)

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
				.text(current.toFixed(1))
		},

		// builds progress bar
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

		//general function to build a new zone entry.

		buildZoneEntry: function(newZones){

			// name of zone
			newZones
				.attr('id', d=>`entry${d.startTime}`)
				.append('span')
				.attr('class', 'zoneName')
				.text(d=>`${d.type} zone`);

			// gear icon toggle for actions
			newZones
				.append('span')
				.attr('class', 'fr onlyWhenRunning')
				.attr('href', d=>`#entry${d.startTime}`)
				.on('mousedown', (d,i)=>{
					var id = d.startTime; 
					d3.selectAll('#zones .entry')
					.classed('active', (d, entryIndex)=>{return d.startTime === id})
				})
				.append('img')
				.attr('class', 'icon fa-cog')
				.attr('src', 'static/images/cog.svg')

			// build progress bar
			app.ui.progressBar.build(newZones)

			// add text below progress bars
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

		// update UI. generally fired after a zone is added, deleted or completed

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

		// sets the current mode of the app, and updates title

		mode:  {
			set: function(mode) {

				app.ui.reset();
				d3.select('#modes')
					.style('transform', `translateX(-${app.constants.modes[mode].view*(100/Object.keys(app.constants.modes).length)}%)`);
				
				app.state.mode = mode;

				// apply any custom functions for mode
				if (app.constants.modes[mode].set) app.constants.modes[mode].set()

				// update title
				d3.select('#title')
					.text(app.constants.modes[mode].title)
			},

		},

		// functionality for the back button, conditional on the current mode

		back: function() {

			var modes = Object.keys(app.constants.modes);
			var modeIndex = modes.indexOf(app.state.mode)-1;
			var newMode = modes[modeIndex];

			// set mode as one previous in list, unless there's a custom back() function
			var customFn = app.constants.modes[app.state.mode].back;
			var executeCustomFn = customFn ? customFn() : app.ui.mode.set(newMode)

		},

		// produces a confirm dialog, with callbacks for cancel and ok

		confirm: function(text, ok, cancel) {

			var confirmed = confirm(text);
			if (confirmed === true) ok()
			else if (cancel) cancel()

		},

		// general UI reset: collapses any open action drawers, removes curb arrows from map

		reset: function(){
			d3.select('.active')
				.classed('active', false);
		}
	},

	// initializes UI: populates curb attributes, builds modals

	init: function() {

		//populate street length
		d3.select('#curbLength')
			.text(Math.round(app.state.street.distance))

		d3.select('#curbEntry .progressBar')
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

		app.ui.mode.set(app.state.mode)

		// set upload functionality
		document.getElementById('uploadImg')
			.addEventListener('change', app.io.uploadImage, false);
	}, 

	io: {

		uploadImage: (e) => {
			document.querySelector('#imageSubmit').click();
		},

		uploadSurvey: () => {

			var oReq = new XMLHttpRequest();
			oReq.open("POST", 'http://localhost:8081/survey');
			oReq.responseType = 'json';
			oReq.send(app.state.zones);

		},

		loadJSON: (path, success, error) => {
			var xhr = new XMLHttpRequest();
				xhr.onreadystatechange = function()
				{
					if (xhr.readyState === XMLHttpRequest.DONE) {
						if (xhr.status === 200) {
							if (success)
								success(JSON.parse(xhr.responseText));
								} else {
									if (error)
									error(xhr);
								}
					}
				};
				xhr.open("GET", path, true);
				xhr.send();
        },

        getWheelTick: () =>{
        	app.io.loadJSON('/counter', (data)=>{
        		app.state.currentRollDistance = (data.counter) / 10
        		app.ui.roll()
        	})
        }
	},

	util: {
		copy: function(original){
			return JSON.parse(JSON.stringify(original))
		}
	},

	devMode: {
		rolling: false,
		init: function(){


			app.init();
			setInterval(()=>{app.io.getWheelTick()}, 500)
			// this.dummyRolling();

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
				if (app.devMode.rolling){
					app.state.currentRollDistance+=Math.random()/2
					app.ui.roll();
				}
			}, 1000)
		},		
	}
}



app.devMode.init();
