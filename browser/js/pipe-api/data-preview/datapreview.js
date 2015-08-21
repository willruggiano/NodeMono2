app.config(($stateProvider) => {
  $stateProvider.state('pipe.preview', {
    url: '/preview',
    templateUrl: 'js/pipe-api/data-preview/datapreview.html',
    controller: ($scope) => {
      $scope.search = {};
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
              if ($scope.data[header.dataIdx][header.name][r.index].match(reg)){
                res = true;
              }
            });
            return res;
          };
      };

    }
  });
});
