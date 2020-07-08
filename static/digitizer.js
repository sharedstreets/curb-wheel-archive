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

				if (d.inputType === 'text') appendInput()
				else if(d.inputType === 'dropdown') appendDropdown();

				else {
					var validate = app.constants.validate[d.param];

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
							// .on('change', onChange)

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
						// .on('change', onChange);

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

				function c(data){

					var prop = d3.select(this).attr('prop')
					var value = d3.select(this).property('value')

					var target = d.properties;
					var subdirectory = app.constants.validate[prop].output
					console.log(prop, subdirectory)
					for (item of subdirectory) target = target[item === '_index' ? i : item]
					target[prop] = value;


					// propagations
					var propagationEntry = app.constants.ui.eP[prop]; 
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
					.data(d=>d.properties.regulations)
					.enter()
					.append('div')
					.attr('class', 'rule m10')

				var props = rules
					.selectAll('.property')
					.data(app.constants.ui.regulationParams)
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

			eP: {
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

			entryPropagations: [{

				originProp: 'assetType',
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
			}],

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
					param: 'userSubclasses',
					placeholder: 'Comma-delimited values'
				},
				{
					param: 'payment'
				},


				{
					param: 'daysOfWeek',
					inputType: 'text',
					placeholder: 'Comma-delimited values'
				},
				{
					param: 'timesOfDay',
					placeholder: 'HH:MM-HH:MM, comma-separated'				
				}
			]
		},


		validate: {

			shstRefId: {
				type: 'string',
				output: ['location']
			},

			sideOfStreet: {
				type: 'string',
				output: ['location'],
				oneOf: ['left', 'right', 'unknown'],
				allowCustomValues: false
			},

			shstLocationStart: {
				type: 'number',
				output: ['location']
			},	

			shstLocationEnd: {
				type: 'number',
				output: ['location']
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
				output: ['location'],
				allowCustomValues: false,
				subParameter: 'assetSubtype',

			},

			assetSubtype: {
				allowCustomValues: true,
				output: ['location']
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
				output: ['regulation', '_index']
			},
			
			maxStay: {
				type: 'number',
				oneOf: [5, 10, 15, 20, 30, 45, 60, 120, 180, 240, 300, 360, 480],
				allowCustomValues: false,
				output: ['regulation', '_index']
			},

			payment: {
				type: 'number',
				oneOf: [false, true],
				allowCustomValues: false,
				output: ['regulation', '_index']
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
				output: ['regulation', '_index'],
				allowCustomValues: true,
				transform: (input) =>{
					return input.split(', ')
				}
			},

			userSubclasses: {
				type: 'array',
				arrayMemberType: 'string',
				allowCustomValues: true,
				output: ['regulation', '_index'],
				transform: (input) =>{
					return input.split(', ')
				}
			},

			daysOfWeek: {
				type: 'array',
				arrayMemberType:'string',
				allowCustomValues: false,
				oneOf: ['mo', 'tu', 'we', 'th', 'fr', 'sa', 'su'],
				transform: (input) =>{
					return input.split(', ')
				},
				output: ['regulation', '_index', 'timeSpan']
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
				output: ['regulation', '_index', 'timeSpan']
			}
		},

		regulation: {

		}
	},

	io: {
		export: () =>{

			var output = []
			d3.selectAll('.entry')
				.each(scrape)

			function scrape(d,i,j){

				output[i] = {};

				d3.select(this)
					.selectAll('.property')
					.attr('f', (d)=>{
						var value = this.select('input').property('value')
						output[i][d.param] = value
					})
			}

			console.log(output)
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


	