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
  valueType: undefined,
  maxSize: 200,
  count: 3,
  fileTypeCatalog: {
    abc: {
      maxSize: 2.01
    }
  },
  upload ({ file, jsonToFormData, }) {
    return new Promise((resolve, reject) => {
      request({
        url: '',
        method: 'POST',
        data: jsonToFormData({
          file,
          domainId: 4,
          dir: 'video'
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

Vue.config.productionTip = false

new Vue({
  render: h => h(App),
}).$mount('#app')
