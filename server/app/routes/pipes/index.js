'use strict';
var router = require('express').Router();

var mongoose = require('mongoose');
var Pipe = mongoose.model('Pipe');
var _ = require('lodash');

// get all pipes (with optional search by query string)
router.get('/', function(req, res, next) {
    Pipe.find(req.query).exec()
        .then(function(pipes) {
            res.json(pipes);
        })
        .then(null, next);
});

// return crawled data for a pipe
//-->nodemono.com/api/pipes/:userId/:pipeName
router.get('/:userId/:pipeName', function(req, res, next) {
    // do validation with the userId
    Pipe.findOne({
            name: req.params.pipeName,
            user: req.params.userId
        }).exec()
        .then(function(pipe) {
            return pipe.getPipeData();
        })
        .then(function(pipedData) {
            res.json(pipedData);
        })
        .then(null, next);
});

// create a new pipe (userId and pipeName in the body)
router.post('/', function(req, res, next) {
    // req.body should have: 
    var newPipe = new Pipe(req.body);
    newPipe.save()
        .then(function(pipe) {
            // return the crawled data
            return pipe.populate('inputs.routes inputs.pipes filters').exec().then(function(popPipe) {
                return popPipe.getPipeData();
            });
        })
        .then(function(data) {
            res.json(data);
        })
        .then(null, next);
});

// for finding pipe by id
router.param('id', function(req, res, next, id) {
    Pipe.findById(id).exec()
        .then(function(pipe) {
            if (!pipe) throw Error('Not Found');
            req.pipe = pipe;
            next();
        })
        .then(null, function(e) {
            // invalid ids sometimes throw cast error
            if (e.name === "CastError" || e.message === "Not Found") e.status = 404;
            next(e);
        });
});

// get a pipe by id
router.get('/:id', function(req, res, next) {
    res.json(req.pipe);
});

// update a pipe by id
router.put('/:id', function(req, res, next) {
    _.extend(req.pipe, req.body);
    req.pipe.save()
        .then(function(pipe) {
            res.json(pipe);
        })
        .then(null, next);
});

// delete a pipe by id
router.delete('/:id', function(req, res, next) {
    req.pipe.remove()
        .then(function() {
            res.status(204).end();
        })
        .then(null, next);
});


module.exports = router;