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
        @init="onInit"
        :beforeAddFile="beforeAddFile"
        @activatefile="onActivateFile"
        :disabled="Disabled"
        :beforeRemoveFile="beforeRemoveFile"
        :allowDrop="false"
        :onwarning="onWarning"
        :allowReorder="true"
        @reorderfiles="emitChange"
        @updatefiles="onUpdateFiles"
        v-bind="FilePondProps"
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
const FilePond = vueFilePond(
  FilePondPluginMediaPreview,
  FilePondPluginImagePreview,
  //FilepondPluginDragReorder,
)

import globalProps from './config'
import { MB, GB, headersToString, isArrayJSON, getFinalProp, sliceFile } from './utils'
import { isEmpty, typeOf, jsonToFormData } from 'kayran'
import { onAbort_preset } from './server'
import { name } from '../package.json'

import 'kikimore/dist/style.css'
import { Swal } from 'kikimore'
const { warning, confirm, error } = Swal

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
          console.error(`[${name}] upload需为function类型 或传false以进入离线模式`)
          return false
        }
        return true
      }
    },
    onAbort: Function,
    deleteConfirmation: {
      validator: value => ['boolean'].includes(typeOf(value)),
    },
    placeholder: String,
    value: {
      validator: value => ['string', 'null', 'array', 'file'].includes(typeOf(value)),
    },
    fileType: {
      type: [String, Array],
    },
    count: {
      validator: value => {
        if (!Number.isInteger(value)) {
          console.error('count需为正整数')
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
          console.error(`[${name}] maxSize必须为Number类型`)
          return false
        } else if (value <= 0) {
          console.error(`[${name}] maxSize必须大于0`)
          return false
        }
        return true
      }
    },
    base64Encoding: {},
    filePondProps: {
      type: Object
    }
  },
  computed: {
    FilePondProps () {
      return {
        ...globalProps.filePondProps,
        ...this.filePondProps
      }
    },
    FileTypeCatalog () {
      return {
        ...globalProps.fileTypeCatalog,
        image: {
          maxSize: 10,
          accept: '.jpg,.jpeg,.png',
          ...globalProps.fileTypeCatalog?.image,
          canPreview: true,
        },
        video: {
          maxSize: 200,
          accept: '.mp4',
          ...globalProps.fileTypeCatalog?.video,
          canPreview: true,
        },
        audio: {
          maxSize: 60,
          accept: '.mp3',
          ...globalProps.fileTypeCatalog?.audio,
          canPreview: true,
        },
        apk: {
          maxSize: 200,
          accept: '.apk',
          ...globalProps.fileTypeCatalog?.apk,
        },
        excel: {
          accept: '.xlsx,.xls',
          maxSize: 100,
          ...globalProps.fileTypeCatalog?.excel,
        },
      }
    },
    percentage () {
      const result = Math.round(this.progress * 100)
      // progressEvent.loaded 是可能大于 file.size 的
      return result > 100 ? 100 : result
    },
    Placeholder () {
      return getFinalProp(globalProps.placeholder, this.placeholder, '点击上传' + (this.acceptText ? `（${this.acceptText}）` : ''))
    },
    DeleteConfirmation () {
      return getFinalProp(globalProps.deleteConfirmation, this.deleteConfirmation)
    },
    Disabled () {
      return getFinalProp(globalProps.disabled, this.disabled, Boolean(this.elForm?.disabled))
    },
    accept () {
      if (this.fileType) {
        let arr = []
        if (typeof this.fileType === 'string') {
          arr = [this.FileTypeCatalog[this.fileType].accept]
        } else {
          this.fileType.map(v => {
            arr.push(this.FileTypeCatalog[v].accept)
          })
        }
        return arr.join(',')
      }
    },
    acceptText () {
      if (this.accept) {
        return '文件格式：' + this.accept.replace(/\./g, ' ').trim()
      }
    },
    Count () {
      return getFinalProp(globalProps.count, this.count, 1)
    },
    ValueType () {
      const result = getFinalProp(globalProps.valueType, this.valueType)?.toLowerCase()
      if (result === 'string' && this.fileForm === 'binary') {
        throw new Error(`[${name}] 文件形态为二进制时，文件的数据类型(valueType参数)不能配置为\'string\'`)
      }
      return result
    },
    Base64Encoding () {
      return getFinalProp(globalProps.base64Encoding, this.base64Encoding, false)
    },
    fileForm () {
      if (getFinalProp(globalProps.upload, this.upload) || (this.Url && this.Request)) {
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
          if (this.fileForm === 'url') {
            /*if (!isEmpty(proxy) || !isEmpty(localProxy)) {
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
            }*/
            // todo: 获取文件体积
            /*fetch(source, {
              mode: 'cors',
              method: 'HEAD'
            })
            .then(res => {
              if (res.headers) {
                headers(headersToString(res.headers))
              }
            })
            .catch(e => {
              console.error(e)
              console.warn(`[${name}] 获取文件体积失败 如果上方有跨域错误提示 说明由跨域造成`)
            })
            .finally(e => {
              load({
                body: null
              })
              // 或者load(null)
            })*/
            load({
              body: null
            })
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
  },
  components: { FilePond },
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
    fileType: {
      immediate: true,
      handler (n, o) {
        if (n) {
          for (let v of (Array.isArray(n) ? n : [n])) {
            if (!(v in this.FileTypeCatalog)) {
              throw Error('全局配置中不存在' + v + '类型')
            }
          }
        }
        if (!isEmpty(o)) {
          this.onUpdateFiles([])
        }
      }
    },
    fileForm: {
      immediate: true,
      handler (newVal) {
        this.handleUpdateFilesListener()
      }
    },
    Disabled (n) {
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
      /*if (!this.Disabled) {
        this.$nextTick(() => {
          if (this.fileForm === 'binary') {
            this.$refs.filePond.$off('updatefiles', this.onUpdateFiles)
          } else {
            this.$refs.filePond.$on('updatefiles', this.onUpdateFiles)
          }
        })
      }*/
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
      getFinalProp(globalProps.onAbort, this.onAbort, onAbort_preset)()
    },
    getMaxSize (extension) {
      if (this.maxSize) {
        return this.maxSize
      } else if (this.fileType) {
        if (this.fileType instanceof Array) {
          for (let v of this.fileType) {
            if (this.FileTypeCatalog[v].accept?.includes(extension)) {
              return this.FileTypeCatalog[v].maxSize
            }
          }
        }
        return this.FileTypeCatalog[this.fileType].maxSize
      }
      return globalProps.maxSize || 200
    },
    onWarning () {
      warning('超过数量上限，最多上传' + this.Count + '个')
    },
    getCurFileType (extension) {
      if (this.fileType) {
        // 允许多种文件类型时 需要遍历才能知道当前用户选择的文件属于哪种
        if (this.fileType instanceof Array) {
          for (let v of this.fileType) {
            if (this.FileTypeCatalog[v].accept?.includes(extension)) {
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
        for (let k in this.FileTypeCatalog) {
          if (this.FileTypeCatalog[k].canPreview && this.FileTypeCatalog[k].accept.includes(extension)) {
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
      warning('暂不支持预览该文件')
    },
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
      } else if (globalProps.upload) {
        promise = globalProps.upload(uploadParam)
      }

      if (promise instanceof Promise) {
        this.progress = 0
        promise.then(fileUrl => {
          this.addFile(fileUrl, 'local', curFileType)
        }).catch(e => {
          console.log(e)
          error(typeof e === 'string' ? e : '上传失败')
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
          const curFile = this.FileTypeCatalog[curFileType]
          curFile.curFile = curFile.curFile ? [...curFile.curFile, file.id] : [file.id]
        }
      })
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
      //this.sychronizing = true
      this.$emit('input', tempList)
      // fix: 用于el表单中 且校验触发方式为blur时 没有生效
      if (this.$parent?.$options?._componentTag === ('el-form-item') && this.$parent.rules?.trigger === 'blur') {
        // fix: el-form-item深层嵌套时事件触发早于updatefiles事件
        this.$parent.$nextTick(() => {
          this.$parent.$emit('el.form.blur')
        })
      }
    },

    /**
     * 生命周期
     */
    onInit () {
      console.log('onInit')
    },
    beforeAddFile (item) {
      console.log('beforeAddFile', item)
      const extension = item.file.name.replace(/.+\./, '.').toLowerCase()
      const curFileType = this.getCurFileType(extension)
      const validate = () => {
        /*function supportType(vidType, codType) {
          return document.createElement('video').canPlayType(vidType + ';codecs="' + codType + '"')
        }*/
        if (this.accept && !this.accept.includes(extension)) {
          warning(this.acceptText)
          return false
        }
        if (curFileType) {
          const curFile = this.FileTypeCatalog[curFileType]
          if (curFile.count && curFile.curFile && curFile.curFile.length >= curFile.count) {
            warning('该类型文件最多上传' + curFile.count + '个')
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
          warning('不能超过' + temp)
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
          //this.$refs.filePond.$on('updatefiles', this.onUpdateFiles)
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
    onUpdateFiles (files) {
      console.log('onUpdateFiles', files)
      // beforeAddFile返回false仍然会触发onUpdateFiles
      if (files?.[0]?.source instanceof File && this.fileForm !== 'binary') {
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
        //this.$refs.filePond.$off('updatefiles', this.onUpdateFiles)
      }
    },
    /*onActivatefile (file) {
      this.preview.src = file.source
      this.preview.show = true
    },*/
    beforeRemoveFile (item) {
      console.log('beforeRemoveFile', item)
      if (this.DeleteConfirmation) {
        return new Promise((resolve, reject) => {
          confirm({
            title: '删除文件',
            icon: 'warning',
          }).then(() => {
            for (let k in this.FileTypeCatalog) {
              if (this.FileTypeCatalog[k].curFile) {
                const i = this.FileTypeCatalog[k].curFile.indexOf(item.id)
                if (i !== -1) {
                  this.FileTypeCatalog[k].curFile.splice(i, 1)
                  resolve(true)
                }
              }
            }
            // 删除前开启监听 否则无法清空
            //this.$refs.filePond.$on('updatefiles', this.onUpdateFiles)
            resolve(true)
          }).catch(() => {
            resolve(false)
          })
        })
      } else {
        // 删除前开启监听 否则无法清空
        //this.$refs.filePond.$on('updatefiles', this.onUpdateFiles)
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
