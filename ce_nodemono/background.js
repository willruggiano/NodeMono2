chrome.browserAction.onClicked.addListener(function(tab) {
	// console.log($.toString());
	// $("body").append('<p>Test</p>');
	// console.log($("body"));
	// console.log(tab);

	//inject angularjs
	console.log('hello');

	var libFiles = [
		"angular.min.js",
		"angular-animate.js",
		"jquery.min.js"
	]

	var appFiles = [
		"js/auth.js",
		"js/routeFactory.js",
		"js/toolbarController.js",
		"js/previewDataController.js",
		"js/overlayController.js"
	]

	var mainFiles = [
		"js/main/buttonGenerators.js",
		"js/main/CSSSelectorGeneration.js",
		"js/main/DOMManipulation.js",
		"js/main/DOMSetup.js",
		"js/main/eventListeners.js",
		"js/main/fileImporters.js",
		"js/main/helpers.js",
		"js/main/popover.js"
	]

	var filesToLoad = libFiles.concat(appFiles, mainFiles, ["js/nodemono.js"])

	chrome.tabs.executeScript(tab.id, {
		code: 'window.name = "NG_DEFER_BOOTSTRAP!" + window.name;'
	})



	for (var i = 0; i < filesToLoad.length; i++) {
		var filePath = filesToLoad[i];
		chrome.tabs.executeScript(tab.id, {
			file: filePath
		});
	}
});

chrome.browserAction.onClicked.removeListener();