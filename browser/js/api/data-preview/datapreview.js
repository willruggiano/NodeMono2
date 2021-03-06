app.config(($stateProvider) => {
  $stateProvider.state('api.preview', {
    url: '/preview',
    templateUrl: 'js/api/data-preview/datapreview.html',
    controller: ($scope, $state, Route, shareData) => {
      $scope.search = {}
      $scope.editing.crawl = true
      $scope.reverseSort=false;
      $scope.orderByField = {name:'index'};
      $scope.crawlData = shareData.crawlData;
      $scope.$watch('crawlData.data', (d) => {
        if (d) {
          $scope.headers = Object.keys(d)
          $scope.rows = $scope.route.getRowCount(d)
          $scope.editing.crawl = false
        }
      })

      $scope.dataFilter = () => {
        return r => {
          if (!$scope.search.text) return true
          let res = false,
              index = r.index.toString()
        }
      }

      $scope.sortData = (row) => {
        if($scope.orderByField.name==='index'){
          return row.index;
        } else{
          return $scope.crawlData.data[$scope.orderByField.name][row.index];
        }
      }

      $scope.dataFilter = () => {
        return r => {
          if (!$scope.search.text) return true;
          let res = false,
              index = r.index.toString();

          //construct regex for matching words, can separate by space or comma
          let reg = new RegExp($scope.search.text.split(/[\s+,]/).join('|'), 'gi')

          //matching index
          if (index.match(reg)) return true

          //matching data in header
          $scope.headers.forEach(header => {
            if (($scope.crawlData.data[header][r.index])&&($scope.crawlData.data[header][r.index].match(reg))) res = true
          })

          return res
        }
      }

      $scope.copyToClipBoard = () => {
        return angular.toJson($scope.crawlData.data);
      }
    }
  })
})
