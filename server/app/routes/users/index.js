'use strict';
var router = require('express').Router();

var mongoose = require('mongoose');
var User = mongoose.model('User');
var _ = require('lodash');

// get all users (with optional search by query string)
router.get('/', function(req, res, next) {
    User.find(req.query)
        .populate('routes').exec()
        .then(function(users) {
            res.json(users);
        })
        .then(null, next);
});

// make a new user
router.post('/', function(req, res, next) {
    // req.body should have email, password
    // userKey is generated on save, and password is salted
    var newUser = new User(req.body);
    newUser.save()
        .then(function(user) {
            // log in user automatically (to establish session)
            req.logIn(user, function(loginErr) {
                if (loginErr) return next(loginErr);
                // send back user without password and salt
                res.status(200).send(_.omit(user.toJSON(), ['password', 'salt']));
            });
        })
        .then(null, next);
});

// for finding route by id
router.param('id', function(req, res, next, id) {
    User.findById(id)
        .populate('routes').exec()
        .then(function(user) {
            if (!user) throw Error('Not Found');
            req.user = user;
            next();
        })
        .then(null, function(e) {
            // invalid ids sometimes throw cast error
            if (e.name === "CastError" || e.message === "Not Found") e.status = 404;
            next(e);
        });
});

// get a user by id
router.get('/:id', function(req, res) {
    res.status(200).json(req.user);
});

// update a user by id
router.put('/:id', function(req, res, next) {
    _.extend(req.user, req.body);
    req.user.save()
        .then(function(user) {
            res.json(user);
        })
        .then(null, next);
});

// delete a user by id
router.delete('/:id', function(req, res, next) {
    req.user.remove()
        .then(function() {
            res.status(204).end();
        })
        .then(null, next);
});


module.exports = router;
