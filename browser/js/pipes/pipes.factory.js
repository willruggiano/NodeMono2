app.factory('PipesFactory', function($http, $q) {
	var fact = {};

	fact.getRoutes = () => {
		return $http.get('/api/routes')
			.then(res => res.data);
	};

	fact.getFilters = () => {
		// dummy filter data for now
		return [{
			name: 'length'
		}];
	};

	fact.getCrawlData = (route) => {
		// dummy data for testing
		// return {title: [route.name, route.name + '1'], more: [route.url]};

		// get crawled data for the route
		return $http.get(`/api/routes/${route.user}/${route.name}`)
			.then(res => res.data);
	};

	fact.getAllInputData = (inputRoutes) => {
		// fire off requests for crawled data
		var crawlPromises = inputRoutes.map(inputRoute => {
			return fact.getCrawlData(inputRoute);
		});
		// resolve when all promises resolve with their crawled data
		return $q.all(crawlPromises);
	};

	// run selected inputs through the pipe filters and return the output
	fact.generateOutput = (pipe) => {
		// get all the input's crawled data
		return fact.getAllInputData(pipe.inputs)
			.then(inputData => {
				console.log('input data', inputData);
				// run input data through the selected pipes (i.e. filters)
				return fact.pipe(inputData, pipe.filters);
			})
			.then(pipedData => {
				// piped data, basically the output data (?)
				console.log('piped data', pipedData);
				pipe.output = pipedData; // (?)
				return pipedData;
			})
			.catch(err => {
				// handle errors
				console.error(err);
			});
	};

	fact.pipe = (inputData, pipes) => {
		// nothing for now
		return inputData;
	};

	// fact.savePipe = ()

	return fact;
});