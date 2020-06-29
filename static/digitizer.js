var app = {

	state: {
		activeFeatureIndex: 0,
	},

	ui: {

		entry: {
			updateRegulation: (entries) =>{
				
				var rules = entries
					.select('.rules')
					.selectAll('.rule')
					.data(d=>d.properties.regulations)
					.enter()
					.append('div')
					.attr('class', 'rule mt10')

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
					.text(d=> d%60 === 0 ? `${d/60} hour` : d)
			}
		}
	},
	constants: {

		ui: {
			entryParams: [
				{
					param: 'shstRefId',
					inputProp: 'shst_ref_id',
					output: 'location'
				},

				{
					param: 'sideOfStreet',
					inputProp: 'ref_side',
					output: 'location'
				},

				{
					param: 'shstLocationStart',
					inputProp: 'dst_st',
					output: 'location'
				},			
				{
					param: 'shstLocationEnd',
					inputProp: 'dst_end',
					output: 'location'
				},			
				{
					param: 'assetType',
					output: 'location',
					propagates: {
						param: 'assetSubtype',
						output: 'location'
					}
				},					

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
				}
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
				subParameter: 'assetSubtype',
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
					{
						value: 'pavement marking',
						subValues: [
							'ramp', 
							'driveway', 
							'street'
						]
					},
					{
						value: 'curb cut',
						subValues: [
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
					}
				],
				allowCustomValues: false,

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
				// TODO: rates/durations
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


	