function startNodemono() {
	//import CSS library
	importCSS(chrome.extension.getURL("css/bootstrap.min.css"))
	// importCSS(chrome.extension.getURL("sgadget/selectorgadget_combined.css"))
	importCSS(chrome.extension.getURL("css/style.css"));

	importJS(chrome.extension.getURL('js/main.js'));

	$.get(chrome.extension.getURL('html/kimono-toolbar.html'), function(data) {

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
		app.factory("User", function($http) {
			function User(props) {
				angular.extend(this, props)
				return this
			}

			User.url = '/api/users/';

			Object.defineProperty(User.prototype, 'url', {
				get: function() {
					return User.url + this._id
				}
			})
			User.prototype.isNew = function() {
				return !this._id
			};

			User.prototype.fetch = function() {
				return $http.get(this.url)
					.then(function(res) {
						return res.data;
					})
			};

			User.prototype.save = function() {
				var verb
				var url
				if (this.isNew()) {
					verb = 'post'
					url = User.url
				} else {
					verb = 'put'
					url = this.url
				}
				return $http[verb](url, this)
					.then(function(res) {
						return res.data
					})
			}
			User.prototype.destroy = function() {
				return $http.delete(this.url)
			}

			return User;


		})
			.controller('NodemonoMainCtrl', function($scope) {
				$scope.collection = {};
				console.log('go here')
				// this.message = "Hello";

			})
			.controller('ToolbarCtrl', function MyCtrl($scope, $rootScope) {
				$rootScope.showCollectionOverlay = false;
				$scope.currentProperty = {};

				// 			$scope.buttonClicked = function() {
				// 	$('#addProperty').before('<button class="btn btn-default btn-circle" ng-click="selectCollection()" >1</button>');

				// }
				$scope.selectCollection = function() {

				}

				$scope.doneClicked = function() {
					$rootScope.showCollectionOverlay = $rootScope.showCollectionOverlay === true ? false : true;
				}

				$scope.selectCollection = function() {

				}

				$scope.doneClicked = function() {
					$rootScope.showCollectionOverlay = $rootScope.showCollectionOverlay === true ? false : true;
				}
				//cancel 
				$scope.cancel = function() {
					//reset currentProperty
					$scope.currentProperty = {};

					//change stylings on DOM
					for (var i = 0; i < $scope.matchList.length; i++) {
						$scope.matchList[i].style['background-color'] = 'yellow';
					}
					$scope.targetElement.style['background-color'] = '#00ff00';

					//hide/show toolbar elements
					console.log(document.getElementById('oneButton').className)
					document.getElementById('backButton').className = 'hide'
					document.getElementById('oneButton').className = 'show'
					document.getElementById('allButton').className = 'show'

					//allow clicks on webpage
					$scope.overlay.id = '';
				}


				//chose 'One'
				$scope.oneBtnClick = function() {

					//set properties of the currentProperty
					$scope.currentProperty['selector'] = $scope.selector;
					$scope.currentProperty['indecies'] = $scope.matchList.indexOf($scope.targetElement);

					//change stylings on DOM
					for (var i = 0; i < $scope.matchList.length; i++) {
						$scope.matchList[i].style['background-color'] = '';
					}
					$scope.targetElement.style['background-color'] = '#00ff00';

					//hide/show toolbar elements
					document.getElementById('backButton').className = 'show'
					document.getElementById('oneButton').className = 'hide'
					document.getElementById('allButton').className = 'hide'
					document.getElementById('greenAttrSelector').className = 'show'

					//block clicks on webpage
					$scope.overlay.id = 'cover';
				}

				//chose 'All'
				$scope.allBtnClick = function() {
					//set currentProperty
					$scope.currentProperty['selector'] = $scope.selector;
					$scope.currentProperty['indecies'] = [];

					//change stylings on DOM
					$scope.targetElement.style['background-color'] = '#ffff00'

					//hide/show toolbar elements
					document.getElementById('backButton').className = 'show'
					document.getElementById('oneButton').className = 'hide'
					document.getElementById('allButton').className = 'hide'
					document.getElementById('yellowAttrSelector').className = 'show'

					//block all clicks on webpage
					$scope.overlay.id = 'cover';

				}

				//chose desired attribute
				$scope.selectedAttr = function(attr) {
					//set currentProperty
					$scope.currentProperty['attribute'] = attr;

					//hide/show toolbar elements
					document.getElementById('greenAttrSelector').className = 'hide'
					document.getElementById('yellowAttrSelector').className = 'hide'
					document.getElementById('saveBtn') = 'show'
					document.getElementById('nameInput') = 'show'
				}

				$scope.save = function() {
					//save the property to this route

					//reset the DOM
					//reset currentProperty
					$scope.currentProperty = {};

					//change stylings on DOM
					for (var i = 0; i < $scope.matchList.length; i++) {
						$scope.matchList[i].style['background-color'] = '';
					}

					//hide all toolbar elements
					document.getElementById('backButton').id = 'hide'
					document.getElementById('oneButton').className = 'hide'
					document.getElementById('allButton').className = 'hide'


					//allow clicks on webpage
					$scope.overlay.id = '';
				}

				setUpDom($scope);

			})
			.factory("Collection", function($http, $scope, $rootScope) {
				function Collection(props) {
					angular.extend(this, props);
					return this;

				};

				Collection.clearEverything = function() {
					$rootScope.collection = {};
				}

				return Collection;
			})
			.controller("OverlayCtrl", function($scope, $http, User, AuthService, $rootScope) {
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
				$scope.Depths = [{
					Id: "1",
					text: "10 pages max"
				}, {
					Id: "2",
					text: "15 pages max"
				}, {
					Id: "3",
					text: "25 pages max"
				}];
				$scope.route.frequency = $scope.Frequencies[0];

				$scope.pagination = true;
				if ($scope.pagination) {
					$scope.route.depth = $scope.Depths[0];
				}
				$scope.toggleLogin = function() {
					console.log('hello0')
					$scope.showLogin = $scope.showLogin === true ? false : true;
				}
				$scope.sendLogin = function(user) {
					console.log(user)
					AuthService.login(user)
						.then(function(user) {
							console.log(user)
							$rootScope.user = user;
						}).
					catch (function() {
						$scope.error = "Invalid credentials";
					});
				};

				$scope.createNewRoute = function() {
					console.log($rootScope.user)
				}

			});

		/* Manually bootstrap the Angular app */
		window.name = '';
		// To allow `bootstrap()` to continue normally
		angular.bootstrap(appRoot, ['myApp']);
		// console.log(angular);
		console.log('Angularjs Boot and loaded !');
	})
}

function importJS(src) {
	var script = document.createElement("script");
	script.setAttribute("type", "text/javascript");
	script.setAttribute("src", src);
	document.getElementsByTagName("head")[0].appendChild(script);

	// $('head').appendChild(script);
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
			catch (function() {
				return null;
			});

		};

		this.login = function(credentials) {
			return $http.post(AUTH_EVENTS.serverUrl + '/login', credentials)
				.then(onSuccessfulLogin)
				.
			catch (function() {
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
			catch (function() {
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