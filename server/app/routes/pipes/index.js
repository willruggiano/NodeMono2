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
    var pipe;
    Pipe.findOne({
            name: req.params.pipeName,
            user: req.params.userId
        }).exec()
        .then(function(foundPipe) {
            pipe = foundPipe;
            return pipe.getPipeData();
        })
        .then(function(pipedData) {
            res.json(pipedData);
        })
        // delete pipe if the data was just for testing
        .then(function() {
            if (req.query.remove === 'true') pipe.remove();
        })
        .then(null, next);
});

// create a new pipe (userId and pipeName in the body) (pass save = false to only test output, and not save the pipe)
router.post('/', function(req, res, next) {
    // req.body should have:
    var newPipe = new Pipe(req.body);
    // save pipe _id to optionally remove the pipe
    newPipe.save()
        .then(function(pipe) {
            // return the new pipe
            res.json(pipe);
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
router.get('/:id', function(req, res) {
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
