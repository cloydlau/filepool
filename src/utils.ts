import { isPlainObject, assignInWith, cloneDeep } from 'lodash-es'
import { validator } from 'kayran'
const { url } = validator

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
  // 兼容fetch
  if (headers instanceof Headers) {
    let arr = []
    for (let [key, value] of headers.entries()) {
      arr.push(`${key}: ${value}`)
    }
    return arr.join('\r\n')
  } else {
    return Object.keys(headers)
    .map(h => `${h}: ${headers[h]}`)
    .join('\r\n')
  }
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
 * @param {any} prop - 实例参数
 * @param {any} globalProps - 全局参数（可以有多个）
 * @param {any} defaultValue - 默认值
 * @return {any} 最终值
 */
export function getFinalProp () {
  const args = Array.from(arguments)
  const defaultValue = args[args.length - 1]
  let result = defaultValue
  //console.log('传参：', cloneDeep(args))
  for (let i = 0; i < args.length - 1; i++) {
    const prop = args[i]
    if (prop !== undefined) {
      if (i === 0 && typeof (defaultValue) === 'boolean') {
        result = ['', true].includes(prop) ? true : prop
      } else if (isPlainObject(prop)) {
        result = assignInWith(...args, (objValue, srcValue) => {
          return isPlainObject(srcValue) ? {
            ...srcValue,
            ...objValue,
          } : srcValue
        })
      } else {
        result = prop
      }
      break
    }
  }
  //console.log('生效：', result)
  return result
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

export function getExtension (name: string) {
  return name.replace(/.+\./, '').toLowerCase()
}

enum Unit {
  hour = 'hour',
  minute = 'minute',
  second = 'second'
}

function toStr (time: number, unit: string,): string {
  const system = unit === Unit.hour ? 24 : 60
  time %= system
  if (time < 0) {
    time += system
  }
  return (time < 10 ? '0' : '') + time
}

export function getMediaDuration (file: File | string): object {
  let src: string
  if (file instanceof File) {
    src = URL.createObjectURL(file)
  } else if (!url(file)) {
    src = file
  } else {
    console.error('获取媒体时长失败', file)
    return {}
  }
  return new Promise((resolve, reject) => {
    const media = document.createElement('video')
    media.preload = 'metadata'
    media.onloadedmetadata = () => {
      window.URL.revokeObjectURL(media.src)
      let seconds = media.duration
      let HH = '', mm = '', ss = ''
      if (seconds > 0) {
        seconds = Math.round(seconds)
        const hours = Math.floor(seconds / 3600)
        if (hours > 0) {
          HH = toStr(hours, Unit.hour) + ':'
        }
        mm = toStr(Math.floor(seconds / 60), Unit.minute) + ':'
        ss = toStr(seconds, Unit.second)
      }
      resolve({
        seconds,
        HHmmss: `${HH}${mm}${ss}`
      })
    }

    media.src = src
  })
}
