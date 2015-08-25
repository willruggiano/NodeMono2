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