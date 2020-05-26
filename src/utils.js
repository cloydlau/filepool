export function getOrigin (url) {
  if (url.startsWith('//')) {
    return '//' + new URL(window.location.protocol + url).host
  } else if (!url.startsWith('http')) {
    return new URL(window.location.protocol + '//' + url).host
  }
  const urlObj = new URL(url)
  return `${urlObj.protocol}//${urlObj.host}`
}

export function headersToString (headers) {
  return Object.keys(headers)
    .map(h => `${h}: ${headers[h]}`)
    .join('\r\n')
}

export function isArrayJSON (str) {
  if (typeof str == 'string' && str.startsWith('[') && str.endsWith(']')) {
    try {
      let obj = JSON.parse(str)
      return typeof obj === 'object' && obj
    } catch (e) {
      return false
    }
  }
  return false
}
