export const GB = Math.pow(1024, 3)
export const MB = Math.pow(1024, 2)

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
 * 参数有全局参数、实例参数和默认值之分 取哪个取决于用户传了哪个：
 *   1. 怎么判断用户传没传？ —— 以该参数是否全等于undefined作为标识
 *   2. 如果传了多个，权重顺序是怎样的？ —— 实例＞全局＞默认
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

export function sliceFile (file, chunkSize = 10 * MB) {
  let chunks = []
  if (file instanceof File) {
    if (file.size > chunkSize) {
      let start = 0, end = 0
      while (true) {
        if (end + chunkSize >= file.size) {
          chunks.push(file.slice(start))
          break
        } else {
          end += chunkSize
          let blob = file.slice(start, end)
          chunks.push(blob)
          start += chunkSize
        }
      }
    } else {
      chunks.push(file.slice(0))
    }
  }
  return chunks
}
