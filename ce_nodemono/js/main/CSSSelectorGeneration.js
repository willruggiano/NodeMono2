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
      if (classStr != '') {
        classString = classString + '.' + classStr;
      }
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