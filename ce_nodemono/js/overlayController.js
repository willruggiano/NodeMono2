function registerOverlayCtrl(app) {
  console.log('registerOverlayCtrl');
  app.controller("OverlayCtrl", function($scope, $http, AuthService, $rootScope, AUTH_EVENTS, Route, Session) {
    $scope.showLogin = true;
    $scope.error = null;
    $scope.user;
    if (Session.user) $scope.user = Session.user;
    $scope.Depths = [{
      Id: "1",
      text: "10 pages max",
      value: 10
    }, {
      Id: "2",
      text: "15 pages max",
      value: 15
    }, {
      Id: "3",
      text: "25 pages max",
      value: 25
    }];
    $scope.backClicked = function() {
      $rootScope.showCollectionOverlay = false;
    }
    $scope.toggleLogin = function() {
      if ($scope.showLogin) {
        $scope.showLogin = false;
        $scope.showSignup = true;
      } else {
        $scope.showLogin = true;
        $scope.showSignup = false;
      }
    }
    $scope.sendLogin = function(user) {
      AuthService.login(user)
        .then(function(user) {
          $scope.user = Session.user;
        }).
      catch(function() {
        $scope.error = "Invalid credentials";
      });
    };
    $scope.signUpNewUser = function(user) {
      AuthService.signup(user)
        .then(function() {
          $scope.user = Session.user;
        });
    }

    $scope.createRoute = function() {
      // console.log($rootScope.user)
      if (!$rootScope.apiRoute.data.length) {
        $scope.error = "You must create some routes first";
      } else {
        console.log(Session.user);
        $rootScope.apiRoute.user = Session.user._id;
        $rootScope.apiRoute.url = document.URL;
        new Route($rootScope.apiRoute).save(true).then(function(res) {
          console.log(res);
          // $rootScope.prevRoutes.push(res.data);
        })
      }
    }


    $scope.addPagination = function() {

    }
  });
}