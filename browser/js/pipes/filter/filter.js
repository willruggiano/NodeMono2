app.directive('filter', function() {
	return {
		restrict: 'E',
		templateUrl: 'js/pipes/filter/filter.html',
		scope: {
			filter: '=',
			toggle: '&',
			save: '&',
			active: '='
		},
		link: function(scope) {
			scope.class = "item-inactive";
			scope.settingParameters = false;
			scope.parameterLength = range(scope.filter.parameters.length);

			function range (n) {
				var output = [];
				for (var i = 0; i < n; i++) {
					output.push(0);
				}
				return output;
			}

			scope.changeClass = function (){
				if (scope.class === "item-inactive")
					scope.class = "item-active";
				else
					scope.class = "item-inactive";
				};

			// ask for parameters if the filter expects them
			scope.toggleParams = function() {
				// check if filter expects parameters				
				if (scope.filter.parameters.length && !scope.settingParameters && scope.class === "item-inactive") {
					scope.settingParameters = true;
				} else {
					// if it doesn't, or they are already set, add filter to the pipe
					scope.settingParameters = false;
					scope.changeClass();
					scope.toggle(scope.filter);
				}
			};

			scope.cancelParams = function() {
				scope.settingParameters = false;
			};
		}
	};
});