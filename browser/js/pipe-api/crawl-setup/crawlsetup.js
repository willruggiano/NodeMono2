app.config(($stateProvider) => {
  $stateProvider.state('pipe.setup', {
    url: '/setup',
    templateUrl: 'js/pipe-api/crawl-setup/crawlsetup.html',
    controller: ($scope) => {
      let timer;
      let runTimer = () => {
        if (!$scope.editing.pipe) clearInterval(timer);
        else $scope.pipeTime++;
      };

      $scope.updatePipeData = () => {
        $scope.pipeTime = 0;
        $scope.editing.pipe = true;
        timer = setInterval(runTimer, 1);
        $scope.pipe.getPipedData()
          .then(pipedData => {
            $scope.data = pipedData;
            $scope.editing.pipe = false;

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
            if ($scope.isInterleaved) {
              $scope.headers = pipedData && Object.keys(pipedData[0]);
            } else {
              $scope.headers = rowsAndKeys.headers.map((header, idx) => {
                return {index: idx, name: header.name, dataIdx: header.dataIdx};
              });
            }

          });
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
