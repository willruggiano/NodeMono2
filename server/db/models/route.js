'use strict';
var mongoose = require('mongoose');

var schema = new mongoose.Schema({
	name: {
		type: String,
		required: true
	},
	user: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User',
		required: true
	},
	url: {
		type: String,
		required: true
	},
	data: [{
		name: String,
		selector: String,
		// optionally extract the attribute from selected elements
		attr: String,
		// optionally extract certain indexes from selected elements
		indexes: [Number]
	}],
	lastTimeCrawled: {
		type: Date,
		default: Date.now
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
	},
	// options for crawled data
	config: {
		// concat data fields into an array of objects
		returnObj: {
			type: Boolean,
			default: false
		},
		// limit number of results
		limitNum: {
			type: Number
		}
	}
});

// add an on save method to generate the user key (later)



// also crawl the route when it's created



// add the crawl function to each mongoose route object
var crawl = require('../../app/functions/crawler');

// returns a promise for the crawled data, also updates crawling statistics
schema.methods.getCrawlData = function getCrawlData() {
	var self = this;
	return crawl(self)
		.then(function(crawledData) {
			// update the last time crawled
			self.lastTimeCrawled = Date.now();
			return crawledData;
		})
		.catch(function(err) {
			// the crawl failed, so log that
			self.lastCrawlStatus = false;
			console.log('there was an error in getCrawlData method');
		});
};

mongoose.model('Route', schema);
