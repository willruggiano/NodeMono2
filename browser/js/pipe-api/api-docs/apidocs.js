app.config(($stateProvider) => {
  $stateProvider.state('pipe.docs', {
    url: '/docs',
    templateUrl: 'js/pipe-api/api-docs/apidocs.html',
    controller: ($scope) => {}
  })
})
