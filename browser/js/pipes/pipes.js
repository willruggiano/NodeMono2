app.config(function ($stateProvider) {
    $stateProvider.state('pipes', {
        url: '/pipes',
        templateUrl: 'js/pipes/pipes.html',
        controller: 'PipesCtrl',
        resolve: {
        	routes: function(PipesFactory) {
        		
        	}
        }
    });
});

app.controller('PipesCtrl', function() {




});