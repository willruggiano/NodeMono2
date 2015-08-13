'use strict';
var router = require('express').Router();

var mongoose = require('mongoose');
var Route = mongoose.model('Route');

// return crawled data for a route
router.get('/:userKey/:routeName', function(req, res, next) {
	// do validation with the userkey
    Route.findOne({
    	name: req.params.routeName,
    	userKey: req.params.userKey
    }).exec()
        .then(function(route) {
            return route.getCrawlData();
        })
        .then(function(crawledData) {
            res.json(crawledData);
        })
        .then(null, next);
});

// create a new route (userKey and routeName in the body)
router.post('/', function(req, res, next) {
	// req.body should have name, userKey, url, data, and config
	var newRoute = new Route(req.body);
	newRoute.save()
		.then(function(route) {
			// res.json(route);
			// return the crawled data
			return route.getCrawlData();
		})
		.then(function(data) {
			res.json(data);
		})
		.then(null, next);
});






module.exports = router;