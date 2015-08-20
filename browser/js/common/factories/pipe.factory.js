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
        var output = {};
        output.routes = this.inputs.routes.map(route => {
          return Route.get(route);
        });
        output.pipes = this.inputs.pipes.map(pipe => {
          return Pipe.get(pipe);
        });
        return output;
      }
    }
  });

  return Pipe;
});
