'use strict';
var router = require('express').Router();

var mongoose = require('mongoose');
var Filter = mongoose.model('Filter');
var _ = require('lodash');

// get all filters (with optional search by query string)
router.get('/', function(req, res, next) {
    Filter.find(req.query)
        .populate('routes').exec()
        .then(function(filters) {
            res.json(filters);
        })
        .then(null, next);
});

// make a new filter
router.post('/', function(req, res, next) {
    // req.body should have: name, and parameters (an array)
    var newFilter = new Filter(req.body);
    newFilter.save()
        .then(function(filter) {
            return filter;
        })
        .then(null, next);
});

// for finding filter by id
router.param('id', function(req, res, next, id) {
    Filter.findById(id)
        .populate('routes').exec()
        .then(function(filter) {
            if (!filter) throw Error('Not Found');
            req.filter = filter;
            next();
        })
        .then(null, function(e) {
            // invalid ids sometimes throw cast error
            if (e.name === "CastError" || e.message === "Not Found") e.status = 404;
            next(e);
        })
});

// get a filter by id
router.get('/:id', function(req, res) {
    res.status(200).json(req.filter);
});

// update a filter by id
router.put('/:id', function(req, res, next) {
    _.extend(req.filter, req.body);
    req.filter.save()
        .then(function(filter) {
            res.json(filter);
        })
        .then(null, next);
});

// delete a filter by id
router.delete('/:id', function(req, res, next) {
    req.filter.remove()
        .then(function() {
            res.status(204).end();
        })
        .then(null, next);
});


module.exports = router;
