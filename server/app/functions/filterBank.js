// dependencies
var _ = require('lodash');

// ** helper functions and objects

// stores sorting comparison functions for singleArray.sort method
var sortMap = {
	numeric: {
		ascending: function(a,b) {
			return a - b;
		},
		descending: function(a,b) {
			return b - a;
		}
	},
	alphabetic: {
		ascending: {}
		// just uses the default sort, so no function is passed in
		// descening reverses the array after (inefficient, but it should be ok)
	}
	// put more below
};

// stores filter functions (i.e. for array.filter)
var filterMap = {
	// removes elements that can't be coerced to valid numbers
	numeric: function(elem) {
		return !_.isNaN(+elem);
	},
	// opposite of above
	nonNumeric: function(elem) {
		return _.isnNaN(+elem);
	}
	// put more
};

// helper function for interleave - interleaves a single object of arrays
function interleaveObj(obj) {
	// find all keys in the object
	var keys = Object.keys(obj);

	// find longest stored array
	var maxLen = keys.reduce(function(max, key) {
		if (obj[key].length > max) return obj[key].length;
		else return max;
	}, 0);

	var mergedData = [];
	// defined outside the loop to satisfy the linter
	var i = 0;
	var reduceFunc = function(accum, key) {
		accum[key] = obj[key][i];
		return accum;
	};
	// use maxLen (length of longest array in the object)
	for (; i < maxLen; i++) {
		// make new obj with fields for each name
		var mergedObj = keys.reduce(reduceFunc, {});
		// add to the array of these objects
		mergedData.push(mergedObj);
	}

	return mergedData;
}

// contains all filter functions for pipes
var filterBank = {
	// filters for single elements (those inside arrays)
	//// each element is expected to be a string
	singleElem: {
		elementSlice: function(elem, x) {
			return elem.slice(0, x);
		},
		// // for the numeric functions, strings are coerced to numbers
		// square: function(elem) {
		// 	return elem * elem;
		// },
		// multiply: function(elem, x) {
		// 	return elem * x;
		// },
		// returns the part of each element that matches the regex
		// regexMatchElem: function(elem, str) {
		// 	// convert str to regex, with global and ignore case flags
		// 	var re = new RegExp(str, 'gi');
		// 	// return elem.match(re);
		// 	// match returns an array - take first elem or use toString()?
		// 	return elem.match(re).toString();
		// }
	},
	// single array functions
	singleArr: {
		maxLength: function(arr, len) {
			return arr.slice(0, len);
		},
		unique: function(arr) {
			return _.uniq(arr);
		},
		// firstXElements: function(arr, x) {
		// 	return arr.slice(0, x);
		// },
		// slice: function(arr, x) {
		// 	return arr.slice(x);
		// },
		// returns an array of the pulled values (expects values)
		pull: function() {
			// values to pull are passed in after the array
			return _.pull.apply(null, arguments);
		},
		// returns an array of the pulled values (expects indexes)
		pullAt: function() {
			// indexes to be pulled are passed in after the array
			return _.pullAt.apply(null, arguments);
		},
		// removes all falsey values (falsy = false, null, 0, '', undefined, NaN)
		compact: function(arr) {
			return _.compact(arr);
		},
		// sorts the array (given name of the sorting type, and the direction to sort in - defaults to ascending)
		// should they pick which property to sort by? like for interleaved output?
		sort: function(arr, sortName, descending) {
			var sortFunc;
			if (descending) {
				// special case for descending alphabetical (uses default sort)
				if (sortName === 'alphabetic') {
					return arr.sort(sortMap.alphabetic).reverse();
				}
				sortFunc = sortMap[sortName].descending;
			}
			else sortFunc = sortMap[sortName].ascending;
			return arr.sort(sortFunc);
		},
		randomize: function(arr) {
			// apply special randomizing sort function
			return _.shuffle(arr);
		},
		// filters the elements in an array
		filter: function(arr, filterName) {
			var filterFunc = filterMap[filterName];
			return arr.filter(filterFunc);
		},
		// // keeps/removes elements that match the regex (defaults to keep)
		// regexFilter: function(arr, str, remove) {
		// 	var re = new RegExp(str, 'ig');
		// 	var filterFunc;
		// 	if (remove) filterFunc = function(elem) {return re.test(elem); };
		// 	else filterFunc = function(elem) {return !re.test(elem); };
		// 	return arr.filter(filterFunc);
		// }
	},
	// any number of array functions
	/// how should the user decide which arrays to use? (right now each route has its returned arrays concated into one, and put into array of such arrays)
	multiArr: {
		// returns array of all unique values between the two input objects
		union: function() {
			var arrArgs = Array.prototype.slice.call(arguments);
			return [{
				union: _.union.apply(null, arrArgs)
			}];
		},
		// returns array of values in all input arrays
		//  should it be intersection b/w ALL arrays, or just objects? (ie concat all arrays in each object and then run intersection)?
		//   does the latter as of now
		intersection: function() {
			var arrArgs = Array.prototype.slice.call(arguments);
			return [{
				intersection: _.intersection.apply(null, arrArgs)
			}];
		},
		// not entirely sure what this does (from lodash, sort of like intersection)
		// xor: function() {
		// 	var arrArgs = Array.prototype.slice.call(arguments);
		// 	return [{
		// 		xor: _.xor.apply(null, arrArgs)
		// 	}];
		// },
		// // another strange lodash function (easy to add, so why not?)
		// zip: function() {
		// 	var arrArgs = Array.prototype.slice.call(arguments);
		// 	return [{
		// 		zip: _.xor.apply(null, arrArgs)
		// 	}];
		// }
	},
	// functions applied to each input object
	singleObj: {
		// returns the object without the specified fields
		omit: function() {
			return _.omit.apply(null, arguments);
		}
	},
	// functions applied to all objects in an array of objects
	multiObj: {
		interleave: function(arr) {
			// interleave each object - expects each obj to have keys with arrays
			// then merge each object at each index
			arr = arr.reduce(function(accum, obj) {
				accum.push(interleaveObj(obj));
				return accum;
			}, []);

			// find longest interleaved arr
			var maxLen = 0;
			arr.forEach(function(elem) {
				if (elem.length > maxLen) maxLen = elem.length;
			});

			var interleavedArr = [];
			// merge each object in the sub arrays at each index
			// defined outside the loop to satisfy the linter ("don't define functions in a loop")
			var i = 0;
			var reduceFunc = function(accum, innerArr) {
				return _.merge(accum, innerArr[i]);
			};
			for (; i < maxLen; i++) {
				interleavedArr.push(arr.reduce(reduceFunc, {}));
			}

			return interleavedArr;
		},
		// expects array of objects, applied last
		// merges all objects in the array into one object (returns the object, no array)
		merge: function(arr) {
			return [arr.reduce(function(accum, obj) {
				return _.merge(accum, obj);
			}, {})];
		}
	}
};


module.exports = filterBank;
