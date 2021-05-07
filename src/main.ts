import Filepool from './index.vue'
import { init } from './config'
import { MB, GB, sliceFile } from './utils'

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

export {
  sliceFile,
  MB, GB,
}

