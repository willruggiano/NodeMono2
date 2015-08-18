app.config(($stateProvider) => {
  $stateProvider.state('api', {
    url: '/:userid/apis/:routeid',
    templateUrl: 'js/api/api.html',
    controller: (DS, $scope, $timeout, user, route, data) => {
      /* 'GLOBAL' INFORMATION */
      $scope.user = user
      $scope.route = route
      $scope.data = data
      $scope.testdata = {
        "headline": [
          "Export Machine\nStalling, China\nDecided to Risk\nDevaluation",
          "Jihad and Girl Power: How ISIS Lured 3 Teenagers",
          "Board Says Players at Northwestern Can’t Unionize",
          "White House Enlists\nAllies in Lobbying\nDuel Over Iran Deal",
          "Red Pandas Are Adorable and in Trouble",
          "Inside Amazon’s Bruising, Thrilling Workplace",
          "Bezos Says ‘Callous’ Practices Won’t Be Tolerated",
          "$scope.data Is Coming to Help Your Boss Manage Your Time",
          "Little-Noticed Ruling Is Reshaping Free-Speech Law",
          "Facing Money Gap, Clinton Warms to ‘Super PAC’ Gifts",
          "Just How Tall Can Roller Coasters Get?",
          "The Restaurant Critic’s Vacation: No Restaurants",
          "Book Review: Exploring the Legacy of Autism",
          "What Would You Pay for This Meal?",
          "What College Students Care About",
          "Robot Weapons: What’s the Harm?",
          "Queens Rental Tower With Easy Highway Access",
          "A Magical Farmhouse in Croton-on-Hudson"
        ],
        "link": [
          "http://www.nytimes.com/2015/08/18/business/international/chinas-devaluation-of-its-currency-was-a-call-to-action.html",
          "http://www.nytimes.com/2015/08/18/world/europe/jihad-and-girl-power-how-isis-lured-3-london-teenagers.html",
          "http://www.nytimes.com/2015/08/18/sports/ncaafootball/nlrb-says-northwestern-football-players-cannot-unionize.html",
          "http://www.nytimes.com/2015/08/18/world/middleeast/lobbying-fight-over-iran-nuclear-deal-centers-on-democrats.html",
          "http://www.nytimes.com/2015/08/18/science/red-pandas-are-adorable-and-in-trouble.html",
          "http://www.nytimes.com/2015/08/16/technology/inside-amazon-wrestling-big-ideas-in-a-bruising-workplace.html",
          "http://www.nytimes.com/2015/08/18/technology/amazon-bezos-workplace-management-practices.html",
          "http://www.nytimes.com/2015/08/18/technology/$scope.data-crunching-is-coming-to-help-your-boss-manage-your-time.html",
          "http://www.nytimes.com/2015/08/18/us/politics/courts-free-speech-expansion-has-far-reaching-consequences.html",
          "http://www.nytimes.com/2015/08/18/us/politics/facing-money-gap-hillary-clinton-slowly-warms-to-super-pac-gifts.html",
          "http://www.nytimes.com/interactive/2015/08/17/travel/17Coasters.html",
          "http://www.nytimes.com/2015/08/19/dining/summer-vacation-goodbye-restaurants-hello-kitchen.html",
          "http://www.nytimes.com/2015/08/23/books/review/neurotribes-by-steve-silberman.html",
          "http://well.blogs.nytimes.com/2015/08/17/what-would-you-pay-for-this-meal/",
          "http://www.nytimes.com/roomfordebate/2015/08/17/what-college-students-care-about-in-this-presidential-election",
          "http://www.nytimes.com/2015/08/17/opinion/robot-weapons-whats-the-harm.html",
          "http://www.nytimes.com/2015/08/16/realestate/queens-rental-tower-witheasy-highway-access.html",
          "http://www.nytimes.com/2015/08/16/realestate/a-magical-farmhouse-in-croton-on-hudson.html"
        ]
      }
      $scope.editing = {}


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

      $scope.crawlStatus = route.lastCrawlSucceeded ? 'Successful' : 'Unsuccessful'

      /* DATA PREVIEW TABLE */
      $scope.headers = Object.keys($scope.data)
      let getRowCount = () => {
        // get row count for table generation
        let count = 0
        for (let key in $scope.data) {
          let r = $scope.data[key].length
          count > r ? count : count = r
        }
        $scope.rows = new Array(count)
      }

      /* CRAWL SETUP */
      let lastRunStatus = () => {
        let d = Math.round((Date.now() - Date.parse(route.lastTimeCrawled)) / 86400000)
        if (d === 0) $scope.lastRun = `today`
        else $scope.lastRun = `${d} ${d > 1 ? 'days' : 'day'} ago`
      }

      $scope.updateCrawlData = () => {
        route.getCrawlData()
          .then(newdata => {
            $scope.data = newdata
            getRowCount()
          })
      }

      /* CRAWL HISTORY */

      /* MODIFY RESULTS (PIPES) */

      /* USE DATA */

      /* API DOCS */

    },
    resolve: {
      user: (User, $stateParams) => User.find($stateParams.userid),
      route: (Route, $stateParams) => Route.find($stateParams.routeid),
      data: (route) => route.getCrawlData()
    }
  })
})
