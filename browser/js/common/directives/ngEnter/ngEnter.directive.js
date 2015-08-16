'use strict';

app.directive('ngEnter', () => {
	return {
		restrict: 'A',
		scope: {
			ngEnter: '&'
		},
		link: (scope, elem, attr) => {
			elem.bind('keydown keypress', (event) => {
				if (event.which == 13) {
					scope.$apply(() => {
            scope.ngEnter()
          })
					return false
				}
			})
		}
	}
})
