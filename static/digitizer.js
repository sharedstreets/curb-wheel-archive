var app = {

	state: {
		activeFeatureIndex: 0,
	},

	ui: {

		entry: {

			applyPropagations: function(d,i) {
				var entry = d3.select(this)

				app.constants.ui.entryPropagations
					.forEach(propagation=>{
						entry.select(`div[prop=${propagation.originProp}] select`)
							.on('change', updateDestination)


						function updateDestination(d,i){
							
							var parentValue = d3.select(this).property('value');
							var propagatingRule = propagation.propagatingValues[parentValue] || false;
							var prop = entry.select(`div[prop=${propagation.destinationProp}]`)
								
							prop
								.classed('hidden', !propagatingRule)
							if (propagatingRule) {
								var input = prop.select('input')
									.attr('placeholder', propagatingRule.placeholder)
									.property('value', '')
									.node()

								if (propagatingRule.values) autocomplete(input, propagatingRule.values)
								
								input.focus();
							}
						}
					})
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
					.data(app.constants.ui.ruleParams)
					.enter()
					.append('div')
					.attr('class', 'property p10');

				props
					.append('div')
					.attr('class', 'mr10 inlineBlock quiet')
					.text(d=>d.param);

				props
					.append('select')
					.attr('class', 'fr')
					.on('change', ()=>{
						console.log(d3.select(this).property('value'))
					})
					.selectAll('option')
					.data(d=>app.constants.validate[d.param].oneOf)
					.enter()
					.append('option')
					.attr('value', d=>d)
					.text(d=>d)
			}
		}
	},
	constants: {

		ui: {

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
					inputProp: 'shst_ref_id',
					output: 'location'
				},

				{
					param: 'sideOfStreet',
					placeholder: 'street side',
					inputProp: 'ref_side',
					output: 'location'
				},

				{
					param: 'shstLocationStart',
					placeholder: 'start of regulation',
					inputProp: 'dst_st',
					output: 'location'
				},			
				{
					param: 'shstLocationEnd',
					placeholder: 'end of regulation',
					inputProp: 'dst_end',
					output: 'location'
				},			
				{
					param: 'assetType',
					output: 'location',
				},
				{
					param: 'assetSubtype',
					output: 'location',
					defaultHidden: true
				}					

			],

			ruleParams: [
				{
					param: 'activity',
					output: ['regulation', 'rule']
				},	
				{
					param: 'maxStay',
					output: ['regulation', 'rule']
				},	
				{
					param: 'userClasses',
					output: ['regulation', 'rule']
				},
				{
					param: 'payment',
					output: ['regulation', 'rule']
				},
			]
		},


		validate: {

			shstRefId: {
				type: 'string'
			},

			sideOfStreet: {
				type: 'string',
				oneOf: ['left', 'right', 'unknown'],
				allowCustomValues: false
			},

			shstLocationStart: {
				type: 'number'
			},	

			shstLocationEnd: {
				type: 'number',
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

				allowCustomValues: false,
				subParameter: 'assetSubtype',

			},

			assetSubtype: {
				allowCustomValues: true,
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
				allowCustomValues: false
			},
			
			maxStay: {
				type: 'number',
				oneOf: [5, 10, 15, 20, 30, 45, 60, 120, 180, 240, 300, 360, 480],
				allowCustomValues: false

			},

			payment: {
				type: 'number',
				oneOf: [false, true],
				allowCustomValues: false
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
				allowCustomValues: true
			},

			userSubclasses: {
				conditionalOn: 'userClasses',
				values: {}, // TODO: add subclasses
				allowCustomValues: true
			}
		},

		regulation: {

		}
	}
}


	