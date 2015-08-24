app.config(($stateProvider) => {
  $stateProvider.state('api', {
    abstract: true,
    url: '/:userid/apis/:routeid',
    templateUrl: 'js/api/api.html',
    resolve: {
      user: (User, $stateParams) => User.find($stateParams.userid),
      route: (Route, $stateParams) => Route.find($stateParams.routeid)
    },
    controller: (DS, $scope, $timeout, user, route, $http) => {
      $scope.user = user
      $scope.route = route
      $scope.crawlData = {}
      $scope.editing = {}
      $scope.activetab = null
      $scope.tabs = [{
        header: 'Data Preview',
        url: 'preview',
        glyphicon: 'equalizer'
      }, {
        header: 'Crawl Setup',
        url: 'setup',
        glyphicon: 'cog'
      }, {
        header: 'Crawl History',
        url: 'history',
        glyphicon: 'calendar'
      }, {
        header: 'Modify Results',
        url: 'modify',
        glyphicon: 'wrench'
      }, {
        header: 'Use Data',
        url: 'use',
        glyphicon: 'circle-arrow-down'
      }, {
        header: 'API Docs',
        url: 'docs',
        glyphicon: 'file'
      }]

      $scope.getRowCount = () => {
          let n = 0
          for (let key in $scope.data) {
            let l = $scope.data[key].length
            if (l > n) n = l
          }
          $scope.rows = new Array(n + 1).join('0').split('').map(function(d, i) {
            return {
              index: i
            }
          })
        }
        // make sure row count gets initialized
      if (!$scope.rows) $scope.getRowCount()
      $scope.rows
      $scope.dataPreview

      $scope.tabs = [{
        header: 'Data Preview',
        url: 'preview',
        glyphicon: 'equalizer'
      }, {
        header: 'Crawl Setup',
        url: 'setup',
        glyphicon: 'cog'
      }, {
        header: 'Crawl History',
        url: 'history',
        glyphicon: 'calendar'
      }, {
        header: 'Modify Results',
        url: 'modify',
        glyphicon: 'wrench'
      }, {
        header: 'Use Data',
        url: 'use',
        glyphicon: 'circle-arrow-down'
      }, {
        header: 'API Docs',
        url: 'docs',
        glyphicon: 'file'
      }]
      $scope.resultTypes = [{
        index: 1,
        name: "CSV"
      }, {
        index: 2,
        name: "RSS"
      }, {
        index: 3,
        name: "JSON"
      }];
      $scope.activeResultType = $scope.resultTypes[0].name;

      $scope.route.getCrawlData()
        .then(data => $scope.crawlData.data = data)

      // called every time 'edit' button is clicked
      $scope.toggleStatus = (id) => {
        let elem = document.getElementById(id)
        elem.setAttribute('contenteditable', true) // make the element (elem) editable
        if ($scope.editing[id]) {
          elem.removeAttribute('contenteditable') // make the element (elem) not editable
          $scope.editing.crawl = true
          $scope.route.DSSave() // save the newly edited element
            .then(route => {
              console.log(`successfully saved route ${route.name}`)
              $scope.route = route
              return route.getCrawlData()
            })
            .then(newdata => {
              $scope.data = newdata[0]
              $scope.editing.crawl = false
            })
            .catch((e) => {
              console.log(`something went wrong... ${e}`)
              $scope.editing.crawl = false
            })
        }

        // make sure changes take place after any promises resolve
        $timeout(() => {
          $scope.editing[id] = !$scope.editing[id]
        }, 0)
      }

      $scope.editRoute = function() {
        if (typeof chrome != 'undefined') {
          var extensionId = 'kiemjmljpgjkgkpnkbhoilbmickfeckk'
          var testUrl = 'chrome-extension://' + extensionId + '/imgs/back.png';
          $http.get(testUrl)
            .then(function(res) {
              //go to desired website
              window.location.href = route.url;
              console.log('worked')
            }, function(err) {
              console.log('err no extension');
              //err: havent installed extension
            });
        } else {
          console.log('err no chrome');
          //err: not using chrome
        }
      }


      $scope.resultTypes = [{
        index: 1,
        name: "CSV"
      }, {
        index: 2,
        name: "RSS"
      }, {
        index: 3,
        name: "JSON"
      }];
      $scope.activeResultType = "CSV";

      $scope.setActiveType = (type) => {
          // console.log($scope.data);
          if (type.name === "JSON") {
            $scope.dataPreview = angular.toJson(interleaveObj($scope.data), true);
          } else if (type.name === "RSS") {
            $scope.dataPreview = parseXML(interleaveObj($scope.data));
          }
          $scope.activeResultType = type.name;
        }
        //filter by search text
        //delete route
      $scope.deleteApi = () => {
        // console.log(route);
        route.DSDestroy().then(function(res) {
            if (res) {
              $state.go('profile', {
                id: user._id
              });
            }
          })
          .catch(function(err) {
            // console.log(err);
            $scope.error = err;
          })
      }

      $scope.setActiveType = (type) => {
        // console.log($scope.data);
        if (type.name === "JSON") {
          $scope.dataPreview = angular.toJson(interleaveObj($scope.crawlData.data), true);
        } else if (type.name === "RSS") {
          $scope.dataPreview = parseXML(interleaveObj($scope.crawlData.data));
        }
        $scope.activeResultType = type.name;
      }

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
    }
  })
})