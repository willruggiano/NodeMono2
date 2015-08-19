app.factory('Route', (DS, $state, $http) => {

  let Route = DS.defineResource({
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
    methods: {
      go: function(userId) {
        $state.go('api', { userid: userId, routeid: this._id })
      },
      getCrawlData: function() {
        return $http.get(`/api/routes/${this.user}/${this.name}`)
          .then(res => res.data)
          .finally(() => Route.refresh(this._id))
      }
    }
  });

  return Route;
})
.run(Route => {});
