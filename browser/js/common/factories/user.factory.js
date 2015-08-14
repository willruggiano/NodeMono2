app.factory('User', (DS, $state) => {

  let User = DS.defineResource({
    name: 'user',
    endpoint: 'users',
    relations: {
      hasMany: {
        route: {
          // local field is for linking relations
          // user.routes -> array of routes for the user
          localField: 'routes',
          // foreign key is the 'join' field
          // the name of the field on a route that points to its parent user
          foreignKey: 'userKey'
        }
      }
    },

    // functionality added to every instance of User
    methods: {
      go: function() {
        console.log(`transitioning to user state (${this.name}, ${this._id})`)
        $state.go('user', { id: this._id })
      }
    }
  })

  return User
})
.run(User => {})
