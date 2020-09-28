<template>
  <div>
    <div v-if="disabled">
      <el-link v-for="(v, index) of files" :key="index" @click="view(v.source)">点击查看 <i class="el-icon-view"/></el-link>
    </div>
    <template v-else>
      <!--<el-switch
              v-if="fileType==='video'&&percentage===100"
              style="margin-top:6px;margin-bottom:10px;"
              v-model="isLink"
              active-color="#a1c4fd"
              inactive-color="#c2e9fb"
              active-text="输入链接"
              inactive-text="本地上传"
              @change="changeSwitch">
      </el-switch>
      <el-input v-if="isLink" v-model="link" maxlength="500" show-word-limit @change="changeLink"
                placeholder="仅支持以.mp4结尾的视频链接"/>-->
      <div v-show="percentage<100" style="display:flex;justify-content:space-between;align-items:flex-end">
        <el-progress :text-inside="true"
                     :stroke-width="24"
                     :percentage="percentage"
                     style="margin-top:5px;display:inline-block;width:calc(100% - 30px)"
                     :color="[
                       {color: '#f56c6c', percentage: 20},
                       {color: '#e6a23c', percentage: 40},
                       {color: '#6f7ad3', percentage: 60},
                       {color: '#1989fa', percentage: 80},
                       {color: '#5cb87a', percentage: 100}
                     ]"
        />
        <el-tooltip content="取消上传">
          <el-button circle type="info" icon="el-icon-close" size="mini" plain @click="abort"/>
        </el-tooltip>
      </div>
      <file-pond v-show="percentage===100"
                 ref="filePond"
                 :label-idle="'点击上传'+(format?'（支持格式：'+format.join(', ')+'）':'')"
                 labelFileWaitingForSize="获取文件大小中..."
                 labelFileLoadError="加载失败"
                 labelFileLoading="加载中..."
                 labelTapToCancel="点击取消"
                 labelTapToRetry="点击重试"
                 labelFileProcessingComplete="上传成功"
                 labelTapToUndo="点击删除"
                 allow-multiple="true"
                 :server="server"
                 :files="files"
                 :max-files="Count||null"
                 @init="handleFilePondInit"
                 :beforeAddFile="beforeAddFile"
                 @activatefile="onActivateFile"
                 :disabled="disabled"
                 @updatefiles="onUpdateFiles"
                 :beforeRemoveFile="beforeRemoveFile"
                 :allowDrop="false"
                 :onwarning="onWarning"
      />
    </template>
  </div>
</template>

<script>
import vueFilePond from 'vue-filepond'
import 'filepond/dist/filepond.min.css'

import 'filepond-plugin-image-preview/dist/filepond-plugin-image-preview.min.css'
import FilePondPluginImagePreview from 'filepond-plugin-image-preview'

import FilePondPluginMediaPreview from 'filepond-plugin-media-preview'

//import FilepondPluginDragReorder from 'filepond-plugin-drag-reorder'

vueFilePond(
  FilePondPluginMediaPreview,
  FilePondPluginImagePreview,
  //FilepondPluginDragReorder,
)
import {
  api,
  request,
  fileTypeMap,
  MB,
  GB,
  percentage,
  localProxy,
  proxy,
  abort,
  globalMaxSize,
  globalCount,
  base64Encoding,
  headForSize,
  delConfirmation
} from './config'
import { warn, confirmation, isEmpty, typeOf } from 'plain-kit'
import { getOrigin, headersToString, isArrayJSON } from './utils'

export default {
  name: 'Filepool',
  props: {
    value: {
      validator: value => ['String', 'Null', 'Array'].includes(typeOf(value)),
    },
    param: {
      type: Object,
      default: () => {}
    },
    fileType: {
      type: [String, Array],
      validator: value => {
        if (value) {
          if (typeof value === 'string') {
            if (!(value in fileTypeMap)) {
              console.error('全局配置中不存在' + value + '类型')
              return false
            }
            return true
          } else {
            for (let v of value) {
              if (!(v in fileTypeMap)) {
                console.error('全局配置中不存在' + v + '类型')
                return false
              }
            }
            return true
          }
        }
        return true
      },
    },
    count: {
      validator: value => {
        if (!Number.isInteger(value)) {
          console.error('count必须为Number类型的正整数')
          return false
        } else if (value < 1) {
          console.error('count不能小于1')
          return false
        }
        return true
      }
    },
    disabled: Boolean,
    valueType: String,
    maxSize: {
      validator: value => {
        if (typeof value !== 'number') {
          console.error('maxSize必须为Number类型')
          return false
        } else if (value <= 0) {
          console.error('maxSize必须大于0')
          return false
        }
        return true
      }
    },
    base64Encoding: {}
  },
  computed: {
    format () {
      if (this.fileType) {
        if (typeof this.fileType === 'string') {
          return fileTypeMap[this.fileType].format
        } else if (this.fileType.length === 1) {
          return fileTypeMap[this.fileType[0]].format
        } else {
          return this.fileType.reduce((prev, v) => {
            return prev instanceof Array ? prev.concat(fileTypeMap[v].format) : [...fileTypeMap[prev].format || [], ...fileTypeMap[v].format || []]
          })
        }
      }
    },
    Count () {
      return this.count || globalCount
    },
    Param () {
      return {
        ...this.fileType && ({}).toString.call(fileTypeMap[this.fileType]?.param).slice(8, -1) === 'Object' ?
          fileTypeMap[this.fileType]?.param : {},
        ...this.param
      }
    },
    ValueType () {
      return this.valueType?.toLowerCase()
    },
    subWindowFeatures () {
      const width = window.screen.availWidth / 2
      const height = window.screen.availHeight / 2
      const top = window.screen.availHeight / 4
      const left = window.screen.availWidth / 4
      return `height=${height},innerHeight=${height},width=${width},innerWidth=${width},top=${top},left=${left},toolbar=no,menubar=no,scrollbars=auto,resizeable=no,location=no,status=no`
    },
    Base64Encoding () {
      return typeof this.base64Encoding === 'boolean' ?
        this.base64Encoding :
        typeof base64Encoding === 'boolean' ?
          base64Encoding :
          false
    },
  },
  data () {
    return {
      /*isLink: false,
      link: '',
      preview: {
        show: false,
        src: null
      },*/
      percentage: percentage.value,
      server: {
        load: (source, load, error, progress, abort, headers) => {
          if (headForSize && typeof request === 'function') {
            if (!isEmpty(proxy) || !isEmpty(localProxy)) {
              let origin = ''
              try {
                origin = getOrigin(source)
              } catch (e) {
                console.error('非法的文件路径：' + source)
              }
              if (origin) {
                for (let k in proxy) {
                  if (origin.includes(proxy[k])) {
                    source = source.replace(origin, window.location.origin + k)
                  }
                }
                if (['localhost', '127.0.0.1'].includes(window.location.hostname)) {
                  for (let k in localProxy) {
                    if (origin.includes(localProxy[k])) {
                      source = source.replace(origin, window.location.origin + k)
                    }
                  }
                }
              }
            }
            request({
              url: source,
              method: 'HEAD'
            }).then(res => {
              headers(headersToString(res.headers))
            }).finally(e => {
              load({
                body: null
              })
              //或者load(null)
            })
            /*fetch(source, {
              mode: 'cors',
            }).then(res => {
              return res.blob()
            }).then(load)*/
          }
          return {
            abort: () => {
              abort()
            }
          }
        },
      },
      files: []
    }
  },
  model: {
    prop: 'value',
    event: 'change'
  },
  watch: {
    value: {
      immediate: true,
      handler (newVal, oldVal) {
        if (newVal) {
          if (typeof newVal === 'string') {
            const arr = isArrayJSON(newVal)
            newVal = arr ? arr : [newVal]
          }
          if (newVal.length > 0 && newVal.length !== this.files.length) {
            this.files = newVal.map(v => {
              return {
                source: v,
                options: {
                  type: typeof request === 'function' ? 'local' : 'limbo'
                }
              }
            })
          }
        } else {
          this.files = []
        }
      }
    },
    //更换fileType时，清空value
    fileType (newVal, oldVal) {
      if (!isEmpty(oldVal)) {
        this.onUpdateFiles([])
      }
    }
  },
  created () {
    this.watchProp(percentage, 'value', newVal => {
      this.percentage = newVal
    })
  },
  methods: {
    onActivateFile (file) {
      this.view(file.source)
    },
    abort,
    getMaxSize (format) {
      if (this.maxSize) {
        return this.maxSize
      } else if (this.fileType) {
        if (this.fileType instanceof Array) {
          for (let v of this.fileType) {
            if (fileTypeMap[v].format?.includes(format)) {
              return fileTypeMap[v].maxSize
            }
          }
        }
        return fileTypeMap[this.fileType].maxSize
      }
      return globalMaxSize
    },
    onWarning () {
      warn('超过数量上限，最多上传' + this.Count + '个')
    },
    getCurFileType (format) {
      if (this.fileType) {
        if (this.fileType instanceof Array) {
          for (let v of this.fileType) {
            if (fileTypeMap[v].format?.includes(format)) {
              return v
            }
          }
        }
        return this.fileType
      }
    },
    view (source) {
      window.open(source, '', this.subWindowFeatures)
    },
    /*changeSwitch (isLink) {
      if (isLink && this.files && this.files[0] && this.files[0].source) {
        this.link = this.files[0].source
      } else if (this.link) {
        if (this.link.toLowerCase().endsWith('.mp4')) {
          this.files[0] = {
            source: this.link,
            options: {
              type: typeof request === 'function' ? 'local' : 'limbo'
            }
          }
        } else {
          this.files.length = 0
          warn('仅支持以.mp4结尾的视频链接')
        }
      } else {
        this.files.length = 0
      }
    },
    changeLink (source) {
      this.$emit('change', source)
    },*/
    watchProp (target, property, callback) {
      let temp = target[property]

      Object.defineProperty(target, property, {
        get () {
          return temp
        },
        set (newVal) {
          temp = newVal
          callback && callback(newVal)
        },
      })

      target[property] = temp
    },
    beforeRemoveFile (file) {
      return delConfirmation ? new Promise((resolve, reject) => {
        confirmation({
          title: '删除文件',
          icon: 'warning',
        }).then(() => {
          for (let k in fileTypeMap) {
            if (fileTypeMap[k].curFile) {
              const i = fileTypeMap[k].curFile.indexOf(file.id)
              if (i !== -1) {
                fileTypeMap[k].curFile.splice(i, 1)
                resolve(true)
              }
            }
          }
          resolve(true)
        }).catch(() => {
          resolve(false)
        })
      }) : true
    },
    upload (param, curFileType) {
      fn.call(this, param.file)

      function fn (file) {
        let promise = api({ ...this.Param, file })
        if (promise) {
          promise.then(fileUrl => {
            this.addFile(fileUrl, 'local', curFileType)
          })
        } else {
          if (this.Base64Encoding) {
            let reader = new FileReader()
            reader.readAsDataURL(file)
            reader.onload = (e) => {
              this.addFile(e.target.result, 'limbo', curFileType)
            }
          } else {
            this.addFile(file, 'local', curFileType)
          }
        }
      }
    },
    addFile (file, type, curFileType) {
      this.$refs.filePond.addFile(file, { type }).then(file => {
        if (curFileType) {
          const curFile = fileTypeMap[curFileType]
          curFile.curFile = curFile.curFile ? [...curFile.curFile, file.id] : [file.id]
        }
      })
    },
    onUpdateFiles (files) {
      console.log('onUpdateFiles')
      return
      /*if (files && files[0] && files[0].source instanceof File) {
        return
      }*/

      const getValueLen = () => {
        if (this.value) {
          if (typeof this.value === 'string') {
            const arr = isArrayJSON(this.value)
            return arr ? arr.length : 1
          }
          return this.value.length
        }
        return 0
      }

      if (files.length !== getValueLen()) {
        let tempList = files.map(v => v.source)
        if (this.ValueType === 'string') {
          tempList = this.Count === 1 ? tempList.toString() : JSON.stringify(tempList)
        }
        //auto模式
        else if (!this.ValueType && this.Count === 1) {
          tempList = tempList.toString()
        }
        this.$emit('change', tempList)
        //fix: 用于el表单中 且校验触发方式为blur时 没有生效
        if (this.$parent?.$options?._componentTag === ('el-form-item') && this.$parent.rules?.trigger === 'blur') {
          this.$parent.$emit('el.form.blur')
        }
      }
    },
    /*onActivatefile (file) {
      this.preview.src = file.source
      this.preview.show = true
    },*/
    handleFilePondInit () {
    },
    beforeAddFile (item) {
      console.log('beforeAddFile')
      return true


      if (item.file instanceof File) {
        /*function supportType(vidType, codType) {
           return document.createElement('video').canPlayType(vidType + ';codecs="' + codType + '"')
        }*/
        const format = item.file.name.replace(/.+\./, '').toLowerCase()
        if (this.format && this.format.length > 0 && !this.format.includes(format)) {
          warn('仅支持' + this.format.join(', '))
          return false
        }
        const curFileType = this.getCurFileType(format)
        if (curFileType) {
          const curFile = fileTypeMap[curFileType]
          if (curFile.count && curFile.curFile && curFile.curFile.length >= curFile.count) {
            warn('该类型文件最多上传' + curFile.count + '个')
            return false
          }
        }
        const maxSize = this.getMaxSize(format) * MB
        if (item.file.size > maxSize) {
          let temp = ''
          if (maxSize >= GB) {
            temp = (maxSize / GB).toFixed(2) + 'G'
          } else {
            temp = (maxSize / MB).toFixed(2) + 'M'
          }
          warn('不能超过' + temp)
          return false
        }

        this.upload({ file: item.file }, curFileType)
        return false
      } else {
        return true
      }
    },
  }
}
</script>

<style lang="scss" scoped>
::v-deep .filepond--file {
  cursor: pointer;
  transform: translateZ(0);
  overflow: hidden;

  .filepond--file-info-sub {
    display: none;
  }
}

::v-deep .filepond--file:before {
  content: "";
  position: absolute;
  z-index: -1;
  left: 51%;
  right: 51%;
  bottom: 0;
  background: #a4e2c6;
  height: 5px;
  transition-property: left, right;
  transition-duration: 0.3s;
  transition-timing-function: ease-out;
}

::v-deep .filepond--file:hover:before {
  left: 0;
  right: 0;
}

::v-deep .filepond--file:hover {
  box-shadow: 2px 2px 10px rgba(0, 0, 0, .9);
}

::v-deep .el-button--mini.is-circle {
  padding: 5px;
}

::v-deep .el-link {
  margin-right: 16px;
}
</style>
