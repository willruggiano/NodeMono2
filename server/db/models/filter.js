'use strict';
var mongoose = require('mongoose');

var schema = new mongoose.Schema({
	// i.e. the name of the filter, like maxLength, or noFalsy
	name: {
		type: String,
		required: true
	},
	// parameters for the function
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
		enum: ['singleArr', 'multiArr', 'singleObj', 'multiObj', 'singleElem'],
		required: true
	},
	// singleElem filters store obj keys for them to be applied to
	keys: [{
		type: String
	}],
	// true for default filters (ie not customized on front end by user)
	defaultFilter: {
		type: Boolean,
		default: false
	}
});

mongoose.model('Filter', schema);
