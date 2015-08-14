app.config(($stateProvider) => {
  $stateProvider.state('user', {
    url: '/:id/profile',
    templateUrl: 'js/user_profile/user_profile.html',
    controller: ($scope, user) => {
      $scope.user = user
      console.log(`loaded user profile page for ${user.name}`)
      console.log(user)
    },
    resolve: {
      user: ($stateParams, User) => User.find($stateParams.id)
    }
  })
})
