app.config(($stateProvider) => {
  $stateProvider.state('api', {
    abstract: true,
    url: '/:userid/apis/:routeid',
    templateUrl: 'js/api/api.html',
    resolve: {
      user: (User, $stateParams) => User.find($stateParams.userid),
      route: (Route, $stateParams) => Route.find($stateParams.routeid)
    },
    controller: (DS, $scope, $timeout, user, route, $state, Route, $http, Utils) => {
      $scope.user = user
      $scope.route = route
      $scope.crawlData = {}
      $scope.editing = {}
      $scope.activetab = null
      $scope.rows
      $scope.dataPreview
      $scope.tabs = [{ header: 'Data Preview', url: 'preview', glyphicon: 'equalizer' },
                     { header: 'Crawl Setup', url: 'setup', glyphicon: 'cog' },
                    //  { header: 'Crawl History', url: 'history', glyphicon: 'calendar' },
                     { header: 'Modify Results', url: 'modify', glyphicon: 'wrench' },
                     { header: 'Use Data', url: 'use', glyphicon: 'circle-arrow-down' }]
                    //  { header: 'API Docs', url: 'docs', glyphicon: 'file' }]
      $scope.endpoints = ['json', 'csv', 'rss']

      $scope.resultTypes = [{
        index: 1,
        name: "CSV"
      }, {
        index: 2,
        name: "RSS"
      }, {
        index: 3,
        name: "JSON"
      }];

      // attach data to crawlData when it resolves
      $scope.route.getCrawlData()
        .then(data => $scope.crawlData.data = data)

      // called every time 'edit' button is clicked
      $scope.toggleStatus = (id) => {
        let elem = document.getElementById(id)
        elem.setAttribute('contenteditable', true) // make the element (elem) editable
        if ($scope.editing[id]) {
          elem.removeAttribute('contenteditable') // make the element (elem) not editable
          $scope.editing.crawl = true
          $scope.route.DSSave() // save the newly edited element
            .then(route => {
              $scope.route = route
              return route.getCrawlData()
            })
            .then(newdata => {
              $scope.crawlData.data = newdata[0]
              $scope.editing.crawl = false
            })
            .catch((e) => {
              console.log(`something went wrong... ${e}`)
              $scope.editing.crawl = false
            })
        }

        // make sure changes take place after any promises resolve
        $timeout(() => {
          $scope.editing[id] = !$scope.editing[id]
        }, 0)
      }
      //clone route
      $scope.cloneRoute = () => {
        var cloneRoute = _.omit($scope.route,'_id')
        var num = Number(cloneRoute.name[cloneRoute.name.length-1]);
        cloneRoute.name = cloneRoute.name + '_clone' + (Math.floor(Math.random()*10000));
        Route.create(cloneRoute)
             .then(route => {
                $scope.route = route;
                // $state.go('profile', { id: route.user });
             })
             .catch((e) => {
                console.log(`something wrong ${e}`);
             })
      }
      $scope.editRoute = function() {
        if (typeof chrome != 'undefined') {
          var extensionId = 'kiemjmljpgjkgkpnkbhoilbmickfeckk'
          var testUrl = 'chrome-extension://' + extensionId + '/imgs/back.png';
          $http.get(testUrl)
            .then(function(res) {
              //go to desired website
              window.location.href = route.url;
              console.log('worked')
            }, function(err) {
              console.log('err no extension');
              //err: havent installed extension
            });
        } else {
          console.log('err no chrome');
          //err: not using chrome
        }
      }
        //delete route
      $scope.deleteApi = () => {
        // console.log(route);
        route.DSDestroy().then(function(res) {
            if (res) {
              $state.go('profile', {
                id: user._id
              });
            }
          })
          .catch(function(err) {
            $scope.error = err;
          })
      }

      $scope.resultTypes = [{ index:1 ,name:"CSV" },{ index:2, name:"RSS" },{ index:3, name:"JSON" }];
      $scope.activeResultType = "CSV";

      $scope.setActiveType = (type) =>{
        if(type.name === "JSON"){
          $scope.dataPreview = angular.toJson(Utils.interleaveObj($scope.crawlData.data),true);
        } else if(type.name === "RSS"){
          $scope.dataPreview = parseXML(Utils.interleaveObj($scope.crawlData.data));
        }
        $scope.activeResultType = type.name;
      }
    }
  })
})
