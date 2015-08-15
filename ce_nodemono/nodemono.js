//import CSS library
importCSS(chrome.extension.getURL("css/style.css"));
importCSS(chrome.extension.getURL("css/bootstrap.min.css"))
importCSS(chrome.extension.getURL("selectorgadget/selectorgadget_combined.css"))


// //import Jquery library and selectorgadget
// importJS(chrome.extension.getURL("jquery.min.js"))
// console.log(jQuery);
// jQuery.noConflict();
// importJS(chrome.extension.getURL("selectorgadget/diff_match_patch.js"))
// importJS(chrome.extension.getURL("selectorgadget/dom.js"))
// importJS(chrome.extension.getURL("selectorgadget/interface.js"))

//load selectorgadget combined
// importJS(chrome.extension.getURL("selectorgadget/selectorgadget_combined.js"))

//load our js

importJS(chrome.extension.getURL("main.js"));

//initiating selectorgadget
// window.selector_gadget = new SelectorGadget();
// var SG = window.selector_gadget;
// console.log(jQuerySG);


// var path = jQuerySG('<input>', {
// 	id: 'sg-status',
// 	class: 'selectorgadget_ignore'
// })
// SG.sg_div = jQuerySG('<div>').attr('id', 'selectorgadget_main').addClass('selectorgadget_bottom').addClass('selectorgadget_ignore');
// SG.sg_div.append(path)
// SG.path_output_field = path.get(0)

// var val = saved = path.val()
// var tid = setInterval(function() {
// 	val = path.val()
// 	if (saved != val) {
// 		console.log('New path', val, 'matching', (jQuerySG(val).length), 'element(s)')
// 		saved = val
// 	}
// }, 50)

// SG.makeInterface();
// SG.clearEverything();
// SG.setMode('interactive');
// var path = jQuerySG('<input>', {
// 	id: 'selectorgadget_path_field',
// 	class: 'selectorgadget_ignore selectorgadget_input_field'
// });


// console.log('saved', saved);
// var tid = setInterval(function() {
// val = $("selectorgadget_path_field").val();
// console.log(val);
// console.log(SG.path_output_field.value);
// if (saved != val) {
// 	console.log('New path', val, 'matching', (jQuerySG(val).length), 'element(s)')
// 	saved = val
// }
// }, 500)

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
		.controller('NodemonoMainCtrl', function($scope) {
			$scope.collection = {};
			console.log('go here')
			// this.message = "Hello";

		})
		.controller('ToolbarCtrl', function MyCtrl($scope) {
			// $scope.property = "property1"
			// var tid = setInterval(function() {

			// 	$scope.property = SG.path_output_field.value

			// }, 500);

			$scope.buttonClicked = function() {
				// console.log($scope.collection);

				$('#addProperty').before('<button class="btn btn-default btn-circle" ng-click="selectCollection()" >1</button>');

			}
			$scope.selectCollection = function() {

			}

			$scope.doneClicked = function() {

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
		.controller('ToolbarCtrl', function MyCtrl($scope, Collection, $rootScope) {
			// $scope.property = "property1"
			// var tid = setInterval(function() {

			// 	$scope.property = SG.path_output_field.value

			// }, 500);

			$scope.buttonClicked = function() {
				// console.log($scope.collection);
				$rootScope.collection = {
					property: SG.path_output_field.value
				};
				$('#addProperty').before('<button class="btn btn-default btn-circle" ng-click="selectCollection()" >1</button>');

			}
			$scope.selectCollection = function() {

			}

			$scope.doneClicked = function() {

			}
		})
		.controller("OverlayCtrl", function($scope) {

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