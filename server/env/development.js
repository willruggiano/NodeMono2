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
    "clientID": "366183496221-laqlnvl94llgrn43fsuupgh2jlgsvs4d.apps.googleusercontent.com",
    "clientSecret": "gaQgopM8BZ5G9HPX_lKWHy6F",
    "callbackURL": "http://localhost:1337/auth/google/callback"
  },
  "GITHUB": {
    //token on github: 362522a7bd83012f4fd45a6a9b0605ef39f4dd03//
    "clientID": "5d800ac60952e6c080aa",
    "clientSecret": "ab3889fef138eba662776f935c597900711f9820",
    "callbackURL": "http://localhost:1337/auth/github/callback"
  }
};