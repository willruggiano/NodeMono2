var getNodeSelectorString = function(node) {
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
        console.log(node.className);
        var classes = node.className.split(/\s+/);
        console.log(classes);
        classes.forEach(function(classStr) {
            classString = classString + '.' + classStr;
        })
    }

    console.log('tagName:', tagName, 'id:', id, 'classString:', classString);
    return tagName + id + classString;
}

var getSelector = function(baseNode, startString) {
    if (!startString) {
        startString = ''
    }
    startString = getNodeSelectorString(baseNode) + startString;

    if (baseNode.tagName.toLowerCase() === 'body' || baseNode.parentNode == undefined) {
        return startString;
    } else {
        return getSelector(baseNode.parentNode, ' > ' + startString);
    }

}

//set up document for nodemono
var allEls = document.getElementsByTagName('*');
//list holds all the elements that match the general query
var list = [];
//targetElement is the element in particular that was clicked
var targetElement;
for (var i = 0; i < allEls.length; i++) {
    //remove hrefs from all elements and put on each element an on click method that runs the getSelector for it
    var element = allEls[i];
    element.addEventListener("click", function(event) {
        //make click only be for most specific element (most likely to have text)
        event.preventDefault();
        event.stopPropagation();
        targetElement = event.target || event.srcElement;
        var selector = getSelector(targetElement);
        //remove all the stylings from the previous list
        for (var i = 0; i < list.length; i++) {
            list[i].style['background-color'] = '';
        }

        //set the color of all objects that matched the query selector to green
        list = document.querySelectorAll(selector);
        for (var i = 0; i < list.length; i++) {
            list[i].style['background-color'] = '#ffff00';
        }
        //set the color of the targetedElement to red
        targetElement.style['background-color'] = '#00ff00';
    });
}