app.config(($stateProvider) => {
  $stateProvider.state('api.preview', {
    url: '/preview',
    templateUrl: 'js/api/data-preview/datapreview.html',
    controller: ($scope) => {
      $scope.search = {}
      $scope.headers = Object.keys($scope.data)
      $scope.dataFilter = () => {
          return (r) => {
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
            $scope.headers.forEach((header) => {
              if ($scope.data[header][r.index].match(reg)){
                res = true;
              }
            })
            return res;
          }
      }
      $scope.copyToClipBoard = () => {
        // console.log(angular.toJson($scope.data));
        return angular.toJson($scope.data);
      }
    }
  })
})
