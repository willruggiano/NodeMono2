app.config(($stateProvider) => {
  $stateProvider.state('api.setup', {
    url: '/setup',
    templateUrl: 'js/api/crawl-setup/crawlsetup.html',
    controller: ($scope,Route, $q, shareData) => {
      let timer,
          runTimer = () => {
            if (!$scope.editing.crawl) clearInterval(timer)
            else $scope.crawlTime++
          }
      $scope.crawlStrategy = '1'
      $scope.runFrequency = '1'
      //contain list of URL in case user want to specify list of URLs to crawl data
      $scope.ta = {}
      //initiate list URL with current route's URL
      $scope.ta.listUrl = $scope.route.url

      $scope.crawlData = shareData.crawlData
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
                                destroys.push(route)
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
            // Route.crawlData.data = $scope.crawlData.data;
            $scope.editing.crawl = false
            return $q.all(destroys.map(function(d){
              d.DSDestroy();
            }))
          }).then(function(){
            console.log('ok');
          }).catch(console.log);
          
          
        }//end if
      }//end updateCrawlData
    }
  })
})
