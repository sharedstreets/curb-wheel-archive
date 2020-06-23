var app = {
	constants: {
		location: {

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
				type: 'number'
			},	

			assetType: {
				type: 'string', 
				oneOf: [
					'sign', 
					'curb paint', 
					'curb cut',
					'hydrant', 
					'bus stop', 
					'pavement marking', 
					'crosswalk', 
					'bike rack', 
					'curb extension', 
					'bollards', 
					'fence', 
					'parking meter'
				],
				allowCustomValues: false
			},

			assetSubtype: {
				conditionalOn: 'assetType',
				values :{
					'curb cut': {
						oneOf: ['bike', 'bus', 'taxi', 'arrow', 'diagonal lines', 'zigzag', 'parallel parking', 'perpendicular parking', 'yellow', 'red', 'blue', 'ISA'],
						allowCustomValues: true
					},
					'pavement marking': {
						oneOf: ['ramp', 'driveway', 'street'],
						allowCustomValues: true
					}
				}
			}
		},

		regulation: {
			rule: {
				
				activity: {
					oneOf: ['standing', 'no standing', 'loading', 'no loading', 'parking', 'no parking']
					allowCustomValues: false
				},
				
				maxStay: {
					type: 'number',
					oneOf: [5, 10, 15, 20, 30, 45, 60, 120, 180, 240, 300, 360, 480],
					allowCustomValues: false

				},

				payment: {
					// TODO: rates/durations
				}
			}

			userClasses: {
				oneOf: ['bicycle', 'bikeshare', 'bus', 'car share', 'carpool', 'commercial', 'compact', 'construction', 'diplomat', 'electric', 'emergency', 'food truck', 'handicap', 'micromobility', 'motorcycle', 'official', 'passenger', 'permit', 'police', 'rideshare', 'staff', 'student', 'taxi', 'truck', 'visitor'],
				allowCustomValues: true
			}

			userSubclasses: {
				conditionalOn: 'userClasses',
				values: {}, // TODO: add subclasses
				allowCustomValues: false
			}
		}
	}
}


	