app.config(($stateProvider) => {
  $stateProvider.state('api', {
    url: '/:userid/apis/:routeid',
    templateUrl: 'js/api/api.html',
    controller: (DS, $scope, $timeout, user, route, data) => {
      /* 'GLOBAL' INFORMATION */
      $scope.user = user
      $scope.route = route
      $scope.data = data[0]
      $scope.dataPreview;
      $scope.editing = {}
      $scope.search = {};
      $scope.resultTypes = [{index:1,name:"CSV"},{index:2,name:"RSS"},{index:3,name:"JSON"}];
      $scope.activeResultType = "CSV";
      /* API HEADER */
      // called every time 'edit' button is clicked
      $scope.toggleStatus = (id) => {
        let elem = document.getElementById(id)
        elem.setAttribute('contenteditable', true) // make the element (elem) editable
        if ($scope.editing[id]) {
          elem.removeAttribute('contenteditable') // make the element (elem) not editable
          $scope.route.DSSave() // save the newly edited element
            .then(newroute => {
              console.log(`successfully saved route ${newroute.name}`)
              // if (!$rootScope.alerts) $rootScope.alerts = []
              // $rootScope.alerts.push({ name: 'saving route', msg: 'successful'})
            })
            .catch((e) => {
              console.log(`was not able to save route ${route.name}: ${e}`)
              // if (!$rootScope.alerts) $rootScope.alerts = []
              // $rootScope.alerts.push({ name: 'saving route', msg: 'unsuccessful' })
            })
        }

        // make sure changes take place after any promises resolve
        $timeout(() => {
          $scope.editing[id] = !$scope.editing[id]
        }, 0)
      }

      let getCrawlStatus = () => {
        $scope.crawlStatus = $scope.route.lastCrawlSucceeded ? 'Successful' : 'Unsuccessful'
      }
      if (!$scope.crawlStatus) getCrawlStatus()

      /* DATA PREVIEW TABLE */
      $scope.headers = Object.keys($scope.data)
      let getRowCount = () => {
        // get row count for table generation
        let count = 0
        for (let key in $scope.data) {
          let r = $scope.data[key].length
          count > r ? count : count = r
        }
        $scope.rows = new Array(count+1).join('0').split('').map(function(d,i){return {index:i}});
      }
      if (!$scope.rows) getRowCount()

      $scope.setActiveType = (type) =>{
        // console.log($scope.data);
        if(type.name==="JSON"){
          $scope.dataPreview = angular.toJson(interleaveObj($scope.data),true);
        } else if(type.name==="RSS"){
          $scope.dataPreview = route.parseXML(interleaveObj($scope.data));
          console.log($scope.dataPreview)
        }
        $scope.activeResultType = type.name;
      }
      //filter by search text
      // console.log( $scope.rows instanceof Array)
      $scope.dataFilter = function(){
          return function(r){  
            if(!$scope.search.text) return true;
            var res = false;
            var reg = new RegExp($scope.search.text,'gi');
            $scope.headers.forEach(function(header){
              // console.log($scope.headers)
              if ($scope.data[header][r.index].match(reg){
                res = true;
              }
            })
            return res;
          }
      } 
      /* CRAWL SETUP */
      let getLastRunStatus = () => {
        let d = Math.round((Date.now() - Date.parse(route.lastTimeCrawled)) / 86400000)
        if (d === 0) $scope.lastRun = `Today`
        else $scope.lastRun = `${d} ${d > 1 ? 'days' : 'day'} ago`
      }
      if (!$scope.lastRun) getLastRunStatus()

      // called when re-crawl button is clicked
      $scope.updateCrawlData = () => {
        $scope.editing.crawl = true
        route.getCrawlData()
          .then(newdata => {
            console.log('received new data')
            $scope.data = newdata[0]
            getRowCount()
            getLastRunStatus()
            getCrawlStatus()
            $scope.editing.crawl = false
          })
      }

      /* CRAWL HISTORY */

      /* MODIFY RESULTS (PIPES) */

      /* USE DATA */

      /* API DOCS */

      // helper function for interleave - interleaves a single object of arrays
      function interleaveObj(obj) {
        // find all keys in the object
        var keys = Object.keys(obj);

        // find longest stored array
        var maxLen = keys.reduce(function(max, key) {
          if (obj[key].length > max) return obj[key].length;
          else return max;
        }, 0);

        var mergedData = [];
        // defined outside the loop to satisfy the linter
        var i = 0;
        var reduceFunc = function(accum, key) {
          accum[key] = obj[key][i];
          return accum;
        };
        // use maxLen (length of longest array in the object)
        for (; i < maxLen; i++) {
          // make new obj with fields for each name
          var mergedObj = keys.reduce(reduceFunc, {});
          // add to the array of these objects
          mergedData.push(mergedObj);
        }

        return mergedData;
      }

    },
    resolve: {
      user: (User, $stateParams) => User.find($stateParams.userid),
      route: (Route, $stateParams) => Route.find($stateParams.routeid),
      data: (route) => route.getCrawlData()
    }
  })
})
