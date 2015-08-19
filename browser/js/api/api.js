app.config(($stateProvider) => {
  $stateProvider.state('api', {
    url: '/:userid/apis/:routeid',
    templateUrl: 'js/api/api.html',
    controller: (DS, $scope, $timeout, user, route, data) => {
      /* 'GLOBAL' INFORMATION */
      $scope.user = user
      $scope.route = route
      $scope.data = data[0]
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

      /* DATA PREVIEW TABLE */
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

      /* CRAWL SETUP */
      let getLastRunStatus = () => {
        let d = Math.round((Date.now() - Date.parse(route.lastTimeCrawled)) / 86400000)
        if (d === 0) $scope.lastRun = `Today`
        else $scope.lastRun = `${d} ${d > 1 ? 'days' : 'day'} ago`
      }
      if (!$scope.lastRun) getLastRunStatus()

      // called when re-crawl button is clicked
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

      /* CRAWL HISTORY */

      /* MODIFY RESULTS (PIPES) */
      let e = document.getElementById('editor'),
          editor = ace.edit(e)

      // ace.createEditSession(doc, 'javascript')
      editor.setTheme('ace/theme/terminal')
      editor.getSession().setMode('ace/mode/javascript')

      let defaultFilterFn = (data) => {
        // filter functions are passed the whole API response object
        // you may manipulate or add to this data as you want

        /* YOUR CODE HERE */

        return data
      }

      $scope.modifiedData = $scope.data
      $scope.updateDataPreview = () => console.log('updating data...')


      // let testFilterFn = (data) => {
      //   for (let key in data) {
      //     data[key].map(item => {
      //       if (item.length > 10) return item.slice(0,10)
      //       else return item
      //     })
      //   }
      //   return data
      // }
      //
      //
      // $scope.resetFilterFn = () => {
      //   console.log('reset filter function to default')
      //   // $scope.$apply(() => {
      //     $scope.filterFn = defaultFilterFn
      //   // })
      // }
      // $scope.applyFilterFn = () => {
      //   console.log('applied test filter function')
      //   // $scope.$apply(() => {
      //     $scope.filterFn = testFilterFn
      //   // })
      // }

      /* USE DATA */

      /* API DOCS */

    },
    resolve: {
      user: (User, $stateParams) => User.find($stateParams.userid),
      route: (Route, $stateParams) => Route.find($stateParams.routeid),
      data: (route) => route.getCrawlData()
    }
  })
})
