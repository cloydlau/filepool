<template>
  <el-dialog visible :close-on-click-modal="false" :show-close="false" title="Filepool">


    <Filepool
      v-model="value"
      v-bind="props"
      ref="filepool"
    />
    <p>value</p>
    <json-editor-vue :value="value"/>
    <p>files</p>
    <json-editor-vue :value="$refs.filepool.files" v-if="$refs.filepool" readonly/>


    <el-form
      label-position="top"
    >
      <h3>Props</h3>
      <el-form-item label="fileType">
        <el-radio v-model="props.fileType" label="video">视频</el-radio>
        <el-radio v-model="props.fileType" label="audio">音频</el-radio>
      </el-form-item>
      <el-form-item label="valueType">
        <el-radio v-model="props.valueType" :label="undefined">自动</el-radio>
        <el-radio v-model="props.valueType" label="string">string</el-radio>
        <el-radio v-model="props.valueType" label="array">array</el-radio>
      </el-form-item>
      <el-form-item label="maxSize">
        <el-input-number v-model="props.maxSize" clearable :min="0"/>
      </el-form-item>
      <el-form-item label="count">
        <el-input-number v-model="props.count" clearable :min="1"/>
      </el-form-item>
      <el-form-item label="param">
        <json-editor-vue v-model="props.param"/>
      </el-form-item>
      <el-form-item label="disabled">
        <el-switch
          v-model="props.disabled"
          active-color="#13ce66"
          :active-value="true"
          :inactive-value="false"
        />
      </el-form-item>
      <el-form-item label="base64Encoding">
        <el-switch
          v-model="props.base64Encoding"
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
      value: '',
      props: {
        param: {},
        fileType: ['abc'],
        maxSize: undefined,
        count: undefined,
        valueType: undefined,
        disabled: false,
        base64Encoding: false,
        upload: false,
      }
    }
  },
  methods: {}
}
</script>

<style lang="scss" scoped>
::v-deep .el-dialog {
  min-width: 600px;
}
</style>
