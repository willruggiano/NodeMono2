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
        return $http.get(`/api/routes/${this.user}/${this.name}`)
          .then(res => {
            return res.data[0]
          })
          .finally(() => ROUTE.refresh(this._id).then(route => route.DSCompute())) // always make sure route in store is fresh copy
          .catch((e) => console.log(`there seems to have been an error: ${e.toString()}`))
      },
      getCrawlDataByRouteConfig(url){
        var routeconfig = _.clone(this);
        routeconfig.url = url;
        return $http.post(`/api/routes/${this.user}/getCrawlDataByConfig`,routeconfig)
                    .then(res => {
                      return res.data[0]
                    })
                    .catch((e) => console.log(`there seems to have been an error: ${e.toString()}`))
      },
      getRowCount(data) {
          let rowCount = 0
            _.forOwn(data, (val, key) => {
              if (val.length > rowCount) rowCount = val.length
            })
          rowCount = new Array(rowCount + 1).join('0').split('').map(function(d, i) { return { index: i } })
          return rowCount;
      }
    }
  });

  return ROUTE;
})
.run(Route => {});
