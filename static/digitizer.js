var app = {

	state: {
		activeFeatureIndex: 0,
		templates: {
			regulations:{},
			timeSpans:{}
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
								base:1.5,
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

			var data = app.state.data.features
					.map((f,i)=>[f.properties.label, f.properties.ref_side, undefined, undefined, `#${i+1}`])
			
			// BUILD FILTERS

			var setupFilter = ()=>{

				// Event for `keydown` event. Add condition after delay of 200 ms which is counted from time of last pressed key.
				var debounceFn = Handsontable.helper.debounce(function (colIndex, event) {
					var filtersPlugin = featuresList.getPlugin('filters');

					filtersPlugin.removeConditions(colIndex);
					filtersPlugin.addCondition(colIndex, 'contains', [event.target.value]);
					filtersPlugin.filter();
					}, 200);

					var addEventListeners =  (input, colIndex) => {
						input.addEventListener('keydown', event => debounceFn(colIndex, event));
					};

				// Build elements which will be displayed in header.
				var getInitializedElements = function(colIndex) {
					var div = document.createElement('div');
					var input = document.createElement('input');
					input.placeholder = 'Filter by label'
					div.className = 'filterHeader';

					addEventListeners(input, colIndex);

					div.appendChild(input);

					return div;
				};

				document.querySelector('#featureFilter')
					.appendChild(getInitializedElements(0));
			}

			setupFilter()

			var featuresList = new Handsontable(

				document.getElementById('featuresList'), 

				{
				
					data: data,
					minRows:10,
					rowHeaders: true,
					colHeaders: app.constants.properties.concat('regulationsTemplate'),
					filters: true,
					cells: (row, col, prop) => {
						if (row>=app.state.data.features.length) return {readOnly:true, placeholder: undefined, type:null, source:undefined}
					},

					columns:[
						{
							contextMenu:['filter_by_value']
						},
						{
							type: 'dropdown',
							source: app.constants.validate.sideOfStreet.oneOf,
							strict: true,
							filter:true,
							visibleRows: 4
						},
						{
							type: 'autocomplete',
							source: app.constants.validate.assetType.oneOf,
							filter:true,							
							strict: true,
							visibleRows: 20,
						},					
						{
							type: 'autocomplete',
							readOnly: true,
							placeholder: 'NA',
							visibleRows: 20,
						},

						{
							type: 'text',
							className:'htCenter'
						}
					],

					afterChange: (changes) => {

						if (changes) {
							
							var assetSubtypeWasChanged = changes
								.map(change=>change[1])
								.some(col=>col===2)

							//propagate assetType to assetSubType
							if (assetSubtypeWasChanged) {

								var data = featuresList.getSourceData();
								var cellsToClear = []

								featuresList.updateSettings({

									cells: (row, col, prop) => {

										var cellProperties = {}
									    
										// if currently at assetSubType column
									    if (col === 3) {

											var parentValue = data[row][col-1];
											var propagatingRule = app.constants.ui.entryPropagations.assetType.propagatingValues[parentValue]
									    	
									    	// if assetType is a value that allows subtype (indicated by presence of propagating rule)
									    	if (propagatingRule){
												cellProperties = {
													readOnly:false, 
													type: propagatingRule.values ? 'autocomplete' : 'text', 
													source: propagatingRule.values,
													placeholder: propagatingRule.placeholder
												}
									    	}
											
											// if subtype not allowed, clear value
											else cellsToClear.push([row, col])		
									    }
										
										if (row>=app.state.data.features.length) {
											cellProperties.readOnly =true; 
											cellProperties.type = null;
											cellProperties.placeholder = undefined
										}


									    return cellProperties;
									}
								})

								cellsToClear
									.forEach(
										array=>featuresList.setDataAtCell(array[0], array[1], undefined)
									)

							}
							
						}

					},

					afterSelection: (row, column, row2, column2, preventScrolling, selectionLayerLevel) => {
						var populateRegulations = column === 4
						if(populateRegulations) app.setState('activeFeatureIndex', featuresList.toPhysicalRow(row), populateRegulations)
					},

					stretchH:'all',
					licenseKey: 'non-commercial-and-evaluation'
				}
			);
		
			var regulationsList = new Handsontable(

				document.getElementById('regulationsList'), 
				{
					dataSchema: ()=>{
						
						var pattern = {}
						app.constants.ui.regulationParams
							.forEach(key=>pattern[key.param] = null)

						return pattern
					},
					minRows:10,
					rowHeaders: true,
					colHeaders: app.constants.ui.regulationParams.map(p=>p.param),
					columns: [
						{
							type: 'dropdown',
							source: app.constants.validate.activity.oneOf,
							strict: true,
							visibleRows: 15
						},
						{
							type: 'dropdown',
							source: app.constants.validate.maxStay.oneOf,
							strict: true,
							visibleRows: 15
						},
						{
							type: 'checkbox',
							width:60
						},	
						{},
						{},					
						{}
					],
					afterSetDataAtCell: () =>{

							setTimeout(()=>{
								var templateIndex = app.ui.featuresList.getSourceDataAtCell(app.state.activeFeatureIndex, 4);
								app.state.templates.regulations[templateIndex] = regulationsList.getSourceData()
							},1)
						
					},

					afterSelection: (row, column) => {
						var populateTimeSpans = column === 5
						if(populateTimeSpans) app.setState('activeRegulationIndex', app.ui.regulationsList.getSourceDataAtCell(row, 5), populateTimeSpans)
					},

					stretchH:'all',
					licenseKey: 'non-commercial-and-evaluation'
				}
			)

			var timeSpansList = new Handsontable(

				document.getElementById('timeSpansList'), 
				{
					minRows:10,
					dataSchema: ()=>{
						
						var pattern = {}
						app.constants.validate.daysOfWeek.oneOf
							.forEach(key=>pattern[key] = null)

						return pattern
					},
					rowHeaders: true,
					colHeaders: true,
					nestedHeaders:[
						[	
							{label: 'timeOfDay', colspan:6},
							{label: 'Occurring each', colspan:17}
						],

						[
							{label: 'span', colspan:2},
							{label: 'span', colspan:2},
							{label: 'span', colspan:2},
							{label: 'week', colspan:7},
							{label: 'month', colspan:6},
							{label: 'date range', colspan:2},
							{label: 'event', colspan:2},
						],
						
						['start', 'end']
							.concat(['start', 'end'])
							.concat(['start', 'end'])						
							.concat(app.constants.validate.daysOfWeek.oneOf)
							.concat(app.constants.validate.occurrencesInMonth.oneOf)
							.concat(['from', 'to'])
							.concat(['apply', 'event'])
						
					],
					columns: new Array(6).fill({
							type: 'time',
							timeFormat:'HH:mm',
							correctFormat: true,
							width:80
						})
						.concat(
							app.constants.validate.daysOfWeek.oneOf
								.map(day=>{
									return {
										data: day,
										type: 'checkbox',
										width:50
									}
								})
						)
						.concat(app.constants.validate.occurrencesInMonth.oneOf
							.map(occurrence=>{
								return {
									data: occurrence,
									type: 'checkbox',
									width:50
								}
							})
						)
						.concat(['from', 'to']
							.map(endpoint=>{
								return {
									data: endpoint,
									type: 'text',
									width:80
								}
							})
						)
						.concat(['apply', 'event']
							.map(item=>{
								return {
									data: item,
									type: 'text',
									width:80
								}
							})
						),
					collapsibleColumns: app.constants.timeSpansCollapsingScheme,
					stretchH:'all',
					licenseKey: 'non-commercial-and-evaluation',

					afterSetDataAtCell: () =>{

							setTimeout(()=>{
								var templateIndex = app.ui.regulationsList.getSourceDataAtCell(app.state.activeFeatureIndex, 5);
								app.state.templates.timeSpans[templateIndex] = timeSpansList.getSourceData()
							}, 1)
						
					}
				}
			)

			app.constants.timeSpansCollapsingScheme
				.forEach(item =>timeSpansList.getPlugin('collapsibleColumns').collapseSection(item))

			app.ui.featuresList = featuresList;
			app.ui.regulationsList = regulationsList;
			app.ui.timeSpansList = timeSpansList;
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
	},

	setState: (key, value, updatePanel) => {

		if (key === 'activeFeatureIndex') {

			if (updatePanel === true) {

				d3.select('#regulations')
					.classed('invisible', false);
				var regulationTemplateName = app.ui.featuresList.getSourceDataAtCell(value, 4)
				var regulationTemplate = app.state.templates.regulations[regulationTemplateName];
				regulationTemplate = regulationTemplate ? regulationTemplate.map(row=>Object.values(row)) : []
				app.ui.regulationsList.loadData(regulationTemplate)
				
				app.ui.regulationsList.render();
			}


			d3.select('#featureIndex')
				.text(regulationTemplateName);

			app.ui.map
				.setPaintProperty('spans', 'line-color',
					[
						'match',
						['get', 'id'],
						value, 'steelblue',
						'#ccc'
					]
				);

			var images = d3.selectAll('#images')
				.selectAll('img')
				.data(
					app.state.data.features[value]
						.properties.images.map(img=>img.url)
				)

			images
				.enter()
				.append('img')
				.attr('src', d=>d)
				.attr('class','inlineBlock mr10 image');

			images
				.exit()
				.remove()
		}

		else if (key === 'activeRegulationIndex') {

			if (updatePanel === true) {
				d3.select('#timespans')
					.classed('invisible', false)

				var timeSpanTemplate = app.state.templates.timeSpans[value];
				timeSpanTemplate = timeSpanTemplate ? timeSpanTemplate.map(row=>Object.values(row)) : []
				app.ui.timeSpansList.loadData(timeSpanTemplate)		
				app.ui.timeSpansList.render();

				d3.select('#timeSpanTemplate')
					.text(value);
			}
		}

		app.state[key] = value;
	},

	ui:{},
	constants: {

		properties: [
			'label',
			'sideOfStreet',
			'assetType',
			'assetSubtype'
		],

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
					param: 'payment'
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
					param: 'timeSpanTemplate'
				}
			],

			timeSpanParams: [
				{
					param: 'daysOfWeek',
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
				transform: input => parseFloat(input)
			},	

			shstLocationEnd: {
				type: 'number',
				output: ['output', 'location'],
				transform: input => parseFloat(input)
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
				transform: input => input.split(', ')
			},

			userSubClasses: {
				type: 'array',
				arrayMemberType: 'string',
				allowCustomValues: true,
				output: ['rule'],
				transform: input => input.split(', ')
			},

			daysOfWeek: {
				type: 'array',
				arrayMemberType:'string',
				allowCustomValues: false,
				inputType: 'text',
				oneOf: ['mo', 'tu', 'we', 'th', 'fr', 'sa', 'su'],
				transform: input => input.split(', '),
				output: ['rule']
			},
			occurrencesInMonth: {
				type: 'array',
				arrayMemberType:'string',
				allowCustomValues: false,
				inputType: 'text',
				oneOf: ['1st', '2nd', '3rd', '4th', '5th', 'last'],
				transform: input => input.split(', '),
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

		timeSpansCollapsingScheme: [
			{row: -3, col: 0, collapsible: true},
			{row: -3, col: 6, collapsible: true}
		],
		regulation: {

		}
	},
}


	