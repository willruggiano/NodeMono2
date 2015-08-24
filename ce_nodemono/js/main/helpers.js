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