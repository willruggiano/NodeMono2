app.config(($stateProvider) => {
  $stateProvider.state('api.preview', {
    url: '/preview',
    templateUrl: 'js/api/data-preview/datapreview.html',
    controller: ($scope, $state) => {
      $scope.search = {}

      $scope.editing.crawl = true
      $scope.$watch('crawlData.data', (d) => {
        if (d) {
          $scope.headers = Object.keys(d)
          $scope.rows = $scope.route.rowCount
          $scope.editing.crawl = false
        }
      })

      $scope.dataFilter = () => {
          return r => {
            if (!$scope.search.text) return true
            let res = false,
                index = r.index.toString()

            //construct regex for matching words, can separate by space or comma
            let reg = new RegExp($scope.search.text.split(/[\s+,]/).join('|'), 'gi')

            //matching index
            if (index.match(reg)) return true

            //matching data in header
            $scope.headers.forEach(header => {
              if ($scope.data[header][r.index].match(reg)) res = true
            })

            return res
          }
      }
    }
  })
})
