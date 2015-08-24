app.config(($stateProvider) => {
  $stateProvider.state('api.setup', {
    url: '/setup',
    templateUrl: 'js/api/crawl-setup/crawlsetup.html',
    controller: ($scope,Route, $q) => {
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
          // console.log()
          $scope.wholeData;
          var destroys = [];
          (function(){
            var promises = []
            $scope.listUrlArr.forEach((url) => {
              var tempRoute = _.clone($scope.route,true);
              tempRoute.url = url;
              tempRoute.name = $scope.route.name+'temp'+Math.floor(Math.random()*1000);
              //create temp route to crawl data, this is bad way, looking for better way
              promises.push(Route.create(_.omit(tempRoute,'_id'))
                              .then(route => {
                                // tempRoute = route
                                destroys.push(route.DSDestroy)
                                // console.log(route.DSDestroy())
                                return route.getCrawlData()
                              }))
            })
            return $q.all(promises)
          })().then(function(data){
            data.forEach(function(d){
              if(!$scope.crawlData.data) $scope.crawlData.data = d;
              else {
                for(var key in $scope.crawlData.data){
                  $scope.crawlData.data[key] = $scope.crawlData.data[key].concat(d[key]);
                }
              }
            })
            console.log($scope.crawlData.data);
            console.log(destroys);
            return $q.all(destroys)
          }).then(function(){
            console.log('ok');
          });
          
          
        }
      }
      // $scope.crawlStrategyChange = () => {
      //   console.log($scope.crawlStrategy)
      // }


    }
  })
})
