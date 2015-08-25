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
              var elem = $scope.data[header.dataIdx][header.name][r.index];
              if (elem && elem.match(reg)){
                res = true;
              }
            });
            return res;
          };
        };

      $scope.resultTypes = ["CSV", "RSS", "JSON"];
      $scope.activeResultType = "CSV";

      $scope.setActiveType = (type) =>{
        if (type === "JSON") {
          $scope.dataPreview = angular.toJson($scope.data, true);
        } else if (type === "RSS") {
          $scope.dataPreview = parseXML($scope.data);
          // $scope.dataPreview = "sorry, we don't support RSS yet";
        }
        $scope.activeResultType = type;
      };

    }
  });
});
