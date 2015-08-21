app.factory('Filter', (DS, $http) => {

  const FILTER = DS.defineResource({
    name: 'filter',
    endpoint: 'filters',
    methods: {  // functionality added to every instance of Filter
      // save the custom filter to the db
      save() {
        return $http.post('/api/filters', this)
          .then(res => res.data);
      },
      saveFilter() {
        return $http.post('/api/filters', _.omit(filter, '_id'))
          .then(res => res.data)
      }
    }
  })

  return FILTER;
})
.run(Filter => {});
