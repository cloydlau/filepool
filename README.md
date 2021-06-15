# filepool / 文件上传池

![preview](./preview.png)

<br>

## Features

- √ v-model双绑
- √ 支持分片上传/断点续传
- √ 支持上传进度显示、中途取消
- √ 支持对文件的格式、体积、数量、音视频时长进行限制 可以对不同的文件类型设置不同的限制
- √ 自动根据数量限制选择数据类型 也可以手动指定
- √ 支持拖拉拽排序（响应式）
- √ 支持文件预览
- √ 全局或局部引入 参数支持全局或局部配置

element-ui集成说明：

- element-ui是以外置依赖的方式引入的 所以不必担心代码体积和版本不一致等问题
- 适配element-ui的el-form组件 支持el-form的全局disabled

<br>

## Installation

![NPM](https://nodei.co/npm/filepool.png)

**Dependencies**：vue element-ui axios?

```ts
// 全局引入

// sliceFile, MB, GB 仅作为工具函数、常量 可选
import Filepool, { sliceFile, MB, GB } from 'filepool'

Vue.use(Filepool, {
  // 全局配置
})
```

```vue
<!-- 局部引入 -->

<template>
  <Filepool v-bind="config"/>
</template>

<script>
// sliceFile, MB, GB 仅作为工具函数、常量 可选
import Filepool, { sliceFile, MB, GB } from 'filepool'

export default {
  components: { Filepool },
  data () {
    return {
      config: {
        // 局部配置
      }
    }
  }
}
</script>
```

<br>

## Props

| Attribute | Description | Type | Accepted Values | Default |
| --- | --- | --- | --- | --- |
| v-model / value | 文件 | string, array | | |
| disabled | 是否禁用 | boolean | | false |
| fileTypeCatalog | 文件类型目录 | object | | |
| fileType | 指定使用 `fileTypeCatalog` 中的哪一个 | string, array | props of fileTypeCatalog | |
| valueType | 数据类型 | string | 'string', 'array' | |
| size | 大小限制 单位MB | number, number[] | | |
| duration | 音视频时长限制 单位秒 | number, number[] | | |
| count | 数量限制 | number, number[] | | 1 |
| deleteConfirmation | 是否在删除文件时弹框确认 | boolean | | false |
| placeholder | hint | string | | '点击上传' |

**接口相关**

> 由于分片上传的实现由后端主导 五花八门 无法统一 故上传的整个过程放开自定义 谢绝过度封装

| Attribute | Description | Type | Accepted Values | Default |
| --- | --- | --- | --- | --- |
| upload | 自定义上传的整个过程 | function | *see below* | |
| onAbort | 回调 在上传中途点击取消按钮触发 | function | *see below* | |

### count, duration, size

- number

数量上限

- number[]

    0. 数量下限
    1. 数量上限

<br>

## Config rules

- 双向绑定参数（`v-model`, `*.sync`）仅支持局部配置
- `fileType` 仅支持局部配置
- `fileTypeCatalog` 仅支持全局配置
- 其余参数均支持全局或局部配置

权重：

- 局部配置高于全局配置
- 对于对象类型的参数 局部配置会与全局配置进行合并 同名属性会被局部配置覆盖
- 【特例】`count`, `size`, `duration` 的权重排序：
    1. 局部配置中的 `count`, `size`, `duration`
    2. **全局配置中 `fileTypeCatalog` 对应文件类型的 `count`, `size`, `duration`**
    3. 全局配置中的 `count`, `size`, `duration`

<br>

## 调用接口上传

```js
// 极简示例

import Filepool from 'filepool'
import request from '@/utils/request' // 你的axios封装

Vue.use(Filepool, {
  upload ({ file, jsonToFormData, }) {
    return new Promise((resolve, reject) => {
      request({
        url: '',
        method: 'POST',
        data: jsonToFormData({
          file,
        }),
      }).then(res => {
        if (typeof res?.data === 'string') {
          // resolve的参数将用于filepond的addFiles函数 文件数量不限
          // https://pqina.nl/filepond/docs/patterns/api/filepond-instance/#adding-files
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

```js
// 相对完整的分片上传示例
// 含中途取消、进度显示、断点续传等

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
            // resolve的参数将用于filepond的addFiles函数 文件数量不限
            // https://pqina.nl/filepond/docs/patterns/api/filepond-instance/#adding-files
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
    failTimes = Number.MAX_SAFE_INTEGER
    cancelUpload?.()
  }
})
```

<br>

## 文件形态

- url：配置了 `upload` 时
- File：没有配置 `upload` 时

<br>

## 文件数据类型

- `auto`（默认） : count为1时采用string，count>1时采用array
- `string` : 字符串类型，count为1时采用string，count＞1时采用json字符串
- `array`

<br>

## 文件类型目录

你可以全局定义一个文件目录 预设一些你可能用到的文件类型（任何类型都可以） 并规定这些类型的格式和大小 在组件中使用fileType属性来对应

```
// 默认值

fileTypeCatalog: {
  image: {
    size: 10,
    accept: '.jpg,.jpeg,.png',
  },
  video: {
    size: 200,
    accept: '.mp4',
  },
  audio: {
    size: 60,
    accept: '.mp3',
  },
  apk: {
    size: 200,
    accept: '.apk',
  },
  excel: {
    size: 100,
    accept: '.xlsx,.xls',
  },
}
```

```vue
<!-- 示例 -->

<template>
  <Filepool fileType="abc"/>
</template>

<script>
import Filepool from 'filepool'

Vue.use(Filepool, {
  fileTypeCatalog: {
    abc: {
      size: 10,
      accept: '.abc',
    },
  }
})
</script>
```

<br>

## 限制音视频时长

```vue
<!-- 示例：限制音频时长不能超过5分钟，视频时长介于10~60秒 -->

<script>
import Filepool from 'filepool'

Vue.use(Filepool, {
  fileTypeCatalog: {
    audio: {
      duration: 300
    },
    video: {
      duration: [10, 60]
    }
  }
})
</script>
```

<br>

## 获取上传进度

1. 添加一个 `ref` 如 filepool
2. `this.$refs.filepool?.progress < 1` （小于1表示上传中，等于1表示未开始/上传完毕）

<br>

## Notice

- fileType如果为array类型 必须以引用data中变量的形式来传入
    - 这是因为每次父组件重渲染时 直接写在template中的引用型变量会被重新创建 导致意外触发组件内的监听
    - 详见 [issue](https://github.com/vuejs/vue/issues/9223)

- 不限制上传文件数量 count可以传 `Number.MAX_SAFE_INTEGER`

- `filepool` 不会对 `value` 的初始值进行校验
