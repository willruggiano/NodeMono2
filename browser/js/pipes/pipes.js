app.config(function ($stateProvider) {
    $stateProvider.state('pipes', {
        url: '/pipes',
        templateUrl: 'js/pipes/pipes.html',
        controller: 'PipesCtrl',
        resolve: {
        	user: function(AuthService, User) {
        		return AuthService.getLoggedInUser()
	        		.then(user => {
	        			return User.find(user._id);
	        		});
        	},
        	routes: function(user) {
        		return user.getRoutes();
        	},
        	pipes: function(user) {
        		return user.getPipes();
        	},
        	filters: function(Filter) {
        		return Filter.findAll();
        	}
        }
    });
});

app.controller('PipesCtrl', function($scope, Pipe, routes, filters, pipes, user) {
	$scope.routes = routes;
	$scope.filters = filters;
	$scope.pipes = pipes;

	// for displaying errors
	$scope.error;

	// holds pipeline logic (what the user is making on this page)
	$scope.pipe = {
		name: '',
		user: user._id,
		// array of selected inputs (routes and pipes)
		inputs: {
			routes: [],
			pipes: []
		},
		// array of the selected filters (and their order?)
		filters: [],
		// array (for now) of the outputs from each pipe/input (for now) (for display only)
		output: [],
		// default output format
		outputFormat: 'default'
	};

	// returns crawled data for the passed in route
	$scope.getCrawlData = (route) => {
		route.getCrawlData()
			.then(data => {
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
		Pipe.create($scope.pipe)
			.then(pipe => {
				return pipe.generateOutput();
			})
			.then(output => {
				$scope.pipe.output = output;
				$scope.error = undefined;
			})
			.catch(err => {
				// display the error in some way
				$scope.error = err;
			});
	};

	// saves this pipe to the user db, and returns its output
	$scope.savePipe = () => {
		Pipe.create($scope.pipe)
			.then(pipe => {
				return pipe.savePipe();
			})
			.then(output => {
				$scope.pipe.output = output;
				$scope.error = undefined;
			})
			.catch(err => {
				// display the error in some way
				$scope.error = err;
			});
	};

});