// Instantiate all models
var mongoose = require('mongoose');
require('../../../server/db/models');
var User = mongoose.model('User');
var Route = mongoose.model('Route');
var _ = require('lodash');

var expect = require('chai').expect;

var dbURI = 'mongodb://localhost:27017/testingDB';
var clearDB = require('mocha-mongoose')(dbURI);

var supertest = require('supertest');
var app = require('../../../server/app');

describe('Users CRUD routes', function() {

  beforeEach('Establish DB connection', function(done) {
    if (mongoose.connection.db) return done();
    mongoose.connect(dbURI, done);
  });

  afterEach('Clear test database', function(done) {
    clearDB(done);
  });

  var userAgent;
  var tempRoute;
  var desiredUser = {
    name: "Christian Ayscue",
    email: 'coayscue@gmail.com',
    password: 'letMeIn',
    routes: []
  }

  beforeEach('create user agent', function() {
    userAgent = supertest.agent(app);
  })

  describe('CREATES new users', function() {
    it('and returns the user with a generated userKey and no password or salt', function(done) {
      userAgent.post('/api/users')
        .send(_.omit(desiredUser, 'routes'))
        .expect(200).end(function(err, res) {
          expect(res.body.name).to.equal('Christian Ayscue');
          expect(res.body.password).to.be.undefined;
          expect(res.body.salt).to.be.undefined;
          done();
        })
    })

    it('and signs in the new user', function(done) {
      userAgent.post('/api/users')
        .send(desiredUser)
        .expect(200).end(function(err, res) {
          //check if session was created
          done()
        })
    })
  })

  describe('READS data', function() {

    var userId;
    var testUser;
    beforeEach('seed database', function(done) {
      testUser = new User(desiredUser)
      testUser.save()
        .then(function(user) {
          userId = user._id;
          done();
        }, function(err) {
          done();
        });
    })

    beforeEach('create user agent and filler apiRoute', function(done) {
      userAgent = supertest.agent(app);
      tempRoute = new Route({
        name: 'nyTimes',
        url: 'https://nytimes.com',
        data: [{
          name: 'headline',
          selector: '.theme-summary .story-heading a',
          indexes: [0, 3, 7]
        }, {
          name: 'link',
          selector: '.theme-summary .story-heading a',
          attr: 'href'
        }],
        config: {
          returnObj: true
        },
        userId: userId
      })
      tempRoute.save()
        .then(function(apiRoute) {
          tempRoute = apiRoute;
          testUser.routes.push(tempRoute);
          return testUser.save()
        }, function(err) {
          console.log(err);
          done();
        })
        .then(function(testU) {
          console.log(testU)
          done()
        });
    })

    afterEach('remove filler apiRoute', function(done) {
      Route.remove({}).then(function() {
        done();
      })
    })

    afterEach('remove route from db', function(done) {
      User.findByIdAndRemove(userId)
        .then(function() {
          done();
        })
    })

    it('with all fields filled', function(done) {
      userAgent.get('/api/users/' + userId)
        .expect(200)
        .end(function(err, res) {
          expect(res.body.name).to.be.equal('Christian Ayscue');
          expect(res.body.email).to.be.equal('coayscue@gmail.com');
          done();
        })
    })

    it('with routes populated', function(done) {
      userAgent.get('/api/users/' + userId)
        .expect(200)
        .end(function(err, res) {
          console.log("res.body:",
            res.body)
          expect(res.body.routes[0].name).to.be.equal('nyTimes');
          done();
        })
    })

    it('not if an incorrect id is given', function(done) {
      userAgent.get('/api/users/' + 12341234)
        .expect(200)
        .end(function(err, res) {
          expect(res.body.name).to.be.undefined;
          done()
        })
    })
  })

  describe('UPDATES data', function() {

    var userId;
    beforeEach('seed database', function(done) {
      var testUser = new User(desiredUser)
      testUser.save()
        .then(function(user) {
          userId = user._id;
          done();
        }, function(err) {});
    })

    beforeEach('create user agent and filler apiRoute', function(done) {
      userAgent = supertest.agent(app);
      tempRoute = new Route({
        name: 'nyTimes',
        url: 'https://nytimes.com',
        data: [{
          name: 'headline',
          selector: '.theme-summary .story-heading a',
          indexes: [0, 3, 7]
        }, {
          name: 'link',
          selector: '.theme-summary .story-heading a',
          attr: 'href'
        }],
        config: {
          returnObj: true
        },
        userId: userId
      })
      tempRoute.save()
        .then(function(apiRoute) {
          tempRoute = apiRoute;
          desiredUser.routes.push(tempRoute);
          done()
        }, function(err) {
          console.log(err);
          done();
        })
    })

    afterEach('remove filler apiRoute', function(done) {
      Route.remove({}).then(function() {
        done();
      })
    })

    afterEach('remove route from db', function(done) {
      User.findByIdAndRemove(userId)
        .then(function() {
          done();
        })
    })

    it('if all fields are filled', function(done) {
      userAgent.put('/api/users/' + userId)
        .send({
          name: "Not Christian Ayscue",
          email: 'coayscue@gmail.com',
          routes: []
        })
        .expect(200)
        .end(function(err, res) {
          expect(res.body.name).to.equal('Not Christian Ayscue');
          expect(res.body.routes.length).to.equal(0);
          done()
        })
    })
  })

  describe('DELETES data', function() {
    var userId;
    var tempUser;
    beforeEach('seed database', function(done) {
      tempUser = new User(desiredUser)
      tempUser.save()
        .then(function(user) {
          userId = user._id;
          done();
        });
    })
    afterEach('remove route from db', function(done) {
      User.findByIdAndRemove(userId)
        .then(function() {
          done();
        }, function() {
          done();
        })
    })


    it('whenever', function(done) {
      userAgent.delete('/api/users/' + userId)
        .expect(200)
        .end(function(err, res) {
          // expect(res.body.name).to.equal('nyTimes');
          User.findById(userId)
            .then(function(user) {
              expect(user).to.be.null;
              done();
            }, function(err) {
              expect(err).to.be.defined;
              done();
            })
        })
    })
  })
})