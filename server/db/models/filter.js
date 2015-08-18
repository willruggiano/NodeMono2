'use strict';
var mongoose = require('mongoose');

var schema = new mongoose.Schema({
	// i.e. the name of the filter, like maxLength, or noFalsy
	name: {
		type: String,
		required: true
	},
	// only accept number parameters for now (will any filters need string arguments?)
	parameters: [{
		type: mongoose.Schema.Types.Mixed
	}],
	// description of what the filter does
	description: {
		type: String
	},
	// how the filter expects to be applied
	type: {
		type: String,
		enum: ['singleArr', 'multiArr', 'singleObj', 'multiObj', 'singleElem']
	}
});

mongoose.model('Filter', schema);


// // some filters to have:

// interleave - combines arrays of data into array of objects
// limit - only take some data (i.e. limit size of array)
// sort - sort the data by some part of it
// filter - remove data that doesn't meet certain conditions
//// - would I store a function then?
// clean (?) - remove falsy values
// drop - drops n elements from the beginning
// unique - takes unique elements from the list

// how to store the filter actions?
//  maybe have names for the filters, and store the associated parameters?
//  so like name: minlength, parameter: 10 --> so min length = 10, then use logic elsewhere to keep track of this?