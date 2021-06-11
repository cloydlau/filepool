import Vue from 'vue'
import App from './index.vue'

import 'element-ui/lib/theme-chalk/index.css'
import ElementUI from 'element-ui'
Vue.use(ElementUI)

import axios from 'axios'
const request = axios.create()
request.interceptors.response.use(response => response.config.method.toUpperCase() === 'HEAD' ? response : response.data)

import Filepool from '../src/main'
Vue.use(Filepool, {
  valueType: undefined,
  size: 200,
  count: 1000,
  fileTypeCatalog: {
    abc: {
      size: 2.01,
      accept: '.docx'
    },
    image: {
      size: 10000
    },
    video: {
      duration: 3000
    }
  },
  upload ({ file, jsonToFormData, }) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve(import.meta.env.VITE_APP_TEST_URL)
      }, 1000)
      /*request({
        url: import.meta.env.VITE_APP_UPLOAD_API,
        method: 'POST',
        data: jsonToFormData({
          file,
          domainId: 0,
          dir: 'tmp'
        }),
        headers: {
          'Authorization': import.meta.env.VITE_APP_UPLOAD_API_TOKEN
        }
      }).then(res => {
        if (typeof res?.data === 'string') {
          resolve(res.data)
        } else {
          reject(res.message)
        }
      }).catch(e => {
        reject(e)
      })*/
    })
  },
})

Vue.config.productionTip = false

new Vue({
  render: h => h(App),
}).$mount('#app')
