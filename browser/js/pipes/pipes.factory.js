app.factory('PipesFactory', function($http, $q) {
	var fact = {};

	fact.getRoutes = () => {
		return $http.get('/api/routes')
			.then(res => res.data);
	};

	fact.getFilters = () => {
		return $http.get('/api/filters')
			.then(res => res.data);
	};

	fact.getPipes = () => {
		return $http.get('/api/pipes')
			.then(res => res.data);
	};

	fact.getCrawlData = (route) => {
		// dummy data for testing
		// return {title: [route.name, route.name + '1'], more: [route.url]};

		// get crawled data for the route
		return $http.get(`/api/routes/${route.user}/${route.name}`)
			.then(res => res.data);
	};

	fact.getPipedData = (pipe) => {
		// dummy data for testing
		// return {title: [pipe.name, pipe.name + '1'], more: [pipe.user]};

		// get crawled data for the pipe
		return $http.get(`/api/pipes/${pipe.user}/${pipe.name}`)
			.then(res => res.data);
	};

	fact.getAllInputData = (inputs) => {
		// fire off requests for crawled data
		var crawlPromises = inputs.routes.map(input => {
			return fact.getCrawlData(input);
		});
		// fire off requests for crawled data
		var pipePromises = inputs.pipes.map(input => {
			return fact.getPipedData(input);
		});
		// resolve when all promises resolve with their crawled data
		return $q.all(crawlPromises.concat(pipePromises));
	};

	// run selected inputs through the pipe filters and return the output
	fact.generateOutput = (pipe) => {
		// set save to false (don't persist this in the db)
		pipe.save = false;
		return postPipe(pipe);
	};

	// save pipe to db
	fact.savePipe = (pipe) => {
		// save is true b/c user is finalizing the pipe
		pipe.save = true;
		return postPipe(pipe);
	};

	// sends post request with a new pipe
	function postPipe(pipe) {
		// omit the output field - just for display, not saved in db
		return $http.post('/api/pipes', _.omit(pipe, 'output'))
			.then(res => res.data);
	}

	return fact;
});