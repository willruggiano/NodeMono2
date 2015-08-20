app.config(($stateProvider) => {
  $stateProvider.state('api.setup', {
    url: '/setup',
    templateUrl: 'js/api/crawl-setup/crawlsetup.html',
    controller: ($scope) => {
      $scope.updateCrawlData = () => {
        $scope.editing.crawl = true
        $scope.route.getCrawlData()
          .then(newdata => {
            $scope.data = newdata[0]
            $scope.getRowCount()
            $scope.getCrawlStatus()
            // $scope.getLastRunStatus()
            $scope.editing.crawl = false
          })
      }
    }
  })
})
