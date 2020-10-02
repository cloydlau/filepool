import Vue from 'vue'
import App from './index.vue'

import 'element-ui/lib/theme-chalk/index.css'
import ElementUI from 'element-ui'
Vue.use(ElementUI)

import axios from 'axios'
const request = axios.create()
request.interceptors.response.use(response => response.config.method.toUpperCase() === 'HEAD' ? response : response.data)

import Filepool from '../src/main.js'
Vue.use(Filepool, {
  url: 'https://developer.yjctrip.com/upload-api/chunkUpload',
  request,
  chunk: true,
  chunkSize: 10,
  param: { domainId: 4, dir: 'img' },
  maxSize: 200,
  count: 1,
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
  localProxy: {},
  proxy: {},
})

Vue.config.productionTip = false

new Vue({
  render: h => h(App),
}).$mount('#app')
