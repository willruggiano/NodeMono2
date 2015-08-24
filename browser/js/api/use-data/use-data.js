app.config(($stateProvider) => {
  $stateProvider.state('api.use', {
    url: '/use',
    templateUrl: 'js/api/use-data/usedata.html',
    controller: ($scope) => {
      $scope.exportOptions = [
        { name: 'JSON', endpoint:'json' },
        { name: 'CSV', endpoint: 'csv' },
        { name: 'RSS', endpoint: 'rss' }
      ].concat($scope.route.modifications)
    }
  })
})
