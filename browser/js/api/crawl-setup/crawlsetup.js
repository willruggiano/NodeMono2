app.config(($stateProvider) => {
  $stateProvider.state('api.setup', {
    url: '/setup',
    templateUrl: 'js/api/crawl-setup/crawlsetup.html',
    controller: ($scope) => {
      let timer,
          runTimer = () => {
        if (!$scope.editing.crawl) clearInterval(timer)
        else $scope.crawlTime++
      }

      $scope.updateCrawlData = () => {
        $scope.crawlTime = 0
        $scope.editing.crawl = true
        timer = setInterval(runTimer, 1)
        $scope.route.getCrawlData()
          .then(newdata => {
            $scope.data = newdata[0]
            $scope.getRowCount()
            $scope.editing.crawl = false
          })
      }


    }
  })
})
