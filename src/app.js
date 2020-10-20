import * as d3 from 'd3';
import {point, lineString} from '@turf/helpers';

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
      console.log("init")
      app.io.getWheelTick((counterValue) => {

        app.state.systemRollOffset = counterValue / 10;
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
      var incompleteSpans = 0; //survey.filter((d) => !d.end).length;
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

    		app.io.completeSurvey();

        app.state.surveyedRefs.push(app.state.street.forward);
        app.ui.map.setFilter('surveyedStreets', app.state.surveyedRefs)
        app.ui.mode.set("selectStreet");

        app.ui.updateSurveyCount();

      };

      if (skipConfirmation)
        confirm();
      else
        app.ui.confirm(app.constants.prompts.completeSurvey, confirm, null);
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

      // place holder function -- overriden in index.js

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

    updateSurveyCount : async function () {
      var count = await app.io.getSurveyCount();
      d3.select("#pendingUploadCount").text(count);
    },

    addFeature : function() {
      app.ui.mode.set("addFeature");
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

        newFeatures.on("touchstart", (d, i) => {
          console.log(d)
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
          .attr("src", "img/cog.svg");

        // build feature action buttons

        var featureActions = newFeatures
          .append("div")
          .attr("class", "mt30 small featureActions blue");

        Object.keys(app.feature).forEach((action) => {
          featureActions
            .append("div")
            .attr("class", `col4 featureAction`)
            .text(action)
            .on("touchstart", (d, i) => {
              console.log(d)
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
        if (app.state.mode === "rolling")
          app.io.getWheelTick();
        else if (
          app.state.mode === "selectStreet" ||
          app.state.mode === "selectDirection"
        ) {
          app.io.geolocate((lnglat) => {
            app.ui.map.getSource("youarehere").setData(point(lnglat));
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

    //build Add Feature modal

    Object.keys(app.constants.curbFeatures).forEach((type) => {
       d3.select(`#addFeature`)
         .append("span")
         .selectAll(".halfButton")
         .data(app.constants.curbFeatures[type])
         .enter()
         .append("div")
         .attr("id", type)
         .attr("class", "halfButton inlineBlock")
         .text((d) => d)
         .on('ontouchstart' in window ? 'touchstart' : 'click', (d) => {
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
  },

  io: {

    addPhoto: (d, filename) => {
      var ft = app.state.features.filter(
        (ft) => ft.startTime === d.startTime
      )[0];

      if (ft) {
        var imageData = {
          url: filename,
          geometry: {
            type: "Position",
            distance: app.state.currentRollDistance,
          },
        };
        ft.images.push(imageData);


        app.ui.features.update();
      }
    },

    completeSurvey: (cb) => {
      let survey = {
        created_at: Date.now(),
        shst_ref_id: app.state.street.ref,
        side_of_street: app.state.streetSide,
        ref_len: app.state.street.distance,
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
        		.map(image => {
        			image.geometry.distance = app.state.currentRollDistance - image.geometry.distance;
        			return image;
        		})
        }

        // todo error handling for out of bounds offsets

        feature.geometry.geom = app.io.getGeom(app.state.street.ref, feature.geometry.distances[0], feature.geometry.distances[1]);

        feature.images = feature.images.map(image => {
            image.geom = app.io.getGeom(app.state.street.ref, feature.geometry.distances[0]);
            return image;
          });

        survey.features.push(feature);
      }

      app.io.saveSurvey(app.state.street.ref, app.state.streetSide, JSON.stringify(survey));

    },

    uploadData: async () => {

      try {

        const d = new Date();
        const now = d.toISOString();

        const uploadPrefix = now + "/";

        console.log("Starting upload...")

        var surveyRows = await app.io.getSurveys();

        console.log("Surveys to upload: " + surveyRows.length)

        var spanData = {type:"FeatureCollection", features:[]};
        for (var i=0; i<surveyRows.length; i++){
          var survey = JSON.parse(surveyRows.item(i).data);
          for (let feature of survey.features) {

            if( feature.geometry && feature.geometry.geom && feature.geometry.geom.geometry) {

              var imageUrls = [];
              for (let image of feature.images) {

                let splitPath = image.url.split("/");
                let uploadPath = "images/" + splitPath[splitPath.length-1];

                imageUrls.push(uploadPath);
              }

              let span = {
                type: "Feature",
                geometry: feature.geometry.geom.geometry,
                properties: {
                  created_at: survey.created_at,
                  cwheelid: "", // todo: figure out where to find this
                  shst_ref_id: survey.shst_ref_id,
                  ref_side: survey.side_of_street,
                  ref_len: survey.ref_len,
                  srv_dist: survey.surveyed_distance,
                  srv_id: survey.id,
                  feat_id: feature.id,
                  label: feature.label,
                  dst_st: feature.geometry.distances[0],
                  dst_end: feature.geometry.distances[1],
                  images: imageUrls,
                },
              };

              spanData.features.push(span);
            }
          }
        }

        console.log("pushing data: " + uploadPrefix + "spans.json")
        var jsonResponse = await app.io.uploadJson(uploadPrefix + "spans.json", spanData);

        if(jsonResponse.status === 200) {

          // upload points

          var pointData = {type:"FeatureCollection", features:[]};

          for (var i=0; i<surveyRows.length; i++){
            var survey = JSON.parse(surveyRows.item(i).data);
            for (let feature of survey.features) {
              for (let image of feature.images) {

                if( image && image.geom && image.geom.geometry) {

                  let splitPath = image.url.split("/");
                  let uploadPath = "images/" + splitPath[splitPath.length-1];

                  let point = {
                    type: "Feature",
                    geometry: image.geom.geometry,
                    properties: {
                      created_at: survey.created_at,
                      cwheelid: "", // todo: figure out where to find this
                      shst_ref_id: survey.shst_ref_id,
                      ref_side: survey.side_of_street,
                      ref_len: survey.ref_len,
                      srv_dist: survey.surveyed_distance,
                      srv_id: survey.id,
                      feat_id: feature.id,
                      label: feature.label,
                      dst_st: feature.geometry.distances[0],
                      url: uploadPath
                  }};
                  pointData.features.push(point);
                }

                console.log("pushing data: " + uploadPath)
                var imgResponse = await app.io.uploadImage(uploadPath, image.url);
                if(imgResponse.status !== 200) {
                  console.log(JSON.stringify(imgResponse))
                  alert("Image upload failed, check your internet connection and try again.")
                }
              }
            }
          }

          console.log("pushing data: " + uploadPrefix + "points.json")
          var jsonResponse = await app.io.uploadJson(uploadPrefix + "points.json", pointData);

          if(jsonResponse.status !== 200) {
            console.log(JSON.stringify(imgResponse))
            alert("points.json upload failed, check your internet connection and try again.")
            return;
          }

          for (var i=0; i<surveyRows.length; i++){
            var survey = JSON.parse(surveyRows.item(i).data);
            for (let feature of survey.features) {
              for (let image of feature.images) {
                app.io.deleteFile(image.url);
              }
            }
          }

          await app.io.wipeSurveyData();

          alert("Upload finished.");

          app.ui.updateSurveyCount();

        }
        else {
          alert("spans.json upload failed, check your internet connection and try again.");
        }
      }
      catch(e) {
        console.log(e);
        alert("error occured during upload..." + e + ": " + e.stack);
      }
    },

    getWheelTick: (cb) => {
      var counterValue = app.io.getCounterValue();

      // fire callback
      if(cb)
        cb(counterValue);

      app.state.systemRollDistance = counterValue / 10;
      app.ui.roll();

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
},
};

export default app;
