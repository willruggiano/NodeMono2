'use strict';
var router = require('express').Router();

var mongoose = require('mongoose');
var Pipe = mongoose.model('Pipe');
var _ = require('lodash');
var JSONtoCSV = require('../../utils/dataConversion').toCSV,
    JSONtoRSS = require('../../utils/dataConversion').toRSS;

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
            res.status(201).json(pipe);
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

// return piped data in a certain format (csv doesn't work yet)
router.get('/:id/endpoints/:endpoint', function(req, res, next) {
  var endpoint = req.params.endpoint.toLowerCase(),
      pipe = req.pipe;

  pipe.getPipeData()
    .then(function(pipedData) {
      if (endpoint === 'json') res.status(200).json(pipedData);
      else if (endpoint === 'csv') {
        var csv = pipedData.map(function(datum) {
            JSONtoCSV(pipedData[0]);
        });
        // res.status(200).send(csv);
        res.status(404).send("pipe csv is not supported");
      } else if (endpoint === 'rss') {
        var rss = JSONtoRSS(pipedData[0]);
        res.status(200).send(rss);
      } else return next('no endpoint found');
    })
    .then(null, next);
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
