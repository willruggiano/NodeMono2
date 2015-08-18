app.directive('editablecontent', () => {
  return {
    restrict: 'A',
    require: '?ngModel',
    scope: {
      editable: '=editable'
    },
    link: (scope, elem, attr, ngModel) => {
      scope.$watch('editable', (e) => {
        if (!e) return false;
        else {
          let read = () => ngModel.$setViewValue(elem.html())
          ngModel.$render = () => elem.html(ngModel.$viewValue || '')
          elem.bind('blur keyup change', () => scope.$apply(read))
        }
      })
    }
  }
})
