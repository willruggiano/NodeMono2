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
        controller: function controller($scope, user) {
            $scope.user = user;
            console.log('loaded user profile page for ' + user.name);
            console.log(user);
        },
        resolve: {
            user: function user($stateParams, User) {
                return User.find($stateParams.id);
            }
        }
    });
});

app.factory('Route', function (DS) {

    var Route = DS.defineResource({
        name: 'route',
        endpoint: 'routes',
        relations: {
            belongsTo: {
                user: {
                    // local field is for linking relations
                    // route.user -> user(owner) of the route
                    localField: 'user',
                    // local key is the "join" field
                    // the name of the field on the route that points to its parent user
                    localKey: 'userKey',
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

app.factory('User', function (DS, $state) {

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
                    foreignKey: 'userKey'
                }
            }
        },

        // functionality added to every instance of User
        methods: {
            go: function go() {
                console.log('transitioning to user state (' + this.name + ', ' + this._id + ')');
                $state.go('user', { id: this._id });
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
        link: function link(scope) {

            scope.items = [
            // { label: 'Home', state: 'home' },
            { label: 'Documentation', state: 'docs' }, { label: 'About', state: 'about' }, { label: 'Help', state: 'help' }];

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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImFib3V0L2Fib3V0LmpzIiwiZG9jcy9kb2NzLmpzIiwiZnNhL2ZzYS1wcmUtYnVpbHQuanMiLCJoZWxwL2hlbHAuanMiLCJob21lL2hvbWUuanMiLCJsb2dpbi9sb2dpbi5qcyIsIm1lbWJlcnMtb25seS9tZW1iZXJzLW9ubHkuanMiLCJ1c2VyX3Byb2ZpbGUvdXNlcl9wcm9maWxlLmpzIiwiY29tbW9uL2ZhY3Rvcmllcy9yb3V0ZS5mYWN0b3J5LmpzIiwiY29tbW9uL2ZhY3Rvcmllcy91c2VyLmZhY3RvcnkuanMiLCJjb21tb24vZGlyZWN0aXZlcy9uYXZiYXIvbmF2YmFyLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvbm9kZW1vbm8tbG9nby9ub2RlbW9uby1sb2dvLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLFlBQUEsQ0FBQTtBQUNBLE1BQUEsQ0FBQSxHQUFBLEdBQUEsT0FBQSxDQUFBLE1BQUEsQ0FBQSxhQUFBLEVBQUEsQ0FBQSxXQUFBLEVBQUEsY0FBQSxFQUFBLGFBQUEsRUFBQSxTQUFBLENBQUEsQ0FBQSxDQUFBOztBQUVBLEdBQUEsQ0FBQSxNQUFBLENBQUEsVUFBQSxrQkFBQSxFQUFBLGlCQUFBLEVBQUEsVUFBQSxFQUFBLHFCQUFBLEVBQUE7O0FBRUEscUJBQUEsQ0FBQSxTQUFBLENBQUEsSUFBQSxDQUFBLENBQUE7O0FBRUEsc0JBQUEsQ0FBQSxTQUFBLENBQUEsR0FBQSxDQUFBLENBQUE7OztBQUdBLGNBQUEsQ0FBQSxRQUFBLENBQUEsUUFBQSxHQUFBLE1BQUEsQ0FBQTtBQUNBLGNBQUEsQ0FBQSxRQUFBLENBQUEsV0FBQSxHQUFBLEtBQUEsQ0FBQTs7Ozs7QUFNQSxjQUFBLENBQUEsUUFBQSxDQUFBLFNBQUEsR0FBQSxVQUFBLE9BQUEsRUFBQTtBQUNBLFlBQUEsSUFBQSxHQUFBLElBQUEsQ0FBQSxNQUFBLEVBQUEsQ0FBQTtBQUNBLFlBQUEsSUFBQSxDQUFBLE1BQUEsRUFBQSxPQUFBLE9BQUEsQ0FBQSxPQUFBLENBQUEsT0FBQSxDQUFBLElBQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQSxDQUFBLEtBQ0EsT0FBQSxJQUFBLENBQUEsT0FBQSxFQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsSUFBQTttQkFBQSxPQUFBLENBQUEsSUFBQSxDQUFBLElBQUEsQ0FBQTtTQUFBLENBQUEsQ0FBQTtLQUNBLENBQUE7Ozs7OztBQU1BLGFBQUEsWUFBQSxDQUFBLFFBQUEsRUFBQSxRQUFBLEVBQUE7QUFDQSxpQkFBQSxZQUFBLENBQUEsQ0FBQSxFQUFBO0FBQ0Esa0JBQUEsQ0FBQSxPQUFBLENBQUEsT0FBQSxDQUFBLFFBQUEsQ0FBQSxZQUFBLEVBQUEsVUFBQSxHQUFBLEVBQUE7QUFDQSxvQkFBQSxZQUFBLEdBQUEsR0FBQSxDQUFBLFFBQUEsQ0FBQTtBQUNBLG9CQUFBLFdBQUEsR0FBQSxRQUFBLENBQUEsV0FBQSxDQUFBLFlBQUEsQ0FBQSxDQUFBO0FBQ0Esb0JBQUEsR0FBQSxDQUFBLElBQUEsS0FBQSxTQUFBLEVBQUE7QUFDQSx3QkFBQSxDQUFBLENBQUEsY0FBQSxDQUFBLEdBQUEsQ0FBQSxVQUFBLENBQUEsRUFBQTtBQUNBLDRCQUFBLENBQUEsQ0FBQSxHQUFBLENBQUEsVUFBQSxDQUFBLENBQUEsTUFBQSxJQUFBLENBQUEsTUFBQSxDQUFBLE9BQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQSxDQUFBLEdBQUEsQ0FBQSxVQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxFQUFBOztBQUVBLDZCQUFBLENBQUEsR0FBQSxDQUFBLFNBQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQSxHQUFBLENBQUEsVUFBQSxDQUFBLENBQUE7QUFDQSxtQ0FBQSxDQUFBLENBQUEsR0FBQSxDQUFBLFVBQUEsQ0FBQSxDQUFBO3lCQUNBLE1BQUEsSUFBQSxDQUFBLENBQUEsQ0FBQSxHQUFBLENBQUEsU0FBQSxDQUFBLEVBQUE7O0FBRUEsNkJBQUEsQ0FBQSxHQUFBLENBQUEsU0FBQSxDQUFBLEdBQUEsRUFBQSxDQUFBO0FBQ0Esa0NBQUEsQ0FBQSxPQUFBLENBQUEsT0FBQSxDQUFBLENBQUEsQ0FBQSxHQUFBLENBQUEsVUFBQSxDQUFBLEVBQUEsVUFBQSxLQUFBLEVBQUE7QUFDQSxpQ0FBQSxDQUFBLEdBQUEsQ0FBQSxTQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsS0FBQSxDQUFBLFdBQUEsQ0FBQSxXQUFBLENBQUEsQ0FBQSxDQUFBOzZCQUNBLENBQUEsQ0FBQTt5QkFDQTtxQkFDQTtpQkFDQSxNQUNBLElBQUEsR0FBQSxDQUFBLElBQUEsS0FBQSxXQUFBLEVBQUE7QUFDQSx3QkFBQSxDQUFBLENBQUEsY0FBQSxDQUFBLEdBQUEsQ0FBQSxVQUFBLENBQUEsRUFBQTs7QUFFQSw0QkFBQSxNQUFBLENBQUEsT0FBQSxDQUFBLFFBQUEsQ0FBQSxDQUFBLENBQUEsR0FBQSxDQUFBLFVBQUEsQ0FBQSxDQUFBLEVBQUE7QUFDQSw2QkFBQSxDQUFBLEdBQUEsQ0FBQSxRQUFBLENBQUEsR0FBQSxDQUFBLENBQUEsR0FBQSxDQUFBLFVBQUEsQ0FBQSxDQUFBLEdBQUEsQ0FBQTt5QkFDQTs7NkJBRUEsSUFBQSxDQUFBLE1BQUEsQ0FBQSxPQUFBLENBQUEsUUFBQSxDQUFBLENBQUEsQ0FBQSxHQUFBLENBQUEsVUFBQSxDQUFBLENBQUEsRUFBQTtBQUNBLGlDQUFBLENBQUEsR0FBQSxDQUFBLFFBQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQSxHQUFBLENBQUEsVUFBQSxDQUFBLENBQUE7QUFDQSx1Q0FBQSxDQUFBLENBQUEsR0FBQSxDQUFBLFVBQUEsQ0FBQSxDQUFBOzZCQUNBO3FCQUNBO2lCQUNBO2FBQ0EsQ0FBQSxDQUFBO1NBQ0E7O0FBRUEsWUFBQSxNQUFBLENBQUEsT0FBQSxDQUFBLE9BQUEsQ0FBQSxRQUFBLENBQUEsRUFBQTtBQUNBLGtCQUFBLENBQUEsT0FBQSxDQUFBLE9BQUEsQ0FBQSxRQUFBLEVBQUEsWUFBQSxDQUFBLENBQUE7U0FDQSxNQUFBO0FBQ0Esd0JBQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQTtTQUNBO0tBQ0E7O0FBR0EsY0FBQSxDQUFBLFFBQUEsQ0FBQSxXQUFBLEdBQUEsVUFBQSxRQUFBLEVBQUEsSUFBQSxFQUFBO0FBQ0EsWUFBQSxRQUFBLEdBQUEsSUFBQSxDQUFBLElBQUEsQ0FBQTtBQUNBLG9CQUFBLENBQUEsUUFBQSxFQUFBLFFBQUEsQ0FBQSxDQUFBO0FBQ0EsZUFBQSxRQUFBLENBQUE7S0FDQSxDQUFBOztDQUVBLENBQUEsQ0FBQTs7O0FBR0EsR0FBQSxDQUFBLEdBQUEsQ0FBQSxVQUFBLFVBQUEsRUFBQSxXQUFBLEVBQUEsTUFBQSxFQUFBOzs7QUFHQSxRQUFBLDRCQUFBLEdBQUEsU0FBQSw0QkFBQSxDQUFBLEtBQUEsRUFBQTtBQUNBLGVBQUEsS0FBQSxDQUFBLElBQUEsSUFBQSxLQUFBLENBQUEsSUFBQSxDQUFBLFlBQUEsQ0FBQTtLQUNBLENBQUE7Ozs7QUFJQSxjQUFBLENBQUEsR0FBQSxDQUFBLG1CQUFBLEVBQUEsVUFBQSxLQUFBLEVBQUEsT0FBQSxFQUFBLFFBQUEsRUFBQTs7QUFFQSxZQUFBLENBQUEsNEJBQUEsQ0FBQSxPQUFBLENBQUEsRUFBQTs7O0FBR0EsbUJBQUE7U0FDQTs7QUFFQSxZQUFBLFdBQUEsQ0FBQSxlQUFBLEVBQUEsRUFBQTs7O0FBR0EsbUJBQUE7U0FDQTs7O0FBR0EsYUFBQSxDQUFBLGNBQUEsRUFBQSxDQUFBOztBQUVBLG1CQUFBLENBQUEsZUFBQSxFQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsSUFBQSxFQUFBOzs7O0FBSUEsZ0JBQUEsSUFBQSxFQUFBO0FBQ0Esc0JBQUEsQ0FBQSxFQUFBLENBQUEsT0FBQSxDQUFBLElBQUEsRUFBQSxRQUFBLENBQUEsQ0FBQTthQUNBLE1BQUE7QUFDQSxzQkFBQSxDQUFBLEVBQUEsQ0FBQSxPQUFBLENBQUEsQ0FBQTthQUNBO1NBQ0EsQ0FBQSxDQUFBO0tBRUEsQ0FBQSxDQUFBO0NBRUEsQ0FBQSxDQUFBOztBQ3ZIQSxHQUFBLENBQUEsTUFBQSxDQUFBLFVBQUEsY0FBQSxFQUFBOzs7QUFHQSxrQkFBQSxDQUFBLEtBQUEsQ0FBQSxPQUFBLEVBQUE7QUFDQSxXQUFBLEVBQUEsUUFBQTtBQUNBLGtCQUFBLEVBQUEsaUJBQUE7QUFDQSxtQkFBQSxFQUFBLHFCQUFBO0tBQ0EsQ0FBQSxDQUFBO0NBRUEsQ0FBQSxDQUFBOztBQUVBLEdBQUEsQ0FBQSxVQUFBLENBQUEsaUJBQUEsRUFBQSxVQUFBLE1BQUEsRUFBQTs7OztDQUlBLENBQUEsQ0FBQTs7QUNmQSxHQUFBLENBQUEsTUFBQSxDQUFBLFVBQUEsY0FBQSxFQUFBO0FBQ0Esa0JBQUEsQ0FBQSxLQUFBLENBQUEsTUFBQSxFQUFBO0FBQ0EsV0FBQSxFQUFBLE9BQUE7QUFDQSxtQkFBQSxFQUFBLG1CQUFBO0tBQ0EsQ0FBQSxDQUFBO0NBQ0EsQ0FBQSxDQUFBOztBQ0xBLENBQUEsWUFBQTs7QUFFQSxnQkFBQSxDQUFBOzs7QUFHQSxRQUFBLENBQUEsTUFBQSxDQUFBLE9BQUEsRUFBQSxNQUFBLElBQUEsS0FBQSxDQUFBLHdCQUFBLENBQUEsQ0FBQTs7QUFFQSxRQUFBLEdBQUEsR0FBQSxPQUFBLENBQUEsTUFBQSxDQUFBLGFBQUEsRUFBQSxFQUFBLENBQUEsQ0FBQTs7QUFFQSxPQUFBLENBQUEsT0FBQSxDQUFBLFFBQUEsRUFBQSxZQUFBO0FBQ0EsWUFBQSxDQUFBLE1BQUEsQ0FBQSxFQUFBLEVBQUEsTUFBQSxJQUFBLEtBQUEsQ0FBQSxzQkFBQSxDQUFBLENBQUE7QUFDQSxlQUFBLE1BQUEsQ0FBQSxFQUFBLENBQUEsTUFBQSxDQUFBLFFBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTtLQUNBLENBQUEsQ0FBQTs7Ozs7QUFLQSxPQUFBLENBQUEsUUFBQSxDQUFBLGFBQUEsRUFBQTtBQUNBLG9CQUFBLEVBQUEsb0JBQUE7QUFDQSxtQkFBQSxFQUFBLG1CQUFBO0FBQ0EscUJBQUEsRUFBQSxxQkFBQTtBQUNBLHNCQUFBLEVBQUEsc0JBQUE7QUFDQSx3QkFBQSxFQUFBLHdCQUFBO0FBQ0EscUJBQUEsRUFBQSxxQkFBQTtLQUNBLENBQUEsQ0FBQTs7QUFFQSxPQUFBLENBQUEsT0FBQSxDQUFBLGlCQUFBLEVBQUEsVUFBQSxVQUFBLEVBQUEsRUFBQSxFQUFBLFdBQUEsRUFBQTtBQUNBLFlBQUEsVUFBQSxHQUFBO0FBQ0EsZUFBQSxFQUFBLFdBQUEsQ0FBQSxnQkFBQTtBQUNBLGVBQUEsRUFBQSxXQUFBLENBQUEsYUFBQTtBQUNBLGVBQUEsRUFBQSxXQUFBLENBQUEsY0FBQTtBQUNBLGVBQUEsRUFBQSxXQUFBLENBQUEsY0FBQTtTQUNBLENBQUE7QUFDQSxlQUFBO0FBQ0EseUJBQUEsRUFBQSx1QkFBQSxRQUFBLEVBQUE7QUFDQSwwQkFBQSxDQUFBLFVBQUEsQ0FBQSxVQUFBLENBQUEsUUFBQSxDQUFBLE1BQUEsQ0FBQSxFQUFBLFFBQUEsQ0FBQSxDQUFBO0FBQ0EsdUJBQUEsRUFBQSxDQUFBLE1BQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQTthQUNBO1NBQ0EsQ0FBQTtLQUNBLENBQUEsQ0FBQTs7QUFFQSxPQUFBLENBQUEsTUFBQSxDQUFBLFVBQUEsYUFBQSxFQUFBO0FBQ0EscUJBQUEsQ0FBQSxZQUFBLENBQUEsSUFBQSxDQUFBLENBQ0EsV0FBQSxFQUNBLFVBQUEsU0FBQSxFQUFBO0FBQ0EsbUJBQUEsU0FBQSxDQUFBLEdBQUEsQ0FBQSxpQkFBQSxDQUFBLENBQUE7U0FDQSxDQUNBLENBQUEsQ0FBQTtLQUNBLENBQUEsQ0FBQTs7QUFFQSxPQUFBLENBQUEsT0FBQSxDQUFBLGFBQUEsRUFBQSxVQUFBLEtBQUEsRUFBQSxPQUFBLEVBQUEsVUFBQSxFQUFBLFdBQUEsRUFBQSxFQUFBLEVBQUEsSUFBQSxFQUFBOztBQUVBLGlCQUFBLGlCQUFBLENBQUEsUUFBQSxFQUFBO0FBQ0EsZ0JBQUEsSUFBQSxHQUFBLFFBQUEsQ0FBQSxJQUFBLENBQUE7QUFDQSxtQkFBQSxDQUFBLE1BQUEsQ0FBQSxJQUFBLENBQUEsRUFBQSxFQUFBLElBQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQTtBQUNBLHNCQUFBLENBQUEsVUFBQSxDQUFBLFdBQUEsQ0FBQSxZQUFBLENBQUEsQ0FBQTtBQUNBLG1CQUFBLElBQUEsQ0FBQSxJQUFBLENBQUE7U0FDQTs7OztBQUlBLFlBQUEsQ0FBQSxlQUFBLEdBQUEsWUFBQTtBQUNBLG1CQUFBLENBQUEsQ0FBQSxPQUFBLENBQUEsSUFBQSxDQUFBO1NBQ0EsQ0FBQTs7QUFFQSxZQUFBLENBQUEsZUFBQSxHQUFBLFVBQUEsVUFBQSxFQUFBOzs7Ozs7Ozs7O0FBVUEsZ0JBQUEsSUFBQSxDQUFBLGVBQUEsRUFBQSxJQUFBLFVBQUEsS0FBQSxJQUFBLEVBQUE7QUFDQSx1QkFBQSxFQUFBLENBQUEsSUFBQSxDQUFBLE9BQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQTthQUNBOzs7OztBQUtBLG1CQUFBLEtBQUEsQ0FBQSxHQUFBLENBQUEsVUFBQSxDQUFBLENBQUEsSUFBQSxDQUFBLGlCQUFBLENBQUEsU0FBQSxDQUFBLFlBQUE7QUFDQSx1QkFBQSxJQUFBLENBQUE7YUFDQSxDQUFBLENBQUE7U0FFQSxDQUFBOztBQUVBLFlBQUEsQ0FBQSxLQUFBLEdBQUEsVUFBQSxXQUFBLEVBQUE7QUFDQSxtQkFBQSxLQUFBLENBQUEsSUFBQSxDQUFBLFFBQUEsRUFBQSxXQUFBLENBQUEsQ0FDQSxJQUFBLENBQUEsaUJBQUEsQ0FBQSxTQUNBLENBQUEsWUFBQTtBQUNBLHVCQUFBLEVBQUEsQ0FBQSxNQUFBLENBQUEsRUFBQSxPQUFBLEVBQUEsNEJBQUEsRUFBQSxDQUFBLENBQUE7YUFDQSxDQUFBLENBQUE7U0FDQSxDQUFBOztBQUVBLFlBQUEsQ0FBQSxNQUFBLEdBQUEsWUFBQTtBQUNBLG1CQUFBLEtBQUEsQ0FBQSxHQUFBLENBQUEsU0FBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFlBQUE7QUFDQSx1QkFBQSxDQUFBLE9BQUEsRUFBQSxDQUFBO0FBQ0EsMEJBQUEsQ0FBQSxVQUFBLENBQUEsV0FBQSxDQUFBLGFBQUEsQ0FBQSxDQUFBO2FBQ0EsQ0FBQSxDQUFBO1NBQ0EsQ0FBQTtLQUVBLENBQUEsQ0FBQTs7QUFFQSxPQUFBLENBQUEsT0FBQSxDQUFBLFNBQUEsRUFBQSxVQUFBLFVBQUEsRUFBQSxXQUFBLEVBQUE7O0FBRUEsWUFBQSxJQUFBLEdBQUEsSUFBQSxDQUFBOztBQUVBLGtCQUFBLENBQUEsR0FBQSxDQUFBLFdBQUEsQ0FBQSxnQkFBQSxFQUFBLFlBQUE7QUFDQSxnQkFBQSxDQUFBLE9BQUEsRUFBQSxDQUFBO1NBQ0EsQ0FBQSxDQUFBOztBQUVBLGtCQUFBLENBQUEsR0FBQSxDQUFBLFdBQUEsQ0FBQSxjQUFBLEVBQUEsWUFBQTtBQUNBLGdCQUFBLENBQUEsT0FBQSxFQUFBLENBQUE7U0FDQSxDQUFBLENBQUE7O0FBRUEsWUFBQSxDQUFBLEVBQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxZQUFBLENBQUEsSUFBQSxHQUFBLElBQUEsQ0FBQTs7QUFFQSxZQUFBLENBQUEsTUFBQSxHQUFBLFVBQUEsU0FBQSxFQUFBLElBQUEsRUFBQTtBQUNBLGdCQUFBLENBQUEsRUFBQSxHQUFBLFNBQUEsQ0FBQTtBQUNBLGdCQUFBLENBQUEsSUFBQSxHQUFBLElBQUEsQ0FBQTtTQUNBLENBQUE7O0FBRUEsWUFBQSxDQUFBLE9BQUEsR0FBQSxZQUFBO0FBQ0EsZ0JBQUEsQ0FBQSxFQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsZ0JBQUEsQ0FBQSxJQUFBLEdBQUEsSUFBQSxDQUFBO1NBQ0EsQ0FBQTtLQUVBLENBQUEsQ0FBQTtDQUVBLENBQUEsRUFBQSxDQUFBOztBQ3BJQSxHQUFBLENBQUEsTUFBQSxDQUFBLFVBQUEsY0FBQSxFQUFBO0FBQ0Esa0JBQUEsQ0FBQSxLQUFBLENBQUEsTUFBQSxFQUFBO0FBQ0EsV0FBQSxFQUFBLE9BQUE7QUFDQSxtQkFBQSxFQUFBLG1CQUFBO0tBQ0EsQ0FBQSxDQUFBO0NBQ0EsQ0FBQSxDQUFBOztBQ0xBLEdBQUEsQ0FBQSxNQUFBLENBQUEsVUFBQSxjQUFBLEVBQUE7QUFDQSxrQkFBQSxDQUFBLEtBQUEsQ0FBQSxNQUFBLEVBQUE7QUFDQSxXQUFBLEVBQUEsR0FBQTtBQUNBLG1CQUFBLEVBQUEsbUJBQUE7QUFDQSxrQkFBQSxFQUFBLG9CQUFBLE1BQUEsRUFBQSxLQUFBLEVBQUEsTUFBQSxFQUFBO0FBQ0Esa0JBQUEsQ0FBQSxLQUFBLEdBQUEsS0FBQSxDQUFBO0FBQ0Esa0JBQUEsQ0FBQSxNQUFBLEdBQUEsTUFBQSxDQUFBOzs7QUFHQSxrQkFBQSxDQUFBLFNBQUEsR0FBQTt1QkFBQSxTQUFBLENBQUEsU0FBQSxDQUFBLFdBQUEsRUFBQSxDQUFBLFFBQUEsQ0FBQSxRQUFBLENBQUE7YUFBQSxDQUFBO1NBQ0E7QUFDQSxlQUFBLEVBQUE7QUFDQSxpQkFBQSxFQUFBLGVBQUEsSUFBQTt1QkFBQSxJQUFBLENBQUEsT0FBQSxDQUFBLEVBQUEsRUFBQSxFQUFBLFdBQUEsRUFBQSxJQUFBLEVBQUEsQ0FBQTthQUFBO0FBQ0Esa0JBQUEsRUFBQSxnQkFBQSxLQUFBO3VCQUFBLEtBQUEsQ0FBQSxPQUFBLENBQUEsRUFBQSxFQUFBLEVBQUEsV0FBQSxFQUFBLElBQUEsRUFBQSxDQUFBO2FBQUE7U0FDQTtLQUNBLENBQUEsQ0FBQTtDQUNBLENBQUEsQ0FBQTs7QUNoQkEsR0FBQSxDQUFBLE1BQUEsQ0FBQSxVQUFBLGNBQUEsRUFBQTs7QUFFQSxrQkFBQSxDQUFBLEtBQUEsQ0FBQSxPQUFBLEVBQUE7QUFDQSxXQUFBLEVBQUEsUUFBQTtBQUNBLG1CQUFBLEVBQUEscUJBQUE7QUFDQSxrQkFBQSxFQUFBLFdBQUE7S0FDQSxDQUFBLENBQUE7Q0FFQSxDQUFBLENBQUE7O0FBRUEsR0FBQSxDQUFBLFVBQUEsQ0FBQSxXQUFBLEVBQUEsVUFBQSxNQUFBLEVBQUEsV0FBQSxFQUFBLE1BQUEsRUFBQTs7QUFFQSxVQUFBLENBQUEsS0FBQSxHQUFBLEVBQUEsQ0FBQTtBQUNBLFVBQUEsQ0FBQSxLQUFBLEdBQUEsSUFBQSxDQUFBOztBQUVBLFVBQUEsQ0FBQSxTQUFBLEdBQUEsVUFBQSxTQUFBLEVBQUE7O0FBRUEsY0FBQSxDQUFBLEtBQUEsR0FBQSxJQUFBLENBQUE7O0FBRUEsbUJBQUEsQ0FBQSxLQUFBLENBQUEsU0FBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsSUFBQSxFQUFBO0FBQ0Esa0JBQUEsQ0FBQSxFQUFBLENBQUEsTUFBQSxFQUFBLEVBQUEsRUFBQSxFQUFBLElBQUEsQ0FBQSxHQUFBLEVBQUEsQ0FBQSxDQUFBO1NBQ0EsQ0FBQSxTQUFBLENBQUEsWUFBQTtBQUNBLGtCQUFBLENBQUEsS0FBQSxHQUFBLDRCQUFBLENBQUE7U0FDQSxDQUFBLENBQUE7S0FFQSxDQUFBO0NBRUEsQ0FBQSxDQUFBOztBQzNCQSxHQUFBLENBQUEsTUFBQSxDQUFBLFVBQUEsY0FBQSxFQUFBOztBQUVBLGtCQUFBLENBQUEsS0FBQSxDQUFBLGFBQUEsRUFBQTtBQUNBLFdBQUEsRUFBQSxlQUFBO0FBQ0EsZ0JBQUEsRUFBQSxFQUFBO0FBQ0Esa0JBQUEsRUFBQSxvQkFBQSxNQUFBLEVBQUEsRUFBQTs7OztBQUlBLFlBQUEsRUFBQTtBQUNBLHdCQUFBLEVBQUEsSUFBQTtTQUNBO0tBQ0EsQ0FBQSxDQUFBO0NBRUEsQ0FBQSxDQUFBOztBQ2RBLEdBQUEsQ0FBQSxNQUFBLENBQUEsVUFBQSxjQUFBLEVBQUE7QUFDQSxrQkFBQSxDQUFBLEtBQUEsQ0FBQSxNQUFBLEVBQUE7QUFDQSxXQUFBLEVBQUEsY0FBQTtBQUNBLG1CQUFBLEVBQUEsbUNBQUE7QUFDQSxrQkFBQSxFQUFBLG9CQUFBLE1BQUEsRUFBQSxJQUFBLEVBQUE7QUFDQSxrQkFBQSxDQUFBLElBQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxtQkFBQSxDQUFBLEdBQUEsbUNBQUEsSUFBQSxDQUFBLElBQUEsQ0FBQSxDQUFBO0FBQ0EsbUJBQUEsQ0FBQSxHQUFBLENBQUEsSUFBQSxDQUFBLENBQUE7U0FDQTtBQUNBLGVBQUEsRUFBQTtBQUNBLGdCQUFBLEVBQUEsY0FBQSxZQUFBLEVBQUEsSUFBQTt1QkFBQSxJQUFBLENBQUEsSUFBQSxDQUFBLFlBQUEsQ0FBQSxFQUFBLENBQUE7YUFBQTtTQUNBO0tBQ0EsQ0FBQSxDQUFBO0NBQ0EsQ0FBQSxDQUFBOztBQ2JBLEdBQUEsQ0FBQSxPQUFBLENBQUEsT0FBQSxFQUFBLFVBQUEsRUFBQSxFQUFBOztBQUVBLFFBQUEsS0FBQSxHQUFBLEVBQUEsQ0FBQSxjQUFBLENBQUE7QUFDQSxZQUFBLEVBQUEsT0FBQTtBQUNBLGdCQUFBLEVBQUEsUUFBQTtBQUNBLGlCQUFBLEVBQUE7QUFDQSxxQkFBQSxFQUFBO0FBQ0Esb0JBQUEsRUFBQTs7O0FBR0EsOEJBQUEsRUFBQSxNQUFBOzs7QUFHQSw0QkFBQSxFQUFBLFNBQUE7QUFDQSwwQkFBQSxFQUFBLElBQUE7aUJBQ0E7YUFDQTtTQUNBO0FBQ0EsZUFBQSxFQUFBO0FBQ0EsY0FBQSxFQUFBLGNBQUE7QUFDQSx1QkFBQSxDQUFBLEdBQUEsb0NBQUEsSUFBQSxDQUFBLElBQUEsVUFBQSxJQUFBLENBQUEsR0FBQSxPQUFBLENBQUE7YUFDQTtTQUNBO0tBQ0EsQ0FBQSxDQUFBOztBQUVBLFdBQUEsS0FBQSxDQUFBO0NBQ0EsQ0FBQSxDQUNBLEdBQUEsQ0FBQSxVQUFBLEtBQUEsRUFBQSxFQUFBLENBQUEsQ0FBQTs7QUMzQkEsR0FBQSxDQUFBLE9BQUEsQ0FBQSxNQUFBLEVBQUEsVUFBQSxFQUFBLEVBQUEsTUFBQSxFQUFBOztBQUVBLFFBQUEsSUFBQSxHQUFBLEVBQUEsQ0FBQSxjQUFBLENBQUE7QUFDQSxZQUFBLEVBQUEsTUFBQTtBQUNBLGdCQUFBLEVBQUEsT0FBQTtBQUNBLGlCQUFBLEVBQUE7QUFDQSxtQkFBQSxFQUFBO0FBQ0EscUJBQUEsRUFBQTs7O0FBR0EsOEJBQUEsRUFBQSxRQUFBOzs7QUFHQSw4QkFBQSxFQUFBLFNBQUE7aUJBQ0E7YUFDQTtTQUNBOzs7QUFHQSxlQUFBLEVBQUE7QUFDQSxjQUFBLEVBQUEsY0FBQTtBQUNBLHVCQUFBLENBQUEsR0FBQSxtQ0FBQSxJQUFBLENBQUEsSUFBQSxVQUFBLElBQUEsQ0FBQSxHQUFBLE9BQUEsQ0FBQTtBQUNBLHNCQUFBLENBQUEsRUFBQSxDQUFBLE1BQUEsRUFBQSxFQUFBLEVBQUEsRUFBQSxJQUFBLENBQUEsR0FBQSxFQUFBLENBQUEsQ0FBQTthQUNBO1NBQ0E7S0FDQSxDQUFBLENBQUE7O0FBRUEsV0FBQSxJQUFBLENBQUE7Q0FDQSxDQUFBLENBQ0EsR0FBQSxDQUFBLFVBQUEsSUFBQSxFQUFBLEVBQUEsQ0FBQSxDQUFBOztBQzdCQSxHQUFBLENBQUEsU0FBQSxDQUFBLFFBQUEsRUFBQSxVQUFBLFVBQUEsRUFBQSxNQUFBLEVBQUEsV0FBQSxFQUFBLFdBQUEsRUFBQSxJQUFBLEVBQUE7O0FBRUEsV0FBQTtBQUNBLGdCQUFBLEVBQUEsR0FBQTtBQUNBLGFBQUEsRUFBQSxFQUFBO0FBQ0EsbUJBQUEsRUFBQSx5Q0FBQTtBQUNBLFlBQUEsRUFBQSxjQUFBLEtBQUEsRUFBQTs7QUFFQSxpQkFBQSxDQUFBLEtBQUEsR0FBQTs7QUFFQSxjQUFBLEtBQUEsRUFBQSxlQUFBLEVBQUEsS0FBQSxFQUFBLE1BQUEsRUFBQSxFQUNBLEVBQUEsS0FBQSxFQUFBLE9BQUEsRUFBQSxLQUFBLEVBQUEsT0FBQSxFQUFBLEVBQ0EsRUFBQSxLQUFBLEVBQUEsTUFBQSxFQUFBLEtBQUEsRUFBQSxNQUFBLEVBQUEsQ0FFQSxDQUFBOzs7QUFFQSxpQkFBQSxDQUFBLElBQUEsR0FBQSxJQUFBLENBQUE7O0FBRUEsaUJBQUEsQ0FBQSxVQUFBLEdBQUEsWUFBQTtBQUNBLHVCQUFBLFdBQUEsQ0FBQSxlQUFBLEVBQUEsQ0FBQTthQUNBLENBQUE7O0FBRUEsaUJBQUEsQ0FBQSxNQUFBLEdBQUEsWUFBQTtBQUNBLDJCQUFBLENBQUEsTUFBQSxFQUFBLENBQUEsSUFBQSxDQUFBLFlBQUE7QUFDQSwwQkFBQSxDQUFBLEVBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTtpQkFDQSxDQUFBLENBQUE7YUFDQSxDQUFBOztBQUVBLGdCQUFBLE9BQUEsR0FBQSxTQUFBLE9BQUEsR0FBQTtBQUNBLDJCQUFBLENBQUEsZUFBQSxFQUFBLENBQ0EsSUFBQSxDQUFBLFVBQUEsSUFBQTsyQkFBQSxJQUFBLENBQUEsSUFBQSxDQUFBLElBQUEsQ0FBQSxHQUFBLENBQUE7aUJBQUEsQ0FBQSxDQUNBLElBQUEsQ0FBQSxVQUFBLElBQUEsRUFBQTtBQUNBLHlCQUFBLENBQUEsSUFBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLDJCQUFBLElBQUEsQ0FBQTtpQkFDQSxDQUFBLENBQUE7YUFDQSxDQUFBOztBQUVBLGdCQUFBLFVBQUEsR0FBQSxTQUFBLFVBQUEsR0FBQTtBQUNBLHFCQUFBLENBQUEsSUFBQSxHQUFBLElBQUEsQ0FBQTthQUNBLENBQUE7O0FBRUEsbUJBQUEsRUFBQSxDQUFBOztBQUVBLHNCQUFBLENBQUEsR0FBQSxDQUFBLFdBQUEsQ0FBQSxZQUFBLEVBQUEsT0FBQSxDQUFBLENBQUE7QUFDQSxzQkFBQSxDQUFBLEdBQUEsQ0FBQSxXQUFBLENBQUEsYUFBQSxFQUFBLFVBQUEsQ0FBQSxDQUFBO0FBQ0Esc0JBQUEsQ0FBQSxHQUFBLENBQUEsV0FBQSxDQUFBLGNBQUEsRUFBQSxVQUFBLENBQUEsQ0FBQTtTQUVBOztLQUVBLENBQUE7Q0FFQSxDQUFBLENBQUE7O0FDbkRBLEdBQUEsQ0FBQSxTQUFBLENBQUEsY0FBQSxFQUFBLFlBQUE7QUFDQSxXQUFBO0FBQ0EsZ0JBQUEsRUFBQSxHQUFBO0FBQ0EsbUJBQUEsRUFBQSx1REFBQTtBQUNBLFlBQUEsRUFBQSxjQUFBLEtBQUEsRUFBQSxJQUFBLEVBQUEsSUFBQSxFQUFBOztBQUVBLGlCQUFBLENBQUEsZ0JBQUEsR0FBQSxZQUFBO0FBQ0EsdUJBQUEsQ0FBQSxHQUFBLDJDQUFBLENBQUE7YUFDQSxDQUFBO1NBRUE7S0FDQSxDQUFBO0NBQ0EsQ0FBQSxDQUFBIiwiZmlsZSI6Im1haW4uanMiLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHN0cmljdCc7XG53aW5kb3cuYXBwID0gYW5ndWxhci5tb2R1bGUoJ05vZGVtb25vQXBwJywgWyd1aS5yb3V0ZXInLCAndWkuYm9vdHN0cmFwJywgJ2ZzYVByZUJ1aWx0JywgJ2pzLWRhdGEnXSk7XG5cbmFwcC5jb25maWcoZnVuY3Rpb24gKCR1cmxSb3V0ZXJQcm92aWRlciwgJGxvY2F0aW9uUHJvdmlkZXIsIERTUHJvdmlkZXIsIERTSHR0cEFkYXB0ZXJQcm92aWRlcikge1xuICAgIC8vIFRoaXMgdHVybnMgb2ZmIGhhc2hiYW5nIHVybHMgKC8jYWJvdXQpIGFuZCBjaGFuZ2VzIGl0IHRvIHNvbWV0aGluZyBub3JtYWwgKC9hYm91dClcbiAgICAkbG9jYXRpb25Qcm92aWRlci5odG1sNU1vZGUodHJ1ZSk7XG4gICAgLy8gSWYgd2UgZ28gdG8gYSBVUkwgdGhhdCB1aS1yb3V0ZXIgZG9lc24ndCBoYXZlIHJlZ2lzdGVyZWQsIGdvIHRvIHRoZSBcIi9cIiB1cmwuXG4gICAgJHVybFJvdXRlclByb3ZpZGVyLm90aGVyd2lzZSgnLycpO1xuXG4gICAgLy8gc2V0IGpzLWRhdGEgZGVmYXVsdHNcbiAgICBEU1Byb3ZpZGVyLmRlZmF1bHRzLmJhc2VQYXRoID0gJy9hcGknXG4gICAgRFNQcm92aWRlci5kZWZhdWx0cy5pZEF0dHJpYnV0ZSA9ICdfaWQnXG5cblxuICAgIC8vIGEgbWV0aG9kIHRvIHRoZSBEU1Byb3ZpZGVyIGRlZmF1bHRzIG9iamVjdCB0aGF0IGF1dG9tYXRpY2FsbHlcbiAgICAvLyBjaGVja3MgaWYgdGhlcmUgaXMgYW55IGRhdGEgaW4gdGhlIGNhY2hlIGZvciBhIGdpdmVuIHNlcnZpY2UgYmVmb3JlXG4gICAgLy8gcGluZ2luZyB0aGUgZGF0YWJhc2VcbiAgICBEU1Byb3ZpZGVyLmRlZmF1bHRzLmdldE9yRmluZCA9IGZ1bmN0aW9uKHNlcnZpY2Upe1xuICAgICAgdmFyIGRhdGEgPSB0aGlzLmdldEFsbCgpXG4gICAgICBpZiAoZGF0YS5sZW5ndGgpIHJldHVybiBQcm9taXNlLnJlc29sdmUoYW5ndWxhci5jb3B5KGRhdGEpKVxuICAgICAgZWxzZSByZXR1cm4gdGhpcy5maW5kQWxsKCkudGhlbihkYXRhID0+IGFuZ3VsYXIuY29weShkYXRhKSlcbiAgICB9XG5cbiAgICAvLyBNb25nb29zZSBSZWxhdGlvbiBGaXggKGZpeGVzIGRlc2VyaWFsaXphdGlvbilcbiAgICAvLyBGcm9tIGh0dHA6Ly9wbG5rci5jby9lZGl0LzN6OTBQRDl3d3doV2RuVnJacWtCP3A9cHJldmlld1xuICAgIC8vIFRoaXMgd2FzIHNob3duIHRvIHVzIGJ5IEBqbWRvYnJ5LCB0aGUgaWRlYSBoZXJlIGlzIHRoYXRcbiAgICAvLyB3ZSBmaXggdGhlIGRhdGEgY29taW5nIGZyb20gTW9uZ29vc2UgbW9kZWxzIGluIGpzLWRhdGEgcmF0aGVyIHRoYW4gb3V0Ym91bmQgZnJvbSBNb25nb29zZVxuICAgIGZ1bmN0aW9uIGZpeFJlbGF0aW9ucyhSZXNvdXJjZSwgaW5zdGFuY2UpIHtcbiAgICAgIGZ1bmN0aW9uIGZpeExvY2FsS2V5cyhpKSB7XG4gICAgICAgIEpTRGF0YS5EU1V0aWxzLmZvckVhY2goUmVzb3VyY2UucmVsYXRpb25MaXN0LCBmdW5jdGlvbihkZWYpIHtcbiAgICAgICAgICB2YXIgcmVsYXRpb25OYW1lID0gZGVmLnJlbGF0aW9uO1xuICAgICAgICAgIHZhciByZWxhdGlvbkRlZiA9IFJlc291cmNlLmdldFJlc291cmNlKHJlbGF0aW9uTmFtZSk7XG4gICAgICAgICAgaWYgKGRlZi50eXBlID09PSAnaGFzTWFueScpIHtcbiAgICAgICAgICAgIGlmIChpLmhhc093blByb3BlcnR5KGRlZi5sb2NhbEZpZWxkKSkge1xuICAgICAgICAgICAgICBpZiAoaVtkZWYubG9jYWxGaWVsZF0ubGVuZ3RoICYmICFKU0RhdGEuRFNVdGlscy5pc09iamVjdChpW2RlZi5sb2NhbEZpZWxkXVswXSkpIHtcbiAgICAgICAgICAgICAgICAvLyBDYXNlIDE6IGFycmF5IG9mIF9pZHMgd2hlcmUgYXJyYXkgb2YgcG9wdWxhdGVkIG9iamVjdHMgc2hvdWxkIGJlXG4gICAgICAgICAgICAgICAgaVtkZWYubG9jYWxLZXlzXSA9IGlbZGVmLmxvY2FsRmllbGRdO1xuICAgICAgICAgICAgICAgIGRlbGV0ZSBpW2RlZi5sb2NhbEZpZWxkXTtcbiAgICAgICAgICAgICAgfSBlbHNlIGlmICghaVtkZWYubG9jYWxLZXlzXSkge1xuICAgICAgICAgICAgICAgIC8vIENhc2UgMjogYXJyYXkgb2YgcG9wdWxhdGVkIG9iamVjdHMsIGJ1dCBtaXNzaW5nIGFycmF5IG9mIF9pZHMnXG4gICAgICAgICAgICAgICAgaVtkZWYubG9jYWxLZXlzXSA9IFtdO1xuICAgICAgICAgICAgICAgIEpTRGF0YS5EU1V0aWxzLmZvckVhY2goaVtkZWYubG9jYWxGaWVsZF0sIGZ1bmN0aW9uKGNoaWxkKSB7XG4gICAgICAgICAgICAgICAgICBpW2RlZi5sb2NhbEtleXNdLnB1c2goY2hpbGRbcmVsYXRpb25EZWYuaWRBdHRyaWJ1dGVdKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNlIGlmIChkZWYudHlwZSA9PT0gJ2JlbG9uZ3NUbycpIHtcbiAgICAgICAgICAgIGlmIChpLmhhc093blByb3BlcnR5KGRlZi5sb2NhbEZpZWxkKSkge1xuICAgICAgICAgICAgICAvLyBpZiB0aGUgbG9jYWxmSWVsZCBpcyBhIHBvcHVhbHRlZCBvYmplY3RcbiAgICAgICAgICAgICAgaWYgKEpTRGF0YS5EU1V0aWxzLmlzT2JqZWN0KGlbZGVmLmxvY2FsRmllbGRdKSkge1xuICAgICAgICAgICAgICAgIGlbZGVmLmxvY2FsS2V5XSA9IGlbZGVmLmxvY2FsRmllbGRdLl9pZDtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAvLyBpZiB0aGUgbG9jYWxmaWVsZCBpcyBhbiBvYmplY3QgaWRcbiAgICAgICAgICAgICAgZWxzZSBpZiAoIUpTRGF0YS5EU1V0aWxzLmlzT2JqZWN0KGlbZGVmLmxvY2FsRmllbGRdKSkge1xuICAgICAgICAgICAgICAgIGlbZGVmLmxvY2FsS2V5XSA9IGlbZGVmLmxvY2FsRmllbGRdO1xuICAgICAgICAgICAgICAgIGRlbGV0ZSBpW2RlZi5sb2NhbEZpZWxkXTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIGlmIChKU0RhdGEuRFNVdGlscy5pc0FycmF5KGluc3RhbmNlKSkge1xuICAgICAgICBKU0RhdGEuRFNVdGlscy5mb3JFYWNoKGluc3RhbmNlLCBmaXhMb2NhbEtleXMpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZml4TG9jYWxLZXlzKGluc3RhbmNlKTtcbiAgICAgIH1cbiAgICB9XG5cblxuICAgIERTUHJvdmlkZXIuZGVmYXVsdHMuZGVzZXJpYWxpemUgPSBmdW5jdGlvbihSZXNvdXJjZSwgZGF0YSkge1xuICAgICAgdmFyIGluc3RhbmNlID0gZGF0YS5kYXRhO1xuICAgICAgZml4UmVsYXRpb25zKFJlc291cmNlLCBpbnN0YW5jZSk7XG4gICAgICByZXR1cm4gaW5zdGFuY2U7XG4gICAgfTtcbiAgICAvLyBFbmQgTW9uZ29vc2UgUmVsYXRpb24gZml4XG59KTtcblxuLy8gVGhpcyBhcHAucnVuIGlzIGZvciBjb250cm9sbGluZyBhY2Nlc3MgdG8gc3BlY2lmaWMgc3RhdGVzLlxuYXBwLnJ1bihmdW5jdGlvbiAoJHJvb3RTY29wZSwgQXV0aFNlcnZpY2UsICRzdGF0ZSkge1xuXG4gICAgLy8gVGhlIGdpdmVuIHN0YXRlIHJlcXVpcmVzIGFuIGF1dGhlbnRpY2F0ZWQgdXNlci5cbiAgICB2YXIgZGVzdGluYXRpb25TdGF0ZVJlcXVpcmVzQXV0aCA9IGZ1bmN0aW9uIChzdGF0ZSkge1xuICAgICAgICByZXR1cm4gc3RhdGUuZGF0YSAmJiBzdGF0ZS5kYXRhLmF1dGhlbnRpY2F0ZTtcbiAgICB9O1xuXG4gICAgLy8gJHN0YXRlQ2hhbmdlU3RhcnQgaXMgYW4gZXZlbnQgZmlyZWRcbiAgICAvLyB3aGVuZXZlciB0aGUgcHJvY2VzcyBvZiBjaGFuZ2luZyBhIHN0YXRlIGJlZ2lucy5cbiAgICAkcm9vdFNjb3BlLiRvbignJHN0YXRlQ2hhbmdlU3RhcnQnLCBmdW5jdGlvbiAoZXZlbnQsIHRvU3RhdGUsIHRvUGFyYW1zKSB7XG5cbiAgICAgICAgaWYgKCFkZXN0aW5hdGlvblN0YXRlUmVxdWlyZXNBdXRoKHRvU3RhdGUpKSB7XG4gICAgICAgICAgICAvLyBUaGUgZGVzdGluYXRpb24gc3RhdGUgZG9lcyBub3QgcmVxdWlyZSBhdXRoZW50aWNhdGlvblxuICAgICAgICAgICAgLy8gU2hvcnQgY2lyY3VpdCB3aXRoIHJldHVybi5cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChBdXRoU2VydmljZS5pc0F1dGhlbnRpY2F0ZWQoKSkge1xuICAgICAgICAgICAgLy8gVGhlIHVzZXIgaXMgYXV0aGVudGljYXRlZC5cbiAgICAgICAgICAgIC8vIFNob3J0IGNpcmN1aXQgd2l0aCByZXR1cm4uXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDYW5jZWwgbmF2aWdhdGluZyB0byBuZXcgc3RhdGUuXG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAgICAgQXV0aFNlcnZpY2UuZ2V0TG9nZ2VkSW5Vc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcikge1xuICAgICAgICAgICAgLy8gSWYgYSB1c2VyIGlzIHJldHJpZXZlZCwgdGhlbiByZW5hdmlnYXRlIHRvIHRoZSBkZXN0aW5hdGlvblxuICAgICAgICAgICAgLy8gKHRoZSBzZWNvbmQgdGltZSwgQXV0aFNlcnZpY2UuaXNBdXRoZW50aWNhdGVkKCkgd2lsbCB3b3JrKVxuICAgICAgICAgICAgLy8gb3RoZXJ3aXNlLCBpZiBubyB1c2VyIGlzIGxvZ2dlZCBpbiwgZ28gdG8gXCJsb2dpblwiIHN0YXRlLlxuICAgICAgICAgICAgaWYgKHVzZXIpIHtcbiAgICAgICAgICAgICAgICAkc3RhdGUuZ28odG9TdGF0ZS5uYW1lLCB0b1BhcmFtcyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICRzdGF0ZS5nbygnbG9naW4nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICB9KTtcblxufSk7XG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuXG4gICAgLy8gUmVnaXN0ZXIgb3VyICphYm91dCogc3RhdGUuXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2Fib3V0Jywge1xuICAgICAgICB1cmw6ICcvYWJvdXQnLFxuICAgICAgICBjb250cm9sbGVyOiAnQWJvdXRDb250cm9sbGVyJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9hYm91dC9hYm91dC5odG1sJ1xuICAgIH0pO1xuXG59KTtcblxuYXBwLmNvbnRyb2xsZXIoJ0Fib3V0Q29udHJvbGxlcicsIGZ1bmN0aW9uICgkc2NvcGUpIHtcblxuICAgIC8vICRzY29wZS5pbWFnZXMgPSBfLnNodWZmbGUoc29tZXRoaW5nKTtcblxufSk7XG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdkb2NzJywge1xuICAgICAgICB1cmw6ICcvZG9jcycsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvZG9jcy9kb2NzLmh0bWwnXG4gICAgfSk7XG59KTtcbiIsIihmdW5jdGlvbiAoKSB7XG5cbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICAvLyBIb3BlIHlvdSBkaWRuJ3QgZm9yZ2V0IEFuZ3VsYXIhIER1aC1kb3kuXG4gICAgaWYgKCF3aW5kb3cuYW5ndWxhcikgdGhyb3cgbmV3IEVycm9yKCdJIGNhblxcJ3QgZmluZCBBbmd1bGFyIScpO1xuXG4gICAgdmFyIGFwcCA9IGFuZ3VsYXIubW9kdWxlKCdmc2FQcmVCdWlsdCcsIFtdKTtcblxuICAgIGFwcC5mYWN0b3J5KCdTb2NrZXQnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICghd2luZG93LmlvKSB0aHJvdyBuZXcgRXJyb3IoJ3NvY2tldC5pbyBub3QgZm91bmQhJyk7XG4gICAgICAgIHJldHVybiB3aW5kb3cuaW8od2luZG93LmxvY2F0aW9uLm9yaWdpbik7XG4gICAgfSk7XG5cbiAgICAvLyBBVVRIX0VWRU5UUyBpcyB1c2VkIHRocm91Z2hvdXQgb3VyIGFwcCB0b1xuICAgIC8vIGJyb2FkY2FzdCBhbmQgbGlzdGVuIGZyb20gYW5kIHRvIHRoZSAkcm9vdFNjb3BlXG4gICAgLy8gZm9yIGltcG9ydGFudCBldmVudHMgYWJvdXQgYXV0aGVudGljYXRpb24gZmxvdy5cbiAgICBhcHAuY29uc3RhbnQoJ0FVVEhfRVZFTlRTJywge1xuICAgICAgICBsb2dpblN1Y2Nlc3M6ICdhdXRoLWxvZ2luLXN1Y2Nlc3MnLFxuICAgICAgICBsb2dpbkZhaWxlZDogJ2F1dGgtbG9naW4tZmFpbGVkJyxcbiAgICAgICAgbG9nb3V0U3VjY2VzczogJ2F1dGgtbG9nb3V0LXN1Y2Nlc3MnLFxuICAgICAgICBzZXNzaW9uVGltZW91dDogJ2F1dGgtc2Vzc2lvbi10aW1lb3V0JyxcbiAgICAgICAgbm90QXV0aGVudGljYXRlZDogJ2F1dGgtbm90LWF1dGhlbnRpY2F0ZWQnLFxuICAgICAgICBub3RBdXRob3JpemVkOiAnYXV0aC1ub3QtYXV0aG9yaXplZCdcbiAgICB9KTtcblxuICAgIGFwcC5mYWN0b3J5KCdBdXRoSW50ZXJjZXB0b3InLCBmdW5jdGlvbiAoJHJvb3RTY29wZSwgJHEsIEFVVEhfRVZFTlRTKSB7XG4gICAgICAgIHZhciBzdGF0dXNEaWN0ID0ge1xuICAgICAgICAgICAgNDAxOiBBVVRIX0VWRU5UUy5ub3RBdXRoZW50aWNhdGVkLFxuICAgICAgICAgICAgNDAzOiBBVVRIX0VWRU5UUy5ub3RBdXRob3JpemVkLFxuICAgICAgICAgICAgNDE5OiBBVVRIX0VWRU5UUy5zZXNzaW9uVGltZW91dCxcbiAgICAgICAgICAgIDQ0MDogQVVUSF9FVkVOVFMuc2Vzc2lvblRpbWVvdXRcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHJlc3BvbnNlRXJyb3I6IGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdChzdGF0dXNEaWN0W3Jlc3BvbnNlLnN0YXR1c10sIHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gJHEucmVqZWN0KHJlc3BvbnNlKVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH0pO1xuXG4gICAgYXBwLmNvbmZpZyhmdW5jdGlvbiAoJGh0dHBQcm92aWRlcikge1xuICAgICAgICAkaHR0cFByb3ZpZGVyLmludGVyY2VwdG9ycy5wdXNoKFtcbiAgICAgICAgICAgICckaW5qZWN0b3InLFxuICAgICAgICAgICAgZnVuY3Rpb24gKCRpbmplY3Rvcikge1xuICAgICAgICAgICAgICAgIHJldHVybiAkaW5qZWN0b3IuZ2V0KCdBdXRoSW50ZXJjZXB0b3InKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgXSk7XG4gICAgfSk7XG5cbiAgICBhcHAuc2VydmljZSgnQXV0aFNlcnZpY2UnLCBmdW5jdGlvbiAoJGh0dHAsIFNlc3Npb24sICRyb290U2NvcGUsIEFVVEhfRVZFTlRTLCAkcSwgVXNlcikge1xuXG4gICAgICAgIGZ1bmN0aW9uIG9uU3VjY2Vzc2Z1bExvZ2luKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICB2YXIgZGF0YSA9IHJlc3BvbnNlLmRhdGE7XG4gICAgICAgICAgICBTZXNzaW9uLmNyZWF0ZShkYXRhLmlkLCBkYXRhLnVzZXIpO1xuICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KEFVVEhfRVZFTlRTLmxvZ2luU3VjY2Vzcyk7XG4gICAgICAgICAgICByZXR1cm4gZGF0YS51c2VyO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXNlcyB0aGUgc2Vzc2lvbiBmYWN0b3J5IHRvIHNlZSBpZiBhblxuICAgICAgICAvLyBhdXRoZW50aWNhdGVkIHVzZXIgaXMgY3VycmVudGx5IHJlZ2lzdGVyZWQuXG4gICAgICAgIHRoaXMuaXNBdXRoZW50aWNhdGVkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuICEhU2Vzc2lvbi51c2VyO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMuZ2V0TG9nZ2VkSW5Vc2VyID0gZnVuY3Rpb24gKGZyb21TZXJ2ZXIpIHtcblxuICAgICAgICAgICAgLy8gSWYgYW4gYXV0aGVudGljYXRlZCBzZXNzaW9uIGV4aXN0cywgd2VcbiAgICAgICAgICAgIC8vIHJldHVybiB0aGUgdXNlciBhdHRhY2hlZCB0byB0aGF0IHNlc3Npb25cbiAgICAgICAgICAgIC8vIHdpdGggYSBwcm9taXNlLiBUaGlzIGVuc3VyZXMgdGhhdCB3ZSBjYW5cbiAgICAgICAgICAgIC8vIGFsd2F5cyBpbnRlcmZhY2Ugd2l0aCB0aGlzIG1ldGhvZCBhc3luY2hyb25vdXNseS5cblxuICAgICAgICAgICAgLy8gT3B0aW9uYWxseSwgaWYgdHJ1ZSBpcyBnaXZlbiBhcyB0aGUgZnJvbVNlcnZlciBwYXJhbWV0ZXIsXG4gICAgICAgICAgICAvLyB0aGVuIHRoaXMgY2FjaGVkIHZhbHVlIHdpbGwgbm90IGJlIHVzZWQuXG5cbiAgICAgICAgICAgIGlmICh0aGlzLmlzQXV0aGVudGljYXRlZCgpICYmIGZyb21TZXJ2ZXIgIT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJHEud2hlbihTZXNzaW9uLnVzZXIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBNYWtlIHJlcXVlc3QgR0VUIC9zZXNzaW9uLlxuICAgICAgICAgICAgLy8gSWYgaXQgcmV0dXJucyBhIHVzZXIsIGNhbGwgb25TdWNjZXNzZnVsTG9naW4gd2l0aCB0aGUgcmVzcG9uc2UuXG4gICAgICAgICAgICAvLyBJZiBpdCByZXR1cm5zIGEgNDAxIHJlc3BvbnNlLCB3ZSBjYXRjaCBpdCBhbmQgaW5zdGVhZCByZXNvbHZlIHRvIG51bGwuXG4gICAgICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KCcvc2Vzc2lvbicpLnRoZW4ob25TdWNjZXNzZnVsTG9naW4pLmNhdGNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5sb2dpbiA9IGZ1bmN0aW9uIChjcmVkZW50aWFscykge1xuICAgICAgICAgICAgcmV0dXJuICRodHRwLnBvc3QoJy9sb2dpbicsIGNyZWRlbnRpYWxzKVxuICAgICAgICAgICAgICAgIC50aGVuKG9uU3VjY2Vzc2Z1bExvZ2luKVxuICAgICAgICAgICAgICAgIC5jYXRjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAkcS5yZWplY3QoeyBtZXNzYWdlOiAnSW52YWxpZCBsb2dpbiBjcmVkZW50aWFscy4nIH0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMubG9nb3V0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuICRodHRwLmdldCgnL2xvZ291dCcpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIFNlc3Npb24uZGVzdHJveSgpO1xuICAgICAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdChBVVRIX0VWRU5UUy5sb2dvdXRTdWNjZXNzKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgfSk7XG5cbiAgICBhcHAuc2VydmljZSgnU2Vzc2lvbicsIGZ1bmN0aW9uICgkcm9vdFNjb3BlLCBBVVRIX0VWRU5UUykge1xuXG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5ub3RBdXRoZW50aWNhdGVkLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBzZWxmLmRlc3Ryb3koKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMuc2Vzc2lvblRpbWVvdXQsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHNlbGYuZGVzdHJveSgpO1xuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLmlkID0gbnVsbDtcbiAgICAgICAgdGhpcy51c2VyID0gbnVsbDtcblxuICAgICAgICB0aGlzLmNyZWF0ZSA9IGZ1bmN0aW9uIChzZXNzaW9uSWQsIHVzZXIpIHtcbiAgICAgICAgICAgIHRoaXMuaWQgPSBzZXNzaW9uSWQ7XG4gICAgICAgICAgICB0aGlzLnVzZXIgPSB1c2VyO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMuZGVzdHJveSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRoaXMuaWQgPSBudWxsO1xuICAgICAgICAgICAgdGhpcy51c2VyID0gbnVsbDtcbiAgICAgICAgfTtcblxuICAgIH0pO1xuXG59KSgpO1xuIiwiYXBwLmNvbmZpZygoJHN0YXRlUHJvdmlkZXIpID0+IHtcbiAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2hlbHAnLCB7XG4gICAgdXJsOiAnL2hlbHAnLFxuICAgIHRlbXBsYXRlVXJsOiAnanMvaGVscC9oZWxwLmh0bWwnXG4gIH0pXG59KVxuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnaG9tZScsIHtcbiAgICAgICAgdXJsOiAnLycsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvaG9tZS9ob21lLmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOiAoJHNjb3BlLCB1c2Vycywgcm91dGVzKSA9PiB7XG4gICAgICAgICAgJHNjb3BlLnVzZXJzID0gdXNlcnNcbiAgICAgICAgICAkc2NvcGUucm91dGVzID0gcm91dGVzXG5cbiAgICAgICAgICAvLyBjaGVjayB3aGV0aGVyIHVzZXIgYWdlbnQgaXMgcnVubmluZyBjaHJvbWVcbiAgICAgICAgICAkc2NvcGUuaGFzQ2hyb21lID0gKCkgPT4gbmF2aWdhdG9yLnVzZXJBZ2VudC50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKCdjaHJvbWUnKVxuICAgICAgICB9LFxuICAgICAgICByZXNvbHZlOiB7XG4gICAgICAgICAgdXNlcnM6IChVc2VyKSA9PiBVc2VyLmZpbmRBbGwoe30sIHsgYnlwYXNzQ2FjaGU6IHRydWUgfSksXG4gICAgICAgICAgcm91dGVzOiAoUm91dGUpID0+IFJvdXRlLmZpbmRBbGwoe30sIHsgYnlwYXNzQ2FjaGU6IHRydWUgfSlcbiAgICAgICAgfVxuICAgIH0pO1xufSk7XG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2xvZ2luJywge1xuICAgICAgICB1cmw6ICcvbG9naW4nLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2xvZ2luL2xvZ2luLmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOiAnTG9naW5DdHJsJ1xuICAgIH0pO1xuXG59KTtcblxuYXBwLmNvbnRyb2xsZXIoJ0xvZ2luQ3RybCcsIGZ1bmN0aW9uICgkc2NvcGUsIEF1dGhTZXJ2aWNlLCAkc3RhdGUpIHtcblxuICAgICRzY29wZS5sb2dpbiA9IHt9O1xuICAgICRzY29wZS5lcnJvciA9IG51bGw7XG5cbiAgICAkc2NvcGUuc2VuZExvZ2luID0gZnVuY3Rpb24gKGxvZ2luSW5mbykge1xuXG4gICAgICAgICRzY29wZS5lcnJvciA9IG51bGw7XG5cbiAgICAgICAgQXV0aFNlcnZpY2UubG9naW4obG9naW5JbmZvKS50aGVuKGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgICAgICAgICAkc3RhdGUuZ28oJ3VzZXInLCB7IGlkOiB1c2VyLl9pZCB9KTtcbiAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgJHNjb3BlLmVycm9yID0gJ0ludmFsaWQgbG9naW4gY3JlZGVudGlhbHMuJztcbiAgICAgICAgfSk7XG5cbiAgICB9O1xuXG59KTtcbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG5cbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnbWVtYmVyc09ubHknLCB7XG4gICAgICAgIHVybDogJy9tZW1iZXJzLWFyZWEnLFxuICAgICAgICB0ZW1wbGF0ZTogJycsXG4gICAgICAgIGNvbnRyb2xsZXI6IGZ1bmN0aW9uICgkc2NvcGUpIHt9LFxuXG4gICAgICAgIC8vIFRoZSBmb2xsb3dpbmcgZGF0YS5hdXRoZW50aWNhdGUgaXMgcmVhZCBieSBhbiBldmVudCBsaXN0ZW5lclxuICAgICAgICAvLyB0aGF0IGNvbnRyb2xzIGFjY2VzcyB0byB0aGlzIHN0YXRlLiBSZWZlciB0byBhcHAuanMuXG4gICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgIGF1dGhlbnRpY2F0ZTogdHJ1ZVxuICAgICAgICB9XG4gICAgfSk7XG5cbn0pO1xuIiwiYXBwLmNvbmZpZygoJHN0YXRlUHJvdmlkZXIpID0+IHtcbiAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ3VzZXInLCB7XG4gICAgdXJsOiAnLzppZC9wcm9maWxlJyxcbiAgICB0ZW1wbGF0ZVVybDogJ2pzL3VzZXJfcHJvZmlsZS91c2VyX3Byb2ZpbGUuaHRtbCcsXG4gICAgY29udHJvbGxlcjogKCRzY29wZSwgdXNlcikgPT4ge1xuICAgICAgJHNjb3BlLnVzZXIgPSB1c2VyXG4gICAgICBjb25zb2xlLmxvZyhgbG9hZGVkIHVzZXIgcHJvZmlsZSBwYWdlIGZvciAke3VzZXIubmFtZX1gKVxuICAgICAgY29uc29sZS5sb2codXNlcilcbiAgICB9LFxuICAgIHJlc29sdmU6IHtcbiAgICAgIHVzZXI6ICgkc3RhdGVQYXJhbXMsIFVzZXIpID0+IFVzZXIuZmluZCgkc3RhdGVQYXJhbXMuaWQpXG4gICAgfVxuICB9KVxufSlcbiIsImFwcC5mYWN0b3J5KCdSb3V0ZScsIChEUykgPT4ge1xuXG4gIGxldCBSb3V0ZSA9IERTLmRlZmluZVJlc291cmNlKHtcbiAgICBuYW1lOiAncm91dGUnLFxuICAgIGVuZHBvaW50OiAncm91dGVzJyxcbiAgICByZWxhdGlvbnM6IHtcbiAgICAgIGJlbG9uZ3NUbzoge1xuICAgICAgICB1c2VyOiB7XG4gICAgICAgICAgLy8gbG9jYWwgZmllbGQgaXMgZm9yIGxpbmtpbmcgcmVsYXRpb25zXG4gICAgICAgICAgLy8gcm91dGUudXNlciAtPiB1c2VyKG93bmVyKSBvZiB0aGUgcm91dGVcbiAgICAgICAgICBsb2NhbEZpZWxkOiAndXNlcicsXG4gICAgICAgICAgLy8gbG9jYWwga2V5IGlzIHRoZSBcImpvaW5cIiBmaWVsZFxuICAgICAgICAgIC8vIHRoZSBuYW1lIG9mIHRoZSBmaWVsZCBvbiB0aGUgcm91dGUgdGhhdCBwb2ludHMgdG8gaXRzIHBhcmVudCB1c2VyXG4gICAgICAgICAgbG9jYWxLZXk6ICd1c2VyS2V5JyxcbiAgICAgICAgICBwYXJlbnQ6IHRydWVcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG4gICAgbWV0aG9kczoge1xuICAgICAgZ286IGZ1bmN0aW9uKCkge1xuICAgICAgICBjb25zb2xlLmxvZyhgdHJhbnNpdGlvbmluZyB0byByb3V0ZSBzdGF0ZSAoJHt0aGlzLm5hbWV9LCAke3RoaXMuX2lkfSlgKVxuICAgICAgfVxuICAgIH1cbiAgfSlcblxuICByZXR1cm4gUm91dGVcbn0pXG4ucnVuKFJvdXRlID0+IHt9KVxuIiwiYXBwLmZhY3RvcnkoJ1VzZXInLCAoRFMsICRzdGF0ZSkgPT4ge1xuXG4gIGxldCBVc2VyID0gRFMuZGVmaW5lUmVzb3VyY2Uoe1xuICAgIG5hbWU6ICd1c2VyJyxcbiAgICBlbmRwb2ludDogJ3VzZXJzJyxcbiAgICByZWxhdGlvbnM6IHtcbiAgICAgIGhhc01hbnk6IHtcbiAgICAgICAgcm91dGU6IHtcbiAgICAgICAgICAvLyBsb2NhbCBmaWVsZCBpcyBmb3IgbGlua2luZyByZWxhdGlvbnNcbiAgICAgICAgICAvLyB1c2VyLnJvdXRlcyAtPiBhcnJheSBvZiByb3V0ZXMgZm9yIHRoZSB1c2VyXG4gICAgICAgICAgbG9jYWxGaWVsZDogJ3JvdXRlcycsXG4gICAgICAgICAgLy8gZm9yZWlnbiBrZXkgaXMgdGhlICdqb2luJyBmaWVsZFxuICAgICAgICAgIC8vIHRoZSBuYW1lIG9mIHRoZSBmaWVsZCBvbiBhIHJvdXRlIHRoYXQgcG9pbnRzIHRvIGl0cyBwYXJlbnQgdXNlclxuICAgICAgICAgIGZvcmVpZ25LZXk6ICd1c2VyS2V5J1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcblxuICAgIC8vIGZ1bmN0aW9uYWxpdHkgYWRkZWQgdG8gZXZlcnkgaW5zdGFuY2Ugb2YgVXNlclxuICAgIG1ldGhvZHM6IHtcbiAgICAgIGdvOiBmdW5jdGlvbigpIHtcbiAgICAgICAgY29uc29sZS5sb2coYHRyYW5zaXRpb25pbmcgdG8gdXNlciBzdGF0ZSAoJHt0aGlzLm5hbWV9LCAke3RoaXMuX2lkfSlgKVxuICAgICAgICAkc3RhdGUuZ28oJ3VzZXInLCB7IGlkOiB0aGlzLl9pZCB9KVxuICAgICAgfVxuICAgIH1cbiAgfSlcblxuICByZXR1cm4gVXNlclxufSlcbi5ydW4oVXNlciA9PiB7fSlcbiIsImFwcC5kaXJlY3RpdmUoJ25hdmJhcicsIGZ1bmN0aW9uICgkcm9vdFNjb3BlLCAkc3RhdGUsIEF1dGhTZXJ2aWNlLCBBVVRIX0VWRU5UUywgVXNlcikge1xuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgc2NvcGU6IHt9LFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2NvbW1vbi9kaXJlY3RpdmVzL25hdmJhci9uYXZiYXIuaHRtbCcsXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSkge1xuXG4gICAgICAgICAgICBzY29wZS5pdGVtcyA9IFtcbiAgICAgICAgICAgICAgICAvLyB7IGxhYmVsOiAnSG9tZScsIHN0YXRlOiAnaG9tZScgfSxcbiAgICAgICAgICAgICAgICB7IGxhYmVsOiAnRG9jdW1lbnRhdGlvbicsIHN0YXRlOiAnZG9jcycgfSxcbiAgICAgICAgICAgICAgICB7IGxhYmVsOiAnQWJvdXQnLCBzdGF0ZTogJ2Fib3V0JyB9LFxuICAgICAgICAgICAgICAgIHsgbGFiZWw6ICdIZWxwJywgc3RhdGU6ICdoZWxwJyB9LFxuICAgICAgICAgICAgICAgIC8veyBsYWJlbDogJ01lbWJlcnMgT25seScsIHN0YXRlOiAnbWVtYmVyc09ubHknLCBhdXRoOiB0cnVlIH1cbiAgICAgICAgICAgIF07XG5cbiAgICAgICAgICAgIHNjb3BlLnVzZXIgPSBudWxsO1xuXG4gICAgICAgICAgICBzY29wZS5pc0xvZ2dlZEluID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBBdXRoU2VydmljZS5pc0F1dGhlbnRpY2F0ZWQoKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHNjb3BlLmxvZ291dCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBBdXRoU2VydmljZS5sb2dvdXQoKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAkc3RhdGUuZ28oJ2hvbWUnKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHZhciBzZXRVc2VyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIEF1dGhTZXJ2aWNlLmdldExvZ2dlZEluVXNlcigpXG4gICAgICAgICAgICAgICAgICAudGhlbih1c2VyID0+IFVzZXIuZmluZCh1c2VyLl9pZCkpXG4gICAgICAgICAgICAgICAgICAudGhlbih1c2VyID0+IHtcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUudXNlciA9IHVzZXJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHVzZXJcbiAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB2YXIgcmVtb3ZlVXNlciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBzY29wZS51c2VyID0gbnVsbDtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHNldFVzZXIoKTtcblxuICAgICAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMubG9naW5TdWNjZXNzLCBzZXRVc2VyKTtcbiAgICAgICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLmxvZ291dFN1Y2Nlc3MsIHJlbW92ZVVzZXIpO1xuICAgICAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMuc2Vzc2lvblRpbWVvdXQsIHJlbW92ZVVzZXIpO1xuXG4gICAgICAgIH1cblxuICAgIH07XG5cbn0pO1xuIiwiYXBwLmRpcmVjdGl2ZSgnbm9kZW1vbm9Mb2dvJywgZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvbm9kZW1vbm8tbG9nby9ub2RlbW9uby1sb2dvLmh0bWwnLFxuICAgICAgICBsaW5rOiAoc2NvcGUsIGVsZW0sIGF0dHIpID0+IHtcblxuICAgICAgICAgIHNjb3BlLmluc3RhbGxDaHJvbWVFeHQgPSAoKSA9PiB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgaW5zdGFsbGluZyBOb2RlbW9ubyBjaHJvbWUgZXh0ZW5zaW9uLi4uYClcbiAgICAgICAgICB9XG5cbiAgICAgICAgfVxuICAgIH07XG59KTtcbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==