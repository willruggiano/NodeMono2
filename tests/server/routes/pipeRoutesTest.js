// Instantiate all models
var mongoose = require('mongoose');
require('../../../server/db/models');
var Pipe = mongoose.model('Pipe');
var Filter = mongoose.model('Filter');
var Route = mongoose.model('Route');
var User = mongoose.model('User');

var expect = require('chai').expect;

var dbURI = 'mongodb://localhost:27017/testingDB';
var clearDB = require('mocha-mongoose')(dbURI);

var supertest = require('supertest');
var app = require('../../../server/app');

var agent = supertest.agent(app);

describe('Pipes Route', function () {

	beforeEach('Establish DB connection', function (done) {
		if (mongoose.connection.db) return done();
		mongoose.connect(dbURI, done);
	});

	afterEach('Clear test database', function (done) {
		clearDB(done);
	});

	// make dummy data
	var user, route, route1, filter, pipe, pipe2;
	beforeEach(function(done) {
		User.create({
			name: 'test user',
			email: 'test@user.com',
			password: 'test',
			userKey: 'testKey'
		}).then(function(savedUser) {
			user = savedUser;
			return Route.create({
				name: 'testroute',
                user: user,
                url: 'https://testing.com',
                data: [{
                    name: 'headline',
                    selector: '.testing',
                }, {
                    name: 'link',
                    selector: '.testing',
                    attr: 'href'
                }]
			});
		}).then(function(savedRoute) {
			route = savedRoute;
			return Route.create({
				name: 'testroute2',
                user: user,
                url: 'https://testing2.com',
                data: [{
                    name: 'headline2',
                    selector: '.testing2',
                }, {
                    name: 'link2',
                    selector: '.testing2',
                    attr: 'href'
                }]
			});
		}).then(function(savedRoute2) {
			route2 = savedRoute2;
			return Filter.create({
				name: 'testFilter',
				parameters: [5],
				description: 'this is a test filter',
				type: 'singleElem',
				defaultFilter: true
			});
		}).then(function(savedFilter) {
			filter = savedFilter;
			done();
		})
		.then(null, done);
	});
	beforeEach(function(done) {
		Pipe.create({
			name: 'testPipe',
			user: user,
			inputs: {
				routes: [route, route2],
				pipes: []
			},
			filters: [filter]
		}).then(function(savedPipe) {
			pipe = savedPipe;
			return Pipe.create({
				name: 'testPipe2',
				user: user,
				inputs: {
					routes: [],
					pipes: [pipe]
				},
				filters: []
			});
		}).then(function(savedPipe2) {
			pipe2 = savedPipe2;
			done();
		}).then(null, done);
	});

	it('returns all pipes', function(done) {
		agent.get('/api/pipes')
			.expect(200)
			.end(function(err, res) {
				if (err) return done(err);
				expect(res.body).to.be.instanceof(Array);
				expect(res.body.length).to.equal(2);
				expect(res.body[0].name).to.equal('testPipe');
				done();
			});
	});

	it('creates a new pipe', function(done) {
		agent.post('/api/pipes')
			.send({
				name: 'newPipe',
				user: user,
				inputs: {
					routes: [route2],
					pipes: []
				},
				filters: []
			})
			.expect(201)
			.end(function(err, res) {
				if (err) return done(err);
				expect(res.body.name).to.equal('newPipe');
				expect(res.body.inputs.routes.length).to.equal(1);
				expect(res.body.inputs.routes[0]).to.equal('' + route2._id);
				// find in the db
				Pipe.findById(res.body._id).exec().then(function(foundPipe) {
					expect(foundPipe.name).to.equal('newPipe');
					done();
				}).then(null, done);
			});
	});

	it('returns one pipe specified by id', function(done) {
		agent.get('/api/pipes/' + pipe._id)
			.expect(200)
			.end(function(err, res) {
				if (err) return done(err);
				expect(res.body.name).to.equal('testPipe');
				done();
			});
	});

	it('updates pipes', function(done) {
		agent.put('/api/pipes/' + pipe2._id)
			.send({
				name: 'updatedPipe'
			})
			.expect(200)
			.end(function(err, res) {
				if (err) return done(err);
				expect(res.body.name).to.equal('updatedPipe');
				// updated in db too
				Pipe.findById(pipe2._id).exec().then(function(p) {
					expect(p.name).to.equal('updatedPipe');
					done();
				}).then(null, done);
			});
	});

	it('PUT one that doesn\'t exist', function(done) {
		agent.put('/api/pipes/notarealidabcd345431')
			.send({name: 'this shouldn\'t work'})
			.expect(404)
			.end(done);
	});

	it('deletes a pipe', function(done) {
		agent.delete('/api/pipes/' + pipe2._id)
			.expect(204)
			.end(function(err, res) {
				if (err) return done(err);
				// deleted in the db too
				Pipe.findById(pipe2._id, function(err, p) {
					expect(p).to.be.null;
					done();
				});
			});
	});

	it('DELETE one that doesn\'t exist', function (done) {
		agent.delete('/api/pipes/123abcnotamongoid')
			.expect(404)
			.end(done);
	});

});
