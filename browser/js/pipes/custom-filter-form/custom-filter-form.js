app.directive('customFilterForm', function() {
	return {
		restrict: 'E',
		templateUrl: 'js/pipes/custom-filter-form/custom-filter-form.html',
		scope: {
			submit: '&'
		},
		link: function(scope) {

		}
	};
});