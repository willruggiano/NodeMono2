function startNodemono() {
	//import CSS library
	importCSS(chrome.extension.getURL("css/style.css"));
	importCSS(chrome.extension.getURL("css/bootstrap.min.css"))
	importCSS(chrome.extension.getURL("selectorgadget/selectorgadget_combined.css"))

	$.get(chrome.extension.getURL('kimono-toolbar.html'), function(data) {
		// console.log(data);
		// $(data).appendTo('body');
		// $(data).prependTo('body').first();

		//create a div with ngNonBindable property to prevent automatically bootstrap angular;
		var div = document.createElement('div');
		div.dataset.ngNonBindable = '';

		var appRoot = document.createElement('div');
		appRoot.dataset.ngController = 'NodemonoMainCtrl as ctrl';

		appRoot.id = "nodemonofy"
			// Insert elements into the DOM
			// document.body.pre(div);
		$(div).prependTo('body')
		div.appendChild(appRoot);
		$(data).appendTo('#nodemonofy');

		window.app = angular
			.module('myApp', []);
		registerAuthService();

		app.controller('NodemonoMainCtrl', function($scope) {
			$scope.collection = {};
			console.log('go here')
				// this.message = "Hello";

		}).controller('ToolbarCtrl', function MyCtrl($scope, $rootScope) {
			$rootScope.showCollectionOverlay = false;
			var currentProperty;

			$scope.buttonClicked = function() {
				$('#addProperty').before('<button class="btn btn-default btn-circle" ng-click="selectCollection()" >1</button>');

			}
			$scope.selectCollection = function() {

			}

			$scope.doneClicked = function() {
				$rootScope.showCollectionOverlay = $rootScope.showCollectionOverlay === true ? false : true;
			}


			//chose 'One'
			$scope.greenBtnClick = function() {
					var i = 0;
					while ((child = child.previousSibling) != null) {
						i++;
					}
					var nthChildSel = ':nth-child(' + i + ')'
					currentProperty['selector'] = selector + nthChildSel;
					console.log('modSelector:', currentProperty['selector'])
						//remove all the stylings from the previous list
					for (var i = 0; i < list.length; i++) {
						list[i].style['background-color'] = '';
					}
					list = [];
					targetElement.style['background-color'] = '#00ff00';
					document.getElementById('oneButton').className = 'hide'
					document.getElementById('allButton').className = 'hide'
					document.getElementById('greenAttrSelector').className = 'show'
				}
				//chose 'All'
			$scope.yellowBtnClick = function() {
					currentProperty['selector'] = selector;
					$scope.targetElement = undefined;
					$scope.targetElement.style['background-color'] = '#ffff00'
					document.getElementyId('yellowAttrSelector').className = 'show'
				}
				//chose desired attribute
			$scope.selectedAttr = function(attr) {
				currentProperty['attribute'] = attr;
				document.getElementById('greenAttrSelector').className = 'hide'
				document.getElementyId('yellowAttrSelector').className = 'hide'
				document.getElementById('saveBtn') = 'show'
				document.getElementById('nameInput') = 'show'
			}
			$scope.save = function() {
				currentProperty['name'] = $scope.propName;
				//save the property to this route
			}

		}).controller("OverlayCtrl", function($scope, $http, User, AuthService, $rootScope) {
			$scope.showLogin = true;
			$scope.error = null;
			$scope.route = {};
			$scope.Frequencies = [{
				Id: "1",
				text: "Manual Crawl"
			}, {
				Id: "2",
				text: "Every 15 minutes"
			}, {
				Id: "3",
				text: "Every 30 minutes"
			}, {
				Id: "4",
				text: "Daily"
			}, {
				Id: "5",
				text: "Weekly"
			}, {
				Id: "6",
				text: "Monthly"
			}];
			$scope.route.frequency = $scope.Frequencies[0];
			$scope.toggleLogin = function() {
				$scope.showLogin = $scope.showLogin === true ? false : true;
			}
			$scope.sendLogin = function(user) {
				AuthService.login(user)
					.then(function(user) {
						$rootScope.user = user;
					}).
				catch(function() {
					$scope.error = "Invalid credentials";
				});
			};

			$scope.createNewRoute = function() {
				console.log($scope.route)
			}

		});

		/* Manually bootstrap the Angular app */
		window.name = '';
		// To allow `bootstrap()` to continue normally
		angular.bootstrap(appRoot, ['myApp']);
		// console.log(angular);
		// console.log('Angularjs Boot and loaded !');
	});



	function importJS(src) {
		var script = document.createElement("script");
		script.setAttribute("type", "text/javascript");
		script.setAttribute("src", src);
		document.getElementsByTagName("head")[0].appendChild(script);
	}

	function importCSS(href) {
		var css = document.createElement("link");
		css.setAttribute("rel", "stylesheet");
		css.setAttribute("type", "text/css");
		css.setAttribute("href", href);
		document.getElementsByTagName("head")[0].appendChild(css);
	}

	if (!document.getElementById('nodemonofy')) {
		startNodemono();
		// console.log(!$("#nodemonofy"));
	} else {
		console.log('Nodemono\' already started');
	}



	function registerAuthService() {
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
			notAuthorized: 'auth-not-authorized',
			serverUrl: '//localhost:1337'
		});

		app.factory('AuthInterceptor', function($rootScope, $q, AUTH_EVENTS) {
			var statusDict = {
				401: AUTH_EVENTS.notAuthenticated,
				403: AUTH_EVENTS.notAuthorized,
				419: AUTH_EVENTS.sessionTimeout,
				440: AUTH_EVENTS.sessionTimeout
			};
			return {
				responseError: function(response) {
					$rootScope.$broadcast(statusDict[response.status], response);
					return $q.reject(response)
				}
			};
		});

		app.config(function($httpProvider) {
			$httpProvider.interceptors.push([
				'$injector',
				function($injector) {
					return $injector.get('AuthInterceptor');
				}
			]);
			$httpProvider.defaults.useXDomain = true;
			delete $httpProvider.defaults.headers.common['X-Requested-With'];
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
				return $http.get(AUTH_EVENTS.serverUrl + '/session').then(onSuccessfulLogin).
				catch(function() {
					return null;
				});

			};

			this.login = function(credentials) {
				return $http.post(AUTH_EVENTS.serverUrl + '/login', credentials)
					.then(onSuccessfulLogin)
					.
				catch(function() {
					return $q.reject({
						message: 'Invalid login credentials.'
					});
				});
			};

			this.logout = function() {
				return $http.get(AUTH_EVENTS.serverUrl + '/logout').then(function() {
					Session.destroy();
					$rootScope.$broadcast(AUTH_EVENTS.logoutSuccess);
				});
			};


			//added function for signup process
			//what's Q for?
			this.signup = function(credentials) {
				console.log(credentials)
				return $http.post(AUTH_EVENTS.serverUrl + '/signup', credentials)
					.then(onSuccessfulLogin)
					.
				catch(function() {
					return $q.reject({
						message: 'Invalid login credentials.'
					});
				})
			}

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
	}