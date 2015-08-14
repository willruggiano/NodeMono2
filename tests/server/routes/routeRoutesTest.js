// Instantiate all models
var mongoose = require('mongoose');
require('../../../server/db/models');
var User = mongoose.model('User');
var Route = mongoose.model('Route');

var expect = require('chai').expect;

var dbURI = 'mongodb://localhost:27017/testingDB';
var clearDB = require('mocha-mongoose')(dbURI);

var supertest = require('supertest');
var app = require('../../../server/app');

describe('Routes CRUD routes', function() {

  beforeEach('Establish DB connection', function(done) {
    if (mongoose.connection.db) return done();
    mongoose.connect(dbURI, done);
  });

  afterEach('Clear test database', function(done) {
    clearDB(done);
  });

  var userAgent;
  var tempUser;
  var desiredRoute = {
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
    }
  }

  beforeEach('create user agent', function(done) {
    userAgent = supertest.agent(app);
    tempUser = new User({
      name: 'Christian Ayscue',
      password: 'christian',
      email: 'coayscue@gmail.com'
    })
    tempUser.save()
      .then(function(user) {
        tempUser = user;
        desiredRoute.userId = tempUser._id;
        done()
      }, function(err) {
        done();
      })
  })

  afterEach('remove users', function(done) {
    User.remove({}).then(function() {
      done();
    })
  })

  describe('CREATES new routes', function() {
    it('and does not return the created object', function(done) {
      userAgent.post('/api/routes')
        .send({
          userId: desiredRoute.userId,
          name: desiredRoute.name,
          url: desiredRoute.url
        })
        .expect(200).end(function(err, res) {
          expect(res.body.name).to.be.undefined;
          expect(res.body.url).to.be.undefined;
          done();
        })
    })

    it('with no selector data and returns the crawl', function(done) {
      userAgent.post('/api/routes')
        .send({
          userId: desiredRoute.userId,
          name: desiredRoute.name,
          url: desiredRoute.url,
          config: {
            returnObj: true
          }
        })
        .expect(200).end(function(err, res) {
          expect(res.body).to.be.an('array');
          expect(res.body.length).to.be.equal(0);
          done()
        })
    })

    it('with data with attributes and indexes', function(done) {
      userAgent.post('/api/routes')
        .send(desiredRoute)
        .expect(200).end(function(err, res) {
          expect(res.body).to.be.an('array');
          expect(res.body.length).to.equal(16);
          done()
        })
    })
  })

  describe('READS data', function() {

    var routeId;
    beforeEach('seed database', function(done) {
      Route.create(desiredRoute)
        .then(function(route) {
          routeId = route._id;
          done();
        }, function(err) {
          console.log('errrr', err)
        });
    })

    afterEach('remove route from db', function(done) {
      Route.findByIdAndRemove(routeId)
        .then(function() {
          done();
        })
    })

    it('with all fields filled', function(done) {
      userAgent.get('/api/routes/' + routeId)
        .expect(200)
        .end(function(err, res) {
          expect(res.body).to.be.defined;
          expect(res.body.name).to.be.equal('nyTimes');
          expect(res.body.data).to.be.an('array');
          done();
        })
    })

    it('not if an incorrect id is given', function(done) {
      userAgent.get('/api/routes/' + 12344513)
        .expect(200)
        .end(function(err, res) {
          expect(res.body.data).to.be.undefined;
          done()
        })
    })
  })

  describe('UPDATES data', function() {

    var routeId;
    beforeEach('seed database', function(done) {
      Route.create(desiredRoute)
        .then(function(route) {
          routeId = route._id;
          done();
        });
    })
    afterEach('remove route from db', function(done) {
      Route.findByIdAndRemove(routeId)
        .then(function() {
          done();
        })
    })

    it('if all fields are filled', function(done) {
      userAgent.put('/api/routes/' + routeId)
        .send({
          name: 'nyNotTimes',
          url: 'https://nynottimes.com',
          data: [{
            name: 'notheadline',
            selector: '.theme-summary .story-heading a',
            indexes: [0, 3, 7]
          }, {
            name: 'notlink',
            selector: '.theme-summary .story-heading a',
            attr: 'href'
          }],
          config: {
            returnObj: false
          }
        })
        .expect(200)
        .end(function(err, res) {
          expect(res.body).to.be.defined;
          expect(res.body.name).to.equal('nyNotTimes');
          done()
        })
    })
  })

  describe('DELETES data', function() {
    var routeId;
    beforeEach('seed database', function(done) {
      Route.create(desiredRoute)
        .then(function(route) {
          routeId = route._id;
          done();
        });
    })
    afterEach('remove route from db', function(done) {
      Route.findByIdAndRemove(routeId)
        .then(function() {
          done();
        }, function() {
          done();
        })
    })


    it('', function(done) {
      userAgent.delete('/api/routes/' + routeId)
        .expect(200)
        .end(function(err, res) {
          // expect(res.body.name).to.equal('nyTimes');
          Route.findById(routeId)
            .then(function(route) {
              expect(route).to.be.null;
              done();
            }, function(err) {
              expect(err).to.be.defined;
              done();
            })
        })
    })
  })
})

describe('Route to crawl', function() {

  var userAgent;
  var tempUser;
  var desiredRoute = {
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
    }
  }

  beforeEach('create user agent and route', function(done) {
    userAgent = supertest.agent(app);
    tempUser = new User({
      name: 'Christian Ayscue',
      password: 'christian',
      email: 'coayscue@gmail.com'
    })
    tempUser.save()
      .then(function(user) {
        tempUser = user;
        desiredRoute.userId = tempUser._id;
        return Route.create(desiredRoute)
      })
      .then(function(route) {
        done();
      })
  })

  it('returns desired data', function(done) {
    userAgent.get('/api/routes/' + tempUser._id + '/nyTimes')
      .expect(200)
      .end(function(err, res) {
        expect(res.body).to.be.an('array');
        expect(res.body[0].link).to.be.a('string');
        done()
      })
  })
})