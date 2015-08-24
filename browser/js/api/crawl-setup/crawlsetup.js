app.config(($stateProvider) => {
  $stateProvider.state('api.setup', {
    url: '/setup',
    templateUrl: 'js/api/crawl-setup/crawlsetup.html',
    controller: ($scope,Route) => {
      let timer,
          runTimer = () => {
        if (!$scope.editing.crawl) clearInterval(timer)
        else $scope.crawlTime++
      }
      $scope.crawlStrategy = '1'
      $scope.runFrequency = '1'
      $scope.ta = {}
      $scope.ta.listUrl = $scope.route.url;
      $scope.updateCrawlData = () => {
        $scope.crawlTime = 0
        $scope.editing.crawl = true
        timer = setInterval(runTimer, 1)

        if($scope.crawlStrategy==='1'){
          $scope.route.getCrawlData()
            .then(newdata => {
              $scope.crawlData.data = newdata
              $scope.editing.crawl = false
            })
        } else if($scope.crawlStrategy==='2'){
          $scope.crawlData.data = null;
          $scope.listUrlArr = $scope.ta.listUrl.split('\n');
          $scope.listUrlArr.forEach(function(url){
            var tempRoute = _.clone($scope.route,true);
            tempRoute.url = url;
            tempRoute.name = $scope.route.name+'temp';
            //create temp route to crawl data, this is very very bad way, looking for better way
            Route.create(_.omit(tempRoute,'_id'))
                 .then(function(route){
                    tempRoute = route
                    // console.log('route._id',route._id);
                    return Route.find(route._id).then(function(route){
                      return route.getCrawlData();
                    });
                 })
                 .then(function(data){
                  
                    if(!$scope.crawlData.data){
                      $scope.crawlData.data = data;
                      // console.log('$scope.crawlData.data',$scope.crawlData.data)
                    } else{
                      console.log('data',data)
                      _.merge($scope.crawlData.data,data);
                      // console.log('$scope.crawlData.data',$scope.crawlData.data)
                    }
                    // tempRoute.DSDestroy();
                 })
          })
        }
      }
      $scope.crawlStrategyChange = () => {
        console.log($scope.crawlStrategy)
      }


    }
  })
})
