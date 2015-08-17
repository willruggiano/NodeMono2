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
		.module('myApp', [])
		.controller('NodemonoMainCtrl', function($scope) {
			$scope.collection = {};
			console.log('go here')
				// this.message = "Hello";

		})
		.controller('ToolbarCtrl', function MyCtrl($scope) {

			$scope.currentProperty = {};

			$scope.selectCollection = function() {

			}

			$scope.doneClicked = function() {

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
		.factory("User", function($http) {
			function User(props) {
				angular.extend(this, props)
				return this
			}

			User.url = '/api/users/';
			return User;


		});

	/* Manually bootstrap the Angular app */
	window.name = '';
	// To allow `bootstrap()` to continue normally
	angular.bootstrap(appRoot, ['myApp']);
	// console.log(angular);
	console.log('Angularjs Boot and loaded !');
});


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