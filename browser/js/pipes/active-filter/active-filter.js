app.directive('activeFilter', function() {
	return {
		restrict: 'E',
		templateUrl: 'js/pipes/active-filter/active-filter.html',
		scope: {
			filter: '=',
			deselect: '&',
			save: '&'
		},
		link: function(scope) {
			scope.filter = angular.copy(scope.filter);
			scope.customize = false;
			scope.toggleCustomize = () => {
				scope.customize = !scope.customize;
			};
		}
	};
});