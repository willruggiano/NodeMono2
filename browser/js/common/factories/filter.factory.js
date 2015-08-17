app.factory('Filter', (DS, $http) => {

  let Filter = DS.defineResource({
    name: 'filter',
    endpoint: 'filters',
    relations: {
      belongsTo: {
        pipe: {
          // local field is for linking relations
          // user.routes -> array of routes for the user
          localField: '_pipe',
          // foreign key is the 'join' field
          // the name of the field on a route that points to its parent user
          localKey: 'pipe'

          // ** what about filters belonging to multiple pipes? ** //

        }
      }
    },
    methods: {  // functionality added to every instance of Filter
      // save the custom filter to the db
      save: function() {
        return $http.post('/api/filters', this)
          .then(res => res.data);
      }
    }
  });

  return Filter;
})
.run(Filter => {});
