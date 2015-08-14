'use strict';
var router = require('express').Router();

var mongoose = require('mongoose');
var Route = mongoose.model('Route');
var _ = require('lodash');

router.get('/', (req, res, next) => {
  Route.find().exec()
    .then(routes => res.json(routes))
    .then(null, next)
})

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
			// return the crawled data
			return route.getCrawlData();
		})
		.then(function(data) {
			res.json(data);
		})
		.then(null, next);
});

// for finding route by id
router.param('id', function(req, res, next, id) {
    Route.findById(id).exec()
        .then(function(route) {
            if (!route) throw Error('Not Found');
            req.route = route;
            next();
        })
        .then(null, function(e) {
            // invalid ids sometimes throw cast error
            if (e.name === "CastError" || e.message === "Not Found") e.status = 404;
            next(e);
        });
});

// get a route by id
router.get('/:id', function(req, res) {
    res.json(req.route);
});

// update a route by id
router.put('/:id', function(req, res, next) {
    _.extend(req.route, req.body);
    req.route.save()
        .then(function(route) {
            res.json(route);
        })
        .then(null, next);
});

// delete a route by id
router.delete('/:id', function(req, res, next) {
    req.route.remove()
        .then(function() {
            res.status(204).end();
        })
        .then(null, next);
});


module.exports = router;
