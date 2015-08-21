app.config(($stateProvider) => {
  $stateProvider.state('pipe', {
    abstract: true,
    url: '/:userid/pipes/:pipeid',
    templateUrl: 'js/pipe-api/pipe-api.html',
    resolve: {
      user: (User, $stateParams) => User.find($stateParams.userid),
      pipe: (Pipe, $stateParams) => Pipe.find($stateParams.pipeid),
      inputs: (pipe) => pipe.getInputs()
      // data: (pipe) => pipe.getPipedData()
    },
    controller: (DS, $scope, $timeout, user, pipe, inputs) => {
      $scope.user = user;
      $scope.pipe = pipe;
      $scope.inputs = inputs;
      $scope.dataPreview;
      $scope.editing = {};
      $scope.activetab = null;
      $scope.tabs = [{ header: 'Data Preview', url: 'preview', glyphicon: 'equalizer' },
                     { header: 'Setup', url: 'setup', glyphicon: 'cog' },
                     { header: 'History', url: 'history', glyphicon: 'calendar' },
                     { header: 'Modify Results', url: 'modify', glyphicon: 'wrench' },
                     { header: 'Use Data', url: 'use', glyphicon: 'circle-arrow-down' },
                     { header: 'API Docs', url: 'docs', glyphicon: 'file' }];

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
        elem.setAttribute('contenteditable', true); // make the element (elem) editable
        if ($scope.editing[id]) {
          elem.removeAttribute('contenteditable'); // make the element (elem) not editable
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

    }
  });
});
