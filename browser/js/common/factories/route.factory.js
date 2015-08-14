app.factory('Route', (DS) => {

  let Route = DS.defineResource({
    name: 'route',
    endpoint: 'routes',
    relations: {
      belongsTo: {
        user: {
          // local field is for linking relations
          // route.user -> user(owner) of the route
          localField: 'user',
          // local key is the "join" field
          // the name of the field on the route that points to its parent user
          localKey: 'userKey',
          parent: true
        }
      }
    },
    methods: {
      go: function() {
        console.log(`transitioning to route state (${this.name}, ${this._id})`)
      }
    }
  })

  return Route
})
.run(Route => {})
