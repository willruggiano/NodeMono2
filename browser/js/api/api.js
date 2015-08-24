app.config(($stateProvider) => {
  $stateProvider.state('api', {
    abstract: true,
    url: '/:userid/apis/:routeid',
    templateUrl: 'js/api/api.html',
    resolve: {
      user: (User, $stateParams) => User.find($stateParams.userid),
      route: (Route, $stateParams) => Route.find($stateParams.routeid)
    },
    controller: (DS, $scope, $timeout, Utils, user, route) => {
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
