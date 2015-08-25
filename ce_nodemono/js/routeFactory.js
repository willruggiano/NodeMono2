function registerRouteFactory(app) {
  app.factory("Route", function($http, AUTH_EVENTS, Session) {
    function Route(props) {
      angular.extend(this, props);
      return this;

    };

    Route.serverUrl = '/api/routes/';

    Object.defineProperty(Route.prototype, 'serverUrl', {
      get: function() {
        return AUTH_EVENTS.serverUrl + Route.serverUrl;
      }
    })

    Route.prototype.isNew = function() {
      return !this._id
    };

    Route.prototype.fetch = function() {
      return $http.get(this.serverUrl)
        .then(function(res) {
          return res.data;
        })
    };

    Route.prototype.save = function(isNew) {
      var verb
      var serverUrl
      if (isNew) {
        verb = 'post'
          // serverUrl = Route.serverUrl
      } else {
        verb = 'put'
      }
      serverUrl = this.serverUrl
      return $http[verb](serverUrl, this)
        .then(function(res) {
          return res.data
        })
    }

    Route.prototype.destroy = function() {
      return $http.delete(this.serverUrl)
    }
    return Route;
  })
}