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

/**
 * 参数有全局参数、实例参数和默认值之分 取哪个取决于用户传了哪个 此时有两个疑问：
 *   1. 怎么判断用户传没传？ —— 以该参数是否全等于undefined作为标识
 *   2. 如果传了多个，权重顺序是怎样的？ —— 全局＞实例＞默认
 *
 * @param {any} globalProp - 全局参数
 * @param {any} prop - 实例参数
 * @param {any} defaultValue - 默认值
 * @return {any} 最终
 */
export function getFinalProp (globalProp, prop, defaultValue) {
  return prop !== undefined ? prop :
    globalProp !== undefined ? globalProp :
      defaultValue
}
