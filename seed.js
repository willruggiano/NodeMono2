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


var seedUsers = function () {

    var users = [
        {
            name: 'Full Stack',
            email: 'testing@fsa.com',
            password: 'password',
        },
        {
            name: 'Barack Obama',
            email: 'obama@gmail.com',
            password: 'potus',
        }
    ];

    return User.remove().then(function() {
        return User.createAsync(users);
    });

};

var routes = [
    {
        name: 'testroute',
        url: 'https://nytimes.com',
        data: [{
                name: 'headline',
                selector: '.theme-summary .story-heading a',
                // indexes: [0, 3, 7]
            },
            {
                name: 'link',
                selector: '.theme-summary .story-heading a',
                attr: 'href'
            }
        ],
        config: {
            returnObj: true
        }
    }
];

var seedRoutes = function (routes) {
    return Route.remove().then(function() {
        return Route.createAsync(routes);
    });
};

connectToDb.then(function () {
    User.findAsync({}).then(function (users) {
        return seedUsers();
    }).then(function(users) {
        routes[0].user = users[0]._id
        return seedRoutes(routes)
    }).then(function () {
        console.log(chalk.green('Seed successful!'));
        process.kill(0);
    }).catch(function (err) {
        console.error(err);
        process.kill(1);
    });
});
