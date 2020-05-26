import Vue from 'vue'
import App from './index.vue'

import 'element-ui/lib/theme-chalk/index.css'
import ElementUI from 'element-ui'
Vue.use(ElementUI)

import Filepool from '../src/main.js'
//todo: import Filepool from 'filepool'
Vue.use(Filepool, {
  //上传接口地址
  url: '',

  /**
   * 可选参数
   */
  //axios实例
  request: null,
  //是否分片
  chunk: true,
  //分片大小 单位M
  chunkSize: 10,
  //上传接口参数（除二进制文件以外的其他参数 二进制文件默认会以file作为参数名）
  param: {},
  //文件大小上限 权重低于props
  maxSize: 200,
  //文件数量上限 权重低于props
  count: 1,
  //文件类型配置
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
  },
  //本地代理
  localProxy: {},
  //代理
  proxy: {},
})

Vue.config.productionTip = false

new Vue({
  render: h => h(App),
}).$mount('#app')
