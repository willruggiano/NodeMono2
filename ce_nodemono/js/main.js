//________________DOM setup ______________________________
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
  scope.overlay.addEventListener("click", function(event) {
    event.preventDefault();
    event.stopPropagation();
  })
  document.getElementsByTagName('body')[0].appendChild(scope.overlay);
}
//_____________________________________________________________
var yellow = "#f1c40f";
var green = "#1abc9c"

//


//__________DOM manipulation helpers__________
function hideAllElms() {
  //hide all toolbar elements
  document.getElementById('backButton').className = 'toolbarEl hide'
  document.getElementById('oneButton').className = 'toolbarEl hide'
  document.getElementById('allButton').className = 'toolbarEl hide'
  document.getElementById('saveBtn').className = 'toolbarEl hide'
  document.getElementById('nameInput').className = 'toolbarEl hide'
  document.getElementById('paginationDepthSelector').className = 'toolbarEl hide'
    //remove all attrSelector buttons
  var attrSelectors = document.getElementById('attrSelectors');
  while (attrSelectors.firstChild) {
    attrSelectors.removeChild(attrSelectors.firstChild)
  }
}

function hideHighlights(scope) {
  for (var i = 0; i < scope.matchList.length; i++) {
    scope.matchList[i].style['background-color'] = '';
  }
  for (var i = 0; i < scope.pagMatchList.length; i++) {
    scope.pagMatchList[i].style['background-color'] = '';
  }
}
//__________________________

function getNodeSelectorString(node, index) {
  // tagString
  var tagName = node.tagName;

  // classString
  var classString = [];
  // get classes from every other parent node (and from the clicked node)
  if (index % 2 === 0 && node.className) {
    classString.push('');
    var classes = node.className.split(/\s+/);
    classes.forEach(function(classStr, idx) {
      // take the first class (if there is one)
      if (classStr && idx === 0) {
        classString.push(classStr);
      }
    });
  }

  return tagName + classString.join('.');
}

function getSelector(baseNode) {
  var startStringArr = [];
  var node = baseNode;
  var index = 0;
  while (node.tagName.toLowerCase() !== 'html') {
    startStringArr.unshift(getNodeSelectorString(node, index));
    node = node.parentNode;
    index += 1;
  }
  if (startStringArr.length > 10) startStringArr = startStringArr.slice(startStringArr.length - 10);
  return startStringArr.join(' > ');
}

function isDescendant(parent, child) {
  var node = child.parentNode;
  while (node != null) {
    if (node == parent) {
      return true;
    }
    node = node.parentNode;
  }
  return false;
}

function giveNodeListArrayMethods() {
  var arrayMethods = Object.getOwnPropertyNames(Array.prototype);
  arrayMethods.forEach(function(methodName) {
    if (methodName !== "length") {
      NodeList.prototype[methodName] = Array.prototype[methodName];
    }
  });

}

function generateAttrButtons(color, scope) {
  //add text attribute button
  var newButton = document.createElement('button');
  newButton.innerHTML = 'innerHTML';
  newButton.addEventListener('click', function(event) {
    scope.selectedAttr(undefined);
  });
  document.getElementById('attrSelectors').appendChild(newButton);
  newButton.className = color + "Attr hide";
  //show attribute buttons
  for (var i = 0; i < scope.targetElement.attributes.length; i++) {
    var prop = scope.targetElement.attributes[i].name;
    //check that property is good
    var propList = ['href', 'src', 'id']
    if (propList.indexOf(prop) >= 0) {
      var newButton = document.createElement('button');
      newButton.innerHTML = prop;
      newButton.addEventListener('click', function(event) {
        var button = event.target || event.srcElement;
        var property = button.innerHTML;
        scope.selectedAttr(property);
      });
      document.getElementById('attrSelectors').appendChild(newButton);
      newButton.className = color + "Attr hide";
    }
  }
  console.log(document.getElementById('attrSelectors'))
}

//_______button generator_______
function createPropButton(scope, data) {
  var newButton = document.createElement('button');
  newButton.className = 'show selectorBtn'
  newButton.dataProp = data
  if (newButton.dataProp.index) {
    newButton.innerHTML = 1;
  } else {
    var list = document.querySelectorAll(newButton.dataProp.selector);
    newButton.innerHTML = list.length;
  }
  newButton.addEventListener('click', function(event) {
    var button = event.target || event.srcElement;
    hideAllElms();
    scope.overlay.className = ''
    hideHighlights(scope);
    scope.matchList = document.querySelectorAll(button.dataProp.selector)
    var index = button.dataProp.index
    if (index) {
      scope.matchList[index].style['background-color'] = green;
    } else {
      for (var i = 0; i < scope.matchList.length; i++) {
        scope.matchList[i].style['background-color'] = yellow;
      }
    }
  })
  return newButton;
}

function createPagButton(scope, data) {
  var newButton = document.createElement('button');
  newButton.className = 'show selectorBtn'
  newButton.style['background-color'] = '#27ad60'
  newButton.dataProp = data;
  newButton.innerHTML = 'P';
  newButton.addEventListener('click', function(event) {
    var button = event.target || event.srcElement;
    hideAllElms();
    scope.overlay.className = ''
    hideHighlights(scope);
    scope.pagMatchList = document.querySelectorAll(button.dataProp.link)
    scope.pagMatchList[button.dataProp.index].style['background-color'] = '#27ad60';
  })
  return newButton;
}

function addXButton(button, rootScope) {
  var xButton = document.createElement('button');
  xButton.id = 'xButton';
  xButton.innerHTML = 'X'
  button.appendChild(xButton);
  xButton.addEventListener('click', function(event) {
    event.preventDefault();
    event.stopPropagation();
    button.parentNode.removeChild(button);
    console.log(rootScope);
    var index = rootScope.apiRoute.data.indexOf(button.dataProp)
    if (index != -1) {
      rootScope.apiRoute.data.splice(index, 1);
    } else {
      index = rootScope.apiRoute.pagination.indexOf(button.dataProp)
      rootScope.apiRoute.pagination.splice(index, 1);
    }

  })
  button.onmouseover = function() {
    xButton.style.opacity = 1;
  }
  button.onmouseout = function() {
    xButton.style.opacity = 0;
  }
}


//________________Event Listeners_______________
function addListeners(typeString, scope) {
  var allEls = document.getElementsByTagName('*');
  for (var i = 0; i < allEls.length; i++) {
    //add onclick function for all dom elements which blocks default action
    var element = allEls[i];
    if (isDescendant(document.getElementById('nodemonofy'), element) || element.id === 'tempOverlay') {
      //kill all clicks on toolbar
      element.addEventListener("click", killClick)
    } else {
      if (typeString === 'property') {
        element.addEventListener("click", scope.propClick);
      } else {
        if (element.href) {
          element.addEventListener("click", scope.pagClick);
        } else {
          element.addEventListener('click', killClick);
        }
      }
    }
  }
}

//clears event listeners on the dom
function clearListeners(scope) {
  var allEls = document.getElementsByTagName('*');
  for (var i = 0; i < allEls.length; i++) {
    var element = allEls[i];
    if (!isDescendant(document.getElementById('nodemonofy'), element)) {
      element.removeEventListener('click', scope.propClick);
      element.removeEventListener('click', scope.pagClick);
    }
  }
}

function propClickListener(event) {
  var scope = this;
  //make click only be for most specific element (most likely to have text)
  event.preventDefault();
  event.stopPropagation();
  scope.targetElement = event.target || event.srcElement;
  scope.selector = getSelector(scope.targetElement);
  console.log()

  //remove stylings on old list
  for (var i = 0; i < scope.matchList.length; i++) {
    scope.matchList[i].style['background-color'] = '';
  }

  //change styles for selected elements
  scope.matchList = document.querySelectorAll(scope.selector);
  for (var i = 0; i < scope.matchList.length; i++) {
    scope.matchList[i].style['background-color'] = yellow;
  }
  scope.targetElement.style['background-color'] = green;

  //show/hide toolbar elements
  hideAllElms();
  setTimeout(function() {
    if (scope.targetElement) {
      document.getElementById('oneButton').className = 'toolbarEl show';
      if (scope.matchList.length > 1) {
        document.getElementById('allButton').className = 'toolbarEl show';
      }
    }
  }, 100)
}

function pagClickListener(event) {
  var scope = this;
  event.preventDefault();
  event.stopPropagation();
  scope.pagTargetElement = event.target || event.srcElement;
  scope.pagSelector = getSelector(scope.pagTargetElement)
    //add the link to the pagination
  scope.currentPagination['link'] = scope.pagSelector;

  //remove stylings on old list
  for (var i = 0; i < scope.pagMatchList.length; i++) {
    scope.pagMatchList[i].style['background-color'] = '';
  }

  //add index to currentPagination
  scope.pagMatchList = document.querySelectorAll(scope.pagSelector);
  scope.currentPagination['index'] = scope.pagMatchList.indexOf(scope.pagTargetElement)

  //change styles for selected elements
  scope.pagTargetElement.style['background-color'] = '#1abc9c'

  //hide/show toolbar elements
  hideAllElms();
  setTimeout(function() {
    document.getElementById('paginationDepthSelector').className = 'toolbarEl show'
  }, 100)
}


function killClick(event) {
  event.preventDefault();
  event.stopPropagation();
}
//_______________________________