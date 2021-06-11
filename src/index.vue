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
        credits=""
        :label-idle="Placeholder"
        labelFileWaitingForSize="获取文件体积中..."
        labelFileLoadError="加载失败"
        labelFileLoading="加载中..."
        labelTapToCancel="点击取消"
        labelTapToRetry="点击重试"
        labelFileProcessingComplete="上传成功"
        labelTapToUndo="点击删除"
        allow-multiple="true"
        :files="files"
        :max-files="MaxCount"
        :beforeAddFile="beforeAddFile"
        :disabled="Disabled"
        :beforeRemoveFile="beforeRemoveFile"
        :allowDrop="false"
        :onwarning="onWarning"
        :allowReorder="true"
        @activatefile="onActivateFile"
        @reorderfiles="onReorderFiles"
        @updatefiles="onUpdateFiles"
        :server="server"
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
  //FilePondPluginMediaPreview,
  //FilePondPluginImagePreview,
  //FilepondPluginDragReorder,
)

import globalProps from './config'
import { MB, GB, headersToString, isArrayJSON, getFinalProp, sliceFile, getExtension, secondsToText } from './utils'
import { isEmpty, typeOf, jsonToFormData, waitFor, getMediaDuration } from 'kayran'
import { name } from '../package.json'
const prefix = `[${name}] `

import 'kikimore/dist/style.css'
import { Swal } from 'kikimore'
const { warning, confirm, error } = Swal
import { throttle } from 'lodash-es'

export default {
  name: 'Filepool',
  inject: {
    elForm: {
      default: {}
    },
  },
  props: {
    duration: [Number, Array],
    upload: {
      validator: value => {
        if (!['boolean', 'function'].includes(typeOf(value)) || value === true) {
          console.error(`${prefix}upload需为function类型 或传false以进入离线模式`)
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
    count: [Number, Array],
    disabled: {
      validator: value => value === '' || ['boolean'].includes(typeOf(value)),
    },
    valueType: String,
    size: [Number, Array],
  },
  computed: {
    FilePondProps () {
      let temp = {}
      Object.keys(this.$attrs).filter(v => !Object.keys(this.$props).includes(v)).map(v => {
        temp[v] = getFinalProp(this.$attrs[v], globalProps[v],)
      })
      return temp
    },
    FileTypeCatalog () {
      return getFinalProp(
        globalProps.fileTypeCatalog,
        {
          image: {
            size: 10,
            accept: '.jpg,.jpeg,.png',
            __canPreview: true,
          },
          video: {
            size: 200,
            accept: '.mp4',
            __canPreview: true,
          },
          audio: {
            size: 60,
            accept: '.mp3',
            __canPreview: true,
          },
          apk: {
            size: 200,
            accept: '.apk',
          },
          excel: {
            accept: '.xlsx,.xls',
            size: 100,
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
      let acceptText = ''
      if (this.accept) {
        acceptText = '（文件格式：' + this.acceptText + '）'
      }
      return getFinalProp(
        this.placeholder,
        globalProps.placeholder,
        '点击上传' + acceptText
      )
    },
    acceptText () {
      return this.accept.replace(/\./g, ' ').trim()
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
    MinCount () {
      return Array.isArray(this.Count) ? this.Count[0] : undefined
    },
    MaxCount () {
      return (Array.isArray(this.Count) ? this.Count[1] : this.Count) ?? null
    },
    Count () {
      return getFinalProp(this.count, globalProps.count, 1)
    },
    ValueType () {
      const result = getFinalProp(this.valueType, globalProps.valueType,)?.toLowerCase()
      if (result === 'string' && !this.Upload) {
        throw new Error(`${prefix}文件形态为二进制时，文件的数据类型(valueType参数)不能配置为\'string\'`)
      }
      return result
    },
    // value可能混杂不同的fileForm 因为会有初始值
    /*fileForm () {
      return this.Upload ? 'url' : 'binary'
    },*/
    server () {
      return {/*
        // 初始化files时会被调用
        load: (source, load, error, progress, abort, headers) => {
          console.log('server - load')
          // 避免不支持跨域的文件链接报错
          load(null)
          return {
            abort: () => {
              this.OnAbort()
              abort()
            }
          }
        },
        fetch: (url, load, error, progress, abort, headers) => {
          console.log('server - fetch')
          return {
            abort: () => {
              this.OnAbort()
              abort()
            }
          }
        },
        process: (fieldName, file, metadata, load, error, progress, abort, transfer, options) => {
          console.log('server - process')
          progress(false)
          load(null)

          // todo: 获取文件体积
          /!*fetch(source, {
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
            console.warn(`${prefix}获取文件体积失败 如果上方有跨域错误提示 说明由跨域造成`)
          })
          .finally(e => {
            load({
              body: null
            })
            // 或者load(null)
          })*!/

          // Should expose an abort method so the request can be cancelled
          return {
            abort: () => {
              // This function is entered if the user has tapped the cancel button
              this.OnAbort()

              // Let FilePond know the request has been cancelled
              abort()
            }
          }
        },
      */
      }
    },
    Upload () {
      return getFinalProp(this.upload, globalProps.upload)
    },
  },
  components: { FilePond },
  data () {
    return {
      subWindowFeatures: '',
      files: undefined,
      fileCount: 0,
      unwatchValue: null,
      progress: 1,
      addingQueueIsValid: false,
      addingQueue: 0,
      uploading: false,
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
          this.onUpdateFilesThrottled([])
        }
      }
    },
  },
  created () {
    this.onUpdateFilesThrottled = items => {
      if (this.addingQueue === 0 && this.addingQueueIsValid) {
        throttle(
          this.onUpdateFiles,
          100,
          {
            leading: false, // true会导致：如果调用≥2次 则至少触发2次 但此时可能只期望触发1次
            trailing: true
          }
        )(items)
      }
    }
    this.unwatchValue = this.$watch('value', (n, o) => {
      if (n) {
        // immediate时this.unwatchValue为空
        if (this.unwatchValue) {
          this.unwatchValue()
          this.unwatchValue = null
        }
        this.setFiles(this.value)
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
    // 在value有值后只执行一次
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
            type: 'local',
            ...type === 'file' && { file: v }
          }
        }
      })
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
      getFinalProp(this.onAbort, globalProps.onAbort)?.()
    },
    onWarning () {
      warning('最多上传' + this.MaxCount + '个文件')
    },
    extensionToFileType (extension) {
      // 兼容完整文件名
      extension = getExtension(extension)

      for (let k in this.FileTypeCatalog) {
        if (new RegExp(`\\b${extension}\\b`).test(this.FileTypeCatalog[k].accept)) {
          /*if (this.fileType) {
            if (
              (Array.isArray(this.fileType) && !this.fileType.includes(k)) ||
              (typeof this.fileType === 'string' && this.fileType !== k)
            ) {
              // 上传的文件没有在fileType中找到
            }
          }*/
          // 上传的文件没有在FileTypeCatalog中找到
          return k
        }
      }
    },
    view (source) {
      // 不能用fileForm来判断
      if (typeof (source) === 'string') {
        if (source) {
          window.open(source, '', this.subWindowFeatures)
        } else {
          warning('文件链接为空')
        }

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
        warning('不支持预览的格式')
      }
    },
    doUpload (param) {
      this.uploading = true
      const file = param.file
      const uploadParam = {
        file,
        MB,
        GB,
        sliceFile,
        setProgress: e => {
          this.progress = e
        },
        jsonToFormData,
        fileType: this.fileType
      }
      const promise = this.Upload(uploadParam)
      if (promise instanceof Promise) {
        this.progress = 0
        promise
        .then(fileUrl => {
          // file可以是string或array
          this.$refs.filePond.addFiles(fileUrl)
          .then(items => {

          })
          .catch(e => {
            console.error(e)
          })
          .finally(() => {
            this.uploading = false
          })
        })
        .catch(e => {
          this.uploading = false
          console.error(e)
          error(typeof e === 'string' ? e : '上传失败')
        })
        .finally(() => {
          this.progress = 1
        })
      }
    },
    emitChange (files) {
      // value的同步意味着着files等待初始化的结束
      if (this.unwatchValue) {
        this.unwatchValue()
        this.unwatchValue = null
      } else {
        // 文件形态为File时，要考虑初始值，初始值的v.file被filepond封装成了Blob，此时应该使用v.source（原始url）
        let value = Array.from(files, v => (this.Upload || v.source) ? v.source : v.file)
        if (this.ValueType === 'string') {
          value = this.MaxCount > 1 ? JSON.stringify(value) : value.toString()
        }
        //auto模式
        else if (!this.ValueType && this.MaxCount === 1) {
          value = this.Upload ? value.toString() : value[0]
        }
        this.$emit('input', value)
        this.triggerElFormBlurring()
      }
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
    async validate ({ file, fileType, extension }) {
      const { size } = file
      /*function supportType(vidType, codType) {
        return document.createElement('video').canPlayType(vidType + ';codecs="' + codType + '"')
      }*/
      if (
        this.accept &&
        !new RegExp(`\\b${extension}\\b`).test(this.accept)
      ) {
        warning(`仅能上传 ${this.acceptText} 格式的文件`)
        return false
      }

      if (fileType) {
        const fileTypeCfg = this.FileTypeCatalog[fileType]

        const { count, __fileIdList, duration } = fileTypeCfg
        if (count && __fileIdList && __fileIdList.length >= count) {
          warning('该类型文件最多上传' + count + '个')
          return false
        }

        const Size = getFinalProp(
          this.size,
          this.FileTypeCatalog[fileType]?.size,
          globalProps.size,
        ) * MB
        let minSize, maxSize
        if (typeof Size === 'number') {
          maxSize = Size
        } else if (Array.isArray(Size)) {
          minSize = Size[0]
          maxSize = Size[1]
        }

        function getSizeText (size) {
          if (size >= GB) {
            return (size / GB).toFixed(2) + 'G'
          } else {
            return (size / MB).toFixed(2) + 'M'
          }
        }

        if (size > maxSize) {
          warning('文件体积不能超过' + getSizeText(maxSize))
          return false
        } else if (size < minSize) {
          warning('文件体积不能低于' + getSizeText(minSize))
          return false
        }

        if (['audio', 'video'].includes(fileType)) {
          const Duration = getFinalProp(
            this.duration,
            duration,
            globalProps.duration,
          )

          if (Duration) {
            let min, max
            if (typeof Duration === 'number') {
              max = Duration
            } else if (Array.isArray(Duration)) {
              min = Duration[0]
              max = Duration[1]
            }

            const [seconds, err] = await waitFor(getMediaDuration(file))

            function getMediaTypeText (fileType) {
              return { 'audio': '音频', 'video': '视频' }[fileType]
            }

            if (max && seconds > max) {
              warning(`${getMediaTypeText(fileType)}时长不能超过 ${secondsToText(max)}`)
              return false
            } else if (min && seconds < min) {
              warning(`${getMediaTypeText(fileType)}时长不能低于 ${secondsToText(min)}`)
              return false
            }
          }
        }
      }

      return true
    },
    removeFile (id) {
      if (this.MinCount > 0 && this.fileCount <= this.MinCount) {
        warning('至少上传' + this.MinCount + '个文件')
        return false
      } else {
        for (let k in this.FileTypeCatalog) {
          if (this.FileTypeCatalog[k].__fileIdList?.has(id)) {
            this.FileTypeCatalog[k].__fileIdList.delete(id)
            return
          }
        }
        this.addingQueueIsValid = true
        return true
      }
    },

    /**
     * 生命周期
     */
    /*onInit () {
      console.log('onInit')
    },*/
    onReorderFiles (e) {
      this.emitChange(e)
    },
    async beforeAddFile (item) {
      console.log('beforeAddFile', item)

      ++this.addingQueue
      let result = false
      const { file, source } = item
      if (source instanceof File) {
        const extension = getExtension(source.name)
        const fileType = this.extensionToFileType(extension)
        const isValid = await this.validate(({
          file, fileType, extension,
        }))
        console.log('校验结果：', isValid)

        // 队列中只要有一个文件是有效的 就代表队列有效
        if (isValid) {
          this.addingQueueIsValid = isValid
        }

        if (this.Upload) {
          if (isValid) {
            this.doUpload({ file })
          }
        } else {
          result = isValid
        }
      }
      // 不校验初始值（初始值只能是url）
      else {
        this.addingQueueIsValid = true
        result = true
      }
      --this.addingQueue
      return result
    },
    // called for adding files, removing files, and when files finish loading.
    onUpdateFiles (items) {
      // 添加文件时 会触发两次 如果触发了beforeAddFile中的异步操作 可能触发三次
      // 删除文件时 只触发一次
      // 执行顺序：没有异步操作时 先执行所有的beforeAddFile 再执行所有的onUpdateFiles
      // 含异步操作时：先执行完毕所有的同步beforeAddFile 异步的beforeAddFile会穿插在后续的onUpdateFiles中
      // beforeAddFile返回false仍会触发onUpdateFiles 其中第一次的数据是脏的
      // 初始化files时第一次触发的onUpdateFiles要早于beforeAddFile
      console.log(this.addingQueue)
      if (this.addingQueue === 0 && this.addingQueueIsValid && this.uploading === false) {
        console.log('onUpdateFiles', items)
        this.fileCount = items.length
        // 记录每种类型的上传数量
        items.map(({ file, id }) => {
          const extension = file.name.replace(/.+\./, '.').toLowerCase()
          const fileType = this.extensionToFileType(extension)
          if (fileType) {
            const fileTypeCfg = this.FileTypeCatalog[fileType]
            if (fileTypeCfg.__fileIdList) {
              fileTypeCfg.__fileIdList.add(id)
            } else {
              fileTypeCfg.__fileIdList = new Set([id])
            }
          }
        })

        this.emitChange(items)
        this.addingQueueIsValid = false
      } else {
        console.log(`%conUpdateFiles`, 'text-decoration:line-through;color:lightgrey;')
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
            resolve(this.removeFile(item.id))
          }).catch(() => {
            resolve(false)
          })
        })
      } else {
        return this.removeFile(item.id)
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

/*::v-deep .filepond--item {
  width: calc(33.33% - .5em);
}

::v-deep .filepond--file {
  cursor: pointer;
  transition-duration: 0.3s;
}

::v-deep .filepond--file:hover {
  box-shadow: 2px 2px 10px rgba(0, 0, 0, .9);
  filter: blur(1px);
  background: hsla(0, 0%, 100%, .3);
}*/
</style>
