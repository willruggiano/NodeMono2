function getNodeSelectorString(node, index) {
  // tagString
  var tagName = node.tagName;

  // classString
  var classString = [];
  // take classes from every other node
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