var app = {

	state: {
		activeFeatureIndex: 0,
	},

	ui: {

		entry: {

			appendProperty: function(d,i) {

				var container = d3.select(this)

				// append label
				container
					.attr('prop', d.param)
					.append('div')
					.attr('class', 'mr10 inlineBlock quiet p10')
					.text(d.param);

				var validate = app.constants.validate[d.param];

				if (validate.inputType === 'text') appendInput()
				else if(validate.inputType === 'dropdown') appendDropdown();

				else {

					if (validate.allowCustomValues === false) appendDropdown()
					else appendInput()
				}


				function appendInput(){

					var validate = app.constants.validate[d.param];

					var textInput = 
					container
						.append('div')
						.attr('class', 'fr')
						.style('width', '50%')
							.append('div')
							.attr('class', 'autocomplete')
							.style('width', '100%')
							.append('input')
							.attr('prop', d.param)
							.attr('type', validate.type)
							.attr('class', 'fr')
							.attr('onclick', 'this.setSelectionRange(this.value.length, this.value.length)')
							.attr('placeholder', d.placeholder)


					if (validate.oneOf) {

						autocomplete(

							textInput.node(), 
							{
								values: validate.oneOf,
								match: 'any',
								onEnter: app.utils.autocomplete.keepTyping, 
								inputTransform: app.utils.autocomplete.lastListItem,
								outputTransform: app.utils.autocomplete.returnFullListString
							}
						)
					}

					return textInput
				}
				
				function appendDropdown(){

					var dropdown = container
						.append('select')
						.attr('prop', d.param)
						.attr('class', 'fr m10')

					dropdown
						.selectAll('option')
						.data(validate.oneOf)
						.enter()
						.append('option')
						.attr('value', function(d){return d})
						.text(d=>d)

					return dropdown
				}

			},


			onChange: function(d,i){

				var entry = d3.select(this)

				entry.selectAll('input, select')
					.on('change', c)
					.on('keyup', c)
				function c(data){

					var prop = d3.select(this).attr('prop')
					var value = d3.select(this).property('value')

					var target = d;
					var subdirectory = app.constants.validate[prop].output
					for (item of subdirectory) target = target[item === '_index' ? i : item]

					// apply transform function if there is one
					var tfFn = app.constants.validate[prop].transform;
					target[prop] = tfFn ? tfFn(value) : value;


					// propagations
					var propagationEntry = app.constants.ui.entryPropagations[prop]; 
					if (propagationEntry) {
						
						var propagatingRule = propagationEntry.propagatingValues[value] || false;
						var destination = entry.select(`div[prop=${propagationEntry.destinationProp}]`)
						
						destination
							.classed('hidden', !propagatingRule)

						if (propagatingRule) {

							var input = destination.select('input')
								.attr('placeholder', propagatingRule.placeholder)
								.property('value', '')
								.node()


							autocomplete(input, {
								values: propagatingRule.values || []
							})
							
							input.focus();
						}
					}


				}
			},

			updateRegulation: (entries) =>{
				
				var rules = entries
					.select('.rules')
					.selectAll('.rule')
					.data(d=>d.output.regulations)
					.enter()
					.append('div')
					.attr('class', 'rule m10')

				var props = rules
					.selectAll('.property')
					.data(d=>app.constants.ui.regulationParams.map(obj=>{
						return {param: obj.param, value: d.rule[obj.param], placeholder: obj.placeholder}
					}))
					.enter()
					.append('div')
					.attr('class', 'property')
					.each(app.ui.entry.appendProperty)
					.select('input, select')

				return rules
			}
		}
	},
	constants: {

		ui: {

			entryPropagations: {
				assetType: {
					destinationProp: 'assetSubtype',
					propagatingValues: {

						'pavement marking': {
							placeholder: 'Marking type',
							values: [
								'ramp', 
								'driveway', 
								'street'
							]
						},

						'curb cut': {
							placeholder: 'Cut type',
							values: [
								'bike', 
								'bus', 
								'taxi', 
								'arrow', 
								'diagonal lines', 
								'zigzag', 
								'parallel parking', 
								'perpendicular parking', 
								'yellow', 
								'red', 
								'blue', 
								'ISA'
							]
						},

						'curb paint': {
							placeholder: 'Paint color'
						},
					}					
				}
			},

			entryParams: [
				{
					param: 'shstRefId',
					placeholder: 'unique identifier',
					inputProp: 'shst_ref_id'
				},

				{
					param: 'sideOfStreet',
					placeholder: 'street side',
					inputProp: 'ref_side'
				},

				{
					param: 'shstLocationStart',
					placeholder: 'start of regulation',
					inputProp: 'dst_st'
				},			
				{
					param: 'shstLocationEnd',
					placeholder: 'end of regulation',
					inputProp: 'dst_end'
				},			
				{
					param: 'assetType'
				},
				{
					param: 'assetSubtype',
					defaultHidden: true
				}					

			],

			regulationParams: [
				{
					param: 'activity'
				},	
				{
					param: 'maxStay'
				},	
				{
					param: 'userClasses',
					placeholder: 'Comma-delimited values'
				},
				{
					param: 'userSubClasses',
					placeholder: 'Comma-delimited values'
				},
				{
					param: 'payment'
				},


				{
					param: 'daysOfWeek',
					// inputType: 'text',
					placeholder: 'Comma-delimited values'
				},
				{
					param: 'timesOfDay',
					placeholder: 'Comma-delimited, each in HH:MM-HH:MM'				
				}
			]
		},


		validate: {

			shstRefId: {
				type: 'string',
				output: ['output', 'location']
			},

			sideOfStreet: {
				type: 'string',
				output: ['output', 'location'],
				oneOf: ['left', 'right', 'unknown'],
				allowCustomValues: false
			},

			shstLocationStart: {
				type: 'number',
				output: ['output', 'location'],
				transform: (input) => parseFloat(input)
			},	

			shstLocationEnd: {
				type: 'number',
				output: ['output', 'location'],
				transform: (input) => parseFloat(input)
			},	

			assetType: {
				type: 'string', 
				oneOf: [
					'sign', 
					'curb paint', 
					'hydrant', 
					'bus stop', 
					'crosswalk', 
					'bike rack', 
					'curb extension', 
					'bollards', 
					'fence', 
					'parking meter',
					'pavement marking',
					'curb cut'
				],
				output: ['output', 'location'],
				allowCustomValues: false,
				subParameter: 'assetSubtype',

			},

			assetSubtype: {
				allowCustomValues: true,
				output: ['output', 'location'],
			},

			activity: {
				oneOf: [
					'standing', 
					'no standing', 
					'loading', 
					'no loading', 
					'parking', 
					'no parking'
				],
				allowCustomValues: false,
				output: ['rule']
			},
			
			maxStay: {
				type: 'number',
				oneOf: [5, 10, 15, 20, 30, 45, 60, 120, 180, 240, 300, 360, 480],
				allowCustomValues: false,
				output: ['rule']
			},

			payment: {
				type: 'number',
				oneOf: [false, true],
				allowCustomValues: false,
				output: ['rule']
			},

			userClasses: {
				oneOf: [
					'bicycle', 
					'bikeshare', 
					'bus', 
					'car share', 
					'carpool', 
					'commercial', 
					'compact', 
					'construction', 
					'diplomat', 
					'electric', 
					'emergency', 
					'food truck', 
					'handicap', 
					'micromobility', 
					'motorcycle', 
					'official', 
					'passenger', 
					'permit', 
					'police', 
					'rideshare', 
					'staff', 
					'student', 
					'taxi', 
					'truck', 
					'visitor'
				],
				output: ['rule'],
				allowCustomValues: true,
				transform: (input) =>{
					return input.split(', ')
				}
			},

			userSubClasses: {
				type: 'array',
				arrayMemberType: 'string',
				allowCustomValues: true,
				output: ['rule'],
				transform: (input) =>{
					return input.split(', ')
				}
			},

			daysOfWeek: {
				type: 'array',
				arrayMemberType:'string',
				allowCustomValues: false,
				inputType: 'text',
				oneOf: ['mo', 'tu', 'we', 'th', 'fr', 'sa', 'su'],
				transform: (input) =>{
					return input.split(', ')
				},
				output: ['rule']
			},

			timesOfDay: {
				type: 'array',
				arrayMemberType:'string',
				allowCustomValues: true,
				transform: (input)=>{
					var arr = input.split(', ')
						.map(period=>{
							var startEnd = period.split('-');
							return {
								start: startEnd[0],
								end: startEnd[1]
							}
						})

					return arr
				},
				output: ['rule']
			}
		},

		regulation: {

		}
	},

	io: {

		export: () => {

			app.state.data.features = app.state.data.features.map(ft => {

				ft = {
					geometry: ft.geometry,
					properties: ft.output
				}

				return ft
			})

			var element = document.createElement('a');

			const blob = new Blob([JSON.stringify(app.state.data)], {type: "application/json"});
			var url = window.URL.createObjectURL(blob);
			
			element.setAttribute('href', url);
			element.setAttribute('download', 'curblr_'+Date.now()+'.json');

			element.style.display = 'none';
			document.body.appendChild(element);

			element.click();
		    document.body.removeChild(element);
		}

	},


	init: {

		map: () => {

			mapboxgl.accessToken = "pk.eyJ1IjoibW9yZ2FuaGVybG9ja2VyIiwiYSI6Ii1zLU4xOWMifQ.FubD68OEerk74AYCLduMZQ";

			var map = new mapboxgl.Map({
				container: 'map',
				style: 'mapbox://styles/mapbox/light-v9'
			})
			.on('load', () => {

				map.fitBounds(turf.bbox(app.state.data), {duration:200, padding:100});
				map
					// .addLayer({
					// 	id: 'spans', 
					// 	type: 'fill-extrusion', 
					// 	source: {
					// 		type:'geojson',
					// 		data: data
					// 	},
					// 	paint: {
					// 		'fill-extrusion-color':'red',
					// 		'fill-extrusion-base': 2,
					// 		'fill-extrusion-height':10,
					// 		// 'line-width':5,
					// 		'fill-extrusion-opacity':0.2
					// 	}
					// })
					.addLayer({
						id: 'spans', 
						type: 'line', 
						source: {
							type:'geojson',
							data: app.state.data
						},
						layout: {
							'line-cap':'round'
						},
						paint: {
							'line-color': [
								'match',
								['get', 'id'],
								0, 'steelblue',
								'#ccc'
							],
							'line-width':{
								base:2,
								stops: [[6, 1], [22, 80]]
							},
							'line-opacity':0.75,
							'line-offset': {
								base:2,
								stops: [[12, 3], [22, 100]]
							}
						}
					})
			})

			app.ui.map = map;
		},

		ui: () =>{

			// prep data
			app.state.data.features.forEach((d,i)=>{

				d.properties.id = i;
				d.properties.images = JSON.parse(d.properties.images);
				
				//create separate object for curblr properties
				d.output = {
					regulations:[],
					location:{}
				}

				// extract survey values into curblr
				app.constants.ui.entryParams
					.forEach(param=>{
						d.output.location[param.param] = d.properties[param.inputProp]
					})

			})

			d3.select('#map')
				.append('div')
				.attr('class', 'button pin-tl z100 inlineBlock p10 strong m10')
				.text('Export CurbLR')
				.attr('onclick', 'app.io.export()')


			var entries = 

				d3.select('#dataPanel')
					.selectAll('.entry')
					.data(app.state.data.features, d=>d.id)
					.enter()
					.append('div')
					.attr('class', 'entry m20')
					.on('mouseenter', (d,i) => {

						app.state.activeFeatureIndex = i;

						var makeRule = (active, inactive) =>{
							return [
								'match',
								['get', 'id'],
								app.state.activeFeatureIndex, active,
								inactive
							]
						}

						app.ui.map.setPaintProperty('spans', 'line-color', makeRule('steelblue', '#ccc'))
							// .setPaintProperty('spans', 'line-width', makeRule(
							// 	80,
							// 	['interpolate', ['exponential', 2], ['zoom'], 6,1,22,80],
							// ))
					})



				entries
					.append('div')
					.text(d => d.properties.label)
					.attr('class', 'm10 blue strong')


				var params = 
					entries
						.selectAll('.property')
						.data(d=>app.constants.ui.entryParams.map(obj=>{
							var param = obj.param
							return {
								param: param, 
								value: d.output.location[param], 
								placeholder:obj.placeholder, 
								hidden: obj.defaultHidden
							}
						}))
						.enter()
						.append('div')
						.attr('class', 'property')
						.classed('hidden', d=>d.hidden)

				params
					.each(app.ui.entry.appendProperty)

				entries
					.each(prepopulateProperties)
					.each(app.ui.entry.onChange)

				function prepopulateProperties(d,i){
						d3.select(this)
						.selectAll('.property')
						.select('input, select')
						.property('value', d=>d.value)
				};


				var regulations = 
				entries
					.append('div')
					.attr('class', 'property')

				regulations
					.append('div')
					.attr('class', 'mr10 inlineBlock quiet p10')
					.text('regulations');

				regulations
					.append('div')
					.text('Add')
					.attr('class', 'fr clickable p10')
					.on('click', (d,i) => {

						d.output.regulations.push({
							rule: {
								activity: 'standing',
								// priorityCategory: null, 
								maxStay: 5, 
								payment: false,
								userClasses: [],
								userSubClasses: [],
								daysOfWeek: [],
								timesOfDay: []
							},

							timeSpans: [
							]
						})

						app.ui.entry
							.updateRegulation(entries)
							.each(app.ui.entry.onChange)
					})

				regulations
					.append('div')
					.attr('class', 'rules')

				var images = 
				entries
					.append('div')
					.attr('class', 'images p10 property')

				images
					.append('div')
					.attr('class', 'mr10 quiet mb10')
					.text('images');
				images
					.selectAll('img')
					.data(d=>d.properties.images)
					.enter()
					.append('div')
					.style('background-image', d=>`url(${d.url})`)
					.attr('class', 'inlineBlock image mr10')
			
		}
	},

	utils: {

		autocomplete: {

			// return the last item in a comma-delimited list, for autocomplete input
			lastListItem: (listString)=>{

				var lastItemStart = listString.lastIndexOf(', ')
				if (lastItemStart ===-1) return listString

				var arrayed = listString.split(', ')
				var lastItem = arrayed[arrayed.length-1] 

				return lastItem
			},

			// returns a transformed value from an autocomplete selection

			returnFullListString: (listString, matchedItem) =>{

				var lastItemStart = listString.lastIndexOf(', ')
				if (lastItemStart ===-1) return matchedItem

				var arrayed = listString.split(', ')
				arrayed[arrayed.length-1] = matchedItem

				return arrayed.join(', ')
			},

			// empty function to keep typing stringed arrays when pressing enter button 

			keepTyping: (input) =>{
				// input.value += ', '
			}

		}
	}
}


	