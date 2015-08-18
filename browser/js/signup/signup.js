'use strict';

app.config(function($stateProvider){
  $stateProvider.state('signup', {
    url: '/signup',
    templateUrl: 'js/signup/signup.html',
    controller: 'SignupCtrl'
  })
})

app.controller('SignupCtrl', function($scope, AuthService, $state){
  $scope.credentials = {};

  $scope.signup = function(userData){
    //we have to create a way to avoid any duplication 
    //in the creation of users still.
    AuthService.signup(userData)
    .then(function(newUser){
      console.log("newUser", newUser)
      $state.go('home') // {id: signedInUser._id}
    })
  }
})