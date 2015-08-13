'use strict';
var router = require('express').Router();

var mongoose = require('mongoose');
var Route = mongoose.model('Route');

router.get('/testing', function(req, res, next) {
    Route.findOne({}).exec()
        .then(function(route) {
            return route.getCrawlData();
        })
        .then(function(crawledData) {
            res.json(crawledData);
        })
        .then(null, next);
});






module.exports = router;