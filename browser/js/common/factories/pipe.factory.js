app.factory('Pipe', (DS, Route, Filter, $http, $q, $state) => {

  const PIPE = DS.defineResource({
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
      go(userId) {
        $state.go('pipe.preview', { userid: userId, pipeid: this._id });
      },
      getPipedData(remove) {
        return $http.get(`/api/pipes/${this.user}/${this.name}`, {params: {remove: remove}})
          .then(res => res.data);
      },
      generateOutput() {
        return this.getPipedData(true);
      },
      savePipe() {
        return this.getPipedData(false);
      },
      getInputs() {
        // find the input routes, then the input pipes
        var output = {};
        output.routes = this.inputs.routes.map(route => {
          return Route.get(route);
        });
        output.pipes = this.inputs.pipes.map(pipe => {
          return PIPE.get(pipe);
        });
        return output;
      },
      getFilters() {
        return $q.all(this.filters.map(filterId => Filter.find(filterId)));
      }
    }
  });

  return PIPE;
})
.run(Pipe => {})
