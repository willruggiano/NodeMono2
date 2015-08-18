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

// given html and data, return an output of all the selected elements
// pagination - click each pagination link and add it to a queue (stack for depth first?)
// function processHtml(html, data, paginationArr) {
	
// }

// returns a promise for the crawled data
function crawl(url, data, paginationArr) {
	// load html
	return getUrl(url)
	.then(function(html) {
		// use cheerio to make dom accessor for html
		var $ = cheerio.load(html);

		// loop through each data (contains selector, name, etc.
		var output = data.reduce(function(accum, datum) {
			// if attr is specified, get that attribute from each selected element
			var attribute = datum.attr;
			if (attribute) {
				accum[datum.name] = $(datum.selector).map(function() {
					return $(this).attr(attribute);
				}).get();
			}
			// otherwise default behavior (get text)
			else {
				accum[datum.name] = $(datum.selector).map(function() {
					return $(this).text();
				}).get();
			}
			// if indexes are specified, only keep those indexes
			if (datum.indexes && datum.indexes.length) {
				accum[datum.name] = accum[datum.name].filter(function(out, idx) {
					return datum.indexes.indexOf(idx) > -1;
				});
			}
			// pass accumulation of data to next iteration of reduce
			return accum;
		}, {});

		// check for pagination stuff - iterate through the list and do it recursively
		// probably just start with one pagination button - an array is kinda tricky

		// return the found data
		return output;
	})
	.catch(function(err) {
		return err;
	});
}


function getCrawlData(route) {
	return crawl(route.url, route.data, route.pagination);
}

// exports
module.exports = getCrawlData;