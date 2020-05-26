# filepool / 文件上传池


![preview](./preview.png)

<hr/>

![props](./preview-props.png)


### Intro / 介绍

- √ v-model双绑
- √ 支持分片上传/断点续传 分片大小可配
- √ 支持上传进度显示、中途取消
- √ 支持格式限制/大小限制/数量限制 可针对不同类型分别设置
- √ 自动根据数量限制选择String或Array数据类型 也可以手动指定
- √ 支持上传后预览/禁用时预览
- √ 全局安装 通用参数仅需配置一次


### Installation / 安装
```
yarn add filepool / npm i filepool
依赖项：vue element-ui axios plain-kit

import Filepool from 'filepool'
Vue.use(Filepool, { url: '接口地址' })
```


### Usage / 使用
请参考/demo中极简示例


### Notice / 注意事项
- 如果仅上传图片 请使用imgpond
- 文件链接服务最好能够提供nginx跨域支持（推荐）
- 针对不支持跨域的情况 提供了localhost/线上的代理配置
