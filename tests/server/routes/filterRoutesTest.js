// Instantiate all models
var mongoose = require('mongoose');
require('../../../server/db/models');
var Filter = mongoose.model('Filter');

var expect = require('chai').expect;

var dbURI = 'mongodb://localhost:27017/testingDB';
var clearDB = require('mocha-mongoose')(dbURI);

var supertest = require('supertest');
var app = require('../../../server/app');

var agent = supertest.agent(app);

describe('Filters Route', function () {

	beforeEach('Establish DB connection', function (done) {
		if (mongoose.connection.db) return done();
		mongoose.connect(dbURI, done);
	});

	afterEach('Clear test database', function (done) {
		clearDB(done);
	});

	// make dummy data
	var filter, filter2;
	beforeEach(function(done) {
		Filter.create({
			name: 'test filter',
			parameters: [2],
			description: 'this is a test filter',
			type: 'singleArr',
			defaultFilter: true
		}, function(err, f) {
			if (err) return done(err);
			filter = f;
			done();
		});
	});
	beforeEach(function(done) {
		Filter.create({
			name: 'other test filter',
			parameters: [],
			description: 'this is another test filter',
			type: 'singleElem',
			defaultFilter: false
		}, function(err, f) {
			if (err) return done(err);
			filter2 = f;
			done();
		});
	});

	it('returns all DEFAULT filters', function(done) {
		agent.get('/api/filters')
			.expect(200)
			.end(function(err, res) {
				if (err) return done(err);
				expect(res.body).to.be.instanceof(Array);
				expect(res.body.length).to.equal(1);
				expect(res.body[0].name).to.equal('test filter');
				done();
			});
	});

	it('creates a new filter that is NOT default', function(done) {
		agent.post('/api/filters')
			.send({
				name: 'new filter',
				parameters: [4],
				description: 'this is a new filter',
				type: 'multiArr',
				defaultFilter: false
			})
			.expect(201)
			.end(function(err, res) {
				if (err) return done(err);
				expect(res.body.name).to.equal('new filter');
				expect(res.body.defaultFilter).to.be.false;
				done();
			});
	});

	it('returns one filter specified by id', function(done) {
		agent.get('/api/filters/' + filter2._id)
			.expect(200)
			.end(function(err, res) {
				if (err) return done(err);
				expect(res.body.name).to.equal('other test filter');
				done();
			});
	});

	it('updates non-default fitlers', function(done) {
		agent.put('/api/filters/' + filter2._id)
			.send({
				parameters: [5, 3]
			})
			.expect(200)
			.end(function(err, res) {
				if (err) return done(err);
				expect(res.body.parameters.length).to.equal(2);
				expect(res.body.parameters[1]).to.equal(3);
				// updated in db too
				Filter.findById(filter2._id).exec().then(function(filt) {
					expect(filt.parameters.length).to.equal(2);
					done();
				}).then(null, done);
			});
	});

	it('PUT one that doesn\'t exist', function(done) {
		agent.put('/api/filters/notarealidabcd345431')
			.send({name: 'this shouldn\'t work'})
			.expect(404)
			.end(done);
	});

	it('deletes a filter', function(done) {
		agent.delete('/api/filters/' + filter2._id)
			.expect(204)
			.end(function(err, res) {
				if (err) return done(err);
				// deleted in the db too
				Filter.findById(filter2._id, function(err, filt) {
					expect(filt).to.be.null;
					done();
				});
			});
	});

	it('DELETE one that doesn\'t exist', function (done) {
		agent.delete('/api/filters/123abcnotamongoid')
			.expect(404)
			.end(done);
	});

});
