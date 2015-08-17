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


		}).factory("Collection", function($http, $scope, $rootScope) {
			function Collection(props) {
				angular.extend(this, props);
				return this;

			};

			Collection.clearEverything = function() {
				$rootScope.collection = {};
			}

			return Collection;
		}).controller('NodemonoMainCtrl', function($scope) {
			$scope.collection = {};
			console.log('go here')
			// this.message = "Hello";

		}).controller('ToolbarCtrl', function MyCtrl($scope, $rootScope) {
			$scope.property = "property1";
			$rootScope.showCollectionOverlay = false;
			// var tid = setInterval(function() {

			// 	$scope.property = SG.path_output_field.value

			// }, 500);

			var currentProperty;

			$scope.buttonClicked = function() {
				// console.log($scope.collection);

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
			$scope.toggleLogin = function() {
				$scope.showLogin = $scope.showLogin === true ? false : true;
			}
			$scope.sendLogin = function(user) {
				console.log(user);
				console.log(AuthService);
				AuthService.login(user)
					.then(function(user) {
						$rootScope.user = user;
					}).
				catch (function() {
					$scope.error = "Invalid credentials";
				});
			};
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

	function getNodeSelectorString(node) {
		//tagString
		var tagName = node.tagName;
		//idString
		var id = '';
		if (node.id) {
			id = '#' + node.id;
		}
		//classString
		var classString = '';
		if (node.className) {
			var classes = node.className.split(/\s+/);
			classes.forEach(function(classStr) {
				classString = classString + '.' + classStr;
			})
		}

		return tagName + id + classString;
	}

	function getSelector(baseNode, startString) {
		if (!startString) {
			startString = ''
		}
		startString = getNodeSelectorString(baseNode) + startString;

		if (baseNode.tagName.toLowerCase() === 'body' || baseNode.parentNode == undefined) {
			return startString;
		} else {
			return getSelector(baseNode.parentNode, ' > ' + startString);
		}

	}

	function isDescendant(parent, child) {
		var node = child.parentNode;
		while (node != null) {
			if (node == parent) {
				return true;
			}
			node = node.parentNode;
		}
		return false;
	}


	//____________________________________DOM setup______________________________

	//set up document for nodemono
	var allEls = document.getElementsByTagName('*');
	//list holds all the elements that match the general query
	var list = [];
	//targetElement is the element in particular that was clicked
	var targetElement;
	var selector = '';
	for (var i = 0; i < allEls.length; i++) {
		//remove hrefs from all elements and put on each element an on click method that runs the getSelector for it
		var element = allEls[i];
		if (isDescendant(document.getElementsByTagName('body')[0], element)) {
			element.addEventListener("click", function(event) {
				//make click only be for most specific element (most likely to have text)
				event.preventDefault();
				event.stopPropagation();
				targetElement = event.target || event.srcElement;
				selector = getSelector(targetElement);
				//remove all the stylings from the previous list
				for (var i = 0; i < list.length; i++) {
					list[i].style['background-color'] = '';
				}

				//set the color of all objects that matched the query selector to green
				list = document.querySelectorAll(selector);
				for (var i = 0; i < list.length; i++) {
					list[i].style['background-color'] = '#ffff00';
				}
				//set the color of the targetedElement to red
				targetElement.style['background-color'] = '#00ff00';

				//change the toolbar so that the user can choose to save 'One' or 'All'
				if (targetElement) {
					document.getElementById('oneButton').className = 'show ';
					if (list.length > 0) {
						document.getElementById('allButton').className = 'show'
					}
				}

			});
		}
	}
};

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