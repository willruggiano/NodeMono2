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
        return { title: [route.name, route.name + '1'], more: [route.url] };

        // get crawled data for the route
        // return $http.get(`/api/routes/${route.user}/${route.name}`)
        // .then(res => res.data);
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
        PipesFactory.savePipe().then(function (data) {
            console.log('saved the pipe', data);
        });
    };
});
app.config(function ($stateProvider) {
    $stateProvider.state('user', {
        url: '/:id/profile',
        templateUrl: 'js/user_profile/user_profile.html',
        controller: function controller($scope, user, routes) {
            $scope.user = user;
            $scope.routes = routes;

            console.log(user, routes);
        },
        resolve: {
            user: function user($stateParams, User) {
                return User.find($stateParams.id);
            },
            routes: function routes(user, Route) {
                return Route.findAll({ '_user': user });
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
                    localKey: 'user',
                    parent: true
                }
            }
        },
        methods: {
            go: function go() {
                console.log('transitioning to route state (' + this.name + ', ' + this._id + ')');
            }
        }
    });

    return Route;
}).run(function (Route) {});

app.factory('User', function ($state, DS) {

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

        // functionality added to every instance of User
        methods: {
            go: function go() {
                console.log('transitioning to user state (' + this.name + ')');
                $state.go('user', { id: this._id });
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
        link: function link(scope) {

            scope.items = [
            // { label: 'Home', state: 'home' },
            { label: 'Pipes', state: 'pipes' }, { label: 'Documentation', state: 'docs' }, { label: 'About', state: 'about' }, { label: 'Help', state: 'help' }];

            //{ label: 'Members Only', state: 'membersOnly', auth: true }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImFib3V0L2Fib3V0LmpzIiwiZG9jcy9kb2NzLmpzIiwiZnNhL2ZzYS1wcmUtYnVpbHQuanMiLCJoZWxwL2hlbHAuanMiLCJob21lL2hvbWUuanMiLCJsb2dpbi9sb2dpbi5qcyIsIm1lbWJlcnMtb25seS9tZW1iZXJzLW9ubHkuanMiLCJwaXBlcy9waXBlcy5mYWN0b3J5LmpzIiwicGlwZXMvcGlwZXMuanMiLCJ1c2VyX3Byb2ZpbGUvdXNlcl9wcm9maWxlLmpzIiwiY29tbW9uL2ZhY3Rvcmllcy9yb3V0ZS5mYWN0b3J5LmpzIiwiY29tbW9uL2ZhY3Rvcmllcy91c2VyLmZhY3RvcnkuanMiLCJwaXBlcy9maWx0ZXIvZmlsdGVyLmpzIiwicGlwZXMvcm91dGUvcm91dGUuanMiLCJjb21tb24vZGlyZWN0aXZlcy9uYXZiYXIvbmF2YmFyLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvbm9kZW1vbm8tbG9nby9ub2RlbW9uby1sb2dvLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLFlBQUEsQ0FBQTtBQUNBLE1BQUEsQ0FBQSxHQUFBLEdBQUEsT0FBQSxDQUFBLE1BQUEsQ0FBQSxhQUFBLEVBQUEsQ0FBQSxXQUFBLEVBQUEsY0FBQSxFQUFBLGFBQUEsRUFBQSxTQUFBLENBQUEsQ0FBQSxDQUFBOztBQUVBLEdBQUEsQ0FBQSxNQUFBLENBQUEsVUFBQSxrQkFBQSxFQUFBLGlCQUFBLEVBQUEsVUFBQSxFQUFBLHFCQUFBLEVBQUE7O0FBRUEscUJBQUEsQ0FBQSxTQUFBLENBQUEsSUFBQSxDQUFBLENBQUE7O0FBRUEsc0JBQUEsQ0FBQSxTQUFBLENBQUEsR0FBQSxDQUFBLENBQUE7OztBQUdBLGNBQUEsQ0FBQSxRQUFBLENBQUEsUUFBQSxHQUFBLE1BQUEsQ0FBQTtBQUNBLGNBQUEsQ0FBQSxRQUFBLENBQUEsV0FBQSxHQUFBLEtBQUEsQ0FBQTs7Ozs7QUFNQSxjQUFBLENBQUEsUUFBQSxDQUFBLFNBQUEsR0FBQSxVQUFBLE9BQUEsRUFBQTtBQUNBLFlBQUEsSUFBQSxHQUFBLElBQUEsQ0FBQSxNQUFBLEVBQUEsQ0FBQTtBQUNBLFlBQUEsSUFBQSxDQUFBLE1BQUEsRUFBQSxPQUFBLE9BQUEsQ0FBQSxPQUFBLENBQUEsT0FBQSxDQUFBLElBQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQSxDQUFBLEtBQ0EsT0FBQSxJQUFBLENBQUEsT0FBQSxFQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsSUFBQTttQkFBQSxPQUFBLENBQUEsSUFBQSxDQUFBLElBQUEsQ0FBQTtTQUFBLENBQUEsQ0FBQTtLQUNBLENBQUE7Ozs7OztBQU1BLGFBQUEsWUFBQSxDQUFBLFFBQUEsRUFBQSxRQUFBLEVBQUE7QUFDQSxpQkFBQSxZQUFBLENBQUEsQ0FBQSxFQUFBO0FBQ0Esa0JBQUEsQ0FBQSxPQUFBLENBQUEsT0FBQSxDQUFBLFFBQUEsQ0FBQSxZQUFBLEVBQUEsVUFBQSxHQUFBLEVBQUE7QUFDQSxvQkFBQSxZQUFBLEdBQUEsR0FBQSxDQUFBLFFBQUEsQ0FBQTtBQUNBLG9CQUFBLFdBQUEsR0FBQSxRQUFBLENBQUEsV0FBQSxDQUFBLFlBQUEsQ0FBQSxDQUFBO0FBQ0Esb0JBQUEsR0FBQSxDQUFBLElBQUEsS0FBQSxTQUFBLEVBQUE7QUFDQSx3QkFBQSxDQUFBLENBQUEsY0FBQSxDQUFBLEdBQUEsQ0FBQSxVQUFBLENBQUEsRUFBQTtBQUNBLDRCQUFBLENBQUEsQ0FBQSxHQUFBLENBQUEsVUFBQSxDQUFBLENBQUEsTUFBQSxJQUFBLENBQUEsTUFBQSxDQUFBLE9BQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQSxDQUFBLEdBQUEsQ0FBQSxVQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxFQUFBOztBQUVBLDZCQUFBLENBQUEsR0FBQSxDQUFBLFNBQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQSxHQUFBLENBQUEsVUFBQSxDQUFBLENBQUE7QUFDQSxtQ0FBQSxDQUFBLENBQUEsR0FBQSxDQUFBLFVBQUEsQ0FBQSxDQUFBO3lCQUNBLE1BQUEsSUFBQSxDQUFBLENBQUEsQ0FBQSxHQUFBLENBQUEsU0FBQSxDQUFBLEVBQUE7O0FBRUEsNkJBQUEsQ0FBQSxHQUFBLENBQUEsU0FBQSxDQUFBLEdBQUEsRUFBQSxDQUFBO0FBQ0Esa0NBQUEsQ0FBQSxPQUFBLENBQUEsT0FBQSxDQUFBLENBQUEsQ0FBQSxHQUFBLENBQUEsVUFBQSxDQUFBLEVBQUEsVUFBQSxLQUFBLEVBQUE7QUFDQSxpQ0FBQSxDQUFBLEdBQUEsQ0FBQSxTQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsS0FBQSxDQUFBLFdBQUEsQ0FBQSxXQUFBLENBQUEsQ0FBQSxDQUFBOzZCQUNBLENBQUEsQ0FBQTt5QkFDQTtxQkFDQTtpQkFDQSxNQUNBLElBQUEsR0FBQSxDQUFBLElBQUEsS0FBQSxXQUFBLEVBQUE7QUFDQSx3QkFBQSxDQUFBLENBQUEsY0FBQSxDQUFBLEdBQUEsQ0FBQSxVQUFBLENBQUEsRUFBQTs7QUFFQSw0QkFBQSxNQUFBLENBQUEsT0FBQSxDQUFBLFFBQUEsQ0FBQSxDQUFBLENBQUEsR0FBQSxDQUFBLFVBQUEsQ0FBQSxDQUFBLEVBQUE7QUFDQSw2QkFBQSxDQUFBLEdBQUEsQ0FBQSxRQUFBLENBQUEsR0FBQSxDQUFBLENBQUEsR0FBQSxDQUFBLFVBQUEsQ0FBQSxDQUFBLEdBQUEsQ0FBQTt5QkFDQTs7NkJBRUEsSUFBQSxDQUFBLE1BQUEsQ0FBQSxPQUFBLENBQUEsUUFBQSxDQUFBLENBQUEsQ0FBQSxHQUFBLENBQUEsVUFBQSxDQUFBLENBQUEsRUFBQTtBQUNBLGlDQUFBLENBQUEsR0FBQSxDQUFBLFFBQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQSxHQUFBLENBQUEsVUFBQSxDQUFBLENBQUE7QUFDQSx1Q0FBQSxDQUFBLENBQUEsR0FBQSxDQUFBLFVBQUEsQ0FBQSxDQUFBOzZCQUNBO3FCQUNBO2lCQUNBO2FBQ0EsQ0FBQSxDQUFBO1NBQ0E7O0FBRUEsWUFBQSxNQUFBLENBQUEsT0FBQSxDQUFBLE9BQUEsQ0FBQSxRQUFBLENBQUEsRUFBQTtBQUNBLGtCQUFBLENBQUEsT0FBQSxDQUFBLE9BQUEsQ0FBQSxRQUFBLEVBQUEsWUFBQSxDQUFBLENBQUE7U0FDQSxNQUFBO0FBQ0Esd0JBQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQTtTQUNBO0tBQ0E7O0FBR0EsY0FBQSxDQUFBLFFBQUEsQ0FBQSxXQUFBLEdBQUEsVUFBQSxRQUFBLEVBQUEsSUFBQSxFQUFBO0FBQ0EsWUFBQSxRQUFBLEdBQUEsSUFBQSxDQUFBLElBQUEsQ0FBQTtBQUNBLG9CQUFBLENBQUEsUUFBQSxFQUFBLFFBQUEsQ0FBQSxDQUFBO0FBQ0EsZUFBQSxRQUFBLENBQUE7S0FDQSxDQUFBOztDQUVBLENBQUEsQ0FBQTs7O0FBR0EsR0FBQSxDQUFBLEdBQUEsQ0FBQSxVQUFBLFVBQUEsRUFBQSxXQUFBLEVBQUEsTUFBQSxFQUFBOzs7QUFHQSxRQUFBLDRCQUFBLEdBQUEsU0FBQSw0QkFBQSxDQUFBLEtBQUEsRUFBQTtBQUNBLGVBQUEsS0FBQSxDQUFBLElBQUEsSUFBQSxLQUFBLENBQUEsSUFBQSxDQUFBLFlBQUEsQ0FBQTtLQUNBLENBQUE7Ozs7QUFJQSxjQUFBLENBQUEsR0FBQSxDQUFBLG1CQUFBLEVBQUEsVUFBQSxLQUFBLEVBQUEsT0FBQSxFQUFBLFFBQUEsRUFBQTs7QUFFQSxZQUFBLENBQUEsNEJBQUEsQ0FBQSxPQUFBLENBQUEsRUFBQTs7O0FBR0EsbUJBQUE7U0FDQTs7QUFFQSxZQUFBLFdBQUEsQ0FBQSxlQUFBLEVBQUEsRUFBQTs7O0FBR0EsbUJBQUE7U0FDQTs7O0FBR0EsYUFBQSxDQUFBLGNBQUEsRUFBQSxDQUFBOztBQUVBLG1CQUFBLENBQUEsZUFBQSxFQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsSUFBQSxFQUFBOzs7O0FBSUEsZ0JBQUEsSUFBQSxFQUFBO0FBQ0Esc0JBQUEsQ0FBQSxFQUFBLENBQUEsT0FBQSxDQUFBLElBQUEsRUFBQSxRQUFBLENBQUEsQ0FBQTthQUNBLE1BQUE7QUFDQSxzQkFBQSxDQUFBLEVBQUEsQ0FBQSxPQUFBLENBQUEsQ0FBQTthQUNBO1NBQ0EsQ0FBQSxDQUFBO0tBRUEsQ0FBQSxDQUFBO0NBRUEsQ0FBQSxDQUFBOztBQ3ZIQSxHQUFBLENBQUEsTUFBQSxDQUFBLFVBQUEsY0FBQSxFQUFBOzs7QUFHQSxrQkFBQSxDQUFBLEtBQUEsQ0FBQSxPQUFBLEVBQUE7QUFDQSxXQUFBLEVBQUEsUUFBQTtBQUNBLGtCQUFBLEVBQUEsaUJBQUE7QUFDQSxtQkFBQSxFQUFBLHFCQUFBO0tBQ0EsQ0FBQSxDQUFBO0NBRUEsQ0FBQSxDQUFBOztBQUVBLEdBQUEsQ0FBQSxVQUFBLENBQUEsaUJBQUEsRUFBQSxVQUFBLE1BQUEsRUFBQTs7OztDQUlBLENBQUEsQ0FBQTs7QUNmQSxHQUFBLENBQUEsTUFBQSxDQUFBLFVBQUEsY0FBQSxFQUFBO0FBQ0Esa0JBQUEsQ0FBQSxLQUFBLENBQUEsTUFBQSxFQUFBO0FBQ0EsV0FBQSxFQUFBLE9BQUE7QUFDQSxtQkFBQSxFQUFBLG1CQUFBO0tBQ0EsQ0FBQSxDQUFBO0NBQ0EsQ0FBQSxDQUFBOztBQ0xBLENBQUEsWUFBQTs7QUFFQSxnQkFBQSxDQUFBOzs7QUFHQSxRQUFBLENBQUEsTUFBQSxDQUFBLE9BQUEsRUFBQSxNQUFBLElBQUEsS0FBQSxDQUFBLHdCQUFBLENBQUEsQ0FBQTs7QUFFQSxRQUFBLEdBQUEsR0FBQSxPQUFBLENBQUEsTUFBQSxDQUFBLGFBQUEsRUFBQSxFQUFBLENBQUEsQ0FBQTs7QUFFQSxPQUFBLENBQUEsT0FBQSxDQUFBLFFBQUEsRUFBQSxZQUFBO0FBQ0EsWUFBQSxDQUFBLE1BQUEsQ0FBQSxFQUFBLEVBQUEsTUFBQSxJQUFBLEtBQUEsQ0FBQSxzQkFBQSxDQUFBLENBQUE7QUFDQSxlQUFBLE1BQUEsQ0FBQSxFQUFBLENBQUEsTUFBQSxDQUFBLFFBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTtLQUNBLENBQUEsQ0FBQTs7Ozs7QUFLQSxPQUFBLENBQUEsUUFBQSxDQUFBLGFBQUEsRUFBQTtBQUNBLG9CQUFBLEVBQUEsb0JBQUE7QUFDQSxtQkFBQSxFQUFBLG1CQUFBO0FBQ0EscUJBQUEsRUFBQSxxQkFBQTtBQUNBLHNCQUFBLEVBQUEsc0JBQUE7QUFDQSx3QkFBQSxFQUFBLHdCQUFBO0FBQ0EscUJBQUEsRUFBQSxxQkFBQTtLQUNBLENBQUEsQ0FBQTs7QUFFQSxPQUFBLENBQUEsT0FBQSxDQUFBLGlCQUFBLEVBQUEsVUFBQSxVQUFBLEVBQUEsRUFBQSxFQUFBLFdBQUEsRUFBQTtBQUNBLFlBQUEsVUFBQSxHQUFBO0FBQ0EsZUFBQSxFQUFBLFdBQUEsQ0FBQSxnQkFBQTtBQUNBLGVBQUEsRUFBQSxXQUFBLENBQUEsYUFBQTtBQUNBLGVBQUEsRUFBQSxXQUFBLENBQUEsY0FBQTtBQUNBLGVBQUEsRUFBQSxXQUFBLENBQUEsY0FBQTtTQUNBLENBQUE7QUFDQSxlQUFBO0FBQ0EseUJBQUEsRUFBQSx1QkFBQSxRQUFBLEVBQUE7QUFDQSwwQkFBQSxDQUFBLFVBQUEsQ0FBQSxVQUFBLENBQUEsUUFBQSxDQUFBLE1BQUEsQ0FBQSxFQUFBLFFBQUEsQ0FBQSxDQUFBO0FBQ0EsdUJBQUEsRUFBQSxDQUFBLE1BQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQTthQUNBO1NBQ0EsQ0FBQTtLQUNBLENBQUEsQ0FBQTs7QUFFQSxPQUFBLENBQUEsTUFBQSxDQUFBLFVBQUEsYUFBQSxFQUFBO0FBQ0EscUJBQUEsQ0FBQSxZQUFBLENBQUEsSUFBQSxDQUFBLENBQ0EsV0FBQSxFQUNBLFVBQUEsU0FBQSxFQUFBO0FBQ0EsbUJBQUEsU0FBQSxDQUFBLEdBQUEsQ0FBQSxpQkFBQSxDQUFBLENBQUE7U0FDQSxDQUNBLENBQUEsQ0FBQTtLQUNBLENBQUEsQ0FBQTs7QUFFQSxPQUFBLENBQUEsT0FBQSxDQUFBLGFBQUEsRUFBQSxVQUFBLEtBQUEsRUFBQSxPQUFBLEVBQUEsVUFBQSxFQUFBLFdBQUEsRUFBQSxFQUFBLEVBQUEsSUFBQSxFQUFBOztBQUVBLGlCQUFBLGlCQUFBLENBQUEsUUFBQSxFQUFBO0FBQ0EsZ0JBQUEsSUFBQSxHQUFBLFFBQUEsQ0FBQSxJQUFBLENBQUE7QUFDQSxtQkFBQSxDQUFBLE1BQUEsQ0FBQSxJQUFBLENBQUEsRUFBQSxFQUFBLElBQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQTtBQUNBLHNCQUFBLENBQUEsVUFBQSxDQUFBLFdBQUEsQ0FBQSxZQUFBLENBQUEsQ0FBQTtBQUNBLG1CQUFBLElBQUEsQ0FBQSxJQUFBLENBQUE7U0FDQTs7OztBQUlBLFlBQUEsQ0FBQSxlQUFBLEdBQUEsWUFBQTtBQUNBLG1CQUFBLENBQUEsQ0FBQSxPQUFBLENBQUEsSUFBQSxDQUFBO1NBQ0EsQ0FBQTs7QUFFQSxZQUFBLENBQUEsZUFBQSxHQUFBLFVBQUEsVUFBQSxFQUFBOzs7Ozs7Ozs7O0FBVUEsZ0JBQUEsSUFBQSxDQUFBLGVBQUEsRUFBQSxJQUFBLFVBQUEsS0FBQSxJQUFBLEVBQUE7QUFDQSx1QkFBQSxFQUFBLENBQUEsSUFBQSxDQUFBLE9BQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQTthQUNBOzs7OztBQUtBLG1CQUFBLEtBQUEsQ0FBQSxHQUFBLENBQUEsVUFBQSxDQUFBLENBQUEsSUFBQSxDQUFBLGlCQUFBLENBQUEsU0FBQSxDQUFBLFlBQUE7QUFDQSx1QkFBQSxJQUFBLENBQUE7YUFDQSxDQUFBLENBQUE7U0FFQSxDQUFBOztBQUVBLFlBQUEsQ0FBQSxLQUFBLEdBQUEsVUFBQSxXQUFBLEVBQUE7QUFDQSxtQkFBQSxLQUFBLENBQUEsSUFBQSxDQUFBLFFBQUEsRUFBQSxXQUFBLENBQUEsQ0FDQSxJQUFBLENBQUEsaUJBQUEsQ0FBQSxTQUNBLENBQUEsWUFBQTtBQUNBLHVCQUFBLEVBQUEsQ0FBQSxNQUFBLENBQUEsRUFBQSxPQUFBLEVBQUEsNEJBQUEsRUFBQSxDQUFBLENBQUE7YUFDQSxDQUFBLENBQUE7U0FDQSxDQUFBOztBQUVBLFlBQUEsQ0FBQSxNQUFBLEdBQUEsWUFBQTtBQUNBLG1CQUFBLEtBQUEsQ0FBQSxHQUFBLENBQUEsU0FBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFlBQUE7QUFDQSx1QkFBQSxDQUFBLE9BQUEsRUFBQSxDQUFBO0FBQ0EsMEJBQUEsQ0FBQSxVQUFBLENBQUEsV0FBQSxDQUFBLGFBQUEsQ0FBQSxDQUFBO2FBQ0EsQ0FBQSxDQUFBO1NBQ0EsQ0FBQTtLQUVBLENBQUEsQ0FBQTs7QUFFQSxPQUFBLENBQUEsT0FBQSxDQUFBLFNBQUEsRUFBQSxVQUFBLFVBQUEsRUFBQSxXQUFBLEVBQUE7O0FBRUEsWUFBQSxJQUFBLEdBQUEsSUFBQSxDQUFBOztBQUVBLGtCQUFBLENBQUEsR0FBQSxDQUFBLFdBQUEsQ0FBQSxnQkFBQSxFQUFBLFlBQUE7QUFDQSxnQkFBQSxDQUFBLE9BQUEsRUFBQSxDQUFBO1NBQ0EsQ0FBQSxDQUFBOztBQUVBLGtCQUFBLENBQUEsR0FBQSxDQUFBLFdBQUEsQ0FBQSxjQUFBLEVBQUEsWUFBQTtBQUNBLGdCQUFBLENBQUEsT0FBQSxFQUFBLENBQUE7U0FDQSxDQUFBLENBQUE7O0FBRUEsWUFBQSxDQUFBLEVBQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxZQUFBLENBQUEsSUFBQSxHQUFBLElBQUEsQ0FBQTs7QUFFQSxZQUFBLENBQUEsTUFBQSxHQUFBLFVBQUEsU0FBQSxFQUFBLElBQUEsRUFBQTtBQUNBLGdCQUFBLENBQUEsRUFBQSxHQUFBLFNBQUEsQ0FBQTtBQUNBLGdCQUFBLENBQUEsSUFBQSxHQUFBLElBQUEsQ0FBQTtTQUNBLENBQUE7O0FBRUEsWUFBQSxDQUFBLE9BQUEsR0FBQSxZQUFBO0FBQ0EsZ0JBQUEsQ0FBQSxFQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsZ0JBQUEsQ0FBQSxJQUFBLEdBQUEsSUFBQSxDQUFBO1NBQ0EsQ0FBQTtLQUVBLENBQUEsQ0FBQTtDQUVBLENBQUEsRUFBQSxDQUFBOztBQ3BJQSxHQUFBLENBQUEsTUFBQSxDQUFBLFVBQUEsY0FBQSxFQUFBO0FBQ0Esa0JBQUEsQ0FBQSxLQUFBLENBQUEsTUFBQSxFQUFBO0FBQ0EsV0FBQSxFQUFBLE9BQUE7QUFDQSxtQkFBQSxFQUFBLG1CQUFBO0tBQ0EsQ0FBQSxDQUFBO0NBQ0EsQ0FBQSxDQUFBOztBQ0xBLEdBQUEsQ0FBQSxNQUFBLENBQUEsVUFBQSxjQUFBLEVBQUE7QUFDQSxrQkFBQSxDQUFBLEtBQUEsQ0FBQSxNQUFBLEVBQUE7QUFDQSxXQUFBLEVBQUEsR0FBQTtBQUNBLG1CQUFBLEVBQUEsbUJBQUE7QUFDQSxrQkFBQSxFQUFBLG9CQUFBLE1BQUEsRUFBQSxLQUFBLEVBQUEsTUFBQSxFQUFBO0FBQ0Esa0JBQUEsQ0FBQSxLQUFBLEdBQUEsS0FBQSxDQUFBO0FBQ0Esa0JBQUEsQ0FBQSxNQUFBLEdBQUEsTUFBQSxDQUFBOzs7QUFHQSxrQkFBQSxDQUFBLFNBQUEsR0FBQTt1QkFBQSxTQUFBLENBQUEsU0FBQSxDQUFBLFdBQUEsRUFBQSxDQUFBLFFBQUEsQ0FBQSxRQUFBLENBQUE7YUFBQSxDQUFBO1NBQ0E7QUFDQSxlQUFBLEVBQUE7QUFDQSxpQkFBQSxFQUFBLGVBQUEsSUFBQTt1QkFBQSxJQUFBLENBQUEsT0FBQSxDQUFBLEVBQUEsRUFBQSxFQUFBLFdBQUEsRUFBQSxJQUFBLEVBQUEsQ0FBQTthQUFBO0FBQ0Esa0JBQUEsRUFBQSxnQkFBQSxLQUFBO3VCQUFBLEtBQUEsQ0FBQSxPQUFBLENBQUEsRUFBQSxFQUFBLEVBQUEsV0FBQSxFQUFBLElBQUEsRUFBQSxDQUFBO2FBQUE7U0FDQTtLQUNBLENBQUEsQ0FBQTtDQUNBLENBQUEsQ0FBQTs7QUNoQkEsR0FBQSxDQUFBLE1BQUEsQ0FBQSxVQUFBLGNBQUEsRUFBQTs7QUFFQSxrQkFBQSxDQUFBLEtBQUEsQ0FBQSxPQUFBLEVBQUE7QUFDQSxXQUFBLEVBQUEsUUFBQTtBQUNBLG1CQUFBLEVBQUEscUJBQUE7QUFDQSxrQkFBQSxFQUFBLFdBQUE7S0FDQSxDQUFBLENBQUE7Q0FFQSxDQUFBLENBQUE7O0FBRUEsR0FBQSxDQUFBLFVBQUEsQ0FBQSxXQUFBLEVBQUEsVUFBQSxNQUFBLEVBQUEsV0FBQSxFQUFBLE1BQUEsRUFBQTs7QUFFQSxVQUFBLENBQUEsS0FBQSxHQUFBLEVBQUEsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxLQUFBLEdBQUEsSUFBQSxDQUFBOztBQUVBLFVBQUEsQ0FBQSxTQUFBLEdBQUEsVUFBQSxTQUFBLEVBQUE7O0FBRUEsY0FBQSxDQUFBLEtBQUEsR0FBQSxJQUFBLENBQUE7O0FBRUEsbUJBQUEsQ0FBQSxLQUFBLENBQUEsU0FBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsSUFBQSxFQUFBO0FBQ0Esa0JBQUEsQ0FBQSxFQUFBLENBQUEsTUFBQSxFQUFBLEVBQUEsRUFBQSxFQUFBLElBQUEsQ0FBQSxHQUFBLEVBQUEsQ0FBQSxDQUFBO1NBQ0EsQ0FBQSxTQUFBLENBQUEsWUFBQTtBQUNBLGtCQUFBLENBQUEsS0FBQSxHQUFBLDRCQUFBLENBQUE7U0FDQSxDQUFBLENBQUE7S0FFQSxDQUFBO0NBRUEsQ0FBQSxDQUFBOztBQzNCQSxHQUFBLENBQUEsTUFBQSxDQUFBLFVBQUEsY0FBQSxFQUFBOztBQUVBLGtCQUFBLENBQUEsS0FBQSxDQUFBLGFBQUEsRUFBQTtBQUNBLFdBQUEsRUFBQSxlQUFBO0FBQ0EsZ0JBQUEsRUFBQSxFQUFBO0FBQ0Esa0JBQUEsRUFBQSxvQkFBQSxNQUFBLEVBQUEsRUFBQTs7OztBQUlBLFlBQUEsRUFBQTtBQUNBLHdCQUFBLEVBQUEsSUFBQTtTQUNBO0tBQ0EsQ0FBQSxDQUFBO0NBRUEsQ0FBQSxDQUFBOztBQ2RBLEdBQUEsQ0FBQSxPQUFBLENBQUEsY0FBQSxFQUFBLFVBQUEsS0FBQSxFQUFBLEVBQUEsRUFBQTtBQUNBLFFBQUEsSUFBQSxHQUFBLEVBQUEsQ0FBQTs7QUFFQSxRQUFBLENBQUEsU0FBQSxHQUFBLFlBQUE7QUFDQSxlQUFBLEtBQUEsQ0FBQSxHQUFBLENBQUEsYUFBQSxDQUFBLENBQ0EsSUFBQSxDQUFBLFVBQUEsR0FBQTttQkFBQSxHQUFBLENBQUEsSUFBQTtTQUFBLENBQUEsQ0FBQTtLQUNBLENBQUE7O0FBRUEsUUFBQSxDQUFBLFVBQUEsR0FBQSxZQUFBOztBQUVBLGVBQUEsQ0FBQTtBQUNBLGdCQUFBLEVBQUEsUUFBQTtTQUNBLENBQUEsQ0FBQTtLQUNBLENBQUE7O0FBRUEsUUFBQSxDQUFBLFlBQUEsR0FBQSxVQUFBLEtBQUEsRUFBQTs7QUFFQSxlQUFBLEVBQUEsS0FBQSxFQUFBLENBQUEsS0FBQSxDQUFBLElBQUEsRUFBQSxLQUFBLENBQUEsSUFBQSxHQUFBLEdBQUEsQ0FBQSxFQUFBLElBQUEsRUFBQSxDQUFBLEtBQUEsQ0FBQSxHQUFBLENBQUEsRUFBQSxDQUFBOzs7OztLQUtBLENBQUE7O0FBRUEsUUFBQSxDQUFBLGVBQUEsR0FBQSxVQUFBLFdBQUEsRUFBQTs7QUFFQSxZQUFBLGFBQUEsR0FBQSxXQUFBLENBQUEsR0FBQSxDQUFBLFVBQUEsVUFBQSxFQUFBO0FBQ0EsbUJBQUEsSUFBQSxDQUFBLFlBQUEsQ0FBQSxVQUFBLENBQUEsQ0FBQTtTQUNBLENBQUEsQ0FBQTs7QUFFQSxlQUFBLEVBQUEsQ0FBQSxHQUFBLENBQUEsYUFBQSxDQUFBLENBQUE7S0FDQSxDQUFBOzs7QUFHQSxRQUFBLENBQUEsY0FBQSxHQUFBLFVBQUEsSUFBQSxFQUFBOztBQUVBLGVBQUEsSUFBQSxDQUFBLGVBQUEsQ0FBQSxJQUFBLENBQUEsTUFBQSxDQUFBLENBQ0EsSUFBQSxDQUFBLFVBQUEsU0FBQSxFQUFBO0FBQ0EsbUJBQUEsQ0FBQSxHQUFBLENBQUEsWUFBQSxFQUFBLFNBQUEsQ0FBQSxDQUFBOztBQUVBLG1CQUFBLElBQUEsQ0FBQSxJQUFBLENBQUEsU0FBQSxFQUFBLElBQUEsQ0FBQSxPQUFBLENBQUEsQ0FBQTtTQUNBLENBQUEsQ0FDQSxJQUFBLENBQUEsVUFBQSxTQUFBLEVBQUE7O0FBRUEsbUJBQUEsQ0FBQSxHQUFBLENBQUEsWUFBQSxFQUFBLFNBQUEsQ0FBQSxDQUFBO0FBQ0EsZ0JBQUEsQ0FBQSxNQUFBLEdBQUEsU0FBQSxDQUFBO0FBQ0EsbUJBQUEsU0FBQSxDQUFBO1NBQ0EsQ0FBQSxTQUNBLENBQUEsVUFBQSxHQUFBLEVBQUE7O0FBRUEsbUJBQUEsQ0FBQSxLQUFBLENBQUEsR0FBQSxDQUFBLENBQUE7U0FDQSxDQUFBLENBQUE7S0FDQSxDQUFBOztBQUVBLFFBQUEsQ0FBQSxJQUFBLEdBQUEsVUFBQSxTQUFBLEVBQUEsS0FBQSxFQUFBOztBQUVBLGVBQUEsU0FBQSxDQUFBO0tBQ0EsQ0FBQTs7QUFFQSxXQUFBLElBQUEsQ0FBQTtDQUNBLENBQUEsQ0FBQTtBQzVEQSxHQUFBLENBQUEsTUFBQSxDQUFBLFVBQUEsY0FBQSxFQUFBO0FBQ0Esa0JBQUEsQ0FBQSxLQUFBLENBQUEsT0FBQSxFQUFBO0FBQ0EsV0FBQSxFQUFBLFFBQUE7QUFDQSxtQkFBQSxFQUFBLHFCQUFBO0FBQ0Esa0JBQUEsRUFBQSxXQUFBO0FBQ0EsZUFBQSxFQUFBO0FBQ0Esa0JBQUEsRUFBQSxnQkFBQSxZQUFBLEVBQUE7QUFDQSx1QkFBQSxZQUFBLENBQUEsU0FBQSxFQUFBLENBQUE7YUFDQTtBQUNBLG1CQUFBLEVBQUEsaUJBQUEsWUFBQSxFQUFBO0FBQ0EsdUJBQUEsWUFBQSxDQUFBLFVBQUEsRUFBQSxDQUFBO2FBQ0E7U0FDQTtLQUNBLENBQUEsQ0FBQTtDQUNBLENBQUEsQ0FBQTs7QUFFQSxHQUFBLENBQUEsVUFBQSxDQUFBLFdBQUEsRUFBQSxVQUFBLE1BQUEsRUFBQSxZQUFBLEVBQUEsTUFBQSxFQUFBLE9BQUEsRUFBQTtBQUNBLFVBQUEsQ0FBQSxNQUFBLEdBQUEsTUFBQSxDQUFBO0FBQ0EsVUFBQSxDQUFBLE9BQUEsR0FBQSxPQUFBLENBQUE7OztBQUdBLFVBQUEsQ0FBQSxJQUFBLEdBQUE7O0FBRUEsY0FBQSxFQUFBLEVBQUE7OztBQUdBLGVBQUEsRUFBQSxFQUFBOztBQUVBLGNBQUEsRUFBQSxFQUFBO0tBQ0EsQ0FBQTs7O0FBR0EsVUFBQSxDQUFBLFlBQUEsR0FBQSxVQUFBLEtBQUEsRUFBQTtBQUNBLGVBQUEsQ0FBQSxHQUFBLENBQUEsY0FBQSxFQUFBLEtBQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQTtBQUNBLG9CQUFBLENBQUEsWUFBQSxDQUFBLEtBQUEsQ0FBQSxDQUNBLElBQUEsQ0FBQSxVQUFBLElBQUEsRUFBQTtBQUNBLG1CQUFBLENBQUEsR0FBQSxDQUFBLFVBQUEsRUFBQSxJQUFBLENBQUEsQ0FBQTtTQUNBLENBQUEsQ0FBQTtLQUNBLENBQUE7OztBQUdBLFVBQUEsQ0FBQSxXQUFBLEdBQUEsVUFBQSxLQUFBLEVBQUE7QUFDQSxjQUFBLENBQUEsSUFBQSxDQUFBLE1BQUEsQ0FBQSxJQUFBLENBQUEsS0FBQSxDQUFBLENBQUE7S0FDQSxDQUFBOzs7QUFHQSxVQUFBLENBQUEsYUFBQSxHQUFBLFVBQUEsS0FBQSxFQUFBO0FBQ0EsY0FBQSxDQUFBLElBQUEsQ0FBQSxNQUFBLEdBQUEsTUFBQSxDQUFBLElBQUEsQ0FBQSxNQUFBLENBQUEsTUFBQSxDQUFBLFVBQUEsS0FBQTttQkFBQSxLQUFBLEtBQUEsS0FBQTtTQUFBLENBQUEsQ0FBQTtLQUNBLENBQUE7OztBQUdBLFVBQUEsQ0FBQSxZQUFBLEdBQUEsVUFBQSxNQUFBLEVBQUE7QUFDQSxjQUFBLENBQUEsSUFBQSxDQUFBLE9BQUEsQ0FBQSxJQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7S0FDQSxDQUFBOzs7QUFHQSxVQUFBLENBQUEsY0FBQSxHQUFBLFVBQUEsTUFBQSxFQUFBO0FBQ0EsY0FBQSxDQUFBLElBQUEsQ0FBQSxPQUFBLEdBQUEsTUFBQSxDQUFBLElBQUEsQ0FBQSxPQUFBLENBQUEsTUFBQSxDQUFBLFVBQUEsSUFBQTttQkFBQSxJQUFBLEtBQUEsTUFBQTtTQUFBLENBQUEsQ0FBQTtLQUNBLENBQUE7OztBQUdBLFVBQUEsQ0FBQSxjQUFBLEdBQUEsWUFBQTs7QUFFQSxvQkFBQSxDQUFBLGNBQUEsQ0FBQSxNQUFBLENBQUEsSUFBQSxDQUFBLENBQ0EsSUFBQSxDQUFBLFVBQUEsTUFBQSxFQUFBO0FBQ0EsbUJBQUEsQ0FBQSxHQUFBLENBQUEsTUFBQSxDQUFBLENBQUE7U0FDQSxDQUFBLENBQUE7S0FDQSxDQUFBOzs7QUFHQSxVQUFBLENBQUEsUUFBQSxHQUFBLFlBQUE7QUFDQSxvQkFBQSxDQUFBLFFBQUEsRUFBQSxDQUNBLElBQUEsQ0FBQSxVQUFBLElBQUEsRUFBQTtBQUNBLG1CQUFBLENBQUEsR0FBQSxDQUFBLGdCQUFBLEVBQUEsSUFBQSxDQUFBLENBQUE7U0FDQSxDQUFBLENBQUE7S0FDQSxDQUFBO0NBRUEsQ0FBQSxDQUFBO0FDN0VBLEdBQUEsQ0FBQSxNQUFBLENBQUEsVUFBQSxjQUFBLEVBQUE7QUFDQSxr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VUFBQSxJQUFBOzJCQUFBLElBQUEsQ0FBQSxJQUFBLENBQUEsSUFBQSxDQUFBLEdBQUEsQ0FBQTtpQkFBQSxDQUFBLENBQ0EsSUFBQSxDQUFBLFVBQUEsSUFBQSxFQUFBO0FBQ0EseUJBQUEsQ0FBQSxJQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsMkJBQUEsSUFBQSxDQUFBO2lCQUNBLENBQUEsQ0FBQTthQUNBLENBQUE7O0FBRUEsZ0JBQUEsVUFBQSxHQUFBLFNBQUEsVUFBQSxHQUFBO0FBQ0EscUJBQUEsQ0FBQSxJQUFBLEdBQUEsSUFBQSxDQUFBO2FBQ0EsQ0FBQTs7QUFFQSxtQkFBQSxFQUFBLENBQUE7O0FBRUEsc0JBQUEsQ0FBQSxHQUFBLENBQUEsV0FBQSxDQUFBLFlBQUEsRUFBQSxPQUFBLENBQUEsQ0FBQTtBQUNBLHNCQUFBLENBQUEsR0FBQSxDQUFBLFdBQUEsQ0FBQSxhQUFBLEVBQUEsVUFBQSxDQUFBLENBQUE7QUFDQSxzQkFBQSxDQUFBLEdBQUEsQ0FBQSxXQUFBLENBQUEsY0FBQSxFQUFBLFVBQUEsQ0FBQSxDQUFBO1NBRUE7O0tBRUEsQ0FBQTtDQUVBLENBQUEsQ0FBQTs7QUNwREEsR0FBQSxDQUFBLFNBQUEsQ0FBQSxjQUFBLEVBQUEsWUFBQTtBQUNBLFdBQUE7QUFDQSxnQkFBQSxFQUFBLEdBQUE7QUFDQSxtQkFBQSxFQUFBLHVEQUFBO0FBQ0EsWUFBQSxFQUFBLGNBQUEsS0FBQSxFQUFBLElBQUEsRUFBQSxJQUFBLEVBQUE7O0FBRUEsaUJBQUEsQ0FBQSxnQkFBQSxHQUFBLFlBQUE7QUFDQSx1QkFBQSxDQUFBLEdBQUEsMkNBQUEsQ0FBQTthQUNBLENBQUE7U0FFQTtLQUNBLENBQUE7Q0FDQSxDQUFBLENBQUEiLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc3RyaWN0JztcbndpbmRvdy5hcHAgPSBhbmd1bGFyLm1vZHVsZSgnTm9kZW1vbm9BcHAnLCBbJ3VpLnJvdXRlcicsICd1aS5ib290c3RyYXAnLCAnZnNhUHJlQnVpbHQnLCAnanMtZGF0YSddKTtcblxuYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHVybFJvdXRlclByb3ZpZGVyLCAkbG9jYXRpb25Qcm92aWRlciwgRFNQcm92aWRlciwgRFNIdHRwQWRhcHRlclByb3ZpZGVyKSB7XG4gICAgLy8gVGhpcyB0dXJucyBvZmYgaGFzaGJhbmcgdXJscyAoLyNhYm91dCkgYW5kIGNoYW5nZXMgaXQgdG8gc29tZXRoaW5nIG5vcm1hbCAoL2Fib3V0KVxuICAgICRsb2NhdGlvblByb3ZpZGVyLmh0bWw1TW9kZSh0cnVlKTtcbiAgICAvLyBJZiB3ZSBnbyB0byBhIFVSTCB0aGF0IHVpLXJvdXRlciBkb2Vzbid0IGhhdmUgcmVnaXN0ZXJlZCwgZ28gdG8gdGhlIFwiL1wiIHVybC5cbiAgICAkdXJsUm91dGVyUHJvdmlkZXIub3RoZXJ3aXNlKCcvJyk7XG5cbiAgICAvLyBzZXQganMtZGF0YSBkZWZhdWx0c1xuICAgIERTUHJvdmlkZXIuZGVmYXVsdHMuYmFzZVBhdGggPSAnL2FwaSdcbiAgICBEU1Byb3ZpZGVyLmRlZmF1bHRzLmlkQXR0cmlidXRlID0gJ19pZCdcblxuXG4gICAgLy8gYSBtZXRob2QgdG8gdGhlIERTUHJvdmlkZXIgZGVmYXVsdHMgb2JqZWN0IHRoYXQgYXV0b21hdGljYWxseVxuICAgIC8vIGNoZWNrcyBpZiB0aGVyZSBpcyBhbnkgZGF0YSBpbiB0aGUgY2FjaGUgZm9yIGEgZ2l2ZW4gc2VydmljZSBiZWZvcmVcbiAgICAvLyBwaW5naW5nIHRoZSBkYXRhYmFzZVxuICAgIERTUHJvdmlkZXIuZGVmYXVsdHMuZ2V0T3JGaW5kID0gZnVuY3Rpb24oc2VydmljZSl7XG4gICAgICB2YXIgZGF0YSA9IHRoaXMuZ2V0QWxsKClcbiAgICAgIGlmIChkYXRhLmxlbmd0aCkgcmV0dXJuIFByb21pc2UucmVzb2x2ZShhbmd1bGFyLmNvcHkoZGF0YSkpXG4gICAgICBlbHNlIHJldHVybiB0aGlzLmZpbmRBbGwoKS50aGVuKGRhdGEgPT4gYW5ndWxhci5jb3B5KGRhdGEpKVxuICAgIH1cblxuICAgIC8vIE1vbmdvb3NlIFJlbGF0aW9uIEZpeCAoZml4ZXMgZGVzZXJpYWxpemF0aW9uKVxuICAgIC8vIEZyb20gaHR0cDovL3BsbmtyLmNvL2VkaXQvM3o5MFBEOXd3d2hXZG5Wclpxa0I/cD1wcmV2aWV3XG4gICAgLy8gVGhpcyB3YXMgc2hvd24gdG8gdXMgYnkgQGptZG9icnksIHRoZSBpZGVhIGhlcmUgaXMgdGhhdFxuICAgIC8vIHdlIGZpeCB0aGUgZGF0YSBjb21pbmcgZnJvbSBNb25nb29zZSBtb2RlbHMgaW4ganMtZGF0YSByYXRoZXIgdGhhbiBvdXRib3VuZCBmcm9tIE1vbmdvb3NlXG4gICAgZnVuY3Rpb24gZml4UmVsYXRpb25zKFJlc291cmNlLCBpbnN0YW5jZSkge1xuICAgICAgZnVuY3Rpb24gZml4TG9jYWxLZXlzKGkpIHtcbiAgICAgICAgSlNEYXRhLkRTVXRpbHMuZm9yRWFjaChSZXNvdXJjZS5yZWxhdGlvbkxpc3QsIGZ1bmN0aW9uKGRlZikge1xuICAgICAgICAgIHZhciByZWxhdGlvbk5hbWUgPSBkZWYucmVsYXRpb247XG4gICAgICAgICAgdmFyIHJlbGF0aW9uRGVmID0gUmVzb3VyY2UuZ2V0UmVzb3VyY2UocmVsYXRpb25OYW1lKTtcbiAgICAgICAgICBpZiAoZGVmLnR5cGUgPT09ICdoYXNNYW55Jykge1xuICAgICAgICAgICAgaWYgKGkuaGFzT3duUHJvcGVydHkoZGVmLmxvY2FsRmllbGQpKSB7XG4gICAgICAgICAgICAgIGlmIChpW2RlZi5sb2NhbEZpZWxkXS5sZW5ndGggJiYgIUpTRGF0YS5EU1V0aWxzLmlzT2JqZWN0KGlbZGVmLmxvY2FsRmllbGRdWzBdKSkge1xuICAgICAgICAgICAgICAgIC8vIENhc2UgMTogYXJyYXkgb2YgX2lkcyB3aGVyZSBhcnJheSBvZiBwb3B1bGF0ZWQgb2JqZWN0cyBzaG91bGQgYmVcbiAgICAgICAgICAgICAgICBpW2RlZi5sb2NhbEtleXNdID0gaVtkZWYubG9jYWxGaWVsZF07XG4gICAgICAgICAgICAgICAgZGVsZXRlIGlbZGVmLmxvY2FsRmllbGRdO1xuICAgICAgICAgICAgICB9IGVsc2UgaWYgKCFpW2RlZi5sb2NhbEtleXNdKSB7XG4gICAgICAgICAgICAgICAgLy8gQ2FzZSAyOiBhcnJheSBvZiBwb3B1bGF0ZWQgb2JqZWN0cywgYnV0IG1pc3NpbmcgYXJyYXkgb2YgX2lkcydcbiAgICAgICAgICAgICAgICBpW2RlZi5sb2NhbEtleXNdID0gW107XG4gICAgICAgICAgICAgICAgSlNEYXRhLkRTVXRpbHMuZm9yRWFjaChpW2RlZi5sb2NhbEZpZWxkXSwgZnVuY3Rpb24oY2hpbGQpIHtcbiAgICAgICAgICAgICAgICAgIGlbZGVmLmxvY2FsS2V5c10ucHVzaChjaGlsZFtyZWxhdGlvbkRlZi5pZEF0dHJpYnV0ZV0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2UgaWYgKGRlZi50eXBlID09PSAnYmVsb25nc1RvJykge1xuICAgICAgICAgICAgaWYgKGkuaGFzT3duUHJvcGVydHkoZGVmLmxvY2FsRmllbGQpKSB7XG4gICAgICAgICAgICAgIC8vIGlmIHRoZSBsb2NhbGZJZWxkIGlzIGEgcG9wdWFsdGVkIG9iamVjdFxuICAgICAgICAgICAgICBpZiAoSlNEYXRhLkRTVXRpbHMuaXNPYmplY3QoaVtkZWYubG9jYWxGaWVsZF0pKSB7XG4gICAgICAgICAgICAgICAgaVtkZWYubG9jYWxLZXldID0gaVtkZWYubG9jYWxGaWVsZF0uX2lkO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIC8vIGlmIHRoZSBsb2NhbGZpZWxkIGlzIGFuIG9iamVjdCBpZFxuICAgICAgICAgICAgICBlbHNlIGlmICghSlNEYXRhLkRTVXRpbHMuaXNPYmplY3QoaVtkZWYubG9jYWxGaWVsZF0pKSB7XG4gICAgICAgICAgICAgICAgaVtkZWYubG9jYWxLZXldID0gaVtkZWYubG9jYWxGaWVsZF07XG4gICAgICAgICAgICAgICAgZGVsZXRlIGlbZGVmLmxvY2FsRmllbGRdO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgaWYgKEpTRGF0YS5EU1V0aWxzLmlzQXJyYXkoaW5zdGFuY2UpKSB7XG4gICAgICAgIEpTRGF0YS5EU1V0aWxzLmZvckVhY2goaW5zdGFuY2UsIGZpeExvY2FsS2V5cyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBmaXhMb2NhbEtleXMoaW5zdGFuY2UpO1xuICAgICAgfVxuICAgIH1cblxuXG4gICAgRFNQcm92aWRlci5kZWZhdWx0cy5kZXNlcmlhbGl6ZSA9IGZ1bmN0aW9uKFJlc291cmNlLCBkYXRhKSB7XG4gICAgICB2YXIgaW5zdGFuY2UgPSBkYXRhLmRhdGE7XG4gICAgICBmaXhSZWxhdGlvbnMoUmVzb3VyY2UsIGluc3RhbmNlKTtcbiAgICAgIHJldHVybiBpbnN0YW5jZTtcbiAgICB9O1xuICAgIC8vIEVuZCBNb25nb29zZSBSZWxhdGlvbiBmaXhcbn0pO1xuXG4vLyBUaGlzIGFwcC5ydW4gaXMgZm9yIGNvbnRyb2xsaW5nIGFjY2VzcyB0byBzcGVjaWZpYyBzdGF0ZXMuXG5hcHAucnVuKGZ1bmN0aW9uICgkcm9vdFNjb3BlLCBBdXRoU2VydmljZSwgJHN0YXRlKSB7XG5cbiAgICAvLyBUaGUgZ2l2ZW4gc3RhdGUgcmVxdWlyZXMgYW4gYXV0aGVudGljYXRlZCB1c2VyLlxuICAgIHZhciBkZXN0aW5hdGlvblN0YXRlUmVxdWlyZXNBdXRoID0gZnVuY3Rpb24gKHN0YXRlKSB7XG4gICAgICAgIHJldHVybiBzdGF0ZS5kYXRhICYmIHN0YXRlLmRhdGEuYXV0aGVudGljYXRlO1xuICAgIH07XG5cbiAgICAvLyAkc3RhdGVDaGFuZ2VTdGFydCBpcyBhbiBldmVudCBmaXJlZFxuICAgIC8vIHdoZW5ldmVyIHRoZSBwcm9jZXNzIG9mIGNoYW5naW5nIGEgc3RhdGUgYmVnaW5zLlxuICAgICRyb290U2NvcGUuJG9uKCckc3RhdGVDaGFuZ2VTdGFydCcsIGZ1bmN0aW9uIChldmVudCwgdG9TdGF0ZSwgdG9QYXJhbXMpIHtcblxuICAgICAgICBpZiAoIWRlc3RpbmF0aW9uU3RhdGVSZXF1aXJlc0F1dGgodG9TdGF0ZSkpIHtcbiAgICAgICAgICAgIC8vIFRoZSBkZXN0aW5hdGlvbiBzdGF0ZSBkb2VzIG5vdCByZXF1aXJlIGF1dGhlbnRpY2F0aW9uXG4gICAgICAgICAgICAvLyBTaG9ydCBjaXJjdWl0IHdpdGggcmV0dXJuLlxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKEF1dGhTZXJ2aWNlLmlzQXV0aGVudGljYXRlZCgpKSB7XG4gICAgICAgICAgICAvLyBUaGUgdXNlciBpcyBhdXRoZW50aWNhdGVkLlxuICAgICAgICAgICAgLy8gU2hvcnQgY2lyY3VpdCB3aXRoIHJldHVybi5cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENhbmNlbCBuYXZpZ2F0aW5nIHRvIG5ldyBzdGF0ZS5cbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcblxuICAgICAgICBBdXRoU2VydmljZS5nZXRMb2dnZWRJblVzZXIoKS50aGVuKGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgICAgICAgICAvLyBJZiBhIHVzZXIgaXMgcmV0cmlldmVkLCB0aGVuIHJlbmF2aWdhdGUgdG8gdGhlIGRlc3RpbmF0aW9uXG4gICAgICAgICAgICAvLyAodGhlIHNlY29uZCB0aW1lLCBBdXRoU2VydmljZS5pc0F1dGhlbnRpY2F0ZWQoKSB3aWxsIHdvcmspXG4gICAgICAgICAgICAvLyBvdGhlcndpc2UsIGlmIG5vIHVzZXIgaXMgbG9nZ2VkIGluLCBnbyB0byBcImxvZ2luXCIgc3RhdGUuXG4gICAgICAgICAgICBpZiAodXNlcikge1xuICAgICAgICAgICAgICAgICRzdGF0ZS5nbyh0b1N0YXRlLm5hbWUsIHRvUGFyYW1zKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJHN0YXRlLmdvKCdsb2dpbicpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgIH0pO1xuXG59KTtcbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG5cbiAgICAvLyBSZWdpc3RlciBvdXIgKmFib3V0KiBzdGF0ZS5cbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnYWJvdXQnLCB7XG4gICAgICAgIHVybDogJy9hYm91dCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdBYm91dENvbnRyb2xsZXInLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2Fib3V0L2Fib3V0Lmh0bWwnXG4gICAgfSk7XG5cbn0pO1xuXG5hcHAuY29udHJvbGxlcignQWJvdXRDb250cm9sbGVyJywgZnVuY3Rpb24gKCRzY29wZSkge1xuXG4gICAgLy8gJHNjb3BlLmltYWdlcyA9IF8uc2h1ZmZsZShzb21ldGhpbmcpO1xuXG59KTtcbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2RvY3MnLCB7XG4gICAgICAgIHVybDogJy9kb2NzJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9kb2NzL2RvY3MuaHRtbCdcbiAgICB9KTtcbn0pO1xuIiwiKGZ1bmN0aW9uICgpIHtcblxuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIC8vIEhvcGUgeW91IGRpZG4ndCBmb3JnZXQgQW5ndWxhciEgRHVoLWRveS5cbiAgICBpZiAoIXdpbmRvdy5hbmd1bGFyKSB0aHJvdyBuZXcgRXJyb3IoJ0kgY2FuXFwndCBmaW5kIEFuZ3VsYXIhJyk7XG5cbiAgICB2YXIgYXBwID0gYW5ndWxhci5tb2R1bGUoJ2ZzYVByZUJ1aWx0JywgW10pO1xuXG4gICAgYXBwLmZhY3RvcnkoJ1NvY2tldCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKCF3aW5kb3cuaW8pIHRocm93IG5ldyBFcnJvcignc29ja2V0LmlvIG5vdCBmb3VuZCEnKTtcbiAgICAgICAgcmV0dXJuIHdpbmRvdy5pbyh3aW5kb3cubG9jYXRpb24ub3JpZ2luKTtcbiAgICB9KTtcblxuICAgIC8vIEFVVEhfRVZFTlRTIGlzIHVzZWQgdGhyb3VnaG91dCBvdXIgYXBwIHRvXG4gICAgLy8gYnJvYWRjYXN0IGFuZCBsaXN0ZW4gZnJvbSBhbmQgdG8gdGhlICRyb290U2NvcGVcbiAgICAvLyBmb3IgaW1wb3J0YW50IGV2ZW50cyBhYm91dCBhdXRoZW50aWNhdGlvbiBmbG93LlxuICAgIGFwcC5jb25zdGFudCgnQVVUSF9FVkVOVFMnLCB7XG4gICAgICAgIGxvZ2luU3VjY2VzczogJ2F1dGgtbG9naW4tc3VjY2VzcycsXG4gICAgICAgIGxvZ2luRmFpbGVkOiAnYXV0aC1sb2dpbi1mYWlsZWQnLFxuICAgICAgICBsb2dvdXRTdWNjZXNzOiAnYXV0aC1sb2dvdXQtc3VjY2VzcycsXG4gICAgICAgIHNlc3Npb25UaW1lb3V0OiAnYXV0aC1zZXNzaW9uLXRpbWVvdXQnLFxuICAgICAgICBub3RBdXRoZW50aWNhdGVkOiAnYXV0aC1ub3QtYXV0aGVudGljYXRlZCcsXG4gICAgICAgIG5vdEF1dGhvcml6ZWQ6ICdhdXRoLW5vdC1hdXRob3JpemVkJ1xuICAgIH0pO1xuXG4gICAgYXBwLmZhY3RvcnkoJ0F1dGhJbnRlcmNlcHRvcicsIGZ1bmN0aW9uICgkcm9vdFNjb3BlLCAkcSwgQVVUSF9FVkVOVFMpIHtcbiAgICAgICAgdmFyIHN0YXR1c0RpY3QgPSB7XG4gICAgICAgICAgICA0MDE6IEFVVEhfRVZFTlRTLm5vdEF1dGhlbnRpY2F0ZWQsXG4gICAgICAgICAgICA0MDM6IEFVVEhfRVZFTlRTLm5vdEF1dGhvcml6ZWQsXG4gICAgICAgICAgICA0MTk6IEFVVEhfRVZFTlRTLnNlc3Npb25UaW1lb3V0LFxuICAgICAgICAgICAgNDQwOiBBVVRIX0VWRU5UUy5zZXNzaW9uVGltZW91dFxuICAgICAgICB9O1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcmVzcG9uc2VFcnJvcjogZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KHN0YXR1c0RpY3RbcmVzcG9uc2Uuc3RhdHVzXSwgcmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgIHJldHVybiAkcS5yZWplY3QocmVzcG9uc2UpXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfSk7XG5cbiAgICBhcHAuY29uZmlnKGZ1bmN0aW9uICgkaHR0cFByb3ZpZGVyKSB7XG4gICAgICAgICRodHRwUHJvdmlkZXIuaW50ZXJjZXB0b3JzLnB1c2goW1xuICAgICAgICAgICAgJyRpbmplY3RvcicsXG4gICAgICAgICAgICBmdW5jdGlvbiAoJGluamVjdG9yKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICRpbmplY3Rvci5nZXQoJ0F1dGhJbnRlcmNlcHRvcicpO1xuICAgICAgICAgICAgfVxuICAgICAgICBdKTtcbiAgICB9KTtcblxuICAgIGFwcC5zZXJ2aWNlKCdBdXRoU2VydmljZScsIGZ1bmN0aW9uICgkaHR0cCwgU2Vzc2lvbiwgJHJvb3RTY29wZSwgQVVUSF9FVkVOVFMsICRxLCBVc2VyKSB7XG5cbiAgICAgICAgZnVuY3Rpb24gb25TdWNjZXNzZnVsTG9naW4ocmVzcG9uc2UpIHtcbiAgICAgICAgICAgIHZhciBkYXRhID0gcmVzcG9uc2UuZGF0YTtcbiAgICAgICAgICAgIFNlc3Npb24uY3JlYXRlKGRhdGEuaWQsIGRhdGEudXNlcik7XG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3QoQVVUSF9FVkVOVFMubG9naW5TdWNjZXNzKTtcbiAgICAgICAgICAgIHJldHVybiBkYXRhLnVzZXI7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVc2VzIHRoZSBzZXNzaW9uIGZhY3RvcnkgdG8gc2VlIGlmIGFuXG4gICAgICAgIC8vIGF1dGhlbnRpY2F0ZWQgdXNlciBpcyBjdXJyZW50bHkgcmVnaXN0ZXJlZC5cbiAgICAgICAgdGhpcy5pc0F1dGhlbnRpY2F0ZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gISFTZXNzaW9uLnVzZXI7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5nZXRMb2dnZWRJblVzZXIgPSBmdW5jdGlvbiAoZnJvbVNlcnZlcikge1xuXG4gICAgICAgICAgICAvLyBJZiBhbiBhdXRoZW50aWNhdGVkIHNlc3Npb24gZXhpc3RzLCB3ZVxuICAgICAgICAgICAgLy8gcmV0dXJuIHRoZSB1c2VyIGF0dGFjaGVkIHRvIHRoYXQgc2Vzc2lvblxuICAgICAgICAgICAgLy8gd2l0aCBhIHByb21pc2UuIFRoaXMgZW5zdXJlcyB0aGF0IHdlIGNhblxuICAgICAgICAgICAgLy8gYWx3YXlzIGludGVyZmFjZSB3aXRoIHRoaXMgbWV0aG9kIGFzeW5jaHJvbm91c2x5LlxuXG4gICAgICAgICAgICAvLyBPcHRpb25hbGx5LCBpZiB0cnVlIGlzIGdpdmVuIGFzIHRoZSBmcm9tU2VydmVyIHBhcmFtZXRlcixcbiAgICAgICAgICAgIC8vIHRoZW4gdGhpcyBjYWNoZWQgdmFsdWUgd2lsbCBub3QgYmUgdXNlZC5cblxuICAgICAgICAgICAgaWYgKHRoaXMuaXNBdXRoZW50aWNhdGVkKCkgJiYgZnJvbVNlcnZlciAhPT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAkcS53aGVuKFNlc3Npb24udXNlcik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIE1ha2UgcmVxdWVzdCBHRVQgL3Nlc3Npb24uXG4gICAgICAgICAgICAvLyBJZiBpdCByZXR1cm5zIGEgdXNlciwgY2FsbCBvblN1Y2Nlc3NmdWxMb2dpbiB3aXRoIHRoZSByZXNwb25zZS5cbiAgICAgICAgICAgIC8vIElmIGl0IHJldHVybnMgYSA0MDEgcmVzcG9uc2UsIHdlIGNhdGNoIGl0IGFuZCBpbnN0ZWFkIHJlc29sdmUgdG8gbnVsbC5cbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5nZXQoJy9zZXNzaW9uJykudGhlbihvblN1Y2Nlc3NmdWxMb2dpbikuY2F0Y2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmxvZ2luID0gZnVuY3Rpb24gKGNyZWRlbnRpYWxzKSB7XG4gICAgICAgICAgICByZXR1cm4gJGh0dHAucG9zdCgnL2xvZ2luJywgY3JlZGVudGlhbHMpXG4gICAgICAgICAgICAgICAgLnRoZW4ob25TdWNjZXNzZnVsTG9naW4pXG4gICAgICAgICAgICAgICAgLmNhdGNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICRxLnJlamVjdCh7IG1lc3NhZ2U6ICdJbnZhbGlkIGxvZ2luIGNyZWRlbnRpYWxzLicgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5sb2dvdXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KCcvbG9nb3V0JykudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgU2Vzc2lvbi5kZXN0cm95KCk7XG4gICAgICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KEFVVEhfRVZFTlRTLmxvZ291dFN1Y2Nlc3MpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICB9KTtcblxuICAgIGFwcC5zZXJ2aWNlKCdTZXNzaW9uJywgZnVuY3Rpb24gKCRyb290U2NvcGUsIEFVVEhfRVZFTlRTKSB7XG5cbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLm5vdEF1dGhlbnRpY2F0ZWQsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHNlbGYuZGVzdHJveSgpO1xuICAgICAgICB9KTtcblxuICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5zZXNzaW9uVGltZW91dCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgc2VsZi5kZXN0cm95KCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMuaWQgPSBudWxsO1xuICAgICAgICB0aGlzLnVzZXIgPSBudWxsO1xuXG4gICAgICAgIHRoaXMuY3JlYXRlID0gZnVuY3Rpb24gKHNlc3Npb25JZCwgdXNlcikge1xuICAgICAgICAgICAgdGhpcy5pZCA9IHNlc3Npb25JZDtcbiAgICAgICAgICAgIHRoaXMudXNlciA9IHVzZXI7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5kZXN0cm95ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy5pZCA9IG51bGw7XG4gICAgICAgICAgICB0aGlzLnVzZXIgPSBudWxsO1xuICAgICAgICB9O1xuXG4gICAgfSk7XG5cbn0pKCk7XG4iLCJhcHAuY29uZmlnKCgkc3RhdGVQcm92aWRlcikgPT4ge1xuICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnaGVscCcsIHtcbiAgICB1cmw6ICcvaGVscCcsXG4gICAgdGVtcGxhdGVVcmw6ICdqcy9oZWxwL2hlbHAuaHRtbCdcbiAgfSlcbn0pXG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdob21lJywge1xuICAgICAgICB1cmw6ICcvJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9ob21lL2hvbWUuaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICgkc2NvcGUsIHVzZXJzLCByb3V0ZXMpID0+IHtcbiAgICAgICAgICAkc2NvcGUudXNlcnMgPSB1c2Vyc1xuICAgICAgICAgICRzY29wZS5yb3V0ZXMgPSByb3V0ZXNcblxuICAgICAgICAgIC8vIGNoZWNrIHdoZXRoZXIgdXNlciBhZ2VudCBpcyBydW5uaW5nIGNocm9tZVxuICAgICAgICAgICRzY29wZS5oYXNDaHJvbWUgPSAoKSA9PiBuYXZpZ2F0b3IudXNlckFnZW50LnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoJ2Nocm9tZScpXG4gICAgICAgIH0sXG4gICAgICAgIHJlc29sdmU6IHtcbiAgICAgICAgICB1c2VyczogKFVzZXIpID0+IFVzZXIuZmluZEFsbCh7fSwgeyBieXBhc3NDYWNoZTogdHJ1ZSB9KSxcbiAgICAgICAgICByb3V0ZXM6IChSb3V0ZSkgPT4gUm91dGUuZmluZEFsbCh7fSwgeyBieXBhc3NDYWNoZTogdHJ1ZSB9KVxuICAgICAgICB9XG4gICAgfSk7XG59KTtcbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG5cbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnbG9naW4nLCB7XG4gICAgICAgIHVybDogJy9sb2dpbicsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvbG9naW4vbG9naW4uaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdMb2dpbkN0cmwnXG4gICAgfSk7XG5cbn0pO1xuXG5hcHAuY29udHJvbGxlcignTG9naW5DdHJsJywgZnVuY3Rpb24gKCRzY29wZSwgQXV0aFNlcnZpY2UsICRzdGF0ZSkge1xuXG4gICAgJHNjb3BlLmxvZ2luID0ge307XG4gICAgJHNjb3BlLmVycm9yID0gbnVsbDtcblxuICAgICRzY29wZS5zZW5kTG9naW4gPSBmdW5jdGlvbiAobG9naW5JbmZvKSB7XG5cbiAgICAgICAgJHNjb3BlLmVycm9yID0gbnVsbDtcblxuICAgICAgICBBdXRoU2VydmljZS5sb2dpbihsb2dpbkluZm8pLnRoZW4oZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgICAgICRzdGF0ZS5nbygndXNlcicsIHsgaWQ6IHVzZXIuX2lkIH0pO1xuICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAkc2NvcGUuZXJyb3IgPSAnSW52YWxpZCBsb2dpbiBjcmVkZW50aWFscy4nO1xuICAgICAgICB9KTtcblxuICAgIH07XG5cbn0pO1xuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcblxuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdtZW1iZXJzT25seScsIHtcbiAgICAgICAgdXJsOiAnL21lbWJlcnMtYXJlYScsXG4gICAgICAgIHRlbXBsYXRlOiAnJyxcbiAgICAgICAgY29udHJvbGxlcjogZnVuY3Rpb24gKCRzY29wZSkge30sXG5cbiAgICAgICAgLy8gVGhlIGZvbGxvd2luZyBkYXRhLmF1dGhlbnRpY2F0ZSBpcyByZWFkIGJ5IGFuIGV2ZW50IGxpc3RlbmVyXG4gICAgICAgIC8vIHRoYXQgY29udHJvbHMgYWNjZXNzIHRvIHRoaXMgc3RhdGUuIFJlZmVyIHRvIGFwcC5qcy5cbiAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgYXV0aGVudGljYXRlOiB0cnVlXG4gICAgICAgIH1cbiAgICB9KTtcblxufSk7XG4iLCJhcHAuZmFjdG9yeSgnUGlwZXNGYWN0b3J5JywgZnVuY3Rpb24oJGh0dHAsICRxKSB7XG5cdHZhciBmYWN0ID0ge307XG5cblx0ZmFjdC5nZXRSb3V0ZXMgPSAoKSA9PiB7XG5cdFx0cmV0dXJuICRodHRwLmdldCgnL2FwaS9yb3V0ZXMnKVxuXHRcdFx0LnRoZW4ocmVzID0+IHJlcy5kYXRhKTtcblx0fTtcblxuXHRmYWN0LmdldEZpbHRlcnMgPSAoKSA9PiB7XG5cdFx0Ly8gZHVtbXkgZmlsdGVyIGRhdGEgZm9yIG5vd1xuXHRcdHJldHVybiBbe1xuXHRcdFx0bmFtZTogJ2xlbmd0aCdcblx0XHR9XTtcblx0fTtcblxuXHRmYWN0LmdldENyYXdsRGF0YSA9IChyb3V0ZSkgPT4ge1xuXHRcdC8vIGR1bW15IGRhdGEgZm9yIHRlc3Rpbmdcblx0XHRyZXR1cm4ge3RpdGxlOiBbcm91dGUubmFtZSwgcm91dGUubmFtZSArICcxJ10sIG1vcmU6IFtyb3V0ZS51cmxdfTtcblxuXHRcdC8vIGdldCBjcmF3bGVkIGRhdGEgZm9yIHRoZSByb3V0ZVxuXHRcdC8vIHJldHVybiAkaHR0cC5nZXQoYC9hcGkvcm91dGVzLyR7cm91dGUudXNlcn0vJHtyb3V0ZS5uYW1lfWApXG5cdFx0XHQvLyAudGhlbihyZXMgPT4gcmVzLmRhdGEpO1xuXHR9O1xuXG5cdGZhY3QuZ2V0QWxsSW5wdXREYXRhID0gKGlucHV0Um91dGVzKSA9PiB7XG5cdFx0Ly8gZmlyZSBvZmYgcmVxdWVzdHMgZm9yIGNyYXdsZWQgZGF0YVxuXHRcdHZhciBjcmF3bFByb21pc2VzID0gaW5wdXRSb3V0ZXMubWFwKGlucHV0Um91dGUgPT4ge1xuXHRcdFx0cmV0dXJuIGZhY3QuZ2V0Q3Jhd2xEYXRhKGlucHV0Um91dGUpO1xuXHRcdH0pO1xuXHRcdC8vIHJlc29sdmUgd2hlbiBhbGwgcHJvbWlzZXMgcmVzb2x2ZSB3aXRoIHRoZWlyIGNyYXdsZWQgZGF0YVxuXHRcdHJldHVybiAkcS5hbGwoY3Jhd2xQcm9taXNlcyk7XG5cdH07XG5cblx0Ly8gcnVuIHNlbGVjdGVkIGlucHV0cyB0aHJvdWdoIHRoZSBwaXBlIGZpbHRlcnMgYW5kIHJldHVybiB0aGUgb3V0cHV0XG5cdGZhY3QuZ2VuZXJhdGVPdXRwdXQgPSAocGlwZSkgPT4ge1xuXHRcdC8vIGdldCBhbGwgdGhlIGlucHV0J3MgY3Jhd2xlZCBkYXRhXG5cdFx0cmV0dXJuIGZhY3QuZ2V0QWxsSW5wdXREYXRhKHBpcGUuaW5wdXRzKVxuXHRcdFx0LnRoZW4oaW5wdXREYXRhID0+IHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ2lucHV0IGRhdGEnLCBpbnB1dERhdGEpO1xuXHRcdFx0XHQvLyBydW4gaW5wdXQgZGF0YSB0aHJvdWdoIHRoZSBzZWxlY3RlZCBwaXBlcyAoaS5lLiBmaWx0ZXJzKVxuXHRcdFx0XHRyZXR1cm4gZmFjdC5waXBlKGlucHV0RGF0YSwgcGlwZS5maWx0ZXJzKTtcblx0XHRcdH0pXG5cdFx0XHQudGhlbihwaXBlZERhdGEgPT4ge1xuXHRcdFx0XHQvLyBwaXBlZCBkYXRhLCBiYXNpY2FsbHkgdGhlIG91dHB1dCBkYXRhICg/KVxuXHRcdFx0XHRjb25zb2xlLmxvZygncGlwZWQgZGF0YScsIHBpcGVkRGF0YSk7XG5cdFx0XHRcdHBpcGUub3V0cHV0ID0gcGlwZWREYXRhOyAvLyAoPylcblx0XHRcdFx0cmV0dXJuIHBpcGVkRGF0YTtcblx0XHRcdH0pXG5cdFx0XHQuY2F0Y2goZXJyID0+IHtcblx0XHRcdFx0Ly8gaGFuZGxlIGVycm9yc1xuXHRcdFx0XHRjb25zb2xlLmVycm9yKGVycik7XG5cdFx0XHR9KTtcblx0fTtcblxuXHRmYWN0LnBpcGUgPSAoaW5wdXREYXRhLCBwaXBlcykgPT4ge1xuXHRcdC8vIG5vdGhpbmcgZm9yIG5vd1xuXHRcdHJldHVybiBpbnB1dERhdGE7XG5cdH07XG5cblx0cmV0dXJuIGZhY3Q7XG59KTsiLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdwaXBlcycsIHtcbiAgICAgICAgdXJsOiAnL3BpcGVzJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9waXBlcy9waXBlcy5odG1sJyxcbiAgICAgICAgY29udHJvbGxlcjogJ1BpcGVzQ3RybCcsXG4gICAgICAgIHJlc29sdmU6IHtcbiAgICAgICAgXHRyb3V0ZXM6IGZ1bmN0aW9uKFBpcGVzRmFjdG9yeSkge1xuICAgICAgICBcdFx0cmV0dXJuIFBpcGVzRmFjdG9yeS5nZXRSb3V0ZXMoKTtcbiAgICAgICAgXHR9LFxuICAgICAgICBcdGZpbHRlcnM6IGZ1bmN0aW9uKFBpcGVzRmFjdG9yeSkge1xuICAgICAgICBcdFx0cmV0dXJuIFBpcGVzRmFjdG9yeS5nZXRGaWx0ZXJzKCk7XG4gICAgICAgIFx0fVxuICAgICAgICB9XG4gICAgfSk7XG59KTtcblxuYXBwLmNvbnRyb2xsZXIoJ1BpcGVzQ3RybCcsIGZ1bmN0aW9uKCRzY29wZSwgUGlwZXNGYWN0b3J5LCByb3V0ZXMsIGZpbHRlcnMpIHtcblx0JHNjb3BlLnJvdXRlcyA9IHJvdXRlcztcblx0JHNjb3BlLmZpbHRlcnMgPSBmaWx0ZXJzO1xuXG5cdC8vIGhvbGRzIHBpcGVsaW5lIGxvZ2ljICh3aGF0IHRoZSB1c2VyIGlzIG1ha2luZyBvbiB0aGlzIHBhZ2UpXG5cdCRzY29wZS5waXBlID0ge1xuXHRcdC8vIGFycmF5IG9mIHNlbGVjdGVkIHJvdXRlc1xuXHRcdGlucHV0czogW10sXG5cdFx0Ly8gYXJyYXkgb2YgdGhlIHNlbGVjdGVkIGZpbHRlcnMgKGFuZCB0aGVpciBvcmRlcj8pXG5cdFx0Ly8gLyBjYWxsIGl0IFwicGlwZWxpbmVcIiBpbnN0ZWFkP1xuXHRcdGZpbHRlcnM6IFtdLFxuXHRcdC8vIGFycmF5IChmb3Igbm93KSBvZiB0aGUgb3V0cHV0cyBmcm9tIGVhY2ggcGlwZS9pbnB1dCAoZm9yIG5vdylcblx0XHRvdXRwdXQ6IFtdXG5cdH07XG5cblx0Ly8gcmV0dXJucyBjcmF3bGVkIGRhdGEgZm9yIHRoZSBwYXNzZWQgaW4gcm91dGVcblx0JHNjb3BlLmdldENyYXdsRGF0YSA9IChyb3V0ZSkgPT4ge1xuXHRcdGNvbnNvbGUubG9nKCdjcmF3bGluZyBmb3InLCByb3V0ZS5uYW1lKTtcblx0XHRQaXBlc0ZhY3RvcnkuZ2V0Q3Jhd2xEYXRhKHJvdXRlKVxuXHRcdFx0LnRoZW4oZnVuY3Rpb24oZGF0YSkge1xuXHRcdFx0XHRjb25zb2xlLmxvZygnZ290IGRhdGEnLCBkYXRhKTtcblx0XHRcdH0pO1xuXHR9O1xuXG5cdC8vIGFkZCByb3V0ZSB0byBwaXBlIGlucHV0XG5cdCRzY29wZS5zZWxlY3RSb3V0ZSA9IChyb3V0ZSkgPT4ge1xuXHRcdCRzY29wZS5waXBlLmlucHV0cy5wdXNoKHJvdXRlKTtcblx0fTtcblxuXHQvLyByZW1vdmUgcm91dGUgZnJvbSBwaXBlIGlucHV0XG5cdCRzY29wZS5kZXNlbGVjdFJvdXRlID0gKHJvdXRlKSA9PiB7XG5cdFx0JHNjb3BlLnBpcGUuaW5wdXRzID0gJHNjb3BlLnBpcGUuaW5wdXRzLmZpbHRlcihpbnB1dCA9PiBpbnB1dCAhPT0gcm91dGUpO1xuXHR9O1xuXG5cdC8vIGFkZCBmaWx0ZXIgdG8gcGlwZWxpbmVcblx0JHNjb3BlLnNlbGVjdEZpbHRlciA9IChmaWx0ZXIpID0+IHtcblx0XHQkc2NvcGUucGlwZS5maWx0ZXJzLnB1c2goZmlsdGVyKTtcblx0fTtcblxuXHQvLyByZW1vdmUgZmlsdGVyIGZyb20gcGlwZWxpbmVcblx0JHNjb3BlLmRlc2VsZWN0RmlsdGVyID0gKGZpbHRlcikgPT4ge1xuXHRcdCRzY29wZS5waXBlLmZpbHRlcnMgPSAkc2NvcGUucGlwZS5maWx0ZXJzLmZpbHRlcihwaXBlID0+IHBpcGUgIT09IGZpbHRlcik7XG5cdH07XG5cblx0Ly8gcnVuIHNlbGVjdGVkIGlucHV0cyB0aHJvdWdoIHRoZSBwaXBlIGZpbHRlcnMgYW5kIHJldHVybiB0aGUgb3V0cHV0XG5cdCRzY29wZS5nZW5lcmF0ZU91dHB1dCA9ICgpID0+IHtcblxuXHRcdFBpcGVzRmFjdG9yeS5nZW5lcmF0ZU91dHB1dCgkc2NvcGUucGlwZSlcblx0XHRcdC50aGVuKG91dHB1dCA9PiB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKG91dHB1dCk7XG5cdFx0XHR9KTtcblx0fTtcblxuXHQvLyBzYXZlcyB0aGlzIHBpcGUgdG8gdGhlIHVzZXIgZGJcblx0JHNjb3BlLnNhdmVQaXBlID0oKSA9PiB7XG5cdFx0UGlwZXNGYWN0b3J5LnNhdmVQaXBlKClcblx0XHRcdC50aGVuKGRhdGEgPT4ge1xuXHRcdFx0XHRjb25zb2xlLmxvZygnc2F2ZWQgdGhlIHBpcGUnLCBkYXRhKTtcblx0XHRcdH0pO1xuXHR9O1xuXG59KTsiLCJhcHAuY29uZmlnKCgkc3RhdGVQcm92aWRlcikgPT4ge1xuICAkc3RhdGVQcm92aWRlci5zdGF0ZSgndXNlcicsIHtcbiAgICB1cmw6ICcvOmlkL3Byb2ZpbGUnLFxuICAgIHRlbXBsYXRlVXJsOiAnanMvdXNlcl9wcm9maWxlL3VzZXJfcHJvZmlsZS5odG1sJyxcbiAgICBjb250cm9sbGVyOiAoJHNjb3BlLCB1c2VyLCByb3V0ZXMpID0+IHtcbiAgICAgICRzY29wZS51c2VyID0gdXNlclxuICAgICAgJHNjb3BlLnJvdXRlcyA9IHJvdXRlc1xuXG4gICAgICBjb25zb2xlLmxvZyh1c2VyLCByb3V0ZXMpXG4gICAgfSxcbiAgICByZXNvbHZlOiB7XG4gICAgICB1c2VyOiAoJHN0YXRlUGFyYW1zLCBVc2VyKSA9PiBVc2VyLmZpbmQoJHN0YXRlUGFyYW1zLmlkKSxcbiAgICAgIHJvdXRlczogKHVzZXIsIFJvdXRlKSA9PiBSb3V0ZS5maW5kQWxsKHsgJ191c2VyJzogdXNlciB9KVxuICAgIH1cbiAgfSlcbn0pXG4iLCJhcHAuZmFjdG9yeSgnUm91dGUnLCAoJHN0YXRlLCBEUykgPT4ge1xuXG4gIGxldCBSb3V0ZSA9IERTLmRlZmluZVJlc291cmNlKHtcbiAgICBuYW1lOiAncm91dGUnLFxuICAgIGVuZHBvaW50OiAncm91dGVzJyxcbiAgICByZWxhdGlvbnM6IHtcbiAgICAgIGJlbG9uZ3NUbzoge1xuICAgICAgICB1c2VyOiB7XG4gICAgICAgICAgLy8gbG9jYWwgZmllbGQgaXMgZm9yIGxpbmtpbmcgcmVsYXRpb25zXG4gICAgICAgICAgLy8gcm91dGUudXNlciAtPiB1c2VyKG93bmVyKSBvZiB0aGUgcm91dGVcbiAgICAgICAgICBsb2NhbEZpZWxkOiAnX3VzZXInLFxuICAgICAgICAgIC8vIGxvY2FsIGtleSBpcyB0aGUgXCJqb2luXCIgZmllbGRcbiAgICAgICAgICAvLyB0aGUgbmFtZSBvZiB0aGUgZmllbGQgb24gdGhlIHJvdXRlIHRoYXQgcG9pbnRzIHRvIGl0cyBwYXJlbnQgdXNlclxuICAgICAgICAgIGxvY2FsS2V5OiAndXNlcicsXG4gICAgICAgICAgcGFyZW50OiB0cnVlXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIG1ldGhvZHM6IHtcbiAgICAgIGdvOiBmdW5jdGlvbigpIHtcbiAgICAgICAgY29uc29sZS5sb2coYHRyYW5zaXRpb25pbmcgdG8gcm91dGUgc3RhdGUgKCR7dGhpcy5uYW1lfSwgJHt0aGlzLl9pZH0pYClcbiAgICAgIH1cbiAgICB9XG4gIH0pXG5cbiAgcmV0dXJuIFJvdXRlXG59KVxuLnJ1bihSb3V0ZSA9PiB7fSlcbiIsImFwcC5mYWN0b3J5KCdVc2VyJywgKCRzdGF0ZSwgRFMpID0+IHtcblxuICBsZXQgVXNlciA9IERTLmRlZmluZVJlc291cmNlKHtcbiAgICBuYW1lOiAndXNlcicsXG4gICAgZW5kcG9pbnQ6ICd1c2VycycsXG4gICAgcmVsYXRpb25zOiB7XG4gICAgICBoYXNNYW55OiB7XG4gICAgICAgIHJvdXRlOiB7XG4gICAgICAgICAgLy8gbG9jYWwgZmllbGQgaXMgZm9yIGxpbmtpbmcgcmVsYXRpb25zXG4gICAgICAgICAgLy8gdXNlci5yb3V0ZXMgLT4gYXJyYXkgb2Ygcm91dGVzIGZvciB0aGUgdXNlclxuICAgICAgICAgIGxvY2FsRmllbGQ6ICdyb3V0ZXMnLFxuICAgICAgICAgIC8vIGZvcmVpZ24ga2V5IGlzIHRoZSAnam9pbicgZmllbGRcbiAgICAgICAgICAvLyB0aGUgbmFtZSBvZiB0aGUgZmllbGQgb24gYSByb3V0ZSB0aGF0IHBvaW50cyB0byBpdHMgcGFyZW50IHVzZXJcbiAgICAgICAgICBmb3JlaWduS2V5OiAndXNlcidcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG5cbiAgICAvLyBmdW5jdGlvbmFsaXR5IGFkZGVkIHRvIGV2ZXJ5IGluc3RhbmNlIG9mIFVzZXJcbiAgICBtZXRob2RzOiB7XG4gICAgICBnbzogZnVuY3Rpb24oKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKGB0cmFuc2l0aW9uaW5nIHRvIHVzZXIgc3RhdGUgKCR7dGhpcy5uYW1lfSlgKVxuICAgICAgICAkc3RhdGUuZ28oJ3VzZXInLCB7IGlkOiB0aGlzLl9pZCB9KVxuICAgICAgfVxuICAgIH1cbiAgfSlcblxuICByZXR1cm4gVXNlclxufSlcbi5ydW4oVXNlciA9PiB7fSlcbiIsImFwcC5kaXJlY3RpdmUoJ2ZpbHRlcicsIGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4ge1xuXHRcdHJlc3RyaWN0OiAnRScsXG5cdFx0dGVtcGxhdGVVcmw6ICdqcy9waXBlcy9maWx0ZXIvZmlsdGVyLmh0bWwnLFxuXHRcdHNjb3BlOiB7XG5cdFx0XHRmaWx0ZXI6ICc9Jyxcblx0XHRcdHNlbGVjdDogJyYnXG5cdFx0fSxcblx0XHRsaW5rOiBmdW5jdGlvbigpIHtcblxuXHRcdH1cblx0fTtcbn0pOyIsImFwcC5kaXJlY3RpdmUoJ3JvdXRlJywgZnVuY3Rpb24oKSB7XG5cdHJldHVybiB7XG5cdFx0cmVzdHJpY3Q6ICdFJyxcblx0XHR0ZW1wbGF0ZVVybDogJ2pzL3BpcGVzL3JvdXRlL3JvdXRlLmh0bWwnLFxuXHRcdHNjb3BlOiB7XG5cdFx0XHRyb3V0ZTogJz0nLFxuXHRcdFx0Z2V0OiAnJicsXG5cdFx0XHRzZWxlY3Q6ICcmJ1xuXHRcdH0sXG5cdFx0bGluazogZnVuY3Rpb24oKSB7XG5cdFx0XHRcblx0XHR9XG5cdH07XG59KTsiLCJhcHAuZGlyZWN0aXZlKCduYXZiYXInLCBmdW5jdGlvbiAoJHJvb3RTY29wZSwgJHN0YXRlLCBBdXRoU2VydmljZSwgQVVUSF9FVkVOVFMsIFVzZXIpIHtcblxuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHNjb3BlOiB7fSxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9jb21tb24vZGlyZWN0aXZlcy9uYXZiYXIvbmF2YmFyLmh0bWwnLFxuICAgICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUpIHtcblxuICAgICAgICAgICAgc2NvcGUuaXRlbXMgPSBbXG4gICAgICAgICAgICAgICAgLy8geyBsYWJlbDogJ0hvbWUnLCBzdGF0ZTogJ2hvbWUnIH0sXG4gICAgICAgICAgICAgICAgeyBsYWJlbDogJ1BpcGVzJywgc3RhdGU6ICdwaXBlcyd9LFxuICAgICAgICAgICAgICAgIHsgbGFiZWw6ICdEb2N1bWVudGF0aW9uJywgc3RhdGU6ICdkb2NzJyB9LFxuICAgICAgICAgICAgICAgIHsgbGFiZWw6ICdBYm91dCcsIHN0YXRlOiAnYWJvdXQnIH0sXG4gICAgICAgICAgICAgICAgeyBsYWJlbDogJ0hlbHAnLCBzdGF0ZTogJ2hlbHAnIH0sXG4gICAgICAgICAgICAgICAgLy97IGxhYmVsOiAnTWVtYmVycyBPbmx5Jywgc3RhdGU6ICdtZW1iZXJzT25seScsIGF1dGg6IHRydWUgfVxuICAgICAgICAgICAgXTtcblxuICAgICAgICAgICAgc2NvcGUudXNlciA9IG51bGw7XG5cbiAgICAgICAgICAgIHNjb3BlLmlzTG9nZ2VkSW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIEF1dGhTZXJ2aWNlLmlzQXV0aGVudGljYXRlZCgpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgc2NvcGUubG9nb3V0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIEF1dGhTZXJ2aWNlLmxvZ291dCgpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICRzdGF0ZS5nbygnaG9tZScpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdmFyIHNldFVzZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgQXV0aFNlcnZpY2UuZ2V0TG9nZ2VkSW5Vc2VyKClcbiAgICAgICAgICAgICAgICAgIC50aGVuKHVzZXIgPT4gVXNlci5maW5kKHVzZXIuX2lkKSlcbiAgICAgICAgICAgICAgICAgIC50aGVuKHVzZXIgPT4ge1xuICAgICAgICAgICAgICAgICAgICBzY29wZS51c2VyID0gdXNlclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdXNlclxuICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHZhciByZW1vdmVVc2VyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHNjb3BlLnVzZXIgPSBudWxsO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgc2V0VXNlcigpO1xuXG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5sb2dpblN1Y2Nlc3MsIHNldFVzZXIpO1xuICAgICAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMubG9nb3V0U3VjY2VzcywgcmVtb3ZlVXNlcik7XG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5zZXNzaW9uVGltZW91dCwgcmVtb3ZlVXNlcik7XG5cbiAgICAgICAgfVxuXG4gICAgfTtcblxufSk7XG4iLCJhcHAuZGlyZWN0aXZlKCdub2RlbW9ub0xvZ28nLCBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9jb21tb24vZGlyZWN0aXZlcy9ub2RlbW9uby1sb2dvL25vZGVtb25vLWxvZ28uaHRtbCcsXG4gICAgICAgIGxpbms6IChzY29wZSwgZWxlbSwgYXR0cikgPT4ge1xuXG4gICAgICAgICAgc2NvcGUuaW5zdGFsbENocm9tZUV4dCA9ICgpID0+IHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGBpbnN0YWxsaW5nIE5vZGVtb25vIGNocm9tZSBleHRlbnNpb24uLi5gKVxuICAgICAgICAgIH1cblxuICAgICAgICB9XG4gICAgfTtcbn0pO1xuIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9