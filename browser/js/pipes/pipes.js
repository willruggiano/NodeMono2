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
	$scope.customizingFilter = false;

	$scope.right = "right";

	// for displaying errors
	$scope.error = undefined;

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
		// array of user custom filters
		userFilters: [],
		// array (for now) of the outputs from each pipe/input (for now) (for display only)
		output: []
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

	//add or remove from pipe input
	$scope.toggleRoute = (route) => {
		if ($scope.pipe.inputs.routes.indexOf(route) === -1){
			$scope.selectRoute(route);
		} else {
			$scope.deselectRoute(route);
		}
	};

	// add route to pipe input
	$scope.selectPipe = (pipe) => {
		$scope.pipe.inputs.pipes.push(pipe);
	};

	// remove pipe from pipe input
	$scope.deselectPipe = (pipe) => {
		$scope.pipe.inputs.pipes = $scope.pipe.inputs.pipes.filter(input => input !== pipe);
	};

	//add or remove from pipe input
	$scope.togglePipe = (pipe) => {
		if ($scope.pipe.inputs.routes.indexOf(pipe) === -1){
			$scope.selectRoute(pipe);
		} else {
			$scope.deselectRoute(pipe);
		}
	};

	// add filter to pipeline
	$scope.selectFilter = (filter) => {
		$scope.pipe.filters.push(filter);
	};

	// remove filter from pipeline
	$scope.deselectFilter = (filter) => {
		/// make this more robust
		$scope.pipe.filters = $scope.pipe.filters.filter(fil => fil.name !== filter.name);
	};

	// toggle showing custom filter form
	$scope.toggleCustomFilter = () => {
		$scope.customizingFilter = !$scope.customizingFilter;
	};

	// run selected inputs through the pipe filters and return the output
	$scope.generateOutput = () => {
		// don't send output (can't be stored in db, just for show)
		Pipe.create(_.omit($scope.pipe, 'output'))
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
		// don't send output (can't be stored in db, just for show)
		Pipe.create(_.omit($scope.pipe, 'output'))
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

	$scope.saveFilter = (filter) => {
		// convert csv to an array
		if (filter.type === 'singleElem' && !_.isArray(filter.keys)) {
			filter.keys = filter.keys.split(/\s*,\s*/);
		}
		// filter is new, not a default
		filter.defaultFilter = false;
		// save this filter to the db
		filter.save()
			.then(savedFilter => {
				// replace this filter in the pipe mockup with the id of the newly created filter
				var oldId = filter._id;
				$scope.pipe.filters = $scope.pipe.filters.map(fil => {
					if (fil._id === oldId) {
						return savedFilter;
					}
					return fil;
				});
			})
			.catch(err => {
				console.error('there was an error', err);
				return err;
			});
	};
});