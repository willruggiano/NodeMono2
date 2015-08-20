app.config(($stateProvider) => {
  $stateProvider.state('api.history', {
    url: '/history',
    templateUrl: 'js/api/crawl-history/crawlhistory.html',
    controller: ($scope) => {}
  })
})
