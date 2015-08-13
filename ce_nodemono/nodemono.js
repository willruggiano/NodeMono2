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

	var div = document.createElement('div');
	div.dataset.ngNonBindable = '';
	div.style.cssText = [
		'background:  rgb(250, 150, 50);',
		'bottom:      0px;',
		'font-weight: bold;',
		'position:    fixed;',
		'text-align:  center;',
		'width:       100%;',
		''
	].join('\n');

	// Create the app's root element (everything else should go in here)
	var appRoot = document.createElement('div');
	appRoot.dataset.ngController = 'MyCtrl as ctrl';
	appRoot.innerHTML = 'Angular says: {{ctrl.message}}';
	appRoot.id = "nodemonoAppRoot";

	// Insert elements into the DOM
	// document.body.appendChild(div);
	$(div).prepend('body')
	div.appendChild(appRoot);
	$(data).appendTo('#nodemonoAppRoot'); //.first();

	var app = angular
		.module('myApp', [])
		.controller('NodemonoMainCtrl', function($scope) {
			$scope.collection = {};
			console.log('go here')
			$scope.buttonClicked = function() {
				console.log($scope.collection)
			}
		})
		.controller('MyCtrl', function MyCtrl() {
			this.message = 'Hello, isolated world !';
		});

	/* Manually bootstrap the Angular app */
	window.name = ''; // To allow `bootstrap()` to continue normally
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