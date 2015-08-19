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
	// users can write their own filters (stored as strings) (applied last)
	userFilters: [{
		func: String,
		name: String,
		parameters: [{
			type: mongoose.Schema.Types.Mixed
		}],
		type: {
			type: String,
			enum: ['singleArr', 'multiArr', 'singleObj', 'multiObj', 'singleElem']
		},
		description: String,
		keys: [{
			type: String
		}]
	}],
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
	}
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
			console.log('there was an error in getPipeData method', err);
			return err;
		});
};

mongoose.model('Pipe', schema);
