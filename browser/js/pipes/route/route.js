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
			scope.route.minimized = scope.route.url.slice(8);

			scope.class = "todo";

			scope.changeClass = function(){
				if (scope.class === "todo")
					scope.class = "todo-done";
				else
					scope.class = "todo";
				};
		}
	};
});