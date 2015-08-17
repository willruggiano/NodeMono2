app.config(function ($stateProvider) {
    $stateProvider.state('home', {
        url: '/',
        templateUrl: 'js/home/home.html',
        controller: ($scope, users, routes, pipes) => {
          $scope.users = users
          $scope.routes = routes
          $scope.pipes = pipes

          // check whether user agent is running chrome
          $scope.hasChrome = () => navigator.userAgent.toLowerCase().includes('chrome')
        },
        resolve: {
          users: (User) => User.findAll({}, { bypassCache: true }),
          routes: (Route) => Route.findAll({}, { bypassCache: true }),
          pipes: (Pipe) => Pipe.findAll({}, { bypassCache: true })
        }
    });
});
