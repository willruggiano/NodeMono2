function registerPreviewCtrl(app) {
  app.controller('previewDataCtrl', function($scope, $rootScope) {
    $scope.showCollectionSelected = true;
    $scope.dataPreview = {};
    $scope.rows;
    $scope.getRowCount = function() {
      var n = 0
      for (var key in $scope.dataPreview) {
        var l = $scope.dataPreview[key].length
        if (l > n) n = l
      }
      return new Array(n + 1).join('0').split('').map(function(d, i) {
        return {
          index: i
        }
      })
    }

    $scope.showCollection = function() {
      $scope.showCollectionSelected = true;
    }
    $scope.backClicked = function() {
      $rootScope.showPreviewData = false;
    }
    $scope.showPreviewData = function() {
      $scope.showCollectionSelected = false;
      $rootScope.apiRoute.data.forEach(function(d) {
        $scope.dataPreview[d.name] = document.querySelectorAll(d.selector).map(function(elem) {
          if (d.attr) return elem[d.attr];
          return elem.textContent;
        })
      })
      $scope.headers = Object.keys($scope.dataPreview)
      $scope.rows = $scope.getRowCount();
    }

  })
}