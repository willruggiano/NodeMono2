app.factory('Pipe', (DS, Route, $http, $q, $state) => {

  let Pipe = DS.defineResource({
    name: 'pipe',
    endpoint: 'pipes',
    relations: {
      belongsTo: {
        user: {
          localField: '_user', // mypipe._user => user obj
          localKey: 'user' // mypipe.user => user._id
        }
      }
    },
    methods: {
      go: function(userId) {
        $state.go('pipe.preview', { userid: userId, pipeid: this._id });
      },
      getFilters: function() {
        return $http.get('/api/filters')
          .then(res => res.data);
      },
      getPipedData: function(remove) {
        return $http.get(`/api/pipes/${this.user}/${this.name}`, {params: {remove: remove}})
          .then(res => res.data);
      },
      generateOutput: function() {
        return this.getPipedData(true);
      },
      savePipe: function() {
        return this.getPipedData(false);
      },
      getInputs: function() {
        // find the input routes, then the input pipes
        var routePromises = this.inputs.routes.map(route => {
          return Route.find(route);
        });
        var pipePromises = this.inputs.pipes.map(pipe => {
          return Pipe.find(pipe);
        });
        // wait for them all to be found, then return promise for object with routes and pipes properties
        var output = {};
        return $q.all(routePromises).then(routes => {
            output.routes = routes;
          return $q.all(pipePromises).then(pipes => {
            output.pipes = pipes;
            return output;
          });
        });
      }
    }
  });

  return Pipe;
});
