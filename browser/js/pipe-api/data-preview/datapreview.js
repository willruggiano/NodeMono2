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

      // get the data
      $scope.data = [];
      $scope.rows = [];
      $scope.headers = [];
      $scope.isInterleaved = false;
      $scope.pipe.getPipedData().then(pipedData => {
        $scope.data = pipedData;
        // determine its format
        $scope.isInterleaved = isInterleaved(pipedData);
        // find the number of rows and the headers (different for interleaved)
        var rowsAndKeys = {};
        if ($scope.isInterleaved) {
          rowsAndKeys.rows = pipedData.length;
          rowsAndKeys.headers = pipedData.length ? Object.keys(pipedData[0]) : [];
        } else {
          rowsAndKeys = getRowsAndKeys(pipedData);
        }          
        var n = rowsAndKeys.rows;
        $scope.rows = new Array(n + 1).join('0').split('').map(function(d, i) { return { index: i }; });
        // put headers in object with index to prevent duplicated in ng-repeat
        console.log('the headers', rowsAndKeys.headers);
        if ($scope.isInterleaved) {
          $scope.headers = pipedData && Object.keys(pipedData[0]);
        } else {
          $scope.headers = rowsAndKeys.headers.map((header, idx) => {
            return {index: idx, name: header.name, dataIdx: header.dataIdx};
          });
        }
      });

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

      function isInterleaved (data) {
        // interleaved values will be strings, not arrays
        if (data.length) {
          var key = Object.keys(data[0])[0];
          if (typeof data[0][key] === 'string') return true;
        }
        return false;
      }

      // gets the length of the longest array in any of the data objects and all property names
      function getRowsAndKeys(data) {
        var headers = [];
        var longestArrInObj = (obj, index) => {
          var keys = Object.keys(obj);
          headers = headers.concat(keys.map(key => {return {name: key, dataIdx: index}; }));
          return keys.reduce((max, key) => {
            if (obj[key].length > max) return obj[key].length;
            else return max;
          }, 0);
        };
        var rows = data.reduce((max, pipedObj, idx) => {
          var longest = longestArrInObj(pipedObj, idx);
          if (longest > max) return longest;
          else return max;
        }, 0);
        return {headers, rows};
      }

    }
  });
});
