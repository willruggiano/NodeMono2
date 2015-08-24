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