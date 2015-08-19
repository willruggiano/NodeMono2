function getNodeSelectorString(node) {
  //tagString
  var tagName = node.tagName;
  //idString
  var id = '';
  if (node.id) {
    id = '#' + node.id;
  }
  //classString
  var classString = '';
  if (node.className) {
    var classes = node.className.split(/\s+/);
    classes.forEach(function(classStr) {
      classString = classString + '.' + classStr;
    })
  }

  return tagName + id + classString;
}

function getSelector(baseNode, startString) {
  if (!startString) {
    startString = ''
  }
  startString = getNodeSelectorString(baseNode) + startString;

  if (baseNode.tagName.toLowerCase() === 'body' || baseNode.parentNode == undefined) {
    return startString;
  } else {
    return getSelector(baseNode.parentNode, ' ' + startString);
  }

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

function hideAllElms() {
  //hide all toolbar elements
  document.getElementById('backButton').className = 'toolbarEl hide'
  document.getElementById('oneButton').className = 'toolbarEl hide'
  document.getElementById('allButton').className = 'toolbarEl hide'
  document.getElementById('saveBtn').className = 'toolbarEl hide'
  document.getElementById('nameInput').className = 'toolbarEl hide'
    //remove all attrSelector buttons
  var attrSelectors = document.getElementById('attrSelectors');
  while (attrSelectors.firstChild) {
    attrSelectors.removeChild(attrSelectors.firstChild)
  }
}

function resetHighlights(scope) {
  for (var i = 0; i < scope.matchList.length; i++) {
    scope.matchList[i].style['background-color'] = '';
  }
}

function generateAttrButtons(color, scope) {
  //add text attribute button
  var newButton = document.createElement('button');
  newButton.innerHTML = 'text';
  newButton.addEventListener('click', function(event) {
    scope.selectedAttr(undefined);
  });
  document.getElementById('attrSelectors').appendChild(newButton);
  newButton.className = color + "Attr hide";
  //show attribute buttons
  for (var i = 0; i < scope.targetElement.attributes.length; i++) {
    var prop = scope.targetElement.attributes[i].name;
    //check that property is good
    var propList = ['href', 'src', 'style', 'id']
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

//____________________________________DOM setup______________________________
function setUpDom(scope) {
  giveNodeListArrayMethods();
  //set up document for nodemono
  var allEls = document.getElementsByTagName('*');
  //list holds all the elements that match the general query
  scope.matchList = [];
  //scope.targetElement is the element in particular that was clicked
  scope.selector = '';
  for (var i = 0; i < allEls.length; i++) {

    //add onclick function for all dom elements which blocks default action
    var element = allEls[i];
    if (isDescendant(document.getElementById('nodemonofy'), element)) {
      //kill all clicks on toolbar
      element.addEventListener("click", function(event) {
        event.preventDefault();
        event.stopPropagation();
      })
    } else {
      element.addEventListener("click", function(event) {
        //make click only be for most specific element (most likely to have text)
        event.preventDefault();
        event.stopPropagation();
        scope.targetElement = event.target || event.srcElement;
        scope.selector = getSelector(scope.targetElement);

        //remove stylings on old list
        for (var i = 0; i < scope.matchList.length; i++) {
          scope.matchList[i].style['background-color'] = '';
        }

        //change styles for selected elements
        scope.matchList = document.querySelectorAll(scope.selector);
        for (var i = 0; i < scope.matchList.length; i++) {
          scope.matchList[i].style['background-color'] = '#ffff00';
        }
        scope.targetElement.style['background-color'] = '#00ff00';

        //show/hide toolbar elements
        hideAllElms();
        setTimeout(function() {
          if (scope.targetElement) {
            document.getElementById('oneButton').className = 'toolbarEl show';
            if (scope.matchList.length > 0) {
              document.getElementById('allButton').className = 'toolbarEl show';
            }
          }
        }, 100)

      });
    }
  }

  //add the overlay element to the dom
  scope.overlay = document.createElement('div')
  scope.overlay.id = ''
  scope.overlay.addEventListener("click", function(event) {
    event.preventDefault();
    event.stopPropagation();
  })
  document.getElementsByTagName('body')[0].appendChild(scope.overlay);
}

//_____________________________________________________________