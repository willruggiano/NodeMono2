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
          .then(res => res.data)
      },
      getPipedData: (pipe) => {
        return $http.get(`/api/pipes/${pipe.user}/${pipe.name}`)
          .then(res => res.data)
      },
      getAllInputData: (inputs) => {
        let crawlPromises = inputs.routes.map(input => Pipe.getCrawlData(input)),
            pipePromises = inputs.pipes.map(input => Pipe.getPipedData(input))

        return $q.all(crawlPromises.concat(pipePromises))
      },
      postPipe: function() {
        return $http.post('/api/pipes', _.omit(this, 'output'))
          .then(res => res.data)
      },
      generateOutput: function() {
        this.save = false
        return this.postPipe()
      },
      savePipe: function() {
        this.save = true
        return postPipe(this)
      }
    }
  })

  return Pipe
})
