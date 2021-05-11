<template>
  <el-dialog visible :close-on-click-modal="false" :show-close="false" title="Filepool">


    <Filepool
      v-model="value"
      v-bind="config"
      ref="filepool"
    />
    <p>value</p>
    <json-editor-vue :value="value__" readonly/>

    <el-form
      label-position="top"
    >
      <h3>Props</h3>
      <el-form-item label="fileType">
        <el-radio v-model="config.fileType" label="video">视频</el-radio>
        <el-radio v-model="config.fileType" label="audio">音频</el-radio>
      </el-form-item>
      <el-form-item label="valueType">
        <el-radio v-model="config.valueType" :label="undefined">自动</el-radio>
        <el-radio v-model="config.valueType" label="string">string</el-radio>
        <el-radio v-model="config.valueType" label="array">array</el-radio>
      </el-form-item>
      <el-form-item label="maxSize">
        <el-input-number v-model="config.maxSize" clearable :min="0"/>
      </el-form-item>
      <el-form-item label="count">
        <el-input-number v-model="config.count" clearable :min="1"/>
      </el-form-item>
      <el-form-item label="param">
        <json-editor-vue v-model="config.param"/>
      </el-form-item>
      <el-form-item label="disabled">
        <el-switch
          v-model="config.disabled"
          active-color="#13ce66"
          :active-value="true"
          :inactive-value="false"
        />
      </el-form-item>
    </el-form>
  </el-dialog>
</template>

<script>
import 'json-editor-vue/dist/style.css'
import JsonEditorVue from 'json-editor-vue'

export default {
  components: { JsonEditorVue },
  data () {
    return {
      value: import.meta.env.VITE_APP_TEST_URL,
      value__: null,
      show: false,
      config: {
        param: {},
        fileType: ['abc'],
        maxSize: undefined,
        count: undefined,
        valueType: undefined,
        disabled: false,
        upload: false,
      }
    }
  },
  watch: {
    value: {
      immediate: true,
      handler (n, o) {
        this.value__ = JSON.parse(JSON.stringify(n))
      }
    },
  },
  methods: {}
}
</script>

<style lang="scss" scoped>
::v-deep .el-dialog {
  min-width: 600px;
}
</style>
