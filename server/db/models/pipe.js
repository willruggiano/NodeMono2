'use strict';
var mongoose = require('mongoose');

var schema = new mongoose.Schema({
	name: {
		type: String,
		required: true
	},
	user: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User'
	},
	inputs: [{
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Route'
	}],
	filters: [{
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Filter'
	}],
	// ?? probably don't need this
	output: {
		type: Object
	},
	//extra information about the pipe
	lastTimePiped: {
		type: Date,
		default: Date.now
	},
	lastPipeSucceeded: {
		// true if successful, false if failed
		type: Boolean,
		default: true
	},
	count: {
		// times piped
		type: Number,
		default: 0
	},
});

// returns a promise for the piped data, also updates pipe statistics
schema.methods.getPipeData = function getPipeData() {
	var self = this;

	// fire off crawlers for all input routes
	var promiseArray = self.inputs.map(function(input) {
		return input.getCrawlData();
	});

	// continue when all the data is returned
	return Q.all(promiseArray)
		.then(function(inputData) {
			// do something with the filters
			return inputData;
		})
		.then(function(pipedData) {
			// update the last time piped
			self.lastTimePiped = Date.now();
			self.lastPipeSucceeded = true;
			self.count++;
			self.save();
			return crawledData;
		})
		.catch(function(err) {
			// the pipe failed, so log that
			self.lastTimePiped = Date.now();
			self.lastPipeSucceeded = false;
			self.save();
			console.log('there was an error in getPipeData method');
		});
};

mongoose.model('Pipe', schema);
