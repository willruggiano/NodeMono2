app.config(($stateProvider) => {
  $stateProvider.state('api.docs', {
    url: '/docs',
    templateUrl: 'js/api/api-docs/apidocs.html',
    controller: ($scope) => {}
  })
})
