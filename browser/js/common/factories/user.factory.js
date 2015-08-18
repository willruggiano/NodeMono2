app.factory('User', (DS, Pipe, Route, $state) => {

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
          foreignKey: 'user'
        },
        pipe: {
          localField: 'pipes',
          foreignKey: 'user'
        }
      }
    },
    methods: {  // functionality added to every instance of User
      go: function() {
        $state.go('profile', { id: this._id });
      },
      getRoutes: function() {
        return Route.findAll({ 'user': this._id });
      },
      getPipes: function() {
        return Pipe.findAll({ 'user': this._id });
      }
    }
  });

  return User;
})
.run(User => {});
