chrome.browserAction.onClicked.addListener(function(tab) {
	chrome.tabs.executeScript(tab.id, {
		file: "nodemono.js"
	});
	alert('hi');
});