app.directive('pipeForm', function(){
	return {
		restrict: 'E',
		templateUrl: 'js/pipes/pipe/pipe-form/pipe-form.html',
		scope: {
			submit: '&',
			admin: '='
		}
	};
});