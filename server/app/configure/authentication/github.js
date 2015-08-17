'use strict';

var passport = require('passport');
var GithubStrategy = require('passport-github').Strategy;
var mongoose = require('mongoose');
var UserModel = mongoose.model('User');


module.exports = function (app) {

	var githubConfig = app.getValue('env').GITHUB;

	var githubCredentials = {
		clientID: githubConfig.clientID,
		clientSecret: githubConfig.clientSecret,
		callbackURL: githubConfig.callbackURL
	};

	var verifyCallback = function( accessToken, refreshToken, profile, done) {

		console.log("test", profile)
        UserModel.findOne({ 'github.id': profile.id }).exec()
            .then(function (user) {

                if (user) {
                    return user;
                } else {
                    return UserModel.create({
                        name: profile.displayName,
                        email: profile.emails[0].value,
                        github: {
                            id: profile.id
                        }
                    });
                }

            }).then(function (userToLogin) {
                done(null, userToLogin);
            }, function (err) {
                console.error('Error creating user from Github authentication', err);
                done(err);
            });
	};

    passport.use(new GithubStrategy(githubCredentials, verifyCallback));

    app.get('/auth/github', passport.authenticate('github', {
        "scope": "user:email"}));

    app.get('/auth/github/callback',
    passport.authenticate('github', { failureRedirect: '/login' }),
        function (req, res) {
            res.redirect('/');
        });
}