var yellow = "#f1c40f";
var green = "#2ecc71"

function setUpDom(scope) {
  giveNodeListArrayMethods();
  //set up document for nodemono
  //list holds all the elements that match the general query
  scope.matchList = [];
  scope.pagMatchList = [];
  scope.pagSelector = '';
  scope.selector = '';

  scope.pagClick = pagClickListener.bind(scope);
  scope.propClick = propClickListener.bind(scope);
  addListeners('property', scope);

  //add the overlay element to the dom
  scope.overlay = document.createElement('div')
  scope.overlay.id = 'tempOverlay'
  scope.overlay.addEventListener("click", killClick)
  document.getElementsByTagName('body')[0].appendChild(scope.overlay);
}