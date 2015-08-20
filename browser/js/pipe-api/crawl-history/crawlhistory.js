app.config(($stateProvider) => {
  $stateProvider.state('pipe.history', {
    url: '/history',
    templateUrl: 'js/pipe-api/crawl-history/crawlhistory.html',
    controller: ($scope) => {}
  })
})
