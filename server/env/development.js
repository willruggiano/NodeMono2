var keys = require('../../keys');
module.exports = {
  "DATABASE_URI": "mongodb://localhost:27017/nodemono",
  "SESSION_SECRET": "Optimus Prime is my real dad",
  "TWITTER": {
    "consumerKey": "INSERT_TWITTER_CONSUMER_KEY_HERE",
    "consumerSecret": "INSERT_TWITTER_CONSUMER_SECRET_HERE",
    "callbackUrl": "INSERT_TWITTER_CALLBACK_HERE"
  },
  "FACEBOOK": {
    "clientID": "INSERT_FACEBOOK_CLIENTID_HERE",
    "clientSecret": "INSERT_FACEBOOK_CLIENT_SECRET_HERE",
    "callbackURL": "INSERT_FACEBOOK_CALLBACK_HERE"
  },
  "GOOGLE": {
    "clientID": keys.google.clientID,
    "clientSecret": keys.google.clientSecret,
    "callbackURL": keys.google.callbackURL
  },
  "GITHUB": {
    //token on github: 362522a7bd83012f4fd45a6a9b0605ef39f4dd03//
    "clientID": keys.github.clientID,
    "clientSecret": keys.github.clientSecret,
    "callbackURL": keys.github.callbackURL
  }
};