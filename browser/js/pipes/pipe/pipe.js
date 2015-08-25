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