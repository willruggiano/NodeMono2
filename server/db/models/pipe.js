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
	// inputs can be custom api routes, or other pipes
	inputs: {
		routes: [{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Route'
		}],
		pipes: [{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Pipe'	
		}]
	},
	// filters applied to the input data
	filters: [{
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Filter'
	}],
	// make interleave a special filter? i.e. it has to be applied at the end, and maybe an interleaved pipe can't be filtered anymore (too hard to work with)
	interleave: {
		// true -> apply as last filter
		type: Boolean,
		default: false
	},
	// true if input should be combined into one object
	merge: {
		// true -> merge the data (if input then assume it will arrive merged)
		type: Boolean,
		default: false
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

var pipe = require('../../app/functions/pipe');

// returns a promise for the piped data, also updates pipe statistics
schema.methods.getPipeData = function getPipeData() {
	var self = this;

	return pipe(self)
		.then(function(pipedData) {
			// update the last time piped
			self.lastTimePiped = Date.now();
			self.lastPipeSucceeded = true;
			self.count++;
			self.save();
			return pipedData;
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
