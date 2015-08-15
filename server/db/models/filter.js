'use strict';
var mongoose = require('mongoose');

var schema = new mongoose.Schema({
	name: {
		type: String,
		required: true
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
// 