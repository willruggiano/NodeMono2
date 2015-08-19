app.config(($stateProvider) => {
  $stateProvider.state('api', {
    url: '/:userid/apis/:routeid',
    templateUrl: 'js/api/api.html',
    resolve: {
      user: (User, $stateParams) => User.find($stateParams.userid),
      route: (Route, $stateParams) => Route.find($stateParams.routeid)
    },
    controller: (DS, $scope, $timeout, user, route) => {
      /* 'GLOBAL' INFORMATION */
      $scope.user = user
      $scope.route = route
      $scope.editing = {}

      /* API HEADER */
      // called every time 'edit' button is clicked
      $scope.toggleStatus = (id) => {
        let elem = document.getElementById(id)
        elem.setAttribute('contenteditable', true) // make the element (elem) editable
        if ($scope.editing[id]) {
          elem.removeAttribute('contenteditable') // make the element (elem) not editable
          $scope.route.DSSave() // save the newly edited element
            .then(newroute => {
              console.log(`successfully saved route ${newroute.name}`)
              // if (!$rootScope.alerts) $rootScope.alerts = []
              // $rootScope.alerts.push({ name: 'saving route', msg: 'successful'})
            })
            .catch((e) => {
              console.log(`was not able to save route ${route.name}: ${e}`)
              // if (!$rootScope.alerts) $rootScope.alerts = []
              // $rootScope.alerts.push({ name: 'saving route', msg: 'unsuccessful' })
            })
        }

        // make sure changes take place after any promises resolve
        $timeout(() => {
          $scope.editing[id] = !$scope.editing[id]
        }, 0)
      }

      let getCrawlStatus = () => {
        $scope.crawlStatus = $scope.route.lastCrawlSucceeded ? 'Successful' : 'Unsuccessful'
      }
      if (!$scope.crawlStatus) getCrawlStatus()
    }
  })
  .state('api.preview', {
    url: '/preview',
    templateUrl: 'js/api/datapreview.html',
    resolve: {
      data: (route) => route.getCrawlData()
    },
    controller: ($scope, data) => {
      $scope.data = data[0]
      $scope.headers = Object.keys($scope.data)

      let getRowCount = () => {
        // get row count for table generation
        let count = 0
        for (let key in $scope.data) {
          let r = $scope.data[key].length
          count > r ? count : count = r
        }
        $scope.rows = new Array(count)
      }

      if (!$scope.rows) getRowCount()

    }
  })
  .state('api.crawlsetup', {
    url: '/crawl-setup',
    templateUrl: 'js/api/crawlsetup.html',
    controller: ($scope) => {
      let getLastRunStatus = () => {
        let d = Math.round((Date.now() - Date.parse(route.lastTimeCrawled)) / 86400000)
        if (d === 0) $scope.lastRun = `Today`
        else $scope.lastRun = `${d} ${d > 1 ? 'days' : 'day'} ago`
      }

      if (!$scope.lastRun) getLastRunStatus()

      $scope.updateCrawlData = () => {
        $scope.editing.crawl = true
        route.getCrawlData()
          .then(newdata => {
            $scope.data = newdata[0]
            getLastRunStatus()
            getCrawlStatus()
            $scope.editing.crawl = false
          })
      }
    }
  })
})








      // called when re-crawl button is clicked


  //     /* CRAWL HISTORY */
  //
  //     /* MODIFY RESULTS (PIPES) */
  //     let e = document.getElementById('editor'),
  //         editor = ace.edit(e)
  //
  //     editor.setTheme('ace/theme/terminal')
  //     editor.getSession().setMode('ace/mode/javascript')
  //
  //     let defaultFilterFn = (data) => {
  //       // filter functions are passed the whole API response object
  //       // you may manipulate or add to this data as you want
  //
  //       /* YOUR CODE HERE */
  //
  //       return data
  //     }
  //
  //     $scope.modifiedData = $scope.data
  //     $scope.updateDataPreview = () => console.log('updating data...')
  //     $scope.revertData = () => console.log('reverting data back to original form...')
  //
  //     /* USE DATA */
  //
  //     /* API DOCS */
  //
  //   }
  // })
