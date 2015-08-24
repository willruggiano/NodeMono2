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
  newButton.style['background-color'] = '#ADD8E6'
  newButton.dataProp = data;
  newButton.innerHTML = 'P';
  newButton.addEventListener('click', function(event) {
    var button = event.target || event.srcElement;
    hideAllElms();
    scope.overlay.className = ''
    hideHighlights(scope);
    scope.pagMatchList = document.querySelectorAll(button.dataProp.link)
    scope.pagMatchList[button.dataProp.index].style['background-color'] = '#ADD8E6';
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