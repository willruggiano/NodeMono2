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
        	},
        	pipes: function(PipesFactory) {
        		return PipesFactory.getPipes();
        	}
        }
    });
});

app.controller('PipesCtrl', function($scope, PipesFactory, routes, filters, pipes) {
	$scope.routes = routes;
	$scope.filters = filters;
	$scope.pipes = pipes;

	// for displaying errors
	$scope.error;

	// holds pipeline logic (what the user is making on this page)
	$scope.pipe = {
		// array of selected inputs (routes and pipes)
		inputs: {
			routes: [],
			pipes: []
		},
		// array of the selected filters (and their order?)
		filters: [],
		// array (for now) of the outputs from each pipe/input (for now) (for display only)
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
		$scope.pipe.inputs.routes.push(route);
	};

	// remove route from pipe input
	$scope.deselectRoute = (route) => {
		$scope.pipe.inputs.routes = $scope.pipe.inputs.routes.filter(input => input !== route);
	};

	// add route to pipe input
	$scope.selectPipe = (pipe) => {
		$scope.pipe.inputs.pipes.push(pipe);
	};

	// remove pipe from pipe input
	$scope.deselectPipe = (pipe) => {
		$scope.pipe.inputs.pipes = $scope.pipe.inputs.pipes.filter(input => input !== pipe);
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
				$scope.pipe.output = output;
			})
			.catch(err => {
				// display the error in some way
				$scope.error = err;
			});
	};

	// saves this pipe to the user db
	$scope.savePipe = () => {
		PipesFactory.savePipe($scope.pipe)
			.then(output => {
				$scope.pipe.output = output;
			})
			.catch(err => {
				// display the error in some way
				$scope.error = err;
			});
	};

});