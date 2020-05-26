import axios from 'axios'
const CancelToken = axios.CancelToken

let request, url, globalParam, localProxy, proxy, fileTypeMap, chunkSize, cancel, chunk, globalMaxSize, globalCount

let errTime = 0

const percentage = {
  value: 100
}

export const GB = Math.pow(1024, 3)
export const MB = Math.pow(1024, 2)

export const init = (opts = {}) => {
  request = opts.request
  chunk = typeof opts.chunk === 'boolean' ? opts.chunk : true
  chunkSize = (opts.chunkSize || 10) * MB
  url = opts.url || ''
  globalParam = opts.param || {}
  globalMaxSize = opts.maxSize || 200
  globalCount = opts.count || 1
  fileTypeMap = {
    ...opts.fileTypeMap,
    image: {
      format: ['jpg', 'jpeg', 'png'],
      maxSize: 10,
      ...opts.fileTypeMap?.image
    },
    video: {
      format: ['mp4'],
      maxSize: 200,
      ...opts.fileTypeMap?.video
    },
    audio: {
      format: ['mp3', 'wav'],
      maxSize: 60,
      ...opts.fileTypeMap?.audio
    },
    apk: {
      format: ['apk'],
      maxSize: 200,
      ...opts.fileTypeMap?.apk
    },
    excel: {
      format: ['xlsx', 'xls'],
      maxSize: 100,
      ...opts.fileTypeMap?.excel
    },
  }
  localProxy = opts.localProxy || {}
  proxy = opts.proxy || {}
}

export function api (data) {
  if (!url || !request) {
    return
  }

  percentage.value = 0

  //参数
  data = {
    ...globalParam,
    ...data,
  }

  const formData = new FormData()
  for (let k in data) {
    formData.append(k, data[k])
  }
  if (chunk) {
    errTime = 0
    let chunks = [], count = 0
    chunkFile(data.file, chunks)
    formData.append('chunkTotal', chunks.length.toString())
    formData.append('fileName', data.file.name)

    return new Promise((resolve, reject) => {
      function recursion () {
        formData.set('file', chunks[count])
        formData.set('chunk', count.toString())
        /*for (let v of formData.entries()) {
          console.log(v)
        }*/
        request({
          baseURL: '',
          url,
          method: 'POST',
          data: formData,
          timeout: 0,
          onUploadProgress (progressEvent) {
            if (progressEvent.lengthComputable) {
              let pct = Math.round((chunkSize * count + progressEvent.loaded) / data.file.size * 100)
              percentage.value = pct >= 100 ? 99 : pct
            }
          },
          cancelToken: new CancelToken(function executor (c) {
            // executor 函数接收一个 cancel 函数作为参数
            cancel = c
          })
        }).then(res => {
          let data = 'data' in res ? res.data : res
          console.log(data)
          if (data && data.status === '200') {
            percentage.value = 100
            resolve(data.url)
          } else if (count++ < chunks.length - 1) {
            formData.set('taskId', data.url)
            recursion()
          } else {
            percentage.value = 100
            reject('上传失败')
          }
        }).catch(e => {
          //断点续传
          if (errTime < 3) {
            recursion()
            errTime++
          }
        })
      }

      recursion()
    })
  } else {
    return new Promise((resolve, reject) => {
      request({
        baseURL: '',
        url,
        method: 'POST',
        data: formData,
        timeout: 0,
        onUploadProgress (progressEvent) {
          if (progressEvent.lengthComputable) {
            percentage.value = Math.round(progressEvent.loaded / data.file.size * 100)
          }
        },
      }).then(res => {
        percentage.value = 100
        return typeof res === 'string' ? res : res.data
      }).catch(e => {
        percentage.value = 100
        reject('上传失败')
      })
    })
  }
}

function chunkFile (file, chunks) {
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

function abort () {
  errTime = Number.MAX_VALUE
  cancel && cancel()
  percentage.value = 100
  //todo: 调接口清除分片文件
}

export { request, percentage, localProxy, proxy, fileTypeMap, abort, globalMaxSize, globalCount }