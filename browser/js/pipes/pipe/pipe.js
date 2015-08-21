app.directive('pipe', function() {
	return {
		restrict: 'E',
		templateUrl: 'js/pipes/pipe/pipe.html',
		scope: {
			pipe: '=',
			get: '&',
			toggle: '&'
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