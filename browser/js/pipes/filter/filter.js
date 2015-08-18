app.directive('filter', function() {
	return {
		restrict: 'E',
		templateUrl: 'js/pipes/filter/filter.html',
		scope: {
			filter: '=',
			select: '&',
			active: '='
		},
		link: function() {

		}
	};
});