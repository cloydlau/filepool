<template>
  <el-dialog visible :close-on-click-modal="false" :show-close="false" title="Filepool">


    <Filepool
      v-model="value"
      v-bind="props"
    />


    <el-form>
      <h2>props</h2>
      <el-form-item label="fileType">
        <el-radio v-model="props.fileType" label="video">视频</el-radio>
        <el-radio v-model="props.fileType" label="audio">音频</el-radio>
      </el-form-item>
      <el-form-item label="valueType">
        <el-radio v-model="props.valueType" :label="undefined">自动</el-radio>
        <el-radio v-model="props.valueType" label="String">String</el-radio>
        <el-radio v-model="props.valueType" label="Array">Array</el-radio>
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
        <el-switch v-model="props.disabled"
                   active-color="#13ce66"
                   :active-value="true"
                   :inactive-value="false">
        </el-switch>
      </el-form-item>
      <el-form-item label="base64Encoding">
        <el-switch v-model="props.base64Encoding"
                   active-color="#13ce66"
                   :active-value="true"
                   :inactive-value="false">
        </el-switch>
      </el-form-item>
    </el-form>
  </el-dialog>
</template>

<script>
import { JsonEditorVue } from 'json-editor-vue'

export default {
  components: { JsonEditorVue },
  data () {
    return {
      value: '',
      props: {
        param: {},
        fileType: undefined,
        maxSize: undefined,
        count: 1,
        valueType: undefined,
        disabled: false,
        base64Encoding: false
      }
    }
  },
  methods: {}
}
</script>

<style lang="scss" scoped>
.el-form {
  border: 2px solid lightblue;
  border-radius: 16px;
  padding: 16px;
  margin-top: 32px;
}
</style>
