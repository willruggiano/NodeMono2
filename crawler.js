var Xray = require('x-ray');
var x = Xray();
var Q = require('q');

function crawl(url, selector, name) {
	// convert returned function format to promise
	var deferred = Q.defer();
	x(url, [selector]) 
	(function(err) {
		if (err) deferred.reject(new Error(err));
		var data = {};
		data[name] = arguments[1];
		deferred.resolve(data);
	});
	return deferred.promise;
}

var data = [{
		url: 'http://espn.go.com',
		name: 'headlines',
		selector: '.headlines a',
	},
	{
		url: 'http://espn.go.com',
		name: 'navs',
		selector: 'h2'
	}
];

data.forEach(function(datum) {
	var crawledData = [];
	crawl(datum.url, datum.selector, datum.name)
		.then(function(data) {
			console.log('in the promise', data);
		});
});

// x('http://espn.go.com', ['h1'])
// 	(function(err) {
// 		var results = arguments[1];
// 		console.log(results);
// 		console.log('got this data', results);
// 	});

crawl('http://espn.go.com', '.headlines a', 'headline');


// x('http://github.com/stars/matthewmueller', [{
//     $root: '.repo-list-item',
//     title: '.repo-list-name',
//     link: '.repo-list-name a@href',
//     description: '.repo-list-description',
//     meta: {
//       $root: '.repo-list-meta',
//       starredOn: 'time'
//     }
//   }])
//   .paginate('.pagination a:last-child@href')
//   .limit(10)
//   .write('out.json');

// x('https://espn.go.com', ['.headlines a'])
// (function(err) {
// 	var results = arguments[1];
// 	// console.log(results.sort(function(a,b) {return b.score - a.score; }));
// 	console.log(results);
// });

// x('https://reddit.com', ['#siteTable .comments , #srDropdownContainer a@href'])
// (function(err) {
// 	var results = arguments[1];
// 	// console.log(results.sort(function(a,b) {return b.score - a.score; }));
// 	console.log(results);
// });

// x('https://dribbble.com', 'li.group', [{
//   title: '.dribbble-img strong',
//   image: '.dribbble-img [data-src]@data-src',
// }])
//   .paginate('.next_page@href')
//   .limit(3)
//   .write('results.json')
	// .write('results.json');

// (function(err, data) {
//   console.log(data); // Google
// });

// console.log(x('http://reddit.com', 'title')());

// var counter = 0;
// function crawl(url) {
// 	if (counter >= 5) return;
// 	x(url, 'a@href')(function(err, links) {
// 		console.log('got these links: ', links);
// 		console.log('this many crawls: ', ++counter);
// 		crawl(links);
// 	});
// }

// crawl('http://reddit.com');