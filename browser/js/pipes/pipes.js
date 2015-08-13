app.config(function ($stateProvider) {
    $stateProvider.state('pipes', {
        url: '/pipes',
        templateUrl: 'js/pipes/pipes.html',
        controller: 'PipesCtrl',
        resolve: {
        	routes: function(PipesFactory) {
        		return PipesFactory.getRoutes();
        	},
        	filters: function(PipesFactory) {
        		return PipesFactory.getFilters();
        	}
        }
    });
});

app.controller('PipesCtrl', function($scope, PipesFactory, routes, filters) {
	$scope.routes = routes;
	$scope.filters = filters;

	// array of selected routes
	$scope.inputs = [];

	// array of the selected filters (and their order?)
	// / call it "pipeline" instead?
	$scope.pipes = [];

	// array (for now) of the outputs from each pipe/input (for now)
	$scope.output = [];

	// returns crawled data for the passed in route
	$scope.getCrawlData = (route) => {
		console.log('crawling for', route.name);
		return PipesFactory.getCrawlData(route)
			.then(function(data) {
				console.log('got data', data);
			});
	};

	// add route to pipe input
	$scope.selectRoute = (route) => {
		$scope.inputs.push(route);
	};

	// remove route from pipe input
	$scope.deselectRoute = (route) => {
		$scope.inputs = $scope.inputs.filter(input => input !== route);
	};

	// add filter to pipeline
	$scope.selectFilter = (filter) => {
		$scope.pipes.push(filter);
	};

	// remove filter from pipeline
	$scope.deselectFilter = (filter) => {
		$scope.pipes = $scope.pipes.filter(pipe => pipe !== filter);
	};

	// run selected inputs through the pipe filters and return the output
	$scope.generateOutput = () => {
		// get all the input's crawled data
		PipesFactory.getAllInputData($scope.inputs)
			.then(function(inputData) {
				console.log('input data', inputData);
				// run input data through the selected pipes (i.e. filters)
				return PipesFactory.pipe(inputData, $scope.pipes);
			})
			.then(function(pipedData) {
				// piped data, basically the output data (?)
				console.log('piped data', pipedData);
				$scope.output = pipedData;
			})
			.catch(function(err) {
				// handle errors
				console.error(err);
			});
	};

});