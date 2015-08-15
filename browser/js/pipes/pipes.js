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

	// holds pipeline logic (what the user is making on this page)
	$scope.pipe = {
		// array of selected routes
		inputs: [],
		// array of the selected filters (and their order?)
		// / call it "pipeline" instead?
		filters: [],
		// array (for now) of the outputs from each pipe/input (for now)
		output: []
	};

	// returns crawled data for the passed in route
	$scope.getCrawlData = (route) => {
		console.log('crawling for', route.name);
		PipesFactory.getCrawlData(route)
			.then(function(data) {
				console.log('got data', data);
			});
	};

	// add route to pipe input
	$scope.selectRoute = (route) => {
		$scope.pipe.inputs.push(route);
	};

	// remove route from pipe input
	$scope.deselectRoute = (route) => {
		$scope.pipe.inputs = $scope.pipe.inputs.filter(input => input !== route);
	};

	// add filter to pipeline
	$scope.selectFilter = (filter) => {
		$scope.pipe.filters.push(filter);
	};

	// remove filter from pipeline
	$scope.deselectFilter = (filter) => {
		$scope.pipe.filters = $scope.pipe.filters.filter(pipe => pipe !== filter);
	};

	// run selected inputs through the pipe filters and return the output
	$scope.generateOutput = () => {

		PipesFactory.generateOutput($scope.pipe)
			.then(output => {
				console.log(output);
			});
	};

	// saves this pipe to the user db
	$scope.savePipe =() => {
		PipesFactory.savePipe()
			.then(data => {
				console.log('saved the pipe', data);
			});
	};

});