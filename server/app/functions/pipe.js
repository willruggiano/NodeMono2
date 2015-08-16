// dependencies
var _ = require('lodash');
var Q = require('q');
var mongoose = require('mongoose');

// contains the logic for the different filters
var filterBank = {
	// single array functions
	singleArray: {
		maxLength: function(arr, len) {
			return arr.slice(0, len);
		},
		unique: function(arr) {
			return _.uniq(arr);
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
		}
	},
	// special filter - always applied last; takes an array of objects of arrays
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
	// merges all objects in the array into one object (in an array)
	merge: function(arr) {
		return [arr.reduce(function(accum, obj) {
			return _.merge(accum, obj);
		}, {})];
	}
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

// takes a filter and applies it to a stream of data (an objects of arrays)
//  expects input to be a single object of arrays
function pipeSingle(input, filterName, parameters) {
	// get associated function
	var func = filterBank.singleArray[filterName];
	// apply filter to each array in the input object
	var keys = Object.keys(input);
	keys.forEach(function(key) {
		// if the function takes more params, add them to the parameter array
		var paramsArr = [input[key]];
		if (parameters) paramsArr = paramsArr.concat(parameters);
		// pass each array as parameter to associated filter function
		input[key] = func.apply(null, paramsArr);
	});
	// return modified input data object
	return input;
}

// takes a filter and applies it to a stream of data (an array of objects of arrays)
//  expects input to be an array of objects of arrays
function pipeMulti(inputArr, filterName, parameters) {
	// merge each object's arrays and add each to an array of such arrays
	var combinedArr = inputArr.reduce(function(accum, inputObj) {
		//// ** for intersection b/w ALL arrays in all objects (** this version needs _.flatten on combinedArr)
		// var combinedInputs = Object.keys(inputObj).reduce(function(innerAccum, key) {
		// 	innerAccum.push(inputObj[key]);
		// 	return innerAccum;
		// },[]);
		//// for intersection of values between objects (ie routes)
		var combinedInputs = Object.keys(inputObj).reduce(function(innerAccum, key) {
			return innerAccum.concat(inputObj[key]);
		}, []);
		accum.push(combinedInputs);
		return accum;
	}, []);

	// if the function takes more params, add them to the parameter array
	if (parameters) combinedArr = combinedArr.concat(parameters);
	// pass combined array as parameter to associated filter function
	var output = filterBank.multiArray[filterName].apply(null, combinedArr);

	// return modified input data object
	return output;
}

// choose how to apply filter to the input data and return the transformed data
function applyPipe(inputData, filter, parameters) {
	// if (!_.isArray(inputData)) inputData = [inputData];
	if (_.has(filterBank.singleArray, filter.name)) {
		// apply the filter to each input in the input array
		return inputData.map(function(input) {
			var args = [input].concat(filter.name, filter.parameters);
			return pipeSingle.apply(null, args);
		});
	}
	// if filter expects an array of inputs
	else {
		// apply the filter to the total input array
		return pipeMulti(inputData, filter.name);
	}
}

// iterate through and apply all filters, returning transformed data
function pipeline(inputData, filters) {
	// apply each filter to the input data
	filters.forEach(function(filter) {
		inputData = applyPipe(inputData, filter);
	});
	return inputData;
}

// applies a series of pipes to a pipe's input, and returns the output
function getPipeData(pipe) {

	// load models for population
	var Pipe = mongoose.model('Pipe');
	var Route = mongoose.model('Route');
	var Filter = mongoose.model('Filter');

	// fire off promises for the inputs' data
	// find them in the db first - pipes only hold reference to their inputs
	var inputRoutesPromises = pipe.inputs.routes.map(function(route) {
		// return route.getCrawlData();
		return Route.findById(route).exec().then(function(populatedRoute) {
			return populatedRoute.getCrawlData();
		});
	});
	var inputPipesPromises = pipe.inputs.pipes.map(function(pipe) {
		// return pipe.getPipeData();
		return Pipe.findById(pipe).then(function(populatedPipe) {
			return populatedPipe.getPipeData();
		});
	});

	// populate all the filters
	var filterPromises = pipe.filters.map(function(filterId) {
		return Filter.findById(filterId);
	});
	// save populated filters for later (can't attach them to mongo obj for some reason)
	var populatedFilters;

	// wait for filters (crawling is happening in background)
	return Q.all(filterPromises)
		.then(function(filters) {
			// save the populated filters
			populatedFilters = filters;
			// wait for all the data to come back
			return Q.all(inputRoutesPromises.concat(inputPipesPromises));
		})
		.then(function(inputData) {
			// flatten the data (pipes return array of objects, but routes only return objects)
			inputData = _.flatten(inputData);
			// apply each filter to each input
			return pipeline(inputData, populatedFilters);
		})
		.then(function(pipedData) {
			// interleave or merge if necessary
			if (pipe.interleave) {
				return filterBank.interleave(pipedData);
			} else if (pipe.merge) {
				return filterBank.merge(pipedData);
			}
			return pipedData;
		})
		.catch(function(err) {
			console.log('caught this error in generateOutput');
			console.error(err);
			throw err;
		});
}


// exports
module.exports = getPipeData;