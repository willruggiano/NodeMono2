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
          .then(newdata => {
            $scope.data = newdata;
            $scope.getRowCount();
            $scope.getPipeStatus();
            // $scope.getLastRunStatus()
            $scope.editing.pipe = false;
          });
      };


    }
  });
});
