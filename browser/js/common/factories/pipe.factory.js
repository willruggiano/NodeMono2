app.factory('Pipe', (DS, $http, $q) => {

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
      getFilters: () => {
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
      }
    }
  });

  return Pipe;
});
