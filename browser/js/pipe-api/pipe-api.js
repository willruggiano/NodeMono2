app.config(($stateProvider) => {
  $stateProvider.state('pipe', {
    abstract: true,
    url: ':userid/pipes/:pipeid',
    templateUrl: 'js/pipe-api/pipe-api.html',
    resolve: {
      user: (User, $stateParams) => User.find($stateParams.userid),
      pipe: (Pipe, $stateParams) => Pipe.find($stateParams.pipeid),
      inputs: (pipe) => pipe.getInputs(),
      filters: (pipe) => pipe.getFilters()
    },
    controller: (DS, Pipe, $scope, $timeout, $state, user, pipe, inputs, filters) => {
      $scope.user = user;
      $scope.pipe = pipe;
      $scope.inputs = inputs;
      $scope.filters = filters;
      $scope.dataPreview;
      $scope.editing = {};
      $scope.activetab = null;
      $scope.tabs = [{ header: 'Data Preview', url: 'preview', glyphicon: 'equalizer' },
                     { header: 'Pipe Setup', url: 'setup', glyphicon: 'cog' },
                     { header: 'Modify Results', url: 'modify', glyphicon: 'wrench' },
                     { header: 'Use Data', url: 'use', glyphicon: 'circle-arrow-down' }];
      $scope.endpoints = ['json', 'csv', 'rss'];
      $scope.getPipeStatus = () => {
        $scope.pipeStatus = $scope.pipe.lastPipeSucceeded ? 'Successful' : 'Unsuccessful';
      };

      $scope.getLastRunStatus = () => {
        let dt = Math.round((Date.now() - Date.parse(pipe.lastTimePiped)) / 86400000);
        if (dt === 0) $scope.lastRun = 'Today';
        else $scope.lastRun = `${dt} ${dt > 1 ? 'days' : 'day'} ago`
      };

      if (!$scope.lastRun) $scope.getLastRunStatus();
      if (!$scope.pipeStatus) $scope.getPipeStatus();

      // called every time 'edit' button is clicked
      $scope.toggleStatus = (id) => {
        let elem = document.getElementById(id);
        if (elem) elem.setAttribute('contenteditable', true); // make the element (elem) editable
        if ($scope.editing[id]) {
          if (elem) elem.removeAttribute('contenteditable'); // make the element (elem) not editable
          $scope.pipe.DSSave() // save the newly edited element
            .then(newpipe => {
              console.log(`successfully saved pipe ${newpipe.name}`)
              // if (!$rootScope.alerts) $rootScope.alerts = []
              // $rootScope.alerts.push({ name: 'saving route', msg: 'successful'})
            })
            .catch((e) => {
              console.log(`was not able to save pipe ${pipe.name}: ${e}`)
              // if (!$rootScope.alerts) $rootScope.alerts = []
              // $rootScope.alerts.push({ name: 'saving route', msg: 'unsuccessful' })
            });
        }

        // make sure changes take place after any promises resolve
        $timeout(() => {
          $scope.editing[id] = !$scope.editing[id];
        }, 0);
      }

      // for removing items from the pipe's arrays
      $scope.removeFromPipe = (id, type) => {
        // determine which array should be modified
        if (type === 'filters') {
          $scope.pipe.filters = $scope.pipe.filters.filter(filt => filt !== id);
          // remove from the view too
          $scope.filters = $scope.filters.filter(filt => filt._id !== id);
        } else {
          $scope.pipe.inputs[type] = $scope.pipe.inputs[type].filter(input => input !== id);
          // remove from the view too
          $scope.inputs[type] = $scope.inputs[type].filter(input => input._id !== id);
        }
      };

      // delete the pipe (with JS data), and go to profile state
      $scope.deletePipe = () => {
        Pipe.destroy($scope.pipe._id).then(() => $state.go('profile', {id: user._id}));
      };

      // clone the pipe (with JS data), and go to the new pipe's profile
      $scope.clonePipe = () => {
        var oldName = $scope.pipe.name;
        var newPipe = _.pick($scope.pipe, ['userFilters', 'filters', 'inputs', 'user']);
        newPipe.name = oldName + '_clone' + (Math.floor(Math.random() * 10000));
        Pipe.create(newPipe).then(savedPipe => savedPipe.go(user._id));
      };

      // get the data
      $scope.data = [];
      $scope.rows = [];
      $scope.headers = [];
      $scope.isInterleaved = false;
      $scope.waiting = true;
      $scope.pipe.getPipedData().then(pipedData => {
        $scope.waiting = false;

        if (!pipedData.length) {
          // no data came back
          console.log('you got no data');
          $scope.noData = true;
          return;
        }
        $scope.noData = false;

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

      $scope.copyToClipBoard = () => {
        return angular.toJson($scope.data);
      };
    }
  });
});
