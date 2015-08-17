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
			.module('myApp', [])
			.factory("User", function($http) {
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
			.controller("OverlayCtrl", function($scope, User) {
				$scope.showLogin = true;
				$scope.toggleLogin = function() {
					$scope.showLogin = $scope.showLogin === true ? false : true;
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