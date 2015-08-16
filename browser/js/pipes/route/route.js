app.directive('route', function() {
	return {
		restrict: 'E',
		templateUrl: 'js/pipes/route/route.html',
		scope: {
			route: '=',
			get: '&',
			select: '&'
		},
		link: function() {
			
		}
	};
});