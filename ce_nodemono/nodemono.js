// var html = chrome.extension.getURL('kimono-toolbar.html', function(data) {
// 	console.log(data);
// });
// console.log(html);
// $("body").prepend('<div class="nodemonoToolbar">Test</div>');
// $("body").prepend('<div class="navbar-header"><a class="navbar-brand" href="#">nodemono</a></div>');
// console.log($("body"))
// console.log($("body"));

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
	console.log(data);
	$(data).appendTo('body');

	// Or if you're using jQuery 1.8+:
	// $($.parseHTML(data)).appendTo('body');
});