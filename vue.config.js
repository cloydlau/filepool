const path = require('path')

const externals = process.env.NODE_ENV === 'development' ? {} : {
  'element-ui': 'element-ui',
  'axios': 'axios',
  'plain-kit': 'plain-kit',
  'vue': 'vue',
}

module.exports = {
  pages: {
    index: {
      entry: 'demo/main.js',
      template: 'public/index.html',
      filename: 'index.html'
    }
  },
  css: { extract: false },
  publicPath: './',
  outputDir: path.resolve(__dirname, './dist'),
  configureWebpack: {
    output: {
      filename: 'filepool.min.js',
      library: 'filepool',
      libraryTarget: 'umd',
      umdNamedDefine: true
    },
    externals,
    devtool: 'source-map',
  },
}
