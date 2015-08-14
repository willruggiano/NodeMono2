app.directive('nodemonoLogo', function () {
    return {
        restrict: 'E',
        templateUrl: 'js/common/directives/nodemono-logo/nodemono-logo.html',
        link: (scope, elem, attr) => {

          scope.installChromeExt = () => {
            console.log(`installing Nodemono chrome extension...`)
          }

        }
    };
});
