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

(function () {

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
  $stateProvider.state('help', {
    url: '/help',
    templateUrl: 'js/help/help.html'
  });
});

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

app.directive('navbar', function ($rootScope, $state, AuthService, AUTH_EVENTS, User) {

  return {
    restrict: 'E',
    scope: {},
    templateUrl: 'js/common/directives/navbar/navbar.html',
    link: function link(scope, elem, attr) {

      scope.items = [
      // { label: 'Home', state: 'home' },
      { label: 'Documentation', state: 'docs' }, { label: 'About', state: 'about' }, { label: 'Help', state: 'help' }];

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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImFib3V0L2Fib3V0LmpzIiwiYXBpL2FwaS5qcyIsImRvY3MvZG9jcy5qcyIsImZzYS9mc2EtcHJlLWJ1aWx0LmpzIiwiaGVscC9oZWxwLmpzIiwiaG9tZS9ob21lLmpzIiwibG9naW4vbG9naW4uanMiLCJtZW1iZXJzLW9ubHkvbWVtYmVycy1vbmx5LmpzIiwiY29tbW9uL2ZhY3Rvcmllcy9yb3V0ZS5mYWN0b3J5LmpzIiwiY29tbW9uL2ZhY3Rvcmllcy91c2VyLmZhY3RvcnkuanMiLCJjb21tb24vZGlyZWN0aXZlcy9uYXZiYXIvbmF2YmFyLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvbmdFbnRlci9uZ0VudGVyLmRpcmVjdGl2ZS5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL25vZGVtb25vLWxvZ28vbm9kZW1vbm8tbG9nby5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxZQUFBLENBQUE7QUFDQSxNQUFBLENBQUEsR0FBQSxHQUFBLE9BQUEsQ0FBQSxNQUFBLENBQUEsYUFBQSxFQUFBLENBQUEsV0FBQSxFQUFBLGNBQUEsRUFBQSxhQUFBLEVBQUEsU0FBQSxDQUFBLENBQUEsQ0FBQTs7QUFFQSxHQUFBLENBQUEsTUFBQSxDQUFBLFVBQUEsa0JBQUEsRUFBQSxpQkFBQSxFQUFBLFVBQUEsRUFBQSxxQkFBQSxFQUFBOztBQUVBLG1CQUFBLENBQUEsU0FBQSxDQUFBLElBQUEsQ0FBQSxDQUFBOztBQUVBLG9CQUFBLENBQUEsU0FBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBOzs7QUFHQSxZQUFBLENBQUEsUUFBQSxDQUFBLFFBQUEsR0FBQSxNQUFBLENBQUE7QUFDQSxZQUFBLENBQUEsUUFBQSxDQUFBLFdBQUEsR0FBQSxLQUFBLENBQUE7Ozs7O0FBTUEsWUFBQSxDQUFBLFFBQUEsQ0FBQSxTQUFBLEdBQUEsVUFBQSxPQUFBLEVBQUE7QUFDQSxRQUFBLElBQUEsR0FBQSxJQUFBLENBQUEsTUFBQSxFQUFBLENBQUE7QUFDQSxRQUFBLElBQUEsQ0FBQSxNQUFBLEVBQUEsT0FBQSxPQUFBLENBQUEsT0FBQSxDQUFBLE9BQUEsQ0FBQSxJQUFBLENBQUEsSUFBQSxDQUFBLENBQUEsQ0FBQSxLQUNBLE9BQUEsSUFBQSxDQUFBLE9BQUEsRUFBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLElBQUE7YUFBQSxPQUFBLENBQUEsSUFBQSxDQUFBLElBQUEsQ0FBQTtLQUFBLENBQUEsQ0FBQTtHQUNBLENBQUE7Ozs7OztBQU1BLFdBQUEsWUFBQSxDQUFBLFFBQUEsRUFBQSxRQUFBLEVBQUE7QUFDQSxhQUFBLFlBQUEsQ0FBQSxDQUFBLEVBQUE7QUFDQSxZQUFBLENBQUEsT0FBQSxDQUFBLE9BQUEsQ0FBQSxRQUFBLENBQUEsWUFBQSxFQUFBLFVBQUEsR0FBQSxFQUFBO0FBQ0EsWUFBQSxZQUFBLEdBQUEsR0FBQSxDQUFBLFFBQUEsQ0FBQTtBQUNBLFlBQUEsV0FBQSxHQUFBLFFBQUEsQ0FBQSxXQUFBLENBQUEsWUFBQSxDQUFBLENBQUE7QUFDQSxZQUFBLEdBQUEsQ0FBQSxJQUFBLEtBQUEsU0FBQSxFQUFBO0FBQ0EsY0FBQSxDQUFBLENBQUEsY0FBQSxDQUFBLEdBQUEsQ0FBQSxVQUFBLENBQUEsRUFBQTtBQUNBLGdCQUFBLENBQUEsQ0FBQSxHQUFBLENBQUEsVUFBQSxDQUFBLENBQUEsTUFBQSxJQUFBLENBQUEsTUFBQSxDQUFBLE9BQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQSxDQUFBLEdBQUEsQ0FBQSxVQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxFQUFBOztBQUVBLGVBQUEsQ0FBQSxHQUFBLENBQUEsU0FBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBLEdBQUEsQ0FBQSxVQUFBLENBQUEsQ0FBQTtBQUNBLHFCQUFBLENBQUEsQ0FBQSxHQUFBLENBQUEsVUFBQSxDQUFBLENBQUE7YUFDQSxNQUFBLElBQUEsQ0FBQSxDQUFBLENBQUEsR0FBQSxDQUFBLFNBQUEsQ0FBQSxFQUFBOztBQUVBLGVBQUEsQ0FBQSxHQUFBLENBQUEsU0FBQSxDQUFBLEdBQUEsRUFBQSxDQUFBO0FBQ0Esb0JBQUEsQ0FBQSxPQUFBLENBQUEsT0FBQSxDQUFBLENBQUEsQ0FBQSxHQUFBLENBQUEsVUFBQSxDQUFBLEVBQUEsVUFBQSxLQUFBLEVBQUE7QUFDQSxpQkFBQSxDQUFBLEdBQUEsQ0FBQSxTQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsS0FBQSxDQUFBLFdBQUEsQ0FBQSxXQUFBLENBQUEsQ0FBQSxDQUFBO2VBQ0EsQ0FBQSxDQUFBO2FBQ0E7V0FDQTtTQUNBLE1BQ0EsSUFBQSxHQUFBLENBQUEsSUFBQSxLQUFBLFdBQUEsRUFBQTtBQUNBLGNBQUEsQ0FBQSxDQUFBLGNBQUEsQ0FBQSxHQUFBLENBQUEsVUFBQSxDQUFBLEVBQUE7O0FBRUEsZ0JBQUEsTUFBQSxDQUFBLE9BQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQSxDQUFBLEdBQUEsQ0FBQSxVQUFBLENBQUEsQ0FBQSxFQUFBO0FBQ0EsZUFBQSxDQUFBLEdBQUEsQ0FBQSxRQUFBLENBQUEsR0FBQSxDQUFBLENBQUEsR0FBQSxDQUFBLFVBQUEsQ0FBQSxDQUFBLEdBQUEsQ0FBQTthQUNBOztpQkFFQSxJQUFBLENBQUEsTUFBQSxDQUFBLE9BQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQSxDQUFBLEdBQUEsQ0FBQSxVQUFBLENBQUEsQ0FBQSxFQUFBO0FBQ0EsaUJBQUEsQ0FBQSxHQUFBLENBQUEsUUFBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBLEdBQUEsQ0FBQSxVQUFBLENBQUEsQ0FBQTtBQUNBLHVCQUFBLENBQUEsQ0FBQSxHQUFBLENBQUEsVUFBQSxDQUFBLENBQUE7ZUFDQTtXQUNBO1NBQ0E7T0FDQSxDQUFBLENBQUE7S0FDQTs7QUFFQSxRQUFBLE1BQUEsQ0FBQSxPQUFBLENBQUEsT0FBQSxDQUFBLFFBQUEsQ0FBQSxFQUFBO0FBQ0EsWUFBQSxDQUFBLE9BQUEsQ0FBQSxPQUFBLENBQUEsUUFBQSxFQUFBLFlBQUEsQ0FBQSxDQUFBO0tBQ0EsTUFBQTtBQUNBLGtCQUFBLENBQUEsUUFBQSxDQUFBLENBQUE7S0FDQTtHQUNBOztBQUdBLFlBQUEsQ0FBQSxRQUFBLENBQUEsV0FBQSxHQUFBLFVBQUEsUUFBQSxFQUFBLElBQUEsRUFBQTtBQUNBLFFBQUEsUUFBQSxHQUFBLElBQUEsQ0FBQSxJQUFBLENBQUE7QUFDQSxnQkFBQSxDQUFBLFFBQUEsRUFBQSxRQUFBLENBQUEsQ0FBQTtBQUNBLFdBQUEsUUFBQSxDQUFBO0dBQ0EsQ0FBQTs7Q0FFQSxDQUFBLENBQUE7OztBQUdBLEdBQUEsQ0FBQSxHQUFBLENBQUEsVUFBQSxVQUFBLEVBQUEsV0FBQSxFQUFBLE1BQUEsRUFBQTs7O0FBR0EsTUFBQSw0QkFBQSxHQUFBLFNBQUEsNEJBQUEsQ0FBQSxLQUFBLEVBQUE7QUFDQSxXQUFBLEtBQUEsQ0FBQSxJQUFBLElBQUEsS0FBQSxDQUFBLElBQUEsQ0FBQSxZQUFBLENBQUE7R0FDQSxDQUFBOzs7O0FBSUEsWUFBQSxDQUFBLEdBQUEsQ0FBQSxtQkFBQSxFQUFBLFVBQUEsS0FBQSxFQUFBLE9BQUEsRUFBQSxRQUFBLEVBQUE7O0FBRUEsUUFBQSxDQUFBLDRCQUFBLENBQUEsT0FBQSxDQUFBLEVBQUE7OztBQUdBLGFBQUE7S0FDQTs7QUFFQSxRQUFBLFdBQUEsQ0FBQSxlQUFBLEVBQUEsRUFBQTs7O0FBR0EsYUFBQTtLQUNBOzs7QUFHQSxTQUFBLENBQUEsY0FBQSxFQUFBLENBQUE7O0FBRUEsZUFBQSxDQUFBLGVBQUEsRUFBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLElBQUEsRUFBQTs7OztBQUlBLFVBQUEsSUFBQSxFQUFBO0FBQ0EsY0FBQSxDQUFBLEVBQUEsQ0FBQSxPQUFBLENBQUEsSUFBQSxFQUFBLFFBQUEsQ0FBQSxDQUFBO09BQ0EsTUFBQTtBQUNBLGNBQUEsQ0FBQSxFQUFBLENBQUEsT0FBQSxDQUFBLENBQUE7T0FDQTtLQUNBLENBQUEsQ0FBQTtHQUVBLENBQUEsQ0FBQTtDQUVBLENBQUEsQ0FBQTs7QUN2SEEsR0FBQSxDQUFBLE1BQUEsQ0FBQSxVQUFBLGNBQUEsRUFBQTs7O0FBR0EsZ0JBQUEsQ0FBQSxLQUFBLENBQUEsT0FBQSxFQUFBO0FBQ0Es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ZUFBQSxFQUFBLCtCQUFBO0FBQ0Esa0JBQUEsRUFBQSxLQUFBO0FBQ0EsZ0JBQUEsRUFBQTtBQUNBLGtCQUFBLEVBQUEsOENBQUE7QUFDQSxrQkFBQSxFQUFBLFNBQUE7YUFDQTtBQUNBLG9CQUFBLEVBQUE7QUFDQSxrQkFBQSxFQUFBLCtDQUFBO0FBQ0Esa0JBQUEsRUFBQSxLQUFBO2FBQ0E7QUFDQSxpQkFBQSxFQUFBLEVBQUE7V0FDQSxFQUNBO0FBQ0EsaUJBQUEsRUFBQTtBQUNBLGtCQUFBLEVBQUEsOEZBQUE7QUFDQSxrQkFBQSxFQUFBLGlFQUFBO2FBQ0E7QUFDQSxlQUFBLEVBQUEsK0JBQUE7QUFDQSxrQkFBQSxFQUFBLEtBQUE7QUFDQSxnQkFBQSxFQUFBO0FBQ0Esa0JBQUEsRUFBQSw4Q0FBQTtBQUNBLGtCQUFBLEVBQUEsU0FBQTthQUNBO0FBQ0Esb0JBQUEsRUFBQTtBQUNBLGtCQUFBLEVBQUEsK0NBQUE7QUFDQSxrQkFBQSxFQUFBLElBQUE7YUFDQTtBQUNBLGlCQUFBLEVBQUEsRUFBQTtXQUNBLEVBQ0E7QUFDQSxpQkFBQSxFQUFBO0FBQ0Esa0JBQUEsRUFBQSxvRUFBQTtBQUNBLGtCQUFBLEVBQUEsOEJBQUE7YUFDQTtBQUNBLGVBQUEsRUFBQSwrQkFBQTtBQUNBLGtCQUFBLEVBQUEsR0FBQTtBQUNBLGdCQUFBLEVBQUE7QUFDQSxrQkFBQSxFQUFBLGtEQUFBO0FBQ0Esa0JBQUEsRUFBQSxhQUFBO2FBQ0E7QUFDQSxvQkFBQSxFQUFBO0FBQ0Esa0JBQUEsRUFBQSxFQUFBO0FBQ0Esa0JBQUEsRUFBQSxFQUFBO2FBQ0E7QUFDQSxpQkFBQSxFQUFBLEVBQUE7V0FDQSxFQUNBO0FBQ0EsaUJBQUEsRUFBQTtBQUNBLGtCQUFBLEVBQUEsb0RBQUE7QUFDQSxrQkFBQSxFQUFBLG9EQUFBO2FBQ0E7QUFDQSxlQUFBLEVBQUEsK0JBQUE7QUFDQSxrQkFBQSxFQUFBLElBQUE7QUFDQSxnQkFBQSxFQUFBO0FBQ0Esa0JBQUEsRUFBQSwwQ0FBQTtBQUNBLGtCQUFBLEVBQUEsS0FBQTthQUNBO0FB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RUEsY0FBQSxDQUFBOzs7QUFHQSxNQUFBLENBQUEsTUFBQSxDQUFBLE9BQUEsRUFBQSxNQUFBLElBQUEsS0FBQSxDQUFBLHdCQUFBLENBQUEsQ0FBQTs7QUFFQSxNQUFBLEdBQUEsR0FBQSxPQUFBLENBQUEsTUFBQSxDQUFBLGFBQUEsRUFBQSxFQUFBLENBQUEsQ0FBQTs7QUFFQSxLQUFBLENBQUEsT0FBQSxDQUFBLFFBQUEsRUFBQSxZQUFBO0FBQ0EsUUFBQSxDQUFBLE1BQUEsQ0FBQSxFQUFBLEVBQUEsTUFBQSxJQUFBLEtBQUEsQ0FBQSxzQkFBQSxDQUFBLENBQUE7QUFDQSxXQUFBLE1BQUEsQ0FBQSxFQUFBLENBQUEsTUFBQSxDQUFBLFFBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTtHQUNBLENBQUEsQ0FBQTs7Ozs7QUFLQSxLQUFBLENBQUEsUUFBQSxDQUFBLGFBQUEsRUFBQTtBQUNBLGdCQUFBLEVBQUEsb0JBQUE7QUFDQSxlQUFBLEVBQUEsbUJBQUE7QUFDQSxpQkFBQSxFQUFBLHFCQUFBO0FBQ0Esa0JBQUEsRUFBQSxzQkFBQTtBQUNBLG9CQUFBLEVBQUEsd0JBQUE7QUFDQSxpQkFBQSxFQUFBLHFCQUFBO0dBQ0EsQ0FBQSxDQUFBOztBQUVBLEtBQUEsQ0FBQSxPQUFBLENBQUEsaUJBQUEsRUFBQSxVQUFBLFVBQUEsRUFBQSxFQUFBLEVBQUEsV0FBQSxFQUFBO0FBQ0EsUUFBQSxVQUFBLEdBQUE7QUFDQSxTQUFBLEVBQUEsV0FBQSxDQUFBLGdCQUFBO0FBQ0EsU0FBQSxFQUFBLFdBQUEsQ0FBQSxhQUFBO0FBQ0EsU0FBQSxFQUFBLFdBQUEsQ0FBQSxjQUFBO0FBQ0EsU0FBQSxFQUFBLFdBQUEsQ0FBQSxjQUFBO0tBQ0EsQ0FBQTtBQUNBLFdBQUE7QUFDQSxtQkFBQSxFQUFBLHVCQUFBLFFBQUEsRUFBQTtBQUNBLGtCQUFBLENBQUEsVUFBQSxDQUFBLFVBQUEsQ0FBQSxRQUFBLENBQUEsTUFBQSxDQUFBLEVBQUEsUUFBQSxDQUFBLENBQUE7QUFDQSxlQUFBLEVBQUEsQ0FBQSxNQUFBLENBQUEsUUFBQSxDQUFBLENBQUE7T0FDQTtLQUNBLENBQUE7R0FDQSxDQUFBLENBQUE7O0FBRUEsS0FBQSxDQUFBLE1BQUEsQ0FBQSxVQUFBLGFBQUEsRUFBQTtBQUNBLGlCQUFBLENBQUEsWUFBQSxDQUFBLElBQUEsQ0FBQSxDQUNBLFdBQUEsRUFDQSxVQUFBLFNBQUEsRUFBQTtBQUNBLGFBQUEsU0FBQSxDQUFBLEdBQUEsQ0FBQSxpQkFBQSxDQUFBLENBQUE7S0FDQSxDQUNBLENBQUEsQ0FBQTtHQUNBLENBQUEsQ0FBQTs7QUFFQSxLQUFBLENBQUEsT0FBQSxDQUFBLGFBQUEsRUFBQSxVQUFBLEtBQUEsRUFBQSxPQUFBLEVBQUEsVUFBQSxFQUFBLFdBQUEsRUFBQSxFQUFBLEVBQUEsSUFBQSxFQUFBOztBQUVBLGFBQUEsaUJBQUEsQ0FBQSxRQUFBLEVBQUE7QUFDQSxVQUFBLElBQUEsR0FBQSxRQUFBLENBQUEsSUFBQSxDQUFBO0FBQ0EsYUFBQSxDQUFBLE1BQUEsQ0FBQSxJQUFBLENBQUEsRUFBQSxFQUFBLElBQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQTtBQUNBLGdCQUFBLENBQUEsVUFBQSxDQUFBLFdBQUEsQ0FBQSxZQUFBLENBQUEsQ0FBQTtBQUNBLGFBQUEsSUFBQSxDQUFBLElBQUEsQ0FBQTtLQUNBOzs7O0FBSUEsUUFBQSxDQUFBLGVBQUEsR0FBQSxZQUFBO0FBQ0EsYUFBQSxDQUFBLENBQUEsT0FBQSxDQUFBLElBQUEsQ0FBQTtLQUNBLENBQUE7O0FBRUEsUUFBQSxDQUFBLGVBQUEsR0FBQSxVQUFBLFVBQUEsRUFBQTs7Ozs7Ozs7OztBQVVBLFVBQUEsSUFBQSxDQUFBLGVBQUEsRUFBQSxJQUFBLFVBQUEsS0FBQSxJQUFBLEVBQUE7QUFDQSxlQUFBLEVBQUEsQ0FBQSxJQUFBLENBQUEsT0FBQSxDQUFBLElBQUEsQ0FBQSxDQUFBO09BQ0E7Ozs7O0FBS0EsYUFBQSxLQUFBLENBQUEsR0FBQSxDQUFBLFVBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxpQkFBQSxDQUFBLFNBQUEsQ0FBQSxZQUFBO0FBQ0EsZUFBQSxJQUFBLENBQUE7T0FDQSxDQUFBLENBQUE7S0FFQSxDQUFBOztBQUVBLFFBQUEsQ0FBQSxLQUFBLEdBQUEsVUFBQSxXQUFBLEVBQUE7QUFDQSxhQUFBLEtBQUEsQ0FBQSxJQUFBLENBQUEsUUFBQSxFQUFBLFdBQUEsQ0FBQSxDQUNBLElBQUEsQ0FBQSxpQkFBQSxDQUFBLFNBQ0EsQ0FBQSxZQUFBO0FBQ0EsZUFBQSxFQUFBLENBQUEsTUFBQSxDQUFBLEVBQUEsT0FBQSxFQUFBLDRCQUFBLEVBQUEsQ0FBQSxDQUFBO09BQ0EsQ0FBQSxDQUFBO0tBQ0EsQ0FBQTs7QUFFQSxRQUFBLENBQUEsTUFBQSxHQUFBLFlBQUE7QUFDQSxhQUFBLEtBQUEsQ0FBQSxHQUFBLENBQUEsU0FBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFlBQUE7QUFDQSxlQUFBLENBQUEsT0FBQSxFQUFBLENBQUE7QUFDQSxrQkFBQSxDQUFBLFVBQUEsQ0FBQSxXQUFBLENBQUEsYUFBQSxDQUFBLENBQUE7T0FDQSxDQUFBLENBQUE7S0FDQSxDQUFBO0dBRUEsQ0FBQSxDQUFBOztBQUVBLEtBQUEsQ0FBQSxPQUFBLENBQUEsU0FBQSxFQUFBLFVBQUEsVUFBQSxFQUFBLFdBQUEsRUFBQTs7QUFFQSxRQUFBLElBQUEsR0FBQSxJQUFBLENBQUE7O0FBRUEsY0FBQSxDQUFBLEdBQUEsQ0FBQSxXQUFBLENBQUEsZ0JBQUEsRUFBQSxZQUFBO0FBQ0EsVUFBQSxDQUFBLE9BQUEsRUFBQSxDQUFBO0tBQ0EsQ0FBQSxDQUFBOztBQUVBLGNBQUEsQ0FBQSxHQUFBLENBQUEsV0FBQSxDQUFBLGNBQUEsRUFBQSxZQUFBO0FBQ0EsVUFBQSxDQUFBLE9BQUEsRUFBQSxDQUFBO0tBQ0EsQ0FBQSxDQUFBOztBQUVBLFFBQUEsQ0FBQSxFQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsUUFBQSxDQUFBLElBQUEsR0FBQSxJQUFBLENBQUE7O0FBRUEsUUFBQSxDQUFBLE1BQUEsR0FBQSxVQUFBLFNBQUEsRUFBQSxJQUFBLEVBQUE7QUFDQSxVQUFBLENBQUEsRUFBQSxHQUFBLFNBQUEsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxJQUFBLEdBQUEsSUFBQSxDQUFBO0tBQ0EsQ0FBQTs7QUFFQSxRQUFBLENBQUEsT0FBQSxHQUFBLFlBQUE7QUFDQSxVQUFBLENBQUEsRUFBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxJQUFBLEdBQUEsSUFBQSxDQUFBO0tBQ0EsQ0FBQTtHQUVBLENBQUEsQ0FBQTtDQUVBLENBQUEsRUFBQSxDQUFBOztBQ3BJQSxHQUFBLENBQUEsTUFBQSxDQUFBLFVBQUEsY0FBQSxFQUFBO0FBQ0EsZ0JBQUEsQ0FBQSxLQUFBLENBQUEsTUFBQSxFQUFBO0FBQ0EsT0FBQSxFQUFBLE9BQUE7QUFDQSxlQUFBLEVBQUEsbUJBQUE7R0FDQSxDQUFBLENBQUE7Q0FDQSxDQUFBLENBQUE7O0FDTEEsR0FBQSxDQUFBLE1BQUEsQ0FBQSxVQUFBLGNBQUEsRUFBQTtBQUNBLGdCQUFBLENBQUEsS0FBQSxDQUFBLE1BQUEsRUFBQTtBQUNBLE9BQUEsRUFBQSxHQUFBO0FBQ0EsZUFBQSxFQUFBLG1CQUFBO0FBQ0EsY0FBQSxFQUFBLG9CQUFBLE1BQUEsRUFBQSxLQUFBLEVBQUEsTUFBQSxFQUFBO0FBQ0EsWUFBQSxDQUFBLEtBQUEsR0FBQSxLQUFBLENBQUE7QUFDQSxZQUFBLENBQUEsTUFBQSxHQUFBLE1BQUEsQ0FBQTs7O0FBR0EsWUFBQSxDQUFBLFNBQUEsR0FBQTtlQUFBLFNBQUEsQ0FBQSxTQUFBLENBQUEsV0FBQSxFQUFBLENBQUEsUUFBQSxDQUFBLFFBQUEsQ0FBQTtPQUFBLENBQUE7S0FDQTtBQUNBLFdBQUEsRUFBQTtBQUNBLFdBQUEsRUFBQSxlQUFBLElBQUE7ZUFBQSxJQUFBLENBQUEsT0FBQSxDQUFBLEVBQUEsRUFBQSxFQUFBLFdBQUEsRUFBQSxJQUFBLEVBQUEsQ0FBQTtPQUFBO0FBQ0EsWUFBQSxFQUFBLGdCQUFBLEtBQUE7ZUFBQSxLQUFBLENBQUEsT0FBQSxDQUFBLEVBQUEsRUFBQSxFQUFBLFdBQUEsRUFBQSxJQUFBLEVBQUEsQ0FBQTtPQUFBO0tBQ0E7R0FDQSxDQUFBLENBQUE7Q0FDQSxDQUFBLENBQUE7O0FDaEJBLEdBQUEsQ0FBQSxNQUFBLENBQUEsVUFBQSxjQUFBLEVBQUE7O0FBRUEsZ0JBQUEsQ0FBQSxLQUFBLENBQUEsT0FBQSxFQUFBO0FBQ0EsT0FBQSxFQUFBLFFBQUE7QUFDQSxlQUFBLEVBQUEscUJBQUE7QUFDQSxjQUFBLEVBQUEsV0FBQTtHQUNBLENBQUEsQ0FBQTtDQUVBLENBQUEsQ0FBQTs7QUFFQSxHQUFBLENBQUEsVUFBQSxDQUFBLFdBQUEsRUFBQSxVQUFBLE1BQUEsRUFBQSxXQUFBLEVBQUEsTUFBQSxFQUFBOztBQUVBLFFBQUEsQ0FBQSxLQUFBLEdBQUEsRUFBQSxDQUFBO0FBQ0EsUUFBQSxDQUFBLEtBQUEsR0FBQSxJQUFBLENBQUE7O0FBRUEsUUFBQSxDQUFBLFNBQUEsR0FBQSxVQUFBLFNBQUEsRUFBQTs7QUFFQSxVQUFBLENBQUEsS0FBQSxHQUFBLElBQUEsQ0FBQTs7QUFFQSxlQUFBLENBQUEsS0FBQSxDQUFBLFNBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLElBQUEsRUFBQTtBQUNBLFlBQUEsQ0FBQSxFQUFBLENBQUEsTUFBQSxFQUFBLEVBQUEsRUFBQSxFQUFBLElBQUEsQ0FBQSxHQUFBLEVBQUEsQ0FBQSxDQUFBO0tBQ0EsQ0FBQSxTQUFBLENBQUEsWUFBQTtBQUNBLFlBQUEsQ0FBQSxLQUFBLEdBQUEsNEJBQUEsQ0FBQTtLQUNBLENBQUEsQ0FBQTtHQUVBLENBQUE7Q0FFQSxDQUFBLENBQUE7O0FDM0JBLEdBQUEsQ0FBQSxNQUFBLENBQUEsVUFBQSxjQUFBLEVBQUE7O0FBRUEsZ0JBQUEsQ0FBQSxLQUFBLENBQUEsYUFBQSxFQUFBO0FBQ0EsT0FBQSxFQUFBLGVBQUE7QUFDQSxZQUFBLEVBQUEsRUFBQTtBQUNBLGNBQUEsRUFBQSxvQkFBQSxNQUFBLEVBQUEsRUFBQTs7OztBQUlBLFFBQUEsRUFBQTtBQUNBLGtCQUFBLEVBQUEsSUFBQTtLQUNBO0dBQ0EsQ0FBQSxDQUFBO0NBRUEsQ0FBQSxDQUFBOztBQ2RBLEdBQUEsQ0FBQSxPQUFBLENBQUEsT0FBQSxFQUFBLFVBQUEsTUFBQSxFQUFBLEVBQUEsRUFBQTs7QUFFQSxNQUFBLEtBQUEsR0FBQSxFQUFBLENBQUEsY0FBQSxDQUFBO0FBQ0EsUUFBQSxFQUFBLE9BQUE7QUFDQSxZQUFBLEVBQUEsUUFBQTtBQUNBLGFBQUEsRUFBQTtBQUNBLGVBQUEsRUFBQTtBQUNBLFlBQUEsRUFBQTs7O0FBR0Esb0JBQUEsRUFBQSxPQUFBOzs7QUFHQSxrQkFBQSxFQUFBLE1BQUE7U0FDQTtPQUNBO0tBQ0E7QUFDQSxXQUFBLEVBQUE7QUFDQSxRQUFBLEVBQUEsY0FBQTtBQUNBLGVBQUEsQ0FBQSxHQUFBLG9DQUFBLElBQUEsQ0FBQSxJQUFBLFVBQUEsSUFBQSxDQUFBLEdBQUEsT0FBQSxDQUFBOztPQUVBO0tBQ0E7R0FDQSxDQUFBLENBQUE7O0FBRUEsU0FBQSxLQUFBLENBQUE7Q0FDQSxDQUFBLENBQ0EsR0FBQSxDQUFBLFVBQUEsS0FBQSxFQUFBLEVBQUEsQ0FBQSxDQUFBOztBQzNCQSxHQUFBLENBQUEsT0FBQSxDQUFBLE1BQUEsRUFBQSxVQUFBLE1BQUEsRUFBQSxLQUFBLEVBQUEsRUFBQSxFQUFBOztBQUVBLE1BQUEsSUFBQSxHQUFBLEVBQUEsQ0FBQSxjQUFBLENBQUE7QUFDQSxRQUFBLEVBQUEsTUFBQTtBQUNBLFlBQUEsRUFBQSxPQUFBO0FBQ0EsYUFBQSxFQUFBO0FBQ0EsYUFBQSxFQUFBO0FBQ0EsYUFBQSxFQUFBOzs7QUFHQSxvQkFBQSxFQUFBLFFBQUE7OztBQUdBLG9CQUFBLEVBQUEsTUFBQTtTQUNBO09BQ0E7S0FDQTtBQUNBLFdBQUEsRUFBQTtBQUNBLFFBQUEsRUFBQSxjQUFBO0FBQ0EsY0FBQSxDQUFBLEVBQUEsQ0FBQSxLQUFBLEVBQUEsRUFBQSxFQUFBLEVBQUEsSUFBQSxDQUFBLEdBQUEsRUFBQSxDQUFBLENBQUE7T0FDQTtBQUNBLGVBQUEsRUFBQSxxQkFBQTtBQUNBLGVBQUEsS0FBQSxDQUFBLE9BQUEsQ0FBQSxFQUFBLE1BQUEsRUFBQSxJQUFBLENBQUEsR0FBQSxFQUFBLENBQUEsQ0FBQTtPQUNBO0tBQ0E7R0FDQSxDQUFBLENBQUE7O0FBRUEsU0FBQSxJQUFBLENBQUE7Q0FDQSxDQUFBLENBQ0EsR0FBQSxDQUFBLFVBQUEsSUFBQSxFQUFBLEVBQUEsQ0FBQSxDQUFBOztBQzdCQSxHQUFBLENBQUEsU0FBQSxDQUFBLFFBQUEsRUFBQSxVQUFBLFVBQUEsRUFBQSxNQUFBLEVBQUEsV0FBQSxFQUFBLFdBQUEsRUFBQSxJQUFBLEVBQUE7O0FBRUEsU0FBQTtBQUNBLFlBQUEsRUFBQSxHQUFBO0FBQ0EsU0FBQSxFQUFBLEVBQUE7QUFDQSxlQUFBLEVBQUEseUNBQUE7QUFDQSxRQUFBLEVBQUEsY0FBQSxLQUFBLEVBQUEsSUFBQSxFQUFBLElBQUEsRUFBQTs7QUFFQSxXQUFBLENBQUEsS0FBQSxHQUFBOztBQUVBLFFBQUEsS0FBQSxFQUFBLGVBQUEsRUFBQSxLQUFBLEVBQUEsTUFBQSxFQUFBLEVBQ0EsRUFBQSxLQUFBLEVBQUEsT0FBQSxFQUFBLEtBQUEsRUFBQSxPQUFBLEVBQUEsRUFDQSxFQUFBLEtBQUEsRUFBQSxNQUFBLEVBQUEsS0FBQSxFQUFBLE1BQUEsRUFBQSxDQUVBLENBQUE7OztBQUVBLFdBQUEsQ0FBQSxJQUFBLEdBQUEsS0FBQSxDQUFBOztBQUVBLFdBQUEsQ0FBQSxNQUFBLEdBQUE7ZUFBQSxLQUFBLENBQUEsSUFBQSxHQUFBLENBQUEsS0FBQSxDQUFBLElBQUE7T0FBQSxDQUFBOztBQUVBLFdBQUEsQ0FBQSxNQUFBLEdBQUEsWUFBQTtBQUNBLGVBQUEsQ0FBQSxHQUFBLENBQUEsNEJBQUEsQ0FBQSxDQUFBO09BQ0EsQ0FBQTs7QUFFQSxXQUFBLENBQUEsSUFBQSxHQUFBLElBQUEsQ0FBQTs7QUFFQSxXQUFBLENBQUEsVUFBQSxHQUFBLFlBQUE7QUFDQSxlQUFBLFdBQUEsQ0FBQSxlQUFBLEVBQUEsQ0FBQTtPQUNBLENBQUE7O0FBRUEsV0FBQSxDQUFBLE1BQUEsR0FBQSxZQUFBO0FBQ0EsbUJBQUEsQ0FBQSxNQUFBLEVBQUEsQ0FBQSxJQUFBLENBQUEsWUFBQTtBQUNBLGdCQUFBLENBQUEsRUFBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBO1NBQ0EsQ0FBQSxDQUFBO09BQ0EsQ0FBQTs7QUFFQSxVQUFBLE9BQUEsR0FBQSxTQUFBLE9BQUEsR0FBQTtBQUNBLG1CQUFBLENBQUEsZUFBQSxFQUFBLENBQ0EsSUFBQSxDQUFBLFVBQUEsSUFBQTtpQkFBQSxJQUFBLENBQUEsSUFBQSxDQUFBLElBQUEsQ0FBQSxHQUFBLENBQUE7U0FBQSxDQUFBLENBQ0EsSUFBQSxDQUFBLFVBQUEsSUFBQSxFQUFBO0FBQ0EsZUFBQSxDQUFBLElBQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxpQkFBQSxJQUFBLENBQUE7U0FDQSxDQUFBLENBQUE7T0FDQSxDQUFBOztBQUVBLFVBQUEsVUFBQSxHQUFBLFNBQUEsVUFBQSxHQUFBO0FBQ0EsYUFBQSxDQUFBLElBQUEsR0FBQSxJQUFBLENBQUE7T0FDQSxDQUFBOztBQUVBLGFBQUEsRUFBQSxDQUFBOztBQUVBLGdCQUFBLENBQUEsR0FBQSxDQUFBLFdBQUEsQ0FBQSxZQUFBLEVBQUEsT0FBQSxDQUFBLENBQUE7QUFDQSxnQkFBQSxDQUFBLEdBQUEsQ0FBQSxXQUFBLENBQUEsYUFBQSxFQUFBLFVBQUEsQ0FBQSxDQUFBO0FBQ0EsZ0JBQUEsQ0FBQSxHQUFBLENBQUEsV0FBQSxDQUFBLGNBQUEsRUFBQSxVQUFBLENBQUEsQ0FBQTtLQUVBOztHQUVBLENBQUE7Q0FFQSxDQUFBLENBQUE7O0FDM0RBLFlBQUEsQ0FBQTs7QUFFQSxHQUFBLENBQUEsU0FBQSxDQUFBLFNBQUEsRUFBQSxZQUFBO0FBQ0EsU0FBQTtBQUNBLFlBQUEsRUFBQSxHQUFBO0FBQ0EsU0FBQSxFQUFBO0FBQ0EsYUFBQSxFQUFBLEdBQUE7S0FDQTtBQUNBLFFBQUEsRUFBQSxjQUFBLEtBQUEsRUFBQSxJQUFBLEVBQUEsSUFBQSxFQUFBO0FBQ0EsVUFBQSxDQUFBLElBQUEsQ0FBQSxrQkFBQSxFQUFBLFVBQUEsS0FBQSxFQUFBO0FBQ0EsWUFBQSxLQUFBLENBQUEsS0FBQSxJQUFBLEVBQUEsRUFBQTtBQUNBLGVBQUEsQ0FBQSxNQUFBLENBQUEsWUFBQTtBQUNBLGlCQUFBLENBQUEsT0FBQSxFQUFBLENBQUE7V0FDQSxDQUFBLENBQUE7QUFDQSxpQkFBQSxLQUFBLENBQUE7U0FDQTtPQUNBLENBQUEsQ0FBQTtLQUNBO0dBQ0EsQ0FBQTtDQUNBLENBQUEsQ0FBQTs7QUNuQkEsR0FBQSxDQUFBLFNBQUEsQ0FBQSxjQUFBLEVBQUEsWUFBQTtBQUNBLFNBQUE7QUFDQSxZQUFBLEVBQUEsR0FBQTtBQUNBLGVBQUEsRUFBQSx1REFBQTtBQUNBLFFBQUEsRUFBQSxjQUFBLEtBQUEsRUFBQSxJQUFBLEVBQUEsSUFBQSxFQUFBOztBQUVBLFdBQUEsQ0FBQSxnQkFBQSxHQUFBLFlBQUE7QUFDQSxlQUFBLENBQUEsR0FBQSwyQ0FBQSxDQUFBO09BQ0EsQ0FBQTtLQUVBO0dBQ0EsQ0FBQTtDQUNBLENBQUEsQ0FBQSIsImZpbGUiOiJtYWluLmpzIiwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnO1xud2luZG93LmFwcCA9IGFuZ3VsYXIubW9kdWxlKCdOb2RlbW9ub0FwcCcsIFsndWkucm91dGVyJywgJ3VpLmJvb3RzdHJhcCcsICdmc2FQcmVCdWlsdCcsICdqcy1kYXRhJ10pO1xuXG5hcHAuY29uZmlnKGZ1bmN0aW9uICgkdXJsUm91dGVyUHJvdmlkZXIsICRsb2NhdGlvblByb3ZpZGVyLCBEU1Byb3ZpZGVyLCBEU0h0dHBBZGFwdGVyUHJvdmlkZXIpIHtcbiAgICAvLyBUaGlzIHR1cm5zIG9mZiBoYXNoYmFuZyB1cmxzICgvI2Fib3V0KSBhbmQgY2hhbmdlcyBpdCB0byBzb21ldGhpbmcgbm9ybWFsICgvYWJvdXQpXG4gICAgJGxvY2F0aW9uUHJvdmlkZXIuaHRtbDVNb2RlKHRydWUpO1xuICAgIC8vIElmIHdlIGdvIHRvIGEgVVJMIHRoYXQgdWktcm91dGVyIGRvZXNuJ3QgaGF2ZSByZWdpc3RlcmVkLCBnbyB0byB0aGUgXCIvXCIgdXJsLlxuICAgICR1cmxSb3V0ZXJQcm92aWRlci5vdGhlcndpc2UoJy8nKTtcblxuICAgIC8vIHNldCBqcy1kYXRhIGRlZmF1bHRzXG4gICAgRFNQcm92aWRlci5kZWZhdWx0cy5iYXNlUGF0aCA9ICcvYXBpJ1xuICAgIERTUHJvdmlkZXIuZGVmYXVsdHMuaWRBdHRyaWJ1dGUgPSAnX2lkJ1xuXG5cbiAgICAvLyBhIG1ldGhvZCB0byB0aGUgRFNQcm92aWRlciBkZWZhdWx0cyBvYmplY3QgdGhhdCBhdXRvbWF0aWNhbGx5XG4gICAgLy8gY2hlY2tzIGlmIHRoZXJlIGlzIGFueSBkYXRhIGluIHRoZSBjYWNoZSBmb3IgYSBnaXZlbiBzZXJ2aWNlIGJlZm9yZVxuICAgIC8vIHBpbmdpbmcgdGhlIGRhdGFiYXNlXG4gICAgRFNQcm92aWRlci5kZWZhdWx0cy5nZXRPckZpbmQgPSBmdW5jdGlvbihzZXJ2aWNlKXtcbiAgICAgIHZhciBkYXRhID0gdGhpcy5nZXRBbGwoKVxuICAgICAgaWYgKGRhdGEubGVuZ3RoKSByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKGFuZ3VsYXIuY29weShkYXRhKSlcbiAgICAgIGVsc2UgcmV0dXJuIHRoaXMuZmluZEFsbCgpLnRoZW4oZGF0YSA9PiBhbmd1bGFyLmNvcHkoZGF0YSkpXG4gICAgfVxuXG4gICAgLy8gTW9uZ29vc2UgUmVsYXRpb24gRml4IChmaXhlcyBkZXNlcmlhbGl6YXRpb24pXG4gICAgLy8gRnJvbSBodHRwOi8vcGxua3IuY28vZWRpdC8zejkwUEQ5d3d3aFdkblZyWnFrQj9wPXByZXZpZXdcbiAgICAvLyBUaGlzIHdhcyBzaG93biB0byB1cyBieSBAam1kb2JyeSwgdGhlIGlkZWEgaGVyZSBpcyB0aGF0XG4gICAgLy8gd2UgZml4IHRoZSBkYXRhIGNvbWluZyBmcm9tIE1vbmdvb3NlIG1vZGVscyBpbiBqcy1kYXRhIHJhdGhlciB0aGFuIG91dGJvdW5kIGZyb20gTW9uZ29vc2VcbiAgICBmdW5jdGlvbiBmaXhSZWxhdGlvbnMoUmVzb3VyY2UsIGluc3RhbmNlKSB7XG4gICAgICBmdW5jdGlvbiBmaXhMb2NhbEtleXMoaSkge1xuICAgICAgICBKU0RhdGEuRFNVdGlscy5mb3JFYWNoKFJlc291cmNlLnJlbGF0aW9uTGlzdCwgZnVuY3Rpb24oZGVmKSB7XG4gICAgICAgICAgdmFyIHJlbGF0aW9uTmFtZSA9IGRlZi5yZWxhdGlvbjtcbiAgICAgICAgICB2YXIgcmVsYXRpb25EZWYgPSBSZXNvdXJjZS5nZXRSZXNvdXJjZShyZWxhdGlvbk5hbWUpO1xuICAgICAgICAgIGlmIChkZWYudHlwZSA9PT0gJ2hhc01hbnknKSB7XG4gICAgICAgICAgICBpZiAoaS5oYXNPd25Qcm9wZXJ0eShkZWYubG9jYWxGaWVsZCkpIHtcbiAgICAgICAgICAgICAgaWYgKGlbZGVmLmxvY2FsRmllbGRdLmxlbmd0aCAmJiAhSlNEYXRhLkRTVXRpbHMuaXNPYmplY3QoaVtkZWYubG9jYWxGaWVsZF1bMF0pKSB7XG4gICAgICAgICAgICAgICAgLy8gQ2FzZSAxOiBhcnJheSBvZiBfaWRzIHdoZXJlIGFycmF5IG9mIHBvcHVsYXRlZCBvYmplY3RzIHNob3VsZCBiZVxuICAgICAgICAgICAgICAgIGlbZGVmLmxvY2FsS2V5c10gPSBpW2RlZi5sb2NhbEZpZWxkXTtcbiAgICAgICAgICAgICAgICBkZWxldGUgaVtkZWYubG9jYWxGaWVsZF07XG4gICAgICAgICAgICAgIH0gZWxzZSBpZiAoIWlbZGVmLmxvY2FsS2V5c10pIHtcbiAgICAgICAgICAgICAgICAvLyBDYXNlIDI6IGFycmF5IG9mIHBvcHVsYXRlZCBvYmplY3RzLCBidXQgbWlzc2luZyBhcnJheSBvZiBfaWRzJ1xuICAgICAgICAgICAgICAgIGlbZGVmLmxvY2FsS2V5c10gPSBbXTtcbiAgICAgICAgICAgICAgICBKU0RhdGEuRFNVdGlscy5mb3JFYWNoKGlbZGVmLmxvY2FsRmllbGRdLCBmdW5jdGlvbihjaGlsZCkge1xuICAgICAgICAgICAgICAgICAgaVtkZWYubG9jYWxLZXlzXS5wdXNoKGNoaWxkW3JlbGF0aW9uRGVmLmlkQXR0cmlidXRlXSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZSBpZiAoZGVmLnR5cGUgPT09ICdiZWxvbmdzVG8nKSB7XG4gICAgICAgICAgICBpZiAoaS5oYXNPd25Qcm9wZXJ0eShkZWYubG9jYWxGaWVsZCkpIHtcbiAgICAgICAgICAgICAgLy8gaWYgdGhlIGxvY2FsZkllbGQgaXMgYSBwb3B1YWx0ZWQgb2JqZWN0XG4gICAgICAgICAgICAgIGlmIChKU0RhdGEuRFNVdGlscy5pc09iamVjdChpW2RlZi5sb2NhbEZpZWxkXSkpIHtcbiAgICAgICAgICAgICAgICBpW2RlZi5sb2NhbEtleV0gPSBpW2RlZi5sb2NhbEZpZWxkXS5faWQ7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgLy8gaWYgdGhlIGxvY2FsZmllbGQgaXMgYW4gb2JqZWN0IGlkXG4gICAgICAgICAgICAgIGVsc2UgaWYgKCFKU0RhdGEuRFNVdGlscy5pc09iamVjdChpW2RlZi5sb2NhbEZpZWxkXSkpIHtcbiAgICAgICAgICAgICAgICBpW2RlZi5sb2NhbEtleV0gPSBpW2RlZi5sb2NhbEZpZWxkXTtcbiAgICAgICAgICAgICAgICBkZWxldGUgaVtkZWYubG9jYWxGaWVsZF07XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBpZiAoSlNEYXRhLkRTVXRpbHMuaXNBcnJheShpbnN0YW5jZSkpIHtcbiAgICAgICAgSlNEYXRhLkRTVXRpbHMuZm9yRWFjaChpbnN0YW5jZSwgZml4TG9jYWxLZXlzKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGZpeExvY2FsS2V5cyhpbnN0YW5jZSk7XG4gICAgICB9XG4gICAgfVxuXG5cbiAgICBEU1Byb3ZpZGVyLmRlZmF1bHRzLmRlc2VyaWFsaXplID0gZnVuY3Rpb24oUmVzb3VyY2UsIGRhdGEpIHtcbiAgICAgIHZhciBpbnN0YW5jZSA9IGRhdGEuZGF0YTtcbiAgICAgIGZpeFJlbGF0aW9ucyhSZXNvdXJjZSwgaW5zdGFuY2UpO1xuICAgICAgcmV0dXJuIGluc3RhbmNlO1xuICAgIH07XG4gICAgLy8gRW5kIE1vbmdvb3NlIFJlbGF0aW9uIGZpeFxufSk7XG5cbi8vIFRoaXMgYXBwLnJ1biBpcyBmb3IgY29udHJvbGxpbmcgYWNjZXNzIHRvIHNwZWNpZmljIHN0YXRlcy5cbmFwcC5ydW4oZnVuY3Rpb24gKCRyb290U2NvcGUsIEF1dGhTZXJ2aWNlLCAkc3RhdGUpIHtcblxuICAgIC8vIFRoZSBnaXZlbiBzdGF0ZSByZXF1aXJlcyBhbiBhdXRoZW50aWNhdGVkIHVzZXIuXG4gICAgdmFyIGRlc3RpbmF0aW9uU3RhdGVSZXF1aXJlc0F1dGggPSBmdW5jdGlvbiAoc3RhdGUpIHtcbiAgICAgICAgcmV0dXJuIHN0YXRlLmRhdGEgJiYgc3RhdGUuZGF0YS5hdXRoZW50aWNhdGU7XG4gICAgfTtcblxuICAgIC8vICRzdGF0ZUNoYW5nZVN0YXJ0IGlzIGFuIGV2ZW50IGZpcmVkXG4gICAgLy8gd2hlbmV2ZXIgdGhlIHByb2Nlc3Mgb2YgY2hhbmdpbmcgYSBzdGF0ZSBiZWdpbnMuXG4gICAgJHJvb3RTY29wZS4kb24oJyRzdGF0ZUNoYW5nZVN0YXJ0JywgZnVuY3Rpb24gKGV2ZW50LCB0b1N0YXRlLCB0b1BhcmFtcykge1xuXG4gICAgICAgIGlmICghZGVzdGluYXRpb25TdGF0ZVJlcXVpcmVzQXV0aCh0b1N0YXRlKSkge1xuICAgICAgICAgICAgLy8gVGhlIGRlc3RpbmF0aW9uIHN0YXRlIGRvZXMgbm90IHJlcXVpcmUgYXV0aGVudGljYXRpb25cbiAgICAgICAgICAgIC8vIFNob3J0IGNpcmN1aXQgd2l0aCByZXR1cm4uXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoQXV0aFNlcnZpY2UuaXNBdXRoZW50aWNhdGVkKCkpIHtcbiAgICAgICAgICAgIC8vIFRoZSB1c2VyIGlzIGF1dGhlbnRpY2F0ZWQuXG4gICAgICAgICAgICAvLyBTaG9ydCBjaXJjdWl0IHdpdGggcmV0dXJuLlxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2FuY2VsIG5hdmlnYXRpbmcgdG8gbmV3IHN0YXRlLlxuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgICAgIEF1dGhTZXJ2aWNlLmdldExvZ2dlZEluVXNlcigpLnRoZW4oZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgICAgIC8vIElmIGEgdXNlciBpcyByZXRyaWV2ZWQsIHRoZW4gcmVuYXZpZ2F0ZSB0byB0aGUgZGVzdGluYXRpb25cbiAgICAgICAgICAgIC8vICh0aGUgc2Vjb25kIHRpbWUsIEF1dGhTZXJ2aWNlLmlzQXV0aGVudGljYXRlZCgpIHdpbGwgd29yaylcbiAgICAgICAgICAgIC8vIG90aGVyd2lzZSwgaWYgbm8gdXNlciBpcyBsb2dnZWQgaW4sIGdvIHRvIFwibG9naW5cIiBzdGF0ZS5cbiAgICAgICAgICAgIGlmICh1c2VyKSB7XG4gICAgICAgICAgICAgICAgJHN0YXRlLmdvKHRvU3RhdGUubmFtZSwgdG9QYXJhbXMpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAkc3RhdGUuZ28oJ2xvZ2luJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgfSk7XG5cbn0pO1xuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcblxuICAgIC8vIFJlZ2lzdGVyIG91ciAqYWJvdXQqIHN0YXRlLlxuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdhYm91dCcsIHtcbiAgICAgICAgdXJsOiAnL2Fib3V0JyxcbiAgICAgICAgY29udHJvbGxlcjogJ0Fib3V0Q29udHJvbGxlcicsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvYWJvdXQvYWJvdXQuaHRtbCdcbiAgICB9KTtcblxufSk7XG5cbmFwcC5jb250cm9sbGVyKCdBYm91dENvbnRyb2xsZXInLCBmdW5jdGlvbiAoJHNjb3BlKSB7XG5cbiAgICAvLyAkc2NvcGUuaW1hZ2VzID0gXy5zaHVmZmxlKHNvbWV0aGluZyk7XG5cbn0pO1xuIiwiYXBwLmNvbmZpZygoJHN0YXRlUHJvdmlkZXIpID0+IHtcbiAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2FwaScsIHtcbiAgICB1cmw6ICcvOmlkL2FwaXMnLFxuICAgIHRlbXBsYXRlVXJsOiAnanMvYXBpL2FwaS5odG1sJyxcbiAgICBjb250cm9sbGVyOiAoJHNjb3BlLCB1c2VyLCByb3V0ZXMpID0+IHtcbiAgICAgICRzY29wZS51c2VyID0gdXNlclxuICAgICAgJHNjb3BlLnJvdXRlcyA9IHJvdXRlc1xuXG4gICAgICAvLyB0ZXN0IGRhdGFcbiAgICAgICRzY29wZS5kYXRhID0ge1xuICAgICAgICBuYW1lOiBcIkhhY2tlciBOZXdzXCIsXG4gICAgICAgIGNvdW50OiAzMCxcbiAgICAgICAgZnJlcXVlbmN5OiBcIk1hbnVhbCBDcmF3bFwiLFxuICAgICAgICB2ZXJzaW9uOiAyLFxuICAgICAgICBuZXdEYXRhOiB0cnVlLFxuICAgICAgICBsYXN0UnVuU3RhdHVzOiBcInN1Y2Nlc3NcIixcbiAgICAgICAgdGhpc1ZlcnNpb25TdGF0dXM6IFwic3VjY2Vzc1wiLFxuICAgICAgICB0aGlzVmVyc2lvblJ1bjogXCJUaHUgQXVnIDEzIDIwMTUgMDE6MzA6NDggR01UKzAwMDAgKFVUQylcIixcbiAgICAgICAgc291cmNlVXJsOiAnaHR0cHM6Ly9uZXdzLnljb21iaW5hdG9yLmNvbS8nLFxuICAgICAgICByZXN1bHRzOiB7XG4gICAgICAgICAgU3Rvcnk6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IHtcbiAgICAgICAgICAgICAgICBocmVmOiBcImh0dHBzOi8vcGx1cy5nb29nbGUuY29tLytJbmdyZXNzL3Bvc3RzL0dWdmJZWnpXeVRUXCIsXG4gICAgICAgICAgICAgICAgdGV4dDogXCJOaWFudGljIExhYnMgc3BsaXR0aW5nIGZyb20gR29vZ2xlXCJcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgdXJsOiBcImh0dHBzOi8vbmV3cy55Y29tYmluYXRvci5jb20vXCIsXG4gICAgICAgICAgICAgIHBvaW50czogXCI0MVwiLFxuICAgICAgICAgICAgICB1c2VyOiB7XG4gICAgICAgICAgICAgICAgaHJlZjogXCJodHRwczovL25ld3MueWNvbWJpbmF0b3IuY29tL3VzZXI/aWQ9bWFydGluZGFsZVwiLFxuICAgICAgICAgICAgICAgIHRleHQ6IFwibWFydGluZGFsZVwiXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIGNvbW1lbnRzOiB7XG4gICAgICAgICAgICAgICAgaHJlZjogXCJodHRwczovL25ld3MueWNvbWJpbmF0b3IuY29tL2l0ZW0/aWQ9MTAwNTE1MTdcIixcbiAgICAgICAgICAgICAgICB0ZXh0OiBcIjE1XCJcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgaW5kZXg6IDFcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHRpdGxlOiB7XG4gICAgICAgICAgICAgICAgaHJlZjogXCJodHRwOi8vdGVjaGNydW5jaC5jb20vMjAxNS8wOC8xMi9vaG0taXMtYS1zbWFydGVyLWxpZ2h0ZXItY2FyLWJhdHRlcnktdGhhdC13b3Jrcy13aXRoLXlvdXItZXhpc3RpbmctY2FyL1wiLFxuICAgICAgICAgICAgICAgIHRleHQ6IFwiT2htIChZQyBTMTUpIGlzIGEgc21hcnRlciwgbGlnaHRlciBjYXIgYmF0dGVyeSB0aGF0IHdvcmtzIHdpdGggeW91ciBleGlzdGluZyBjYXJcIlxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB1cmw6IFwiaHR0cHM6Ly9uZXdzLnljb21iaW5hdG9yLmNvbS9cIixcbiAgICAgICAgICAgICAgcG9pbnRzOiBcIjIwMFwiLFxuICAgICAgICAgICAgICB1c2VyOiB7XG4gICAgICAgICAgICAgICAgaHJlZjogXCJodHRwczovL25ld3MueWNvbWJpbmF0b3IuY29tL3VzZXI/aWQ9Ymx1ZWludGVncmFsXCIsXG4gICAgICAgICAgICAgICAgdGV4dDogXCJibHVlaW50ZWdyYWxcIlxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBjb21tZW50czoge1xuICAgICAgICAgICAgICAgIGhyZWY6IFwiaHR0cHM6Ly9uZXdzLnljb21iaW5hdG9yLmNvbS9pdGVtP2lkPTEwMDQ5OTI3XCIsXG4gICAgICAgICAgICAgICAgdGV4dDogXCIxOTZcIlxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBpbmRleDogMlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IHtcbiAgICAgICAgICAgICAgICBocmVmOiBcImh0dHBzOi8vd3d3LmtpY2tzdGFydGVyLmNvbS9wcm9qZWN0cy80NTU4ODMwMS93b29sZmUtdGhlLXJlZC1ob29kLWRpYXJpZXMvcG9zdHMvMTE2ODQwOVwiLFxuICAgICAgICAgICAgICAgIHRleHQ6IFwi4oCcSXTigJlzIGRvbmUsIHRoZXJlIGlzIG5vIHdheSBiYWNrLiBXZSB0cmllZCwgd2UgZmFpbGVk4oCdXCJcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgdXJsOiBcImh0dHBzOi8vbmV3cy55Y29tYmluYXRvci5jb20vXCIsXG4gICAgICAgICAgICAgIHBvaW50czogXCI1MTlcIixcbiAgICAgICAgICAgICAgdXNlcjoge1xuICAgICAgICAgICAgICAgIGhyZWY6IFwiaHR0cHM6Ly9uZXdzLnljb21iaW5hdG9yLmNvbS91c2VyP2lkPWRhbnNvXCIsXG4gICAgICAgICAgICAgICAgdGV4dDogXCJkYW5zb1wiXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIGNvbW1lbnRzOiB7XG4gICAgICAgICAgICAgICAgaHJlZjogXCJodHRwczovL25ld3MueWNvbWJpbmF0b3IuY29tL2l0ZW0/aWQ9MTAwNDc3MjFcIixcbiAgICAgICAgICAgICAgICB0ZXh0OiBcIjMwMVwiXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIGluZGV4OiAzXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB0aXRsZToge1xuICAgICAgICAgICAgICAgIGhyZWY6IFwiaHR0cDovL3Bhcm5vbGQteC5naXRodWIuaW8vbmFzYy9cIixcbiAgICAgICAgICAgICAgICB0ZXh0OiBcIlNob3cgSE46IE5hU0Mg4oCTIERvIG1hdGhzIGxpa2UgYSBub3JtYWwgcGVyc29uXCJcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgdXJsOiBcImh0dHBzOi8vbmV3cy55Y29tYmluYXRvci5jb20vXCIsXG4gICAgICAgICAgICAgIHBvaW50czogXCI0NVwiLFxuICAgICAgICAgICAgICB1c2VyOiB7XG4gICAgICAgICAgICAgICAgaHJlZjogXCJodHRwczovL25ld3MueWNvbWJpbmF0b3IuY29tL3VzZXI/aWQ9bWFjY29cIixcbiAgICAgICAgICAgICAgICB0ZXh0OiBcIm1hY2NvXCJcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgY29tbWVudHM6IHtcbiAgICAgICAgICAgICAgICBocmVmOiBcImh0dHBzOi8vbmV3cy55Y29tYmluYXRvci5jb20vaXRlbT9pZD0xMDA1MDk0OVwiLFxuICAgICAgICAgICAgICAgIHRleHQ6IFwiOFwiXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIGluZGV4OiA0XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB0aXRsZToge1xuICAgICAgICAgICAgICAgIGhyZWY6IFwiaHR0cDovL2Fyc3RlY2huaWNhLmNvbS9zY2llbmNlLzIwMTUvMDgvb2N0b3B1cy1zb3BoaXN0aWNhdGlvbi1kcml2ZW4tYnktaHVuZHJlZHMtb2YtcHJldmlvdXNseS11bmtub3duLWdlbmVzL1wiLFxuICAgICAgICAgICAgICAgIHRleHQ6IFwiT2N0b3B1c+KAmSBzb3BoaXN0aWNhdGlvbiBkcml2ZW4gYnkgaHVuZHJlZHMgb2YgcHJldmlvdXNseSB1bmtub3duIGdlbmVzXCJcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgdXJsOiBcImh0dHBzOi8vbmV3cy55Y29tYmluYXRvci5jb20vXCIsXG4gICAgICAgICAgICAgIHBvaW50czogXCIzNVwiLFxuICAgICAgICAgICAgICB1c2VyOiB7XG4gICAgICAgICAgICAgICAgaHJlZjogXCJodHRwczovL25ld3MueWNvbWJpbmF0b3IuY29tL3VzZXI/aWQ9QXVkaW9waGlsaXBcIixcbiAgICAgICAgICAgICAgICB0ZXh0OiBcIkF1ZGlvcGhpbGlwXCJcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgY29tbWVudHM6IHtcbiAgICAgICAgICAgICAgICBocmVmOiBcImh0dHBzOi8vbmV3cy55Y29tYmluYXRvci5jb20vaXRlbT9pZD0xMDA1MDU4MlwiLFxuICAgICAgICAgICAgICAgIHRleHQ6IFwiMVwiXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIGluZGV4OiA1XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB0aXRsZToge1xuICAgICAgICAgICAgICAgIGhyZWY6IFwiaHR0cDovL2Jsb2cuc2FtYWx0bWFuLmNvbS9wcm9qZWN0cy1hbmQtY29tcGFuaWVzXCIsXG4gICAgICAgICAgICAgICAgdGV4dDogXCJQcm9qZWN0cyBhbmQgQ29tcGFuaWVzXCJcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgdXJsOiBcImh0dHBzOi8vbmV3cy55Y29tYmluYXRvci5jb20vXCIsXG4gICAgICAgICAgICAgIHBvaW50czogXCIyMTJcIixcbiAgICAgICAgICAgICAgdXNlcjoge1xuICAgICAgICAgICAgICAgIGhyZWY6IFwiaHR0cHM6Ly9uZXdzLnljb21iaW5hdG9yLmNvbS91c2VyP2lkPXJ1bmVzb2VyZW5zZW5cIixcbiAgICAgICAgICAgICAgICB0ZXh0OiBcInJ1bmVzb2VyZW5zZW5cIlxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBjb21tZW50czoge1xuICAgICAgICAgICAgICAgIGhyZWY6IFwiaHR0cHM6Ly9uZXdzLnljb21iaW5hdG9yLmNvbS9pdGVtP2lkPTEwMDQ4NTU3XCIsXG4gICAgICAgICAgICAgICAgdGV4dDogXCI0MFwiXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIGluZGV4OiA2XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB0aXRsZToge1xuICAgICAgICAgICAgICAgIGhyZWY6IFwiaHR0cHM6Ly93d3cub3Blbmxpc3RpbmdzLmNvL25lYXJcIixcbiAgICAgICAgICAgICAgICB0ZXh0OiBcIlNob3cgSE46IEZpbmQgYSBob21lIGNsb3NlIHRvIHdvcmtcIlxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB1cmw6IFwiaHR0cHM6Ly9uZXdzLnljb21iaW5hdG9yLmNvbS9cIixcbiAgICAgICAgICAgICAgcG9pbnRzOiBcIjYxXCIsXG4gICAgICAgICAgICAgIHVzZXI6IHtcbiAgICAgICAgICAgICAgICBocmVmOiBcImh0dHBzOi8vbmV3cy55Y29tYmluYXRvci5jb20vdXNlcj9pZD1yZ2JyZ2JcIixcbiAgICAgICAgICAgICAgICB0ZXh0OiBcInJnYnJnYlwiXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIGNvbW1lbnRzOiB7XG4gICAgICAgICAgICAgICAgaHJlZjogXCJodHRwczovL25ld3MueWNvbWJpbmF0b3IuY29tL2l0ZW0/aWQ9MTAwNDk2MzFcIixcbiAgICAgICAgICAgICAgICB0ZXh0OiBcIjUwXCJcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgaW5kZXg6IDdcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHRpdGxlOiB7XG4gICAgICAgICAgICAgICAgaHJlZjogXCJodHRwczovL3d3dy55b3V0dWJlLmNvbS93YXRjaD92PWcwMWRHc0tiWE9rXCIsXG4gICAgICAgICAgICAgICAgdGV4dDogXCJOZXRmbGl4IOKAkyBDaGFzaW5nIDYwZnBzIFt2aWRlb11cIlxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB1cmw6IFwiaHR0cHM6Ly9uZXdzLnljb21iaW5hdG9yLmNvbS9cIixcbiAgICAgICAgICAgICAgcG9pbnRzOiBcIjQ2XCIsXG4gICAgICAgICAgICAgIHVzZXI6IHtcbiAgICAgICAgICAgICAgICBocmVmOiBcImh0dHBzOi8vbmV3cy55Y29tYmluYXRvci5jb20vdXNlcj9pZD10aWx0XCIsXG4gICAgICAgICAgICAgICAgdGV4dDogXCJ0aWx0XCJcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgY29tbWVudHM6IHtcbiAgICAgICAgICAgICAgICBocmVmOiBcImh0dHBzOi8vbmV3cy55Y29tYmluYXRvci5jb20vaXRlbT9pZD0xMDA1MDIzMFwiLFxuICAgICAgICAgICAgICAgIHRleHQ6IFwiMjZcIlxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBpbmRleDogOFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IHtcbiAgICAgICAgICAgICAgICBocmVmOiBcImh0dHA6Ly93d3cuYmJjLmNvbS9uZXdzL21hZ2F6aW5lLTMzODYwNzc4XCIsXG4gICAgICAgICAgICAgICAgdGV4dDogXCJIb3cgdGhlIFVLIGZvdW5kIEphcGFuZXNlIHNwZWFrZXJzIGluIGEgaHVycnkgaW4gV1cyXCJcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgdXJsOiBcImh0dHBzOi8vbmV3cy55Y29tYmluYXRvci5jb20vXCIsXG4gICAgICAgICAgICAgIHBvaW50czogXCIzNVwiLFxuICAgICAgICAgICAgICB1c2VyOiB7XG4gICAgICAgICAgICAgICAgaHJlZjogXCJodHRwczovL25ld3MueWNvbWJpbmF0b3IuY29tL3VzZXI/aWQ9c2FtYXlzaGFybWFcIixcbiAgICAgICAgICAgICAgICB0ZXh0OiBcInNhbWF5c2hhcm1hXCJcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgY29tbWVudHM6IHtcbiAgICAgICAgICAgICAgICBocmVmOiBcImh0dHBzOi8vbmV3cy55Y29tYmluYXRvci5jb20vaXRlbT9pZD0xMDA1MDY1NVwiLFxuICAgICAgICAgICAgICAgIHRleHQ6IFwiN1wiXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIGluZGV4OiA5XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB0aXRsZToge1xuICAgICAgICAgICAgICAgIGhyZWY6IFwiaHR0cHM6Ly9ncm91cHMuZ29vZ2xlLmNvbS9mb3J1bS8jIXRvcGljL2Vtc2NyaXB0ZW4tZGlzY3Vzcy9nUVFSamFqUTZpWVwiLFxuICAgICAgICAgICAgICAgIHRleHQ6IFwiRW1zY3JpcHRlbiBnYWlucyBleHBlcmltZW50YWwgcHRocmVhZHMgc3VwcG9ydFwiXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIHVybDogXCJodHRwczovL25ld3MueWNvbWJpbmF0b3IuY29tL1wiLFxuICAgICAgICAgICAgICBwb2ludHM6IFwiNlwiLFxuICAgICAgICAgICAgICB1c2VyOiB7XG4gICAgICAgICAgICAgICAgaHJlZjogXCJodHRwczovL25ld3MueWNvbWJpbmF0b3IuY29tL3VzZXI/aWQ9dm1vcmd1bGlzXCIsXG4gICAgICAgICAgICAgICAgdGV4dDogXCJ2bW9yZ3VsaXNcIlxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBjb21tZW50czoge1xuICAgICAgICAgICAgICAgIGhyZWY6IFwiXCIsXG4gICAgICAgICAgICAgICAgdGV4dDogXCJcIlxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBpbmRleDogMTBcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHRpdGxlOiB7XG4gICAgICAgICAgICAgICAgaHJlZjogXCJodHRwOi8vbmV3cy5zcXVlYWsub3JnLzIwMTUvMDgvMTIvc3F1ZWFrLTUtaXMtb3V0L1wiLFxuICAgICAgICAgICAgICAgIHRleHQ6IFwiU3F1ZWFrIDUgaXMgb3V0XCJcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgdXJsOiBcImh0dHBzOi8vbmV3cy55Y29tYmluYXRvci5jb20vXCIsXG4gICAgICAgICAgICAgIHBvaW50czogXCIxNDJcIixcbiAgICAgICAgICAgICAgdXNlcjoge1xuICAgICAgICAgICAgICAgIGhyZWY6IFwiaHR0cHM6Ly9uZXdzLnljb21iaW5hdG9yLmNvbS91c2VyP2lkPUZpY2VcIixcbiAgICAgICAgICAgICAgICB0ZXh0OiBcIkZpY2VcIlxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBjb21tZW50czoge1xuICAgICAgICAgICAgICAgIGhyZWY6IFwiaHR0cHM6Ly9uZXdzLnljb21iaW5hdG9yLmNvbS9pdGVtP2lkPTEwMDQ3OTcwXCIsXG4gICAgICAgICAgICAgICAgdGV4dDogXCIyNlwiXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIGluZGV4OiAxMVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IHtcbiAgICAgICAgICAgICAgICBocmVmOiBcImh0dHBzOi8vb2NoYXJsZXMub3JnLnVrL2Jsb2cvcG9zdHMvMjAxNC0wMi0wNC1ob3ctaS1kZXZlbG9wLXdpdGgtbml4b3MuaHRtbFwiLFxuICAgICAgICAgICAgICAgIHRleHQ6IFwiSG93IEkgZGV2ZWxvcCB3aXRoIE5peFwiXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIHVybDogXCJodHRwczovL25ld3MueWNvbWJpbmF0b3IuY29tL1wiLFxuICAgICAgICAgICAgICBwb2ludHM6IFwiMTA0XCIsXG4gICAgICAgICAgICAgIHVzZXI6IHtcbiAgICAgICAgICAgICAgICBocmVmOiBcImh0dHBzOi8vbmV3cy55Y29tYmluYXRvci5jb20vdXNlcj9pZD1heWJlcmt0XCIsXG4gICAgICAgICAgICAgICAgdGV4dDogXCJheWJlcmt0XCJcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgY29tbWVudHM6IHtcbiAgICAgICAgICAgICAgICBocmVmOiBcImh0dHBzOi8vbmV3cy55Y29tYmluYXRvci5jb20vaXRlbT9pZD0xMDA0NzAwNVwiLFxuICAgICAgICAgICAgICAgIHRleHQ6IFwiMzVcIlxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBpbmRleDogMTJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHRpdGxlOiB7XG4gICAgICAgICAgICAgICAgaHJlZjogXCJodHRwczovL2Jsb2cudHdpdHRlci5jb20vMjAxNS9yZW1vdmluZy10aGUtMTQwLWNoYXJhY3Rlci1saW1pdC1mcm9tLWRpcmVjdC1tZXNzYWdlc1wiLFxuICAgICAgICAgICAgICAgIHRleHQ6IFwiUmVtb3ZpbmcgdGhlIDE0MC1jaGFyYWN0ZXIgbGltaXQgZnJvbSBEaXJlY3QgTWVzc2FnZXNcIlxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB1cmw6IFwiaHR0cHM6Ly9uZXdzLnljb21iaW5hdG9yLmNvbS9cIixcbiAgICAgICAgICAgICAgcG9pbnRzOiBcIjEzOVwiLFxuICAgICAgICAgICAgICB1c2VyOiB7XG4gICAgICAgICAgICAgICAgaHJlZjogXCJodHRwczovL25ld3MueWNvbWJpbmF0b3IuY29tL3VzZXI/aWQ9dXB0b3duXCIsXG4gICAgICAgICAgICAgICAgdGV4dDogXCJ1cHRvd25cIlxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBjb21tZW50czoge1xuICAgICAgICAgICAgICAgIGhyZWY6IFwiaHR0cHM6Ly9uZXdzLnljb21iaW5hdG9yLmNvbS9pdGVtP2lkPTEwMDQ5MTM3XCIsXG4gICAgICAgICAgICAgICAgdGV4dDogXCIxMDVcIlxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBpbmRleDogMTNcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHRpdGxlOiB7XG4gICAgICAgICAgICAgICAgaHJlZjogXCJodHRwOi8vbWFya2FsbGVudGhvcm50b24uY29tL2Jsb2cvc3R5bGlzdGljLXNpbWlsYXJpdHkvXCIsXG4gICAgICAgICAgICAgICAgdGV4dDogXCJBbmFseXppbmcgc3R5bGlzdGljIHNpbWlsYXJpdHkgYW1vbmdzdCBhdXRob3JzXCJcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgdXJsOiBcImh0dHBzOi8vbmV3cy55Y29tYmluYXRvci5jb20vXCIsXG4gICAgICAgICAgICAgIHBvaW50czogXCIxOVwiLFxuICAgICAgICAgICAgICB1c2VyOiB7XG4gICAgICAgICAgICAgICAgaHJlZjogXCJodHRwczovL25ld3MueWNvbWJpbmF0b3IuY29tL3VzZXI/aWQ9bGluZ2JlblwiLFxuICAgICAgICAgICAgICAgIHRleHQ6IFwibGluZ2JlblwiXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIGNvbW1lbnRzOiB7XG4gICAgICAgICAgICAgICAgaHJlZjogXCJodHRwczovL25ld3MueWNvbWJpbmF0b3IuY29tL2l0ZW0/aWQ9MTAwNTA2MDNcIixcbiAgICAgICAgICAgICAgICB0ZXh0OiBcIjVcIlxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBpbmRleDogMTRcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHRpdGxlOiB7XG4gICAgICAgICAgICAgICAgaHJlZjogXCJodHRwOi8vd3d3LnRsZHAub3JnL0hPV1RPL0Fzc2VtYmx5LUhPV1RPL2hlbGxvLmh0bWxcIixcbiAgICAgICAgICAgICAgICB0ZXh0OiBcIkxpbnV4IEFzc2VtYmx5IEhvdyBUbzog4oCcSGVsbG8sIFdvcmxk4oCdXCJcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgdXJsOiBcImh0dHBzOi8vbmV3cy55Y29tYmluYXRvci5jb20vXCIsXG4gICAgICAgICAgICAgIHBvaW50czogXCI4MlwiLFxuICAgICAgICAgICAgICB1c2VyOiB7XG4gICAgICAgICAgICAgICAgaHJlZjogXCJodHRwczovL25ld3MueWNvbWJpbmF0b3IuY29tL3VzZXI/aWQ9bWluZGNyaW1lXCIsXG4gICAgICAgICAgICAgICAgdGV4dDogXCJtaW5kY3JpbWVcIlxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBjb21tZW50czoge1xuICAgICAgICAgICAgICAgIGhyZWY6IFwiaHR0cHM6Ly9uZXdzLnljb21iaW5hdG9yLmNvbS9pdGVtP2lkPTEwMDQ5MDIwXCIsXG4gICAgICAgICAgICAgICAgdGV4dDogXCIyNlwiXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIGluZGV4OiAxNVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IHtcbiAgICAgICAgICAgICAgICBocmVmOiBcImh0dHBzOi8vYXBwaHViLmlvL1wiLFxuICAgICAgICAgICAgICAgIHRleHQ6IFwiQXBwSHViIOKAkyBVcGRhdGUgUmVhY3QgTmF0aXZlIEFwcHMgV2l0aG91dCBSZS1TdWJtaXR0aW5nIHRvIEFwcGxlXCJcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgdXJsOiBcImh0dHBzOi8vbmV3cy55Y29tYmluYXRvci5jb20vXCIsXG4gICAgICAgICAgICAgIHBvaW50czogXCIxMjJcIixcbiAgICAgICAgICAgICAgdXNlcjoge1xuICAgICAgICAgICAgICAgIGhyZWY6IFwiaHR0cHM6Ly9uZXdzLnljb21iaW5hdG9yLmNvbS91c2VyP2lkPWFyYmVzZmVsZFwiLFxuICAgICAgICAgICAgICAgIHRleHQ6IFwiYXJiZXNmZWxkXCJcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgY29tbWVudHM6IHtcbiAgICAgICAgICAgICAgICBocmVmOiBcImh0dHBzOi8vbmV3cy55Y29tYmluYXRvci5jb20vaXRlbT9pZD0xMDA0ODA3MlwiLFxuICAgICAgICAgICAgICAgIHRleHQ6IFwiNTVcIlxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBpbmRleDogMTZcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHRpdGxlOiB7XG4gICAgICAgICAgICAgICAgaHJlZjogXCJodHRwczovL2RldmVsb3Blci5udmlkaWEuY29tL2RlZXAtbGVhcm5pbmctY291cnNlc1wiLFxuICAgICAgICAgICAgICAgIHRleHQ6IFwiRGVlcCBMZWFybmluZyBDb3Vyc2VzXCJcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgdXJsOiBcImh0dHBzOi8vbmV3cy55Y29tYmluYXRvci5jb20vXCIsXG4gICAgICAgICAgICAgIHBvaW50czogXCI5NFwiLFxuICAgICAgICAgICAgICB1c2VyOiB7XG4gICAgICAgICAgICAgICAgaHJlZjogXCJodHRwczovL25ld3MueWNvbWJpbmF0b3IuY29tL3VzZXI/aWQ9Y2pkdWxiZXJnZXJcIixcbiAgICAgICAgICAgICAgICB0ZXh0OiBcImNqZHVsYmVyZ2VyXCJcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgY29tbWVudHM6IHtcbiAgICAgICAgICAgICAgICBocmVmOiBcImh0dHBzOi8vbmV3cy55Y29tYmluYXRvci5jb20vaXRlbT9pZD0xMDA0ODQ4N1wiLFxuICAgICAgICAgICAgICAgIHRleHQ6IFwiMTVcIlxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBpbmRleDogMTdcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHRpdGxlOiB7XG4gICAgICAgICAgICAgICAgaHJlZjogXCJodHRwOi8vbGVucy5ibG9ncy5ueXRpbWVzLmNvbS8yMDE1LzA4LzEyL2tvZGFrcy1maXJzdC1kaWdpdGFsLW1vbWVudC9cIixcbiAgICAgICAgICAgICAgICB0ZXh0OiBcIktvZGFr4oCZcyBGaXJzdCBEaWdpdGFsIE1vbWVudFwiXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIHVybDogXCJodHRwczovL25ld3MueWNvbWJpbmF0b3IuY29tL1wiLFxuICAgICAgICAgICAgICBwb2ludHM6IFwiNDZcIixcbiAgICAgICAgICAgICAgdXNlcjoge1xuICAgICAgICAgICAgICAgIGhyZWY6IFwiaHR0cHM6Ly9uZXdzLnljb21iaW5hdG9yLmNvbS91c2VyP2lkPXR5c29uZVwiLFxuICAgICAgICAgICAgICAgIHRleHQ6IFwidHlzb25lXCJcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgY29tbWVudHM6IHtcbiAgICAgICAgICAgICAgICBocmVmOiBcImh0dHBzOi8vbmV3cy55Y29tYmluYXRvci5jb20vaXRlbT9pZD0xMDA0ODc2NlwiLFxuICAgICAgICAgICAgICAgIHRleHQ6IFwiMTdcIlxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBpbmRleDogMThcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHRpdGxlOiB7XG4gICAgICAgICAgICAgICAgaHJlZjogXCJodHRwczovL2Jsb2cuZnVzaW9uZGlnaXRhbC5pby90aGUtaW50ZXJuZXQtb2YtdGhpbmdzLWEtbG9vay1hdC1lbWJlZGRlZC13aWZpLWRldmVsb3BtZW50LWJvYXJkcy03YWJlZTEzMTE3MTE/c291cmNlPXlvdXItc3Rvcmllc1wiLFxuICAgICAgICAgICAgICAgIHRleHQ6IFwiQSBMb29rIGF0IEVtYmVkZGVkIFdpRmkgRGV2ZWxvcG1lbnQgQm9hcmRzXCJcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgdXJsOiBcImh0dHBzOi8vbmV3cy55Y29tYmluYXRvci5jb20vXCIsXG4gICAgICAgICAgICAgIHBvaW50czogXCI0NFwiLFxuICAgICAgICAgICAgICB1c2VyOiB7XG4gICAgICAgICAgICAgICAgaHJlZjogXCJodHRwczovL25ld3MueWNvbWJpbmF0b3IuY29tL3VzZXI/aWQ9aGxmc2hlbGxcIixcbiAgICAgICAgICAgICAgICB0ZXh0OiBcImhsZnNoZWxsXCJcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgY29tbWVudHM6IHtcbiAgICAgICAgICAgICAgICBocmVmOiBcImh0dHBzOi8vbmV3cy55Y29tYmluYXRvci5jb20vaXRlbT9pZD0xMDA0ODQzNFwiLFxuICAgICAgICAgICAgICAgIHRleHQ6IFwiMTZcIlxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBpbmRleDogMTlcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHRpdGxlOiB7XG4gICAgICAgICAgICAgICAgaHJlZjogXCJodHRwczovL2dpdGh1Yi5jb20vc3ppbGFyZC9iZW5jaG0tbWxcIixcbiAgICAgICAgICAgICAgICB0ZXh0OiBcIkNvbXBhcmlzb24gb2YgbWFjaGluZSBsZWFybmluZyBsaWJyYXJpZXMgdXNlZCBmb3IgY2xhc3NpZmljYXRpb25cIlxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB1cmw6IFwiaHR0cHM6Ly9uZXdzLnljb21iaW5hdG9yLmNvbS9cIixcbiAgICAgICAgICAgICAgcG9pbnRzOiBcIjE3MlwiLFxuICAgICAgICAgICAgICB1c2VyOiB7XG4gICAgICAgICAgICAgICAgaHJlZjogXCJodHRwczovL25ld3MueWNvbWJpbmF0b3IuY29tL3VzZXI/aWQ9cHpzXCIsXG4gICAgICAgICAgICAgICAgdGV4dDogXCJwenNcIlxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBjb21tZW50czoge1xuICAgICAgICAgICAgICAgIGhyZWY6IFwiaHR0cHM6Ly9uZXdzLnljb21iaW5hdG9yLmNvbS9pdGVtP2lkPTEwMDQ3MDM3XCIsXG4gICAgICAgICAgICAgICAgdGV4dDogXCIzM1wiXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIGluZGV4OiAyMFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IHtcbiAgICAgICAgICAgICAgICBocmVmOiBcImh0dHA6Ly92ZW50dXJlYmVhdC5jb20vMjAxNS8wOC8xMS9zb3VyY2VkbmEtbGF1bmNoZXMtc2VhcmNobGlnaHQtYS1kZXZlbG9wZXItdG9vbC10by1maW5kLWNvZGluZy1wcm9ibGVtcy1pbi1hbnktYXBwL1wiLFxuICAgICAgICAgICAgICAgIHRleHQ6IFwiU291cmNlRE5BIChZQyBTMTUpIGZpbmRzIGhpZGRlbiBzZWN1cml0eSBhbmQgcXVhbGl0eSBmbGF3cyBpbiBhcHBzXCJcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgdXJsOiBcImh0dHBzOi8vbmV3cy55Y29tYmluYXRvci5jb20vXCIsXG4gICAgICAgICAgICAgIHBvaW50czogXCI0OVwiLFxuICAgICAgICAgICAgICB1c2VyOiB7XG4gICAgICAgICAgICAgICAgaHJlZjogXCJodHRwczovL25ld3MueWNvbWJpbmF0b3IuY29tL3VzZXI/aWQ9a2F0bVwiLFxuICAgICAgICAgICAgICAgIHRleHQ6IFwia2F0bVwiXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIGNvbW1lbnRzOiB7XG4gICAgICAgICAgICAgICAgaHJlZjogXCJodHRwczovL25ld3MueWNvbWJpbmF0b3IuY29tL2l0ZW0/aWQ9MTAwNDk5MjVcIixcbiAgICAgICAgICAgICAgICB0ZXh0OiBcIjMwXCJcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgaW5kZXg6IDIxXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB0aXRsZToge1xuICAgICAgICAgICAgICAgIGhyZWY6IFwiaHR0cHM6Ly9naXRodWIuY29tL2Jsb2cvMjA0Ni1naXRodWItZGVza3RvcC1pcy1ub3ctYXZhaWxhYmxlXCIsXG4gICAgICAgICAgICAgICAgdGV4dDogXCJHaXRIdWIgRGVza3RvcCBpcyBub3cgYXZhaWxhYmxlXCJcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgdXJsOiBcImh0dHBzOi8vbmV3cy55Y29tYmluYXRvci5jb20vXCIsXG4gICAgICAgICAgICAgIHBvaW50czogXCIyNTNcIixcbiAgICAgICAgICAgICAgdXNlcjoge1xuICAgICAgICAgICAgICAgIGhyZWY6IFwiaHR0cHM6Ly9uZXdzLnljb21iaW5hdG9yLmNvbS91c2VyP2lkPWJwaWVycmVcIixcbiAgICAgICAgICAgICAgICB0ZXh0OiBcImJwaWVycmVcIlxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBjb21tZW50czoge1xuICAgICAgICAgICAgICAgIGhyZWY6IFwiaHR0cHM6Ly9uZXdzLnljb21iaW5hdG9yLmNvbS9pdGVtP2lkPTEwMDQ4MTAwXCIsXG4gICAgICAgICAgICAgICAgdGV4dDogXCIyMDNcIlxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBpbmRleDogMjJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHRpdGxlOiB7XG4gICAgICAgICAgICAgICAgaHJlZjogXCJodHRwczovL3d3dy50aGVndWFyZGlhbi5jb20vaW5mby9kZXZlbG9wZXItYmxvZy8yMDE1L2F1Zy8xMi9vcGVuLXNvdXJjaW5nLWdyaWQtaW1hZ2Utc2VydmljZVwiLFxuICAgICAgICAgICAgICAgIHRleHQ6IFwiT3BlbiBzb3VyY2luZyBHcmlkLCB0aGUgR3VhcmRpYW7igJlzIG5ldyBpbWFnZSBtYW5hZ2VtZW50IHNlcnZpY2VcIlxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB1cmw6IFwiaHR0cHM6Ly9uZXdzLnljb21iaW5hdG9yLmNvbS9cIixcbiAgICAgICAgICAgICAgcG9pbnRzOiBcIjEyNlwiLFxuICAgICAgICAgICAgICB1c2VyOiB7XG4gICAgICAgICAgICAgICAgaHJlZjogXCJodHRwczovL25ld3MueWNvbWJpbmF0b3IuY29tL3VzZXI/aWQ9cm9vbTI3MVwiLFxuICAgICAgICAgICAgICAgIHRleHQ6IFwicm9vbTI3MVwiXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIGNvbW1lbnRzOiB7XG4gICAgICAgICAgICAgICAgaHJlZjogXCJodHRwczovL25ld3MueWNvbWJpbmF0b3IuY29tL2l0ZW0/aWQ9MTAwNDc2ODVcIixcbiAgICAgICAgICAgICAgICB0ZXh0OiBcIjE3XCJcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgaW5kZXg6IDIzXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB0aXRsZToge1xuICAgICAgICAgICAgICAgIGhyZWY6IFwiaHR0cDovL3Blbmd1aW5yYW5kb21ob3VzZS5jYS9oYXpsaXR0L2ZlYXR1cmUvbGFzdC1kYXlzLWthdGh5LWFja2VyXCIsXG4gICAgICAgICAgICAgICAgdGV4dDogXCJUaGUgTGFzdCBEYXlzIG9mIEthdGh5IEFja2VyXCJcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgdXJsOiBcImh0dHBzOi8vbmV3cy55Y29tYmluYXRvci5jb20vXCIsXG4gICAgICAgICAgICAgIHBvaW50czogXCIzXCIsXG4gICAgICAgICAgICAgIHVzZXI6IHtcbiAgICAgICAgICAgICAgICBocmVmOiBcImh0dHBzOi8vbmV3cy55Y29tYmluYXRvci5jb20vdXNlcj9pZD1jb2xpbnByaW5jZVwiLFxuICAgICAgICAgICAgICAgIHRleHQ6IFwiY29saW5wcmluY2VcIlxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBjb21tZW50czoge1xuICAgICAgICAgICAgICAgIGhyZWY6IFwiXCIsXG4gICAgICAgICAgICAgICAgdGV4dDogXCJcIlxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBpbmRleDogMjRcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHRpdGxlOiB7XG4gICAgICAgICAgICAgICAgaHJlZjogXCJodHRwOi8vYXhvbi5jcy5ieXUuZWR1L21yc21pdGgvMjAxNUlKQ05OX01BTklDLnBkZlwiLFxuICAgICAgICAgICAgICAgIHRleHQ6IFwiQSBNaW5pbWFsIEFyY2hpdGVjdHVyZSBmb3IgR2VuZXJhbCBDb2duaXRpb24gW3BkZl1cIlxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB1cmw6IFwiaHR0cHM6Ly9uZXdzLnljb21iaW5hdG9yLmNvbS9cIixcbiAgICAgICAgICAgICAgcG9pbnRzOiBcIjUzXCIsXG4gICAgICAgICAgICAgIHVzZXI6IHtcbiAgICAgICAgICAgICAgICBocmVmOiBcImh0dHBzOi8vbmV3cy55Y29tYmluYXRvci5jb20vdXNlcj9pZD1sdXVcIixcbiAgICAgICAgICAgICAgICB0ZXh0OiBcImx1dVwiXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIGNvbW1lbnRzOiB7XG4gICAgICAgICAgICAgICAgaHJlZjogXCJodHRwczovL25ld3MueWNvbWJpbmF0b3IuY29tL2l0ZW0/aWQ9MTAwNDgwMTdcIixcbiAgICAgICAgICAgICAgICB0ZXh0OiBcIjhcIlxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBpbmRleDogMjVcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHRpdGxlOiB7XG4gICAgICAgICAgICAgICAgaHJlZjogXCJodHRwczovL2Jsb2cuZG9ja2VyLmNvbS8yMDE1LzA4L2NvbnRlbnQtdHJ1c3QtZG9ja2VyLTEtOC9cIixcbiAgICAgICAgICAgICAgICB0ZXh0OiBcIkludHJvZHVjaW5nIERvY2tlciBDb250ZW50IFRydXN0XCJcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgdXJsOiBcImh0dHBzOi8vbmV3cy55Y29tYmluYXRvci5jb20vXCIsXG4gICAgICAgICAgICAgIHBvaW50czogXCI4M1wiLFxuICAgICAgICAgICAgICB1c2VyOiB7XG4gICAgICAgICAgICAgICAgaHJlZjogXCJodHRwczovL25ld3MueWNvbWJpbmF0b3IuY29tL3VzZXI/aWQ9ZGthc3BlclwiLFxuICAgICAgICAgICAgICAgIHRleHQ6IFwiZGthc3BlclwiXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIGNvbW1lbnRzOiB7XG4gICAgICAgICAgICAgICAgaHJlZjogXCJodHRwczovL25ld3MueWNvbWJpbmF0b3IuY29tL2l0ZW0/aWQ9MTAwNDgwOTZcIixcbiAgICAgICAgICAgICAgICB0ZXh0OiBcIjI0XCJcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgaW5kZXg6IDI2XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB0aXRsZToge1xuICAgICAgICAgICAgICAgIGhyZWY6IFwiaHR0cDovL2Jsb2cuY29udm94LmNvbS9pbnRlZ3JhdGlvbi1vdmVyLWludmVudGlvblwiLFxuICAgICAgICAgICAgICAgIHRleHQ6IFwiSW50ZWdyYXRpb24gb3ZlciBJbnZlbnRpb25cIlxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB1cmw6IFwiaHR0cHM6Ly9uZXdzLnljb21iaW5hdG9yLmNvbS9cIixcbiAgICAgICAgICAgICAgcG9pbnRzOiBcIjg3XCIsXG4gICAgICAgICAgICAgIHVzZXI6IHtcbiAgICAgICAgICAgICAgICBocmVmOiBcImh0dHBzOi8vbmV3cy55Y29tYmluYXRvci5jb20vdXNlcj9pZD1iZ2VudHJ5XCIsXG4gICAgICAgICAgICAgICAgdGV4dDogXCJiZ2VudHJ5XCJcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgY29tbWVudHM6IHtcbiAgICAgICAgICAgICAgICBocmVmOiBcImh0dHBzOi8vbmV3cy55Y29tYmluYXRvci5jb20vaXRlbT9pZD0xMDA0ODA4NlwiLFxuICAgICAgICAgICAgICAgIHRleHQ6IFwiOVwiXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIGluZGV4OiAyN1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IHtcbiAgICAgICAgICAgICAgICBocmVmOiBcImh0dHA6Ly93d3cuZWNvbm9taXN0LmNvbS9uZXdzL2xlYWRlcnMvMjE2NjA5MTktb25seS1zZWNvbmQtdGltZS1vdXItaGlzdG9yeS1vd25lcnNoaXAtZWNvbm9taXN0LWNoYW5nZXMtbmV3LWNoYXB0ZXJcIixcbiAgICAgICAgICAgICAgICB0ZXh0OiBcIkZvciBvbmx5IHRoZSBzZWNvbmQgdGltZSBpbiBvdXIgaGlzdG9yeSB0aGUgb3duZXJzaGlwIG9mIFRoZSBFY29ub21pc3QgY2hhbmdlc1wiXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIHVybDogXCJodHRwczovL25ld3MueWNvbWJpbmF0b3IuY29tL1wiLFxuICAgICAgICAgICAgICBwb2ludHM6IFwiMTQ5XCIsXG4gICAgICAgICAgICAgIHVzZXI6IHtcbiAgICAgICAgICAgICAgICBocmVmOiBcImh0dHBzOi8vbmV3cy55Y29tYmluYXRvci5jb20vdXNlcj9pZD11Y2FldGFub1wiLFxuICAgICAgICAgICAgICAgIHRleHQ6IFwidWNhZXRhbm9cIlxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBjb21tZW50czoge1xuICAgICAgICAgICAgICAgIGhyZWY6IFwiaHR0cHM6Ly9uZXdzLnljb21iaW5hdG9yLmNvbS9pdGVtP2lkPTEwMDQ3ODQ1XCIsXG4gICAgICAgICAgICAgICAgdGV4dDogXCIxMjZcIlxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBpbmRleDogMjhcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHRpdGxlOiB7XG4gICAgICAgICAgICAgICAgaHJlZjogXCJodHRwOi8vZ3JuaC5zZS9pcGZ5YjNcIixcbiAgICAgICAgICAgICAgICB0ZXh0OiBcIkhlbGxvU2lnbiAoWUMgVzExKSBJcyBIaXJpbmcgYSBUZWNobmljYWwgUHJvZHVjdCBNYW5hZ2VyIGZvciBJdHMgQVBJXCJcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgdXJsOiBcImh0dHBzOi8vbmV3cy55Y29tYmluYXRvci5jb20vXCIsXG4gICAgICAgICAgICAgIHBvaW50czogXCJcIixcbiAgICAgICAgICAgICAgdXNlcjoge1xuICAgICAgICAgICAgICAgIGhyZWY6IFwiXCIsXG4gICAgICAgICAgICAgICAgdGV4dDogXCJcIlxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBjb21tZW50czoge1xuICAgICAgICAgICAgICAgIGhyZWY6IFwiXCIsXG4gICAgICAgICAgICAgICAgdGV4dDogXCJcIlxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBpbmRleDogMjlcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHRpdGxlOiB7XG4gICAgICAgICAgICAgICAgaHJlZjogXCJodHRwOi8vbmV3c29mZmljZS5taXQuZWR1LzIwMTUvcmVhbC10aW1lLWRhdGEtZm9yLWNhbmNlci10aGVyYXB5LTA4MDRcIixcbiAgICAgICAgICAgICAgICB0ZXh0OiBcIlJlYWwtdGltZSBkYXRhIGZvciBjYW5jZXIgdGhlcmFweVwiXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIHVybDogXCJodHRwczovL25ld3MueWNvbWJpbmF0b3IuY29tL1wiLFxuICAgICAgICAgICAgICBwb2ludHM6IFwiMThcIixcbiAgICAgICAgICAgICAgdXNlcjoge1xuICAgICAgICAgICAgICAgIGhyZWY6IFwiaHR0cHM6Ly9uZXdzLnljb21iaW5hdG9yLmNvbS91c2VyP2lkPW9wZW5tYXplXCIsXG4gICAgICAgICAgICAgICAgdGV4dDogXCJvcGVubWF6ZVwiXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIGNvbW1lbnRzOiB7XG4gICAgICAgICAgICAgICAgaHJlZjogXCJcIixcbiAgICAgICAgICAgICAgICB0ZXh0OiBcIlwiXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIGluZGV4OiAzMFxuICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG4gICAgcmVzb2x2ZToge1xuICAgICAgdXNlcjogKCRzdGF0ZVBhcmFtcywgVXNlcikgPT4gVXNlci5maW5kKCRzdGF0ZVBhcmFtcy5pZCksXG4gICAgICByb3V0ZXM6ICh1c2VyKSA9PiB1c2VyLmdldFJvdXRlcygpXG4gICAgfVxuICB9KVxufSlcbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2RvY3MnLCB7XG4gICAgICAgIHVybDogJy9kb2NzJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9kb2NzL2RvY3MuaHRtbCdcbiAgICB9KTtcbn0pO1xuIiwiKGZ1bmN0aW9uICgpIHtcblxuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIC8vIEhvcGUgeW91IGRpZG4ndCBmb3JnZXQgQW5ndWxhciEgRHVoLWRveS5cbiAgICBpZiAoIXdpbmRvdy5hbmd1bGFyKSB0aHJvdyBuZXcgRXJyb3IoJ0kgY2FuXFwndCBmaW5kIEFuZ3VsYXIhJyk7XG5cbiAgICB2YXIgYXBwID0gYW5ndWxhci5tb2R1bGUoJ2ZzYVByZUJ1aWx0JywgW10pO1xuXG4gICAgYXBwLmZhY3RvcnkoJ1NvY2tldCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKCF3aW5kb3cuaW8pIHRocm93IG5ldyBFcnJvcignc29ja2V0LmlvIG5vdCBmb3VuZCEnKTtcbiAgICAgICAgcmV0dXJuIHdpbmRvdy5pbyh3aW5kb3cubG9jYXRpb24ub3JpZ2luKTtcbiAgICB9KTtcblxuICAgIC8vIEFVVEhfRVZFTlRTIGlzIHVzZWQgdGhyb3VnaG91dCBvdXIgYXBwIHRvXG4gICAgLy8gYnJvYWRjYXN0IGFuZCBsaXN0ZW4gZnJvbSBhbmQgdG8gdGhlICRyb290U2NvcGVcbiAgICAvLyBmb3IgaW1wb3J0YW50IGV2ZW50cyBhYm91dCBhdXRoZW50aWNhdGlvbiBmbG93LlxuICAgIGFwcC5jb25zdGFudCgnQVVUSF9FVkVOVFMnLCB7XG4gICAgICAgIGxvZ2luU3VjY2VzczogJ2F1dGgtbG9naW4tc3VjY2VzcycsXG4gICAgICAgIGxvZ2luRmFpbGVkOiAnYXV0aC1sb2dpbi1mYWlsZWQnLFxuICAgICAgICBsb2dvdXRTdWNjZXNzOiAnYXV0aC1sb2dvdXQtc3VjY2VzcycsXG4gICAgICAgIHNlc3Npb25UaW1lb3V0OiAnYXV0aC1zZXNzaW9uLXRpbWVvdXQnLFxuICAgICAgICBub3RBdXRoZW50aWNhdGVkOiAnYXV0aC1ub3QtYXV0aGVudGljYXRlZCcsXG4gICAgICAgIG5vdEF1dGhvcml6ZWQ6ICdhdXRoLW5vdC1hdXRob3JpemVkJ1xuICAgIH0pO1xuXG4gICAgYXBwLmZhY3RvcnkoJ0F1dGhJbnRlcmNlcHRvcicsIGZ1bmN0aW9uICgkcm9vdFNjb3BlLCAkcSwgQVVUSF9FVkVOVFMpIHtcbiAgICAgICAgdmFyIHN0YXR1c0RpY3QgPSB7XG4gICAgICAgICAgICA0MDE6IEFVVEhfRVZFTlRTLm5vdEF1dGhlbnRpY2F0ZWQsXG4gICAgICAgICAgICA0MDM6IEFVVEhfRVZFTlRTLm5vdEF1dGhvcml6ZWQsXG4gICAgICAgICAgICA0MTk6IEFVVEhfRVZFTlRTLnNlc3Npb25UaW1lb3V0LFxuICAgICAgICAgICAgNDQwOiBBVVRIX0VWRU5UUy5zZXNzaW9uVGltZW91dFxuICAgICAgICB9O1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcmVzcG9uc2VFcnJvcjogZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KHN0YXR1c0RpY3RbcmVzcG9uc2Uuc3RhdHVzXSwgcmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgIHJldHVybiAkcS5yZWplY3QocmVzcG9uc2UpXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfSk7XG5cbiAgICBhcHAuY29uZmlnKGZ1bmN0aW9uICgkaHR0cFByb3ZpZGVyKSB7XG4gICAgICAgICRodHRwUHJvdmlkZXIuaW50ZXJjZXB0b3JzLnB1c2goW1xuICAgICAgICAgICAgJyRpbmplY3RvcicsXG4gICAgICAgICAgICBmdW5jdGlvbiAoJGluamVjdG9yKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICRpbmplY3Rvci5nZXQoJ0F1dGhJbnRlcmNlcHRvcicpO1xuICAgICAgICAgICAgfVxuICAgICAgICBdKTtcbiAgICB9KTtcblxuICAgIGFwcC5zZXJ2aWNlKCdBdXRoU2VydmljZScsIGZ1bmN0aW9uICgkaHR0cCwgU2Vzc2lvbiwgJHJvb3RTY29wZSwgQVVUSF9FVkVOVFMsICRxLCBVc2VyKSB7XG5cbiAgICAgICAgZnVuY3Rpb24gb25TdWNjZXNzZnVsTG9naW4ocmVzcG9uc2UpIHtcbiAgICAgICAgICAgIHZhciBkYXRhID0gcmVzcG9uc2UuZGF0YTtcbiAgICAgICAgICAgIFNlc3Npb24uY3JlYXRlKGRhdGEuaWQsIGRhdGEudXNlcik7XG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3QoQVVUSF9FVkVOVFMubG9naW5TdWNjZXNzKTtcbiAgICAgICAgICAgIHJldHVybiBkYXRhLnVzZXI7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVc2VzIHRoZSBzZXNzaW9uIGZhY3RvcnkgdG8gc2VlIGlmIGFuXG4gICAgICAgIC8vIGF1dGhlbnRpY2F0ZWQgdXNlciBpcyBjdXJyZW50bHkgcmVnaXN0ZXJlZC5cbiAgICAgICAgdGhpcy5pc0F1dGhlbnRpY2F0ZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gISFTZXNzaW9uLnVzZXI7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5nZXRMb2dnZWRJblVzZXIgPSBmdW5jdGlvbiAoZnJvbVNlcnZlcikge1xuXG4gICAgICAgICAgICAvLyBJZiBhbiBhdXRoZW50aWNhdGVkIHNlc3Npb24gZXhpc3RzLCB3ZVxuICAgICAgICAgICAgLy8gcmV0dXJuIHRoZSB1c2VyIGF0dGFjaGVkIHRvIHRoYXQgc2Vzc2lvblxuICAgICAgICAgICAgLy8gd2l0aCBhIHByb21pc2UuIFRoaXMgZW5zdXJlcyB0aGF0IHdlIGNhblxuICAgICAgICAgICAgLy8gYWx3YXlzIGludGVyZmFjZSB3aXRoIHRoaXMgbWV0aG9kIGFzeW5jaHJvbm91c2x5LlxuXG4gICAgICAgICAgICAvLyBPcHRpb25hbGx5LCBpZiB0cnVlIGlzIGdpdmVuIGFzIHRoZSBmcm9tU2VydmVyIHBhcmFtZXRlcixcbiAgICAgICAgICAgIC8vIHRoZW4gdGhpcyBjYWNoZWQgdmFsdWUgd2lsbCBub3QgYmUgdXNlZC5cblxuICAgICAgICAgICAgaWYgKHRoaXMuaXNBdXRoZW50aWNhdGVkKCkgJiYgZnJvbVNlcnZlciAhPT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAkcS53aGVuKFNlc3Npb24udXNlcik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIE1ha2UgcmVxdWVzdCBHRVQgL3Nlc3Npb24uXG4gICAgICAgICAgICAvLyBJZiBpdCByZXR1cm5zIGEgdXNlciwgY2FsbCBvblN1Y2Nlc3NmdWxMb2dpbiB3aXRoIHRoZSByZXNwb25zZS5cbiAgICAgICAgICAgIC8vIElmIGl0IHJldHVybnMgYSA0MDEgcmVzcG9uc2UsIHdlIGNhdGNoIGl0IGFuZCBpbnN0ZWFkIHJlc29sdmUgdG8gbnVsbC5cbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5nZXQoJy9zZXNzaW9uJykudGhlbihvblN1Y2Nlc3NmdWxMb2dpbikuY2F0Y2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmxvZ2luID0gZnVuY3Rpb24gKGNyZWRlbnRpYWxzKSB7XG4gICAgICAgICAgICByZXR1cm4gJGh0dHAucG9zdCgnL2xvZ2luJywgY3JlZGVudGlhbHMpXG4gICAgICAgICAgICAgICAgLnRoZW4ob25TdWNjZXNzZnVsTG9naW4pXG4gICAgICAgICAgICAgICAgLmNhdGNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICRxLnJlamVjdCh7IG1lc3NhZ2U6ICdJbnZhbGlkIGxvZ2luIGNyZWRlbnRpYWxzLicgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5sb2dvdXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KCcvbG9nb3V0JykudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgU2Vzc2lvbi5kZXN0cm95KCk7XG4gICAgICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KEFVVEhfRVZFTlRTLmxvZ291dFN1Y2Nlc3MpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICB9KTtcblxuICAgIGFwcC5zZXJ2aWNlKCdTZXNzaW9uJywgZnVuY3Rpb24gKCRyb290U2NvcGUsIEFVVEhfRVZFTlRTKSB7XG5cbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLm5vdEF1dGhlbnRpY2F0ZWQsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHNlbGYuZGVzdHJveSgpO1xuICAgICAgICB9KTtcblxuICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5zZXNzaW9uVGltZW91dCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgc2VsZi5kZXN0cm95KCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMuaWQgPSBudWxsO1xuICAgICAgICB0aGlzLnVzZXIgPSBudWxsO1xuXG4gICAgICAgIHRoaXMuY3JlYXRlID0gZnVuY3Rpb24gKHNlc3Npb25JZCwgdXNlcikge1xuICAgICAgICAgICAgdGhpcy5pZCA9IHNlc3Npb25JZDtcbiAgICAgICAgICAgIHRoaXMudXNlciA9IHVzZXI7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5kZXN0cm95ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy5pZCA9IG51bGw7XG4gICAgICAgICAgICB0aGlzLnVzZXIgPSBudWxsO1xuICAgICAgICB9O1xuXG4gICAgfSk7XG5cbn0pKCk7XG4iLCJhcHAuY29uZmlnKCgkc3RhdGVQcm92aWRlcikgPT4ge1xuICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnaGVscCcsIHtcbiAgICB1cmw6ICcvaGVscCcsXG4gICAgdGVtcGxhdGVVcmw6ICdqcy9oZWxwL2hlbHAuaHRtbCdcbiAgfSlcbn0pXG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdob21lJywge1xuICAgICAgICB1cmw6ICcvJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9ob21lL2hvbWUuaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICgkc2NvcGUsIHVzZXJzLCByb3V0ZXMpID0+IHtcbiAgICAgICAgICAkc2NvcGUudXNlcnMgPSB1c2Vyc1xuICAgICAgICAgICRzY29wZS5yb3V0ZXMgPSByb3V0ZXNcblxuICAgICAgICAgIC8vIGNoZWNrIHdoZXRoZXIgdXNlciBhZ2VudCBpcyBydW5uaW5nIGNocm9tZVxuICAgICAgICAgICRzY29wZS5oYXNDaHJvbWUgPSAoKSA9PiBuYXZpZ2F0b3IudXNlckFnZW50LnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoJ2Nocm9tZScpXG4gICAgICAgIH0sXG4gICAgICAgIHJlc29sdmU6IHtcbiAgICAgICAgICB1c2VyczogKFVzZXIpID0+IFVzZXIuZmluZEFsbCh7fSwgeyBieXBhc3NDYWNoZTogdHJ1ZSB9KSxcbiAgICAgICAgICByb3V0ZXM6IChSb3V0ZSkgPT4gUm91dGUuZmluZEFsbCh7fSwgeyBieXBhc3NDYWNoZTogdHJ1ZSB9KVxuICAgICAgICB9XG4gICAgfSk7XG59KTtcbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG5cbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnbG9naW4nLCB7XG4gICAgICAgIHVybDogJy9sb2dpbicsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvbG9naW4vbG9naW4uaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdMb2dpbkN0cmwnXG4gICAgfSk7XG5cbn0pO1xuXG5hcHAuY29udHJvbGxlcignTG9naW5DdHJsJywgZnVuY3Rpb24gKCRzY29wZSwgQXV0aFNlcnZpY2UsICRzdGF0ZSkge1xuXG4gICAgJHNjb3BlLmxvZ2luID0ge307XG4gICAgJHNjb3BlLmVycm9yID0gbnVsbDtcblxuICAgICRzY29wZS5zZW5kTG9naW4gPSBmdW5jdGlvbiAobG9naW5JbmZvKSB7XG5cbiAgICAgICAgJHNjb3BlLmVycm9yID0gbnVsbDtcblxuICAgICAgICBBdXRoU2VydmljZS5sb2dpbihsb2dpbkluZm8pLnRoZW4oZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgICAgICRzdGF0ZS5nbygndXNlcicsIHsgaWQ6IHVzZXIuX2lkIH0pO1xuICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAkc2NvcGUuZXJyb3IgPSAnSW52YWxpZCBsb2dpbiBjcmVkZW50aWFscy4nO1xuICAgICAgICB9KTtcblxuICAgIH07XG5cbn0pO1xuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcblxuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdtZW1iZXJzT25seScsIHtcbiAgICAgICAgdXJsOiAnL21lbWJlcnMtYXJlYScsXG4gICAgICAgIHRlbXBsYXRlOiAnJyxcbiAgICAgICAgY29udHJvbGxlcjogZnVuY3Rpb24gKCRzY29wZSkge30sXG5cbiAgICAgICAgLy8gVGhlIGZvbGxvd2luZyBkYXRhLmF1dGhlbnRpY2F0ZSBpcyByZWFkIGJ5IGFuIGV2ZW50IGxpc3RlbmVyXG4gICAgICAgIC8vIHRoYXQgY29udHJvbHMgYWNjZXNzIHRvIHRoaXMgc3RhdGUuIFJlZmVyIHRvIGFwcC5qcy5cbiAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgYXV0aGVudGljYXRlOiB0cnVlXG4gICAgICAgIH1cbiAgICB9KTtcblxufSk7XG4iLCJhcHAuZmFjdG9yeSgnUm91dGUnLCAoJHN0YXRlLCBEUykgPT4ge1xuXG4gIGxldCBSb3V0ZSA9IERTLmRlZmluZVJlc291cmNlKHtcbiAgICBuYW1lOiAncm91dGUnLFxuICAgIGVuZHBvaW50OiAncm91dGVzJyxcbiAgICByZWxhdGlvbnM6IHtcbiAgICAgIGJlbG9uZ3NUbzoge1xuICAgICAgICB1c2VyOiB7XG4gICAgICAgICAgLy8gbG9jYWwgZmllbGQgaXMgZm9yIGxpbmtpbmcgcmVsYXRpb25zXG4gICAgICAgICAgLy8gcm91dGUudXNlciAtPiB1c2VyKG93bmVyKSBvZiB0aGUgcm91dGVcbiAgICAgICAgICBsb2NhbEZpZWxkOiAnX3VzZXInLFxuICAgICAgICAgIC8vIGxvY2FsIGtleSBpcyB0aGUgXCJqb2luXCIgZmllbGRcbiAgICAgICAgICAvLyB0aGUgbmFtZSBvZiB0aGUgZmllbGQgb24gdGhlIHJvdXRlIHRoYXQgcG9pbnRzIHRvIGl0cyBwYXJlbnQgdXNlclxuICAgICAgICAgIGxvY2FsS2V5OiAndXNlcidcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG4gICAgbWV0aG9kczoge1xuICAgICAgZ286IGZ1bmN0aW9uKCkge1xuICAgICAgICBjb25zb2xlLmxvZyhgdHJhbnNpdGlvbmluZyB0byByb3V0ZSBzdGF0ZSAoJHt0aGlzLm5hbWV9LCAke3RoaXMuX2lkfSlgKVxuICAgICAgICAvLyAkc3RhdGUuZ28oJ3JvdXRlJywgeyBpZDogdGhpcy5faWQgfSlcbiAgICAgIH1cbiAgICB9XG4gIH0pXG5cbiAgcmV0dXJuIFJvdXRlXG59KVxuLnJ1bihSb3V0ZSA9PiB7fSlcbiIsImFwcC5mYWN0b3J5KCdVc2VyJywgKCRzdGF0ZSwgUm91dGUsIERTKSA9PiB7XG5cbiAgbGV0IFVzZXIgPSBEUy5kZWZpbmVSZXNvdXJjZSh7XG4gICAgbmFtZTogJ3VzZXInLFxuICAgIGVuZHBvaW50OiAndXNlcnMnLFxuICAgIHJlbGF0aW9uczoge1xuICAgICAgaGFzTWFueToge1xuICAgICAgICByb3V0ZToge1xuICAgICAgICAgIC8vIGxvY2FsIGZpZWxkIGlzIGZvciBsaW5raW5nIHJlbGF0aW9uc1xuICAgICAgICAgIC8vIHVzZXIucm91dGVzIC0+IGFycmF5IG9mIHJvdXRlcyBmb3IgdGhlIHVzZXJcbiAgICAgICAgICBsb2NhbEZpZWxkOiAncm91dGVzJyxcbiAgICAgICAgICAvLyBmb3JlaWduIGtleSBpcyB0aGUgJ2pvaW4nIGZpZWxkXG4gICAgICAgICAgLy8gdGhlIG5hbWUgb2YgdGhlIGZpZWxkIG9uIGEgcm91dGUgdGhhdCBwb2ludHMgdG8gaXRzIHBhcmVudCB1c2VyXG4gICAgICAgICAgZm9yZWlnbktleTogJ3VzZXInXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIG1ldGhvZHM6IHsgIC8vIGZ1bmN0aW9uYWxpdHkgYWRkZWQgdG8gZXZlcnkgaW5zdGFuY2Ugb2YgVXNlclxuICAgICAgZ286IGZ1bmN0aW9uKCkge1xuICAgICAgICAkc3RhdGUuZ28oJ2FwaScsIHsgaWQ6IHRoaXMuX2lkIH0pXG4gICAgICB9LFxuICAgICAgZ2V0Um91dGVzOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIFJvdXRlLmZpbmRBbGwoeyAndXNlcic6IHRoaXMuX2lkIH0pXG4gICAgICB9XG4gICAgfVxuICB9KVxuXG4gIHJldHVybiBVc2VyXG59KVxuLnJ1bihVc2VyID0+IHt9KVxuIiwiYXBwLmRpcmVjdGl2ZSgnbmF2YmFyJywgZnVuY3Rpb24gKCRyb290U2NvcGUsICRzdGF0ZSwgQXV0aFNlcnZpY2UsIEFVVEhfRVZFTlRTLCBVc2VyKSB7XG5cbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICBzY29wZToge30sXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvbmF2YmFyL25hdmJhci5odG1sJyxcbiAgICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlLCBlbGVtLCBhdHRyKSB7XG5cbiAgICAgICAgICAgIHNjb3BlLml0ZW1zID0gW1xuICAgICAgICAgICAgICAgIC8vIHsgbGFiZWw6ICdIb21lJywgc3RhdGU6ICdob21lJyB9LFxuICAgICAgICAgICAgICAgIHsgbGFiZWw6ICdEb2N1bWVudGF0aW9uJywgc3RhdGU6ICdkb2NzJyB9LFxuICAgICAgICAgICAgICAgIHsgbGFiZWw6ICdBYm91dCcsIHN0YXRlOiAnYWJvdXQnIH0sXG4gICAgICAgICAgICAgICAgeyBsYWJlbDogJ0hlbHAnLCBzdGF0ZTogJ2hlbHAnIH0sXG4gICAgICAgICAgICAgICAgLy97IGxhYmVsOiAnTWVtYmVycyBPbmx5Jywgc3RhdGU6ICdtZW1iZXJzT25seScsIGF1dGg6IHRydWUgfVxuICAgICAgICAgICAgXTtcblxuICAgICAgICAgICAgc2NvcGUuc2hvdyA9IGZhbHNlXG5cbiAgICAgICAgICAgIHNjb3BlLnRvZ2dsZSA9ICgpID0+IHNjb3BlLnNob3cgPSAhc2NvcGUuc2hvd1xuXG4gICAgICAgICAgICBzY29wZS5zZWFyY2ggPSAoKSA9PiB7XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdzZWFyY2hpbmcgZm9yIHNvbWV0aGluZy4uLicpXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHNjb3BlLnVzZXIgPSBudWxsO1xuXG4gICAgICAgICAgICBzY29wZS5pc0xvZ2dlZEluID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBBdXRoU2VydmljZS5pc0F1dGhlbnRpY2F0ZWQoKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHNjb3BlLmxvZ291dCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBBdXRoU2VydmljZS5sb2dvdXQoKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAkc3RhdGUuZ28oJ2hvbWUnKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHZhciBzZXRVc2VyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIEF1dGhTZXJ2aWNlLmdldExvZ2dlZEluVXNlcigpXG4gICAgICAgICAgICAgICAgICAudGhlbih1c2VyID0+IFVzZXIuZmluZCh1c2VyLl9pZCkpXG4gICAgICAgICAgICAgICAgICAudGhlbih1c2VyID0+IHtcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUudXNlciA9IHVzZXJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHVzZXJcbiAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB2YXIgcmVtb3ZlVXNlciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBzY29wZS51c2VyID0gbnVsbDtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHNldFVzZXIoKTtcblxuICAgICAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMubG9naW5TdWNjZXNzLCBzZXRVc2VyKTtcbiAgICAgICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLmxvZ291dFN1Y2Nlc3MsIHJlbW92ZVVzZXIpO1xuICAgICAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMuc2Vzc2lvblRpbWVvdXQsIHJlbW92ZVVzZXIpO1xuXG4gICAgICAgIH1cblxuICAgIH07XG5cbn0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5hcHAuZGlyZWN0aXZlKCduZ0VudGVyJywgKCkgPT4ge1xuXHRyZXR1cm4ge1xuXHRcdHJlc3RyaWN0OiAnQScsXG5cdFx0c2NvcGU6IHtcblx0XHRcdG5nRW50ZXI6ICcmJ1xuXHRcdH0sXG5cdFx0bGluazogKHNjb3BlLCBlbGVtLCBhdHRyKSA9PiB7XG5cdFx0XHRlbGVtLmJpbmQoJ2tleWRvd24ga2V5cHJlc3MnLCAoZXZlbnQpID0+IHtcblx0XHRcdFx0aWYgKGV2ZW50LndoaWNoID09IDEzKSB7XG5cdFx0XHRcdFx0c2NvcGUuJGFwcGx5KCgpID0+IHtcbiAgICAgICAgICAgIHNjb3BlLm5nRW50ZXIoKVxuICAgICAgICAgIH0pXG5cdFx0XHRcdFx0cmV0dXJuIGZhbHNlXG5cdFx0XHRcdH1cblx0XHRcdH0pXG5cdFx0fVxuXHR9XG59KVxuIiwiYXBwLmRpcmVjdGl2ZSgnbm9kZW1vbm9Mb2dvJywgZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvbm9kZW1vbm8tbG9nby9ub2RlbW9uby1sb2dvLmh0bWwnLFxuICAgICAgICBsaW5rOiAoc2NvcGUsIGVsZW0sIGF0dHIpID0+IHtcblxuICAgICAgICAgIHNjb3BlLmluc3RhbGxDaHJvbWVFeHQgPSAoKSA9PiB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgaW5zdGFsbGluZyBOb2RlbW9ubyBjaHJvbWUgZXh0ZW5zaW9uLi4uYClcbiAgICAgICAgICB9XG5cbiAgICAgICAgfVxuICAgIH07XG59KTtcbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==