app.directive('editablecontent', () => {
  return {
    restrict: 'A',
    require: 'ngModel',
    scope: {
      editable: '=editable'
    },
    link: (scope, element, attr, ngModelCtrl) => {
      scope.$watch('editable', (e) => {
        if (e) {
          let read = () => ngModelCtrl.$setViewValue(element.text())
          element.bind('blur keyup change', () => scope.$apply(read))
        }
      })
    }
  }
})
