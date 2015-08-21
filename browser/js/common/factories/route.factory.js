app.factory('Route', (DS, $state, $http) => {

  const ROUTE = DS.defineResource({
    name: 'route',
    endpoint: 'routes',
    relations: {
      belongsTo: {
        user: {
          // local field is for linking relations
          // route.user -> user(owner) of the route
          localField: '_user',
          // local key is the "join" field
          // the name of the field on the route that points to its parent user
          localKey: 'user'
        }
      }
    },
    computed: {
      lastRun: ['lastTimeCrawled', (lastTimeCrawled) => {
        let t = moment(lastTimeCrawled)
        if (moment().isSame(t, 'day')) return `Today at ${t.format('h:mm a')}`
        else return moment().from(t)
      }],
      crawlStatus: ['lastCrawlSucceeded', (lastCrawlSucceeded) => {
        return lastCrawlSucceeded ? 'Successful' : 'Unsuccessful'
      }]
    },
    methods: {
      go(userId) {
        $state.go('api.preview', { userid: userId, routeid: this._id })
      },
      getCrawlData() {
        console.log(`getting crawl data for ${this.name}`)
        return $http.get(`/api/routes/${this.user}/${this.name}`)
          .then(res => {
            this.rowCount = 0
            _.forOwn(res.data[0], (val, key) => {
              if (val.length > this.rowCount) this.rowCount = val.length
            })
            this.rowCount = new Array(this.rowCount + 1).join('0').split('').map(function(d, i) { return { index: i } })
            // $scope.rows = new Array(n + 1).join('0').split('').map(function(d, i) { return { index: i } })
            return res.data[0]
          })
          .finally(() => ROUTE.refresh(this._id).then(route => route.DSCompute())) // always make sure route in store is fresh copy
      },
      parseXML(o, tab) {
        /*  This work is licensed under Creative Commons GNU LGPL License.

        License: http://creativecommons.org/licenses/LGPL/2.1/
         Version: 0.9
        Author:  Stefan Goessner/2006
        Web:     http://goessner.net/
        */
       var toXml = function(v, name, ind) {
          var xml = "";
          if (v instanceof Array) {
             for (var i=0, n=v.length; i<n; i++)
                xml += ind + toXml(v[i], name, ind+"\t") + "\n";
          }
          else if (typeof(v) == "object") {
             var hasChild = false;
             xml += ind + "<" + name;
             for (var m in v) {
                if (m.charAt(0) == "@")
                   xml += " " + m.substr(1) + "=\"" + v[m].toString() + "\"";
                else
                   hasChild = true;
             }
             xml += hasChild ? ">" : "/>";
             if (hasChild) {
                for (var m in v) {
                   if (m == "#text")
                      xml += v[m];
                   else if (m == "#cdata")
                      xml += "<![CDATA[" + v[m] + "]]>";
                   else if (m.charAt(0) != "@")
                      xml += toXml(v[m], m, ind+"\t");
                }
                xml += (xml.charAt(xml.length-1)=="\n"?ind:"") + "</" + name + ">";
             }
          }
          else {
             xml += ind + "<" + name + ">" + v.toString() +  "</" + name + ">";
          }
          return xml;
       }, xml="";
       for (var m in o)
          xml += toXml(o[m], m, "");
       return tab ? xml.replace(/\t/g, tab) : xml.replace(/\t|\n/g, "");
      }
    }
  });

  return ROUTE;
})
.run(Route => {});
