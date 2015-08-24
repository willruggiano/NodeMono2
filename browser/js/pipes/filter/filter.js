app.directive('filter', function() {
	return {
		restrict: 'E',
		templateUrl: 'js/pipes/filter/filter.html',
		scope: {
			filter: '=',
			select: '&',
			active: '='
		},
		link: function(scope) {
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