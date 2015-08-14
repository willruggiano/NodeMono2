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
		// get crawled data for the route
		return $http.get(`/api/routes/${route.user}/${route.name}`)
			.then(res => res.data);
	};
	
	fact.getAllInputData = (inputRoutes) => {
		// fire off requests for crawled data
		var crawlPromises = inputRoutes.map(inputRoute => {
			return $http.get(`/api/routes/${inputRoute.user}/${inputRoute.name}`)
				.then(res => res.data);
		});
		// resolve when all promises resolve with their crawled data
		return $q.all(crawlPromises);
	};

	fact.pipe = (inputData, pipes) => {
		// nothing for now
		return inputData;
	};

	return fact;
});