'use strict';
window.app = angular.module('NodemonoApp', ['ui.router', 'ui.bootstrap', 'fsaPreBuilt', 'js-data']);

app.config(function($urlRouterProvider, $locationProvider, DSProvider, DSHttpAdapterProvider) {
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
    DSProvider.defaults.getOrFind = function(service) {
        var data = this.getAll();
        if (data.length) return Promise.resolve(angular.copy(data));
        else return this.findAll().then(function(data) {
            return angular.copy(data);
        });
    };

    // Mongoose Relation Fix (fixes deserialization)
    // From http://plnkr.co/edit/3z90PD9wwwhWdnVrZqkB?p=preview
    // This was shown to us by @jmdobry, the idea here is that
    // we fix the data coming from Mongoose models in js-data rather than outbound from Mongoose
    function fixRelations(Resource, instance) {
        function fixLocalKeys(i) {
            JSData.DSUtils.forEach(Resource.relationList, function(def) {
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
                            JSData.DSUtils.forEach(i[def.localField], function(child) {
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

    DSProvider.defaults.deserialize = function(Resource, data) {
        var instance = data.data;
        fixRelations(Resource, instance);
        return instance;
    };
    // End Mongoose Relation fix
});

// This app.run is for controlling access to specific states.
app.run(function($rootScope, AuthService, $state) {

    // The given state requires an authenticated user.
    var destinationStateRequiresAuth = function destinationStateRequiresAuth(state) {
        return state.data && state.data.authenticate;
    };

    // $stateChangeStart is an event fired
    // whenever the process of changing a state begins.
    $rootScope.$on('$stateChangeStart', function(event, toState, toParams) {

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

        AuthService.getLoggedInUser().then(function(user) {
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

app.config(function($stateProvider) {

    // Register our *about* state.
    $stateProvider.state('about', {
        url: '/about',
        controller: 'AboutController',
        templateUrl: 'js/about/about.html'
    });
});

app.controller('AboutController', function($scope) {

    // $scope.images = _.shuffle(something);

});

app.config(function($stateProvider) {
    $stateProvider.state('docs', {
        url: '/docs',
        templateUrl: 'js/docs/docs.html'
    });
});

app.config(function($stateProvider) {

    $stateProvider.state('help', {
        url: '/help',
        templateUrl: 'js/help/help.html'
    });
})(function() {

    'use strict';

    // Hope you didn't forget Angular! Duh-doy.
    if (!window.angular) throw new Error('I can\'t find Angular!');

    var app = angular.module('fsaPreBuilt', []);

    app.factory('Socket', function() {
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

    app.factory('AuthInterceptor', function($rootScope, $q, AUTH_EVENTS) {
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

    app.config(function($httpProvider) {
        $httpProvider.interceptors.push(['$injector', function($injector) {
            return $injector.get('AuthInterceptor');
        }]);
    });

    app.service('AuthService', function($http, Session, $rootScope, AUTH_EVENTS, $q, User) {

        function onSuccessfulLogin(response) {
            var data = response.data;
            Session.create(data.id, data.user);
            $rootScope.$broadcast(AUTH_EVENTS.loginSuccess);
            return data.user;
        }

        // Uses the session factory to see if an
        // authenticated user is currently registered.
        this.isAuthenticated = function() {
            return !!Session.user;
        };

        this.getLoggedInUser = function(fromServer) {

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
            return $http.get('/session').then(onSuccessfulLogin)['catch'](function() {
                return null;
            });
        };

        this.login = function(credentials) {
            return $http.post('/login', credentials).then(onSuccessfulLogin)['catch'](function() {
                return $q.reject({
                    message: 'Invalid login credentials.'
                });
            });
        };

        this.logout = function() {
            return $http.get('/logout').then(function() {
                Session.destroy();
                $rootScope.$broadcast(AUTH_EVENTS.logoutSuccess);
            });
        };
    });

    app.service('Session', function($rootScope, AUTH_EVENTS) {

        var self = this;

        $rootScope.$on(AUTH_EVENTS.notAuthenticated, function() {
            self.destroy();
        });

        $rootScope.$on(AUTH_EVENTS.sessionTimeout, function() {
            self.destroy();
        });

        this.id = null;
        this.user = null;

        this.create = function(sessionId, user) {
            this.id = sessionId;
            this.user = user;
        };

        this.destroy = function() {
            this.id = null;
            this.user = null;
        };
    });
})();

app.config(function($stateProvider) {

    $stateProvider.state('home', {
        url: '/',
        templateUrl: 'js/home/home.html',
        controller: function controller($scope, users, routes) {
            $scope.users = users;
            $scope.routes = routes;

            // check whether user agent is running chrome
            $scope.hasChrome = function() {
                return navigator.userAgent.toLowerCase().includes('chrome');
            };
        },
        resolve: {
            users: function users(User) {
                return User.findAll({}, {
                    bypassCache: true
                });
            },
            routes: function routes(Route) {
                return Route.findAll({}, {
                    bypassCache: true
                });
            }
        }
    });
});

app.config(function($stateProvider) {

    $stateProvider.state('login', {
        url: '/login',
        templateUrl: 'js/login/login.html',
        controller: 'LoginCtrl'
    });
});

app.controller('LoginCtrl', function($scope, AuthService, $state) {

    $scope.login = {};
    $scope.error = null;

    $scope.sendLogin = function(loginInfo) {

        $scope.error = null;

        AuthService.login(loginInfo).then(function(user) {
            $state.go('user', {
                id: user._id
            });
        })['catch'](function() {
            $scope.error = 'Invalid login credentials.';
        });
    };
});

app.config(function($stateProvider) {
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

app.config(function($stateProvider) {

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

app.factory('Route', function($state, DS) {

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
}).run(function(Route) {});

app.factory('User', function($state, DS) {

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
                $state.go('user', {
                    id: this._id
                });
            }
        }
    });

    return User;
}).run(function(User) {});

app.directive('navbar', function($rootScope, $state, AuthService, AUTH_EVENTS, User) {

    return {
        restrict: 'E',
        scope: {},
        templateUrl: 'js/common/directives/navbar/navbar.html',
        link: function link(scope) {

            scope.items = [
                // { label: 'Home', state: 'home' },
                {
                    label: 'Documentation',
                    state: 'docs'
                }, {
                    label: 'About',
                    state: 'about'
                }, {
                    label: 'Help',
                    state: 'help'
                }
            ];

            //{ label: 'Members Only', state: 'membersOnly', auth: true }
            scope.user = null;

            scope.isLoggedIn = function() {
                return AuthService.isAuthenticated();
            };

            scope.logout = function() {
                AuthService.logout().then(function() {
                    $state.go('home');
                });
            };

            var setUser = function setUser() {
                AuthService.getLoggedInUser().then(function(user) {
                    return User.find(user._id);
                }).then(function(user) {
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

app.directive('nodemonoLogo', function() {
    return {
        restrict: 'E',
        templateUrl: 'js/common/directives/nodemono-logo/nodemono-logo.html',
        link: function link(scope, elem, attr) {

            scope.installChromeExt = function() {
                console.log('installing Nodemono chrome extension...');
            };
        }
    };
});

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImFib3V0L2Fib3V0LmpzIiwiZG9jcy9kb2NzLmpzIiwiaGVscC9oZWxwLmpzIiwiZnNhL2ZzYS1wcmUtYnVpbHQuanMiLCJob21lL2hvbWUuanMiLCJsb2dpbi9sb2dpbi5qcyIsInVzZXJfcHJvZmlsZS91c2VyX3Byb2ZpbGUuanMiLCJtZW1iZXJzLW9ubHkvbWVtYmVycy1vbmx5LmpzIiwiY29tbW9uL2ZhY3Rvcmllcy9yb3V0ZS5mYWN0b3J5LmpzIiwiY29tbW9uL2ZhY3Rvcmllcy91c2VyLmZhY3RvcnkuanMiLCJjb21tb24vZGlyZWN0aXZlcy9uYXZiYXIvbmF2YmFyLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvbm9kZW1vbm8tbG9nby9ub2RlbW9uby1sb2dvLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLFlBQUEsQ0FBQTtBQUNBLE1BQUEsQ0FBQSxHQUFBLEdBQUEsT0FBQSxDQUFBLE1BQUEsQ0FBQSxhQUFBLEVBQUEsQ0FBQSxXQUFBLEVBQUEsY0FBQSxFQUFBLGFBQUEsRUFBQSxTQUFBLENBQUEsQ0FBQSxDQUFBOztBQUVBLEdBQUEsQ0FBQSxNQUFBLENBQUEsVUFBQSxrQkFBQSxFQUFBLGlCQUFBLEVBQUEsVUFBQSxFQUFBLHFCQUFBLEVBQUE7O0FBRUEscUJBQUEsQ0FBQSxTQUFBLENBQUEsSUFBQSxDQUFBLENBQUE7O0FBRUEsc0JBQUEsQ0FBQSxTQUFBLENBQUEsR0FBQSxDQUFBLENBQUE7OztBQUdBLGNBQUEsQ0FBQSxRQUFBLENBQUEsUUFBQSxHQUFBLE1BQUEsQ0FBQTtBQUNBLGNBQUEsQ0FBQSxRQUFBLENBQUEsV0FBQSxHQUFBLEtBQUEsQ0FBQTs7Ozs7QUFNQSxjQUFBLENBQUEsUUFBQSxDQUFBLFNBQUEsR0FBQSxVQUFBLE9BQUEsRUFBQTtBQUNBLFlBQUEsSUFBQSxHQUFBLElBQUEsQ0FBQSxNQUFBLEVBQUEsQ0FBQTtBQUNBLFlBQUEsSUFBQSxDQUFBLE1BQUEsRUFBQSxPQUFBLE9BQUEsQ0FBQSxPQUFBLENBQUEsT0FBQSxDQUFBLElBQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQSxDQUFBLEtBQ0EsT0FBQSxJQUFBLENBQUEsT0FBQSxFQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsSUFBQTttQkFBQSxPQUFBLENBQUEsSUFBQSxDQUFBLElBQUEsQ0FBQTtTQUFBLENBQUEsQ0FBQTtLQUNBLENBQUE7Ozs7OztBQU1BLGFBQUEsWUFBQSxDQUFBLFFBQUEsRUFBQSxRQUFBLEVBQUE7QUFDQSxpQkFBQSxZQUFBLENBQUEsQ0FBQSxFQUFBO0FBQ0Esa0JBQUEsQ0FBQSxPQUFBLENBQUEsT0FBQSxDQUFBLFFBQUEsQ0FBQSxZQUFBLEVBQUEsVUFBQSxHQUFBLEVBQUE7QUFDQSxvQkFBQSxZQUFBLEdBQUEsR0FBQSxDQUFBLFFBQUEsQ0FBQTtBQUNBLG9CQUFBLFdBQUEsR0FBQSxRQUFBLENBQUEsV0FBQSxDQUFBLFlBQUEsQ0FBQSxDQUFBO0FBQ0Esb0JBQUEsR0FBQSxDQUFBLElBQUEsS0FBQSxTQUFBLEVBQUE7QUFDQSx3QkFBQSxDQUFBLENBQUEsY0FBQSxDQUFBLEdBQUEsQ0FBQSxVQUFBLENBQUEsRUFBQTtBQUNBLDRCQUFBLENBQUEsQ0FBQSxHQUFBLENBQUEsVUFBQSxDQUFBLENBQUEsTUFBQSxJQUFBLENBQUEsTUFBQSxDQUFBLE9BQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQSxDQUFBLEdBQUEsQ0FBQSxVQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxFQUFBOztBQUVBLDZCQUFBLENBQUEsR0FBQSxDQUFBLFNBQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQSxHQUFBLENBQUEsVUFBQSxDQUFBLENBQUE7QUFDQSxtQ0FBQSxDQUFBLENBQUEsR0FBQSxDQUFBLFVBQUEsQ0FBQSxDQUFBO3lCQUNBLE1BQUEsSUFBQSxDQUFBLENBQUEsQ0FBQSxHQUFBLENBQUEsU0FBQSxDQUFBLEVBQUE7O0FBRUEsNkJBQUEsQ0FBQSxHQUFBLENBQUEsU0FBQSxDQUFBLEdBQUEsRUFBQSxDQUFBO0FBQ0Esa0NBQUEsQ0FBQSxPQUFBLENBQUEsT0FBQSxDQUFBLENBQUEsQ0FBQSxHQUFBLENBQUEsVUFBQSxDQUFBLEVBQUEsVUFBQSxLQUFBLEVBQUE7QUFDQSxpQ0FBQSxDQUFBLEdBQUEsQ0FBQSxTQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsS0FBQSxDQUFBLFdBQUEsQ0FBQSxXQUFBLENBQUEsQ0FBQSxDQUFBOzZCQUNBLENBQUEsQ0FBQTt5QkFDQTtxQkFDQTtpQkFDQSxNQUNBLElBQUEsR0FBQSxDQUFBLElBQUEsS0FBQSxXQUFBLEVBQUE7QUFDQSx3QkFBQSxDQUFBLENBQUEsY0FBQSxDQUFBLEdBQUEsQ0FBQSxVQUFBLENBQUEsRUFBQTs7QUFFQSw0QkFBQSxNQUFBLENBQUEsT0FBQSxDQUFBLFFBQUEsQ0FBQSxDQUFBLENBQUEsR0FBQSxDQUFBLFVBQUEsQ0FBQSxDQUFBLEVBQUE7QUFDQSw2QkFBQSxDQUFBLEdBQUEsQ0FBQSxRQUFBLENBQUEsR0FBQSxDQUFBLENBQUEsR0FBQSxDQUFBLFVBQUEsQ0FBQSxDQUFBLEdBQUEsQ0FBQTt5QkFDQTs7NkJBRUEsSUFBQSxDQUFBLE1BQUEsQ0FBQSxPQUFBLENBQUEsUUFBQSxDQUFBLENBQUEsQ0FBQSxHQUFBLENBQUEsVUFBQSxDQUFBLENBQUEsRUFBQTtBQUNBLGlDQUFBLENBQUEsR0FBQSxDQUFBLFFBQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQSxHQUFBLENBQUEsVUFBQSxDQUFBLENBQUE7QUFDQSx1Q0FBQSxDQUFBLENBQUEsR0FBQSxDQUFBLFVBQUEsQ0FBQSxDQUFBOzZCQUNBO3FCQUNBO2lCQUNBO2FBQ0EsQ0FBQSxDQUFBO1NBQ0E7O0FBRUEsWUFBQSxNQUFBLENBQUEsT0FBQSxDQUFBLE9BQUEsQ0FBQSxRQUFBLENBQUEsRUFBQTtBQUNBLGtCQUFBLENBQUEsT0FBQSxDQUFBLE9BQUEsQ0FBQSxRQUFBLEVBQUEsWUFBQSxDQUFBLENBQUE7U0FDQSxNQUFBO0FBQ0Esd0JBQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQTtTQUNBO0tBQ0E7O0FBR0EsY0FBQSxDQUFBLFFBQUEs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RUFBQSxxQkFBQTtBQUNBLHNCQUFBLEVBQUEsc0JBQUE7QUFDQSx3QkFBQSxFQUFBLHdCQUFBO0FBQ0EscUJBQUEsRUFBQSxxQkFBQTtLQUNBLENBQUEsQ0FBQTs7QUFFQSxPQUFBLENBQUEsT0FBQSxDQUFBLGlCQUFBLEVBQUEsVUFBQSxVQUFBLEVBQUEsRUFBQSxFQUFBLFdBQUEsRUFBQTtBQUNBLFlBQUEsVUFBQSxHQUFBO0FBQ0EsZUFBQSxFQUFBLFdBQUEsQ0FBQSxnQkFBQTtBQUNBLGVBQUEsRUFBQSxXQUFBLENBQUEsYUFBQTtBQUNBLGVBQUEsRUFBQSxXQUFBLENBQUEsY0FBQTtBQUNBLGVBQUEsRUFBQSxXQUFBLENBQUEsY0FBQTtTQUNBLENBQUE7QUFDQSxlQUFBO0FBQ0EseUJBQUEsRUFBQSx1QkFBQSxRQUFBLEVBQUE7QUFDQSwwQkFBQSxDQUFBLFVBQUEsQ0FBQSxVQUFBLENBQUEsUUFBQSxDQUFBLE1BQUEsQ0FBQSxFQUFBLFFBQUEsQ0FBQSxDQUFBO0FBQ0EsdUJBQUEsRUFBQSxDQUFBLE1BQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQTthQUNBO1NBQ0EsQ0FBQTtLQUNBLENBQUEsQ0FBQTs7QUFFQSxPQUFBLENBQUEsTUFBQSxDQUFBLFVBQUEsYUFBQSxFQUFBO0FBQ0EscUJBQUEsQ0FBQSxZQUFBLENBQUEsSUFBQSxDQUFBLENBQ0EsV0FBQSxFQUNBLFVBQUEsU0FBQSxFQUFBO0FBQ0EsbUJBQUEsU0FBQSxDQUFBLEdBQUEsQ0FBQSxpQkFBQSxDQUFBLENBQUE7U0FDQSxDQUNBLENBQUEsQ0FBQTtLQUNBLENBQUEsQ0FBQTs7QUFFQSxPQUFBLENBQUEsT0FBQSxDQUFBLGFBQUEsRUFBQSxVQUFBLEtBQUEsRUFBQSxPQUFBLEVBQUEsVUFBQSxFQUFBLFdBQUEsRUFBQSxFQUFBLEVBQUEsSUFBQSxFQUFBOztBQUVBLGlCQUFBLGlCQUFBLENBQUEsUUFBQSxFQUFBO0FBQ0EsZ0JBQUEsSUFBQSxHQUFBLFFBQUEsQ0FBQSxJQUFBLENBQUE7QUFDQSxtQkFBQSxDQUFBLE1BQUEsQ0FBQSxJQUFBLENBQUEsRUFBQSxFQUFBLElBQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQTtBQUNBLHNCQUFBLENBQUEsVUFBQSxDQUFBLFdBQUEsQ0FBQSxZQUFBLENBQUEsQ0FBQTtBQUNBLG1CQUFBLElBQUEsQ0FBQSxJQUFBLENBQUE7U0FDQTs7OztBQUlBLFlBQUEsQ0FBQSxlQUFBLEdBQUEsWUFBQTtBQUNBLG1CQUFBLENBQUEsQ0FBQSxPQUFBLENBQUEsSUFBQSxDQUFBO1NBQ0EsQ0FBQTs7QUFFQSxZQUFBLENBQUEsZUFBQSxHQUFBLFVBQUEsVUFBQSxFQUFBOzs7Ozs7Ozs7O0FBVUEsZ0JBQUEsSUFBQSxDQUFBLGVBQUEsRUFBQSxJQUFBLFVBQUEsS0FBQSxJQUFBLEVBQUE7QUFDQSx1QkFBQSxFQUFBLENBQUEsSUFBQSxDQUFBLE9BQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQTthQUNBOzs7OztBQUtBLG1CQUFBLEtBQUEsQ0FBQSxHQUFBLENBQUEsVUFBQSxDQUFBLENBQUEsSUFBQSxDQUFBLGlCQUFBLENBQUEsU0FBQSxDQUFBLFlBQUE7QUFDQSx1QkFBQSxJQUFBLENBQUE7YUFDQSxDQUFBLENBQUE7U0FFQSxDQUFBOztBQUVBLFlBQUEsQ0FBQSxLQUFBLEdBQUEsVUFBQSxXQUFBLEVBQUE7QUFDQSxtQkFBQSxLQUFBLENBQUEsSUFBQSxDQUFBLFFBQUEsRUFBQSxXQUFBLENBQUEsQ0FDQSxJQUFBLENBQUEsaUJBQUEsQ0FBQSxTQUNBLENBQUEsWUFBQTtBQUNBLHVCQUFBLEVBQUEsQ0FBQSxNQUFBLENBQUEsRUFBQSxPQUFBLEVBQUEsNEJBQUEsRUFBQSxDQUFBLENBQUE7YUFDQSxDQUFBLENBQUE7U0FDQSxDQUFBOztBQUVBLFlBQUEsQ0FBQSxNQUFBLEdBQUEsWUFBQTtBQUNBLG1CQUFBLEtBQUEsQ0FBQSxHQUFBLENBQUEsU0FBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFlBQUE7QUFDQSx1QkFBQSxDQUFBLE9BQUEsRUFBQSxDQUFBO0FBQ0EsMEJBQUEsQ0FBQSxVQUFBLENBQUEsV0FBQSxDQUFBLGFBQUEsQ0FBQSxDQUFBO2FBQ0EsQ0FBQSxDQUFBO1NBQ0EsQ0FBQTtLQUVBLENBQUEsQ0FBQTs7QUFFQSxPQUFBLENBQUEsT0FBQSxDQUFBLFNBQUEsRUFBQSxVQUFBLFVBQUEsRUFBQSxXQUFBLEVBQUE7O0FBRUEsWUFBQSxJQUFBLEdBQUEsSUFBQSxDQUFBOztBQUVBLGtCQUFBLENBQUEsR0FBQSxDQUFBLFdBQUEsQ0FBQSxnQkFBQSxFQUFBLFlBQUE7QUFDQSxnQkFBQSxDQUFBLE9BQUEsRUFBQSxDQUFBO1NBQ0EsQ0FBQSxDQUFBOztBQUVBLGtCQUFBLENBQUEsR0FBQSxDQUFBLFdBQUEsQ0FBQSxjQUFBLEVBQUEsWUFBQTtBQUNBLGdCQUFBLENBQUEsT0FBQSxFQUFBLENBQUE7U0FDQSxDQUFBLENBQUE7O0FBRUEsWUFBQSxDQUFBLEVBQUEsR0FBQSxJQUFBLENBQUE7QUFDQSxZQUFBLENBQUEsSUFBQSxHQUFBLElBQUEsQ0FBQTs7QUFFQSxZQUFBLENBQUEsTUFBQSxHQUFBLFVBQUEsU0FBQSxFQUFBLElBQUEsRUFBQTtBQUNBLGdCQUFBLENBQUEsRUFBQSxHQUFBLFNBQUEsQ0FBQTtBQUNBLGdCQUFBLENBQUEsSUFBQSxHQUFBLElBQUEsQ0FBQTtTQUNBLENBQUE7O0FBRUEsWUFBQSxDQUFBLE9BQUEsR0FBQSxZQUFBO0FBQ0EsZ0JBQUEsQ0FBQSxFQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsZ0JBQUEsQ0FBQSxJQUFBLEdBQUEsSUFBQSxDQUFBO1NBQ0EsQ0FBQTtLQUVBLENBQUEsQ0FBQTtDQUVBLENBQUEsRUFBQSxDQUFBOztBQ3BJQSxHQUFBLENBQUEsTUFBQSxDQUFBLFVBQUEsY0FBQSxFQUFBO0FBQ0Esa0JBQUEsQ0FBQSxLQUFBLENBQUEsTUFBQSxFQUFBO0FBQ0EsV0FBQSxFQUFBLEdBQUE7QUFDQSxtQkFBQSxFQUFBLG1CQUFBO0FBQ0Esa0JBQUEsRUFBQSxvQkFBQSxNQUFBLEVBQUEsS0FBQSxFQUFBLE1BQUEsRUFBQTtBQUNBLGtCQUFBLENBQUEsS0FBQSxHQUFBLEtBQUEsQ0FBQTtBQUNBLGtCQUFBLENBQUEsTUFBQSxHQUFBLE1BQUEsQ0FBQTs7O0FBR0Esa0JBQUEsQ0FBQSxTQUFBLEdBQUE7dUJBQUEsU0FBQSxDQUFBLFNBQUEsQ0FBQSxXQUFBLEVBQUEsQ0FBQSxRQUFBLENBQUEsUUFBQSxDQUFBO2FBQUEsQ0FBQTtTQUNBO0FBQ0EsZUFBQSxFQUFBO0FBQ0EsaUJBQUEsRUFBQSxlQUFBLElBQUE7dUJBQUEsSUFBQSxDQUFBLE9BQUEsQ0FBQSxFQUFBLEVBQUEsRUFBQSxXQUFBLEVBQUEsSUFBQSxFQUFBLENBQUE7YUFBQTtBQUNBLGtCQUFBLEVBQUEsZ0JBQUEsS0FBQTt1QkFBQSxLQUFBLENBQUEsT0FBQSxDQUFBLEVBQUEsRUFBQSxFQUFBLFdBQUEsRUFBQSxJQUFBLEVBQUEsQ0FBQTthQUFBO1NBQ0E7S0FDQSxDQUFBLENBQUE7Q0FDQSxDQUFBLENBQUE7O0FDaEJBLEdBQUEsQ0FBQSxNQUFBLENBQUEsVUFBQSxjQUFBLEVBQUE7O0FBRUEsa0JBQUEsQ0FBQSxLQUFBLENBQUEsT0FBQSxFQUFBO0FBQ0EsV0FBQSxFQUFBLFFBQUE7QUFDQSxtQkFBQSxFQUFBLHFCQUFBO0FBQ0Esa0JBQUEsRUFBQSxXQUFBO0tBQ0EsQ0FBQSxDQUFBO0NBRUEsQ0FBQSxDQUFBOztBQUVBLEdBQUEsQ0FBQSxVQUFBLENBQUEsV0FBQSxFQUFBLFVBQUEsTUFBQSxFQUFBLFdBQUEsRUFBQSxNQUFBLEVBQUE7O0FBRUEsVUFBQSxDQUFBLEtBQUEsR0FBQSxFQUFBLENBQUE7QUFDQSxVQUFBLENBQUEsS0FBQSxHQUFBLElBQUEsQ0FBQTs7QUFFQSxVQUFBLENBQUEsU0FBQSxHQUFBLFVBQUEsU0FBQSxFQUFBOztBQUVBLGNBQUEsQ0FBQSxLQUFBLEdBQUEsSUFBQSxDQUFBOztBQUVBLG1CQUFBLENBQUEsS0FBQSxDQUFBLFNBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLElBQUEsRUFBQTtBQUNBLGtCQUFBLENBQUEsRUFBQSxDQUFBLE1BQUEsRUFBQSxFQUFBLEVBQUEsRUFBQSxJQUFBLENBQUEsR0FBQSxFQUFBLENBQUEsQ0FBQTtTQUNBLENBQUEsU0FBQSxDQUFBLFlBQUE7QUFDQSxrQkFBQSxDQUFBLEtBQUEsR0FBQSw0QkFBQSxDQUFBO1NBQ0EsQ0FBQSxDQUFBO0tBRUEsQ0FBQTtDQUVBLENBQUEsQ0FBQTs7QUMzQkEsR0FBQSxDQUFBLE1BQUEsQ0FBQSxVQUFBLGNBQUEsRUFBQTtBQUNBLGtCQUFBLENBQUEsS0FBQSxDQUFBLE1BQUEsRUFBQTtBQUNBLFdBQUEsRUFBQSxjQUFBO0FBQ0EsbUJBQUEsRUFBQSxtQ0FBQTtBQUNBLGtCQUFBLEVBQUEsb0JBQUEsTUFBQSxFQUFBLElBQUEsRUFBQTtBQUNBLGtCQUFBLENBQUEsSUFBQSxHQUFBLElBQUEsQ0FBQTtBQUNBLG1CQUFBLENBQUEsR0FBQSxtQ0FBQSxJQUFBLENBQUEsSUFBQSxDQUFBLENBQUE7QUFDQSxtQkFBQSxDQUFBLEdBQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQTtTQUNBO0FBQ0EsZUFBQSxFQUFBO0FBQ0EsZ0JBQUEsRUFBQSxjQUFBLFlBQUEsRUFBQSxJQUFBO3VCQUFBLElBQUEsQ0FBQSxJQUFBLENBQUEsWUFBQSxDQUFBLEVBQUEsQ0FBQTthQUFBO1NBQ0E7S0FDQSxDQUFBLENBQUE7Q0FDQSxDQUFBLENBQUE7O0FDYkEsR0FBQSxDQUFBLE1BQUEsQ0FBQSxVQUFBLGNBQUEsRUFBQTs7QUFFQSxrQkFBQSxDQUFBLEtBQUEsQ0FBQSxhQUFBLEVBQUE7QUFDQSxXQUFBLEVBQUEsZUFBQTtBQUNBLGdCQUFBLEVBQUEsRUFBQTtBQUNBLGtCQUFBLEVBQUEsb0JBQUEsTUFBQSxFQUFBLEVBQUE7Ozs7QUFJQSxZQUFBLEVBQUE7QUFDQSx3QkFBQSxFQUFBLElBQUE7U0FDQTtLQUNBLENBQUEsQ0FBQTtDQUVBLENBQUEsQ0FBQTs7QUNkQSxHQUFBLENBQUEsT0FBQSxDQUFBLE9BQUEsRUFBQSxVQUFBLE1BQUEsRUFBQSxFQUFBLEVBQUE7O0FBRUEsUUFBQSxLQUFBLEdBQUEsRUFBQSxDQUFBLGNBQUEsQ0FBQTtBQUNBLFlBQUEsRUFBQSxPQUFBO0FBQ0EsZ0JBQUEsRUFBQSxRQUFBO0FBQ0EsaUJBQUEsRUFBQTtBQUNBLHFCQUFBLEVBQUE7QUFDQSxvQkFBQSxFQUFBOzs7QUFHQSw4QkFBQSxFQUFBLE1BQUE7OztBQUdBLDRCQUFBLEVBQUEsU0FBQTtBQUNBLDBCQUFBLEVBQUEsSUFBQTtpQkFDQTthQUNBO1NBQ0E7QUFDQSxlQUFBLEVBQUE7QUFDQSxjQUFBLEVBQUEsY0FBQTtBQUNBLHVCQUFBLENBQUEsR0FBQSxvQ0FBQSxJQUFBLENBQUEsSUFBQSxVQUFBLElBQUEsQ0FBQSxHQUFBLE9BQUEsQ0FBQTthQUNBO1NBQ0E7S0FDQSxDQUFBLENBQUE7O0FBRUEsV0FBQSxLQUFBLENBQUE7Q0FDQSxDQUFBLENBQ0EsR0FBQSxDQUFBLFVBQUEsS0FBQSxFQUFBLEVBQUEsQ0FBQSxDQUFBOztBQzNCQSxHQUFBLENBQUEsT0FBQSxDQUFBLE1BQUEsRUFBQSxVQUFBLE1BQUEsRUFBQSxFQUFBLEVBQUE7O0FBRUEsUUFBQSxJQUFBLEdBQUEsRUFBQSxDQUFBLGNBQUEsQ0FBQTtBQUNBLFlBQUEsRUFBQSxNQUFBO0FBQ0EsZ0JBQUEsRUFBQSxPQUFBO0FBQ0EsaUJBQUEsRUFBQTtBQUNBLG1CQUFBLEVBQUE7QUFDQSxxQkFBQSxFQUFBOzs7QUFHQSw4QkFBQSxFQUFBLFFBQUE7OztBQUdBLDhCQUFBLEVBQUEsU0FBQTtpQkFDQTthQUNBO1NBQ0E7OztBQUdBLGVBQUEsRUFBQTtBQUNBLGNBQUEsRUFBQSxjQUFBO0FBQ0EsdUJBQUEsQ0FBQSxHQUFBLG1DQUFBLElBQUEsQ0FBQSxJQUFBLFVBQUEsSUFBQSxDQUFBLEdBQUEsT0FBQSxDQUFBO0FBQ0Esc0JBQUEsQ0FBQSxFQUFBLENBQUEsTUFBQSxFQUFBLEVBQUEsRUFBQSxFQUFBLElBQUEsQ0FBQSxHQUFBLEVBQUEsQ0FBQSxDQUFBO2FBQ0E7U0FDQTtLQUNBLENBQUEsQ0FBQTs7QUFFQSxXQUFBLElBQUEsQ0FBQTtDQUNBLENBQUEsQ0FDQSxHQUFBLENBQUEsVUFBQSxJQUFBLEVBQUEsRUFBQSxDQUFBLENBQUE7O0FDN0JBLEdBQUEsQ0FBQSxTQUFBLENBQUEsUUFBQSxFQUFBLFVBQUEsVUFBQSxFQUFBLE1BQUEsRUFBQSxXQUFBLEVBQUEsV0FBQSxFQUFBLElBQUEsRUFBQTs7QUFFQSxXQUFBO0FBQ0EsZ0JBQUEsRUFBQSxHQUFBO0FBQ0EsYUFBQSxFQUFBLEVBQUE7QUFDQSxtQkFBQSxFQUFBLHlDQUFBO0FBQ0EsWUFBQSxFQUFBLGNBQUEsS0FBQSxFQUFBOztBQUVBLGlCQUFBLENBQUEsS0FBQSxHQUFBOztBQUVBLGNBQUEsS0FBQSxFQUFBLGVBQUEsRUFBQSxLQUFBLEVBQUEsTUFBQSxFQUFBLEVBQ0EsRUFBQSxLQUFBLEVBQUEsT0FBQSxFQUFBLEtBQUEsRUFBQSxPQUFBLEVBQUEsRUFDQSxFQUFBLEtBQUEsRUFBQSxNQUFBLEVBQUEsS0FBQSxFQUFBLE1BQUEsRUFBQSxDQUVBLENBQUE7OztBQUVBLGlCQUFBLENBQUEsSUFBQSxHQUFBLElBQUEsQ0FBQTs7QUFFQSxpQkFBQSxDQUFBLFVBQUEsR0FBQSxZQUFBO0FBQ0EsdUJBQUEsV0FBQSxDQUFBLGVBQUEsRUFBQSxDQUFBO2FBQ0EsQ0FBQTs7QUFFQSxpQkFBQSxDQUFBLE1BQUEsR0FBQSxZQUFBO0FBQ0EsMkJBQUEsQ0FBQSxNQUFBLEVBQUEsQ0FBQSxJQUFBLENBQUEsWUFBQTtBQUNBLDBCQUFBLENBQUEsRUFBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBO2lCQUNBLENBQUEsQ0FBQTthQUNBLENBQUE7O0FBRUEsZ0JBQUEsT0FBQSxHQUFBLFNBQUEsT0FBQSxHQUFBO0FBQ0EsMkJBQUEsQ0FBQSxlQUFBLEVBQUEsQ0FDQSxJQUFBLENBQUEsVUFBQSxJQUFBOzJCQUFBLElBQUEsQ0FBQSxJQUFBLENBQUEsSUFBQSxDQUFBLEdBQUEsQ0FBQTtpQkFBQSxDQUFBLENBQ0EsSUFBQSxDQUFBLFVBQUEsSUFBQSxFQUFBO0FBQ0EseUJBQUEsQ0FBQSxJQUFBLEdBQUEsSUFBQSxDQUFBO0FBQ0EsMkJBQUEsSUFBQSxDQUFBO2lCQUNBLENBQUEsQ0FBQTthQUNBLENBQUE7O0FBRUEsZ0JBQUEsVUFBQSxHQUFBLFNBQUEsVUFBQSxHQUFBO0FBQ0EscUJBQUEsQ0FBQSxJQUFBLEdBQUEsSUFBQSxDQUFBO2FBQ0EsQ0FBQTs7QUFFQSxtQkFBQSxFQUFBLENBQUE7O0FBRUEsc0JBQUEsQ0FBQSxHQUFBLENBQUEsV0FBQSxDQUFBLFlBQUEsRUFBQSxPQUFBLENBQUEsQ0FBQTtBQUNBLHNCQUFBLENBQUEsR0FBQSxDQUFBLFdBQUEsQ0FBQSxhQUFBLEVBQUEsVUFBQSxDQUFBLENBQUE7QUFDQSxzQkFBQSxDQUFBLEdBQUEsQ0FBQSxXQUFBLENBQUEsY0FBQSxFQUFBLFVBQUEsQ0FBQSxDQUFBO1NBRUE7O0tBRUEsQ0FBQTtDQUVBLENBQUEsQ0FBQTs7QUNuREEsR0FBQSxDQUFBLFNBQUEsQ0FBQSxjQUFBLEVBQUEsWUFBQTtBQUNBLFdBQUE7QUFDQSxnQkFBQSxFQUFBLEdBQUE7QUFDQSxtQkFBQSxFQUFBLHVEQUFBO0FBQ0EsWUFBQSxFQUFBLGNBQUEsS0FBQSxFQUFBLElBQUEsRUFBQSxJQUFBLEVBQUE7O0FBRUEsaUJBQUEsQ0FBQSxnQkFBQSxHQUFBLFlBQUE7QUFDQSx1QkFBQSxDQUFBLEdBQUEsMkNBQUEsQ0FBQTthQUNBLENBQUE7U0FFQTtLQUNBLENBQUE7Q0FDQSxDQUFBLENBQUEiLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc3RyaWN0JztcbndpbmRvdy5hcHAgPSBhbmd1bGFyLm1vZHVsZSgnTm9kZW1vbm9BcHAnLCBbJ3VpLnJvdXRlcicsICd1aS5ib290c3RyYXAnLCAnZnNhUHJlQnVpbHQnLCAnanMtZGF0YSddKTtcblxuYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHVybFJvdXRlclByb3ZpZGVyLCAkbG9jYXRpb25Qcm92aWRlciwgRFNQcm92aWRlciwgRFNIdHRwQWRhcHRlclByb3ZpZGVyKSB7XG4gICAgLy8gVGhpcyB0dXJucyBvZmYgaGFzaGJhbmcgdXJscyAoLyNhYm91dCkgYW5kIGNoYW5nZXMgaXQgdG8gc29tZXRoaW5nIG5vcm1hbCAoL2Fib3V0KVxuICAgICRsb2NhdGlvblByb3ZpZGVyLmh0bWw1TW9kZSh0cnVlKTtcbiAgICAvLyBJZiB3ZSBnbyB0byBhIFVSTCB0aGF0IHVpLXJvdXRlciBkb2Vzbid0IGhhdmUgcmVnaXN0ZXJlZCwgZ28gdG8gdGhlIFwiL1wiIHVybC5cbiAgICAkdXJsUm91dGVyUHJvdmlkZXIub3RoZXJ3aXNlKCcvJyk7XG5cbiAgICAvLyBzZXQganMtZGF0YSBkZWZhdWx0c1xuICAgIERTUHJvdmlkZXIuZGVmYXVsdHMuYmFzZVBhdGggPSAnL2FwaSdcbiAgICBEU1Byb3ZpZGVyLmRlZmF1bHRzLmlkQXR0cmlidXRlID0gJ19pZCdcblxuXG4gICAgLy8gYSBtZXRob2QgdG8gdGhlIERTUHJvdmlkZXIgZGVmYXVsdHMgb2JqZWN0IHRoYXQgYXV0b21hdGljYWxseVxuICAgIC8vIGNoZWNrcyBpZiB0aGVyZSBpcyBhbnkgZGF0YSBpbiB0aGUgY2FjaGUgZm9yIGEgZ2l2ZW4gc2VydmljZSBiZWZvcmVcbiAgICAvLyBwaW5naW5nIHRoZSBkYXRhYmFzZVxuICAgIERTUHJvdmlkZXIuZGVmYXVsdHMuZ2V0T3JGaW5kID0gZnVuY3Rpb24oc2VydmljZSl7XG4gICAgICB2YXIgZGF0YSA9IHRoaXMuZ2V0QWxsKClcbiAgICAgIGlmIChkYXRhLmxlbmd0aCkgcmV0dXJuIFByb21pc2UucmVzb2x2ZShhbmd1bGFyLmNvcHkoZGF0YSkpXG4gICAgICBlbHNlIHJldHVybiB0aGlzLmZpbmRBbGwoKS50aGVuKGRhdGEgPT4gYW5ndWxhci5jb3B5KGRhdGEpKVxuICAgIH1cblxuICAgIC8vIE1vbmdvb3NlIFJlbGF0aW9uIEZpeCAoZml4ZXMgZGVzZXJpYWxpemF0aW9uKVxuICAgIC8vIEZyb20gaHR0cDovL3BsbmtyLmNvL2VkaXQvM3o5MFBEOXd3d2hXZG5Wclpxa0I/cD1wcmV2aWV3XG4gICAgLy8gVGhpcyB3YXMgc2hvd24gdG8gdXMgYnkgQGptZG9icnksIHRoZSBpZGVhIGhlcmUgaXMgdGhhdFxuICAgIC8vIHdlIGZpeCB0aGUgZGF0YSBjb21pbmcgZnJvbSBNb25nb29zZSBtb2RlbHMgaW4ganMtZGF0YSByYXRoZXIgdGhhbiBvdXRib3VuZCBmcm9tIE1vbmdvb3NlXG4gICAgZnVuY3Rpb24gZml4UmVsYXRpb25zKFJlc291cmNlLCBpbnN0YW5jZSkge1xuICAgICAgZnVuY3Rpb24gZml4TG9jYWxLZXlzKGkpIHtcbiAgICAgICAgSlNEYXRhLkRTVXRpbHMuZm9yRWFjaChSZXNvdXJjZS5yZWxhdGlvbkxpc3QsIGZ1bmN0aW9uKGRlZikge1xuICAgICAgICAgIHZhciByZWxhdGlvbk5hbWUgPSBkZWYucmVsYXRpb247XG4gICAgICAgICAgdmFyIHJlbGF0aW9uRGVmID0gUmVzb3VyY2UuZ2V0UmVzb3VyY2UocmVsYXRpb25OYW1lKTtcbiAgICAgICAgICBpZiAoZGVmLnR5cGUgPT09ICdoYXNNYW55Jykge1xuICAgICAgICAgICAgaWYgKGkuaGFzT3duUHJvcGVydHkoZGVmLmxvY2FsRmllbGQpKSB7XG4gICAgICAgICAgICAgIGlmIChpW2RlZi5sb2NhbEZpZWxkXS5sZW5ndGggJiYgIUpTRGF0YS5EU1V0aWxzLmlzT2JqZWN0KGlbZGVmLmxvY2FsRmllbGRdWzBdKSkge1xuICAgICAgICAgICAgICAgIC8vIENhc2UgMTogYXJyYXkgb2YgX2lkcyB3aGVyZSBhcnJheSBvZiBwb3B1bGF0ZWQgb2JqZWN0cyBzaG91bGQgYmVcbiAgICAgICAgICAgICAgICBpW2RlZi5sb2NhbEtleXNdID0gaVtkZWYubG9jYWxGaWVsZF07XG4gICAgICAgICAgICAgICAgZGVsZXRlIGlbZGVmLmxvY2FsRmllbGRdO1xuICAgICAgICAgICAgICB9IGVsc2UgaWYgKCFpW2RlZi5sb2NhbEtleXNdKSB7XG4gICAgICAgICAgICAgICAgLy8gQ2FzZSAyOiBhcnJheSBvZiBwb3B1bGF0ZWQgb2JqZWN0cywgYnV0IG1pc3NpbmcgYXJyYXkgb2YgX2lkcydcbiAgICAgICAgICAgICAgICBpW2RlZi5sb2NhbEtleXNdID0gW107XG4gICAgICAgICAgICAgICAgSlNEYXRhLkRTVXRpbHMuZm9yRWFjaChpW2RlZi5sb2NhbEZpZWxkXSwgZnVuY3Rpb24oY2hpbGQpIHtcbiAgICAgICAgICAgICAgICAgIGlbZGVmLmxvY2FsS2V5c10ucHVzaChjaGlsZFtyZWxhdGlvbkRlZi5pZEF0dHJpYnV0ZV0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2UgaWYgKGRlZi50eXBlID09PSAnYmVsb25nc1RvJykge1xuICAgICAgICAgICAgaWYgKGkuaGFzT3duUHJvcGVydHkoZGVmLmxvY2FsRmllbGQpKSB7XG4gICAgICAgICAgICAgIC8vIGlmIHRoZSBsb2NhbGZJZWxkIGlzIGEgcG9wdWFsdGVkIG9iamVjdFxuICAgICAgICAgICAgICBpZiAoSlNEYXRhLkRTVXRpbHMuaXNPYmplY3QoaVtkZWYubG9jYWxGaWVsZF0pKSB7XG4gICAgICAgICAgICAgICAgaVtkZWYubG9jYWxLZXldID0gaVtkZWYubG9jYWxGaWVsZF0uX2lkO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIC8vIGlmIHRoZSBsb2NhbGZpZWxkIGlzIGFuIG9iamVjdCBpZFxuICAgICAgICAgICAgICBlbHNlIGlmICghSlNEYXRhLkRTVXRpbHMuaXNPYmplY3QoaVtkZWYubG9jYWxGaWVsZF0pKSB7XG4gICAgICAgICAgICAgICAgaVtkZWYubG9jYWxLZXldID0gaVtkZWYubG9jYWxGaWVsZF07XG4gICAgICAgICAgICAgICAgZGVsZXRlIGlbZGVmLmxvY2FsRmllbGRdO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgaWYgKEpTRGF0YS5EU1V0aWxzLmlzQXJyYXkoaW5zdGFuY2UpKSB7XG4gICAgICAgIEpTRGF0YS5EU1V0aWxzLmZvckVhY2goaW5zdGFuY2UsIGZpeExvY2FsS2V5cyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBmaXhMb2NhbEtleXMoaW5zdGFuY2UpO1xuICAgICAgfVxuICAgIH1cblxuXG4gICAgRFNQcm92aWRlci5kZWZhdWx0cy5kZXNlcmlhbGl6ZSA9IGZ1bmN0aW9uKFJlc291cmNlLCBkYXRhKSB7XG4gICAgICB2YXIgaW5zdGFuY2UgPSBkYXRhLmRhdGE7XG4gICAgICBmaXhSZWxhdGlvbnMoUmVzb3VyY2UsIGluc3RhbmNlKTtcbiAgICAgIHJldHVybiBpbnN0YW5jZTtcbiAgICB9O1xuICAgIC8vIEVuZCBNb25nb29zZSBSZWxhdGlvbiBmaXhcbn0pO1xuXG4vLyBUaGlzIGFwcC5ydW4gaXMgZm9yIGNvbnRyb2xsaW5nIGFjY2VzcyB0byBzcGVjaWZpYyBzdGF0ZXMuXG5hcHAucnVuKGZ1bmN0aW9uICgkcm9vdFNjb3BlLCBBdXRoU2VydmljZSwgJHN0YXRlKSB7XG5cbiAgICAvLyBUaGUgZ2l2ZW4gc3RhdGUgcmVxdWlyZXMgYW4gYXV0aGVudGljYXRlZCB1c2VyLlxuICAgIHZhciBkZXN0aW5hdGlvblN0YXRlUmVxdWlyZXNBdXRoID0gZnVuY3Rpb24gKHN0YXRlKSB7XG4gICAgICAgIHJldHVybiBzdGF0ZS5kYXRhICYmIHN0YXRlLmRhdGEuYXV0aGVudGljYXRlO1xuICAgIH07XG5cbiAgICAvLyAkc3RhdGVDaGFuZ2VTdGFydCBpcyBhbiBldmVudCBmaXJlZFxuICAgIC8vIHdoZW5ldmVyIHRoZSBwcm9jZXNzIG9mIGNoYW5naW5nIGEgc3RhdGUgYmVnaW5zLlxuICAgICRyb290U2NvcGUuJG9uKCckc3RhdGVDaGFuZ2VTdGFydCcsIGZ1bmN0aW9uIChldmVudCwgdG9TdGF0ZSwgdG9QYXJhbXMpIHtcblxuICAgICAgICBpZiAoIWRlc3RpbmF0aW9uU3RhdGVSZXF1aXJlc0F1dGgodG9TdGF0ZSkpIHtcbiAgICAgICAgICAgIC8vIFRoZSBkZXN0aW5hdGlvbiBzdGF0ZSBkb2VzIG5vdCByZXF1aXJlIGF1dGhlbnRpY2F0aW9uXG4gICAgICAgICAgICAvLyBTaG9ydCBjaXJjdWl0IHdpdGggcmV0dXJuLlxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKEF1dGhTZXJ2aWNlLmlzQXV0aGVudGljYXRlZCgpKSB7XG4gICAgICAgICAgICAvLyBUaGUgdXNlciBpcyBhdXRoZW50aWNhdGVkLlxuICAgICAgICAgICAgLy8gU2hvcnQgY2lyY3VpdCB3aXRoIHJldHVybi5cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENhbmNlbCBuYXZpZ2F0aW5nIHRvIG5ldyBzdGF0ZS5cbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcblxuICAgICAgICBBdXRoU2VydmljZS5nZXRMb2dnZWRJblVzZXIoKS50aGVuKGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgICAgICAgICAvLyBJZiBhIHVzZXIgaXMgcmV0cmlldmVkLCB0aGVuIHJlbmF2aWdhdGUgdG8gdGhlIGRlc3RpbmF0aW9uXG4gICAgICAgICAgICAvLyAodGhlIHNlY29uZCB0aW1lLCBBdXRoU2VydmljZS5pc0F1dGhlbnRpY2F0ZWQoKSB3aWxsIHdvcmspXG4gICAgICAgICAgICAvLyBvdGhlcndpc2UsIGlmIG5vIHVzZXIgaXMgbG9nZ2VkIGluLCBnbyB0byBcImxvZ2luXCIgc3RhdGUuXG4gICAgICAgICAgICBpZiAodXNlcikge1xuICAgICAgICAgICAgICAgICRzdGF0ZS5nbyh0b1N0YXRlLm5hbWUsIHRvUGFyYW1zKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJHN0YXRlLmdvKCdsb2dpbicpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgIH0pO1xuXG59KTtcbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG5cbiAgICAvLyBSZWdpc3RlciBvdXIgKmFib3V0KiBzdGF0ZS5cbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnYWJvdXQnLCB7XG4gICAgICAgIHVybDogJy9hYm91dCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdBYm91dENvbnRyb2xsZXInLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2Fib3V0L2Fib3V0Lmh0bWwnXG4gICAgfSk7XG5cbn0pO1xuXG5hcHAuY29udHJvbGxlcignQWJvdXRDb250cm9sbGVyJywgZnVuY3Rpb24gKCRzY29wZSkge1xuXG4gICAgLy8gJHNjb3BlLmltYWdlcyA9IF8uc2h1ZmZsZShzb21ldGhpbmcpO1xuXG59KTtcbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2RvY3MnLCB7XG4gICAgICAgIHVybDogJy9kb2NzJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9kb2NzL2RvY3MuaHRtbCdcbiAgICB9KTtcbn0pO1xuIiwiYXBwLmNvbmZpZygoJHN0YXRlUHJvdmlkZXIpID0+IHtcbiAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2hlbHAnLCB7XG4gICAgdXJsOiAnL2hlbHAnLFxuICAgIHRlbXBsYXRlVXJsOiAnanMvaGVscC9oZWxwLmh0bWwnXG4gIH0pXG59KVxuIiwiKGZ1bmN0aW9uICgpIHtcblxuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIC8vIEhvcGUgeW91IGRpZG4ndCBmb3JnZXQgQW5ndWxhciEgRHVoLWRveS5cbiAgICBpZiAoIXdpbmRvdy5hbmd1bGFyKSB0aHJvdyBuZXcgRXJyb3IoJ0kgY2FuXFwndCBmaW5kIEFuZ3VsYXIhJyk7XG5cbiAgICB2YXIgYXBwID0gYW5ndWxhci5tb2R1bGUoJ2ZzYVByZUJ1aWx0JywgW10pO1xuXG4gICAgYXBwLmZhY3RvcnkoJ1NvY2tldCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKCF3aW5kb3cuaW8pIHRocm93IG5ldyBFcnJvcignc29ja2V0LmlvIG5vdCBmb3VuZCEnKTtcbiAgICAgICAgcmV0dXJuIHdpbmRvdy5pbyh3aW5kb3cubG9jYXRpb24ub3JpZ2luKTtcbiAgICB9KTtcblxuICAgIC8vIEFVVEhfRVZFTlRTIGlzIHVzZWQgdGhyb3VnaG91dCBvdXIgYXBwIHRvXG4gICAgLy8gYnJvYWRjYXN0IGFuZCBsaXN0ZW4gZnJvbSBhbmQgdG8gdGhlICRyb290U2NvcGVcbiAgICAvLyBmb3IgaW1wb3J0YW50IGV2ZW50cyBhYm91dCBhdXRoZW50aWNhdGlvbiBmbG93LlxuICAgIGFwcC5jb25zdGFudCgnQVVUSF9FVkVOVFMnLCB7XG4gICAgICAgIGxvZ2luU3VjY2VzczogJ2F1dGgtbG9naW4tc3VjY2VzcycsXG4gICAgICAgIGxvZ2luRmFpbGVkOiAnYXV0aC1sb2dpbi1mYWlsZWQnLFxuICAgICAgICBsb2dvdXRTdWNjZXNzOiAnYXV0aC1sb2dvdXQtc3VjY2VzcycsXG4gICAgICAgIHNlc3Npb25UaW1lb3V0OiAnYXV0aC1zZXNzaW9uLXRpbWVvdXQnLFxuICAgICAgICBub3RBdXRoZW50aWNhdGVkOiAnYXV0aC1ub3QtYXV0aGVudGljYXRlZCcsXG4gICAgICAgIG5vdEF1dGhvcml6ZWQ6ICdhdXRoLW5vdC1hdXRob3JpemVkJ1xuICAgIH0pO1xuXG4gICAgYXBwLmZhY3RvcnkoJ0F1dGhJbnRlcmNlcHRvcicsIGZ1bmN0aW9uICgkcm9vdFNjb3BlLCAkcSwgQVVUSF9FVkVOVFMpIHtcbiAgICAgICAgdmFyIHN0YXR1c0RpY3QgPSB7XG4gICAgICAgICAgICA0MDE6IEFVVEhfRVZFTlRTLm5vdEF1dGhlbnRpY2F0ZWQsXG4gICAgICAgICAgICA0MDM6IEFVVEhfRVZFTlRTLm5vdEF1dGhvcml6ZWQsXG4gICAgICAgICAgICA0MTk6IEFVVEhfRVZFTlRTLnNlc3Npb25UaW1lb3V0LFxuICAgICAgICAgICAgNDQwOiBBVVRIX0VWRU5UUy5zZXNzaW9uVGltZW91dFxuICAgICAgICB9O1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcmVzcG9uc2VFcnJvcjogZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KHN0YXR1c0RpY3RbcmVzcG9uc2Uuc3RhdHVzXSwgcmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgIHJldHVybiAkcS5yZWplY3QocmVzcG9uc2UpXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfSk7XG5cbiAgICBhcHAuY29uZmlnKGZ1bmN0aW9uICgkaHR0cFByb3ZpZGVyKSB7XG4gICAgICAgICRodHRwUHJvdmlkZXIuaW50ZXJjZXB0b3JzLnB1c2goW1xuICAgICAgICAgICAgJyRpbmplY3RvcicsXG4gICAgICAgICAgICBmdW5jdGlvbiAoJGluamVjdG9yKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICRpbmplY3Rvci5nZXQoJ0F1dGhJbnRlcmNlcHRvcicpO1xuICAgICAgICAgICAgfVxuICAgICAgICBdKTtcbiAgICB9KTtcblxuICAgIGFwcC5zZXJ2aWNlKCdBdXRoU2VydmljZScsIGZ1bmN0aW9uICgkaHR0cCwgU2Vzc2lvbiwgJHJvb3RTY29wZSwgQVVUSF9FVkVOVFMsICRxLCBVc2VyKSB7XG5cbiAgICAgICAgZnVuY3Rpb24gb25TdWNjZXNzZnVsTG9naW4ocmVzcG9uc2UpIHtcbiAgICAgICAgICAgIHZhciBkYXRhID0gcmVzcG9uc2UuZGF0YTtcbiAgICAgICAgICAgIFNlc3Npb24uY3JlYXRlKGRhdGEuaWQsIGRhdGEudXNlcik7XG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3QoQVVUSF9FVkVOVFMubG9naW5TdWNjZXNzKTtcbiAgICAgICAgICAgIHJldHVybiBkYXRhLnVzZXI7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVc2VzIHRoZSBzZXNzaW9uIGZhY3RvcnkgdG8gc2VlIGlmIGFuXG4gICAgICAgIC8vIGF1dGhlbnRpY2F0ZWQgdXNlciBpcyBjdXJyZW50bHkgcmVnaXN0ZXJlZC5cbiAgICAgICAgdGhpcy5pc0F1dGhlbnRpY2F0ZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gISFTZXNzaW9uLnVzZXI7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5nZXRMb2dnZWRJblVzZXIgPSBmdW5jdGlvbiAoZnJvbVNlcnZlcikge1xuXG4gICAgICAgICAgICAvLyBJZiBhbiBhdXRoZW50aWNhdGVkIHNlc3Npb24gZXhpc3RzLCB3ZVxuICAgICAgICAgICAgLy8gcmV0dXJuIHRoZSB1c2VyIGF0dGFjaGVkIHRvIHRoYXQgc2Vzc2lvblxuICAgICAgICAgICAgLy8gd2l0aCBhIHByb21pc2UuIFRoaXMgZW5zdXJlcyB0aGF0IHdlIGNhblxuICAgICAgICAgICAgLy8gYWx3YXlzIGludGVyZmFjZSB3aXRoIHRoaXMgbWV0aG9kIGFzeW5jaHJvbm91c2x5LlxuXG4gICAgICAgICAgICAvLyBPcHRpb25hbGx5LCBpZiB0cnVlIGlzIGdpdmVuIGFzIHRoZSBmcm9tU2VydmVyIHBhcmFtZXRlcixcbiAgICAgICAgICAgIC8vIHRoZW4gdGhpcyBjYWNoZWQgdmFsdWUgd2lsbCBub3QgYmUgdXNlZC5cblxuICAgICAgICAgICAgaWYgKHRoaXMuaXNBdXRoZW50aWNhdGVkKCkgJiYgZnJvbVNlcnZlciAhPT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAkcS53aGVuKFNlc3Npb24udXNlcik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIE1ha2UgcmVxdWVzdCBHRVQgL3Nlc3Npb24uXG4gICAgICAgICAgICAvLyBJZiBpdCByZXR1cm5zIGEgdXNlciwgY2FsbCBvblN1Y2Nlc3NmdWxMb2dpbiB3aXRoIHRoZSByZXNwb25zZS5cbiAgICAgICAgICAgIC8vIElmIGl0IHJldHVybnMgYSA0MDEgcmVzcG9uc2UsIHdlIGNhdGNoIGl0IGFuZCBpbnN0ZWFkIHJlc29sdmUgdG8gbnVsbC5cbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5nZXQoJy9zZXNzaW9uJykudGhlbihvblN1Y2Nlc3NmdWxMb2dpbikuY2F0Y2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmxvZ2luID0gZnVuY3Rpb24gKGNyZWRlbnRpYWxzKSB7XG4gICAgICAgICAgICByZXR1cm4gJGh0dHAucG9zdCgnL2xvZ2luJywgY3JlZGVudGlhbHMpXG4gICAgICAgICAgICAgICAgLnRoZW4ob25TdWNjZXNzZnVsTG9naW4pXG4gICAgICAgICAgICAgICAgLmNhdGNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICRxLnJlamVjdCh7IG1lc3NhZ2U6ICdJbnZhbGlkIGxvZ2luIGNyZWRlbnRpYWxzLicgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5sb2dvdXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KCcvbG9nb3V0JykudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgU2Vzc2lvbi5kZXN0cm95KCk7XG4gICAgICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KEFVVEhfRVZFTlRTLmxvZ291dFN1Y2Nlc3MpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICB9KTtcblxuICAgIGFwcC5zZXJ2aWNlKCdTZXNzaW9uJywgZnVuY3Rpb24gKCRyb290U2NvcGUsIEFVVEhfRVZFTlRTKSB7XG5cbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLm5vdEF1dGhlbnRpY2F0ZWQsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHNlbGYuZGVzdHJveSgpO1xuICAgICAgICB9KTtcblxuICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5zZXNzaW9uVGltZW91dCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgc2VsZi5kZXN0cm95KCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMuaWQgPSBudWxsO1xuICAgICAgICB0aGlzLnVzZXIgPSBudWxsO1xuXG4gICAgICAgIHRoaXMuY3JlYXRlID0gZnVuY3Rpb24gKHNlc3Npb25JZCwgdXNlcikge1xuICAgICAgICAgICAgdGhpcy5pZCA9IHNlc3Npb25JZDtcbiAgICAgICAgICAgIHRoaXMudXNlciA9IHVzZXI7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5kZXN0cm95ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy5pZCA9IG51bGw7XG4gICAgICAgICAgICB0aGlzLnVzZXIgPSBudWxsO1xuICAgICAgICB9O1xuXG4gICAgfSk7XG5cbn0pKCk7XG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdob21lJywge1xuICAgICAgICB1cmw6ICcvJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9ob21lL2hvbWUuaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICgkc2NvcGUsIHVzZXJzLCByb3V0ZXMpID0+IHtcbiAgICAgICAgICAkc2NvcGUudXNlcnMgPSB1c2Vyc1xuICAgICAgICAgICRzY29wZS5yb3V0ZXMgPSByb3V0ZXNcblxuICAgICAgICAgIC8vIGNoZWNrIHdoZXRoZXIgdXNlciBhZ2VudCBpcyBydW5uaW5nIGNocm9tZVxuICAgICAgICAgICRzY29wZS5oYXNDaHJvbWUgPSAoKSA9PiBuYXZpZ2F0b3IudXNlckFnZW50LnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoJ2Nocm9tZScpXG4gICAgICAgIH0sXG4gICAgICAgIHJlc29sdmU6IHtcbiAgICAgICAgICB1c2VyczogKFVzZXIpID0+IFVzZXIuZmluZEFsbCh7fSwgeyBieXBhc3NDYWNoZTogdHJ1ZSB9KSxcbiAgICAgICAgICByb3V0ZXM6IChSb3V0ZSkgPT4gUm91dGUuZmluZEFsbCh7fSwgeyBieXBhc3NDYWNoZTogdHJ1ZSB9KVxuICAgICAgICB9XG4gICAgfSk7XG59KTtcbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG5cbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnbG9naW4nLCB7XG4gICAgICAgIHVybDogJy9sb2dpbicsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvbG9naW4vbG9naW4uaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdMb2dpbkN0cmwnXG4gICAgfSk7XG5cbn0pO1xuXG5hcHAuY29udHJvbGxlcignTG9naW5DdHJsJywgZnVuY3Rpb24gKCRzY29wZSwgQXV0aFNlcnZpY2UsICRzdGF0ZSkge1xuXG4gICAgJHNjb3BlLmxvZ2luID0ge307XG4gICAgJHNjb3BlLmVycm9yID0gbnVsbDtcblxuICAgICRzY29wZS5zZW5kTG9naW4gPSBmdW5jdGlvbiAobG9naW5JbmZvKSB7XG5cbiAgICAgICAgJHNjb3BlLmVycm9yID0gbnVsbDtcblxuICAgICAgICBBdXRoU2VydmljZS5sb2dpbihsb2dpbkluZm8pLnRoZW4oZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgICAgICRzdGF0ZS5nbygndXNlcicsIHsgaWQ6IHVzZXIuX2lkIH0pO1xuICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAkc2NvcGUuZXJyb3IgPSAnSW52YWxpZCBsb2dpbiBjcmVkZW50aWFscy4nO1xuICAgICAgICB9KTtcblxuICAgIH07XG5cbn0pO1xuIiwiYXBwLmNvbmZpZygoJHN0YXRlUHJvdmlkZXIpID0+IHtcbiAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ3VzZXInLCB7XG4gICAgdXJsOiAnLzppZC9wcm9maWxlJyxcbiAgICB0ZW1wbGF0ZVVybDogJ2pzL3VzZXJfcHJvZmlsZS91c2VyX3Byb2ZpbGUuaHRtbCcsXG4gICAgY29udHJvbGxlcjogKCRzY29wZSwgdXNlcikgPT4ge1xuICAgICAgJHNjb3BlLnVzZXIgPSB1c2VyXG4gICAgICBjb25zb2xlLmxvZyhgbG9hZGVkIHVzZXIgcHJvZmlsZSBwYWdlIGZvciAke3VzZXIubmFtZX1gKVxuICAgICAgY29uc29sZS5sb2codXNlcilcbiAgICB9LFxuICAgIHJlc29sdmU6IHtcbiAgICAgIHVzZXI6ICgkc3RhdGVQYXJhbXMsIFVzZXIpID0+IFVzZXIuZmluZCgkc3RhdGVQYXJhbXMuaWQpXG4gICAgfVxuICB9KVxufSlcbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG5cbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnbWVtYmVyc09ubHknLCB7XG4gICAgICAgIHVybDogJy9tZW1iZXJzLWFyZWEnLFxuICAgICAgICB0ZW1wbGF0ZTogJycsXG4gICAgICAgIGNvbnRyb2xsZXI6IGZ1bmN0aW9uICgkc2NvcGUpIHt9LFxuXG4gICAgICAgIC8vIFRoZSBmb2xsb3dpbmcgZGF0YS5hdXRoZW50aWNhdGUgaXMgcmVhZCBieSBhbiBldmVudCBsaXN0ZW5lclxuICAgICAgICAvLyB0aGF0IGNvbnRyb2xzIGFjY2VzcyB0byB0aGlzIHN0YXRlLiBSZWZlciB0byBhcHAuanMuXG4gICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgIGF1dGhlbnRpY2F0ZTogdHJ1ZVxuICAgICAgICB9XG4gICAgfSk7XG5cbn0pO1xuIiwiYXBwLmZhY3RvcnkoJ1JvdXRlJywgKCRzdGF0ZSwgRFMpID0+IHtcblxuICBsZXQgUm91dGUgPSBEUy5kZWZpbmVSZXNvdXJjZSh7XG4gICAgbmFtZTogJ3JvdXRlJyxcbiAgICBlbmRwb2ludDogJ3JvdXRlcycsXG4gICAgcmVsYXRpb25zOiB7XG4gICAgICBiZWxvbmdzVG86IHtcbiAgICAgICAgdXNlcjoge1xuICAgICAgICAgIC8vIGxvY2FsIGZpZWxkIGlzIGZvciBsaW5raW5nIHJlbGF0aW9uc1xuICAgICAgICAgIC8vIHJvdXRlLnVzZXIgLT4gdXNlcihvd25lcikgb2YgdGhlIHJvdXRlXG4gICAgICAgICAgbG9jYWxGaWVsZDogJ3VzZXInLFxuICAgICAgICAgIC8vIGxvY2FsIGtleSBpcyB0aGUgXCJqb2luXCIgZmllbGRcbiAgICAgICAgICAvLyB0aGUgbmFtZSBvZiB0aGUgZmllbGQgb24gdGhlIHJvdXRlIHRoYXQgcG9pbnRzIHRvIGl0cyBwYXJlbnQgdXNlclxuICAgICAgICAgIGxvY2FsS2V5OiAndXNlcktleScsXG4gICAgICAgICAgcGFyZW50OiB0cnVlXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIG1ldGhvZHM6IHtcbiAgICAgIGdvOiBmdW5jdGlvbigpIHtcbiAgICAgICAgY29uc29sZS5sb2coYHRyYW5zaXRpb25pbmcgdG8gcm91dGUgc3RhdGUgKCR7dGhpcy5uYW1lfSwgJHt0aGlzLl9pZH0pYClcbiAgICAgIH1cbiAgICB9XG4gIH0pXG5cbiAgcmV0dXJuIFJvdXRlXG59KVxuLnJ1bihSb3V0ZSA9PiB7fSlcbiIsImFwcC5mYWN0b3J5KCdVc2VyJywgKCRzdGF0ZSwgRFMpID0+IHtcblxuICBsZXQgVXNlciA9IERTLmRlZmluZVJlc291cmNlKHtcbiAgICBuYW1lOiAndXNlcicsXG4gICAgZW5kcG9pbnQ6ICd1c2VycycsXG4gICAgcmVsYXRpb25zOiB7XG4gICAgICBoYXNNYW55OiB7XG4gICAgICAgIHJvdXRlOiB7XG4gICAgICAgICAgLy8gbG9jYWwgZmllbGQgaXMgZm9yIGxpbmtpbmcgcmVsYXRpb25zXG4gICAgICAgICAgLy8gdXNlci5yb3V0ZXMgLT4gYXJyYXkgb2Ygcm91dGVzIGZvciB0aGUgdXNlclxuICAgICAgICAgIGxvY2FsRmllbGQ6ICdyb3V0ZXMnLFxuICAgICAgICAgIC8vIGZvcmVpZ24ga2V5IGlzIHRoZSAnam9pbicgZmllbGRcbiAgICAgICAgICAvLyB0aGUgbmFtZSBvZiB0aGUgZmllbGQgb24gYSByb3V0ZSB0aGF0IHBvaW50cyB0byBpdHMgcGFyZW50IHVzZXJcbiAgICAgICAgICBmb3JlaWduS2V5OiAndXNlcktleSdcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG5cbiAgICAvLyBmdW5jdGlvbmFsaXR5IGFkZGVkIHRvIGV2ZXJ5IGluc3RhbmNlIG9mIFVzZXJcbiAgICBtZXRob2RzOiB7XG4gICAgICBnbzogZnVuY3Rpb24oKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKGB0cmFuc2l0aW9uaW5nIHRvIHVzZXIgc3RhdGUgKCR7dGhpcy5uYW1lfSwgJHt0aGlzLl9pZH0pYClcbiAgICAgICAgJHN0YXRlLmdvKCd1c2VyJywgeyBpZDogdGhpcy5faWQgfSlcbiAgICAgIH1cbiAgICB9XG4gIH0pXG5cbiAgcmV0dXJuIFVzZXJcbn0pXG4ucnVuKFVzZXIgPT4ge30pXG4iLCJhcHAuZGlyZWN0aXZlKCduYXZiYXInLCBmdW5jdGlvbiAoJHJvb3RTY29wZSwgJHN0YXRlLCBBdXRoU2VydmljZSwgQVVUSF9FVkVOVFMsIFVzZXIpIHtcblxuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHNjb3BlOiB7fSxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9jb21tb24vZGlyZWN0aXZlcy9uYXZiYXIvbmF2YmFyLmh0bWwnLFxuICAgICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUpIHtcblxuICAgICAgICAgICAgc2NvcGUuaXRlbXMgPSBbXG4gICAgICAgICAgICAgICAgLy8geyBsYWJlbDogJ0hvbWUnLCBzdGF0ZTogJ2hvbWUnIH0sXG4gICAgICAgICAgICAgICAgeyBsYWJlbDogJ0RvY3VtZW50YXRpb24nLCBzdGF0ZTogJ2RvY3MnIH0sXG4gICAgICAgICAgICAgICAgeyBsYWJlbDogJ0Fib3V0Jywgc3RhdGU6ICdhYm91dCcgfSxcbiAgICAgICAgICAgICAgICB7IGxhYmVsOiAnSGVscCcsIHN0YXRlOiAnaGVscCcgfSxcbiAgICAgICAgICAgICAgICAvL3sgbGFiZWw6ICdNZW1iZXJzIE9ubHknLCBzdGF0ZTogJ21lbWJlcnNPbmx5JywgYXV0aDogdHJ1ZSB9XG4gICAgICAgICAgICBdO1xuXG4gICAgICAgICAgICBzY29wZS51c2VyID0gbnVsbDtcblxuICAgICAgICAgICAgc2NvcGUuaXNMb2dnZWRJbiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gQXV0aFNlcnZpY2UuaXNBdXRoZW50aWNhdGVkKCk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBzY29wZS5sb2dvdXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgQXV0aFNlcnZpY2UubG9nb3V0KCkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgJHN0YXRlLmdvKCdob21lJyk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB2YXIgc2V0VXNlciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBBdXRoU2VydmljZS5nZXRMb2dnZWRJblVzZXIoKVxuICAgICAgICAgICAgICAgICAgLnRoZW4odXNlciA9PiBVc2VyLmZpbmQodXNlci5faWQpKVxuICAgICAgICAgICAgICAgICAgLnRoZW4odXNlciA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHNjb3BlLnVzZXIgPSB1c2VyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB1c2VyXG4gICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdmFyIHJlbW92ZVVzZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgc2NvcGUudXNlciA9IG51bGw7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBzZXRVc2VyKCk7XG5cbiAgICAgICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLmxvZ2luU3VjY2Vzcywgc2V0VXNlcik7XG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5sb2dvdXRTdWNjZXNzLCByZW1vdmVVc2VyKTtcbiAgICAgICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLnNlc3Npb25UaW1lb3V0LCByZW1vdmVVc2VyKTtcblxuICAgICAgICB9XG5cbiAgICB9O1xuXG59KTtcbiIsImFwcC5kaXJlY3RpdmUoJ25vZGVtb25vTG9nbycsIGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2NvbW1vbi9kaXJlY3RpdmVzL25vZGVtb25vLWxvZ28vbm9kZW1vbm8tbG9nby5odG1sJyxcbiAgICAgICAgbGluazogKHNjb3BlLCBlbGVtLCBhdHRyKSA9PiB7XG5cbiAgICAgICAgICBzY29wZS5pbnN0YWxsQ2hyb21lRXh0ID0gKCkgPT4ge1xuICAgICAgICAgICAgY29uc29sZS5sb2coYGluc3RhbGxpbmcgTm9kZW1vbm8gY2hyb21lIGV4dGVuc2lvbi4uLmApXG4gICAgICAgICAgfVxuXG4gICAgICAgIH1cbiAgICB9O1xufSk7XG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=