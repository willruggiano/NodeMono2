app.directive('pipe', function() {
	return {
		restrict: 'E',
		templateUrl: 'js/pipes/pipe/pipe.html',
		scope: {
			pipe: '=',
			get: '&',
			select: '&'
		},
		link: function() {
			
		}
	};
});