app.config(($stateProvider) => {
  $stateProvider.state('api.modify', {
    url: '/modify',
    templateUrl: 'js/api/modify-results/modifyresults.html',
    controller: ($scope, $http) => {
      let editor = ace.edit('editor'),
          session = editor.getSession(),
          _transform,
          getOriginalData

      // default transform function, const to make sure it never changes
      const TRANSFORM = function(data) {
        // filter functions are passed the whole API response object
        // you may manipulate or add to this data as you want

        /* YOUR CODE HERE */

        return data
      }

      editor.setTheme('ace/theme/chrome')
      session.setMode('ace/mode/javascript')
      session.setTabSize(2)
      session.setUseSoftTabs(true)
      session.setValue(TRANSFORM.toString())


      // watch runs when crawlData resolves
      $scope.$watch('crawlData.data', (d) => {
        // create immutable copy and mutable copy of original data
        if (d) {
          let data = _.clone($scope.crawlData.data, true) // copy of original data for reverting
          $scope.modifiedData = _.clone(data, true) // copy of original data for tinkering
          getOriginalData = () => data // close over 'data' => making it immutable
        }
      })

      $scope.updateDataPreview = () => {
        _transform = editor.getValue() // _transform => user modified transform function
        let copy = _.clone($scope.modifiedData, true)
        $scope.modifiedData = eval(`(${_transform})(copy)`) // transform data
        $scope.editing.transform = true // initiate edit cycle
      }

      $scope.revertData = () => {
        session.setValue(TRANSFORM.toString()) // set editor to default transform function
        $scope.modifiedData = getOriginalData() // set data to original data
        $scope.editing.transform = false
        $scope.editing.modName = false // end edit cycle
        $scope.modName = '' // reset modname (if any)
      }

      $scope.export = () => {
        $scope.editing.modName = !$scope.editing.modName
        if (!$scope.editing.modName && $scope.modName) {
          if (!$scope.route.modifications) $scope.route.modifications = {}
          let modName = $scope.modName.split(' ').join('').toLowerCase()
          $scope.route.modifications[modName] = { name: $scope.modName, endpoint: 'json', data: $scope.modifiedData }
          $scope.route.DSSave()
            .then(route => $scope.revertData())
        }
      }
    }
  })
})
