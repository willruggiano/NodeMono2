app.config(($stateProvider) => {
  $stateProvider.state('api.modify', {
    url: '/modify',
    templateUrl: 'js/api/modify-results/modifyresults.html',
    controller: ($scope) => {
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

          // // initialize session with default transform function if no tranformation function exists
          // if (!$scope.route.transformFn) { // if no transform function exists
          //   session.setValue(TRANSFORM.toString()) // set editor to default transform function
          //   $scope.modifiedData = getOriginalData() // set data to original data
          // } else {
          //   session.setValue($scope.route.transformFn) // set editor to existing transform function
          //   $scope.modifiedData = $scope.crawlData.modifiedData // set data to existing modified data
          //   console.log($scope.route.transformFn)
          //   console.log($scope.modifiedData)
          // }
        }
      })

      $scope.$watch('editing.transformFn', (b) => console.log(`editing is now ${b}`))

      $scope.updateDataPreview = () => {
        console.log('previewing transformation function')
        _transform = editor.getValue() // _transform => user modified transform function
        let copy = _.clone($scope.modifiedData, true)
        $scope.modifiedData = eval(`(${_transform})(copy)`) // transform data
        // $scope.editing.transformFn = true // initiate edit cycle
      }

      // $scope.saveModifiedData = () => {
      //   console.log('saving transformation')
      //   let copy = _.clone($scope.modifiedData, true)
      //   $scope.crawlData.modifiedData = copy // set modified data on parent scope
      //   console.log($scope.modifiedData) // data correct ================================================================
      //   // $scope.route.transformFn = _transform // set transform function on parent scope
      //   $scope.route.DSUpdate({ transformFn: _transform }) // save route
      //     .then(route => {
      //       console.log('saved')
      //       console.log($scope.modifiedData) // data getting set to {}??????
      //       $scope.editing.transformFn = false // end edit cycle
      //     })
      // }

      $scope.revertData = () => {
        session.setValue(TRANSFORM.toString()) // set editor to default transform function
        $scope.modifiedData = getOriginalData() // set data to original data
        // $scope.editing.transformFn = false // end edit cycle
      }
    }
  })
})
