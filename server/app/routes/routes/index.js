'use strict';
var router = require('express').Router();

var mongoose = require('mongoose');
var Route = mongoose.model('Route');
var _ = require('lodash');

// return crawled data for a apiRoute    
//-->nodemono.com/api/routes/:userId/:apiRouteName
router.get('/:userId/:apiRouteName', function(req, res, next) {
    // do validation with the userId
    Route.findOne({
            name: req.params.apiRouteName,
            userId: req.params.userId
        }).exec()
        .then(function(apiRoute) {
            return apiRoute.getCrawlData();
        })
        .then(function(crawledData) {
            res.json(crawledData);
        })
        .then(null, next);
});

// create a new apiRoute (userId and apiRouteName in the body)
router.post('/', function(req, res, next) {
    // req.body should have name, userId, url, data, and config
    var newRoute = new Route(req.body);
    newRoute.save()
        .then(function(apiRoute) {
            // return the crawled data
            return apiRoute.getCrawlData();
        })
        .then(function(data) {
            res.json(data);
        })
        .then(null, next);
});

// for finding apiRoute by id
router.param('id', function(req, res, next, id) {
    Route.findById(id).exec()
        .then(function(apiRoute) {
            if (!apiRoute) throw Error('Not Found');
            req.apiRoute = apiRoute;
            next();
        })
        .then(null, function(e) {
            // invalid ids sometimes throw cast error
            if (e.name === "CastError" || e.message === "Not Found") e.status = 404;
            next(e);
        });
});

// get a apiRoute by id
router.get('/:id', function(req, res, next) {
    res.json(req.apiRoute);
});

// update a apiRoute by id
router.put('/:id', function(req, res, next) {
    _.extend(req.apiRoute, req.body);
    req.apiRoute.save()
        .then(function(apiRoute) {
            res.json(apiRoute);
        })
        .then(null, next);
});

// delete a apiRoute by id
router.delete('/:id', function(req, res, next) {
    req.apiRoute.remove()
        .then(function() {
            res.status(204).end();
        })
        .then(null, next);
});


module.exports = router;