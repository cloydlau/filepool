let failTimes = 0, retryTimes = 3, cancelUpload

export function upload_preset ({
  file,
  MB,
  GB,
  sliceFile,
  setProgress,
  jsonToFormData,
  fileType,
}) {
  const chunkSize = 10 * MB

  failTimes = 0
  cancelUpload = null

  const CancelToken = require('axios').default.CancelToken
  let chunks = sliceFile(file, chunkSize), count = 0

  const formData = jsonToFormData({
    ...param,
    chunkTotal: chunks.length.toString(),
    fileName: file.name,
  })

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
            const pct = (chunkSize * count + progressEvent.loaded) / file.size
            setProgress(pct >= 1 ? .99 : pct)
          }
        },
        cancelToken: new CancelToken(function executor (c) {
          // executor 函数接收一个 cancel 函数作为参数
          cancelUpload = c
        }),
        ...typeof requestConfig === 'function' ? requestConfig(param) : requestConfig
      }).then(res => {
        let data = 'data' in res ? res.data : res
        if (data?.status === '200') {
          setProgress(1)
          resolve(data.url)
        } else if (count++ < chunks.length - 1) {
          formData.set('taskId', data.url)
          recursion()
        } else {
          setProgress(1)
          reject('上传失败')
        }
      }).catch(e => {
        //断点续传
        if (failTimes++ < retryTimes) {
          recursion()
        } else {
          reject(e)
        }
      })
    }

    recursion()
  })
}

export function onAbort_preset () {
  failTimes = Number.MAX_SAFE_INTEGER
  cancelUpload?.()
}
