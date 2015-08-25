function createPopOver(routes) {
  var popOver = document.getElementById('popOver');
  //user has a route at this page
  if (routes.length > 0) {
    //add the routes to the popOver
    var list = document.getElementById('popList');
    for (var i = 0; i < routes.length; i++) {
      //new list item
      list.innerHTML = list.innerHTML + '<imput type="radio" name="routeName" value="' + routes[i].name +
        var radioButton = document.createElement('input')
      radioButton.type = 'radio'
      radioButton.name = 'routeName'
      radioButton.value = routes[i].name
      radioButton.checked = 'checked'
      list.appendChild(radioButton);

      var routeName = document.createElement('span');
      routeName.innerHTML = routes[i].name
      list.appendChild(routeName);

      var br = document.createElement('br')
      list.appendChild(br);
      // li.innerHTML = '<input type="radio" name="routeName" value="' + routes[i].name + '">' + routes[i].name + '</input>'
    }
  }
  showPopOver();
}

// SHOW POP-OVER
function showPopOver() {
  // SET THE DIV POSITION
  console.log('hello');
  var popOver = document.getElementById('popOver');
  popOver.style.left = window.innerWidth / 2 - 150 + 'px';
  popOver.style.top = window.innerHeight / 2 - 75 + 'px';
  popOver.style.width = '300px'
  popOver.style.height = '150px'
  popOver.style['font-size'] = '1em'
  popOver.style['border-width'] = '3px'
  popOver.style.padding = '20px'
  console.log(popOver.style);

  popOver.children[1].style.width = ''
  popOver.children[1].style.height = ''
  popOver.children[popOver.children.length - 2].style.width = ''
  popOver.children[popOver.children.length - 2].style.height = ''
  popOver.children[popOver.children.length - 1].style.width = ''
  popOver.children[popOver.children.length - 1].style.height = ''
}

// CLOSE POP-OVER
function closePopOver() {
  // HIDE THE DIV
  console.log('byebye')
  var popOver = document.getElementById('popOver');
  popOver.style.left = window.innerWidth / 2 + 'px';
  popOver.style.top = window.innerHeight / 2 + 'px';
  popOver.style.width = '0'
  popOver.style.height = '0'
  popOver.style['border-width'] = '0'
  popOver.style.padding = '0'
  popOver.style['font-size'] = '0em'

  popOver.children[1].style.width = '0'
  popOver.children[1].style.height = '0'
  popOver.children[popOver.children.length - 2].style.width = '0'
  popOver.children[popOver.children.length - 2].style.height = '0'
  popOver.children[popOver.children.length - 2].style.padding = '0 0'
  popOver.children[popOver.children.length - 1].style.width = '0'
  popOver.children[popOver.children.length - 1].style.height = '0'
  popOver.children[popOver.children.length - 1].style.padding = '0 0'

}

function choseRoute() {

}

document.addEventListener("DOMContentLoaded", function(event) {
  closePopOver();
});