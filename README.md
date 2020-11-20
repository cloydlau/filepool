# filepool / 文件上传池

![preview](./preview.png)

<br/>

### Features

- √ v-model双绑
- √ 支持分片上传/断点续传
- √ 支持上传进度显示、中途取消
- √ 支持格式限制/大小限制/数量限制 可针对不同类型分别设置
- √ 自动根据数量限制选择string或array数据类型 也可以手动指定
- √ 支持拖拉拽排序（响应式）
- √ 支持上传后预览/禁用时预览
- √ 全局安装/局部引入 通用参数仅需配置一次

element-ui集成说明：

- element-ui是以外置依赖的方式引入的 所以不必担心代码体积和版本不一致等问题
- 适配element-ui的el-form组件 支持el-form的全局disabled

<br/>

### Installation
![NPM](https://nodei.co/npm/filepool.png)
``` bash
$ yarn add filepool
```

**Dependencies**：vue element-ui axios?

```js
// sliceFile, MB, GB 仅作为工具函数、常量 可选
import Filepool, { sliceFile, MB, GB } from 'filepool'

// 组件内引入
components: { Filepool }

// 全局引入
Vue.use(Filepool)
```

<br/>

### Usage

```html
<Filepool v-model="" fileType="video"/>
```

| Attribute | Description | Configuration Mode | Type | Accepted Values | Default |
| --- | --- | --- | --- | --- | --- |
| value / v-model | 文件链接 | props | string / array | | |
| disabled | 是否禁用 | props | boolean | | false |
| fileTypeCatalog | 文件目录 | global | object | | *see below* |
| fileType | 指定使用fileTypeCatalog中的哪一个 | props | string, array | prop of fileTypeCatalog | |
| valueType | 数据类型 | global, props | string | 'string' / 'array' | *see below* |
| maxSize | 大小限制 单位MB | global, props | number | | 200 |
| count | 数量限制 | global, props | number | | 1 |
| delConfirmation | 是否在删除文件时弹框确认 | global | boolean | | false |
| base64Encoding | 在没有配置request时，是否将文件进行base64编码 | global, props | boolean | | false |
| placeholder | 提示信息（hint） | global, props | string | | '点击上传' |

**接口相关**

> 由于分片上传的实现由后端主导 五花八门 无法统一 故上传的整个过程放开自定义 谢绝过度封装

| Attribute | Description | Configuration Mode | Type | Accepted Values | Default |
| --- | --- | --- | --- | --- | --- |
| upload | 自定义上传的整个过程 | global, props | function | *see below* | |
| onAbort | 回调 在上传中途点击取消按钮触发 | global, props | function | *see below* | |

<br/>

**upload**

```js
import Filepool from 'filepool'
import request from '@/utils/request' // 你的axios封装

Vue.use(Filepool, {
  upload ({ file, jsonToFormData, setProgress, }) {
    setProgress(0)
    return new Promise((resolve, reject) => {
      request({
        url: '',
        method: 'POST',
        data: jsonToFormData({
          file,
        }),
      }).then(res => {
        if (typeof res?.data === 'string') {
          resolve(res.data)
        } else {
          reject(res.message)
        }
      }).catch(e => {
        reject(e)
      })
    })
  },
})
```

<br/>

**相对完整的分片上传示例**

> 含中途取消、进度显示、断点续传等

```js
import Filepool from 'filepool'
import request from '@/utils/request' // 你的axios封装
import { CancelToken } from 'axios'

let cancelUpload, failTimes = 0, retryTimes = 3

Vue.use(Filepool, {
  /**
   * @return {promise}
   */
  upload ({
    file, // 用户选择的二进制文件
    
    fileType, // 当前实例的文件类型
    
    /**
     * json转FormData
     *
     * @param {json} param - 参数
     * @return {formData} formData格式的参数
     */
    jsonToFormData,
    
    /**
     * 设置上传进度
     *
     * @param {number} progress - 进度 范围[0, 1]
     */
    setProgress,
    
    /**
     * 切割文件（分片上传时有用）
     *
     * @param {file} file - 二进制文件
     * @param {number} chunkSize - 分片大小 单位字节 默认10M
     * @return {array} 文件分片
     */
    sliceFile,
    
    MB, GB, // 文件容量单位 方便用于chunkSize参数
  }) {
    const chunkSize = 10 * MB

    setProgress(0)
    failTimes = 0
    cancelUpload = null

    let chunks = sliceFile(file, chunkSize), count = 0
    
    const formData = jsonToFormData({
      domainId: 4,
      dir: fileType,
      chunkTotal: chunks.length.toString(),
      fileName: file.name,
    })

    return new Promise((resolve, reject) => {
      function recursion () {
        formData.set('file', chunks[count])
        formData.set('chunk', count.toString())
        request({
          baseURL: '',
          url: '',
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
          // 断点续传
          if (failTimes++ < retryTimes) {
            recursion()
          } else {
            reject('上传失败')
          }
        })
      }

      recursion()
    })
  },
  onAbort () {
    // 在上传中途点击取消按钮触发
    // 可以在这里重置断点续传次数、中止请求、调接口清除分片文件等
    failTimes = Number.MAX_VALUE
    cancelUpload?.()
  }
})
```

<br/>

**文件形态**

- 服务器模式：配置了upload时进入该模式
- 离线模式：没有配置upload时进入该模式
  - 二进制File：默认
  - base64: base64Encoding设置为true时进入该模式

<br/>

**文件数据类型**

- auto（默认）: count为1时采用string，count>1时采用array
- string: 字符串类型，count为1时采用string，count＞1时采用json-string
- array: 数组类型

<br/>

**文件目录**

> 你可以全局定义一个文件目录 预设一些你可能用到的文件类型（任何类型都可以） 并规定这些类型的格式和大小 在组件中使用fileType属性来对应

默认值

```
fileTypeCatalog: {
  image: {
    maxSize: 10,
    accept: '.jpg,.jpeg,.png',
  },
  video: {
    maxSize: 200,
    accept: '.mp4',
  },
  audio: {
    maxSize: 60,
    accept: '.mp3',
  },
  apk: {
    maxSize: 200,
    accept: '.apk',
  },
  excel: {
    maxSize: 100,
    accept: '.xlsx,.xls',
  },
}
```

例子

```vue
<template>
  <Filepool fileType="abc"/>
</template>

<script>
import Filepool from 'filepool'

Vue.use(Filepool, {
  fileTypeCatalog: {
    abc: {
      maxSize: 10,
      accept: '.abc',
    },
  }
})
</script>
```

<br/>

**获取上传进度/状态**

1. 添加一个ref如filepool
2. this.$refs.filepool?.progress < 1 // 小于1表示上传中，等于1表示未开始/上传完毕

<br/>

### Notice

- 全局配置被props中的同名参数覆盖 对象会进行混入

- maxSize权重排序：props ＞ fileTypeCatalog中对应的maxSize ＞ 全局默认的maxSize

- 如果仅上传图片 请使用imgpond（附带图片编辑功能）

- fileType如果为array类型 必须以引用data中变量的形式来传入
  - 这是因为每次父组件重渲染时 直接写在template中的引用型变量会被重新创建 导致意外触发组件内的监听
  - 详见 https://github.com/vuejs/vue/issues/9223
