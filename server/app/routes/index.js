'use strict';
var router = require('express').Router();
module.exports = router;

// router.use('/users', require('./users'));
router.use('/routes', require('./routes'));

// Make sure this is after all of
// the registered routes!
router.use(function (req, res) {
    res.status(404).end();
});

/*
  var ensureAuthenticated = function (req, res, next) {
      if (req.isAuthenticated()) {
          next();
      } else {
          res.status(401).end();
      }
  };
*/
