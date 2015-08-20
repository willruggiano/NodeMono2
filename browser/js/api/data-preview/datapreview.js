app.config(($stateProvider) => {
  $stateProvider.state('api.preview', {
    url: '/preview',
    templateUrl: 'js/api/data-preview/datapreview.html',
    controller: ($scope) => {
      $scope.headers = Object.keys($scope.data)
    }
  })
})
