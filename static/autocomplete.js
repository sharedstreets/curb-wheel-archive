function autocomplete(inp, options) {

	// input element,

	// options.values: array of values to match to, 
	// options.match: optional "any" part of string, or "start" of string only
	// options.minLength: min length of input to 
	// onEnter: optional function to call when enter key pressed. default is blurring from input
	// options.inputTransform: optional function to match to a transformation of the input value, 
	// options.outputTransform: optional function to set input value upon selecting item

	var currentFocus;
	
	/*execute a function when someone writes in the text field:*/

	inp.addEventListener("focus", onInput)
	inp.addEventListener("input", onInput);

	/*execute a function presses a key on the keyboard:*/
	inp.addEventListener("keydown", function(e) {
			var x = document.getElementById(this.id + "autocomplete-list");
			if (x) x = x.getElementsByTagName("div");
			if (e.keyCode == 40) {
				/*If the arrow DOWN key is pressed,
				increase the currentFocus variable:*/
				currentFocus++;
				/*and and make the current item more visible:*/
				addActive(x);
			} else if (e.keyCode == 38) { //up
				/*If the arrow UP key is pressed,
				decrease the currentFocus variable:*/
				currentFocus--;
				/*and and make the current item more visible:*/
				addActive(x);
			} else if (e.keyCode == 13) {
				/*If the ENTER key is pressed, prevent the form from being submitted,*/
				e.preventDefault();
				if (currentFocus > -1) {
					/*and simulate a click on the "active" item:*/
					if (x) x[currentFocus].click();
				}
			}
	});

	function onInput(){

		var a, b, i, val = options.inputTransform ? options.inputTransform(this.value) : this.value;
		
		/*close any already open lists of autocompleted values*/
		closeAllLists();
		// if (!val) { return false;}
		currentFocus = -1;
		/*create a DIV element that will contain the items (values):*/
		a = document.createElement("DIV");
		a.setAttribute("id", this.id + "autocomplete-list");
		a.setAttribute("class", "autocomplete-items");
		/*append the DIV element as a child of the autocomplete container:*/
		this.parentNode.appendChild(a);

		/*for each item in the array...*/
		for (i = 0; i < options.values.length; i++) {

			var matchFound = options.match === 'any' ? options.values[i].includes(val) : options.values[i].substr(0, val.length).toUpperCase() == val.toUpperCase()
			/*check if the item starts with the same letters as the text field value:*/
			if (matchFound) {
				/*create a DIV element for each matching element:*/
				b = document.createElement("DIV");
				/*make the matching letters bold:*/
				b.innerHTML = options.values[i].replace(val, `<strong class="blue">${val}</strong>`)
				// "<strong class='blue'>" + options.values[i].substr(0, val.length) + "</strong>";
				// b.innerHTML += options.values[i].substr(val.length);
				/*insert a input field that will hold the current array item's value:*/
				b.innerHTML += "<input type='hidden' value='" + options.values[i] + "'>";
				
				/*execute a function when someone clicks on the item value (DIV element):*/
				b.addEventListener("click", function(e) {

					// apply the selected value, optionally with an output transform
					var selectedValue = this.getElementsByTagName("input")[0].value;
					var valueToApply = options.outputTransform ? options.outputTransform(inp.value, selectedValue) : selectedValue;
					inp.value = valueToApply;
					
					/*close the list of autocompleted values,
					(or any other open lists of autocompleted values:*/
					closeAllLists();
					options.onEnter ? options.onEnter(inp) : inp.blur()
				});
				a.appendChild(b);
			}
		}
	}

	function addActive(x) {
		/*a function to classify an item as "active":*/
		if (!x) return false;
		/*start by removing the "active" class on all items:*/
		removeActive(x);
		if (currentFocus >= x.length) currentFocus = 0;
		if (currentFocus < 0) currentFocus = (x.length - 1);
		/*add class "autocomplete-active":*/
		x[currentFocus].classList.add("autocomplete-active");
	}
	function removeActive(x) {
		/*a function to remove the "active" class from all autocomplete items:*/
		for (var i = 0; i < x.length; i++) {
			x[i].classList.remove("autocomplete-active");
		}
	}
	function closeAllLists(elmnt) {
		/*close all autocomplete lists in the document,
		except the one passed as an argument:*/
		var x = document.getElementsByClassName("autocomplete-items");
		for (var i = 0; i < x.length; i++) {
			if (elmnt != x[i] && elmnt != inp) {
				x[i].parentNode.removeChild(x[i]);
			}
		}
	}
	/*execute a function when someone clicks in the document:*/
	document.addEventListener("click", function (e) {
		// closeAllLists(e.target);
	});

}