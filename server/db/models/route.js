'use strict';
var mongoose = require('mongoose');

var schema = new mongoose.Schema({
	name: {
		type: String
	},
	url: {
		type: String
	},
	data: [{
		name: String,
		selectors: String,
		cached: String
	}],
	crawlFrequency: {
		// stored as milliseconds - consistent with Unix time
		type: Number
	},
	lastTimeCrawled: {
		type: Date
	},
	lastCrawlStatus: {
		// true if successful, false if failed
		type: Boolean
	},
	count: {
		// times crawled
		type: Number
	}
});

mongoose.model('Route', schema);