import { isPlainObject, merge, cloneDeepWith } from 'lodash-es'
import Vue from 'vue'
import dayjs from 'dayjs'
import objectSupport from 'dayjs/plugin/objectSupport'
dayjs.extend(objectSupport)
import toObject from 'dayjs/plugin/toObject'
dayjs.extend(toObject)

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

// cloneDeep不支持Vue实例
function customizer (value: any) {
  if (value instanceof Vue) {
    return value
  }
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
  const defaultValue = arguments[arguments.length - 1]
  let result = defaultValue
  //console.log('传参：', arguments)
  for (let i = 0; i < arguments.length - 1; i++) {
    const prop = arguments[i]
    if (prop !== undefined) {
      if (i === 0 && typeof (defaultValue) === 'boolean') {
        result = ['', true].includes(prop) ? true : prop
      } else if (isPlainObject(prop)) { // todo: 无法判断Vue实例
        result = merge(undefined, ...cloneDeepWith(Array.from(arguments).reverse(), customizer)) // 会改变原对象
        //result = merge(...cloneDeepWith(Array.from(arguments).reverse(), customizer)) // 会改变原对象 // todo: ts报错
        break
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

export function secondsToText (second: number): string {
  const day = dayjs({ second })
  const { hours } = day.toObject()
  return day.format(hours > 0 ? 'HH:mm:ss' : 'mm:ss')
}
