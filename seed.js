/*

This seed file is only a placeholder. It should be expanded and altered
to fit the development of your application.

It uses the same file the server uses to establish
the database connection:
--- server/db/index.js

The name of the database used is set in your environment files:
--- server/env/*

This seed file has a safety check to see if you already have users
in the database. If you are developing multiple applications with the
fsg scaffolding, keep in mind that fsg always uses the same database
name in the environment files.

*/

var mongoose = require('mongoose');
var Promise = require('bluebird');
var chalk = require('chalk');
var connectToDb = require('./server/db');
var User = Promise.promisifyAll(mongoose.model('User'));
var Route = Promise.promisifyAll(mongoose.model('Route'));
var Filter = Promise.promisifyAll(mongoose.model('Filter'));
var Pipe = Promise.promisifyAll(mongoose.model('Pipe'));


var wipeDB = function() {

    var models = [User, Route, Filter, Pipe];
    var promiseArr = [];
    models.forEach(function(model) {
        promiseArr.push(model.find({}).remove().exec());
    });

    return Promise.all(promiseArr);

};



var seedDb = function() {
    // initialize variables so they can be accessed later
    var users, routes, filters, pipes;
    var activeUser;

    // start seeding - add users to db
    return seedUsers()
        .then(function(savedUsers) {
            // attach saved users to higher scope
            users = savedUsers;
            // the first user seeded will have the routes
            activeUser = users[0];
            var newRoutes = [{
                name: 'testroute',
                user: activeUser,
                url: 'https://nytimes.com',
                data: [{
                    name: 'headline',
                    selector: '.theme-summary .story-heading a',
                }, {
                    name: 'link',
                    selector: '.theme-summary .story-heading a',
                    attr: 'href'
                }]
            }, {
                name: 'testroute2',
                user: activeUser,
                url: 'https://espn.go.com',
                data: [{
                    name: 'headlines',
                    selector: '.headlines a',
                }, {
                    name: 'links',
                    selector: '.headlines a',
                    attr: 'href'
                }]
            }];

            return Route.remove().then(function() {
                return Route.createAsync(newRoutes);
            });
        })
        .then(function(savedRoutes) {
            // attach saved routes to higher scope
            routes = savedRoutes;

            var newFilters = [{
                name: 'intersection',
                parameters: []
            }, {
                name: 'union',
                parameters: []
            }, {
                name: 'maxLength',
                parameters: [3]
            }, {
                name: 'unique',
                parameters: []
            }];

            return Filter.remove().then(function() {
                return Filter.createAsync(newFilters);
            });
        })
        .then(function(savedFilters) {
            // attach saved filters to higher scope
            filters = savedFilters;

            var newPipes = [{
                name: 'testPipe',
                user: activeUser,
                inputs: {
                    routes: routes,
                    // added later
                    pipes: []
                },
                filters: [
                    // max length 3
                    filters[2],
                    // unique
                    filters[3]
                ],
                outputFormat: 'default'
            }, {
                name: 'testPipe2',
                user: activeUser,
                inputs: {
                    // only second route
                    routes: routes[1],
                    // added later
                    pipes: []
                },
                filters: [
                    // max length 3
                    filters[2],
                    // unique
                    filters[3]
                ],
                outputFormat: 'merge'
            }];

            return Pipe.remove().then(function() {
                return Pipe.createAsync(newPipes);
            });
        })
        .then(function(savedPipes) {
            // attach saved pipes to higher scope
            pipes = savedPipes;

            // attach pipes as inputs to other pipes
            pipes[1].inputs.pipes.push(pipes[0]);

            // save the pipes
            return pipes[1].save();
        })
        .then(function() {
            // attach pipes to users
            activeUser.pipes = pipes;

            // attach routes to users
            activeUser.routes = routes;

            // save the update
            return activeUser.save();
        });
};

var seedUsers = function() {

    var users = [{
        name: 'Jack Mulrow',
        email: 'jack@mulrow.com',
        password: 'jack',
        userKey: 'jackKey'
    }, {
        name: 'Full Stack',
        email: 'testing@fsa.com',
        password: 'password',
        userKey: 'fullKey'
    }, {
        name: 'Barack Obama',
        email: 'obama@gmail.com',
        password: 'potus',
        userKey: 'obamaKey',
    }];

    return User.remove().then(function() {
        return User.createAsync(users);
    });

};

// create and save all filters to the db (dynamic)
var seedFilters = function() {
    // load in the filter functions, descriptions, and default params
    var filterBank = require('./server/app/functions/filterBank');
    var filterDescriptions = require('./server/app/functions/filterDescriptions');
    var filterDefaultParams = require('./server/app/functions/filterDefaultParams');

    // make a filter object for each filter function in the bank
    // start with single array functions
    var singleArrFunctionKeys = Object.keys(filterBank.singleArray);
    var singleArrs = singleArrFunctionKeys.reduce(function(accum, key) {
        // make new filter for the key, and add it to the accumulator
        accum.push(new Filter({
            name: key,
            parameters: filterDefaultParams[key],
            description: filterDescriptions[key]
        }));
        return accum;
    }, []);

    // then multiple array functions
    var multiArrFunctionKeys = Object.keys(filterBank.multiArray);
    var multiArrs = multiArrFunctionKeys.reduce(function(accum, key) {
        // make new filter for the key, and add it to the accumulator
        accum.push(new Filter({
            name: key,
            parameters: filterDefaultParams[key],
            description: filterDescriptions[key]
        }));
        return accum;
    }, []);

    // then single object functions
    var singleObjFunctionKeys = Object.keys(filterBank.singleObj);
    var singleObjs = singleObjFunctionKeys.reduce(function(accum, key) {
        // make new filter for the key, and add it to the accumulator
        accum.push(new Filter({
            name: key,
            parameters: filterDefaultParams[key],
            description: filterDescriptions[key]
        }));
        return accum;
    }, []);

    // then multiple object functions
    var multiObjFunctionKeys = Object.keys(filterBank.multiObj);
    var multiObjs = multiObjFunctionKeys.reduce(function(accum, key) {
        // make new filter for the key, and add it to the accumulator
        accum.push(new Filter({
            name: key,
            parameters: filterDefaultParams[key],
            description: filterDescriptions[key]
        }));
        return accum;
    }, []);

    // join the filters together
    var filters = singleArrs.concat(multiArrs, singleObjs, multiObjs);

    // clear db of filters
    return Filter.remove().then(function() {
        // save the new filters
        return Filter.createAsync(filters);
    });
};

connectToDb.then(function() {
    wipeDB().then(function() {
        // seedDb is defined above - adds all pipes, users, routes, filters, etc. to db
        seedDb().then(function() {
            console.log(chalk.green('Seed successful!'));
            process.kill(0);
        }).
        catch (function(err) {
            console.error(err);
            process.kill(1);
        });

    })
});