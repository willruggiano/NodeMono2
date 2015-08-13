// var html = chrome.extension.getURL('kimono-toolbar.html', function(data) {
// 	console.log(data);
// });
// console.log(html);
// $("body").prepend('<div class="nodemonoToolbar">Test</div>');
// $("body").prepend('<div class="navbar-header"><a class="navbar-brand" href="#">nodemono</a></div>');
// console.log($("body"))
// console.log($("body"));

//inject angular library
// var ang = document.createElement("script");
// ang.setAttribute("scr", "https://ajax.googleapis.com/ajax/libs/angularjs/1.3.15/angular.min.js")
// document.getElementsByTagName("head")[0].appendChild(ang);
//create link element contain some custom styles

importCSS(chrome.extension.getURL("css/style.css"));
importCSS(chrome.extension.getURL("css/bootstrap.min.css"))
importCSS(chrome.extension.getURL("selectorgadget/selectorgadget.css"))
importJS(chrome.extension.getURL("jquery.min.js"))
console.log(jQuery);
jQuery.noConflict();
importJS(chrome.extension.getURL("selectorgadget/diff_match_patch.js"))
importJS(chrome.extension.getURL("selectorgadget/dom.js"))
// importJS(chrome.extension.getURL("selectorgadget/dom.js"))
importJS(chrome.extension.getURL("selectorgadget/interface.js"))

function transformHtml() {
	// $
}

// window.selectorgadget = new SelectorGadget();
// console.log(window.selectorgadget);
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
			$scope.property = "property1"
			$scope.buttonClicked = function() {
				// console.log($scope.collection);
				$('#addProperty').before('<button class="btn btn-default btn-circle" ng-click="selectCollection()" >1</button>');

				$('a').filter(function(element) {
					return element.href !== "";
				}).forEach(function(element) {
					$()
				});
			}
			$scope.selectCollection = function() {

			}
		});

	/* Manually bootstrap the Angular app */
	window.name = '';
	// To allow `bootstrap()` to continue normally
	angular.bootstrap(appRoot, ['myApp']);
	// console.log(angular);
	console.log('Boot and loaded !');
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