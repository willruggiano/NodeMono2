app.config(($stateProvider) => {
  $stateProvider.state('api.use', {
    url: '/use',
    templateUrl: 'js/api/use-data/usedata.html',
    controller: ($scope) => {}
  })
})
