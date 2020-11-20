<template>
  <div>
    <div v-if="Disabled">
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
        <el-progress
          :text-inside="true"
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
          <el-button circle type="info" icon="el-icon-close" size="mini" plain @click="OnAbort"/>
        </el-tooltip>
      </div>
      <file-pond
        v-show="percentage===100"
        ref="filePond"
        :label-idle="Placeholder"
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
        :disabled="Disabled"
        :beforeRemoveFile="beforeRemoveFile"
        :allowDrop="false"
        :onwarning="onWarning"
        :allowReorder="true"
        @reorderfiles="emitChange"
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
  upload,
  url,
  request,
  requestConfig,
  param,
  fileTypeCatalog,
  localProxy,
  proxy,
  onAbort,
  maxSize,
  count,
  base64Encoding,
  delConfirmation,
  headForSize,
  valueType,
  valueHandler,
  placeholder,
} from './config'
import { MB, GB, getOrigin, headersToString, isArrayJSON, getFinalProp, sliceFile } from './utils'
import { Swal, isEmpty, typeOf, jsonToFormData } from 'plain-kit'
import { upload_preset, onAbort_preset } from './server'
const { warn, confirmation, err } = Swal

export default {
  name: 'Filepool',
  inject: {
    elForm: {
      default: ''
    },
  },
  props: {
    upload: {
      validator: value => {
        if (!['boolean', 'function'].includes(typeOf(value)) || value === true) {
          console.error('[Filepool] upload需为function类型 或传false以进入离线模式')
          return false
        }
        return true
      }
    },
    onAbort: Function,
    delConfirmation: {
      validator: value => ['boolean'].includes(typeOf(value)),
    },
    placeholder: String,
    value: {
      validator: value => ['string', 'null', 'array', 'file'].includes(typeOf(value)),
    },
    fileType: {
      type: [String, Array],
      validator: value => {
        if (value) {
          if (typeof value === 'string') {
            if (!(value in fileTypeCatalog)) {
              console.error('全局配置中不存在' + value + '类型')
              return false
            }
            return true
          } else {
            for (let v of value) {
              if (!(v in fileTypeCatalog)) {
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
          console.error('[Filepool] maxSize必须为Number类型')
          return false
        } else if (value <= 0) {
          console.error('[Filepool] maxSize必须大于0')
          return false
        }
        return true
      }
    },
    base64Encoding: {},

    // todo: deprecated
    url: String,
    param: Object,
    request: {
      validator: value => {
        if (!['boolean', 'function'].includes(typeOf(value)) || value === true) {
          console.error('[Filepool] request需为function类型 或传false以进入离线模式')
          return false
        }
        return true
      }
    }
  },
  computed: {
    percentage () {
      const result = Math.round(this.progress * 100)
      // progressEvent.loaded 是可能大于 file.size 的
      return result > 100 ? 100 : result
    },
    Placeholder () {
      return getFinalProp(placeholder, this.placeholder, '点击上传' + (this.acceptText ? `（${this.acceptText}）` : ''))
    },
    DelConfirmation () {
      return getFinalProp(delConfirmation, this.delConfirmation)
    },
    Disabled () {
      return this.disabled || (this.elForm || {}).disabled
    },
    accept () {
      if (this.fileType) {
        let arr = []
        if (typeof this.fileType === 'string') {
          arr = [fileTypeCatalog[this.fileType].accept]
        } else {
          this.fileType.map(v => {
            arr.push(fileTypeCatalog[v].accept)
          })
        }
        return arr.join(',')
      }
    },
    acceptText () {
      if (this.accept) {
        return '支持格式：' + this.accept.replace(/\./g, ' ').trim()
      }
    },
    Count () {
      return getFinalProp(count, this.count, 1)
    },
    ValueType () {
      const result = getFinalProp(valueType, this.valueType)?.toLowerCase()
      if (result === 'string' && this.fileForm === 'binary') {
        throw new Error('[Filepool] 文件形态为二进制时，文件的数据类型(valueType参数)不能配置为\'string\'')
      }
      return result
    },
    Base64Encoding () {
      return getFinalProp(base64Encoding, this.base64Encoding, false)
    },
    fileForm () {
      if (getFinalProp(upload, this.upload) || (this.Url && this.Request)) {
        return 'url'
      } else if (this.Base64Encoding) {
        return 'base64'
      } else {
        return 'binary'
      }
    },
    server () {
      // >filepond@4.17.1的版本 && fileForm === 'binary' && 清空文件再上传 满足这三个条件会导致报错
      return this.fileForm === 'binary' ? undefined : {
        load: (source, load, error, progress, abort, headers) => {
          // 回显文件大小
          if (headForSize && this.fileForm === 'url') {
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
            this.Request({
              url: source,
              method: 'HEAD'
            }).then(res => {
              if (res?.headers) {
                headers(headersToString(res.headers))
              }
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
          } else {
            load(null)
          }
          return {
            abort: () => {
              abort()
            }
          }
        },
      }
    },

    // todo: deprecated
    Url () {
      return getFinalProp(url, this.url)
    },
    Request () {
      return getFinalProp(request, this.request)
    },
    Param () {
      return {
        ...param,
        ...this.fileType && typeOf(fileTypeCatalog[this.fileType]?.param) === 'object' ?
          fileTypeCatalog[this.fileType]?.param : {},
        ...this.param
      }
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
      sychronizing: false,
      filename: '',
      subWindowFeatures: '',
      addingFile: false,
      files: [],
      progress: 1
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
        /*if (this.sychronizing) {
          this.sychronizing = false
          return
        }*/
        if (newVal) {
          if (typeof newVal === 'string') {
            const arr = isArrayJSON(newVal)
            newVal = arr ? arr : [newVal]
          } else if (newVal instanceof File) {
            newVal = [newVal]
          }
          if (newVal.length > 0 && newVal.length !== this.files.length) {
            this.files = newVal.map(v => {
              return {
                ...typeof v === 'string' && { source: v },
                options: {
                  type: 'local', // local调用load方法 limbo调用restore方法
                  ...v instanceof File && { file: v }
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
    },
    fileForm: {
      immediate: true,
      handler (newVal) {
        this.handleUpdateFilesListener()
      }
    },
    Disabled (newVal) {
      this.handleUpdateFilesListener()
    },
  },
  mounted () {
    this.getSubWindowFeatures()
    window.addEventListener('resize', this.getSubWindowFeatures)
  },
  destroyed () {
    window.removeEventListener('resize', this.getSubWindowFeatures)
  },
  methods: {
    handleUpdateFilesListener () {
      if (!this.Disabled) {
        this.$nextTick(() => {
          if (this.fileForm === 'binary') {
            this.$refs.filePond.$off('updatefiles', this.onUpdateFiles)
          } else {
            this.$refs.filePond.$on('updatefiles', this.onUpdateFiles)
          }
        })
      }
    },
    getSubWindowFeatures () {
      const width = window.screen.availWidth / 2
      const height = window.screen.availHeight / 2
      const top = window.screenTop + window.screen.availHeight / 4
      const left = window.screenLeft + window.screen.availWidth / 4
      this.subWindowFeatures = `height=${height},innerHeight=${height},width=${width},innerWidth=${width},top=${top},left=${left},toolbar=no,menubar=no,scrollbars=auto,resizeable=no,location=no,status=no`
    },
    onActivateFile (file) {
      this.view(file.source)
    },
    OnAbort () {
      this.progress = 1
      getFinalProp(onAbort, this.onAbort, onAbort_preset)()
    },
    getMaxSize (extension) {
      if (this.maxSize) {
        return this.maxSize
      } else if (this.fileType) {
        if (this.fileType instanceof Array) {
          for (let v of this.fileType) {
            if (fileTypeCatalog[v].accept?.includes(extension)) {
              return fileTypeCatalog[v].maxSize
            }
          }
        }
        return fileTypeCatalog[this.fileType].maxSize
      }
      return maxSize
    },
    onWarning () {
      warn('超过数量上限，最多上传' + this.Count + '个')
    },
    getCurFileType (extension) {
      if (this.fileType) {
        // 允许多种文件类型时 需要遍历才能知道当前用户选择的文件属于哪种
        if (this.fileType instanceof Array) {
          for (let v of this.fileType) {
            if (fileTypeCatalog[v].accept?.includes(extension)) {
              return v
            }
          }
        }
        // 单一文件类型
        return this.fileType
      }
    },
    view (source) {
      if (this.fileForm === 'url') {
        const extension = source.replace(/.+\./, '.').toLowerCase()
        for (let k in fileTypeCatalog) {
          if (fileTypeCatalog[k].canPreview && fileTypeCatalog[k].accept.includes(extension)) {
            window.open(source, '', this.subWindowFeatures)
            return
          }
        }
        const subWindow = window.open(source, '', this.subWindowFeatures)
        // 仅下载 需要关闭
        /*subWindow.addEventListener('load', () => {
          subWindow.close()
        }, false)*/
        return
      }
      warn('暂不支持预览该文件')
    },
    /*changeSwitch (isLink) {
      if (isLink && this.files && this.files[0] && this.files[0].source) {
        this.link = this.files[0].source
      } else if (this.link) {
        if (this.link.toLowerCase().endsWith('.mp4')) {
          this.files[0] = {
            source: this.link,
            options: {
              type: typeof this.Request === 'function' ? 'local' : 'limbo'
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
      if (this.DelConfirmation) {
        return new Promise((resolve, reject) => {
          confirmation({
            title: '删除文件',
            icon: 'warning',
          }).then(() => {
            for (let k in fileTypeCatalog) {
              if (fileTypeCatalog[k].curFile) {
                const i = fileTypeCatalog[k].curFile.indexOf(file.id)
                if (i !== -1) {
                  fileTypeCatalog[k].curFile.splice(i, 1)
                  resolve(true)
                }
              }
            }
            // 删除前开启监听 否则无法清空
            this.$refs.filePond.$on('updatefiles', this.onUpdateFiles)
            resolve(true)
          }).catch(() => {
            resolve(false)
          })
        })
      } else {
        // 删除前开启监听 否则无法清空
        this.$refs.filePond.$on('updatefiles', this.onUpdateFiles)
        return true
      }
    },
    doUpload (param, curFileType) {
      const file = param.file
      const uploadParam = {
        file,
        MB,
        GB,
        sliceFile,
        setProgress: progress => {
          this.progress = progress
        },
        jsonToFormData,
        fileType: this.fileType
      }
      let promise
      if (this.upload) {
        promise = this.upload(uploadParam)
      } else if (upload) {
        promise = upload(uploadParam)
      }
      // todo: deprecated
      else if (this.Url && this.Request) {
        promise = upload_preset({
          url: this.Url,
          request: this.Request,
          param: this.Param,
          requestConfig,
          ...uploadParam
        })
      }

      if (promise instanceof Promise) {
        promise.then(fileUrl => {
          this.addFile(valueHandler ? valueHandler(fileUrl) : fileUrl, 'local', curFileType)
        }).catch(e => {
          err(typeof e === 'string' ? e : '上传失败')
        }).finally(() => {
          this.progress = 1
        })
      } else {
        let reader = new FileReader()
        reader.readAsDataURL(file)
        reader.onload = (e) => {
          this.addFile(e.target.result, 'local', curFileType)
        }
      }
    },
    addFile (file, type, curFileType) {
      this.$refs.filePond.addFile(file, { type }).then(file => {
        if (curFileType) {
          const curFile = fileTypeCatalog[curFileType]
          curFile.curFile = curFile.curFile ? [...curFile.curFile, file.id] : [file.id]
        }
      })
    },
    onUpdateFiles (files) {
      // beforeAddFile返回false仍然会触发onUpdateFiles
      if (files && files[0]?.source instanceof File && this.fileForm !== 'binary') {
        return false
      }

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
        this.emitChange(files)
      }

      if (this.fileForm === 'binary') {
        this.$refs.filePond.$off('updatefiles', this.onUpdateFiles)
      }
    },
    emitChange (files) {
      let tempList = files.map(v => this.fileForm === 'binary' ? v.file : v.source)
      if (this.ValueType === 'string') {
        tempList = this.Count === 1 ? tempList.toString() : JSON.stringify(tempList)
      }
      //auto模式
      else if (!this.ValueType && this.Count === 1) {
        tempList = this.fileForm === 'binary' ? tempList[0] : tempList.toString()
      }
      // this.sychronizing = true
      this.$emit('change', tempList)
      // fix: 用于el表单中 且校验触发方式为blur时 没有生效
      if (this.$parent?.$options?._componentTag === ('el-form-item') && this.$parent.rules?.trigger === 'blur') {
        // fix: el-form-item深层嵌套时事件触发早于updatefiles事件
        this.$parent.$nextTick(() => {
          this.$parent.$emit('el.form.blur')
        })
      }
    },
    /*onActivatefile (file) {
      this.preview.src = file.source
      this.preview.show = true
    },*/
    handleFilePondInit () {
    },
    beforeAddFile (item) {
      const extension = item.file.name.replace(/.+\./, '.').toLowerCase()
      const curFileType = this.getCurFileType(extension)
      const validate = () => {
        /*function supportType(vidType, codType) {
          return document.createElement('video').canPlayType(vidType + ';codecs="' + codType + '"')
        }*/
        if (this.accept && !this.accept.includes(extension)) {
          warn(this.acceptText)
          return false
        }
        if (curFileType) {
          const curFile = fileTypeCatalog[curFileType]
          if (curFile.count && curFile.curFile && curFile.curFile.length >= curFile.count) {
            warn('该类型文件最多上传' + curFile.count + '个')
            return false
          }
        }
        const maxSize = this.getMaxSize(extension) * MB
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

        return true
      }

      /**
       * 不同文件类型触发流程：
       *   url:    File → plainObject
       *   base64: File → Blob
       *   File:   File
       */
      if (this.fileForm === 'binary') {
        const check = validate()
        if (check) {
          // 如果校验通过前就开启监听 会导致校验失败时仍触发onUpdateFiles
          this.$refs.filePond.$on('updatefiles', this.onUpdateFiles)
        }
        return check
      } else {
        if (typeOf(item.file) === 'file') {
          if (validate()) {
            // 记录转换为base64之前的文件名（转换后丢失）
            /*if (this.Base64Encoding) {
              this.filename = item.file.name
            }*/
            this.doUpload({ file: item.file }, curFileType)
          }
          return false
        } else {
          // 重置为正确的文件名
          /*if (this.filename && typeOf(item.file) === 'blob') {
            item.file.name = this.filename
            this.filename = ''
          }*/
          return true
        }
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
