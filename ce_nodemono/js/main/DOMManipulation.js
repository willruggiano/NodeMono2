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