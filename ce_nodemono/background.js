chrome.browserAction.onClicked.addListener(function(tab) {
	// console.log($.toString());
	// $("body").append('<p>Test</p>');
	// console.log($("body"));
	// console.log(tab);
	chrome.tabs.executeScript(tab.id, {
		file: "nodemono.js"
	});
	// alert('hi');
});