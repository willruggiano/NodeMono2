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
var css = document.createElement("link");
css.setAttribute("rel", "stylesheet");
css.setAttribute("type", "text/css");
css.setAttribute("href", chrome.extension.getURL("css/style.css"));
document.getElementsByTagName("head")[0].appendChild(css);

//create link element contain bootstrap library
var bootstrap = document.createElement("link");
bootstrap.setAttribute("rel", "stylesheet");
bootstrap.setAttribute("type", "text/css");
bootstrap.setAttribute("href", chrome.extension.getURL("css/bootstrap.min.css"));
document.getElementsByTagName("head")[0].appendChild(bootstrap);

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
			this.message = "Hello";

		})
		.controller('ToolbarCtrl', function MyCtrl($scope) {
			// this.message = 'Hello, isolated world !';
			$scope.buttonClicked = function() {
				console.log($scope.collection);
			}
		});

	/* Manually bootstrap the Angular app */
	window.name = '';
	// To allow `bootstrap()` to continue normally
	angular.bootstrap(appRoot, ['myApp']);
	// console.log(angular);
	console.log('Boot and loaded !');

	// Or if you're using jQuery 1.8+:
	// $($.parseHTML(data)).appendTo('body');
	// app = angular.module("Nodemono", []);
	// app.controller("ToolbarCtrl", function($scope) {
	// 	$scope.buttonClicked = function() {
	// 		console.log($scope.collection)
	// 	}
	// })
});