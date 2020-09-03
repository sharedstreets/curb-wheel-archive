var app = {
  state: {
    street: {
      distance: 0,
    },
    streetSide: "right",
    rollDirection: "forward",
    systemRollOffset: 0, // offset to subtract from reported distance
    systemRollDistance: 0, // rolled distance as reported by Pi
    currentRollDistance: 0, // computed roll from distance and offset
    features: [],
    mode: "selectStreet",
    surveyedRefs: ['in', 'forward'], // mapboxgl filter array for surveyed streets, to indicate on map
    promptsUsed: [], // tracks prompts that have been displayed to avoid second display
    featureToAddPhoto: null, // ephemeral tracker for adding images
  },

  survey: {
    // sets up parameters of the selected street, preparing for survey
    init: () => {
      app.io.getWheelTick((cb) => {
        app.state.systemRollOffset = cb.counter / 10;
        app.state.features = [];
        app.ui.features.update();

        //populate street length
        d3.select("#curbLength").text(Math.round(app.state.street.distance));

        d3.select("#curbEntry .progressBar").attr(
          "max",
          app.state.street.distance
        );

        d3.select("#streetName").text(app.state.street.name);

        // sets the street direction and initializes the survey
        var success = () => {
          app.state.street.ref = app.state.street.forward;
          app.ui.mode.set("rolling");
          app.devMode.rolling = true;
        };

        app.ui.confirm(app.constants.prompts.beginSurvey, success);
      });
    },

    // checks current survey before submission
    validate: () => {
      var survey = app.state.features;
      var incompleteSpans = survey.filter((d) => !d.end).length;
      var surveyedLengthRatio =
        app.state.currentRollDistance / app.state.street.distance;

      // check for unfinished spans
      if (incompleteSpans > 0) alert(app.constants.errors.incompleteSpans(incompleteSpans));

      //check for significant deviations in surveyed curb length. user can restart survey or ignore
      else if (surveyedLengthRatio < 0.8 || surveyedLengthRatio > 1.1) {
        app.constants.errors.curbLengthDeviation(surveyedLengthRatio);
      } 
      else app.survey.complete();
    },

    complete: (skipConfirmation) => {
    	var confirm = function() {

			var uploadSuccess = function(){
				app.state.surveyedRefs.push(app.state.street.forward);
				app.ui.map.setFilter('surveyedStreets', app.state.surveyedRefs)
				app.ui.mode.set("selectStreet");
        	}

			app.io.uploadSurvey(uploadSuccess);

    	};

      if (skipConfirmation) confirm();
      else app.ui.confirm(app.constants.prompts.completeSurvey, confirm, null);
    },
  },
  // functionality to add/delete/modify features

  feature: {
    delete: function (d) {
    	var success = function () {
			app.state.features = app.state.features.filter((feature) => {
				return feature.startTime !== d.startTime;
			});

			app.ui.features.update();
		};

      app.ui.confirm(app.constants.prompts.deleteFeature, success, null);
    },

    "take photo": function (d, i) {
		// TODO add camera call here
      var success = () => {
        document.querySelector("#uploadImg").click();
      };

      //stash feature index in iframe attribute to append to later
      app.state.featureToAddPhoto = d.startTime;

      app.ui.confirm(app.constants.prompts.takePhoto, success, null);
    },

    complete: function (d, i) {
      var success = function () {
        var startTimeToEnd = d.startTime;

        app.state.features.forEach((d) => {
          if (d.startTime === startTimeToEnd)
            d.end = app.state.currentRollDistance;
        });

        app.ui.features.update();
        app.ui.reset();
      };

      app.ui.confirm(app.constants.prompts.finishFeature, success, null);
    },

    add: function (feature) {
      var newFeature = {
        name: feature.name,
        type: feature.type,
        start: app.state.currentRollDistance,
        startTime: Date.now(),
        images: [],
      };

      if (feature.type === "Position") newFeature.end = newFeature.start;
      app.state.features.push(newFeature);
    },
  },

  // functionality to update the UI, typically after feature changes and new rolling

  ui: {
    // Updates all active progress bars and status texts
    roll: () => {
      var current = app.state.systemRollDistance - app.state.systemRollOffset;
      var rollDelta = current - app.state.currentRollDistance;

      d3.select("#rolling").classed("isRolling", rollDelta !== 0);

      if (rollDelta !== 0) {
        var progressPercentage = (100 * current) / app.state.street.distance;

        //update progress bars that aren't complete yet
        d3.selectAll(".entry:not(.complete) .span").style("width", (d) => {
          //conditional start to account for main progress bar
          var startingMark = d ? d.start : 0;
          return `calc(${
            progressPercentage -
            (100 * startingMark) / app.state.street.distance
          }% ${startingMark ? "+ 12px" : ""})`;
        });

        d3.select(".wheel").style("margin-left", () => {
          return progressPercentage + "%";
        });

        d3.selectAll(".entry:not(.complete) .spanLength").text(
          (d) => `${(current - d.start).toFixed(1)} m`
        );

        d3.select("#blockProgress").text(current.toFixed(1));

        d3.select("#rollDelta").text(
          `${rollDelta > 0 ? "+" : ""}${Math.round(rollDelta * 100)} cm`
        );
      }

      app.state.currentRollDistance = current;
    },

    // builds progress bar
    progressBar: {
      build: function (parent) {
        var container = parent
          .append("div")
          .attr("class", `progressBar mt10 mb10`);

        container.append("div").classed("track", true);

        container
          .append("div")
          .attr("class", (d) => d.type.toLowerCase())
          .style(
            "margin-left",
            (d) => `${(100 * d.start) / app.state.street.distance}%`
          );
      },

      update: (parent) => {
        parent
          .select(".progressBar")
          .selectAll(".dot")
          .data((d) => d.images)
          .enter()
          .append("div")
          .attr("class", "dot")
          .style(
            "margin-left",
            (d) => `${(100 * d.geometry.distance) / app.state.street.distance}%`
          );
      },
    },

    features: {
      //general function to build a new feature entry.

      build: (newFeatures) => {
        // name of feature
        newFeatures
          .attr("id", (d) => `entry${d.startTime}`)
          .append("span")
          .attr("class", "featureName")
          .text((d) => `${d.name}`);

        newFeatures
          .append("span")
          .attr("class", "fr blue spanLength")
          .text((d) => (d.type === "Position" ? "" : `0 m`));

        newFeatures.on("mousedown", (d, i) => {
          var id = d.startTime;
          d3.selectAll("#features .entry").classed(
            "active",
            (d, entryIndex) => {
              return d.startTime === id;
            }
          );
        });

        // build progress bar
        app.ui.progressBar.build(newFeatures);

        // add text below progress bars
        var barCaption = newFeatures.append("div").attr("class", "quiet small");

        barCaption
          .append("span")
          .text(
            (d) =>
              `${d.type === "Position" ? "At" : "From"} ${d.start.toFixed(
                1
              )}m-mark`
          );

        // gear icon toggle for actions
        barCaption
          .append("span")
          .attr("class", "fr")
          .attr("href", (d) => `#entry${d.startTime}`)
          .append("img")
          .attr("class", "icon fa-cog")
          .attr("src", "static/images/cog.svg");

        // build feature action buttons

        var featureActions = newFeatures
          .append("div")
          .attr("class", "mt30 small featureActions blue");

        Object.keys(app.feature).forEach((action) => {
          featureActions
            .append("div")
            .attr("class", `col4 featureAction`)
            .text(action)
            .on("mousedown", (d, i) => {
              d3.event.stopPropagation();
              app.feature[action](d, i);
            });
        });
      },

      // update UI. generally fired after a feature is added, deleted or completed

      update: () => {
        var features = d3
          .select("#features")
          .selectAll(".entry")
          .data(app.state.features, (d) => d.startTime);

        //remove deleted features
        features
          .exit()
          .transition()
          .duration(200)
          .style("transform", "translateY(-100%)")
          .style("opacity", 0)
          .remove();

        // mark completed features as such
        features.classed("complete", (d) => d.end);

        d3.selectAll(".complete .featureAction").attr(
          "class",
          "featureAction col6"
        );

        // add new features
        var newFeatures = features.enter().append("div").attr("class", "entry");

        app.ui.features.build(newFeatures);

        // update progress bar with dots for new photos
        app.ui.progressBar.update(features);
      },
    },

    // sets the current mode of the app, and updates title

    mode: {
      set: (mode) => {
        app.ui.reset();
        d3.select("#modes").attr("currentMode", mode);

        app.state.mode = mode;

        // apply any custom functions for mode
        if (app.constants.modes[mode].set) app.constants.modes[mode].set();

        // update title
        d3.select("#title")
        	.text(app.constants.modes[mode].title);
      },
    },

    // functionality for the back button, conditional on the current mode

    back: () => {
      var modes = Object.keys(app.constants.modes);
      var modeIndex = modes.indexOf(app.state.mode) - 1;
      var newMode = modes[modeIndex];

      // set mode as one previous in list, unless there's a custom back() function
      var customFn = app.constants.modes[app.state.mode].back;
      var executeCustomFn = customFn ? customFn() : app.ui.mode.set(newMode);
    },

    // produces a confirm dialog once for each instance, with callbacks for cancel and ok.
    // also handles disabled dialogs

    confirm: (text, ok, cancel) => {
      // if confirm prompt has already been used, go directly to "ok" state
      if (app.state.promptsUsed.includes(text)) ok();
      // otherwise, log it and bring up dialog
      else {
        app.state.promptsUsed.push(text);

        // some users disable dialogs in browser, which we will detect as an immediate programmatic response to the dialog
        var promptTime = Date.now();
        var confirmed = confirm(text);

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

    scrollBar: {
      init: () => {
        d3.select(".scroll-drawer").append("div");
      },
    },
    // general UI reset: collapses any open action drawers, removes curb arrows from map

    reset: function () {
      d3.select(".active").classed("active", false);
    },
  },

  // initializes app UI: populates curb attributes, builds modals

  init: () => {
    // poll Pi
    setInterval(
      () => {
        if (app.state.mode === "rolling") app.io.getWheelTick();
        else if (
          app.state.mode === "selectStreet" ||
          app.state.mode === "selectDirection"
        ) {
          app.io.geolocate((lnglat) => {
            app.ui.map.getSource("youarehere").setData(turf.point(lnglat));
          });
        }
      },

      app.constants.pollingInterval
    );

    // set entries div based on computed height of the master curb bar (a hack)

    d3.select(".scroll-drawer").style(
      "top",
      document.querySelector("#master").offsetHeight + "px"
    );

    // build Add Feature modal

    Object.keys(app.constants.curbFeatures).forEach((type) => {
      d3.select(`#addFeature`)
        .append("span")
        .attr("id", type)
        .selectAll(".halfButton")
        .data(app.constants.curbFeatures[type])
        .enter()
        .append("div")
        .attr("class", "halfButton inlineBlock")
        .text((d) => d)
        .on("mousedown", (d) => {
          d = {
            name: d,
            type: type,
          };

          // add new feature to state, return to rolling mode, update ui
          app.feature.add(d);
          app.ui.features.update();
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
    iframe: () => {
      return document.querySelector("iframe");
    },

    iframeOnload: () => {
      var filename = app.io.iframe().contentDocument.querySelector("body")
        .innerText;
      var ft = app.state.features.filter(
        (ft) => ft.startTime === app.state.featureToAddPhoto
      )[0];

      if (ft) {
        ft.images.push({
          url: filename,
          geometry: {
            type: "Position",
            distance: app.state.currentRollDistance,
          },
        });

        app.ui.features.update();
      }
    },

    // uploads image via the form, and retrieves the filepath from the hidden iframe
    uploadImage: (e) => {
      document.querySelector("#imageSubmit").click();
    },

    uploadSurvey: (cb) => {
      let survey = {
        created_at: Date.now(),
        shst_ref_id: app.state.street.ref,
        side_of_street: app.state.streetSide,
        surveyed_distance: app.state.currentRollDistance,
        features: [],
      };

      for (let ft of app.state.features) {
        let feature = {
          label: ft.name,
          geometry: {
            type: ft.type,
            distances: [ft.start, ft.end],
          },
          images: ft.images,
        };
        
        if (app.state.rollDirection === 'back') {

        	feature.geometry.distances = 
        	feature.geometry.distances.reverse()
				.map(meters => app.state.currentRollDistance - meters)

        	feature.images = feature.images
        		.map(image=>{
        			image.geometry.distance = app.state.currentRollDistance - image.geometry.distance
        			return image
        		})

        }

        survey.features.push(feature);
      }
	  // TODO fetch or equivalent to push survey to endpoint
	  console.log("UPLOAD SURVEY")
    },

    loadJSON: (path, success, error) => {
		// TODO poll BLE connection for counter data 
		console.log("LOAD COUNTER")
    },

    getWheelTick: (cb) => {
      app.io.loadJSON("/counter", (data) => {
        if (cb) cb(data);
        app.state.systemRollDistance = data.counter / 10;
        app.ui.roll();
      });
    },

    geolocate: (cb) => {
      var n = navigator.geolocation;
      if (n) {
        n.getCurrentPosition(
          (position) => {
            var coords = [position.coords.longitude, position.coords.latitude];
            cb(coords);
          },

          (err) => {
            // unable to retrieve location
            console.log(err);
          }
        );
      } else console.error("browser does not support geolocation");
    },
  },

  util: {
    copy: function (original) {
      return JSON.parse(JSON.stringify(original));
    },
    extend: (obj, addition) => {
      Object.keys(addition).forEach((key) => {
        obj[key] = addition[key];
      });
      return obj;
    },
  },

  devMode: {
    rolling: false,
    init: function () {
      app.init();
    },
  },

constants: {
    pollingInterval: 1000,

    curbFeatures: {
      Span: [
        "Parking",
        "No Parking",
        "No Stopping",
        "Loading",
        "Curb cut",
        "Paint",
        "Misc. Span",
      ],
      Position: ["Payment device", "Fire hydrant", "Misc. Point"],
    },

    prompts: {
      beginSurvey:
        "Head toward the starting edge of the curb. When you're ready, press OK to start surveying",
      exitSurvey: "This abandons the current survey. Are you sure?",
      deleteFeature: "This will delete the curb feature. Are you sure?",
      takePhoto:
        "Roll the wheel right up to what you're snapping. Once it's securely parked, feel free get in a good position to get the object in the frame.",
      finishFeature:
        "This marks the end of the curb span. Once complete, you won't be able to extend it any longer.",
      completeSurvey:
        "This will conclude the survey. Once finished, you won't be able to make further changes.",
    },

    errors: {
      incompleteSpans: (num) => {
        return `There ${
          num > 1 ? "are " + num + " curb spans" : "is one curb span"
        } still running. Please close before completing the survey.`;
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
        title: "Curb Side & Direction",
      },

      rolling: {
        view: 1,
        title: "Curb Survey",

        set: () => {
          app.ui.features.update();
        },

        back: () => {
          var success = () => {
            app.state.features = [];
            app.ui.mode.set("selectStreet");
          };

          app.ui.confirm(app.constants.prompts.exitSurvey, success);

          return true;
        },
      },

      addFeature: {
        view: 2,
        title: "Select feature type",
      },
    },

    mapStyle: {
		arrows: {
			direction: {
				forward: "> ",
				back: " <",
			},

			side: {
				right: [
					[16, [0, 1]],
					[22, [0, 10]],
				],
				left: [
					[16, [0, -1]],
					[22, [0, -10]],
				],
			},
		},

		// TODO this should be pulled from Mapbox
		fullStyle: {
			"version": 8,
			"name": "Basic preview",
			"metadata": {
				"openmaptiles:version": "3.x"
			},
			"sources": {
				"openmaptiles": {
					"type": "vector",
					"url": "/static/v3.json"
				}
			},
			"glyphs": "http://[::]:8080/fonts/{fontstack}/{range}.pbf",
			"layers": [{
				"id": "background",
				"paint": {
					"background-color": "hsl(47, 26%, 88%)"
				},
				"type": "background"
			}, {
				"filter": ["all", ["==", "$type", "Polygon"],
					["in", "class", "residential", "suburb", "neighbourhood"]
				],
				"id": "landuse-residential",
				"paint": {
					"fill-color": "hsl(47, 13%, 86%)",
					"fill-opacity": 0.7
				},
				"source": "openmaptiles",
				"source-layer": "landuse",
				"type": "fill"
			}, {
				"filter": ["==", "class", "grass"],
				"id": "landcover_grass",
				"paint": {
					"fill-color": "hsl(82, 46%, 72%)",
					"fill-opacity": 0.45
				},
				"source": "openmaptiles",
				"source-layer": "landcover",
				"type": "fill"
			}, {
				"filter": ["==", "class", "wood"],
				"id": "landcover_wood",
				"paint": {
					"fill-color": "hsl(82, 46%, 72%)",
					"fill-opacity": {
						"base": 1,
						"stops": [
							[8, 0.6],
							[22, 1]
						]
					}
				},
				"source": "openmaptiles",
				"source-layer": "landcover",
				"type": "fill"
			}, {
				"filter": ["all", ["==", "$type", "Polygon"],
					["!=", "intermittent", 1]
				],
				"id": "water",
				"paint": {
					"fill-color": "hsl(205, 56%, 73%)"
				},
				"source": "openmaptiles",
				"source-layer": "water",
				"type": "fill"
			}, {
				"filter": ["all", ["==", "$type", "Polygon"],
					["==", "intermittent", 1]
				],
				"id": "water_intermittent",
				"paint": {
					"fill-color": "hsl(205, 56%, 73%)",
					"fill-opacity": 0.7
				},
				"source": "openmaptiles",
				"source-layer": "water",
				"type": "fill"
			}, {
				"filter": ["==", "subclass", "ice_shelf"],
				"id": "landcover-ice-shelf",
				"paint": {
					"fill-color": "hsl(47, 26%, 88%)",
					"fill-opacity": 0.8
				},
				"source": "openmaptiles",
				"source-layer": "landcover",
				"type": "fill"
			}, {
				"filter": ["==", "subclass", "glacier"],
				"id": "landcover-glacier",
				"paint": {
					"fill-color": "hsl(47, 22%, 94%)",
					"fill-opacity": {
						"base": 1,
						"stops": [
							[0, 1],
							[8, 0.5]
						]
					}
				},
				"source": "openmaptiles",
				"source-layer": "landcover",
				"type": "fill"
			}, {
				"filter": ["all", ["in", "class", "sand"]],
				"id": "landcover_sand",
				"metadata": {},
				"paint": {
					"fill-antialias": false,
					"fill-color": "rgba(232, 214, 38, 1)",
					"fill-opacity": 0.3
				},
				"source": "openmaptiles",
				"source-layer": "landcover",
				"type": "fill"
			}, {
				"filter": ["==", "class", "agriculture"],
				"id": "landuse",
				"paint": {
					"fill-color": "#eae0d0"
				},
				"source": "openmaptiles",
				"source-layer": "landuse",
				"type": "fill"
			}, {
				"filter": ["==", "class", "national_park"],
				"id": "landuse_overlay_national_park",
				"paint": {
					"fill-color": "#E1EBB0",
					"fill-opacity": {
						"base": 1,
						"stops": [
							[5, 0],
							[9, 0.75]
						]
					}
				},
				"source": "openmaptiles",
				"source-layer": "landcover",
				"type": "fill"
			}, {
				"filter": ["all", ["==", "$type", "LineString"],
					["==", "brunnel", "tunnel"]
				],
				"id": "waterway-tunnel",
				"paint": {
					"line-color": "hsl(205, 56%, 73%)",
					"line-dasharray": [3, 3],
					"line-gap-width": {
						"stops": [
							[12, 0],
							[20, 6]
						]
					},
					"line-opacity": 1,
					"line-width": {
						"base": 1.4,
						"stops": [
							[8, 1],
							[20, 2]
						]
					}
				},
				"source": "openmaptiles",
				"source-layer": "waterway",
				"type": "line"
			}, {
				"filter": ["all", ["==", "$type", "LineString"],
					["!in", "brunnel", "tunnel", "bridge"],
					["!=", "intermittent", 1]
				],
				"id": "waterway",
				"paint": {
					"line-color": "hsl(205, 56%, 73%)",
					"line-opacity": 1,
					"line-width": {
						"base": 1.4,
						"stops": [
							[8, 1],
							[20, 8]
						]
					}
				},
				"source": "openmaptiles",
				"source-layer": "waterway",
				"type": "line"
			}, {
				"filter": ["all", ["==", "$type", "LineString"],
					["!in", "brunnel", "tunnel", "bridge"],
					["==", "intermittent", 1]
				],
				"id": "waterway_intermittent",
				"paint": {
					"line-color": "hsl(205, 56%, 73%)",
					"line-opacity": 1,
					"line-width": {
						"base": 1.4,
						"stops": [
							[8, 1],
							[20, 8]
						]
					},
					"line-dasharray": [2, 1]
				},
				"source": "openmaptiles",
				"source-layer": "waterway",
				"type": "line"
			}, {
				"filter": ["all", ["==", "$type", "LineString"],
					["==", "brunnel", "tunnel"],
					["==", "class", "transit"]
				],
				"id": "tunnel_railway_transit",
				"layout": {
					"line-cap": "butt",
					"line-join": "miter"
				},
				"minzoom": 0,
				"paint": {
					"line-color": "hsl(34, 12%, 66%)",
					"line-dasharray": [3, 3],
					"line-opacity": {
						"base": 1,
						"stops": [
							[11, 0],
							[16, 1]
						]
					}
				},
				"source": "openmaptiles",
				"source-layer": "transportation",
				"type": "line"
			}, {
				"id": "building",
				"paint": {
					"fill-antialias": true,
					"fill-color": "rgba(222, 211, 190, 1)",
					"fill-opacity": {
						"base": 1,
						"stops": [
							[13, 0],
							[15, 1]
						]
					},
					"fill-outline-color": {
						"stops": [
							[15, "rgba(212, 177, 146, 0)"],
							[16, "rgba(212, 177, 146, 0.5)"]
						]
					}
				},
				"source": "openmaptiles",
				"source-layer": "building",
				"type": "fill"
			}, {
				"filter": ["==", "$type", "Point"],
				"id": "housenumber",
				"layout": {
					"text-field": "{housenumber}",
					"text-font": ["Noto Sans Regular"],
					"text-size": 10
				},
				"minzoom": 17,
				"paint": {
					"text-color": "rgba(212, 177, 146, 1)"
				},
				"source": "openmaptiles",
				"source-layer": "housenumber",
				"type": "symbol"
			}, {
				"id": "road_area_pier",
				"type": "fill",
				"metadata": {},
				"source": "openmaptiles",
				"source-layer": "transportation",
				"filter": ["all", ["==", "$type", "Polygon"],
					["==", "class", "pier"]
				],
				"paint": {
					"fill-color": "hsl(47, 26%, 88%)",
					"fill-antialias": true
				}
			}, {
				"id": "road_pier",
				"type": "line",
				"metadata": {},
				"source": "openmaptiles",
				"source-layer": "transportation",
				"filter": ["all", ["==", "$type", "LineString"],
					["in", "class", "pier"]
				],
				"layout": {
					"line-cap": "round",
					"line-join": "round"
				},
				"paint": {
					"line-color": "hsl(47, 26%, 88%)",
					"line-width": {
						"base": 1.2,
						"stops": [
							[15, 1],
							[17, 4]
						]
					}
				}
			}, {
				"filter": ["all", ["==", "$type", "Polygon"],
					["in", "brunnel", "bridge"]
				],
				"id": "road_bridge_area",
				"layout": {},
				"paint": {
					"fill-color": "hsl(47, 26%, 88%)",
					"fill-opacity": 0.5
				},
				"source": "openmaptiles",
				"source-layer": "transportation",
				"type": "fill"
			}, {
				"filter": ["all", ["==", "$type", "LineString"],
					["in", "class", "path", "track"]
				],
				"id": "road_path",
				"layout": {
					"line-cap": "square",
					"line-join": "bevel"
				},
				"paint": {
					"line-color": "hsl(0, 0%, 97%)",
					"line-dasharray": [1, 1],
					"line-width": {
						"base": 1.55,
						"stops": [
							[4, 0.25],
							[20, 10]
						]
					}
				},
				"source": "openmaptiles",
				"source-layer": "transportation",
				"type": "line"
			}, {
				"filter": ["all", ["==", "$type", "LineString"],
					["in", "class", "minor", "service"]
				],
				"id": "road_minor",
				"layout": {
					"line-cap": "round",
					"line-join": "round"
				},
				"paint": {
					"line-color": "hsl(0, 0%, 97%)",
					"line-width": {
						"base": 1.55,
						"stops": [
							[4, 0.25],
							[20, 30]
						]
					}
				},
				"source": "openmaptiles",
				"source-layer": "transportation",
				"type": "line",
				"minzoom": 13
			}, {
				"filter": ["all", ["==", "$type", "LineString"],
					["==", "brunnel", "tunnel"],
					["==", "class", "minor_road"]
				],
				"id": "tunnel_minor",
				"layout": {
					"line-cap": "butt",
					"line-join": "miter"
				},
				"paint": {
					"line-color": "#efefef",
					"line-dasharray": [0.36, 0.18],
					"line-width": {
						"base": 1.55,
						"stops": [
							[4, 0.25],
							[20, 30]
						]
					}
				},
				"source": "openmaptiles",
				"source-layer": "transportation",
				"type": "line"
			}, {
				"filter": ["all", ["==", "$type", "LineString"],
					["==", "brunnel", "tunnel"],
					["in", "class", "primary", "secondary", "tertiary", "trunk"]
				],
				"id": "tunnel_major",
				"layout": {
					"line-cap": "butt",
					"line-join": "miter"
				},
				"paint": {
					"line-color": "#fff",
					"line-dasharray": [0.28, 0.14],
					"line-width": {
						"base": 1.4,
						"stops": [
							[6, 0.5],
							[20, 30]
						]
					}
				},
				"source": "openmaptiles",
				"source-layer": "transportation",
				"type": "line"
			}, {
				"filter": ["all", ["==", "$type", "Polygon"],
					["in", "class", "runway", "taxiway"]
				],
				"id": "aeroway-area",
				"metadata": {
					"mapbox:group": "1444849345966.4436"
				},
				"minzoom": 4,
				"paint": {
					"fill-color": "rgba(255, 255, 255, 1)",
					"fill-opacity": {
						"base": 1,
						"stops": [
							[13, 0],
							[14, 1]
						]
					}
				},
				"source": "openmaptiles",
				"source-layer": "aeroway",
				"type": "fill"
			}, {
				"filter": ["all", ["in", "class", "taxiway"],
					["==", "$type", "LineString"]
				],
				"id": "aeroway-taxiway",
				"layout": {
					"line-cap": "round",
					"line-join": "round"
				},
				"metadata": {
					"mapbox:group": "1444849345966.4436"
				},
				"minzoom": 12,
				"paint": {
					"line-color": "rgba(255, 255, 255, 1)",
					"line-opacity": 1,
					"line-width": {
						"base": 1.5,
						"stops": [
							[12, 1],
							[17, 10]
						]
					}
				},
				"source": "openmaptiles",
				"source-layer": "aeroway",
				"type": "line"
			}, {
				"filter": ["all", ["in", "class", "runway"],
					["==", "$type", "LineString"]
				],
				"id": "aeroway-runway",
				"layout": {
					"line-cap": "round",
					"line-join": "round"
				},
				"metadata": {
					"mapbox:group": "1444849345966.4436"
				},
				"minzoom": 4,
				"paint": {
					"line-color": "rgba(255, 255, 255, 1)",
					"line-opacity": 1,
					"line-width": {
						"base": 1.5,
						"stops": [
							[11, 4],
							[17, 50]
						]
					}
				},
				"source": "openmaptiles",
				"source-layer": "aeroway",
				"type": "line"
			}, {
				"filter": ["all", ["==", "$type", "LineString"],
					["in", "class", "trunk", "primary"]
				],
				"id": "road_trunk_primary",
				"layout": {
					"line-cap": "round",
					"line-join": "round"
				},
				"paint": {
					"line-color": "#fff",
					"line-width": {
						"base": 1.4,
						"stops": [
							[6, 0.5],
							[20, 30]
						]
					}
				},
				"source": "openmaptiles",
				"source-layer": "transportation",
				"type": "line"
			}, {
				"filter": ["all", ["==", "$type", "LineString"],
					["in", "class", "secondary", "tertiary"]
				],
				"id": "road_secondary_tertiary",
				"layout": {
					"line-cap": "round",
					"line-join": "round"
				},
				"paint": {
					"line-color": "#fff",
					"line-width": {
						"base": 1.4,
						"stops": [
							[6, 0.5],
							[20, 20]
						]
					}
				},
				"source": "openmaptiles",
				"source-layer": "transportation",
				"type": "line"
			}, {
				"filter": ["all", ["==", "$type", "LineString"],
					["==", "class", "motorway"]
				],
				"id": "road_major_motorway",
				"layout": {
					"line-cap": "round",
					"line-join": "round"
				},
				"paint": {
					"line-color": "hsl(0, 0%, 100%)",
					"line-offset": 0,
					"line-width": {
						"base": 1.4,
						"stops": [
							[8, 1],
							[16, 10]
						]
					}
				},
				"source": "openmaptiles",
				"source-layer": "transportation",
				"type": "line"
			}, {
				"filter": ["all", ["==", "class", "transit"],
					["!=", "brunnel", "tunnel"]
				],
				"id": "railway-transit",
				"paint": {
					"line-color": "hsl(34, 12%, 66%)",
					"line-opacity": {
						"base": 1,
						"stops": [
							[11, 0],
							[16, 1]
						]
					}
				},
				"source": "openmaptiles",
				"source-layer": "transportation",
				"type": "line"
			}, {
				"filter": ["==", "class", "rail"],
				"id": "railway",
				"paint": {
					"line-color": "hsl(34, 12%, 66%)",
					"line-opacity": {
						"base": 1,
						"stops": [
							[11, 0],
							[16, 1]
						]
					}
				},
				"source": "openmaptiles",
				"source-layer": "transportation",
				"type": "line"
			}, {
				"filter": ["all", ["==", "$type", "LineString"],
					["==", "brunnel", "bridge"]
				],
				"id": "waterway-bridge-case",
				"layout": {
					"line-cap": "butt",
					"line-join": "miter"
				},
				"paint": {
					"line-color": "#bbbbbb",
					"line-gap-width": {
						"base": 1.55,
						"stops": [
							[4, 0.25],
							[20, 30]
						]
					},
					"line-width": {
						"base": 1.6,
						"stops": [
							[12, 0.5],
							[20, 10]
						]
					}
				},
				"source": "openmaptiles",
				"source-layer": "waterway",
				"type": "line"
			}, {
				"filter": ["all", ["==", "$type", "LineString"],
					["==", "brunnel", "bridge"]
				],
				"id": "waterway-bridge",
				"layout": {
					"line-cap": "round",
					"line-join": "round"
				},
				"paint": {
					"line-color": "hsl(205, 56%, 73%)",
					"line-width": {
						"base": 1.55,
						"stops": [
							[4, 0.25],
							[20, 30]
						]
					}
				},
				"source": "openmaptiles",
				"source-layer": "waterway",
				"type": "line"
			}, {
				"filter": ["all", ["==", "$type", "LineString"],
					["==", "brunnel", "bridge"],
					["==", "class", "minor_road"]
				],
				"id": "bridge_minor case",
				"layout": {
					"line-cap": "butt",
					"line-join": "miter"
				},
				"paint": {
					"line-color": "#dedede",
					"line-gap-width": {
						"base": 1.55,
						"stops": [
							[4, 0.25],
							[20, 30]
						]
					},
					"line-width": {
						"base": 1.6,
						"stops": [
							[12, 0.5],
							[20, 10]
						]
					}
				},
				"source": "openmaptiles",
				"source-layer": "transportation",
				"type": "line"
			}, {
				"filter": ["all", ["==", "$type", "LineString"],
					["==", "brunnel", "bridge"],
					["in", "class", "primary", "secondary", "tertiary", "trunk"]
				],
				"id": "bridge_major case",
				"layout": {
					"line-cap": "butt",
					"line-join": "miter"
				},
				"paint": {
					"line-color": "#dedede",
					"line-gap-width": {
						"base": 1.55,
						"stops": [
							[4, 0.25],
							[20, 30]
						]
					},
					"line-width": {
						"base": 1.6,
						"stops": [
							[12, 0.5],
							[20, 10]
						]
					}
				},
				"source": "openmaptiles",
				"source-layer": "transportation",
				"type": "line"
			}, {
				"filter": ["all", ["==", "$type", "LineString"],
					["==", "brunnel", "bridge"],
					["==", "class", "minor_road"]
				],
				"id": "bridge_minor",
				"layout": {
					"line-cap": "round",
					"line-join": "round"
				},
				"paint": {
					"line-color": "#efefef",
					"line-width": {
						"base": 1.55,
						"stops": [
							[4, 0.25],
							[20, 30]
						]
					}
				},
				"source": "openmaptiles",
				"source-layer": "transportation",
				"type": "line"
			}, {
				"filter": ["all", ["==", "$type", "LineString"],
					["==", "brunnel", "bridge"],
					["in", "class", "primary", "secondary", "tertiary", "trunk"]
				],
				"id": "bridge_major",
				"layout": {
					"line-cap": "round",
					"line-join": "round"
				},
				"paint": {
					"line-color": "#fff",
					"line-width": {
						"base": 1.4,
						"stops": [
							[6, 0.5],
							[20, 30]
						]
					}
				},
				"source": "openmaptiles",
				"source-layer": "transportation",
				"type": "line"
			}, {
				"filter": ["in", "admin_level", 4, 6, 8],
				"id": "admin_sub",
				"paint": {
					"line-color": "hsla(0, 0%, 60%, 0.5)",
					"line-dasharray": [2, 1]
				},
				"source": "openmaptiles",
				"source-layer": "boundary",
				"type": "line"
			}, {
				"filter": ["all", ["<=", "admin_level", 2],
					["==", "$type", "LineString"]
				],
				"id": "admin_country",
				"layout": {
					"line-cap": "round",
					"line-join": "round"
				},
				"paint": {
					"line-color": "hsl(0, 0%, 60%)",
					"line-width": {
						"base": 1.3,
						"stops": [
							[3, 0.5],
							[22, 15]
						]
					}
				},
				"source": "openmaptiles",
				"source-layer": "boundary",
				"type": "line"
			}, {
				"filter": ["all", ["==", "$type", "Point"],
					["==", "rank", 1]
				],
				"id": "poi_label",
				"layout": {
					"icon-size": 1,
					"text-anchor": "top",
					"text-field": "{name}",
					"text-font": ["Noto Sans Regular"],
					"text-max-width": 8,
					"text-offset": [0, 0.5],
					"text-size": 11
				},
				"minzoom": 14,
				"paint": {
					"text-color": "#666",
					"text-halo-blur": 1,
					"text-halo-color": "rgba(255,255,255,0.75)",
					"text-halo-width": 1
				},
				"source": "openmaptiles",
				"source-layer": "poi",
				"type": "symbol"
			}, {
				"filter": ["==", "$type", "LineString"],
				"id": "road_major_label",
				"layout": {
					"symbol-placement": "line",
					"text-field": "{name}",
					"text-font": ["Noto Sans Regular"],
					"text-letter-spacing": 0.1,
					"text-rotation-alignment": "map",
					"text-size": {
						"base": 1.4,
						"stops": [
							[10, 8],
							[20, 14]
						]
					},
					"text-transform": "uppercase"
				},
				"paint": {
					"text-color": "#000",
					"text-halo-color": "hsl(0, 0%, 100%)",
					"text-halo-width": 2
				},
				"source": "openmaptiles",
				"source-layer": "transportation_name",
				"type": "symbol"
			}, {
				"filter": ["all", ["==", "$type", "Point"],
					["!in", "class", "city", "state", "country", "continent"]
				],
				"id": "place_label_other",
				"layout": {
					"text-anchor": "center",
					"text-field": "{name}",
					"text-font": ["Noto Sans Regular"],
					"text-max-width": 6,
					"text-size": {
						"stops": [
							[6, 10],
							[12, 14]
						]
					}
				},
				"minzoom": 8,
				"paint": {
					"text-color": "hsl(0, 0%, 25%)",
					"text-halo-blur": 0,
					"text-halo-color": "hsl(0, 0%, 100%)",
					"text-halo-width": 2
				},
				"source": "openmaptiles",
				"source-layer": "place",
				"type": "symbol"
			}, {
				"filter": ["all", ["==", "$type", "Point"],
					["==", "class", "city"]
				],
				"id": "place_label_city",
				"layout": {
					"text-field": "{name}",
					"text-font": ["Noto Sans Regular"],
					"text-max-width": 10,
					"text-size": {
						"stops": [
							[3, 12],
							[8, 16]
						]
					}
				},
				"maxzoom": 16,
				"paint": {
					"text-color": "hsl(0, 0%, 0%)",
					"text-halo-blur": 0,
					"text-halo-color": "hsla(0, 0%, 100%, 0.75)",
					"text-halo-width": 2
				},
				"source": "openmaptiles",
				"source-layer": "place",
				"type": "symbol"
			}, {
				"filter": ["all", ["==", "$type", "Point"],
					["==", "class", "country"],
					["!has", "iso_a2"]
				],
				"id": "country_label-other",
				"layout": {
					"text-field": "{name:latin}",
					"text-font": ["Noto Sans Regular"],
					"text-max-width": 10,
					"text-size": {
						"stops": [
							[3, 12],
							[8, 22]
						]
					}
				},
				"maxzoom": 12,
				"paint": {
					"text-color": "hsl(0, 0%, 13%)",
					"text-halo-blur": 0,
					"text-halo-color": "rgba(255,255,255,0.75)",
					"text-halo-width": 2
				},
				"source": "openmaptiles",
				"source-layer": "place",
				"type": "symbol"
			}, {
				"filter": ["all", ["==", "$type", "Point"],
					["==", "class", "country"],
					["has", "iso_a2"]
				],
				"id": "country_label",
				"layout": {
					"text-field": "{name:latin}",
					"text-font": ["Noto Sans Regular"],
					"text-max-width": 10,
					"text-size": {
						"stops": [
							[3, 12],
							[8, 22]
						]
					}
				},
				"maxzoom": 12,
				"paint": {
					"text-color": "hsl(0, 0%, 13%)",
					"text-halo-blur": 0,
					"text-halo-color": "rgba(255,255,255,0.75)",
					"text-halo-width": 2
				},
				"source": "openmaptiles",
				"source-layer": "place",
				"type": "symbol"
			}],
			"id": "basic-preview"
		}
	},

    emptyGeojson: {
      type: "FeatureCollection",
      features: [],
    },
},
};

app.devMode.init();
