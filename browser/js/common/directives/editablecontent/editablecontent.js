app.directive('editablecontent', () => {
  return {
    restrict: 'A',
    require: 'ngModel',
    scope: {
      editable: '=editable'
    },
    link: (scope, element, attr, ngModelCtrl) => {
      scope.$watch('editable', (e) => {
        console.log('new value:',e)
        if (!e) return false;
        else {
          let read = () => {
            console.log('html:',element.html())
            console.log('view val:',ngModelCtrl.$viewValue)
            ngModelCtrl.$setViewValue(element.html())
          }
          // ngModelCtrl.$render = () => {
          //   console.log('view val:',ngModelCtrl.$viewValue)
          //   element.html(ngModelCtrl.$viewValue || '')
          // }
          element.bind('blur keyup change', () => scope.$apply(read))
        }
      })
    }
  }
})
