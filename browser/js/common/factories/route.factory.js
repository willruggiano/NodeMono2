app.factory('Route', (DS, $state, $http) => {

  const ROUTE = DS.defineResource({
    name: 'route',
    endpoint: 'routes',
    relations: {
      belongsTo: {
        user: {
          // local field is for linking relations
          // route.user -> user(owner) of the route
          localField: '_user',
          // local key is the "join" field
          // the name of the field on the route that points to its parent user
          localKey: 'user'
        }
      }
    },
    computed: {
      lastRun: ['lastTimeCrawled', (lastTimeCrawled) => {
        let t = moment(lastTimeCrawled)
        if (moment().isSame(t, 'day')) return `Today at ${t.format('h:mm a')}`
        else return moment().from(t)
      }],
      crawlStatus: ['lastCrawlSucceeded', (lastCrawlSucceeded) => {
        return lastCrawlSucceeded ? 'Successful' : 'Unsuccessful'
      }]
    },
    methods: {
      go(userId) {
        $state.go('api.preview', { userid: userId, routeid: this._id })
      },
      getCrawlData() {
        console.log(`getting crawl data for ${this.name}`)
        return $http.get(`/api/routes/${this.user}/${this.name}`)
          .then(res => {
            this.rowCount = 0
            _.forOwn(res.data[0], (val, key) => {
              if (val.length > this.rowCount) this.rowCount = val.length
            })
            this.rowCount = new Array(this.rowCount + 1).join('0').split('').map(function(d, i) { return { index: i } })
            // $scope.rows = new Array(n + 1).join('0').split('').map(function(d, i) { return { index: i } })
            return res.data[0]
          })
          .finally(() => ROUTE.refresh(this._id).then(route => route.DSCompute())) // always make sure route in store is fresh copy
      }
    }
  });

  return ROUTE;
})
.run(Route => {});
