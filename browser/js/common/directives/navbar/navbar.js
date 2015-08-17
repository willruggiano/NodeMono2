app.directive('navbar', function ($rootScope, $state, AuthService, AUTH_EVENTS, User) {

    return {
        restrict: 'E',
        scope: {},
        templateUrl: 'js/common/directives/navbar/navbar.html',
        link: function (scope, elem, attr) {

            scope.items = [
                // { label: 'Home', state: 'home' },
                { label: 'Pipes', state: 'pipes'},
                { label: 'Documentation', state: 'docs' },
                { label: 'About', state: 'about' },
                { label: 'Help', state: 'help' },
                //{ label: 'Members Only', state: 'membersOnly', auth: true }
            ];

            scope.show = false

            scope.toggle = () => scope.show = !scope.show

            scope.search = () => {
              console.log('searching for something...')
            }

            scope.user = null;

            scope.isLoggedIn = function () {
                return AuthService.isAuthenticated();
            };

            scope.logout = function () {
                AuthService.logout()
                $state.go('login');
             };

            var setUser = function () {
                AuthService.getLoggedInUser()
                  .then(user => {
                    scope.user = user
                  })
            };

            var removeUser = function () {
                scope.user = null;
            };

            setUser();

            $rootScope.$on(AUTH_EVENTS.loginSuccess, setUser);
            $rootScope.$on(AUTH_EVENTS.logoutSuccess, removeUser);
            $rootScope.$on(AUTH_EVENTS.sessionTimeout, removeUser);

        }

    };

});
