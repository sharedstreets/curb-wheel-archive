var app = {
  state: {
	street: {
	  distance: 0,
	},
	systemRollOffset: 0, // offset to subtract from reported distance
	systemRollDistance: 0, // rolled distance as reported by Pi
	currentRollDistance: 0, // computed roll from distance and offset
	zones: [],
	mode: "selectStreet",
	promptsUsed: [], // tracks prompts that have been displayed to avoid second display
  },

  constants: {
	pollingInterval: 500,

	curbFeatures: {
	  Span: [
		"Parking",
		"No Parking",
		"No Stopping",
		"Loading",
		"Curb cut",
		"Paint",
		"Misc. Zone",
	  ],
	  Position: ["Payment device", "Fire hydrant", "Misc. Point"],
	},

	prompts: {
	  beginSurvey:
		"Head toward the starting edge of the curb. When you're ready, press OK to start surveying",
	  exitSurvey: "This abandons the current survey. Are you sure?",
	  deleteZone: "This will delete the curb feature. Are you sure?",
	  takePhoto:
		"Set the wheel down so that it does not fall over. Feel free get in a good position to get the zone in the frame.",
	  finishZone:
		"This marks the end of the curb span. Once complete, you won't be able to extend it any longer.",
	  completeSurvey:
		"This will conclude the survey. Once finished, you won't be able to make further changes.",
	},

	errors: {
	  incompleteZones: (num) => {
		return `There ${
		  num > 1 ? "are " + num + "zones" : "is one zone"
		} still unended. Please close those before completing the survey.`;
	  },
	  curbLengthDeviation: (ratio) => {
		var script = `The surveyed length is significantly ${
		  ratio > 1 ? "longer" : "shorter"
		} than expected. Tap Cancel to return to survey, or OK to proceed anyway.`;
		var keepDubiousSurvey = confirm(script) === true;
		if (keepDubiousSurvey) app.survey.complete(true);
	  },
	},

	modes: {
	  selectStreet: {
		view: 0,
		title: "Select a street",
		set: () => {
		  //conditional on whether the map has instantiated
		  if (app.ui.map) {
			app.ui.map.getSource("arrows").setData(app.constants.emptyGeojson);
		  }
		},
	  },

	  selectDirection: {
		view: 0,
		title: "Select curb side",
	  },

	  rolling: {
		view: 1,
		title: "Curb Survey",

		set: () => {
		  app.ui.updateZones();
		},

		back: () => {
		  var success = () => {
			app.state.zones = [];
			app.ui.mode.set("selectStreet");
		  };

		  app.ui.confirm(app.constants.prompts.exitSurvey, success);

		  return true;
		},
	  },
	  addZone: {
		view: 2,
		title: "Select feature type",
	  },
	},

	emptyGeojson: { type: "FeatureCollection", features: [] },
  },

  survey: {
	// sets up parameters of the selected street, preparing for survey
	init: () => {
	  app.state.systemRollOffset = app.state.systemRollDistance;
	  app.state.zones = [];
	  app.ui.updateZones();

	  //populate street length
	  d3.select("#curbLength").text(Math.round(app.state.street.distance));

	  d3.select("#curbEntry .progressBar").attr(
		"max",
		app.state.street.distance
	  );

	  d3.select("#streetName").text(app.state.street.name);
	},

	// checks current survey before submission
	validate: () => {
	  var survey = app.state.zones;
	  var incompleteZones = survey.filter((d) => !d.end).length;
	  var surveyedLengthRatio =
		app.state.currentRollDistance / app.state.street.distance;
	  // check for unfinished zones
	  if (incompleteZones > 0)
		alert(app.constants.errors.incompleteZones(incompleteZones));
	  //check for significant deviations in surveyed curb length. user can restart survey or ignore
	  else if (surveyedLengthRatio < 0.8 || surveyedLengthRatio > 1.1) {
		app.constants.errors.curbLengthDeviation(surveyedLengthRatio);
	  } else app.survey.complete();
	},

	complete: (skipConfirmation) => {
	  var success = function () {
		app.io.uploadSurvey();

		app.ui.mode.set("selectStreet");
	  };

	  if (skipConfirmation) success();
	  else app.ui.confirm(app.constants.prompts.completeSurvey, success, null);
	},
  },
  // functionality to add/delete/modify zones

  zone: {
	delete: function (d) {
	  var success = function () {
		app.state.zones = app.state.zones.filter((zone) => {
		  return zone.startTime !== d.startTime;
		});

		app.ui.updateZones();
	  };

	  app.ui.confirm(app.constants.prompts.deleteZone, success, null);
	},

	"take photo": function (d) {
	  var success = function () {
		document.querySelector("#uploadImg").click();
	  };

	  app.ui.confirm(app.constants.prompts.takePhoto, success, null);
	},

	complete: function (d, i) {
	  var success = function () {
		var startTimeToEnd = d.startTime;

		app.state.zones.forEach((d) => {
			if (d.startTime === startTimeToEnd) d.end = app.state.currentRollDistance;
		});

		app.ui.updateZones();
		app.ui.reset();
	  };

	  app.ui.confirm(app.constants.prompts.finishZone, success, null);
	},

	add: function (feature) {
		var newZone = {
			name: feature.name,
			type: feature.type,
			start: app.state.currentRollDistance,
			startTime: Date.now(),
		};

		if (feature.type === "Position") newZone.end = newZone.start;
		app.state.zones.push(newZone);
	},
  },

  // functionality to update the UI, typically after zone changes and new rolling

  ui: {
	// fires on roll signal from Pi. Updates all active progress bars and status texts
	roll: function () {
	  var current = (app.state.currentRollDistance =
		app.state.systemRollDistance - app.state.systemRollOffset);

	  //update progress bars that aren't complete yet
	  d3.selectAll(".entry:not(.complete) .span").style("transform", (d) => {
		//conditional start to account for main progress bar
		var startingMark = d ? d.start : 0;
		return `scaleX(${
		  (current - startingMark) / app.state.street.distance
		})`;
	  });

	  d3.selectAll(".entry:not(.complete) #zoneLength")
		.text((d) => `${(current - d.start).toFixed(1)} m long`);

	  d3.select("#blockProgress").text(current.toFixed(1));
	},

	// builds progress bar
	progressBar: {
	  build: function (parent) {
		parent
		  .append("div")
		  .attr("class", (d) => `progressBar`)
		  .append("div")
		  .attr("class", (d) => d.type.toLowerCase())
		  .style(
			"margin-left",
			(d) => `${(100 * d.start) / app.state.street.distance}%`
		  );
	  },
	},

	//general function to build a new zone entry.

	buildZoneEntry: function (newZones) {
	  // name of zone
	  newZones
		.attr("id", (d) => `entry${d.startTime}`)
		.append("span")
		.attr("class", "zoneName")
		.text((d) => `${d.name}`);

	  // gear icon toggle for actions
	  newZones
		.append("span")
		.attr("class", "fr")
		.attr("href", (d) => `#entry${d.startTime}`)
		.on("mousedown", (d, i) => {
		  var id = d.startTime;
		  d3.selectAll("#zones .entry")
			  .classed("active", (d, entryIndex) => {
				return d.startTime === id;
			  });
		})	
		.append("img")
		.attr("class", "icon fa-cog")
		.attr("src", "static/images/cog.svg");

	  // build progress bar
	  app.ui.progressBar.build(newZones);

	  // add text below progress bars
	  var barCaption = newZones
		.append("div")
		.attr("class", "quiet small mt5 mb30");

	  barCaption
		.append("span")
		.attr("class", "fl")
		.text(
		  (d) =>`${d.type === "Position" ? "At" : "From"} the ${d.start.toFixed(1)}m-mark`
		);

	  barCaption
		.append("span")
		.attr("class", "fr")
		.attr("id", "zoneLength")
		.text((d) => (d.type === "Position" ? "" : `0 m long`));

	  // build zone action buttons

	  newZones;
	  var zoneActions = newZones
		.append("div")
		.attr("class", "mt50 mb50 small zoneActions blue");

	  Object.keys(app.zone).forEach((action) => {
		zoneActions
		  .append("div")
		  .attr("class", `col4 zoneAction`)
		  .text(action)
		  .on("mousedown", (d, i) => {
			d3.event.stopPropagation();
			app.zone[action](d, i);
		  });
	  });
	},

	// update UI. generally fired after a zone is added, deleted or completed

	updateZones: function () {
	  var zones = d3
		.select("#zones")
		.selectAll(".entry")
		.data(app.state.zones, (d) => d.startTime);

	  //remove deleted zones
	  zones
		.exit()
		.transition()
		.duration(200)
		.style("transform", "translateY(-100%)")
		.style("opacity", 0)
		.remove();

	  zones.classed("complete", (d) => d.end);

	  d3.selectAll(".complete .zoneAction").attr("class", "zoneAction col6");

	  // add new zones
	  var newZones = zones.enter().append("div").attr("class", "entry");

	  app.ui.buildZoneEntry(newZones);
	},

	// sets the current mode of the app, and updates title

	mode: {
	  set: function (mode) {
		app.ui.reset();
		d3.select("#modes").style(
		  "transform",
		  `translateX(-${
			app.constants.modes[mode].view *
			(100 / Object.keys(app.constants.modes).length)
		  }%)`
		);

		app.state.mode = mode;

		// apply any custom functions for mode
		if (app.constants.modes[mode].set) app.constants.modes[mode].set();

		// update title
		d3.select("#title").text(app.constants.modes[mode].title);
	  },
	},

	// functionality for the back button, conditional on the current mode

	back: function () {
	  var modes = Object.keys(app.constants.modes);
	  var modeIndex = modes.indexOf(app.state.mode) - 1;
	  var newMode = modes[modeIndex];

	  // set mode as one previous in list, unless there's a custom back() function
	  var customFn = app.constants.modes[app.state.mode].back;
	  var executeCustomFn = customFn ? customFn() : app.ui.mode.set(newMode);
	},

	// produces a confirm dialog, with callbacks for cancel and ok

	confirm: function (text, ok, cancel) {
	  // if confirm prompt has already been used, go directly to "ok" state
	  if (app.state.promptsUsed.includes(text)) ok();
	  // otherwise, log it and bring up dialog
	  else {
		app.state.promptsUsed.push(text);

		// some users disable dialogs in browser, which we will detect as an immediate programmatic response to the dialog
		var promptTime = Date.now();
		var confirmed = confirm(text);

		console.log("mark", responseTime);
		// if user confirms or had dialogs disabled, proceed to "ok" state
		if (confirmed === true) ok();
		else if (cancel) {
		  var responseTime = Date.now();
		  var browserDialogsDisabled = responseTime - promptTime < 20;
		  if (browserDialogsDisabled) ok();
		  else cancel();
		}
	  }
	},

	// general UI reset: collapses any open action drawers, removes curb arrows from map

	reset: function () {
	  d3.select(".active").classed("active", false);
	},
  },

  // initializes app UI: populates curb attributes, builds modals

  init: function () {
	// poll Pi
	setInterval(() => {
	  app.io.getWheelTick();
	}, app.constants.pollingInterval);

	// build Add Feature modal

	Object.keys(app.constants.curbFeatures).forEach((type) => {
	  d3.select(`#addZone`)
		.append("div")
		.attr("id", type)
		.selectAll(".zoneType")
		.data(app.constants.curbFeatures[type])
		.enter()
		.append("div")
		.attr("class", "zoneType")
		.text((d) => d)
		.on("mousedown", (d) => {
		  d = {
			name: d,
			type: type,
		  };
		  // add new zone to state, return to rolling mode, update ui
		  app.zone.add(d);
		  app.ui.updateZones();
		  app.ui.mode.set("rolling");
		});
	});

	app.ui.mode.set(app.state.mode);

	// set upload functionality
	document
	  .getElementById("uploadImg")
	  .addEventListener("change", app.io.uploadImage, false);
  },

  io: {
	uploadImage: (e) => {
	  document.querySelector("#imageSubmit").click();
	},

	uploadSurvey: () => {
	  let survey = {
		created_at: Date.now(),
		shst_ref_id: app.state.street.ref,
		side_of_street: "right",
		surveyed_distance: app.state.currentRollDistance,
		features: [],
	  };

	  for (let zone of app.state.zones) {
		let feature = {
		  label: zone.name,
		  geometry: {
			type: zone.type,
			distances: [zone.start, zone.end],
		  },
		  images: [],
		};
		survey.features.push(feature);
	  }

	  var xhr = new XMLHttpRequest();
	  var url = "/surveys/" + app.state.street.ref;
	  xhr.open("POST", url, true);
	  xhr.setRequestHeader("Content-Type", "application/json");
	  xhr.onreadystatechange = function () {
		if (xhr.readyState === 4 && xhr.status === 200) {
		  // uploaded survey
		}
	  };
	  xhr.send(JSON.stringify(survey));
	},

	loadJSON: (path, success, error) => {
	  var xhr = new XMLHttpRequest();
	  xhr.onreadystatechange = function () {
		if (xhr.readyState === XMLHttpRequest.DONE) {
		  if (xhr.status === 200) {
			if (success) success(JSON.parse(xhr.responseText));
		  } else {
			if (error) error(xhr);
		  }
		}
	  };
	  xhr.open("GET", path, true);
	  xhr.send();
	},

	getWheelTick: () => {
	  app.io.loadJSON("/counter", (data) => {
		app.state.systemRollDistance = data.counter / 10;
		app.ui.roll();
	  });
	},
  },

  util: {
	copy: function (original) {
	  return JSON.parse(JSON.stringify(original));
	},
  },

  devMode: {
	rolling: false,
	init: function () {
	  app.init();
	},

	sampleStreet: {
	  geometry: {
		type: "LineString",
		coordinates: [
		  [-158.04033804684877, 21.340108455253144],
		  [-158.0394757166505, 21.34072210086012],
		],
	  },
	  type: "Feature",
	  properties: {
		id: "12212304!1",
		refs: "[110619114,110561346]",
		highway: "residential",
		name: "Hapua Street",
		distance: 112.52,
		forward: "578194fd94f8b5d1e4716e64bdf23589",
		back: "cdb125fdef759ab8edb68c13f7a393c4",
	  },
	},
  },
};

app.devMode.init();
