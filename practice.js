// easier way to test pipes and routes

var connectToDb = require('./server/main');
var mongoose = require('mongoose');
var Pipe = mongoose.model('Pipe');
var Route = mongoose.model('Route');
var Filter = mongoose.model('Filter');
var Q = require('q');

Pipe.findOne({name: 'testPipe'}).then(function(pipe) {
	console.log(pipe.name);
	pipe.getPipeData()
		.then(function(data) {
			console.log('from pipe', data);
		});
});

// Route.findOne({name: 'testroute'}).then(function(route) {
// 	console.log(route.name);
// 	route.getCrawlData()
// 		.then(function(data) {
// 			console.log('from route', data);
// 		});
// });
