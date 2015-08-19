var cheerio = require('cheerio');
var request = require('request');
var Q = require('q');
var _ = require('lodash');

// return promise for a url's html
function getUrl(url) {
	var deferred = Q.defer();
	request(url, function(err, res, body) {
		if (err) deferred.reject(err);
		else deferred.resolve(body);
	});
	return deferred.promise;
}

function getSelectors(html, data, paginationArr) {
	// use cheerio to make dom accessor for html
	var $ = cheerio.load(html);

	var nextLinks = [];

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

	// collect the pagination links (add them to queue)
	paginationArr.forEach(function(paginationObj) {
		// check to see if the limit has been reached
		if (paginationObj.limit <= 0) return;
		// find the pagination link by it's selector, then get it's href, and add it to the queue
		var link = $(paginationObj.link).attr('href');
		nextLinks.push(link);
		// subtract one from the limit (to prevent infinite pagination)
		paginationObj.limit -= 1;
	});

	var promiseArray = [];
	// see if there are more links
	if (nextLinks.length) {
		promiseArray = nextLinks.map(function(link, idx) {
			return getUrl(link).then(function(nextHtml) {
				return getSelectors(nextHtml, data, [paginationArr[idx]]);
			});
		});
	}
	// return the output too
	promiseArray.unshift(output);

	return Q.all(promiseArray);
}

// given html and data, return an output of all the selected elements
// pagination - click each pagination link and add it to a queue (stack for depth first?)
function crawl(url, data, paginationArr) {
	// fire off the first promise - starts a pagination chain
	return getUrl(url)
		.then(function(html) {
			return getSelectors(html, data, paginationArr);
		})
		.then(function(data) {
			// the data comes back in a nested array form, flatten it
			data = _.flattenDeep(data);
			// also join the data into one object (only for pagination)
			if (!paginationArr.length) return data;
			// get keys from one object (same for all)
			var keys = Object.keys(data[0]);
			// have a property for each unique key
			var mergedPaginationObj = keys.reduce(function(accum, key) {
				accum[key] = [];
				return accum;
			}, {});
			// add each page's data for each key to the aggregated object's array for that key
			data.forEach(function(datum) {
				keys.forEach(function(key) {
					mergedPaginationObj[key] = mergedPaginationObj[key].concat(datum[key]);
				});
			});
			// return the merged pagination object
			return mergedPaginationObj;
		})
		.catch(function(err) {
			console.log(err);
			return err;
		});
}

function getCrawlData(route) {
	return crawl(route.url, route.data, route.pagination);
}


// let users make custom filter functions
// (function() {
// 	var obj ={};
// 	obj.str = 'var fn = function stringFunc(str) {return str.slice(0,3); }';

// 	console.log(obj.str);
// 	// var fn = new Function(str);
// 	eval(obj.str);
// 	console.log(fn);
// 	console.log(fn);
// 	console.log(fn('i am jack'));
// 	console.log(typeof fn);

// })();

// console.log(typeof fn);

///// they can choose the kind of function they are writing - singleArr, multiObj, etc.
	// they will be given a different starting point based on that



// exports
module.exports = getCrawlData;
