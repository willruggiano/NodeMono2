// dependencies
var _ = require('lodash');

// contains all filter functions for pipes
var filterBank = {
	// filters for single elements (those inside arrays)
	//// each element is expected to be a string
	singleElement: {
		elementSlice: function(elem, x) {
			return elem.slice(x);
		}
	},
	// single array functions
	singleArray: {
		maxLength: function(arr, len) {
			return arr.slice(0, len);
		},
		unique: function(arr) {
			return _.uniq(arr);
		},
		firstXElements: function(arr, x) {
			return arr.slice(0, x);
		},
		slice: function(arr, x) {
			return arr.slice(x);
		},
		// returns an array of the pulled values (expects values)
		pull: function(arr) {
			// values to pull are passed in after the array
			return _.pull.apply(null, arguments);
		},
		// returns an array of the pulled values (expects indexes)
		pullAt: function(arr) {
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
		}
	},
	// any number of array functions
	/// how should the user decide which arrays to use? (right now each route has its returned arrays concated into one, and put into array of such arrays)
	multiArray: {
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
		xor: function() {
			var arrArgs = Array.prototype.slice.call(arguments);
			return [{
				xor: _.xor.apply(null, arrArgs)
			}];
		},
		// another strange lodash function (easy to add, so why not?)
		zip: function() {
			var arrArgs = Array.prototype.slice.call(arguments);
			return [{
				zip: _.xor.apply(null, arrArgs)
			}];
		}
	},
	// functions applied to each input object
	singleObj: {
		// returns the object without the specified fields
		omit: function(obj) {
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
			var len = arr.length;
			// merge each object in the sub arrays at each index
			for (var i = 0; i < maxLen; i++) {
				interleavedArr.push(arr.reduce(function(accum, innerArr) {
					return _.merge(accum, innerArr[i]);
				}, {}));
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
	},
	// ** special filters - always applied last **
	// =-=-=-= this use of them may be deprecated - also stored in filterBank.multiObj =-=-=-=
	// takes an array of objects of arrays
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
		var len = arr.length;
		// merge each object in the sub arrays at each index
		for (var i = 0; i < maxLen; i++) {
			interleavedArr.push(arr.reduce(function(accum, innerArr) {
				return _.merge(accum, innerArr[i]);
			}, {}));
		}

		return interleavedArr;
	},
	// expects array of objects, applied last
	// merges all objects in the array into one object (returns the object, no array)
	merge: function(arr) {
		return arr.reduce(function(accum, obj) {
			return _.merge(accum, obj);
		}, {});
	}
};

// ** helper functions below **

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
	// use maxLen (length of longest array in the object)
	for (var i = 0; i < maxLen; i++) {
		// make new obj with fields for each name
		var mergedObj = {};
		keys.forEach(function(key, idx) {
			// each object gets elements from a certain index (i)
			mergedObj[key] = obj[key][i];
		});
		// add to the array of these objects
		mergedData.push(mergedObj);
	}

	return mergedData;
}

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

var dummyObj = {a:1, b:2, c:3};
console.log(filterBank.singleObj.omit(dummyObj, 'a', 'c'));


module.exports = filterBank;
