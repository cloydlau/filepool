import Filepool from './index.vue'
import {init} from "./config"

const install = (Vue, opts = {}) => {
  if (install.installed) {
    return
  }
  init(opts)
  Vue.component(Filepool.name, Filepool)
}

if (typeof window !== 'undefined' && window.Vue) {
  install(window.Vue)
}

// @ts-ignore
Filepool.install = install

export default Filepool

// todo: deprecated
export {
  Filepool
}

