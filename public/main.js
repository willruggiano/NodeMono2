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

app.config(function ($stateProvider) {
  $stateProvider.state('user', {
    url: '/:id/profile',
    templateUrl: 'js/user_profile/user_profile.html',
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
        $state.go('user', { id: this._id });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImFib3V0L2Fib3V0LmpzIiwiZG9jcy9kb2NzLmpzIiwiZnNhL2ZzYS1wcmUtYnVpbHQuanMiLCJoZWxwL2hlbHAuanMiLCJob21lL2hvbWUuanMiLCJsb2dpbi9sb2dpbi5qcyIsIm1lbWJlcnMtb25seS9tZW1iZXJzLW9ubHkuanMiLCJ1c2VyX3Byb2ZpbGUvdXNlcl9wcm9maWxlLmpzIiwiY29tbW9uL2ZhY3Rvcmllcy9yb3V0ZS5mYWN0b3J5LmpzIiwiY29tbW9uL2ZhY3Rvcmllcy91c2VyLmZhY3RvcnkuanMiLCJjb21tb24vZGlyZWN0aXZlcy9uYXZiYXIvbmF2YmFyLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvbmdFbnRlci9uZ0VudGVyLmRpcmVjdGl2ZS5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL25vZGVtb25vLWxvZ28vbm9kZW1vbm8tbG9nby5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxZQUFBLENBQUE7QUFDQSxNQUFBLENBQUEsR0FBQSxHQUFBLE9BQUEsQ0FBQSxNQUFBLENBQUEsYUFBQSxFQUFBLENBQUEsV0FBQSxFQUFBLGNBQUEsRUFBQSxhQUFBLEVBQUEsU0FBQSxDQUFBLENBQUEsQ0FBQTs7QUFFQSxHQUFBLENBQUEsTUFBQSxDQUFBLFVBQUEsa0JBQUEsRUFBQSxpQkFBQSxFQUFBLFVBQUEsRUFBQSxxQkFBQSxFQUFBOztBQUVBLG1CQUFBLENBQUEsU0FBQSxDQUFBLElBQUEsQ0FBQSxDQUFBOztBQUVBLG9CQUFBLENBQUEsU0FBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBOzs7QUFHQSxZQUFBLENBQUEsUUFBQSxDQUFBLFFBQUEsR0FBQSxNQUFBLENBQUE7QUFDQSxZQUFBLENBQUEsUUFBQSxDQUFBLFdBQUEsR0FBQSxLQUFBLENBQUE7Ozs7O0FBTUEsWUFBQSxDQUFBLFFBQUEsQ0FBQSxTQUFBLEdBQUEsVUFBQSxPQUFBLEVBQUE7QUFDQSxRQUFBLElBQUEsR0FBQSxJQUFBLENBQUEsTUFBQSxFQUFBLENBQUE7QUFDQSxRQUFBLElBQUEsQ0FBQSxNQUFBLEVBQUEsT0FBQSxPQUFBLENBQUEsT0FBQSxDQUFBLE9BQUEsQ0FBQSxJQUFBLENBQUEsSUFBQSxDQUFBLENBQUEsQ0FBQSxLQUNBLE9BQUEsSUFBQSxDQUFBLE9BQUEsRUFBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLElBQUE7YUFBQSxPQUFBLENBQUEsSUFBQSxDQUFBLElBQUEsQ0FBQTtLQUFBLENBQUEsQ0FBQTtHQUNBLENBQUE7Ozs7OztBQU1BLFdBQUEsWUFBQSxDQUFBLFFBQUEsRUFBQSxRQUFBLEVBQUE7QUFDQSxhQUFBLFlBQUEsQ0FBQSxDQUFBLEVBQUE7QUFDQSxZQUFBLENBQUEsT0FBQSxDQUFBLE9BQUEsQ0FBQSxRQUFBLENBQUEsWUFBQSxFQUFBLFVBQUEsR0FBQSxFQUFBO0FBQ0EsWUFBQSxZQUFBLEdBQUEsR0FBQSxDQUFBLFFBQUEsQ0FBQTtBQUNBLFlBQUEsV0FBQSxHQUFBLFFBQUEsQ0FBQSxXQUFBLENBQUEsWUFBQSxDQUFBLENBQUE7QUFDQSxZQUFBLEdBQUEsQ0FBQSxJQUFBLEtBQUEsU0FBQSxFQUFBO0FBQ0EsY0FBQSxDQUFBLENBQUEsY0FBQSxDQUFBLEdBQUEsQ0FBQSxVQUFBLENBQUEsRUFBQTtBQUNBLGdCQUFBLENBQUEsQ0FBQSxHQUFBLENBQUEsVUFBQSxDQUFBLENBQUEsTUFBQSxJQUFBLENBQUEsTUFBQSxDQUFBLE9BQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQSxDQUFBLEdBQUEsQ0FBQSxVQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxFQUFBOztBQUVBLGVBQUEsQ0FBQSxHQUFBLENBQUEsU0FBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBLEdBQUEsQ0FBQSxVQUFBLENBQUEsQ0FBQTtBQUNBLHFCQUFBLENBQUEsQ0FBQSxHQUFBLENBQUEsVUFBQSxDQUFBLENBQUE7YUFDQSxNQUFBLElBQUEsQ0FBQSxDQUFBLENBQUEsR0FBQSxDQUFBLFNBQUEsQ0FBQSxFQUFBOztBQUVBLGVBQUEsQ0FBQSxHQUFBLENBQUEsU0FBQSxDQUFBLEdBQUEsRUFBQSxDQUFBO0FBQ0Esb0JBQUEsQ0FBQSxPQUFBLENBQUEsT0FBQSxDQUFBLENBQUEsQ0FBQSxHQUFBLENBQUEsVUFBQSxDQUFBLEVBQUEsVUFBQSxLQUFBLEVBQUE7QUFDQSxpQkFBQSxDQUFBLEdBQUEsQ0FBQSxTQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsS0FBQSxDQUFBLFdBQUEsQ0FBQSxXQUFBLENBQUEsQ0FBQSxDQUFBO2VBQ0EsQ0FBQSxDQUFBO2FBQ0E7V0FDQTtTQUNBLE1BQ0EsSUFBQSxHQUFBLENBQUEsSUFBQSxLQUFBLFdBQUEsRUFBQTtBQUNBLGNBQUEsQ0FBQSxDQUFBLGNBQUEsQ0FBQSxHQUFBLENBQUEsVUFBQSxDQUFBLEVBQUE7O0FBRUEsZ0JBQUEsTUFBQSxDQUFBLE9BQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQSxDQUFBLEdBQUEsQ0FBQSxVQUFBLENBQUEsQ0FBQSxFQUFBO0FBQ0EsZUFBQSxDQUFBLEdBQUEsQ0FBQSxRQUFBLENBQUEsR0FBQSxDQUFBLENBQUEsR0FBQSxDQUFBLFVBQUEsQ0FBQSxDQUFBLEdBQUEsQ0FBQTthQUNBOztpQkFFQSxJQUFBLENBQUEsTUFBQSxDQUFBLE9BQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQSxDQUFBLEdBQUEsQ0FBQSxVQUFBLENBQUEsQ0FBQSxFQUFBO0FBQ0EsaUJBQUEsQ0FBQSxHQUFBLENBQUEsUUFBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBLEdBQUEsQ0FBQSxVQUFBLENBQUEsQ0FBQTtBQUNBLHVCQUFBLENBQUEsQ0FBQSxHQUFBLENBQUEsVUFBQSxDQUFBLENBQUE7ZUFDQTtXQUNBO1NBQ0E7T0FDQSxDQUFBLENBQUE7S0FDQTs7QUFFQSxRQUFBLE1BQUEsQ0FBQSxPQUFBLENBQUEsT0FBQSxDQUFBLFFBQUEsQ0FBQSxFQUFBO0FBQ0EsWUFBQSxDQUFBLE9BQUEsQ0FBQSxPQUFBLENBQUEsUUFBQSxFQUFBLFlBQUEsQ0FBQSxDQUFBO0tBQ0EsTUFBQTtBQUNBLGtCQUFBLENBQUEsUUFBQSxDQUFBLENBQUE7S0FDQTtHQUNBOztBQUdBLFlBQUEsQ0FBQSxRQUFBLENBQUEsV0FBQSxHQUFBLFVBQUEsUUFBQSxFQUFBLElBQUEsRUFBQTtBQUNBLFFBQUEsUUFBQSxHQUFBLElBQUEsQ0FBQSxJQUFBLENBQUE7QUFDQSxnQkFBQSxDQUFBLFFBQUEsRUFBQSxRQUFBLENBQUEsQ0FBQTtBQUNBLFdBQUEsUUFBQSxDQUFBO0dBQ0EsQ0FBQTs7Q0FFQSxDQUFBLENBQUE7OztBQUdBLEdBQUEsQ0FBQSxHQUFBLENBQUEsVUFBQSxVQUFBLEVBQUEsV0FBQSxFQUFBLE1BQUEsRUFBQTs7O0FBR0EsTUFBQSw0QkFBQSxHQUFBLFNBQUEsNEJBQUEsQ0FBQSxLQUFBLEVBQUE7QUFDQSxXQUFBLEtBQUEsQ0FBQSxJQUFBLElBQUEsS0FBQSxDQUFBLElBQUEsQ0FBQSxZQUFBLENBQUE7R0FDQSxDQUFBOzs7O0FBSUEsWUFBQSxDQUFBLEdBQUEsQ0FBQSxtQkFBQSxFQUFBLFVBQUEsS0FBQSxFQUFBLE9BQUEsRUFBQSxRQUFBLEVBQUE7O0FBRUEsUUFBQSxDQUFBLDRCQUFBLENBQUEsT0FBQSxDQUFBLEVBQUE7OztBQUdBLGFBQUE7S0FDQTs7QUFFQSxRQUFBLFdBQUEsQ0FBQSxlQUFBLEVBQUEsRUFBQTs7O0FBR0EsYUFBQTtLQUNBOzs7QUFHQSxTQUFBLENBQUEsY0FBQSxFQUFBLENBQUE7O0FBRUEsZUFBQSxDQUFBLGVBQUEsRUFBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLElBQUEsRUFBQTs7OztBQUlBLFVBQUEsSUFBQSxFQUFBO0FBQ0EsY0FBQSxDQUFBLEVBQUEsQ0FBQSxPQUFBLENBQUEsSUFBQSxFQUFBLFFBQUEsQ0FBQSxDQUFBO09BQ0EsTUFBQTtBQUNBLGNBQUEsQ0FBQSxFQUFBLENBQUEsT0FBQSxDQUFBLENBQUE7T0FDQTtLQUNBLENBQUEsQ0FBQTtHQUVBLENBQUEsQ0FBQTtDQUVBLENBQUEsQ0FBQTs7QUN2SEEsR0FBQSxDQUFBLE1BQUEsQ0FBQSxVQUFBLGNBQUEsRUFBQTs7O0FBR0EsZ0JBQUEsQ0FBQSxLQUFBLENBQUEsT0FBQSxFQUFBO0FBQ0EsT0FBQSxFQUFBLFFBQUE7QUFDQSxjQUFBLEVBQUEsaUJBQUE7QUFDQSxlQUFBLEVBQUEscUJBQUE7R0FDQSxDQUFBLENBQUE7Q0FFQSxDQUFBLENBQUE7O0FBRUEsR0FBQSxDQUFBLFVBQUEsQ0FBQSxpQkFBQSxFQUFBLFVBQUEsTUFBQSxFQUFBOzs7O0NBSUEsQ0FBQSxDQUFBOztBQ2ZBLEdBQUEsQ0FBQSxNQUFBLENBQUEsVUFBQSxjQUFBLEVBQUE7QUFDQSxnQkFBQSxDQUFBLEtBQUEsQ0FBQSxNQUFBLEVBQUE7QUFDQSxPQUFBLEVBQUEsT0FBQTtBQUNBLGVBQUEsRUFBQSxtQkFBQTtHQUNBLENBQUEsQ0FBQTtDQUNBLENBQUEsQ0FBQTs7QUNMQSxDQUFBLFlBQUE7O0FBRUEsY0FBQSxDQUFBOzs7QUFHQSxNQUFBLENBQUEsTUFBQSxDQUFBLE9BQUEsRUFBQSxNQUFBLElBQUEsS0FBQSxDQUFBLHdCQUFBLENBQUEsQ0FBQTs7QUFFQSxNQUFBLEdBQUEsR0FBQSxPQUFBLENBQUEsTUFBQSxDQUFBLGFBQUEsRUFBQSxFQUFBLENBQUEsQ0FBQTs7QUFFQSxLQUFBLENBQUEsT0FBQSxDQUFBLFFBQUEsRUFBQSxZQUFBO0FBQ0EsUUFBQSxDQUFBLE1BQUEsQ0FBQSxFQUFBLEVBQUEsTUFBQSxJQUFBLEtBQUEsQ0FBQSxzQkFBQSxDQUFBLENBQUE7QUFDQSxXQUFBLE1BQUEsQ0FBQSxFQUFBLENBQUEsTUFBQSxDQUFBLFFBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTtHQUNBLENBQUEsQ0FBQTs7Ozs7QUFLQSxLQUFBLENBQUEsUUFBQSxDQUFBLGFBQUEsRUFBQTtBQUNBLGdCQUFBLEVBQUEsb0JBQUE7QUFDQSxlQUFBLEVBQUEsbUJBQUE7QUFDQSxpQkFBQSxFQUFBLHFCQUFBO0FBQ0Esa0JBQUEsRUFBQSxzQkFBQTtBQUNBLG9CQUFBLEVBQUEsd0JBQUE7QUFDQSxpQkFBQSxFQUFBLHFCQUFBO0dBQ0EsQ0FBQSxDQUFBOztBQUVBLEtBQUEsQ0FBQSxPQUFBLENBQUEsaUJBQUEsRUFBQSxVQUFBLFVBQUEsRUFBQSxFQUFBLEVBQUEsV0FBQSxFQUFBO0FBQ0EsUUFBQSxVQUFBLEdBQUE7QUFDQSxTQUFBLEVBQUEsV0FBQSxDQUFBLGdCQUFBO0FBQ0EsU0FBQSxFQUFBLFdBQUEsQ0FBQSxhQUFBO0FBQ0EsU0FBQSxFQUFBLFdBQUEsQ0FBQSxjQUFBO0FBQ0EsU0FBQSxFQUFBLFdBQUEsQ0FBQSxjQUFBO0tBQ0EsQ0FBQTtBQUNBLFdBQUE7QUFDQSxtQkFBQSxFQUFBLHVCQUFBLFFBQUEsRUFBQTtBQUNBLGtCQUFBLENBQUEsVUFBQSxDQUFBLFVBQUEsQ0FBQSxRQUFBLENBQUEsTUFBQSxDQUFBLEVBQUEsUUFBQSxDQUFBLENBQUE7QUFDQSxlQUFBLEVBQUEsQ0FBQSxNQUFBLENBQUEsUUFBQSxDQUFBLENBQUE7T0FDQTtLQUNBLENBQUE7R0FDQSxDQUFBLENBQUE7O0FBRUEsS0FBQSxDQUFBLE1BQUEsQ0FBQSxVQUFBLGFBQUEsRUFBQTtBQUNBLGlCQUFBLENBQUEsWUFBQSxDQUFBLElBQUEsQ0FBQSxDQUNBLFdBQUEsRUFDQSxVQUFBLFNBQUEsRUFBQTtBQUNBLGFBQUEsU0FBQSxDQUFBLEdBQUEsQ0FBQSxpQkFBQSxDQUFBLENBQUE7S0FDQSxDQUNBLENBQUEsQ0FBQTtHQUNBLENBQUEsQ0FBQTs7QUFFQSxLQUFBLENBQUEsT0FBQSxDQUFBLGFBQUEsRUFBQSxVQUFBLEtBQUEsRUFBQSxPQUFBLEVBQUEsVUFBQSxFQUFBLFdBQUEsRUFBQSxFQUFBLEVBQUEsSUFBQSxFQUFBOztBQUVBLGFBQUEsaUJBQUEsQ0FBQSxRQUFBLEVBQUE7QUFDQSxVQUFBLElBQUEsR0FBQSxRQUFBLENBQUEsSUFBQSxDQUFBO0FBQ0EsYUFBQSxDQUFBLE1BQUEsQ0FBQSxJQUFBLENBQUEsRUFBQSxFQUFBLElBQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQTtBQUNBLGdCQUFBLENBQUEsVUFBQSxDQUFBLFdBQUEsQ0FBQSxZQUFBLENBQUEsQ0FBQTtBQUNBLGFBQUEsSUFBQSxDQUFBLElBQUEsQ0FBQTtLQUNBOzs7O0FBSUEsUUFBQSxDQUFBLGVBQUEsR0FBQSxZQUFBO0FBQ0EsYUFBQSxDQUFBLENBQUEsT0FBQSxDQUFBLElBQUEsQ0FBQTtLQUNBLENBQUE7O0FBRUEsUUFBQSxDQUFBLGVBQUEsR0FBQSxVQUFBLFVBQUEsRUFBQTs7Ozs7Ozs7OztBQVVBLFVBQUEsSUFBQSxDQUFBLGVBQUEsRUFBQSxJQUFBLFVBQUEsS0FBQSxJQUFBLEVBQUE7QUFDQSxlQUFBLEVBQUEsQ0FBQSxJQUFBLENBQUEsT0FBQSxDQUFBLElBQUEsQ0FBQSxDQUFBO09BQ0E7Ozs7O0FBS0EsYUFBQSxLQUFBLENBQUEsR0FBQSxDQUFBLFVBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxpQkFBQSxDQUFBLFNBQUEsQ0FBQSxZQUFBO0FBQ0EsZUFBQSxJQUFBLENBQUE7T0FDQSxDQUFBLENBQUE7S0FFQSxDQUFBOztBQUVBLFFBQUEsQ0FBQSxLQUFBLEdBQUEsVUFBQSxXQUFBLEVBQUE7QUFDQSxhQUFBLEtBQUEsQ0FBQSxJQUFBLENBQUEsUUFBQSxFQUFBLFdBQUEsQ0FBQSxDQUNBLElBQUEsQ0FBQSxpQkFBQSxDQUFBLFNBQ0EsQ0FBQSxZQUFBO0FBQ0EsZUFBQSxFQUFBLENBQUEsTUFBQSxDQUFBLEVBQUEsT0FBQSxFQUFBLDRCQUFBLEVBQUEsQ0FBQSxDQUFBO09BQ0EsQ0FBQSxDQUFBO0tBQ0EsQ0FBQTs7QUFFQSxRQUFBLENBQUEsTUFBQSxHQUFBLFlBQUE7QUFDQSxhQUFBLEtBQUEsQ0FBQSxHQUFBLENBQUEsU0FBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFlBQUE7QUFDQSxlQUFBLENBQUEsT0FBQSxFQUFBLENBQUE7QUFDQSxrQkFBQSxDQUFBLFVBQUEsQ0FBQSxXQUFBLENBQUEsYUFBQSxDQUFBLENBQUE7T0FDQSxDQUFBLENBQUE7S0FDQSxDQUFBO0dBRUEsQ0FBQSxDQUFBOztBQUVBLEtBQUEsQ0FBQSxPQUFBLENBQUEsU0FBQSxFQUFBLFVBQUEsVUFBQSxFQUFBLFdBQUEsRUFBQTs7QUFFQSxRQUFBLElBQUEsR0FBQSxJQUFBLENBQUE7O0FBRUEsY0FBQSxDQUFBLEdBQUEsQ0FBQSxXQUFBLENBQUEsZ0JBQUEsRUFBQSxZQUFBO0FBQ0EsVUFBQSxDQUFBLE9BQUEsRUFBQSxDQUFBO0tBQ0EsQ0FBQSxDQUFBOztBQUVBLGNBQUEsQ0FBQSxHQUFBLENBQUEsV0FBQSxDQUFBLGNBQUEsRUFBQSxZQUFBO0FBQ0EsVUFBQSxDQUFBLE9BQUEsRUFBQSxDQUFBO0tBQ0EsQ0FBQSxDQUFBOztBQUVBLFFBQUEsQ0FBQSxFQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsUUFBQSxDQUFBLElBQUEsR0FBQSxJQUFBLENBQUE7O0FBRUEsUUFBQSxDQUFBLE1BQUEsR0FBQSxVQUFBLFNBQUEsRUFBQSxJQUFBLEVBQUE7QUFDQSxVQUFBLENBQUEsRUFBQSxHQUFBLFNBQUEsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxJQUFBLEdBQUEsSUFBQSxDQUFBO0tBQ0EsQ0FBQTs7QUFFQSxRQUFBLENBQUEsT0FBQSxHQUFBLFlBQUE7QUFDQSxVQUFBLENBQUEsRUFBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxJQUFBLEdBQUEsSUFBQSxDQUFBO0tBQ0EsQ0FBQTtHQUVBLENBQUEsQ0FBQTtDQUVBLENBQUEsRUFBQSxDQUFBOztBQ3BJQSxHQUFBLENBQUEsTUFBQSxDQUFBLFVBQUEsY0FBQSxFQUFBO0FBQ0EsZ0JBQUEsQ0FBQSxLQUFBLENBQUEsTUFBQSxFQUFBO0FBQ0EsT0FBQSxFQUFBLE9BQUE7QUFDQSxlQUFBLEVBQUEsbUJBQUE7R0FDQSxDQUFBLENBQUE7Q0FDQSxDQUFBLENBQUE7O0FDTEEsR0FBQSxDQUFBLE1BQUEsQ0FBQSxVQUFBLGNBQUEsRUFBQTtBQUNBLGdCQUFBLENBQUEsS0FBQSxDQUFBLE1BQUEsRUFBQTtBQUNBLE9BQUEsRUFBQSxHQUFBO0FBQ0EsZUFBQSxFQUFBLG1CQUFBO0FBQ0EsY0FBQSxFQUFBLG9CQUFBLE1BQUEsRUFBQSxLQUFBLEVBQUEsTUFBQSxFQUFBO0FBQ0EsWUFBQSxDQUFBLEtBQUEsR0FBQSxLQUFBLENBQUE7QUFDQSxZQUFBLENBQUEsTUFBQSxHQUFBLE1BQUEsQ0FBQTs7O0FBR0EsWUFBQSxDQUFBLFNBQUEsR0FBQTtlQUFBLFNBQUEsQ0FBQSxTQUFBLENBQUEsV0FBQSxFQUFBLENBQUEsUUFBQSxDQUFBLFFBQUEsQ0FBQTtPQUFBLENBQUE7S0FDQTtBQUNBLFdBQUEsRUFBQTtBQUNBLFdBQUEsRUFBQSxlQUFBLElBQUE7ZUFBQSxJQUFBLENBQUEsT0FBQSxDQUFBLEVBQUEsRUFBQSxFQUFBLFdBQUEsRUFBQSxJQUFBLEVBQUEsQ0FBQTtPQUFBO0FBQ0EsWUFBQSxFQUFBLGdCQUFBLEtBQUE7ZUFBQSxLQUFBLENBQUEsT0FBQSxDQUFBLEVBQUEsRUFBQSxFQUFBLFdBQUEsRUFBQSxJQUFBLEVBQUEsQ0FBQTtPQUFBO0tBQ0E7R0FDQSxDQUFBLENBQUE7Q0FDQSxDQUFBLENBQUE7O0FDaEJBLEdBQUEsQ0FBQSxNQUFBLENBQUEsVUFBQSxjQUFBLEVBQUE7O0FBRUEsZ0JBQUEsQ0FBQSxLQUFBLENBQUEsT0FBQSxFQUFBO0FBQ0EsT0FBQSxFQUFBLFFBQUE7QUFDQSxlQUFBLEVBQUEscUJBQUE7QUFDQSxjQUFBLEVBQUEsV0FBQTtHQUNBLENBQUEsQ0FBQTtDQUVBLENBQUEsQ0FBQTs7QUFFQSxHQUFBLENBQUEsVUFBQSxDQUFBLFdBQUEsRUFBQSxVQUFBLE1BQUEsRUFBQSxXQUFBLEVBQUEsTUFBQSxFQUFBOztBQUVBLFFBQUEsQ0FBQSxLQUFBLEdBQUEsRUFBQSxDQUFBO0FBQ0EsUUFBQSxDQUFBLEtBQUEsR0FBQSxJQUFBLENBQUE7O0FBRUEsUUFBQSxDQUFBLFNBQUEsR0FBQSxVQUFBLFNBQUEsRUFBQTs7QUFFQSxVQUFBLENBQUEsS0FBQSxHQUFBLElBQUEsQ0FBQTs7QUFFQSxlQUFBLENBQUEsS0FBQSxDQUFBLFNBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLElBQUEsRUFBQTtBQUNBLFlBQUEsQ0FBQSxFQUFBLENBQUEsTUFBQSxFQUFBLEVBQUEsRUFBQSxFQUFBLElBQUEsQ0FBQSxHQUFBLEVBQUEsQ0FBQSxDQUFBO0tBQ0EsQ0FBQSxTQUFBLENBQUEsWUFBQTtBQUNBLFlBQUEsQ0FBQSxLQUFBLEdBQUEsNEJBQUEsQ0FBQTtLQUNBLENBQUEsQ0FBQTtHQUVBLENBQUE7Q0FFQSxDQUFBLENBQUE7O0FDM0JBLEdBQUEsQ0FBQSxNQUFBLENBQUEsVUFBQSxjQUFBLEVBQUE7O0FBRUEsZ0JBQUEsQ0FBQSxLQUFBLENBQUEsYUFBQSxFQUFBO0FBQ0EsT0FBQSxFQUFBLGVBQUE7QUFDQSxZQUFBLEVBQUEsRUFBQTtBQUNBLGNBQUEsRUFBQSxvQkFBQSxNQUFBLEVBQUEsRUFBQTs7OztBQUlBLFFBQUEsRUFBQTtBQUNBLGtCQUFBLEVBQUEsSUFBQTtLQUNBO0dBQ0EsQ0FBQSxDQUFBO0NBRUEsQ0FBQSxDQUFBOztBQ2RBLEdBQUEsQ0FBQSxNQUFBLENBQUEsVUFBQSxjQUFBLEVBQUE7QUFDQSxnQkFBQSxDQUFBLEtBQUEsQ0FBQSxNQUFBLEVBQUE7QUFDQSxPQUFBLEVBQUEsY0FBQTtBQUNBLGVBQUEsRUFBQSxtQ0FBQTtBQUNBLGNBQUEsRUFBQSxvQkFBQSxNQUFBLEVBQUEsSUFBQSxFQUFBLE1BQUEsRUFBQTtBQUNBLFlBQUEsQ0FBQSxJQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsWUFBQSxDQUFBLE1BQUEsR0FBQSxNQUFBLENBQUE7OztBQUdBLFlBQUEsQ0FBQSxJQUFBLEdBQUE7QUFDQSxZQUFBLEVBQUEsYUFBQTtBQUNBLGFBQUEsRUFBQSxFQUFBO0FBQ0EsaUJBQUEsRUFBQSxjQUFBO0FBQ0EsZUFBQSxFQUFBLENBQUE7QUFDQSxlQUFBLEVBQUEsSUFBQTtBQUNBLHFCQUFBLEVBQUEsU0FBQTtBQUNBLHlCQUFBLEVBQUEsU0FBQTtBQUNBLHNCQUFBLEVBQUEseUNBQUE7QUFDQSxpQkFBQSxFQUFBLCtCQUFBO0FBQ0EsZUFBQSxFQUFBO0FBQ0EsZUFBQSxFQUFBLENBQ0E7QUFDQSxpQkFBQSxFQUFBO0FBQ0Esa0JBQUEsRUFBQSxvREFBQTtBQUNBLGtCQUFBLEVBQUEsb0NBQUE7YUFDQTtBQUNBLGVBQUEsRUFBQSwrQkFBQTtBQUNBLGtCQUFBLEVBQUEsSUFBQTtBQUNBLGdCQUFBLEVBQUE7QUFDQSxrQkFBQSxFQUFBLGlEQUFBO0FBQ0Esa0JBQUEsRUFBQSxZQUFBO2FBQ0E7QUFDQSxvQkFBQSxFQUFBO0FBQ0Esa0JBQUEsRUFBQSwrQ0FBQTtBQUNBLGtCQUFBLEVBQUEsSUFBQTthQUNBO0FBQ0EsaUJBQUEsRUFBQSxDQUFBO1dBQ0EsRUFDQTtBQUNBLGlCQUFBLEVBQUE7QUFDQSxrQkFBQSxFQUFBLDBHQUFBO0FBQ0Esa0JBQUEsRUFBQSxrRkFBQTthQUNBO0FBQ0EsZUFBQSxFQUFBLCtCQUFBO0FBQ0Esa0JBQUEsRUFBQSxLQUFBO0FBQ0EsZ0JBQUEsRUFBQTtBQUNBLGtCQUFBLEVBQUEsbURBQUE7QUFDQSxrQkFBQSxFQUFBLGNBQUE7YUFDQTtBQUNBLG9CQUFBLEVBQUE7QUFDQSxrQkFBQSxFQUFBLCtDQUFBO0FBQ0Esa0JBQUEsRUFBQSxLQUFBO2FBQ0E7QUFDQSxpQkFBQSxFQUFBLENBQUE7V0FDQSxFQUNBO0FBQ0EsaUJBQUEsRUFBQTtBQUNBLGtCQUFBLEVBQUEseUZBQUE7QUFDQSxrQkFBQSxFQUFBLHdEQUFBO2FBQ0E7QUFDQSxlQUFBLEVBQUEsK0JBQUE7QUFDQSxrQkFBQSxFQUFBLEtBQUE7QUFDQSxnQkFBQSxFQUFBO0FBQ0Esa0JBQUEsRUFBQSw0Q0FBQTtBQUNBLGtCQUFBLEVBQUEsT0FBQTthQUNBO0FBQ0Esb0JBQUEsRUFBQTtBQUNBLGtCQUFBLEVBQUEsK0NBQUE7QUFDQSxrQkFBQSxFQUFBLEtBQUE7YUFDQTtBQUNBLGlCQUFBLEVBQUEsQ0FBQTtXQUNBLEVBQ0E7QUFDQSxpQkFBQSxFQUFBO0FBQ0Esa0JBQUEsRUFBQSxrQ0FBQTtBQUNBLGtCQUFBLEVBQUEsK0NBQUE7YUFDQTtBQUNBLGVBQUEsRUFBQSwrQkFBQTtBQUNBLGtCQUFBLEVBQUEsSUFBQTtBQUNBLGdCQUFBLEVBQUE7QUFDQSxrQkFBQSxFQUFBLDRDQUFBO0FBQ0Esa0JBQUEsRUFBQSxPQUFBO2FBQ0E7QUFDQSxvQkFBQSxFQUFBO0FBQ0Esa0JBQUEsRUFBQSwrQ0FBQTtBQUNBLGtCQUFBLEVBQUEsR0FBQTthQUNBO0FBQ0EsaUJBQUEsRUFBQSxDQUFBO1dBQ0EsRUFDQTtBQUNBLGlCQUFBLEVBQUE7QUFDQSxrQkFBQSxFQUFBLCtHQUFBO0FBQ0Esa0JBQUEsRUFBQSx3RUFBQTthQUNBO0FBQ0EsZUFBQSxFQUFBLCtCQUFBO0FBQ0Esa0JBQUEsRUFBQSxJQUFBO0FBQ0EsZ0JBQUEsRUFBQTtBQUNBLGtCQUFBLEVBQUEsa0RBQUE7QUFDQSxrQkFBQSxFQUFBLGFBQUE7YUFDQTtBQUNBLG9CQUFBLEVBQUE7QUFDQSxrQkFBQSxFQUFBLCtDQUFBO0FBQ0Esa0JBQUEsRUFBQSxHQUFBO2FBQ0E7QUFDQSxpQkFBQSxFQUFBLENBQUE7V0FDQSxFQUNBO0FBQ0EsaUJBQUEsRUFBQTtBQUNBLGtCQUFBLEVBQUEsa0RBQUE7QUFDQSxrQkFBQSxFQUFBLHdCQUFBO2FBQ0E7QUFDQSxlQUFBLEVBQUEsK0JBQUE7QUFDQSxrQkFBQSxFQUFBLEtBQUE7QUFDQSxnQkFBQSxFQUFBO0FBQ0Esa0JBQUEsRUFBQSxvREFBQTtBQUNBLGtCQUFBLEVBQUEsZUFBQTthQUNBO0FBQ0Esb0JBQUEsRUFBQTtBQUNBLGtCQUFBLEVBQUEsK0NBQUE7QUFDQSxrQkFBQSxFQUFBLElBQUE7YUFDQTtBQUNBLGlCQUFBLEVBQUEsQ0FBQTtXQUNBLEVBQ0E7QUFDQSxpQkFBQSxFQUFBO0FBQ0Esa0JBQUEsRUFBQSxrQ0FBQTtBQUNBLGtCQUFBLEVBQUEsb0NBQUE7YUFDQTtBQUNBLGVBQUEsRUFBQSwrQkFBQTtBQUNBLGtCQUFBLEVBQUEsSUFBQTtBQUNBLGdCQUFBLEVBQUE7QUFDQSxrQkFBQSxFQUFBLDZDQUFBO0FBQ0Esa0JBQUEsRUFBQSxRQUFBO2FBQ0E7QUFDQSxvQkFBQSxFQUFBO0FBQ0Esa0JBQUEsRUFBQSwrQ0FBQTtBQUNBLGtCQUFBLEVBQUEsSUFBQTthQUNBO0FBQ0EsaUJBQUEsRUFBQSxDQUFBO1dBQ0EsRUFDQTtBQUNBLGlCQUFBLEVBQUE7QUFDQSxrQkFBQSxFQUFBLDZDQUFBO0FBQ0Esa0JBQUEsRUFBQSxpQ0FBQTthQUNBO0FBQ0EsZUFBQSxFQUFBLCtCQUFBO0FBQ0Esa0JBQUEsRUFBQSxJQUFBO0FBQ0EsZ0JBQUEsRUFBQTtBQUNBLGtCQUFBLEVBQUEsMkNBQUE7QUFDQSxrQkFBQSxFQUFBLE1BQUE7YUFDQTtBQUNBLG9CQUFBLEVBQUE7QUFDQSxrQkFBQSxFQUFBLCtDQUFBO0FBQ0Esa0JBQUEsRUFBQSxJQUFBO2FBQ0E7QUFDQSxpQkFBQSxFQUFBLENBQUE7V0FDQSxFQUNBO0FBQ0EsaUJBQUEsRUFBQTtBQUNBLGtCQUFBLEVBQUEsMkNBQUE7QUFDQSxrQkFBQSxFQUFBLHNEQUFBO2FBQ0E7QUFDQSxlQUFBLEVBQUEsK0JBQUE7QUFDQSxrQkFBQSxFQUFBLElBQUE7QUFDQSxnQkFBQSxFQUFBO0FBQ0Esa0JBQUEsRUFBQSxrREFBQTtBQUNBLGtCQUFBLEVBQUEsYUFBQTthQUNBO0FBQ0Esb0JBQUEsRUFBQTtBQUNBLGtCQUFBLEVBQUEsK0NBQUE7QUFDQSxrQkFBQSxFQUFBLEdBQUE7YUFDQTtBQUNBLGlCQUFBLEVBQUEsQ0FBQTtXQUNBLEVBQ0E7QUFDQSxpQkFBQSxFQUFBO0FBQ0Esa0JBQUEsRUFBQSx3RUFBQTtBQUNBLGtCQUFBLEVBQUEsZ0RBQUE7YUFDQTtBQUNBLGVBQUEsRUFBQSwrQkFBQTtBQUNBLGtCQUFBLEVBQUEsR0FBQTtBQUNBLGdCQUFBLEVBQUE7QUFDQSxrQkFBQSxFQUFBLGdEQUFBO0FBQ0Esa0JBQUEsRUFBQSxXQUFBO2FBQ0E7QUFDQSxvQkFBQSxFQUFBO0FBQ0Esa0JBQUEsRUFBQSxFQUFBO0FBQ0Esa0JBQUEsRUFBQSxFQUFBO2FBQ0E7QUFDQSxpQkFBQSxFQUFBLEVBQUE7V0FDQSxFQUNBO0FBQ0EsaUJBQUEsRUFBQTtBQUNBLGtCQUFBLEVBQUEsb0RBQUE7QUFDQSxrQkFBQSxFQUFBLGlCQUFBO2FBQ0E7QUFDQSxlQUFBLEVBQUEsK0JBQUE7QUFDQSxrQkFBQSxFQUFBLEtBQUE7QUFDQSxnQkFBQSxFQUFBO0FBQ0Esa0JBQUEsRUFBQSwyQ0FBQTtBQUNBLGtCQUFBLEVBQUEsTUFBQTthQUNBO0FBQ0Esb0JBQUEsRUFBQTtBQUNBLGtCQUFBLEVBQUEsK0NBQUE7QUFDQSxrQkFBQSxFQUFBLElBQUE7YUFDQTtBQUNBLGlCQUFBLEVBQUEsRUFBQTtXQUNBLEVBQ0E7QUFDQSxpQkFBQSxFQUFBO0FBQ0Esa0JBQUEsRUFBQSw2RUFBQTtBQUNBLGtCQUFBLEVBQUEsd0JBQUE7YUFDQTtBQUNBLGVBQUEsRUFBQSwrQkFBQTtBQUNBLGtCQUFBLEVBQUEsS0FBQTtBQUNBLGdCQUFBLEVBQUE7QUFDQSxrQkFBQSxFQUFBLDhDQUFBO0FBQ0Esa0JBQUEsRUFBQSxTQUFBO2FBQ0E7QUFDQSxvQkFBQSxFQUFBO0FBQ0Esa0JBQUEsRUFBQSwrQ0FBQTtBQUNBLGtCQUFBLEVBQUEsSUFBQTthQUNBO0FBQ0EsaUJBQUEsRUFBQSxFQUFBO1dBQ0EsRUFDQTtBQUNBLGlCQUFBLEVBQUE7QUFDQSxrQkFBQSxFQUFBLHFGQUFBO0FBQ0Esa0JBQUEsRUFBQSx1REFBQTthQUNBO0FBQ0EsZUFBQSxFQUFBLCtCQUFBO0FBQ0Esa0JBQUEsRUFBQSxLQUFBO0FBQ0EsZ0JBQUEsRUFBQTtBQUNBLGtCQUFBLEVBQUEsNkNBQUE7QUFDQSxrQkFBQSxFQUFBLFFBQUE7YUFDQTtBQUNBLG9CQUFBLEVBQUE7QUFDQSxrQkFBQSxFQUFBLCtDQUFBO0FBQ0Esa0JBQUEsRUFBQSxLQUFBO2FBQ0E7QUFDQSxpQkFBQSxFQUFBLEVBQUE7V0FDQSxFQUNBO0FBQ0EsaUJBQUEsRUFBQTtBQUNBLGtCQUFBLEVBQUEseURBQUE7QUFDQSxrQkFBQSxFQUFBLGdEQUFBO2FBQ0E7QUFDQSxlQUFBLEVBQUEsK0JBQUE7QUFDQSxrQkFBQSxFQUFBLElBQUE7QUFDQSxnQkFBQSxFQUFBO0FBQ0Esa0JBQUEsRUFBQSw4Q0FBQTtBQUNBLGtCQUFBLEVBQUEsU0FBQTthQUNBO0FBQ0Esb0JBQUEsRUFBQTtBQUNBLGtCQUFBLEVBQUEsK0NBQUE7QUFDQSxrQkFBQSxFQUFBLEdBQUE7YUFDQTtBQUNBLGlCQUFBLEVBQUEsRUFBQTtXQUNBLEVBQ0E7QUFDQSxpQkFBQSxFQUFBO0FBQ0Esa0JBQUEsRUFBQSxxREFBQTtBQUNBLGtCQUFBLEVBQUEsdUNBQUE7YUFDQTtBQUNBLGVBQUEsRUFBQSwrQkFBQTtBQUNBLGtCQUFBLEVBQUEsSUFBQTtBQUNBLGdCQUFBLEVBQUE7QUFDQSxrQkFBQSxFQUFBLGdEQUFBO0FBQ0Esa0JBQUEsRUFBQSxXQUFBO2FBQ0E7QUFDQSxvQkFBQSxFQUFBO0FBQ0Esa0JBQUEsRUFBQSwrQ0FBQTtBQUNBLGtCQUFBLEVBQUEsSUFBQTthQUNBO0FBQ0EsaUJBQUEsRUFBQSxFQUFBO1dBQ0EsRUFDQTtBQUNBLGlCQUFBLEVBQUE7QUFDQSxrQkFBQSxFQUFBLG9CQUFBO0FBQ0Esa0JBQUEsRUFBQSxrRUFBQTthQUNBO0FBQ0EsZUFBQSxFQUFBLCtCQUFBO0FBQ0Esa0JBQUEsRUFBQSxLQUFBO0FBQ0EsZ0JBQUEsRUFBQTtBQUNBLGtCQUFBLEVBQUEsZ0RBQUE7QUFDQSxrQkFBQSxFQUFBLFdBQUE7YUFDQTtBQUNBLG9CQUFBLEVBQUE7QUFDQSxrQkFBQSxFQUFBLCtDQUFBO0FBQ0Esa0JBQUEsRUFBQSxJQUFBO2FBQ0E7QUFDQSxpQkFBQSxFQUFBLEVBQUE7V0FDQSxFQUNBO0FBQ0EsaUJBQUEsRUFBQTtBQUNBLGtCQUFBLEVBQUEsb0RBQUE7QUFDQSxrQkFBQSxFQUFBLHVCQUFBO2FBQ0E7QUFDQSxlQUFBLEVBQUEsK0JBQUE7QUFDQSxrQkFBQSxFQUFBLElBQUE7QUFDQSxnQkFBQSxFQUFBO0FBQ0Esa0JBQUEsRUFBQSxrREFBQTtBQUNBLGtCQUFBLEVBQUEsYUFBQTthQUNBO0FBQ0Esb0JBQUEsRUFBQTtBQUNBLGtCQUFBLEVBQUEsK0NBQUE7QUFDQSxrQkFBQSxFQUFBLElBQUE7YUFDQTtBQUNBLGlCQUFBLEVBQUEsRUFBQTtXQUNBLEVBQ0E7QUFDQSxpQkFBQSxFQUFBO0FBQ0Esa0JBQUEsRUFBQSx1RUFBQTtBQUNBLGtCQUFBLEVBQUEsOEJBQUE7YUFDQTtBQUNBLGVBQUEsRUFBQSwrQkFBQTtBQUNBLGtCQUFBLEVBQUEsSUFBQTtBQUNBLGdCQUFBLEVBQUE7QUFDQSxrQkFBQSxFQUFBLDZDQUFBO0FBQ0Esa0JBQUEsRUFBQSxRQUFBO2FBQ0E7QUFDQSxvQkFBQSxFQUFBO0FBQ0Esa0JBQUEsRUFBQSwrQ0FBQTtBQUNBLGtCQUFBLEVBQUEsSUFBQTthQUNBO0FBQ0EsaUJBQUEsRUFBQSxFQUFBO1dBQ0EsRUFDQTtBQUNBLGlCQUFBLEVBQUE7QUFDQSxrQkFBQSxFQUFBLGtJQUFBO0FBQ0Esa0JBQUEsRUFBQSw0Q0FBQTthQUNBO0FBQ0EsZUFBQSxFQUFBLCtCQUFBO0FBQ0Esa0JBQUEsRUFBQSxJQUFBO0FBQ0EsZ0JBQUEsRUFBQTtBQUNBLGtCQUFBLEVBQUEsK0NBQUE7QUFDQSxrQkFBQSxFQUFBLFVBQUE7YUFDQTtBQUNBLG9CQUFBLEVBQUE7QUFDQSxrQkFBQSxFQUFBLCtDQUFBO0FBQ0Esa0JBQUEsRUFBQSxJQUFBO2FBQ0E7QUFDQSxpQkFBQSxFQUFBLEVBQUE7V0FDQSxFQUNBO0FBQ0EsaUJBQUEsRUFBQTtBQUNBLGtCQUFBLEVBQUEsc0NBQUE7QUFDQSxrQkFBQSxFQUFBLGtFQUFBO2FBQ0E7QUFDQSxlQUFBLEVBQUEsK0JBQUE7QUFDQSxrQkFBQSxFQUFBLEtBQUE7QUFDQSxnQkFBQSxFQUFBO0FBQ0Esa0JBQUEsRUFBQSwwQ0FBQTtBQUNBLGtCQUFBLEVBQUEsS0FBQTthQUNBO0FBQ0Esb0JBQUEsRUFBQTtBQUNBLGtCQUFBLEVBQUEsK0NBQUE7QUFDQSxrQkFBQSxFQUFBLElBQUE7YUFDQTtBQUNBLGlCQUFBLEVBQUEsRUFBQTtXQUNBLEVBQ0E7QUFDQSxpQkFBQSxFQUFBO0FBQ0Esa0JBQUEsRUFBQSx1SEFBQTtBQUNBLGtCQUFBLEVBQUEsb0VBQUE7YUFDQTtBQUNBLGVBQUEsRUFBQSwrQkFBQTtBQUNBLGtCQUFBLEVBQUEsSUFBQTtBQUNBLGdCQUFBLEVBQUE7QUFDQSxrQkFBQSxFQUFBLDJDQUFBO0FBQ0Esa0JBQUEsRUFBQSxNQUFBO2FBQ0E7QUFDQSxvQkFBQSxFQUFBO0FBQ0Esa0JBQUEsRUFBQSwrQ0FBQTtBQUNBLGtCQUFBLEVBQUEsSUFBQTthQUNBO0FBQ0EsaUJBQUEsRUFBQSxFQUFBO1dBQ0EsRUFDQTtBQUNBLGlCQUFBLEVBQUE7QUFDQSxrQkFBQSxFQUFBLDhEQUFBO0FBQ0Esa0JBQUEsRUFBQSxpQ0FBQTthQUNBO0FBQ0EsZUFBQSxFQUFBLCtCQUFBO0FBQ0Esa0JBQUEsRUFBQSxLQUFBO0FBQ0EsZ0JBQUEsRUFBQTtBQUNBLGtCQUFBLEVBQUEsOENBQUE7QUFDQSxrQkFBQSxFQUFBLFNBQUE7YUFDQTtBQUNBLG9CQUFBLEVBQUE7QUFDQSxrQkFBQSxFQUFBLCtDQUFBO0FBQ0Esa0JBQUEsRUFBQSxLQUFBO2FBQ0E7QUFDQSxpQkFBQSxFQUFBLEVBQUE7V0FDQSxFQUNBO0FBQ0EsaUJBQUEsRUFBQTtBQUNBLGtCQUFBLEVBQUEsOEZBQUE7QUFDQSxrQkFBQSxFQUFBLGlFQUFBO2FBQ0E7QUFDQSxlQUFBLEVBQUEsK0JBQUE7QUFDQSxrQkFBQSxFQUFBLEtBQUE7QUFDQSxnQkFBQSxFQUFBO0FBQ0Esa0JBQUEsRUFBQSw4Q0FBQTtBQUNBLGtCQUFBLEVBQUEsU0FBQTthQUNBO0FBQ0Esb0JBQUEsRUFBQTtBQUNBLGtCQUFBLEVBQUEsK0NBQUE7QUFDQSxrQkFBQSxFQUFBLElBQUE7YUFDQTtBQUNBLGlCQUFBLEVBQUEsRUFBQTtXQUNBLEVBQ0E7QUFDQSxpQkFBQSxFQUFBO0FBQ0Esa0JBQUEsRUFBQSxvRUFBQTtBQUNBLGtCQUFBLEVBQUEsOEJBQUE7YUFDQTtBQUNBLGVBQUEsRUFBQSwrQkFBQTtBQUNBLGtCQUFBLEVBQUEsR0FBQTtBQUNBLGdCQUFBLEVBQUE7QUFDQSxrQkFBQSxFQUFBLGtEQUFBO0FBQ0Esa0JBQUEsRUFBQSxhQUFBO2FBQ0E7QUFDQSxvQkFBQSxFQUFBO0FBQ0Esa0JBQUEsRUFBQSxFQUFBO0FBQ0Esa0JBQUEsRUFBQSxFQUFBO2FBQ0E7QUFDQSxpQkFBQSxFQUFBLEVBQUE7V0FDQSxFQUNBO0FBQ0EsaUJBQUEsRUFBQTtBQUNBLGtCQUFBLEVBQUEsb0RBQUE7QUFDQSxrQkFBQSxFQUFBLG9EQUFBO2FBQ0E7QUFDQSxlQUFBLEVBQUEsK0JBQUE7QUFDQSxrQkFBQSxFQUFBLElBQUE7QUFDQSxnQkFBQSxFQUFBO0FBQ0Esa0JBQUEsRUFBQSwwQ0FBQTtBQUNBLGtCQUFBLEVBQUEsS0FBQTthQUNBO0FBQ0Esb0JBQUEsRUFBQTtBQUNBLGtCQUFBLEVBQUEsK0NBQUE7QUFDQSxrQkFBQSxFQUFBLEdBQUE7YUFDQTtBQUNBLGlCQUFBLEVBQUEsRUFBQTtXQUNBLEVBQ0E7QUFDQSxpQkFBQSxFQUFBO0FBQ0Esa0JBQUEsRUFBQSwyREFBQTtBQUNBLGtCQUFBLEVBQUEsa0NBQUE7YUFDQTtBQUNBLGVBQUEsRUFBQSwrQkFBQTtBQUNBLGtCQUFBLEVBQUEsSUFBQTtBQUNBLGdCQUFBLEVBQUE7QUFDQSxrQkFBQSxFQUFBLDhDQUFBO0FBQ0Esa0JBQUEsRUFBQSxTQUFBO2FBQ0E7QUFDQSxvQkFBQSxFQUFBO0FBQ0Esa0JBQUEsRUFBQSwrQ0FBQTtBQUNBLGtCQUFBLEVBQUEsSUFBQTthQUNBO0FBQ0EsaUJBQUEsRUFBQSxFQUFBO1dBQ0EsRUFDQTtBQUNBLGlCQUFBLEVBQUE7QUFDQSxrQkFBQSxFQUFBLG1EQUFBO0FBQ0Esa0JBQUEsRUFBQSw0QkFBQTthQUNBO0FBQ0EsZUFBQSxFQUFBLCtCQUFBO0FBQ0Esa0JBQUEsRUFBQSxJQUFBO0FBQ0EsZ0JBQUEsRUFBQTtBQUNBLGtCQUFBLEVBQUEsOENBQUE7QUFDQSxrQkFBQSxFQUFBLFNBQUE7YUFDQTtBQUNBLG9CQUFBLEVBQUE7QUFDQSxrQkFBQSxFQUFBLCtDQUFBO0FBQ0Esa0JBQUEsRUFBQSxHQUFBO2FBQ0E7QUFDQSxpQkFBQSxFQUFBLEVBQUE7V0FDQSxFQUNBO0FBQ0EsaUJBQUEsRUFBQTtBQUNBLGtCQUFBLEVBQUEscUhBQUE7QUFDQSxrQkFBQSxFQUFBLGdGQUFBO2FBQ0E7QUFDQSxlQUFBLEVBQUEsK0JBQUE7QUFDQSxrQkFBQSxFQUFBLEtBQUE7QUFDQSxnQkFBQSxFQUFBO0FBQ0Esa0JBQUEsRUFBQSwrQ0FBQTtBQUNBLGtCQUFBLEVBQUEsVUFBQTthQUNBO0FBQ0Esb0JBQUEsRUFBQTtBQUNBLGtCQUFBLEVBQUEsK0NBQUE7QUFDQSxrQkFBQSxFQUFBLEtBQUE7YUFDQTtBQUNBLGlCQUFBLEVBQUEsRUFBQTtXQUNBLEVBQ0E7QUFDQSxpQkFBQSxFQUFBO0FBQ0Esa0JBQUEsRUFBQSx1QkFBQTtBQUNBLGtCQUFBLEVBQUEsc0VBQUE7YUFDQTtBQUNBLGVBQUEsRUFBQSwrQkFBQTtBQUNBLGtCQUFBLEVBQUEsRUFBQTtBQUNBLGdCQUFBLEVBQUE7QUFDQSxrQkFBQSxFQUFBLEVBQUE7QUFDQSxrQkFBQSxFQUFBLEVBQUE7YUFDQTtBQUNBLG9CQUFBLEVBQUE7QUFDQSxrQkFBQSxFQUFBLEVBQUE7QUFDQSxrQkFBQSxFQUFBLEVBQUE7YUFDQTtBQUNBLGlCQUFBLEVBQUEsRUFBQTtXQUNBLEVBQ0E7QUFDQSxpQkFBQSxFQUFBO0FBQ0Esa0JBQUEsRUFBQSx1RUFBQTtBQUNBLGtCQUFBLEVBQUEsbUNBQUE7YUFDQTtBQUNBLGVBQUEsRUFBQSwrQkFBQTtBQUNBLGtCQUFBLEVBQUEsSUFBQTtBQUNBLGdCQUFBLEVBQUE7QUFDQSxrQkFBQSxFQUFBLCtDQUFBO0FBQ0Esa0JBQUEsRUFBQSxVQUFBO2FBQ0E7QUFDQSxvQkFBQSxFQUFBO0FBQ0Esa0JBQUEsRUFBQSxFQUFBO0FBQ0Esa0JBQUEsRUFBQSxFQUFBO2FBQ0E7QUFDQSxpQkFBQSxFQUFBLEVBQUE7V0FDQSxDQUNBO1NBQ0E7T0FDQSxDQUFBO0tBQ0E7QUFDQSxXQUFBLEVBQUE7QUFDQSxVQUFBLEVBQUEsY0FBQSxZQUFBLEVBQUEsSUFBQTtlQUFBLElBQUEsQ0FBQSxJQUFBLENBQUEsWUFBQSxDQUFBLEVBQUEsQ0FBQTtPQUFBO0FBQ0EsWUFBQSxFQUFBLGdCQUFBLElBQUE7ZUFBQSxJQUFBLENBQUEsU0FBQSxFQUFBO09BQUE7S0FDQTtHQUNBLENBQUEsQ0FBQTtDQUNBLENBQUEsQ0FBQTs7QUM1aEJBLEdBQUEsQ0FBQSxPQUFBLENBQUEsT0FBQSxFQUFBLFVBQUEsTUFBQSxFQUFBLEVBQUEsRUFBQTs7QUFFQSxNQUFBLEtBQUEsR0FBQSxFQUFBLENBQUEsY0FBQSxDQUFBO0FBQ0EsUUFBQSxFQUFBLE9BQUE7QUFDQSxZQUFBLEVBQUEsUUFBQTtBQUNBLGFBQUEsRUFBQTtBQUNBLGVBQUEsRUFBQTtBQUNBLFlBQUEsRUFBQTs7O0FBR0Esb0JBQUEsRUFBQSxPQUFBOzs7QUFHQSxrQkFBQSxFQUFBLE1BQUE7U0FDQTtPQUNBO0tBQ0E7QUFDQSxXQUFBLEVBQUE7QUFDQSxRQUFBLEVBQUEsY0FBQTtBQUNBLGVBQUEsQ0FBQSxHQUFBLG9DQUFBLElBQUEsQ0FBQSxJQUFBLFVBQUEsSUFBQSxDQUFBLEdBQUEsT0FBQSxDQUFBOztPQUVBO0tBQ0E7R0FDQSxDQUFBLENBQUE7O0FBRUEsU0FBQSxLQUFBLENBQUE7Q0FDQSxDQUFBLENBQ0EsR0FBQSxDQUFBLFVBQUEsS0FBQSxFQUFBLEVBQUEsQ0FBQSxDQUFBOztBQzNCQSxHQUFBLENBQUEsT0FBQSxDQUFBLE1BQUEsRUFBQSxVQUFBLE1BQUEsRUFBQSxLQUFBLEVBQUEsRUFBQSxFQUFBOztBQUVBLE1BQUEsSUFBQSxHQUFBLEVBQUEsQ0FBQSxjQUFBLENBQUE7QUFDQSxRQUFBLEVBQUEsTUFBQTtBQUNBLFlBQUEsRUFBQSxPQUFBO0FBQ0EsYUFBQSxFQUFBO0FBQ0EsYUFBQSxFQUFBO0FBQ0EsYUFBQSxFQUFBOzs7QUFHQSxvQkFBQSxFQUFBLFFBQUE7OztBQUdBLG9CQUFBLEVBQUEsTUFBQTtTQUNBO09BQ0E7S0FDQTtBQUNBLFdBQUEsRUFBQTtBQUNBLFFBQUEsRUFBQSxjQUFBO0FBQ0EsY0FBQSxDQUFBLEVBQUEsQ0FBQSxNQUFBLEVBQUEsRUFBQSxFQUFBLEVBQUEsSUFBQSxDQUFBLEdBQUEsRUFBQSxDQUFBLENBQUE7T0FDQTtBQUNBLGVBQUEsRUFBQSxxQkFBQTtBQUNBLGVBQUEsS0FBQSxDQUFBLE9BQUEsQ0FBQSxFQUFBLE1BQUEsRUFBQSxJQUFBLENBQUEsR0FBQSxFQUFBLENBQUEsQ0FBQTtPQUNBO0tBQ0E7R0FDQSxDQUFBLENBQUE7O0FBRUEsU0FBQSxJQUFBLENBQUE7Q0FDQSxDQUFBLENBQ0EsR0FBQSxDQUFBLFVBQUEsSUFBQSxFQUFBLEVBQUEsQ0FBQSxDQUFBOztBQzdCQSxHQUFBLENBQUEsU0FBQSxDQUFBLFFBQUEsRUFBQSxVQUFBLFVBQUEsRUFBQSxNQUFBLEVBQUEsV0FBQSxFQUFBLFdBQUEsRUFBQSxJQUFBLEVBQUE7O0FBRUEsU0FBQTtBQUNBLFlBQUEsRUFBQSxHQUFBO0FBQ0EsU0FBQSxFQUFBLEVBQUE7QUFDQSxlQUFBLEVBQUEseUNBQUE7QUFDQSxRQUFBLEVBQUEsY0FBQSxLQUFBLEVBQUEsSUFBQSxFQUFBLElBQUEsRUFBQTs7QUFFQSxXQUFBLENBQUEsS0FBQSxHQUFBOztBQUVBLFFBQUEsS0FBQSxFQUFBLGVBQUEsRUFBQSxLQUFBLEVBQUEsTUFBQSxFQUFBLEVBQ0EsRUFBQSxLQUFBLEVBQUEsT0FBQSxFQUFBLEtBQUEsRUFBQSxPQUFBLEVBQUEsRUFDQSxFQUFBLEtBQUEsRUFBQSxNQUFBLEVBQUEsS0FBQSxFQUFBLE1BQUEsRUFBQSxDQUVBLENBQUE7OztBQUVBLFdBQUEsQ0FBQSxJQUFBLEdBQUEsS0FBQSxDQUFBOztBQUVBLFdBQUEsQ0FBQSxNQUFBLEdBQUE7ZUFBQSxLQUFBLENBQUEsSUFBQSxHQUFBLENBQUEsS0FBQSxDQUFBLElBQUE7T0FBQSxDQUFBOztBQUVBLFdBQUEsQ0FBQSxNQUFBLEdBQUEsWUFBQTtBQUNBLGVBQUEsQ0FBQSxHQUFBLENBQUEsNEJBQUEsQ0FBQSxDQUFBO09BQ0EsQ0FBQTs7QUFFQSxXQUFBLENBQUEsSUFBQSxHQUFBLElBQUEsQ0FBQTs7QUFFQSxXQUFBLENBQUEsVUFBQSxHQUFBLFlBQUE7QUFDQSxlQUFBLFdBQUEsQ0FBQSxlQUFBLEVBQUEsQ0FBQTtPQUNBLENBQUE7O0FBRUEsV0FBQSxDQUFBLE1BQUEsR0FBQSxZQUFBO0FBQ0EsbUJBQUEsQ0FBQSxNQUFBLEVBQUEsQ0FBQSxJQUFBLENBQUEsWUFBQTtBQUNBLGdCQUFBLENBQUEsRUFBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBO1NBQ0EsQ0FBQSxDQUFBO09BQ0EsQ0FBQTs7QUFFQSxVQUFBLE9BQUEsR0FBQSxTQUFBLE9BQUEsR0FBQTtBQUNBLG1CQUFBLENBQUEsZUFBQSxFQUFBLENBQ0EsSUFBQSxDQUFBLFVBQUEsSUFBQTtpQkFBQSxJQUFBLENBQUEsSUFBQSxDQUFBLElBQUEsQ0FBQSxHQUFBLENBQUE7U0FBQSxDQUFBLENBQ0EsSUFBQSxDQUFBLFVBQUEsSUFBQSxFQUFBO0FBQ0EsZUFBQSxDQUFBLElBQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxpQkFBQSxJQUFBLENBQUE7U0FDQSxDQUFBLENBQUE7T0FDQSxDQUFBOztBQUVBLFVBQUEsVUFBQSxHQUFBLFNBQUEsVUFBQSxHQUFBO0FBQ0EsYUFBQSxDQUFBLElBQUEsR0FBQSxJQUFBLENBQUE7T0FDQSxDQUFBOztBQUVBLGFBQUEsRUFBQSxDQUFBOztBQUVBLGdCQUFBLENBQUEsR0FBQSxDQUFBLFdBQUEsQ0FBQSxZQUFBLEVBQUEsT0FBQSxDQUFBLENBQUE7QUFDQSxnQkFBQSxDQUFBLEdBQUEsQ0FBQSxXQUFBLENBQUEsYUFBQSxFQUFBLFVBQUEsQ0FBQSxDQUFBO0FBQ0EsZ0JBQUEsQ0FBQSxHQUFBLENBQUEsV0FBQSxDQUFBLGNBQUEsRUFBQSxVQUFBLENBQUEsQ0FBQTtLQUVBOztHQUVBLENBQUE7Q0FFQSxDQUFBLENBQUE7O0FDM0RBLFlBQUEsQ0FBQTs7QUFFQSxHQUFBLENBQUEsU0FBQSxDQUFBLFNBQUEsRUFBQSxZQUFBO0FBQ0EsU0FBQTtBQUNBLFlBQUEsRUFBQSxHQUFBO0FBQ0EsU0FBQSxFQUFBO0FBQ0EsYUFBQSxFQUFBLEdBQUE7S0FDQTtBQUNBLFFBQUEsRUFBQSxjQUFBLEtBQUEsRUFBQSxJQUFBLEVBQUEsSUFBQSxFQUFBO0FBQ0EsVUFBQSxDQUFBLElBQUEsQ0FBQSxrQkFBQSxFQUFBLFVBQUEsS0FBQSxFQUFBO0FBQ0EsWUFBQSxLQUFBLENBQUEsS0FBQSxJQUFBLEVBQUEsRUFBQTtBQUNBLGVBQUEsQ0FBQSxNQUFBLENBQUEsWUFBQTtBQUNBLGlCQUFBLENBQUEsT0FBQSxFQUFBLENBQUE7V0FDQSxDQUFBLENBQUE7QUFDQSxpQkFBQSxLQUFBLENBQUE7U0FDQTtPQUNBLENBQUEsQ0FBQTtLQUNBO0dBQ0EsQ0FBQTtDQUNBLENBQUEsQ0FBQTs7QUNuQkEsR0FBQSxDQUFBLFNBQUEsQ0FBQSxjQUFBLEVBQUEsWUFBQTtBQUNBLFNBQUE7QUFDQSxZQUFBLEVBQUEsR0FBQTtBQUNBLGVBQUEsRUFBQSx1REFBQTtBQUNBLFFBQUEsRUFBQSxjQUFBLEtBQUEsRUFBQSxJQUFBLEVBQUEsSUFBQSxFQUFBOztBQUVBLFdBQUEsQ0FBQSxnQkFBQSxHQUFBLFlBQUE7QUFDQSxlQUFBLENBQUEsR0FBQSwyQ0FBQSxDQUFBO09BQ0EsQ0FBQTtLQUVBO0dBQ0EsQ0FBQTtDQUNBLENBQUEsQ0FBQSIsImZpbGUiOiJtYWluLmpzIiwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnO1xud2luZG93LmFwcCA9IGFuZ3VsYXIubW9kdWxlKCdOb2RlbW9ub0FwcCcsIFsndWkucm91dGVyJywgJ3VpLmJvb3RzdHJhcCcsICdmc2FQcmVCdWlsdCcsICdqcy1kYXRhJ10pO1xuXG5hcHAuY29uZmlnKGZ1bmN0aW9uICgkdXJsUm91dGVyUHJvdmlkZXIsICRsb2NhdGlvblByb3ZpZGVyLCBEU1Byb3ZpZGVyLCBEU0h0dHBBZGFwdGVyUHJvdmlkZXIpIHtcbiAgICAvLyBUaGlzIHR1cm5zIG9mZiBoYXNoYmFuZyB1cmxzICgvI2Fib3V0KSBhbmQgY2hhbmdlcyBpdCB0byBzb21ldGhpbmcgbm9ybWFsICgvYWJvdXQpXG4gICAgJGxvY2F0aW9uUHJvdmlkZXIuaHRtbDVNb2RlKHRydWUpO1xuICAgIC8vIElmIHdlIGdvIHRvIGEgVVJMIHRoYXQgdWktcm91dGVyIGRvZXNuJ3QgaGF2ZSByZWdpc3RlcmVkLCBnbyB0byB0aGUgXCIvXCIgdXJsLlxuICAgICR1cmxSb3V0ZXJQcm92aWRlci5vdGhlcndpc2UoJy8nKTtcblxuICAgIC8vIHNldCBqcy1kYXRhIGRlZmF1bHRzXG4gICAgRFNQcm92aWRlci5kZWZhdWx0cy5iYXNlUGF0aCA9ICcvYXBpJ1xuICAgIERTUHJvdmlkZXIuZGVmYXVsdHMuaWRBdHRyaWJ1dGUgPSAnX2lkJ1xuXG5cbiAgICAvLyBhIG1ldGhvZCB0byB0aGUgRFNQcm92aWRlciBkZWZhdWx0cyBvYmplY3QgdGhhdCBhdXRvbWF0aWNhbGx5XG4gICAgLy8gY2hlY2tzIGlmIHRoZXJlIGlzIGFueSBkYXRhIGluIHRoZSBjYWNoZSBmb3IgYSBnaXZlbiBzZXJ2aWNlIGJlZm9yZVxuICAgIC8vIHBpbmdpbmcgdGhlIGRhdGFiYXNlXG4gICAgRFNQcm92aWRlci5kZWZhdWx0cy5nZXRPckZpbmQgPSBmdW5jdGlvbihzZXJ2aWNlKXtcbiAgICAgIHZhciBkYXRhID0gdGhpcy5nZXRBbGwoKVxuICAgICAgaWYgKGRhdGEubGVuZ3RoKSByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKGFuZ3VsYXIuY29weShkYXRhKSlcbiAgICAgIGVsc2UgcmV0dXJuIHRoaXMuZmluZEFsbCgpLnRoZW4oZGF0YSA9PiBhbmd1bGFyLmNvcHkoZGF0YSkpXG4gICAgfVxuXG4gICAgLy8gTW9uZ29vc2UgUmVsYXRpb24gRml4IChmaXhlcyBkZXNlcmlhbGl6YXRpb24pXG4gICAgLy8gRnJvbSBodHRwOi8vcGxua3IuY28vZWRpdC8zejkwUEQ5d3d3aFdkblZyWnFrQj9wPXByZXZpZXdcbiAgICAvLyBUaGlzIHdhcyBzaG93biB0byB1cyBieSBAam1kb2JyeSwgdGhlIGlkZWEgaGVyZSBpcyB0aGF0XG4gICAgLy8gd2UgZml4IHRoZSBkYXRhIGNvbWluZyBmcm9tIE1vbmdvb3NlIG1vZGVscyBpbiBqcy1kYXRhIHJhdGhlciB0aGFuIG91dGJvdW5kIGZyb20gTW9uZ29vc2VcbiAgICBmdW5jdGlvbiBmaXhSZWxhdGlvbnMoUmVzb3VyY2UsIGluc3RhbmNlKSB7XG4gICAgICBmdW5jdGlvbiBmaXhMb2NhbEtleXMoaSkge1xuICAgICAgICBKU0RhdGEuRFNVdGlscy5mb3JFYWNoKFJlc291cmNlLnJlbGF0aW9uTGlzdCwgZnVuY3Rpb24oZGVmKSB7XG4gICAgICAgICAgdmFyIHJlbGF0aW9uTmFtZSA9IGRlZi5yZWxhdGlvbjtcbiAgICAgICAgICB2YXIgcmVsYXRpb25EZWYgPSBSZXNvdXJjZS5nZXRSZXNvdXJjZShyZWxhdGlvbk5hbWUpO1xuICAgICAgICAgIGlmIChkZWYudHlwZSA9PT0gJ2hhc01hbnknKSB7XG4gICAgICAgICAgICBpZiAoaS5oYXNPd25Qcm9wZXJ0eShkZWYubG9jYWxGaWVsZCkpIHtcbiAgICAgICAgICAgICAgaWYgKGlbZGVmLmxvY2FsRmllbGRdLmxlbmd0aCAmJiAhSlNEYXRhLkRTVXRpbHMuaXNPYmplY3QoaVtkZWYubG9jYWxGaWVsZF1bMF0pKSB7XG4gICAgICAgICAgICAgICAgLy8gQ2FzZSAxOiBhcnJheSBvZiBfaWRzIHdoZXJlIGFycmF5IG9mIHBvcHVsYXRlZCBvYmplY3RzIHNob3VsZCBiZVxuICAgICAgICAgICAgICAgIGlbZGVmLmxvY2FsS2V5c10gPSBpW2RlZi5sb2NhbEZpZWxkXTtcbiAgICAgICAgICAgICAgICBkZWxldGUgaVtkZWYubG9jYWxGaWVsZF07XG4gICAgICAgICAgICAgIH0gZWxzZSBpZiAoIWlbZGVmLmxvY2FsS2V5c10pIHtcbiAgICAgICAgICAgICAgICAvLyBDYXNlIDI6IGFycmF5IG9mIHBvcHVsYXRlZCBvYmplY3RzLCBidXQgbWlzc2luZyBhcnJheSBvZiBfaWRzJ1xuICAgICAgICAgICAgICAgIGlbZGVmLmxvY2FsS2V5c10gPSBbXTtcbiAgICAgICAgICAgICAgICBKU0RhdGEuRFNVdGlscy5mb3JFYWNoKGlbZGVmLmxvY2FsRmllbGRdLCBmdW5jdGlvbihjaGlsZCkge1xuICAgICAgICAgICAgICAgICAgaVtkZWYubG9jYWxLZXlzXS5wdXNoKGNoaWxkW3JlbGF0aW9uRGVmLmlkQXR0cmlidXRlXSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZSBpZiAoZGVmLnR5cGUgPT09ICdiZWxvbmdzVG8nKSB7XG4gICAgICAgICAgICBpZiAoaS5oYXNPd25Qcm9wZXJ0eShkZWYubG9jYWxGaWVsZCkpIHtcbiAgICAgICAgICAgICAgLy8gaWYgdGhlIGxvY2FsZkllbGQgaXMgYSBwb3B1YWx0ZWQgb2JqZWN0XG4gICAgICAgICAgICAgIGlmIChKU0RhdGEuRFNVdGlscy5pc09iamVjdChpW2RlZi5sb2NhbEZpZWxkXSkpIHtcbiAgICAgICAgICAgICAgICBpW2RlZi5sb2NhbEtleV0gPSBpW2RlZi5sb2NhbEZpZWxkXS5faWQ7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgLy8gaWYgdGhlIGxvY2FsZmllbGQgaXMgYW4gb2JqZWN0IGlkXG4gICAgICAgICAgICAgIGVsc2UgaWYgKCFKU0RhdGEuRFNVdGlscy5pc09iamVjdChpW2RlZi5sb2NhbEZpZWxkXSkpIHtcbiAgICAgICAgICAgICAgICBpW2RlZi5sb2NhbEtleV0gPSBpW2RlZi5sb2NhbEZpZWxkXTtcbiAgICAgICAgICAgICAgICBkZWxldGUgaVtkZWYubG9jYWxGaWVsZF07XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBpZiAoSlNEYXRhLkRTVXRpbHMuaXNBcnJheShpbnN0YW5jZSkpIHtcbiAgICAgICAgSlNEYXRhLkRTVXRpbHMuZm9yRWFjaChpbnN0YW5jZSwgZml4TG9jYWxLZXlzKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGZpeExvY2FsS2V5cyhpbnN0YW5jZSk7XG4gICAgICB9XG4gICAgfVxuXG5cbiAgICBEU1Byb3ZpZGVyLmRlZmF1bHRzLmRlc2VyaWFsaXplID0gZnVuY3Rpb24oUmVzb3VyY2UsIGRhdGEpIHtcbiAgICAgIHZhciBpbnN0YW5jZSA9IGRhdGEuZGF0YTtcbiAgICAgIGZpeFJlbGF0aW9ucyhSZXNvdXJjZSwgaW5zdGFuY2UpO1xuICAgICAgcmV0dXJuIGluc3RhbmNlO1xuICAgIH07XG4gICAgLy8gRW5kIE1vbmdvb3NlIFJlbGF0aW9uIGZpeFxufSk7XG5cbi8vIFRoaXMgYXBwLnJ1biBpcyBmb3IgY29udHJvbGxpbmcgYWNjZXNzIHRvIHNwZWNpZmljIHN0YXRlcy5cbmFwcC5ydW4oZnVuY3Rpb24gKCRyb290U2NvcGUsIEF1dGhTZXJ2aWNlLCAkc3RhdGUpIHtcblxuICAgIC8vIFRoZSBnaXZlbiBzdGF0ZSByZXF1aXJlcyBhbiBhdXRoZW50aWNhdGVkIHVzZXIuXG4gICAgdmFyIGRlc3RpbmF0aW9uU3RhdGVSZXF1aXJlc0F1dGggPSBmdW5jdGlvbiAoc3RhdGUpIHtcbiAgICAgICAgcmV0dXJuIHN0YXRlLmRhdGEgJiYgc3RhdGUuZGF0YS5hdXRoZW50aWNhdGU7XG4gICAgfTtcblxuICAgIC8vICRzdGF0ZUNoYW5nZVN0YXJ0IGlzIGFuIGV2ZW50IGZpcmVkXG4gICAgLy8gd2hlbmV2ZXIgdGhlIHByb2Nlc3Mgb2YgY2hhbmdpbmcgYSBzdGF0ZSBiZWdpbnMuXG4gICAgJHJvb3RTY29wZS4kb24oJyRzdGF0ZUNoYW5nZVN0YXJ0JywgZnVuY3Rpb24gKGV2ZW50LCB0b1N0YXRlLCB0b1BhcmFtcykge1xuXG4gICAgICAgIGlmICghZGVzdGluYXRpb25TdGF0ZVJlcXVpcmVzQXV0aCh0b1N0YXRlKSkge1xuICAgICAgICAgICAgLy8gVGhlIGRlc3RpbmF0aW9uIHN0YXRlIGRvZXMgbm90IHJlcXVpcmUgYXV0aGVudGljYXRpb25cbiAgICAgICAgICAgIC8vIFNob3J0IGNpcmN1aXQgd2l0aCByZXR1cm4uXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoQXV0aFNlcnZpY2UuaXNBdXRoZW50aWNhdGVkKCkpIHtcbiAgICAgICAgICAgIC8vIFRoZSB1c2VyIGlzIGF1dGhlbnRpY2F0ZWQuXG4gICAgICAgICAgICAvLyBTaG9ydCBjaXJjdWl0IHdpdGggcmV0dXJuLlxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2FuY2VsIG5hdmlnYXRpbmcgdG8gbmV3IHN0YXRlLlxuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgICAgIEF1dGhTZXJ2aWNlLmdldExvZ2dlZEluVXNlcigpLnRoZW4oZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgICAgIC8vIElmIGEgdXNlciBpcyByZXRyaWV2ZWQsIHRoZW4gcmVuYXZpZ2F0ZSB0byB0aGUgZGVzdGluYXRpb25cbiAgICAgICAgICAgIC8vICh0aGUgc2Vjb25kIHRpbWUsIEF1dGhTZXJ2aWNlLmlzQXV0aGVudGljYXRlZCgpIHdpbGwgd29yaylcbiAgICAgICAgICAgIC8vIG90aGVyd2lzZSwgaWYgbm8gdXNlciBpcyBsb2dnZWQgaW4sIGdvIHRvIFwibG9naW5cIiBzdGF0ZS5cbiAgICAgICAgICAgIGlmICh1c2VyKSB7XG4gICAgICAgICAgICAgICAgJHN0YXRlLmdvKHRvU3RhdGUubmFtZSwgdG9QYXJhbXMpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAkc3RhdGUuZ28oJ2xvZ2luJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgfSk7XG5cbn0pO1xuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcblxuICAgIC8vIFJlZ2lzdGVyIG91ciAqYWJvdXQqIHN0YXRlLlxuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdhYm91dCcsIHtcbiAgICAgICAgdXJsOiAnL2Fib3V0JyxcbiAgICAgICAgY29udHJvbGxlcjogJ0Fib3V0Q29udHJvbGxlcicsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvYWJvdXQvYWJvdXQuaHRtbCdcbiAgICB9KTtcblxufSk7XG5cbmFwcC5jb250cm9sbGVyKCdBYm91dENvbnRyb2xsZXInLCBmdW5jdGlvbiAoJHNjb3BlKSB7XG5cbiAgICAvLyAkc2NvcGUuaW1hZ2VzID0gXy5zaHVmZmxlKHNvbWV0aGluZyk7XG5cbn0pO1xuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnZG9jcycsIHtcbiAgICAgICAgdXJsOiAnL2RvY3MnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2RvY3MvZG9jcy5odG1sJ1xuICAgIH0pO1xufSk7XG4iLCIoZnVuY3Rpb24gKCkge1xuXG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgLy8gSG9wZSB5b3UgZGlkbid0IGZvcmdldCBBbmd1bGFyISBEdWgtZG95LlxuICAgIGlmICghd2luZG93LmFuZ3VsYXIpIHRocm93IG5ldyBFcnJvcignSSBjYW5cXCd0IGZpbmQgQW5ndWxhciEnKTtcblxuICAgIHZhciBhcHAgPSBhbmd1bGFyLm1vZHVsZSgnZnNhUHJlQnVpbHQnLCBbXSk7XG5cbiAgICBhcHAuZmFjdG9yeSgnU29ja2V0JywgZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoIXdpbmRvdy5pbykgdGhyb3cgbmV3IEVycm9yKCdzb2NrZXQuaW8gbm90IGZvdW5kIScpO1xuICAgICAgICByZXR1cm4gd2luZG93LmlvKHdpbmRvdy5sb2NhdGlvbi5vcmlnaW4pO1xuICAgIH0pO1xuXG4gICAgLy8gQVVUSF9FVkVOVFMgaXMgdXNlZCB0aHJvdWdob3V0IG91ciBhcHAgdG9cbiAgICAvLyBicm9hZGNhc3QgYW5kIGxpc3RlbiBmcm9tIGFuZCB0byB0aGUgJHJvb3RTY29wZVxuICAgIC8vIGZvciBpbXBvcnRhbnQgZXZlbnRzIGFib3V0IGF1dGhlbnRpY2F0aW9uIGZsb3cuXG4gICAgYXBwLmNvbnN0YW50KCdBVVRIX0VWRU5UUycsIHtcbiAgICAgICAgbG9naW5TdWNjZXNzOiAnYXV0aC1sb2dpbi1zdWNjZXNzJyxcbiAgICAgICAgbG9naW5GYWlsZWQ6ICdhdXRoLWxvZ2luLWZhaWxlZCcsXG4gICAgICAgIGxvZ291dFN1Y2Nlc3M6ICdhdXRoLWxvZ291dC1zdWNjZXNzJyxcbiAgICAgICAgc2Vzc2lvblRpbWVvdXQ6ICdhdXRoLXNlc3Npb24tdGltZW91dCcsXG4gICAgICAgIG5vdEF1dGhlbnRpY2F0ZWQ6ICdhdXRoLW5vdC1hdXRoZW50aWNhdGVkJyxcbiAgICAgICAgbm90QXV0aG9yaXplZDogJ2F1dGgtbm90LWF1dGhvcml6ZWQnXG4gICAgfSk7XG5cbiAgICBhcHAuZmFjdG9yeSgnQXV0aEludGVyY2VwdG9yJywgZnVuY3Rpb24gKCRyb290U2NvcGUsICRxLCBBVVRIX0VWRU5UUykge1xuICAgICAgICB2YXIgc3RhdHVzRGljdCA9IHtcbiAgICAgICAgICAgIDQwMTogQVVUSF9FVkVOVFMubm90QXV0aGVudGljYXRlZCxcbiAgICAgICAgICAgIDQwMzogQVVUSF9FVkVOVFMubm90QXV0aG9yaXplZCxcbiAgICAgICAgICAgIDQxOTogQVVUSF9FVkVOVFMuc2Vzc2lvblRpbWVvdXQsXG4gICAgICAgICAgICA0NDA6IEFVVEhfRVZFTlRTLnNlc3Npb25UaW1lb3V0XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICByZXNwb25zZUVycm9yOiBmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3Qoc3RhdHVzRGljdFtyZXNwb25zZS5zdGF0dXNdLCByZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuICRxLnJlamVjdChyZXNwb25zZSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9KTtcblxuICAgIGFwcC5jb25maWcoZnVuY3Rpb24gKCRodHRwUHJvdmlkZXIpIHtcbiAgICAgICAgJGh0dHBQcm92aWRlci5pbnRlcmNlcHRvcnMucHVzaChbXG4gICAgICAgICAgICAnJGluamVjdG9yJyxcbiAgICAgICAgICAgIGZ1bmN0aW9uICgkaW5qZWN0b3IpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJGluamVjdG9yLmdldCgnQXV0aEludGVyY2VwdG9yJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIF0pO1xuICAgIH0pO1xuXG4gICAgYXBwLnNlcnZpY2UoJ0F1dGhTZXJ2aWNlJywgZnVuY3Rpb24gKCRodHRwLCBTZXNzaW9uLCAkcm9vdFNjb3BlLCBBVVRIX0VWRU5UUywgJHEsIFVzZXIpIHtcblxuICAgICAgICBmdW5jdGlvbiBvblN1Y2Nlc3NmdWxMb2dpbihyZXNwb25zZSkge1xuICAgICAgICAgICAgdmFyIGRhdGEgPSByZXNwb25zZS5kYXRhO1xuICAgICAgICAgICAgU2Vzc2lvbi5jcmVhdGUoZGF0YS5pZCwgZGF0YS51c2VyKTtcbiAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdChBVVRIX0VWRU5UUy5sb2dpblN1Y2Nlc3MpO1xuICAgICAgICAgICAgcmV0dXJuIGRhdGEudXNlcjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVzZXMgdGhlIHNlc3Npb24gZmFjdG9yeSB0byBzZWUgaWYgYW5cbiAgICAgICAgLy8gYXV0aGVudGljYXRlZCB1c2VyIGlzIGN1cnJlbnRseSByZWdpc3RlcmVkLlxuICAgICAgICB0aGlzLmlzQXV0aGVudGljYXRlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiAhIVNlc3Npb24udXNlcjtcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmdldExvZ2dlZEluVXNlciA9IGZ1bmN0aW9uIChmcm9tU2VydmVyKSB7XG5cbiAgICAgICAgICAgIC8vIElmIGFuIGF1dGhlbnRpY2F0ZWQgc2Vzc2lvbiBleGlzdHMsIHdlXG4gICAgICAgICAgICAvLyByZXR1cm4gdGhlIHVzZXIgYXR0YWNoZWQgdG8gdGhhdCBzZXNzaW9uXG4gICAgICAgICAgICAvLyB3aXRoIGEgcHJvbWlzZS4gVGhpcyBlbnN1cmVzIHRoYXQgd2UgY2FuXG4gICAgICAgICAgICAvLyBhbHdheXMgaW50ZXJmYWNlIHdpdGggdGhpcyBtZXRob2QgYXN5bmNocm9ub3VzbHkuXG5cbiAgICAgICAgICAgIC8vIE9wdGlvbmFsbHksIGlmIHRydWUgaXMgZ2l2ZW4gYXMgdGhlIGZyb21TZXJ2ZXIgcGFyYW1ldGVyLFxuICAgICAgICAgICAgLy8gdGhlbiB0aGlzIGNhY2hlZCB2YWx1ZSB3aWxsIG5vdCBiZSB1c2VkLlxuXG4gICAgICAgICAgICBpZiAodGhpcy5pc0F1dGhlbnRpY2F0ZWQoKSAmJiBmcm9tU2VydmVyICE9PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICRxLndoZW4oU2Vzc2lvbi51c2VyKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gTWFrZSByZXF1ZXN0IEdFVCAvc2Vzc2lvbi5cbiAgICAgICAgICAgIC8vIElmIGl0IHJldHVybnMgYSB1c2VyLCBjYWxsIG9uU3VjY2Vzc2Z1bExvZ2luIHdpdGggdGhlIHJlc3BvbnNlLlxuICAgICAgICAgICAgLy8gSWYgaXQgcmV0dXJucyBhIDQwMSByZXNwb25zZSwgd2UgY2F0Y2ggaXQgYW5kIGluc3RlYWQgcmVzb2x2ZSB0byBudWxsLlxuICAgICAgICAgICAgcmV0dXJuICRodHRwLmdldCgnL3Nlc3Npb24nKS50aGVuKG9uU3VjY2Vzc2Z1bExvZ2luKS5jYXRjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMubG9naW4gPSBmdW5jdGlvbiAoY3JlZGVudGlhbHMpIHtcbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5wb3N0KCcvbG9naW4nLCBjcmVkZW50aWFscylcbiAgICAgICAgICAgICAgICAudGhlbihvblN1Y2Nlc3NmdWxMb2dpbilcbiAgICAgICAgICAgICAgICAuY2F0Y2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gJHEucmVqZWN0KHsgbWVzc2FnZTogJ0ludmFsaWQgbG9naW4gY3JlZGVudGlhbHMuJyB9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmxvZ291dCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5nZXQoJy9sb2dvdXQnKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBTZXNzaW9uLmRlc3Ryb3koKTtcbiAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3QoQVVUSF9FVkVOVFMubG9nb3V0U3VjY2Vzcyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgIH0pO1xuXG4gICAgYXBwLnNlcnZpY2UoJ1Nlc3Npb24nLCBmdW5jdGlvbiAoJHJvb3RTY29wZSwgQVVUSF9FVkVOVFMpIHtcblxuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMubm90QXV0aGVudGljYXRlZCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgc2VsZi5kZXN0cm95KCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLnNlc3Npb25UaW1lb3V0LCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBzZWxmLmRlc3Ryb3koKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5pZCA9IG51bGw7XG4gICAgICAgIHRoaXMudXNlciA9IG51bGw7XG5cbiAgICAgICAgdGhpcy5jcmVhdGUgPSBmdW5jdGlvbiAoc2Vzc2lvbklkLCB1c2VyKSB7XG4gICAgICAgICAgICB0aGlzLmlkID0gc2Vzc2lvbklkO1xuICAgICAgICAgICAgdGhpcy51c2VyID0gdXNlcjtcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmRlc3Ryb3kgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLmlkID0gbnVsbDtcbiAgICAgICAgICAgIHRoaXMudXNlciA9IG51bGw7XG4gICAgICAgIH07XG5cbiAgICB9KTtcblxufSkoKTtcbiIsImFwcC5jb25maWcoKCRzdGF0ZVByb3ZpZGVyKSA9PiB7XG4gICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdoZWxwJywge1xuICAgIHVybDogJy9oZWxwJyxcbiAgICB0ZW1wbGF0ZVVybDogJ2pzL2hlbHAvaGVscC5odG1sJ1xuICB9KVxufSlcbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2hvbWUnLCB7XG4gICAgICAgIHVybDogJy8nLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2hvbWUvaG9tZS5odG1sJyxcbiAgICAgICAgY29udHJvbGxlcjogKCRzY29wZSwgdXNlcnMsIHJvdXRlcykgPT4ge1xuICAgICAgICAgICRzY29wZS51c2VycyA9IHVzZXJzXG4gICAgICAgICAgJHNjb3BlLnJvdXRlcyA9IHJvdXRlc1xuXG4gICAgICAgICAgLy8gY2hlY2sgd2hldGhlciB1c2VyIGFnZW50IGlzIHJ1bm5pbmcgY2hyb21lXG4gICAgICAgICAgJHNjb3BlLmhhc0Nocm9tZSA9ICgpID0+IG5hdmlnYXRvci51c2VyQWdlbnQudG9Mb3dlckNhc2UoKS5pbmNsdWRlcygnY2hyb21lJylcbiAgICAgICAgfSxcbiAgICAgICAgcmVzb2x2ZToge1xuICAgICAgICAgIHVzZXJzOiAoVXNlcikgPT4gVXNlci5maW5kQWxsKHt9LCB7IGJ5cGFzc0NhY2hlOiB0cnVlIH0pLFxuICAgICAgICAgIHJvdXRlczogKFJvdXRlKSA9PiBSb3V0ZS5maW5kQWxsKHt9LCB7IGJ5cGFzc0NhY2hlOiB0cnVlIH0pXG4gICAgICAgIH1cbiAgICB9KTtcbn0pO1xuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcblxuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdsb2dpbicsIHtcbiAgICAgICAgdXJsOiAnL2xvZ2luJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9sb2dpbi9sb2dpbi5odG1sJyxcbiAgICAgICAgY29udHJvbGxlcjogJ0xvZ2luQ3RybCdcbiAgICB9KTtcblxufSk7XG5cbmFwcC5jb250cm9sbGVyKCdMb2dpbkN0cmwnLCBmdW5jdGlvbiAoJHNjb3BlLCBBdXRoU2VydmljZSwgJHN0YXRlKSB7XG5cbiAgICAkc2NvcGUubG9naW4gPSB7fTtcbiAgICAkc2NvcGUuZXJyb3IgPSBudWxsO1xuXG4gICAgJHNjb3BlLnNlbmRMb2dpbiA9IGZ1bmN0aW9uIChsb2dpbkluZm8pIHtcblxuICAgICAgICAkc2NvcGUuZXJyb3IgPSBudWxsO1xuXG4gICAgICAgIEF1dGhTZXJ2aWNlLmxvZ2luKGxvZ2luSW5mbykudGhlbihmdW5jdGlvbiAodXNlcikge1xuICAgICAgICAgICAgJHN0YXRlLmdvKCd1c2VyJywgeyBpZDogdXNlci5faWQgfSk7XG4gICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICRzY29wZS5lcnJvciA9ICdJbnZhbGlkIGxvZ2luIGNyZWRlbnRpYWxzLic7XG4gICAgICAgIH0pO1xuXG4gICAgfTtcblxufSk7XG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ21lbWJlcnNPbmx5Jywge1xuICAgICAgICB1cmw6ICcvbWVtYmVycy1hcmVhJyxcbiAgICAgICAgdGVtcGxhdGU6ICcnLFxuICAgICAgICBjb250cm9sbGVyOiBmdW5jdGlvbiAoJHNjb3BlKSB7fSxcblxuICAgICAgICAvLyBUaGUgZm9sbG93aW5nIGRhdGEuYXV0aGVudGljYXRlIGlzIHJlYWQgYnkgYW4gZXZlbnQgbGlzdGVuZXJcbiAgICAgICAgLy8gdGhhdCBjb250cm9scyBhY2Nlc3MgdG8gdGhpcyBzdGF0ZS4gUmVmZXIgdG8gYXBwLmpzLlxuICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICBhdXRoZW50aWNhdGU6IHRydWVcbiAgICAgICAgfVxuICAgIH0pO1xuXG59KTtcbiIsImFwcC5jb25maWcoKCRzdGF0ZVByb3ZpZGVyKSA9PiB7XG4gICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCd1c2VyJywge1xuICAgIHVybDogJy86aWQvcHJvZmlsZScsXG4gICAgdGVtcGxhdGVVcmw6ICdqcy91c2VyX3Byb2ZpbGUvdXNlcl9wcm9maWxlLmh0bWwnLFxuICAgIGNvbnRyb2xsZXI6ICgkc2NvcGUsIHVzZXIsIHJvdXRlcykgPT4ge1xuICAgICAgJHNjb3BlLnVzZXIgPSB1c2VyXG4gICAgICAkc2NvcGUucm91dGVzID0gcm91dGVzXG5cbiAgICAgIC8vIHRlc3QgZGF0YVxuICAgICAgJHNjb3BlLmRhdGEgPSB7XG4gICAgICAgIG5hbWU6IFwiSGFja2VyIE5ld3NcIixcbiAgICAgICAgY291bnQ6IDMwLFxuICAgICAgICBmcmVxdWVuY3k6IFwiTWFudWFsIENyYXdsXCIsXG4gICAgICAgIHZlcnNpb246IDIsXG4gICAgICAgIG5ld0RhdGE6IHRydWUsXG4gICAgICAgIGxhc3RSdW5TdGF0dXM6IFwic3VjY2Vzc1wiLFxuICAgICAgICB0aGlzVmVyc2lvblN0YXR1czogXCJzdWNjZXNzXCIsXG4gICAgICAgIHRoaXNWZXJzaW9uUnVuOiBcIlRodSBBdWcgMTMgMjAxNSAwMTozMDo0OCBHTVQrMDAwMCAoVVRDKVwiLFxuICAgICAgICBzb3VyY2VVcmw6ICdodHRwczovL25ld3MueWNvbWJpbmF0b3IuY29tLycsXG4gICAgICAgIHJlc3VsdHM6IHtcbiAgICAgICAgICBTdG9yeTogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB0aXRsZToge1xuICAgICAgICAgICAgICAgIGhyZWY6IFwiaHR0cHM6Ly9wbHVzLmdvb2dsZS5jb20vK0luZ3Jlc3MvcG9zdHMvR1Z2Yllaeld5VFRcIixcbiAgICAgICAgICAgICAgICB0ZXh0OiBcIk5pYW50aWMgTGFicyBzcGxpdHRpbmcgZnJvbSBHb29nbGVcIlxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB1cmw6IFwiaHR0cHM6Ly9uZXdzLnljb21iaW5hdG9yLmNvbS9cIixcbiAgICAgICAgICAgICAgcG9pbnRzOiBcIjQxXCIsXG4gICAgICAgICAgICAgIHVzZXI6IHtcbiAgICAgICAgICAgICAgICBocmVmOiBcImh0dHBzOi8vbmV3cy55Y29tYmluYXRvci5jb20vdXNlcj9pZD1tYXJ0aW5kYWxlXCIsXG4gICAgICAgICAgICAgICAgdGV4dDogXCJtYXJ0aW5kYWxlXCJcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgY29tbWVudHM6IHtcbiAgICAgICAgICAgICAgICBocmVmOiBcImh0dHBzOi8vbmV3cy55Y29tYmluYXRvci5jb20vaXRlbT9pZD0xMDA1MTUxN1wiLFxuICAgICAgICAgICAgICAgIHRleHQ6IFwiMTVcIlxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBpbmRleDogMVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IHtcbiAgICAgICAgICAgICAgICBocmVmOiBcImh0dHA6Ly90ZWNoY3J1bmNoLmNvbS8yMDE1LzA4LzEyL29obS1pcy1hLXNtYXJ0ZXItbGlnaHRlci1jYXItYmF0dGVyeS10aGF0LXdvcmtzLXdpdGgteW91ci1leGlzdGluZy1jYXIvXCIsXG4gICAgICAgICAgICAgICAgdGV4dDogXCJPaG0gKFlDIFMxNSkgaXMgYSBzbWFydGVyLCBsaWdodGVyIGNhciBiYXR0ZXJ5IHRoYXQgd29ya3Mgd2l0aCB5b3VyIGV4aXN0aW5nIGNhclwiXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIHVybDogXCJodHRwczovL25ld3MueWNvbWJpbmF0b3IuY29tL1wiLFxuICAgICAgICAgICAgICBwb2ludHM6IFwiMjAwXCIsXG4gICAgICAgICAgICAgIHVzZXI6IHtcbiAgICAgICAgICAgICAgICBocmVmOiBcImh0dHBzOi8vbmV3cy55Y29tYmluYXRvci5jb20vdXNlcj9pZD1ibHVlaW50ZWdyYWxcIixcbiAgICAgICAgICAgICAgICB0ZXh0OiBcImJsdWVpbnRlZ3JhbFwiXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIGNvbW1lbnRzOiB7XG4gICAgICAgICAgICAgICAgaHJlZjogXCJodHRwczovL25ld3MueWNvbWJpbmF0b3IuY29tL2l0ZW0/aWQ9MTAwNDk5MjdcIixcbiAgICAgICAgICAgICAgICB0ZXh0OiBcIjE5NlwiXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIGluZGV4OiAyXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB0aXRsZToge1xuICAgICAgICAgICAgICAgIGhyZWY6IFwiaHR0cHM6Ly93d3cua2lja3N0YXJ0ZXIuY29tL3Byb2plY3RzLzQ1NTg4MzAxL3dvb2xmZS10aGUtcmVkLWhvb2QtZGlhcmllcy9wb3N0cy8xMTY4NDA5XCIsXG4gICAgICAgICAgICAgICAgdGV4dDogXCLigJxJdOKAmXMgZG9uZSwgdGhlcmUgaXMgbm8gd2F5IGJhY2suIFdlIHRyaWVkLCB3ZSBmYWlsZWTigJ1cIlxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB1cmw6IFwiaHR0cHM6Ly9uZXdzLnljb21iaW5hdG9yLmNvbS9cIixcbiAgICAgICAgICAgICAgcG9pbnRzOiBcIjUxOVwiLFxuICAgICAgICAgICAgICB1c2VyOiB7XG4gICAgICAgICAgICAgICAgaHJlZjogXCJodHRwczovL25ld3MueWNvbWJpbmF0b3IuY29tL3VzZXI/aWQ9ZGFuc29cIixcbiAgICAgICAgICAgICAgICB0ZXh0OiBcImRhbnNvXCJcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgY29tbWVudHM6IHtcbiAgICAgICAgICAgICAgICBocmVmOiBcImh0dHBzOi8vbmV3cy55Y29tYmluYXRvci5jb20vaXRlbT9pZD0xMDA0NzcyMVwiLFxuICAgICAgICAgICAgICAgIHRleHQ6IFwiMzAxXCJcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgaW5kZXg6IDNcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHRpdGxlOiB7XG4gICAgICAgICAgICAgICAgaHJlZjogXCJodHRwOi8vcGFybm9sZC14LmdpdGh1Yi5pby9uYXNjL1wiLFxuICAgICAgICAgICAgICAgIHRleHQ6IFwiU2hvdyBITjogTmFTQyDigJMgRG8gbWF0aHMgbGlrZSBhIG5vcm1hbCBwZXJzb25cIlxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB1cmw6IFwiaHR0cHM6Ly9uZXdzLnljb21iaW5hdG9yLmNvbS9cIixcbiAgICAgICAgICAgICAgcG9pbnRzOiBcIjQ1XCIsXG4gICAgICAgICAgICAgIHVzZXI6IHtcbiAgICAgICAgICAgICAgICBocmVmOiBcImh0dHBzOi8vbmV3cy55Y29tYmluYXRvci5jb20vdXNlcj9pZD1tYWNjb1wiLFxuICAgICAgICAgICAgICAgIHRleHQ6IFwibWFjY29cIlxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBjb21tZW50czoge1xuICAgICAgICAgICAgICAgIGhyZWY6IFwiaHR0cHM6Ly9uZXdzLnljb21iaW5hdG9yLmNvbS9pdGVtP2lkPTEwMDUwOTQ5XCIsXG4gICAgICAgICAgICAgICAgdGV4dDogXCI4XCJcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgaW5kZXg6IDRcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHRpdGxlOiB7XG4gICAgICAgICAgICAgICAgaHJlZjogXCJodHRwOi8vYXJzdGVjaG5pY2EuY29tL3NjaWVuY2UvMjAxNS8wOC9vY3RvcHVzLXNvcGhpc3RpY2F0aW9uLWRyaXZlbi1ieS1odW5kcmVkcy1vZi1wcmV2aW91c2x5LXVua25vd24tZ2VuZXMvXCIsXG4gICAgICAgICAgICAgICAgdGV4dDogXCJPY3RvcHVz4oCZIHNvcGhpc3RpY2F0aW9uIGRyaXZlbiBieSBodW5kcmVkcyBvZiBwcmV2aW91c2x5IHVua25vd24gZ2VuZXNcIlxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB1cmw6IFwiaHR0cHM6Ly9uZXdzLnljb21iaW5hdG9yLmNvbS9cIixcbiAgICAgICAgICAgICAgcG9pbnRzOiBcIjM1XCIsXG4gICAgICAgICAgICAgIHVzZXI6IHtcbiAgICAgICAgICAgICAgICBocmVmOiBcImh0dHBzOi8vbmV3cy55Y29tYmluYXRvci5jb20vdXNlcj9pZD1BdWRpb3BoaWxpcFwiLFxuICAgICAgICAgICAgICAgIHRleHQ6IFwiQXVkaW9waGlsaXBcIlxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBjb21tZW50czoge1xuICAgICAgICAgICAgICAgIGhyZWY6IFwiaHR0cHM6Ly9uZXdzLnljb21iaW5hdG9yLmNvbS9pdGVtP2lkPTEwMDUwNTgyXCIsXG4gICAgICAgICAgICAgICAgdGV4dDogXCIxXCJcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgaW5kZXg6IDVcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHRpdGxlOiB7XG4gICAgICAgICAgICAgICAgaHJlZjogXCJodHRwOi8vYmxvZy5zYW1hbHRtYW4uY29tL3Byb2plY3RzLWFuZC1jb21wYW5pZXNcIixcbiAgICAgICAgICAgICAgICB0ZXh0OiBcIlByb2plY3RzIGFuZCBDb21wYW5pZXNcIlxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB1cmw6IFwiaHR0cHM6Ly9uZXdzLnljb21iaW5hdG9yLmNvbS9cIixcbiAgICAgICAgICAgICAgcG9pbnRzOiBcIjIxMlwiLFxuICAgICAgICAgICAgICB1c2VyOiB7XG4gICAgICAgICAgICAgICAgaHJlZjogXCJodHRwczovL25ld3MueWNvbWJpbmF0b3IuY29tL3VzZXI/aWQ9cnVuZXNvZXJlbnNlblwiLFxuICAgICAgICAgICAgICAgIHRleHQ6IFwicnVuZXNvZXJlbnNlblwiXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIGNvbW1lbnRzOiB7XG4gICAgICAgICAgICAgICAgaHJlZjogXCJodHRwczovL25ld3MueWNvbWJpbmF0b3IuY29tL2l0ZW0/aWQ9MTAwNDg1NTdcIixcbiAgICAgICAgICAgICAgICB0ZXh0OiBcIjQwXCJcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgaW5kZXg6IDZcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHRpdGxlOiB7XG4gICAgICAgICAgICAgICAgaHJlZjogXCJodHRwczovL3d3dy5vcGVubGlzdGluZ3MuY28vbmVhclwiLFxuICAgICAgICAgICAgICAgIHRleHQ6IFwiU2hvdyBITjogRmluZCBhIGhvbWUgY2xvc2UgdG8gd29ya1wiXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIHVybDogXCJodHRwczovL25ld3MueWNvbWJpbmF0b3IuY29tL1wiLFxuICAgICAgICAgICAgICBwb2ludHM6IFwiNjFcIixcbiAgICAgICAgICAgICAgdXNlcjoge1xuICAgICAgICAgICAgICAgIGhyZWY6IFwiaHR0cHM6Ly9uZXdzLnljb21iaW5hdG9yLmNvbS91c2VyP2lkPXJnYnJnYlwiLFxuICAgICAgICAgICAgICAgIHRleHQ6IFwicmdicmdiXCJcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgY29tbWVudHM6IHtcbiAgICAgICAgICAgICAgICBocmVmOiBcImh0dHBzOi8vbmV3cy55Y29tYmluYXRvci5jb20vaXRlbT9pZD0xMDA0OTYzMVwiLFxuICAgICAgICAgICAgICAgIHRleHQ6IFwiNTBcIlxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBpbmRleDogN1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IHtcbiAgICAgICAgICAgICAgICBocmVmOiBcImh0dHBzOi8vd3d3LnlvdXR1YmUuY29tL3dhdGNoP3Y9ZzAxZEdzS2JYT2tcIixcbiAgICAgICAgICAgICAgICB0ZXh0OiBcIk5ldGZsaXgg4oCTIENoYXNpbmcgNjBmcHMgW3ZpZGVvXVwiXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIHVybDogXCJodHRwczovL25ld3MueWNvbWJpbmF0b3IuY29tL1wiLFxuICAgICAgICAgICAgICBwb2ludHM6IFwiNDZcIixcbiAgICAgICAgICAgICAgdXNlcjoge1xuICAgICAgICAgICAgICAgIGhyZWY6IFwiaHR0cHM6Ly9uZXdzLnljb21iaW5hdG9yLmNvbS91c2VyP2lkPXRpbHRcIixcbiAgICAgICAgICAgICAgICB0ZXh0OiBcInRpbHRcIlxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBjb21tZW50czoge1xuICAgICAgICAgICAgICAgIGhyZWY6IFwiaHR0cHM6Ly9uZXdzLnljb21iaW5hdG9yLmNvbS9pdGVtP2lkPTEwMDUwMjMwXCIsXG4gICAgICAgICAgICAgICAgdGV4dDogXCIyNlwiXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIGluZGV4OiA4XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB0aXRsZToge1xuICAgICAgICAgICAgICAgIGhyZWY6IFwiaHR0cDovL3d3dy5iYmMuY29tL25ld3MvbWFnYXppbmUtMzM4NjA3NzhcIixcbiAgICAgICAgICAgICAgICB0ZXh0OiBcIkhvdyB0aGUgVUsgZm91bmQgSmFwYW5lc2Ugc3BlYWtlcnMgaW4gYSBodXJyeSBpbiBXVzJcIlxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB1cmw6IFwiaHR0cHM6Ly9uZXdzLnljb21iaW5hdG9yLmNvbS9cIixcbiAgICAgICAgICAgICAgcG9pbnRzOiBcIjM1XCIsXG4gICAgICAgICAgICAgIHVzZXI6IHtcbiAgICAgICAgICAgICAgICBocmVmOiBcImh0dHBzOi8vbmV3cy55Y29tYmluYXRvci5jb20vdXNlcj9pZD1zYW1heXNoYXJtYVwiLFxuICAgICAgICAgICAgICAgIHRleHQ6IFwic2FtYXlzaGFybWFcIlxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBjb21tZW50czoge1xuICAgICAgICAgICAgICAgIGhyZWY6IFwiaHR0cHM6Ly9uZXdzLnljb21iaW5hdG9yLmNvbS9pdGVtP2lkPTEwMDUwNjU1XCIsXG4gICAgICAgICAgICAgICAgdGV4dDogXCI3XCJcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgaW5kZXg6IDlcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHRpdGxlOiB7XG4gICAgICAgICAgICAgICAgaHJlZjogXCJodHRwczovL2dyb3Vwcy5nb29nbGUuY29tL2ZvcnVtLyMhdG9waWMvZW1zY3JpcHRlbi1kaXNjdXNzL2dRUVJqYWpRNmlZXCIsXG4gICAgICAgICAgICAgICAgdGV4dDogXCJFbXNjcmlwdGVuIGdhaW5zIGV4cGVyaW1lbnRhbCBwdGhyZWFkcyBzdXBwb3J0XCJcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgdXJsOiBcImh0dHBzOi8vbmV3cy55Y29tYmluYXRvci5jb20vXCIsXG4gICAgICAgICAgICAgIHBvaW50czogXCI2XCIsXG4gICAgICAgICAgICAgIHVzZXI6IHtcbiAgICAgICAgICAgICAgICBocmVmOiBcImh0dHBzOi8vbmV3cy55Y29tYmluYXRvci5jb20vdXNlcj9pZD12bW9yZ3VsaXNcIixcbiAgICAgICAgICAgICAgICB0ZXh0OiBcInZtb3JndWxpc1wiXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIGNvbW1lbnRzOiB7XG4gICAgICAgICAgICAgICAgaHJlZjogXCJcIixcbiAgICAgICAgICAgICAgICB0ZXh0OiBcIlwiXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIGluZGV4OiAxMFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IHtcbiAgICAgICAgICAgICAgICBocmVmOiBcImh0dHA6Ly9uZXdzLnNxdWVhay5vcmcvMjAxNS8wOC8xMi9zcXVlYWstNS1pcy1vdXQvXCIsXG4gICAgICAgICAgICAgICAgdGV4dDogXCJTcXVlYWsgNSBpcyBvdXRcIlxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB1cmw6IFwiaHR0cHM6Ly9uZXdzLnljb21iaW5hdG9yLmNvbS9cIixcbiAgICAgICAgICAgICAgcG9pbnRzOiBcIjE0MlwiLFxuICAgICAgICAgICAgICB1c2VyOiB7XG4gICAgICAgICAgICAgICAgaHJlZjogXCJodHRwczovL25ld3MueWNvbWJpbmF0b3IuY29tL3VzZXI/aWQ9RmljZVwiLFxuICAgICAgICAgICAgICAgIHRleHQ6IFwiRmljZVwiXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIGNvbW1lbnRzOiB7XG4gICAgICAgICAgICAgICAgaHJlZjogXCJodHRwczovL25ld3MueWNvbWJpbmF0b3IuY29tL2l0ZW0/aWQ9MTAwNDc5NzBcIixcbiAgICAgICAgICAgICAgICB0ZXh0OiBcIjI2XCJcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgaW5kZXg6IDExXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB0aXRsZToge1xuICAgICAgICAgICAgICAgIGhyZWY6IFwiaHR0cHM6Ly9vY2hhcmxlcy5vcmcudWsvYmxvZy9wb3N0cy8yMDE0LTAyLTA0LWhvdy1pLWRldmVsb3Atd2l0aC1uaXhvcy5odG1sXCIsXG4gICAgICAgICAgICAgICAgdGV4dDogXCJIb3cgSSBkZXZlbG9wIHdpdGggTml4XCJcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgdXJsOiBcImh0dHBzOi8vbmV3cy55Y29tYmluYXRvci5jb20vXCIsXG4gICAgICAgICAgICAgIHBvaW50czogXCIxMDRcIixcbiAgICAgICAgICAgICAgdXNlcjoge1xuICAgICAgICAgICAgICAgIGhyZWY6IFwiaHR0cHM6Ly9uZXdzLnljb21iaW5hdG9yLmNvbS91c2VyP2lkPWF5YmVya3RcIixcbiAgICAgICAgICAgICAgICB0ZXh0OiBcImF5YmVya3RcIlxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBjb21tZW50czoge1xuICAgICAgICAgICAgICAgIGhyZWY6IFwiaHR0cHM6Ly9uZXdzLnljb21iaW5hdG9yLmNvbS9pdGVtP2lkPTEwMDQ3MDA1XCIsXG4gICAgICAgICAgICAgICAgdGV4dDogXCIzNVwiXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIGluZGV4OiAxMlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IHtcbiAgICAgICAgICAgICAgICBocmVmOiBcImh0dHBzOi8vYmxvZy50d2l0dGVyLmNvbS8yMDE1L3JlbW92aW5nLXRoZS0xNDAtY2hhcmFjdGVyLWxpbWl0LWZyb20tZGlyZWN0LW1lc3NhZ2VzXCIsXG4gICAgICAgICAgICAgICAgdGV4dDogXCJSZW1vdmluZyB0aGUgMTQwLWNoYXJhY3RlciBsaW1pdCBmcm9tIERpcmVjdCBNZXNzYWdlc1wiXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIHVybDogXCJodHRwczovL25ld3MueWNvbWJpbmF0b3IuY29tL1wiLFxuICAgICAgICAgICAgICBwb2ludHM6IFwiMTM5XCIsXG4gICAgICAgICAgICAgIHVzZXI6IHtcbiAgICAgICAgICAgICAgICBocmVmOiBcImh0dHBzOi8vbmV3cy55Y29tYmluYXRvci5jb20vdXNlcj9pZD11cHRvd25cIixcbiAgICAgICAgICAgICAgICB0ZXh0OiBcInVwdG93blwiXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIGNvbW1lbnRzOiB7XG4gICAgICAgICAgICAgICAgaHJlZjogXCJodHRwczovL25ld3MueWNvbWJpbmF0b3IuY29tL2l0ZW0/aWQ9MTAwNDkxMzdcIixcbiAgICAgICAgICAgICAgICB0ZXh0OiBcIjEwNVwiXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIGluZGV4OiAxM1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IHtcbiAgICAgICAgICAgICAgICBocmVmOiBcImh0dHA6Ly9tYXJrYWxsZW50aG9ybnRvbi5jb20vYmxvZy9zdHlsaXN0aWMtc2ltaWxhcml0eS9cIixcbiAgICAgICAgICAgICAgICB0ZXh0OiBcIkFuYWx5emluZyBzdHlsaXN0aWMgc2ltaWxhcml0eSBhbW9uZ3N0IGF1dGhvcnNcIlxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB1cmw6IFwiaHR0cHM6Ly9uZXdzLnljb21iaW5hdG9yLmNvbS9cIixcbiAgICAgICAgICAgICAgcG9pbnRzOiBcIjE5XCIsXG4gICAgICAgICAgICAgIHVzZXI6IHtcbiAgICAgICAgICAgICAgICBocmVmOiBcImh0dHBzOi8vbmV3cy55Y29tYmluYXRvci5jb20vdXNlcj9pZD1saW5nYmVuXCIsXG4gICAgICAgICAgICAgICAgdGV4dDogXCJsaW5nYmVuXCJcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgY29tbWVudHM6IHtcbiAgICAgICAgICAgICAgICBocmVmOiBcImh0dHBzOi8vbmV3cy55Y29tYmluYXRvci5jb20vaXRlbT9pZD0xMDA1MDYwM1wiLFxuICAgICAgICAgICAgICAgIHRleHQ6IFwiNVwiXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIGluZGV4OiAxNFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IHtcbiAgICAgICAgICAgICAgICBocmVmOiBcImh0dHA6Ly93d3cudGxkcC5vcmcvSE9XVE8vQXNzZW1ibHktSE9XVE8vaGVsbG8uaHRtbFwiLFxuICAgICAgICAgICAgICAgIHRleHQ6IFwiTGludXggQXNzZW1ibHkgSG93IFRvOiDigJxIZWxsbywgV29ybGTigJ1cIlxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB1cmw6IFwiaHR0cHM6Ly9uZXdzLnljb21iaW5hdG9yLmNvbS9cIixcbiAgICAgICAgICAgICAgcG9pbnRzOiBcIjgyXCIsXG4gICAgICAgICAgICAgIHVzZXI6IHtcbiAgICAgICAgICAgICAgICBocmVmOiBcImh0dHBzOi8vbmV3cy55Y29tYmluYXRvci5jb20vdXNlcj9pZD1taW5kY3JpbWVcIixcbiAgICAgICAgICAgICAgICB0ZXh0OiBcIm1pbmRjcmltZVwiXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIGNvbW1lbnRzOiB7XG4gICAgICAgICAgICAgICAgaHJlZjogXCJodHRwczovL25ld3MueWNvbWJpbmF0b3IuY29tL2l0ZW0/aWQ9MTAwNDkwMjBcIixcbiAgICAgICAgICAgICAgICB0ZXh0OiBcIjI2XCJcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgaW5kZXg6IDE1XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB0aXRsZToge1xuICAgICAgICAgICAgICAgIGhyZWY6IFwiaHR0cHM6Ly9hcHBodWIuaW8vXCIsXG4gICAgICAgICAgICAgICAgdGV4dDogXCJBcHBIdWIg4oCTIFVwZGF0ZSBSZWFjdCBOYXRpdmUgQXBwcyBXaXRob3V0IFJlLVN1Ym1pdHRpbmcgdG8gQXBwbGVcIlxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB1cmw6IFwiaHR0cHM6Ly9uZXdzLnljb21iaW5hdG9yLmNvbS9cIixcbiAgICAgICAgICAgICAgcG9pbnRzOiBcIjEyMlwiLFxuICAgICAgICAgICAgICB1c2VyOiB7XG4gICAgICAgICAgICAgICAgaHJlZjogXCJodHRwczovL25ld3MueWNvbWJpbmF0b3IuY29tL3VzZXI/aWQ9YXJiZXNmZWxkXCIsXG4gICAgICAgICAgICAgICAgdGV4dDogXCJhcmJlc2ZlbGRcIlxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBjb21tZW50czoge1xuICAgICAgICAgICAgICAgIGhyZWY6IFwiaHR0cHM6Ly9uZXdzLnljb21iaW5hdG9yLmNvbS9pdGVtP2lkPTEwMDQ4MDcyXCIsXG4gICAgICAgICAgICAgICAgdGV4dDogXCI1NVwiXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIGluZGV4OiAxNlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IHtcbiAgICAgICAgICAgICAgICBocmVmOiBcImh0dHBzOi8vZGV2ZWxvcGVyLm52aWRpYS5jb20vZGVlcC1sZWFybmluZy1jb3Vyc2VzXCIsXG4gICAgICAgICAgICAgICAgdGV4dDogXCJEZWVwIExlYXJuaW5nIENvdXJzZXNcIlxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB1cmw6IFwiaHR0cHM6Ly9uZXdzLnljb21iaW5hdG9yLmNvbS9cIixcbiAgICAgICAgICAgICAgcG9pbnRzOiBcIjk0XCIsXG4gICAgICAgICAgICAgIHVzZXI6IHtcbiAgICAgICAgICAgICAgICBocmVmOiBcImh0dHBzOi8vbmV3cy55Y29tYmluYXRvci5jb20vdXNlcj9pZD1jamR1bGJlcmdlclwiLFxuICAgICAgICAgICAgICAgIHRleHQ6IFwiY2pkdWxiZXJnZXJcIlxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBjb21tZW50czoge1xuICAgICAgICAgICAgICAgIGhyZWY6IFwiaHR0cHM6Ly9uZXdzLnljb21iaW5hdG9yLmNvbS9pdGVtP2lkPTEwMDQ4NDg3XCIsXG4gICAgICAgICAgICAgICAgdGV4dDogXCIxNVwiXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIGluZGV4OiAxN1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IHtcbiAgICAgICAgICAgICAgICBocmVmOiBcImh0dHA6Ly9sZW5zLmJsb2dzLm55dGltZXMuY29tLzIwMTUvMDgvMTIva29kYWtzLWZpcnN0LWRpZ2l0YWwtbW9tZW50L1wiLFxuICAgICAgICAgICAgICAgIHRleHQ6IFwiS29kYWvigJlzIEZpcnN0IERpZ2l0YWwgTW9tZW50XCJcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgdXJsOiBcImh0dHBzOi8vbmV3cy55Y29tYmluYXRvci5jb20vXCIsXG4gICAgICAgICAgICAgIHBvaW50czogXCI0NlwiLFxuICAgICAgICAgICAgICB1c2VyOiB7XG4gICAgICAgICAgICAgICAgaHJlZjogXCJodHRwczovL25ld3MueWNvbWJpbmF0b3IuY29tL3VzZXI/aWQ9dHlzb25lXCIsXG4gICAgICAgICAgICAgICAgdGV4dDogXCJ0eXNvbmVcIlxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBjb21tZW50czoge1xuICAgICAgICAgICAgICAgIGhyZWY6IFwiaHR0cHM6Ly9uZXdzLnljb21iaW5hdG9yLmNvbS9pdGVtP2lkPTEwMDQ4NzY2XCIsXG4gICAgICAgICAgICAgICAgdGV4dDogXCIxN1wiXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIGluZGV4OiAxOFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IHtcbiAgICAgICAgICAgICAgICBocmVmOiBcImh0dHBzOi8vYmxvZy5mdXNpb25kaWdpdGFsLmlvL3RoZS1pbnRlcm5ldC1vZi10aGluZ3MtYS1sb29rLWF0LWVtYmVkZGVkLXdpZmktZGV2ZWxvcG1lbnQtYm9hcmRzLTdhYmVlMTMxMTcxMT9zb3VyY2U9eW91ci1zdG9yaWVzXCIsXG4gICAgICAgICAgICAgICAgdGV4dDogXCJBIExvb2sgYXQgRW1iZWRkZWQgV2lGaSBEZXZlbG9wbWVudCBCb2FyZHNcIlxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB1cmw6IFwiaHR0cHM6Ly9uZXdzLnljb21iaW5hdG9yLmNvbS9cIixcbiAgICAgICAgICAgICAgcG9pbnRzOiBcIjQ0XCIsXG4gICAgICAgICAgICAgIHVzZXI6IHtcbiAgICAgICAgICAgICAgICBocmVmOiBcImh0dHBzOi8vbmV3cy55Y29tYmluYXRvci5jb20vdXNlcj9pZD1obGZzaGVsbFwiLFxuICAgICAgICAgICAgICAgIHRleHQ6IFwiaGxmc2hlbGxcIlxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBjb21tZW50czoge1xuICAgICAgICAgICAgICAgIGhyZWY6IFwiaHR0cHM6Ly9uZXdzLnljb21iaW5hdG9yLmNvbS9pdGVtP2lkPTEwMDQ4NDM0XCIsXG4gICAgICAgICAgICAgICAgdGV4dDogXCIxNlwiXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIGluZGV4OiAxOVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IHtcbiAgICAgICAgICAgICAgICBocmVmOiBcImh0dHBzOi8vZ2l0aHViLmNvbS9zemlsYXJkL2JlbmNobS1tbFwiLFxuICAgICAgICAgICAgICAgIHRleHQ6IFwiQ29tcGFyaXNvbiBvZiBtYWNoaW5lIGxlYXJuaW5nIGxpYnJhcmllcyB1c2VkIGZvciBjbGFzc2lmaWNhdGlvblwiXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIHVybDogXCJodHRwczovL25ld3MueWNvbWJpbmF0b3IuY29tL1wiLFxuICAgICAgICAgICAgICBwb2ludHM6IFwiMTcyXCIsXG4gICAgICAgICAgICAgIHVzZXI6IHtcbiAgICAgICAgICAgICAgICBocmVmOiBcImh0dHBzOi8vbmV3cy55Y29tYmluYXRvci5jb20vdXNlcj9pZD1wenNcIixcbiAgICAgICAgICAgICAgICB0ZXh0OiBcInB6c1wiXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIGNvbW1lbnRzOiB7XG4gICAgICAgICAgICAgICAgaHJlZjogXCJodHRwczovL25ld3MueWNvbWJpbmF0b3IuY29tL2l0ZW0/aWQ9MTAwNDcwMzdcIixcbiAgICAgICAgICAgICAgICB0ZXh0OiBcIjMzXCJcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgaW5kZXg6IDIwXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB0aXRsZToge1xuICAgICAgICAgICAgICAgIGhyZWY6IFwiaHR0cDovL3ZlbnR1cmViZWF0LmNvbS8yMDE1LzA4LzExL3NvdXJjZWRuYS1sYXVuY2hlcy1zZWFyY2hsaWdodC1hLWRldmVsb3Blci10b29sLXRvLWZpbmQtY29kaW5nLXByb2JsZW1zLWluLWFueS1hcHAvXCIsXG4gICAgICAgICAgICAgICAgdGV4dDogXCJTb3VyY2VETkEgKFlDIFMxNSkgZmluZHMgaGlkZGVuIHNlY3VyaXR5IGFuZCBxdWFsaXR5IGZsYXdzIGluIGFwcHNcIlxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB1cmw6IFwiaHR0cHM6Ly9uZXdzLnljb21iaW5hdG9yLmNvbS9cIixcbiAgICAgICAgICAgICAgcG9pbnRzOiBcIjQ5XCIsXG4gICAgICAgICAgICAgIHVzZXI6IHtcbiAgICAgICAgICAgICAgICBocmVmOiBcImh0dHBzOi8vbmV3cy55Y29tYmluYXRvci5jb20vdXNlcj9pZD1rYXRtXCIsXG4gICAgICAgICAgICAgICAgdGV4dDogXCJrYXRtXCJcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgY29tbWVudHM6IHtcbiAgICAgICAgICAgICAgICBocmVmOiBcImh0dHBzOi8vbmV3cy55Y29tYmluYXRvci5jb20vaXRlbT9pZD0xMDA0OTkyNVwiLFxuICAgICAgICAgICAgICAgIHRleHQ6IFwiMzBcIlxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBpbmRleDogMjFcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHRpdGxlOiB7XG4gICAgICAgICAgICAgICAgaHJlZjogXCJodHRwczovL2dpdGh1Yi5jb20vYmxvZy8yMDQ2LWdpdGh1Yi1kZXNrdG9wLWlzLW5vdy1hdmFpbGFibGVcIixcbiAgICAgICAgICAgICAgICB0ZXh0OiBcIkdpdEh1YiBEZXNrdG9wIGlzIG5vdyBhdmFpbGFibGVcIlxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB1cmw6IFwiaHR0cHM6Ly9uZXdzLnljb21iaW5hdG9yLmNvbS9cIixcbiAgICAgICAgICAgICAgcG9pbnRzOiBcIjI1M1wiLFxuICAgICAgICAgICAgICB1c2VyOiB7XG4gICAgICAgICAgICAgICAgaHJlZjogXCJodHRwczovL25ld3MueWNvbWJpbmF0b3IuY29tL3VzZXI/aWQ9YnBpZXJyZVwiLFxuICAgICAgICAgICAgICAgIHRleHQ6IFwiYnBpZXJyZVwiXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIGNvbW1lbnRzOiB7XG4gICAgICAgICAgICAgICAgaHJlZjogXCJodHRwczovL25ld3MueWNvbWJpbmF0b3IuY29tL2l0ZW0/aWQ9MTAwNDgxMDBcIixcbiAgICAgICAgICAgICAgICB0ZXh0OiBcIjIwM1wiXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIGluZGV4OiAyMlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IHtcbiAgICAgICAgICAgICAgICBocmVmOiBcImh0dHBzOi8vd3d3LnRoZWd1YXJkaWFuLmNvbS9pbmZvL2RldmVsb3Blci1ibG9nLzIwMTUvYXVnLzEyL29wZW4tc291cmNpbmctZ3JpZC1pbWFnZS1zZXJ2aWNlXCIsXG4gICAgICAgICAgICAgICAgdGV4dDogXCJPcGVuIHNvdXJjaW5nIEdyaWQsIHRoZSBHdWFyZGlhbuKAmXMgbmV3IGltYWdlIG1hbmFnZW1lbnQgc2VydmljZVwiXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIHVybDogXCJodHRwczovL25ld3MueWNvbWJpbmF0b3IuY29tL1wiLFxuICAgICAgICAgICAgICBwb2ludHM6IFwiMTI2XCIsXG4gICAgICAgICAgICAgIHVzZXI6IHtcbiAgICAgICAgICAgICAgICBocmVmOiBcImh0dHBzOi8vbmV3cy55Y29tYmluYXRvci5jb20vdXNlcj9pZD1yb29tMjcxXCIsXG4gICAgICAgICAgICAgICAgdGV4dDogXCJyb29tMjcxXCJcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgY29tbWVudHM6IHtcbiAgICAgICAgICAgICAgICBocmVmOiBcImh0dHBzOi8vbmV3cy55Y29tYmluYXRvci5jb20vaXRlbT9pZD0xMDA0NzY4NVwiLFxuICAgICAgICAgICAgICAgIHRleHQ6IFwiMTdcIlxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBpbmRleDogMjNcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHRpdGxlOiB7XG4gICAgICAgICAgICAgICAgaHJlZjogXCJodHRwOi8vcGVuZ3VpbnJhbmRvbWhvdXNlLmNhL2hhemxpdHQvZmVhdHVyZS9sYXN0LWRheXMta2F0aHktYWNrZXJcIixcbiAgICAgICAgICAgICAgICB0ZXh0OiBcIlRoZSBMYXN0IERheXMgb2YgS2F0aHkgQWNrZXJcIlxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB1cmw6IFwiaHR0cHM6Ly9uZXdzLnljb21iaW5hdG9yLmNvbS9cIixcbiAgICAgICAgICAgICAgcG9pbnRzOiBcIjNcIixcbiAgICAgICAgICAgICAgdXNlcjoge1xuICAgICAgICAgICAgICAgIGhyZWY6IFwiaHR0cHM6Ly9uZXdzLnljb21iaW5hdG9yLmNvbS91c2VyP2lkPWNvbGlucHJpbmNlXCIsXG4gICAgICAgICAgICAgICAgdGV4dDogXCJjb2xpbnByaW5jZVwiXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIGNvbW1lbnRzOiB7XG4gICAgICAgICAgICAgICAgaHJlZjogXCJcIixcbiAgICAgICAgICAgICAgICB0ZXh0OiBcIlwiXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIGluZGV4OiAyNFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IHtcbiAgICAgICAgICAgICAgICBocmVmOiBcImh0dHA6Ly9heG9uLmNzLmJ5dS5lZHUvbXJzbWl0aC8yMDE1SUpDTk5fTUFOSUMucGRmXCIsXG4gICAgICAgICAgICAgICAgdGV4dDogXCJBIE1pbmltYWwgQXJjaGl0ZWN0dXJlIGZvciBHZW5lcmFsIENvZ25pdGlvbiBbcGRmXVwiXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIHVybDogXCJodHRwczovL25ld3MueWNvbWJpbmF0b3IuY29tL1wiLFxuICAgICAgICAgICAgICBwb2ludHM6IFwiNTNcIixcbiAgICAgICAgICAgICAgdXNlcjoge1xuICAgICAgICAgICAgICAgIGhyZWY6IFwiaHR0cHM6Ly9uZXdzLnljb21iaW5hdG9yLmNvbS91c2VyP2lkPWx1dVwiLFxuICAgICAgICAgICAgICAgIHRleHQ6IFwibHV1XCJcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgY29tbWVudHM6IHtcbiAgICAgICAgICAgICAgICBocmVmOiBcImh0dHBzOi8vbmV3cy55Y29tYmluYXRvci5jb20vaXRlbT9pZD0xMDA0ODAxN1wiLFxuICAgICAgICAgICAgICAgIHRleHQ6IFwiOFwiXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIGluZGV4OiAyNVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IHtcbiAgICAgICAgICAgICAgICBocmVmOiBcImh0dHBzOi8vYmxvZy5kb2NrZXIuY29tLzIwMTUvMDgvY29udGVudC10cnVzdC1kb2NrZXItMS04L1wiLFxuICAgICAgICAgICAgICAgIHRleHQ6IFwiSW50cm9kdWNpbmcgRG9ja2VyIENvbnRlbnQgVHJ1c3RcIlxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB1cmw6IFwiaHR0cHM6Ly9uZXdzLnljb21iaW5hdG9yLmNvbS9cIixcbiAgICAgICAgICAgICAgcG9pbnRzOiBcIjgzXCIsXG4gICAgICAgICAgICAgIHVzZXI6IHtcbiAgICAgICAgICAgICAgICBocmVmOiBcImh0dHBzOi8vbmV3cy55Y29tYmluYXRvci5jb20vdXNlcj9pZD1ka2FzcGVyXCIsXG4gICAgICAgICAgICAgICAgdGV4dDogXCJka2FzcGVyXCJcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgY29tbWVudHM6IHtcbiAgICAgICAgICAgICAgICBocmVmOiBcImh0dHBzOi8vbmV3cy55Y29tYmluYXRvci5jb20vaXRlbT9pZD0xMDA0ODA5NlwiLFxuICAgICAgICAgICAgICAgIHRleHQ6IFwiMjRcIlxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBpbmRleDogMjZcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHRpdGxlOiB7XG4gICAgICAgICAgICAgICAgaHJlZjogXCJodHRwOi8vYmxvZy5jb252b3guY29tL2ludGVncmF0aW9uLW92ZXItaW52ZW50aW9uXCIsXG4gICAgICAgICAgICAgICAgdGV4dDogXCJJbnRlZ3JhdGlvbiBvdmVyIEludmVudGlvblwiXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIHVybDogXCJodHRwczovL25ld3MueWNvbWJpbmF0b3IuY29tL1wiLFxuICAgICAgICAgICAgICBwb2ludHM6IFwiODdcIixcbiAgICAgICAgICAgICAgdXNlcjoge1xuICAgICAgICAgICAgICAgIGhyZWY6IFwiaHR0cHM6Ly9uZXdzLnljb21iaW5hdG9yLmNvbS91c2VyP2lkPWJnZW50cnlcIixcbiAgICAgICAgICAgICAgICB0ZXh0OiBcImJnZW50cnlcIlxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBjb21tZW50czoge1xuICAgICAgICAgICAgICAgIGhyZWY6IFwiaHR0cHM6Ly9uZXdzLnljb21iaW5hdG9yLmNvbS9pdGVtP2lkPTEwMDQ4MDg2XCIsXG4gICAgICAgICAgICAgICAgdGV4dDogXCI5XCJcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgaW5kZXg6IDI3XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB0aXRsZToge1xuICAgICAgICAgICAgICAgIGhyZWY6IFwiaHR0cDovL3d3dy5lY29ub21pc3QuY29tL25ld3MvbGVhZGVycy8yMTY2MDkxOS1vbmx5LXNlY29uZC10aW1lLW91ci1oaXN0b3J5LW93bmVyc2hpcC1lY29ub21pc3QtY2hhbmdlcy1uZXctY2hhcHRlclwiLFxuICAgICAgICAgICAgICAgIHRleHQ6IFwiRm9yIG9ubHkgdGhlIHNlY29uZCB0aW1lIGluIG91ciBoaXN0b3J5IHRoZSBvd25lcnNoaXAgb2YgVGhlIEVjb25vbWlzdCBjaGFuZ2VzXCJcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgdXJsOiBcImh0dHBzOi8vbmV3cy55Y29tYmluYXRvci5jb20vXCIsXG4gICAgICAgICAgICAgIHBvaW50czogXCIxNDlcIixcbiAgICAgICAgICAgICAgdXNlcjoge1xuICAgICAgICAgICAgICAgIGhyZWY6IFwiaHR0cHM6Ly9uZXdzLnljb21iaW5hdG9yLmNvbS91c2VyP2lkPXVjYWV0YW5vXCIsXG4gICAgICAgICAgICAgICAgdGV4dDogXCJ1Y2FldGFub1wiXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIGNvbW1lbnRzOiB7XG4gICAgICAgICAgICAgICAgaHJlZjogXCJodHRwczovL25ld3MueWNvbWJpbmF0b3IuY29tL2l0ZW0/aWQ9MTAwNDc4NDVcIixcbiAgICAgICAgICAgICAgICB0ZXh0OiBcIjEyNlwiXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIGluZGV4OiAyOFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IHtcbiAgICAgICAgICAgICAgICBocmVmOiBcImh0dHA6Ly9ncm5oLnNlL2lwZnliM1wiLFxuICAgICAgICAgICAgICAgIHRleHQ6IFwiSGVsbG9TaWduIChZQyBXMTEpIElzIEhpcmluZyBhIFRlY2huaWNhbCBQcm9kdWN0IE1hbmFnZXIgZm9yIEl0cyBBUElcIlxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB1cmw6IFwiaHR0cHM6Ly9uZXdzLnljb21iaW5hdG9yLmNvbS9cIixcbiAgICAgICAgICAgICAgcG9pbnRzOiBcIlwiLFxuICAgICAgICAgICAgICB1c2VyOiB7XG4gICAgICAgICAgICAgICAgaHJlZjogXCJcIixcbiAgICAgICAgICAgICAgICB0ZXh0OiBcIlwiXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIGNvbW1lbnRzOiB7XG4gICAgICAgICAgICAgICAgaHJlZjogXCJcIixcbiAgICAgICAgICAgICAgICB0ZXh0OiBcIlwiXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIGluZGV4OiAyOVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IHtcbiAgICAgICAgICAgICAgICBocmVmOiBcImh0dHA6Ly9uZXdzb2ZmaWNlLm1pdC5lZHUvMjAxNS9yZWFsLXRpbWUtZGF0YS1mb3ItY2FuY2VyLXRoZXJhcHktMDgwNFwiLFxuICAgICAgICAgICAgICAgIHRleHQ6IFwiUmVhbC10aW1lIGRhdGEgZm9yIGNhbmNlciB0aGVyYXB5XCJcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgdXJsOiBcImh0dHBzOi8vbmV3cy55Y29tYmluYXRvci5jb20vXCIsXG4gICAgICAgICAgICAgIHBvaW50czogXCIxOFwiLFxuICAgICAgICAgICAgICB1c2VyOiB7XG4gICAgICAgICAgICAgICAgaHJlZjogXCJodHRwczovL25ld3MueWNvbWJpbmF0b3IuY29tL3VzZXI/aWQ9b3Blbm1hemVcIixcbiAgICAgICAgICAgICAgICB0ZXh0OiBcIm9wZW5tYXplXCJcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgY29tbWVudHM6IHtcbiAgICAgICAgICAgICAgICBocmVmOiBcIlwiLFxuICAgICAgICAgICAgICAgIHRleHQ6IFwiXCJcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgaW5kZXg6IDMwXG4gICAgICAgICAgICB9XG4gICAgICAgICAgXVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICByZXNvbHZlOiB7XG4gICAgICB1c2VyOiAoJHN0YXRlUGFyYW1zLCBVc2VyKSA9PiBVc2VyLmZpbmQoJHN0YXRlUGFyYW1zLmlkKSxcbiAgICAgIHJvdXRlczogKHVzZXIpID0+IHVzZXIuZ2V0Um91dGVzKClcbiAgICB9XG4gIH0pXG59KVxuIiwiYXBwLmZhY3RvcnkoJ1JvdXRlJywgKCRzdGF0ZSwgRFMpID0+IHtcblxuICBsZXQgUm91dGUgPSBEUy5kZWZpbmVSZXNvdXJjZSh7XG4gICAgbmFtZTogJ3JvdXRlJyxcbiAgICBlbmRwb2ludDogJ3JvdXRlcycsXG4gICAgcmVsYXRpb25zOiB7XG4gICAgICBiZWxvbmdzVG86IHtcbiAgICAgICAgdXNlcjoge1xuICAgICAgICAgIC8vIGxvY2FsIGZpZWxkIGlzIGZvciBsaW5raW5nIHJlbGF0aW9uc1xuICAgICAgICAgIC8vIHJvdXRlLnVzZXIgLT4gdXNlcihvd25lcikgb2YgdGhlIHJvdXRlXG4gICAgICAgICAgbG9jYWxGaWVsZDogJ191c2VyJyxcbiAgICAgICAgICAvLyBsb2NhbCBrZXkgaXMgdGhlIFwiam9pblwiIGZpZWxkXG4gICAgICAgICAgLy8gdGhlIG5hbWUgb2YgdGhlIGZpZWxkIG9uIHRoZSByb3V0ZSB0aGF0IHBvaW50cyB0byBpdHMgcGFyZW50IHVzZXJcbiAgICAgICAgICBsb2NhbEtleTogJ3VzZXInXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIG1ldGhvZHM6IHtcbiAgICAgIGdvOiBmdW5jdGlvbigpIHtcbiAgICAgICAgY29uc29sZS5sb2coYHRyYW5zaXRpb25pbmcgdG8gcm91dGUgc3RhdGUgKCR7dGhpcy5uYW1lfSwgJHt0aGlzLl9pZH0pYClcbiAgICAgICAgLy8gJHN0YXRlLmdvKCdyb3V0ZScsIHsgaWQ6IHRoaXMuX2lkIH0pXG4gICAgICB9XG4gICAgfVxuICB9KVxuXG4gIHJldHVybiBSb3V0ZVxufSlcbi5ydW4oUm91dGUgPT4ge30pXG4iLCJhcHAuZmFjdG9yeSgnVXNlcicsICgkc3RhdGUsIFJvdXRlLCBEUykgPT4ge1xuXG4gIGxldCBVc2VyID0gRFMuZGVmaW5lUmVzb3VyY2Uoe1xuICAgIG5hbWU6ICd1c2VyJyxcbiAgICBlbmRwb2ludDogJ3VzZXJzJyxcbiAgICByZWxhdGlvbnM6IHtcbiAgICAgIGhhc01hbnk6IHtcbiAgICAgICAgcm91dGU6IHtcbiAgICAgICAgICAvLyBsb2NhbCBmaWVsZCBpcyBmb3IgbGlua2luZyByZWxhdGlvbnNcbiAgICAgICAgICAvLyB1c2VyLnJvdXRlcyAtPiBhcnJheSBvZiByb3V0ZXMgZm9yIHRoZSB1c2VyXG4gICAgICAgICAgbG9jYWxGaWVsZDogJ3JvdXRlcycsXG4gICAgICAgICAgLy8gZm9yZWlnbiBrZXkgaXMgdGhlICdqb2luJyBmaWVsZFxuICAgICAgICAgIC8vIHRoZSBuYW1lIG9mIHRoZSBmaWVsZCBvbiBhIHJvdXRlIHRoYXQgcG9pbnRzIHRvIGl0cyBwYXJlbnQgdXNlclxuICAgICAgICAgIGZvcmVpZ25LZXk6ICd1c2VyJ1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICBtZXRob2RzOiB7ICAvLyBmdW5jdGlvbmFsaXR5IGFkZGVkIHRvIGV2ZXJ5IGluc3RhbmNlIG9mIFVzZXJcbiAgICAgIGdvOiBmdW5jdGlvbigpIHtcbiAgICAgICAgJHN0YXRlLmdvKCd1c2VyJywgeyBpZDogdGhpcy5faWQgfSlcbiAgICAgIH0sXG4gICAgICBnZXRSb3V0ZXM6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gUm91dGUuZmluZEFsbCh7ICd1c2VyJzogdGhpcy5faWQgfSlcbiAgICAgIH1cbiAgICB9XG4gIH0pXG5cbiAgcmV0dXJuIFVzZXJcbn0pXG4ucnVuKFVzZXIgPT4ge30pXG4iLCJhcHAuZGlyZWN0aXZlKCduYXZiYXInLCBmdW5jdGlvbiAoJHJvb3RTY29wZSwgJHN0YXRlLCBBdXRoU2VydmljZSwgQVVUSF9FVkVOVFMsIFVzZXIpIHtcblxuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHNjb3BlOiB7fSxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9jb21tb24vZGlyZWN0aXZlcy9uYXZiYXIvbmF2YmFyLmh0bWwnLFxuICAgICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUsIGVsZW0sIGF0dHIpIHtcblxuICAgICAgICAgICAgc2NvcGUuaXRlbXMgPSBbXG4gICAgICAgICAgICAgICAgLy8geyBsYWJlbDogJ0hvbWUnLCBzdGF0ZTogJ2hvbWUnIH0sXG4gICAgICAgICAgICAgICAgeyBsYWJlbDogJ0RvY3VtZW50YXRpb24nLCBzdGF0ZTogJ2RvY3MnIH0sXG4gICAgICAgICAgICAgICAgeyBsYWJlbDogJ0Fib3V0Jywgc3RhdGU6ICdhYm91dCcgfSxcbiAgICAgICAgICAgICAgICB7IGxhYmVsOiAnSGVscCcsIHN0YXRlOiAnaGVscCcgfSxcbiAgICAgICAgICAgICAgICAvL3sgbGFiZWw6ICdNZW1iZXJzIE9ubHknLCBzdGF0ZTogJ21lbWJlcnNPbmx5JywgYXV0aDogdHJ1ZSB9XG4gICAgICAgICAgICBdO1xuXG4gICAgICAgICAgICBzY29wZS5zaG93ID0gZmFsc2VcblxuICAgICAgICAgICAgc2NvcGUudG9nZ2xlID0gKCkgPT4gc2NvcGUuc2hvdyA9ICFzY29wZS5zaG93XG5cbiAgICAgICAgICAgIHNjb3BlLnNlYXJjaCA9ICgpID0+IHtcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3NlYXJjaGluZyBmb3Igc29tZXRoaW5nLi4uJylcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgc2NvcGUudXNlciA9IG51bGw7XG5cbiAgICAgICAgICAgIHNjb3BlLmlzTG9nZ2VkSW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIEF1dGhTZXJ2aWNlLmlzQXV0aGVudGljYXRlZCgpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgc2NvcGUubG9nb3V0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIEF1dGhTZXJ2aWNlLmxvZ291dCgpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICRzdGF0ZS5nbygnaG9tZScpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdmFyIHNldFVzZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgQXV0aFNlcnZpY2UuZ2V0TG9nZ2VkSW5Vc2VyKClcbiAgICAgICAgICAgICAgICAgIC50aGVuKHVzZXIgPT4gVXNlci5maW5kKHVzZXIuX2lkKSlcbiAgICAgICAgICAgICAgICAgIC50aGVuKHVzZXIgPT4ge1xuICAgICAgICAgICAgICAgICAgICBzY29wZS51c2VyID0gdXNlclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdXNlclxuICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHZhciByZW1vdmVVc2VyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHNjb3BlLnVzZXIgPSBudWxsO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgc2V0VXNlcigpO1xuXG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5sb2dpblN1Y2Nlc3MsIHNldFVzZXIpO1xuICAgICAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMubG9nb3V0U3VjY2VzcywgcmVtb3ZlVXNlcik7XG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5zZXNzaW9uVGltZW91dCwgcmVtb3ZlVXNlcik7XG5cbiAgICAgICAgfVxuXG4gICAgfTtcblxufSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbmFwcC5kaXJlY3RpdmUoJ25nRW50ZXInLCAoKSA9PiB7XG5cdHJldHVybiB7XG5cdFx0cmVzdHJpY3Q6ICdBJyxcblx0XHRzY29wZToge1xuXHRcdFx0bmdFbnRlcjogJyYnXG5cdFx0fSxcblx0XHRsaW5rOiAoc2NvcGUsIGVsZW0sIGF0dHIpID0+IHtcblx0XHRcdGVsZW0uYmluZCgna2V5ZG93biBrZXlwcmVzcycsIChldmVudCkgPT4ge1xuXHRcdFx0XHRpZiAoZXZlbnQud2hpY2ggPT0gMTMpIHtcblx0XHRcdFx0XHRzY29wZS4kYXBwbHkoKCkgPT4ge1xuICAgICAgICAgICAgc2NvcGUubmdFbnRlcigpXG4gICAgICAgICAgfSlcblx0XHRcdFx0XHRyZXR1cm4gZmFsc2Vcblx0XHRcdFx0fVxuXHRcdFx0fSlcblx0XHR9XG5cdH1cbn0pXG4iLCJhcHAuZGlyZWN0aXZlKCdub2RlbW9ub0xvZ28nLCBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9jb21tb24vZGlyZWN0aXZlcy9ub2RlbW9uby1sb2dvL25vZGVtb25vLWxvZ28uaHRtbCcsXG4gICAgICAgIGxpbms6IChzY29wZSwgZWxlbSwgYXR0cikgPT4ge1xuXG4gICAgICAgICAgc2NvcGUuaW5zdGFsbENocm9tZUV4dCA9ICgpID0+IHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGBpbnN0YWxsaW5nIE5vZGVtb25vIGNocm9tZSBleHRlbnNpb24uLi5gKVxuICAgICAgICAgIH1cblxuICAgICAgICB9XG4gICAgfTtcbn0pO1xuIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9