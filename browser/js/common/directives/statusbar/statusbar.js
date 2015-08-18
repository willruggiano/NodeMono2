app.directive('statusBar', () => {
  return {
    restrict: 'E',
    require: '?ngModel',
    controller: ($rootScope, $scope) => {
      $scope.alerts = $rootScope.alerts || []
      // let updateAlerts = () => console.log(`${$scope.alerts}`)
      // $rootScope.$on('addalert', updateAlerts)

      setTimeout(() => {
        let a = $scope.alerts.shift()
        $scope.$digest()
      }, 5000)
    },
    templateUrl: 'js/common/directives/statusbar/statusbar.html'
  }
})
