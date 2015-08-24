app.config(($stateProvider) => {
  $stateProvider.state('api.preview', {
    url: '/preview',
    templateUrl: 'js/api/data-preview/datapreview.html',
    controller: ($scope, $state) => {
      $scope.search = {}
      $scope.editing.crawl = true
      $scope.reverseSort=false;
      $scope.orderByField = {name:'index'};
      $scope.$watch('crawlData.data', (d) => {
        if (d) {
          $scope.headers = Object.keys(d)
          $scope.rows = $scope.route.rowCount
          $scope.editing.crawl = false
        }
      })
      $scope.sortData = (row) => {
        if($scope.orderByField.name==='index'){
          return row.index;
        } else{
          return $scope.crawlData.data[$scope.orderByField.name][row.index];
        }
      }
      $scope.dataFilter = function(){
          return function(r){
            if(!$scope.search.text) return true;
            var res = false;
            var index = r.index.toString();
            //construct regex for matching words, can separate by space or comma
            var reg = new RegExp($scope.search.text.split(/[\s+,]/).join('|'),'gi');
            //matching index
            if(index.match(reg)){
              return true;
            }
            //matching data in header
            $scope.headers.forEach(function(header){
              var elem = $scope.crawlData.data[header][r.index];
              if (elem && elem.match(reg)){
                res = true;
              }
            })
            return res;
          }
      }
      $scope.copyToClipBoard = () => {
        // console.log(angular.toJson($scope.data));
        return angular.toJson($scope.crawlData.data);
      }
    }
  })
})
