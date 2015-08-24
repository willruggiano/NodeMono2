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
  scope.pagTargetElement.style['background-color'] = '#ADD8E6'

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