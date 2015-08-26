app.directive('route', function() {
	return {
		restrict: 'E',
		templateUrl: 'js/pipes/route/route.html',
		scope: {
			route: '=',
			get: '&',
			toggle: '&'
		},
		link: function(scope) {
			scope.route.minimized = scope.route.url.replace(/.*\/\/(www\.)*/, '').replace(/\/$/, '').replace(/\?.*$/, '');

			scope.class = "item-inactive";

			scope.changeClass = function(){
				if (scope.class === "item-inactive")
					scope.class = "item-active";
				else
					scope.class = "item-inactive";
				};
		}
	};
});