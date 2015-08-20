// dependencies
var _ = require('lodash');
var Q = require('q');
var mongoose = require('mongoose');

// load in filter functions
var filterBank = require('./filterBank');

// takes a filter and applies it to each element in the specified arrays (all is the default)
//  expects first parameter in parameter array to be an array of property names (empty array means apply to all)
function pipeSingleElement(input, func, props, parameters) {
	// only apply filter to specified object property names
	var keys = Object.keys(input);
	if (props.length) {
		keys = keys.filter(function(key) {
			return props.indexOf(key) > -1;
		});
		console.log(keys);
	}
	// loop through the acceptable keys and apply the function to each element
	keys.forEach(function(key) {
		input[key] = input[key].map(function(elem) {
			var paramsArr = [elem].concat(parameters);
			return func.apply(null, paramsArr);
		});
	});
	// return transformed input
	return input;
}

// takes a filter and applies it to the input object's arrays (expects an object of arrays)
function pipeSingleArr(input, func, parameters) {
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

// filter is applied to each input object as a whole, not the object's arrays individually
function pipeSingleObj(input, func, parameters) {
	// apply filter to the input object
	var paramsArr = [input].concat(parameters);
	return func.apply(null, paramsArr);
}

// takes a filter and applies it to an array of objects (an array of objects of arrays)
//   each object is transformed into an array of all its inner arrays concatenated together
function pipeMultiArr(inputArr, func, parameters) {
	// merge each object's arrays and add each to an array of such arrays
	var combinedArr = inputArr.reduce(function(accum, inputObj) {
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
	var output = func.apply(null, combinedArr);

	// return modified input data object
	return output;
}

// takes a filter and applies it to an array of objects (an array of objects of arrays)
function pipeMultiObj(inputArr, func, parameters) {
	// if the function takes more params, add them to the parameter array
	var paramsArr = [inputArr].concat(parameters);
	// pass combined array as parameter to associated filter function
	// and return the output
	return func.apply(null, paramsArr);
}

// choose how to apply filter to the input data and return the transformed data
function applyPipe(inputData, filter, isUserGenerated) {
	// get the associated filter function (either from user or from filterBank)
	var func;
	var type = filter.type;
	// check if this is a user generated function (treated differently)
	if (isUserGenerated) {
		// get the function from the string, put eval in an IIFE to limit scope (hopefully)
		func = (function() {
			// determine what argument the user expected from the filter's type
			var paramName = type === 'singleElem' ? 'elem' 
						: type === 'singleObj' ? 'obj'
						: 'arr';
			// wrap the string of function declaration in an IIFE - works for some reason
			var fn = new Function(paramName, filter.func);
			return fn;
		})();
	} else {
		// get the function
		func = filterBank[filter.type][filter.name];
	}

	// if filter is applied to each array in each input object
	if (filter.type === 'singleArr') {
		// apply the filter to each input in the input array
		return inputData.map(function(input) {
			// each filter can have any number of parameters, so use apply
			var args = [input].concat(func, filter.parameters);
			return pipeSingleArr.apply(null, args);
		});
	}
	// if filter expects a single input object at a time
	else if (filter.type === 'singleObj') {
		// apply the filter to each input in the input array
		return inputData.map(function(input) {
			// each filter can have any number of parameters, so use apply
			var args = [input].concat(func, filter.parameters);
			return pipeSingleObj.apply(null, args);
		});
	}
	// if filter applies to each element in an array
	else if (filter.type === 'singleElem') {
		// these filters expect an array of obj properties first, check for this
		if (!_.isArray(filter.parameters[0])) {
			// add an empty array if it is not there
			filter.parameters.unshift([]);
		}
		return inputData.map(function(input) {
			// each filter can have any number of parameters, so use apply
			var args = [input].concat(func, filter.parameters);
			return pipeSingleElement.apply(null, args);
		});
	}
	// if filter is applied to an array of objects with no transformations
	else if (filter.type === 'multiObj') {
		return pipeMultiObj(inputData, func);
	}
	// if filter expects an array of input objects and is applied to transformed arrays
	else {
		// apply the filter to the total input array
		return pipeMultiArr(inputData, func);
	}
}

// iterate through and apply all filters, returning transformed data
function pipeline(inputData, filters, userFilters) {
	// apply each filter to the input data
	filters.forEach(function(filter) {
		inputData = applyPipe(inputData, filter);
	});
	// go through the user generated filters (if they exist)
	userFilters.forEach(function(userFilter) {
		inputData = applyPipe(inputData, userFilter, true);
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
		return Route.findById(route).exec().then(function(populatedRoute) {
			return populatedRoute.getCrawlData();
		});
	});
	var inputPipesPromises = pipe.inputs.pipes.map(function(innerPipe) {
		return Pipe.findById(innerPipe).then(function(populatedPipe) {
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
			// wait for all the crawling data to come back
			return Q.all(inputRoutesPromises.concat(inputPipesPromises));
		})
		.then(function(inputData) {
			// flatten the data (pipes return array of objects, but routes only return objects)
			inputData = _.flatten(inputData);
			// apply each filter to each input
			return pipeline(inputData, populatedFilters, pipe.userFilters);
		})
		.catch(function(err) {
			console.log('caught this error in generateOutput');
			console.error(err);
			throw err;
		});
}

// test user filters
// var dummyUserFilter = {
// 	func: 'var t = arguments[1]; elem *= t; return elem;',
// 	name: 'my function!',
// 	parameters: [25],
// 	description: 'a user made this function',
// 	keys: [],
// 	type: 'singleElem'
// };
// var dummyUserFilter2 = {
// 	func: 'arr.push("hey from jack"); return arr;',
// 	name: 'my function!',
// 	parameters: [5],
// 	description: 'a user made this function',
// 	keys: [],
// 	type: 'singleArr'
// };
// var dummyUserFilter3 = {
// 	func: 'obj.a = obj.a.map(function(e) {return e + 20}); return obj',
// 	name: 'my function!',
// 	parameters: [5],
// 	description: 'a user made this function',
// 	keys: [],
// 	type: 'singleObj'
// };

// var dummyData = [{
// 	a: ['1', '2', '3'],
// 	b: ['4', '5', '6'],
// }];

// some examples
// console.log('applied elem', applyPipe(dummyData, dummyUserFilter, true));
// console.log('applied arr', applyPipe(dummyData, dummyUserFilter2, true));
// console.log('applied obj', applyPipe(dummyData, dummyUserFilter3, true));


///// they can choose the kind of function they are writing - singleArr, multiObj, etc.
	// they will be given a different starting point based on that



// exports
module.exports = getPipeData;