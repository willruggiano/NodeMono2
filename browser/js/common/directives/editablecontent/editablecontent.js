app.directive('editablecontent', () => {
  return {
    restrict: 'A',
    require: 'ngModel',
    scope: {
      editable: '=editable'
    },
    link: (scope, element, attr, ngModelCtrl) => {
      scope.$watch('editable', (e) => {
        if (!e) return false;
        else {
          let read = () => ngModelCtrl.$setViewValue(element.html())
          ngModelCtrl.$render = () => element.html(ngModelCtrl.$viewValue || '')
          element.bind('blur keyup change', () => scope.$apply(read))
        }
      })
    }
  }
})
