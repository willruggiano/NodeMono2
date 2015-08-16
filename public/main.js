'use strict';
window.app = angular.module('NodemonoApp', ['ui.router', 'ui.bootstrap', 'fsaPreBuilt', 'js-data']);

app.config(function ($urlRouterProvider, $locationProvider, DSProvider, DSHttpAdapterProvider) {
  // This turns off hashbang urls (/#about) and changes it to something normal (/about)
  $locationProvider.html5Mode(true);
  // If we go to a URL that ui-router doesn't have registered, go to the "/" url.
  $urlRouterProvider.otherwise('/');

  // set js-data defaults
  DSProvider.defaults.basePath = '/api';
  DSProvider.defaults.idAttribute = '_id';

  // a method to the DSProvider defaults object that automatically
  // checks if there is any data in the cache for a given service before
  // pinging the database
  DSProvider.defaults.getOrFind = function (service) {
    var data = this.getAll();
    if (data.length) return Promise.resolve(angular.copy(data));else return this.findAll().then(function (data) {
      return angular.copy(data);
    });
  };

  // Mongoose Relation Fix (fixes deserialization)
  // From http://plnkr.co/edit/3z90PD9wwwhWdnVrZqkB?p=preview
  // This was shown to us by @jmdobry, the idea here is that
  // we fix the data coming from Mongoose models in js-data rather than outbound from Mongoose
  function fixRelations(Resource, instance) {
    function fixLocalKeys(i) {
      JSData.DSUtils.forEach(Resource.relationList, function (def) {
        var relationName = def.relation;
        var relationDef = Resource.getResource(relationName);
        if (def.type === 'hasMany') {
          if (i.hasOwnProperty(def.localField)) {
            if (i[def.localField].length && !JSData.DSUtils.isObject(i[def.localField][0])) {
              // Case 1: array of _ids where array of populated objects should be
              i[def.localKeys] = i[def.localField];
              delete i[def.localField];
            } else if (!i[def.localKeys]) {
              // Case 2: array of populated objects, but missing array of _ids'
              i[def.localKeys] = [];
              JSData.DSUtils.forEach(i[def.localField], function (child) {
                i[def.localKeys].push(child[relationDef.idAttribute]);
              });
            }
          }
        } else if (def.type === 'belongsTo') {
          if (i.hasOwnProperty(def.localField)) {
            // if the localfIeld is a popualted object
            if (JSData.DSUtils.isObject(i[def.localField])) {
              i[def.localKey] = i[def.localField]._id;
            }
            // if the localfield is an object id
            else if (!JSData.DSUtils.isObject(i[def.localField])) {
                i[def.localKey] = i[def.localField];
                delete i[def.localField];
              }
          }
        }
      });
    }

    if (JSData.DSUtils.isArray(instance)) {
      JSData.DSUtils.forEach(instance, fixLocalKeys);
    } else {
      fixLocalKeys(instance);
    }
  }

  DSProvider.defaults.deserialize = function (Resource, data) {
    var instance = data.data;
    fixRelations(Resource, instance);
    return instance;
  };
  // End Mongoose Relation fix
});

// This app.run is for controlling access to specific states.
app.run(function ($rootScope, AuthService, $state) {

  // The given state requires an authenticated user.
  var destinationStateRequiresAuth = function destinationStateRequiresAuth(state) {
    return state.data && state.data.authenticate;
  };

  // $stateChangeStart is an event fired
  // whenever the process of changing a state begins.
  $rootScope.$on('$stateChangeStart', function (event, toState, toParams) {

    if (!destinationStateRequiresAuth(toState)) {
      // The destination state does not require authentication
      // Short circuit with return.
      return;
    }

    if (AuthService.isAuthenticated()) {
      // The user is authenticated.
      // Short circuit with return.
      return;
    }

    // Cancel navigating to new state.
    event.preventDefault();

    AuthService.getLoggedInUser().then(function (user) {
      // If a user is retrieved, then renavigate to the destination
      // (the second time, AuthService.isAuthenticated() will work)
      // otherwise, if no user is logged in, go to "login" state.
      if (user) {
        $state.go(toState.name, toParams);
      } else {
        $state.go('login');
      }
    });
  });
});

app.config(function ($stateProvider) {

  // Register our *about* state.
  $stateProvider.state('about', {
    url: '/about',
    controller: 'AboutController',
    templateUrl: 'js/about/about.html'
  });
});

app.controller('AboutController', function ($scope) {

  // $scope.images = _.shuffle(something);

});

app.config(function ($stateProvider) {
  $stateProvider.state('api', {
    url: '/:id/apis',
    templateUrl: 'js/api/api.html',
    controller: function controller($scope, user, routes) {
      $scope.user = user;
      $scope.routes = routes;

      // test data
      $scope.data = {
        name: "Hacker News",
        count: 30,
        frequency: "Manual Crawl",
        version: 2,
        newData: true,
        lastRunStatus: "success",
        thisVersionStatus: "success",
        thisVersionRun: "Thu Aug 13 2015 01:30:48 GMT+0000 (UTC)",
        sourceUrl: 'https://news.ycombinator.com/',
        results: {
          Story: [{
            title: {
              href: "https://plus.google.com/+Ingress/posts/GVvbYZzWyTT",
              text: "Niantic Labs splitting from Google"
            },
            url: "https://news.ycombinator.com/",
            points: "41",
            user: {
              href: "https://news.ycombinator.com/user?id=martindale",
              text: "martindale"
            },
            comments: {
              href: "https://news.ycombinator.com/item?id=10051517",
              text: "15"
            },
            index: 1
          }, {
            title: {
              href: "http://techcrunch.com/2015/08/12/ohm-is-a-smarter-lighter-car-battery-that-works-with-your-existing-car/",
              text: "Ohm (YC S15) is a smarter, lighter car battery that works with your existing car"
            },
            url: "https://news.ycombinator.com/",
            points: "200",
            user: {
              href: "https://news.ycombinator.com/user?id=blueintegral",
              text: "blueintegral"
            },
            comments: {
              href: "https://news.ycombinator.com/item?id=10049927",
              text: "196"
            },
            index: 2
          }, {
            title: {
              href: "https://www.kickstarter.com/projects/45588301/woolfe-the-red-hood-diaries/posts/1168409",
              text: "“It’s done, there is no way back. We tried, we failed”"
            },
            url: "https://news.ycombinator.com/",
            points: "519",
            user: {
              href: "https://news.ycombinator.com/user?id=danso",
              text: "danso"
            },
            comments: {
              href: "https://news.ycombinator.com/item?id=10047721",
              text: "301"
            },
            index: 3
          }, {
            title: {
              href: "http://parnold-x.github.io/nasc/",
              text: "Show HN: NaSC – Do maths like a normal person"
            },
            url: "https://news.ycombinator.com/",
            points: "45",
            user: {
              href: "https://news.ycombinator.com/user?id=macco",
              text: "macco"
            },
            comments: {
              href: "https://news.ycombinator.com/item?id=10050949",
              text: "8"
            },
            index: 4
          }, {
            title: {
              href: "http://arstechnica.com/science/2015/08/octopus-sophistication-driven-by-hundreds-of-previously-unknown-genes/",
              text: "Octopus’ sophistication driven by hundreds of previously unknown genes"
            },
            url: "https://news.ycombinator.com/",
            points: "35",
            user: {
              href: "https://news.ycombinator.com/user?id=Audiophilip",
              text: "Audiophilip"
            },
            comments: {
              href: "https://news.ycombinator.com/item?id=10050582",
              text: "1"
            },
            index: 5
          }, {
            title: {
              href: "http://blog.samaltman.com/projects-and-companies",
              text: "Projects and Companies"
            },
            url: "https://news.ycombinator.com/",
            points: "212",
            user: {
              href: "https://news.ycombinator.com/user?id=runesoerensen",
              text: "runesoerensen"
            },
            comments: {
              href: "https://news.ycombinator.com/item?id=10048557",
              text: "40"
            },
            index: 6
          }, {
            title: {
              href: "https://www.openlistings.co/near",
              text: "Show HN: Find a home close to work"
            },
            url: "https://news.ycombinator.com/",
            points: "61",
            user: {
              href: "https://news.ycombinator.com/user?id=rgbrgb",
              text: "rgbrgb"
            },
            comments: {
              href: "https://news.ycombinator.com/item?id=10049631",
              text: "50"
            },
            index: 7
          }, {
            title: {
              href: "https://www.youtube.com/watch?v=g01dGsKbXOk",
              text: "Netflix – Chasing 60fps [video]"
            },
            url: "https://news.ycombinator.com/",
            points: "46",
            user: {
              href: "https://news.ycombinator.com/user?id=tilt",
              text: "tilt"
            },
            comments: {
              href: "https://news.ycombinator.com/item?id=10050230",
              text: "26"
            },
            index: 8
          }, {
            title: {
              href: "http://www.bbc.com/news/magazine-33860778",
              text: "How the UK found Japanese speakers in a hurry in WW2"
            },
            url: "https://news.ycombinator.com/",
            points: "35",
            user: {
              href: "https://news.ycombinator.com/user?id=samaysharma",
              text: "samaysharma"
            },
            comments: {
              href: "https://news.ycombinator.com/item?id=10050655",
              text: "7"
            },
            index: 9
          }, {
            title: {
              href: "https://groups.google.com/forum/#!topic/emscripten-discuss/gQQRjajQ6iY",
              text: "Emscripten gains experimental pthreads support"
            },
            url: "https://news.ycombinator.com/",
            points: "6",
            user: {
              href: "https://news.ycombinator.com/user?id=vmorgulis",
              text: "vmorgulis"
            },
            comments: {
              href: "",
              text: ""
            },
            index: 10
          }, {
            title: {
              href: "http://news.squeak.org/2015/08/12/squeak-5-is-out/",
              text: "Squeak 5 is out"
            },
            url: "https://news.ycombinator.com/",
            points: "142",
            user: {
              href: "https://news.ycombinator.com/user?id=Fice",
              text: "Fice"
            },
            comments: {
              href: "https://news.ycombinator.com/item?id=10047970",
              text: "26"
            },
            index: 11
          }, {
            title: {
              href: "https://ocharles.org.uk/blog/posts/2014-02-04-how-i-develop-with-nixos.html",
              text: "How I develop with Nix"
            },
            url: "https://news.ycombinator.com/",
            points: "104",
            user: {
              href: "https://news.ycombinator.com/user?id=ayberkt",
              text: "ayberkt"
            },
            comments: {
              href: "https://news.ycombinator.com/item?id=10047005",
              text: "35"
            },
            index: 12
          }, {
            title: {
              href: "https://blog.twitter.com/2015/removing-the-140-character-limit-from-direct-messages",
              text: "Removing the 140-character limit from Direct Messages"
            },
            url: "https://news.ycombinator.com/",
            points: "139",
            user: {
              href: "https://news.ycombinator.com/user?id=uptown",
              text: "uptown"
            },
            comments: {
              href: "https://news.ycombinator.com/item?id=10049137",
              text: "105"
            },
            index: 13
          }, {
            title: {
              href: "http://markallenthornton.com/blog/stylistic-similarity/",
              text: "Analyzing stylistic similarity amongst authors"
            },
            url: "https://news.ycombinator.com/",
            points: "19",
            user: {
              href: "https://news.ycombinator.com/user?id=lingben",
              text: "lingben"
            },
            comments: {
              href: "https://news.ycombinator.com/item?id=10050603",
              text: "5"
            },
            index: 14
          }, {
            title: {
              href: "http://www.tldp.org/HOWTO/Assembly-HOWTO/hello.html",
              text: "Linux Assembly How To: “Hello, World”"
            },
            url: "https://news.ycombinator.com/",
            points: "82",
            user: {
              href: "https://news.ycombinator.com/user?id=mindcrime",
              text: "mindcrime"
            },
            comments: {
              href: "https://news.ycombinator.com/item?id=10049020",
              text: "26"
            },
            index: 15
          }, {
            title: {
              href: "https://apphub.io/",
              text: "AppHub – Update React Native Apps Without Re-Submitting to Apple"
            },
            url: "https://news.ycombinator.com/",
            points: "122",
            user: {
              href: "https://news.ycombinator.com/user?id=arbesfeld",
              text: "arbesfeld"
            },
            comments: {
              href: "https://news.ycombinator.com/item?id=10048072",
              text: "55"
            },
            index: 16
          }, {
            title: {
              href: "https://developer.nvidia.com/deep-learning-courses",
              text: "Deep Learning Courses"
            },
            url: "https://news.ycombinator.com/",
            points: "94",
            user: {
              href: "https://news.ycombinator.com/user?id=cjdulberger",
              text: "cjdulberger"
            },
            comments: {
              href: "https://news.ycombinator.com/item?id=10048487",
              text: "15"
            },
            index: 17
          }, {
            title: {
              href: "http://lens.blogs.nytimes.com/2015/08/12/kodaks-first-digital-moment/",
              text: "Kodak’s First Digital Moment"
            },
            url: "https://news.ycombinator.com/",
            points: "46",
            user: {
              href: "https://news.ycombinator.com/user?id=tysone",
              text: "tysone"
            },
            comments: {
              href: "https://news.ycombinator.com/item?id=10048766",
              text: "17"
            },
            index: 18
          }, {
            title: {
              href: "https://blog.fusiondigital.io/the-internet-of-things-a-look-at-embedded-wifi-development-boards-7abee1311711?source=your-stories",
              text: "A Look at Embedded WiFi Development Boards"
            },
            url: "https://news.ycombinator.com/",
            points: "44",
            user: {
              href: "https://news.ycombinator.com/user?id=hlfshell",
              text: "hlfshell"
            },
            comments: {
              href: "https://news.ycombinator.com/item?id=10048434",
              text: "16"
            },
            index: 19
          }, {
            title: {
              href: "https://github.com/szilard/benchm-ml",
              text: "Comparison of machine learning libraries used for classification"
            },
            url: "https://news.ycombinator.com/",
            points: "172",
            user: {
              href: "https://news.ycombinator.com/user?id=pzs",
              text: "pzs"
            },
            comments: {
              href: "https://news.ycombinator.com/item?id=10047037",
              text: "33"
            },
            index: 20
          }, {
            title: {
              href: "http://venturebeat.com/2015/08/11/sourcedna-launches-searchlight-a-developer-tool-to-find-coding-problems-in-any-app/",
              text: "SourceDNA (YC S15) finds hidden security and quality flaws in apps"
            },
            url: "https://news.ycombinator.com/",
            points: "49",
            user: {
              href: "https://news.ycombinator.com/user?id=katm",
              text: "katm"
            },
            comments: {
              href: "https://news.ycombinator.com/item?id=10049925",
              text: "30"
            },
            index: 21
          }, {
            title: {
              href: "https://github.com/blog/2046-github-desktop-is-now-available",
              text: "GitHub Desktop is now available"
            },
            url: "https://news.ycombinator.com/",
            points: "253",
            user: {
              href: "https://news.ycombinator.com/user?id=bpierre",
              text: "bpierre"
            },
            comments: {
              href: "https://news.ycombinator.com/item?id=10048100",
              text: "203"
            },
            index: 22
          }, {
            title: {
              href: "https://www.theguardian.com/info/developer-blog/2015/aug/12/open-sourcing-grid-image-service",
              text: "Open sourcing Grid, the Guardian’s new image management service"
            },
            url: "https://news.ycombinator.com/",
            points: "126",
            user: {
              href: "https://news.ycombinator.com/user?id=room271",
              text: "room271"
            },
            comments: {
              href: "https://news.ycombinator.com/item?id=10047685",
              text: "17"
            },
            index: 23
          }, {
            title: {
              href: "http://penguinrandomhouse.ca/hazlitt/feature/last-days-kathy-acker",
              text: "The Last Days of Kathy Acker"
            },
            url: "https://news.ycombinator.com/",
            points: "3",
            user: {
              href: "https://news.ycombinator.com/user?id=colinprince",
              text: "colinprince"
            },
            comments: {
              href: "",
              text: ""
            },
            index: 24
          }, {
            title: {
              href: "http://axon.cs.byu.edu/mrsmith/2015IJCNN_MANIC.pdf",
              text: "A Minimal Architecture for General Cognition [pdf]"
            },
            url: "https://news.ycombinator.com/",
            points: "53",
            user: {
              href: "https://news.ycombinator.com/user?id=luu",
              text: "luu"
            },
            comments: {
              href: "https://news.ycombinator.com/item?id=10048017",
              text: "8"
            },
            index: 25
          }, {
            title: {
              href: "https://blog.docker.com/2015/08/content-trust-docker-1-8/",
              text: "Introducing Docker Content Trust"
            },
            url: "https://news.ycombinator.com/",
            points: "83",
            user: {
              href: "https://news.ycombinator.com/user?id=dkasper",
              text: "dkasper"
            },
            comments: {
              href: "https://news.ycombinator.com/item?id=10048096",
              text: "24"
            },
            index: 26
          }, {
            title: {
              href: "http://blog.convox.com/integration-over-invention",
              text: "Integration over Invention"
            },
            url: "https://news.ycombinator.com/",
            points: "87",
            user: {
              href: "https://news.ycombinator.com/user?id=bgentry",
              text: "bgentry"
            },
            comments: {
              href: "https://news.ycombinator.com/item?id=10048086",
              text: "9"
            },
            index: 27
          }, {
            title: {
              href: "http://www.economist.com/news/leaders/21660919-only-second-time-our-history-ownership-economist-changes-new-chapter",
              text: "For only the second time in our history the ownership of The Economist changes"
            },
            url: "https://news.ycombinator.com/",
            points: "149",
            user: {
              href: "https://news.ycombinator.com/user?id=ucaetano",
              text: "ucaetano"
            },
            comments: {
              href: "https://news.ycombinator.com/item?id=10047845",
              text: "126"
            },
            index: 28
          }, {
            title: {
              href: "http://grnh.se/ipfyb3",
              text: "HelloSign (YC W11) Is Hiring a Technical Product Manager for Its API"
            },
            url: "https://news.ycombinator.com/",
            points: "",
            user: {
              href: "",
              text: ""
            },
            comments: {
              href: "",
              text: ""
            },
            index: 29
          }, {
            title: {
              href: "http://newsoffice.mit.edu/2015/real-time-data-for-cancer-therapy-0804",
              text: "Real-time data for cancer therapy"
            },
            url: "https://news.ycombinator.com/",
            points: "18",
            user: {
              href: "https://news.ycombinator.com/user?id=openmaze",
              text: "openmaze"
            },
            comments: {
              href: "",
              text: ""
            },
            index: 30
          }]
        }
      };
    },
    resolve: {
      user: function user($stateParams, User) {
        return User.find($stateParams.id);
      },
      routes: function routes(user) {
        return user.getRoutes();
      }
    }
  });
});

app.config(function ($stateProvider) {
  $stateProvider.state('docs', {
    url: '/docs',
    templateUrl: 'js/docs/docs.html'
  });
});

app.config(function ($stateProvider) {
  $stateProvider.state('help', {
    url: '/help',
    templateUrl: 'js/help/help.html'
  });
})(function () {

  'use strict';

  // Hope you didn't forget Angular! Duh-doy.
  if (!window.angular) throw new Error('I can\'t find Angular!');

  var app = angular.module('fsaPreBuilt', []);

  app.factory('Socket', function () {
    if (!window.io) throw new Error('socket.io not found!');
    return window.io(window.location.origin);
  });

  // AUTH_EVENTS is used throughout our app to
  // broadcast and listen from and to the $rootScope
  // for important events about authentication flow.
  app.constant('AUTH_EVENTS', {
    loginSuccess: 'auth-login-success',
    loginFailed: 'auth-login-failed',
    logoutSuccess: 'auth-logout-success',
    sessionTimeout: 'auth-session-timeout',
    notAuthenticated: 'auth-not-authenticated',
    notAuthorized: 'auth-not-authorized'
  });

  app.factory('AuthInterceptor', function ($rootScope, $q, AUTH_EVENTS) {
    var statusDict = {
      401: AUTH_EVENTS.notAuthenticated,
      403: AUTH_EVENTS.notAuthorized,
      419: AUTH_EVENTS.sessionTimeout,
      440: AUTH_EVENTS.sessionTimeout
    };
    return {
      responseError: function responseError(response) {
        $rootScope.$broadcast(statusDict[response.status], response);
        return $q.reject(response);
      }
    };
  });

  app.config(function ($httpProvider) {
    $httpProvider.interceptors.push(['$injector', function ($injector) {
      return $injector.get('AuthInterceptor');
    }]);
  });

  app.service('AuthService', function ($http, Session, $rootScope, AUTH_EVENTS, $q, User) {

    function onSuccessfulLogin(response) {
      var data = response.data;
      Session.create(data.id, data.user);
      $rootScope.$broadcast(AUTH_EVENTS.loginSuccess);
      return data.user;
    }

    // Uses the session factory to see if an
    // authenticated user is currently registered.
    this.isAuthenticated = function () {
      return !!Session.user;
    };

    this.getLoggedInUser = function (fromServer) {

      // If an authenticated session exists, we
      // return the user attached to that session
      // with a promise. This ensures that we can
      // always interface with this method asynchronously.

      // Optionally, if true is given as the fromServer parameter,
      // then this cached value will not be used.

      if (this.isAuthenticated() && fromServer !== true) {
        return $q.when(Session.user);
      }

      // Make request GET /session.
      // If it returns a user, call onSuccessfulLogin with the response.
      // If it returns a 401 response, we catch it and instead resolve to null.
      return $http.get('/session').then(onSuccessfulLogin)['catch'](function () {
        return null;
      });
    };

    this.login = function (credentials) {
      return $http.post('/login', credentials).then(onSuccessfulLogin)['catch'](function () {
        return $q.reject({ message: 'Invalid login credentials.' });
      });
    };

    this.logout = function () {
      return $http.get('/logout').then(function () {
        Session.destroy();
        $rootScope.$broadcast(AUTH_EVENTS.logoutSuccess);
      });
    };
  });

  app.service('Session', function ($rootScope, AUTH_EVENTS) {

    var self = this;

    $rootScope.$on(AUTH_EVENTS.notAuthenticated, function () {
      self.destroy();
    });

    $rootScope.$on(AUTH_EVENTS.sessionTimeout, function () {
      self.destroy();
    });

    this.id = null;
    this.user = null;

    this.create = function (sessionId, user) {
      this.id = sessionId;
      this.user = user;
    };

    this.destroy = function () {
      this.id = null;
      this.user = null;
    };
  });
})();

app.config(function ($stateProvider) {
  $stateProvider.state('home', {
    url: '/',
    templateUrl: 'js/home/home.html',
    controller: function controller($scope, users, routes) {
      $scope.users = users;
      $scope.routes = routes;

      // check whether user agent is running chrome
      $scope.hasChrome = function () {
        return navigator.userAgent.toLowerCase().includes('chrome');
      };
    },
    resolve: {
      users: function users(User) {
        return User.findAll({}, { bypassCache: true });
      },
      routes: function routes(Route) {
        return Route.findAll({}, { bypassCache: true });
      }
    }
  });
});

app.config(function ($stateProvider) {

  $stateProvider.state('login', {
    url: '/login',
    templateUrl: 'js/login/login.html',
    controller: 'LoginCtrl'
  });
});

app.controller('LoginCtrl', function ($scope, AuthService, $state) {

  $scope.login = {};
  $scope.error = null;

  $scope.sendLogin = function (loginInfo) {

    $scope.error = null;

    AuthService.login(loginInfo).then(function (user) {
      $state.go('user', { id: user._id });
    })['catch'](function () {
      $scope.error = 'Invalid login credentials.';
    });
  };
});

app.config(function ($stateProvider) {

  $stateProvider.state('membersOnly', {
    url: '/members-area',
    template: '',
    controller: function controller($scope) {},

    // The following data.authenticate is read by an event listener
    // that controls access to this state. Refer to app.js.
    data: {
      authenticate: true
    }
  });
});

app.factory('PipesFactory', function ($http, $q) {
  var fact = {};

  fact.getRoutes = function () {
    return $http.get('/api/routes').then(function (res) {
      return res.data;
    });
  };

  fact.getFilters = function () {
    // dummy filter data for now
    return [{
      name: 'length'
    }];
  };

  fact.getCrawlData = function (route) {
    // dummy data for testing
    // return {title: [route.name, route.name + '1'], more: [route.url]};

    // get crawled data for the route
    return $http.get('/api/routes/' + route.user + '/' + route.name).then(function (res) {
      return res.data;
    });
  };

  fact.getAllInputData = function (inputRoutes) {
    // fire off requests for crawled data
    var crawlPromises = inputRoutes.map(function (inputRoute) {
      return fact.getCrawlData(inputRoute);
    });
    // resolve when all promises resolve with their crawled data
    return $q.all(crawlPromises);
  };

  // run selected inputs through the pipe filters and return the output
  fact.generateOutput = function (pipe) {
    // get all the input's crawled data
    return fact.getAllInputData(pipe.inputs).then(function (inputData) {
      console.log('input data', inputData);
      // run input data through the selected pipes (i.e. filters)
      return fact.pipe(inputData, pipe.filters);
    }).then(function (pipedData) {
      // piped data, basically the output data (?)
      console.log('piped data', pipedData);
      pipe.output = pipedData; // (?)
      return pipedData;
    })['catch'](function (err) {
      // handle errors
      console.error(err);
    });
  };

  fact.pipe = function (inputData, pipes) {
    // nothing for now
    return inputData;
  };

  // fact.savePipe = ()

  return fact;
});
app.config(function ($stateProvider) {
  $stateProvider.state('pipes', {
    url: '/pipes',
    templateUrl: 'js/pipes/pipes.html',
    controller: 'PipesCtrl',
    resolve: {
      routes: function routes(PipesFactory) {
        return PipesFactory.getRoutes();
      },
      filters: function filters(PipesFactory) {
        return PipesFactory.getFilters();
      }
    }
  });
});

app.controller('PipesCtrl', function ($scope, PipesFactory, routes, filters) {
  $scope.routes = routes;
  $scope.filters = filters;

  // holds pipeline logic (what the user is making on this page)
  $scope.pipe = {
    // array of selected routes
    inputs: [],
    // array of the selected filters (and their order?)
    // / call it "pipeline" instead?
    filters: [],
    // array (for now) of the outputs from each pipe/input (for now)
    output: []
  };

  // returns crawled data for the passed in route
  $scope.getCrawlData = function (route) {
    console.log('crawling for', route.name);
    PipesFactory.getCrawlData(route).then(function (data) {
      console.log('got data', data);
    });
  };

  // add route to pipe input
  $scope.selectRoute = function (route) {
    $scope.pipe.inputs.push(route);
  };

  // remove route from pipe input
  $scope.deselectRoute = function (route) {
    $scope.pipe.inputs = $scope.pipe.inputs.filter(function (input) {
      return input !== route;
    });
  };

  // add filter to pipeline
  $scope.selectFilter = function (filter) {
    $scope.pipe.filters.push(filter);
  };

  // remove filter from pipeline
  $scope.deselectFilter = function (filter) {
    $scope.pipe.filters = $scope.pipe.filters.filter(function (pipe) {
      return pipe !== filter;
    });
  };

  // run selected inputs through the pipe filters and return the output
  $scope.generateOutput = function () {
    PipesFactory.generateOutput($scope.pipe).then(function (output) {
      console.log(output);
    });
  };

  // saves this pipe to the user db
  $scope.savePipe = function () {
    PipesFactory.savePipe($scope.pipe).then(function (data) {
      console.log('saved the pipe', data);
    });
  };
});
app.factory('Route', function ($state, DS) {

  var Route = DS.defineResource({
    name: 'route',
    endpoint: 'routes',
    relations: {
      belongsTo: {
        user: {
          // local field is for linking relations
          // route.user -> user(owner) of the route
          localField: '_user',
          // local key is the "join" field
          // the name of the field on the route that points to its parent user
          localKey: 'user'
        }
      }
    },
    methods: {
      go: function go() {
        console.log('transitioning to route state (' + this.name + ', ' + this._id + ')');
        // $state.go('route', { id: this._id })
      }
    }
  });

  return Route;
}).run(function (Route) {});

app.factory('User', function ($state, Route, DS) {

  var User = DS.defineResource({
    name: 'user',
    endpoint: 'users',
    relations: {
      hasMany: {
        route: {
          // local field is for linking relations
          // user.routes -> array of routes for the user
          localField: 'routes',
          // foreign key is the 'join' field
          // the name of the field on a route that points to its parent user
          foreignKey: 'user'
        }
      }
    },
    methods: { // functionality added to every instance of User
      go: function go() {
        $state.go('api', { id: this._id });
      },
      getRoutes: function getRoutes() {
        return Route.findAll({ 'user': this._id });
      }
    }
  });

  return User;
}).run(function (User) {});

app.directive('filter', function () {
  return {
    restrict: 'E',
    templateUrl: 'js/pipes/filter/filter.html',
    scope: {
      filter: '=',
      select: '&'
    },
    link: function link() {}
  };
});
app.directive('route', function () {
  return {
    restrict: 'E',
    templateUrl: 'js/pipes/route/route.html',
    scope: {
      route: '=',
      get: '&',
      select: '&'
    },
    link: function link() {}
  };
});
app.directive('navbar', function ($rootScope, $state, AuthService, AUTH_EVENTS, User) {

  return {
    restrict: 'E',
    scope: {},
    templateUrl: 'js/common/directives/navbar/navbar.html',
    link: function link(scope, elem, attr) {

      scope.items = [
      // { label: 'Home', state: 'home' },
      { label: 'Pipes', state: 'pipes' }, { label: 'Documentation', state: 'docs' }, { label: 'About', state: 'about' }, { label: 'Help', state: 'help' }];

      //{ label: 'Members Only', state: 'membersOnly', auth: true }
      scope.show = false;

      scope.toggle = function () {
        return scope.show = !scope.show;
      };

      scope.search = function () {
        console.log('searching for something...');
      };

      scope.user = null;

      scope.isLoggedIn = function () {
        return AuthService.isAuthenticated();
      };

      scope.logout = function () {
        AuthService.logout().then(function () {
          $state.go('home');
        });
      };

      var setUser = function setUser() {
        AuthService.getLoggedInUser().then(function (user) {
          return User.find(user._id);
        }).then(function (user) {
          scope.user = user;
          return user;
        });
      };

      var removeUser = function removeUser() {
        scope.user = null;
      };

      setUser();

      $rootScope.$on(AUTH_EVENTS.loginSuccess, setUser);
      $rootScope.$on(AUTH_EVENTS.logoutSuccess, removeUser);
      $rootScope.$on(AUTH_EVENTS.sessionTimeout, removeUser);
    }

  };
});

'use strict';

app.directive('ngEnter', function () {
  return {
    restrict: 'A',
    scope: {
      ngEnter: '&'
    },
    link: function link(scope, elem, attr) {
      elem.bind('keydown keypress', function (event) {
        if (event.which == 13) {
          scope.$apply(function () {
            scope.ngEnter();
          });
          return false;
        }
      });
    }
  };
});

app.directive('nodemonoLogo', function () {
  return {
    restrict: 'E',
    templateUrl: 'js/common/directives/nodemono-logo/nodemono-logo.html',
    link: function link(scope, elem, attr) {

      scope.installChromeExt = function () {
        console.log('installing Nodemono chrome extension...');
      };
    }
  };
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImFib3V0L2Fib3V0LmpzIiwiYXBpL2FwaS5qcyIsImRvY3MvZG9jcy5qcyIsImhlbHAvaGVscC5qcyIsImZzYS9mc2EtcHJlLWJ1aWx0LmpzIiwiaG9tZS9ob21lLmpzIiwibG9naW4vbG9naW4uanMiLCJtZW1iZXJzLW9ubHkvbWVtYmVycy1vbmx5LmpzIiwicGlwZXMvcGlwZXMuZmFjdG9yeS5qcyIsInBpcGVzL3BpcGVzLmpzIiwiY29tbW9uL2ZhY3Rvcmllcy9yb3V0ZS5mYWN0b3J5LmpzIiwiY29tbW9uL2ZhY3Rvcmllcy91c2VyLmZhY3RvcnkuanMiLCJwaXBlcy9maWx0ZXIvZmlsdGVyLmpzIiwicGlwZXMvcm91dGUvcm91dGUuanMiLCJjb21tb24vZGlyZWN0aXZlcy9uYXZiYXIvbmF2YmFyLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvbmdFbnRlci9uZ0VudGVyLmRpcmVjdGl2ZS5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL25vZGVtb25vLWxvZ28vbm9kZW1vbm8tbG9nby5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxZQUFBLENBQUE7QUFDQSxNQUFBLENBQUEsR0FBQSxHQUFBLE9BQUEsQ0FBQSxNQUFBLENBQUEsYUFBQSxFQUFBLENBQUEsV0FBQSxFQUFBLGNBQUEsRUFBQSxhQUFBLEVBQUEsU0FBQSxDQUFBLENBQUEsQ0FBQTs7QUFFQSxHQUFBLENBQUEsTUFBQSxDQUFBLFVBQUEsa0JBQUEsRUFBQSxpQkFBQSxFQUFBLFVBQUEsRUFBQSxxQkFBQSxFQUFBOztBQUVBLG1CQUFBLENBQUEsU0FBQSxDQUFBLElBQUEsQ0FBQSxDQUFBOztBQUVBLG9CQUFBLENBQUEsU0FBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBOzs7QUFHQSxZQUFBLENBQUEsUUFBQSxDQUFBLFFBQUEsR0FBQSxNQUFBLENBQUE7QUFDQSxZQUFBLENBQUEsUUFBQSxDQUFBLFdBQUEsR0FBQSxLQUFBLENBQUE7Ozs7O0FBTUEsWUFBQSxDQUFBLFFBQUEsQ0FBQSxTQUFBLEdBQUEsVUFBQSxPQUFBLEVBQUE7QUFDQSxRQUFBLElBQUEsR0FBQSxJQUFBLENBQUEsTUFBQSxFQUFBLENBQUE7QUFDQSxRQUFBLElBQUEsQ0FBQSxNQUFBLEVBQUEsT0FBQSxPQUFBLENBQUEsT0FBQSxDQUFBLE9BQUEsQ0FBQSxJQUFBLENBQUEsSUFBQSxDQUFBLENBQUEsQ0FBQSxLQUNBLE9BQUEsSUFBQSxDQUFBLE9BQUEsRUFBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLElBQUE7YUFBQSxPQUFBLENBQUEsSUFBQSxDQUFBLElBQUEsQ0FBQTtLQUFBLENBQUEsQ0FBQTtHQUNBLENBQUE7Ozs7OztBQU1BLFdBQUEsWUFBQSxDQUFBLFFBQUEsRUFBQSxRQUFBLEVBQUE7QUFDQSxhQUFBLFlBQUEsQ0FBQSxDQUFBLEVBQUE7QUFDQSxZQUFBLENBQUEsT0FBQSxDQUFBLE9BQUEsQ0FBQSxRQUFBLENBQUEsWUFBQSxFQUFBLFVBQUEsR0FBQSxFQUFBO0FBQ0EsWUFBQSxZQUFBLEdBQUEsR0FBQSxDQUFBLFFBQUEsQ0FBQTtBQUNBLFlBQUEsV0FBQSxHQUFBLFFBQUEsQ0FBQSxXQUFBLENBQUEsWUFBQSxDQUFBLENBQUE7QUFDQSxZQUFBLEdBQUEsQ0FBQSxJQUFBLEtBQUEsU0FBQSxFQUFBO0FBQ0EsY0FBQSxDQUFBLENBQUEsY0FBQSxDQUFBLEdBQUEsQ0FBQSxVQUFBLENBQUEsRUFBQTtBQUNBLGdCQUFBLENBQUEsQ0FBQSxHQUFBLENBQUEsVUFBQSxDQUFBLENBQUEsTUFBQSxJQUFBLENBQUEsTUFBQSxDQUFBLE9BQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQSxDQUFBLEdBQUEsQ0FBQSxVQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxFQUFBOztBQUVBLGVBQUEsQ0FBQSxHQUFBLENBQUEsU0FBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBLEdBQUEsQ0FBQSxVQUFBLENBQUEsQ0FBQTtBQUNBLHFCQUFBLENBQUEsQ0FBQSxHQUFBLENBQUEsVUFBQSxDQUFBLENBQUE7YUFDQSxNQUFBLElBQUEsQ0FBQSxDQUFBLENBQUEsR0FBQSxDQUFBLFNBQUEsQ0FBQSxFQUFBOztBQUVBLGVBQUEsQ0FBQSxHQUFBLENBQUEsU0FBQSxDQUFBLEdBQUEsRUFBQSxDQUFBO0FBQ0Esb0JBQUEsQ0FBQSxPQUFBLENBQUEsT0FBQSxDQUFBLENBQUEsQ0FBQSxHQUFBLENBQUEsVUFBQSxDQUFBLEVBQUEsVUFBQSxLQUFBLEVBQUE7QUFDQSxpQkFBQSxDQUFBLEdBQUEsQ0FBQSxTQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsS0FBQSxDQUFBLFdBQUEsQ0FBQSxXQUFBLENBQUEsQ0FBQSxDQUFBO2VBQ0EsQ0FBQSxDQUFBO2FBQ0E7V0FDQTtTQUNBLE1BQ0EsSUFBQSxHQUFBLENBQUEsSUFBQSxLQUFBLFdBQUEsRUFBQTtBQUNBLGNBQUEsQ0FBQSxDQUFBLGNBQUEsQ0FBQSxHQUFBLENBQUEsVUFBQSxDQUFBLEVBQUE7O0FBRUEsZ0JBQUEsTUFBQSxDQUFBLE9BQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQSxDQUFBLEdBQUEsQ0FBQSxVQUFBLENBQUEsQ0FBQSxFQUFBO0FBQ0EsZUFBQSxDQUFBLEdBQUEsQ0FBQSxRQUFBLENBQUEsR0FBQSxDQUFBLENBQUEsR0FBQSxDQUFBLFVBQUEsQ0FBQSxDQUFBLEdBQUEsQ0FBQTthQUNBOztpQkFFQSxJQUFBLENBQUEsTUFBQSxDQUFBLE9BQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQSxDQUFBLEdBQUEsQ0FBQSxVQUFBLENBQUEsQ0FBQSxFQUFBO0FBQ0EsaUJBQUEsQ0FBQSxHQUFBLENBQUEsUUFBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBLEdBQUEsQ0FBQSxVQUFBLENBQUEsQ0FBQTtBQUNBLHVCQUFBLENBQUEsQ0FBQSxHQUFBLENBQUEsVUFBQSxDQUFBLENBQUE7ZUFDQTtXQUNBO1NBQ0E7T0FDQSxDQUFBLENBQUE7S0FDQTs7QUFFQSxRQUFBLE1BQUEsQ0FBQSxPQUFBLENBQUEsT0FBQSxDQUFBLFFBQUEsQ0FBQSxFQUFBO0FBQ0EsWUFBQSxDQUFBLE9BQUEsQ0FBQSxPQUFBLENBQUEsUUFBQSxFQUFBLFlBQUEsQ0FBQSxDQUFBO0tBQ0EsTUFBQTtBQUNBLGtCQUFBLENBQUEsUUFBQSxDQUFBLENBQUE7S0FDQTtHQUNBOztBQUdBLFlBQUEsQ0FBQSxRQUFBLENBQUEsV0FBQSxHQUFBLFVBQUEsUUFBQSxFQUFBLElBQUEsRUFBQTtBQUNBLFFBQUEsUUFBQSxHQUFBLElBQUEsQ0FBQSxJQUFBLENBQUE7QUFDQSxnQkFBQSxDQUFBLFFBQUEsRUFBQSxRQUFBLENBQUEsQ0FBQTtBQUNBLFdBQUEsUUFBQSxDQUFBO0dBQ0EsQ0FBQTs7Q0FFQSxDQUFBLENBQUE7OztBQUdBLEdBQUEsQ0FBQSxHQUFBLENBQUEsVUFBQSxVQUFBLEVBQUEsV0FBQSxFQUFBLE1BQUEsRUFBQTs7O0FBR0EsTUFBQSw0QkFBQSxHQUFBLFNBQUEsNEJBQUEsQ0FBQSxLQUFBLEVBQUE7QUFDQSxXQUFBLEtBQUEsQ0FBQSxJQUFBLElBQUEsS0FBQSxDQUFBLElBQUEsQ0FBQSxZQUFBLENBQUE7R0FDQSxDQUFBOzs7O0FBSUEsWUFBQSxDQUFBLEdBQUEsQ0FBQSxtQkFBQSxFQUFBLFVBQUEsS0FBQSxFQUFBLE9BQUEsRUFBQSxRQUFBLEVBQUE7O0FBRUEsUUFBQSxDQUFBLDRCQUFBLENBQUEsT0FBQSxDQUFBLEVBQUE7OztBQUdBLGFBQUE7S0FDQTs7QUFFQSxRQUFBLFdBQUEsQ0FBQSxlQUFBLEVBQUEsRUFBQTs7O0FBR0EsYUFBQTtLQUNBOzs7QUFHQSxTQUFBLENBQUEsY0FBQSxFQUFBLENBQUE7O0FBRUEsZUFBQSxDQUFBLGVBQUEsRUFBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLElBQUEsRUFBQTs7OztBQUlBLFVBQUEsSUFBQSxFQUFBO0FBQ0EsY0FBQSxDQUFBLEVBQUEsQ0FBQSxPQUFBLENBQUEsSUFBQSxFQUFBLFFBQUEsQ0FBQSxDQUFBO09BQ0EsTUFBQTtBQUNBLGNBQUEsQ0FBQSxFQUFBLENBQUEsT0FBQSxDQUFBLENBQUE7T0FDQTtLQUNBLENBQUEsQ0FBQTtHQUVBLENBQUEsQ0FBQTtDQUVBLENBQUEs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QUFBLGFBQUE7QUFDQSxTQUFBLEVBQUEsV0FBQSxDQUFBLGNBQUE7QUFDQSxTQUFBLEVBQUEsV0FBQSxDQUFBLGNBQUE7S0FDQSxDQUFBO0FBQ0EsV0FBQTtBQUNBLG1CQUFBLEVBQUEsdUJBQUEsUUFBQSxFQUFBO0FBQ0Esa0JBQUEsQ0FBQSxVQUFBLENBQUEsVUFBQSxDQUFBLFFBQUEsQ0FBQSxNQUFBLENBQUEsRUFBQSxRQUFBLENBQUEsQ0FBQTtBQUNBLGVBQUEsRUFBQSxDQUFBLE1BQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQTtPQUNBO0tBQ0EsQ0FBQTtHQUNBLENBQUEsQ0FBQTs7QUFFQSxLQUFBLENBQUEsTUFBQSxDQUFBLFVBQUEsYUFBQSxFQUFBO0FBQ0EsaUJBQUEsQ0FBQSxZQUFBLENBQUEsSUFBQSxDQUFBLENBQ0EsV0FBQSxFQUNBLFVBQUEsU0FBQSxFQUFBO0FBQ0EsYUFBQSxTQUFBLENBQUEsR0FBQSxDQUFBLGlCQUFBLENBQUEsQ0FBQTtLQUNBLENBQ0EsQ0FBQSxDQUFBO0dBQ0EsQ0FBQSxDQUFBOztBQUVBLEtBQUEsQ0FBQSxPQUFBLENBQUEsYUFBQSxFQUFBLFVBQUEsS0FBQSxFQUFBLE9BQUEsRUFBQSxVQUFBLEVBQUEsV0FBQSxFQUFBLEVBQUEsRUFBQSxJQUFBLEVBQUE7O0FBRUEsYUFBQSxpQkFBQSxDQUFBLFFBQUEsRUFBQTtBQUNBLFVBQUEsSUFBQSxHQUFBLFFBQUEsQ0FBQSxJQUFBLENBQUE7QUFDQSxhQUFBLENBQUEsTUFBQSxDQUFBLElBQUEsQ0FBQSxFQUFBLEVBQUEsSUFBQSxDQUFBLElBQUEsQ0FBQSxDQUFBO0FBQ0EsZ0JBQUEsQ0FBQSxVQUFBLENBQUEsV0FBQSxDQUFBLFlBQUEsQ0FBQSxDQUFBO0FBQ0EsYUFBQSxJQUFBLENBQUEsSUFBQSxDQUFBO0tBQ0E7Ozs7QUFJQSxRQUFBLENBQUEsZUFBQSxHQUFBLFlBQUE7QUFDQSxhQUFBLENBQUEsQ0FBQSxPQUFBLENBQUEsSUFBQSxDQUFBO0tBQ0EsQ0FBQTs7QUFFQSxRQUFBLENBQUEsZUFBQSxHQUFBLFVBQUEsVUFBQSxFQUFBOzs7Ozs7Ozs7O0FBVUEsVUFBQSxJQUFBLENBQUEsZUFBQSxFQUFBLElBQUEsVUFBQSxLQUFBLElBQUEsRUFBQTtBQUNBLGVBQUEsRUFBQSxDQUFBLElBQUEsQ0FBQSxPQUFBLENBQUEsSUFBQSxDQUFBLENBQUE7T0FDQTs7Ozs7QUFLQSxhQUFBLEtBQUEsQ0FBQSxHQUFBLENBQUEsVUFBQSxDQUFBLENBQUEsSUFBQSxDQUFBLGlCQUFBLENBQUEsU0FBQSxDQUFBLFlBQUE7QUFDQSxlQUFBLElBQUEsQ0FBQTtPQUNBLENBQUEsQ0FBQTtLQUVBLENBQUE7O0FBRUEsUUFBQSxDQUFBLEtBQUEsR0FBQSxVQUFBLFdBQUEsRUFBQTtBQUNBLGFBQUEsS0FBQSxDQUFBLElBQUEsQ0FBQSxRQUFBLEVBQUEsV0FBQSxDQUFBLENBQ0EsSUFBQSxDQUFBLGlCQUFBLENBQUEsU0FDQSxDQUFBLFlBQUE7QUFDQSxlQUFBLEVBQUEsQ0FBQSxNQUFBLENBQUEsRUFBQSxPQUFBLEVBQUEsNEJBQUEsRUFBQSxDQUFBLENBQUE7T0FDQSxDQUFBLENBQUE7S0FDQSxDQUFBOztBQUVBLFFBQUEsQ0FBQSxNQUFBLEdBQUEsWUFBQTtBQUNBLGFBQUEsS0FBQSxDQUFBLEdBQUEsQ0FBQSxTQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsWUFBQTtBQUNBLGVBQUEsQ0FBQSxPQUFBLEVBQUEsQ0FBQTtBQUNBLGtCQUFBLENBQUEsVUFBQSxDQUFBLFdBQUEsQ0FBQSxhQUFBLENBQUEsQ0FBQTtPQUNBLENBQUEsQ0FBQTtLQUNBLENBQUE7R0FFQSxDQUFBLENBQUE7O0FBRUEsS0FBQSxDQUFBLE9BQUEsQ0FBQSxTQUFBLEVBQUEsVUFBQSxVQUFBLEVBQUEsV0FBQSxFQUFBOztBQUVBLFFBQUEsSUFBQSxHQUFBLElBQUEsQ0FBQTs7QUFFQSxjQUFBLENBQUEsR0FBQSxDQUFBLFdBQUEsQ0FBQSxnQkFBQSxFQUFBLFlBQUE7QUFDQSxVQUFBLENBQUEsT0FBQSxFQUFBLENBQUE7S0FDQSxDQUFBLENBQUE7O0FBRUEsY0FBQSxDQUFBLEdBQUEsQ0FBQSxXQUFBLENBQUEsY0FBQSxFQUFBLFlBQUE7QUFDQSxVQUFBLENBQUEsT0FBQSxFQUFBLENBQUE7S0FDQSxDQUFBLENBQUE7O0FBRUEsUUFBQSxDQUFBLEVBQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxRQUFBLENBQUEsSUFBQSxHQUFBLElBQUEsQ0FBQTs7QUFFQSxRQUFBLENBQUEsTUFBQSxHQUFBLFVBQUEsU0FBQSxFQUFBLElBQUEsRUFBQTtBQUNBLFVBQUEsQ0FBQSxFQUFBLEdBQUEsU0FBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLElBQUEsR0FBQSxJQUFBLENBQUE7S0FDQSxDQUFBOztBQUVBLFFBQUEsQ0FBQSxPQUFBLEdBQUEsWUFBQTtBQUNBLFVBQUEsQ0FBQSxFQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLElBQUEsR0FBQSxJQUFBLENBQUE7S0FDQSxDQUFBO0dBRUEsQ0FBQSxDQUFBO0NBRUEsQ0FBQSxFQUFBLENBQUE7O0FDcElBLEdBQUEsQ0FBQSxNQUFBLENBQUEsVUFBQSxjQUFBLEVBQUE7QUFDQSxnQkFBQSxDQUFBLEtBQUEsQ0FBQSxNQUFBLEVBQUE7QUFDQSxPQUFBLEVBQUEsR0FBQTtBQUNBLGVBQUEsRUFBQSxtQkFBQTtBQUNBLGNBQUEsRUFBQSxvQkFBQSxNQUFBLEVBQUEsS0FBQSxFQUFBLE1BQUEsRUFBQTtBQUNBLFlBQUEsQ0FBQSxLQUFBLEdBQUEsS0FBQSxDQUFBO0FBQ0EsWUFBQSxDQUFBLE1BQUEsR0FBQSxNQUFBLENBQUE7OztBQUdBLFlBQUEsQ0FBQSxTQUFBLEdBQUE7ZUFBQSxTQUFBLENBQUEsU0FBQSxDQUFBLFdBQUEsRUFBQSxDQUFBLFFBQUEsQ0FBQSxRQUFBLENBQUE7T0FBQSxDQUFBO0tBQ0E7QUFDQSxXQUFBLEVBQUE7QUFDQSxXQUFBLEVBQUEsZUFBQSxJQUFBO2VBQUEsSUFBQSxDQUFBLE9BQUEsQ0FBQSxFQUFBLEVBQUEsRUFBQSxXQUFBLEVBQUEsSUFBQSxFQUFBLENBQUE7T0FBQTtBQUNBLFlBQUEsRUFBQSxnQkFBQSxLQUFBO2VBQUEsS0FBQSxDQUFBLE9BQUEsQ0FBQSxFQUFBLEVBQUEsRUFBQSxXQUFBLEVBQUEsSUFBQSxFQUFBLENBQUE7T0FBQTtLQUNBO0dBQ0EsQ0FBQSxDQUFBO0NBQ0EsQ0FBQSxDQUFBOztBQ2hCQSxHQUFBLENBQUEsTUFBQSxDQUFBLFVBQUEsY0FBQSxFQUFBOztBQUVBLGdCQUFBLENBQUEsS0FBQSxDQUFBLE9BQUEsRUFBQTtBQUNBLE9BQUEsRUFBQSxRQUFBO0FBQ0EsZUFBQSxFQUFBLHFCQUFBO0FBQ0EsY0FBQSxFQUFBLFdBQUE7R0FDQSxDQUFBLENBQUE7Q0FFQSxDQUFBLENBQUE7O0FBRUEsR0FBQSxDQUFBLFVBQUEsQ0FBQSxXQUFBLEVBQUEsVUFBQSxNQUFBLEVBQUEsV0FBQSxFQUFBLE1BQUEsRUFBQTs7QUFFQSxRQUFBLENBQUEsS0FBQSxHQUFBLEVBQUEsQ0FBQTtBQUNBLFFBQUEsQ0FBQSxLQUFBLEdBQUEsSUFBQSxDQUFBOztBQUVBLFFBQUEsQ0FBQSxTQUFBLEdBQUEsVUFBQSxTQUFBLEVBQUE7O0FBRUEsVUFBQSxDQUFBLEtBQUEsR0FBQSxJQUFBLENBQUE7O0FBRUEsZUFBQSxDQUFBLEtBQUEsQ0FBQSxTQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxJQUFBLEVBQUE7QUFDQSxZQUFBLENBQUEsRUFBQSxDQUFBLE1BQUEsRUFBQSxFQUFBLEVBQUEsRUFBQSxJQUFBLENBQUEsR0FBQSxFQUFBLENBQUEsQ0FBQTtLQUNBLENBQUEsU0FBQSxDQUFBLFlBQUE7QUFDQSxZQUFBLENBQUEsS0FBQSxHQUFBLDRCQUFBLENBQUE7S0FDQSxDQUFBLENBQUE7R0FFQSxDQUFBO0NBRUEsQ0FBQSxDQUFBOztBQzNCQSxHQUFBLENBQUEsTUFBQSxDQUFBLFVBQUEsY0FBQSxFQUFBOztBQUVBLGdCQUFBLENBQUEsS0FBQSxDQUFBLGFBQUEsRUFBQTtBQUNBLE9BQUEsRUFBQSxlQUFBO0FBQ0EsWUFBQSxFQUFBLEVBQUE7QUFDQSxjQUFBLEVBQUEsb0JBQUEsTUFBQSxFQUFBLEVBQUE7Ozs7QUFJQSxRQUFBLEVBQUE7QUFDQSxrQkFBQSxFQUFBLElBQUE7S0FDQTtHQUNBLENBQUEsQ0FBQTtDQUVBLENBQUEsQ0FBQTs7QUNkQSxHQUFBLENBQUEsT0FBQSxDQUFBLGNBQUEsRUFBQSxVQUFBLEtBQUEsRUFBQSxFQUFBLEVBQUE7QUFDQSxNQUFBLElBQUEsR0FBQSxFQUFBLENBQUE7O0FBRUEsTUFBQSxDQUFBLFNBQUEsR0FBQSxZQUFBO0FBQ0EsV0FBQSxLQUFBLENBQUEsR0FBQSxDQUFBLGFBQUEsQ0FBQSxDQUNBLElBQUEsQ0FBQSxVQUFBLEdBQUE7YUFBQSxHQUFBLENBQUEsSUFBQTtLQUFBLENBQUEsQ0FBQTtHQUNBLENBQUE7O0FBRUEsTUFBQSxDQUFBLFVBQUEsR0FBQSxZQUFBOztBQUVBLFdBQUEsQ0FBQTtBQUNBLFVBQUEsRUFBQSxRQUFBO0tBQ0EsQ0FBQSxDQUFBO0dBQ0EsQ0FBQTs7QUFFQSxNQUFBLENBQUEsWUFBQSxHQUFBLFVBQUEsS0FBQSxFQUFBOzs7OztBQUtBLFdBQUEsS0FBQSxDQUFBLEdBQUEsa0JBQUEsS0FBQSxDQUFBLElBQUEsU0FBQSxLQUFBLENBQUEsSUFBQSxDQUFBLENBQ0EsSUFBQSxDQUFBLFVBQUEsR0FBQTthQUFBLEdBQUEsQ0FBQSxJQUFBO0tBQUEsQ0FBQSxDQUFBO0dBQ0EsQ0FBQTs7QUFFQSxNQUFBLENBQUEsZUFBQSxHQUFBLFVBQUEsV0FBQSxFQUFBOztBQUVBLFFBQUEsYUFBQSxHQUFBLFdBQUEsQ0FBQSxHQUFBLENBQUEsVUFBQSxVQUFBLEVBQUE7QUFDQSxhQUFBLElBQUEsQ0FBQSxZQUFBLENBQUEsVUFBQSxDQUFBLENBQUE7S0FDQSxDQUFBLENBQUE7O0FBRUEsV0FBQSxFQUFBLENBQUEsR0FBQSxDQUFBLGFBQUEsQ0FBQSxDQUFBO0dBQ0EsQ0FBQTs7O0FBR0EsTUFBQSxDQUFBLGNBQUEsR0FBQSxVQUFBLElBQUEsRUFBQTs7QUFFQSxXQUFBLElBQUEsQ0FBQSxlQUFBLENBQUEsSUFBQSxDQUFBLE1BQUEsQ0FBQSxDQUNBLElBQUEsQ0FBQSxVQUFBLFNBQUEsRUFBQTtBQUNBLGFBQUEsQ0FBQSxHQUFBLENBQUEsWUFBQSxFQUFBLFNBQUEsQ0FBQSxDQUFBOztBQUVBLGFBQUEsSUFBQSxDQUFBLElBQUEsQ0FBQSxTQUFBLEVBQUEsSUFBQSxDQUFBLE9BQUEsQ0FBQSxDQUFBO0tBQ0EsQ0FBQSxDQUNBLElBQUEsQ0FBQSxVQUFBLFNBQUEsRUFBQTs7QUFFQSxhQUFBLENBQUEsR0FBQSxDQUFBLFlBQUEsRUFBQSxTQUFBLENBQUEsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxNQUFBLEdBQUEsU0FBQSxDQUFBO0FBQ0EsYUFBQSxTQUFBLENBQUE7S0FDQSxDQUFBLFNBQ0EsQ0FBQSxVQUFBLEdBQUEsRUFBQTs7QUFFQSxhQUFBLENBQUEsS0FBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBO0tBQ0EsQ0FBQSxDQUFBO0dBQ0EsQ0FBQTs7QUFFQSxNQUFBLENBQUEsSUFBQSxHQUFBLFVBQUEsU0FBQSxFQUFBLEtBQUEsRUFBQTs7QUFFQSxXQUFBLFNBQUEsQ0FBQTtHQUNBLENBQUE7Ozs7QUFJQSxTQUFBLElBQUEsQ0FBQTtDQUNBLENBQUEsQ0FBQTtBQzlEQSxHQUFBLENBQUEsTUFBQSxDQUFBLFVBQUEsY0FBQSxFQUFBO0FBQ0EsZ0JBQUEsQ0FBQSxLQUFBLENBQUEsT0FBQSxFQUFBO0FBQ0EsT0FBQSxFQUFBLFFBQUE7QUFDQSxlQUFBLEVBQUEscUJBQUE7QUFDQSxjQUFBLEVBQUEsV0FBQTtBQUNBLFdBQUEsRUFBQTtBQUNBLFlBQUEsRUFBQSxnQkFBQSxZQUFBLEVBQUE7QUFDQSxlQUFBLFlBQUEsQ0FBQSxTQUFBLEVBQUEsQ0FBQTtPQUNBO0FBQ0EsYUFBQSxFQUFBLGlCQUFBLFlBQUEsRUFBQTtBQUNBLGVBQUEsWUFBQSxDQUFBLFVBQUEsRUFBQSxDQUFBO09BQ0E7S0FDQTtHQUNBLENBQUEsQ0FBQTtDQUNBLENBQUEsQ0FBQTs7QUFFQSxHQUFBLENBQUEsVUFBQSxDQUFBLFdBQUEsRUFBQSxVQUFBLE1BQUEsRUFBQSxZQUFBLEVBQUEsTUFBQSxFQUFBLE9BQUEsRUFBQTtBQUNBLFFBQUEsQ0FBQSxNQUFBLEdBQUEsTUFBQSxDQUFBO0FBQ0EsUUFBQSxDQUFBLE9BQUEsR0FBQSxPQUFBLENBQUE7OztBQUdBLFFBQUEsQ0FBQSxJQUFBLEdBQUE7O0FBRUEsVUFBQSxFQUFBLEVBQUE7OztBQUdBLFdBQUEsRUFBQSxFQUFBOztBQUVBLFVBQUEsRUFBQSxFQUFBO0dBQ0EsQ0FBQTs7O0FBR0EsUUFBQSxDQUFBLFlBQUEsR0FBQSxVQUFBLEtBQUEsRUFBQTtBQUNBLFdBQUEsQ0FBQSxHQUFBLENBQUEsY0FBQSxFQUFBLEtBQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQTtBQUNBLGdCQUFBLENBQUEsWUFBQSxDQUFBLEtBQUEsQ0FBQSxDQUNBLElBQUEsQ0FBQSxVQUFBLElBQUEsRUFBQTtBQUNBLGFBQUEsQ0FBQSxHQUFBLENBQUEsVUFBQSxFQUFBLElBQUEsQ0FBQSxDQUFBO0tBQ0EsQ0FBQSxDQUFBO0dBQ0EsQ0FBQTs7O0FBR0EsUUFBQSxDQUFBLFdBQUEsR0FBQSxVQUFBLEtBQUEsRUFBQTtBQUNBLFVBQUEsQ0FBQSxJQUFBLENBQUEsTUFBQSxDQUFBLElBQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQTtHQUNBLENBQUE7OztBQUdBLFFBQUEsQ0FBQSxhQUFBLEdBQUEsVUFBQSxLQUFBLEVBQUE7QUFDQSxVQUFBLENBQUEsSUFBQSxDQUFBLE1BQUEsR0FBQSxNQUFBLENBQUEsSUFBQSxDQUFBLE1BQUEsQ0FBQSxNQUFBLENBQUEsVUFBQSxLQUFBO2FBQUEsS0FBQSxLQUFBLEtBQUE7S0FBQSxDQUFBLENBQUE7R0FDQSxDQUFBOzs7QUFHQSxRQUFBLENBQUEsWUFBQSxHQUFBLFVBQUEsTUFBQSxFQUFBO0FBQ0EsVUFBQSxDQUFBLElBQUEsQ0FBQSxPQUFBLENBQUEsSUFBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBO0dBQ0EsQ0FBQTs7O0FBR0EsUUFBQSxDQUFBLGNBQUEsR0FBQSxVQUFBLE1BQUEsRUFBQTtBQUNBLFVBQUEsQ0FBQSxJQUFBLENBQUEsT0FBQSxHQUFBLE1BQUEsQ0FBQSxJQUFBLENBQUEsT0FBQSxDQUFBLE1BQUEsQ0FBQSxVQUFBLElBQUE7YUFBQSxJQUFBLEtBQUEsTUFBQTtLQUFBLENBQUEsQ0FBQTtHQUNBLENBQUE7OztBQUdBLFFBQUEsQ0FBQSxjQUFBLEdBQUEsWUFBQTtBQUNBLGdCQUFBLENBQUEsY0FBQSxDQUFBLE1BQUEsQ0FBQSxJQUFBLENBQUEsQ0FDQSxJQUFBLENBQUEsVUFBQSxNQUFBLEVBQUE7QUFDQSxhQUFBLENBQUEsR0FBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBO0tBQ0EsQ0FBQSxDQUFBO0dBQ0EsQ0FBQTs7O0FBR0EsUUFBQSxDQUFBLFFBQUEsR0FBQSxZQUFBO0FBQ0EsZ0JBQUEsQ0FBQSxRQUFBLENBQUEsTUFBQSxDQUFBLElBQUEsQ0FBQSxDQUNBLElBQUEsQ0FBQSxVQUFBLElBQUEsRUFBQTtBQUNBLGFBQUEsQ0FBQSxHQUFBLENBQUEsZ0JBQUEsRUFBQSxJQUFBLENBQUEsQ0FBQTtLQUNBLENBQUEsQ0FBQTtHQUNBLENBQUE7Q0FFQSxDQUFBLENBQUE7QUM1RUEsR0FBQSxDQUFBLE9BQUEsQ0FBQSxPQUFBLEVBQUEsVUFBQSxNQUFBLEVBQUEsRUFBQSxFQUFBOztBQUVBLE1BQUEsS0FBQSxHQUFBLEVBQUEsQ0FBQSxjQUFBLENBQUE7QUFDQSxRQUFBLEVBQUEsT0FBQTtBQUNBLFlBQUEsRUFBQSxRQUFBO0FBQ0EsYUFBQSxFQUFBO0FBQ0EsZUFBQSxFQUFBO0FBQ0EsWUFBQSxFQUFBOzs7QUFHQSxvQkFBQSxFQUFBLE9BQUE7OztBQUdBLGtCQUFBLEVBQUEsTUFBQTtTQUNBO09BQ0E7S0FDQTtBQUNBLFdBQUEsRUFBQTtBQUNBLFFBQUEsRUFBQSxjQUFBO0FBQ0EsZUFBQSxDQUFBLEdBQUEsb0NBQUEsSUFBQSxDQUFBLElBQUEsVUFBQSxJQUFBLENBQUEsR0FBQSxPQUFBLENBQUE7O09BRUE7S0FDQTtHQUNBLENBQUEsQ0FBQTs7QUFFQSxTQUFBLEtBQUEsQ0FBQTtDQUNBLENBQUEsQ0FDQSxHQUFBLENBQUEsVUFBQSxLQUFBLEVBQUEsRUFBQSxDQUFBLENBQUE7O0FDM0JBLEdBQUEsQ0FBQSxPQUFBLENBQUEsTUFBQSxFQUFBLFVBQUEsTUFBQSxFQUFBLEtBQUEsRUFBQSxFQUFBLEVBQUE7O0FBRUEsTUFBQSxJQUFBLEdBQUEsRUFBQSxDQUFBLGNBQUEsQ0FBQTtBQUNBLFFBQUEsRUFBQSxNQUFBO0FBQ0EsWUFBQSxFQUFBLE9BQUE7QUFDQSxhQUFBLEVBQUE7QUFDQSxhQUFBLEVBQUE7QUFDQSxhQUFBLEVBQUE7OztBQUdBLG9CQUFBLEVBQUEsUUFBQTs7O0FBR0Esb0JBQUEsRUFBQSxNQUFBO1NBQ0E7T0FDQTtLQUNBO0FBQ0EsV0FBQSxFQUFBO0FBQ0EsUUFBQSxFQUFBLGNBQUE7QUFDQSxjQUFBLENBQUEsRUFBQSxDQUFBLEtBQUEsRUFBQSxFQUFBLEVBQUEsRUFBQSxJQUFBLENBQUEsR0FBQSxFQUFBLENBQUEsQ0FBQTtPQUNBO0FBQ0EsZUFBQSxFQUFBLHFCQUFBO0FBQ0EsZUFBQSxLQUFBLENBQUEsT0FBQSxDQUFBLEVBQUEsTUFBQSxFQUFBLElBQUEsQ0FBQSxHQUFBLEVBQUEsQ0FBQSxDQUFBO09BQ0E7S0FDQTtHQUNBLENBQUEsQ0FBQTs7QUFFQSxTQUFBLElBQUEsQ0FBQTtDQUNBLENBQUEsQ0FDQSxHQUFBLENBQUEsVUFBQSxJQUFBLEVBQUEsRUFBQSxDQUFBLENBQUE7O0FDN0JBLEdBQUEsQ0FBQSxTQUFBLENBQUEsUUFBQSxFQUFBLFlBQUE7QUFDQSxTQUFBO0FBQ0EsWUFBQSxFQUFBLEdBQUE7QUFDQSxlQUFBLEVBQUEsNkJBQUE7QUFDQSxTQUFBLEVBQUE7QUFDQSxZQUFBLEVBQUEsR0FBQTtBQUNBLFlBQUEsRUFBQSxHQUFBO0tBQ0E7QUFDQSxRQUFBLEVBQUEsZ0JBQUEsRUFFQTtHQUNBLENBQUE7Q0FDQSxDQUFBLENBQUE7QUNaQSxHQUFBLENBQUEsU0FBQSxDQUFBLE9BQUEsRUFBQSxZQUFBO0FBQ0EsU0FBQTtBQUNBLFlBQUEsRUFBQSxHQUFBO0FBQ0EsZUFBQSxFQUFBLDJCQUFBO0FBQ0EsU0FBQSxFQUFBO0FBQ0EsV0FBQSxFQUFBLEdBQUE7QUFDQSxTQUFBLEVBQUEsR0FBQTtBQUNBLFlBQUEsRUFBQSxHQUFBO0tBQ0E7QUFDQSxRQUFBLEVBQUEsZ0JBQUEsRUFFQTtHQUNBLENBQUE7Q0FDQSxDQUFBLENBQUE7QUNiQSxHQUFBLENBQUEsU0FBQSxDQUFBLFFBQUEsRUFBQSxVQUFBLFVBQUEsRUFBQSxNQUFBLEVBQUEsV0FBQSxFQUFBLFdBQUEsRUFBQSxJQUFBLEVBQUE7O0FBRUEsU0FBQTtBQUNBLFlBQUEsRUFBQSxHQUFBO0FBQ0EsU0FBQSxFQUFBLEVBQUE7QUFDQSxlQUFBLEVBQUEseUNBQUE7QUFDQSxRQUFBLEVBQUEsY0FBQSxLQUFBLEVBQUEsSUFBQSxFQUFBLElBQUEsRUFBQTs7QUFFQSxXQUFBLENBQUEsS0FBQSxHQUFBOztBQUVBLFFBQUEsS0FBQSxFQUFBLE9BQUEsRUFBQSxLQUFBLEVBQUEsT0FBQSxFQUFBLEVBQ0EsRUFBQSxLQUFBLEVBQUEsZUFBQSxFQUFBLEtBQUEsRUFBQSxNQUFBLEVBQUEsRUFDQSxFQUFBLEtBQUEsRUFBQSxPQUFBLEVBQUEsS0FBQSxFQUFBLE9BQUEsRUFBQSxFQUNBLEVBQUEsS0FBQSxFQUFBLE1BQUEsRUFBQSxLQUFBLEVBQUEsTUFBQSxFQUFBLENBRUEsQ0FBQTs7O0FBRUEsV0FBQSxDQUFBLElBQUEsR0FBQSxLQUFBLENBQUE7O0FBRUEsV0FBQSxDQUFBLE1BQUEsR0FBQTtlQUFBLEtBQUEsQ0FBQSxJQUFBLEdBQUEsQ0FBQSxLQUFBLENBQUEsSUFBQTtPQUFBLENBQUE7O0FBRUEsV0FBQSxDQUFBLE1BQUEsR0FBQSxZQUFBO0FBQ0EsZUFBQSxDQUFBLEdBQUEsQ0FBQSw0QkFBQSxDQUFBLENBQUE7T0FDQSxDQUFBOztBQUVBLFdBQUEsQ0FBQSxJQUFBLEdBQUEsSUFBQSxDQUFBOztBQUVBLFdBQUEsQ0FBQSxVQUFBLEdBQUEsWUFBQTtBQUNBLGVBQUEsV0FBQSxDQUFBLGVBQUEsRUFBQSxDQUFBO09BQ0EsQ0FBQTs7QUFFQSxXQUFBLENBQUEsTUFBQSxHQUFBLFlBQUE7QUFDQSxtQkFBQSxDQUFBLE1BQUEsRUFBQSxDQUFBLElBQUEsQ0FBQSxZQUFBO0FBQ0EsZ0JBQUEsQ0FBQSxFQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7U0FDQSxDQUFBLENBQUE7T0FDQSxDQUFBOztBQUVBLFVBQUEsT0FBQSxHQUFBLFNBQUEsT0FBQSxHQUFBO0FBQ0EsbUJBQUEsQ0FBQSxlQUFBLEVBQUEsQ0FDQSxJQUFBLENBQUEsVUFBQSxJQUFBO2lCQUFBLElBQUEsQ0FBQSxJQUFBLENBQUEsSUFBQSxDQUFBLEdBQUEsQ0FBQTtTQUFBLENBQUEsQ0FDQSxJQUFBLENBQUEsVUFBQSxJQUFBLEVBQUE7QUFDQSxlQUFBLENBQUEsSUFBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLGlCQUFBLElBQUEsQ0FBQTtTQUNBLENBQUEsQ0FBQTtPQUNBLENBQUE7O0FBRUEsVUFBQSxVQUFBLEdBQUEsU0FBQSxVQUFBLEdBQUE7QUFDQSxhQUFBLENBQUEsSUFBQSxHQUFBLElBQUEsQ0FBQTtPQUNBLENBQUE7O0FBRUEsYUFBQSxFQUFBLENBQUE7O0FBRUEsZ0JBQUEsQ0FBQSxHQUFBLENBQUEsV0FBQSxDQUFBLFlBQUEsRUFBQSxPQUFBLENBQUEsQ0FBQTtBQUNBLGdCQUFBLENBQUEsR0FBQSxDQUFBLFdBQUEsQ0FBQSxhQUFBLEVBQUEsVUFBQSxDQUFBLENBQUE7QUFDQSxnQkFBQSxDQUFBLEdBQUEsQ0FBQSxXQUFBLENBQUEsY0FBQSxFQUFBLFVBQUEsQ0FBQSxDQUFBO0tBRUE7O0dBRUEsQ0FBQTtDQUVBLENBQUEsQ0FBQTs7QUM1REEsWUFBQSxDQUFBOztBQUVBLEdBQUEsQ0FBQSxTQUFBLENBQUEsU0FBQSxFQUFBLFlBQUE7QUFDQSxTQUFBO0FBQ0EsWUFBQSxFQUFBLEdBQUE7QUFDQSxTQUFBLEVBQUE7QUFDQSxhQUFBLEVBQUEsR0FBQTtLQUNBO0FBQ0EsUUFBQSxFQUFBLGNBQUEsS0FBQSxFQUFBLElBQUEsRUFBQSxJQUFBLEVBQUE7QUFDQSxVQUFBLENBQUEsSUFBQSxDQUFBLGtCQUFBLEVBQUEsVUFBQSxLQUFBLEVBQUE7QUFDQSxZQUFBLEtBQUEsQ0FBQSxLQUFBLElBQUEsRUFBQSxFQUFBO0FBQ0EsZUFBQSxDQUFBLE1BQUEsQ0FBQSxZQUFBO0FBQ0EsaUJBQUEsQ0FBQSxPQUFBLEVBQUEsQ0FBQTtXQUNBLENBQUEsQ0FBQTtBQUNBLGlCQUFBLEtBQUEsQ0FBQTtTQUNBO09BQ0EsQ0FBQSxDQUFBO0tBQ0E7R0FDQSxDQUFBO0NBQ0EsQ0FBQSxDQUFBOztBQ25CQSxHQUFBLENBQUEsU0FBQSxDQUFBLGNBQUEsRUFBQSxZQUFBO0FBQ0EsU0FBQTtBQUNBLFlBQUEsRUFBQSxHQUFBO0FBQ0EsZUFBQSxFQUFBLHVEQUFBO0FBQ0EsUUFBQSxFQUFBLGNBQUEsS0FBQSxFQUFBLElBQUEsRUFBQSxJQUFBLEVBQUE7O0FBRUEsV0FBQSxDQUFBLGdCQUFBLEdBQUEsWUFBQTtBQUNBLGVBQUEsQ0FBQSxHQUFBLDJDQUFBLENBQUE7T0FDQSxDQUFBO0tBRUE7R0FDQSxDQUFBO0NBQ0EsQ0FBQSxDQUFBIiwiZmlsZSI6Im1haW4uanMiLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHN0cmljdCc7XG53aW5kb3cuYXBwID0gYW5ndWxhci5tb2R1bGUoJ05vZGVtb25vQXBwJywgWyd1aS5yb3V0ZXInLCAndWkuYm9vdHN0cmFwJywgJ2ZzYVByZUJ1aWx0JywgJ2pzLWRhdGEnXSk7XG5cbmFwcC5jb25maWcoZnVuY3Rpb24gKCR1cmxSb3V0ZXJQcm92aWRlciwgJGxvY2F0aW9uUHJvdmlkZXIsIERTUHJvdmlkZXIsIERTSHR0cEFkYXB0ZXJQcm92aWRlcikge1xuICAgIC8vIFRoaXMgdHVybnMgb2ZmIGhhc2hiYW5nIHVybHMgKC8jYWJvdXQpIGFuZCBjaGFuZ2VzIGl0IHRvIHNvbWV0aGluZyBub3JtYWwgKC9hYm91dClcbiAgICAkbG9jYXRpb25Qcm92aWRlci5odG1sNU1vZGUodHJ1ZSk7XG4gICAgLy8gSWYgd2UgZ28gdG8gYSBVUkwgdGhhdCB1aS1yb3V0ZXIgZG9lc24ndCBoYXZlIHJlZ2lzdGVyZWQsIGdvIHRvIHRoZSBcIi9cIiB1cmwuXG4gICAgJHVybFJvdXRlclByb3ZpZGVyLm90aGVyd2lzZSgnLycpO1xuXG4gICAgLy8gc2V0IGpzLWRhdGEgZGVmYXVsdHNcbiAgICBEU1Byb3ZpZGVyLmRlZmF1bHRzLmJhc2VQYXRoID0gJy9hcGknXG4gICAgRFNQcm92aWRlci5kZWZhdWx0cy5pZEF0dHJpYnV0ZSA9ICdfaWQnXG5cblxuICAgIC8vIGEgbWV0aG9kIHRvIHRoZSBEU1Byb3ZpZGVyIGRlZmF1bHRzIG9iamVjdCB0aGF0IGF1dG9tYXRpY2FsbHlcbiAgICAvLyBjaGVja3MgaWYgdGhlcmUgaXMgYW55IGRhdGEgaW4gdGhlIGNhY2hlIGZvciBhIGdpdmVuIHNlcnZpY2UgYmVmb3JlXG4gICAgLy8gcGluZ2luZyB0aGUgZGF0YWJhc2VcbiAgICBEU1Byb3ZpZGVyLmRlZmF1bHRzLmdldE9yRmluZCA9IGZ1bmN0aW9uKHNlcnZpY2Upe1xuICAgICAgdmFyIGRhdGEgPSB0aGlzLmdldEFsbCgpXG4gICAgICBpZiAoZGF0YS5sZW5ndGgpIHJldHVybiBQcm9taXNlLnJlc29sdmUoYW5ndWxhci5jb3B5KGRhdGEpKVxuICAgICAgZWxzZSByZXR1cm4gdGhpcy5maW5kQWxsKCkudGhlbihkYXRhID0+IGFuZ3VsYXIuY29weShkYXRhKSlcbiAgICB9XG5cbiAgICAvLyBNb25nb29zZSBSZWxhdGlvbiBGaXggKGZpeGVzIGRlc2VyaWFsaXphdGlvbilcbiAgICAvLyBGcm9tIGh0dHA6Ly9wbG5rci5jby9lZGl0LzN6OTBQRDl3d3doV2RuVnJacWtCP3A9cHJldmlld1xuICAgIC8vIFRoaXMgd2FzIHNob3duIHRvIHVzIGJ5IEBqbWRvYnJ5LCB0aGUgaWRlYSBoZXJlIGlzIHRoYXRcbiAgICAvLyB3ZSBmaXggdGhlIGRhdGEgY29taW5nIGZyb20gTW9uZ29vc2UgbW9kZWxzIGluIGpzLWRhdGEgcmF0aGVyIHRoYW4gb3V0Ym91bmQgZnJvbSBNb25nb29zZVxuICAgIGZ1bmN0aW9uIGZpeFJlbGF0aW9ucyhSZXNvdXJjZSwgaW5zdGFuY2UpIHtcbiAgICAgIGZ1bmN0aW9uIGZpeExvY2FsS2V5cyhpKSB7XG4gICAgICAgIEpTRGF0YS5EU1V0aWxzLmZvckVhY2goUmVzb3VyY2UucmVsYXRpb25MaXN0LCBmdW5jdGlvbihkZWYpIHtcbiAgICAgICAgICB2YXIgcmVsYXRpb25OYW1lID0gZGVmLnJlbGF0aW9uO1xuICAgICAgICAgIHZhciByZWxhdGlvbkRlZiA9IFJlc291cmNlLmdldFJlc291cmNlKHJlbGF0aW9uTmFtZSk7XG4gICAgICAgICAgaWYgKGRlZi50eXBlID09PSAnaGFzTWFueScpIHtcbiAgICAgICAgICAgIGlmIChpLmhhc093blByb3BlcnR5KGRlZi5sb2NhbEZpZWxkKSkge1xuICAgICAgICAgICAgICBpZiAoaVtkZWYubG9jYWxGaWVsZF0ubGVuZ3RoICYmICFKU0RhdGEuRFNVdGlscy5pc09iamVjdChpW2RlZi5sb2NhbEZpZWxkXVswXSkpIHtcbiAgICAgICAgICAgICAgICAvLyBDYXNlIDE6IGFycmF5IG9mIF9pZHMgd2hlcmUgYXJyYXkgb2YgcG9wdWxhdGVkIG9iamVjdHMgc2hvdWxkIGJlXG4gICAgICAgICAgICAgICAgaVtkZWYubG9jYWxLZXlzXSA9IGlbZGVmLmxvY2FsRmllbGRdO1xuICAgICAgICAgICAgICAgIGRlbGV0ZSBpW2RlZi5sb2NhbEZpZWxkXTtcbiAgICAgICAgICAgICAgfSBlbHNlIGlmICghaVtkZWYubG9jYWxLZXlzXSkge1xuICAgICAgICAgICAgICAgIC8vIENhc2UgMjogYXJyYXkgb2YgcG9wdWxhdGVkIG9iamVjdHMsIGJ1dCBtaXNzaW5nIGFycmF5IG9mIF9pZHMnXG4gICAgICAgICAgICAgICAgaVtkZWYubG9jYWxLZXlzXSA9IFtdO1xuICAgICAgICAgICAgICAgIEpTRGF0YS5EU1V0aWxzLmZvckVhY2goaVtkZWYubG9jYWxGaWVsZF0sIGZ1bmN0aW9uKGNoaWxkKSB7XG4gICAgICAgICAgICAgICAgICBpW2RlZi5sb2NhbEtleXNdLnB1c2goY2hpbGRbcmVsYXRpb25EZWYuaWRBdHRyaWJ1dGVdKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNlIGlmIChkZWYudHlwZSA9PT0gJ2JlbG9uZ3NUbycpIHtcbiAgICAgICAgICAgIGlmIChpLmhhc093blByb3BlcnR5KGRlZi5sb2NhbEZpZWxkKSkge1xuICAgICAgICAgICAgICAvLyBpZiB0aGUgbG9jYWxmSWVsZCBpcyBhIHBvcHVhbHRlZCBvYmplY3RcbiAgICAgICAgICAgICAgaWYgKEpTRGF0YS5EU1V0aWxzLmlzT2JqZWN0KGlbZGVmLmxvY2FsRmllbGRdKSkge1xuICAgICAgICAgICAgICAgIGlbZGVmLmxvY2FsS2V5XSA9IGlbZGVmLmxvY2FsRmllbGRdLl9pZDtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAvLyBpZiB0aGUgbG9jYWxmaWVsZCBpcyBhbiBvYmplY3QgaWRcbiAgICAgICAgICAgICAgZWxzZSBpZiAoIUpTRGF0YS5EU1V0aWxzLmlzT2JqZWN0KGlbZGVmLmxvY2FsRmllbGRdKSkge1xuICAgICAgICAgICAgICAgIGlbZGVmLmxvY2FsS2V5XSA9IGlbZGVmLmxvY2FsRmllbGRdO1xuICAgICAgICAgICAgICAgIGRlbGV0ZSBpW2RlZi5sb2NhbEZpZWxkXTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIGlmIChKU0RhdGEuRFNVdGlscy5pc0FycmF5KGluc3RhbmNlKSkge1xuICAgICAgICBKU0RhdGEuRFNVdGlscy5mb3JFYWNoKGluc3RhbmNlLCBmaXhMb2NhbEtleXMpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZml4TG9jYWxLZXlzKGluc3RhbmNlKTtcbiAgICAgIH1cbiAgICB9XG5cblxuICAgIERTUHJvdmlkZXIuZGVmYXVsdHMuZGVzZXJpYWxpemUgPSBmdW5jdGlvbihSZXNvdXJjZSwgZGF0YSkge1xuICAgICAgdmFyIGluc3RhbmNlID0gZGF0YS5kYXRhO1xuICAgICAgZml4UmVsYXRpb25zKFJlc291cmNlLCBpbnN0YW5jZSk7XG4gICAgICByZXR1cm4gaW5zdGFuY2U7XG4gICAgfTtcbiAgICAvLyBFbmQgTW9uZ29vc2UgUmVsYXRpb24gZml4XG59KTtcblxuLy8gVGhpcyBhcHAucnVuIGlzIGZvciBjb250cm9sbGluZyBhY2Nlc3MgdG8gc3BlY2lmaWMgc3RhdGVzLlxuYXBwLnJ1bihmdW5jdGlvbiAoJHJvb3RTY29wZSwgQXV0aFNlcnZpY2UsICRzdGF0ZSkge1xuXG4gICAgLy8gVGhlIGdpdmVuIHN0YXRlIHJlcXVpcmVzIGFuIGF1dGhlbnRpY2F0ZWQgdXNlci5cbiAgICB2YXIgZGVzdGluYXRpb25TdGF0ZVJlcXVpcmVzQXV0aCA9IGZ1bmN0aW9uIChzdGF0ZSkge1xuICAgICAgICByZXR1cm4gc3RhdGUuZGF0YSAmJiBzdGF0ZS5kYXRhLmF1dGhlbnRpY2F0ZTtcbiAgICB9O1xuXG4gICAgLy8gJHN0YXRlQ2hhbmdlU3RhcnQgaXMgYW4gZXZlbnQgZmlyZWRcbiAgICAvLyB3aGVuZXZlciB0aGUgcHJvY2VzcyBvZiBjaGFuZ2luZyBhIHN0YXRlIGJlZ2lucy5cbiAgICAkcm9vdFNjb3BlLiRvbignJHN0YXRlQ2hhbmdlU3RhcnQnLCBmdW5jdGlvbiAoZXZlbnQsIHRvU3RhdGUsIHRvUGFyYW1zKSB7XG5cbiAgICAgICAgaWYgKCFkZXN0aW5hdGlvblN0YXRlUmVxdWlyZXNBdXRoKHRvU3RhdGUpKSB7XG4gICAgICAgICAgICAvLyBUaGUgZGVzdGluYXRpb24gc3RhdGUgZG9lcyBub3QgcmVxdWlyZSBhdXRoZW50aWNhdGlvblxuICAgICAgICAgICAgLy8gU2hvcnQgY2lyY3VpdCB3aXRoIHJldHVybi5cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChBdXRoU2VydmljZS5pc0F1dGhlbnRpY2F0ZWQoKSkge1xuICAgICAgICAgICAgLy8gVGhlIHVzZXIgaXMgYXV0aGVudGljYXRlZC5cbiAgICAgICAgICAgIC8vIFNob3J0IGNpcmN1aXQgd2l0aCByZXR1cm4uXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDYW5jZWwgbmF2aWdhdGluZyB0byBuZXcgc3RhdGUuXG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAgICAgQXV0aFNlcnZpY2UuZ2V0TG9nZ2VkSW5Vc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcikge1xuICAgICAgICAgICAgLy8gSWYgYSB1c2VyIGlzIHJldHJpZXZlZCwgdGhlbiByZW5hdmlnYXRlIHRvIHRoZSBkZXN0aW5hdGlvblxuICAgICAgICAgICAgLy8gKHRoZSBzZWNvbmQgdGltZSwgQXV0aFNlcnZpY2UuaXNBdXRoZW50aWNhdGVkKCkgd2lsbCB3b3JrKVxuICAgICAgICAgICAgLy8gb3RoZXJ3aXNlLCBpZiBubyB1c2VyIGlzIGxvZ2dlZCBpbiwgZ28gdG8gXCJsb2dpblwiIHN0YXRlLlxuICAgICAgICAgICAgaWYgKHVzZXIpIHtcbiAgICAgICAgICAgICAgICAkc3RhdGUuZ28odG9TdGF0ZS5uYW1lLCB0b1BhcmFtcyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICRzdGF0ZS5nbygnbG9naW4nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICB9KTtcblxufSk7XG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuXG4gICAgLy8gUmVnaXN0ZXIgb3VyICphYm91dCogc3RhdGUuXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2Fib3V0Jywge1xuICAgICAgICB1cmw6ICcvYWJvdXQnLFxuICAgICAgICBjb250cm9sbGVyOiAnQWJvdXRDb250cm9sbGVyJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9hYm91dC9hYm91dC5odG1sJ1xuICAgIH0pO1xuXG59KTtcblxuYXBwLmNvbnRyb2xsZXIoJ0Fib3V0Q29udHJvbGxlcicsIGZ1bmN0aW9uICgkc2NvcGUpIHtcblxuICAgIC8vICRzY29wZS5pbWFnZXMgPSBfLnNodWZmbGUoc29tZXRoaW5nKTtcblxufSk7XG4iLCJhcHAuY29uZmlnKCgkc3RhdGVQcm92aWRlcikgPT4ge1xuICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnYXBpJywge1xuICAgIHVybDogJy86aWQvYXBpcycsXG4gICAgdGVtcGxhdGVVcmw6ICdqcy9hcGkvYXBpLmh0bWwnLFxuICAgIGNvbnRyb2xsZXI6ICgkc2NvcGUsIHVzZXIsIHJvdXRlcykgPT4ge1xuICAgICAgJHNjb3BlLnVzZXIgPSB1c2VyXG4gICAgICAkc2NvcGUucm91dGVzID0gcm91dGVzXG5cbiAgICAgIC8vIHRlc3QgZGF0YVxuICAgICAgJHNjb3BlLmRhdGEgPSB7XG4gICAgICAgIG5hbWU6IFwiSGFja2VyIE5ld3NcIixcbiAgICAgICAgY291bnQ6IDMwLFxuICAgICAgICBmcmVxdWVuY3k6IFwiTWFudWFsIENyYXdsXCIsXG4gICAgICAgIHZlcnNpb246IDIsXG4gICAgICAgIG5ld0RhdGE6IHRydWUsXG4gICAgICAgIGxhc3RSdW5TdGF0dXM6IFwic3VjY2Vzc1wiLFxuICAgICAgICB0aGlzVmVyc2lvblN0YXR1czogXCJzdWNjZXNzXCIsXG4gICAgICAgIHRoaXNWZXJzaW9uUnVuOiBcIlRodSBBdWcgMTMgMjAxNSAwMTozMDo0OCBHTVQrMDAwMCAoVVRDKVwiLFxuICAgICAgICBzb3VyY2VVcmw6ICdodHRwczovL25ld3MueWNvbWJpbmF0b3IuY29tLycsXG4gICAgICAgIHJlc3VsdHM6IHtcbiAgICAgICAgICBTdG9yeTogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB0aXRsZToge1xuICAgICAgICAgICAgICAgIGhyZWY6IFwiaHR0cHM6Ly9wbHVzLmdvb2dsZS5jb20vK0luZ3Jlc3MvcG9zdHMvR1Z2Yllaeld5VFRcIixcbiAgICAgICAgICAgICAgICB0ZXh0OiBcIk5pYW50aWMgTGFicyBzcGxpdHRpbmcgZnJvbSBHb29nbGVcIlxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB1cmw6IFwiaHR0cHM6Ly9uZXdzLnljb21iaW5hdG9yLmNvbS9cIixcbiAgICAgICAgICAgICAgcG9pbnRzOiBcIjQxXCIsXG4gICAgICAgICAgICAgIHVzZXI6IHtcbiAgICAgICAgICAgICAgICBocmVmOiBcImh0dHBzOi8vbmV3cy55Y29tYmluYXRvci5jb20vdXNlcj9pZD1tYXJ0aW5kYWxlXCIsXG4gICAgICAgICAgICAgICAgdGV4dDogXCJtYXJ0aW5kYWxlXCJcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgY29tbWVudHM6IHtcbiAgICAgICAgICAgICAgICBocmVmOiBcImh0dHBzOi8vbmV3cy55Y29tYmluYXRvci5jb20vaXRlbT9pZD0xMDA1MTUxN1wiLFxuICAgICAgICAgICAgICAgIHRleHQ6IFwiMTVcIlxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBpbmRleDogMVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IHtcbiAgICAgICAgICAgICAgICBocmVmOiBcImh0dHA6Ly90ZWNoY3J1bmNoLmNvbS8yMDE1LzA4LzEyL29obS1pcy1hLXNtYXJ0ZXItbGlnaHRlci1jYXItYmF0dGVyeS10aGF0LXdvcmtzLXdpdGgteW91ci1leGlzdGluZy1jYXIvXCIsXG4gICAgICAgICAgICAgICAgdGV4dDogXCJPaG0gKFlDIFMxNSkgaXMgYSBzbWFydGVyLCBsaWdodGVyIGNhciBiYXR0ZXJ5IHRoYXQgd29ya3Mgd2l0aCB5b3VyIGV4aXN0aW5nIGNhclwiXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIHVybDogXCJodHRwczovL25ld3MueWNvbWJpbmF0b3IuY29tL1wiLFxuICAgICAgICAgICAgICBwb2ludHM6IFwiMjAwXCIsXG4gICAgICAgICAgICAgIHVzZXI6IHtcbiAgICAgICAgICAgICAgICBocmVmOiBcImh0dHBzOi8vbmV3cy55Y29tYmluYXRvci5jb20vdXNlcj9pZD1ibHVlaW50ZWdyYWxcIixcbiAgICAgICAgICAgICAgICB0ZXh0OiBcImJsdWVpbnRlZ3JhbFwiXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIGNvbW1lbnRzOiB7XG4gICAgICAgICAgICAgICAgaHJlZjogXCJodHRwczovL25ld3MueWNvbWJpbmF0b3IuY29tL2l0ZW0/aWQ9MTAwNDk5MjdcIixcbiAgICAgICAgICAgICAgICB0ZXh0OiBcIjE5NlwiXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIGluZGV4OiAyXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB0aXRsZToge1xuICAgICAgICAgICAgICAgIGhyZWY6IFwiaHR0cHM6Ly93d3cua2lja3N0YXJ0ZXIuY29tL3Byb2plY3RzLzQ1NTg4MzAxL3dvb2xmZS10aGUtcmVkLWhvb2QtZGlhcmllcy9wb3N0cy8xMTY4NDA5XCIsXG4gICAgICAgICAgICAgICAgdGV4dDogXCLigJxJdOKAmXMgZG9uZSwgdGhlcmUgaXMgbm8gd2F5IGJhY2suIFdlIHRyaWVkLCB3ZSBmYWlsZWTigJ1cIlxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB1cmw6IFwiaHR0cHM6Ly9uZXdzLnljb21iaW5hdG9yLmNvbS9cIixcbiAgICAgICAgICAgICAgcG9pbnRzOiBcIjUxOVwiLFxuICAgICAgICAgICAgICB1c2VyOiB7XG4gICAgICAgICAgICAgICAgaHJlZjogXCJodHRwczovL25ld3MueWNvbWJpbmF0b3IuY29tL3VzZXI/aWQ9ZGFuc29cIixcbiAgICAgICAgICAgICAgICB0ZXh0OiBcImRhbnNvXCJcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgY29tbWVudHM6IHtcbiAgICAgICAgICAgICAgICBocmVmOiBcImh0dHBzOi8vbmV3cy55Y29tYmluYXRvci5jb20vaXRlbT9pZD0xMDA0NzcyMVwiLFxuICAgICAgICAgICAgICAgIHRleHQ6IFwiMzAxXCJcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgaW5kZXg6IDNcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHRpdGxlOiB7XG4gICAgICAgICAgICAgICAgaHJlZjogXCJodHRwOi8vcGFybm9sZC14LmdpdGh1Yi5pby9uYXNjL1wiLFxuICAgICAgICAgICAgICAgIHRleHQ6IFwiU2hvdyBITjogTmFTQyDigJMgRG8gbWF0aHMgbGlrZSBhIG5vcm1hbCBwZXJzb25cIlxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB1cmw6IFwiaHR0cHM6Ly9uZXdzLnljb21iaW5hdG9yLmNvbS9cIixcbiAgICAgICAgICAgICAgcG9pbnRzOiBcIjQ1XCIsXG4gICAgICAgICAgICAgIHVzZXI6IHtcbiAgICAgICAgICAgICAgICBocmVmOiBcImh0dHBzOi8vbmV3cy55Y29tYmluYXRvci5jb20vdXNlcj9pZD1tYWNjb1wiLFxuICAgICAgICAgICAgICAgIHRleHQ6IFwibWFjY29cIlxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBjb21tZW50czoge1xuICAgICAgICAgICAgICAgIGhyZWY6IFwiaHR0cHM6Ly9uZXdzLnljb21iaW5hdG9yLmNvbS9pdGVtP2lkPTEwMDUwOTQ5XCIsXG4gICAgICAgICAgICAgICAgdGV4dDogXCI4XCJcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgaW5kZXg6IDRcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHRpdGxlOiB7XG4gICAgICAgICAgICAgICAgaHJlZjogXCJodHRwOi8vYXJzdGVjaG5pY2EuY29tL3NjaWVuY2UvMjAxNS8wOC9vY3RvcHVzLXNvcGhpc3RpY2F0aW9uLWRyaXZlbi1ieS1odW5kcmVkcy1vZi1wcmV2aW91c2x5LXVua25vd24tZ2VuZXMvXCIsXG4gICAgICAgICAgICAgICAgdGV4dDogXCJPY3RvcHVz4oCZIHNvcGhpc3RpY2F0aW9uIGRyaXZlbiBieSBodW5kcmVkcyBvZiBwcmV2aW91c2x5IHVua25vd24gZ2VuZXNcIlxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB1cmw6IFwiaHR0cHM6Ly9uZXdzLnljb21iaW5hdG9yLmNvbS9cIixcbiAgICAgICAgICAgICAgcG9pbnRzOiBcIjM1XCIsXG4gICAgICAgICAgICAgIHVzZXI6IHtcbiAgICAgICAgICAgICAgICBocmVmOiBcImh0dHBzOi8vbmV3cy55Y29tYmluYXRvci5jb20vdXNlcj9pZD1BdWRpb3BoaWxpcFwiLFxuICAgICAgICAgICAgICAgIHRleHQ6IFwiQXVkaW9waGlsaXBcIlxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBjb21tZW50czoge1xuICAgICAgICAgICAgICAgIGhyZWY6IFwiaHR0cHM6Ly9uZXdzLnljb21iaW5hdG9yLmNvbS9pdGVtP2lkPTEwMDUwNTgyXCIsXG4gICAgICAgICAgICAgICAgdGV4dDogXCIxXCJcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgaW5kZXg6IDVcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHRpdGxlOiB7XG4gICAgICAgICAgICAgICAgaHJlZjogXCJodHRwOi8vYmxvZy5zYW1hbHRtYW4uY29tL3Byb2plY3RzLWFuZC1jb21wYW5pZXNcIixcbiAgICAgICAgICAgICAgICB0ZXh0OiBcIlByb2plY3RzIGFuZCBDb21wYW5pZXNcIlxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB1cmw6IFwiaHR0cHM6Ly9uZXdzLnljb21iaW5hdG9yLmNvbS9cIixcbiAgICAgICAgICAgICAgcG9pbnRzOiBcIjIxMlwiLFxuICAgICAgICAgICAgICB1c2VyOiB7XG4gICAgICAgICAgICAgICAgaHJlZjogXCJodHRwczovL25ld3MueWNvbWJpbmF0b3IuY29tL3VzZXI/aWQ9cnVuZXNvZXJlbnNlblwiLFxuICAgICAgICAgICAgICAgIHRleHQ6IFwicnVuZXNvZXJlbnNlblwiXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIGNvbW1lbnRzOiB7XG4gICAgICAgICAgICAgICAgaHJlZjogXCJodHRwczovL25ld3MueWNvbWJpbmF0b3IuY29tL2l0ZW0/aWQ9MTAwNDg1NTdcIixcbiAgICAgICAgICAgICAgICB0ZXh0OiBcIjQwXCJcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgaW5kZXg6IDZcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHRpdGxlOiB7XG4gICAgICAgICAgICAgICAgaHJlZjogXCJodHRwczovL3d3dy5vcGVubGlzdGluZ3MuY28vbmVhclwiLFxuICAgICAgICAgICAgICAgIHRleHQ6IFwiU2hvdyBITjogRmluZCBhIGhvbWUgY2xvc2UgdG8gd29ya1wiXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIHVybDogXCJodHRwczovL25ld3MueWNvbWJpbmF0b3IuY29tL1wiLFxuICAgICAgICAgICAgICBwb2ludHM6IFwiNjFcIixcbiAgICAgICAgICAgICAgdXNlcjoge1xuICAgICAgICAgICAgICAgIGhyZWY6IFwiaHR0cHM6Ly9uZXdzLnljb21iaW5hdG9yLmNvbS91c2VyP2lkPXJnYnJnYlwiLFxuICAgICAgICAgICAgICAgIHRleHQ6IFwicmdicmdiXCJcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgY29tbWVudHM6IHtcbiAgICAgICAgICAgICAgICBocmVmOiBcImh0dHBzOi8vbmV3cy55Y29tYmluYXRvci5jb20vaXRlbT9pZD0xMDA0OTYzMVwiLFxuICAgICAgICAgICAgICAgIHRleHQ6IFwiNTBcIlxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBpbmRleDogN1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IHtcbiAgICAgICAgICAgICAgICBocmVmOiBcImh0dHBzOi8vd3d3LnlvdXR1YmUuY29tL3dhdGNoP3Y9ZzAxZEdzS2JYT2tcIixcbiAgICAgICAgICAgICAgICB0ZXh0OiBcIk5ldGZsaXgg4oCTIENoYXNpbmcgNjBmcHMgW3ZpZGVvXVwiXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIHVybDogXCJodHRwczovL25ld3MueWNvbWJpbmF0b3IuY29tL1wiLFxuICAgICAgICAgICAgICBwb2ludHM6IFwiNDZcIixcbiAgICAgICAgICAgICAgdXNlcjoge1xuICAgICAgICAgICAgICAgIGhyZWY6IFwiaHR0cHM6Ly9uZXdzLnljb21iaW5hdG9yLmNvbS91c2VyP2lkPXRpbHRcIixcbiAgICAgICAgICAgICAgICB0ZXh0OiBcInRpbHRcIlxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBjb21tZW50czoge1xuICAgICAgICAgICAgICAgIGhyZWY6IFwiaHR0cHM6Ly9uZXdzLnljb21iaW5hdG9yLmNvbS9pdGVtP2lkPTEwMDUwMjMwXCIsXG4gICAgICAgICAgICAgICAgdGV4dDogXCIyNlwiXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIGluZGV4OiA4XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB0aXRsZToge1xuICAgICAgICAgICAgICAgIGhyZWY6IFwiaHR0cDovL3d3dy5iYmMuY29tL25ld3MvbWFnYXppbmUtMzM4NjA3NzhcIixcbiAgICAgICAgICAgICAgICB0ZXh0OiBcIkhvdyB0aGUgVUsgZm91bmQgSmFwYW5lc2Ugc3BlYWtlcnMgaW4gYSBodXJyeSBpbiBXVzJcIlxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB1cmw6IFwiaHR0cHM6Ly9uZXdzLnljb21iaW5hdG9yLmNvbS9cIixcbiAgICAgICAgICAgICAgcG9pbnRzOiBcIjM1XCIsXG4gICAgICAgICAgICAgIHVzZXI6IHtcbiAgICAgICAgICAgICAgICBocmVmOiBcImh0dHBzOi8vbmV3cy55Y29tYmluYXRvci5jb20vdXNlcj9pZD1zYW1heXNoYXJtYVwiLFxuICAgICAgICAgICAgICAgIHRleHQ6IFwic2FtYXlzaGFybWFcIlxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBjb21tZW50czoge1xuICAgICAgICAgICAgICAgIGhyZWY6IFwiaHR0cHM6Ly9uZXdzLnljb21iaW5hdG9yLmNvbS9pdGVtP2lkPTEwMDUwNjU1XCIsXG4gICAgICAgICAgICAgICAgdGV4dDogXCI3XCJcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgaW5kZXg6IDlcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHRpdGxlOiB7XG4gICAgICAgICAgICAgICAgaHJlZjogXCJodHRwczovL2dyb3Vwcy5nb29nbGUuY29tL2ZvcnVtLyMhdG9waWMvZW1zY3JpcHRlbi1kaXNjdXNzL2dRUVJqYWpRNmlZXCIsXG4gICAgICAgICAgICAgICAgdGV4dDogXCJFbXNjcmlwdGVuIGdhaW5zIGV4cGVyaW1lbnRhbCBwdGhyZWFkcyBzdXBwb3J0XCJcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgdXJsOiBcImh0dHBzOi8vbmV3cy55Y29tYmluYXRvci5jb20vXCIsXG4gICAgICAgICAgICAgIHBvaW50czogXCI2XCIsXG4gICAgICAgICAgICAgIHVzZXI6IHtcbiAgICAgICAgICAgICAgICBocmVmOiBcImh0dHBzOi8vbmV3cy55Y29tYmluYXRvci5jb20vdXNlcj9pZD12bW9yZ3VsaXNcIixcbiAgICAgICAgICAgICAgICB0ZXh0OiBcInZtb3JndWxpc1wiXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIGNvbW1lbnRzOiB7XG4gICAgICAgICAgICAgICAgaHJlZjogXCJcIixcbiAgICAgICAgICAgICAgICB0ZXh0OiBcIlwiXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIGluZGV4OiAxMFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IHtcbiAgICAgICAgICAgICAgICBocmVmOiBcImh0dHA6Ly9uZXdzLnNxdWVhay5vcmcvMjAxNS8wOC8xMi9zcXVlYWstNS1pcy1vdXQvXCIsXG4gICAgICAgICAgICAgICAgdGV4dDogXCJTcXVlYWsgNSBpcyBvdXRcIlxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB1cmw6IFwiaHR0cHM6Ly9uZXdzLnljb21iaW5hdG9yLmNvbS9cIixcbiAgICAgICAgICAgICAgcG9pbnRzOiBcIjE0MlwiLFxuICAgICAgICAgICAgICB1c2VyOiB7XG4gICAgICAgICAgICAgICAgaHJlZjogXCJodHRwczovL25ld3MueWNvbWJpbmF0b3IuY29tL3VzZXI/aWQ9RmljZVwiLFxuICAgICAgICAgICAgICAgIHRleHQ6IFwiRmljZVwiXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIGNvbW1lbnRzOiB7XG4gICAgICAgICAgICAgICAgaHJlZjogXCJodHRwczovL25ld3MueWNvbWJpbmF0b3IuY29tL2l0ZW0/aWQ9MTAwNDc5NzBcIixcbiAgICAgICAgICAgICAgICB0ZXh0OiBcIjI2XCJcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgaW5kZXg6IDExXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB0aXRsZToge1xuICAgICAgICAgICAgICAgIGhyZWY6IFwiaHR0cHM6Ly9vY2hhcmxlcy5vcmcudWsvYmxvZy9wb3N0cy8yMDE0LTAyLTA0LWhvdy1pLWRldmVsb3Atd2l0aC1uaXhvcy5odG1sXCIsXG4gICAgICAgICAgICAgICAgdGV4dDogXCJIb3cgSSBkZXZlbG9wIHdpdGggTml4XCJcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgdXJsOiBcImh0dHBzOi8vbmV3cy55Y29tYmluYXRvci5jb20vXCIsXG4gICAgICAgICAgICAgIHBvaW50czogXCIxMDRcIixcbiAgICAgICAgICAgICAgdXNlcjoge1xuICAgICAgICAgICAgICAgIGhyZWY6IFwiaHR0cHM6Ly9uZXdzLnljb21iaW5hdG9yLmNvbS91c2VyP2lkPWF5YmVya3RcIixcbiAgICAgICAgICAgICAgICB0ZXh0OiBcImF5YmVya3RcIlxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBjb21tZW50czoge1xuICAgICAgICAgICAgICAgIGhyZWY6IFwiaHR0cHM6Ly9uZXdzLnljb21iaW5hdG9yLmNvbS9pdGVtP2lkPTEwMDQ3MDA1XCIsXG4gICAgICAgICAgICAgICAgdGV4dDogXCIzNVwiXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIGluZGV4OiAxMlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IHtcbiAgICAgICAgICAgICAgICBocmVmOiBcImh0dHBzOi8vYmxvZy50d2l0dGVyLmNvbS8yMDE1L3JlbW92aW5nLXRoZS0xNDAtY2hhcmFjdGVyLWxpbWl0LWZyb20tZGlyZWN0LW1lc3NhZ2VzXCIsXG4gICAgICAgICAgICAgICAgdGV4dDogXCJSZW1vdmluZyB0aGUgMTQwLWNoYXJhY3RlciBsaW1pdCBmcm9tIERpcmVjdCBNZXNzYWdlc1wiXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIHVybDogXCJodHRwczovL25ld3MueWNvbWJpbmF0b3IuY29tL1wiLFxuICAgICAgICAgICAgICBwb2ludHM6IFwiMTM5XCIsXG4gICAgICAgICAgICAgIHVzZXI6IHtcbiAgICAgICAgICAgICAgICBocmVmOiBcImh0dHBzOi8vbmV3cy55Y29tYmluYXRvci5jb20vdXNlcj9pZD11cHRvd25cIixcbiAgICAgICAgICAgICAgICB0ZXh0OiBcInVwdG93blwiXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIGNvbW1lbnRzOiB7XG4gICAgICAgICAgICAgICAgaHJlZjogXCJodHRwczovL25ld3MueWNvbWJpbmF0b3IuY29tL2l0ZW0/aWQ9MTAwNDkxMzdcIixcbiAgICAgICAgICAgICAgICB0ZXh0OiBcIjEwNVwiXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIGluZGV4OiAxM1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IHtcbiAgICAgICAgICAgICAgICBocmVmOiBcImh0dHA6Ly9tYXJrYWxsZW50aG9ybnRvbi5jb20vYmxvZy9zdHlsaXN0aWMtc2ltaWxhcml0eS9cIixcbiAgICAgICAgICAgICAgICB0ZXh0OiBcIkFuYWx5emluZyBzdHlsaXN0aWMgc2ltaWxhcml0eSBhbW9uZ3N0IGF1dGhvcnNcIlxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB1cmw6IFwiaHR0cHM6Ly9uZXdzLnljb21iaW5hdG9yLmNvbS9cIixcbiAgICAgICAgICAgICAgcG9pbnRzOiBcIjE5XCIsXG4gICAgICAgICAgICAgIHVzZXI6IHtcbiAgICAgICAgICAgICAgICBocmVmOiBcImh0dHBzOi8vbmV3cy55Y29tYmluYXRvci5jb20vdXNlcj9pZD1saW5nYmVuXCIsXG4gICAgICAgICAgICAgICAgdGV4dDogXCJsaW5nYmVuXCJcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgY29tbWVudHM6IHtcbiAgICAgICAgICAgICAgICBocmVmOiBcImh0dHBzOi8vbmV3cy55Y29tYmluYXRvci5jb20vaXRlbT9pZD0xMDA1MDYwM1wiLFxuICAgICAgICAgICAgICAgIHRleHQ6IFwiNVwiXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIGluZGV4OiAxNFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IHtcbiAgICAgICAgICAgICAgICBocmVmOiBcImh0dHA6Ly93d3cudGxkcC5vcmcvSE9XVE8vQXNzZW1ibHktSE9XVE8vaGVsbG8uaHRtbFwiLFxuICAgICAgICAgICAgICAgIHRleHQ6IFwiTGludXggQXNzZW1ibHkgSG93IFRvOiDigJxIZWxsbywgV29ybGTigJ1cIlxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB1cmw6IFwiaHR0cHM6Ly9uZXdzLnljb21iaW5hdG9yLmNvbS9cIixcbiAgICAgICAgICAgICAgcG9pbnRzOiBcIjgyXCIsXG4gICAgICAgICAgICAgIHVzZXI6IHtcbiAgICAgICAgICAgICAgICBocmVmOiBcImh0dHBzOi8vbmV3cy55Y29tYmluYXRvci5jb20vdXNlcj9pZD1taW5kY3JpbWVcIixcbiAgICAgICAgICAgICAgICB0ZXh0OiBcIm1pbmRjcmltZVwiXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIGNvbW1lbnRzOiB7XG4gICAgICAgICAgICAgICAgaHJlZjogXCJodHRwczovL25ld3MueWNvbWJpbmF0b3IuY29tL2l0ZW0/aWQ9MTAwNDkwMjBcIixcbiAgICAgICAgICAgICAgICB0ZXh0OiBcIjI2XCJcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgaW5kZXg6IDE1XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB0aXRsZToge1xuICAgICAgICAgICAgICAgIGhyZWY6IFwiaHR0cHM6Ly9hcHBodWIuaW8vXCIsXG4gICAgICAgICAgICAgICAgdGV4dDogXCJBcHBIdWIg4oCTIFVwZGF0ZSBSZWFjdCBOYXRpdmUgQXBwcyBXaXRob3V0IFJlLVN1Ym1pdHRpbmcgdG8gQXBwbGVcIlxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB1cmw6IFwiaHR0cHM6Ly9uZXdzLnljb21iaW5hdG9yLmNvbS9cIixcbiAgICAgICAgICAgICAgcG9pbnRzOiBcIjEyMlwiLFxuICAgICAgICAgICAgICB1c2VyOiB7XG4gICAgICAgICAgICAgICAgaHJlZjogXCJodHRwczovL25ld3MueWNvbWJpbmF0b3IuY29tL3VzZXI/aWQ9YXJiZXNmZWxkXCIsXG4gICAgICAgICAgICAgICAgdGV4dDogXCJhcmJlc2ZlbGRcIlxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBjb21tZW50czoge1xuICAgICAgICAgICAgICAgIGhyZWY6IFwiaHR0cHM6Ly9uZXdzLnljb21iaW5hdG9yLmNvbS9pdGVtP2lkPTEwMDQ4MDcyXCIsXG4gICAgICAgICAgICAgICAgdGV4dDogXCI1NVwiXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIGluZGV4OiAxNlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IHtcbiAgICAgICAgICAgICAgICBocmVmOiBcImh0dHBzOi8vZGV2ZWxvcGVyLm52aWRpYS5jb20vZGVlcC1sZWFybmluZy1jb3Vyc2VzXCIsXG4gICAgICAgICAgICAgICAgdGV4dDogXCJEZWVwIExlYXJuaW5nIENvdXJzZXNcIlxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB1cmw6IFwiaHR0cHM6Ly9uZXdzLnljb21iaW5hdG9yLmNvbS9cIixcbiAgICAgICAgICAgICAgcG9pbnRzOiBcIjk0XCIsXG4gICAgICAgICAgICAgIHVzZXI6IHtcbiAgICAgICAgICAgICAgICBocmVmOiBcImh0dHBzOi8vbmV3cy55Y29tYmluYXRvci5jb20vdXNlcj9pZD1jamR1bGJlcmdlclwiLFxuICAgICAgICAgICAgICAgIHRleHQ6IFwiY2pkdWxiZXJnZXJcIlxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBjb21tZW50czoge1xuICAgICAgICAgICAgICAgIGhyZWY6IFwiaHR0cHM6Ly9uZXdzLnljb21iaW5hdG9yLmNvbS9pdGVtP2lkPTEwMDQ4NDg3XCIsXG4gICAgICAgICAgICAgICAgdGV4dDogXCIxNVwiXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIGluZGV4OiAxN1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IHtcbiAgICAgICAgICAgICAgICBocmVmOiBcImh0dHA6Ly9sZW5zLmJsb2dzLm55dGltZXMuY29tLzIwMTUvMDgvMTIva29kYWtzLWZpcnN0LWRpZ2l0YWwtbW9tZW50L1wiLFxuICAgICAgICAgICAgICAgIHRleHQ6IFwiS29kYWvigJlzIEZpcnN0IERpZ2l0YWwgTW9tZW50XCJcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgdXJsOiBcImh0dHBzOi8vbmV3cy55Y29tYmluYXRvci5jb20vXCIsXG4gICAgICAgICAgICAgIHBvaW50czogXCI0NlwiLFxuICAgICAgICAgICAgICB1c2VyOiB7XG4gICAgICAgICAgICAgICAgaHJlZjogXCJodHRwczovL25ld3MueWNvbWJpbmF0b3IuY29tL3VzZXI/aWQ9dHlzb25lXCIsXG4gICAgICAgICAgICAgICAgdGV4dDogXCJ0eXNvbmVcIlxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBjb21tZW50czoge1xuICAgICAgICAgICAgICAgIGhyZWY6IFwiaHR0cHM6Ly9uZXdzLnljb21iaW5hdG9yLmNvbS9pdGVtP2lkPTEwMDQ4NzY2XCIsXG4gICAgICAgICAgICAgICAgdGV4dDogXCIxN1wiXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIGluZGV4OiAxOFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IHtcbiAgICAgICAgICAgICAgICBocmVmOiBcImh0dHBzOi8vYmxvZy5mdXNpb25kaWdpdGFsLmlvL3RoZS1pbnRlcm5ldC1vZi10aGluZ3MtYS1sb29rLWF0LWVtYmVkZGVkLXdpZmktZGV2ZWxvcG1lbnQtYm9hcmRzLTdhYmVlMTMxMTcxMT9zb3VyY2U9eW91ci1zdG9yaWVzXCIsXG4gICAgICAgICAgICAgICAgdGV4dDogXCJBIExvb2sgYXQgRW1iZWRkZWQgV2lGaSBEZXZlbG9wbWVudCBCb2FyZHNcIlxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB1cmw6IFwiaHR0cHM6Ly9uZXdzLnljb21iaW5hdG9yLmNvbS9cIixcbiAgICAgICAgICAgICAgcG9pbnRzOiBcIjQ0XCIsXG4gICAgICAgICAgICAgIHVzZXI6IHtcbiAgICAgICAgICAgICAgICBocmVmOiBcImh0dHBzOi8vbmV3cy55Y29tYmluYXRvci5jb20vdXNlcj9pZD1obGZzaGVsbFwiLFxuICAgICAgICAgICAgICAgIHRleHQ6IFwiaGxmc2hlbGxcIlxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBjb21tZW50czoge1xuICAgICAgICAgICAgICAgIGhyZWY6IFwiaHR0cHM6Ly9uZXdzLnljb21iaW5hdG9yLmNvbS9pdGVtP2lkPTEwMDQ4NDM0XCIsXG4gICAgICAgICAgICAgICAgdGV4dDogXCIxNlwiXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIGluZGV4OiAxOVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IHtcbiAgICAgICAgICAgICAgICBocmVmOiBcImh0dHBzOi8vZ2l0aHViLmNvbS9zemlsYXJkL2JlbmNobS1tbFwiLFxuICAgICAgICAgICAgICAgIHRleHQ6IFwiQ29tcGFyaXNvbiBvZiBtYWNoaW5lIGxlYXJuaW5nIGxpYnJhcmllcyB1c2VkIGZvciBjbGFzc2lmaWNhdGlvblwiXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIHVybDogXCJodHRwczovL25ld3MueWNvbWJpbmF0b3IuY29tL1wiLFxuICAgICAgICAgICAgICBwb2ludHM6IFwiMTcyXCIsXG4gICAgICAgICAgICAgIHVzZXI6IHtcbiAgICAgICAgICAgICAgICBocmVmOiBcImh0dHBzOi8vbmV3cy55Y29tYmluYXRvci5jb20vdXNlcj9pZD1wenNcIixcbiAgICAgICAgICAgICAgICB0ZXh0OiBcInB6c1wiXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIGNvbW1lbnRzOiB7XG4gICAgICAgICAgICAgICAgaHJlZjogXCJodHRwczovL25ld3MueWNvbWJpbmF0b3IuY29tL2l0ZW0/aWQ9MTAwNDcwMzdcIixcbiAgICAgICAgICAgICAgICB0ZXh0OiBcIjMzXCJcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgaW5kZXg6IDIwXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB0aXRsZToge1xuICAgICAgICAgICAgICAgIGhyZWY6IFwiaHR0cDovL3ZlbnR1cmViZWF0LmNvbS8yMDE1LzA4LzExL3NvdXJjZWRuYS1sYXVuY2hlcy1zZWFyY2hsaWdodC1hLWRldmVsb3Blci10b29sLXRvLWZpbmQtY29kaW5nLXByb2JsZW1zLWluLWFueS1hcHAvXCIsXG4gICAgICAgICAgICAgICAgdGV4dDogXCJTb3VyY2VETkEgKFlDIFMxNSkgZmluZHMgaGlkZGVuIHNlY3VyaXR5IGFuZCBxdWFsaXR5IGZsYXdzIGluIGFwcHNcIlxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB1cmw6IFwiaHR0cHM6Ly9uZXdzLnljb21iaW5hdG9yLmNvbS9cIixcbiAgICAgICAgICAgICAgcG9pbnRzOiBcIjQ5XCIsXG4gICAgICAgICAgICAgIHVzZXI6IHtcbiAgICAgICAgICAgICAgICBocmVmOiBcImh0dHBzOi8vbmV3cy55Y29tYmluYXRvci5jb20vdXNlcj9pZD1rYXRtXCIsXG4gICAgICAgICAgICAgICAgdGV4dDogXCJrYXRtXCJcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgY29tbWVudHM6IHtcbiAgICAgICAgICAgICAgICBocmVmOiBcImh0dHBzOi8vbmV3cy55Y29tYmluYXRvci5jb20vaXRlbT9pZD0xMDA0OTkyNVwiLFxuICAgICAgICAgICAgICAgIHRleHQ6IFwiMzBcIlxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBpbmRleDogMjFcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHRpdGxlOiB7XG4gICAgICAgICAgICAgICAgaHJlZjogXCJodHRwczovL2dpdGh1Yi5jb20vYmxvZy8yMDQ2LWdpdGh1Yi1kZXNrdG9wLWlzLW5vdy1hdmFpbGFibGVcIixcbiAgICAgICAgICAgICAgICB0ZXh0OiBcIkdpdEh1YiBEZXNrdG9wIGlzIG5vdyBhdmFpbGFibGVcIlxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB1cmw6IFwiaHR0cHM6Ly9uZXdzLnljb21iaW5hdG9yLmNvbS9cIixcbiAgICAgICAgICAgICAgcG9pbnRzOiBcIjI1M1wiLFxuICAgICAgICAgICAgICB1c2VyOiB7XG4gICAgICAgICAgICAgICAgaHJlZjogXCJodHRwczovL25ld3MueWNvbWJpbmF0b3IuY29tL3VzZXI/aWQ9YnBpZXJyZVwiLFxuICAgICAgICAgICAgICAgIHRleHQ6IFwiYnBpZXJyZVwiXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIGNvbW1lbnRzOiB7XG4gICAgICAgICAgICAgICAgaHJlZjogXCJodHRwczovL25ld3MueWNvbWJpbmF0b3IuY29tL2l0ZW0/aWQ9MTAwNDgxMDBcIixcbiAgICAgICAgICAgICAgICB0ZXh0OiBcIjIwM1wiXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIGluZGV4OiAyMlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IHtcbiAgICAgICAgICAgICAgICBocmVmOiBcImh0dHBzOi8vd3d3LnRoZWd1YXJkaWFuLmNvbS9pbmZvL2RldmVsb3Blci1ibG9nLzIwMTUvYXVnLzEyL29wZW4tc291cmNpbmctZ3JpZC1pbWFnZS1zZXJ2aWNlXCIsXG4gICAgICAgICAgICAgICAgdGV4dDogXCJPcGVuIHNvdXJjaW5nIEdyaWQsIHRoZSBHdWFyZGlhbuKAmXMgbmV3IGltYWdlIG1hbmFnZW1lbnQgc2VydmljZVwiXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIHVybDogXCJodHRwczovL25ld3MueWNvbWJpbmF0b3IuY29tL1wiLFxuICAgICAgICAgICAgICBwb2ludHM6IFwiMTI2XCIsXG4gICAgICAgICAgICAgIHVzZXI6IHtcbiAgICAgICAgICAgICAgICBocmVmOiBcImh0dHBzOi8vbmV3cy55Y29tYmluYXRvci5jb20vdXNlcj9pZD1yb29tMjcxXCIsXG4gICAgICAgICAgICAgICAgdGV4dDogXCJyb29tMjcxXCJcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgY29tbWVudHM6IHtcbiAgICAgICAgICAgICAgICBocmVmOiBcImh0dHBzOi8vbmV3cy55Y29tYmluYXRvci5jb20vaXRlbT9pZD0xMDA0NzY4NVwiLFxuICAgICAgICAgICAgICAgIHRleHQ6IFwiMTdcIlxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBpbmRleDogMjNcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHRpdGxlOiB7XG4gICAgICAgICAgICAgICAgaHJlZjogXCJodHRwOi8vcGVuZ3VpbnJhbmRvbWhvdXNlLmNhL2hhemxpdHQvZmVhdHVyZS9sYXN0LWRheXMta2F0aHktYWNrZXJcIixcbiAgICAgICAgICAgICAgICB0ZXh0OiBcIlRoZSBMYXN0IERheXMgb2YgS2F0aHkgQWNrZXJcIlxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB1cmw6IFwiaHR0cHM6Ly9uZXdzLnljb21iaW5hdG9yLmNvbS9cIixcbiAgICAgICAgICAgICAgcG9pbnRzOiBcIjNcIixcbiAgICAgICAgICAgICAgdXNlcjoge1xuICAgICAgICAgICAgICAgIGhyZWY6IFwiaHR0cHM6Ly9uZXdzLnljb21iaW5hdG9yLmNvbS91c2VyP2lkPWNvbGlucHJpbmNlXCIsXG4gICAgICAgICAgICAgICAgdGV4dDogXCJjb2xpbnByaW5jZVwiXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIGNvbW1lbnRzOiB7XG4gICAgICAgICAgICAgICAgaHJlZjogXCJcIixcbiAgICAgICAgICAgICAgICB0ZXh0OiBcIlwiXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIGluZGV4OiAyNFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IHtcbiAgICAgICAgICAgICAgICBocmVmOiBcImh0dHA6Ly9heG9uLmNzLmJ5dS5lZHUvbXJzbWl0aC8yMDE1SUpDTk5fTUFOSUMucGRmXCIsXG4gICAgICAgICAgICAgICAgdGV4dDogXCJBIE1pbmltYWwgQXJjaGl0ZWN0dXJlIGZvciBHZW5lcmFsIENvZ25pdGlvbiBbcGRmXVwiXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIHVybDogXCJodHRwczovL25ld3MueWNvbWJpbmF0b3IuY29tL1wiLFxuICAgICAgICAgICAgICBwb2ludHM6IFwiNTNcIixcbiAgICAgICAgICAgICAgdXNlcjoge1xuICAgICAgICAgICAgICAgIGhyZWY6IFwiaHR0cHM6Ly9uZXdzLnljb21iaW5hdG9yLmNvbS91c2VyP2lkPWx1dVwiLFxuICAgICAgICAgICAgICAgIHRleHQ6IFwibHV1XCJcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgY29tbWVudHM6IHtcbiAgICAgICAgICAgICAgICBocmVmOiBcImh0dHBzOi8vbmV3cy55Y29tYmluYXRvci5jb20vaXRlbT9pZD0xMDA0ODAxN1wiLFxuICAgICAgICAgICAgICAgIHRleHQ6IFwiOFwiXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIGluZGV4OiAyNVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IHtcbiAgICAgICAgICAgICAgICBocmVmOiBcImh0dHBzOi8vYmxvZy5kb2NrZXIuY29tLzIwMTUvMDgvY29udGVudC10cnVzdC1kb2NrZXItMS04L1wiLFxuICAgICAgICAgICAgICAgIHRleHQ6IFwiSW50cm9kdWNpbmcgRG9ja2VyIENvbnRlbnQgVHJ1c3RcIlxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB1cmw6IFwiaHR0cHM6Ly9uZXdzLnljb21iaW5hdG9yLmNvbS9cIixcbiAgICAgICAgICAgICAgcG9pbnRzOiBcIjgzXCIsXG4gICAgICAgICAgICAgIHVzZXI6IHtcbiAgICAgICAgICAgICAgICBocmVmOiBcImh0dHBzOi8vbmV3cy55Y29tYmluYXRvci5jb20vdXNlcj9pZD1ka2FzcGVyXCIsXG4gICAgICAgICAgICAgICAgdGV4dDogXCJka2FzcGVyXCJcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgY29tbWVudHM6IHtcbiAgICAgICAgICAgICAgICBocmVmOiBcImh0dHBzOi8vbmV3cy55Y29tYmluYXRvci5jb20vaXRlbT9pZD0xMDA0ODA5NlwiLFxuICAgICAgICAgICAgICAgIHRleHQ6IFwiMjRcIlxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBpbmRleDogMjZcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHRpdGxlOiB7XG4gICAgICAgICAgICAgICAgaHJlZjogXCJodHRwOi8vYmxvZy5jb252b3guY29tL2ludGVncmF0aW9uLW92ZXItaW52ZW50aW9uXCIsXG4gICAgICAgICAgICAgICAgdGV4dDogXCJJbnRlZ3JhdGlvbiBvdmVyIEludmVudGlvblwiXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIHVybDogXCJodHRwczovL25ld3MueWNvbWJpbmF0b3IuY29tL1wiLFxuICAgICAgICAgICAgICBwb2ludHM6IFwiODdcIixcbiAgICAgICAgICAgICAgdXNlcjoge1xuICAgICAgICAgICAgICAgIGhyZWY6IFwiaHR0cHM6Ly9uZXdzLnljb21iaW5hdG9yLmNvbS91c2VyP2lkPWJnZW50cnlcIixcbiAgICAgICAgICAgICAgICB0ZXh0OiBcImJnZW50cnlcIlxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBjb21tZW50czoge1xuICAgICAgICAgICAgICAgIGhyZWY6IFwiaHR0cHM6Ly9uZXdzLnljb21iaW5hdG9yLmNvbS9pdGVtP2lkPTEwMDQ4MDg2XCIsXG4gICAgICAgICAgICAgICAgdGV4dDogXCI5XCJcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgaW5kZXg6IDI3XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB0aXRsZToge1xuICAgICAgICAgICAgICAgIGhyZWY6IFwiaHR0cDovL3d3dy5lY29ub21pc3QuY29tL25ld3MvbGVhZGVycy8yMTY2MDkxOS1vbmx5LXNlY29uZC10aW1lLW91ci1oaXN0b3J5LW93bmVyc2hpcC1lY29ub21pc3QtY2hhbmdlcy1uZXctY2hhcHRlclwiLFxuICAgICAgICAgICAgICAgIHRleHQ6IFwiRm9yIG9ubHkgdGhlIHNlY29uZCB0aW1lIGluIG91ciBoaXN0b3J5IHRoZSBvd25lcnNoaXAgb2YgVGhlIEVjb25vbWlzdCBjaGFuZ2VzXCJcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgdXJsOiBcImh0dHBzOi8vbmV3cy55Y29tYmluYXRvci5jb20vXCIsXG4gICAgICAgICAgICAgIHBvaW50czogXCIxNDlcIixcbiAgICAgICAgICAgICAgdXNlcjoge1xuICAgICAgICAgICAgICAgIGhyZWY6IFwiaHR0cHM6Ly9uZXdzLnljb21iaW5hdG9yLmNvbS91c2VyP2lkPXVjYWV0YW5vXCIsXG4gICAgICAgICAgICAgICAgdGV4dDogXCJ1Y2FldGFub1wiXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIGNvbW1lbnRzOiB7XG4gICAgICAgICAgICAgICAgaHJlZjogXCJodHRwczovL25ld3MueWNvbWJpbmF0b3IuY29tL2l0ZW0/aWQ9MTAwNDc4NDVcIixcbiAgICAgICAgICAgICAgICB0ZXh0OiBcIjEyNlwiXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIGluZGV4OiAyOFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IHtcbiAgICAgICAgICAgICAgICBocmVmOiBcImh0dHA6Ly9ncm5oLnNlL2lwZnliM1wiLFxuICAgICAgICAgICAgICAgIHRleHQ6IFwiSGVsbG9TaWduIChZQyBXMTEpIElzIEhpcmluZyBhIFRlY2huaWNhbCBQcm9kdWN0IE1hbmFnZXIgZm9yIEl0cyBBUElcIlxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB1cmw6IFwiaHR0cHM6Ly9uZXdzLnljb21iaW5hdG9yLmNvbS9cIixcbiAgICAgICAgICAgICAgcG9pbnRzOiBcIlwiLFxuICAgICAgICAgICAgICB1c2VyOiB7XG4gICAgICAgICAgICAgICAgaHJlZjogXCJcIixcbiAgICAgICAgICAgICAgICB0ZXh0OiBcIlwiXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIGNvbW1lbnRzOiB7XG4gICAgICAgICAgICAgICAgaHJlZjogXCJcIixcbiAgICAgICAgICAgICAgICB0ZXh0OiBcIlwiXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIGluZGV4OiAyOVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IHtcbiAgICAgICAgICAgICAgICBocmVmOiBcImh0dHA6Ly9uZXdzb2ZmaWNlLm1pdC5lZHUvMjAxNS9yZWFsLXRpbWUtZGF0YS1mb3ItY2FuY2VyLXRoZXJhcHktMDgwNFwiLFxuICAgICAgICAgICAgICAgIHRleHQ6IFwiUmVhbC10aW1lIGRhdGEgZm9yIGNhbmNlciB0aGVyYXB5XCJcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgdXJsOiBcImh0dHBzOi8vbmV3cy55Y29tYmluYXRvci5jb20vXCIsXG4gICAgICAgICAgICAgIHBvaW50czogXCIxOFwiLFxuICAgICAgICAgICAgICB1c2VyOiB7XG4gICAgICAgICAgICAgICAgaHJlZjogXCJodHRwczovL25ld3MueWNvbWJpbmF0b3IuY29tL3VzZXI/aWQ9b3Blbm1hemVcIixcbiAgICAgICAgICAgICAgICB0ZXh0OiBcIm9wZW5tYXplXCJcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgY29tbWVudHM6IHtcbiAgICAgICAgICAgICAgICBocmVmOiBcIlwiLFxuICAgICAgICAgICAgICAgIHRleHQ6IFwiXCJcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgaW5kZXg6IDMwXG4gICAgICAgICAgICB9XG4gICAgICAgICAgXVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICByZXNvbHZlOiB7XG4gICAgICB1c2VyOiAoJHN0YXRlUGFyYW1zLCBVc2VyKSA9PiBVc2VyLmZpbmQoJHN0YXRlUGFyYW1zLmlkKSxcbiAgICAgIHJvdXRlczogKHVzZXIpID0+IHVzZXIuZ2V0Um91dGVzKClcbiAgICB9XG4gIH0pXG59KVxuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnZG9jcycsIHtcbiAgICAgICAgdXJsOiAnL2RvY3MnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2RvY3MvZG9jcy5odG1sJ1xuICAgIH0pO1xufSk7XG4iLCJhcHAuY29uZmlnKCgkc3RhdGVQcm92aWRlcikgPT4ge1xuICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnaGVscCcsIHtcbiAgICB1cmw6ICcvaGVscCcsXG4gICAgdGVtcGxhdGVVcmw6ICdqcy9oZWxwL2hlbHAuaHRtbCdcbiAgfSlcbn0pXG4iLCIoZnVuY3Rpb24gKCkge1xuXG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgLy8gSG9wZSB5b3UgZGlkbid0IGZvcmdldCBBbmd1bGFyISBEdWgtZG95LlxuICAgIGlmICghd2luZG93LmFuZ3VsYXIpIHRocm93IG5ldyBFcnJvcignSSBjYW5cXCd0IGZpbmQgQW5ndWxhciEnKTtcblxuICAgIHZhciBhcHAgPSBhbmd1bGFyLm1vZHVsZSgnZnNhUHJlQnVpbHQnLCBbXSk7XG5cbiAgICBhcHAuZmFjdG9yeSgnU29ja2V0JywgZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoIXdpbmRvdy5pbykgdGhyb3cgbmV3IEVycm9yKCdzb2NrZXQuaW8gbm90IGZvdW5kIScpO1xuICAgICAgICByZXR1cm4gd2luZG93LmlvKHdpbmRvdy5sb2NhdGlvbi5vcmlnaW4pO1xuICAgIH0pO1xuXG4gICAgLy8gQVVUSF9FVkVOVFMgaXMgdXNlZCB0aHJvdWdob3V0IG91ciBhcHAgdG9cbiAgICAvLyBicm9hZGNhc3QgYW5kIGxpc3RlbiBmcm9tIGFuZCB0byB0aGUgJHJvb3RTY29wZVxuICAgIC8vIGZvciBpbXBvcnRhbnQgZXZlbnRzIGFib3V0IGF1dGhlbnRpY2F0aW9uIGZsb3cuXG4gICAgYXBwLmNvbnN0YW50KCdBVVRIX0VWRU5UUycsIHtcbiAgICAgICAgbG9naW5TdWNjZXNzOiAnYXV0aC1sb2dpbi1zdWNjZXNzJyxcbiAgICAgICAgbG9naW5GYWlsZWQ6ICdhdXRoLWxvZ2luLWZhaWxlZCcsXG4gICAgICAgIGxvZ291dFN1Y2Nlc3M6ICdhdXRoLWxvZ291dC1zdWNjZXNzJyxcbiAgICAgICAgc2Vzc2lvblRpbWVvdXQ6ICdhdXRoLXNlc3Npb24tdGltZW91dCcsXG4gICAgICAgIG5vdEF1dGhlbnRpY2F0ZWQ6ICdhdXRoLW5vdC1hdXRoZW50aWNhdGVkJyxcbiAgICAgICAgbm90QXV0aG9yaXplZDogJ2F1dGgtbm90LWF1dGhvcml6ZWQnXG4gICAgfSk7XG5cbiAgICBhcHAuZmFjdG9yeSgnQXV0aEludGVyY2VwdG9yJywgZnVuY3Rpb24gKCRyb290U2NvcGUsICRxLCBBVVRIX0VWRU5UUykge1xuICAgICAgICB2YXIgc3RhdHVzRGljdCA9IHtcbiAgICAgICAgICAgIDQwMTogQVVUSF9FVkVOVFMubm90QXV0aGVudGljYXRlZCxcbiAgICAgICAgICAgIDQwMzogQVVUSF9FVkVOVFMubm90QXV0aG9yaXplZCxcbiAgICAgICAgICAgIDQxOTogQVVUSF9FVkVOVFMuc2Vzc2lvblRpbWVvdXQsXG4gICAgICAgICAgICA0NDA6IEFVVEhfRVZFTlRTLnNlc3Npb25UaW1lb3V0XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICByZXNwb25zZUVycm9yOiBmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3Qoc3RhdHVzRGljdFtyZXNwb25zZS5zdGF0dXNdLCByZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuICRxLnJlamVjdChyZXNwb25zZSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9KTtcblxuICAgIGFwcC5jb25maWcoZnVuY3Rpb24gKCRodHRwUHJvdmlkZXIpIHtcbiAgICAgICAgJGh0dHBQcm92aWRlci5pbnRlcmNlcHRvcnMucHVzaChbXG4gICAgICAgICAgICAnJGluamVjdG9yJyxcbiAgICAgICAgICAgIGZ1bmN0aW9uICgkaW5qZWN0b3IpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJGluamVjdG9yLmdldCgnQXV0aEludGVyY2VwdG9yJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIF0pO1xuICAgIH0pO1xuXG4gICAgYXBwLnNlcnZpY2UoJ0F1dGhTZXJ2aWNlJywgZnVuY3Rpb24gKCRodHRwLCBTZXNzaW9uLCAkcm9vdFNjb3BlLCBBVVRIX0VWRU5UUywgJHEsIFVzZXIpIHtcblxuICAgICAgICBmdW5jdGlvbiBvblN1Y2Nlc3NmdWxMb2dpbihyZXNwb25zZSkge1xuICAgICAgICAgICAgdmFyIGRhdGEgPSByZXNwb25zZS5kYXRhO1xuICAgICAgICAgICAgU2Vzc2lvbi5jcmVhdGUoZGF0YS5pZCwgZGF0YS51c2VyKTtcbiAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdChBVVRIX0VWRU5UUy5sb2dpblN1Y2Nlc3MpO1xuICAgICAgICAgICAgcmV0dXJuIGRhdGEudXNlcjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVzZXMgdGhlIHNlc3Npb24gZmFjdG9yeSB0byBzZWUgaWYgYW5cbiAgICAgICAgLy8gYXV0aGVudGljYXRlZCB1c2VyIGlzIGN1cnJlbnRseSByZWdpc3RlcmVkLlxuICAgICAgICB0aGlzLmlzQXV0aGVudGljYXRlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiAhIVNlc3Npb24udXNlcjtcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmdldExvZ2dlZEluVXNlciA9IGZ1bmN0aW9uIChmcm9tU2VydmVyKSB7XG5cbiAgICAgICAgICAgIC8vIElmIGFuIGF1dGhlbnRpY2F0ZWQgc2Vzc2lvbiBleGlzdHMsIHdlXG4gICAgICAgICAgICAvLyByZXR1cm4gdGhlIHVzZXIgYXR0YWNoZWQgdG8gdGhhdCBzZXNzaW9uXG4gICAgICAgICAgICAvLyB3aXRoIGEgcHJvbWlzZS4gVGhpcyBlbnN1cmVzIHRoYXQgd2UgY2FuXG4gICAgICAgICAgICAvLyBhbHdheXMgaW50ZXJmYWNlIHdpdGggdGhpcyBtZXRob2QgYXN5bmNocm9ub3VzbHkuXG5cbiAgICAgICAgICAgIC8vIE9wdGlvbmFsbHksIGlmIHRydWUgaXMgZ2l2ZW4gYXMgdGhlIGZyb21TZXJ2ZXIgcGFyYW1ldGVyLFxuICAgICAgICAgICAgLy8gdGhlbiB0aGlzIGNhY2hlZCB2YWx1ZSB3aWxsIG5vdCBiZSB1c2VkLlxuXG4gICAgICAgICAgICBpZiAodGhpcy5pc0F1dGhlbnRpY2F0ZWQoKSAmJiBmcm9tU2VydmVyICE9PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICRxLndoZW4oU2Vzc2lvbi51c2VyKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gTWFrZSByZXF1ZXN0IEdFVCAvc2Vzc2lvbi5cbiAgICAgICAgICAgIC8vIElmIGl0IHJldHVybnMgYSB1c2VyLCBjYWxsIG9uU3VjY2Vzc2Z1bExvZ2luIHdpdGggdGhlIHJlc3BvbnNlLlxuICAgICAgICAgICAgLy8gSWYgaXQgcmV0dXJucyBhIDQwMSByZXNwb25zZSwgd2UgY2F0Y2ggaXQgYW5kIGluc3RlYWQgcmVzb2x2ZSB0byBudWxsLlxuICAgICAgICAgICAgcmV0dXJuICRodHRwLmdldCgnL3Nlc3Npb24nKS50aGVuKG9uU3VjY2Vzc2Z1bExvZ2luKS5jYXRjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMubG9naW4gPSBmdW5jdGlvbiAoY3JlZGVudGlhbHMpIHtcbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5wb3N0KCcvbG9naW4nLCBjcmVkZW50aWFscylcbiAgICAgICAgICAgICAgICAudGhlbihvblN1Y2Nlc3NmdWxMb2dpbilcbiAgICAgICAgICAgICAgICAuY2F0Y2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gJHEucmVqZWN0KHsgbWVzc2FnZTogJ0ludmFsaWQgbG9naW4gY3JlZGVudGlhbHMuJyB9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmxvZ291dCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5nZXQoJy9sb2dvdXQnKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBTZXNzaW9uLmRlc3Ryb3koKTtcbiAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3QoQVVUSF9FVkVOVFMubG9nb3V0U3VjY2Vzcyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgIH0pO1xuXG4gICAgYXBwLnNlcnZpY2UoJ1Nlc3Npb24nLCBmdW5jdGlvbiAoJHJvb3RTY29wZSwgQVVUSF9FVkVOVFMpIHtcblxuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMubm90QXV0aGVudGljYXRlZCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgc2VsZi5kZXN0cm95KCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLnNlc3Npb25UaW1lb3V0LCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBzZWxmLmRlc3Ryb3koKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5pZCA9IG51bGw7XG4gICAgICAgIHRoaXMudXNlciA9IG51bGw7XG5cbiAgICAgICAgdGhpcy5jcmVhdGUgPSBmdW5jdGlvbiAoc2Vzc2lvbklkLCB1c2VyKSB7XG4gICAgICAgICAgICB0aGlzLmlkID0gc2Vzc2lvbklkO1xuICAgICAgICAgICAgdGhpcy51c2VyID0gdXNlcjtcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmRlc3Ryb3kgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLmlkID0gbnVsbDtcbiAgICAgICAgICAgIHRoaXMudXNlciA9IG51bGw7XG4gICAgICAgIH07XG5cbiAgICB9KTtcblxufSkoKTtcbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2hvbWUnLCB7XG4gICAgICAgIHVybDogJy8nLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2hvbWUvaG9tZS5odG1sJyxcbiAgICAgICAgY29udHJvbGxlcjogKCRzY29wZSwgdXNlcnMsIHJvdXRlcykgPT4ge1xuICAgICAgICAgICRzY29wZS51c2VycyA9IHVzZXJzXG4gICAgICAgICAgJHNjb3BlLnJvdXRlcyA9IHJvdXRlc1xuXG4gICAgICAgICAgLy8gY2hlY2sgd2hldGhlciB1c2VyIGFnZW50IGlzIHJ1bm5pbmcgY2hyb21lXG4gICAgICAgICAgJHNjb3BlLmhhc0Nocm9tZSA9ICgpID0+IG5hdmlnYXRvci51c2VyQWdlbnQudG9Mb3dlckNhc2UoKS5pbmNsdWRlcygnY2hyb21lJylcbiAgICAgICAgfSxcbiAgICAgICAgcmVzb2x2ZToge1xuICAgICAgICAgIHVzZXJzOiAoVXNlcikgPT4gVXNlci5maW5kQWxsKHt9LCB7IGJ5cGFzc0NhY2hlOiB0cnVlIH0pLFxuICAgICAgICAgIHJvdXRlczogKFJvdXRlKSA9PiBSb3V0ZS5maW5kQWxsKHt9LCB7IGJ5cGFzc0NhY2hlOiB0cnVlIH0pXG4gICAgICAgIH1cbiAgICB9KTtcbn0pO1xuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcblxuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdsb2dpbicsIHtcbiAgICAgICAgdXJsOiAnL2xvZ2luJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9sb2dpbi9sb2dpbi5odG1sJyxcbiAgICAgICAgY29udHJvbGxlcjogJ0xvZ2luQ3RybCdcbiAgICB9KTtcblxufSk7XG5cbmFwcC5jb250cm9sbGVyKCdMb2dpbkN0cmwnLCBmdW5jdGlvbiAoJHNjb3BlLCBBdXRoU2VydmljZSwgJHN0YXRlKSB7XG5cbiAgICAkc2NvcGUubG9naW4gPSB7fTtcbiAgICAkc2NvcGUuZXJyb3IgPSBudWxsO1xuXG4gICAgJHNjb3BlLnNlbmRMb2dpbiA9IGZ1bmN0aW9uIChsb2dpbkluZm8pIHtcblxuICAgICAgICAkc2NvcGUuZXJyb3IgPSBudWxsO1xuXG4gICAgICAgIEF1dGhTZXJ2aWNlLmxvZ2luKGxvZ2luSW5mbykudGhlbihmdW5jdGlvbiAodXNlcikge1xuICAgICAgICAgICAgJHN0YXRlLmdvKCd1c2VyJywgeyBpZDogdXNlci5faWQgfSk7XG4gICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICRzY29wZS5lcnJvciA9ICdJbnZhbGlkIGxvZ2luIGNyZWRlbnRpYWxzLic7XG4gICAgICAgIH0pO1xuXG4gICAgfTtcblxufSk7XG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ21lbWJlcnNPbmx5Jywge1xuICAgICAgICB1cmw6ICcvbWVtYmVycy1hcmVhJyxcbiAgICAgICAgdGVtcGxhdGU6ICcnLFxuICAgICAgICBjb250cm9sbGVyOiBmdW5jdGlvbiAoJHNjb3BlKSB7fSxcblxuICAgICAgICAvLyBUaGUgZm9sbG93aW5nIGRhdGEuYXV0aGVudGljYXRlIGlzIHJlYWQgYnkgYW4gZXZlbnQgbGlzdGVuZXJcbiAgICAgICAgLy8gdGhhdCBjb250cm9scyBhY2Nlc3MgdG8gdGhpcyBzdGF0ZS4gUmVmZXIgdG8gYXBwLmpzLlxuICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICBhdXRoZW50aWNhdGU6IHRydWVcbiAgICAgICAgfVxuICAgIH0pO1xuXG59KTtcbiIsImFwcC5mYWN0b3J5KCdQaXBlc0ZhY3RvcnknLCBmdW5jdGlvbigkaHR0cCwgJHEpIHtcblx0dmFyIGZhY3QgPSB7fTtcblxuXHRmYWN0LmdldFJvdXRlcyA9ICgpID0+IHtcblx0XHRyZXR1cm4gJGh0dHAuZ2V0KCcvYXBpL3JvdXRlcycpXG5cdFx0XHQudGhlbihyZXMgPT4gcmVzLmRhdGEpO1xuXHR9O1xuXG5cdGZhY3QuZ2V0RmlsdGVycyA9ICgpID0+IHtcblx0XHQvLyBkdW1teSBmaWx0ZXIgZGF0YSBmb3Igbm93XG5cdFx0cmV0dXJuIFt7XG5cdFx0XHRuYW1lOiAnbGVuZ3RoJ1xuXHRcdH1dO1xuXHR9O1xuXG5cdGZhY3QuZ2V0Q3Jhd2xEYXRhID0gKHJvdXRlKSA9PiB7XG5cdFx0Ly8gZHVtbXkgZGF0YSBmb3IgdGVzdGluZ1xuXHRcdC8vIHJldHVybiB7dGl0bGU6IFtyb3V0ZS5uYW1lLCByb3V0ZS5uYW1lICsgJzEnXSwgbW9yZTogW3JvdXRlLnVybF19O1xuXG5cdFx0Ly8gZ2V0IGNyYXdsZWQgZGF0YSBmb3IgdGhlIHJvdXRlXG5cdFx0cmV0dXJuICRodHRwLmdldChgL2FwaS9yb3V0ZXMvJHtyb3V0ZS51c2VyfS8ke3JvdXRlLm5hbWV9YClcblx0XHRcdC50aGVuKHJlcyA9PiByZXMuZGF0YSk7XG5cdH07XG5cblx0ZmFjdC5nZXRBbGxJbnB1dERhdGEgPSAoaW5wdXRSb3V0ZXMpID0+IHtcblx0XHQvLyBmaXJlIG9mZiByZXF1ZXN0cyBmb3IgY3Jhd2xlZCBkYXRhXG5cdFx0dmFyIGNyYXdsUHJvbWlzZXMgPSBpbnB1dFJvdXRlcy5tYXAoaW5wdXRSb3V0ZSA9PiB7XG5cdFx0XHRyZXR1cm4gZmFjdC5nZXRDcmF3bERhdGEoaW5wdXRSb3V0ZSk7XG5cdFx0fSk7XG5cdFx0Ly8gcmVzb2x2ZSB3aGVuIGFsbCBwcm9taXNlcyByZXNvbHZlIHdpdGggdGhlaXIgY3Jhd2xlZCBkYXRhXG5cdFx0cmV0dXJuICRxLmFsbChjcmF3bFByb21pc2VzKTtcblx0fTtcblxuXHQvLyBydW4gc2VsZWN0ZWQgaW5wdXRzIHRocm91Z2ggdGhlIHBpcGUgZmlsdGVycyBhbmQgcmV0dXJuIHRoZSBvdXRwdXRcblx0ZmFjdC5nZW5lcmF0ZU91dHB1dCA9IChwaXBlKSA9PiB7XG5cdFx0Ly8gZ2V0IGFsbCB0aGUgaW5wdXQncyBjcmF3bGVkIGRhdGFcblx0XHRyZXR1cm4gZmFjdC5nZXRBbGxJbnB1dERhdGEocGlwZS5pbnB1dHMpXG5cdFx0XHQudGhlbihpbnB1dERhdGEgPT4ge1xuXHRcdFx0XHRjb25zb2xlLmxvZygnaW5wdXQgZGF0YScsIGlucHV0RGF0YSk7XG5cdFx0XHRcdC8vIHJ1biBpbnB1dCBkYXRhIHRocm91Z2ggdGhlIHNlbGVjdGVkIHBpcGVzIChpLmUuIGZpbHRlcnMpXG5cdFx0XHRcdHJldHVybiBmYWN0LnBpcGUoaW5wdXREYXRhLCBwaXBlLmZpbHRlcnMpO1xuXHRcdFx0fSlcblx0XHRcdC50aGVuKHBpcGVkRGF0YSA9PiB7XG5cdFx0XHRcdC8vIHBpcGVkIGRhdGEsIGJhc2ljYWxseSB0aGUgb3V0cHV0IGRhdGEgKD8pXG5cdFx0XHRcdGNvbnNvbGUubG9nKCdwaXBlZCBkYXRhJywgcGlwZWREYXRhKTtcblx0XHRcdFx0cGlwZS5vdXRwdXQgPSBwaXBlZERhdGE7IC8vICg/KVxuXHRcdFx0XHRyZXR1cm4gcGlwZWREYXRhO1xuXHRcdFx0fSlcblx0XHRcdC5jYXRjaChlcnIgPT4ge1xuXHRcdFx0XHQvLyBoYW5kbGUgZXJyb3JzXG5cdFx0XHRcdGNvbnNvbGUuZXJyb3IoZXJyKTtcblx0XHRcdH0pO1xuXHR9O1xuXG5cdGZhY3QucGlwZSA9IChpbnB1dERhdGEsIHBpcGVzKSA9PiB7XG5cdFx0Ly8gbm90aGluZyBmb3Igbm93XG5cdFx0cmV0dXJuIGlucHV0RGF0YTtcblx0fTtcblxuXHQvLyBmYWN0LnNhdmVQaXBlID0gKClcblxuXHRyZXR1cm4gZmFjdDtcbn0pOyIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ3BpcGVzJywge1xuICAgICAgICB1cmw6ICcvcGlwZXMnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL3BpcGVzL3BpcGVzLmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOiAnUGlwZXNDdHJsJyxcbiAgICAgICAgcmVzb2x2ZToge1xuICAgICAgICBcdHJvdXRlczogZnVuY3Rpb24oUGlwZXNGYWN0b3J5KSB7XG4gICAgICAgIFx0XHRyZXR1cm4gUGlwZXNGYWN0b3J5LmdldFJvdXRlcygpO1xuICAgICAgICBcdH0sXG4gICAgICAgIFx0ZmlsdGVyczogZnVuY3Rpb24oUGlwZXNGYWN0b3J5KSB7XG4gICAgICAgIFx0XHRyZXR1cm4gUGlwZXNGYWN0b3J5LmdldEZpbHRlcnMoKTtcbiAgICAgICAgXHR9XG4gICAgICAgIH1cbiAgICB9KTtcbn0pO1xuXG5hcHAuY29udHJvbGxlcignUGlwZXNDdHJsJywgZnVuY3Rpb24oJHNjb3BlLCBQaXBlc0ZhY3RvcnksIHJvdXRlcywgZmlsdGVycykge1xuXHQkc2NvcGUucm91dGVzID0gcm91dGVzO1xuXHQkc2NvcGUuZmlsdGVycyA9IGZpbHRlcnM7XG5cblx0Ly8gaG9sZHMgcGlwZWxpbmUgbG9naWMgKHdoYXQgdGhlIHVzZXIgaXMgbWFraW5nIG9uIHRoaXMgcGFnZSlcblx0JHNjb3BlLnBpcGUgPSB7XG5cdFx0Ly8gYXJyYXkgb2Ygc2VsZWN0ZWQgcm91dGVzXG5cdFx0aW5wdXRzOiBbXSxcblx0XHQvLyBhcnJheSBvZiB0aGUgc2VsZWN0ZWQgZmlsdGVycyAoYW5kIHRoZWlyIG9yZGVyPylcblx0XHQvLyAvIGNhbGwgaXQgXCJwaXBlbGluZVwiIGluc3RlYWQ/XG5cdFx0ZmlsdGVyczogW10sXG5cdFx0Ly8gYXJyYXkgKGZvciBub3cpIG9mIHRoZSBvdXRwdXRzIGZyb20gZWFjaCBwaXBlL2lucHV0IChmb3Igbm93KVxuXHRcdG91dHB1dDogW11cblx0fTtcblxuXHQvLyByZXR1cm5zIGNyYXdsZWQgZGF0YSBmb3IgdGhlIHBhc3NlZCBpbiByb3V0ZVxuXHQkc2NvcGUuZ2V0Q3Jhd2xEYXRhID0gKHJvdXRlKSA9PiB7XG5cdFx0Y29uc29sZS5sb2coJ2NyYXdsaW5nIGZvcicsIHJvdXRlLm5hbWUpO1xuXHRcdFBpcGVzRmFjdG9yeS5nZXRDcmF3bERhdGEocm91dGUpXG5cdFx0XHQudGhlbihmdW5jdGlvbihkYXRhKSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdnb3QgZGF0YScsIGRhdGEpO1xuXHRcdFx0fSk7XG5cdH07XG5cblx0Ly8gYWRkIHJvdXRlIHRvIHBpcGUgaW5wdXRcblx0JHNjb3BlLnNlbGVjdFJvdXRlID0gKHJvdXRlKSA9PiB7XG5cdFx0JHNjb3BlLnBpcGUuaW5wdXRzLnB1c2gocm91dGUpO1xuXHR9O1xuXG5cdC8vIHJlbW92ZSByb3V0ZSBmcm9tIHBpcGUgaW5wdXRcblx0JHNjb3BlLmRlc2VsZWN0Um91dGUgPSAocm91dGUpID0+IHtcblx0XHQkc2NvcGUucGlwZS5pbnB1dHMgPSAkc2NvcGUucGlwZS5pbnB1dHMuZmlsdGVyKGlucHV0ID0+IGlucHV0ICE9PSByb3V0ZSk7XG5cdH07XG5cblx0Ly8gYWRkIGZpbHRlciB0byBwaXBlbGluZVxuXHQkc2NvcGUuc2VsZWN0RmlsdGVyID0gKGZpbHRlcikgPT4ge1xuXHRcdCRzY29wZS5waXBlLmZpbHRlcnMucHVzaChmaWx0ZXIpO1xuXHR9O1xuXG5cdC8vIHJlbW92ZSBmaWx0ZXIgZnJvbSBwaXBlbGluZVxuXHQkc2NvcGUuZGVzZWxlY3RGaWx0ZXIgPSAoZmlsdGVyKSA9PiB7XG5cdFx0JHNjb3BlLnBpcGUuZmlsdGVycyA9ICRzY29wZS5waXBlLmZpbHRlcnMuZmlsdGVyKHBpcGUgPT4gcGlwZSAhPT0gZmlsdGVyKTtcblx0fTtcblxuXHQvLyBydW4gc2VsZWN0ZWQgaW5wdXRzIHRocm91Z2ggdGhlIHBpcGUgZmlsdGVycyBhbmQgcmV0dXJuIHRoZSBvdXRwdXRcblx0JHNjb3BlLmdlbmVyYXRlT3V0cHV0ID0gKCkgPT4ge1xuXHRcdFBpcGVzRmFjdG9yeS5nZW5lcmF0ZU91dHB1dCgkc2NvcGUucGlwZSlcblx0XHRcdC50aGVuKG91dHB1dCA9PiB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKG91dHB1dCk7XG5cdFx0XHR9KTtcblx0fTtcblxuXHQvLyBzYXZlcyB0aGlzIHBpcGUgdG8gdGhlIHVzZXIgZGJcblx0JHNjb3BlLnNhdmVQaXBlID0gKCkgPT4ge1xuXHRcdFBpcGVzRmFjdG9yeS5zYXZlUGlwZSgkc2NvcGUucGlwZSlcblx0XHRcdC50aGVuKGRhdGEgPT4ge1xuXHRcdFx0XHRjb25zb2xlLmxvZygnc2F2ZWQgdGhlIHBpcGUnLCBkYXRhKTtcblx0XHRcdH0pO1xuXHR9O1xuXG59KTsiLCJhcHAuZmFjdG9yeSgnUm91dGUnLCAoJHN0YXRlLCBEUykgPT4ge1xuXG4gIGxldCBSb3V0ZSA9IERTLmRlZmluZVJlc291cmNlKHtcbiAgICBuYW1lOiAncm91dGUnLFxuICAgIGVuZHBvaW50OiAncm91dGVzJyxcbiAgICByZWxhdGlvbnM6IHtcbiAgICAgIGJlbG9uZ3NUbzoge1xuICAgICAgICB1c2VyOiB7XG4gICAgICAgICAgLy8gbG9jYWwgZmllbGQgaXMgZm9yIGxpbmtpbmcgcmVsYXRpb25zXG4gICAgICAgICAgLy8gcm91dGUudXNlciAtPiB1c2VyKG93bmVyKSBvZiB0aGUgcm91dGVcbiAgICAgICAgICBsb2NhbEZpZWxkOiAnX3VzZXInLFxuICAgICAgICAgIC8vIGxvY2FsIGtleSBpcyB0aGUgXCJqb2luXCIgZmllbGRcbiAgICAgICAgICAvLyB0aGUgbmFtZSBvZiB0aGUgZmllbGQgb24gdGhlIHJvdXRlIHRoYXQgcG9pbnRzIHRvIGl0cyBwYXJlbnQgdXNlclxuICAgICAgICAgIGxvY2FsS2V5OiAndXNlcidcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG4gICAgbWV0aG9kczoge1xuICAgICAgZ286IGZ1bmN0aW9uKCkge1xuICAgICAgICBjb25zb2xlLmxvZyhgdHJhbnNpdGlvbmluZyB0byByb3V0ZSBzdGF0ZSAoJHt0aGlzLm5hbWV9LCAke3RoaXMuX2lkfSlgKVxuICAgICAgICAvLyAkc3RhdGUuZ28oJ3JvdXRlJywgeyBpZDogdGhpcy5faWQgfSlcbiAgICAgIH1cbiAgICB9XG4gIH0pXG5cbiAgcmV0dXJuIFJvdXRlXG59KVxuLnJ1bihSb3V0ZSA9PiB7fSlcbiIsImFwcC5mYWN0b3J5KCdVc2VyJywgKCRzdGF0ZSwgUm91dGUsIERTKSA9PiB7XG5cbiAgbGV0IFVzZXIgPSBEUy5kZWZpbmVSZXNvdXJjZSh7XG4gICAgbmFtZTogJ3VzZXInLFxuICAgIGVuZHBvaW50OiAndXNlcnMnLFxuICAgIHJlbGF0aW9uczoge1xuICAgICAgaGFzTWFueToge1xuICAgICAgICByb3V0ZToge1xuICAgICAgICAgIC8vIGxvY2FsIGZpZWxkIGlzIGZvciBsaW5raW5nIHJlbGF0aW9uc1xuICAgICAgICAgIC8vIHVzZXIucm91dGVzIC0+IGFycmF5IG9mIHJvdXRlcyBmb3IgdGhlIHVzZXJcbiAgICAgICAgICBsb2NhbEZpZWxkOiAncm91dGVzJyxcbiAgICAgICAgICAvLyBmb3JlaWduIGtleSBpcyB0aGUgJ2pvaW4nIGZpZWxkXG4gICAgICAgICAgLy8gdGhlIG5hbWUgb2YgdGhlIGZpZWxkIG9uIGEgcm91dGUgdGhhdCBwb2ludHMgdG8gaXRzIHBhcmVudCB1c2VyXG4gICAgICAgICAgZm9yZWlnbktleTogJ3VzZXInXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIG1ldGhvZHM6IHsgIC8vIGZ1bmN0aW9uYWxpdHkgYWRkZWQgdG8gZXZlcnkgaW5zdGFuY2Ugb2YgVXNlclxuICAgICAgZ286IGZ1bmN0aW9uKCkge1xuICAgICAgICAkc3RhdGUuZ28oJ2FwaScsIHsgaWQ6IHRoaXMuX2lkIH0pXG4gICAgICB9LFxuICAgICAgZ2V0Um91dGVzOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIFJvdXRlLmZpbmRBbGwoeyAndXNlcic6IHRoaXMuX2lkIH0pXG4gICAgICB9XG4gICAgfVxuICB9KVxuXG4gIHJldHVybiBVc2VyXG59KVxuLnJ1bihVc2VyID0+IHt9KVxuIiwiYXBwLmRpcmVjdGl2ZSgnZmlsdGVyJywgZnVuY3Rpb24oKSB7XG5cdHJldHVybiB7XG5cdFx0cmVzdHJpY3Q6ICdFJyxcblx0XHR0ZW1wbGF0ZVVybDogJ2pzL3BpcGVzL2ZpbHRlci9maWx0ZXIuaHRtbCcsXG5cdFx0c2NvcGU6IHtcblx0XHRcdGZpbHRlcjogJz0nLFxuXHRcdFx0c2VsZWN0OiAnJidcblx0XHR9LFxuXHRcdGxpbms6IGZ1bmN0aW9uKCkge1xuXG5cdFx0fVxuXHR9O1xufSk7IiwiYXBwLmRpcmVjdGl2ZSgncm91dGUnLCBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHtcblx0XHRyZXN0cmljdDogJ0UnLFxuXHRcdHRlbXBsYXRlVXJsOiAnanMvcGlwZXMvcm91dGUvcm91dGUuaHRtbCcsXG5cdFx0c2NvcGU6IHtcblx0XHRcdHJvdXRlOiAnPScsXG5cdFx0XHRnZXQ6ICcmJyxcblx0XHRcdHNlbGVjdDogJyYnXG5cdFx0fSxcblx0XHRsaW5rOiBmdW5jdGlvbigpIHtcblx0XHRcdFxuXHRcdH1cblx0fTtcbn0pOyIsImFwcC5kaXJlY3RpdmUoJ25hdmJhcicsIGZ1bmN0aW9uICgkcm9vdFNjb3BlLCAkc3RhdGUsIEF1dGhTZXJ2aWNlLCBBVVRIX0VWRU5UUywgVXNlcikge1xuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgc2NvcGU6IHt9LFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2NvbW1vbi9kaXJlY3RpdmVzL25hdmJhci9uYXZiYXIuaHRtbCcsXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSwgZWxlbSwgYXR0cikge1xuXG4gICAgICAgICAgICBzY29wZS5pdGVtcyA9IFtcbiAgICAgICAgICAgICAgICAvLyB7IGxhYmVsOiAnSG9tZScsIHN0YXRlOiAnaG9tZScgfSxcbiAgICAgICAgICAgICAgICB7IGxhYmVsOiAnUGlwZXMnLCBzdGF0ZTogJ3BpcGVzJ30sXG4gICAgICAgICAgICAgICAgeyBsYWJlbDogJ0RvY3VtZW50YXRpb24nLCBzdGF0ZTogJ2RvY3MnIH0sXG4gICAgICAgICAgICAgICAgeyBsYWJlbDogJ0Fib3V0Jywgc3RhdGU6ICdhYm91dCcgfSxcbiAgICAgICAgICAgICAgICB7IGxhYmVsOiAnSGVscCcsIHN0YXRlOiAnaGVscCcgfSxcbiAgICAgICAgICAgICAgICAvL3sgbGFiZWw6ICdNZW1iZXJzIE9ubHknLCBzdGF0ZTogJ21lbWJlcnNPbmx5JywgYXV0aDogdHJ1ZSB9XG4gICAgICAgICAgICBdO1xuXG4gICAgICAgICAgICBzY29wZS5zaG93ID0gZmFsc2VcblxuICAgICAgICAgICAgc2NvcGUudG9nZ2xlID0gKCkgPT4gc2NvcGUuc2hvdyA9ICFzY29wZS5zaG93XG5cbiAgICAgICAgICAgIHNjb3BlLnNlYXJjaCA9ICgpID0+IHtcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3NlYXJjaGluZyBmb3Igc29tZXRoaW5nLi4uJylcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgc2NvcGUudXNlciA9IG51bGw7XG5cbiAgICAgICAgICAgIHNjb3BlLmlzTG9nZ2VkSW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIEF1dGhTZXJ2aWNlLmlzQXV0aGVudGljYXRlZCgpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgc2NvcGUubG9nb3V0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIEF1dGhTZXJ2aWNlLmxvZ291dCgpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICRzdGF0ZS5nbygnaG9tZScpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdmFyIHNldFVzZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgQXV0aFNlcnZpY2UuZ2V0TG9nZ2VkSW5Vc2VyKClcbiAgICAgICAgICAgICAgICAgIC50aGVuKHVzZXIgPT4gVXNlci5maW5kKHVzZXIuX2lkKSlcbiAgICAgICAgICAgICAgICAgIC50aGVuKHVzZXIgPT4ge1xuICAgICAgICAgICAgICAgICAgICBzY29wZS51c2VyID0gdXNlclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdXNlclxuICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHZhciByZW1vdmVVc2VyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHNjb3BlLnVzZXIgPSBudWxsO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgc2V0VXNlcigpO1xuXG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5sb2dpblN1Y2Nlc3MsIHNldFVzZXIpO1xuICAgICAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMubG9nb3V0U3VjY2VzcywgcmVtb3ZlVXNlcik7XG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5zZXNzaW9uVGltZW91dCwgcmVtb3ZlVXNlcik7XG5cbiAgICAgICAgfVxuXG4gICAgfTtcblxufSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbmFwcC5kaXJlY3RpdmUoJ25nRW50ZXInLCAoKSA9PiB7XG5cdHJldHVybiB7XG5cdFx0cmVzdHJpY3Q6ICdBJyxcblx0XHRzY29wZToge1xuXHRcdFx0bmdFbnRlcjogJyYnXG5cdFx0fSxcblx0XHRsaW5rOiAoc2NvcGUsIGVsZW0sIGF0dHIpID0+IHtcblx0XHRcdGVsZW0uYmluZCgna2V5ZG93biBrZXlwcmVzcycsIChldmVudCkgPT4ge1xuXHRcdFx0XHRpZiAoZXZlbnQud2hpY2ggPT0gMTMpIHtcblx0XHRcdFx0XHRzY29wZS4kYXBwbHkoKCkgPT4ge1xuICAgICAgICAgICAgc2NvcGUubmdFbnRlcigpXG4gICAgICAgICAgfSlcblx0XHRcdFx0XHRyZXR1cm4gZmFsc2Vcblx0XHRcdFx0fVxuXHRcdFx0fSlcblx0XHR9XG5cdH1cbn0pXG4iLCJhcHAuZGlyZWN0aXZlKCdub2RlbW9ub0xvZ28nLCBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9jb21tb24vZGlyZWN0aXZlcy9ub2RlbW9uby1sb2dvL25vZGVtb25vLWxvZ28uaHRtbCcsXG4gICAgICAgIGxpbms6IChzY29wZSwgZWxlbSwgYXR0cikgPT4ge1xuXG4gICAgICAgICAgc2NvcGUuaW5zdGFsbENocm9tZUV4dCA9ICgpID0+IHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGBpbnN0YWxsaW5nIE5vZGVtb25vIGNocm9tZSBleHRlbnNpb24uLi5gKVxuICAgICAgICAgIH1cblxuICAgICAgICB9XG4gICAgfTtcbn0pO1xuIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9