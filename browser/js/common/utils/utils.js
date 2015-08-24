app.service('Utils', function() {
  this.interleaveObj = (obj) => {
    let keys = Object.keys(obj)

    let maxLen = keys.reduce((max, key) => {
      if (obj[key].length > max) return obj[key].length
      else return max
    }, 0)

    let mergedData = [],
        i = 0

    let reduceFunc = (accum, key) => {
      accum[key] = obj[key][i]
      return accum
    }

    _.times(maxLen, () => {
      let mergedObj = keys.reduce(reduceFunc, {})
      mergedData.push(mergedObj)
      i++
    })

    return mergedData
  }
})
