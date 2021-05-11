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
import { MB, GB, headersToString, isArrayJSON, getFinalProp, sliceFile, getExtension } from './utils'
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
      default: {}
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
      validator: value => value === '' || ['boolean'].includes(typeOf(value)),
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
    disabled: {
      validator: value => value === '' || ['boolean'].includes(typeOf(value)),
    },
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
    filePondProps: {
      type: Object
    }
  },
  computed: {
    FilePondProps () {
      return getFinalProp(this.filePondProps, globalProps.filePondProps)
    },
    FileTypeCatalog () {
      return getFinalProp(
        globalProps.fileTypeCatalog,
        {
          image: {
            maxSize: 10,
            accept: '.jpg,.jpeg,.png',
            __canPreview: true,
          },
          video: {
            maxSize: 200,
            accept: '.mp4',
            __canPreview: true,
          },
          audio: {
            maxSize: 60,
            accept: '.mp3',
            __canPreview: true,
          },
          apk: {
            maxSize: 200,
            accept: '.apk',
          },
          excel: {
            accept: '.xlsx,.xls',
            maxSize: 100,
          },
        }
      )
    },
    percentage () {
      const result = Math.round(this.progress * 100)
      // progressEvent.loaded 是可能大于 file.size 的
      return result > 100 ? 100 : result
    },
    Placeholder () {
      return getFinalProp(
        this.placeholder,
        globalProps.placeholder,
        '点击上传' + (this.acceptText ? `（${this.acceptText}）` : '')
      )
    },
    DeleteConfirmation () {
      return getFinalProp(
        this.deleteConfirmation,
        globalProps.deleteConfirmation,
      )
    },
    Disabled () {
      return getFinalProp(
        this.disabled,
        globalProps.disabled,
        Boolean(this.elForm.disabled)
      )
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
      return getFinalProp(this.count, globalProps.count, 1)
    },
    ValueType () {
      const result = getFinalProp(this.valueType, globalProps.valueType,)?.toLowerCase()
      if (result === 'string' && this.fileForm === 'binary') {
        throw new Error(`[${name}] 文件形态为二进制时，文件的数据类型(valueType参数)不能配置为\'string\'`)
      }
      return result
    },
    // value可能混杂不同的fileForm 因为会有初始值
    fileForm () {
      if (getFinalProp(this.upload, globalProps.upload)) {
        return 'url'
      } else {
        return 'binary'
      }
    },
    server () {
      // >filepond@4.17.1的版本 && fileForm === 'binary' && 清空文件再上传 满足这三个条件会导致报错
      return this.fileForm === 'binary' ? undefined : {
        load: (source, load, error, progress, abort, headers) => {
          console.log('server', arguments)
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
      files: undefined,
      progress: 1,
      unwatchValue: null,
    }
  },
  watch: {
    fileType: {
      immediate: true,
      handler (n, o) {
        // 参数校验
        if (n) {
          for (let v of (Array.isArray(n) ? n : [n])) {
            if (!(v in this.FileTypeCatalog)) {
              throw Error('全局配置中不存在' + v + '类型')
            }
          }
        }
        // 更换fileType时，清空value
        if (!isEmpty(o)) {
          this.onUpdateFiles([])
        }
      }
    },
    /*fileForm: {
      immediate: true,
      handler (newVal) {
        this.handleUpdateFilesListener()
      }
    },
    Disabled (n) {
      this.handleUpdateFilesListener()
    },*/
  },
  created () {
    this.unwatchValue = this.$watch('value', (n, o) => {
      if (n) {
        this.setFiles(this.value)
        // immediate时this.unwatchValue为空
        if (this.unwatchValue) {
          this.unwatchValue()
          this.unwatchValue = null
        }
      }
    }, {
      immediate: true
    })
  },
  mounted () {
    this.getSubWindowFeatures()
    window.addEventListener('resize', this.getSubWindowFeatures)
  },
  destroyed () {
    window.removeEventListener('resize', this.getSubWindowFeatures)
  },
  methods: {
    setFiles (value) {
      let files = []
      if (value) {
        const type = typeOf(value)
        if (type === 'string') {
          const arr = isArrayJSON(value)
          files = arr ? arr : [value]
        } else if (type === 'file') {
          files = [value]
        }
      }

      this.files = files.map(v => {
        const type = typeOf(v)
        return {
          ...type === 'string' && { source: v },
          options: {
            // https://pqina.nl/filepond/docs/patterns/api/filepond-object/#setting-initial-files
            // local调用load方法 limbo调用restore方法
            //type: 'local',
            ...type === 'file' && { file: v }
          }
        }
      })
    },
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
      getFinalProp(this.onAbort, globalProps.onAbort, onAbort_preset)()
    },
    getMaxSize (fileType) {
      return getFinalProp(
        this.maxSize,
        this.FileTypeCatalog[fileType]?.maxSize,
        globalProps.maxSize,
        200
      )
    },
    onWarning () {
      warning('超过数量上限，最多上传' + this.Count + '个')
    },
    extensionToFileType (extension) {
      // 兼容完整文件名
      extension = getExtension(extension)
      if (this.fileType) {
        // 允许多种文件类型时 需要遍历才能知道当前用户选择的文件属于哪种
        if (this.fileType instanceof Array) {
          for (let v of this.fileType) {
            if (new RegExp(`\\b${extension}\\b`).test(this.FileTypeCatalog[v].accept)) {
              return v
            }
          }
        }
        // 单一文件类型
        return this.fileType
      }
    },
    view (source) {
      // 不能用fileForm来判断
      if (typeof (source) === 'string') {
        window.open(source, '', this.subWindowFeatures)

        /*const extension = source.replace(/.+\./, '.').toLowerCase()
        for (let k in this.FileTypeCatalog) {
          if (
            this.FileTypeCatalog[k].__canPreview &&
            this.FileTypeCatalog[k].accept.includes(extension)
          ) {
            window.open(source, '', this.subWindowFeatures)
            return
          }
        }
        const subWindow = window.open(source, '', this.subWindowFeatures)*/
        // 仅下载 需要关闭
        /*subWindow.addEventListener('load', () => {
          subWindow.close()
        }, false)*/
      } else {
        warning('不支持预览二进制文件')
      }
    },
    doUpload (param, fileType) {
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
        //this.progress = 0
        promise
        .then(fileUrl => {
          this.addFile(fileUrl, fileType)
        })
        .catch(e => {
          console.error(e)
          error(typeof e === 'string' ? e : '上传失败')
        })
        .finally(() => {
          //this.progress = 1
        })
      } else {
        this.addFile(file, fileType)
      }
    },
    addFile (file, fileType) {
      // file可以是string或array
      this.$refs.filePond.addFiles(file)
      .then(items => {

      })
      .catch(e => {
        console.error(e)
      })
    },
    emitChange (files) {
      // value的同步意味着着files等待初始化的结束
      if (this.unwatchValue) {
        this.unwatchValue()
        this.unwatchValue = null
      }

      let value = files.map(v => this.fileForm === 'binary' ? v.file : v.source)
      if (this.ValueType === 'string') {
        value = this.Count === 1 ? value.toString() : JSON.stringify(value)
      }
      //auto模式
      else if (!this.ValueType && this.Count === 1) {
        value = this.fileForm === 'binary' ? value[0] : value.toString()
      }
      this.$emit('input', value)
      this.triggerElFormBlurring()
    },
    triggerElFormBlurring () {
      // fix: 用于el表单中 且校验触发方式为blur时 没有生效
      if (this.$parent?.$options?._componentTag === ('el-form-item') && this.$parent.rules?.trigger === 'blur') {
        // fix: el-form-item深层嵌套时事件触发早于updatefiles事件
        this.$parent.$nextTick(() => {
          this.$parent.$emit('el.form.blur')
        })
      }
    },
    validate ({ size, fileType, extension }) {
      /*function supportType(vidType, codType) {
        return document.createElement('video').canPlayType(vidType + ';codecs="' + codType + '"')
      }*/
      if (
        this.accept &&
        !new RegExp(`\\b${extension}\\b`).test(this.accept)
      ) {
        warning(this.acceptText)
        return false
      }
      if (fileType) {
        const curFileType = this.FileTypeCatalog[fileType]
        if (curFileType.count && curFileType.__fileIdList && curFileType.__fileIdList.length >= curFileType.count) {
          warning('该类型文件最多上传' + curFileType.count + '个')
          return false
        }

        const maxSize = this.getMaxSize(fileType) * MB
        if (size > maxSize) {
          let temp = ''
          if (maxSize >= GB) {
            temp = (maxSize / GB).toFixed(2) + 'G'
          } else {
            temp = (maxSize / MB).toFixed(2) + 'M'
          }
          warning('不能超过' + temp)
          return false
        }
      }

      return true
    },
    removeFile (id) {
      for (let k in this.FileTypeCatalog) {
        if (this.FileTypeCatalog[k].__fileIdList?.has(id)) {
          this.FileTypeCatalog[k].__fileIdList.delete(id)
          return
        }
      }
    },

    /**
     * 生命周期
     */
    /*onInit () {
      console.log('onInit')
    },*/
    beforeAddFile (item) {
      console.log('beforeAddFile', item)

      // 不校验初始值
      if (item.source instanceof File) {
        const extension = getExtension(item.source.name)
        const fileType = this.extensionToFileType(extension)
        const isValid = this.validate(({
          size: item.file.size, fileType, extension
        }))
        console.log('校验结果：', isValid)
        if (isValid) {
          this.doUpload({ file: item.file }, fileType)
        }
        return false
      } else {
        return true
      }
    },
    onUpdateFiles (items) {
      console.log('onUpdateFiles', items)

      // 记录每种类型的上传数量
      items.map(({ file, id }) => {
        const extension = file.name.replace(/.+\./, '.').toLowerCase()
        const fileType = this.extensionToFileType(extension)
        if (fileType) {
          const curFileType = this.FileTypeCatalog[fileType]
          if (curFileType.__fileIdList) {
            curFileType.__fileIdList.add(id)
          } else {
            curFileType.__fileIdList = new Set([id])
          }
        }
      })

      // beforeAddFile返回false仍然会触发onUpdateFiles
      /*if (items?.[0]?.source instanceof File && this.fileForm !== 'binary') {
        return false
      }*/

      /*const getValueLen = () => {
        if (this.value) {
          if (typeof this.value === 'string') {
            const arr = isArrayJSON(this.value)
            return arr ? arr.length : 1
          }
          return this.value.length
        }
        return 0
      }

      if (items.length !== getValueLen()) {
        this.emitChange(items)
      }*/

      /*if (this.fileForm === 'binary') {
        this.$refs.filePond.$off('updatefiles', this.onUpdateFiles)
      }*/
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
            this.removeFile(item.id)
            // 删除前开启监听 否则无法清空
            //this.$refs.filePond.$on('updatefiles', this.onUpdateFiles)
            resolve(true)
          }).catch(() => {
            resolve(false)
          })
        })
      } else {
        this.removeFile(item.id)
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
