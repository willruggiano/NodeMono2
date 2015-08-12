'use strict';
var mongoose = require('mongoose');

var schema = new mongoose.Schema({
	name: {
		type: String,
		required: true
	},
	url: {
		type: String,
		required: true
	},
	data: [{
		name: String,
		selector: String,
		cached: String
	}],
	crawlFrequency: {
		// stored as milliseconds - consistent with Unix time
		type: Number,
		required: true
	},
	lastTimeCrawled: {
		type: Date
	},
	lastCrawlStatus: {
		// true if successful, false if failed
		type: Boolean,
		default: true
	},
	count: {
		// times crawled
		type: Number,
		default: 0
	}
});

mongoose.model('Route', schema);