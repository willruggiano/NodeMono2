var _ = require('lodash');

function interleave(obj) {
  var keys = Object.keys(obj);

  var maxLen = keys.reduce(function(max, key) {
    if (obj[key].length > max) return obj[key].length;
    else return max;
  }, 0);

  var mergedData = [],
      i = 0;

  var reduceFunc = function(accum, key) {
    accum[key] = obj[key][i];
    return accum;
  };

  _.times(maxLen, function() {
    var mergedObj = keys.reduce(reduceFunc, {});
    mergedData.push(mergedObj);
    i++;
  });

  return mergedData;
}

function toCSV(d) {
  let fields = Object.keys(d),
      data = interleave(d),
      csv = [],
      i = 0;

  data.forEach(datum => {
    ++i
    let row = []
    fields.forEach(field => {
      if (datum[field]) datum[field] = datum[field].replace(/\n/gi)
      row.push(!!datum[field] ? `"${datum[field]}"` : "")
    })
    csv.push(row.join(','));
  })

  csv.unshift(fields) // add headers
  return csv.join('\n')
}

function toRSS(o, tab) {
  o = interleave(o);
  var toXml = function(v, name, ind) {
      var xml = "";
      if (v instanceof Array) {
          for (var i = 0, n = v.length; i < n; i++) xml += ind + toXml(v[i], name, ind + "\t") + "\n";
      } else if (typeof(v) == "object") {
          var hasChild = false;
          xml += ind + "<" + name;
          for (var m in v) {
              if ((m.charAt(0) == "@") && v[m]) xml += " " + m.substr(1) + "=\"" + v[m].toString() + "\"";
              else hasChild = true;
          }
          xml += hasChild ? ">" : "/>";
          if (hasChild) {
              for (var m in v) {
                  if(v[m]){
                      if (m == "#text") xml += v[m];
                      else if (m == "#cdata") xml += "<![CDATA[" + v[m] + "]]>";
                      else if (m.charAt(0) != "@") xml += toXml(v[m], m, ind + "\t");
                  }
              }
              xml += (xml.charAt(xml.length - 1) == "\n" ? ind : "") + "</" + name + ">";
          }
      } else {
          xml += ind + "<" + name + ">" + v.toString() + "</" + name + ">";
      }
      return xml;
  }, xml = "";
  for (var m in o) xml += toXml(o[m], m, "");
  return tab ? xml.replace(/\t/g, tab) : xml.replace(/\t|\n/g, "");
}

module.exports = {
  toCSV: toCSV,
  toRSS: toRSS
};
