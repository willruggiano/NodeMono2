var cheerio = require('cheerio');
var request = require('request');
var Q = require('q');

// return promise for a url's html
function getUrl(url) {
	var deferred = Q.defer();
	request(url, function(err, res, body) {
		if (err) deferred.reject(err);
		else deferred.resolve(body);
	});
	return deferred.promise;
}

// returns a promise for the crawled data
function crawl(url, data, config) {
	var deferred = Q.defer();

	// load html
	getUrl(url)
	.then(function(html) {
		// use cheerio to extract data
		var $ = cheerio.load(html);
		var output = {};
		// keep max length for returnObj config
		var maxLen = 0;
		data.forEach(function(datum) {

			// check for attribute selector
			var att = datum.attr;
			if (att) {
				// if specified, return that attribute from each
				output[datum.name] = $(datum.selector).map(function() {
					return $(this).attr(att);
				}).get();
			}
			// default behavior (get text)
			else {
				// otherwise return the text
				output[datum.name] = $(datum.selector).map(function() {
					return $(this).text();
				}).get();
			}
			// if indexes are specified, only keep those indexes
			if (datum.indexes && datum.indexes.length) {
				output[datum.name] = output[datum.name].filter(function(out, idx) {
					return datum.indexes.indexOf(idx) > -1;
				});
			}
			maxLen = output[datum.name].length;
		});

		// map over the arrays and merge them into an array of objects
		if (config.returnObj) {
			var mergedData = [];
			// use maxLen (length of longest array in the object)
			for (var i = 0; i < maxLen; i++) {
				// make new obj with fields for each name
				var mergedObj = {};
				data.forEach(function(datum, idx) {
					// each object gets elements from a certain index (i)
					mergedObj[datum.name] = output[datum.name][i];
				});
				// add to the array of these objects
				mergedData.push(mergedObj);
			}
			deferred.resolve(mergedData);
		}
		else {
			deferred.resolve(output);
		}

	})
	.then(null, function(err) {
		deferred.reject(err);
	});

	return deferred.promise;
}

function getCrawlData(route) {
	return crawl(route.url, route.data, route.config);
}

// exports
module.exports = getCrawlData;
