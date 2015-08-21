var jsdom = require('node-jsdom');
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
	// return a promise for the jsdom data - it's asynchronous
	var deferred = Q.defer();

	// jsdom provides access to the window object
	jsdom.env(html, function(err, window) {
		// handle errors
		if (err) return deferred.reject(err);

		// window.document is used frequently, save it to a variable
		var document = window.document;
		// loop through each data (contains selector, name, etc.
		var output = data.reduce(function(accum, datum) {
			var selected;
			// if attr is specified, get that attribute from each selected element
			var attribute = datum.attr;
			if (attribute) {
				selected = Array.prototype.slice.call(document.querySelectorAll(datum.selector));
				accum[datum.name] = selected.map(function(elem) {
					return elem.getAttribute(attribute);
				});
			}
			// otherwise default behavior (get text)
			else {
				selected = Array.prototype.slice.call(document.querySelectorAll(datum.selector));
				accum[datum.name] = selected.map(function(elem) {
					return elem.textContent;
				});
			}
			// if an index is specified, only keep that index
			if (datum.index) {
				accum[datum.name] = accum[datum.name][datum.index];
			}
			// pass accumulation of data to next iteration of reduce
			return accum;
		}, {});

		// pagination
		var nextLinks = [];
		// collect the pagination links (add them to queue)
		paginationArr.forEach(function(paginationObj) {
			// check to see if the limit has been reached
			if (paginationObj.limit <= 0) return;
			// find the pagination link by it's selector
			var link = document.querySelectorAll(paginationObj.link);
			// if no link is found, quit the process
			if (!link) return;
			// if no index is given take the first node
			if (typeof paginationObj.index === 'undefined') link = link[0];
			else link = link[paginationObj.index];
			// get the links href
			link = link.getAttribute('href');
			// add to queue of links
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

		// return the resolved data from each pagination
		deferred.resolve(Q.all(promiseArray));
	});

	return deferred.promise;
}

// given html and data, return an output of all the selected elements
// pagination - click each pagination link and add it to a queue (stack for depth first?)
function crawl(url, data, paginationArr) {
	// fire off the first promise - starts a pagination chain
	return getUrl(url)
		.then(function(html) {
			return getSelectors(html, data, paginationArr);
		})
		.then(function(crawledData) {
			// the crawledData comes back in a nested array, flatten it
			crawledData = _.flattenDeep(crawledData);
			// also join the crawledData into one object (only for pagination)
			if (!paginationArr.length) return crawledData;
			// get keys from one object (same for all)
			var keys = Object.keys(crawledData[0]);
			// have a property for each unique key
			var mergedPaginationObj = keys.reduce(function(accum, key) {
				accum[key] = [];
				return accum;
			}, {});
			// add each page's crawledData for each key to the aggregated object's array for that key
			crawledData.forEach(function(datum) {
				keys.forEach(function(key) {
					mergedPaginationObj[key] = mergedPaginationObj[key].concat(datum[key]);
				});
			});
			// return the merged pagination object
			return [mergedPaginationObj];
		})
		.catch(function(err) {
			console.log(err);
			return err;
		});
}

function getCrawlData(route) {
	return crawl(route.url, route.data, route.pagination);
}

// exports
module.exports = getCrawlData;
