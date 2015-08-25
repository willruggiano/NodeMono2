app.config(($stateProvider) => {
  $stateProvider.state('pipe.use', {
    url: '/use',
    templateUrl: 'js/pipe-api/use-data/usedata.html',
    controller: ($scope) => {
    	$scope.exportOptions = [
        { name: 'JSON', endpoint:'json' },
        // { name: 'CSV', endpoint: 'csv' },
        { name: 'RSS', endpoint: 'rss' }
      ];
    }
  });
});
