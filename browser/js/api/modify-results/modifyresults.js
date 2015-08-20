app.config(($stateProvider) => {
  $stateProvider.state('api.modify', {
    url: '/modify',
    templateUrl: 'js/api/modify-results/modifyresults.html',
    controller: ($scope, data) => {
      let editor = ace.edit('editor')

      editor.setTheme('ace/theme/chrome')
      editor.getSession().setMode('ace/mode/javascript')


      $scope.modifiedData = data[0]
      $scope.updateDataPreview = () => console.log('updating data...')
      $scope.revertData = () => console.log('reverting data back to original form...')
    }
  })
})


// let defaultFilterFn = (data) => {
//   // filter functions are passed the whole API response object
//   // you may manipulate or add to this data as you want
//
//   /* YOUR CODE HERE */
//
//   return data
// }
