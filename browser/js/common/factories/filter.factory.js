app.factory('Filter', (DS, $http) => {

  const FILTER = DS.defineResource({
    name: 'filter',
    endpoint: 'filters',
    // relations: {
    //   belongsTo: {
    //     pipe: {
    //       // local field is for linking relations
    //       // user.routes -> array of routes for the user
    //       localField: '_pipe',
    //       // foreign key is the 'join' field
    //       // the name of the field on a route that points to its parent user
    //       localKey: 'pipe'

    //       // ** what about filters belonging to multiple pipes? ** //

    //       /// can't really figure out this problem, so populate the filters on backend

    //     }
    //   },
    //   // hasMany: {
    //   //   pipe: {
    //   //     localField: 'pipes',
    //   //     foreignKey: 'filters'
    //   //   }
    //   // }
    // },
    methods: {  // functionality added to every instance of Filter
      // save the custom filter to the db
      save: function() {
        return $http.post('/api/filters', this)
          .then(res => res.data);
      }
    }
  });

  // this is probably not best practices --
  FILTER.saveFilter = (filter) => {
    console.log('saving ', _.omit(filter, '_id'));
    return $http.post('/api/filters', _.omit(filter, '_id'))
      .then(res => res.data);
  };

  return Filter;
})
.run(Filter => {});
