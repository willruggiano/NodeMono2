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

//initiating selectorgadget
window.selector_gadget = new SelectorGadget();
var SG = window.selector_gadget;
console.log(SG);

SG.makeInterface();
SG.clearEverything();
SG.setMode('interactive');

// var path = jQuerySG('<input>', {
// 	id: 'sg-status',
// 	class: 'selectorgadget_ignore'
// });
// SG.sg_div.append(path)
// SG.path_output_field = path.get(0)

// // Add button to dismiss SelectorGadget
// var btnOk = jQuerySG('<button>', {
// 	id: 'sg-ok',
// 	class: 'selectorgadget_ignore'
// }).text('OK')
// SG.sg_div.append(btnOk)
// jQuerySG(btnOk).bind('click', function(event) {
// 	jQuerySG(SG).unbind()
// 	jQuerySG(SG.sg_div).unbind()
// 	SG.unbindAndRemoveInterface()
// 	SG = null
// })

// Watch the input field for changes
// var val = saved = path.val()
// var tid = setInterval(function() {
// 	val = path.val()
// 	if (saved != val) {
// 		console.log('New path', val, 'matching', (jQuerySG(val).length), 'element(s)')
// 		saved = val
// 	}
// }, 50)



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