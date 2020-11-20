let fileTypeCatalog,
  maxSize,
  count,
  base64Encoding,
  delConfirmation,
  valueType,
  placeholder,
  upload,
  onAbort,

  // todo: deprecated
  request,
  requestConfig,
  url,
  param,
  valueHandler,
  headForSize,
  localProxy,
  proxy

export const init = (opts = {}) => {
  placeholder = opts.placeholder
  valueType = opts.valueType
  base64Encoding = opts.base64Encoding
  delConfirmation = opts.delConfirmation
  maxSize = opts.maxSize || 200
  count = opts.count
  fileTypeCatalog = {
    ...opts.fileTypeMap, // todo: deprecated
    ...opts.fileTypeCatalog,
    image: {
      maxSize: 10,
      accept: '.jpg,.jpeg,.png',
      ...opts.fileTypeMap?.image, // todo: deprecated
      ...opts.fileTypeCatalog?.image,
      canPreview: true,
    },
    video: {
      maxSize: 200,
      accept: '.mp4',
      ...opts.fileTypeMap?.video, // todo: deprecated
      ...opts.fileTypeCatalog?.video,
      canPreview: true,
    },
    audio: {
      maxSize: 60,
      accept: '.mp3',
      ...opts.fileTypeMap?.audio, // todo: deprecated
      ...opts.fileTypeCatalog?.audio,
      canPreview: true,
    },
    apk: {
      maxSize: 200,
      accept: '.apk',
      ...opts.fileTypeMap?.apk, // todo: deprecated
      ...opts.fileTypeCatalog?.apk,
    },
    excel: {
      accept: '.xlsx,.xls',
      maxSize: 100,
      ...opts.fileTypeMap?.excel,
      ...opts.fileTypeCatalog?.excel,
    },
  }
  onAbort = opts.onAbort
  upload = opts.upload

  // todo: deprecated
  url = opts.url
  request = opts.request
  requestConfig = opts.requestConfig
  param = opts.param
  valueHandler = opts.valueHandler
  localProxy = opts.localProxy
  proxy = opts.proxy
  headForSize = opts.headForSize
  if (opts.fileTypeMap) {
    console.warn('[Filepool] \'fileTypeMap\' has been deprecated，please use \'fileTypeCatalog\'')

    for (let k in fileTypeCatalog) {
      if (fileTypeCatalog[k].format) {
        console.warn('[Filepool] \'format\' has been deprecated，please use \'accept\'')

        fileTypeCatalog[k].accept = fileTypeCatalog[k].format.map(v => '.' + v).join(',')
      }
    }
  }
}

export {
  fileTypeCatalog,
  onAbort,
  maxSize,
  count,
  base64Encoding,
  delConfirmation,
  valueType,
  placeholder,
  upload,

  // todo: deprecated
  url,
  param,
  request,
  requestConfig,
  localProxy,
  proxy,
  headForSize,
  valueHandler,
}
