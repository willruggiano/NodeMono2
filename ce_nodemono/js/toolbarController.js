function registerToolbarCtrl(app) {
  app.controller('ToolbarCtrl', function MyCtrl($scope, $rootScope, Session, AuthService, AUTH_EVENTS, $http, Route) {

    $rootScope.showCollectionOverlay = false;
    $rootScope.showPreviewData = false;
    $rootScope.route = null;
    $scope.currentProperty = {};
    $scope.currentPagination = {};
    $scope.inPaginationMode = false;

    $scope.backBtnUrl = chrome.extension.getURL('imgs/back.png');
    $scope.documentImgUrl = chrome.extension.getURL('imgs/document.png');

    //set up the route object for this webpage
    $rootScope.apiRoute = {};
    $rootScope.apiRoute.data = [];

    $scope.showStyle = {
      'top': window.innerHeight / 2 - 75 + 'px',
      'left': window.innerWidth / 2 - 150 + 'px',
      'width': '300px',
      'height': '150px',
      'font-size': '1em',
      'padding': '20px'
    }
    $scope.hideStyle = {
      'top': window.innerHeight / 2 + 'px',
      'left': window.innerWidth / 2 + 'px',
      'width': '0',
      'height': '0',
      'font-size': '0em',
      'padding': '0'
    }
    $scope.showPopOver = true;
    console.log($scope.showStyle);

    //see if user has routes on this webpage
    AuthService.getLoggedInUser()
    $rootScope.$on(AUTH_EVENTS.loginSuccess, function() {
      return $http({
          url: AUTH_EVENTS.serverUrl + '/api/routes/',
          method: "GET",
          params: {
            user: Session.user._id
          }
        })
        .then(function(res) {
          var routes = res.data;
          routes = routes.filter(function(route) {
            return window.location.href == route.url

          });
          //user has a route at this page
          if (routes.length > 0) {
            var routeList = routes.reduce(function(prev, route) {
              return prev + '\n- ' + route.name
            }, '')
            var choice = prompt('Choose a route to edit:\n' + routeList, '');
            if (choice != null) {
              var singleRouteArr = routes.filter(function(route) {
                return route.name === choice;
              })
              if (singleRouteArr.length > 0) {
                $scope.importData(singleRouteArr[0])
              } else {
                alert('You misspelled the route name. Refresh page to try again;')
              }
            }

          }

        })
    });

    $scope.importData = function(route) {
      $rootScope.apiRoute = route;
      for (var i = 0; i < route.data.length; i++) {
        var newButton = createPropButton($scope, route.data[i]);
        addXButton(newButton, $rootScope);
        document.getElementById('propButtons').appendChild(newButton)
      }
      for (var i = 0; i < route.pagination.length; i++) {
        var newButton = createPagButton($scope, route.pagination[i]);
        addXButton(newButton, $rootScope);
        document.getElementById('pagButtons').appendChild(newButton)
      }
    }

    //save the pagination
    $scope.selectedDepth = function() {
      //get pagination depth
      $scope.currentPagination['depth'] = parseInt(document.getElementById('paginationDepthSelector').value)
      document.getElementById('paginationDepthSelector').value = '';
      //save the pagination
      if (!$rootScope.apiRoute.pagination) {
        $rootScope.apiRoute.pagination = [$scope.currentPagination];
      } else {
        $rootScope.apiRoute.pagination.push($scope.currentPagination);
      }
      //reset dom
      hideAllElms();
      hideHighlights($scope);

      //add button
      var newButton = createPagButton($scope, $scope.currentPagination)
      addXButton(newButton, $rootScope);
      document.getElementById('pagButtons').appendChild(newButton)

      $scope.currentPagination = {};
    }

    $scope.paginationMode = function() {
      //toggles the pagination mode
      document.getElementById('tempOverlay').className = ''
      hideHighlights($scope);
      hideAllElms();
      clearListeners($scope);
      if ($scope.inPaginationMode) {
        $scope.inPaginationMode = false
        addListeners('property', $scope);
      } else {
        $scope.inPaginationMode = true
        addListeners('pagination', $scope);
      }
    }

    $scope.doneClicked = function() {
      $rootScope.showCollectionOverlay = $rootScope.showCollectionOverlay ? false : true;
      if ($rootScope.showCollectionOverlay) $rootScope.showPreviewData = false
    }

    //preview crawl data from selector user choose;
    $scope.previewData = function() {
      $rootScope.showPreviewData = $rootScope.showPreviewData ? false : true;
      if ($rootScope.showPreviewData) $rootScope.showCollectionOverlay = false
    }

    //cancel 
    $scope.cancel = function() {
      //reset currentProperty
      $scope.currentProperty = {};

      //change stylings on DOM
      for (var i = 0; i < $scope.matchList.length; i++) {
        $scope.matchList[i].style['background-color'] = yellow;
      }
      $scope.targetElement.style['background-color'] = green;

      //hide/show toolbar
      hideAllElms();
      setTimeout(function() {
        document.getElementById('oneButton').className = 'toolbarEl show';
        document.getElementById('allButton').className = 'toolbarEl show';
      }, 100)

      //allow clicks on webpage
      $scope.overlay.className = '';
    }


    //chose 'One'
    $scope.oneBtnClick = function() {

      //set properties of the currentProperty
      $scope.currentProperty['selector'] = $scope.selector;
      $scope.currentProperty['index'] = $scope.matchList.indexOf($scope.targetElement);

      //change stylings on DOM
      hideHighlights($scope);
      $scope.targetElement.style['background-color'] = green;

      //hide/show toolbar elements
      hideAllElms();
      generateAttrButtons('green', $scope);
      setTimeout(function() {
        document.getElementById('backButton').className = 'toolbarEl show'
        var attrSelectors = document.getElementById('attrSelectors');
        console.log(attrSelectors);
        for (var i = 0; i < attrSelectors.children.length; i++) {
          attrSelectors.children[i].className = 'greenAttr show'
          console.log(attrSelectors[i])
        }
      }, 100);

      //block clicks on webpage
      $scope.overlay.className = 'cover';
    }

    //chose 'All'
    $scope.allBtnClick = function() {
      //set currentProperty
      $scope.currentProperty['selector'] = $scope.selector;

      //change stylings on DOM
      $scope.targetElement.style['background-color'] = yellow

      //hide/show toolbar elements
      hideAllElms();
      generateAttrButtons('yellow', $scope);
      setTimeout(function() {
        document.getElementById('backButton').className = 'toolbarEl show'
        var attrSelectors = document.getElementById('attrSelectors');
        for (var i = 0; i < attrSelectors.children.length; i++) {
          attrSelectors.children[i].className = 'yellowAttr show'
        }
      }, 100);

      //block all clicks on webpage
      $scope.overlay.className = 'cover';
    }

    //chose desired attribute
    $scope.selectedAttr = function(attr) {
      //set currentProperty
      $scope.currentProperty['attr'] = attr;

      //hide/show toolbar elements
      hideAllElms();
      setTimeout(function() {
        document.getElementById('backButton').className = 'toolbarEl show'
        document.getElementById('saveBtn').className = 'toolbarEl show'
        document.getElementById('nameInput').className = 'toolbarEl show'
      }, 100);
    }


    $scope.save = function() {

      //save the property to this route
      $rootScope.apiRoute.data.push($scope.currentProperty);

      //reset the DOM

      //change stylings on DOM
      hideHighlights($scope);

      //hide/show toolbar elements
      hideAllElms();

      //allow clicks on webpage
      $scope.overlay.className = '';

      var newButton = createPropButton($scope, $scope.currentProperty);
      addXButton(newButton, $rootScope)
      document.getElementById('propButtons').appendChild(newButton)

      //reset currentProperty
      $scope.currentProperty = {};
    }

    $scope.noEdit = function() {
      console.log('noEdit');
      console.log(document.getElementById('popOver'))
      $scope.showPopOver = false
    }

    $scope.edit = function() {
      //get chosen route
      var choice = '';
      var list = document.getElementById('popList');
      for (var i = 0; i < list.children.length; i++) {
        if (list.children[i].checked) {
          chosenRoute = list.children[i];
        }
      }
      if (choice) {
        var singleRouteArr = $scope.urlRoutes.filter(function(route) {
          return route.name === choice;
        })
        if (singleRouteArr.length > 0) {
          $scope.importData(singleRouteArr[0])
          $scope.showPopOver = false
        }
      }
    }

    setUpDom($scope);
  })


};