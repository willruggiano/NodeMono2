app.config(($stateProvider) => {
  $stateProvider.state('api.modify', {
    url: '/modify',
    templateUrl: 'js/api/modify-results/modifyresults.html',
    controller: ($scope) => {
      if(!$scope.crawlData.data){
        $scope.route.getCrawlData()
        .then((data) => {
          $scope.crawlData.data = data
          $scope.modifiedData = _.clone($scope.crawlData.data, true)
        })
      };
      let editor = ace.edit('editor')

      editor.setTheme('ace/theme/chrome')
      editor.getSession().setMode('ace/mode/javascript')
      editor.getSession().setTabSize(2)

      $scope.modifiedData = _.clone($scope.crawlData.data, true)
      $scope.updateDataPreview = () => {
        let fn = editor.getValue()
        $scope.modifiedData = eval(`${fn}; transform($scope.modifiedData)`)
      }
      $scope.revertData = () => {
        $scope.modifiedData = _.clone($scope.crawlData.data, true)
        editor.getSession().setValue(
`function transform(data) {
  // filter functions are passed the whole API response object
  // you may manipulate or add to this data as you want

  /* YOUR CODE HERE */

  return data
}`
        )
        // editor.focus()
      }
    }
  })
})
