# filepool / 文件上传池

![preview](./preview.png)

<br/>

![props](./preview-props.png)

<br/>

### Features

- √ v-model双绑
- √ 支持分片上传/断点续传 分片大小可配
- √ 支持上传进度显示、中途取消
- √ 支持格式限制/大小限制/数量限制 可针对不同类型分别设置
- √ 自动根据数量限制选择String或Array数据类型 也可以手动指定
- √ 支持上传后预览/禁用时预览
- √ 全局安装/局部引入 通用参数仅需配置一次

<br/>

### Installation
![NPM](https://nodei.co/npm/filepool.png)
``` bash
$ yarn add filepool
```

**Dependencies**：vue element-ui [axios（如果需要分片）]

```js
import { Filepool } from 'filepool'
components: { Filepool },
```

**globally**
```js
import Filepool from 'filepool'
Vue.use(Filepool, { url: '接口地址' })
```

<br/>

### Usage

```html
<Filepool v-model="" :fileType=""/>
```

| 参数 | 说明 | 配置方式 | 类型 | 可选值 | 默认值 |
| --- | --- | --- | --- | --- | --- |
| value / v-model | 文件链接 | props | String / Array | | |
| url | 上传接口地址 | global | String | | |
| request | axios实例（必填） | global | Function | | |
| requestConfig | axios配置 | global | Object | | *详见下方说明 |
| chunk | 是否分片 | global | Boolean | | true |
| chunkSize | 分片大小 单位MB | global | Number | | 10 |
| fileType | 指定文件类型（范围） | props | String | 全局配置中fileTypeMap的key 单个用String多个用Array | |
| fileTypeMap | 文件类型配置 | global | Object | | 见下方说明 |
| valueType | 数据类型 | props | String | 'String' / 'Array'（不区分大小写） | 单个String多个Array |
| maxSize | 大小限制 单位MB | global / props | Number | | 200 |
| count | 数量限制 | global / props | Number | | 1 |
| param | 上传接口参数（除二进制文件以外的其他参数 二进制文件默认会以file作为参数名） | global / props | Object | | |
| disabled | 是否禁用 | props | Boolean | | false |
| localProxy | 本地代理 | global | Object | | |
| proxy | 代理 | global | Object | | |
| normalizer | 接口参数/返回值格式配置 | global | Object | | *详见下方说明 |
| delConfirmation | 是否在删除文件时弹框确认 | global | Boolean | | false |
| base64Encoding | 在没有配置request时，是否将文件进行base64编码 | global, props | Boolean | | false |

<br/>

requestConfig

默认值：
```json
{
  "baseURL": "", //针对prod环境中baseApi为相对路径的情况
  "method": "POST",
  "timeout": 0
}
```

比如你想将超时时间修改为10秒：

```js
Vue.use(Imgpond, {
  requestConfig: {
    timeout: 10000
  }
})
```

<br/>

fileTypeMap默认值

```js
fileTypeMap: {
  image: {
    format: ['jpg', 'jpeg', 'png'],
    maxSize: 10,
  },
  video: {
    format: ['mp4'],
    maxSize: 200
  },
  audio: {
    format: ['mp3', 'wav'],
    maxSize: 60
  },
  apk: {
    format: ['apk'],
    maxSize: 200
  },
  excel: {
    format: ['xlsx', 'xls'],
    maxSize: 100
  },
}
```

normalizer

默认值：
```json
{
  "param": "file", //二进制文件的参数名
  "response": "data" //返回值（json）中文件链接所在的key路径
}
```

比如你的上传接口参数长这样子，其中origin是全局参数：

```json
{
  "img": "(binary)",
  "origin": true,
  "path": "img"
}
```

你可以这样配置：

```js
Vue.use(Filepool, {
  normalizer: {
    param: 'img'
  },
  param: {
    origin: true
  }
})
```

```html
<Filepool :param="{path:'img'}"/>
```

如果你的上传接口返回值格式为：

```json
{
  "data": {
    "url": "图片链接"
  }
}
```

配置如下：

```js
Vue.use(Filepool, {
  normalizer: {
    response: 'data.url'
  },
})
```

<br/>

### Notice

- maxSize权重排序：props ＞ fileTypeMap中对应的maxSize ＞ 全局配置的maxSize

- 全局配置被props中的同名参数覆盖 对象会进行混入

- 如果仅上传图片 请使用imgpond

- 文件链接服务最好能够提供nginx跨域支持（推荐）

- 针对不支持跨域的情况 提供了localhost/线上的代理配置
