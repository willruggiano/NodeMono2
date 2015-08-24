var jsdom = require('node-jsdom');
var request = require('request');
var Q = require('q');
var _ = require('lodash');
var fs = require('fs');
var zepto = fs.readFileSync("./zepto.min.js", "utf-8");
var jquery = fs.readFileSync("./jquery.min.js", "utf-8");

// return promise for a url's html
function getUrl(url) {
	var deferred = Q.defer();
	request(url, function(err, res, body) {
		if (err) deferred.reject(err);
		else deferred.resolve(body);
	});
	return deferred.promise;
}

var dummyUrl = 'http://espn.go.com';

var dummySelector = "DIV > SECTION.col-b > DIV > DIV.container-wrapper > DIV > ARTICLE.news-feed-item > DIV > UL > LI > A";

// getUrl(dummyUrl).then(function(html) {
(function() {
	// jsdom provides access to the window object
	jsdom.env({
		url: dummyUrl,
		src: [jquery],
		done: function(err, window) {

			// console.log(window.$(dummySelector).text());

			// get the selected elements - convert to an array too
			var selected = Array.prototype.slice.call(window.document.querySelectorAll(dummySelector));
			selected = selected.map(function(elem) {
				// return elem.getAttribute('href');
				return elem.textContent;
			});
			console.log(selected.length);
			console.log(selected);

			var jqueryed = window.$(dummySelector);
			jqueryed = window.$.map(jqueryed, function(elem) {
				return elem.textContent;
			});
			console.log(jqueryed.length);
			console.log(jqueryed);

		}
	});
	
})();


// my css selector (less specific, doesn't overload jsdom)
function getNodeSelectorString(node, index) {
  //tagString
  var tagName = node.tagName;

  // classString
  var classString = [];
  if (index % 2 === 0 && node.className) {
  // if (node.className) {
    classString.push('');
    var classes = node.className.split(/\s+/);
    classes.forEach(function(classStr, idx) {
      // take the first class (if there is one)
      if (classStr && idx === 0) {
        classString.push(classStr);
      }
    });
  }

  return tagName + classString.join('.');
}

function getSelector(baseNode) {
  var startStringArr = [];
  var node = baseNode;
  var index = 0;
  while (node.tagName.toLowerCase() !== 'html') {
    startStringArr.unshift(getNodeSelectorString(node, index));
    node = node.parentNode;
    index += 1;
  }
  if (startStringArr.length > 10) startStringArr = startStringArr.slice(startStringArr.length - 10);
  console.log(startStringArr.join(' > '));
  return startStringArr.join(' > ');
}



